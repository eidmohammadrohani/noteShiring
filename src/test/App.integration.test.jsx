import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppProviders } from '../app/App.jsx';
import AppRoutes from '../app/router.jsx';
import { getState, refreshState } from '../services/apiClient.js';
import { makeNote } from './helpers.js';

const student = {
  id: 'user-1',
  name: 'Alex Student',
  email: 'alex@notehub.test',
  studentId: 'S-100',
  role: 'user',
  status: 'active',
  phone: '+93 700 000 000',
  university: 'University',
  faculty: 'Business',
  department: 'Economics',
  semester: '2',
  bio: '',
  createdAt: '2026-01-01T00:00:00.000Z',
};
const administrator = {
  ...student,
  id: 'admin-1',
  name: 'Administrator',
  email: 'admin@notehub.test',
  role: 'admin',
};
const credentials = { identifier: student.email, password: 'Password@123' };
let saved;
let available;
let rejectSave;
let pendingSave;

const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
const anonymous = () => ({
  user: null,
  users: [],
  notes: [],
  comments: [],
  notifications: [],
  favoriteIds: [],
});

beforeEach(() => {
  saved = {
    user: null,
    users: [student, administrator],
    notes: [
      makeNote('own-note', {
        title: 'Binary Trees Explained',
        ownerId: student.id,
        ownerName: student.name,
        content: 'Tree traversal notes.',
      }),
      makeNote('other-note', {
        title: 'The Cardiac Cycle',
        ownerId: 'other-user',
        ownerName: 'Priya',
        content: 'Heart notes.',
      }),
    ],
    comments: [],
    notifications: [],
    favoriteIds: [],
  };
  available = true;
  rejectSave = false;
  pendingSave = null;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url, options = {}) => {
      if (!available) throw new TypeError('Connection refused');
      const path = url.replace('/api', '');
      const body = options.body ? JSON.parse(options.body) : {};
      if (path === '/state') return reply(structuredClone(saved.user ? saved : anonymous()));
      if (path === '/auth/login') {
        if (body.password !== credentials.password)
          return reply(
            { code: 'INVALID_CREDENTIALS', message: 'Incorrect email/ID or password.' },
            401,
          );
        saved.user = body.identifier === administrator.email ? administrator : student;
        return reply(saved.user);
      }
      if (path === '/auth/logout' || path === '/auth/password') {
        saved.user = null;
        return reply({ ok: true });
      }
      if (path === '/notes' && options.method === 'POST') {
        if (pendingSave) await pendingSave;
        if (rejectSave)
          return reply({ code: 'DATABASE', message: 'The note could not be saved.' }, 503);
        const note = makeNote('created-note', {
          ...body,
          ownerId: saved.user.id,
          ownerName: saved.user.name,
        });
        saved.notes.push(note);
        return reply(note, 201);
      }
      const archive = /^\/notes\/([^/]+)\/archive$/.exec(path);
      if (archive) {
        const note = saved.notes.find((item) => item.id === archive[1]);
        note.archived = body.archived;
        return reply(note);
      }
      const favorite = /^\/notes\/([^/]+)\/favorite$/.exec(path);
      if (favorite) {
        const id = favorite[1];
        const existed = saved.favoriteIds.includes(id);
        saved.favoriteIds = existed
          ? saved.favoriteIds.filter((item) => item !== id)
          : [...saved.favoriteIds, id];
        return reply({ favorited: !existed });
      }
      const deletion = /^\/notes\/([^/]+)$/.exec(path);
      if (deletion && options.method === 'DELETE') {
        saved.notes = saved.notes.filter((note) => note.id !== deletion[1]);
        return reply({ ok: true });
      }
      return reply({ code: 'NOT_FOUND', message: `No mock endpoint for ${path}` }, 404);
    }),
  );
});

function renderAt(path) {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </AppProviders>,
  );
}
const sidebar = () => within(screen.getByLabelText('Main navigation'));
const signedIn = () => {
  saved.user = student;
};

