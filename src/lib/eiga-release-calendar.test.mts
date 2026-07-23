import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeReleaseMonth,
  parseEigaReleaseCalendarPage,
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
    posterUrl: "https://media.eiga.com/english/320.jpg",
    director: "John Smith",
    synopsis: "A short synopsis.",
    sourceUrl: "https://eiga.com/movie/100001/",
    likelyEnglish: true,
  });
  assert.equal(groups[0]?.releases[1]?.likelyEnglish, false);
  assert.equal(groups[1]?.date, "2026-08-14");
  assert.equal(groups[1]?.releases[0]?.likelyEnglish, true);
});

test("normalizes and shifts release months", () => {
  assert.equal(normalizeReleaseMonth("2026-08", "2026-07"), "2026-08");
  assert.equal(normalizeReleaseMonth("2026-13", "2026-07"), "2026-07");
  assert.equal(normalizeReleaseMonth(undefined, "2026-07"), "2026-07");
  assert.equal(shiftReleaseMonth("2026-12", 1), "2027-01");
  assert.equal(shiftReleaseMonth("2026-01", -1), "2025-12");
});
