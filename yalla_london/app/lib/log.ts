export type Level = 'debug'|'info'|'warn'|'error';
export function jlog(level: Level, msg: string, extra: Record<string, unknown> = {}) {
  try { console.log(JSON.stringify({ ts: Date.now(), level, msg, ...extra })); } catch {}
}
