(() => {
  const SESSION_KEY = "playgroundUnlocked";
  const WINDOW_MARKER = "playgroundUnlocked";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const FRAME_DELAY = coarsePointer ? 29 : 0;
  const $ = (id) => document.getElementById(id);

  const intro = $("intro");
  const game = $("game");
  const startButton = $("startButton");
  const audio = $("carrotAudio");
  const audioStatus = $("audioStatus");
  const world = $("world");
  const carrotLayer = $("carrotLayer");
  const bunnyWrap = $("bunnyWrap");
  const bunny = $("bunny");
  const speech = $("speech");
  const scoreEl = $("score");
  const comboEl = $("combo");
  const stageName = $("stageName");
  const comboPop = $("comboPop");
  const gameMessage = $("gameMessage");
  const rainbow = $("rainbow");
  const fireflies = $("fireflies");
  const songEnded = $("songEnded");
  const songEndedToggle = $("songEndedToggle");
  const toast = $("toast");
  const progressFill = $("progressFill");
  const remainingTime = $("remainingTime");
  const playControl = $("playControl");
  const pauseControl = $("pauseControl");
  const volumeControl = $("volumeControl");
  const volumeIcon = $("volumeIcon");
  const volumePanel = $("volumePanel");
  const volumeMute = $("volumeMute");
  const volumeSlider = $("volumeSlider");
  const volumeValue = $("volumeValue");
  const restartControl = $("restartControl");
  const rainButton = $("rainButton");
  const listenAgain = $("listenAgain");
  const resetEnded = $("resetEnded");
  const rainEnded = $("rainEnded");

  const phrases = ["냠!", "맛있다!", "또 줘!", "최고!", "당근 좋아!", "우물우물", "행복해♡"];
  const petPhrases = ["헤헤~", "좋아!", "또 쓰다듬어!", "기분 좋아♡"];
  const recoveryPhrases = ["오! 이건 특별 간식이다!", "맛이 달라!", "기분이 다시 좋아졌어!", "최고야!"];
  const carrotPoints = { normal: 1, heart: 3, golden: 5, rainbow: 10, worm: -3 };
  const stages = [
    { score: 0, name: "아기 토끼", className: "stage-baby" },
    { score: 20, name: "리본 토끼", className: "stage-ribbon" },
    { score: 40, name: "밀짚모자 토끼", className: "stage-hat" },
    { score: 60, name: "선글라스 토끼", className: "stage-glasses" },
    { score: 80, name: "망토 토끼", className: "stage-cape" },
    { score: 100, name: "당근왕", className: "stage-king" },
  ];

  const activeCarrots = new Set();
  const piledCarrots = new Set();
  const reachedMilestones = new Set();
  const MAX_ACTIVE_CARROTS = 18;
  const MAX_RAIN_CARROTS = 18;
  const MAX_PILED_CARROTS = 18;
  let started = false;
  let score = 0;
  let eatenCount = 0;
  let combo = 0;
  let lastFeedAt = 0;
  let lastFrameAt = 0;
  let nextSpawnAt = 0;
  let rainUntil = 0;
  let carrotRainRunning = false;
  let rainEndTimer = null;
  let stageIndex = 0;
  let speechTimer = null;
  let toastTimer = null;
  let bunnyTimer = null;
  let animationFrame = null;
  let frameTimer = null;
  let lastUiUpdateAt = 0;
  let volumeLevel = 0.5;
  let previousVolumeLevel = 0.5;
  let timePeriod = -1;
  let normalStreak = 0;
  let wormStreak = 0;
  let bored = false;
  let sickUntil = 0;
  let sickTimer = null;
  let petCount = 0;
  let lastPetAt = 0;
  let petTimer = null;

  function hasAccess() {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "true") return true;
    } catch (_) {}
    return window.name === WINDOW_MARKER;
  }

  if (!hasAccess()) {
    const next = encodeURIComponent("carrot-song/carrot-song.html");
    window.location.replace(`../index.html?next=${next}`);
    return;
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-show"), 1700);
  }

  function safePlay() {
    const result = audio.play();
    if (result?.catch) {
      result.catch(() => {
        audioStatus.textContent = "당근송 음원을 불러오지 못했어요.";
        showToast("음원 없이도 게임은 즐길 수 있어요 🥕");
      });
    }
  }

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
    const minutes = Math.floor(seconds / 60);
    const rest = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function updateAudioProgress() {
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    const current = Math.min(audio.currentTime || 0, duration);
    progressFill.style.width = duration ? `${(current / duration) * 100}%` : "0%";
    remainingTime.textContent = `남은 시간 ${formatTime(duration ? duration - current : NaN)}`;
  }

  function startGame() {
    if (started) return;
    started = true;
    intro.hidden = true;
    game.setAttribute("aria-hidden", "false");
    bunny.classList.add("is-happy");
    setTimeout(() => bunny.classList.remove("is-happy"), 600);
    safePlay();
    lastFrameAt = performance.now();
    updateTimePeriod(true);
    nextSpawnAt = lastFrameAt + 250;
    queueGameFrame();
  }

  function chooseType() {
    const roll = Math.random();
    const wormChance = 0.1;
    const rainbowChance = 0.03 + (combo >= 30 ? 0.05 : 0);
    const goldenChance = 0.06 + (combo >= 10 ? 0.05 : 0);
    const heartChance = 0.1 + (combo >= 50 ? 0.1 : 0);
    if (roll < wormChance) return "worm";
    if (roll < wormChance + rainbowChance) return "rainbow";
    if (roll < wormChance + rainbowChance + goldenChance) return "golden";
    if (roll < wormChance + rainbowChance + goldenChance + heartChance) return "heart";
    return "normal";
  }

  function getDifficultyBoost() {
    if (eatenCount < 10) return 0;
    return Math.min(360, (Math.floor((eatenCount - 10) / 5) + 1) * 18);
  }

  function createCarrot(options = {}) {
    const activeLimit = rainUntil > performance.now() ? MAX_RAIN_CARROTS : MAX_ACTIVE_CARROTS;
    if (activeCarrots.size >= activeLimit) return;
    const rect = world.getBoundingClientRect();
    const element = document.createElement("div");
    const type = options.type || chooseType();
    element.className = `falling-carrot${type === "normal" ? "" : ` is-${type}`}`;
    const typeLabel = { normal: "", heart: "하트 ", golden: "황금 ", rainbow: "무지개 ", worm: "벌레 먹은 " }[type];
    element.setAttribute("aria-label", `${typeLabel}당근 먹이기`);
    if (type === "worm") element.innerHTML = '<span class="carrot-worm" aria-hidden="true">🐛</span>';

    const difficultyBoost = getDifficultyBoost();
    const carrot = {
      element,
      type,
      x: options.x ?? 10 + Math.random() * Math.max(20, rect.width - 70),
      y: options.y ?? -90 - Math.random() * 80,
      speed: options.speed ?? 65 + Math.random() * 40 + difficultyBoost,
      rotation: Math.random() * 30 - 15,
      fed: false,
    };

    bindCarrot(carrot);
    activeCarrots.add(carrot);
    carrotLayer.appendChild(element);
    paintCarrot(carrot);
  }

  function bindCarrot(carrot) {
    const { element } = carrot;
    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      feedCarrot(carrot);
    });
  }

  function paintCarrot(carrot) {
    const transform = `translate3d(${carrot.x}px,${carrot.y}px,0) rotate(${carrot.rotation}deg)`;
    carrot.element.style.transform = transform;
    carrot.element.style.setProperty("--last-transform", transform);
  }

  function removeCarrot(carrot) {
    activeCarrots.delete(carrot);
    piledCarrots.delete(carrot);
    clearTimeout(carrot.pileFadeTimer);
    clearTimeout(carrot.pileRemoveTimer);
    carrot.element.remove();
  }

  function pileCarrot(carrot) {
    activeCarrots.delete(carrot);
    carrot.fed = true;
    carrot.x = Math.max(2, Math.min(world.clientWidth - 48, carrot.x));
    carrot.y = world.clientHeight - 76;
    carrot.element.classList.add("is-piled");
    carrot.element.removeAttribute("aria-label");
    carrot.element.setAttribute("aria-hidden", "true");
    paintCarrot(carrot);
    piledCarrots.add(carrot);

    if (piledCarrots.size > MAX_PILED_CARROTS) {
      const oldest = piledCarrots.values().next().value;
      if (oldest) removeCarrot(oldest);
    }

    carrot.pileFadeTimer = setTimeout(() => {
      carrot.element.classList.add("is-pile-fading");
    }, 4000);
    carrot.pileRemoveTimer = setTimeout(() => removeCarrot(carrot), 4800);
  }

  function feedCarrot(carrot) {
    if (carrot.fed) return;
    const now = performance.now();
    if (now < sickUntil) {
      showToast("토끼가 잠깐 쉬고 있어요 🍀");
      return;
    }

    carrot.fed = true;
    carrot.element.classList.add("is-fed");
    activeCarrots.delete(carrot);
    const previousScore = score;
    const points = carrotPoints[carrot.type];
    eatenCount += 1;
    score = Math.max(0, score + points);
    scoreEl.textContent = String(score);
    showScoreChange(points);

    if (carrot.type === "worm") {
      wormStreak += 1;
      normalStreak = 0;
      resetCombo(true);
      reactToWorm();
      if (wormStreak >= 3) startStomachache();
    } else {
      wormStreak = 0;
      combo = now - lastFeedAt < 2400 ? combo + 1 : 1;
      lastFeedAt = now;
      comboEl.textContent = String(combo);
      const tasteMessage = handleTaste(carrot.type);
      const reducedReaction = bored && carrot.type === "normal";
      if (!reducedReaction) reactBunny();
      showSpeech(reducedReaction ? "다른 당근도 먹고 싶어..." : tasteMessage || phrases[Math.floor(Math.random() * phrases.length)]);
      const particleAmount = reducedReaction ? 3 : now < rainUntil ? 3 : 12;
      burstAtBunny(carrot.type === "golden" || carrot.type === "rainbow", particleAmount);
      checkCombo();
    }

    updateStage();
    checkEasterEggs(previousScore);
    if (navigator.vibrate) navigator.vibrate(18);
    setTimeout(() => carrot.element.remove(), 340);
  }

  function handleTaste(type) {
    if (type === "normal") {
      normalStreak += 1;
      if (normalStreak >= 15 && !bored) {
        bored = true;
        bunny.classList.add("is-bored");
      }
      return "";
    }

    normalStreak = 0;
    if (bored && ["heart", "golden", "rainbow"].includes(type)) {
      bored = false;
      bunny.classList.remove("is-bored");
      return recoveryPhrases[Math.floor(Math.random() * recoveryPhrases.length)];
    }
    return "";
  }

  function reactToWorm() {
    bunny.classList.remove("is-happy");
    bunny.classList.add("is-worm-sick");
    showSpeech("웩!");
    burstAtBunny(false, 5);
    setTimeout(() => {
      if (performance.now() >= sickUntil) bunny.classList.remove("is-worm-sick");
    }, 1300);
  }

  function startStomachache() {
    wormStreak = 0;
    sickUntil = performance.now() + 3000;
    bunny.classList.add("is-worm-sick", "is-stomachache");
    showSpeech("잠깐 쉬었다 갈게...");
    gameMessage.textContent = "토끼가 배탈이 났어요. 3초만 쉬어요 🍀";
    clearTimeout(sickTimer);
    sickTimer = setTimeout(() => {
      sickUntil = 0;
      bunny.classList.remove("is-worm-sick", "is-stomachache");
      showSpeech("괜찮아! 다시 먹을래!");
      gameMessage.textContent = "당근을 눌러 먹여주세요! 🥕";
    }, 3000);
  }

  function showScoreChange(points) {
    const rect = bunny.getBoundingClientRect();
    const element = document.createElement("span");
    element.className = `score-float ${points > 0 ? "is-good" : "is-bad"}`;
    element.textContent = points > 0 ? `+${points}` : String(points);
    element.style.left = `${rect.left + rect.width / 2}px`;
    element.style.top = `${rect.top + 35}px`;
    document.body.appendChild(element);
    element.addEventListener("animationend", () => element.remove());
  }

  function resetCombo(showMiss = false) {
    const hadCombo = combo > 0;
    combo = 0;
    comboEl.textContent = "0";
    if (showMiss && hadCombo) {
      const element = document.createElement("span");
      element.className = "miss-pop";
      element.textContent = "콤보 끝!";
      document.body.appendChild(element);
      element.addEventListener("animationend", () => element.remove());
    }
  }

  function reactBunny() {
    bunny.classList.remove("is-happy");
    void bunny.offsetWidth;
    bunny.classList.add("is-happy");
    clearTimeout(bunnyTimer);
    bunnyTimer = setTimeout(() => bunny.classList.remove("is-happy"), 620);
  }

  function showSpeech(message) {
    speech.textContent = message;
    speech.classList.remove("is-show");
    void speech.offsetWidth;
    speech.classList.add("is-show");
    clearTimeout(speechTimer);
    speechTimer = setTimeout(() => speech.classList.remove("is-show"), 1500);
  }

  function burstAtBunny(golden = false, amount = 12) {
    if (reduceMotion) return;
    if (coarsePointer) amount = Math.min(amount, 8);
    const rect = bunny.getBoundingClientRect();
    const icons = golden ? ["⭐", "✨", "💛"] : ["♡", "✨", "💕", "⭐"];
    for (let i = 0; i < amount; i++) {
      const particle = document.createElement("span");
      const angle = (Math.PI * 2 * i) / amount;
      const distance = 45 + Math.random() * 70;
      particle.className = "particle";
      particle.textContent = icons[i % icons.length];
      particle.style.left = `${rect.left + rect.width / 2}px`;
      particle.style.top = `${rect.top + rect.height / 2}px`;
      particle.style.setProperty("--px", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--py", `${Math.sin(angle) * distance}px`);
      particle.style.setProperty("--pr", `${Math.random() * 240 - 120}deg`);
      document.body.appendChild(particle);
      particle.addEventListener("animationend", () => particle.remove());
    }
  }

  function checkCombo() {
    if (combo < 5 || combo % 5 !== 0) return;
    comboPop.textContent = `${combo} Combo!`;
    comboPop.classList.remove("is-show");
    void comboPop.offsetWidth;
    comboPop.classList.add("is-show");
    if (combo >= 10) {
      world.classList.remove("combo-glow");
      void world.offsetWidth;
      world.classList.add("combo-glow");
    }
  }

  function updateStage() {
    let nextIndex = 0;
    stages.forEach((stage, index) => {
      if (score >= stage.score) nextIndex = index;
    });
    if (nextIndex === stageIndex) return;
    stageIndex = nextIndex;
    const stage = stages[stageIndex];
    bunnyWrap.className = `bunny-wrap ${stage.className} is-transforming`;
    stageName.textContent = stage.name;
    burstAtBunny(true, 28);
    showToast(`✨ ${stage.name}로 변신! ✨`);
    setTimeout(() => bunnyWrap.classList.remove("is-transforming"), 950);
  }

  function checkEasterEggs(previousScore) {
    showHundredPointMessage(previousScore);

    if (!reachedMilestones.has(100) && previousScore < 100 && score >= 100) {
      reachedMilestones.add(100);
      showSpeech("오늘의 당근왕!");
      gameMessage.textContent = "👑 오늘의 당근왕!";
    }
    if (!reachedMilestones.has(300) && previousScore < 300 && score >= 300) {
      reachedMilestones.add(300);
      gameMessage.textContent = "거대한 황금당근이 나타났어요! ✨";
      createCarrot({ type: "golden", x: world.clientWidth / 2 - 23, y: 95, speed: 28 });
      const giant = [...activeCarrots].at(-1);
      if (giant) giant.element.style.scale = "2.2";
      bunnyWrap.classList.add("is-running");
      setTimeout(() => bunnyWrap.classList.remove("is-running"), 3300);
    }
    if (!reachedMilestones.has(500) && previousScore < 500 && score >= 500) {
      reachedMilestones.add(500);
      rainbow.classList.add("is-show");
      gameMessage.textContent = "🌈 전설의 당근 마스터!";
      showSpeech("전설의 당근 마스터!");
      burstAtBunny(true, 40);
    }
  }

  function showHundredPointMessage(previousScore) {
    if (score <= previousScore) return;
    const firstMilestone = (Math.floor(previousScore / 100) + 1) * 100;
    for (let milestone = firstMilestone; milestone <= score; milestone += 100) {
      showMilestoneMessage("수빈이 메롱😝");
    }
  }

  function buildFireflies() {
    if (reduceMotion) return;
    const fragment = document.createDocumentFragment();
    const fireflyCount = coarsePointer ? 6 : 12;
    for (let i = 0; i < fireflyCount; i++) {
      const fly = document.createElement("span");
      fly.className = "firefly";
      fly.style.left = `${5 + Math.random() * 90}%`;
      fly.style.top = `${8 + Math.random() * 80}%`;
      fly.style.setProperty("--fly-x", `${Math.random() * 60 - 30}px`);
      fly.style.setProperty("--fly-y", `${Math.random() * 50 - 25}px`);
      fly.style.setProperty("--fly-time", `${2.5 + Math.random() * 3}s`);
      fly.style.animationDelay = `${-Math.random() * 4}s`;
      fragment.appendChild(fly);
    }
    fireflies.appendChild(fragment);
  }

  function updateTimePeriod(force = false) {
    const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
    const progress = duration ? Math.min(0.9999, audio.currentTime / duration) : 0;
    const nextPeriod = Math.min(3, Math.floor(progress * 4));
    if (!force && nextPeriod === timePeriod) return;
    timePeriod = nextPeriod;
    world.classList.remove("time-day", "time-sunset", "time-night");
    document.body.classList.remove("time-day", "time-sunset", "time-night");
    const className = ["", "time-day", "time-sunset", "time-night"][timePeriod];
    if (className) {
      world.classList.add(className);
      document.body.classList.add(className);
    }
    if (!force) showToast(["🌅 포근한 아침이에요", "☀️ 신나는 낮이에요", "🌇 예쁜 노을이 졌어요", "🌙 반딧불이 찾아왔어요"][timePeriod]);
  }

  function petBunny() {
    if (!started || performance.now() < sickUntil) return;
    const now = performance.now();
    petCount = now - lastPetAt < 1800 ? petCount + 1 : 1;
    lastPetAt = now;
    bunny.classList.remove("is-happy", "is-petted");
    bunnyWrap.classList.remove("is-petted-glow");
    void bunnyWrap.offsetWidth;
    bunny.classList.add("is-petted");
    bunnyWrap.classList.add("is-petted-glow");
    showSpeech(petPhrases[Math.floor(Math.random() * petPhrases.length)]);
    burstAtBunny(false, 9);
    clearTimeout(petTimer);
    petTimer = setTimeout(() => {
      bunny.classList.remove("is-petted");
      bunnyWrap.classList.remove("is-petted-glow");
    }, 820);
    if (petCount >= 5) {
      petCount = 0;
      showToast("🥕 토끼가 당신을 정말 좋아합니다!");
      showSpeech("정말 좋아해!");
      burstAtBunny(false, 24);
    }
  }

  function showMilestoneMessage(message) {
    const element = document.createElement("div");
    element.className = "milestone-message";
    element.textContent = message;
    document.body.appendChild(element);
    element.addEventListener("animationend", () => element.remove());
  }

  function queueGameFrame() {
    if (!started || document.hidden || animationFrame || frameTimer) return;
    if (FRAME_DELAY === 0) {
      animationFrame = requestAnimationFrame(gameLoop);
      return;
    }
    frameTimer = setTimeout(() => {
      frameTimer = null;
      animationFrame = requestAnimationFrame(gameLoop);
    }, FRAME_DELAY);
  }

  function gameLoop(now) {
    animationFrame = null;
    if (!started || document.hidden) return;
    const delta = Math.min(0.035, (now - lastFrameAt) / 1000 || 0);
    lastFrameAt = now;
    const raining = now < rainUntil;
    const progressedCount = Math.max(0, eatenCount - 10);
    const spawnGap = raining ? 420 : Math.max(300, 1000 - progressedCount * 12);
    if (now - lastUiUpdateAt >= 250) {
      lastUiUpdateAt = now;
      updateAudioProgress();
      updateTimePeriod();
    }

    if (now >= nextSpawnAt) {
      const rainBoost = getDifficultyBoost();
      createCarrot({ speed: raining ? 135 + Math.random() * 95 + rainBoost : undefined });
      nextSpawnAt = now + spawnGap;
    }

    activeCarrots.forEach((carrot) => {
      if (carrot.fed) return;
      carrot.y += carrot.speed * delta;
      carrot.rotation += delta * 16;
      paintCarrot(carrot);
      if (carrot.y > world.clientHeight - 76) {
        pileCarrot(carrot);
        if (carrot.type === "worm") {
          return;
        }
        if (now - lastFeedAt >= 2400) {
          resetCombo(false);
        }
      }
    });
    queueGameFrame();
  }

  function startCarrotRain() {
    if (!started) return;
    if (carrotRainRunning) {
      showToast("당근 비가 아직 내리는 중이에요! 🥕");
      return;
    }

    carrotRainRunning = true;
    world.classList.add("is-carrot-raining");
    const now = performance.now();
    rainUntil = now + 10000;
    nextSpawnAt = now;
    clearTimeout(rainEndTimer);
    rainEndTimer = setTimeout(() => {
      carrotRainRunning = false;
      world.classList.remove("is-carrot-raining");
      rainEndTimer = null;
    }, 10100);
    showToast("10초 동안 당근 비가 쏟아져요! 🥕");
  }

  function resetGame() {
    activeCarrots.forEach((carrot) => carrot.element.remove());
    activeCarrots.clear();
    piledCarrots.forEach(removeCarrot);
    piledCarrots.clear();
    reachedMilestones.clear();
    score = 0;
    eatenCount = 0;
    combo = 0;
    stageIndex = 0;
    normalStreak = 0;
    wormStreak = 0;
    bored = false;
    sickUntil = 0;
    petCount = 0;
    timePeriod = -1;
    clearTimeout(sickTimer);
    clearTimeout(petTimer);
    clearTimeout(rainEndTimer);
    carrotRainRunning = false;
    world.classList.remove("is-carrot-raining");
    rainEndTimer = null;
    scoreEl.textContent = "0";
    comboEl.textContent = "0";
    stageName.textContent = stages[0].name;
    bunnyWrap.className = "bunny-wrap stage-baby";
    bunny.classList.remove("is-happy", "is-petted", "is-bored", "is-worm-sick", "is-stomachache");
    audio.currentTime = 0;
    world.classList.remove("time-day", "time-sunset", "time-night");
    updateTimePeriod(true);
    rainbow.classList.remove("is-show");
    gameMessage.textContent = "당근을 눌러 먹여주세요! 🥕";
    songEnded.hidden = true;
    rainUntil = 0;
    safePlay();
    showToast("처음부터 다시 시작해요!");
  }

  function updateVolumeUI() {
    const muted = volumeLevel === 0;
    volumeIcon.textContent = muted ? "🔇" : volumeLevel < 0.5 ? "🔉" : "🔊";
    volumeValue.textContent = `${Math.round(volumeLevel * 100)}%`;
    volumeSlider.value = String(volumeLevel);
    volumeMute.setAttribute("aria-pressed", String(muted));
    volumeMute.setAttribute("aria-label", muted ? "음소거 해제" : "음소거");
    volumeMute.textContent = muted ? "🔊 음소거 해제" : "🔇 음소거";
  }

  function setVolume(value) {
    const level = Math.min(1, Math.max(0, Number(value)));
    if (level > 0) previousVolumeLevel = level;
    volumeLevel = level;
    audio.volume = level;
    audio.muted = level === 0;
    updateVolumeUI();
  }

  function toggleMute() {
    setVolume(volumeLevel === 0 ? previousVolumeLevel || 0.5 : 0);
  }

  function setVolumePanel(open) {
    volumePanel.classList.toggle("is-open", open);
    volumePanel.setAttribute("aria-hidden", String(!open));
    volumeControl.setAttribute("aria-expanded", String(open));
  }

  function setSongEndedMinimized(minimized) {
    songEnded.classList.toggle("is-minimized", minimized);
    songEndedToggle.setAttribute("aria-expanded", String(!minimized));
    songEndedToggle.textContent = minimized ? "🥕 안내 보기" : "− 접기";
  }

  function listenToSongAgain() {
    songEnded.hidden = true;
    audio.pause();
    document.body.classList.add("is-instant-time-change");
    world.classList.add("is-instant-time-change");
    audio.currentTime = 0;
    updateAudioProgress();
    updateTimePeriod(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.body.classList.remove("is-instant-time-change");
        world.classList.remove("is-instant-time-change");
        safePlay();
      });
    });
  }

  startButton.addEventListener("click", startGame);
  bunny.addEventListener("pointerdown", petBunny);
  bunny.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      petBunny();
    }
  });
  playControl.addEventListener("click", safePlay);
  pauseControl.addEventListener("click", () => audio.pause());
  volumeControl.addEventListener("click", () => setVolumePanel(!volumePanel.classList.contains("is-open")));
  volumeSlider.addEventListener("input", () => setVolume(volumeSlider.value));
  volumeMute.addEventListener("click", toggleMute);
  restartControl.addEventListener("click", resetGame);
  rainButton.addEventListener("click", startCarrotRain);
  listenAgain.addEventListener("click", listenToSongAgain);
  resetEnded.addEventListener("click", resetGame);
  rainEnded.addEventListener("click", startCarrotRain);
  songEndedToggle.addEventListener("click", () => {
    setSongEndedMinimized(!songEnded.classList.contains("is-minimized"));
  });
  audio.addEventListener("ended", () => {
    setSongEndedMinimized(false);
    songEnded.hidden = false;
    gameMessage.textContent = "노래는 끝났지만 토끼는 아직 배고파요 🥕";
  });
  audio.addEventListener("error", () => {
    audioStatus.textContent = "당근송 음원을 불러오지 못했어요.";
  });

  document.addEventListener("pointerdown", (event) => {
    if (!volumePanel.classList.contains("is-open")) return;
    if (volumePanel.contains(event.target) || volumeControl.contains(event.target)) return;
    setVolumePanel(false);
  });

  let lastTouchEndAt = 0;
  document.addEventListener("touchend", (event) => {
    const now = Date.now();
    if (now - lastTouchEndAt < 320) event.preventDefault();
    lastTouchEndAt = now;
  }, { passive: false });
  document.addEventListener("gesturestart", (event) => event.preventDefault(), { passive: false });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(animationFrame);
      clearTimeout(frameTimer);
      animationFrame = null;
      frameTimer = null;
      return;
    }
    if (started) {
      lastFrameAt = performance.now();
      queueGameFrame();
    }
  });

  setVolume(0.5);
  updateAudioProgress();
  buildFireflies();

  window.addEventListener("beforeunload", () => {
    cancelAnimationFrame(animationFrame);
    clearTimeout(frameTimer);
  });
})();
