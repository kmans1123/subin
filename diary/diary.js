(() => {
  const SESSION_KEY = "playgroundUnlocked";
  const WINDOW_MARKER = "playgroundUnlocked";
  const RELATIONSHIP_START_DATE = "2026-07-14";
  const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
  const SUPABASE_IMAGE_BUCKET = "diary-images";
  const MAX_IMAGE_COUNT = 12;
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
  const SIGNED_URL_TTL = 60 * 60 * 24;
  const ENTRIES_PER_PAGE = 5;

  // Publishable key는 브라우저에 포함할 수 있습니다.
  // service_role 또는 sb_secret 키는 여기에 넣지 마세요.
  const SUPABASE_URL = "https://krvilvyzrzgolqqdffse.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_qVVwLLwRqAUkdd02gkyYnQ_6DQcDG_I";
  const SUPABASE_TABLE = "diary_entries";

  const supabaseClient = window.supabase?.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
  );

  function hasAccess() {
    try {
      if (sessionStorage.getItem(SESSION_KEY) === "true") return true;
    } catch (_) {}
    return window.name === WINDOW_MARKER;
  }

  if (!hasAccess()) {
    const next = encodeURIComponent("diary/diary.html");
    window.location.replace(`../index.html?next=${next}`);
    return;
  }

  const listView = document.getElementById("listView");
  const composeView = document.getElementById("composeView");
  const readerView = document.getElementById("readerView");
  const entryList = document.getElementById("entryList");
  const entryCount = document.getElementById("entryCount");
  const listMessage = document.getElementById("listMessage");
  const entryPagination = document.getElementById("entryPagination");
  const previousPageButton = document.getElementById("previousPageButton");
  const nextPageButton = document.getElementById("nextPageButton");
  const pageIndicator = document.getElementById("pageIndicator");
  const usageButton = document.getElementById("usageButton");
  const usagePanel = document.getElementById("usagePanel");
  const closeUsageButton = document.getElementById("closeUsageButton");
  const usageStatus = document.getElementById("usageStatus");
  const imageUsageValue = document.getElementById("imageUsageValue");
  const imageCountValue = document.getElementById("imageCountValue");
  const diaryUsageValue = document.getElementById("diaryUsageValue");
  const ddayLabel = document.getElementById("ddayLabel");
  const newEntryButton = document.getElementById("newEntryButton");
  const refreshButton = document.getElementById("refreshButton");
  const backButton = document.getElementById("backButton");
  const letter = document.getElementById("letter");
  const entryDate = document.getElementById("entryDate");
  const entryTitle = document.getElementById("entryTitle");
  const entryContent = document.getElementById("entryContent");
  const entryError = document.getElementById("entryError");
  const letterActions = document.getElementById("letterActions");
  const editEntryButton = document.getElementById("editEntryButton");
  const deleteEntryButton = document.getElementById("deleteEntryButton");
  const entryForm = document.getElementById("entryForm");
  const entryDateInput = document.getElementById("entryDateInput");
  const entryTitleInput = document.getElementById("entryTitleInput");
  const entryBodyInput = document.getElementById("entryBodyInput");
  const entryImagesInput = document.getElementById("entryImagesInput");
  const selectedImages = document.getElementById("selectedImages");
  const selectedImagesList = document.getElementById("selectedImagesList");
  const writeMessage = document.getElementById("writeMessage");
  const cancelWriteButton = document.getElementById("cancelWriteButton");
  const saveEntryButton = document.getElementById("saveEntryButton");
  const letterImages = document.getElementById("letterImages");
  const letterImageList = document.getElementById("letterImageList");
  const imageLightbox = document.getElementById("imageLightbox");
  const closeLightboxButton = document.getElementById("closeLightboxButton");
  const lightboxStage = document.querySelector(".image-lightbox__stage");
  const lightboxImage = document.getElementById("lightboxImage");
  const zoomOutButton = document.getElementById("zoomOutButton");
  const zoomInButton = document.getElementById("zoomInButton");
  const zoomResetButton = document.getElementById("zoomResetButton");
  const zoomValue = document.getElementById("zoomValue");

  const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
  });

  let entries = [];
  let editingEntry = null;
  let existingImages = [];
  let pendingImageFiles = [];
  let previewUrls = [];
  let lightboxTrigger = null;
  let lightboxScale = 1;
  let lightboxOffsetX = 0;
  let lightboxOffsetY = 0;
  let pinchStartDistance = null;
  let pinchStartScale = 1;
  let dragStartPoint = null;
  let dragStartOffset = null;
  let coverImageKey = null;
  let currentPage = 1;

  function updateDDay() {
    const startDate = parseDate(RELATIONSHIP_START_DATE)?.date;
    if (!startDate) return;

    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const dayCount = Math.floor((today.getTime() - startDate.getTime()) / DAY_IN_MILLISECONDS) + 1;
    const label = dayCount >= 1 ? `D+${dayCount}` : `D-${Math.abs(dayCount) + 1}`;
    const description = dayCount >= 1
      ? `만난 지 ${dayCount}일째`
      : `만나기까지 ${Math.abs(dayCount) + 1}일 전`;

    ddayLabel.textContent = label;
    ddayLabel.setAttribute("aria-label", description);
  }

  function parseDate(dateText) {
    if (typeof dateText !== "string") return null;

    const match = dateText.match(/^(\d{4})-(\d{2})-(\d{2})/u);
    if (!match) return null;

    const [, yearText, monthText, dayText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const date = new Date(year, month - 1, day, 12);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return {
      date,
      timestamp: date.getTime(),
      shortDate: `${yearText}.${monthText}.${dayText}`,
    };
  }

  function normalizeImages(value) {
    if (!Array.isArray(value)) return [];

    return value
      .map((image) => {
        const path = typeof image === "string" ? image : image?.path;
        if (typeof path !== "string" || !path.trim()) return null;

        return {
          path: path.trim(),
          name: typeof image?.name === "string" ? image.name : path.split("/").pop(),
          url: typeof image?.url === "string" ? image.url : "",
        };
      })
      .filter(Boolean);
  }

  function parseSupabaseEntry(row) {
    const parsedDate = parseDate(row?.entry_date);
    const title = typeof row?.title === "string" ? row.title.trim() : "";

    if (!parsedDate || !title || row?.id === undefined || row?.id === null) {
      return null;
    }

    return {
      ...parsedDate,
      id: `supabase:${row.id}`,
      dbId: row.id,
      title,
      body: typeof row.body === "string" ? row.body : "",
      images: normalizeImages(row.images),
      coverImage: typeof row.cover_image === "string" ? row.cover_image : "",
      coverUrl: "",
      source: "supabase",
    };
  }

  function sortEntries(entryList) {
    return entryList.sort(
      (a, b) => b.timestamp - a.timestamp || a.title.localeCompare(b.title, "ko"),
    );
  }

  async function attachImageUrls(entryList) {
    const paths = [
      ...new Set(entryList.flatMap((entry) => entry.images.map((image) => image.path))),
    ];
    if (!paths.length) return entryList;

    const { data, error } = await supabaseClient.storage
      .from(SUPABASE_IMAGE_BUCKET)
      .createSignedUrls(paths, SIGNED_URL_TTL);
    if (error) {
      console.warn("일기 이미지 주소 생성 실패", error);
      return entryList;
    }

    const urlMap = new Map(
      (Array.isArray(data) ? data : [])
        .filter((item) => item?.path && item?.signedUrl)
        .map((item) => [item.path, item.signedUrl]),
    );

    return entryList.map((entry) => ({
      ...entry,
      images: entry.images.map((image) => ({
        ...image,
        url: urlMap.get(image.path) ?? image.url,
      })),
      coverUrl: urlMap.get(entry.coverImage) ?? entry.images.find(
        (image) => image.path === entry.coverImage,
      )?.url ?? urlMap.get(entry.images[0]?.path) ?? entry.images[0]?.url ?? "",
    }));
  }

  function getPendingImageKey(file) {
    return `pending:${file.name}:${file.lastModified}:${file.size}`;
  }

  function renderEntryImages(entry) {
    const images = entry.images.filter((image) => image.url);
    letterImageList.replaceChildren(
      ...images.map((image, index) => {
        const button = document.createElement("button");
        const imageElement = document.createElement("img");

        button.className = "letter__image-button";
        button.type = "button";
        button.setAttribute("aria-label", `${entry.title} 그림 ${index + 1} 크게 보기`);
        imageElement.src = image.url;
        imageElement.alt = `${entry.title} 그림 ${index + 1}`;
        button.appendChild(imageElement);
        button.addEventListener("click", () => openLightbox(image, button));
        return button;
      }),
    );
    letterImages.hidden = images.length === 0;
  }

  function revokePreviewUrls() {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    previewUrls = [];
  }

  function createSelectedImage(image, onRemove, onSetCover, isCover) {
    const wrapper = document.createElement("div");
    const imageElement = document.createElement("img");
    const removeButton = document.createElement("button");
    const coverButton = document.createElement("button");

    wrapper.className = "selected-image";
    imageElement.alt = image.name || "첨부한 그림";
    if (image.url) imageElement.src = image.url;
    removeButton.className = "selected-image__remove";
    removeButton.type = "button";
    removeButton.setAttribute("aria-label", `${image.name || "첨부한 그림"} 제거`);
    removeButton.textContent = "×";
    removeButton.addEventListener("click", onRemove);
    coverButton.className = "selected-image__cover";
    coverButton.type = "button";
    coverButton.setAttribute("aria-pressed", String(isCover));
    coverButton.textContent = isCover ? "대표" : "대표로 지정";
    coverButton.addEventListener("click", onSetCover);
    if (isCover) wrapper.classList.add("is-cover");
    wrapper.append(imageElement, coverButton, removeButton);
    return wrapper;
  }

  function renderSelectedImages() {
    revokePreviewUrls();
    const cards = [];
    const selectedItems = [
      ...existingImages.map((image) => ({ ...image, key: image.path })),
      ...pendingImageFiles.map((file) => ({
        file,
        key: getPendingImageKey(file),
        name: file.name,
      })),
    ];

    if (!selectedItems.some((image) => image.key === coverImageKey)) {
      coverImageKey = selectedItems[0]?.key ?? null;
    }

    existingImages.forEach((image, index) => {
      cards.push(createSelectedImage(
        image,
        () => {
          existingImages.splice(index, 1);
          renderSelectedImages();
        },
        () => {
          coverImageKey = image.path;
          renderSelectedImages();
        },
        coverImageKey === image.path,
      ));
    });

    pendingImageFiles.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      previewUrls.push(url);
      const key = getPendingImageKey(file);
      cards.push(createSelectedImage(
        { name: file.name, url },
        () => {
          pendingImageFiles.splice(index, 1);
          renderSelectedImages();
        },
        () => {
          coverImageKey = key;
          renderSelectedImages();
        },
        coverImageKey === key,
      ));
    });

    selectedImagesList.replaceChildren(...cards);
    selectedImages.hidden = cards.length === 0;
  }

  function getFileExtension(file) {
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    return /^[a-z0-9]{2,5}$/u.test(extension) ? extension : "jpg";
  }

  function getStoredImages(images) {
    return images.map((image) => ({
      path: image.path,
      name: image.name || image.path.split("/").pop(),
    }));
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
  }

  async function listStorageFiles(path = "") {
    const files = [];
    let offset = 0;

    while (true) {
      const { data, error } = await supabaseClient.storage
        .from(SUPABASE_IMAGE_BUCKET)
        .list(path, {
          limit: 100,
          offset,
          sortBy: { column: "name", order: "asc" },
        });
      if (error) throw error;

      const items = Array.isArray(data) ? data : [];
      for (const item of items) {
        const itemPath = path ? `${path}/${item.name}` : item.name;
        if (item.id === null) {
          files.push(...await listStorageFiles(itemPath));
        } else {
          files.push({
            path: itemPath,
            size: Number(item.metadata?.size ?? 0),
          });
        }
      }

      if (items.length < 100) break;
      offset += 100;
    }

    return files;
  }

  function estimateDiaryBytes() {
    const encoder = new TextEncoder();
    return entries.reduce((total, entry) => total + encoder.encode(JSON.stringify({
      date: entry.shortDate,
      title: entry.title,
      body: entry.body,
      images: getStoredImages(entry.images),
      coverImage: entry.coverImage,
    })).length, 0);
  }

  function closeUsagePanel() {
    usagePanel.hidden = true;
  }

  async function showUsagePanel() {
    usagePanel.hidden = false;
    usageStatus.textContent = "사용량을 확인하는 중이에요…";
    imageUsageValue.textContent = "확인 중";
    imageCountValue.textContent = "확인 중";
    diaryUsageValue.textContent = "확인 중";

    try {
      await ensureAnonymousSession();
      const files = await listStorageFiles();
      const imageBytes = files.reduce((total, file) => total + file.size, 0);
      imageUsageValue.textContent = `${formatBytes(imageBytes)} / 1GB`;
      imageCountValue.textContent = `${files.length}장`;
      diaryUsageValue.textContent = formatBytes(estimateDiaryBytes());
      usageStatus.textContent = "현재 사용량을 확인했어요.";
    } catch (error) {
      console.warn("Supabase 저장 공간 조회 실패", error);
      usageStatus.textContent = "사용량을 확인하지 못했어요. Storage 정책을 확인해 주세요.";
      imageUsageValue.textContent = "확인 실패";
      imageCountValue.textContent = "확인 실패";
      diaryUsageValue.textContent = formatBytes(estimateDiaryBytes());
    }
  }

  async function removeStorageImages(paths) {
    if (!paths.length) return;
    const { error } = await supabaseClient.storage
      .from(SUPABASE_IMAGE_BUCKET)
      .remove(paths);
    if (error) throw error;
  }

  async function uploadImageFiles(files) {
    if (!files.length) return [];

    const { data, error: userError } = await supabaseClient.auth.getUser();
    if (userError) throw userError;
    const userId = data.user?.id;
    if (!userId) throw new Error("Anonymous user is unavailable");

    const uploadedImages = [];
    try {
      for (const file of files) {
        const id = crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const path = `${userId}/${id}.${getFileExtension(file)}`;
        const { error } = await supabaseClient.storage
          .from(SUPABASE_IMAGE_BUCKET)
          .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
          });
        if (error) throw error;
        uploadedImages.push({ path, name: file.name, key: getPendingImageKey(file) });
      }
    } catch (error) {
      await removeStorageImages(uploadedImages.map((image) => image.path)).catch(() => {});
      throw error;
    }

    return uploadedImages;
  }

  function createEntryCard(entry) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    const dateBadge = document.createElement("span");
    const dateMain = document.createElement("strong");
    const dateSub = document.createElement("small");
    const title = document.createElement("span");
    const cover = document.createElement("span");

    item.className = "entry-card";
    button.type = "button";
    if (entry.coverUrl) button.classList.add("has-cover");
    button.dataset.entryId = entry.id;
    button.setAttribute("aria-label", `${dateFormatter.format(entry.date)}, ${entry.title} 열기`);

    dateBadge.className = "entry-card__date";
    dateMain.textContent = `${entry.date.getMonth() + 1}월 ${entry.date.getDate()}일`;
    dateSub.textContent = `${entry.date.getFullYear()}년`;
    dateBadge.append(dateMain, dateSub);

    title.className = "entry-card__title";
    title.textContent = entry.title;

    if (entry.coverUrl) {
      const coverImage = document.createElement("img");
      cover.className = "entry-card__cover";
      coverImage.src = entry.coverUrl;
      coverImage.alt = `${entry.title} 대표 그림`;
      cover.appendChild(coverImage);
    }

    button.append(dateBadge, title);
    if (entry.coverUrl) button.appendChild(cover);
    item.appendChild(button);
    return item;
  }

  function renderEntries() {
    listMessage.classList.remove("is-error");
    const pageCount = Math.max(1, Math.ceil(entries.length / ENTRIES_PER_PAGE));
    currentPage = Math.min(currentPage, pageCount);
    const pageStart = (currentPage - 1) * ENTRIES_PER_PAGE;
    const pageEntries = entries.slice(pageStart, pageStart + ENTRIES_PER_PAGE);

    entryList.replaceChildren(...pageEntries.map(createEntryCard));
    entryCount.textContent = `${entries.length}개의 기록`;
    entryPagination.hidden = entries.length <= ENTRIES_PER_PAGE;
    pageIndicator.textContent = `${currentPage} / ${pageCount}`;
    previousPageButton.disabled = currentPage === 1;
    nextPageButton.disabled = currentPage === pageCount;

    if (entries.length === 0) {
      listMessage.textContent = "아직 모아둔 일기가 없어요. 첫 마음을 적어볼까요?";
      listMessage.hidden = false;
      return;
    }

    listMessage.hidden = true;
  }

  function updateLightboxZoom() {
    lightboxImage.style.transform =
      `translate(${lightboxOffsetX}px, ${lightboxOffsetY}px) scale(${lightboxScale})`;
    zoomValue.textContent = `${Math.round(lightboxScale * 100)}%`;
  }

  function openLightbox(image, trigger) {
    if (!image.url) return;

    lightboxTrigger = trigger;
    lightboxImage.src = image.url;
    lightboxImage.alt = image.name || "첨부한 그림";
    lightboxScale = 1;
    lightboxOffsetX = 0;
    lightboxOffsetY = 0;
    updateLightboxZoom();
    imageLightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    closeLightboxButton.focus();
  }

  function closeLightbox() {
    imageLightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
    lightboxImage.removeAttribute("src");
    lightboxOffsetX = 0;
    lightboxOffsetY = 0;
    if (lightboxTrigger) lightboxTrigger.focus();
    lightboxTrigger = null;
  }

  function changeLightboxZoom(amount) {
    lightboxScale = Math.min(3, Math.max(0.5, lightboxScale + amount));
    if (lightboxScale === 1) {
      lightboxOffsetX = 0;
      lightboxOffsetY = 0;
    }
    updateLightboxZoom();
  }

  function getTouchDistance(touches) {
    const [first, second] = touches;
    return Math.hypot(
      second.clientX - first.clientX,
      second.clientY - first.clientY,
    );
  }

  function changePage(page) {
    const pageCount = Math.max(1, Math.ceil(entries.length / ENTRIES_PER_PAGE));
    currentPage = Math.min(pageCount, Math.max(1, page));
    renderEntries();
    document.querySelector(".index-book")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function showList() {
    closeLightbox();
    revokePreviewUrls();
    editingEntry = null;
    readerView.hidden = true;
    composeView.hidden = true;
    listView.hidden = false;
    letter.setAttribute("aria-busy", "false");
    document.title = "우리의 다이어리";
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  function showEntry(entry) {
    listView.hidden = true;
    composeView.hidden = true;
    readerView.hidden = false;
    entryDate.textContent = dateFormatter.format(entry.date);
    entryDate.dateTime = entry.shortDate.replaceAll(".", "-");
    entryTitle.textContent = entry.title;
    letterActions.hidden = false;
    entryContent.textContent = "편지를 조심히 펼치는 중이에요…";
    entryContent.classList.add("is-loading");
    entryError.textContent = "";
    letter.setAttribute("aria-busy", "true");
    document.title = `${entry.title} · 우리의 다이어리`;
    window.scrollTo({ top: 0, behavior: "auto" });
    entryContent.textContent = entry.body || "이 페이지에는 아직 글이 적혀 있지 않아요.";
    entryContent.classList.remove("is-loading");
    renderEntryImages(entry);
    letter.setAttribute("aria-busy", "false");
  }

  function getEntryFromHash() {
    const params = new URLSearchParams(window.location.hash.slice(1));
    const id = params.get("entry");
    return entries.find((entry) => entry.id === id) ?? null;
  }

  function routeFromHash() {
    const entry = getEntryFromHash();
    if (entry) {
      showEntry(entry);
      return;
    }
    showList();
  }

  function getTodayInputValue() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function showCompose(entry = null) {
    closeLightbox();
    editingEntry = entry;
    listView.hidden = true;
    readerView.hidden = true;
    composeView.hidden = false;
    entryForm.reset();
    entryDateInput.value = entry
      ? entry.shortDate.replaceAll(".", "-")
      : getTodayInputValue();
    entryTitleInput.value = entry?.title ?? "";
    entryBodyInput.value = entry?.body ?? "";
    existingImages = entry ? entry.images.map((image) => ({ ...image })) : [];
    pendingImageFiles = [];
    coverImageKey = entry?.coverImage || entry?.images[0]?.path || null;
    entryImagesInput.value = "";
    renderSelectedImages();
    cancelWriteButton.textContent = entry ? "취소" : "목록으로";
    writeMessage.textContent = "";
    writeMessage.classList.remove("is-error");
    saveEntryButton.disabled = false;
    saveEntryButton.innerHTML = '<span aria-hidden="true">♡</span> 기록하기';
    document.title = entry ? `${entry.title} 수정 · 우리의 다이어리` : "새 일기 · 우리의 다이어리";
    window.scrollTo({ top: 0, behavior: "auto" });
    window.setTimeout(() => entryTitleInput.focus(), 0);
  }

  function showWriteError(message) {
    writeMessage.textContent = message;
    writeMessage.classList.add("is-error");
  }

  function getSaveErrorMessage(error) {
    const message = String(error?.message ?? "").toLowerCase();

    if (
      message.includes("anonymous") ||
      message.includes("sign up") ||
      message.includes("signup")
    ) {
      return "Supabase의 익명 로그인을 켜고 변경 사항을 저장해 주세요.";
    }

    if (
      error?.code === "42501" ||
      message.includes("row-level security") ||
      message.includes("permission denied")
    ) {
      return "diary_entries 테이블의 authenticated용 RLS 정책을 확인해 주세요.";
    }

    if (
      message.includes("storage") ||
      message.includes("bucket") ||
      message.includes("object")
    ) {
      return "diary-images 저장소와 Storage 정책을 확인해 주세요.";
    }

    return "저장하지 못했어요. Supabase 연결 설정을 확인해 주세요.";
  }

  async function saveEntry(event) {
    event.preventDefault();
    writeMessage.textContent = "";
    writeMessage.classList.remove("is-error");

    const entryDateValue = entryDateInput.value;
    const title = entryTitleInput.value.trim();
    const body = entryBodyInput.value.trimEnd();

    if (!parseDate(entryDateValue) || !title || !body.trim()) {
      showWriteError("날짜, 제목, 본문을 모두 적어주세요.");
      return;
    }

    const entryBeingEdited = editingEntry;
    let uploadedImages = [];
    const payload = {
      entry_date: entryDateValue,
      title,
      body,
    };

    saveEntryButton.disabled = true;
    saveEntryButton.textContent = "저장하는 중…";

    try {
      await ensureAnonymousSession();
      uploadedImages = await uploadImageFiles(pendingImageFiles);
      const allImages = [...existingImages, ...uploadedImages];
      const nextImages = getStoredImages(allImages);
      payload.images = nextImages;
      payload.cover_image = allImages.find(
        (image) => (image.key ?? image.path) === coverImageKey,
      )?.path
        ?? allImages[0]?.path
        ?? null;

      const result = entryBeingEdited
        ? await supabaseClient
            .from(SUPABASE_TABLE)
            .update(payload)
            .eq("id", entryBeingEdited.dbId)
            .select("id, entry_date, title, body, images, cover_image, created_at, updated_at")
            .single()
        : await supabaseClient
            .from(SUPABASE_TABLE)
            .insert(payload)
            .select("id, entry_date, title, body, images, cover_image, created_at, updated_at")
            .single();

      if (result.error) throw result.error;

      let savedEntry = parseSupabaseEntry(result.data);
      if (!savedEntry) throw new Error("Invalid saved diary entry");
      [savedEntry] = await attachImageUrls([savedEntry]);

      if (entryBeingEdited) {
        const previousImagePaths = entryBeingEdited.images.map((image) => image.path);
        const nextImagePaths = savedEntry.images.map((image) => image.path);
        const removedImagePaths = previousImagePaths.filter(
          (path) => !nextImagePaths.includes(path),
        );
        await removeStorageImages(removedImagePaths).catch((error) => {
          console.warn("삭제된 일기 이미지 정리 실패", error);
        });
      }

      if (entryBeingEdited) {
        entries = entries.map((entry) =>
          entry.id === entryBeingEdited.id ? savedEntry : entry,
        );
      } else {
        entries = [...entries, savedEntry];
        currentPage = 1;
      }
      entries = sortEntries(entries);
      renderEntries();
      revokePreviewUrls();
      editingEntry = null;

      const hash = new URLSearchParams({ entry: savedEntry.id }).toString();
      history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}#${hash}`,
      );
      showEntry(savedEntry);
    } catch (error) {
      console.warn("Supabase 다이어리 저장 실패", error);
      if (uploadedImages.length) {
        await removeStorageImages(uploadedImages.map((image) => image.path)).catch(() => {});
      }
      showWriteError(getSaveErrorMessage(error));
    } finally {
      saveEntryButton.disabled = false;
      saveEntryButton.innerHTML = '<span aria-hidden="true">♡</span> 기록하기';
    }
  }

  async function deleteEntry() {
    const entry = getEntryFromHash();
    if (!entry || entry.source !== "supabase") return;

    const confirmed = window.confirm(
      `“${entry.title}” 기록을 삭제할까요?\n삭제한 기록은 되돌릴 수 없어요.`,
    );
    if (!confirmed) return;

    deleteEntryButton.disabled = true;
    entryError.textContent = "기록을 정리하는 중이에요…";

    try {
      await ensureAnonymousSession();
      const { error } = await supabaseClient
        .from(SUPABASE_TABLE)
        .delete()
        .eq("id", entry.dbId);
      if (error) throw error;

      await removeStorageImages(entry.images.map((image) => image.path)).catch((error) => {
        console.warn("삭제된 일기 이미지 정리 실패", error);
      });

      entries = entries.filter((item) => item.id !== entry.id);
      renderEntries();
      history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
      showList();
    } catch (error) {
      console.warn("Supabase 다이어리 삭제 실패", error);
      entryError.textContent = "삭제하지 못했어요. Supabase의 RLS 정책을 확인해 주세요.";
    } finally {
      deleteEntryButton.disabled = false;
    }
  }

  async function ensureAnonymousSession() {
    if (!supabaseClient) throw new Error("Supabase client is unavailable");

    const { data: sessionData, error: sessionError } =
      await supabaseClient.auth.getSession();
    if (sessionError) throw sessionError;
    if (sessionData.session) return;

    const { error: signInError } = await supabaseClient.auth.signInAnonymously();
    if (signInError) throw signInError;
  }

  async function loadSupabaseEntries() {
    await ensureAnonymousSession();

    const { data, error } = await supabaseClient
      .from(SUPABASE_TABLE)
      .select("id, entry_date, title, body, images, cover_image, created_at, updated_at")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    const parsedEntries = sortEntries(
      (Array.isArray(data) ? data : []).map(parseSupabaseEntry).filter(Boolean),
    );
    return attachImageUrls(parsedEntries);
  }

  async function loadEntries() {
    listMessage.hidden = false;
    listMessage.classList.remove("is-error");
    listMessage.textContent = "일기장을 펼치는 중이에요…";
    let loadError = false;

    try {
      entries = await loadSupabaseEntries();
    } catch (error) {
      console.warn("Supabase 다이어리 조회 실패", error);
      entries = [];
      loadError = true;
    }

    renderEntries();
    if (loadError) {
      listMessage.hidden = false;
      listMessage.classList.add("is-error");
      listMessage.textContent = "일기장을 펼치지 못했어요. 잠시 후 새로고침 해주세요.";
    }
    routeFromHash();
  }

  async function refreshEntries() {
    refreshButton.disabled = true;
    refreshButton.classList.add("is-loading");
    await loadEntries();
    refreshButton.disabled = false;
    refreshButton.classList.remove("is-loading");
  }

  entryList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-entry-id]");
    if (!button) return;
    window.location.hash = new URLSearchParams({ entry: button.dataset.entryId }).toString();
  });

  newEntryButton.addEventListener("click", () => showCompose());

  editEntryButton.addEventListener("click", () => {
    const entry = getEntryFromHash();
    if (entry) showCompose(entry);
  });

  deleteEntryButton.addEventListener("click", deleteEntry);

  usageButton.addEventListener("click", () => {
    if (usagePanel.hidden) {
      showUsagePanel();
    } else {
      closeUsagePanel();
    }
  });
  closeUsageButton.addEventListener("click", closeUsagePanel);

  entryImagesInput.addEventListener("change", (event) => {
    const selectedFiles = [...event.target.files];
    const remainingSlots = MAX_IMAGE_COUNT - existingImages.length - pendingImageFiles.length;
    const acceptedFiles = selectedFiles.filter(
      (file) => file.type.startsWith("image/") && file.size <= MAX_IMAGE_SIZE,
    );

    if (selectedFiles.length > acceptedFiles.length) {
      showWriteError("이미지 파일만 첨부할 수 있고, 한 장당 10MB까지 가능해요.");
    }

    if (acceptedFiles.length > remainingSlots) {
      showWriteError(`사진은 한 일기에 최대 ${MAX_IMAGE_COUNT}장까지 첨부할 수 있어요.`);
    }

    pendingImageFiles = [
      ...pendingImageFiles,
      ...acceptedFiles.slice(0, Math.max(0, remainingSlots)),
    ];
    event.target.value = "";
    renderSelectedImages();
  });

  closeLightboxButton.addEventListener("click", closeLightbox);
  imageLightbox.addEventListener("click", (event) => {
    if (event.target.matches("[data-lightbox-close]")) closeLightbox();
  });
  lightboxStage.addEventListener("touchstart", (event) => {
    if (event.touches.length >= 2) {
      pinchStartDistance = getTouchDistance(event.touches);
      pinchStartScale = lightboxScale;
      dragStartPoint = null;
      return;
    }

    if (event.touches.length === 1 && lightboxScale > 1) {
      dragStartPoint = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
      dragStartOffset = { x: lightboxOffsetX, y: lightboxOffsetY };
    }
  }, { passive: true });
  lightboxStage.addEventListener("touchmove", (event) => {
    if (event.touches.length >= 2 && pinchStartDistance) {
      event.preventDefault();
      lightboxScale = Math.min(
        3,
        Math.max(0.5, pinchStartScale * (getTouchDistance(event.touches) / pinchStartDistance)),
      );
      if (lightboxScale === 1) {
        lightboxOffsetX = 0;
        lightboxOffsetY = 0;
      }
      updateLightboxZoom();
      return;
    }

    if (event.touches.length === 1 && dragStartPoint && dragStartOffset) {
      event.preventDefault();
      lightboxOffsetX = dragStartOffset.x + event.touches[0].clientX - dragStartPoint.x;
      lightboxOffsetY = dragStartOffset.y + event.touches[0].clientY - dragStartPoint.y;
      updateLightboxZoom();
    }
  }, { passive: false });
  lightboxStage.addEventListener("touchend", (event) => {
    if (event.touches.length < 2) pinchStartDistance = null;
    if (event.touches.length === 0) {
      dragStartPoint = null;
      dragStartOffset = null;
    } else if (event.touches.length === 1 && lightboxScale > 1) {
      dragStartPoint = {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
      };
      dragStartOffset = { x: lightboxOffsetX, y: lightboxOffsetY };
    }
  });
  lightboxStage.addEventListener("dblclick", () => {
    lightboxScale = lightboxScale === 1 ? 2 : 1;
    if (lightboxScale === 1) {
      lightboxOffsetX = 0;
      lightboxOffsetY = 0;
    }
    updateLightboxZoom();
  });
  zoomOutButton.addEventListener("click", () => changeLightboxZoom(-0.25));
  zoomInButton.addEventListener("click", () => changeLightboxZoom(0.25));
  zoomResetButton.addEventListener("click", () => {
    lightboxScale = 1;
    lightboxOffsetX = 0;
    lightboxOffsetY = 0;
    updateLightboxZoom();
  });
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!imageLightbox.hidden) closeLightbox();
    if (!usagePanel.hidden) closeUsagePanel();
  });
  window.addEventListener("beforeunload", revokePreviewUrls);

  cancelWriteButton.addEventListener("click", () => {
    const entryBeingEdited = editingEntry;

    if (entryBeingEdited) {
      const hash = new URLSearchParams({ entry: entryBeingEdited.id }).toString();
      history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}#${hash}`,
      );
      editingEntry = null;
      showEntry(entryBeingEdited);
      return;
    }

    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    showList();
  });

  entryForm.addEventListener("submit", saveEntry);

  backButton.addEventListener("click", () => {
    history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    showList();
  });

  refreshButton.addEventListener("click", refreshEntries);
  previousPageButton.addEventListener("click", () => changePage(currentPage - 1));
  nextPageButton.addEventListener("click", () => changePage(currentPage + 1));

  window.addEventListener("hashchange", routeFromHash);
  updateDDay();
  loadEntries();
})();