describe('API initialization and session routing', () => {
  it('shows a useful connection error and retries loading from the server', async () => {
    available = false;
    const user = userEvent.setup();
    renderAt('/app');
    expect(
      await screen.findByRole('heading', { name: 'Unable to load NoteHub' }),
    ).toBeInTheDocument();
    available = true;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });

  it('redirects anonymous visitors away from protected routes', async () => {
    renderAt('/app');
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
  });

  it.each([
    [student.email, /Welcome back, Alex/],
    [administrator.email, /Welcome back, Administrator/],
  ])('logs in with a server session for %s', async (identifier, heading) => {
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(await screen.findByLabelText('Email or student ID'), identifier);
    await user.type(screen.getByLabelText('Password'), credentials.password);
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('heading', { name: heading, level: 1 })).toBeInTheDocument();
    expect(localStorage.getItem('notehub:session')).toBeNull();
    expect(localStorage.getItem('notehub:users')).toBeNull();
  });

  it('keeps students out of administrator routes', async () => {
    signedIn();
    renderAt('/admin');
    expect(await screen.findByRole('heading', { name: /Welcome back, Alex/ })).toBeInTheDocument();
    expect(screen.queryByText('ADMIN CONSOLE')).not.toBeInTheDocument();
  });

  it('shows the server login error without navigating away', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(await screen.findByLabelText('Email or student ID'), student.email);
    await user.type(screen.getByLabelText('Password'), 'incorrect-password');
    await user.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Incorrect email/ID or password.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Log in' })).toBeEnabled();
  });

  it('logs out on the server after confirmation', async () => {
    signedIn();
    const user = userEvent.setup();
    renderAt('/app');
    await user.click(await screen.findByRole('button', { name: 'Logout' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Log out' }));
    expect(await screen.findByRole('heading', { name: 'Log in' })).toBeInTheDocument();
    expect(saved.user).toBeNull();
  });
});

describe('asynchronous note workflows', () => {
  beforeEach(signedIn);

  it('validates the editor before sending a request', async () => {
    const user = userEvent.setup();
    renderAt('/app/notes/new');
    await user.click(await screen.findByRole('button', { name: 'Create note' }));
    expect(await screen.findByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByText(/Content is required/)).toBeInTheDocument();
    expect(
      fetch.mock.calls.filter(
        ([url, options]) => url === '/api/notes' && options.method === 'POST',
      ),
    ).toHaveLength(0);
  });

  it('waits for the server before navigating and updates counts after a successful save', async () => {
    let finishSave;
    pendingSave = new Promise((resolve) => {
      finishSave = resolve;
    });
    const user = userEvent.setup();
    renderAt('/app/notes/new');
    await user.type(await screen.findByLabelText('Title'), 'Quantum Zebra Notes');
    await user.type(screen.getByLabelText('Content'), 'one two three');
    await user.click(screen.getByRole('button', { name: 'Create note' }));
    expect(screen.getByRole('button', { name: /Saving/ })).toBeDisabled();
    expect(saved.notes).toHaveLength(2);
    await act(async () => finishSave());
    expect(await screen.findByRole('heading', { name: 'Quantum Zebra Notes' })).toBeInTheDocument();
    await user.click(sidebar().getByRole('link', { name: 'Dashboard' }));
    expect(await screen.findByTestId('stat-active-notes')).toHaveTextContent('2');
    expect(localStorage.getItem('notehub:notes')).toBeNull();
  });

  it('keeps the editor content and reports a failed save', async () => {
    rejectSave = true;
    const user = userEvent.setup();
    renderAt('/app/notes/new');
    await user.type(await screen.findByLabelText('Title'), 'Keep this title');
    await user.type(screen.getByLabelText('Content'), 'Unsaved content');
    await user.click(screen.getByRole('button', { name: 'Create note' }));
    expect(await screen.findByText('The note could not be saved.')).toBeInTheDocument();
    expect(screen.getByLabelText('Content')).toHaveValue('Unsaved content');
    expect(screen.getByRole('button', { name: 'Create note' })).toBeEnabled();
    expect(saved.notes).toHaveLength(2);
  });

  it('favorites, archives and restores notes through API mutations', async () => {
    const user = userEvent.setup();
    renderAt('/app/explore');
    await user.click(
      await screen.findByRole('button', { name: 'Add to favorites: The Cardiac Cycle' }),
    );
    await screen.findByRole('button', { name: 'Remove from favorites: The Cardiac Cycle' });
    await user.click(sidebar().getByRole('link', { name: 'Favorites' }));
    await screen.findByRole('heading', { name: 'Favorites', level: 1 });
    expect(await screen.findByRole('article', { name: 'The Cardiac Cycle' })).toBeInTheDocument();
    await user.click(sidebar().getByRole('link', { name: 'My Notes' }));
    await user.click(await screen.findByRole('button', { name: 'Archive Binary Trees Explained' }));
    await waitFor(() =>
      expect(
        screen.queryByRole('article', { name: 'Binary Trees Explained' }),
      ).not.toBeInTheDocument(),
    );
    await user.click(sidebar().getByRole('link', { name: 'Archive' }));
    await user.click(await screen.findByRole('button', { name: 'Restore Binary Trees Explained' }));
    await user.click(sidebar().getByRole('link', { name: 'My Notes' }));
    expect(
      await screen.findByRole('article', { name: 'Binary Trees Explained' }),
    ).toBeInTheDocument();
  });

  it('preserves notes when deletion is cancelled and removes them after confirmation', async () => {
    const user = userEvent.setup();
    renderAt('/app/my-notes');
    await user.click(await screen.findByRole('button', { name: 'Delete Binary Trees Explained' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    expect(saved.notes).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Delete Binary Trees Explained' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete note' }),
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('article', { name: 'Binary Trees Explained' }),
      ).not.toBeInTheDocument(),
    );
    expect(saved.notes).toHaveLength(1);
  });

  it('refreshes a changed server snapshot without writing it into browser storage', async () => {
    renderAt('/app/my-notes');
    await screen.findByRole('article', { name: 'Binary Trees Explained' });
    saved.notes[0].title = 'Changed in another session';
    await act(async () => refreshState());
    expect(
      await screen.findByRole('article', { name: 'Changed in another session' }),
    ).toBeInTheDocument();
    expect(getState().notes[0].title).toBe('Changed in another session');
    expect(localStorage.getItem('notehub:notes')).toBeNull();
  });
});

it('keeps theme preference on this device across a remount', async () => {
  signedIn();
  const user = userEvent.setup();
  const first = renderAt('/app/settings');
  await user.click(await screen.findByRole('button', { name: 'Dark' }));
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  expect(localStorage.getItem('notehub:theme')).toBe('dark');
  first.unmount();
  document.documentElement.removeAttribute('data-theme');
  renderAt('/app/explore');
  await screen.findByRole('heading', { name: 'Explore notes' });
  expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
});

it('shows a Not Found page for unknown routes', async () => {
  renderAt('/does-not-exist');
  expect(await screen.findByText('Page not found')).toBeInTheDocument();
});
