import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from '../public/chess.js';
import { Chess as StandardChess } from 'chess.js';
import { replay, puzzles, gameResult, queenSettingError } from '../lib/chess.ts';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

test('all teaching puzzles have legal, complete continuations',()=>{
  for(const puzzle of puzzles){const game=new Chess(puzzle.fen);for(const uci of puzzle.solution)assert.ok(game.move({from:uci.slice(0,2),to:uci.slice(2,4),promotion:uci[4]}));
    if(puzzle.theme.includes('matı')||puzzle.theme.includes('mat'))assert.ok(game.isCheckmate(),puzzle.title);
    else assert.equal(game.get('d8')?.type,'n');
  }
});
test('castling, en passant, promotion, and illegal moves',()=>{
  const castling=new Chess('r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1');castling.move('O-O');assert.equal(castling.get('f1')?.type,'r');
  const ep=new Chess();for(const m of ['e4','a6','e5','d5','exd6'])ep.move(m);assert.equal(ep.get('d5'),undefined);assert.equal(ep.get('d6')?.color,'w');
  const promotion=new Chess('7k/P7/8/8/8/8/8/7K w - - 0 1');promotion.move({from:'a7',to:'a8',promotion:'n'});assert.equal(promotion.get('a8')?.type,'n');
  assert.throws(()=>new Chess().move({from:'e2',to:'e5'}));
});
test('replayed move history preserves threefold repetition',()=>{
  const game=new Chess();for(const move of ['Nf3','Nf6','Ng1','Ng8','Nf3','Nf6','Ng1','Ng8'])game.move(move);
  const loaded=replay(game.history({verbose:true}).map(m=>({from:m.from,to:m.to})));assert.equal(loaded.isThreefoldRepetition(),true);assert.match(gameResult(loaded),/Üç kez/);
});
test('engine returns a legal move and finds immediate mate',()=>{
  let result;const context={Chess,performance,self:{postMessage:value=>{result=value;}}};
  vm.runInNewContext(readFileSync(new URL('../public/engine.js',import.meta.url),'utf8').replace("import { Chess } from './chess.js';",''),context);
  const game=new Chess(puzzles[0].fen);context.self.onmessage({data:{pgn:game.pgn(),level:3}});assert.ok(game.move(result));assert.equal(game.isCheckmate(),true);
  const start=new Chess();context.self.onmessage({data:{pgn:start.pgn(),level:2}});assert.ok(start.move(result));
});

test('zero queen jumps preserves standard move generation',()=>{
  const game=new Chess();assert.equal(game.perft(3),8902);
  for(const fen of ['r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1','4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1']){
    assert.equal(new Chess(fen).perft(2),new StandardChess(fen).perft(2));
  }
});
test('queen jump count includes friendly and enemy pieces but never captures the jumped pieces',()=>{
  const fen='7k/8/8/8/8/8/1P1p1r2/Q6K w - - 0 1';
  const game=new Chess(fen);game.setQueenJumpLimits({w:1});
  game.move({from:'a1',to:'c3'});assert.equal(game.get('b2')?.type,'p');
  const line=new Chess('7k/8/8/8/8/8/8/QNn1r2K w - - 0 1');
  line.setQueenJumpLimits({w:1});assert.throws(()=>line.move({from:'a1',to:'e1'}));
  line.setQueenJumpLimits({w:2});line.move({from:'a1',to:'e1'});
  assert.equal(line.get('b1')?.color,'w');assert.equal(line.get('c1')?.color,'b');assert.equal(line.get('e1')?.type,'q');
  const own=new Chess('7k/8/8/8/8/8/8/QN5K w - - 0 1');own.setQueenJumpLimits({w:6});assert.throws(()=>own.move({from:'a1',to:'b1'}));
});
test('queen jumps affect check and castling, while own king remains protected',()=>{
  const check=new Chess('Q4n1k/8/8/8/8/8/8/K7 b - - 0 1');assert.equal(check.isCheck(),false);check.setQueenJumpLimits({w:1});assert.equal(check.isCheck(),true);
  const pinned=new Chess('k3r3/8/8/8/8/8/4Q3/4K3 w - - 0 1');pinned.setQueenJumpLimits({w:6});assert.throws(()=>pinned.move({from:'e2',to:'b5'}));
  const castle=new Chess('k4q2/5p2/8/8/8/8/8/4K2R w K - 0 1');assert.ok(castle.moves().includes('O-O'));castle.setQueenJumpLimits({b:1});assert.ok(!castle.moves().includes('O-O'));
  const setting=new Chess('Q4n1k/8/8/8/8/8/8/K7 w - - 0 1');assert.match(queenSettingError(setting,'w',{w:1,b:0}),/rakip şaha/);
});
test('saved queen-jump moves replay even after the ability is disabled',()=>{
  const moves=[{from:'d1',to:'h5',queenJumps:{w:1,b:0}}];
  const game=replay(moves,undefined,{w:0,b:0});assert.equal(game.get('h5')?.type,'q');assert.equal(game.get('e2')?.type,'p');assert.equal(game.history().length,1);assert.match(game.pgn(),/PoyChess Queen Jump/);
});
test('bot opens with varied pawn replies and can handle a queen-jump position',()=>{
  let result;let random=0;const fakeMath=Object.create(Math);fakeMath.random=()=>random;
  const context={Chess,performance,Math:fakeMath,self:{postMessage:value=>{result=value;}}};
  vm.runInNewContext(readFileSync(new URL('../public/engine.js',import.meta.url),'utf8').replace("import { Chess } from './chess.js';",''),context);
  const replies=new Set();
  for(const seed of [.01,.26,.51,.76]){random=seed;const game=new Chess();game.move('e4');context.self.onmessage({data:{pgn:game.pgn(),level:2}});const move=game.move(result);assert.equal(move.piece,'p');replies.add(move.san);}
  assert.equal(replies.size,4);
  const moves=[{from:'d1',to:'h5',queenJumps:{w:1,b:0}}];
  context.self.onmessage({data:{moves,queenJumps:{w:1,b:0},level:1}});
  assert.ok(replay(moves,undefined,{w:1,b:0}).move(result));
});
