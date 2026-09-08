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
const dailyPeelCover = document.getElementById("dailyPeelCover");
const dailySection = document.getElementById("daily");

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
const lightboxNote = document.getElementById("lightboxNote");
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


/* ==============================
   SITE LOAD
============================== */

async function loadSite() {
  try {
    const response = await fetch("photos.json?v=16");

    if (!response.ok) {
      throw new Error(`photos.json: ${response.status}`);
    }

    const data = await response.json();

    if (heroPhoto && data.hero?.file) {
      heroPhoto.style.backgroundImage =
        `url("${data.hero.file}")`;

      heroPhoto.setAttribute(
        "aria-label",
        data.hero.alt || "メイン写真"
      );
    }

    photos = sortPhotosByDate(
      data.photos || []
    );

    renderDailyPhoto();
    setupDailyPeel();
    createFilters();
    renderJapanMap();
    applyFilters();

  } catch (error) {
    console.error(error);

    if (galleryGrid) {
      galleryGrid.innerHTML = `
        <p class="empty-gallery">
          写真一覧を読み込めませんでした。<br>
          photos.json を確認してください。
        </p>
      `;
    }

    if (moreButton) {
      moreButton.hidden = true;
    }
  }
}


/* ==============================
   SORT
============================== */

function sortPhotosByDate(photoList) {
  return photoList
    .map((photo, index) => ({
      ...photo,
      _originalIndex: index
    }))
    .sort((a, b) => {

      if (a.date && b.date) {
        const diff =
          new Date(b.date) -
          new Date(a.date);

        return (
          diff ||
          a._originalIndex -
          b._originalIndex
        );
      }

      if (a.date) return -1;
      if (b.date) return 1;

      return (
        a._originalIndex -
        b._originalIndex
      );
    });
}


/* ==============================
   TODAY'S PHOTO
============================== */

function renderDailyPhoto() {
  if (
    !photos.length ||
    !dailyPhotoImage
  ) {
    return;
  }

  const todayKey =
    getJapanDateKey();

  const photo =
    photos[
      getDailyPhotoIndex(
        todayKey,
        photos.length
      )
    ];

  dailyPhotoImage.src =
    photo.file;

  dailyPhotoImage.alt =
    photo.alt ||
    photo.title ||
    "";

  dailyPhotoTitle.textContent =
    photo.title ||
    "Untitled";

  dailyPhotoPlace.textContent =
    [
      photo.prefecture,
      photo.place
    ]
      .filter(Boolean)
      .join(" / ");

  dailyPhotoTags.textContent =
    (photo.tags || [])
      .join(" / ");

  dailyPhotoNote.textContent =
    photo.alt || "";

  if (photo.date) {
    dailyPhotoDate.textContent =
      formatDate(photo.date);

    dailyPhotoDate.hidden =
      false;

  } else {
    dailyPhotoDate.textContent =
      "";

    dailyPhotoDate.hidden =
      true;
  }

  dailyPhotoButton.onclick =
    () => openLightbox(photo);
}


/* ==============================
   JAPAN DATE
============================== */

function getJapanDateKey() {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "Asia/Tokyo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    )
      .formatToParts(
        new Date()
      );

  const get = type =>
    parts.find(
      part =>
        part.type === type
    ).value;

  return `${get("year")}-${get("month")}-${get("day")}`;
}


function getDailyPhotoIndex(
  dateKey,
  photoCount
) {
  let hash =
    2166136261;

  for (
    let i = 0;
    i < dateKey.length;
    i++
  ) {
    hash ^=
      dateKey.charCodeAt(i);

    hash =
      Math.imul(
        hash,
        16777619
      );
  }

  return (
    (hash >>> 0) %
    photoCount
  );
}


function formatDate(
  dateString
) {
  const [
    year,
    month,
    day
  ] =
    dateString.split("-");

  return `${year}.${month}.${day}`;
}


/* ==============================
   MAP
============================== */

