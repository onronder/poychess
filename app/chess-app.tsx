'use client';

import { useEffect, useRef, useState } from 'react';
import { Chess, type Square } from 'chess.js';
import { Swords, Puzzle, BookOpen, History, Settings2, CircleHelp, ChevronRight, ChevronLeft, ChevronsLeft, ChevronsRight, RotateCcw, RotateCw, Flag, Handshake, Copy, Check, X, Volume2, VolumeX, Zap, Clock3, Users, Bot, Crown, Sparkles, Download, KeyRound, Lightbulb, ShieldCheck, Menu, MonitorSmartphone, Play, Trophy, Target } from 'lucide-react';
import Piece from '@/components/piece';
import { replay, gameResult, formatClock, timeControls, puzzles, pieceNames, type PlayedMove } from '@/lib/chess';

type Room = {code:string;whiteName:string;blackName:string|null;moves:PlayedMove[];status:string;result:string|null;whiteMs:number;blackMs:number;increment:number;updatedAt:number;serverNow:number;version:number;drawOffer:string|null;role:'w'|'b';turn:'w'|'b';hintCount:number;hintAt:number;token?:string};
type LocalGame = {id:string;moves:PlayedMove[];whiteMs:number;blackMs:number;stamp:number;active:boolean;result:string|null;color:'w'|'b';level:number;increment:number;hintCount:number;hintAt:number};
type GameRecord = {id:string;date:string;opponent:string;result:string;pgn:string};
const fresh = ():LocalGame => ({id:Date.now().toString(),moves:[],whiteMs:600000,blackMs:600000,stamp:Date.now(),active:false,result:null,color:'w',level:2,increment:0,hintCount:0,hintAt:0});
const lessons = [
  {title:'Taşlarını tanı',subtitle:'Satrancın alfabesi',icon:Crown,text:'Şah her yöne bir kare, vezir düz ve çapraz, kale düz, fil çapraz hareket eder. At L çizer ve taşların üzerinden atlayabilir. Piyon ileri gider, çapraz alır; ilk hamlesinde iki kare ilerleyebilir.',tip:'Taşların yaklaşık değeri: piyon 1, at ve fil 3, kale 5, vezir 9. Şahın değeri hesaplanmaz; onu korumalısın.'},
  {title:'Güçlü bir başlangıç',subtitle:'Açılışın üç altın kuralı',icon:Zap,text:'Önce merkezi kontrol et. e4 veya d4 ile başla, atlarını ve fillerini geliştir. Aynı taşı gereksiz yere tekrar oynama. Vezirini çok erken çıkarmak rakibe tempo kazandırabilir.',tip:'Şahını rok yaparak güvene al. Rok için şah ve kale hareket etmemiş olmalı; araları boş olmalı ve şah tehdit altındaki bir kareden geçmemelidir.'},
  {title:'Taktikleri fark et',subtitle:'Çatal, şiş ve açmaz',icon:Target,text:'Çatal, bir taşla iki tehdittir. Açmazda taş hareket ederse arkasındaki daha değerli taşı açığa çıkarır. Şişte önce değerli taş tehdit edilir, o kaçınca arkasındaki taş alınır.',tip:'Her hamlede önce şah çekişleri, sonra taş alışlarını, ardından doğrudan tehditleri incele. Taktik bölümünde bu düşünme biçimini çalış.'},
  {title:'Oyunu bitir',subtitle:'Mat ve beraberlik',icon:Trophy,text:'Şah tehdit altındaysa ve hiçbir yasal hamleyle kurtulamıyorsa mat olur. Şah tehdit altında değilken hiç yasal hamle yoksa pat olur: oyun beraberedir.',tip:'Piyon son sıraya ulaştığında vezir, kale, fil veya ata terfi eder. En güçlü taş çoğunlukla vezirdir; bazen at terfisi taktik kazandırır.'},
];

