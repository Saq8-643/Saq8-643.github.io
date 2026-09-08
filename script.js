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


/* ---------------------------------
   起動
--------------------------------- */

async function loadSite() {
  try {
    const response = await fetch("photos.json?v=14");

    if (!response.ok) {
      throw new Error(
        `photos.json の読み込みに失敗しました: ${response.status}`
      );
    }

    const data = await response.json();

    heroPhoto.style.backgroundImage =
      `url("${data.hero.file}")`;

    heroPhoto.setAttribute(
      "aria-label",
      data.hero.alt || "メイン写真"
    );

    photos = sortPhotosByDate(data.photos);

    renderDailyPhoto();
    setupDailyPeel();
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
    .map((photo, index) => ({
      ...photo,
      _originalIndex: index
    }))
    .sort((a, b) => {
      const aHasDate = Boolean(a.date);
      const bHasDate = Boolean(b.date);

      if (aHasDate && bHasDate) {
        const dateDiff =
          new Date(b.date) - new Date(a.date);

        if (dateDiff !== 0) {
          return dateDiff;
        }

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

  const index =
    getDailyPhotoIndex(
      todayKey,
      photos.length
    );

  const photo = photos[index];

  dailyPhotoImage.src =
    photo.file;

  dailyPhotoImage.alt =
    photo.alt ||
    photo.title ||
    "";

  dailyPhotoTitle.textContent =
    photo.title || "Untitled";

  const place = [
    photo.prefecture || "",
    photo.place || ""
  ]
    .filter(Boolean)
    .join(" / ");

  dailyPhotoPlace.textContent =
    place;

  if (photo.date) {
    dailyPhotoDate.textContent =
      formatDate(photo.date);

    dailyPhotoDate.hidden = false;
  } else {
    dailyPhotoDate.textContent = "";
    dailyPhotoDate.hidden = true;
  }

  dailyPhotoTags.textContent =
    (photo.tags || []).join(" / ");

  dailyPhotoNote.textContent =
    photo.alt || "";

  dailyPhotoButton.onclick = () => {
    openLightbox(photo);
  };
}


/* ---------------------------------
   日本時間の「今日」を取得
--------------------------------- */

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
    ).formatToParts(new Date());

  const year =
    parts.find(
      part =>
        part.type === "year"
    ).value;

  const month =
    parts.find(
      part =>
        part.type === "month"
    ).value;

  const day =
    parts.find(
      part =>
        part.type === "day"
    ).value;

  return `${year}-${month}-${day}`;
}


/* ---------------------------------
   日付から毎日同じ写真番号を作る
--------------------------------- */

function getDailyPhotoIndex(
  dateKey,
  photoCount
) {
  let hash = 2166136261;

  for (
    let i = 0;
    i < dateKey.length;
    i++
  ) {
    hash ^= dateKey.charCodeAt(i);

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


/* ---------------------------------
   日本地図
--------------------------------- */

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

  mapContainer.innerHTML = "";

  const photographedCodes =
    getPhotographedPrefectureCodes();

  const areas = [];

  for (
    let code = 1;
    code <= 47;
    code++
  ) {
    let color = MAP_EMPTY;

    if (
      photographedCodes.has(code)
    ) {
      color = MAP_VISITED;
    }

    if (
      currentPrefectureCode === code
    ) {
      color = MAP_SELECTED;
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
      borderLineColor: "#ffffff",

      onSelect(data) {
        selectPrefecture(
          Number(data.code),
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

  const matchingPhoto =
    photos.find(
      photo =>
        Number(
          photo.prefectureCode
        ) === code
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

  document
    .getElementById("gallery")
    .scrollIntoView({
      behavior: "smooth",
      block: "start"
    });

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
  if (
    currentPrefectureCode === null
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
      count === 1 ? "" : "S"
    }`;

  clearMapFilter.hidden =
    false;

  galleryHeading.textContent =
    currentPrefectureName;
}


clearMapFilter.addEventListener(
  "click",
  clearPrefecture
);


/* ---------------------------------
   タグ
--------------------------------- */

function createFilters() {
  const tags = [
    ...new Set(
      photos.flatMap(
        photo =>
          photo.tags || []
      )
    )
  ].sort();

  filtersContainer.innerHTML =
    "";

  filtersContainer.appendChild(
    makeFilterButton(
      "ALL",
      "all",
      true
    )
  );

  tags.forEach(tag => {
    filtersContainer.appendChild(
      makeFilterButton(
        tag,
        tag,
        false
      )
    );
  });
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
      currentTag = value;
      visibleCount = PAGE_SIZE;

      setActiveTagButton(
        value
      );

      applyFilters();
    }
  );

  return button;
}


function setActiveTagButton(value) {
  document
    .querySelectorAll(".filter")
    .forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.filter ===
          value
      );
    });
}


/* ---------------------------------
   地図 + タグ
--------------------------------- */

function applyFilters() {
  currentPhotos =
    photos.filter(photo => {
      const prefectureOK =
        currentPrefectureCode ===
          null ||
        Number(
          photo.prefectureCode
        ) ===
          currentPrefectureCode;

      const tagOK =
        currentTag === "all" ||
        (photo.tags || [])
          .includes(
            currentTag
          );

      return (
        prefectureOK &&
        tagOK
      );
    });

  renderVisiblePhotos();
  updateMapStatus();
}


/* ---------------------------------
   ギャラリー
--------------------------------- */

function renderVisiblePhotos() {
  galleryGrid.innerHTML =
    "";

  const visiblePhotos =
    currentPhotos.slice(
      0,
      visibleCount
    );

  if (
    visiblePhotos.length === 0
  ) {
    galleryGrid.innerHTML = `
      <p class="empty-gallery">
        ここには、まだ写真がありません。
      </p>
    `;

    moreButton.hidden = true;

    return;
  }

  visiblePhotos.forEach(
    (photo, index) => {
      const item =
        document.createElement(
          "button"
        );

      item.className =
        `gallery-item ${
          photo.layout || ""
        }`.trim();

      const directions = [
        [-180, 90, -7],
        [160, -100, 6],
        [-120, -140, -5],
        [190, 80, 8],
        [20, 150, -6],
        [-170, 30, 7]
      ];

      const [x, y, r] =
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
        photo.title || "";

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
        () => {
          openLightbox(photo);
        }
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

  if (remaining > 0) {
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


moreButton.addEventListener(
  "click",
  () => {
    visibleCount +=
      PAGE_SIZE;

    renderVisiblePhotos();
  }
);


/* ---------------------------------
   拡大表示
--------------------------------- */

function openLightbox(photo) {
  lightboxImage.src =
    photo.file;

  lightboxImage.alt =
    photo.alt ||
    photo.title ||
    "";

  lightboxTitle.textContent =
    photo.title || "";

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

  const place = [
    photo.prefecture || "",
    photo.place || ""
  ]
    .filter(Boolean)
    .join(" / ");

  if (place) {
    lightboxPlace.textContent =
      place;

    lightboxPlace.hidden =
      false;

  } else {
    lightboxPlace.textContent =
      "";

    lightboxPlace.hidden =
      true;
  }

  lightboxMeta.textContent = [
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


function formatDate(dateString) {
  const [
    year,
    month,
    day
  ] =
    dateString.split("-");

  return `${year}.${month}.${day}`;
}


closeLightbox.addEventListener(
  "click",
  () => {
    lightbox.close();
  }
);


lightbox.addEventListener(
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
      event.key === "Escape" &&
      lightbox.open
    ) {
      lightbox.close();
    }
  }
);


/* ---------------------------------
   地図のレスポンシブ再描画
--------------------------------- */

window.addEventListener(
  "resize",
  () => {
    clearTimeout(
      resizeTimer
    );

    resizeTimer =
      setTimeout(
        () => {
          renderJapanMap();
        },
        180
      );
  }
);


/* ---------------------------------
   クリックした場所に星
--------------------------------- */

document.addEventListener(
  "click",
  event => {
    createStarBurst(
      event.clientX,
      event.clientY
    );

    /* 約25クリックに1回クロ助 */
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

  const starCount =
    3 +
    Math.floor(
      Math.random() * 3
    );

  for (
    let i = 0;
    i < starCount;
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

    const moveX =
      Math.cos(angle) *
      distance;

    const moveY =
      Math.sin(angle) *
      distance;

    star.style.setProperty(
      "--star-x",
      `${moveX}px`
    );

    star.style.setProperty(
      "--star-y",
      `${moveY}px`
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
      () => {
        star.remove();
      }
    );
  }
}


/* ---------------------------------
   クロ助イベント
--------------------------------- */

function showCrowEvent() {
  if (hasActiveCrow()) {
    return;
  }

  flyCrow();
}


function hasActiveCrow() {
  return Boolean(
    document.querySelector(
      ".flying-crow, .perched-crow"
    )
  );
}


/* ---------------------------------
   飛ぶクロ助
--------------------------------- */

function flyCrow() {
  if (hasActiveCrow()) {
    return;
  }

  const crow =
    document.createElement(
      "img"
    );

  crow.src =
    "crow-silhouette.png";

  crow.alt = "";

  crow.setAttribute(
    "aria-hidden",
    "true"
  );

  crow.className =
    "flying-crow";

  const fromLeft =
    Math.random() < 0.5;

  const size =
    65 +
    Math.random() *
    25;

  const top =
    60 +
    Math.random() *
    (
      window.innerHeight *
      0.45
    );

  crow.style.position =
    "fixed";

  crow.style.zIndex =
    "99999";

  crow.style.top =
    `${top}px`;

  crow.style.width =
    `${size}px`;

  crow.style.height =
    "auto";

  crow.style.opacity =
    "0.9";

  crow.style.cursor =
    "pointer";

  crow.style.pointerEvents =
    "auto";

  crow.style.touchAction =
    "manipulation";

  if (fromLeft) {
    crow.style.left =
      `-${size + 20}px`;

  } else {
    crow.style.left =
      `${
        window.innerWidth +
        size +
        20
      }px`;

    crow.style.transform =
      "scaleX(-1)";
  }

  document.body.appendChild(
    crow
  );

  /*
    クロ助をタップ。
    写真がある場所なら着地。
    なければそのまま飛ぶ。
  */
  crow.addEventListener(
    "click",
    event => {
      event.stopPropagation();

      landCrow(crow);
    }
  );

  crow.addEventListener(
    "error",
    () => {
      console.error(
        "クロ助画像が見つかりません"
      );

      crow.remove();
    }
  );

  const startX =
    fromLeft
      ? -(size + 20)
      : (
          window.innerWidth +
          size +
          20
        );

  const endX =
    fromLeft
      ? (
          window.innerWidth +
          size +
          20
        )
      : -(size + 20);

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
        duration: 4800,
        easing: "linear",
        fill: "forwards"
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


/* ---------------------------------
   クロ助を写真へ着地
--------------------------------- */

function landCrow(
  flyingCrow
) {
  if (
    !flyingCrow?.isConnected
  ) {
    return;
  }

  const crowRect =
    flyingCrow
      .getBoundingClientRect();

  const crowX =
    crowRect.left +
    crowRect.width / 2;

  const crowY =
    crowRect.top +
    crowRect.height / 2;

  /*
    画面内に見えている
    HERO・今日の1枚・
    ギャラリーを候補にする
  */
  const candidates = [
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
          rect.bottom > 0 &&
          rect.top <
            window.innerHeight &&
          rect.right > 0 &&
          rect.left <
            window.innerWidth
        );
      }
    );

  let nearest = null;

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
          crowX - nearestX,
          crowY - rect.top
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

  /*
    写真がなければ
    クロ助は迷子にならず
    そのまま飛ぶ
  */
  if (!nearest) {
    return;
  }

  /*
    止まれる写真がある時だけ
    飛行を停止
  */
  if (
    flyingCrow
      ._flightAnimation
  ) {
    flyingCrow
      ._flightAnimation
      .cancel();
  }

  flyingCrow.style.animation =
    "none";

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

  crow.alt = "";

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
    rect.top - 10;

  crow.style.left =
    `${perchX}px`;

  crow.style.top =
    `${perchY}px`;

  /*
    写真の中央を向く
  */
  const photoCenter =
    rect.left +
    rect.width / 2;

  if (
    perchX >
    photoCenter
  ) {
    crow.classList.add(
      "flip"
    );
  }

  document.body.appendChild(
    crow
  );

  /*
    着地
  */
  crow.style.animation =
    "crow-perch-in .35s ease-out forwards";

  /*
    ちょこん
  */
  setTimeout(
    () => {
      if (
        !crow.isConnected
      ) {
        return;
      }

      crow.style.animation =
        "crow-perch-idle 1.6s ease-in-out infinite";
    },
    350
  );

  /*
    止まったクロ助を
    タップすると再出発
  */
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
    () => {
      crow.remove();
    }
  );

  /*
    放っておいても
    8秒で帰る
  */
  const leaveTimer =
    setTimeout(
      () => {
        sendPerchedCrowFlying(
          crow
        );
      },
      8000
    );

  crow.dataset.leaveTimer =
    String(leaveTimer);
}


/* ---------------------------------
   止まったクロ助が再出発
--------------------------------- */

function sendPerchedCrowFlying(
  perchedCrow
) {
  if (
    !perchedCrow?.isConnected
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


/* ---------------------------------
   今日の1枚 ペリペリ
--------------------------------- */

function setupDailyPeel() {
  if (
    !dailyPeelCover ||
    !dailySection
  ) {
    return;
  }

  const todayKey =
    getJapanDateKey();

  const savedDate =
    localStorage.getItem(
      "dailyPhotoOpened"
    );

  /*
    今日すでに開けていたら
    最初から写真を表示
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

  /*
    カバーを触った時に
    親の「写真を開くクリック」
    が発動しないようにする
  */
  dailyPeelCover.addEventListener(
    "click",
    event => {
      event.preventDefault();
      event.stopPropagation();
    }
  );

  dailyPeelCover.addEventListener(
    "pointerdown",
    event => {
      dragging = true;

      startX =
        event.clientX;

      currentX = 0;

      dailyPeelCover
        .setPointerCapture(
          event.pointerId
        );

      dailyPeelCover
        .style
        .transition =
          "none";
    }
  );

  dailyPeelCover.addEventListener(
    "pointermove",
    event => {
      if (!dragging) {
        return;
      }

      const movement =
        Math.max(
          0,
          event.clientX -
          startX
        );

      const width =
        dailyPeelCover
          .offsetWidth;

      currentX =
        Math.min(
          movement,
          width
        );

      const progress =
        currentX /
        width;

      dailyPeelCover
        .style
        .transform =
          `translateX(${currentX}px) rotate(${progress * 1.5}deg)`;

      dailyPeelCover
        .style
        .boxShadow =
          `${-18 * progress}px 8px ${35 * progress}px rgba(0,0,0,${0.18 * progress})`;
    }
  );

  dailyPeelCover.addEventListener(
    "pointerup",
    () => {
      if (!dragging) {
        return;
      }

      dragging = false;

      finishDailyPeel();
    }
  );

  dailyPeelCover.addEventListener(
    "pointercancel",
    () => {
      if (!dragging) {
        return;
      }

      dragging = false;

      resetDailyPeel();
    }
  );


  function finishDailyPeel() {
    const width =
      dailyPeelCover
        .offsetWidth;

    const progress =
      currentX /
      width;

    /*
      45%以上めくったら
      OPEN成功
    */
    if (
      progress >=
      0.45
    ) {
      localStorage.setItem(
        "dailyPhotoOpened",
        todayKey
      );

      revealDailyPhoto(
        true
      );

    } else {
      resetDailyPeel();
    }
  }


  function resetDailyPeel() {
    dailyPeelCover
      .style
      .transition =
        "transform .45s ease, box-shadow .45s ease";

    dailyPeelCover
      .style
      .transform =
        "translateX(0) rotate(0deg)";

    dailyPeelCover
      .style
      .boxShadow =
        "none";
  }
}


/* ---------------------------------
   今日の1枚を開く
--------------------------------- */

function revealDailyPhoto(
  withEffect = true
) {
  if (
    !dailyPeelCover ||
    !dailySection
  ) {
    return;
  }

  dailySection.classList.add(
    "is-revealed"
  );

  dailyPeelCover.classList.add(
    "is-finishing"
  );

  requestAnimationFrame(
    () => {
      dailyPeelCover
        .classList
        .add(
          "is-open"
        );
    }
  );

  /*
    開いた瞬間だけ
    星をいつもより多めに
  */
  if (
    withEffect &&
    typeof createStarBurst ===
      "function"
  ) {
    const rect =
      dailyPhotoImage
        .getBoundingClientRect();

    const centerX =
      rect.left +
      rect.width / 2;

    const centerY =
      rect.top +
      rect.height / 2;

    createStarBurst(
      centerX,
      centerY
    );

    setTimeout(
      () => {
        createStarBurst(
          centerX - 45,
          centerY + 25
        );
      },
      120
    );

    setTimeout(
      () => {
        createStarBurst(
          centerX + 55,
          centerY - 15
        );
      },
      240
    );
  }
}


/* ---------------------------------
   GO
--------------------------------- */

loadSite();