function getPhotographedPrefectureCodes() {
  return new Set(
    photos
      .map(
        photo =>
          Number(
            photo.prefectureCode
          )
      )
      .filter(
        code =>
          Number.isInteger(code) &&
          code >= 1 &&
          code <= 47
      )
  );
}


function renderJapanMap() {
  if (!mapContainer) {
    return;
  }

  if (
    !window.jpmap ||
    !jpmap.japanMap
  ) {
    mapContainer.innerHTML = `
      <p class="empty-gallery">
        日本地図を読み込めませんでした。<br>
        通信状態を確認してください。
      </p>
    `;

    return;
  }

  mapContainer.innerHTML =
    "";

  const photographed =
    getPhotographedPrefectureCodes();

  const areas = [];

  for (
    let code = 1;
    code <= 47;
    code++
  ) {
    let color =
      photographed.has(code)
        ? MAP_VISITED
        : MAP_EMPTY;

    if (
      currentPrefectureCode ===
      code
    ) {
      color =
        MAP_SELECTED;
    }

    areas.push({
      code,
      color
    });
  }

  const width =
    Math.max(
      300,
      Math.min(
        mapContainer.clientWidth ||
        900,
        900
      )
    );

  new jpmap.japanMap(
    mapContainer,
    {
      areas,
      width,
      movesIslands: true,
      showsPrefectureName: true,
      borderLineColor:
        "#ffffff",

      onSelect(data) {
        selectPrefecture(
          Number(
            data.code
          ),
          data.name
        );
      }
    }
  );
}


function selectPrefecture(
  code,
  name
) {
  currentPrefectureCode =
    code;

  currentPrefectureName =
    photos.find(
      photo =>
        Number(
          photo.prefectureCode
        ) === code
    )?.prefecture ||
    name ||
    `PREFECTURE ${code}`;

  currentTag =
    "all";

  visibleCount =
    PAGE_SIZE;

  setActiveTagButton(
    "all"
  );

  updateMapStatus();
  renderJapanMap();

  document
    .getElementById(
      "gallery"
    )
    ?.scrollIntoView({
      behavior:
        "smooth",
      block:
        "start"
    });

  setTimeout(
    applyFilters,
    500
  );
}


function clearPrefecture() {
  currentPrefectureCode =
    null;

  currentPrefectureName =
    "";

  currentTag =
    "all";

  visibleCount =
    PAGE_SIZE;

  setActiveTagButton(
    "all"
  );

  updateMapStatus();
  renderJapanMap();
  applyFilters();
}


function updateMapStatus() {
  if (
    !selectedPrefecture ||
    !selectedCount ||
    !galleryHeading
  ) {
    return;
  }

  if (
    currentPrefectureCode ===
    null
  ) {
    selectedPrefecture.textContent =
      "ALL JAPAN";

    selectedCount.textContent =
      `${
        photos.filter(
          photo =>
            photo.prefectureCode
        ).length
      } PHOTOS WITH LOCATION`;

    clearMapFilter.hidden =
      true;

    galleryHeading.textContent =
      "Photographs";

    return;
  }

  const count =
    photos.filter(
      photo =>
        Number(
          photo.prefectureCode
        ) ===
        currentPrefectureCode
    ).length;

  selectedPrefecture.textContent =
    currentPrefectureName;

  selectedCount.textContent =
    `${count} PHOTO${
      count === 1
        ? ""
        : "S"
    }`;

  clearMapFilter.hidden =
    false;

  galleryHeading.textContent =
    currentPrefectureName;
}


clearMapFilter
  ?.addEventListener(
    "click",
    clearPrefecture
  );


/* ==============================
   FILTER
============================== */

function createFilters() {
  if (!filtersContainer) {
    return;
  }

  const tags =
    [
      ...new Set(
        photos.flatMap(
          photo =>
            photo.tags ||
            []
        )
      )
    ]
      .sort();

  filtersContainer.innerHTML =
    "";

  filtersContainer.appendChild(
    makeFilterButton(
      "ALL",
      "all",
      true
    )
  );

  tags.forEach(
    tag => {
      filtersContainer.appendChild(
        makeFilterButton(
          tag,
          tag,
          false
        )
      );
    }
  );
}


