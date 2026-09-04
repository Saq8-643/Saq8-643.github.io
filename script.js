const galleryGrid = document.getElementById("galleryGrid");
const filtersContainer = document.getElementById("filters");
const heroPhoto = document.getElementById("heroPhoto");
const dailyPhotoButton = document.getElementById("dailyPhoto");
const dailyPhotoImage = document.getElementById("dailyPhotoImage");
const dailyPhotoTitle = document.getElementById("dailyPhotoTitle");
const dailyPhotoPlace = document.getElementById("dailyPhotoPlace");
const dailyPhotoDate = document.getElementById("dailyPhotoDate");
const dailyPhotoTags = document.getElementById("dailyPhotoTags");
const dailyPhotoNote = document.getElementById("dailyPhotoNote");

const mapContainer = document.getElementById("japanMap");
const selectedPrefecture = document.getElementById("selectedPrefecture");
const selectedCount = document.getElementById("selectedCount");
const clearMapFilter = document.getElementById("clearMapFilter");
const galleryHeading = document.getElementById("galleryHeading");

const moreButton = document.getElementById("moreButton");
const moreCount = document.getElementById("moreCount");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxDate = document.getElementById("lightboxDate");
const lightboxPlace = document.getElementById("lightboxPlace");
const lightboxMeta = document.getElementById("lightboxMeta");
const closeLightbox = document.getElementById("closeLightbox");

const PAGE_SIZE = 12;

const MAP_EMPTY = "#e6e6e2";
const MAP_VISITED = "#938aaa";
const MAP_SELECTED = "#171717";

let photos = [];
let currentPhotos = [];
let visibleCount = PAGE_SIZE;

let currentTag = "all";
let currentPrefectureCode = null;
let currentPrefectureName = "";

let resizeTimer;

/* ---------------------------------
   起動
--------------------------------- */

async function loadSite() {
  try {
    const response = await fetch("photos.json?v=6");

    if (!response.ok) {
      throw new Error(`photos.json の読み込みに失敗しました: ${response.status}`);
    }

    const data = await response.json();

    heroPhoto.style.backgroundImage = `url("${data.hero.file}")`;
    heroPhoto.setAttribute("aria-label", data.hero.alt || "メイン写真");

    photos = sortPhotosByDate(data.photos);

renderDailyPhoto();
createFilters();
renderJapanMap();
applyFilters();

  } catch (error) {
    console.error(error);

    galleryGrid.innerHTML = `
      <p class="empty-gallery">
        写真一覧を読み込めませんでした。<br>
        photos.json の書き方を確認してください。
      </p>
    `;

    moreButton.hidden = true;
  }
}

/* ---------------------------------
   日付順
--------------------------------- */

function sortPhotosByDate(photoList) {
  return photoList
    .map((photo, index) => ({ ...photo, _originalIndex:index }))
    .sort((a, b) => {
      const aHasDate = Boolean(a.date);
      const bHasDate = Boolean(b.date);

      if (aHasDate && bHasDate) {
        const dateDiff = new Date(b.date) - new Date(a.date);
        if (dateDiff !== 0) return dateDiff;
        return a._originalIndex - b._originalIndex;
      }

      if (aHasDate) return -1;
      if (bHasDate) return 1;

      return a._originalIndex - b._originalIndex;
    });
}

/* ---------------------------------
   今日の1枚
--------------------------------- */

function renderDailyPhoto() {
  if (!photos.length) return;

  const todayKey = getJapanDateKey();
  const index = getDailyPhotoIndex(todayKey, photos.length);
  const photo = photos[index];

  dailyPhotoImage.src = photo.file;
  dailyPhotoImage.alt = photo.alt || photo.title || "";

  dailyPhotoTitle.textContent =
    photo.title || "Untitled";

  const place = [
    photo.prefecture || "",
    photo.place || ""
  ].filter(Boolean).join(" / ");

  dailyPhotoPlace.textContent = place;

  if (photo.date) {
    dailyPhotoDate.textContent = formatDate(photo.date);
    dailyPhotoDate.hidden = false;
  } else {
    dailyPhotoDate.textContent = "";
    dailyPhotoDate.hidden = true;
  }

  dailyPhotoTags.textContent =
    (photo.tags || []).join(" / ");

   dailyPhotoNote.textContent = photo.alt || "";

  dailyPhotoButton.onclick = () => {
    openLightbox(photo);
  };
}


