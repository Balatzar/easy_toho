import assert from "node:assert/strict";
import test from "node:test";

import {
  parseEigaReleaseDetailPage,
  normalizeReleaseMonth,
  parseEigaReleaseCalendarPage,
  releaseForEnglishFilter,
  shiftReleaseMonth,
} from "./eiga-release-calendar.ts";

const sampleHtml = `
  <section>
    <h2 class="title-square">
      <span class="year">2026年</span>
      <span class="icon calendar">8月7日</span>（金）公開
    </h2>
    <div id="mv100001" class="list-block list-block2">
      <div class="img-box">
        <a href="/movie/100001/">
          <img alt="The English Film" src="https://media.eiga.com/english/320.jpg">
        </a>
      </div>
      <div class="txt-box">
        <h3 class="title"><a href="/movie/100001/">The English Film</a></h3>
        <p class="txt">A short synopsis.</p>
        <ul class="cast-staff"><li><span>John Smith</span> 監督</li></ul>
      </div>
    </div>
    <div id="mv100002" class="list-block list-block2">
      <div class="img-box">
        <a href="/movie/100002/">
          <img alt="夏の映画" src="https://media.eiga.com/summer/320.jpg">
        </a>
      </div>
      <div class="txt-box">
        <h3 class="title"><a href="/movie/100002/">夏の映画</a></h3>
        <p class="txt">夏の物語。</p>
        <ul class="cast-staff"><li><span>山田太郎</span> 監督</li></ul>
      </div>
    </div>
    <h2 class="title-square">
      <span class="year">2026年</span>
      <span class="icon calendar">8月14日</span>（金）公開
    </h2>
    <div id="mv100003" class="list-block list-block2">
      <div class="img-box">
        <a href="/movie/100003/">
          <img alt="ミッドナイト・ラン" src="https://media.eiga.com/midnight/320.jpg">
        </a>
      </div>
      <div class="txt-box">
        <h3 class="title"><a href="/movie/100003/">ミッドナイト・ラン</a></h3>
        <p class="txt">夜を駆ける物語。</p>
        <ul class="cast-staff"><li><span>ジョン・ドウ</span> 監督</li></ul>
      </div>
    </div>
    <div id="mv100004" class="list-block list-block2">
      <div class="img-box"><img alt="ブルーロック" src="/blue-lock.jpg"></div>
      <div class="txt-box">
        <h3 class="title"><a href="/movie/100004/">ブルーロック</a></h3>
        <ul class="cast-staff"><li><span>瀧悠輔</span> 監督</li></ul>
      </div>
    </div>
  </section>
`;

test("parses Eiga releases into date groups", () => {
  const groups = parseEigaReleaseCalendarPage(sampleHtml, "2026-08");

  assert.equal(groups.length, 2);
  assert.equal(groups[0]?.date, "2026-08-07");
  assert.equal(groups[0]?.releases.length, 2);
  assert.deepEqual(groups[0]?.releases[0], {
    id: "eiga:100001",
    sourceId: "100001",
    title: "The English Film",
    originalOrEnglishTitle: null,
    posterUrl: "https://media.eiga.com/english/320.jpg",
    director: "John Smith",
    sourceUrl: "https://eiga.com/movie/100001/",
  });
  assert.equal(groups[1]?.date, "2026-08-14");
  assert.equal(groups[1]?.releases.length, 2);
});

test("normalizes and shifts release months", () => {
  assert.equal(normalizeReleaseMonth("2026-08", "2026-07"), "2026-08");
  assert.equal(normalizeReleaseMonth("2026-13", "2026-07"), "2026-07");
  assert.equal(normalizeReleaseMonth(undefined, "2026-07"), "2026-07");
  assert.equal(shiftReleaseMonth("2026-12", 1), "2027-01");
  assert.equal(shiftReleaseMonth("2026-01", -1), "2025-12");
});

test("uses Eiga detail country and original title for the English filter", () => {
  const englishDetail = parseEigaReleaseDetailPage(`
    <p class="data">
      2026年製作／90分／G／アメリカ<br>
      原題または英題：Minions &amp; Monsters<br>
      劇場公開日：2026年8月7日
    </p>
  `);
  const japaneseDetail = parseEigaReleaseDetailPage(`
    <p class="data">2026年製作／日本<br>劇場公開日：2026年8月7日</p>
  `);
  const englishDetailWithoutTitle = parseEigaReleaseDetailPage(`
    <p class="data">2026年製作／アメリカ<br>劇場公開日：2026年8月7日</p>
  `);
  const frenchDetail = parseEigaReleaseDetailPage(`
    <p class="data">
      1983年製作／58分／フランス<br>
      原題または英題：Un jour Pina a demandé...<br>
    </p>
  `);
  const release = {
    id: "eiga:105870",
    sourceId: "105870",
    title: "ミニオンズ＆モンスターズ",
    originalOrEnglishTitle: null,
    posterUrl: null,
    director: "ピエール・コフィン",
    sourceUrl: "https://eiga.com/movie/105870/",
  };

  assert.deepEqual(englishDetail, {
    originalOrEnglishTitle: "Minions & Monsters",
    productionCountry: "アメリカ",
  });
  assert.equal(japaneseDetail.productionCountry, "日本");
  assert.equal(frenchDetail.productionCountry, "フランス");
  assert.equal(
    releaseForEnglishFilter(release, englishDetail)?.title,
    "Minions & Monsters",
  );
  assert.equal(
    releaseForEnglishFilter(release, englishDetail)?.originalOrEnglishTitle,
    "Minions & Monsters",
  );
  assert.equal(releaseForEnglishFilter(release, japaneseDetail), null);
  assert.equal(releaseForEnglishFilter(release, frenchDetail), null);
  assert.equal(
    releaseForEnglishFilter(release, englishDetailWithoutTitle)?.title,
    "ミニオンズ＆モンスターズ",
  );
  assert.equal(
    releaseForEnglishFilter(release, englishDetailWithoutTitle)
      ?.originalOrEnglishTitle,
    null,
  );
});
