(() => {
  const SESSION_KEY = "playgroundUnlocked";
  const WINDOW_MARKER = "playgroundUnlocked";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function hasAccess() {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "true") return true;
    } catch (_) {}
    return window.name === WINDOW_MARKER;
  }

  if (!hasAccess()) {
    window.location.replace("../index.html?next=bomb-squad/bomb-squad.html");
    return;
  }

  const COLORS = [
    { id: "red", name: "빨강", value: "#f06473" },
    { id: "orange", name: "주황", value: "#f3a451" },
    { id: "yellow", name: "노랑", value: "#f1d34f", text: "#65571c" },
    { id: "green", name: "초록", value: "#68bf80" },
    { id: "blue", name: "파랑", value: "#5b9ee5" },
    { id: "indigo", name: "남색", value: "#5d68b8" },
    { id: "purple", name: "보라", value: "#a56dcc" },
  ];

  const DIFFICULTIES = {
    easy: { count: 3, seconds: 75, label: "쉬움" },
    normal: { count: 5, seconds: 90, label: "보통" },
    hard: { count: 7, seconds: 105, label: "어려움" },
    nightmare: { count: 7, seconds: 45, label: "악몽" },
  };

  const SUCCESS_MESSAGES = [
    "❤️ 사랑해",
    "💖 보고싶어",
    "🥰 오늘도 최고야",
    "💕 항상 고마워",
    "💝 좋은 하루 보내",
  ];

  const ORDINALS = ["첫 번째", "두 번째", "세 번째", "네 번째", "다섯 번째", "여섯 번째", "일곱 번째"];

  const dom = {
    intro: document.getElementById("intro"),
    backgroundHearts: document.getElementById("backgroundHearts"),
    game: document.getElementById("game"),
    gameShell: document.getElementById("gameShell"),
    startButton: document.getElementById("startButton"),
    titleButton: document.getElementById("titleButton"),
    timerCard: document.getElementById("timerCard"),
    timerText: document.getElementById("timerText"),
    timerFill: document.getElementById("timerFill"),
    armedIndicator: document.getElementById("armedIndicator"),
    bombState: document.getElementById("bombState"),
    difficultyLabel: document.getElementById("difficultyLabel"),
    cutProgress: document.getElementById("cutProgress"),
    hintCount: document.getElementById("hintCount"),
    hintList: document.getElementById("hintList"),
    debugAnswer: document.getElementById("debugAnswer"),
    debugAnswerText: document.getElementById("debugAnswerText"),
    wireList: document.getElementById("wireList"),
    statusMessage: document.getElementById("statusMessage"),
    newGameButton: document.getElementById("newGameButton"),
    difficultyButton: document.getElementById("difficultyButton"),
    resultOverlay: document.getElementById("resultOverlay"),
    resultCard: document.getElementById("resultCard"),
    resultVisual: document.getElementById("resultVisual"),
    resultEyebrow: document.getElementById("resultEyebrow"),
    resultTitle: document.getElementById("resultTitle"),
    resultMessage: document.getElementById("resultMessage"),
    retryButton: document.getElementById("retryButton"),
    changeDifficultyButton: document.getElementById("changeDifficultyButton"),
    toast: document.getElementById("toast"),
    heartLayer: document.getElementById("heartLayer"),
  };

  const state = {
    difficulty: "easy",
    answer: [],
    hints: [],
    cutIndex: 0,
    remainingMs: 0,
    totalMs: 0,
    lastTick: 0,
    frameId: 0,
    running: false,
    debugMode: false,
    titleTapCount: 0,
    titleTapTimer: 0,
    toastTimer: 0,
    resultTimer: 0,
  };

  function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function buildBackgroundHearts() {
    if (reduceMotion) return;
    const fragment = document.createDocumentFragment();
    const icons = ["♡", "♥", "✦"];
    for (let index = 0; index < 9; index += 1) {
      const heart = document.createElement("span");
      const duration = 18 + Math.random() * 12;
      heart.className = "background-heart";
      heart.textContent = icons[index % icons.length];
      heart.style.left = `${Math.random() * 96}%`;
      heart.style.setProperty("--float-duration", `${duration.toFixed(2)}s`);
      heart.style.animationDelay = `${(-Math.random() * duration).toFixed(2)}s`;
      heart.style.setProperty("--float-size", `${14 + Math.random() * 14}px`);
      heart.style.setProperty("--float-color", randomItem(["#f29dbb", "#d0c2f2", "#f6c9d7", "#f5d889"]));
      fragment.appendChild(heart);
    }
    dom.backgroundHearts.appendChild(fragment);
  }

  function withParticle(word, consonantParticle, vowelParticle) {
    const lastCharacter = word.charCodeAt(word.length - 1);
    const hasFinalConsonant = lastCharacter >= 0xac00
      && lastCharacter <= 0xd7a3
      && (lastCharacter - 0xac00) % 28 !== 0;
    return `${word}${hasFinalConsonant ? consonantParticle : vowelParticle}`;
  }

  function topic(word) {
    return withParticle(word, "은", "는");
  }

  function together(word) {
    return withParticle(word, "과", "와");
  }

  function permutations(items) {
    if (items.length <= 1) return [[...items]];
    const result = [];
    items.forEach((item, index) => {
      const rest = [...items.slice(0, index), ...items.slice(index + 1)];
      permutations(rest).forEach((permutation) => result.push([item, ...permutation]));
    });
    return result;
  }

  function createHintPool(answer) {
    const hints = [];
    const lastIndex = answer.length - 1;

    answer.forEach((color, index) => {
      const text = index === 0
        ? `${topic(color.name)} 첫 번째입니다.`
        : index === lastIndex
          ? `${topic(color.name)} 마지막입니다.`
          : `${topic(color.name)} ${ORDINALS[index]}입니다.`;
      hints.push({
        type: "position",
        text,
        test: (candidate) => candidate[index].id === color.id,
      });
    });

    for (let first = 0; first < answer.length; first += 1) {
      for (let second = first + 1; second < answer.length; second += 1) {
        const before = answer[first];
        const after = answer[second];
        hints.push({
          type: "before",
          text: `${topic(before.name)} ${after.name}보다 먼저입니다.`,
          test: (candidate) => candidate.findIndex((color) => color.id === before.id) < candidate.findIndex((color) => color.id === after.id),
        });
      }
    }

    for (let index = 0; index < lastIndex; index += 1) {
      const first = answer[index];
      const second = answer[index + 1];
      hints.push({
        type: "adjacent",
        text: `${together(first.name)} ${topic(second.name)} 연속입니다.`,
        test: (candidate) => Math.abs(
          candidate.findIndex((color) => color.id === first.id)
          - candidate.findIndex((color) => color.id === second.id)
        ) === 1,
      });
      hints.push({
        type: "immediate",
        text: `${first.name} 바로 다음은 ${second.name}입니다.`,
        test: (candidate) => candidate.findIndex((color) => color.id === second.id)
          === candidate.findIndex((color) => color.id === first.id) + 1,
      });
    }

    return hints;
  }

  function buildUniqueHints(answer) {
    let candidates = permutations(answer);
    let available = shuffle(createHintPool(answer));
    const selected = [];
    const preferredTypes = shuffle(["position", "adjacent", "before"]);

    preferredTypes.forEach((type) => {
      if (candidates.length === 1) return;
      const choices = available
        .filter((hint) => hint.type === type)
        .map((hint) => ({ hint, matches: candidates.filter(hint.test) }))
        .filter(({ matches }) => matches.length > 0 && matches.length < candidates.length);
      if (!choices.length) return;
      choices.sort((a, b) => a.matches.length - b.matches.length);
      const choice = randomItem(choices.slice(0, Math.min(3, choices.length)));
      selected.push(choice.hint);
      candidates = choice.matches;
      available = available.filter((hint) => hint !== choice.hint);
    });

    while (candidates.length > 1) {
      const choices = available
        .map((hint) => ({ hint, matches: candidates.filter(hint.test) }))
        .filter(({ matches }) => matches.length > 0 && matches.length < candidates.length)
        .sort((a, b) => a.matches.length - b.matches.length);
      if (!choices.length) break;
      const bestCount = choices[0].matches.length;
      const bestChoices = choices.filter(({ matches }) => matches.length <= Math.max(bestCount, Math.ceil(bestCount * 1.4)));
      const choice = randomItem(bestChoices.slice(0, 5));
      selected.push(choice.hint);
      candidates = choice.matches;
      available = available.filter((hint) => hint !== choice.hint);
    }

    if (candidates.length !== 1) {
      return answer.map((color, index) => ({
        type: "position",
        text: `${topic(color.name)} ${ORDINALS[index]}입니다.`,
        test: (candidate) => candidate[index].id === color.id,
      }));
    }

    return shuffle(selected);
  }

  function selectedDifficulty() {
    return document.querySelector('input[name="difficulty"]:checked')?.value || "easy";
  }

  function showToast(message) {
    dom.toast.textContent = message;
    dom.toast.classList.add("is-show");
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => dom.toast.classList.remove("is-show"), 1800);
  }

  function updateTimerDisplay() {
    const seconds = Math.max(0, Math.ceil(state.remainingMs / 1000));
    const minutesText = String(Math.floor(seconds / 60)).padStart(2, "0");
    const secondsText = String(seconds % 60).padStart(2, "0");
    const progress = state.totalMs ? state.remainingMs / state.totalMs : 0;
    dom.timerText.textContent = `${minutesText}:${secondsText}`;
    document.documentElement.style.setProperty("--time-progress", Math.max(0, progress).toFixed(4));
    dom.timerCard.classList.toggle("is-urgent", seconds <= 10);
  }

  function updateBombState(mode = "armed") {
    const labels = { armed: "대기", cutting: "해체 중", safe: "안전", alert: "주의" };
    dom.bombState.textContent = labels[mode] || labels.armed;
    dom.armedIndicator.classList.toggle("is-safe", mode === "safe");
    dom.armedIndicator.classList.toggle("is-alert", mode === "alert");
  }

  function stopTimer() {
    state.running = false;
    if (state.frameId) cancelAnimationFrame(state.frameId);
    state.frameId = 0;
    state.lastTick = 0;
  }

  function timerLoop(now) {
    if (!state.running) return;
    if (!state.lastTick) state.lastTick = now;
    const elapsed = Math.min(now - state.lastTick, 250);
    state.lastTick = now;
    state.remainingMs -= elapsed;
    updateTimerDisplay();

    if (state.remainingMs <= 0) {
      state.remainingMs = 0;
      updateTimerDisplay();
      finishGame(false, "timeout");
      return;
    }
    state.frameId = requestAnimationFrame(timerLoop);
  }

  function renderHints() {
    const fragment = document.createDocumentFragment();
    state.hints.forEach((hint) => {
      const item = document.createElement("li");
      item.textContent = hint.text;
      fragment.appendChild(item);
    });
    dom.hintList.replaceChildren(fragment);
    dom.hintCount.textContent = `${state.hints.length}개 힌트`;
  }

  function renderWires(wires) {
    const fragment = document.createDocumentFragment();
    wires.forEach((color) => {
      const button = document.createElement("button");
      const line = document.createElement("span");
      const name = document.createElement("span");
      button.type = "button";
      button.className = "wire-button";
      button.dataset.color = color.id;
      button.setAttribute("aria-label", `${color.name} 전선 자르기`);
      button.style.setProperty("--wire-color", color.value);
      button.style.setProperty("--wire-text", color.text || "#fff");
      line.className = "wire-line";
      name.className = "wire-name";
      name.textContent = color.name;
      button.append(line, name);
      button.addEventListener("click", () => cutWire(button, color));
      fragment.appendChild(button);
    });
    dom.wireList.replaceChildren(fragment);
  }

  function updateDebugAnswer() {
    dom.debugAnswer.hidden = !state.debugMode;
    dom.titleButton.classList.toggle("is-debug", state.debugMode);
    dom.debugAnswerText.textContent = state.answer.map((color) => color.name).join(" → ");
  }

  function cutWire(button, color) {
    if (!state.running || button.disabled) return;
    const expected = state.answer[state.cutIndex];
    if (color.id !== expected.id) {
      button.classList.add("is-wrong");
      dom.statusMessage.textContent = `${color.name} 전선은 지금 순서가 아니에요!`;
      updateBombState("alert");
      finishGame(false, "wrong");
      return;
    }

    button.disabled = true;
    button.classList.add("is-cut");
    state.cutIndex += 1;
    updateBombState(state.cutIndex === state.answer.length ? "safe" : "cutting");
    dom.cutProgress.textContent = `${state.cutIndex} / ${state.answer.length}`;
    if (state.cutIndex === state.answer.length) {
      dom.statusMessage.textContent = "모든 전선을 안전하게 잘랐어요!";
      stopTimer();
      state.resultTimer = window.setTimeout(() => finishGame(true), 420);
      return;
    }
    dom.statusMessage.textContent = `${ORDINALS[state.cutIndex - 1]} 성공! 다음 전선을 찾아주세요.`;
  }

  function createHearts() {
    dom.heartLayer.replaceChildren();
    if (reduceMotion) return;
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 24; index += 1) {
      const heart = document.createElement("span");
      heart.className = "flying-heart";
      heart.textContent = index % 3 === 0 ? "✦" : "♥";
      heart.style.left = `${Math.random() * 100}%`;
      heart.style.setProperty("--heart-x", `${Math.round(Math.random() * 100 - 50)}px`);
      heart.style.setProperty("--heart-r", `${Math.round(Math.random() * 180 - 90)}deg`);
      heart.style.setProperty("--heart-size", `${16 + Math.random() * 22}px`);
      heart.style.setProperty("--heart-duration", `${2.2 + Math.random() * 1.7}s`);
      heart.style.setProperty("--heart-color", randomItem(["#f178a6", "#f8aecc", "#b8a4ee", "#ffd66f"]));
      heart.style.animationDelay = `${Math.random() * .65}s`;
      fragment.appendChild(heart);
    }
    dom.heartLayer.appendChild(fragment);
    window.setTimeout(() => dom.heartLayer.replaceChildren(), 4500);
  }

  function finishGame(success, reason = "") {
    if (!state.running && !success && !state.frameId) return;
    stopTimer();
    window.clearTimeout(state.resultTimer);
    dom.wireList.querySelectorAll("button").forEach((button) => { button.disabled = true; });
    dom.resultCard.classList.toggle("is-success", success);
    dom.resultCard.classList.toggle("is-failure", !success);

    if (success) {
      updateBombState("safe");
      dom.resultVisual.innerHTML = `<div class="gift-visual"><span class="gift-glow"></span><span class="gift-spark gift-spark--one">✦</span><span class="gift-spark gift-spark--two">✦</span><span class="gift-note-pop">💌</span><span class="gift-box"></span><span class="gift-lid"></span></div>`;
      dom.resultEyebrow.textContent = "해체 성공!";
      dom.resultTitle.textContent = "선물 상자가 열렸어요!";
      dom.resultMessage.textContent = randomItem(SUCCESS_MESSAGES);
      createHearts();
    } else {
      updateBombState("alert");
      dom.resultVisual.textContent = reason === "timeout" ? "⏰" : "🎁";
      dom.resultEyebrow.textContent = reason === "timeout" ? "시간 초과" : "해체 실패";
      dom.resultTitle.textContent = "선물이 망가졌어요...";
      dom.resultMessage.textContent = reason === "timeout"
        ? "조금만 더 빨리 힌트를 풀어봐요."
        : "순서를 다시 추리해볼까요?";
    }
    dom.resultOverlay.hidden = false;
  }

  function startGame(useSelectedDifficulty = false) {
    stopTimer();
    window.clearTimeout(state.resultTimer);
    dom.heartLayer.replaceChildren();
    // 디버그 정답은 현재 문제에서만 보이고, 새 문제에서는 다시 숨깁니다.
    state.debugMode = false;
    if (useSelectedDifficulty) state.difficulty = selectedDifficulty();
    const config = DIFFICULTIES[state.difficulty];
    const selectedColors = shuffle(COLORS).slice(0, config.count);
    state.answer = shuffle(selectedColors);
    state.hints = buildUniqueHints(state.answer);
    state.cutIndex = 0;
    state.totalMs = config.seconds * 1000;
    state.remainingMs = state.totalMs;
    state.lastTick = 0;

    dom.intro.hidden = true;
    dom.resultOverlay.hidden = true;
    dom.game.hidden = false;
    dom.gameShell.scrollTop = 0;
    dom.difficultyLabel.textContent = `${config.label} · 전선 ${config.count}개`;
    dom.cutProgress.textContent = `0 / ${config.count}`;
    dom.statusMessage.textContent = "첫 번째 전선은 무엇일까요?";
    updateBombState("armed");
    renderHints();
    renderWires(shuffle(selectedColors));
    updateDebugAnswer();
    updateTimerDisplay();
    state.running = true;
    state.frameId = requestAnimationFrame(timerLoop);
  }

  function showDifficulty() {
    stopTimer();
    window.clearTimeout(state.resultTimer);
    state.debugMode = false;
    updateDebugAnswer();
    dom.resultOverlay.hidden = true;
    dom.game.hidden = true;
    dom.intro.hidden = false;
  }

  function handleTitleTap() {
    if (state.debugMode) {
      showToast("정답 순서가 모니터 화면 아래에 표시 중이에요.");
      return;
    }
    state.titleTapCount += 1;
    window.clearTimeout(state.titleTapTimer);
    state.titleTapTimer = window.setTimeout(() => { state.titleTapCount = 0; }, 1200);
    if (state.titleTapCount < 3) return;
    state.titleTapCount = 0;
    state.debugMode = true;
    updateDebugAnswer();
    showToast("🛠️ 디버그 모드가 켜졌어요!");
  }

  dom.startButton.addEventListener("click", () => startGame(true));
  dom.newGameButton.addEventListener("click", () => startGame(false));
  dom.difficultyButton.addEventListener("click", showDifficulty);
  dom.retryButton.addEventListener("click", () => startGame(false));
  dom.changeDifficultyButton.addEventListener("click", showDifficulty);
  dom.titleButton.addEventListener("click", handleTitleTap);

  buildBackgroundHearts();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && state.running) state.lastTick = performance.now();
  });

  window.addEventListener("pagehide", () => {
    stopTimer();
    window.clearTimeout(state.toastTimer);
    window.clearTimeout(state.titleTapTimer);
    window.clearTimeout(state.resultTimer);
  });
})();
