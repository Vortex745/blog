import test from "node:test";
import assert from "node:assert/strict";

import { createContentModule } from "./content-module";
import { CONTENT_CHANGED_EVENT } from "./content-channel";

type Item = { id: string };

function stubBrowser() {
  const writes: Array<[string, string]> = [];
  const store = new Map<string, string>();
  const events: Array<{ type: string; detail: unknown }> = [];
  const requests: Array<{ url: string; init: RequestInit }> = [];
  const scripts = new Map<string, string>();

  const previous = {
    localStorage: globalThis.localStorage,
    window: globalThis.window,
    fetch: globalThis.fetch,
    document: globalThis.document,
  };

  globalThis.localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
      writes.push([key, value]);
    },
  } as Storage;
  globalThis.window = {
    dispatchEvent: (event: Event) => {
      events.push({ type: event.type, detail: (event as CustomEvent).detail });
      return true;
    },
  } as unknown as Window & typeof globalThis;
  globalThis.document = {
    getElementById: (id: string) =>
      scripts.has(id) ? { textContent: scripts.get(id)! } : null,
  } as unknown as Document;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    requests.push({ url: String(url), init: init ?? {} });
    return {
      ok: false,
      json: async () => ({}),
    } as Response;
  }) as typeof fetch;

  return {
    writes,
    events,
    requests,
    store,
    scripts,
    respondWith(payload: { ok: boolean; body: unknown; status?: number }): void {
      globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
        requests.push({ url: String(url), init: init ?? {} });
        return {
          ok: payload.ok,
          json: async () => payload.body,
        } as Response;
      }) as typeof fetch;
    },
    failWithFetchError(): void {
      globalThis.fetch = (async () => {
        throw new Error("network down");
      }) as typeof fetch;
    },
    restore(): void {
      globalThis.localStorage = previous.localStorage;
      globalThis.window = previous.window;
      globalThis.fetch = previous.fetch;
      globalThis.document = previous.document;
    },
  };
}

function makeModule(browser: ReturnType<typeof stubBrowser>, overrides: Record<string, unknown> = {}) {
  const hydrated: Item[][] = [];
  const serverPersisted: Item[][] = [];
  const errors: string[] = [];
  const store = createContentModule<Item[]>({
    endpoint: "/api/articles",
    storageKey: "admin-articles-data",
    module: "articles",
    payloadKey: "articles",
    onHydrate: (value) => hydrated.push(value),
    onServerPersist: (value) => serverPersisted.push(value),
    onSyncError: (message) => errors.push(message),
    ...overrides,
  });
  return { store, hydrated, serverPersisted, errors, browser };
}

test("save falls back to local cache when the cloud sync fails", async () => {
  const browser = stubBrowser();
  try {
    browser.respondWith({ ok: false, body: { ok: false, message: "网络错误" }, status: 500 });
    const { store, errors } = makeModule(browser);

    const result = await store.save([{ id: "a1" }]);

    assert.equal(result, false);
    assert.deepEqual(errors, ["网络错误"]);
    assert.equal(browser.writes.length, 1);
    assert.equal(browser.writes[0][0], "admin-articles-data");
    assert.deepEqual(JSON.parse(browser.writes[0][1]), [{ id: "a1" }]);
  } finally {
    browser.restore();
  }
});

test("save treats a 200 response carrying an error body as a failure", async () => {
  const browser = stubBrowser();
  try {
    browser.respondWith({ ok: true, body: { ok: false, message: "缺少数据库配置" } });
    const { store, errors } = makeModule(browser);

    const result = await store.save([{ id: "a1" }]);

    assert.equal(result, false);
    assert.deepEqual(errors, ["缺少数据库配置"]);
    // 本地缓存仍然写入了（降级语义）
    assert.deepEqual(JSON.parse(browser.writes[0][1]), [{ id: "a1" }]);
  } finally {
    browser.restore();
  }
});

test("save puts the admin token and re-persists the server-normalized value on success", async () => {
  const browser = stubBrowser();
  try {
    browser.respondWith({ ok: true, body: { ok: true, articles: [{ id: "a1", updatedAt: "now" }] } });
    browser.store.set("admin-token", "secret-token");
    const { store, hydrated, serverPersisted } = makeModule(browser);

    const result = await store.save([{ id: "a1" }]);

    assert.equal(result, true);
    assert.equal(browser.requests.length, 1);
    assert.equal(browser.requests[0].url, "/api/articles");
    assert.equal(browser.requests[0].init.method, "PUT");
    const headers = browser.requests[0].init.headers as Record<string, string>;
    assert.equal(headers["x-admin-token"], "secret-token");
    assert.deepEqual(JSON.parse(browser.requests[0].init.body as string), { articles: [{ id: "a1" }] });
    // 保存流程只走 onServerPersist（变量刷新），不触发渲染型 onHydrate
    assert.equal(hydrated.length, 0);
    assert.deepEqual(serverPersisted, [[{ id: "a1", updatedAt: "now" }]]);
    assert.deepEqual(JSON.parse(browser.writes.at(-1)![1]), [{ id: "a1", updatedAt: "now" }]);
  } finally {
    browser.restore();
  }
});

