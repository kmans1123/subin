/* ============================================================
   우리만의 숫자송 놀이터 ♡  -  script.js
   HTML / CSS / Vanilla JS 만으로 동작하는 인터랙티브 숫자 놀이터

   핵심 구조
   - 음악 재생 상태와 캐릭터 상호작용 상태를 분리 (state 객체)
   - 자동 종료(16초 타이머) 없음. 음악이 끝나도 캐릭터는 계속 남아 있음
   - 캐릭터 반응은 characterConfig 데이터로 관리
   ============================================================ */

/* ------------------------------------------------------------
   1) 설정값 (여기만 바꾸면 됩니다)
   ------------------------------------------------------------ */
const CONFIG = {
  audioPath: "assets/number-song.mp3",
  // 비밀(하트 버튼) 메시지
  secretMessage:
    "숫자는 1부터 10까지지만\n내가 좋아하는 사람은 수빈이\n딱 한 명이야!",
  // 단체 춤 지속 시간(ms)  ※ 여기서 단체 춤 길이를 조절하세요.
  groupDanceMs: 4200,
  // 말풍선 유지 시간(ms)
  bubbleMs: 1800,
};

/* ------------------------------------------------------------
   2) 숫자 등장 타임라인
   - time   : 등장 시각(초)
   - number : 등장할 숫자(1~10)
   ※ 음악 시작 후 약 8~9초 안에 1~10이 모두 등장합니다.
   ------------------------------------------------------------ */
const characterTimeline = [
  { time: 0.3, number: 1 },
  { time: 1.2, number: 2 },
  { time: 2.1, number: 3 },
  { time: 3.0, number: 4 },
  { time: 3.9, number: 5 },
  { time: 4.8, number: 6 },
  { time: 5.7, number: 7 },
  { time: 6.6, number: 8 },
  { time: 7.5, number: 9 },
  { time: 8.4, number: 10 },
];

/* 숫자별 파스텔 색상(몸체 / 진한 테두리 = 배지 배경) */
const NUMBER_COLORS = {
  10: { body: "#ffd1e1", edge: "#f56aa0" },
  1: { body: "#ffe0b3", edge: "#f0a04b" },
  2: { body: "#cdeccf", edge: "#5bb86a" },
  3: { body: "#b9e2ff", edge: "#4a9fe0" },
  4: { body: "#e2d4ff", edge: "#8a6ae0" },
  5: { body: "#ffcbd6", edge: "#f0607e" },
  6: { body: "#cfeffa", edge: "#4bbcdc" },
  7: { body: "#fff0b3", edge: "#e8c53b" },
  8: { body: "#d8f0d0", edge: "#6fb85a" },
  9: { body: "#ffd6ec", edge: "#e85aa3" },
};

/* ------------------------------------------------------------
   3) 숫자별 반응 설정 (데이터 기반)
   - animation : .performer__body 에 붙일 CSS 애니메이션 클래스
   - particle  : 터질 파티클 종류
   - face      : 표정 클래스(fx-wink / fx-happy / fx-cool 등)
   - messages  : 말풍선 문구 배열(랜덤 선택)
   - special   : 특수 연출 함수 이름(선택)
   ※ 반응/문구를 바꾸려면 이 객체를 수정하세요.
   ------------------------------------------------------------ */
const characterConfig = {
  1: {
    animation: "anim-jump-wink",
    particle: "star",
    face: "fx-wink",
    messages: ["일초만 안 보여도 보고싶어"],
  },
  2: {
    animation: "anim-heart-sway",
    particle: "heart",
    face: "fx-happy",
    messages: ["둘이 있으면 행복해"],
  },
  3: {
    animation: "anim-triple-jump",
    particle: "star",
    face: "fx-happy",
    messages: ["삼초만 웃어봐 😊"],
    special: "countThree",
  },
  4: {
    animation: "anim-spin-arms",
    particle: "star",
    face: "fx-happy",
    messages: ["사랑해요는 네 글자."],
  },
  5: {
    animation: "anim-big-spin",
    particle: "sparkle",
    face: "fx-happy",
    messages: ["오늘도 잘 부탁해!"],
  },
  6: {
    animation: "anim-groove",
    particle: "heart",
    face: "fx-happy",
    messages: ["육십억 명 중에 수빈이."],
  },
  7: {
    animation: "anim-cool",
    particle: "star",
    face: "fx-cool",
    messages: ["럭키세븐! 오늘도 행운!"],
    special: "spotlight",
  },
  8: {
    animation: "anim-squish",
    particle: "heart",
    face: "fx-happy",
    messages: ["팔딱팔딱 뛰는 가슴."],
  },
  9: {
    animation: "anim-rewind",
    particle: "sparkle",
    face: "fx-happy",
    messages: ["구해줘 오 내 마음."],
  },
  10: {
    animation: "anim-portal",
    particle: "sparkle",
    face: "fx-happy",
    messages: ["10년이 가도 너를 사랑해 :)"],
    special: "portal",
  },
};

