import {initializeApp,getApps,getApp} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';
import {getDatabase,ref,onValue,runTransaction,onDisconnect,set,get} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-database.js';
import {initializeAuth,browserSessionPersistence,signInAnonymously} from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';
import {submit,advance,ranking} from './battle-state.js?v=55cf6032f61b';
const config={apiKey:'AIzaSyBreTSe1m0-xlbF4aupnU5isRZCihR25IE',authDomain:'formwheel.firebaseapp.com',databaseURL:'https://formwheel-default-rtdb.firebaseio.com',projectId:'formwheel',appId:'1:431583088241:web:74e0e34ea1e3e1170c55d0'};
const app=getApps().find(a=>a.name==='formwheel-reflex')?getApp('formwheel-reflex'):initializeApp(config,'formwheel-reflex'),db=getDatabase(app),auth=initializeAuth(app,{persistence:browserSessionPersistence}),$=id=>document.getElementById(id);
let uid='',code='',room=null,unsubscribe=null,offset=0,connected=false,raf=0,shownRound=0,shownAt=0,submittedRound=0,advancing=false;
const now=()=>Date.now()+offset,report=e=>{$('battleMessage').textContent=window.FormwheelUI?.errorMessage(e)||e.message};
onValue(ref(db,'.info/serverTimeOffset'),s=>offset=Number(s.val())||0);
onValue(ref(db,'.info/connected'),async s=>{connected=s.val()===true;$('battleNetwork').textContent=connected?'🟢 연결됨':'🔴 연결 대기 · 기록 제출은 연결 후 가능합니다';if(connected&&code&&uid){try{await onDisconnect(ref(db,`reflexRooms/${code}/presence/${uid}`)).set(false);await set(ref(db,`reflexRooms/${code}/presence/${uid}`),true)}catch(e){report(e)}}});
async function authenticate(){if(auth.currentUser)uid=auth.currentUser.uid;else uid=(await signInAnonymously(auth)).user.uid;return uid}
function delay(){const value=crypto.getRandomValues(new Uint32Array(1))[0];return 1800+value%3001}
function name(){const value=$('battleName').value.trim().slice(0,12);if(!value)throw new Error('닉네임을 입력하세요.');return value}
async function enter(nextCode){
 code=nextCode;try{sessionStorage.setItem('formwheel_reflex_room',code);sessionStorage.setItem('formwheel_reflex_name',$('battleName').value)}catch{}
 shownRound=0;submittedRound=0;if(unsubscribe)unsubscribe();
 await onDisconnect(ref(db,`reflexRooms/${code}/presence/${uid}`)).set(false);await set(ref(db,`reflexRooms/${code}/presence/${uid}`),true);
 unsubscribe=onValue(ref(db,`reflexRooms/${code}`),s=>{room=s.val();render()},report);
 $('battleLeave').hidden=false;$('battleCode').value=code;cancelAnimationFrame(raf);tick();
}
async function create(){if($('game').style.display==='block')throw new Error('솔로 게임을 마친 뒤 배틀을 시작하세요.');if(code)throw new Error('현재 방에서 먼저 나가세요.');await authenticate();const nickname=name();for(let attempt=0;attempt<12;attempt++){const next=String(1000+crypto.getRandomValues(new Uint32Array(1))[0]%9000),result=await runTransaction(ref(db,`reflexRooms/${next}`),cur=>cur?undefined:{version:1,status:'lobby',host:uid,round:0,players:{[uid]:{name:nickname}},presence:{[uid]:true},createdAt:now()});if(result.committed){await enter(next);return}}throw new Error('빈 방 코드를 찾지 못했습니다. 다시 시도하세요.')}
async function join(){if($('game').style.display==='block')throw new Error('솔로 게임을 마친 뒤 배틀에 참가하세요.');if(code)throw new Error('현재 방에서 먼저 나가세요.');await authenticate();const nickname=name(),next=$('battleCode').value.trim();if(!/^\d{4}$/.test(next))throw new Error('4자리 방 코드를 입력하세요.');const result=await runTransaction(ref(db,`reflexRooms/${next}`),cur=>{if(!cur||cur.status!=='lobby'||Object.keys(cur.players||{}).length>=16)return;cur.players[uid]={name:nickname};cur.presence??={};cur.presence[uid]=true;return cur});if(!result.committed)throw new Error('방이 없거나 이미 시작되었거나 가득 찼습니다.');await enter(next)}
async function leave(){if(!code)return;cancelAnimationFrame(raf);unsubscribe?.();unsubscribe=null;const old=code;code='';room=null;try{sessionStorage.removeItem('formwheel_reflex_room');await onDisconnect(ref(db,`reflexRooms/${old}/presence/${uid}`)).cancel();await runTransaction(ref(db,`reflexRooms/${old}`),cur=>{if(!cur)return;delete cur.players?.[uid];delete cur.presence?.[uid];const remaining=Object.keys(cur.players||{});if(!remaining.length)return null;if(cur.host===uid)cur.host=remaining[0];return cur})}finally{render()}}
async function start(){if(!code)return;const result=await runTransaction(ref(db,`reflexRooms/${code}`),cur=>{if(!cur||cur.host!==uid||cur.status==='playing'||Object.keys(cur.players||{}).filter(id=>cur.presence?.[id]!==false).length<2)return;for(const id of Object.keys(cur.players))if(cur.presence?.[id]===false){delete cur.players[id];delete cur.presence[id]}cur.status='playing';cur.round=1;cur.goAt=now()+delay();cur.results={};return cur});if(!result.committed)throw new Error('방장이 온라인 플레이어 2명 이상일 때 시작할 수 있습니다.');shownRound=0;submittedRound=0}
function render(){
 const list=$('battlePlayers');list.replaceChildren();$('startBtn').disabled=!!code;$('battleLeave').hidden=!code;$('battleStart').hidden=!room||room.host!==uid||room.status==='playing';$('battleTap').hidden=room?.status!=='playing';
 if(!room){$('battleMessage').textContent='같은 방에서 5라운드 평균 반응속도로 경쟁합니다. 성급한 클릭·10초 미응답은 2000ms입니다.';return}
 $('battleMessage').textContent=`방 ${code} · ${room.status==='playing'?'라운드 '+room.round+'/5':room.status==='finished'?'최종 결과':'대기실'} · ${room.host===uid?'내가 방장':''}`;
 const ranks=ranking(room);for(const [index,p] of ranks.entries()){const li=document.createElement('li');li.textContent=`${index+1}. ${p.name}${p.uid===uid?' (나)':''}${room.presence?.[p.uid]===false?' · 연결 끊김':''} · ${p.attempts?`${p.average}ms (${p.attempts}회)`:'대기'}`;list.append(li)}
 if(room.presence?.[room.host]===false&&room.presence?.[uid]!==false)runTransaction(ref(db,`reflexRooms/${code}`),cur=>{if(!cur||cur.presence?.[cur.host]!==false)return;const online=Object.keys(cur.players||{}).filter(id=>cur.presence?.[id]!==false).sort();if(online[0]!==uid)return;cur.host=uid;return cur}).catch(report);
}
function tick(){
 if(room?.status==='playing'){
  const button=$('battleTap'),answer=room.results?.[room.round]?.[uid];if(answer){button.disabled=true;button.textContent=answer.kind==='hit'?answer.ms+' ms · 상대 대기':'실패 · 상대 대기'}
  else{button.disabled=submittedRound===room.round||!connected;if(now()<room.goAt){button.textContent='READY · 기다리세요';button.style.background='#64748b'}else{if(shownRound!==room.round){shownRound=room.round;shownAt=performance.now()}button.textContent='GO!';button.style.background='#111827'}}
  if(room.host===uid&&!advancing&&(now()>=room.goAt+10000||Object.keys(room.players||{}).every(id=>room.results?.[room.round]?.[id]))){advancing=true;const round=room.round;runTransaction(ref(db,`reflexRooms/${code}`),cur=>{if(!cur||cur.host!==uid||cur.round!==round)return;return advance(cur,now(),delay())}).catch(report).finally(()=>advancing=false)}
 }
 raf=requestAnimationFrame(tick);
}
async function hit(){if(!room||room.status!=='playing'||!connected||room.results?.[room.round]?.[uid]||submittedRound===room.round)return;const round=room.round;submittedRound=round;const early=shownRound!==round||now()<room.goAt,result={kind:early?'early':'hit',ms:early?2000:Math.min(2000,Math.max(0,Math.round(performance.now()-shownAt)))};try{const tx=await runTransaction(ref(db,`reflexRooms/${code}`),cur=>submit(cur,uid,round,result));if(!tx.committed)submittedRound=0}catch(e){submittedRound=0;report(e)}}
let actionBusy=false;async function runAction(fn){if(actionBusy)return;actionBusy=true;$('battleCreate').disabled=true;$('battleJoin').disabled=true;try{await fn()}catch(e){report(e)}finally{actionBusy=false;$('battleCreate').disabled=false;$('battleJoin').disabled=false}}
$('battleCreate').onclick=()=>runAction(create);$('battleJoin').onclick=()=>runAction(join);$('battleLeave').onclick=()=>leave().catch(report);$('battleStart').onclick=()=>start().catch(report);$('battleTap').onpointerdown=e=>{e.preventDefault();hit().catch(report)};
$('battleTap').onkeydown=e=>{if(['Space','Enter'].includes(e.code)&&!e.repeat){e.preventDefault();hit().catch(report)}};
try{$('battleName').value=sessionStorage.getItem('formwheel_reflex_name')||'';const saved=sessionStorage.getItem('formwheel_reflex_room');if(saved)authenticate().then(async()=>{const snapshot=await get(ref(db,`reflexRooms/${saved}`));if(snapshot.val()?.players?.[uid])await enter(saved);else sessionStorage.removeItem('formwheel_reflex_room')}).catch(report)}catch{}
render();
