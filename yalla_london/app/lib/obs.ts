// Lightweight JSON logger + timing for API routes (no secrets)
type LogObj = Record<string, unknown>;

export function rid(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);
}

export function logj(obj: LogObj) {
  try {
    const safe = { ts: Date.now(), ...obj };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(safe));
  } catch {
    // noop
  }
}

export async function withTiming<T>(
  name: string,
  fn: () => Promise<T>,
  extra: LogObj = {}
): Promise<T> {
  const t0 = process.hrtime.bigint();
  try {
    const res = await fn();
    const t1 = process.hrtime.bigint();
    logj({ evt: `${name}.ok`, ms: Number(t1 - t0) / 1e6, ...extra });
    return res;
  } catch (err) {
    const t1 = process.hrtime.bigint();
    logj({ evt: `${name}.err`, ms: Number(t1 - t0) / 1e6, err: String(err), ...extra });
    throw err;
  }
}
