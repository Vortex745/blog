import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  getAdminTokenFromRequest,
  hasAdminWriteAccess,
} from "./auth";

test("admin session token is a standard JWT accepted from request headers", async () => {
  const token = await createSessionToken();

  assert.equal(token.split(".").length, 3);
  assert.equal(ADMIN_SESSION_MAX_AGE_SECONDS, 24 * 60 * 60);

  const request = new Request("https://example.com/api/articles", {
    headers: { "x-admin-token": token },
  });

  assert.equal(await hasAdminWriteAccess(request), true);
  assert.equal(await getAdminTokenFromRequest(request), token);
});

test("admin session token is accepted from the admin-token cookie", async () => {
  const token = await createSessionToken();
  const request = new Request("https://example.com/api/articles", {
    headers: { cookie: `theme=light; admin-token=${token}; other=1` },
  });

  assert.equal(await hasAdminWriteAccess(request), true);
  assert.equal(await getAdminTokenFromRequest(request), token);
});

test("tampered admin session token is rejected", async () => {
  const token = await createSessionToken();
  const tampered = token.replace(/\.[^.]+$/, ".invalid-signature");
  const request = new Request("https://example.com/api/articles", {
    headers: { "x-admin-token": tampered },
  });

  assert.equal(await hasAdminWriteAccess(request), false);
  assert.equal(await getAdminTokenFromRequest(request), null);
});

test("expired admin session token is rejected after one day", async () => {
  const token = await createSessionToken({
    issuedAt: new Date(Date.now() - (ADMIN_SESSION_MAX_AGE_SECONDS + 60) * 1000),
  });
  const request = new Request("https://example.com/api/articles", {
    headers: { "x-admin-token": token },
  });

  assert.equal(await hasAdminWriteAccess(request), false);
  assert.equal(await getAdminTokenFromRequest(request), null);
});
