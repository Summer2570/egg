/* ============================
   Dashboard.js — Focus + Pomodoro + EyeTracking + SidebarNav
   ============================ */

/* ---------- DOM ---------- */
const display = document.getElementById("display");
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn  = document.getElementById("stopBtn");

const timeSelect = document.getElementById("timeSelect");
const subjectSelect = document.getElementById("subjectSelect");
const newSubjectInput = document.getElementById("newSubject");
const addSubjectBtn = document.getElementById("addSubjectBtn");
const subjectLog = document.getElementById("subjectLog");

const totalTimeEl = document.getElementById("totalTime");
const todayTimeEl = document.getElementById("todayTime");
const sessionsEl = document.getElementById("sessions");
const subjectsCountEl = document.getElementById("subjectsCount");
const progressBar = document.getElementById("progressBar");

/* Calendar DOM */
const calHead = document.getElementById("calHead");
const calGrid = document.getElementById("calGrid");

/* Mode switch UI */
let mode = "timer"; // 'timer' | 'pomo'
let pomo = { focus: 25, short: 5, long: 15, longGap: 4, auto: true };
const modeTimerBtn = document.getElementById("modeTimerBtn");
const modePomoBtn  = document.getElementById("modePomoBtn");
const pomoPreset   = document.getElementById("pomoPreset");
const modeHint     = document.getElementById("modeHint");

/* Bird */
const birdEl = document.getElementById("bird");
const moodEl = document.getElementById("mood");

/* Chart */
let chartInstance = null;

/* ---------- Timer State ---------- */
let timer = null;
let remainingSeconds = 0;
let isRunning = false;
let selectedSubject = "";
let sessions = 0;
let totalFocusMinutes = 0;
let todayFocusMinutes = 0;

/* ---------- Bird ---------- */
const BIRD_EMOJI = {
  focused:"🦜", happy:"🦜✨", bored:"🦜😐", sleepy:"🦜💤",
  celebrate:"🦜🎉", annoyed:"🦜😤", rest:"🦜🧘"
};
function setBird(state, text){
  if(!birdEl || !moodEl) return;
  birdEl.textContent = BIRD_EMOJI[state] || "🦜";
  if(text) moodEl.textContent = text;
}

/* ---------- Display / Progress ---------- */
function updateDisplay(val = remainingSeconds){
  const m = String(Math.floor(val/60)).padStart(2,"0");
  const s = String(val%60).padStart(2,"0");
  display.textContent = `${m}:${s}`;
}
function updateProgress(){
  const goal = 2*60*60; // 2h
  const running = isRunning ? (parseInt(timeSelect.value||"0",10)*60 - remainingSeconds) : 0;
  const total = todayFocusMinutes*60 + Math.max(0,running);
  progressBar.style.width = Math.min(total/goal*100,100) + "%";
}

/* ---------- Subjects ---------- */
let subjects = JSON.parse(localStorage.getItem("subjects")||"[]");
if(!Array.isArray(subjects)) subjects = [];
function seedDefaultSubjects(){
  if(subjects.length===0){
    subjects = ["Math","Science","English"];
    localStorage.setItem("subjects", JSON.stringify(subjects));
  }
}
function renderSubjects(){
  seedDefaultSubjects();
  subjectSelect.innerHTML = "";
  subjects.forEach(s=>{
    const o=document.createElement("option");
    o.value=s; o.textContent=s; subjectSelect.appendChild(o);
  });
  selectedSubject = subjectSelect.value || subjectSelect.options[0]?.value || "";
  subjectsCountEl && (subjectsCountEl.textContent = subjectSelect.options.length);
}
addSubjectBtn?.addEventListener("click", ()=>{
  const name = newSubjectInput.value.trim();
  if(!name) return;
  if(!subjects.includes(name)){
    subjects.push(name);
    localStorage.setItem("subjects", JSON.stringify(subjects));
    renderSubjects();
    subjectSelect.value = name; selectedSubject = name;
  }
  newSubjectInput.value = "";
});
subjectSelect?.addEventListener("change", ()=>{ selectedSubject = subjectSelect.value || ""; });

