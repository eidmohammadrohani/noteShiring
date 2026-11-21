import { emitChange } from './events.js';
import { ServiceError } from './errors.js';

const emptyState = () => ({
  user: null,
  users: [],
  notes: [],
  comments: [],
  notifications: [],
  favoriteIds: [],
});
let state = emptyState();
let connection = { ready: false, loading: false, error: null };
let pendingRefresh = null;
let revision = 0;

export const getState = () => state;
export const getConnectionStatus = () => connection;
export function updateCachedState(update) {
  state = update(state);
  emitChange();
}

export async function request(path, { method = 'GET', body } = {}) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(method !== 'GET'
          ? { 'Content-Type': 'application/json', 'X-NoteHub-Request': '1' }
          : {}),
      },
      ...(method !== 'GET' ? { body: JSON.stringify(body ?? {}) } : {}),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    const error = new ServiceError(
      'CONNECTION',
      'Cannot reach NoteHub. Check that the server and MongoDB are running, then try again.',
    );
    connection = { ...connection, error };
    emitChange();
    throw error;
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      revision += 1;
      state = emptyState();
      emitChange();
    }
    throw new ServiceError(
      data?.code || 'API_ERROR',
      data?.message || 'The request could not be completed.',
      data?.details || {},
    );
  }
  if (!data || typeof data !== 'object')
    throw new ServiceError('CONNECTION', 'NoteHub returned an invalid response. Please try again.');
  return data;
}

export function refreshState() {
  if (pendingRefresh) return pendingRefresh;
  connection = { ...connection, loading: true };
  emitChange();
  const currentRevision = revision;
  pendingRefresh = request('/state')
    .then((next) => {
      if (
        !['users', 'notes', 'comments', 'notifications', 'favoriteIds'].every((key) =>
          Array.isArray(next[key]),
        )
      ) {
        throw new ServiceError('CONNECTION', 'NoteHub returned incomplete data. Please try again.');
      }
      if (currentRevision !== revision) return state;
      state = next;
      connection = { ready: true, loading: false, error: null };
      emitChange();
      return state;
    })
    .catch((error) => {
      connection = { ...connection, loading: false, error };
      emitChange();
      throw error;
    })
    .finally(() => {
      pendingRefresh = null;
    });
  return pendingRefresh;
}

// Update the view only after the API has accepted a change.
export async function mutate(path, method = 'POST', body = {}) {
  const result = await request(path, { method, body });
  revision += 1;
  if (pendingRefresh) await pendingRefresh.catch(() => {});
  if (
    path === '/auth/logout' ||
    path === '/auth/password' ||
    (path === '/users/me' && method === 'DELETE')
  ) {
    state = emptyState();
    emitChange();
  }
  // Refresh failure does not undo a write that the server already committed.
  // Keep its successful response so the same change is not submitted twice.
  await refreshState().catch(() => {});
  return result;
}

export function resetApiState() {
  state = emptyState();
  connection = { ready: false, loading: false, error: null };
  pendingRefresh = null;
  revision += 1;
  emitChange();
}