const PARTICLE_ICONS = {
  heart: ["♡", "💕", "❤"],
  star: ["⭐", "✨", "🌟"],
  sparkle: ["✨", "💫", "⭐", "♡"],
};

/* ------------------------------------------------------------
   4) DOM 참조
   ------------------------------------------------------------ */
const $ = (id) => document.getElementById(id);
const audio = $("audio");
const intro = $("intro");
const playBtn = $("playBtn");
const audioNote = $("audioNote");
const playground = $("playground");
const gridEl = $("grid");
const progressFill = $("progressFill");
const bannerText = $("bannerText");
const controls = $("controls");
const ctrlPlay = $("ctrlPlay");
const ctrlPlayIcon = $("ctrlPlayIcon");
const ctrlRestart = $("ctrlRestart");
const ctrlMute = $("ctrlMute");
const ctrlMuteIcon = $("ctrlMuteIcon");
const ctrlDance = $("ctrlDance");
const ctrlHome = $("ctrlHome");
const heartEgg = $("heartEgg");
const carrotEgg = $("carrotEgg");
const secretEl = $("secret");
const secretText = $("secretText");
const secretClose = $("secretClose");
const secretOk = $("secretOk");
const secretSaved = $("secretSaved");
const toastEl = $("toast");
const bgDecor = $("bgDecor");
const bgOrbs = [$("bgOrb1"), $("bgOrb2"), $("bgOrb3")];

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

/* ------------------------------------------------------------
   5) 상태 (음악 상태와 캐릭터 상호작용 상태를 분리)
   ------------------------------------------------------------ */
const state = {
  started: false, // 놀이터 진입 여부
  audioPlaying: false, // 음악 재생 중
  allCharactersRevealed: false, // 1~10 모두 등장 완료
  interactionEnabled: true, // 캐릭터 터치 가능 여부
  groupDancePlaying: false, // 단체 춤 중
  endBannerShown: false, // 음악 종료 배너 표시 여부
};

const performers = {}; // number -> { root, body, badge, bubble }
const spawned = new Set(); // 이미 등장한 타임라인 인덱스
const bubbleTimers = {}; // number -> timeout id
let activeParticles = 0;
const MAX_PARTICLES = 60;

/* Web Audio(음량 반응) */
let audioCtx = null;
let analyser = null;
let freqData = null;
let audioSourceConnected = false;

let rafId = null;
let virtualTime = 0; // 음원이 없을 때 등장 타임라인용 가상 시간
let lastFrame = 0;
let groupDanceStartTimers = [];
let groupDanceEndTimer = null;

/* ============================================================
   6) 숫자 캐릭터 SVG (독창적 인라인 SVG)
   ============================================================ */
function createCharacterSVG(n) {
  const c = NUMBER_COLORS[n];
  return `
  <svg viewBox="0 0 100 120" role="img" aria-label="숫자 ${n} 캐릭터">
    <defs>
      <radialGradient id="hl${n}" cx="35%" cy="28%" r="75%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.9)"/>
        <stop offset="45%" stop-color="rgba(255,255,255,0)"/>
      </radialGradient>
    </defs>
    <g class="char">
      <!-- 팔 -->
      <rect class="arm arm-l" x="8" y="55" width="16" height="9" rx="4.5" fill="${c.edge}"/>
      <rect class="arm arm-r" x="76" y="55" width="16" height="9" rx="4.5" fill="${c.edge}"/>
      <!-- 다리 -->
      <rect x="34" y="100" width="11" height="16" rx="5.5" fill="${c.edge}"/>
      <rect x="55" y="100" width="11" height="16" rx="5.5" fill="${c.edge}"/>
      <ellipse cx="39.5" cy="116" rx="9" ry="5" fill="${c.edge}"/>
      <ellipse cx="60.5" cy="116" rx="9" ry="5" fill="${c.edge}"/>
      <!-- 몸통(젤리 라운드) -->
      <rect x="18" y="14" width="64" height="90" rx="30" fill="${c.edge}"/>
      <rect x="21" y="17" width="58" height="84" rx="27" fill="${c.body}"/>
      <rect x="21" y="17" width="58" height="84" rx="27" fill="url(#hl${n})"/>
      <!-- 몸통 안 큰 숫자(옅게) -->
      <text x="50" y="74" text-anchor="middle" font-family="'Jua', sans-serif"
            font-size="${n === 10 ? 38 : 52}" font-weight="700" fill="${c.edge}" opacity="0.45">${n}</text>
      <!-- 얼굴 -->
      <g class="face">
        <circle class="eye eye-l" cx="40" cy="50" r="4.8" fill="#5b4a63"/>
        <circle class="eye eye-r" cx="60" cy="50" r="4.8" fill="#5b4a63"/>
        <circle cx="41.7" cy="48.3" r="1.6" fill="#fff"/>
        <circle cx="61.7" cy="48.3" r="1.6" fill="#fff"/>
        <circle cx="33" cy="58" r="4" fill="#ff9dc4" opacity="0.6"/>
        <circle cx="67" cy="58" r="4" fill="#ff9dc4" opacity="0.6"/>
        <path d="M42 60 Q50 68 58 60" stroke="#5b4a63" stroke-width="2.6"
              stroke-linecap="round" fill="none"/>
      </g>
      <!-- 선글라스(기본 숨김, 7번용) -->
      <g class="sunglasses">
        <rect x="31" y="44" width="16" height="10" rx="4" fill="#3a2f40"/>
        <rect x="53" y="44" width="16" height="10" rx="4" fill="#3a2f40"/>
        <rect x="47" y="47" width="6" height="3" fill="#3a2f40"/>
      </g>
    </g>
  </svg>`;
}