/* ---------- Mode Switch ---------- */
function resetTimerUI(){
  clearInterval(timer); isRunning=false; remainingSeconds=0;
  updateDisplay(0); updateProgress();
  setBird("happy", mode==="pomo" ? "⏳ พร้อมเริ่ม Pomodoro" : "🦜 พร้อมเริ่มเมื่อไหร่ก็กด START");
}
function setMode(next){
  mode = next;
  if(mode==="timer"){
    modeTimerBtn?.classList.add("is-active"); modePomoBtn?.classList.remove("is-active");
    timeSelect?.classList.remove("hidden");   pomoPreset?.classList.add("hidden");
    modeHint && (modeHint.textContent = "โหมดจับเวลาปกติ");
  }else{
    modePomoBtn?.classList.add("is-active");  modeTimerBtn?.classList.remove("is-active");
    timeSelect?.classList.add("hidden");      pomoPreset?.classList.remove("hidden");
    modeHint && (modeHint.textContent = `Pomodoro: โฟกัส ${pomo.focus} นาที`);
    if(timeSelect) timeSelect.value = String(pomo.focus);
  }
  resetTimerUI();
}
modeTimerBtn?.addEventListener("click", ()=>setMode("timer"));
modePomoBtn?.addEventListener("click", ()=>setMode("pomo"));
pomoPreset?.addEventListener("change", ()=>{
  const [f,s,l,g] = pomoPreset.value.split("-").map(n=>parseInt(n,10));
  pomo = { focus:f, short:s, long:l, longGap:g, auto:true };
  modeHint && (modeHint.textContent = `Pomodoro: โฟกัส ${pomo.focus} นาที`);
  if(timeSelect) timeSelect.value = String(pomo.focus);
  resetTimerUI();
});
document.addEventListener("DOMContentLoaded", ()=>setMode("timer"));

/* ---------- Pomodoro Cycle ---------- */
let pomoRound = 0;
function handlePomodoroCycle(){
  pomoRound++;
  if(pomoRound % pomo.longGap === 0){
    remainingSeconds = pomo.long*60; setBird("rest", `พักยาว ${pomo.long} นาที`); alert(`พักยาว ${pomo.long} นาที`);
  }else{
    remainingSeconds = pomo.short*60; setBird("rest", `พักสั้น ${pomo.short} นาที`); alert(`พักสั้น ${pomo.short} นาที`);
  }
  updateDisplay();
}

/* ---------- Timer Control ---------- */
function startTimer(){
  if(isRunning) return;
  const val = subjectSelect.value || subjectSelect.options[0]?.value || "";
  if(!val){ alert("กรุณาเพิ่ม/เลือกวิชา"); return; }
  selectedSubject = val;

  if(remainingSeconds<=0){
    const minutes = (mode==="timer") ? parseInt(timeSelect.value,10) : pomo.focus;
    if(!minutes || isNaN(minutes)){ alert("เลือกเวลาหรือพรีเซตก่อนนะ"); return; }
    remainingSeconds = minutes*60;
  }

  isRunning = true; setBird("focused", `กำลังโฟกัสที่ ${selectedSubject}…`);
  timer = setInterval(()=>{
    remainingSeconds = Math.max(0, remainingSeconds-1);
    updateDisplay(); updateProgress();
    if(remainingSeconds<=0){
      clearInterval(timer); isRunning=false; logSession();
      if(mode==="pomo") handlePomodoroCycle();
      else { setBird("celebrate","🎉 หมดเวลาพอดี เก่งมาก!"); alert("⏰ หมดเวลาแล้ว!"); }
    }
  },1000);
}
function pauseTimer(){ if(!isRunning) return; clearInterval(timer); isRunning=false; setBird("bored","⏸️ หยุดพักชั่วคราว"); }
function stopTimer(){ clearInterval(timer); isRunning=false; remainingSeconds=0; updateDisplay(0); updateProgress(); setBird("bored","พร้อมเริ่มเมื่อไหร่ก็กด START"); }

