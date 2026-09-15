alert("SOCIAL JS OK");

const likeButton = document.getElementById("photoLikeButton");
const commentForm = document.getElementById("commentForm");

likeButton.addEventListener("click", () => {
  alert("LIKE JS OK");
});

commentForm.addEventListener("submit", (event) => {
  event.preventDefault();
  alert("COMMENT JS OK");
});