test("persist writes the cache and dispatches the content changed event", () => {
  const browser = stubBrowser();
  try {
    const { store } = makeModule(browser);

    store.persist([{ id: "a1" }]);

    assert.equal(browser.writes.length, 1);
    assert.deepEqual(JSON.parse(browser.writes[0][1]), [{ id: "a1" }]);
    assert.equal(browser.events.length, 1);
    assert.equal(browser.events[0].type, CONTENT_CHANGED_EVENT);
    assert.deepEqual(browser.events[0].detail, { module: "articles" });
  } finally {
    browser.restore();
  }
});

test("load reads the cache and returns null when absent", () => {
  const browser = stubBrowser();
  try {
    const { store } = makeModule(browser);

    assert.equal(store.load(), null);

    browser.store.set("admin-articles-data", JSON.stringify([{ id: "a1" }]));
    assert.deepEqual(store.load(), [{ id: "a1" }]);
  } finally {
    browser.restore();
  }
});

test("readInitial parses the SSR payload three-state", () => {
  const browser = stubBrowser();
  try {
    const { store } = makeModule(browser);

    // script 缺失 → 全失败态
    assert.deepEqual(store.readInitial(), {
      value: null,
      storageConfigured: false,
      readFailed: true,
    });

    browser.scripts.set("initial-articles-data", JSON.stringify({
      articles: [{ id: "a1" }],
      storageConfigured: true,
      readFailed: false,
    }));
    assert.deepEqual(store.readInitial(), {
      value: [{ id: "a1" }],
      storageConfigured: true,
      readFailed: false,
    });

    // 非数组 payload 按缺失处理
    browser.scripts.set("initial-articles-data", JSON.stringify({
      articles: { unexpected: true },
      storageConfigured: true,
      readFailed: false,
    }));
    assert.deepEqual(store.readInitial(), {
      value: null,
      storageConfigured: true,
      readFailed: false,
    });

    // JSON 解析失败 → 全失败态
    browser.scripts.set("initial-articles-data", "not json");
    assert.deepEqual(store.readInitial(), {
      value: null,
      storageConfigured: false,
      readFailed: true,
    });
  } finally {
    browser.restore();
  }
});

test("hydrateFromCloud is gated on sqlite storage and skips non-sqlite responses", async () => {
  const browser = stubBrowser();
  try {
    browser.respondWith({ ok: true, body: { articles: [{ id: "a1" }], storage: "unconfigured" } });
    const { store, hydrated } = makeModule(browser);

    await store.hydrateFromCloud();

    assert.equal(hydrated.length, 0);
    assert.equal(browser.writes.length, 0);
  } finally {
    browser.restore();
  }
});

test("hydrateFromCloud caches without hydrating when the cloud value equals the local one", async () => {
  const browser = stubBrowser();
  try {
    browser.respondWith({ ok: true, body: { articles: [{ id: "a1" }], storage: "sqlite" } });
    const { store, hydrated } = makeModule(browser);
    store.persist([{ id: "a1" }]);
    browser.writes.length = 0;

    await store.hydrateFromCloud();

    assert.equal(hydrated.length, 0);
    assert.equal(browser.writes.length, 1);
  } finally {
    browser.restore();
  }
});

test("hydrateFromCloud hydrates the page when the cloud value differs", async () => {
  const browser = stubBrowser();
  try {
    browser.respondWith({ ok: true, body: { articles: [{ id: "a2" }], storage: "sqlite" } });
    const { store, hydrated } = makeModule(browser);
    store.persist([{ id: "a1" }]);
    browser.writes.length = 0;

    await store.hydrateFromCloud();

    assert.deepEqual(hydrated, [[{ id: "a2" }]]);
    assert.deepEqual(JSON.parse(browser.writes[0][1]), [{ id: "a2" }]);
  } finally {
    browser.restore();
  }
});

test("hydrateFromCloud swallows fetch errors", async () => {
  const browser = stubBrowser();
  try {
    browser.failWithFetchError();
    const { store, hydrated } = makeModule(browser);

    await store.hydrateFromCloud();

    assert.equal(hydrated.length, 0);
    assert.equal(browser.writes.length, 0);
  } finally {
    browser.restore();
  }
});

// ===== object 模式（about 型 payload）=====

type AboutPayload = { name: string; bio: string };

function makeObjectModule(browser: ReturnType<typeof stubBrowser>, overrides: Record<string, unknown> = {}) {
  const hydrated: AboutPayload[] = [];
  const serverPersisted: AboutPayload[] = [];
  const errors: string[] = [];
  const store = createContentModule<AboutPayload>({
    endpoint: "/api/about",
    storageKey: "admin-about-data",
    module: "about",
    payloadKey: "about",
    payloadShape: "object",
    onHydrate: (value) => hydrated.push(value),
    onServerPersist: (value) => serverPersisted.push(value),
    onSyncError: (message) => errors.push(message),
    ...overrides,
  });
  return { store, hydrated, serverPersisted, errors, browser };
}

