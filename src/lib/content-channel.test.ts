import test from "node:test";
import assert from "node:assert/strict";

import { CONTENT_CHANGED_EVENT, CONTENT_STORAGE_KEYS } from "./content-channel";

test("storage keys match the exact legacy strings so existing caches stay valid", () => {
  assert.equal(CONTENT_STORAGE_KEYS.articles, "admin-articles-data");
  assert.equal(CONTENT_STORAGE_KEYS.projects, "admin-projects-data");
  assert.equal(CONTENT_STORAGE_KEYS.about, "admin-about-data");
  assert.equal(CONTENT_STORAGE_KEYS.gallery, "admin-gallery-data");
  assert.equal(CONTENT_STORAGE_KEYS.home, "admin-home-data");
});

test("storage keys are unique", () => {
  const values = Object.values(CONTENT_STORAGE_KEYS);
  assert.equal(new Set(values).size, values.length);
});

test("content changed event name stays stable", () => {
  assert.equal(CONTENT_CHANGED_EVENT, "admin-content:changed");
});
