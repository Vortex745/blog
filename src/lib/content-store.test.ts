import test from "node:test";
import assert from "node:assert/strict";
import { readContentArticles, writeContentArticles, readContentAbout, writeContentAbout } from "./content-store";
import type { DomainArticle } from "./domain-types";

const testArticles: unknown[] = [
  {
    id: "a1",
    title: "First Article",
    content: "Content one",
    description: "Desc one",
    coverImage: "",
    tags: ["tech"],
    date: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "a2",
    title: "Second Article",
    content: "Content two",
    description: "Desc two",
    coverImage: "",
    tags: ["life"],
    date: "2026-06-02T00:00:00.000Z",
  },
];

test("readContentArticles returns articles written by writeContentArticles with shared DB", async () => {
  const dbPath = ":memory:";

  await writeContentArticles(testArticles, { dbPath });

  const articles = await readContentArticles({ dbPath });

  assert.equal(articles.length, 2);
  assert.equal(articles[0].title, "Second Article", "should be ordered by date desc");
  assert.equal(articles[1].title, "First Article");
});

test("readContentArticles and readContentAbout share the same db connection", async () => {
  const dbPath = ":memory:";

  // Write articles first
  await writeContentArticles(testArticles, { dbPath });

  // Read articles and about — both should work with the same in-memory DB
  const [articles, about] = await Promise.all([
    readContentArticles({ dbPath }),
    readContentAbout({ dbPath }),
  ]);

  assert.equal(articles.length, 2, "articles should be readable");
  assert.equal(typeof about.name, "string", "about should return a valid object");
  assert.equal(about.name, "", "empty about should have empty name");
});

test("writeContentArticles with empty array returns empty result", async () => {
  const result = await writeContentArticles([], { dbPath: ":memory:" });
  assert.equal(result.length, 0);
});

test("writeContentArticles replaces existing articles (UPSERT behavior)", async () => {
  const dbPath = ":memory:";

  // Write initial articles
  await writeContentArticles(testArticles, { dbPath });
  const first = await readContentArticles({ dbPath });
  assert.equal(first.length, 2);

  // Write a different set: update a1, remove a2, add a3
  const updatedArticles: unknown[] = [
    {
      id: "a1",
      title: "Updated First",
      content: "Updated content",
      description: "Updated desc",
      coverImage: "",
      tags: ["updated"],
      date: "2026-06-03T00:00:00.000Z",
    },
    {
      id: "a3",
      title: "Third Article",
      content: "Content three",
      description: "Desc three",
      coverImage: "",
      tags: ["new"],
      date: "2026-06-04T00:00:00.000Z",
    },
  ];

  await writeContentArticles(updatedArticles, { dbPath });
  const result = await readContentArticles({ dbPath });

  assert.equal(result.length, 2, "should have 2 articles after replace");
  assert.equal(result[0].title, "Third Article", "a3 should be first by date");
  assert.equal(result[1].title, "Updated First", "a1 should be updated");
  // a2 should be gone
  assert.equal(result.find((a) => a.id === "a2"), undefined, "a2 should be removed");
});

test("writeContentAbout replaces existing about (single-row UPSERT)", async () => {
  const dbPath = ":memory:";

  // Write initial about
  await writeContentAbout({ name: "Alice", role: "Dev" }, { dbPath });
  const first = await readContentAbout({ dbPath });
  assert.equal(first.name, "Alice");

  // Replace with new about
  await writeContentAbout({ name: "Bob", role: "Designer" }, { dbPath });
  const second = await readContentAbout({ dbPath });
  assert.equal(second.name, "Bob", "about should be replaced, not duplicated");
});