function makeFilterButton(
  label,
  value,
  active
) {
  const button =
    document.createElement(
      "button"
    );

  button.className =
    `filter${
      active
        ? " active"
        : ""
    }`;

  button.textContent =
    label;

  button.dataset.filter =
    value;

  button.addEventListener(
    "click",
    () => {
      currentTag =
        value;

      visibleCount =
        PAGE_SIZE;

      setActiveTagButton(
        value
      );

      applyFilters();
    }
  );

  return button;
}


function setActiveTagButton(
  value
) {
  document
    .querySelectorAll(
      ".filter"
    )
    .forEach(
      button => {
        button.classList.toggle(
          "active",
          button.dataset.filter ===
          value
        );
      }
    );
}


function applyFilters() {
  currentPhotos =
    photos.filter(
      photo => {

        const prefectureOK =
          currentPrefectureCode ===
            null ||
          Number(
            photo.prefectureCode
          ) ===
            currentPrefectureCode;

        const tagOK =
          currentTag ===
            "all" ||
          (photo.tags || [])
            .includes(
              currentTag
            );

        return (
          prefectureOK &&
          tagOK
        );
      }
    );

  renderVisiblePhotos();
  updateMapStatus();
}


/* ==============================
   GALLERY
============================== */

function renderVisiblePhotos() {
  if (!galleryGrid) {
    return;
  }

  galleryGrid.innerHTML =
    "";

  const visiblePhotos =
    currentPhotos.slice(
      0,
      visibleCount
    );

  if (
    !visiblePhotos.length
  ) {
    galleryGrid.innerHTML = `
      <p class="empty-gallery">
        ここには、まだ写真がありません。
      </p>
    `;

    moreButton.hidden =
      true;

    return;
  }

  const directions = [
    [-180, 90, -7],
    [160, -100, 6],
    [-120, -140, -5],
    [190, 80, 8],
    [20, 150, -6],
    [-170, 30, 7]
  ];

  visiblePhotos.forEach(
    (photo, index) => {

      const item =
        document.createElement(
          "button"
        );

      item.className =
        `gallery-item ${
          photo.layout ||
          ""
        }`
          .trim();

      const [
        x,
        y,
        r
      ] =
        directions[
          index %
          directions.length
        ];

      item.style.setProperty(
        "--scatter-x",
        `${x}px`
      );

      item.style.setProperty(
        "--scatter-y",
        `${y}px`
      );

      item.style.setProperty(
        "--scatter-r",
        `${r}deg`
      );

      item.style.setProperty(
        "--delay",
        `${
          Math.min(
            index * 48,
            420
          )
        }ms`
      );

      const img =
        document.createElement(
          "img"
        );

      img.className =
        "gallery-photo";

      img.src =
        photo.file;

      img.alt =
        photo.alt ||
        photo.title ||
        "";

      img.loading =
        "lazy";

      const info =
        document.createElement(
          "span"
        );

      info.className =
        "item-info";

      const title =
        document.createElement(
          "b"
        );

      title.textContent =
        photo.title ||
        "";

      const meta =
        document.createElement(
          "small"
        );

      meta.textContent =
        (photo.tags || [])
          .join(" / ");

      info.append(
        title,
        meta
      );

      item.append(
        img,
        info
      );

      item.addEventListener(
        "click",
        () =>
          openLightbox(
            photo
          )
      );

      galleryGrid.appendChild(
        item
      );
    }
  );

  updateMoreButton();
}


function updateMoreButton() {
  const remaining =
    currentPhotos.length -
    visibleCount;

  if (
    remaining > 0
  ) {
    moreButton.hidden =
      false;

    moreCount.textContent =
      `+${
        Math.min(
          PAGE_SIZE,
          remaining
        )
      }`;

  } else {
    moreButton.hidden =
      true;

    moreCount.textContent =
      "";
  }
}


