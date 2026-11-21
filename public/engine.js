import { Chess } from './chess.js';

const values={p:100,n:320,b:335,r:500,q:900,k:0};
const TIMEOUT=Symbol('search timeout');
let deadline=Infinity;
const squareName=s=>'abcdefgh'[s&7]+(8-(s>>4));
const asMove=m=>({from:squareName(m.from),to:squareName(m.to),...(m.promotion?{promotion:m.promotion}:{})});

// Search uses the bundled chess.js fork's legal moves directly, avoiding SAN/FEN
// construction at every node. Keep repetition bookkeeping identical to move/undo.
function push(game,move){game._makeMove(move);game._incPositionCount();}
function pop(game){const hash=game._hash;game._undoMove();game._decPositionCount(hash);}
function drawn(game){return game.isDrawByFiftyMoves()||game.isThreefoldRepetition()||game.isInsufficientMaterial();}
function ordered(moves){return moves.sort((a,b)=>priority(b)-priority(a));}
function priority(m){return (m.captured?10*values[m.captured]-values[m.piece]:0)+(m.promotion?values[m.promotion]:0);}

function evaluate(game){
  const board=game._board,files={w:Array(8).fill(0),b:Array(8).fill(0)},bishops={w:0,b:0};
  let phase=0,value=0;
  for(let s=0;s<128;s++){if(s&0x88){s+=7;continue;}const p=board[s];if(!p)continue;
    if(p.type==='p')files[p.color][s&7]++;
    if(p.type==='b')bishops[p.color]++;
    phase+=({n:1,b:1,r:2,q:4}[p.type]||0);
  }
  const middlegame=Math.min(24,phase)/24,endgame=1-middlegame;
  const opening=Math.max(0,1-(game.moveNumber()-1)/14)*middlegame;
  for(let s=0;s<128;s++){if(s&0x88){s+=7;continue;}const p=board[s];if(!p)continue;
    const row=s>>4,col=s&7,home=p.color==='w'?7:0,rank=p.color==='w'?7-row:row;
    const center=7-(Math.abs(3.5-row)+Math.abs(3.5-col));let bonus=0;
    if(p.type==='p'){
      // Central space helps; simply pushing every pawn is not development.
      bonus=center*2+rank*rank*5*endgame;
      if(col===3||col===4)bonus+=rank>=2&&rank<=4?22*middlegame:0;
      if(col<=1||col>=6)bonus-=Math.max(0,rank-1)*10*opening;
      bonus-=Math.max(0,rank-3)*10*opening;
      if(files[p.color][col]>1)bonus-=12;
      if(!files[p.color][col-1]&&!files[p.color][col+1])bonus-=10;
    }
    if(p.type==='n')bonus=center*10-(row===home?28*opening:0)-(col===0||col===7?14:0);
    if(p.type==='b'){
      bonus=center*5-(row===home?28*opening:0);
      for(const offset of [-17,-15,15,17])for(let to=s+offset;!(to&0x88);to+=offset){
        if(board[to]){if(board[to].color!==p.color)bonus+=3;break;}bonus+=3;
      }
    }
    if(p.type==='r')bonus=(files[p.color][col]===0?14:0)+(rank===6?22:0)+center*2*endgame;
    if(p.type==='q')bonus=center*3*endgame-(row!==home?20*opening:0);
    if(p.type==='k'){
      bonus=center*12*endgame;
      if(row===home&&(col===2||col===6)){
        bonus+=38*middlegame;
        const forward=p.color==='w'?-16:16;
        for(const delta of [-1,0,1]){const pawn=board[s+forward+delta];if(pawn?.type==='p'&&pawn.color===p.color)bonus+=10*middlegame;}
      }else if(row!==home)bonus-=35*middlegame;
    }
    value+=(p.color==='w'?1:-1)*(values[p.type]+bonus);
  }
  value+=(bishops.w>=2?22:0)-(bishops.b>=2?22:0);
  return (game.turn()==='w'?1:-1)*value;
}

function search(game,depth,alpha,beta,ply,qleft=4){
  if(performance.now()>deadline)throw TIMEOUT;
  const moves=game._moves(),check=game.isCheck();
  if(!moves.length)return check?-100000+ply:0;
  if(drawn(game))return 0;
  if(depth<=0){
    const stand=evaluate(game);
    // Never stand pat in check. Extend evasions, with a cap for checking cycles.
    if(qleft<=-2||(!check&&qleft<=0))return stand;
    if(!check){if(stand>=beta)return stand;alpha=Math.max(alpha,stand);}
    const tactical=check?moves:moves.filter(m=>m.captured||m.promotion);
    for(const move of ordered(tactical)){
      push(game,move);let score;
      try{score=-search(game,0,-beta,-alpha,ply+1,qleft-1);}finally{pop(game);}
      if(score>=beta)return score;alpha=Math.max(alpha,score);
    }
    return alpha;
  }
  for(const move of ordered(moves)){
    push(game,move);let score;
    try{score=-search(game,depth-1,-beta,-alpha,ply+1,qleft);}finally{pop(game);}
    if(score>=beta)return score;alpha=Math.max(alpha,score);
  }
  return alpha;
}

