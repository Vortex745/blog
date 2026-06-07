import test from "node:test";
import assert from "node:assert/strict";
import { shouldSkipRewrite } from "./rewrite";

test("shouldSkipRewrite returns true for empty strings", () => {
  assert.equal(shouldSkipRewrite(""), true);
  assert.equal(shouldSkipRewrite("   "), true);
});

test("shouldSkipRewrite returns true for very short CJK queries (≤3 chars)", () => {
  assert.equal(shouldSkipRewrite("部署"), true);
  assert.equal(shouldSkipRewrite("AI"), true);
  assert.equal(shouldSkipRewrite("性能"), true);
});

test("shouldSkipRewrite returns false for multi-character CJK queries (>3 chars)", () => {
  assert.equal(shouldSkipRewrite("性能优化方案"), false);
  assert.equal(shouldSkipRewrite("如何部署"), false);
});

test("shouldSkipRewrite returns true for short Latin queries (≤6 chars)", () => {
  assert.equal(shouldSkipRewrite("hi"), true);
  assert.equal(shouldSkipRewrite("deploy"), true);
});

test("shouldSkipRewrite returns true for single Latin word ≤10 chars", () => {
  assert.equal(shouldSkipRewrite("TypeScript"), true);
  assert.equal(shouldSkipRewrite("Kubernetes"), true);
});

test("shouldSkipRewrite returns false for multi-word Latin queries", () => {
  assert.equal(shouldSkipRewrite("how to deploy"), false);
  assert.equal(shouldSkipRewrite("如何部署 Astro 博客"), false);
});

test("shouldSkipRewrite returns false for long single Latin word (>10 chars)", () => {
  assert.equal(shouldSkipRewrite("containerization"), false);
});