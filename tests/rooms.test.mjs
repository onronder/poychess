import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { replay } from '../lib/chess.ts';
const origin='http://127.0.0.1:5173';
const request=async(body,token='')=>{const response=await fetch(origin+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json','X-Player-Token':token},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
const read=async(code,token)=>{const response=await fetch(origin+'/api/rooms?code='+code,{headers:{'X-Player-Token':token}});return {status:response.status,data:await response.json()};};
function localDb(){const dir=resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');const file=readdirSync(dir).find(f=>f.endsWith('.sqlite'));return new DatabaseSync(resolve(dir,file));}

test('takeback needs opponent approval, rejects duplicates and preserves spent clock time',async()=>{
  const created=await request({action:'create',control:'3 + 2'});const code=created.data.code,wt=created.data.token;
  const joined=await request({action:'join',code});const bt=joined.data.token;
  let room=joined.data;
  const act=async(action,token,extra={})=>{const result=await request({action,code,version:room.version,...extra},token);if(result.status===200)room=result.data;return result;};
  assert.equal((await act('takeback',wt)).status,409);
  await act('move',wt,{from:'e2',to:'e4'});
  await act('takeback',wt);assert.equal(room.takebackOffer,'w');assert.equal(room.moves.length,1);
  assert.equal((await act('takeback',wt)).status,409);
  assert.equal((await act('takeback','invalid')).status,403);
  await act('takeback-decline',bt);assert.equal(room.takebackOffer,null);assert.equal(room.moves.length,1);
  await act('takeback',wt);
  const before={...room};assert.equal(room.increment,2000);
  const accepted=await Promise.all([act('takeback',bt),act('takeback',bt)]);
  assert.deepEqual(accepted.map(x=>x.status).sort(),[200,409]);
  assert.equal(room.moves.length,0);assert.equal(room.takebackOffer,null);assert.equal(room.turn,'w');
  assert.ok(room.whiteMs<=before.whiteMs-room.increment);assert.ok(room.blackMs<=before.blackMs);
  assert.equal((await read(code,wt)).data.moves.length,0);
  await act('move',wt,{from:'d2',to:'d4'});await act('takeback',wt);
  await act('move',bt,{from:'d7',to:'d5'});assert.equal(room.takebackOffer,null);assert.equal(room.moves.length,2);
});

test('queen-jump limits are authorized, replayable, visible to both players and restored on takeback',async()=>{
  const created=await request({action:'create'});const code=created.data.code,wt=created.data.token;
  const joined=await request({action:'join',code});const bt=joined.data.token;let room=joined.data;
  const act=async(action,token,extra={})=>{const result=await request({action,code,version:room.version,...extra},token);if(result.status===200)room=result.data;return result;};
  assert.equal((await act('move',wt,{from:'d1',to:'h5',queenJumps:{w:6,b:0}})).status,400);
  assert.equal((await act('queen-jumps',wt,{unlock:'wrong',limit:1})).status,403);
  for(const limit of [-1,7,1.5])assert.equal((await act('queen-jumps',wt,{unlock:'7654321',limit})).status,400);
  assert.equal((await act('queen-jumps',bt,{unlock:'7654321',limit:1})).status,409);
  assert.equal((await act('queen-jumps',wt,{unlock:'7654321',limit:1})).status,200);
  assert.deepEqual(room.queenJumps,{w:1,b:0});assert.deepEqual((await read(code,bt)).data.queenJumps,room.queenJumps);
  assert.equal((await act('move',wt,{from:'d1',to:'h5'})).status,200);
  assert.equal(replay(room.moves,undefined,room.queenJumps).get('e2')?.type,'p');
  assert.equal((await act('move',bt,{from:'g7',to:'g6'})).status,200);
  await act('queen-jumps',wt,{unlock:'7654321',limit:0});
  assert.equal(room.queenJumps.w,0);assert.equal(replay(room.moves,undefined,room.queenJumps).get('h5')?.type,'q');
  await act('takeback',wt);await act('takeback',bt);
  assert.equal(room.moves.length,1);assert.deepEqual(room.queenJumps,{w:1,b:0});assert.equal(room.turn,'b');
  await act('takeback',bt);await act('takeback',wt);
  assert.equal(room.moves.length,0);assert.equal(replay(room.moves,undefined,room.queenJumps).get('d1')?.type,'q');
});

test('two-player rooms: join, auth, turns, race protection, hints and final result',async()=>{
  let white=await request({action:'create',name:'Test Beyaz',control:'10 + 0'});assert.equal(white.status,201);const code=white.data.code;const wt=white.data.token;
  assert.equal(white.data.status,'waiting');assert.equal((await read(code,'unauthorized')).status,403);
  const joins=await Promise.all([request({action:'join',code,name:'Test Siyah'}),request({action:'join',code,name:'Test Diğer'})]);
  assert.deepEqual(joins.map(j=>j.status).sort(),[200,409]);let black=joins.find(j=>j.status===200);const bt=black.data.token;
  assert.equal(black.data.role,'b');white=await read(code,wt);
  assert.equal((await request({action:'move',code,version:white.data.version,from:'e7',to:'e5'},bt)).status,409);
  assert.equal((await request({action:'move',code,version:white.data.version,from:'e2',to:'e5'},wt)).status,400);
  white=await request({action:'move',code,version:white.data.version,from:'e2',to:'e4'},wt);assert.equal(white.status,200);
  black=await read(code,bt);assert.equal(black.data.moves[0].to,'e4');
  black=await request({action:'move',code,version:black.data.version,from:'e7',to:'e5'},bt);assert.equal(black.status,200);
  const bad=await request({action:'hint',code,unlock:'wrong'},wt);assert.equal(bad.status,403);
  white=await request({action:'hint',code,unlock:'7654321'},wt);assert.equal(white.status,200);assert.equal(white.data.hintCount,1);
  assert.equal((await request({action:'hint',code,unlock:'7654321'},wt)).status,429);
  assert.equal((await read(code,wt)).data.hintCount,1);
  assert.equal((await read(code,bt)).data.hintCount,0);
  const db=localDb();db.prepare('UPDATE rooms SET white_hint_count=9,white_hint_at=? WHERE code=?').run(Date.now()-21000,code);db.close();
  white=await request({action:'hint',code,unlock:'7654321'},wt);assert.equal(white.data.hintCount,10);
  assert.equal((await request({action:'hint',code,unlock:'7654321'},wt)).status,429);
  assert.equal((await read(code,wt)).data.hintCount,10);
  assert.equal((await request({action:'move',code,version:0,from:'g1',to:'f3'},wt)).status,409);
  white=await request({action:'draw',code,version:white.data.version},wt);assert.equal(white.data.drawOffer,'w');
  black=await request({action:'draw',code,version:white.data.version},bt);assert.equal(black.data.status,'finished');assert.match(black.data.result,/beraberlik/);
  assert.equal((await request({action:'move',code,version:black.data.version,from:'g1',to:'f3'},wt)).status,409);
  const another=await request({action:'create',name:'Yeni maç'});assert.equal(another.data.hintCount,0);
});

test('server enforces time expiry and rejects unauthorized writes',async()=>{
  const white=await request({action:'create',name:'Saat testi'});const code=white.data.code;
  const black=await request({action:'join',code});
  assert.equal((await request({action:'resign',code,version:black.data.version},'invalid')).status,403);
  const db=localDb();db.prepare('UPDATE rooms SET white_ms=1,updated_at=? WHERE code=?').run(Date.now()-2000,code);db.close();
  const ended=await read(code,white.data.token);assert.equal(ended.data.status,'finished');assert.match(ended.data.result,/Siyah süre/);assert.equal(ended.data.whiteMs,0);
});