const openings={
  '':['e4','d4','c4','Nf3'],
  'e4':['e5','c5','e6','c6'], 'd4':['d5','Nf6','e6'], 'c4':['e5','c5','Nf6'], 'Nf3':['d5','Nf6','c5'],
  'e4 e5':['Nf3','Bc4','Nc3'], 'e4 c5':['Nf3','Nc3','c3'], 'e4 e6':['d4','Nc3'], 'e4 c6':['d4','Nc3'],
  'd4 d5':['c4','Nf3','Bf4'], 'd4 Nf6':['c4','Nf3','Bf4'], 'd4 e6':['c4','e4','Nf3'],
  'e4 e5 Nf3':['Nc6','Nf6'], 'e4 e5 Bc4':['Bc5','Nf6','Nc6'], 'd4 d5 c4':['e6','c6','dxc4'],
  'e4 e5 Nf3 Nc6':['Bb5','Bc4','d4'], 'd4 d5 c4 e6':['Nc3','Nf3'],
};
function openingMove(game){
  const choices=openings[game.history().join(' ')];if(!choices)return null;
  const moves=game.moves({verbose:true}).filter(m=>choices.includes(m.san));
  if(!moves.length)return null;const move=moves[Math.floor(Math.random()*moves.length)];
  return {from:move.from,to:move.to,...(move.promotion?{promotion:move.promotion}:{})};
}
function repeatPenalty(move,history,game){
  if(history.length>=24||move.captured||move.promotion||move.piece==='k')return 0;
  const home=move.color==='w'?7:0;
  const undeveloped=game._board.filter((p,s)=>p?.color===move.color&&(p.type==='n'||p.type==='b')&&(s>>4)===home).length;
  if(!undeveloped)return 0;
  const own=history.filter(m=>m.color===move.color),from=squareName(move.from);
  // Quiet repeated pushes and piece shuffles both defer development. Tactics
  // still dominate this small positional preference; no piece-type quotas.
  if(move.piece==='p')return own.filter(m=>m.piece==='p').length>=2?12*undeveloped:0;
  let square=from,count=0;
  for(const previous of own.slice(-3).reverse())if(previous.to===square){count++;square=previous.from;}
  return count*14;
}
function chooseMove(game,level,options={}){
  if(options.book){const book=openingMove(game);if(book)return book;}
  const candidates=ordered(game._moves());if(!candidates.length)return null;
  const history=game.history({verbose:true});
  // Score every legal move before the timed search, even on a slow device.
  let complete=candidates.map(move=>{
    const penalty=repeatPenalty(move,history,game);push(game,move);
    let score;try{score=-evaluate(game);}finally{pop(game);}
    return {move,score:score-penalty,penalty};
  }).sort((a,b)=>b.score-a.score);
  deadline=performance.now()+[0,350,850,1600][level];
  for(let depth=1;depth<=[0,2,3,4][level];depth++){
    const scored=[];let interrupted=false;
    try{for(const {move,penalty} of complete){
      push(game,move);let score;
      try{score=-search(game,depth-1,-Infinity,Infinity,1);}finally{pop(game);}
      scored.push({move,score:score-penalty,penalty});
    }}catch(error){if(error!==TIMEOUT)throw error;interrupted=true;}
    if(interrupted)break;
    complete=scored.sort((a,b)=>b.score-a.score);
    if(complete[0].score>90000)break;
  }
  const tolerance=options.hint?0:level===1?18:level===2?8:3;
  const choices=complete.filter(item=>item.score>=complete[0].score-tolerance);
  return asMove(choices[Math.floor(Math.random()*choices.length)].move);
}
self.onmessage=({data})=>{
  const game=new Chess(data.fen);
  if(Array.isArray(data.moves)){
    for(const move of data.moves){game.setQueenJumpLimits(move.queenJumps);game.move(move);}
  }else if(data.pgn)game.loadPgn(data.pgn);
  game.setQueenJumpLimits(data.queenJumps);
  const variant=!!(data.queenJumps?.w||data.queenJumps?.b||data.moves?.some(m=>m.queenJumps?.w||m.queenJumps?.b));
  self.postMessage(chooseMove(game,Math.max(1,Math.min(3,Number(data.level)||2)),{book:!data.hint&&!variant,hint:!!data.hint}));
};