moreButton
  ?.addEventListener(
    "click",
    () => {
      visibleCount +=
        PAGE_SIZE;

      renderVisiblePhotos();
    }
  );


/* ==============================
   LIGHTBOX
============================== */

function openLightbox(
  photo
) {
  if (!lightbox) {
    return;
  }

  lightboxImage.src =
    photo.file;

  lightboxImage.alt =
    photo.alt ||
    photo.title ||
    "";

  lightboxTitle.textContent =
    photo.title ||
    "";

  if (photo.date) {
    lightboxDate.textContent =
      formatDate(
        photo.date
      );

    lightboxDate.hidden =
      false;

  } else {
    lightboxDate.textContent =
      "";

    lightboxDate.hidden =
      true;
  }

  const place =
    [
      photo.prefecture,
      photo.place
    ]
      .filter(Boolean)
      .join(" / ");

  lightboxPlace.textContent =
    place;

  lightboxPlace.hidden =
    !place;

  lightboxMeta.textContent =
    [
      ...(photo.tags || []),
      photo.meta || ""
    ]
      .filter(Boolean)
      .join(" / ");

  if (lightboxNote) {
    lightboxNote.textContent =
      photo.alt || "";
  }

  lightbox.showModal();
}


closeLightbox
  ?.addEventListener(
    "click",
    () =>
      lightbox.close()
  );


lightbox
  ?.addEventListener(
    "click",
    event => {
      const rect =
        lightbox
          .getBoundingClientRect();

      const inside =
        event.clientX >=
          rect.left &&
        event.clientX <=
          rect.right &&
        event.clientY >=
          rect.top &&
        event.clientY <=
          rect.bottom;

      if (!inside) {
        lightbox.close();
      }
    }
  );


document.addEventListener(
  "keydown",
  event => {
    if (
      event.key ===
        "Escape" &&
      lightbox?.open
    ) {
      lightbox.close();
    }
  }
);


/* ==============================
   RESIZE
============================== */

window.addEventListener(
  "resize",
  () => {
    clearTimeout(
      resizeTimer
    );

    resizeTimer =
      setTimeout(
        renderJapanMap,
        180
      );
  }
);


/* ==============================
   CLICK STAR
============================== */

document.addEventListener(
  "click",
  event => {

    createStarBurst(
      event.clientX,
      event.clientY
    );

    if (
      Math.random() <
      0.04
    ) {
      showCrowEvent();
    }
  }
);


function createStarBurst(
  x,
  y
) {
  const symbols = [
    "✦",
    "✧",
    "·"
  ];

  const count =
    3 +
    Math.floor(
      Math.random() *
      3
    );

  for (
    let i = 0;
    i < count;
    i++
  ) {
    const star =
      document.createElement(
        "span"
      );

    star.className =
      "click-star";

    star.textContent =
      symbols[
        Math.floor(
          Math.random() *
          symbols.length
        )
      ];

    star.style.left =
      `${x}px`;

    star.style.top =
      `${y}px`;

    const angle =
      Math.random() *
      Math.PI *
      2;

    const distance =
      18 +
      Math.random() *
      34;

    star.style.setProperty(
      "--star-x",
      `${
        Math.cos(angle) *
        distance
      }px`
    );

    star.style.setProperty(
      "--star-y",
      `${
        Math.sin(angle) *
        distance
      }px`
    );

    star.style.setProperty(
      "--star-r",
      `${
        Math.random() *
        100 -
        50
      }deg`
    );

    star.style.fontSize =
      `${
        8 +
        Math.random() *
        8
      }px`;

    document.body.appendChild(
      star
    );

    star.addEventListener(
      "animationend",
      () =>
        star.remove()
    );
  }
}


/* ==============================
   CRO
============================== */

function showCrowEvent() {
  if (
    !hasActiveCrow()
  ) {
    flyCrow();
  }
}


function hasActiveCrow() {
  return Boolean(
    document.querySelector(
      ".flying-crow, .perched-crow"
    )
  );
}


