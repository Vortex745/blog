import test from "node:test";
import assert from "node:assert/strict";

import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  AuthConfigError,
  createSessionToken,
  getAdminTokenFromRequest,
  hasAdminWriteAccess,
  verifyCredentials,
} from "./auth";

// The auth module requires explicit credentials; provide deterministic test
// values before any test exercises token creation or verification.
process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.ADMIN_SECRET = "test-admin-secret";

function withEnv(name: string, run: () => void | Promise<void>): Promise<void> {
  return (async () => {
    const saved = process.env[name];
    delete process.env[name];
    try {
      await run();
    } finally {
      if (saved === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = saved;
      }
    }
  })();
}

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

test("verifyCredentials accepts the configured admin user and rejects others", () => {
  assert.equal(verifyCredentials("admin", "test-admin-password"), true);
  assert.equal(verifyCredentials("admin", "wrong-password"), false);
  assert.equal(verifyCredentials("root", "test-admin-password"), false);
  assert.equal(verifyCredentials("", ""), false);
});

test("verifyCredentials rejects non-ASCII passwords of any length without throwing", () => {
  assert.equal(verifyCredentials("admin", "密密码"), false);
  assert.equal(verifyCredentials("管理员", "test-admin-password"), false);
});

test("missing ADMIN_PASSWORD raises a guided error instead of a default password", async () => {
  await withEnv("ADMIN_PASSWORD", () => {
    assert.throws(
      () => verifyCredentials("admin", "anything"),
      (error: unknown) => {
        assert.ok(error instanceof AuthConfigError);
        assert.match(error.message, /ADMIN_PASSWORD/);
        assert.match(error.message, /\.env/);
        assert.match(error.message, /ADMIN_PASSWORD=/);
        return true;
      }
    );
  });
});

test("missing ADMIN_SECRET raises a guided error with a paste-ready .env line", async () => {
  await withEnv("ADMIN_SECRET", async () => {
    await assert.rejects(
      () => createSessionToken(),
      (error: unknown) => {
        assert.ok(error instanceof AuthConfigError);
        assert.match(error.message, /ADMIN_SECRET/);
        assert.match(error.message, /ADMIN_SECRET=/);
        assert.match(error.message, /randomBytes/);
        return true;
      }
    );
  });
});

test("tampered tokens still verify against the configured secret only", async () => {
  // A token signed with the legacy password-derived secret must be rejected.
  const legacySigned = await createSessionToken();
  const request = new Request("https://example.com/api/login", {
    headers: { "x-admin-token": `${legacySigned}x` },
  });

  assert.equal(await hasAdminWriteAccess(request), false);
});
