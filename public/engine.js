import { Chess } from './chess.js';

const values={p:100,n:320,b:335,r:500,q:900,k:0};
const TIMEOUT=Symbol('search timeout');
let deadline=Infinity;
function evaluate(game){
  if(game.isCheckmate())return game.turn()==='w'?-100000:100000;
  if(game.isDraw())return 0;
  let value=0;const board=game.board();
  const opening=game.moveNumber()<=12;
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){
    const p=board[row][col];if(!p)continue;
    const home=p.color==='w'?7:0,advance=p.color==='w'?6-row:row-1;
    const center=7-(Math.abs(3.5-row)+Math.abs(3.5-col));
    let bonus=0;
    if(p.type==='p')bonus=advance*5+center*4+((col===3||col===4)&&advance>0?20:0);
    if(p.type==='n')bonus=center*5+(opening&&row!==home?12:0);
    if(p.type==='b')bonus=center*4+(opening&&row!==home?25:0);
    if(p.type==='q'&&opening&&row!==home)bonus-=18;
    if(p.type==='k'&&opening){if(row===home&&(col===2||col===6))bonus+=45;else if(row!==home)bonus-=45;}
    value+=(p.color==='w'?1:-1)*(values[p.type]+bonus);
  }
  return value;
}
function ordered(game){return game.moves({verbose:true}).sort((a,b)=>((values[b.captured]||0)*10-(values[b.piece]||0)+(b.promotion?800:0))-((values[a.captured]||0)*10-(values[a.piece]||0)+(a.promotion?800:0)));}
function search(game,depth,alpha,beta,ply){
  if(performance.now()>deadline)throw TIMEOUT;
  if(game.isCheckmate())return game.turn()==='w'?-100000+ply:100000-ply;
  if(depth===0||game.isDraw())return evaluate(game);
  const maximizing=game.turn()==='w';let best=maximizing?-Infinity:Infinity;
  for(const move of ordered(game)){
    game.move(move);let value;
    try{value=search(game,depth-1,alpha,beta,ply+1);}finally{game.undo();}
    if(maximizing){best=Math.max(best,value);alpha=Math.max(alpha,best);}else{best=Math.min(best,value);beta=Math.min(beta,best);}
    if(beta<=alpha)break;
  }
  return Number.isFinite(best)?best:0;
}
// A small repertoire develops pawns and bishops as well as knights.
const openings={
  '':['e4','d4','c4','Nf3'],
  'e4':['e5','c5','e6','c6'], 'd4':['d5','Nf6','e6'], 'c4':['e5','c5','Nf6'], 'Nf3':['d5','Nf6','c5'],
  'e4 e5':['Nf3','Bc4','Nc3'], 'e4 c5':['Nf3','Nc3','c3'], 'e4 e6':['d4','Nc3'], 'e4 c6':['d4','Nc3'],
  'd4 d5':['c4','Nf3','Bf4'], 'd4 Nf6':['c4','Nf3','Bf4'], 'd4 e6':['c4','e4','Nf3'],
  'e4 e5 Nf3':['Nc6','Nf6','d6'], 'e4 e5 Bc4':['Bc5','Nf6','Nc6'], 'd4 d5 c4':['e6','c6','dxc4'],
  'e4 e5 Nf3 Nc6':['Bb5','Bc4','d4'], 'd4 d5 c4 e6':['Nc3','Nf3'],
};
function openingMove(game){
  const choices=openings[game.history().join(' ')];if(!choices)return null;
  const moves=game.moves({verbose:true}).filter(m=>choices.includes(m.san));
  return moves.length?moves[Math.floor(Math.random()*moves.length)]:null;
}
function repeatPenalty(move,history){
  if(history.length>=24||move.captured||move.san.includes('+')||move.san.includes('#')||move.piece==='p')return 0;
  const own=history.filter(m=>m.color===move.color);
  // Penalize shuffling an already developed piece while other pieces stay home.
  const recent=own.slice(-3);let square=move.from,count=0;
  for(let i=recent.length-1;i>=0;i--)if(recent[i].to===square){count++;square=recent[i].from;}
  return count*18;
}
function chooseMove(game,level,options={}){
  const candidates=ordered(game);if(!candidates.length)return null;
  if(options.book){const book=openingMove(game);if(book)return book;}
  const sign=game.turn()==='w'?1:-1,history=game.history({verbose:true});
  let complete=candidates.map(move=>({move,score:-Infinity}));
  deadline=performance.now()+(level===3?2200:900);
  // Only adopt a completed depth: a deadline must not favor whichever piece was searched first.
  for(let depth=1;depth<=level;depth++){
    const scored=[];let interrupted=false;
    try{for(const {move} of complete){
      game.move(move);let score;
      try{score=sign*search(game,depth-1,-Infinity,Infinity,1);}finally{game.undo();}
      scored.push({move,score:score-repeatPenalty(move,history)});
    }}catch(error){if(error!==TIMEOUT)throw error;interrupted=true;}
    if(interrupted)break;
    complete=scored.sort((a,b)=>b.score-a.score);
    if(complete[0].score>90000)break;
  }
  const tolerance=options.hint?0:level===1?35:level===2?12:4;
  const choices=complete.filter(item=>item.score>=complete[0].score-tolerance);
  return (choices[Math.floor(Math.random()*choices.length)]||complete[0]).move;
}
self.onmessage=({data})=>{
  const game=new Chess(data.fen);
  if(Array.isArray(data.moves)){
    for(const move of data.moves){game.setQueenJumpLimits(move.queenJumps);game.move(move);}
  }else if(data.pgn)game.loadPgn(data.pgn);
  game.setQueenJumpLimits(data.queenJumps);
  const variant=!!(data.queenJumps?.w||data.queenJumps?.b||data.moves?.some(m=>m.queenJumps?.w||m.queenJumps?.b));
  const move=chooseMove(game,Math.max(1,Math.min(3,Number(data.level)||2)),{book:!data.hint&&!variant,hint:!!data.hint});
  self.postMessage(move?{from:move.from,to:move.to,promotion:move.promotion}:null);
};