function flyCrow() {
  if (
    hasActiveCrow()
  ) {
    return;
  }

  const crow =
    document.createElement(
      "img"
    );

  crow.src =
    "crow-silhouette.png";

  crow.alt =
    "";

  crow.setAttribute(
    "aria-hidden",
    "true"
  );

  crow.className =
    "flying-crow";

  const fromLeft =
    Math.random() <
    0.5;

  const size =
    65 +
    Math.random() *
    25;

  const top =
    60 +
    Math.random() *
    window.innerHeight *
    0.45;

  const startX =
    fromLeft
      ? -(size + 20)
      : window.innerWidth +
        size +
        20;

  const endX =
    fromLeft
      ? window.innerWidth +
        size +
        20
      : -(size + 20);

  Object.assign(
    crow.style,
    {
      position:
        "fixed",

      zIndex:
        "99999",

      top:
        `${top}px`,

      left:
        `${startX}px`,

      width:
        `${size}px`,

      height:
        "auto",

      opacity:
        "0.9",

      cursor:
        "pointer",

      pointerEvents:
        "auto",

      touchAction:
        "manipulation"
    }
  );

  if (!fromLeft) {
    crow.style.transform =
      "scaleX(-1)";
  }

  document.body.appendChild(
    crow
  );

  crow.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      landCrow(
        crow
      );
    }
  );

  crow.addEventListener(
    "error",
    () =>
      crow.remove()
  );

  const animation =
    crow.animate(
      [
        {
          left:
            `${startX}px`,

          top:
            `${top}px`,

          opacity:
            0
        },

        {
          left:
            `${
              startX +
              (
                endX -
                startX
              ) *
              0.08
            }px`,

          top:
            `${top - 3}px`,

          opacity:
            0.9,

          offset:
            0.08
        },

        {
          left:
            `${endX}px`,

          top:
            `${top - 35}px`,

          opacity:
            0
        }
      ],

      {
        duration:
          4800,

        easing:
          "linear",

        fill:
          "forwards"
      }
    );

  crow._flightAnimation =
    animation;

  animation.addEventListener(
    "finish",
    () => {
      if (
        crow.isConnected
      ) {
        crow.remove();
      }
    }
  );
}


function landCrow(
  flyingCrow
) {
  if (
    !flyingCrow
      ?.isConnected
  ) {
    return;
  }

  const crowRect =
    flyingCrow
      .getBoundingClientRect();

  const crowX =
    crowRect.left +
    crowRect.width /
    2;

  const crowY =
    crowRect.top +
    crowRect.height /
    2;

  const candidates =
    [
      heroPhoto,
      dailyPhotoButton,
      ...document
        .querySelectorAll(
          ".gallery-item"
        )
    ]
      .filter(
        element => {
          if (!element) {
            return false;
          }

          const rect =
            element
              .getBoundingClientRect();

          return (
            rect.bottom >
              0 &&
            rect.top <
              window.innerHeight &&
            rect.right >
              0 &&
            rect.left <
              window.innerWidth
          );
        }
      );

  let nearest =
    null;

  let nearestDistance =
    Infinity;

  candidates.forEach(
    element => {

      const rect =
        element
          .getBoundingClientRect();

      const nearestX =
        Math.max(
          rect.left,
          Math.min(
            crowX,
            rect.right
          )
        );

      const distance =
        Math.hypot(
          crowX -
            nearestX,
          crowY -
            rect.top
        );

      if (
        distance <
        nearestDistance
      ) {
        nearestDistance =
          distance;

        nearest =
          element;
      }
    }
  );

  if (!nearest) {
    return;
  }

  if (
    flyingCrow
      ._flightAnimation
  ) {
    flyingCrow
      ._flightAnimation
      .cancel();
  }

  flyingCrow.remove();

  const rect =
    nearest
      .getBoundingClientRect();

  const crow =
    document.createElement(
      "img"
    );

  crow.src =
    "crow-perched.png";

  crow.alt =
    "";

  crow.setAttribute(
    "aria-hidden",
    "true"
  );

  crow.className =
    "perched-crow";

  const sideMargin =
    38;

  const perchX =
    Math.max(
      rect.left +
      sideMargin,

      Math.min(
        crowX,
        rect.right -
        sideMargin
      )
    );

  const perchY =
    rect.top -
    10;

  crow.style.left =
    `${perchX}px`;

  crow.style.top =
    `${perchY}px`;

  if (
    perchX >
    rect.left +
    rect.width /
    2
  ) {
    crow.classList.add(
      "flip"
    );
  }

  document.body.appendChild(
    crow
  );

  crow.style.animation =
    "crow-perch-in .35s ease-out forwards";

  setTimeout(
    () => {
      if (
        crow.isConnected
      ) {
        crow.style.animation =
          "crow-perch-idle 1.6s ease-in-out infinite";
      }
    },
    350
  );

  crow.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      sendPerchedCrowFlying(
        crow
      );
    }
  );

  crow.addEventListener(
    "error",
    () =>
      crow.remove()
  );

  const leaveTimer =
    setTimeout(
      () =>
        sendPerchedCrowFlying(
          crow
        ),
      8000
    );

  crow.dataset.leaveTimer =
    String(
      leaveTimer
    );
}


