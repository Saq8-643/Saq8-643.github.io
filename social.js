(() => {
  const start = () => {

    const url = window.SAQ8_SUPABASE_URL;
    const key = window.SAQ8_SUPABASE_PUBLISHABLE_KEY;

    const lightbox = document.getElementById("lightbox");
    const image = document.getElementById("lightboxImage");

    const likeButton = document.getElementById("photoLikeButton");
    const likeHeart = document.getElementById("photoLikeHeart");
    const likeCount = document.getElementById("photoLikeCount");

    const commentCount = document.getElementById("commentCount");
    const commentsList = document.getElementById("commentsList");
    const commentForm = document.getElementById("commentForm");
    const commentName = document.getElementById("commentName");
    const commentBody = document.getElementById("commentBody");
    const commentSend = document.getElementById("commentSend");
    const message = document.getElementById("socialMessage");


    if (
      !lightbox ||
      !image ||
      !likeButton ||
      !likeHeart ||
      !likeCount ||
      !commentCount ||
      !commentsList ||
      !commentForm ||
      !commentName ||
      !commentBody ||
      !commentSend ||
      !message
    ) {
      console.error("Saq8 Social: HTML element missing");
      return;
    }


    if (!url || !key || !window.supabase) {
      message.textContent = "DATABASE CONNECTION ERROR";
      return;
    }


    const db = window.supabase.createClient(url, key);


    function getPhotoId() {
      const src = image.getAttribute("src");

      if (!src) return "";

      return decodeURIComponent(
        src.split("?")[0].split("/").pop() || ""
      );
    }


    function getVisitorId() {
      const storageKey = "saq8VisitorId";

      let id = localStorage.getItem(storageKey);

      if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem(storageKey, id);
      }

      return id;
    }


    async function makeVisitorHash(photoId) {
      const text = `${getVisitorId()}:${photoId}`;

      const bytes = new TextEncoder().encode(text);

      const digest = await crypto.subtle.digest(
        "SHA-256",
        bytes
      );

      return Array.from(new Uint8Array(digest))
        .map(value =>
          value.toString(16).padStart(2, "0")
        )
        .join("");
    }


    function likeStorageKey(photoId) {
      return `saq8Liked:${photoId}`;
    }


    function updateHeart(photoId) {
      const liked =
        localStorage.getItem(
          likeStorageKey(photoId)
        ) === "1";

      likeHeart.textContent = liked ? "♥" : "♡";

      likeButton.classList.toggle(
        "is-liked",
        liked
      );
    }


    async function loadLikes(photoId) {
      if (!photoId) return;

      likeCount.textContent = "…";

      const { data, error } = await db.rpc(
        "get_photo_like_count",
        {
          p_photo_id: photoId
        }
      );

      if (error) {
        console.error(error);
        likeCount.textContent = "—";
        message.textContent =
          `LIKE ERROR: ${error.message}`;
        return;
      }

      likeCount.textContent =
        String(Number(data || 0));

      updateHeart(photoId);
    }


    likeButton.addEventListener(
      "click",
      async event => {

        event.preventDefault();
        event.stopPropagation();

        const photoId = getPhotoId();

        if (!photoId) {
          message.textContent =
            "写真を認識できませんでした。";
          return;
        }


        if (
          localStorage.getItem(
            likeStorageKey(photoId)
          ) === "1"
        ) {
          message.textContent =
            "この写真にはいいね済みです。";
          return;
        }


        likeButton.disabled = true;
        message.textContent = "送信中…";


        try {
          const visitorHash =
            await makeVisitorHash(photoId);

          const { error } = await db
            .from("photo_likes")
            .insert({
              photo_id: photoId,
              visitor_hash: visitorHash
            });


          if (
            error &&
            error.code !== "23505"
          ) {
            throw error;
          }


          localStorage.setItem(
            likeStorageKey(photoId),
            "1"
          );

          message.textContent =
            "いいねしました。";

          await loadLikes(photoId);

        } catch (error) {
          console.error(error);

          message.textContent =
            `LIKE ERROR: ${
              error.message ||
              "送信できませんでした"
            }`;

        } finally {
          likeButton.disabled = false;
        }
      }
    );


    function formatDate(value) {
      return new Intl.DateTimeFormat(
        "ja-JP",
        {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }
      ).format(new Date(value));
    }


    async function loadComments(photoId) {
      if (!photoId) return;

      commentsList.innerHTML = "";

      const loading =
        document.createElement("p");

      loading.className =
        "comments-empty";

      loading.textContent =
        "読み込み中…";

      commentsList.appendChild(loading);


      const { data, error } = await db
        .from("photo_comments")
        .select(
          "id, display_name, body, created_at"
        )
        .eq("photo_id", photoId)
        .eq("is_visible", true)
        .order(
          "created_at",
          { ascending: true }
        )
        .limit(50);


      if (error) {
        console.error(error);

        commentsList.innerHTML = "";

        const errorText =
          document.createElement("p");

        errorText.className =
          "comments-empty";

        errorText.textContent =
          "コメントを読み込めませんでした。";

        commentsList.appendChild(
          errorText
        );

        message.textContent =
          `COMMENT ERROR: ${error.message}`;

        return;
      }


      const comments = data || [];

      commentCount.textContent =
        String(comments.length);

      commentsList.innerHTML = "";


      if (!comments.length) {
        const empty =
          document.createElement("p");

        empty.className =
          "comments-empty";

        empty.textContent =
          "まだコメントはありません。";

        commentsList.appendChild(empty);

        return;
      }


      comments.forEach(comment => {

        const item =
          document.createElement("article");

        item.className =
          "comment-item";


        const header =
          document.createElement("div");

        header.className =
          "comment-header";


        const name =
          document.createElement("span");

        name.className =
          "comment-name";

        name.textContent =
          comment.display_name ||
          "Anonymous";


        const date =
          document.createElement("time");

        date.className =
          "comment-date";

        date.textContent =
          formatDate(comment.created_at);


        const body =
          document.createElement("p");

        body.className =
          "comment-body";

        body.textContent =
          comment.body;


        header.append(name, date);
        item.append(header, body);

        commentsList.appendChild(item);
      });
    }


    commentForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();
        event.stopPropagation();

        const photoId = getPhotoId();

        if (!photoId) {
          message.textContent =
            "写真を認識できませんでした。";
          return;
        }


        const name =
          commentName.value
            .trim()
            .slice(0, 30);

        const body =
          commentBody.value
            .trim()
            .slice(0, 300);


        if (!body) {
          message.textContent =
            "コメントを書いてください。";
          return;
        }


        if (
          /https?:\/\/|www\./i.test(body)
        ) {
          message.textContent =
            "URLを含むコメントは送信できません。";
          return;
        }


        const now = Date.now();

        const lastComment =
          Number(
            localStorage.getItem(
              "saq8LastCommentAt"
            ) || 0
          );


        if (
          now - lastComment < 20000
        ) {
          message.textContent =
            "少し待ってから送信してください。";
          return;
        }


        commentSend.disabled = true;
        message.textContent = "送信中…";


        try {
          const { error } = await db
            .from("photo_comments")
            .insert({
              photo_id: photoId,
              display_name:
                name || "Anonymous",
              body
            });


          if (error) {
            throw error;
          }


          localStorage.setItem(
            "saq8LastCommentAt",
            String(now)
          );


          if (name) {
            localStorage.setItem(
              "saq8CommentName",
              name
            );
          }


          commentBody.value = "";

          message.textContent =
            "コメントを送信しました。";

          await loadComments(photoId);

        } catch (error) {
          console.error(error);

          message.textContent =
            `COMMENT ERROR: ${
              error.message ||
              "送信できませんでした"
            }`;

        } finally {
          commentSend.disabled = false;
        }
      }
    );


    async function loadCurrentPhoto() {
      const photoId = getPhotoId();

      if (!photoId) return;

      message.textContent = "";

      updateHeart(photoId);

      await Promise.all([
        loadLikes(photoId),
        loadComments(photoId)
      ]);
    }


    const savedName =
      localStorage.getItem(
        "saq8CommentName"
      );

    if (savedName) {
      commentName.value = savedName;
    }


    const imageObserver =
      new MutationObserver(() => {
        loadCurrentPhoto();
      });

    imageObserver.observe(
      image,
      {
        attributes: true,
        attributeFilter: ["src"]
      }
    );


    const dialogObserver =
      new MutationObserver(() => {
        if (
          lightbox.hasAttribute("open")
        ) {
          loadCurrentPhoto();
        }
      });

    dialogObserver.observe(
      lightbox,
      {
        attributes: true,
        attributeFilter: ["open"]
      }
    );


    if (image.getAttribute("src")) {
      loadCurrentPhoto();
    }
  };


  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      start
    );
  } else {
    start();
  }

})();
