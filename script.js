const filterButtons = document.querySelectorAll(".filter");
const galleryItems = document.querySelectorAll(".gallery-item");

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    filterButtons.forEach(b => b.classList.remove("active"));
    button.classList.add("active");

    const filter = button.dataset.filter;
    galleryItems.forEach(item => {
      const show = filter === "all" || item.dataset.category === filter;
      item.classList.toggle("hidden", !show);
    });
  });
});

const lightbox = document.getElementById("lightbox");
const lightboxImage = document.getElementById("lightboxImage");
const lightboxTitle = document.getElementById("lightboxTitle");
const lightboxMeta = document.getElementById("lightboxMeta");
const closeLightbox = document.getElementById("closeLightbox");

galleryItems.forEach(item => {
  item.addEventListener("click", () => {
    const source = item.querySelector(".photo-placeholder");
    lightboxImage.style.background = getComputedStyle(source).background;
    lightboxImage.dataset.label = item.dataset.category.toUpperCase();
    lightboxTitle.textContent = item.dataset.title;
    lightboxMeta.textContent = item.dataset.meta;
    lightbox.showModal();
  });
});

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