/* ============================================================
   7) 배경 장식(떠다니는 하트/별/구름/숫자)
   ============================================================ */
function buildBackgroundDecor() {
  if (reduceMotion) return;
  const items = [
    { type: "heart", count: 5 },
    { type: "star", count: 5 },
    { type: "cloud", count: 3 },
    { type: "number", count: 4 },
  ];
  const svgFor = (type) => {
    switch (type) {
      case "heart":
        return `<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 21s-7-4.6-9.3-9C1 8.6 2.8 5 6.2 5c2 0 3.2 1.2 3.8 2.2C10.6 6.2 11.8 5 13.8 5 17.2 5 19 8.6 21.3 12 19 16.4 12 21 12 21z" fill="#ff9dc4"/></svg>`;
      case "star":
        return `<svg width="20" height="20" viewBox="0 0 24 24"><path d="M12 2l2.6 6.3L21 9l-5 4.3L17.5 20 12 16.4 6.5 20 8 13.3 3 9l6.4-.7z" fill="#ffe08a"/></svg>`;
      case "cloud":
        return `<svg width="48" height="30" viewBox="0 0 52 34"><g fill="#ffffff" opacity="0.8"><circle cx="16" cy="20" r="12"/><circle cx="30" cy="16" r="14"/><circle cx="40" cy="22" r="10"/><rect x="14" y="20" width="28" height="12" rx="6"/></g></svg>`;
      case "number": {
        const n = Math.floor(Math.random() * 10);
        return `<svg width="28" height="28" viewBox="0 0 30 30"><text x="15" y="23" text-anchor="middle" font-family="'Jua',sans-serif" font-size="24" fill="#c9b8ff" opacity="0.8">${n}</text></svg>`;
      }
      default:
        return "";
    }
  };
  const frag = document.createDocumentFragment();
  items.forEach(({ type, count }) => {
    for (let i = 0; i < count; i++) {
      const el = document.createElement("div");
      el.className = "floaty";
      el.innerHTML = svgFor(type);
      el.style.left = Math.random() * 96 + "vw";
      const dur = 14 + Math.random() * 12;
      el.style.animationDuration = dur + "s";
      el.style.animationDelay = -Math.random() * dur + "s";
      frag.appendChild(el);
    }
  });
  bgDecor.appendChild(frag);
}

/* ============================================================
   8) 오디오 준비
   ============================================================ */
function setupAudio() {
  audio.src = CONFIG.audioPath;

  audio.addEventListener("canplaythrough", () => {
    playBtn.disabled = false;
    audioNote.textContent = "";
  });
  audio.addEventListener("error", () => {
    playBtn.disabled = false;
    audioNote.textContent = "음원이 없어도 놀이터는 즐길 수 있어요 ♡";
  });

  // 음악이 끝나도 캐릭터는 유지 (엔딩 화면으로 전환하지 않음)
  audio.addEventListener("ended", onAudioEnded);
  audio.addEventListener("pause", () => {
    state.audioPlaying = false;
    setPlayIcon(false);
  });
  audio.addEventListener("play", () => {
    state.audioPlaying = true;
    setPlayIcon(true);
  });

  // 혹시 canplaythrough 가 안 와도 3초 뒤엔 버튼 열어줌
  setTimeout(() => {
    if (playBtn.disabled && !audio.error) playBtn.disabled = false;
  }, 3000);

  audio.load();
}

