import test from "node:test";
import assert from "node:assert/strict";

import { normalizeDomainArticle, normalizeDomainProject } from "./domain-types";

test("normalizeDomainArticle hydrates deep domain object", () => {
  const rawArticle = {
    id: "test-1",
    title: "Test Article",
    content: "This is a **markdown** content.",
    description: "Explicit description",
    coverImage: "/images/test.jpg",
    tags: '["tag1", "tag2"]',
    date: "2026-06-05T00:00:00.000Z"
  };

  const article = normalizeDomainArticle(rawArticle, 0);

  assert.equal(article?.id, "test-1");
  assert.equal(article?.title, "Test Article");
  assert.equal(article?.summary, "Explicit description", "Should use explicit description as summary");
  assert.deepEqual(article?.tags, ["tag1", "tag2"], "Should parse tags string into array");
  assert.ok(article?.date instanceof Date, "Date should be a Date object");
  assert.equal(article?.coverImage, "/images/test.jpg");
  assert.equal(article?.href, "/articles/local-test-1", "Should compute local href correctly");
});

test("normalizeDomainArticle computes summary from content if no description", () => {
  const rawArticle = {
    id: "test-2",
    content: "This is some long content that should be stripped of markdown like **bold**.",
  };

  const article = normalizeDomainArticle(rawArticle, 1);
  assert.equal(article?.summary, "This is some long content that should be stripped of markdown like bold.");
});

test("normalizeDomainProject hydrates deep domain object", () => {
  const rawProject = {
    title: "Test Project",
    category: "Web",
    tech: "React, Next.js",
    url: "https://example.com",
    description: "A cool project",
    image_data: "/images/project.jpg",
    tags: '["tag1"]',
    date: "2026-06-05T00:00:00.000Z"
  };

  const project = normalizeDomainProject(rawProject, 0);

  assert.equal(project?.title, "Test Project");
  assert.deepEqual(project?.tags, ["Web", "React", "Next.js", "tag1"], "Should combine category, tech, and tags uniquely");
  assert.equal(project?.coverImage, "/images/project.jpg");
  assert.equal(project?.href, "/projects/local-Test%20Project");
});
