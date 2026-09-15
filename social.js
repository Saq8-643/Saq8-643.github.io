(() => {
  if (window.__SAQ8_SOCIAL__) return;
  window.__SAQ8_SOCIAL__ = true;

  const url = window.SAQ8_SUPABASE_URL;
  const key = window.SAQ8_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key || !window.supabase) {
    console.error("Saq8 Social: Supabase connection error");
    return;
  }

  const db = window.supabase.createClient(url, key);


  function el(id) {
    return document.getElementById(id);
  }


  function message(text) {
    const target = el("socialMessage");

    if (target) {
      target.textContent = text;
    }
  }


  function getPhotoId() {
    const image = el("lightboxImage");

    if (!image) return "";

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
      id =
        window.crypto?.randomUUID?.() ||
        `${Date.now()}-${Math.random()}`;

      localStorage.setItem(storageKey, id);
    }

    return id;
  }


  async function makeVisitorHash(photoId) {
    const text =
      `${getVisitorId()}:${photoId}`;

    const bytes =
      new TextEncoder().encode(text);

    const digest =
      await crypto.subtle.digest(
        "SHA-256",
        bytes
      );

    return Array.from(
      new Uint8Array(digest)
    )
      .map(v =>
        v.toString(16).padStart(2, "0")
      )
      .join("");
  }


  function likeKey(photoId) {
    return `saq8Liked:${photoId}`;
  }


  function showHeart(photoId) {
    const heart = el("photoLikeHeart");

    if (!heart) return;

    const liked =
      localStorage.getItem(
        likeKey(photoId)
      ) === "1";

    heart.textContent =
      liked ? "♥" : "♡";
  }


  async function loadLikes(photoId) {
    const count = el("photoLikeCount");

    if (!count || !photoId) return;

    count.textContent = "…";

    const { data, error } =
      await db.rpc(
        "get_photo_like_count",
        {
          p_photo_id: photoId
        }
      );

    if (error) {
      console.error(error);

      count.textContent = "—";

      message(
        `LIKE ERROR: ${error.message}`
      );

      return;
    }

    count.textContent =
      String(Number(data || 0));

    showHeart(photoId);
  }


  function makeCommentElement(comment) {
    const item =
      document.createElement("article");

    item.className = "comment-item";


    const header =
      document.createElement("div");

    header.className = "comment-header";


    const name =
      document.createElement("span");

    name.className = "comment-name";

    name.textContent =
      comment.display_name ||
      "Anonymous";


    const date =
      document.createElement("time");

    date.className = "comment-date";

    date.textContent =
      new Intl.DateTimeFormat(
        "ja-JP",
        {
          timeZone: "Asia/Tokyo",
          year: "numeric",
          month: "2-digit",
          day: "2-digit"
        }
      ).format(
        new Date(comment.created_at)
      );


    const body =
      document.createElement("p");

    body.className = "comment-body";

    body.textContent = comment.body;


    header.append(name, date);
    item.append(header, body);

    return item;
  }


  async function loadComments(photoId) {
    const list = el("commentsList");
    const count = el("commentCount");

    if (!list || !count || !photoId) {
      return;
    }

    list.textContent = "読み込み中…";


    const { data, error } =
      await db
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

      list.textContent =
        "コメントを読み込めませんでした。";

      message(
        `COMMENT ERROR: ${error.message}`
      );

      return;
    }


    const comments = data || [];

    count.textContent =
      String(comments.length);

    list.innerHTML = "";


    if (!comments.length) {
      const empty =
        document.createElement("p");

      empty.className =
        "comments-empty";

      empty.textContent =
        "まだコメントはありません。";

      list.appendChild(empty);

      return;
    }


    comments.forEach(comment => {
      list.appendChild(
        makeCommentElement(comment)
      );
    });
  }


  async function loadCurrentPhoto() {
    const photoId = getPhotoId();

    if (!photoId) return;

    message("");

    showHeart(photoId);

    await Promise.all([
      loadLikes(photoId),
      loadComments(photoId)
    ]);
  }


  /* ==============================
     LIKE
     要素が後から出ても反応する
  ============================== */

  document.addEventListener(
    "click",
    async event => {

      const button =
        event.target.closest(
          "#photoLikeButton"
        );

      if (!button) return;


      event.preventDefault();
      event.stopPropagation();


      const photoId = getPhotoId();

      if (!photoId) {
        message(
          "写真を認識できませんでした。"
        );
        return;
      }


      if (
        localStorage.getItem(
          likeKey(photoId)
        ) === "1"
      ) {
        message(
          "この写真にはいいね済みです。"
        );
        return;
      }


      button.disabled = true;

      message("送信中…");


      try {
        const visitorHash =
          await makeVisitorHash(photoId);


        const { error } =
          await db
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
          likeKey(photoId),
          "1"
        );

        message("いいねしました。");

        await loadLikes(photoId);


      } catch (error) {
        console.error(error);

        message(
          `LIKE ERROR: ${
            error.message ||
            "送信できませんでした"
          }`
        );

      } finally {
        button.disabled = false;
      }
    }
  );


  /* ==============================
     COMMENT
  ============================== */

  document.addEventListener(
    "submit",
    async event => {

      if (
        event.target.id !==
        "commentForm"
      ) {
        return;
      }


      event.preventDefault();
      event.stopPropagation();


      const photoId = getPhotoId();

      const nameInput =
        el("commentName");

      const bodyInput =
        el("commentBody");

      const sendButton =
        el("commentSend");


      if (
        !photoId ||
        !bodyInput
      ) {
        message(
          "写真を認識できませんでした。"
        );
        return;
      }


      const name =
        (nameInput?.value || "")
          .trim()
          .slice(0, 30);

      const body =
        bodyInput.value
          .trim()
          .slice(0, 300);


      if (!body) {
        message(
          "コメントを書いてください。"
        );
        return;
      }


      if (
        /https?:\/\/|www\./i.test(body)
      ) {
        message(
          "URLを含むコメントは送信できません。"
        );
        return;
      }


      if (sendButton) {
        sendButton.disabled = true;
      }

      message("送信中…");


      try {
        const { error } =
          await db
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


        bodyInput.value = "";

        message(
          "コメントを送信しました。"
        );


        await loadComments(photoId);


      } catch (error) {
        console.error(error);

        message(
          `COMMENT ERROR: ${
            error.message ||
            "送信できませんでした"
          }`
        );

      } finally {
        if (sendButton) {
          sendButton.disabled = false;
        }
      }
    }
  );


  /* ==============================
     写真が変わったら読み直す
  ============================== */

  function setupWatcher() {
    const image = el("lightboxImage");

    if (!image) return;


    new MutationObserver(() => {
      loadCurrentPhoto();
    }).observe(
      image,
      {
        attributes: true,
        attributeFilter: ["src"]
      }
    );


    if (image.getAttribute("src")) {
      loadCurrentPhoto();
    }
  }


  if (
    document.readyState === "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      setupWatcher
    );
  } else {
    setupWatcher();
  }

})();
