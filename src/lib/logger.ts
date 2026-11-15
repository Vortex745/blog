// One JSON line per record on stdout: Docker json-file captures it and
// fluent-bit tails it into OpenObserve. Caller fields spread last so a
// colliding caller key overrides a core key (lossless).
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
