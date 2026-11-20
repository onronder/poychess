import { Chess } from './chess.js';
const values={p:100,n:320,b:335,r:500,q:900,k:0};
function evaluate(game){
  if(game.isCheckmate()) return game.turn()==='w'?-100000:100000;
  if(game.isDraw()) return 0;
  let value=0;
  const board=game.board();
  for(let row=0;row<8;row++) for(let col=0;col<8;col++){
    const p=board[row][col]; if(!p) continue;
    const advance=p.color==='w'?6-row:row-1;
    const center=7-(Math.abs(3.5-row)+Math.abs(3.5-col));
    const bonus=p.type==='p'?advance*7+center*3:p.type==='n'||p.type==='b'?center*11:0;
    value+=(p.color==='w'?1:-1)*(values[p.type]+bonus);
  } return value;
}
let deadline;
function search(game,depth,alpha,beta){
  if(depth===0||game.isGameOver()||performance.now()>deadline) return evaluate(game);
  const maximizing=game.turn()==='w'; let best=maximizing?-Infinity:Infinity;
  const moves=game.moves({verbose:true}).sort((a,b)=>(values[b.captured]||0)-(values[a.captured]||0));
  for(const move of moves){game.move(move);const value=search(game,depth-1,alpha,beta);game.undo();
    if(maximizing){best=Math.max(best,value);alpha=Math.max(alpha,best);}else{best=Math.min(best,value);beta=Math.min(beta,best);}
    if(beta<=alpha||performance.now()>deadline)break;
  } return best;
}
self.onmessage=({data})=>{
  const game=new Chess(); if(data.pgn) game.loadPgn(data.pgn);
  const moves=game.moves({verbose:true}); if(!moves.length){self.postMessage(null);return;}
  const side=game.turn()==='w'?1:-1; const depth=Number(data.level); deadline=performance.now()+(depth===3?1800:650);
  let best=moves[0],score=-Infinity;
  for(const move of moves.sort((a,b)=>(values[b.captured]||0)-(values[a.captured]||0))){
    game.move(move);const value=side*search(game,depth-1,-Infinity,Infinity)+(depth===1?Math.random()*110:Math.random()*8);game.undo();
    if(value>score){score=value;best=move;}
    if(performance.now()>deadline)break;
  }
  self.postMessage({from:best.from,to:best.to,promotion:best.promotion});
};
