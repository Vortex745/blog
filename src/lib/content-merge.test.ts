import test from "node:test";
import assert from "node:assert/strict";

import { uniqueByContentKey } from "./content-merge";

test("uniqueByContentKey drops candidates colliding by id or title", () => {
  const taken = [
    { id: "static-a", title: "静态文章A" },
    { id: "static-b", title: "静态文章B" },
  ];
  const candidates = [
    { id: "static-a", title: "另一个标题" }, // id 冲突
    { id: "fresh-1", title: "静态文章B" }, // 标题冲突
    { id: "fresh-2", title: "全新文章" }, // 保留
  ];

  const kept = uniqueByContentKey(candidates, (item) => ({ id: item.id, title: item.title }), taken);
  assert.deepEqual(kept, [{ id: "fresh-2", title: "全新文章" }]);
});

test("uniqueByContentKey keeps everything when no keys are taken", () => {
  const candidates = [{ id: "a", title: "A" }, { id: "b", title: "B" }];
  assert.equal(uniqueByContentKey(candidates, (item) => item, []).length, 2);
});
