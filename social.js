/* =========================================
   Saq8 PHOTO
   LIKE + COMMENTS
========================================= */

(() => {

  const SUPABASE_URL =
    window.SAQ8_SUPABASE_URL;

  const SUPABASE_KEY =
    window.SAQ8_SUPABASE_PUBLISHABLE_KEY;


  if (
    !SUPABASE_URL ||
    !SUPABASE_KEY ||
    !window.supabase
  ) {
    console.warn(
      "Saq8 Social: Supabaseの設定がありません"
    );
    return;
  }


  const db =
    window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_KEY
    );


  const lightbox =
    document.getElementById("lightbox");

  const lightboxImage =
    document.getElementById("lightboxImage");

  const lightboxCaption =
    document.querySelector(
      ".lightbox-caption"
    );


  if (
    !lightbox ||
    !lightboxImage ||
    !lightboxCaption
  ) {
    return;
  }


  let currentPhotoId = "";


/* =========================================
   STYLE
========================================= */

  const style =
    document.createElement("style");

  style.textContent = `

    .photo-social{
      flex-basis:100%;
      width:100%;
      margin-top:4px;
      padding-top:18px;
      border-top:1px solid rgba(255,255,255,.13);
    }


    .photo-like-row{
      display:flex;
      align-items:center;
      gap:14px;
      margin-bottom:26px;
    }


    .photo-like-button{
      display:inline-flex;
      align-items:center;
      gap:8px;

      padding:8px 14px;

      border:1px solid rgba(255,255,255,.25);
      border-radius:999px;

      background:transparent;
      color:#fff;

      font:inherit;
      font-size:11px;

      cursor:pointer;

      transition:
        background .2s ease,
        border-color .2s ease,
        transform .2s ease;
    }


    .photo-like-button:hover{
      border-color:rgba(255,255,255,.7);
    }


    .photo-like-button:active{
      transform:scale(.96);
    }


    .photo-like-button.is-liked{
      background:rgba(255,255,255,.1);
      border-color:rgba(255,255,255,.5);
    }


    .photo-like-heart{
      font-size:16px;
      line-height:1;
    }


    .comments-heading{
      display:flex;
      align-items:center;
      gap:8px;

      margin:0 0 16px;

      color:rgba(255,255,255,.55);

      font-size:9px;
      font-weight:600;
      letter-spacing:.18em;
    }


    .comments-list{
      display:flex;
      flex-direction:column;
      gap:15px;

      margin-bottom:22px;
    }


    .comment-item{
      padding-bottom:14px;

      border-bottom:
        1px solid rgba(255,255,255,.08);
    }


    .comment-header{
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:14px;

      margin-bottom:6px;
    }


    .comment-name{
      color:rgba(255,255,255,.88);
      font-size:11px;
      font-weight:500;
    }


    .comment-date{
      color:rgba(255,255,255,.35);
      font-size:8px;
      letter-spacing:.06em;
    }


    .comment-body{
      margin:0;

      color:rgba(255,255,255,.78);

      font-size:11px;
      line-height:1.8;

      white-space:pre-wrap;
      overflow-wrap:anywhere;
    }


    .comments-empty{
      margin:0 0 22px;

      color:rgba(255,255,255,.4);

      font-size:10px;
    }


    .comment-form{
      display:grid;
      grid-template-columns:160px 1fr auto;
      gap:8px;
      align-items:end;
    }


    .comment-field{
      display:flex;
      flex-direction:column;
      gap:6px;
    }


    .comment-field label{
      color:rgba(255,255,255,.45);

      font-size:8px;
      font-weight:600;
      letter-spacing:.14em;
    }


    .comment-field input,
    .comment-field textarea{
      width:100%;

      border:1px solid rgba(255,255,255,.18);
      border-radius:0;

      padding:10px 11px;

      background:rgba(255,255,255,.04);
      color:#fff;

      font:inherit;
      font-size:11px;

      outline:none;

      resize:vertical;
    }


    .comment-field input:focus,
    .comment-field textarea:focus{
      border-color:rgba(255,255,255,.55);
    }


    .comment-field textarea{
      min-height:64px;
      max-height:150px;
    }


    .comment-send{
      height:38px;

      padding:0 18px;

      border:1px solid rgba(255,255,255,.55);

      background:transparent;
      color:#fff;

      font:inherit;
      font-size:9px;
      font-weight:600;
      letter-spacing:.14em;

      cursor:pointer;
    }


    .comment-send:hover{
      background:#fff;
      color:#111;
    }


    .comment-send:disabled,
    .photo-like-button:disabled{
      opacity:.45;
      cursor:default;
    }


    .social-message{
      min-height:16px;
      margin:9px 0 0;

      color:rgba(255,255,255,.48);

      font-size:9px;
    }


    @media(max-width:700px){

      .comment-form{
        grid-template-columns:1fr;
      }


      .comment-send{
        justify-self:start;
      }
    }

  `;

  document.head.appendChild(style);


/* =========================================
   UI
========================================= */

  const social =
    document.createElement("div");

  social.className =
    "photo-social";

  social.innerHTML = `

    <div class="photo-like-row">

      <button
        id="photoLikeButton"
        class="photo-like-button"
        type="button"
      >
        <span
          id="photoLikeHeart"
          class="photo-like-heart"
        >♡</span>

        <span id="photoLikeCount">
          0
        </span>
      </button>

    </div>


    <div class="photo-comments">

      <p class="comments-heading">
        COMMENTS
        <span id="commentCount">0</span>
      </p>


      <div
        id="commentsList"
        class="comments-list"
      ></div>


      <form
        id="commentForm"
        class="comment-form"
      >

        <div class="comment-field">

          <label for="commentName">
            NAME / OPTIONAL
          </label>

          <input
            id="commentName"
            type="text"
            maxlength="30"
            autocomplete="nickname"
          >

        </div>


        <div class="comment-field">

          <label for="commentBody">
            COMMENT
          </label>

          <textarea
            id="commentBody"
            maxlength="300"
            required
          ></textarea>

        </div>


        <button
          id="commentSend"
          class="comment-send"
          type="submit"
        >
          SEND
        </button>

      </form>


      <p
        id="socialMessage"
        class="social-message"
      ></p>

    </div>

  `;


  lightboxCaption.appendChild(
    social
  );


  const likeButton =
    document.getElementById(
      "photoLikeButton"
    );

  const likeHeart =
    document.getElementById(
      "photoLikeHeart"
    );

  const likeCount =
    document.getElementById(
      "photoLikeCount"
    );

  const commentsList =
    document.getElementById(
      "commentsList"
    );

  const commentCount =
    document.getElementById(
      "commentCount"
    );

  const commentForm =
    document.getElementById(
      "commentForm"
    );

  const commentName =
    document.getElementById(
      "commentName"
    );

  const commentBody =
    document.getElementById(
      "commentBody"
    );

  const commentSend =
    document.getElementById(
      "commentSend"
    );

  const socialMessage =
    document.getElementById(
      "socialMessage"
    );


/* =========================================
   VISITOR ID
========================================= */

  function getVisitorId() {

    const key =
      "saq8VisitorId";

    let id =
      localStorage.getItem(key);


    if (!id) {

      id =
        crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`;

      localStorage.setItem(
        key,
        id
      );
    }


    return id;
  }


  async function hashVisitorForPhoto(
    photoId
  ) {

    const source =
      `${getVisitorId()}:${photoId}`;

    const encoded =
      new TextEncoder()
        .encode(source);

    const buffer =
      await crypto.subtle.digest(
        "SHA-256",
        encoded
      );

    return Array
      .from(
        new Uint8Array(buffer)
      )
      .map(
        byte =>
          byte
            .toString(16)
            .padStart(2, "0")
      )
      .join("");
  }


/* =========================================
   PHOTO ID
========================================= */

  function getPhotoIdFromImage() {

    const src =
      lightboxImage
        .getAttribute("src");

    if (!src) {
      return "";
    }


    try {

      const url =
        new URL(
          src,
          window.location.href
        );

      return decodeURIComponent(
        url.pathname
          .split("/")
          .pop()
      );

    } catch (_) {

      return src
        .split("/")
        .pop();
    }
  }


/* =========================================
   LIKE
========================================= */

  function likedStorageKey(
    photoId
  ) {

    return (
      `saq8Liked:${photoId}`
    );
  }


  function renderLikedState() {

    const liked =
      localStorage.getItem(
        likedStorageKey(
          currentPhotoId
        )
      ) === "1";


    likeButton.classList.toggle(
      "is-liked",
      liked
    );

    likeHeart.textContent =
      liked
        ? "♥"
        : "♡";
  }


  async function loadLikeCount() {

    if (!currentPhotoId) {
      return;
    }


    const {
      data,
      error
    } =
      await db.rpc(
        "get_photo_like_count",
        {
          p_photo_id:
            currentPhotoId
        }
      );


    if (error) {

      console.error(error);

      likeCount.textContent =
        "—";

      return;
    }


    likeCount.textContent =
      Number(data || 0);

    renderLikedState();
  }


  likeButton.addEventListener(
    "click",
    async () => {

      if (!currentPhotoId) {
        return;
      }


      const alreadyLiked =
        localStorage.getItem(
          likedStorageKey(
            currentPhotoId
          )
        ) === "1";


      if (alreadyLiked) {

        socialMessage.textContent =
          "この写真にはいいね済みです。";

        return;
      }


      likeButton.disabled =
        true;

      socialMessage.textContent =
        "";


      try {

        const visitorHash =
          await hashVisitorForPhoto(
            currentPhotoId
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
                currentPhotoId,

              visitor_hash:
                visitorHash
            });


        if (
          error &&
          error.code !== "23505"
        ) {
          throw error;
        }


        localStorage.setItem(
          likedStorageKey(
            currentPhotoId
          ),
          "1"
        );


        renderLikedState();

        await loadLikeCount();


      } catch (error) {

        console.error(error);

        socialMessage.textContent =
          "いいねを送れませんでした。";

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
          "2-digit",

        hour:
          "2-digit",

        minute:
          "2-digit"
      }
    )
      .format(
        new Date(value)
      );
  }


  async function loadComments() {

    if (!currentPhotoId) {
      return;
    }


    commentsList.innerHTML =
      "";

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
          currentPhotoId
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

      console.error(error);

      commentsList.innerHTML =
        `<p class="comments-empty">
          コメントを読み込めませんでした。
        </p>`;

      return;
    }


    commentCount.textContent =
      data.length;


    if (!data.length) {

      commentsList.innerHTML =
        `<p class="comments-empty">
          まだコメントはありません。
        </p>`;

      return;
    }


    data.forEach(comment => {

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

      commentsList.appendChild(
        item
      );
    });
  }


  commentForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      if (!currentPhotoId) {
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

        socialMessage.textContent =
          "コメントを書いてください。";

        return;
      }


      if (
        /https?:\/\/|www\./i
          .test(body)
      ) {

        socialMessage.textContent =
          "URLを含むコメントは送信できません。";

        return;
      }


      const cooldownKey =
        "saq8LastCommentAt";

      const lastComment =
        Number(
          localStorage.getItem(
            cooldownKey
          ) || 0
        );

      const now =
        Date.now();


      if (
        now - lastComment <
        20000
      ) {

        socialMessage.textContent =
          "少し待ってから送信してください。";

        return;
      }


      commentSend.disabled =
        true;

      socialMessage.textContent =
        "送信中…";


      const {
        error
      } =
        await db
          .from(
            "photo_comments"
          )
          .insert({
            photo_id:
              currentPhotoId,

            display_name:
              name ||
              "Anonymous",

            body
          });


      if (error) {

        console.error(error);

        socialMessage.textContent =
          "コメントを送信できませんでした。";

        commentSend.disabled =
          false;

        return;
      }


      localStorage.setItem(
        cooldownKey,
        String(now)
      );


      if (name) {

        localStorage.setItem(
          "saq8CommentName",
          name
        );
      }


      commentBody.value =
        "";

      socialMessage.textContent =
        "コメントを送信しました。";

      commentSend.disabled =
        false;


      await loadComments();
    }
  );


/* =========================================
   PHOTO CHANGE
========================================= */

  async function changePhoto() {

    const photoId =
      getPhotoIdFromImage();


    if (!photoId) {
      return;
    }


    currentPhotoId =
      photoId;


    socialMessage.textContent =
      "";

    likeCount.textContent =
      "…";

    commentCount.textContent =
      "…";

    commentsList.innerHTML =
      `<p class="comments-empty">
        読み込み中…
      </p>`;


    renderLikedState();


    await Promise.all([
      loadLikeCount(),
      loadComments()
    ]);
  }


  const savedName =
    localStorage.getItem(
      "saq8CommentName"
    );

  if (savedName) {

    commentName.value =
      savedName;
  }


  const observer =
    new MutationObserver(
      mutations => {

        const changed =
          mutations.some(
            mutation =>
              mutation.type ===
                "attributes" &&
              mutation.attributeName ===
                "src"
          );


        if (changed) {
          changePhoto();
        }
      }
    );


  observer.observe(
    lightboxImage,
    {
      attributes:
        true,

      attributeFilter:
        ["src"]
    }
  );


  if (
    lightboxImage
      .getAttribute("src")
  ) {

    changePhoto();
  }

})();