function onAudioEnded() {
  state.audioPlaying = false;
  setPlayIcon(false);
  // 자동 종료/화면 전환 없음. 안내 배너만 갱신.
  if (!state.endBannerShown) {
    state.endBannerShown = true;
    setBanner("노래는 끝났지만 숫자 친구들은 아직 놀고 싶대요!");
  }
}

/* Web Audio - 음량 반응 (실패해도 무시) */
function setupAnalyser() {
  if (audioSourceConnected || reduceMotion) return;

  // index.html을 file:// 로 직접 열면 브라우저가 로컬 MP3를 별도 출처로
  // 취급할 수 있습니다. 이 상태에서 MediaElementSource에 연결하면 재생은
  // 진행되지만 출력이 무음이 되는 브라우저가 있으므로 분석기만 생략합니다.
  // 오디오는 <audio> 요소가 직접 출력하므로 정상적으로 들립니다.
  if (window.location.protocol === "file:") return;

  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = new Ctx();
    const src = audioCtx.createMediaElementSource(audio);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 128;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    src.connect(analyser);
    analyser.connect(audioCtx.destination);
    audioSourceConnected = true;
  } catch (e) {
    analyser = null;
    console.log("[v0] Web Audio 사용 불가:", e.message);
  }
}

/* ============================================================
   9) 놀이터 진입
   ============================================================ */
async function enterPlayground() {
  if (state.started) return;
  state.started = true;

  intro.classList.add("is-hidden");
  playground.classList.add("is-active");
  playground.setAttribute("aria-hidden", "false");
  controls.classList.add("is-active");
  controls.setAttribute("aria-hidden", "false");
  heartEgg.classList.add("is-active");
  heartEgg.setAttribute("aria-hidden", "false");
  carrotEgg.classList.add("is-active");
  carrotEgg.setAttribute("aria-hidden", "false");

  setBanner("숫자 친구들이 놀러 오는 중…");

  setupAnalyser();
  if (audioCtx && audioCtx.state === "suspended") {
    try {
      await audioCtx.resume();
    } catch (_) {}
  }

  try {
    await audio.play();
  } catch (e) {
    audioNote.textContent = "음원이 없어도 놀이터는 즐길 수 있어요 ♡";
    console.log("[v0] audio.play 실패:", e.message);
  }

  virtualTime = 0;
  lastFrame = performance.now();
  startLoop();
}

/* ============================================================
   10) 메인 루프 (등장 타임라인 + 진행 바 + 음량 반응)
   * 자동 종료 없음: 캐릭터가 다 등장한 뒤에도 루프는 계속 돎.
   ============================================================ */
function startLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  lastFrame = performance.now();
  rafId = requestAnimationFrame(tick);
}

function getSpawnTime() {
  // 음악이 실제로 재생 중이면 audio.currentTime, 아니면 가상 시간
  if (state.audioPlaying && audio.currentTime > 0) return audio.currentTime;
  return virtualTime;
}

function tick(now) {
  const dt = (now - lastFrame) / 1000;
  lastFrame = now;

  // 아직 다 등장하지 않았고 음악이 멈춰 있으면 가상 시간 진행
  if (!state.allCharactersRevealed && !state.audioPlaying) {
    virtualTime += dt;
  }

  const t = getSpawnTime();
  updateSpawn(t);
  updateProgress();
  updateBeat(t);

  rafId = requestAnimationFrame(tick);
}

function updateSpawn(t) {
  if (state.allCharactersRevealed) return;
  characterTimeline.forEach((item, idx) => {
    if (!spawned.has(idx) && t >= item.time) {
      spawned.add(idx);
      spawnPerformer(item.number);
    }
  });
  if (spawned.size === characterTimeline.length) {
    state.allCharactersRevealed = true;
    setBanner("숫자 친구들을 눌러보세요!");
  }
}

function updateProgress() {
  const dur = isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
  if (dur > 0) {
    progressFill.style.width = Math.min(100, (audio.currentTime / dur) * 100) + "%";
  }
}

/* 음량 기반 배경 반응(없으면 사인파) */
function updateBeat(t) {
  if (reduceMotion) return;
  let level = 0;
  if (analyser && state.audioPlaying) {
    analyser.getByteFrequencyData(freqData);
    let sum = 0;
    for (let i = 0; i < freqData.length; i++) sum += freqData[i];
    level = sum / freqData.length / 255;
  } else if (state.audioPlaying) {
    level = (Math.sin(t * 6) * 0.5 + 0.5) * 0.5 + 0.1;
  }
  bgOrbs.forEach((orb, i) => {
    if (!orb) return;
    const scale = 1 + level * (0.16 + i * 0.05);
    orb.style.transform = `scale(${scale.toFixed(3)})`;
    orb.style.opacity = (0.4 + level * 0.3).toFixed(2);
  });
}