/* ---------- Progress / Log ---------- */
function logSession(){
  const sessionMinutes = (mode==="timer") ? (parseInt(timeSelect.value,10)||0) : pomo.focus;
  if(sessionMinutes>0){
    totalFocusMinutes+=sessionMinutes; todayFocusMinutes+=sessionMinutes; sessions++;
    totalTimeEl && (totalTimeEl.textContent = Math.floor(totalFocusMinutes/60)+"h");
    todayTimeEl && (todayTimeEl.textContent = todayFocusMinutes+"m");
    sessionsEl && (sessionsEl.textContent = sessions);
    const li=document.createElement("li"); li.textContent=`${selectedSubject}: +${sessionMinutes} นาที`; subjectLog?.appendChild(li);
    renderChart(); updateProgress();
  }
}

/* ---------- Chart (optional) ---------- */
function renderChart(){
  const ctx=document.getElementById("focusChart"); if(!ctx) return;
  const data={};
  Array.from(subjectLog?.children||[]).forEach(li=>{
    const [subject, tail] = li.textContent.split(":"); const minutes = parseInt(tail,10);
    if(!isNaN(minutes)) data[subject]=(data[subject]||0)+minutes;
  });
  const labels=Object.keys(data), values=Object.values(data);
  chartInstance && chartInstance.destroy();
  chartInstance=new Chart(ctx,{type:"bar",data:{labels,datasets:[{label:"เวลาสะสม (นาที)",data:values,backgroundColor:"rgba(123,144,255,0.6)",borderRadius:8}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,title:{display:true,text:"นาที"}}}}});
}

/* ---------- Calendar ---------- */
function monthMatrix(year,month){
  const first=new Date(year,month,1), start=(first.getDay()+6)%7;
  const days=new Date(year,month+1,0).getDate(), prev=new Date(year,month,0).getDate();
  const cells=[];
  for(let i=start-1;i>=0;i--) cells.push({day:prev-i,muted:true,today:false});
  const today=new Date();
  for(let d=1;d<=days;d++){
    const isToday=d===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
    cells.push({day:d,muted:false,today:isToday});
  }
  while(cells.length%7!==0) cells.push({day:(cells.length%7)+1,muted:true,today:false});
  while(cells.length<42) cells.push({day:(cells.length%7)+1,muted:true,today:false});
  return cells;
}
function renderCalendar(date=new Date()){
  if(!calHead||!calGrid) return;
  calHead.textContent = date.toLocaleString("th-TH",{month:"long",year:"numeric"});
  calGrid.innerHTML = "";
  monthMatrix(date.getFullYear(),date.getMonth()).forEach(c=>{
    const d=document.createElement("div");
    d.className="cell"+(c.muted?" muted":"")+(c.today?" today":"");
    d.textContent=c.day; calGrid.appendChild(d);
  });
}

/* ---------- Idle Detector ---------- */
let idleStart=Date.now(); const IDLE_LIMIT=120;
setInterval(()=>{ const idleSec=Math.floor((Date.now()-idleStart)/1000);
  if(!isRunning && idleSec>=IDLE_LIMIT) setBird("sleepy","🥱 ง่วงแล้วน้า… กลับมาโฟกัสกันเถอะ");
},5000);
["mousemove","keydown","pointerdown","touchstart","visibilitychange"].forEach(ev=>{ window.addEventListener(ev,()=>{ idleStart=Date.now(); }); });

/* ---------- Events ---------- */
startBtn?.addEventListener("click", startTimer);
pauseBtn?.addEventListener("click", pauseTimer);
stopBtn?.addEventListener("click", stopTimer);

/* ---------- Init ---------- */
function init(){
  renderSubjects(); updateDisplay(0); updateProgress(); setBird("happy","🦜 พร้อมลุย!"); renderCalendar(new Date());
}
init();

/* ===== Theme Toggle (light/dark/eye) ===== */
const themeToggle=document.getElementById("themeToggle");
const THEMES=["light","dark","eye"];
function applyTheme(theme){ document.documentElement.setAttribute("data-theme",theme); localStorage.setItem("theme",theme); }
document.addEventListener("DOMContentLoaded",()=>{ applyTheme(localStorage.getItem("theme")||"light"); });
themeToggle?.addEventListener("click",()=>{ const cur=document.documentElement.getAttribute("data-theme"); const next=THEMES[(THEMES.indexOf(cur)+1)%THEMES.length]; applyTheme(next); });

