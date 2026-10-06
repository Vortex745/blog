import test from "node:test";
import assert from "node:assert/strict";

import {
  IMAGE_ACCEPT_TYPES,
  COVER_IMAGE_MAX_SIZE,
  AVATAR_IMAGE_MAX_SIZE,
  validateImageFile,
} from "../scripts/admin-upload";

function fileOf(type: string, size: number): File {
  return new File([new Uint8Array(size)], "test.png", { type });
}

test("shared accept list covers the six types every admin page allowed before", () => {
  assert.deepEqual(IMAGE_ACCEPT_TYPES, [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
  ]);
});

test("validateImageFile accepts every previously allowed type at a small size", () => {
  for (const type of IMAGE_ACCEPT_TYPES) {
    const check = validateImageFile(fileOf(type, 1024));
    assert.deepEqual(check, { valid: true }, type);
  }
});

test("validateImageFile rejects unsupported types with the type reason", () => {
  const check = validateImageFile(fileOf("application/pdf", 1024));
  assert.equal(check.valid, false);
  if (!check.valid) {
    assert.equal(check.reason, "type");
    assert.equal(check.maxSizeMb, "32");
  }
});

test("validateImageFile enforces the 32MB cover/content limit from the articles page", () => {
  assert.equal(COVER_IMAGE_MAX_SIZE, 32 * 1024 * 1024);

  const atLimit = validateImageFile(fileOf("image/png", COVER_IMAGE_MAX_SIZE));
  assert.equal(atLimit.valid, true);

  const overLimit = validateImageFile(fileOf("image/png", COVER_IMAGE_MAX_SIZE + 1));
  assert.equal(overLimit.valid, false);
  if (!overLimit.valid) {
    assert.equal(overLimit.reason, "size");
    assert.equal(overLimit.sizeMb, "32.0");
    assert.equal(overLimit.maxSizeMb, "32");
  }
});

test("validateImageFile enforces the 5MB avatar limit from the about page", () => {
  assert.equal(AVATAR_IMAGE_MAX_SIZE, 5 * 1024 * 1024);

  const overLimit = validateImageFile(fileOf("image/png", AVATAR_IMAGE_MAX_SIZE + 1), AVATAR_IMAGE_MAX_SIZE);
  assert.equal(overLimit.valid, false);
  if (!overLimit.valid) {
    assert.equal(overLimit.reason, "size");
    assert.equal(overLimit.maxSizeMb, "5");
  }
});
