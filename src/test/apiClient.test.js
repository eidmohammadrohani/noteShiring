import { expect, it, vi } from 'vitest';
import {
  getConnectionStatus,
  getState,
  mutate,
  refreshState,
  request,
} from '../services/apiClient.js';
import { makeNote } from './helpers.js';
import { login } from '../services/authService.js';

const state = (overrides = {}) => ({
  user: null,
  users: [],
  notes: [],
  comments: [],
  notifications: [],
  favoriteIds: [],
  ...overrides,
});
const response = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
};

it('sends JSON mutations through the same-origin API with the required request header', async () => {
  const fetch = vi.fn().mockResolvedValue(response({ id: 'note-1' }, 201));
  vi.stubGlobal('fetch', fetch);
  await expect(request('/notes', { method: 'POST', body: { title: 'Saved' } })).resolves.toEqual({
    id: 'note-1',
  });
  const [url, options] = fetch.mock.calls[0];
  expect(url).toBe('/api/notes');
  expect(options.credentials).toBe('same-origin');
  expect(options.headers['X-NoteHub-Request']).toBe('1');
  expect(options.headers['Content-Type']).toBe('application/json');
  expect(JSON.parse(options.body)).toEqual({ title: 'Saved' });
});

it('keeps field validation details from server errors', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      response(
        {
          code: 'VALIDATION',
          message: 'Fix the fields.',
          details: { errors: { title: 'Required' } },
        },
        400,
      ),
    ),
  );
  await expect(request('/notes', { method: 'POST' })).rejects.toMatchObject({
    code: 'VALIDATION',
    details: { errors: { title: 'Required' } },
  });
});

it('deduplicates simultaneous state loads and does not store app data in LocalStorage', async () => {
  const pending = deferred();
  const fetch = vi.fn().mockReturnValue(pending.promise);
  vi.stubGlobal('fetch', fetch);
  const first = refreshState();
  const second = refreshState();
  expect(first).toBe(second);
  pending.resolve(response(state({ notes: [makeNote('persisted')] })));
  await first;
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(getState().notes[0].id).toBe('persisted');
  expect(localStorage.length).toBe(0);
});

it('leaves cached notes unchanged when the database rejects a mutation', async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(response(state({ notes: [makeNote('kept')] })))
    .mockResolvedValueOnce(response({ code: 'FORBIDDEN', message: 'Cannot edit this note.' }, 403));
  vi.stubGlobal('fetch', fetch);
  await refreshState();
  await expect(mutate('/notes/kept', 'DELETE')).rejects.toMatchObject({ code: 'FORBIDDEN' });
  expect(getState().notes.map((note) => note.id)).toEqual(['kept']);
  expect(fetch).toHaveBeenCalledTimes(2);
});

it('refreshes after a successful mutation even when an older state request is pending', async () => {
  const oldState = deferred();
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(response(state({ notes: [makeNote('old')] })))
    .mockReturnValueOnce(oldState.promise)
    .mockResolvedValueOnce(response({ id: 'new' }, 201))
    .mockResolvedValueOnce(response(state({ notes: [makeNote('new')] })));
  vi.stubGlobal('fetch', fetch);
  await refreshState();
  const backgroundRefresh = refreshState();
  const save = mutate('/notes', 'POST', { title: 'new', content: 'saved' });
  await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(3));
  oldState.resolve(response(state({ notes: [makeNote('old')] })));
  await Promise.all([backgroundRefresh, save]);
  expect(getState().notes.map((note) => note.id)).toEqual(['new']);
  expect(fetch).toHaveBeenCalledTimes(4);
});

it('preserves the last saved snapshot and exposes connection failures for the interface', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response(state({ notes: [makeNote('saved')] })))
      .mockRejectedValueOnce(new TypeError('Connection refused')),
  );
  await refreshState();
  await expect(refreshState()).rejects.toMatchObject({ code: 'CONNECTION' });
  expect(getState().notes[0].id).toBe('saved');
  expect(getConnectionStatus()).toMatchObject({
    ready: true,
    loading: false,
    error: { code: 'CONNECTION' },
  });
});

it('returns an accepted mutation when a following state reload fails, so the write is not retried', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response(state({ notes: [makeNote('saved')] })))
      .mockResolvedValueOnce(response({ id: 'created' }, 201))
      .mockRejectedValueOnce(new TypeError('Connection refused')),
  );
  await refreshState();
  await expect(
    mutate('/notes', 'POST', { title: 'Created', content: 'Saved in MongoDB' }),
  ).resolves.toEqual({ id: 'created' });
  expect(getConnectionStatus().error).toMatchObject({ code: 'CONNECTION' });
});

it('retains the server-verified identity if login succeeds but the workspace refresh fails', async () => {
  const user = { id: 'signed-in', name: 'Alex', role: 'user', status: 'active' };
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(response(state()))
      .mockResolvedValueOnce(response(user))
      .mockRejectedValueOnce(new TypeError('Connection refused')),
  );
  await refreshState();
  await expect(login('alex@notehub.test', 'Password@123')).resolves.toEqual(user);
  expect(getState().user).toEqual(user);
  expect(getState().notes).toEqual([]);
  expect(getConnectionStatus().error).toMatchObject({ code: 'CONNECTION' });
});

it('clears private cached data when the server rejects an expired session', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValueOnce(
        response(state({ user: { id: 'user-1' }, notes: [makeNote('private')] })),
      )
      .mockResolvedValueOnce(response({ code: 'UNAUTHORIZED', message: 'Please log in.' }, 401)),
  );
  await refreshState();
  await expect(mutate('/notes/private', 'DELETE')).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  expect(getState().user).toBeNull();
  expect(getState().notes).toEqual([]);
});
