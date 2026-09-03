const galleryGrid = document.getElementById("galleryGrid");
const filtersContainer = document.getElementById("filters");
const heroPhoto = document.getElementById("heroPhoto");

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

let photos = [];
let currentPhotos = [];
let visibleCount = PAGE_SIZE;

async function loadGallery() {
  try {
    const response = await fetch("photos.json?v=5");

    if (!response.ok) {
      throw new Error(`photos.json の読み込みに失敗しました: ${response.status}`);
    }

    const data = await response.json();

    heroPhoto.style.backgroundImage = `url("${data.hero.file}")`;
    heroPhoto.setAttribute("aria-label", data.hero.alt || "メイン写真");

    photos = sortPhotosByDate(data.photos);

    createFilters(photos);
    applyFilter("all");

  } catch (error) {
    console.error(error);
    galleryGrid.innerHTML = `
      <p class="error-message">
        写真一覧を読み込めませんでした。
        photos.json の書き方やアップロード状態を確認してください。
      </p>
    `;
    moreButton.hidden = true;
  }
}

function sortPhotosByDate(photoList) {
  return photoList
    .map((photo, index) => ({ ...photo, _originalIndex: index }))
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

function createFilters(photoList) {
  const tags = [...new Set(
    photoList.flatMap(photo => photo.tags || [])
  )].sort();

  filtersContainer.innerHTML = "";

  const allButton = makeFilterButton("ALL", "all");
  allButton.classList.add("active");
  filtersContainer.appendChild(allButton);

  tags.forEach(tag => {
    filtersContainer.appendChild(makeFilterButton(tag, tag));
  });
}

function makeFilterButton(label, filterValue) {
  const button = document.createElement("button");
  button.className = "filter";
  button.textContent = label;
  button.dataset.filter = filterValue;

  button.addEventListener("click", () => {
    document.querySelectorAll(".filter")
      .forEach(btn => btn.classList.remove("active"));

    button.classList.add("active");
    applyFilter(filterValue);
  });

  return button;
}

function applyFilter(filterValue) {
  visibleCount = PAGE_SIZE;

  currentPhotos =
    filterValue === "all"
      ? photos
      : photos.filter(photo => (photo.tags || []).includes(filterValue));

  renderVisiblePhotos();
}

function renderVisiblePhotos() {
  galleryGrid.innerHTML = "";

  const visiblePhotos = currentPhotos.slice(0, visibleCount);

  visiblePhotos.forEach(photo => {
    const item = document.createElement("button");
    item.className = `gallery-item ${photo.layout || ""}`.trim();

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

    item.addEventListener("click", () => openLightbox(photo));

    galleryGrid.appendChild(item);
  });

  updateMoreButton();
}

function updateMoreButton() {
  const remaining = currentPhotos.length - visibleCount;

  if (remaining > 0) {
    moreButton.hidden = false;
    moreCount.textContent = `+${Math.min(PAGE_SIZE, remaining)}`;
  } else {
    moreButton.hidden = true;
    moreCount.textContent = "";
  }
}

moreButton.addEventListener("click", () => {
  visibleCount += PAGE_SIZE;
  renderVisiblePhotos();
});

function openLightbox(photo) {
  lightboxImage.src = photo.file;
  lightboxImage.alt = photo.alt || photo.title || "";
  lightboxTitle.textContent = photo.title || "";

  setOptionalText(
    lightboxDate,
    photo.date ? formatDate(photo.date) : ""
  );

  const location = [
    prefectureLabel(photo.prefecture),
    photo.place || ""
  ].filter(Boolean).join(" / ");

  setOptionalText(lightboxPlace, location);

  lightboxMeta.textContent = [
    ...(photo.tags || []),
    photo.meta || ""
  ].filter(Boolean).join(" / ");

  lightbox.showModal();
}

function setOptionalText(element, text) {
  element.textContent = text;
  element.hidden = !text;
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-");
  return `${year}.${month}.${day}`;
}

/*
  将来の日本地図でもこの prefecture コードを使う。
  SVG側の県にも AICHI / SHIZUOKA のようなIDを付ければ、
  photos.json の prefecture とそのまま照合できる。
*/
function prefectureLabel(code) {
  const labels = {
    HOKKAIDO:"北海道",
    AOMORI:"青森県",
    IWATE:"岩手県",
    MIYAGI:"宮城県",
    AKITA:"秋田県",
    YAMAGATA:"山形県",
    FUKUSHIMA:"福島県",
    IBARAKI:"茨城県",
    TOCHIGI:"栃木県",
    GUNMA:"群馬県",
    SAITAMA:"埼玉県",
    CHIBA:"千葉県",
    TOKYO:"東京都",
    KANAGAWA:"神奈川県",
    NIIGATA:"新潟県",
    TOYAMA:"富山県",
    ISHIKAWA:"石川県",
    FUKUI:"福井県",
    YAMANASHI:"山梨県",
    NAGANO:"長野県",
    GIFU:"岐阜県",
    SHIZUOKA:"静岡県",
    AICHI:"愛知県",
    MIE:"三重県",
    SHIGA:"滋賀県",
    KYOTO:"京都府",
    OSAKA:"大阪府",
    HYOGO:"兵庫県",
    NARA:"奈良県",
    WAKAYAMA:"和歌山県",
    TOTTORI:"鳥取県",
    SHIMANE:"島根県",
    OKAYAMA:"岡山県",
    HIROSHIMA:"広島県",
    YAMAGUCHI:"山口県",
    TOKUSHIMA:"徳島県",
    KAGAWA:"香川県",
    EHIME:"愛媛県",
    KOCHI:"高知県",
    FUKUOKA:"福岡県",
    SAGA:"佐賀県",
    NAGASAKI:"長崎県",
    KUMAMOTO:"熊本県",
    OITA:"大分県",
    MIYAZAKI:"宮崎県",
    KAGOSHIMA:"鹿児島県",
    OKINAWA:"沖縄県"
  };

  return labels[code] || "";
}

closeLightbox.addEventListener("click", () => lightbox.close());

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

loadGallery();