export default function ChessApp() {
  const [section,setSection]=useState('play'); const [tab,setTab]=useState('ai');
  const [local,setLocal]=useState<LocalGame>(fresh); const [ready,setReady]=useState(false);
  const [room,setRoom]=useState<Room|null>(null); const roomRef=useRef<Room|null>(null); roomRef.current=room;
  const tokenRef=useRef(''); const serverOffset=useRef(0);
  const [name,setName]=useState('Satrançsever'); const [joinCode,setJoinCode]=useState('');
  const [control,setControl]=useState(2); const [level,setLevel]=useState(2); const [side,setSide]=useState('w');
  const [selected,setSelected]=useState<Square|null>(null); const [flipped,setFlipped]=useState(false);
  const [busy,setBusy]=useState(false); const [thinking,setThinking]=useState(false); const [error,setError]=useState('');
  const [toast,setToast]=useState(''); const [now,setNow]=useState(Date.now()); const [connected,setConnected]=useState(true);
  const [modal,setModal]=useState<string|null>(null); const [menu,setMenu]=useState(false);
  const [sound,setSound]=useState(true); const [showLegal,setShowLegal]=useState(true); const [blue,setBlue]=useState(false);
  const [promotion,setPromotion]=useState<{from:string;to:string}|null>(null);
  const [review,setReview]=useState<number|null>(null); const [records,setRecords]=useState<GameRecord[]>([]);
  const [puzzleIndex,setPuzzleIndex]=useState(0); const [puzzleMoves,setPuzzleMoves]=useState<PlayedMove[]>([]);
  const [puzzleMessage,setPuzzleMessage]=useState(''); const [solved,setSolved]=useState<string[]>([]);
  const [hintOpen,setHintOpen]=useState(false); const [unlocked,setUnlocked]=useState(false); const [unlockCode,setUnlockCode]=useState(''); const [unlockError,setUnlockError]=useState('');
  const [hintBusy,setHintBusy]=useState(false); const [hint,setHint]=useState<{from:string;to:string;san:string;fen:string}|null>(null);
  const hintWorker=useRef<Worker|null>(null); const localRef=useRef(local); localRef.current=local;
  const puzzle=puzzles[puzzleIndex]; const isPuzzle=section==='tactics';
  const moves=isPuzzle?puzzleMoves:room?room.moves:local.moves;
  const game=replay(moves,isPuzzle?puzzle.fen:undefined);
  const shownGame=review!==null&&!isPuzzle?replay(moves.slice(0,review)):game;
  const result=isPuzzle?null:room?room.result:local.result;
  const myColor=isPuzzle?'w':room?room.role:local.color;
  const isFlipped=flipped;
  const puzzleDone=puzzleMoves.length>=puzzle.solution.length;
  const lastMove=shownGame.history({verbose:true}).at(-1);
  const legal=selected?shownGame.moves({square:selected,verbose:true}):[];
  const currentFen=game.fen(); const currentFenRef=useRef(currentFen); currentFenRef.current=currentFen;
  const hintCount=room?room.hintCount:local.hintCount;
  const hintAt=room?room.hintAt:local.hintAt;
  const cooldown=Math.max(0,Math.ceil((20000-(now+(room?serverOffset.current:0)-hintAt))/1000));

  useEffect(()=>{
    try {
      const saved=localStorage.getItem('poychess-game'); if(saved){const data=JSON.parse(saved);replay(data.moves);setLocal(data);setFlipped(data.color==='b');}
      setName(localStorage.getItem('poychess-name')||'Satrançsever');
      setRecords(JSON.parse(localStorage.getItem('poychess-history')||'[]'));
      setSolved(JSON.parse(localStorage.getItem('poychess-solved')||'[]'));
      setUnlocked(localStorage.getItem('poychess-hints')==='unlocked');
      const prefs=JSON.parse(localStorage.getItem('poychess-settings')||'{}'); setSound(prefs.sound!==false);setShowLegal(prefs.legal!==false);setBlue(!!prefs.blue);
      const session=JSON.parse(sessionStorage.getItem('poychess-room')||'null');
      if(session){tokenRef.current=session.token;fetch(`/api/rooms?code=${session.code}`,{headers:{'X-Player-Token':session.token}}).then(async r=>{const data=await r.json() as Room & {error?:string};if(!r.ok)throw new Error(data.error);acceptRoom(data);setTab('friend');setFlipped(data.role==='b');}).catch(e=>{setError(e.message);sessionStorage.removeItem('poychess-room');});}
      const code=new URLSearchParams(location.search).get('room');if(code){setJoinCode(code.toUpperCase());setTab('friend');}
    }catch{setError('Kaydedilmiş oyun açılamadı. Yeni bir oyun başlatabilirsin.');}
    setReady(true);
    const interval=setInterval(()=>setNow(Date.now()),250);return()=>clearInterval(interval);
  },[]);
  useEffect(()=>{if(ready)localStorage.setItem('poychess-game',JSON.stringify(local));},[local,ready]);
  useEffect(()=>{if(ready)localStorage.setItem('poychess-settings',JSON.stringify({sound,legal:showLegal,blue}));},[sound,showLegal,blue,ready]);
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(''),3500);return()=>clearTimeout(t);}},[toast]);
  useEffect(()=>{setSelected(null);setHint(null);setReview(null);},[currentFen,section]);
  useEffect(()=>{if(!modal&&!hintOpen)return;const fn=(e:KeyboardEvent)=>{if(e.key==='Escape'){setModal(null);setHintOpen(false);}};window.addEventListener('keydown',fn);return()=>window.removeEventListener('keydown',fn);},[modal,hintOpen]);
  useEffect(()=>()=>{hintWorker.current?.terminate();},[]);
  useEffect(()=>{hintWorker.current?.terminate();setHintBusy(false);setHint(null);},[local.id,room?.code]);

  function acceptRoom(data:Room){
    serverOffset.current=data.serverNow-Date.now();
    setRoom(previous=>previous&&previous.code===data.code&&previous.version>data.version?previous:data);
  }
  useEffect(()=>{
    if(!room?.code)return; let disposed=false;let timer:ReturnType<typeof setTimeout>;
    const code=room.code;
    const poll=async()=>{try{const response=await fetch(`/api/rooms?code=${code}`,{headers:{'X-Player-Token':tokenRef.current}});const data=await response.json() as Room & {error?:string};if(!response.ok)throw new Error(data.error);if(!disposed){acceptRoom(data);setConnected(true);}}catch{if(!disposed)setConnected(false);}finally{if(!disposed)timer=setTimeout(poll,1500);}};
    timer=setTimeout(poll,1000);return()=>{disposed=true;clearTimeout(timer);};
  },[room?.code]);
  useEffect(()=>{
    if(!ready||room||!local.active||local.result)return;
    const g=replay(local.moves);const remaining=(g.turn()==='w'?local.whiteMs:local.blackMs)-(now-local.stamp);
    if(remaining<=0)setLocal(s=>({...s,active:false,result:`${g.turn()==='w'?'Siyah':'Beyaz'} süre ile kazandı.`}));
  },[now,ready,room,local]);
  useEffect(()=>{
    if(!ready||room||!local.active||local.result)return;
    const g=replay(local.moves);if(g.turn()===local.color)return;
    const worker=new Worker('/engine.js',{type:'module'});setThinking(true);
    worker.onmessage=e=>{if(e.data)applyLocal(e.data);setThinking(false);};
    worker.onerror=()=>{setThinking(false);setError('Satranç motoru yüklenemedi. Sayfayı yenileyebilirsin.');};
    const timer=setTimeout(()=>worker.postMessage({pgn:g.pgn(),level:local.level}),350);
    return()=>{clearTimeout(timer);worker.terminate();setThinking(false);};
  },[ready,room?.code,local.moves,local.active,local.result,local.color,local.level]);
  useEffect(()=>{
    if(!result||!ready)return;
    const id=room?room.code:local.id;
    setRecords(old=>{if(old.some(r=>r.id===id))return old;const next=[{id,date:new Date().toLocaleDateString('tr-TR'),opponent:room?(room.role==='w'?room.blackName||'Arkadaş':room.whiteName):`PoyBot · Seviye ${local.level}`,result,pgn:game.pgn()},...old].slice(0,50);localStorage.setItem('poychess-history',JSON.stringify(next));return next;});
  },[result,ready]);

  function ping(){if(!sound)return;try{const audio=new AudioContext();const osc=audio.createOscillator();const gain=audio.createGain();osc.connect(gain);gain.connect(audio.destination);osc.frequency.value=620;gain.gain.setValueAtTime(.05,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.1);osc.start();osc.stop(audio.currentTime+.1);osc.onended=()=>audio.close();}catch{}}
  function applyLocal(move:PlayedMove){
    setLocal(state=>{if(state.result)return state;const g=replay(state.moves);const turn=g.turn();const stamp=Date.now();const elapsed=state.active?stamp-state.stamp:0;
      if((turn==='w'?state.whiteMs:state.blackMs)<=elapsed)return {...state,result:`${turn==='w'?'Siyah':'Beyaz'} süre ile kazandı.`,active:false};
      try{g.move(move);}catch{return state;}
      const end=gameResult(g);return {...state,moves:[...state.moves,move],whiteMs:turn==='w'?state.whiteMs-elapsed+state.increment:state.whiteMs,blackMs:turn==='b'?state.blackMs-elapsed+state.increment:state.blackMs,stamp,active:!end,result:end};
    });ping();setSelected(null);
  }
  async function roomAction(action:string,extra:Record<string,unknown>={}){
    setBusy(true);setError('');
    try{const response=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json','X-Player-Token':tokenRef.current},body:JSON.stringify({action,code:room?.code,version:room?.version,name,control:timeControls[control].label,...extra})});const data=await response.json() as Room & {error?:string};if(!response.ok)throw new Error(data.error||'İşlem tamamlanamadı.');
      if(data.token){tokenRef.current=data.token;sessionStorage.setItem('poychess-room',JSON.stringify({code:data.code,token:data.token}));}
      acceptRoom(data);localStorage.setItem('poychess-name',name);setConnected(true);setFlipped(data.role==='b');
      if(action==='create'||action==='join'){setSection('play');setTab('friend');setLocal(s=>({...s,active:false}));}
      return data as Room;
    }catch(e){setError(e instanceof Error?e.message:'Bağlantı kurulamadı.');return null;}finally{setBusy(false);}
  }
  function submitMove(move:PlayedMove){
    if(isPuzzle){
      const uci=move.from+move.to+(move.promotion||'');
      if(uci!==puzzle.solution[puzzleMoves.length]){setPuzzleMessage('Bu hamle hedefe ulaşmıyor. Şah çekişlerini ve tehditleri yeniden incele.');setSelected(null);return;}
      const next=[...puzzleMoves,move];const response=puzzle.solution[next.length];
      if(response)next.push({from:response.slice(0,2),to:response.slice(2,4),...(response.length>4?{promotion:response[4]}:{})});
      setPuzzleMoves(next);ping();setSelected(null);
      if(next.length>=puzzle.solution.length){setPuzzleMessage(puzzle.lesson);setSolved(old=>{const updated=[...new Set([...old,puzzle.id])];localStorage.setItem('poychess-solved',JSON.stringify(updated));return updated;});}else setPuzzleMessage('Doğru hamle! Rakip cevap verdi. Şimdi avantajını kazan.');
    }else if(room){void roomAction('move',move).then(data=>{if(data)ping();});setSelected(null);}else applyLocal(move);
  }
  function tryMove(from:string,to:string){
    if(busy||review!==null||result||(!isPuzzle&&(room?.status==='waiting'||game.turn()!==myColor))||(isPuzzle&&puzzleDone))return;
    const candidates=game.moves({square:from as Square,verbose:true}).filter(m=>m.to===to);if(!candidates.length)return;
    if(candidates.some(m=>m.promotion)){setPromotion({from,to});return;}submitMove({from,to});
  }
  function clickSquare(square:Square){
    if(review!==null||result||busy||(isPuzzle&&puzzleDone))return;
    if(selected&&legal.some(m=>m.to===square)){tryMove(selected,square);return;}
    const p=game.get(square);if(p&&p.color===game.turn()&&p.color===myColor)setSelected(selected===square?null:square);else setSelected(null);
  }
  function startGame(){
    if(room&&room.status==='active'){setError('Önce devam eden çevrim içi maçı bitir veya terk et.');return;}
    if(!room&&local.active&&local.moves.length){setModal('new');return;}newGame();
  }
  function newGame(){
    setRoom(null);tokenRef.current='';sessionStorage.removeItem('poychess-room');
    const color=side==='random'?(Math.random()<.5?'w':'b'):side as 'w'|'b';const c=timeControls[control];
    setLocal({...fresh(),whiteMs:c.minutes*60000,blackMs:c.minutes*60000,color,level,increment:c.increment*1000,active:true});
    setFlipped(color==='b');setReview(null);setHint(null);setSection('play');setTab('ai');setError('');setModal(null);
  }
  function startPuzzle(index:number){setPuzzleIndex(index%puzzles.length);setPuzzleMoves([]);setPuzzleMessage('');setSelected(null);setReview(null);setFlipped(false);setSection('tactics');setMenu(false);}
  function navigate(next:string){setSection(next);setMenu(false);setReview(null);setSelected(null);if(next==='tactics')setFlipped(false);else if(next==='play')setFlipped(myColor==='b');}
  async function copy(value:string){try{await navigator.clipboard.writeText(value);setToast('Panoya kopyalandı.');}catch{setToast('Kopyalanamadı. Kodu seçip elle kopyalayabilirsin.');}}
  function download(pgn:string){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([pgn],{type:'application/x-chess-pgn'}));a.download='poychess-oyun.pgn';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
  async function requestHint(){
    if(hintBusy||hintCount>=10||cooldown>0||result||isPuzzle||game.turn()!==myColor||room?.status==='waiting')return;
    setHintBusy(true);setHint(null);setError('');
    let source=game;
    if(room){const data=await roomAction('hint',{unlock:'7654321'});if(!data){setHintBusy(false);return;}source=replay(data.moves);}
    else setLocal(s=>({...s,hintCount:s.hintCount+1,hintAt:Date.now()}));
    const fen=source.fen();hintWorker.current?.terminate();const worker=new Worker('/engine.js',{type:'module'});hintWorker.current=worker;
    worker.onmessage=e=>{if(e.data&&currentFenRef.current===fen){const g=new Chess(fen);const move=g.move(e.data);setHint({from:move.from,to:move.to,san:move.san,fen});}setHintBusy(false);worker.terminate();};
    worker.onerror=()=>{setError('İpucu motoru yüklenemedi.');setHintBusy(false);worker.terminate();};
    worker.postMessage({pgn:source.pgn(),level:3});
  }
  function unlock(){if(unlockCode==='7654321'){setUnlocked(true);setUnlockError('');localStorage.setItem('poychess-hints','unlocked');}else setUnlockError('Kod doğru değil. Tekrar dene.');}
  function clocks(color:'w'|'b'){
    const base=room?(color==='w'?room.whiteMs:room.blackMs):(color==='w'?local.whiteMs:local.blackMs);
    const active=room?room.status==='active':local.active;
    return base-(active&&!result&&game.turn()===color?Math.max(0,now+(room?serverOffset.current:0)-(room?room.updatedAt:local.stamp)):0);
  }
  const topColor=isFlipped?'w':'b', bottomColor=isFlipped?'b':'w';
  function player(color:'w'|'b'){
    const isMe=color===myColor;const title=isPuzzle?(color==='w'?'Sıra beyazda':'Taktik tahtası'):room?(color==='w'?room.whiteName:room.blackName||'Arkadaşın bekleniyor'):isMe?name:'PoyBot';
    return <div className={`player-bar ${color===game.turn()&&!result?'player-turn':''}`}><div className={`avatar ${isMe?'you':'bot'}`}>{isMe?<span>{name.slice(0,1).toUpperCase()}</span>:isPuzzle?<Puzzle size={23}/>:room?<Users size={22}/>:<Bot size={25}/>}</div><div className="player-meta"><strong>{title} {isMe&&!isPuzzle&&<span className="you-tag">SEN</span>}</strong><span>{isPuzzle?'Beyaz için en güçlü devam yolunu bul':room?(room.status==='waiting'?'Oda kodunu arkadaşınla paylaş':color==='w'?'Beyaz taşlar':'Siyah taşlar'):isMe?'Bir hamle önde.':`Seviye ${local.level} · ${['','Başlangıç','Dengeli','Güçlü'][local.level]}`}</span></div>{!isPuzzle&&<div className={`clock ${game.turn()===color&&!result?'ticking':''} ${clocks(color)<30000?'low':''}`}><Clock3 size={18}/>{formatClock(clocks(color))}</div>}</div>;
  }
  function board(){
    const files=isFlipped?'hgfedcba':'abcdefgh', ranks=isFlipped?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1];
    return <div className={`board ${blue?'board-blue':''}`} role="group" aria-label="Satranç tahtası">{ranks.flatMap((rank,row)=>files.split('').map((file,col)=>{
      const square=(file+rank) as Square;const piece=shownGame.get(square);const target=legal.some(m=>m.to===square);const checked=piece?.type==='k'&&piece.color===shownGame.turn()&&shownGame.isCheck();
      return <button key={square} className={`square ${(row+col)%2?'dark':'light'} ${selected===square?'selected':''} ${lastMove&&(lastMove.from===square||lastMove.to===square)?'last':''} ${checked?'check':''} ${hint?.fen===currentFen&&(hint.from===square||hint.to===square)?'hint-square':''}`} aria-label={`${square}${piece?' '+(piece.color==='w'?'beyaz ':'siyah ')+pieceNames[piece.type]: ' boş'}`} aria-pressed={selected===square} onClick={()=>clickSquare(square)} draggable={!!piece&&piece.color===myColor&&review===null} onDragStart={e=>{e.dataTransfer.setData('text/plain',square);setSelected(square);}} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();tryMove(e.dataTransfer.getData('text/plain'),square);}}>
        {col===0&&<span className="rank-coordinate">{rank}</span>}{row===7&&<span className="file-coordinate">{file}</span>}{piece&&<Piece type={piece.type} color={piece.color}/>} {target&&showLegal&&<span className={piece?'legal-capture':'legal-dot'}/>}
      </button>;
    }))}</div>;
  }

  return <div className="app-shell">
    <aside className={`sidebar ${menu?'mobile-open':''}`}>
      <a className="brand" href="/" aria-label="PoyChess ana sayfa"><div className="brand-mark"><Piece type="n" color="w"/></div><span>poy<span>chess</span><small>BİR HAMLE ÖNDE</small></span></a>
      <div className="nav-label">SATRANÇ DÜNYAN</div>
      <nav>{[{id:'play',icon:Swords,label:'Oyna'},{id:'tactics',icon:Puzzle,label:'Taktikler',tag:'GELİŞ'},{id:'learn',icon:BookOpen,label:'Öğren'},{id:'history',icon:History,label:'Oyun geçmişi'}].map(item=><button key={item.id} className={`nav-item ${section===item.id?'active':''}`} onClick={()=>navigate(item.id)}><item.icon size={20}/><span>{item.label}</span>{item.tag&&<small>{item.tag}</small>}</button>)}</nav>
      <div className="sidebar-note"><div className="note-icon"><Sparkles size={20}/></div><strong>Küçük hamleler.<br/>Büyük gelişim.</strong><p>Her gün bir taktik çöz,<br/>oyununu bir adım ileri taşı.</p><button onClick={()=>startPuzzle(0)}>Bugünün taktiği <ChevronRight size={16}/></button></div>
      <div className="sidebar-bottom"><button onClick={()=>setModal('settings')}><Settings2 size={18}/>Ayarlar</button><button onClick={()=>setModal('help')}><CircleHelp size={18}/>Nasıl oynanır?</button><div className="sidebar-profile"><div className="avatar you">{name.slice(0,1).toUpperCase()}</div><div><strong>{name}</strong><span>Oynamaya hazır</span></div></div></div>
    </aside>
    {menu&&<button className="menu-shade" aria-label="Menüyü kapat" onClick={()=>setMenu(false)}/>}
    <main className="main-content">
      <header className="topbar"><div className="mobile-brand"><button className="icon-btn" aria-label="Menüyü aç" onClick={()=>setMenu(!menu)}><Menu size={23}/></button><strong>poychess</strong></div><div className="breadcrumb">Satranç dünyan <ChevronRight size={14}/> <span>{{play:'Oyun alanı',tactics:'Taktik antrenmanı',learn:'Satranç okulu',history:'Oyun geçmişi'}[section]}</span></div><div className="topbar-right"><span className="free-badge"><ShieldCheck size={15}/> Özgürce oyna. Birlikte geliş.</span><button className="icon-btn" onClick={()=>setSound(!sound)} aria-label={sound?'Sesi kapat':'Sesi aç'}>{sound?<Volume2 size={19}/>:<VolumeX size={19}/>}</button><div className="small-avatar">{name.slice(0,1).toUpperCase()}</div></div></header>
      <div className="page-content">
        <div className="page-heading"><div><div className="eyebrow">{isPuzzle?'HER GÜN BİR ADIM İLERİ':section==='learn'?'BİLGİNİ TAHTAYA TAŞI':section==='history'?'HER OYUN BİR HİKÂYE':'HAMLE SENDE'}</div><h1>{isPuzzle?'Gör. Düşün. En iyisini bul.':section==='learn'?'İyi oyun, sağlam temeller.':section==='history'?'Tahtada bıraktığın izler.':'Her oyun, yeni bir başlangıç.'}</h1><p>{isPuzzle?'Doğru hamleyi bul, fikrini öğren, oyununda uygula.':section==='learn'?'İlk hamleden son mata, satrancı adım adım keşfet.':section==='history'?'Tamamladığın oyunları incele ve PGN olarak indir.':'Bir arkadaşına meydan oku, bilgisayarla çalış veya yeni bir taktik keşfet.'}</p></div><div className="heading-tag"><span className="status-dot"/>{room?'Oda bağlantısı':'Sınırsız satranç'}</div></div>
        {error&&<div role="alert" className="alert">{error}<button aria-label="Uyarıyı kapat" onClick={()=>setError('')}><X size={17}/></button></div>}
        {(section==='play'||isPuzzle)&&<>
          <div className="game-layout">
            <section className="board-column">
              <div className="board-topline"><span>{isPuzzle?<Puzzle size={15}/>:room?<Users size={15}/>:<Bot size={15}/>} {isPuzzle?puzzle.theme:room?'Arkadaş maçı':'Bilgisayara karşı'}<span className="separator">/</span>{isPuzzle?puzzle.level:'Standart satranç'}</span><button className="icon-btn" aria-label="Tahtayı çevir" title="Tahtayı çevir" onClick={()=>setFlipped(!flipped)}><RotateCw size={17}/></button></div>
              {player(topColor)}
              <div className="board-frame">
                {board()}
                {shownGame.isCheckmate()&&<span className="checkmate-badge" role="status" aria-label="Şah mat" title="Şah mat">#</span>}
              </div>
              {player(bottomColor)}
              <div className="board-footer"><span className={game.isCheck()?'check-label':''}>{review!==null?'Geçmiş hamleyi inceliyorsun':isPuzzle?(puzzleDone?'Taktik tamamlandı!':'Beyaz oynar. En iyi hamleyi bul.'):result|| (room?.status==='waiting'?'Arkadaşının katılması bekleniyor…':thinking?'PoyBot düşünüyor…':game.isCheck()?'Şah! Şahını korumalısın.':game.turn()===myColor?'Sıra sende. Güzel bir hamle yap.':'Rakibin düşünüyor…')}</span><div><button className="icon-btn" title="Tahtayı çevir" aria-label="Tahtayı ters çevir" onClick={()=>setFlipped(!flipped)}><RotateCw size={16}/></button><button className="icon-btn" title="Tahta ayarları" aria-label="Tahta ayarları" onClick={()=>setModal('settings')}><Settings2 size={16}/></button></div></div>
            </section>
            <aside className="game-panel">
              {isPuzzle?<div className="panel puzzle-panel"><div className="panel-eyebrow"><Puzzle size={18}/> TAKTİK ANTRENMANI</div><h2>{puzzle.title}</h2><div className="puzzle-tags"><span>{puzzle.level}</span><span>{puzzle.theme}</span></div><p className="muted">Pozisyonu incele ve beyaz için en güçlü hamleyi tahtada oyna.</p><div className={`puzzle-feedback ${puzzleDone?'success':''}`}><div>{puzzleDone?<Check size={22}/>:<Lightbulb size={22}/>}</div><p>{puzzleMessage||'Önce şah çekişlerini, sonra taş alışlarını ve tehditleri ara.'}</p></div>{puzzleDone?<button className="primary-button" onClick={()=>startPuzzle(puzzleIndex+1)}>Sıradaki taktik <Puzzle size={17}/></button>:<button className="secondary-button" onClick={()=>setPuzzleMessage(puzzle.hint)}><Lightbulb size={17}/> Bir ipucu ver</button>}<div className="puzzle-progress"><span>Tamamlanan taktikler</span><strong>{solved.length} / {puzzles.length}</strong></div><div className="progress-track"><div style={{width:`${solved.length/puzzles.length*100}%`}}/></div><div className="puzzle-list">{puzzles.map((p,i)=><button key={p.id} onClick={()=>startPuzzle(i)} className={i===puzzleIndex?'current':''}><span>{solved.includes(p.id)?<Check size={17}/>:<Target size={17}/>}</span>{p.title}<ChevronRight size={15}/></button>)}</div></div>:<>
                <div className="panel setup-panel"><div className="panel-title"><h2>Bir oyun başlat</h2><Swords size={19}/></div><div className="mode-tabs"><button className={tab==='ai'?'active':''} onClick={()=>setTab('ai')}><Bot size={17}/>Bilgisayar</button><button className={tab==='friend'?'active':''} onClick={()=>setTab('friend')}><Users size={17}/>Arkadaşınla</button></div>
                {room&&tab==='friend'?<div className="room-details"><div className="room-status"><span className={`status-dot ${!connected?'offline':''}`}/>{!connected?'Yeniden bağlanılıyor…':room.status==='waiting'?'Arkadaşın bekleniyor':room.status==='active'?'Oyun devam ediyor':'Oyun tamamlandı'}</div><p>Bu kodu diğer cihazda gir.</p><button className="room-code" onClick={()=>copy(room.code)} aria-label={`Oda kodunu kopyala ${room.code}`}>{room.code}<Copy size={21}/></button><button className="secondary-button" onClick={()=>copy(`${location.origin}/?room=${room.code}`)}><Copy size={16}/> Davet bağlantısını kopyala</button><small>Kodu bilen ilk kişi siyah taşlarla katılır. Oda 24 saat geçerlidir.</small>{room.status!=='active'&&<button className="text-button" onClick={()=>{setRoom(null);sessionStorage.removeItem('poychess-room');tokenRef.current='';}}>Odadan ayrıl</button>}</div>:<>
                  <label className="field-label">ZAMAN KONTROLÜ</label><div className="time-grid">{timeControls.map((t,i)=><button className={control===i?'active':''} key={t.label} onClick={()=>setControl(i)}><strong>{t.label}</strong><span>{i<2?<Zap size={12}/>:<Clock3 size={12}/>} {t.name}</span></button>)}</div>
                  {tab==='ai'?<><div className="field-line"><label className="field-label" htmlFor="difficulty">ZORLUK SEVİYESİ</label><span>Seviye {level}</span></div><div className="level-buttons" id="difficulty">{['Başlangıç','Dengeli','Güçlü'].map((label,i)=><button key={label} className={level===i+1?'active':''} onClick={()=>setLevel(i+1)}>{label}</button>)}</div><div className="field-line"><label className="field-label">TAŞ RENGİN</label><div className="color-buttons"><button aria-label="Beyaz oyna" className={side==='w'?'active':''} onClick={()=>setSide('w')}><span className="color-token white-token"/></button><button aria-label="Rastgele renk" className={side==='random'?'active':''} onClick={()=>setSide('random')}><span className="color-token random-token"/></button><button aria-label="Siyah oyna" className={side==='b'?'active':''} onClick={()=>setSide('b')}><span className="color-token black-token"/></button></div></div><button className="primary-button" onClick={startGame}><Swords size={18}/>Oyuna başla</button><div className="panel-caption">Kendi ritminde oyna, her hamlede geliş.</div></>:<><label className="field-label" htmlFor="player-name">OYUNCU ADIN</label><input id="player-name" maxLength={24} value={name} onChange={e=>setName(e.target.value)} placeholder="Oyuncu adın"/><button className="primary-button" disabled={busy||room?.status==='active'} onClick={()=>roomAction('create')}><Users size={17}/>{busy?'Hazırlanıyor…':'Oda oluştur'}</button><div className="or-divider"><span/>veya bir oyuna katıl<span/></div><form className="join-form" onSubmit={e=>{e.preventDefault();void roomAction('join',{code:joinCode});}}><input aria-label="Oda kodu" maxLength={6} value={joinCode} onChange={e=>setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,''))} placeholder="6 haneli kod" required/><button disabled={busy||joinCode.length!==6||room?.status==='active'}>Katıl</button></form><div className="panel-caption"><MonitorSmartphone size={13}/>İki cihaz, aynı tahta.</div></>}
                </>}
                </div>
                <div className="panel moves-panel"><div className="panel-title"><h3>Hamleler</h3><span>{Math.ceil(moves.length/2)} hamle</span></div><div className="move-table">{game.history().length?Array.from({length:Math.ceil(moves.length/2)},(_,i)=><div className="move-row" key={i}><span>{i+1}.</span>{[0,1].map(offset=><button key={offset} disabled={!game.history()[i*2+offset]} className={review===i*2+offset+1?'active':''} onClick={()=>setReview(i*2+offset+1)}>{game.history()[i*2+offset]||'—'}</button>)}</div>):<div className="empty-moves"><span>1.</span><span>İlk hamle hikâyeyi başlatır.</span></div>}</div><div className="replay-controls"><button className="icon-btn" aria-label="İlk konum" disabled={!moves.length} onClick={()=>setReview(0)}><ChevronsLeft size={17}/></button><button className="icon-btn" aria-label="Önceki hamle" disabled={!moves.length} onClick={()=>setReview(Math.max(0,(review??moves.length)-1))}><ChevronLeft size={17}/></button><button className="live-button" onClick={()=>setReview(null)}>{review===null?'CANLI':'OYUNA DÖN'}</button><button className="icon-btn" aria-label="Sonraki hamle" disabled={!moves.length} onClick={()=>setReview(Math.min(moves.length,(review??moves.length)+1))}><ChevronRight size={17}/></button><button className="icon-btn" aria-label="Güncel konum" onClick={()=>setReview(null)}><ChevronsRight size={17}/></button></div><div className="game-actions"><button disabled={!!result||(!room&&!local.moves.length)||room?.status==='waiting'} onClick={()=>setModal('resign')}><Flag size={15}/>Terk et</button>{room?<button disabled={!!result||room.status!=='active'||busy} onClick={()=>roomAction('draw')}><Handshake size={15}/>{room.drawOffer&&room.drawOffer!==room.role?'Kabul et':room.drawOffer===room.role?'Teklif gönderildi':'Beraberlik'}</button>:<button disabled={!!result||!local.moves.length||thinking} onClick={()=>{setLocal(s=>({...s,moves:s.moves.slice(0,Math.max(0,s.moves.length-2)),stamp:Date.now()}));setToast('Son hamle çifti geri alındı.');}}><RotateCcw size={15}/>Geri al</button>}<button aria-label="PGN indir" disabled={!moves.length} onClick={()=>download(game.pgn())}><Download size={15}/></button></div>{room?.drawOffer&&room.drawOffer!==room.role&&<div className="draw-notice">Rakibin beraberlik teklif etti. Hamle yaparak reddedebilir veya kabul edebilirsin.</div>}</div>
              </>}
            </aside>
          </div>
          {!isPuzzle&&<div className="discovery-grid"><button className="discovery-card tactic-card" onClick={()=>startPuzzle(0)}><div className="mini-board"><span>♜</span><span/><span/><span>♚</span><span/><span/><span>♙</span><span>♙</span><span/><span>♖</span><span/><span/><span/><span/><span>♔</span><span/></div><div><div className="card-eyebrow">GÜNÜN TAKTİĞİ <span>BAŞLANGIÇ</span></div><h3>Bir hamle. Büyük fark.</h3><p>Matı görebiliyor musun?</p><span className="card-cta">Taktiği çöz <ChevronRight size={15}/></span></div></button><button className="discovery-card friend-card" onClick={()=>{setTab('friend');document.querySelector('.setup-panel')?.scrollIntoView({behavior:'smooth',block:'center'});}}><div className="friend-art"><Users size={40}/><span><MonitorSmartphone size={17}/></span></div><div><div className="card-eyebrow">MESAFELER ÖNEMLİ DEĞİL</div><h3>Aynı tahta, farklı yerler.</h3><p>Odanı oluştur, kodu paylaş, oyuna başla.</p><span className="card-cta">Arkadaşını davet et <ChevronRight size={15}/></span></div></button></div>}
        </>}
        {section==='learn'&&<div className="lesson-grid">{lessons.map((lesson,i)=><article className="lesson-card" key={lesson.title}><div className="lesson-icon"><lesson.icon size={28}/></div><span className="eyebrow">{lesson.subtitle}</span><h2>{lesson.title}</h2><p>{lesson.text}</p><div className="lesson-tip"><Lightbulb size={20}/><p>{lesson.tip}</p></div><button className="secondary-button" onClick={()=>i===2?startPuzzle(1):navigate('play')}>{i===2?'Taktikle pekiştir':'Tahtada dene'}<Play size={16}/></button></article>)}</div>}
        {section==='history'&&<div className="history-panel panel">{records.length?<><div className="history-heading"><h2>Tamamlanan oyunlar</h2><span>{records.length} oyun · Bu cihazda saklanır</span></div>{records.map(record=><div className="history-row" key={record.id}><div className="history-icon"><Swords size={21}/></div><div><strong>{record.opponent}</strong><p>{record.result}</p></div><span>{record.date}</span><button className="secondary-button" onClick={()=>download(record.pgn)}><Download size={16}/> PGN</button></div>)}</>:<div className="empty-history"><History size={42}/><h2>İlk hikâyen henüz yazılmadı.</h2><p>Tamamladığın oyunlar burada görünecek.</p><button className="primary-button" onClick={()=>navigate('play')}><Swords size={18}/> Oyun alanına dön</button></div>}</div>}
        <footer className="page-footer"><span>poychess <span>Satranç hepimiz için.</span></span><div><ShieldCheck size={14}/> Ücretsiz. Reklamsız. Sadece satranç.</div></footer>
      </div>
    </main>
    <div className="hint-anchor"><button className={`hint-launcher ${unlocked?'unlocked':''}`} aria-label="İpucu panelini aç" title="İpucu paneli" onClick={()=>setHintOpen(!hintOpen)}>{hintOpen?<X size={19}/>:<KeyRound size={19}/>}<span>{unlocked?'İpucu':'Özel erişim'}</span>{unlocked&&<small>{10-hintCount}</small>}</button>
      {hintOpen&&<div className="hint-popover"><div className="panel-title"><h3><Lightbulb size={18}/> Hamle asistanı</h3><button className="icon-btn" aria-label="İpucu panelini kapat" onClick={()=>setHintOpen(false)}><X size={17}/></button></div>{!unlocked?<form onSubmit={e=>{e.preventDefault();unlock();}}><p>İpucu panelini açmak için erişim kodunu gir.</p><input type="password" inputMode="numeric" aria-label="İpucu erişim kodu" value={unlockCode} onChange={e=>setUnlockCode(e.target.value)} placeholder="Erişim kodu" autoFocus/><button className="primary-button" type="submit"><KeyRound size={16}/>Kilidi aç</button>{unlockError&&<p className="error-text" role="alert">{unlockError}</p>}</form>:<><p>Motorun en iyi hamle önerisini tahtada gör.</p><div className="hint-stats"><span>Bu maç <strong>{hintCount} / 10</strong></span><span>Bekleme <strong>{cooldown>0?`${cooldown} sn`:'Hazır'}</strong></span></div>{hint&&hint.fen===currentFen&&<div className="hint-result"><Sparkles size={19}/><div><strong>{hint.san}</strong><span>{hint.from.toUpperCase()} → {hint.to.toUpperCase()}</span></div></div>}<button className="primary-button" disabled={hintBusy||busy||cooldown>0||hintCount>=10||!!result||isPuzzle||game.turn()!==myColor||room?.status==='waiting'} onClick={requestHint}><Lightbulb size={17}/>{hintBusy?'Konum inceleniyor…':hintCount>=10?'Maçlık hakların doldu':cooldown>0?`${cooldown} saniye bekle`:'En iyi hamleyi göster'}</button><small>{isPuzzle?'Taktiklerde antrenman panelindeki ipucunu kullan.':result?'Yeni maçta hakların yenilenir.':game.turn()!==myColor?'Sıra sana geldiğinde kullanabilirsin.':'Maç başına 10 ipucu · Her 20 saniyede bir'}</small></>}</div>}
    </div>
    {toast&&<div className="toast" role="status"><Check size={18}/>{toast}</div>}
    {promotion&&<div className="modal-backdrop"><div className="modal promotion-modal" role="dialog" aria-modal="true" aria-label="Piyon terfisi"><h2>Bir taş seç</h2><p>Piyonun son sıraya ulaştı.</p><div className="promotion-options">{['q','r','b','n'].map(p=><button key={p} aria-label={`${pieceNames[p]} olarak terfi et`} onClick={()=>{submitMove({...promotion,promotion:p});setPromotion(null);}}><Piece type={p} color={myColor}/></button>)}</div></div></div>}
    {modal&&<div className="modal-backdrop" onClick={()=>setModal(null)}><div className="modal" role="dialog" aria-modal="true" aria-label={modal==='settings'?'Ayarlar':modal==='help'?'Nasıl oynanır?':'Oyun işlemi'} onClick={e=>e.stopPropagation()}><button className="modal-close icon-btn" aria-label="Pencereyi kapat" onClick={()=>setModal(null)}><X size={21}/></button>
      {modal==='settings'?<><div className="lesson-icon"><Settings2 size={25}/></div><h2>Sana göre bir tahta.</h2><label className="field-label" htmlFor="settings-name">OYUNCU ADIN</label><input id="settings-name" value={name} maxLength={24} onChange={e=>{setName(e.target.value);localStorage.setItem('poychess-name',e.target.value);}}/><label className="setting-row">Hamle sesleri<input type="checkbox" checked={sound} onChange={e=>setSound(e.target.checked)}/></label><label className="setting-row">Yasal hamleleri göster<input type="checkbox" checked={showLegal} onChange={e=>setShowLegal(e.target.checked)}/></label><label className="setting-row">Mavi tahta teması<input type="checkbox" checked={blue} onChange={e=>setBlue(e.target.checked)}/></label><button className="primary-button" onClick={()=>setModal(null)}>Tamam</button></>:modal==='help'?<><div className="lesson-icon"><BookOpen size={25}/></div><h2>Bir hamleyle başla.</h2><p>Taşını seç, sonra gitmek istediğin kareye dokun. Bilgisayarda sürükleyip bırakabilirsin. Noktalar yasal hamleleri gösterir.</p><p><strong>Arkadaşınla:</strong> “Arkadaşınla” sekmesinde oda oluştur. Altı karakterli kodu diğer cihazda aynı sekmeye yazıp “Katıl” düğmesine bas.</p><p><strong>Bilgisayarla:</strong> Süreyi, seviyeyi ve taş rengini seç, ardından oyuna başla. Süre devam ederken sayfadan ayrılmak saati durdurmaz.</p><p><strong>Taktikler:</strong> Beyaz için en iyi devam yolunu bul. Takılırsan açıklamalı ipucunu aç.</p><button className="primary-button" onClick={()=>setModal(null)}>Anladım, oynayalım</button></>:<><div className="lesson-icon"><Flag size={25}/></div><h2>{modal==='resign'?'Oyunu terk etmek istiyor musun?':'Yeni bir sayfa açalım mı?'}</h2><p>{modal==='resign'?'Mevcut oyun rakibinin galibiyetiyle sona erecek.':'Bilgisayarla devam eden oyunun sona erecek ve yeni bir oyun başlayacak.'}</p><div className="modal-actions"><button className="secondary-button" onClick={()=>setModal(null)}>Oyuna dön</button><button className="primary-button" onClick={()=>{if(modal==='new')newGame();else{if(room)void roomAction('resign');else setLocal(s=>({...s,active:false,result:`${myColor==='w'?'Siyah':'Beyaz'} kazandı. Oyunu terk ettin.`}));setModal(null);}}}>{modal==='new'?'Yeni oyuna başla':'Terk et'}</button></div></>}
    </div></div>}
  </div>;
}

