export type LogLevel = "info" | "warn" | "error";

export function log(
  level: LogLevel,
  msg: string,
  fields?: Record<string, unknown>,
): void {
  console.log(
    JSON.stringify({ _timestamp: new Date().toISOString(), level, msg, ...fields }),
  );
}
