import test from 'node:test';
import assert from 'node:assert/strict';
import { Chess } from 'chess.js';
import { replay, puzzles, gameResult } from '../lib/chess.ts';
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
