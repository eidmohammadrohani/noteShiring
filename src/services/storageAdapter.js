// Only appearance preferences are stored in the browser. Application data
// and authentication are handled by the server and MongoDB.
export const KEYS = { theme: 'theme' };
export function readRaw(key) {
  try {
    return globalThis.localStorage?.getItem(`notehub:${key}`) ?? null;
  } catch {
    return null;
  }
}
export function writeRaw(key, value) {
  try {
    globalThis.localStorage?.setItem(`notehub:${key}`, value);
  } catch {
    /* Theme preferences are optional. */
  }
}
