export type Level = 'debug'|'info'|'warn'|'error';
export function jlog(level: Level, msg: string, extra: Record<string, unknown> = {}) {
  try { console.log(JSON.stringify({ ts: Date.now(), level, msg, ...extra })); } catch (e) { console.error("[jlog] serialization failed:", e instanceof Error ? e.message : e); }
}
