import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
const origin='http://127.0.0.1:5173';
const request=async(body,token='')=>{const response=await fetch(origin+'/api/rooms',{method:'POST',headers:{'Content-Type':'application/json','X-Player-Token':token},body:JSON.stringify(body)});return {status:response.status,data:await response.json()};};
const read=async(code,token)=>{const response=await fetch(origin+'/api/rooms?code='+code,{headers:{'X-Player-Token':token}});return {status:response.status,data:await response.json()};};
function localDb(){const dir=resolve('.wrangler/state/v3/d1/miniflare-D1DatabaseObject');const file=readdirSync(dir).find(f=>f.endsWith('.sqlite'));return new DatabaseSync(resolve(dir,file));}

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
