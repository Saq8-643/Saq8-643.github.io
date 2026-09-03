SAKU PHOTO mockup

これは写真サイトの0→1用モックアップです。

【まず見る】
index.html をダブルクリックするとブラウザで開けます。

【入っているもの】
- index.html  … ページ本体
- styles.css … 見た目
- script.js  … カテゴリ切替と写真拡大
- README.txt … この説明

【自分の写真へ差し替えるとき】
今は写真部分を色付きの仮画像にしています。
たとえば画像フォルダを作り、

images/night01.jpg

を入れたら、HTMLの

<div class="photo-placeholder p1" data-label="NIGHT"></div>

を

<img src="images/night01.jpg" alt="夜景">

のように変更できます。

最初は「お気に入りの6枚を載せる」くらいからで十分です。
公開するときは GitHub Pages / Cloudflare Pages / Netlify などに置けます。