function sendPerchedCrowFlying(
  perchedCrow
) {
  if (
    !perchedCrow
      ?.isConnected
  ) {
    return;
  }

  const timerId =
    Number(
      perchedCrow
        .dataset
        .leaveTimer
    );

  if (timerId) {
    clearTimeout(
      timerId
    );
  }

  perchedCrow.style.animation =
    "crow-perch-out .45s ease-in forwards";

  setTimeout(
    () => {

      if (
        perchedCrow
          .isConnected
      ) {
        perchedCrow.remove();
      }

      flyCrow();
    },
    450
  );
}


/* ==============================
   DAILY PEEL STYLE
============================== */

function ensureDailyPeelStyles() {
  if (
    document.getElementById(
      "dailyPeelRuntimeStyles"
    )
  ) {
    return;
  }

  const style =
    document.createElement(
      "style"
    );

  style.id =
    "dailyPeelRuntimeStyles";

  style.textContent = `

    .daily-photo-wrap{
      position:relative !important;
      width:100%;
      overflow:hidden;
    }

    .daily-photo-card{
      position:relative;
      display:block;
      width:100%;
    }

    .daily-peel-cover{
      position:absolute !important;
      top:0;
      left:0;
      z-index:30;
      width:100%;
      aspect-ratio:4 / 5;

      background:
        linear-gradient(
          110deg,
          #f1f1ee 0%,
          #fafaf7 58%,
          #ecece8 100%
        );

      border:
        1px solid
        rgba(0,0,0,.08);

      cursor:grab;
      touch-action:none;
      user-select:none;
      -webkit-user-select:none;

      overflow:hidden;

      will-change:
        transform,
        opacity;
    }

    .daily-peel-cover:active{
      cursor:grabbing;
    }

    .daily-peel-inner{
      position:absolute;
      inset:0;

      display:flex;
      flex-direction:column;
      align-items:center;
      justify-content:center;

      padding:40px;

      text-align:center;

      pointer-events:none;
    }

    .daily-peel-small{
      margin-bottom:18px;

      color:
        var(
          --muted,
          #6e6e6a
        );

      font-size:9px;
      font-weight:600;
      letter-spacing:.2em;
    }

    .daily-peel-inner strong{
      font-size:
        clamp(
          20px,
          3vw,
          38px
        );

      font-weight:500;
      letter-spacing:-.03em;
    }

    .daily-peel-hint{
      position:absolute;
      right:30px;
      bottom:28px;

      color:
        var(
          --muted,
          #6e6e6a
        );

      font-size:9px;
      font-weight:600;
      letter-spacing:.18em;

      animation:
        daily-peel-hint
        1.8s
        ease-in-out
        infinite;
    }

    .daily-peel-edge{
      position:absolute;
      top:0;
      right:-20px;

      width:40px;
      height:100%;

      background:
        linear-gradient(
          90deg,
          rgba(0,0,0,.08),
          rgba(255,255,255,.85)
        );

      opacity:.45;

      pointer-events:none;
    }

    .daily-section:not(.is-revealed)
    .daily-photo-info{
      opacity:.18;
      filter:blur(3px);
      pointer-events:none;
    }

    .daily-section:not(.is-revealed)
    .daily-note-text{
      opacity:0;
    }

    .daily-photo-info,
    .daily-note-text{
      transition:
        opacity .65s ease,
        filter .65s ease;
    }

    .daily-section.is-revealed
    .daily-photo-info,

    .daily-section.is-revealed
    .daily-note-text{
      opacity:1;
      filter:none;
    }

    @keyframes daily-peel-hint{

      0%,
      100%{
        transform:
          translateX(0);
      }

      50%{
        transform:
          translateX(7px);
      }
    }

    @media(max-width:780px){

      .daily-peel-inner{
        padding:24px;
      }

      .daily-peel-hint{
        right:20px;
        bottom:20px;
      }
    }

  `;

  document.head.appendChild(
    style
  );
}


