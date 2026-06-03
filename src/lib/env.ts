export type ServerEnvKey = keyof ImportMetaEnv;

export function readServerEnv(name: ServerEnvKey): string | undefined {
  const metaEnv = (import.meta as ImportMeta & { env?: ImportMetaEnv }).env;
  return process.env[name] ?? metaEnv?.[name];
}

export function readNumberServerEnv(name: ServerEnvKey, fallback: number): number {
  const raw = readServerEnv(name);
  if (!raw) return fallback;

  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}
