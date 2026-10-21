const HOME_URL = "https://semicolonxss.github.io/Formwheel/";

const intro = document.getElementById("intro");
const game = document.getElementById("game");
const result = document.getElementById("result");
const stage = document.getElementById("stage");
const stageTitle = document.getElementById("stageTitle");
const stageSub = document.getElementById("stageSub");
const roundText = document.getElementById("roundText");
const bestText = document.getElementById("bestText");

let round = 0;
let maxRounds = 5;
const reflexBadges = [ ["first","🎮 첫 완주"],["perfect","🎯 올클리어"],["fast","⚡ 평균 300ms"],["lightning","🌩️ 최고 200ms"] ];
function setReflexRounds(n){maxRounds=n;document.querySelectorAll("[data-reflex-rounds]").forEach(b=>b.setAttribute("aria-pressed",String(Number(b.dataset.reflexRounds)===n)));}
window.setReflexRounds=setReflexRounds;
function reflexAwards(avg){let owned={};try{owned=JSON.parse(localStorage.getItem("fw_reflex_awards_v1")||"{}")}catch{};owned.first=true;if(validTimes.length===times.length)owned.perfect=true;if(avg<=300&&validTimes.length===times.length)owned.fast=true;if(best&&best<=200)owned.lightning=true;try{localStorage.setItem("fw_reflex_awards_v1",JSON.stringify(owned))}catch{};document.getElementById("reflexAwards").textContent=reflexBadges.map(([id,label])=>owned[id]?label+" ✅":label+" 🔒").join(" · ");}
let times = [];
let validTimes = [];
let timer = null;
let goAt = 0;
let waiting = false;
let gameActive = false;
let phase = "idle";
let transitionTimer = null;
let missTimer = null;
const FAILURE_MS = 500;
const RESPONSE_LIMIT_MS = 5000;
let best = 0;
try { best = Number(localStorage.getItem("formwheel_reflex_best") || 0) || 0; } catch {}

function goHome(){
  window.location.href = HOME_URL;
}

document.getElementById("logo").addEventListener("click", goHome);
document.getElementById("homeBtn").addEventListener("click", goHome);
document.getElementById("gamesBtn").addEventListener("click", goHome);

function showGame(){
  intro.style.display = "none";
  result.style.display = "none";
  game.style.display = "block";
  clearTimeout(timer);
  clearTimeout(transitionTimer);
  clearTimeout(missTimer);
  round = 0;
  times = [];
  validTimes = [];
  gameActive = false;
  phase = "idle";
  waiting = false;
  roundText.textContent = `ROUND 1 / ${maxRounds}`;
  setStage("ready", "READY", "아래 시작 버튼을 누르면 시작합니다");
  document.getElementById("roundStartBtn").hidden = false;
  updateBest();
}

function startRounds(){
  if(gameActive) return;
  document.getElementById("roundStartBtn").hidden = true;
  gameActive = true;
  nextRound();
}

function updateBest(){
  bestText.textContent = best ? `BEST ${best}ms` : "BEST —";
}

function setStage(type,title,sub){
  stage.className = "stage " + type;
  stageTitle.textContent = title;
  stageSub.textContent = sub;
  stage.setAttribute("aria-label", `${title}. ${sub}`);
}

function nextRound(retry = false){
  if(!retry) round++;
  phase = "waiting";
  roundText.textContent = `ROUND ${round} / ${maxRounds}`;
  waiting = true;
  setStage("ready","READY","잠시 후 화면이 바뀝니다");

  const delay = 1200 + Math.random()*3000;
  clearTimeout(timer);
  timer = setTimeout(()=>{
    if(!gameActive) return;
    waiting = false;
    phase = "go";
    goAt = performance.now();
    setStage("go","GO!","지금 클릭!");
    clearTimeout(missTimer);
    missTimer = setTimeout(()=>{
      if(!gameActive || phase !== "go") return;
      recordAttempt(FAILURE_MS,"TIME OUT","미응답 · 500 ms로 기록");
    },RESPONSE_LIMIT_MS);
  }, delay);
}

