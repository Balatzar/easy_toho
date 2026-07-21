import assert from "node:assert/strict";
import test from "node:test";

import {
  createMovieCard,
  movieIdentityId,
} from "../src/lib/schedule-model.ts";

test("creates a normalized Movie Card through one interface", () => {
  const card = createMovieCard({
    sourceId: "toho",
    rawEnglishLabels: ["DUNE 2 / SUB"],
    sourceLabels: ["デューン 砂の惑星PART2 字幕版"],
    artworkUrl: "https://example.com/dune.jpg",
    runtimeMinutes: 166,
    rating: "G",
    showtimes: [
      showtime({ start: "12:00", language: "japanese" }),
      showtime({ start: "14:00", formats: ["IMAX"], language: "english" }),
      showtime({ start: "10:00", language: "english" }),
    ],
  });

  assert.equal(card.id, "dune-2-166m");
  assert.equal(card.title, "Dune 2");
  assert.equal(card.language, "english");
  assert.deepEqual(
    card.showtimes.map(({ start }) => start),
    ["14:00", "10:00", "12:00"],
  );
});

test("does not mutate adapter-owned Showtime order", () => {
  const showtimes = [
    showtime({ start: "12:00", language: "japanese" }),
    showtime({ start: "10:00", language: "english" }),
  ];

  createMovieCard({
    sourceId: "smt",
    rawEnglishLabels: ["TEST MOVIE / SUB"],
    sourceLabels: ["テスト映画 字幕版"],
    artworkUrl: null,
    runtimeMinutes: 90,
    rating: null,
    showtimes,
  });

  assert.deepEqual(
    showtimes.map(({ start }) => start),
    ["12:00", "10:00"],
  );
});

test("scopes an Unmatched Movie's Movie Identity to its Schedule Source", () => {
  const card = createMovieCard({
    sourceId: "eiga",
    rawEnglishLabels: [],
    sourceLabels: ["テスト映画"],
    artworkUrl: null,
    runtimeMinutes: null,
    rating: null,
    showtimes: [showtime({ start: "10:00", language: "japanese" })],
  });

  assert.match(card.id, /^unmatched-eiga-/);
  assert.equal(card.title, "テスト映画");
});

test("preserves Movie Identity across SMT grouping and Movie Card construction", () => {
  const identity = movieIdentityId({
    sourceId: "smt",
    rawEnglishLabels: ["DUNE 2 / SUB"],
    sourceLabels: ["デューン 砂の惑星PART2 字幕版"],
    runtimeMinutes: 166,
  });
  const card = createMovieCard({
    sourceId: "smt",
    rawEnglishLabels: ["DUNE 2 / SUB", "DUNE 2 IMAX / SUB"],
    sourceLabels: ["デューン 砂の惑星PART2 字幕版"],
    artworkUrl: null,
    runtimeMinutes: 166,
    rating: null,
    showtimes: [showtime({ start: "10:00", language: "english" })],
  });

  assert.equal(card.id, identity);
});

function showtime({
  start,
  formats = [],
  language,
}) {
  return {
    start,
    end: null,
    screen: "Screen 1",
    formats,
    language,
    languageLabel:
      language === "english" ? "English-watchable" : "Japanese",
    availability: "unknown",
    availabilityLabel: "Unknown",
    eventLabel: null,
  };
}