/* ============================================================
   11) 캐릭터 등장
   ============================================================ */
function spawnPerformer(number) {
  if (performers[number]) return; // 이미 있으면 스킵

  const c = NUMBER_COLORS[number];
  const cfg = characterConfig[number];

  const root = document.createElement("button");
  root.type = "button";
  root.className = "performer";
  root.dataset.number = String(number);
  root.setAttribute("aria-label", `숫자 ${number} 캐릭터 반응 보기`);

  // 말풍선
  const bubble = document.createElement("span");
  bubble.className = "bubble";
  bubble.setAttribute("aria-hidden", "true");

  // 숫자 배지(이름표)
  const badge = document.createElement("span");
  badge.className = "performer__badge";
  badge.style.background = c.edge;
  badge.textContent = String(number);

  // 캐릭터 SVG 래퍼
  const body = document.createElement("span");
  body.className = "performer__body";
  body.innerHTML = createCharacterSVG(number);

  root.appendChild(bubble);
  root.appendChild(badge);
  root.appendChild(body);
  gridEl.appendChild(root);

  performers[number] = { root, body, badge, bubble };

  // 진입 애니메이션
  requestAnimationFrame(() => root.classList.add("is-in"));

  // 등장 파티클
  spawnParticles(root, cfg.particle, 8);

  // 이벤트 연결
  bindPerformerEvents(root, number);
}

/* ============================================================
   12) 터치/클릭 이벤트 (pointer + click 폴백, IME/hover 비의존)
   ============================================================ */
function bindPerformerEvents(root, number) {
  let pressed = false;

  const onDown = () => {
    if (!state.interactionEnabled) return;
    pressed = true;
    root.classList.add("is-press");
  };
  const onUp = (e) => {
    root.classList.remove("is-press");
    if (!pressed) return;
    pressed = false;
    // 파동 위치용 좌표 전달
    const x = e && e.clientX;
    const y = e && e.clientY;
    reactCharacter(number, x, y);
  };
  const onCancel = () => {
    pressed = false;
    root.classList.remove("is-press");
  };

  if (window.PointerEvent) {
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onCancel);
    root.addEventListener("pointerleave", onCancel);
  } else {
    // 아주 오래된 브라우저 폴백
    root.addEventListener("mousedown", onDown);
    root.addEventListener("mouseup", onUp);
    root.addEventListener("click", (e) => reactCharacter(number, e.clientX, e.clientY));
  }

  // 키보드 접근성
  root.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (state.interactionEnabled) reactCharacter(number);
    }
  });
}

/* ============================================================
   13) 캐릭터 반응 (데이터 기반)
   ============================================================ */
function reactCharacter(number, clientX, clientY) {
  const p = performers[number];
  if (!p) return;
  const cfg = characterConfig[number];

  // 짧은 진동(지원 시)
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(20);
    } catch (_) {}
  }

  // 카드 눌림 파동
  spawnRipple(p.root, clientX, clientY);

  // 가장자리 캐릭터가 확대 시 화면 밖으로 나가지 않도록 살짝 보정
  nudgeIntoView(p.root, p.body);

  // 애니메이션 재실행: 클래스 제거 → 리플로우 → 재추가
  restartAnimation(p.body, cfg.animation);

  // 표정
  applyFace(p.root, cfg.face);

  // 파티클
  spawnParticles(p.root, cfg.particle, 12);

  // 말풍선(문구 랜덤)
  showBubble(number, pickRandom(cfg.messages));

  // 특수 연출
  if (cfg.special === "countThree") countThree(p.root);
  if (cfg.special === "spotlight") flashSpotlight(clientX, clientY);
  if (cfg.special === "portal") portalGather(p.root);

  // 반응 종료 후 정리
  const dur = getAnimMs(cfg.animation);
  clearTimeout(p._reactTimer);
  p._reactTimer = setTimeout(() => {
    p.root.classList.remove("is-reacting");
    p.root.classList.remove("fx-wink", "fx-happy");
    p.body.style.zIndex = "";
    if (number !== 7) p.root.classList.remove("fx-cool");
    resetNudge(p.body);
  }, dur + 60);
}

/* 애니메이션 재시작 (연타 대응) */
function restartAnimation(bodyEl, animClass) {
  const root = bodyEl.parentElement;
  root.classList.add("is-reacting");
  // 모든 anim-* 제거
  bodyEl.className = "performer__body";
  void bodyEl.offsetWidth; // 강제 리플로우
  bodyEl.classList.add(animClass);
}

