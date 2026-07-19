(() => {
  // 비밀번호와 현재 탭의 접속 상태
  const PASSWORD = "0714";
  const SESSION_KEY = "playgroundUnlocked";
  const WINDOW_MARKER = "playgroundUnlocked";
  const gate = document.getElementById("passwordGate");
  const main = document.getElementById("mainContent");
  const form = document.getElementById("passwordForm");
  const input = document.getElementById("passwordInput");
  const error = document.getElementById("passwordError");
  const deleteButton = document.getElementById("passwordDelete");
  const lockAgainButton = document.getElementById("lockAgain");
  const carrotRainButton = document.getElementById("mainCarrotRain");
  const mainToast = document.getElementById("mainToast");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let carrotRainRunning = false;
  let carrotBatchTimer = null;
  let carrotFinishTimer = null;
  let mainToastTimer = null;

  function showMainToast(message) {
    mainToast.textContent = message;
    mainToast.classList.add("is-show");
    clearTimeout(mainToastTimer);
    mainToastTimer = setTimeout(() => mainToast.classList.remove("is-show"), 1800);
  }

  function stopCarrotRain() {
    if (carrotBatchTimer) clearInterval(carrotBatchTimer);
    if (carrotFinishTimer) clearTimeout(carrotFinishTimer);
    carrotBatchTimer = null;
    carrotFinishTimer = null;
    carrotRainRunning = false;
    document.querySelectorAll(".carrot-rain").forEach((carrot) => carrot.remove());
  }

  // 당근 200개를 소량씩 생성해 모바일 부하를 줄입니다.
  function spawnCarrotRain() {
    if (reduceMotion) {
      showMainToast("🥕 당근이 왔어요! 🥕");
      return;
    }
    if (carrotRainRunning) {
      showMainToast("당근이 아직 쏟아지는 중이에요! 🥕");
      return;
    }

    carrotRainRunning = true;
    const totalCarrots = 200;
    const batchSize = 6;
    let created = 0;

    const createBatch = () => {
      const fragment = document.createDocumentFragment();
      const count = Math.min(batchSize, totalCarrots - created);

      for (let i = 0; i < count; i++) {
        const carrot = document.createElement("span");
        carrot.className = "carrot-rain";
        carrot.textContent = "🥕";
        carrot.style.left = Math.random() * 100 + "vw";
        carrot.style.fontSize = 22 + Math.random() * 24 + "px";
        carrot.style.setProperty("--carrot-x", (Math.random() * 120 - 60).toFixed(0) + "px");
        carrot.style.setProperty("--carrot-r", (Math.random() * 160 - 80).toFixed(0) + "deg");
        carrot.style.setProperty("--pile-height", (Math.random() * 75).toFixed(0) + "px");
        carrot.style.animationDelay = (Math.random() * 0.65).toFixed(2) + "s";
        carrot.style.animationDuration = (6.2 + Math.random()).toFixed(2) + "s";
        fragment.appendChild(carrot);
        carrot.addEventListener("animationend", () => carrot.remove());
      }

      document.body.appendChild(fragment);
      created += count;
      if (created >= totalCarrots) {
        clearInterval(carrotBatchTimer);
        carrotBatchTimer = null;
        carrotFinishTimer = setTimeout(() => {
          carrotRainRunning = false;
          carrotFinishTimer = null;
        }, 8000);
      }
    };

    createBatch();
    carrotBatchTimer = setInterval(createBatch, 700);
  }

  function isPageReload() {
    const navigationEntry = performance.getEntriesByType?.("navigation")[0];
    if (navigationEntry) return navigationEntry.type === "reload";

    return performance.navigation?.type === 1;
  }

  function clearAccess() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (_) {}
    if (window.name === WINDOW_MARKER) window.name = "";
  }

  function hasAccess() {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "true") return true;
    } catch (_) {}
    return window.name === WINDOW_MARKER;
  }

  function saveAccess() {
    try {
      sessionStorage.setItem(SESSION_KEY, "true");
    } catch (_) {}
    window.name = WINDOW_MARKER;
  }

  function getNextPage() {
    let next = new URLSearchParams(window.location.search).get("next");

    if (next === "숫자송/number-song.html" || next === "숫자송/") {
      next = "number-song/number-song.html";
    }
    if (!next || next.includes("..") || next.includes(":") || next.startsWith("/")) {
      return null;
    }
    return `./${next}`;
  }

  function enterPlayground() {
    const nextPage = getNextPage();
    if (nextPage) {
      window.location.replace(nextPage);
      return;
    }
    gate.hidden = true;
    main.hidden = false;
  }

  function showWrongPassword() {
    error.textContent = "비밀번호가 맞지 않아요. 다시 입력해 주세요.";
    input.value = "";
    form.classList.remove("is-wrong");
    void form.offsetWidth;
    form.classList.add("is-wrong");
  }

  input.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 4);
    error.textContent = "";
  });

  document.querySelectorAll("[data-number]").forEach((button) => {
    button.addEventListener("click", () => {
      if (input.value.length >= 4) return;
      input.value += button.dataset.number;
      error.textContent = "";
    });
  });

  deleteButton.addEventListener("click", () => {
    input.value = input.value.slice(0, -1);
    error.textContent = "";
  });

  lockAgainButton.addEventListener("click", () => {
    stopCarrotRain();
    clearAccess();
    input.value = "";
    error.textContent = "";
    main.hidden = true;
    gate.hidden = false;
  });

  carrotRainButton.addEventListener("click", spawnCarrotRain);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.value !== PASSWORD) {
      showWrongPassword();
      return;
    }
    saveAccess();
    enterPlayground();
  });

  // 메인 새로고침 때만 잠금 상태를 초기화합니다.
  if (isPageReload()) clearAccess();

  if (hasAccess()) {
    enterPlayground();
  }
})();
