/**
 * Admin 内容深模块：本地缓存 + 云端同步 + 失败降级的唯一实现。
 *
 * 覆盖两种既有调用方式，不加模式开关：
 * - 保存即上云（文章 / 项目）：save() = persist + PUT + 失败降级
 * - 本地保存、手动上云（图库）：persist() 与 save() 分别调用
 *
 * 降级语义是接口契约的一部分：save 云端失败时仍 persist 本地、
 * 回调 onSyncError、返回 false。
 */
import { dispatchContentChanged, type ContentModule } from "./content-channel";

export type InitialState<T> = {
  value: T | null;
  storageConfigured: boolean;
  readFailed: boolean;
};

export type ContentModuleStore<T> = {
  load(): T | null;
  readInitial(): InitialState<T>;
  persist(value: T): void;
  save(value: T): Promise<boolean>;
  hydrateFromCloud(): Promise<void>;
};

export function createContentModule<T>(config: {
  endpoint: string;
  storageKey: string;
  module: ContentModule;
  payloadKey: string;
  onHydrate: (value: T) => void;
  onSyncError?: (message: string) => void;
  /**
   * save() 云端确认成功后的回调（服务端归一化数据到达）。
   * 与 onHydrate 不同：不触发渲染——保存流程的渲染时机由调用方掌握，
   * onHydrate 专属于后台云端回填（hydrateFromCloud）。
   */
  onServerPersist?: (value: T) => void;
}): ContentModuleStore<T> {
  const { endpoint, storageKey, module, payloadKey, onHydrate, onSyncError, onServerPersist } = config;
  let current: T | null = null;

  function cache(value: T): void {
    localStorage.setItem(storageKey, JSON.stringify(value));
  }

  function readInitial(): InitialState<T> {
    const source = document.getElementById(`initial-${module}-data`)?.textContent;
    if (!source) return { value: null, storageConfigured: false, readFailed: true };

    try {
      const parsed = JSON.parse(source);
      return {
        // 数组型 payload 防护：非数组值（缺字段 / 形状漂移）按缺失处理，页面回退空表
        value: Array.isArray(parsed?.[payloadKey]) ? (parsed[payloadKey] as T) : null,
        storageConfigured: parsed?.storageConfigured === true,
        readFailed: parsed?.readFailed === true,
      };
    } catch {
      return { value: null, storageConfigured: false, readFailed: true };
    }
  }

  function load(): T | null {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        current = JSON.parse(raw);
        return current;
      }
    } catch {}
    return null;
  }

  function persist(value: T): void {
    current = value;
    cache(value);
    dispatchContentChanged(module);
  }

  async function save(value: T): Promise<boolean> {
    persist(value);

    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: {
          "content-type": "application/json",
          "x-admin-token": localStorage.getItem("admin-token") || "",
        },
        body: JSON.stringify({ [payloadKey]: value }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.message || "云端同步失败");
      }

      if (Array.isArray(result[payloadKey])) {
        const serverValue = result[payloadKey] as T;
        persist(serverValue);
        onServerPersist?.(serverValue);
      }
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "云端同步失败";
      onSyncError?.(message);
      return false;
    }
  }

  async function hydrateFromCloud(): Promise<void> {
    try {
      const response = await fetch(endpoint, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!response.ok) return;

      const data = await response.json();
      const remote = data?.[payloadKey];
      if (data?.storage !== "sqlite" || !Array.isArray(remote)) return;
      const remoteValue = remote as T;

      if (JSON.stringify(current) === JSON.stringify(remote)) {
        cache(remoteValue);
        return;
      }

      current = remoteValue;
      cache(remoteValue);
      onHydrate(remoteValue);
    } catch {}
  }

  return { load, readInitial, persist, save, hydrateFromCloud };
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;

/** 全局 toast 提示：admin 页面共用一份实现与同一个 DOM 节点。 */
export function showToast(text: string, type = "info"): void {
  let toast = document.getElementById("admin-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "admin-toast";
    toast.className = "admin-toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = text;
  toast.className = `admin-toast is-${type} is-visible`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast!.classList.remove("is-visible");
  }, 1000);
}
