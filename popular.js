/* =========================================
   Saq8 PHOTO
   POPULAR SORT

   元の script.js は触らない
========================================= */

(() => {

  /* 二重読み込み防止 */

  if (
    window.__SAQ8_POPULAR_SORT__
  ) {
    return;
  }

  window.__SAQ8_POPULAR_SORT__ =
    true;


  const state = {

    mode:
      "newest",

    counts:
      new Map(),

    loaded:
      false,

    loading:
      false
  };


  let newestButton =
    null;

  let popularButton =
    null;

  let initialized =
    false;


  /* =========================================
     STYLE
  ========================================= */

  function addStyles() {

    if (
      document.getElementById(
        "saq8PopularStyles"
      )
    ) {
      return;
    }


    const style =
      document.createElement(
        "style"
      );


    style.id =
      "saq8PopularStyles";


    style.textContent = `

      .saq8-sort-divider{
        display:inline-block;

        width:1px;
        height:18px;

        margin:
          0 6px;

        background:
          currentColor;

        opacity:.18;

        vertical-align:middle;

        pointer-events:none;
      }


      .saq8-sort-button{
        white-space:nowrap;
      }


      .saq8-sort-button:disabled{
        opacity:.45;
        cursor:wait;
      }

    `;


    document.head.appendChild(
      style
    );
  }


  /* =========================================
     SUPABASE
  ========================================= */

  function getSupabaseInfo() {

    const baseUrl =
      (
        window
          .SAQ8_SUPABASE_URL ||
        ""
      )
        .replace(
          /\/$/,
          ""
        );


    const apiKey =
      window
        .SAQ8_SUPABASE_PUBLISHABLE_KEY ||
      "";


    return {
      baseUrl,
      apiKey
    };
  }


  async function fetchLikeCounts() {

    if (
      state.loading
    ) {
      return;
    }


    const {
      baseUrl,
      apiKey
    } =
      getSupabaseInfo();


    if (
      !baseUrl ||
      !apiKey
    ) {

      throw new Error(
        "Supabaseの設定を読み込めませんでした。"
      );
    }


    state.loading =
      true;


    try {

      const response =
        await fetch(
          `${baseUrl}/rest/v1/rpc/get_photo_like_counts`,
          {

            method:
              "POST",


            headers: {

              apikey:
                apiKey,


              "Content-Type":
                "application/json"
            },


            body:
              "{}"
          }
        );


      if (
        !response.ok
      ) {

        const detail =
          await response.text();


        throw new Error(
          `${response.status}: ${detail}`
        );
      }


      const data =
        await response.json();


      state.counts =
        new Map();


      (
        Array.isArray(data)
          ? data
          : []
      )
        .forEach(
          row => {

            state.counts.set(

              row.photo_id,

              Number(
                row.like_count ||
                0
              )
            );
          }
        );


      state.loaded =
        true;


    } finally {

      state.loading =
        false;
    }
  }


  /* =========================================
     LIKE COUNT
  ========================================= */

  function getLikeCount(
    photo
  ) {

    if (
      !photo ||
      !photo.file
    ) {

      return 0;
    }


    return Number(
      state.counts.get(
        photo.file
      ) ||
      0
    );
  }


  /* =========================================
     POPULAR SORT
  ========================================= */

  function comparePopular(
    a,
    b
  ) {

    const likeDifference =
      getLikeCount(b) -
      getLikeCount(a);


    if (
      likeDifference !==
      0
    ) {

      return likeDifference;
    }


    /*
      LIKE数が同じなら
      新しい写真を上に
    */

    const aDate =
      a.date
        ? new Date(
            a.date
          )
            .getTime()
        : 0;


    const bDate =
      b.date
        ? new Date(
            b.date
          )
            .getTime()
        : 0;


    const dateDifference =
      bDate -
      aDate;


    if (
      dateDifference !==
      0
    ) {

      return dateDifference;
    }


    /*
      日付も同じなら
      元の順番
    */

    return (
      (
        a._originalIndex ||
        0
      ) -
      (
        b._originalIndex ||
        0
      )
    );
  }


  function applyPopularOrder() {

    if (
      state.mode !==
        "popular" ||
      !state.loaded
    ) {

      return;
    }


    currentPhotos =
      currentPhotos
        .slice()
        .sort(
          comparePopular
        );


    renderVisiblePhotos();
  }


  /* =========================================
     BUTTON DISPLAY
  ========================================= */

  function updateButtons() {

    if (
      newestButton
    ) {

      newestButton
        .classList
        .toggle(
          "active",

          state.mode ===
            "newest"
        );


      newestButton
        .setAttribute(
          "aria-pressed",

          state.mode ===
            "newest"
            ? "true"
            : "false"
        );
    }


    if (
      popularButton
    ) {

      popularButton
        .classList
        .toggle(
          "active",

          state.mode ===
            "popular"
        );


      popularButton
        .setAttribute(
          "aria-pressed",

          state.mode ===
            "popular"
            ? "true"
            : "false"
        );
    }
  }


  /* =========================================
     BUTTONS
  ========================================= */

  function createButtons() {

    const filters =
      document.getElementById(
        "filters"
      );


    if (
      !filters
    ) {
      return;
    }


    if (
      filters.querySelector(
        ".saq8-sort-button"
      )
    ) {

      return;
    }


    const divider =
      document.createElement(
        "span"
      );


    divider.className =
      "saq8-sort-divider";


    divider.setAttribute(
      "aria-hidden",
      "true"
    );


    filters.appendChild(
      divider
    );


    /* -------------------------
       NEWEST
    ------------------------- */

    newestButton =
      document.createElement(
        "button"
      );


    newestButton.type =
      "button";


    /*
      filterクラスを使うので
      元サイトと同じ見た目になる
    */

    newestButton.className =
      "filter saq8-sort-button";


    newestButton.textContent =
      "NEWEST";


    newestButton.dataset.saqSort =
      "newest";


    newestButton.addEventListener(
      "click",
      () => {

        state.mode =
          "newest";


        /*
          MOREで開いていた分も
          12枚へ戻す
        */

        visibleCount =
          PAGE_SIZE;


        /*
          元のapplyFiltersで
          日付順へ戻す
        */

        applyFilters();


        updateButtons();
      }
    );


    filters.appendChild(
      newestButton
    );


    /* -------------------------
       POPULAR
    ------------------------- */

    popularButton =
      document.createElement(
        "button"
      );


    popularButton.type =
      "button";


    popularButton.className =
      "filter saq8-sort-button";


    popularButton.textContent =
      "♡ POPULAR";


    popularButton.dataset.saqSort =
      "popular";


    popularButton.addEventListener(
      "click",
      async () => {

        const normalText =
          "♡ POPULAR";


        popularButton.disabled =
          true;


        popularButton.textContent =
          "LOADING…";


        try {

          /*
            押すたびに
            最新LIKE数を取得
          */

          await fetchLikeCounts();


          state.mode =
            "popular";


          visibleCount =
            PAGE_SIZE;


          /*
            まず現在の
            タグ・都道府県条件を適用
          */

          applyFilters();


          /*
            その結果を
            LIKE順へ
          */

          applyPopularOrder();


          updateButtons();


        } catch (error) {

          console.error(
            "Saq8 POPULAR ERROR",
            error
          );


          popularButton.textContent =
            "POPULAR ERROR";


          popularButton.title =
            error.message ||
            "人気順を読み込めませんでした。";


          setTimeout(
            () => {

              popularButton.textContent =
                normalText;

            },
            1600
          );


          return;


        } finally {

          popularButton.disabled =
            false;
        }


        popularButton.textContent =
          normalText;
      }
    );


    filters.appendChild(
      popularButton
    );


    updateButtons();
  }


  /* =========================================
     APPLY FILTERS を安全に拡張
  ========================================= */

  function extendApplyFilters() {

    /*
      元関数を保存。
      消したり書き換えたりしない。
    */

    const originalApplyFilters =
      applyFilters;


    applyFilters =
      function() {

        /*
          まず既存サイトを
          いつも通り動かす
        */

        originalApplyFilters();


        /*
          POPULAR中だけ
          その結果を並べ替える
        */

        if (
          state.mode ===
            "popular" &&
          state.loaded
        ) {

          currentPhotos =
            currentPhotos
              .slice()
              .sort(
                comparePopular
              );


          renderVisiblePhotos();
        }


        /*
          タグフィルター側が
          activeを変更しても
          SORT表示を復元
        */

        updateButtons();
      };
  }


  /* =========================================
     INIT
  ========================================= */

  function initialize() {

    if (
      initialized
    ) {

      return;
    }


    /*
      script.js が
      写真データとタグボタンを
      作り終えてから起動
    */

    if (
      typeof photos ===
        "undefined" ||

      !Array.isArray(
        photos
      ) ||

      photos.length ===
        0 ||

      typeof applyFilters !==
        "function" ||

      typeof renderVisiblePhotos !==
        "function"
    ) {

      setTimeout(
        initialize,
        100
      );


      return;
    }


    const filters =
      document.getElementById(
        "filters"
      );


    if (
      !filters ||
      !filters.querySelector(
        ".filter"
      )
    ) {

      setTimeout(
        initialize,
        100
      );


      return;
    }


    initialized =
      true;


    addStyles();


    extendApplyFilters();


    createButtons();


    console.log(
      "Saq8 POPULAR READY"
    );
  }


  initialize();

})();
