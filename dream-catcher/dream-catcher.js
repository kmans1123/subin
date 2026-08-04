(() => {
  const CONFIG = {
    characterImages: {
      lightSleep: "assets/subin-light-sleep.png",
      deepSleep: "assets/subin-deep-sleep.png",
      grumpyAwake: "assets/subin-grumpy-awake.png",
      happyAwake: "assets/subin-happy-awake.png",
    },
    startProgress: 20,
    quietDreamGain: 0.55,
    nightmareCatchGain: 1.5,
    nightmareMissLoss: [5, 10],
    catcherMinSpeed: 500,
    catcherMaxSpeed: 820,
    catcherViewportSpeed: 1.35,
    spawnIntervalEarlyMs: [2200, 2900],
    spawnIntervalLateMs: [850, 1200],
    quietDreamIntervalMs: [3800, 5200],
    fallSpeedEarly: [58, 80],
    fallSpeedLate: [128, 168],
    maxObjects: 12,
    normalParticles: 10,
    reducedParticles: 3,
  };

  const SESSION_KEY = "playgroundUnlocked";
  const WINDOW_MARKER = "playgroundUnlocked";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const frameInterval = coarsePointer ? 1000 / 36 : 1000 / 58;
  const $ = (id) => document.getElementById(id);

  const dom = {
    intro: $("intro"),
    game: $("game"),
    world: $("world"),
    playfield: $("playfield"),
    fallingLayer: $("fallingLayer"),
    effectLayer: $("effectLayer"),
    skyStars: $("skyStars"),
    princess: $("princess"),
    princessImage: $("princessImage"),
    sleepZ: $("sleepZ"),
    dreamCatcher: $("dreamCatcher"),
    catcherRing: document.querySelector(".catcher-ring"),
    stageEmoji: $("stageEmoji"),
    stageName: $("stageName"),
    progressText: $("progressText"),
    progressFill: $("progressFill"),
    message: $("message"),
    gameHint: $("gameHint"),
    startButton: $("startButton"),
    pauseButton: $("pauseButton"),
    helpButton: $("helpButton"),
    restartButton: $("restartButton"),
    leftButton: $("leftButton"),
    rightButton: $("rightButton"),
    pauseOverlay: $("pauseOverlay"),
    resumeButton: $("resumeButton"),
    pauseRestartButton: $("pauseRestartButton"),
    helpOverlay: $("helpOverlay"),
    closeHelpButton: $("closeHelpButton"),
    gameOverOverlay: $("gameOverOverlay"),
    grumpyImage: $("grumpyImage"),
    retryButton: $("retryButton"),
    clearScreen: $("clearScreen"),
    happyImage: $("happyImage"),
    playAgainButton: $("playAgainButton"),
  };

  const stages = [
    { min: 0, emoji: "😴", name: "잠든 지 얼마 안 됨", image: "lightSleep" },
    { min: 25, emoji: "🌙", name: "편안한 잠", image: "lightSleep" },
    { min: 50, emoji: "⭐", name: "깊은 잠", image: "deepSleep" },
    { min: 75, emoji: "✨", name: "꿀잠", image: "deepSleep" },
  ];
  const nightmareTypes = ["cloud", "bat", "ghost", "spider", "monster"];
  const objectEmoji = {
    cloud: "🥕",
    bat: "🦇",
    ghost: "👻",
    spider: "🕷️",
    monster: "👾",
  };
  const catchMessages = [
    "악몽을 깨끗하게 걸러냈어요",
    "드림캐처가 악몽을 별빛으로 바꿨어요",
    "수빈이의 꿈을 안전하게 지켰어요",
  ];

  const state = {
    running: false,
    paused: false,
    finished: false,
    progress: CONFIG.startProgress,
    stageIndex: 0,
    catcherX: 0,
    direction: 0,
    lastFrameAt: 0,
    lastRenderedAt: 0,
    nextSpawnAt: 0,
    nextQuietDreamAt: 0,
    loopToken: 0,
    messageTimer: 0,
    hintTimer: 0,
    deepGlowTimer: 0,
    characterMode: "",
    objects: new Set(),
    quietDreams: new Set(),
    keys: new Set(),
  };

  function hasAccess() {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "true") return true;
    } catch (_) {}
    return window.name === WINDOW_MARKER;
  }

  if (!hasAccess()) {
    const next = encodeURIComponent("dream-catcher/dream-catcher.html");
    window.location.replace(`../index.html?next=${next}`);
    return;
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function lerp(start, end, amount) {
    return start + (end - start) * amount;
  }

  function difficultyRatio() {
    return Math.min(1, Math.max(0, (state.progress - CONFIG.startProgress) / (100 - CONFIG.startProgress)));
  }

  function initializeStars() {
    if (dom.skyStars.childElementCount) return;
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 27; index += 1) {
      const star = document.createElement("i");
      star.textContent = index % 4 ? "·" : "✦";
      star.style.left = `${randomBetween(3, 97)}%`;
      star.style.top = `${randomBetween(8, 70)}%`;
      star.style.fontSize = `${randomBetween(12, 23)}px`;
      star.style.animationDelay = `${randomBetween(-2, 0)}s`;
      fragment.appendChild(star);
    }
    dom.skyStars.appendChild(fragment);
  }

  function showMessage(text, duration = 1550) {
    dom.message.textContent = text;
    dom.message.classList.add("is-show");
    window.clearTimeout(state.messageTimer);
    state.messageTimer = window.setTimeout(() => dom.message.classList.remove("is-show"), duration);
  }

  function currentStageIndex() {
    let index = 0;
    stages.forEach((stage, stageIndex) => {
      if (state.progress >= stage.min) index = stageIndex;
    });
    return index;
  }

  function setCharacter(mode) {
    if (state.characterMode === mode) return;
    state.characterMode = mode;
    dom.princess.classList.add("is-changing");
    window.setTimeout(() => {
      dom.princessImage.src = CONFIG.characterImages[mode];
      dom.princess.classList.remove("is-changing");
    }, reduceMotion ? 0 : 210);
  }

  function updateDeepGlow(enabled) {
    const currentlyDeep = dom.princess.classList.contains("is-deep");
    if (enabled === currentlyDeep) return;
    window.clearTimeout(state.deepGlowTimer);
    dom.princess.classList.toggle("is-deep", enabled);
    dom.princess.classList.remove("is-deep-settled");
    if (enabled) {
      state.deepGlowTimer = window.setTimeout(() => {
        if (dom.princess.classList.contains("is-deep")) {
          dom.princess.classList.add("is-deep-settled");
        }
      }, 1550);
    }
  }

  function updateProgress(previousProgress = state.progress) {
    const nextStage = currentStageIndex();
    const stageChanged = nextStage !== state.stageIndex;
    state.stageIndex = nextStage;
    const stage = stages[nextStage];
    const rounded = Math.round(state.progress);
    dom.world.style.setProperty("--progress", (state.progress / 100).toFixed(3));
    dom.stageEmoji.textContent = stage.emoji;
    dom.stageName.textContent = stage.name;
    dom.progressText.textContent = `${rounded}%`;
    dom.progressFill.style.width = `${rounded}%`;
    dom.progressFill.parentElement.setAttribute("aria-valuenow", String(rounded));
    dom.princess.classList.toggle("is-restless", state.progress < 25);
    updateDeepGlow(stage.image === "deepSleep");
    setCharacter(stage.image);

    if (stageChanged && state.progress > previousProgress) {
      showMessage(`${stage.emoji} ${stage.name} 단계가 되었어요!`, 2200);
      createSparkles(dom.playfield.clientWidth / 2, dom.playfield.clientHeight * .32, "#ffd887", 18);
    }
  }

  function changeProgress(amount, message = "") {
    if (!state.running || state.finished) return;
    const previous = state.progress;
    const previousStage = state.stageIndex;
    state.progress = Math.min(100, Math.max(0, state.progress + amount));
    updateProgress(previous);
    if (message && state.stageIndex === previousStage) showMessage(message);
    if (state.progress >= 100) showClear();
    else if (state.progress <= 0) showGameOver();
  }

  function resizeGame() {
    const width = dom.playfield.clientWidth;
    if (!state.catcherX) state.catcherX = width / 2;
    state.catcherX = Math.min(Math.max(58, state.catcherX), width - 58);
    renderCatcher();
  }

  function renderCatcher() {
    const center = dom.playfield.clientWidth / 2;
    dom.dreamCatcher.style.transform = `translate3d(${state.catcherX - center}px, 0, 0) scale(var(--catcher-scale))`;
  }

  function createObject() {
    const kind = "nightmare";
    const type = randomItem(nightmareTypes);
    const element = document.createElement("div");
    element.className = `falling-object ${kind} ${kind}--${type}`;
    element.setAttribute("aria-hidden", "true");
    const emoji = document.createElement("span");
    emoji.className = "object-emoji";
    emoji.textContent = objectEmoji[type];
    const kindLabel = document.createElement("small");
    kindLabel.className = "object-kind";
    kindLabel.textContent = "악몽";
    element.append(emoji, kindLabel);
    const width = dom.playfield.clientWidth;
    const difficulty = difficultyRatio();
    const minSpeed = lerp(CONFIG.fallSpeedEarly[0], CONFIG.fallSpeedLate[0], difficulty);
    const maxSpeed = lerp(CONFIG.fallSpeedEarly[1], CONFIG.fallSpeedLate[1], difficulty);
    const object = {
      element,
      kind,
      type,
      x: randomBetween(28, width - 28),
      y: -32,
      speed: randomBetween(minSpeed, maxSpeed),
      drift: randomBetween(-12, 12),
      phase: Math.random() * Math.PI * 2,
      caught: false,
    };
    element.style.transform = `translate3d(${object.x}px, ${object.y}px, 0)`;
    dom.fallingLayer.appendChild(element);
    state.objects.add(object);
  }

  function removeObject(object, removeElement = true) {
    if (!state.objects.has(object)) return;
    state.objects.delete(object);
    if (removeElement) object.element.remove();
  }

  function clearObjects() {
    state.objects.forEach((object) => object.element.remove());
    state.objects.clear();
  }

  function clearQuietDreams() {
    state.quietDreams.forEach(({ element, animation }) => {
      animation?.cancel();
      element.remove();
    });
    state.quietDreams.clear();
  }

  function catcherCenter() {
    const field = dom.playfield.getBoundingClientRect();
    const catcher = dom.catcherRing.getBoundingClientRect();
    return {
      x: catcher.left - field.left + catcher.width / 2,
      y: catcher.top - field.top + catcher.height / 2,
    };
  }

  function princessCenter() {
    const field = dom.playfield.getBoundingClientRect();
    const princess = dom.princess.getBoundingClientRect();
    return {
      x: princess.left - field.left + princess.width / 2,
      y: princess.top - field.top + princess.height / 2,
    };
  }

  function createSparkles(x, y, color = "#ffe694", requestedCount = CONFIG.normalParticles) {
    const count = reduceMotion ? CONFIG.reducedParticles : requestedCount;
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < count; index += 1) {
      const spark = document.createElement("i");
      spark.className = "spark";
      spark.textContent = index % 2 ? "✦" : "·";
      spark.style.left = `${x}px`;
      spark.style.top = `${y}px`;
      spark.style.color = color;
      spark.style.setProperty("--sx", `${randomBetween(-58, 58)}px`);
      spark.style.setProperty("--sy", `${randomBetween(-66, 20)}px`);
      spark.addEventListener("animationend", () => spark.remove(), { once: true });
      fragment.appendChild(spark);
    }
    dom.effectLayer.appendChild(fragment);
  }

  function flashCatcher(className) {
    dom.dreamCatcher.classList.remove(className);
    void dom.dreamCatcher.offsetWidth;
    dom.dreamCatcher.classList.add(className);
    window.setTimeout(() => dom.dreamCatcher.classList.remove(className), 460);
  }

  function catchNightmare(object) {
    removeObject(object);
    const catcher = catcherCenter();
    createSparkles(catcher.x, catcher.y, "#ffe58e", 13);
    flashCatcher("is-catching");
    changeProgress(CONFIG.nightmareCatchGain, randomItem(catchMessages));
  }

  function missNightmare(object) {
    removeObject(object);
    dom.world.classList.remove("screen-hit");
    void dom.world.offsetWidth;
    dom.world.classList.add("screen-hit");
    window.setTimeout(() => dom.world.classList.remove("screen-hit"), 470);
    const loss = lerp(CONFIG.nightmareMissLoss[0], CONFIG.nightmareMissLoss[1], difficultyRatio());
    changeProgress(-loss, "악몽이 스며들어 수빈이가 뒤척여요");
  }

  function spawnIfNeeded(now) {
    if (now < state.nextSpawnAt || state.objects.size >= CONFIG.maxObjects) return;
    createObject();
    const difficulty = difficultyRatio();
    const minInterval = lerp(CONFIG.spawnIntervalEarlyMs[0], CONFIG.spawnIntervalLateMs[0], difficulty);
    const maxInterval = lerp(CONFIG.spawnIntervalEarlyMs[1], CONFIG.spawnIntervalLateMs[1], difficulty);
    state.nextSpawnAt = now + randomBetween(minInterval, maxInterval);
  }

  function sendQuietGoodDream(now) {
    if (now < state.nextQuietDreamAt) return;
    const target = princessCenter();
    const dream = document.createElement("i");
    const emoji = document.createElement("span");
    const label = document.createElement("small");
    emoji.className = "quiet-dream-emoji";
    label.className = "quiet-dream-label";
    emoji.textContent = randomItem(["🦋", "🌸", "⭐", "✨", "🌙"]);
    label.textContent = "좋은 꿈";
    dream.append(emoji, label);
    const fromLeft = Math.random() < .5;
    dream.className = `quiet-dream ${fromLeft ? "from-left" : "from-right"}`;
    const startX = fromLeft ? 24 : dom.playfield.clientWidth - 24;
    const startYMax = Math.max(165, Math.min(dom.playfield.clientHeight - 230, target.y + 115));
    const startY = randomBetween(135, startYMax);
    dream.style.left = `${startX}px`;
    dream.style.top = `${startY}px`;
    dom.effectLayer.appendChild(dream);
    const finish = () => {
      state.quietDreams.delete(record);
      dream.remove();
      if (!state.running || state.finished) return;
      const absorb = document.createElement("i");
      absorb.className = "dream-absorb";
      absorb.style.left = `${target.x}px`;
      absorb.style.top = `${target.y}px`;
      absorb.addEventListener("animationend", () => absorb.remove(), { once: true });
      dom.effectLayer.appendChild(absorb);
      createSparkles(target.x, target.y, "#f6b3d0", 5);
      changeProgress(CONFIG.quietDreamGain);
    };
    const record = { element: dream, animation: null };
    state.quietDreams.add(record);
    if (reduceMotion || !dream.animate) {
      finish();
    } else {
      record.animation = dream.animate([
        { transform: "translate3d(0,0,0) scale(.78)", opacity: 0 },
        { transform: `translate3d(${(target.x - startX) * .38}px, ${(target.y - startY) * .22 - 42}px, 0) scale(1.06)`, opacity: .98, offset: .42 },
        { transform: `translate3d(${(target.x - startX) * .72}px, ${(target.y - startY) * .65 - 24}px, 0) scale(.76)`, opacity: .8, offset: .72 },
        { transform: `translate3d(${target.x - startX}px, ${target.y - startY}px, 0) scale(.18)`, opacity: .12 },
      ], { duration: 2650, easing: "cubic-bezier(.28,.7,.34,1)", fill: "forwards" });
      record.animation.onfinish = finish;
    }
    state.nextQuietDreamAt = now + randomBetween(...CONFIG.quietDreamIntervalMs);
  }

  function updateObjects(delta, now) {
    const width = dom.playfield.clientWidth;
    const height = dom.playfield.clientHeight;
    const catcher = catcherCenter();
    state.objects.forEach((object) => {
      object.y += object.speed * delta / 1000;
      object.x += object.drift * delta / 1000 + Math.sin(now / 520 + object.phase) * .13;
      if (object.x < 24 || object.x > width - 24) object.drift *= -1;
      object.x = Math.min(Math.max(24, object.x), width - 24);
      object.element.style.transform = `translate3d(${object.x}px, ${object.y}px, 0)`;

      if (Math.hypot(object.x - catcher.x, object.y - catcher.y) < 54) {
        catchNightmare(object);
        return;
      }
      if (object.y > height - 54) {
        missNightmare(object);
      }
    });
  }

  function updateCatcher(delta) {
    let direction = state.direction;
    if (state.keys.has("ArrowLeft") || state.keys.has("a") || state.keys.has("A")) direction -= 1;
    if (state.keys.has("ArrowRight") || state.keys.has("d") || state.keys.has("D")) direction += 1;
    direction = Math.max(-1, Math.min(1, direction));
    const responsiveSpeed = Math.min(
      CONFIG.catcherMaxSpeed,
      Math.max(CONFIG.catcherMinSpeed, dom.playfield.clientWidth * CONFIG.catcherViewportSpeed),
    );
    state.catcherX += direction * responsiveSpeed * delta / 1000;
    state.catcherX = Math.min(Math.max(58, state.catcherX), dom.playfield.clientWidth - 58);
    renderCatcher();
  }

  function frame(now, token) {
    if (token !== state.loopToken || !state.running || state.paused || state.finished) return;
    requestAnimationFrame((time) => frame(time, token));
    if (!state.lastFrameAt) state.lastFrameAt = now;
    if (now - state.lastRenderedAt < frameInterval) return;
    const delta = Math.min(55, now - state.lastFrameAt);
    state.lastFrameAt = now;
    state.lastRenderedAt = now;
    updateCatcher(delta);
    updateObjects(delta, now);
    spawnIfNeeded(now);
    sendQuietGoodDream(now);
  }

  function startLoop() {
    state.loopToken += 1;
    state.lastFrameAt = performance.now();
    state.lastRenderedAt = 0;
    requestAnimationFrame((time) => frame(time, state.loopToken));
  }

  function resetGame() {
    state.loopToken += 1;
    state.running = true;
    state.paused = false;
    state.finished = false;
    state.progress = CONFIG.startProgress;
    state.stageIndex = 0;
    state.catcherX = 0;
    state.direction = 0;
    state.nextSpawnAt = performance.now() + 900;
    state.nextQuietDreamAt = performance.now() + 3600;
    state.characterMode = "";
    window.clearTimeout(state.deepGlowTimer);
    state.keys.clear();
    clearObjects();
    clearQuietDreams();
    dom.intro.hidden = true;
    dom.clearScreen.hidden = true;
    dom.pauseOverlay.hidden = true;
    dom.helpOverlay.hidden = true;
    dom.gameOverOverlay.hidden = true;
    dom.game.hidden = false;
    dom.sleepZ.hidden = false;
    dom.gameHint.classList.remove("is-hidden");
    dom.princess.classList.remove("has-error", "is-changing", "is-restless", "is-deep", "is-deep-settled");
    resizeGame();
    updateProgress();
    showMessage("떨어지는 악몽만 드림캐처로 받아주세요", 2300);
    window.clearTimeout(state.hintTimer);
    state.hintTimer = window.setTimeout(() => dom.gameHint.classList.add("is-hidden"), 7000);
    startLoop();
  }

  function pauseGame() {
    if (!state.running || state.paused || state.finished) return;
    state.paused = true;
    state.direction = 0;
    state.loopToken += 1;
    state.quietDreams.forEach(({ animation }) => animation?.pause());
    dom.pauseOverlay.hidden = false;
  }

  function resumeGame() {
    dom.pauseOverlay.hidden = true;
    dom.helpOverlay.hidden = true;
    state.paused = false;
    state.quietDreams.forEach(({ animation }) => animation?.play());
    startLoop();
  }

  function showHelp() {
    if (!state.running || state.finished) return;
    state.paused = true;
    state.direction = 0;
    state.loopToken += 1;
    state.quietDreams.forEach(({ animation }) => animation?.pause());
    dom.helpOverlay.hidden = false;
  }

  function showGameOver() {
    if (state.finished) return;
    state.finished = true;
    state.running = false;
    state.loopToken += 1;
    clearObjects();
    clearQuietDreams();
    dom.sleepZ.hidden = true;
    dom.grumpyImage.src = CONFIG.characterImages.grumpyAwake;
    dom.gameOverOverlay.hidden = false;
  }

  function showClear() {
    if (state.finished) return;
    state.finished = true;
    state.running = false;
    state.loopToken += 1;
    clearObjects();
    clearQuietDreams();
    createSparkles(dom.playfield.clientWidth / 2, dom.playfield.clientHeight * .38, "#ffe08a", 24);
    showMessage("좋은 꿈이 가득 차 아침이 밝아와요 ☀️", 1800);
    window.setTimeout(() => {
      dom.game.hidden = true;
      dom.happyImage.src = CONFIG.characterImages.happyAwake;
      dom.clearScreen.hidden = false;
    }, reduceMotion ? 100 : 1700);
  }

  function stopDirection() {
    state.direction = 0;
    dom.leftButton.classList.remove("is-pressed");
    dom.rightButton.classList.remove("is-pressed");
  }

  function imageFailed(event) {
    if (event.currentTarget === dom.princessImage) dom.princess.classList.add("has-error");
  }

  initializeStars();
  dom.princessImage.src = CONFIG.characterImages.lightSleep;
  dom.grumpyImage.src = CONFIG.characterImages.grumpyAwake;
  dom.happyImage.src = CONFIG.characterImages.happyAwake;
  [dom.princessImage, dom.grumpyImage, dom.happyImage].forEach((image) => image.addEventListener("error", imageFailed));

  dom.startButton.addEventListener("click", resetGame);
  dom.restartButton.addEventListener("click", resetGame);
  dom.pauseRestartButton.addEventListener("click", resetGame);
  dom.retryButton.addEventListener("click", resetGame);
  dom.playAgainButton.addEventListener("click", resetGame);
  dom.pauseButton.addEventListener("click", pauseGame);
  dom.resumeButton.addEventListener("click", resumeGame);
  dom.helpButton.addEventListener("click", showHelp);
  dom.closeHelpButton.addEventListener("click", resumeGame);

  dom.leftButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    state.direction = -1;
    dom.leftButton.classList.add("is-pressed");
    dom.leftButton.setPointerCapture?.(event.pointerId);
  });
  dom.rightButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    state.direction = 1;
    dom.rightButton.classList.add("is-pressed");
    dom.rightButton.setPointerCapture?.(event.pointerId);
  });
  [dom.leftButton, dom.rightButton].forEach((button) => {
    button.addEventListener("pointerup", stopDirection);
    button.addEventListener("pointercancel", stopDirection);
    button.addEventListener("lostpointercapture", stopDirection);
  });

  window.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "a", "A", "d", "D"].includes(event.key)) return;
    event.preventDefault();
    state.keys.add(event.key);
  });
  window.addEventListener("keyup", (event) => state.keys.delete(event.key));
  window.addEventListener("blur", stopDirection);
  window.addEventListener("resize", resizeGame, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && state.running && !state.paused) pauseGame();
  });
})();