function recordAttempt(time,title,sub){
  phase = "done";
  clearTimeout(timer);
  clearTimeout(missTimer);
  times.push(time);
  waiting = false;
  setStage("done",title,sub);
  clearTimeout(transitionTimer);
  transitionTimer = setTimeout(()=>{
    if(!gameActive) return;
    if(round >= maxRounds) finish();
    else nextRound();
  },650);
}

function early(){
  recordAttempt(FAILURE_MS,"TOO EARLY!","성급한 응답 · 500 ms로 기록");
}

function hit(){
  if(!gameActive) return;
  if(phase === "waiting"){
    early();
    return;
  }
  if(phase !== "go") return;
  const time = Math.max(1, Math.round(performance.now() - goAt));
  validTimes.push(time);
  recordAttempt(time,`${time} ms`,"좋아요!");
}

// Switching tabs or locking the screen must not create unfair reaction times.
let pausedForVisibility = false;
document.addEventListener("visibilitychange", () => {
  if(document.hidden){
    if(gameActive && (phase === "waiting" || phase === "go")){
      pausedForVisibility = true;
      clearTimeout(timer);
      clearTimeout(missTimer);
      waiting = false;
      phase = "paused";
      setStage("ready","PAUSED","화면으로 돌아오면 현재 라운드를 다시 시작합니다");
    }
  }else if(pausedForVisibility){
    pausedForVisibility = false;
    if(gameActive && phase === "paused") nextRound(true);
  }
});

stage.tabIndex = 0;
stage.setAttribute("role", "button");
stage.setAttribute("aria-label", "반응속도 측정: Space 또는 Enter");
stage.addEventListener("keydown", e => {
  if((e.code === "Space" || e.code === "Enter") && !e.repeat){e.preventDefault();hit();}
});
stage.addEventListener("pointerdown",(e)=>{
  e.preventDefault();
  hit();
});

document.getElementById("startBtn").addEventListener("click", showGame);
document.getElementById("roundStartBtn").addEventListener("click", startRounds);
document.getElementById("againBtn").addEventListener("click", showGame);

function getRank(avg){
  if(avg <= 200) return "⚡ 인간 병기";
  if(avg <= 250) return "🔥 엄청 빠름";
  if(avg <= 300) return "💨 매우 빠름";
  if(avg <= 400) return "👍 괜찮은 반응";
  if(avg <= 500) return "🙂 조금 더 연습";
  return "🐢 천천히 가는 중";
}

function finish(){
  gameActive = false;
  phase = "finished";
  clearTimeout(transitionTimer);
  clearTimeout(timer);
  clearTimeout(missTimer);
  const avg = Math.round(times.reduce((a,b)=>a+b,0)/times.length);
  const personalBest = validTimes.length ? Math.min(...validTimes) : null;

  if(personalBest !== null && (!best || personalBest < best)){
    best = personalBest;
    try { localStorage.setItem("formwheel_reflex_best", best); } catch {}
  }

  // Inform the Spotlight tab only after a genuine completed solo run.
  if(avg<=300 && window.opener && !window.opener.closed){
    window.opener.postMessage({type:"formwheel-spotlight-result-v1",project:"Reflex",value:avg},"https://semicolonxss.github.io");
  }
  document.getElementById("finalTime").textContent = avg;
  document.getElementById("rank").textContent = getRank(avg);
  document.getElementById("bestStat").textContent = best ? `${best} ms` : "기록 없음";
  document.getElementById("avgStat").textContent = `${avg} ms`;
  reflexAwards(avg);
  document.getElementById("roundStat").textContent = `${validTimes.length}회 성공 / ${times.length}회 도전`;

  game.style.display = "none";
  result.style.display = "block";
  window.dispatchEvent(new CustomEvent("fw:4050:complete",{detail:{gameId:"reflex"}}));
}

updateBest();