function applyFace(root, face) {
  root.classList.remove("fx-wink", "fx-happy");
  if (face === "fx-cool") {
    root.classList.add("fx-cool"); // 토글이 아니라 유지(7번 선글라스)
  } else if (face) {
    root.classList.add(face);
  }
}

/* 애니메이션 대략적 지속시간(ms) */
function getAnimMs(animClass) {
  const map = {
    "anim-jump-wink": 850,
    "anim-heart-sway": 1100,
    "anim-triple-jump": 1150,
    "anim-spin-arms": 1200,
    "anim-big-spin": 1250,
    "anim-groove": 1300,
    "anim-cool": 1400,
    "anim-squish": 1200,
    "anim-rewind": 1350,
    "anim-portal": 1600,
  };
  return map[animClass] || 1200;
}

/* 화면 밖으로 나가지 않도록 확대 방향 보정 */
function nudgeIntoView(root, body) {
  const rect = root.getBoundingClientRect();
  const vw = window.innerWidth;
  const margin = rect.width * 0.5; // 확대 여유
  let shift = 0;
  if (rect.left < margin) shift = margin - rect.left;
  else if (vw - rect.right < margin) shift = -(margin - (vw - rect.right));
  body.style.setProperty("--nudge", shift.toFixed(0) + "px");
  if (shift !== 0) {
    body.style.transform = `translateX(${shift.toFixed(0)}px)`;
  }
}
function resetNudge(body) {
  body.style.transform = "";
}

/* ============================================================
   14) 파티클 / 이펙트
   ============================================================ */
function spawnParticles(target, type, count) {
  if (reduceMotion) return;
  const rect = target.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const icons = PARTICLE_ICONS[type] || PARTICLE_ICONS.sparkle;
  const n = Math.min(count, MAX_PARTICLES - activeParticles);
  for (let i = 0; i < n; i++) {
    const el = document.createElement("span");
    el.className = "particle";
    el.textContent = icons[i % icons.length];
    const angle = (Math.PI * 2 * i) / n + Math.random() * 0.4;
    const dist = 50 + Math.random() * 46;
    el.style.left = cx + "px";
    el.style.top = cy + "px";
    el.style.setProperty("--px", (Math.cos(angle) * dist).toFixed(0) + "px");
    el.style.setProperty("--py", (Math.sin(angle) * dist).toFixed(0) + "px");
    el.style.setProperty("--pr", (Math.random() * 220 - 110).toFixed(0) + "deg");
    document.body.appendChild(el);
    activeParticles++;
    el.addEventListener("animationend", () => {
      el.remove();
      activeParticles--;
    });
  }
}