test("object mode hydrates a non-empty plain object payload from sqlite storage", async () => {
  const browser = stubBrowser();
  try {
    browser.respondWith({ ok: true, body: { about: { name: "陈", bio: "简介" }, storage: "sqlite" } });
    const { store, hydrated } = makeObjectModule(browser);

    await store.hydrateFromCloud();

    assert.deepEqual(hydrated, [{ name: "陈", bio: "简介" }]);
    assert.deepEqual(JSON.parse(browser.writes[0][1]), { name: "陈", bio: "简介" });
  } finally {
    browser.restore();
  }
});

test("object mode rejects non-object payloads on hydrate", async () => {
  const browser = stubBrowser();
  try {
    browser.respondWith({ ok: true, body: { about: [{ name: "陈" }], storage: "sqlite" } });
    const { store, hydrated } = makeObjectModule(browser);

    await store.hydrateFromCloud();

    assert.equal(hydrated.length, 0);
    assert.equal(browser.writes.length, 0);
  } finally {
    browser.restore();
  }
});

test("object mode treats an empty object payload as missing on hydrate", async () => {
  const browser = stubBrowser();
  try {
    browser.respondWith({ ok: true, body: { about: {}, storage: "sqlite" } });
    const { store, hydrated } = makeObjectModule(browser);

    await store.hydrateFromCloud();

    assert.equal(hydrated.length, 0);
    assert.equal(browser.writes.length, 0);
  } finally {
    browser.restore();
  }
});

test("object mode readInitial accepts a non-empty object and rejects empty or non-object payloads", () => {
  const browser = stubBrowser();
  try {
    const { store } = makeObjectModule(browser);

    browser.scripts.set("initial-about-data", JSON.stringify({
      about: { name: "陈", bio: "简介" },
      storageConfigured: true,
      readFailed: false,
    }));
    assert.deepEqual(store.readInitial(), {
      value: { name: "陈", bio: "简介" },
      storageConfigured: true,
      readFailed: false,
    });

    // 空对象按缺失处理
    browser.scripts.set("initial-about-data", JSON.stringify({
      about: {},
      storageConfigured: true,
      readFailed: false,
    }));
    assert.equal(store.readInitial().value, null);

    // 数组 payload 在 object 模式下同样按缺失处理
    browser.scripts.set("initial-about-data", JSON.stringify({
      about: [{ name: "陈" }],
      storageConfigured: true,
      readFailed: false,
    }));
    assert.equal(store.readInitial().value, null);
  } finally {
    browser.restore();
  }
});

test("object mode save re-persists the server-normalized object on success", async () => {
  const browser = stubBrowser();
  try {
    browser.respondWith({ ok: true, body: { ok: true, about: { name: "陈", bio: "归一化", updatedAt: "now" } } });
    browser.store.set("admin-token", "secret-token");
    const { store, serverPersisted, hydrated } = makeObjectModule(browser);

    const result = await store.save({ name: "陈", bio: "简介" });

    assert.equal(result, true);
    const headers = browser.requests[0].init.headers as Record<string, string>;
    assert.equal(headers["x-admin-token"], "secret-token");
    assert.deepEqual(JSON.parse(browser.requests[0].init.body as string), { about: { name: "陈", bio: "简介" } });
    // 保存流程只走 onServerPersist（变量刷新），不触发渲染型 onHydrate
    assert.equal(hydrated.length, 0);
    assert.deepEqual(serverPersisted, [{ name: "陈", bio: "归一化", updatedAt: "now" }]);
    assert.deepEqual(JSON.parse(browser.writes.at(-1)![1]), { name: "陈", bio: "归一化", updatedAt: "now" });
  } finally {
    browser.restore();
  }
});

test("object mode save still succeeds while ignoring a non-object server payload", async () => {
  const browser = stubBrowser();
  try {
    browser.respondWith({ ok: true, body: { ok: true, about: {} } });
    const { store, serverPersisted } = makeObjectModule(browser);

    const result = await store.save({ name: "陈", bio: "简介" });

    assert.equal(result, true);
    assert.equal(serverPersisted.length, 0);
    // 本地缓存保留提交时的值（服务端值无效时不回写）
    assert.deepEqual(JSON.parse(browser.writes[0][1]), { name: "陈", bio: "简介" });
    assert.equal(browser.writes.length, 1);
  } finally {
    browser.restore();
  }
});

test("object mode save falls back to the local cache when the cloud sync fails", async () => {
  const browser = stubBrowser();
  try {
    browser.respondWith({ ok: false, body: { ok: false, message: "请先登录后台" }, status: 401 });
    const { store, errors } = makeObjectModule(browser);

    const result = await store.save({ name: "陈", bio: "简介" });

    assert.equal(result, false);
    assert.deepEqual(errors, ["请先登录后台"]);
    assert.equal(browser.writes.length, 1);
    assert.deepEqual(JSON.parse(browser.writes[0][1]), { name: "陈", bio: "简介" });
  } finally {
    browser.restore();
  }
});