/* 日本時間の「今日」を取得 */
function getJapanDateKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const year =
    parts.find(part => part.type === "year").value;

  const month =
    parts.find(part => part.type === "month").value;

  const day =
    parts.find(part => part.type === "day").value;

  return `${year}-${month}-${day}`;
}


/* 日付から毎日同じ番号を作る */
function getDailyPhotoIndex(dateKey, photoCount) {
  let hash = 2166136261;

  for (let i = 0; i < dateKey.length; i++) {
    hash ^= dateKey.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % photoCount;
}

/* ---------------------------------
   日本地図
--------------------------------- */

function getPhotographedPrefectureCodes() {
  return new Set(
    photos
      .map(photo => Number(photo.prefectureCode))
      .filter(code => Number.isInteger(code) && code >= 1 && code <= 47)
  );
}

function renderJapanMap() {
  if (!window.jpmap || !jpmap.japanMap) {
    mapContainer.innerHTML = `
      <p class="empty-gallery">
        日本地図を読み込めませんでした。<br>
        通信状態を確認してください。
      </p>
    `;
    return;
  }

  mapContainer.innerHTML = "";

  const photographedCodes = getPhotographedPrefectureCodes();

  /* 47都道府県すべての色を指定する */
  const areas = [];

  for (let code = 1; code <= 47; code++) {
    let color = MAP_EMPTY;

    if (photographedCodes.has(code)) {
      color = MAP_VISITED;
    }

    if (currentPrefectureCode === code) {
      color = MAP_SELECTED;
    }

    areas.push({ code, color });
  }

  const width = Math.max(
    300,
    Math.min(mapContainer.clientWidth || 900, 900)
  );

  new jpmap.japanMap(mapContainer, {
    areas,
    width,
    movesIslands:true,
    showsPrefectureName:true,
    borderLineColor:"#ffffff",

    onSelect(data) {
      selectPrefecture(Number(data.code), data.name);
    }
  });
}

function selectPrefecture(code, name) {
  currentPrefectureCode = code;

  /* JSON側の表記があればそちらを優先 */
  const matchingPhoto = photos.find(
    photo => Number(photo.prefectureCode) === code
  );

  currentPrefectureName =
    matchingPhoto?.prefecture ||
    name ||
    `PREFECTURE ${code}`;

  currentTag = "all";
  visibleCount = PAGE_SIZE;

  setActiveTagButton("all");
  updateMapStatus();
  renderJapanMap();

document.getElementById("gallery")
  .scrollIntoView({ behavior:"smooth", block:"start" });

setTimeout(() => {
  applyFilters();
}, 550);
}

function clearPrefecture() {
  currentPrefectureCode = null;
  currentPrefectureName = "";
  currentTag = "all";
  visibleCount = PAGE_SIZE;

  setActiveTagButton("all");
  updateMapStatus();
  renderJapanMap();
  applyFilters();
}

function updateMapStatus() {
  if (currentPrefectureCode === null) {
    selectedPrefecture.textContent = "ALL JAPAN";
    selectedCount.textContent =
      `${photos.filter(photo => photo.prefectureCode).length} PHOTOS WITH LOCATION`;

    clearMapFilter.hidden = true;
    galleryHeading.textContent = "Photographs";
    return;
  }

  const count = photos.filter(
    photo => Number(photo.prefectureCode) === currentPrefectureCode
  ).length;

  selectedPrefecture.textContent = currentPrefectureName;
  selectedCount.textContent = `${count} PHOTO${count === 1 ? "" : "S"}`;

  clearMapFilter.hidden = false;
  galleryHeading.textContent = currentPrefectureName;
}

clearMapFilter.addEventListener("click", clearPrefecture);

/* ---------------------------------
   タグ
--------------------------------- */

function createFilters() {
  const tags = [...new Set(
    photos.flatMap(photo => photo.tags || [])
  )].sort();

  filtersContainer.innerHTML = "";

  filtersContainer.appendChild(
    makeFilterButton("ALL", "all", true)
  );

  tags.forEach(tag => {
    filtersContainer.appendChild(
      makeFilterButton(tag, tag, false)
    );
  });
}

function makeFilterButton(label, value, active) {
  const button = document.createElement("button");

  button.className = `filter${active ? " active" : ""}`;
  button.textContent = label;
  button.dataset.filter = value;

  button.addEventListener("click", () => {
    currentTag = value;
    visibleCount = PAGE_SIZE;

    setActiveTagButton(value);
    applyFilters();
  });

  return button;
}

function setActiveTagButton(value) {
  document.querySelectorAll(".filter").forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.filter === value
    );
  });
}