/* ==============================
   DAILY PEEL
============================== */

function setupDailyPeel() {
  if (
    !dailyPeelCover ||
    !dailySection
  ) {
    return;
  }

  ensureDailyPeelStyles();

  /*
    新しい保存キー。
    今までの失敗テストの記録に
    邪魔されない。
  */

  const STORAGE_KEY =
    "saq8DailyPhotoOpenedV3";

  const todayKey =
    getJapanDateKey();

  const savedDate =
    localStorage.getItem(
      STORAGE_KEY
    );

  /*
    初期状態
  */

  dailySection
    .classList
    .remove(
      "is-revealed"
    );

  dailyPeelCover
    .style
    .pointerEvents =
      "auto";

  dailyPeelCover
    .style
    .opacity =
      "1";

  dailyPeelCover
    .style
    .transform =
      "translateX(0) rotate(0deg)";

  dailyPeelCover
    .style
    .boxShadow =
      "none";

  dailyPeelCover
    .style
    .transition =
      "none";


  /*
    今日すでに開けた場合
  */

  if (
    savedDate ===
    todayKey
  ) {
    revealDailyPhoto(
      false
    );

    return;
  }


  let dragging =
    false;

  let startX =
    0;

  let currentX =
    0;

  let activePointerId =
    null;


  /*
    ブラウザ標準の
    ドラッグを止める
  */

  dailyPeelCover
    .addEventListener(
      "dragstart",
      event =>
        event.preventDefault()
    );


  /*
    ペリペリ開始
  */

  dailyPeelCover
    .addEventListener(
      "pointerdown",
      event => {

        if (
          event.pointerType ===
            "mouse" &&
          event.button !==
            0
        ) {
          return;
        }

        event.preventDefault();

        dragging =
          true;

        activePointerId =
          event.pointerId;

        startX =
          event.clientX;

        currentX =
          0;

        dailyPeelCover
          .style
          .transition =
            "none";

        try {
          dailyPeelCover
            .setPointerCapture(
              event.pointerId
            );

        } catch (_) {}
      }
    );


  /*
    ペリペリ中
  */

  dailyPeelCover
    .addEventListener(
      "pointermove",
      event => {

        if (
          !dragging ||
          event.pointerId !==
            activePointerId
        ) {
          return;
        }

        event.preventDefault();

        const width =
          Math.max(
            dailyPeelCover
              .getBoundingClientRect()
              .width,
            1
          );

       currentX =
  Math.min(
    Math.max(
      0,
      startX - event.clientX
    ),
    width
  );
        const progress =
          currentX /
          width;

        dailyPeelCover.style.transform =
  `translateX(-${currentX}px) rotate(${-progress * 2}deg)`;

        dailyPeelCover
          .style
          .boxShadow =
            `${-24 * progress}px 10px ${42 * progress}px rgba(0,0,0,${0.20 * progress})`;
      }
    );


  /*
    指を離す
  */

  dailyPeelCover
    .addEventListener(
      "pointerup",
      event => {

        if (
          !dragging ||
          event.pointerId !==
            activePointerId
        ) {
          return;
        }

        event.preventDefault();

        finishPointer(
          event.pointerId
        );

        finishDailyPeel();
      }
    );


  /*
    操作キャンセル
  */

  dailyPeelCover
    .addEventListener(
      "pointercancel",
      event => {

        if (
          !dragging ||
          event.pointerId !==
            activePointerId
        ) {
          return;
        }

        finishPointer(
          event.pointerId
        );

        resetDailyPeel();
      }
    );


  function finishPointer(
    pointerId
  ) {
    dragging =
      false;

    activePointerId =
      null;

    try {
      dailyPeelCover
        .releasePointerCapture(
          pointerId
        );

    } catch (_) {}
  }


  /*
    開封判定
  */

  function finishDailyPeel() {
    const width =
      Math.max(
        dailyPeelCover
          .getBoundingClientRect()
          .width,
        1
      );

    const progress =
      currentX /
      width;

    /*
      35％まで引けたら成功
    */

    if (
      progress >=
      0.35
    ) {
      localStorage.setItem(
        STORAGE_KEY,
        todayKey
      );

      revealDailyPhoto(
        true
      );

    } else {
      resetDailyPeel();
    }
  }


  /*
    足りなければ戻る
  */

  function resetDailyPeel() {
    dailyPeelCover
      .style
      .transition =
        "transform .48s cubic-bezier(.2,.8,.2,1), box-shadow .48s ease";

    dailyPeelCover
      .style
      .transform =
        "translateX(0) rotate(0deg)";

    dailyPeelCover
      .style
      .boxShadow =
        "none";

    currentX =
      0;
  }
}


