/* =========================================
   Saq8 PHOTO
   LIKE + COMMENTS
========================================= */

(() => {

  function startSocial() {

    /* -----------------------------------------
       SUPABASE
    ----------------------------------------- */

    const SUPABASE_URL =
      window.SAQ8_SUPABASE_URL;

    const SUPABASE_KEY =
      window.SAQ8_SUPABASE_PUBLISHABLE_KEY;


    if (
      !SUPABASE_URL ||
      !SUPABASE_KEY ||
      !window.supabase
    ) {
      console.error(
        "Saq8 Social: Supabase connection error"
      );
      return;
    }


    const db =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
      );


    /* -----------------------------------------
       DOM
    ----------------------------------------- */

    const lightbox =
      document.getElementById("lightbox");

    const lightboxImage =
      document.getElementById("lightboxImage");

    const likeButton =
      document.getElementById("photoLikeButton");

    const likeHeart =
      document.getElementById("photoLikeHeart");

    const likeCount =
      document.getElementById("photoLikeCount");

    const commentCount =
      document.getElementById("commentCount");

    const commentsList =
      document.getElementById("commentsList");

    const commentForm =
      document.getElementById("commentForm");

    const commentName =
      document.getElementById("commentName");

    const commentBody =
      document.getElementById("commentBody");

    const commentSend =
      document.getElementById("commentSend");

    const socialMessage =
      document.getElementById("socialMessage");


    if (
      !lightbox ||
      !lightboxImage ||
      !likeButton ||
      !likeHeart ||
      !likeCount ||
      !commentCount ||
      !commentsList ||
      !commentForm ||
      !commentName ||
      !commentBody ||
      !commentSend ||
      !socialMessage
    ) {
      console.error(
        "Saq8 Social: 必要なHTML要素が見つかりません"
      );
      return;
    }


    /* -----------------------------------------
       MESSAGE
    ----------------------------------------- */

    function showMessage(text) {
      socialMessage.textContent =
        text || "";
    }


    /* -----------------------------------------
       PHOTO ID
    ----------------------------------------- */

    function getPhotoId() {

      const src =
        lightboxImage.getAttribute("src");

      if (!src) {
        return "";
      }


      const cleanSrc =
        src.split("?")[0];


      const fileName =
        cleanSrc
          .split("/")
          .pop();


      return decodeURIComponent(
        fileName || ""
      );
    }


    /* -----------------------------------------
       VISITOR ID
    ----------------------------------------- */

    function getVisitorId() {

      const storageKey =
        "saq8VisitorId";


      let visitorId =
        localStorage.getItem(
          storageKey
        );


      if (!visitorId) {

        if (
          window.crypto &&
          typeof crypto.randomUUID ===
            "function"
        ) {

          visitorId =
            crypto.randomUUID();

        } else {

          visitorId =
            `${Date.now()}-${Math.random()}`;

        }


        localStorage.setItem(
          storageKey,
          visitorId
        );
      }


      return visitorId;
    }


    async function makeVisitorHash(
      photoId
    ) {

      const source =
        `${getVisitorId()}:${photoId}`;


      const bytes =
        new TextEncoder()
          .encode(source);


      const digest =
        await crypto.subtle.digest(
          "SHA-256",
          bytes
        );


      return Array
        .from(
          new Uint8Array(digest)
        )
        .map(
          value =>
            value
              .toString(16)
              .padStart(2, "0")
        )
        .join("");
    }


    /* =========================================
       LIKE
    ========================================= */

    function getLikeStorageKey(
      photoId
    ) {

      return (
        `saq8Liked:${photoId}`
      );
    }


    function updateHeart(
      photoId
    ) {

      if (!photoId) {
        likeHeart.textContent = "♡";
        return;
      }


      const liked =
        localStorage.getItem(
          getLikeStorageKey(
            photoId
          )
        ) === "1";


      likeHeart.textContent =
        liked
          ? "♥"
          : "♡";


      likeButton.classList.toggle(
        "is-liked",
        liked
      );
    }


    async function loadLikeCount(
      photoId
    ) {

      if (!photoId) {
        return;
      }


      likeCount.textContent =
        "…";


      const {
        data,
        error
      } =
        await db.rpc(
          "get_photo_like_count",
          {
            p_photo_id:
              photoId
          }
        );


      if (error) {

        console.error(
          "LIKE COUNT ERROR",
          error
        );


        likeCount.textContent =
          "—";


        showMessage(
          `LIKE ERROR: ${error.message}`
        );

        return;
      }


      likeCount.textContent =
        String(
          Number(data || 0)
        );


      updateHeart(
        photoId
      );
    }


    /* -----------------------------------------
       LIKE CLICK
       ボタンへ直接イベント登録
    ----------------------------------------- */

    likeButton.addEventListener(
      "click",
      async event => {

        event.preventDefault();
        event.stopPropagation();


        const photoId =
          getPhotoId();


        if (!photoId) {

          showMessage(
            "写真を認識できませんでした。"
          );

          return;
        }


        const likeStorageKey =
          getLikeStorageKey(
            photoId
          );


        if (
          localStorage.getItem(
            likeStorageKey
          ) === "1"
        ) {

          showMessage(
            "この写真にはいいね済みです。"
          );

          return;
        }


        likeButton.disabled =
          true;


        showMessage(
          "送信中…"
        );


        try {

          const visitorHash =
            await makeVisitorHash(
              photoId
            );


          const {
            error
          } =
            await db
              .from(
                "photo_likes"
              )
              .insert({
                photo_id:
                  photoId,

                visitor_hash:
                  visitorHash
              });


          /*
            23505 =
            DB上ではすでに
            このブラウザから
            いいね済み
          */

          if (
            error &&
            error.code !==
              "23505"
          ) {

            throw error;
          }


          localStorage.setItem(
            likeStorageKey,
            "1"
          );


          updateHeart(
            photoId
          );


          showMessage(
            "いいねしました。"
          );


          await loadLikeCount(
            photoId
          );


        } catch (error) {

          console.error(
            "LIKE ERROR",
            error
          );


          showMessage(
            `LIKE ERROR: ${
              error?.message ||
              "送信できませんでした"
            }`
          );


        } finally {

          likeButton.disabled =
            false;
        }
      }
    );


    /* =========================================
       COMMENTS
    ========================================= */

    function formatCommentDate(
      value
    ) {

      try {

        return new Intl.DateTimeFormat(
          "ja-JP",
          {
            timeZone:
              "Asia/Tokyo",

            year:
              "numeric",

            month:
              "2-digit",

            day:
              "2-digit"
          }
        )
          .format(
            new Date(value)
          );

      } catch {

        return "";
      }
    }


    function createCommentElement(
      comment
    ) {

      const item =
        document.createElement(
          "article"
        );


      item.className =
        "comment-item";


      const header =
        document.createElement(
          "div"
        );


      header.className =
        "comment-header";


      const name =
        document.createElement(
          "span"
        );


      name.className =
        "comment-name";


      name.textContent =
        comment.display_name ||
        "Anonymous";


      const date =
        document.createElement(
          "time"
        );


      date.className =
        "comment-date";


      date.textContent =
        formatCommentDate(
          comment.created_at
        );


      const body =
        document.createElement(
          "p"
        );


      body.className =
        "comment-body";


      /*
        textContentなので
        HTMLを実行しない
      */

      body.textContent =
        comment.body;


      header.append(
        name,
        date
      );


      item.append(
        header,
        body
      );


      return item;
    }


    async function loadComments(
      photoId
    ) {

      if (!photoId) {
        return;
      }


      commentsList.innerHTML =
        "";


      const loading =
        document.createElement(
          "p"
        );


      loading.className =
        "comments-empty";


      loading.textContent =
        "読み込み中…";


      commentsList.appendChild(
        loading
      );


      const {
        data,
        error
      } =
        await db
          .from(
            "photo_comments"
          )
          .select(
            "id, display_name, body, created_at"
          )
          .eq(
            "photo_id",
            photoId
          )
          .eq(
            "is_visible",
            true
          )
          .order(
            "created_at",
            {
              ascending:
                true
            }
          )
          .limit(50);


      if (error) {

        console.error(
          "COMMENT LOAD ERROR",
          error
        );


        commentsList.innerHTML =
          "";


        const errorText =
          document.createElement(
            "p"
          );


        errorText.className =
          "comments-empty";


        errorText.textContent =
          "コメントを読み込めませんでした。";


        commentsList.appendChild(
          errorText
        );


        showMessage(
          `COMMENT ERROR: ${error.message}`
        );

        return;
      }


      const comments =
        data || [];


      commentCount.textContent =
        String(
          comments.length
        );


      commentsList.innerHTML =
        "";


      if (
        comments.length === 0
      ) {

        const empty =
          document.createElement(
            "p"
          );


        empty.className =
          "comments-empty";


        empty.textContent =
          "まだコメントはありません。";


        commentsList.appendChild(
          empty
        );

        return;
      }


      comments.forEach(
        comment => {

          commentsList.appendChild(
            createCommentElement(
              comment
            )
          );
        }
      );
    }


    /* -----------------------------------------
       COMMENT SEND
       formへ直接イベント登録
    ----------------------------------------- */

    commentForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();
        event.stopPropagation();


        const photoId =
          getPhotoId();


        if (!photoId) {

          showMessage(
            "写真を認識できませんでした。"
          );

          return;
        }


        const name =
          commentName.value
            .trim()
            .slice(
              0,
              30
            );


        const body =
          commentBody.value
            .trim()
            .slice(
              0,
              300
            );


        if (!body) {

          showMessage(
            "コメントを書いてください。"
          );

          return;
        }


        /*
          URL禁止
        */

        if (
          /https?:\/\/|www\./i
            .test(body)
        ) {

          showMessage(
            "URLを含むコメントは送信できません。"
          );

          return;
        }


        /*
          20秒クールダウン
        */

        const now =
          Date.now();


        const lastCommentAt =
          Number(
            localStorage.getItem(
              "saq8LastCommentAt"
            ) || 0
          );


        if (
          now - lastCommentAt <
          20000
        ) {

          const remaining =
            Math.ceil(
              (
                20000 -
                (
                  now -
                  lastCommentAt
                )
              ) /
              1000
            );


          showMessage(
            `あと${remaining}秒ほど待ってください。`
          );

          return;
        }


        commentSend.disabled =
          true;


        showMessage(
          "送信中…"
        );


        try {

          const {
            error
          } =
            await db
              .from(
                "photo_comments"
              )
              .insert({
                photo_id:
                  photoId,

                display_name:
                  name ||
                  "Anonymous",

                body:
                  body
              });


          if (error) {
            throw error;
          }


          /*
            成功した時だけ
            クールダウン開始
          */

          localStorage.setItem(
            "saq8LastCommentAt",
            String(
              Date.now()
            )
          );


          /*
            名前を記憶
          */

          if (name) {

            localStorage.setItem(
              "saq8CommentName",
              name
            );
          }


          commentBody.value =
            "";


          showMessage(
            "コメントを送信しました。"
          );


          await loadComments(
            photoId
          );


        } catch (error) {

          console.error(
            "COMMENT SEND ERROR",
            error
          );


          showMessage(
            `COMMENT ERROR: ${
              error?.message ||
              "送信できませんでした"
            }`
          );


        } finally {

          commentSend.disabled =
            false;
        }
      }
    );


    /* =========================================
       PHOTO CHANGE
    ========================================= */

    async function loadCurrentPhoto() {

      const photoId =
        getPhotoId();


      if (!photoId) {
        return;
      }


      showMessage("");


      updateHeart(
        photoId
      );


      /*
        LIKEとCOMMENTSを
        同時に読み込む
      */

      await Promise.all([
        loadLikeCount(
          photoId
        ),

        loadComments(
          photoId
        )
      ]);
    }


    /* -----------------------------------------
       名前を復元
    ----------------------------------------- */

    const savedName =
      localStorage.getItem(
        "saq8CommentName"
      );


    if (savedName) {

      commentName.value =
        savedName;
    }


    /* -----------------------------------------
       写真src監視
    ----------------------------------------- */

    const imageObserver =
      new MutationObserver(
        () => {

          setTimeout(
            loadCurrentPhoto,
            0
          );
        }
      );


    imageObserver.observe(
      lightboxImage,
      {
        attributes:
          true,

        attributeFilter:
          ["src"]
      }
    );


    /* -----------------------------------------
       dialog open監視
       同じ写真を再度開いた時にも更新
    ----------------------------------------- */

    const dialogObserver =
      new MutationObserver(
        () => {

          if (
            lightbox.hasAttribute(
              "open"
            )
          ) {

            setTimeout(
              loadCurrentPhoto,
              0
            );
          }
        }
      );


    dialogObserver.observe(
      lightbox,
      {
        attributes:
          true,

        attributeFilter:
          ["open"]
      }
    );


    /* -----------------------------------------
       すでに写真があれば初期ロード
    ----------------------------------------- */

    if (
      lightboxImage.getAttribute(
        "src"
      )
    ) {

      loadCurrentPhoto();
    }


    console.log(
      "Saq8 Social READY"
    );
  }


  /* =========================================
     START
  ========================================= */

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      startSocial,
      {
        once:
          true
      }
    );

  } else {

    startSocial();
  }

})();