function spawnRipple(root, clientX, clientY) {
  if (reduceMotion) return;
  const rect = root.getBoundingClientRect();
  const el = document.createElement("span");
  el.className = "ripple";
  const size = rect.width * 0.6;
  el.style.width = size + "px";
  el.style.height = size + "px";
  el.style.left = (clientX != null ? clientX - rect.left : rect.width / 2) + "px";
  el.style.top = (clientY != null ? clientY - rect.top : rect.height / 2) + "px";
  root.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

/* 3번: 1,2,3 카운트 팝업 */
function countThree(root) {
  if (reduceMotion) return;
  const rect = root.getBoundingClientRect();
  [1, 2, 3].forEach((num, i) => {
    setTimeout(() => {
      const el = document.createElement("span");
      el.className = "count-pop";
      el.textContent = num;
      el.style.left = rect.left + rect.width / 2 + "px";
      el.style.top = rect.top + rect.height / 2 - 20 + "px";
      document.body.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
    }, i * 320);
  });
}

/* 7번: 스포트라이트 번쩍 */
function flashSpotlight(clientX, clientY) {
  if (reduceMotion) return;
  const el = document.createElement("div");
  el.className = "spotlight-flash";
  const sx = clientX != null ? (clientX / window.innerWidth) * 100 : 50;
  const sy = clientY != null ? (clientY / window.innerHeight) * 100 : 40;
  el.style.setProperty("--sx", sx + "%");
  el.style.setProperty("--sy", sy + "%");
  document.body.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

/* 0번: 포털 + 다른 캐릭터 모이기 & 동시 점프 */
function portalGather(centerRoot) {
  if (!reduceMotion) {
    const ring = document.createElement("div");
    ring.className = "portal-ring";
    document.body.appendChild(ring);
    ring.addEventListener("animationend", () => ring.remove());
  }
  // 다른 캐릭터들 살짝 점프
  Object.entries(performers).forEach(([num, p]) => {
    if (Number(num) === 10) return;
    restartMini(p.body);
  });
}
function restartMini(bodyEl) {
  bodyEl.classList.remove("anim-mini-jump");
  void bodyEl.offsetWidth;
  bodyEl.classList.add("anim-mini-jump");
  setTimeout(() => bodyEl.classList.remove("anim-mini-jump"), 640);
}

/* ============================================================
   15) 말풍선
   ============================================================ */
function showBubble(number, text) {
  const p = performers[number];
  if (!p) return;
  p.bubble.textContent = text;
  p.bubble.classList.add("is-show");
  clearTimeout(bubbleTimers[number]);
  bubbleTimers[number] = setTimeout(() => {
    p.bubble.classList.remove("is-show");
  }, CONFIG.bubbleMs);
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ============================================================
   16) 단체 춤
   ============================================================ */
function stopGroupDance() {
  groupDanceStartTimers.forEach(clearTimeout);
  groupDanceStartTimers = [];
  if (groupDanceEndTimer) clearTimeout(groupDanceEndTimer);
  groupDanceEndTimer = null;

  Object.values(performers).forEach((p) => {
    p.body.classList.remove("anim-group");
    p.root.classList.remove("is-reacting");
  });
  state.groupDancePlaying = false;
}

function groupDance() {
  // 진행 중인 춤과 예약된 동작을 먼저 취소하고 매번 처음부터 즉시 시작합니다.
  stopGroupDance();
  const nums = Object.keys(performers);
  if (nums.length === 0) return;
  state.groupDancePlaying = true;
  setBanner("숫자 친구들 단체 무대 시작! ✨");

  nums.forEach((num, i) => {
    const p = performers[num];
    clearTimeout(p._reactTimer);
    p.body.className = "performer__body";
    void p.body.offsetWidth;
    const delay = (i % 5) * 60;
    const startTimer = setTimeout(() => {
      p.body.className = "performer__body";
      void p.body.offsetWidth;
      p.body.classList.add("anim-group");
      p.root.classList.add("is-reacting");
      spawnParticles(p.root, "sparkle", 6);
      showBubble(num, pickRandom(characterConfig[num].messages));
    }, delay);
    groupDanceStartTimers.push(startTimer);
  });

  groupDanceEndTimer = setTimeout(() => {
    stopGroupDance();
    setBanner(
      state.endBannerShown
        ? "노래는 끝났지만 더 놀아도 돼요 ♡"
        : "숫자 친구들을 눌러보세요!"
    );
  }, CONFIG.groupDanceMs);
}

/* ============================================================
   17) 컨트롤 바
   ============================================================ */
function setPlayIcon(playing) {
  ctrlPlayIcon.textContent = playing ? "❚❚" : "▶";
}

async function togglePlay() {
  if (audio.paused) {
    if (audioCtx && audioCtx.state === "suspended") {
      try {
        await audioCtx.resume();
      } catch (_) {}
    }
    try {
      await audio.play();
    } catch (e) {
      console.log("[v0] play 실패:", e.message);
    }
  } else {
    audio.pause();
  }
}

function restartAudio() {
  audio.currentTime = 0;
  state.endBannerShown = false;
  togglePlayForce();
  setBanner("처음부터 다시 들어요 ♪");
}
async function togglePlayForce() {
  try {
    if (audioCtx && audioCtx.state === "suspended") await audioCtx.resume();
    await audio.play();
  } catch (e) {
    console.log("[v0] restart play 실패:", e.message);
  }
}

function toggleMute() {
  audio.muted = !audio.muted;
  ctrlMuteIcon.textContent = audio.muted ? "🔇" : "🔊";
}

/* 등장 장면 다시 보기: 캐릭터를 지우고 타임라인 재실행 */
function replayEntrance() {
  // 캐릭터 제거
  Object.values(performers).forEach((p) => {
    clearTimeout(p._reactTimer);
    p.root.remove();
  });
  for (const k in performers) delete performers[k];
  spawned.clear();
  state.allCharactersRevealed = false;
  state.endBannerShown = false;
  virtualTime = 0;
  setBanner("숫자 친구들이 다시 놀러 오는 중… ♡");
  showToast("등장 장면 다시 보기!");
  // 음악 상태와 무관하게 등장만 재실행 (루프가 spawn 처리)
}

function goHome() {
  // 하단의 "처음" 버튼은 숫자송 시작 화면이 아닌 메인 놀이터로 이동합니다.
  audio.pause();
  window.location.href = "../index.html";
}

/* ============================================================
   18) 배너 / 토스트
   ============================================================ */
function setBanner(text) {
  bannerText.textContent = text;
  bannerText.style.animation = "none";
  void bannerText.offsetWidth;
  bannerText.style.animation = "";
}

let toastTimer = null;
let carrotRainRunning = false;
function showToast(text) {
  toastEl.textContent = text;
  toastEl.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("is-show"), 1800);
}

/* ============================================================
   19) 비밀 메시지 팝업 (이스터에그)
   ============================================================ */
function openSecret() {
  secretText.textContent = CONFIG.secretMessage;
  secretSaved.textContent = "";
  secretEl.classList.add("is-open");
  secretEl.setAttribute("aria-hidden", "false");
}
function closeSecret() {
  secretEl.classList.remove("is-open");
  secretEl.setAttribute("aria-hidden", "true");
}

/* ============================================================
   20) 초기화 & 이벤트 바인딩
   ============================================================ */
function init() {
  buildBackgroundDecor();
  setupAudio();

  playBtn.addEventListener("click", enterPlayground);

  ctrlPlay.addEventListener("click", togglePlay);
  ctrlRestart.addEventListener("click", restartAudio);
  ctrlMute.addEventListener("click", toggleMute);
  ctrlDance.addEventListener("click", groupDance);
  ctrlHome.addEventListener("click", goHome);

  heartEgg.addEventListener("click", openSecret);
  carrotEgg.addEventListener("click", spawnCarrotRain);
  secretClose.addEventListener("click", closeSecret);
  secretOk.addEventListener("click", () => {
    secretSaved.textContent = "나도 좋아해 ♡ (전해졌어요!)";
    spawnHeartRain();
    setTimeout(closeSecret, 1200);
  });
  secretEl.addEventListener("click", (e) => {
    if (e.target === secretEl) closeSecret();
  });

  // 키보드: Space 재생/정지, Esc 팝업 닫기
  document.addEventListener("keydown", (e) => {
    if (!state.started) return;
    if (e.code === "Space" && e.target === document.body) {
      e.preventDefault();
      togglePlay();
    }
    if (e.key === "Escape") closeSecret();
  });
}

/* 비밀 팝업 확인 시 하트 비 */
function spawnHeartRain() {
  if (reduceMotion) return;
  for (let i = 0; i < 14; i++) {
    const el = document.createElement("span");
    el.className = "particle";
    el.textContent = "♡";
    el.style.left = 50 + (Math.random() * 40 - 20) + "vw";
    el.style.top = "40vh";
    el.style.setProperty("--px", (Math.random() * 200 - 100).toFixed(0) + "px");
    el.style.setProperty("--py", (Math.random() * 160 - 80).toFixed(0) + "px");
    el.style.setProperty("--pr", (Math.random() * 200 - 100).toFixed(0) + "deg");
    document.body.appendChild(el);
    el.addEventListener("animationend", () => el.remove());
  }
}

/* 두 번째 당근 버튼: 화면 위에서 당근이 주르륵 쏟아지는 효과 */
function spawnCarrotRain() {
  if (reduceMotion) {
    showToast("🥕 당근이 왔어요! 🥕");
    return;
  }

  // 연타로 200개 효과가 겹쳐 기기에 부담을 주지 않도록 한 번만 실행합니다.
  if (carrotRainRunning) {
    showToast("당근이 아직 쏟아지는 중이에요! 🥕");
    return;
  }

  carrotRainRunning = true;
  const totalCarrots = 200;
  const batchSize = 6;
  let created = 0;
  let batchTimer = null;

  const createBatch = () => {
    const fragment = document.createDocumentFragment();
    const count = Math.min(batchSize, totalCarrots - created);

    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "carrot-rain";
      el.textContent = "🥕";
      el.style.left = Math.random() * 100 + "vw";
      el.style.fontSize = 22 + Math.random() * 24 + "px";
      el.style.setProperty("--carrot-x", (Math.random() * 120 - 60).toFixed(0) + "px");
      el.style.setProperty("--carrot-r", (Math.random() * 160 - 80).toFixed(0) + "deg");
      el.style.setProperty("--pile-height", (Math.random() * 75).toFixed(0) + "px");
      el.style.animationDelay = (Math.random() * 0.65).toFixed(2) + "s";
      el.style.animationDuration = (6.2 + Math.random()).toFixed(2) + "s";
      fragment.appendChild(el);
      el.addEventListener("animationend", () => el.remove());
    }

    document.body.appendChild(fragment);
    created += count;

    if (created >= totalCarrots) {
      if (batchTimer) clearInterval(batchTimer);
      // 마지막 당근까지 사라진 뒤 다시 누를 수 있게 합니다.
      setTimeout(() => {
        carrotRainRunning = false;
      }, 8000);
    }
  };

  createBatch();
  batchTimer = setInterval(createBatch, 700);
}

document.addEventListener("DOMContentLoaded", init);
