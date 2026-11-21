import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {Chess} from '../public/chess.js';
const source=readFileSync(new URL('../public/engine.js',import.meta.url),'utf8').replace("import { Chess } from './chess.js';",'');
function engine(seed=123,clock){
  let result,ticks=0;const math=Object.create(Math);
  math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  // Deterministic work budget makes the same position reproducible across CPUs.
  const context=vm.createContext({Chess,Math:math,performance:clock||{now:()=>ticks++/20},self:{postMessage:m=>result=m}});
  vm.runInContext(source,context);
  return {context,move:(game,level=2)=>{context.self.onmessage({data:{pgn:game.pgn(),level}});return result;}};
}
test('bot develops knights and bishops instead of repeatedly pushing pawns',()=>{
  for(const level of [1,2,3]){
    const bot=engine(100+level),game=new Chess();
    for(let ply=0;ply<16&&!game.isGameOver();ply++)assert.ok(game.move(bot.move(game,level)));
    for(const color of ['w','b']){
      const own=game.history({verbose:true}).filter(m=>m.color===color);
      assert.ok(own.some(m=>m.piece==='n'),game.pgn());
      assert.ok(own.some(m=>m.piece==='b'),game.pgn());
      assert.ok(own.filter(m=>m.piece==='p').length<=5,game.pgn());
      assert.ok(own.filter(m=>m.piece!=='p').length>=3,game.pgn());
    }
    console.log(`Level ${level}: ${game.pgn()}`);
  }
});
test('bot develops outside its opening repertoire against quiet flank moves',()=>{
  const bot=engine(54),game=new Chess();
  for(const san of ['h3','a3','g3','b3','Bg2','Bb2']){
    if(!game.moves().includes(san))break;
    game.move(san);game.move(bot.move(game));
  }
  const black=game.history({verbose:true}).filter(m=>m.color==='b');
  assert.ok(black.some(m=>m.piece==='n'),game.pgn());
  assert.ok(black.some(m=>m.piece==='b'),game.pgn());
  assert.ok(black.filter(m=>m.piece==='p').length<=3,game.pgn());
});
test('bot considers recaptures and still plays a winning pawn promotion',()=>{
  const bot=engine();
  const trap=new Chess('3r2k1/5ppp/8/3p4/8/8/5PPP/3Q2K1 w - - 0 1');
  const move=trap.move(bot.move(trap,1));assert.notEqual(move.san,'Qxd5');
  const promotion=new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');
  const promoted=promotion.move(bot.move(promotion,2));assert.equal(promoted.piece,'p');assert.equal(promoted.promotion,'q');
});
test('completed and interrupted searches restore board, clocks, castling and repetition state',()=>{
  for(const interrupted of [false,true]){
    let ticks=0;const bot=engine(5,interrupted?{now:()=>ticks++*200}:undefined);
    for(const fen of ['r3k2r/8/8/3pP3/8/8/8/R3K2R w KQkq d6 0 1','7k/P7/8/8/8/8/8/7K w - - 0 1']){
      const game=new Chess(fen);game.setQueenJumpLimits({w:2,b:1});bot.context.game=game;
      const before={fen:game.fen(),hash:game._hash,counts:[...game._positionCount]};
      const move=vm.runInContext('chooseMove(game,2,{book:false})',bot.context);
      assert.equal(game.fen(),before.fen);assert.equal(game._hash,before.hash);assert.deepEqual([...game._positionCount],before.counts);assert.equal(game.history().length,0);
      assert.ok(game.move(move));
    }
    const repeated=new Chess();for(const m of ['Nf3','Nf6','Ng1','Ng8'])repeated.move(m);
    bot.context.game=repeated;const counts=[...repeated._positionCount],history=repeated.history();
    vm.runInContext('chooseMove(game,2,{book:false})',bot.context);
    assert.deepEqual([...repeated._positionCount],counts);assert.deepEqual(repeated.history(),history);
  }
});