/* ✅ Logout -> index.html (เก็บธีมไว้) */
document.getElementById("logoutBtn")?.addEventListener("click",()=>{
  const theme = localStorage.getItem("theme") || document.documentElement.getAttribute("data-theme") || "light";
  localStorage.clear(); sessionStorage.clear(); applyTheme(theme);
  window.location.href = "index.html";
});

/* ===== Eye Tracking with face-api.js ===== */
const cam = document.getElementById("cameraFeed");
const eyeStatus = document.getElementById("eyeStatus");

async function tryLoadFrom(bases){
  for(const base of bases){
    try{
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(base),
        faceapi.nets.faceLandmark68Net.loadFromUri(base),
        faceapi.nets.faceExpressionNet.loadFromUri(base),
      ]);
      return base; 
    }catch(_e){}
  }
  throw new Error("ไม่พบโมเดลในเส้นทางที่ระบุ");
}
async function loadFaceModels(){
  const bases = ["/models","./models","models"];
  const okBase = await tryLoadFrom(bases);
  console.log("face-api.js models loaded from:", okBase);
}
async function openCamera() {
  if (!cam) throw new Error("camera element not found");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false
    });
    cam.srcObject = stream;
    cam.muted = true;
    cam.setAttribute("playsinline", "true");
    await cam.play();
    return true;
  } catch (e) {
    console.error("openCamera error", e);
    eyeStatus && (eyeStatus.textContent = "❌ เปิดกล้องไม่สำเร็จ");
    return false;
  }
}
function startEyeLoop() {
  let last = performance.now();
  let absentMs = 0;
  async function tick(now) {
    const dt = now - last; last = now;
    if (!cam || cam.readyState < 2 || cam.videoWidth === 0) {
      requestAnimationFrame(tick);
      return;
    }
    const det = await faceapi
      .detectSingleFace(cam,new faceapi.TinyFaceDetectorOptions({ inputSize: 256, scoreThreshold: 0.5 }))
      .withFaceLandmarks();
    if (det) {
      absentMs = 0;
      eyeStatus && (eyeStatus.textContent = "✅ กำลังอ่าน");
      if (typeof startTimer === "function" && !isRunning) startTimer();
    } else {
      absentMs += dt;
      eyeStatus && (eyeStatus.textContent = "⏸️ ไม่เจอสายตา");
      if (absentMs > 2000 && typeof pauseTimer === "function" && isRunning) pauseTimer();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
(async function initEyeTracking(){
  try{
    if(!cam || !eyeStatus) return;
    eyeStatus.textContent = "🎥 เปิดกล้อง...";
    await openCamera();
    eyeStatus.textContent = "⏳ กำลังโหลดโมเดล...";
    try{
      await loadFaceModels();
      eyeStatus.textContent = "👀 พร้อมตรวจจับ";
      startEyeLoop();
    }catch(modelErr){
      console.warn("โหลดโมเดลไม่สำเร็จ:", modelErr);
      eyeStatus.textContent = "⚠️ กล้องทำงาน แต่โหลดโมเดลไม่สำเร็จ (ตรวจจับปิด)";
    }
  }catch(e){
    console.warn("Eye tracking init failed:", e);
    eyeStatus.textContent = "❌ ใช้งานกล้อง/โมเดลไม่ได้";
  }
})();

/* ---------- Sidebar Navigation ---------- */
(function sidebarNav() {
  document.addEventListener('click', function (e) {
    const btn = e.target.closest('.menu-btn');
    if (!btn) return;
    const href = btn.getAttribute('data-href') || btn.getAttribute('href');
    if (href) window.location.href = href;
  });

  const currentPage = window.location.pathname.split("/").pop();
  document.querySelectorAll('.menu-btn').forEach(btn => {
    const href = btn.getAttribute('data-href') || btn.getAttribute('href');
    if (href && href === currentPage) {
      btn.classList.add('is-active');
    } else {
      btn.classList.remove('is-active');
    }
  });
})();