/* ---------------------------------
   地図 + タグを同時に絞り込み
--------------------------------- */

function applyFilters() {
  currentPhotos = photos.filter(photo => {
    const prefectureOK =
      currentPrefectureCode === null ||
      Number(photo.prefectureCode) === currentPrefectureCode;

    const tagOK =
      currentTag === "all" ||
      (photo.tags || []).includes(currentTag);

    return prefectureOK && tagOK;
  });

  renderVisiblePhotos();
  updateMapStatus();
}

/* ---------------------------------
   ギャラリー
--------------------------------- */

function renderVisiblePhotos() {
  galleryGrid.innerHTML = "";

  const visiblePhotos = currentPhotos.slice(0, visibleCount);

  if (visiblePhotos.length === 0) {
    galleryGrid.innerHTML = `
      <p class="empty-gallery">
        ここには、まだ写真がありません。
      </p>
    `;

    moreButton.hidden = true;
    return;
  }

  visiblePhotos.forEach((photo, index) => {
    const item = document.createElement("button");

    item.className =
      `gallery-item ${photo.layout || ""}`.trim();

    /*
      ばらばら〜演出。
      indexから擬似的に方向を変えるので、
      毎回完全ランダムではなく見た目が安定する。
    */
    const directions = [
  [-180, 90, -7],
  [160, -100, 6],
  [-120, -140, -5],
  [190, 80, 8],
  [20, 150, -6],
  [-170, 30, 7]
];

    const [x, y, r] =
      directions[index % directions.length];

    item.style.setProperty("--scatter-x", `${x}px`);
    item.style.setProperty("--scatter-y", `${y}px`);
    item.style.setProperty("--scatter-r", `${r}deg`);
    item.style.setProperty(
      "--delay",
      `${Math.min(index * 48, 420)}ms`
    );

    const img = document.createElement("img");
    img.className = "gallery-photo";
    img.src = photo.file;
    img.alt = photo.alt || photo.title || "";
    img.loading = "lazy";

    const info = document.createElement("span");
    info.className = "item-info";

    const title = document.createElement("b");
    title.textContent = photo.title || "";

    const meta = document.createElement("small");
    meta.textContent = (photo.tags || []).join(" / ");

    info.append(title, meta);
    item.append(img, info);

    item.addEventListener("click", () => {
      openLightbox(photo);
    });

    galleryGrid.appendChild(item);
  });

  updateMoreButton();
}

function updateMoreButton() {
  const remaining = currentPhotos.length - visibleCount;

  if (remaining > 0) {
    moreButton.hidden = false;
    moreCount.textContent =
      `+${Math.min(PAGE_SIZE, remaining)}`;
  } else {
    moreButton.hidden = true;
    moreCount.textContent = "";
  }
}

moreButton.addEventListener("click", () => {
  visibleCount += PAGE_SIZE;
  renderVisiblePhotos();
});

/* ---------------------------------
   拡大表示
--------------------------------- */

function openLightbox(photo) {
  lightboxImage.src = photo.file;
  lightboxImage.alt = photo.alt || photo.title || "";
  lightboxTitle.textContent = photo.title || "";

  if (photo.date) {
    lightboxDate.textContent = formatDate(photo.date);
    lightboxDate.hidden = false;
  } else {
    lightboxDate.textContent = "";
    lightboxDate.hidden = true;
  }

  const place = [
    photo.prefecture || "",
    photo.place || ""
  ].filter(Boolean).join(" / ");

  if (place) {
    lightboxPlace.textContent = place;
    lightboxPlace.hidden = false;
  } else {
    lightboxPlace.textContent = "";
    lightboxPlace.hidden = true;
  }

  lightboxMeta.textContent = [
    ...(photo.tags || []),
    photo.meta || ""
  ].filter(Boolean).join(" / ");

  lightbox.showModal();
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${year}.${month}.${day}`;
}

closeLightbox.addEventListener(
  "click",
  () => lightbox.close()
);

lightbox.addEventListener("click", event => {
  const rect = lightbox.getBoundingClientRect();

  const inside =
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom;

  if (!inside) lightbox.close();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && lightbox.open) {
    lightbox.close();
  }
});

/* ---------------------------------
   地図のレスポンシブ再描画
--------------------------------- */

window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);

  resizeTimer = setTimeout(() => {
    renderJapanMap();
  }, 180);
});

/* GO */
loadSite();
