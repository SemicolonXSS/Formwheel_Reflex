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
let times = [];
let timer = null;
let goAt = 0;
let waiting = false;
let gameActive = false;
let phase = "idle";
let transitionTimer = null;
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
  round = 0;
  times = [];
  gameActive = true;
  updateBest();
  nextRound();
}

function updateBest(){
  bestText.textContent = best ? `BEST ${best}ms` : "BEST —";
}

function setStage(type,title,sub){
  stage.className = "stage " + type;
  stageTitle.textContent = title;
  stageSub.textContent = sub;
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
  }, delay);
}

function early(){
  phase = "early";
  clearTimeout(timer);
  waiting = false;
  setStage("early","TOO EARLY!","너무 빨랐어요");
  transitionTimer = setTimeout(()=>{
    if(!gameActive) return;
    nextRound(true);
  },900);
}

function hit(){
  if(!gameActive) return;
  if(phase === "waiting"){
    early();
    return;
  }
  if(phase !== "go") return;
  phase = "done";
  const time = Math.round(performance.now() - goAt);
  times.push(time);
  setStage("done",`${time} ms`,"좋아요!");
  waiting = true;
  transitionTimer = setTimeout(()=>{
    if(!gameActive) return;
    if(round >= maxRounds) finish();
    else nextRound();
  },650);
}

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
  const avg = Math.round(times.reduce((a,b)=>a+b,0)/times.length);
  const personalBest = Math.min(...times);

  if(!best || personalBest < best){
    best = personalBest;
    try { localStorage.setItem("formwheel_reflex_best", best); } catch {}
  }

  document.getElementById("finalTime").textContent = avg;
  document.getElementById("rank").textContent = getRank(avg);
  document.getElementById("bestStat").textContent = `${best} ms`;
  document.getElementById("avgStat").textContent = `${avg} ms`;
  document.getElementById("roundStat").textContent = `${times.length}`;

  game.style.display = "none";
  result.style.display = "block";
}

updateBest();
