import { expect, test } from "bun:test";
import { getRechtskodex } from "../src/lib/rechtskodex";
import { buildSearchIndex } from "../src/lib/rechtskodex-index";
import { createSearchIndex, searchCodex } from "../src/lib/rechtskodex-search";
import { getTatbestaende } from "../src/lib/tatbestaende";

const index = createSearchIndex(buildSearchIndex(getRechtskodex(), getTatbestaende()));
const top = (query, count = 5) =>
  searchCodex(index, query).hits.slice(0, count).map((entry) => `${entry.code} ${entry.label} ${entry.heading}`);

test("a norm reference shows exactly that passage", () => {
  const { hits } = searchCodex(index, "KStGB 10");
  expect(hits.length).toBeGreaterThan(0);
  expect(hits.every((entry) => entry.code === "KStGB" && entry.num === "10")).toBe(true);
  expect(searchCodex(index, "kstgb§10").hits[0]?.num).toBe("10");
  expect(searchCodex(index, "Art 5").hits[0]?.code).toBe("KV");
});

test("a leading law narrows the search to that law", () => {
  const outcome = searchCodex(index, "jo haft");
  expect(outcome.scope).toBe("JO");
  expect(outcome.hits.every((entry) => entry.code === "JO")).toBe(true);
  expect(outcome.hits.length).toBeGreaterThan(0);
});

test("word endings and everyday words find the codex term", () => {
  expect(searchCodex(index, "Waffen").hits.some((entry) => entry.code === "WaffG")).toBe(true);
  expect(searchCodex(index, "Knast").hits.length).toBeGreaterThan(0);
  expect(searchCodex(index, "Bußgeld").hits.length).toBeGreaterThan(0);
  expect(searchCodex(index, "Polizisten").hits.length).toBeGreaterThan(0);
});

test("a typo is corrected and reported", () => {
  for (const [typo, wanted] of [["Diebstal", "Diebstahl"], ["Imunität", "Immunität"], ["Notstnad", "Notstand"]]) {
    const outcome = searchCodex(index, typo);
    expect(outcome.correction).toBe(wanted);
    expect(outcome.hits.length).toBeGreaterThan(0);
  }
  expect(searchCodex(index, "Mord").correction).toBeNull();
});

test("title hits rank above text hits", () => {
  expect(top("Notstand", 1)[0].toLowerCase()).toContain("notstand");
});

test("filler words and empty queries are harmless", () => {
  expect(searchCodex(index, "   ").hits).toEqual([]);
  expect(searchCodex(index, "wer entscheidet über Gnade").hits.length).toBeGreaterThan(0);
  expect(searchCodex(index, "xqzvwk").hits).toEqual([]);
});
