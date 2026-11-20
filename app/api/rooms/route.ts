import { env } from 'cloudflare:workers';
import { replay, gameResult, timeControls, type PlayedMove } from '@/lib/chess';
type Room = { code:string; white_token:string; black_token:string|null; white_name:string; black_name:string|null; moves:string; status:string; result:string|null; white_ms:number; black_ms:number; increment:number; updated_at:number; expires_at:number; version:number; draw_offer:string|null; white_hint_count:number; black_hint_count:number; white_hint_at:number; black_hint_at:number };
const json = (data:unknown, status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const hash = async (value:string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('');
const name = (value:unknown) => typeof value === 'string' ? value.trim().slice(0,24) || 'Satrançsever' : 'Satrançsever';
function view(room:Room, role:string) {
  const game = replay(JSON.parse(room.moves));
  return {code:room.code,whiteName:room.white_name,blackName:room.black_name,moves:JSON.parse(room.moves),status:room.status,result:room.result,whiteMs:room.white_ms,blackMs:room.black_ms,increment:room.increment,updatedAt:room.updated_at,serverNow:Date.now(),version:room.version,drawOffer:room.draw_offer,role,turn:game.turn(),hintCount:role==='w'?room.white_hint_count:room.black_hint_count,hintAt:role==='w'?room.white_hint_at:room.black_hint_at};
}
async function load(code:string):Promise<Room|null> {
  if (!env.DB) throw new Error('DB unavailable');
  const room = await env.DB.prepare('SELECT * FROM rooms WHERE code = ?').bind(code).first<Room>();
  if (!room || room.expires_at < Date.now()) return null;
  if (room.status === 'active') {
    const game = replay(JSON.parse(room.moves));
    const clock = game.turn() === 'w' ? room.white_ms : room.black_ms;
    if (Date.now() - room.updated_at >= clock) {
      const result = `${game.turn() === 'w' ? 'Siyah' : 'Beyaz'} süre ile kazandı.`;
      const expiredWhite=game.turn()==='w'?0:room.white_ms;
      const expiredBlack=game.turn()==='b'?0:room.black_ms;
      const update = await env.DB.prepare('UPDATE rooms SET status = ?, result = ?, white_ms = ?, black_ms = ?, version = version + 1 WHERE code = ? AND version = ?').bind('finished',result,expiredWhite,expiredBlack,code,room.version).run();
      if (update.meta.changes) {room.status='finished';room.result=result;room.white_ms=expiredWhite;room.black_ms=expiredBlack;room.version++;}
      else return load(code);
    }
  }
  return room;
}
export async function GET(request:Request) {
  try {
    const code = new URL(request.url).searchParams.get('code')?.toUpperCase() || '';
    if (!/^[A-Z2-9]{6}$/.test(code)) return json({error:'Geçerli bir 6 karakterli oda kodu gir.'},400);
    const room = await load(code);
    if (!room) return json({error:'Oda bulunamadı veya süresi doldu.'},404);
    const token = await hash(request.headers.get('X-Player-Token') || '');
    const role = token===room.white_token ? 'w' : token===room.black_token ? 'b' : null;
    if (!role) return json({error:'Bu odaya önce katılmalısın.'},403);
    return json(view(room,role));
  } catch {return json({error:'Odaya ulaşılamıyor. Birazdan tekrar dene.'},503);}
}
export async function POST(request:Request) {
  try {
    const origin = request.headers.get('Origin');
    if (origin && origin !== new URL(request.url).origin) return json({error:'Geçersiz istek kaynağı.'},403);
    if (!env.DB) throw new Error('DB unavailable');
    const raw = await request.text();
    if (raw.length > 2048) return json({error:'İstek çok büyük.'},413);
    let body;
    try {body=JSON.parse(raw);} catch {return json({error:'Geçersiz istek.'},400);}
    if (!body || typeof body !== 'object') return json({error:'Geçersiz istek.'},400);
    const now = Date.now();
    if (body.action === 'create') {
      const control = timeControls.find(t=>t.label===body.control) || timeControls[2];
      const token=crypto.randomUUID(); const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      for(let attempt=0;attempt<5;attempt++) {
        const code=Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>alphabet[n%alphabet.length]).join('');
        const inserted=await env.DB.prepare('INSERT OR IGNORE INTO rooms (code,white_token,white_name,white_ms,black_ms,increment,updated_at,expires_at) VALUES (?,?,?,?,?,?,?,?)').bind(code,await hash(token),name(body.name),control.minutes*60000,control.minutes*60000,control.increment*1000,now,now+86400000).run();
        if(inserted.meta.changes) return json({...view((await load(code))!,'w'),token},201);
      }
      return json({error:'Oda oluşturulamadı. Tekrar dene.'},503);
    }
    const code=typeof body.code==='string' ? body.code.toUpperCase() : '';
    if(!/^[A-Z2-9]{6}$/.test(code)) return json({error:'Geçerli bir 6 karakterli oda kodu gir.'},400);
    const room=await load(code);
    if(!room) return json({error:'Oda bulunamadı veya 24 saatlik süresi doldu.'},404);
    const tokenHash=await hash(request.headers.get('X-Player-Token') || '');
    const role=tokenHash===room.white_token ? 'w' : tokenHash===room.black_token ? 'b' : null;
    if(body.action==='join') {
      if(role) return json(view(room,role));
      if(room.status!=='waiting') return json({error:'Bu oda dolu veya oyun sona erdi.'},409);
      const token=crypto.randomUUID();
      const updated=await env.DB.prepare('UPDATE rooms SET black_token=?,black_name=?,status=?,updated_at=?,version=version+1 WHERE code=? AND version=? AND status=?').bind(await hash(token),name(body.name),'active',now,code,room.version,'waiting').run();
      if(!updated.meta.changes) return json({error:'Bu odaya başka bir oyuncu katıldı.'},409);
      return json({...view((await load(code))!,'b'),token});
    }
    if(!role) return json({error:'Bu oyun için yetkin yok.'},403);
    if(room.status!=='active') return json({error:room.status==='waiting'?'Arkadaşının katılması bekleniyor.':'Oyun sona erdi.'},409);
    if(body.action==='hint') {
      if(body.unlock!=='7654321') return json({error:'İpucu kodu hatalı.'},403);
      const count=role==='w'?room.white_hint_count:room.black_hint_count;
      const last=role==='w'?room.white_hint_at:room.black_hint_at;
      if(count>=10) return json({error:'Bu maçtaki 10 ipucunu kullandın.'},429);
      if(now-last<20000) return json({error:'İpuçları arasında 20 saniye beklemelisin.'},429);
      if(replay(JSON.parse(room.moves)).turn()!==role) return json({error:'İpucunu sıra sendeyken kullanabilirsin.'},409);
      const query=role==='w' ? 'UPDATE rooms SET white_hint_count=white_hint_count+1,white_hint_at=?,version=version+1 WHERE code=? AND version=?' : 'UPDATE rooms SET black_hint_count=black_hint_count+1,black_hint_at=?,version=version+1 WHERE code=? AND version=?';
      const changed=await env.DB.prepare(query).bind(now,code,room.version).run();
      if(!changed.meta.changes) return json({error:'Oyun güncellendi. Tekrar dene.'},409);
      return json(view((await load(code))!,role));
    }
    if(body.version!==room.version) return json({error:'Oyun güncellendi. Hamleni tekrar dene.'},409);
    let moves:PlayedMove[]=JSON.parse(room.moves); const game=replay(moves);
    let result=room.result, status=room.status, draw=room.draw_offer;
    let white=room.white_ms,black=room.black_ms,updatedAt=room.updated_at;
    if(body.action==='move') {
      if(game.turn()!==role) return json({error:'Şu anda rakibinin sırası.'},409);
      try {
        const move=game.move({from:body.from,to:body.to,promotion:body.promotion||'q'});
        moves=[...moves,{from:move.from,to:move.to,...(move.promotion?{promotion:move.promotion}:{})}];
      } catch {return json({error:'Bu hamle geçerli değil.'},400);}
      const elapsed=now-room.updated_at;
      if(role==='w') white=Math.max(0,white-elapsed)+room.increment; else black=Math.max(0,black-elapsed)+room.increment;
      updatedAt=now; result=gameResult(game); if(result) status='finished';
      if(draw && draw!==role) draw=null;
    } else if(body.action==='resign') {
      status='finished';result=`${role==='w'?'Siyah':'Beyaz'} kazandı. Rakibi terk etti.`;
    } else if(body.action==='draw') {
      if(draw && draw!==role){status='finished';result='Anlaşmalı beraberlik.';draw=null;} else draw=role;
    } else return json({error:'Geçersiz işlem.'},400);
    if(status==='finished'&&body.action!=='move'){
      const elapsed=Math.max(0,now-room.updated_at);
      if(game.turn()==='w')white=Math.max(0,white-elapsed);else black=Math.max(0,black-elapsed);
      updatedAt=now;
    }
    const updated=await env.DB.prepare('UPDATE rooms SET moves=?,white_ms=?,black_ms=?,updated_at=?,status=?,result=?,draw_offer=?,version=version+1 WHERE code=? AND version=?').bind(JSON.stringify(moves),white,black,updatedAt,status,result,draw,code,room.version).run();
    if(!updated.meta.changes) return json({error:'Oyun güncellendi. Lütfen tekrar dene.'},409);
    return json(view((await load(code))!,role));
  } catch {return json({error:'Sunucuya ulaşılamıyor. Lütfen tekrar dene.'},503);}
}
