const galleryGrid = document.getElementById("galleryGrid");
const filtersContainer = document.getElementById("filters");
const heroPhoto = document.getElementById("heroPhoto");

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxMeta = document.getElementById("lightboxMeta");
const closeLightbox = document.getElementById("closeLightbox");

let photos = [];

async function loadGallery() {
  try {
    // ?v=3 はブラウザキャッシュ対策
    const response = await fetch("photos.json?v=3");

    if (!response.ok) {
      throw new Error(`photos.json の読み込みに失敗しました: ${response.status}`);
    }

    const data = await response.json();

    heroPhoto.style.backgroundImage = `url("${data.hero.file}")`;
    heroPhoto.setAttribute("aria-label", data.hero.alt || "メイン写真");

    photos = data.photos;

    createFilters(photos);
    renderGallery(photos);

  } catch (error) {
    console.error(error);
    galleryGrid.innerHTML = `
      <p class="error-message">
        写真一覧を読み込めませんでした。GitHub Pages上で開いているか、
        photos.json がアップロードされているか確認してください。
      </p>
    `;
  }
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

    const filtered =
      filterValue === "all"
        ? photos
        : photos.filter(photo => (photo.tags || []).includes(filterValue));

    renderGallery(filtered);
  });

  return button;
}

function renderGallery(photoList) {
  galleryGrid.innerHTML = "";

  photoList.forEach(photo => {
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
}

function openLightbox(photo) {
  lightboxImage.src = photo.file;
  lightboxImage.alt = photo.alt || photo.title || "";
  lightboxTitle.textContent = photo.title || "";
  lightboxMeta.textContent = [
    ...(photo.tags || []),
    photo.meta || ""
  ].filter(Boolean).join(" / ");

  lightbox.showModal();
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
