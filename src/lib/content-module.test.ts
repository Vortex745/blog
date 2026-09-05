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

  const previous = {
    localStorage: globalThis.localStorage,
    window: globalThis.window,
    fetch: globalThis.fetch,
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
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    requests.push({ url: String(url), init: init ?? {} });
    return stubResponse();
  }) as typeof fetch;

  function stubResponse(): Response {
    return {
      ok: false,
      json: async () => ({}),
    } as Response;
  }

  return {
    writes,
    events,
    requests,
    store,
    respondWith(payload: { ok: boolean; body: unknown; status?: number }): void {
      globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
        requests.push({ url: String(url), init: init ?? {} });
        return {
          ok: payload.ok,
          json: async () => payload.body,
        } as Response;
      }) as typeof fetch;
    },
    restore(): void {
      globalThis.localStorage = previous.localStorage;
      globalThis.window = previous.window;
      globalThis.fetch = previous.fetch;
    },
  };
}

test("save falls back to local cache when the cloud sync fails", async () => {
  const browser = stubBrowser();
  try {
    browser.respondWith({ ok: false, body: { ok: false, message: "网络错误" }, status: 500 });
    const errors: string[] = [];
    const store = createContentModule<Item[]>({
      endpoint: "/api/articles",
      storageKey: "admin-articles-data",
      module: "articles",
      payloadKey: "articles",
      onHydrate: () => {},
      onSyncError: (message) => errors.push(message),
    });

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

test("save puts the admin token and re-persists the server-normalized value on success", async () => {
  const browser = stubBrowser();
  try {
    browser.respondWith({ ok: true, body: { ok: true, articles: [{ id: "a1", updatedAt: "now" }] } });
    browser.store.set("admin-token", "secret-token");
    const hydrated: Item[][] = [];
    const store = createContentModule<Item[]>({
      endpoint: "/api/articles",
      storageKey: "admin-articles-data",
      module: "articles",
      payloadKey: "articles",
      onHydrate: (value) => hydrated.push(value),
    });

    const result = await store.save([{ id: "a1" }]);

    assert.equal(result, true);
    assert.equal(browser.requests.length, 1);
    assert.equal(browser.requests[0].url, "/api/articles");
    assert.equal(browser.requests[0].init.method, "PUT");
    const headers = browser.requests[0].init.headers as Record<string, string>;
    assert.equal(headers["x-admin-token"], "secret-token");
    assert.deepEqual(JSON.parse(browser.requests[0].init.body as string), { articles: [{ id: "a1" }] });
    assert.equal(hydrated.length, 1);
    assert.deepEqual(JSON.parse(browser.writes.at(-1)![1]), [{ id: "a1", updatedAt: "now" }]);
  } finally {
    browser.restore();
  }
});

test("persist writes the cache and dispatches the content changed event", () => {
  const browser = stubBrowser();
  try {
    const store = createContentModule<Item[]>({
      endpoint: "/api/articles",
      storageKey: "admin-articles-data",
      module: "articles",
      payloadKey: "articles",
      onHydrate: () => {},
    });

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
    const store = createContentModule<Item[]>({
      endpoint: "/api/articles",
      storageKey: "admin-articles-data",
      module: "articles",
      payloadKey: "articles",
      onHydrate: () => {},
    });

    assert.equal(store.load(), null);

    browser.store.set("admin-articles-data", JSON.stringify([{ id: "a1" }]));
    assert.deepEqual(store.load(), [{ id: "a1" }]);
  } finally {
    browser.restore();
  }
});
