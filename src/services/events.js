// React views subscribe to changes in the shared in-memory API snapshot.
let version = 0;
const listeners = new Set();

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getVersion() {
  return version;
}

export function emitChange() {
  version += 1;
  listeners.forEach((listener) => listener());
}