/* ==============================
   REVEAL DAILY PHOTO
============================== */

function revealDailyPhoto(
  withEffect = true
) {
  if (
    !dailyPeelCover ||
    !dailySection
  ) {
    return;
  }

  dailySection
    .classList
    .add(
      "is-revealed"
    );

  dailyPeelCover
    .style
    .pointerEvents =
      "none";


  /*
    今日すでに開けてた場合
  */

  if (!withEffect) {
    dailyPeelCover
      .style
      .transition =
        "none";

    dailyPeelCover
      .style
      .transform =
        "translateX(110%) rotate(1.5deg)";

    dailyPeelCover
      .style
      .opacity =
        "0";

    dailyPeelCover
      .style
      .boxShadow =
        "none";

    return;
  }


  /*
    ペリッと最後まで抜ける
  */

  dailyPeelCover
    .style
    .transition =
      "transform .85s cubic-bezier(.16,.84,.24,1), opacity .55s ease, box-shadow .55s ease";


  requestAnimationFrame(
    () => {

      requestAnimationFrame(
        () => {

          dailyPeelCover
            .style
            .transform =
              "translateX(110%) rotate(2deg)";

          dailyPeelCover
            .style
            .opacity =
              "0";

          dailyPeelCover
            .style
            .boxShadow =
              "-30px 10px 45px rgba(0,0,0,.14)";
        }
      );
    }
  );


  /*
    開封時の星
  */

  const rect =
    dailyPhotoImage
      .getBoundingClientRect();

  const centerX =
    rect.left +
    rect.width /
    2;

  const centerY =
    rect.top +
    rect.height /
    2;


  createStarBurst(
    centerX,
    centerY
  );


  setTimeout(
    () =>
      createStarBurst(
        centerX - 50,
        centerY + 28
      ),
    120
  );


  setTimeout(
    () =>
      createStarBurst(
        centerX + 60,
        centerY - 18
      ),
    240
  );
}


/* ==============================
   GO
============================== */

loadSite();
