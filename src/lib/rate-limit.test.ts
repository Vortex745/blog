import test from "node:test";
import assert from "node:assert/strict";

import { SlidingWindowRateLimiter } from "./rate-limit";

test("allows up to the configured number of checks per key within the window", () => {
  const limiter = new SlidingWindowRateLimiter({ windowMs: 1000, max: 3 });

  for (let i = 0; i < 3; i++) {
    assert.deepEqual(limiter.check("ip", 1000 + i), {
      allowed: true,
      retryAfterSeconds: 0,
    });
  }
  assert.equal(limiter.check("ip", 1003).allowed, false);
});

test("blocked checks report the seconds until the oldest attempt slides out", () => {
  const limiter = new SlidingWindowRateLimiter({ windowMs: 10_000, max: 2 });

  limiter.check("ip", 0);
  limiter.check("ip", 1000);

  const blocked = limiter.check("ip", 5000);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 5);
});

test("window slides: a quiet key may check again once its attempts age out", () => {
  const limiter = new SlidingWindowRateLimiter({ windowMs: 1000, max: 1 });

  assert.equal(limiter.check("ip", 0).allowed, true);
  assert.equal(limiter.check("ip", 500).allowed, false);
  // Both attempts age out of the window before the next check.
  assert.equal(limiter.check("ip", 1500).allowed, true);
});

test("blocked attempts are recorded too, so sustained retries stay blocked", () => {
  const limiter = new SlidingWindowRateLimiter({ windowMs: 1000, max: 1 });

  assert.equal(limiter.check("ip", 0).allowed, true);
  assert.equal(limiter.check("ip", 400).allowed, false);
  assert.equal(limiter.check("ip", 800).allowed, false);
  assert.equal(limiter.check("ip", 1200).allowed, false);
});

test("keys are counted independently", () => {
  const limiter = new SlidingWindowRateLimiter({ windowMs: 1000, max: 1 });

  assert.equal(limiter.check("a", 0).allowed, true);
  assert.equal(limiter.check("b", 0).allowed, true);
  assert.equal(limiter.check("a", 100).allowed, false);
  assert.equal(limiter.check("b", 100).allowed, false);
});

test("reset clears one key, or every key when omitted", () => {
  const limiter = new SlidingWindowRateLimiter({ windowMs: 1000, max: 1 });

  limiter.check("a", 0);
  limiter.check("b", 0);

  limiter.reset("a");
  assert.equal(limiter.check("a", 0).allowed, true);
  assert.equal(limiter.check("b", 0).allowed, false);

  limiter.reset();
  assert.equal(limiter.size, 0);
  assert.equal(limiter.check("b", 0).allowed, true);
});

test("expired buckets are swept so idle keys do not accumulate", () => {
  const limiter = new SlidingWindowRateLimiter({ windowMs: 100, max: 1 });

  for (let i = 0; i < 10; i++) {
    limiter.check(`ip-${i}`, 0);
  }
  assert.equal(limiter.size, 10);

  // A later check past the window triggers the periodic sweep.
  assert.equal(limiter.check("ip-new", 1000).allowed, true);
  assert.equal(limiter.size, 1);
});
