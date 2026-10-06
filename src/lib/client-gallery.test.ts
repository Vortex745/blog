import test from "node:test";
import assert from "node:assert/strict";

import {
  applyDownloadOverlay,
  bumpDownloadOverlay,
  loadGalleryDownloadOverlay,
  mergeGalleryImages,
  pickLocalGalleryImages,
} from "./client-gallery";
import { CONTENT_STORAGE_KEYS, GALLERY_DOWNLOADS_STORAGE_KEY } from "./content-channel";

const SQLITE_ITEM = {
  id: "sq-1",
  title: "云端图",
  imageData: "data:image/webp;base64,QUJD",
  date: "2026-01-01T00:00:00.000Z",
};

test("mergeGalleryImages with an empty local side keeps every sqlite entry normalized", () => {
  const merged = mergeGalleryImages([SQLITE_ITEM], []);

  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0], {
    id: "sq-1",
    url: "data:image/webp;base64,QUJD",
    title: "云端图",
    name: "云端图",
    filename: "云端图",
    size: 0,
    type: "image/unknown",
    source: "sqlite",
    date: "2026-01-01T00:00:00.000Z",
    downloadCount: 0,
  });
});

test("mergeGalleryImages with an empty sqlite side passes local items through untouched", () => {
  const localItem = {
    id: "loc-1",
    url: "/uploads/cat.jpg",
    title: "本地猫",
    source: "local",
    downloadCount: 2,
  };

  assert.deepEqual(mergeGalleryImages([], [localItem]), [localItem]);
});

test("mergeGalleryImages falls back to the untitled default when sqlite rows have no title", () => {
  const merged = mergeGalleryImages([{ id: "sq-2", imageData: "data:image/png;base64,QQ==" }], []);

  assert.equal(merged[0].title, "未命名图片");
  assert.equal(merged[0].name, "未命名图片");
  assert.equal(merged[0].filename, "");
});

test("mergeGalleryImages drops local entries whose id collides with a sqlite entry", () => {
  const localCopy = {
    id: "sq-1",
    url: "data:image/webp;base64,QUJD",
    title: "云端图",
    source: "sqlite",
    date: "2026-01-01T00:00:00.000Z",
    downloadCount: 3,
  };
  const genuinelyLocal = { id: "loc-1", url: "/uploads/cat.jpg", title: "本地猫" };

  const merged = mergeGalleryImages([SQLITE_ITEM], [localCopy, genuinelyLocal]);

  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, "sq-1");
  assert.equal(merged[0].source, "sqlite");
  assert.equal(merged[0].downloadCount, 0);
  assert.deepEqual(merged[1], genuinelyLocal);
});

test("mergeGalleryImages is idempotent so the reload remerge never duplicates or drops entries", () => {
  const localItem = { id: "loc-1", url: "/uploads/cat.jpg", title: "本地猫" };
  const once = mergeGalleryImages([SQLITE_ITEM], [localItem]);

  const twice = mergeGalleryImages([SQLITE_ITEM], once);

  assert.deepEqual(twice, once);
});

test("pickLocalGalleryImages strips sqlite-sourced entries so persistence output carries no imageData", () => {
  const localUpload = {
    id: "loc-1",
    url: "/uploads/cat.jpg",
    title: "本地猫",
    source: "local",
    downloadCount: 2,
  };
  const merged = mergeGalleryImages([SQLITE_ITEM], [localUpload]);

  const persistable = pickLocalGalleryImages(merged);

  assert.deepEqual(persistable, [localUpload]);
  assert.ok(persistable.every((img) => !("imageData" in img && img.imageData)));
  assert.ok(persistable.every((img) => img.source !== "sqlite"));
});

test("pickLocalGalleryImages purges legacy backflow copies even when their sqlite source is gone", () => {
  const staleBackflow = {
    id: "deleted-sq",
    url: "data:image/webp;base64,QUJD",
    title: "已删除的云端图",
    source: "sqlite",
    date: "2026-01-01T00:00:00.000Z",
    downloadCount: 0,
  };
  const genuinelyLocal = { id: "loc-1", url: "/uploads/cat.jpg", title: "本地猫", source: "local" };

  assert.deepEqual(pickLocalGalleryImages([staleBackflow, genuinelyLocal]), [genuinelyLocal]);
});

test("the download overlay key is registered in content-channel and does not collide with module keys", () => {
  assert.equal(GALLERY_DOWNLOADS_STORAGE_KEY, "admin-gallery-downloads");
  assert.ok(!(Object.values(CONTENT_STORAGE_KEYS) as string[]).includes(GALLERY_DOWNLOADS_STORAGE_KEY));
});

test("loadGalleryDownloadOverlay parses a valid counts map and rejects malformed payloads", () => {
  // Read-only stub: loadGalleryDownloadOverlay never writes, setItem is a no-op.
  const storageOf = (value: string | null) => ({ getItem: () => value, setItem: () => {} });

  assert.deepEqual(loadGalleryDownloadOverlay(storageOf(null)), {});
  assert.deepEqual(loadGalleryDownloadOverlay(storageOf("not json")), {});
  assert.deepEqual(loadGalleryDownloadOverlay(storageOf("[1,2]")), {});
  assert.deepEqual(loadGalleryDownloadOverlay(storageOf("42")), {});
  assert.deepEqual(loadGalleryDownloadOverlay(storageOf('{"sq-1":2,"bad":"x","neg":-1,"frac":1.5}')), {
    "sq-1": 2,
    frac: 1.5,
  });
});

test("applyDownloadOverlay adds this browser's counts on top of existing downloadCount fields", () => {
  const sqliteEntry = { id: "sq-1", url: "data:image/webp;base64,QUJD", downloadCount: 7, source: "sqlite" };
  const localEntry = { id: "loc-1", url: "/uploads/cat.jpg", downloadCount: 2, source: "local" };
  const untouched = { id: "loc-2", url: "/uploads/dog.jpg", downloadCount: 5, source: "local" };

  const applied = applyDownloadOverlay([sqliteEntry, localEntry, untouched], { "sq-1": 1, "loc-1": 3 });

  assert.deepEqual(applied, [
    { id: "sq-1", url: "data:image/webp;base64,QUJD", downloadCount: 8, source: "sqlite" },
    { id: "loc-1", url: "/uploads/cat.jpg", downloadCount: 5, source: "local" },
    untouched,
  ]);
  // 原条目不被就地修改
  assert.equal(sqliteEntry.downloadCount, 7);
});

test("applyDownloadOverlay falls back to the url as the overlay key when an entry has no id", () => {
  const noId = { url: "/uploads/legacy.jpg" };

  assert.deepEqual(applyDownloadOverlay([noId], { "/uploads/legacy.jpg": 4 }), [
    { url: "/uploads/legacy.jpg", downloadCount: 4 },
  ]);
});

test("bumpDownloadOverlay returns a new map with the id incremented without mutating the input", () => {
  const before = { "sq-1": 2 };

  const after = bumpDownloadOverlay(before, "sq-1");

  assert.deepEqual(after, { "sq-1": 3 });
  assert.deepEqual(before, { "sq-1": 2 });
  assert.deepEqual(bumpDownloadOverlay({}, "loc-1"), { "loc-1": 1 });
  assert.deepEqual(bumpDownloadOverlay(before, ""), before);
});
