import { describe, expect, it } from 'vitest';
import { commentCountsByNote, getAdminStats, getUserStats } from '../utils/stats.js';
import { makeNote } from './helpers.js';

const note = makeNote;

describe('dashboard statistics', () => {
  const notes = [
    note('a', {
      likedBy: ['x', 'y'],
      downloads: [{ userId: 'x', userName: 'X', at: '2026-01-01T00:00:00Z' }],
    }),
    note('b'),
    note('c', { archived: true }),
    note('d', { ownerId: 'other' }),
  ];
  const comments = [{ noteId: 'a' }, { noteId: 'a' }, { noteId: 'd' }];

  it('counts active, archived, favorites, likes, downloads and comments from real data', () => {
    const stats = getUserStats({ notes, comments, favoriteIds: ['a', 'd'], userId: 'me' });
    expect(stats).toEqual({
      activeNotes: 2,
      archivedNotes: 1,
      favorites: 2,
      downloads: 1,
      likes: 2,
      comments: 2,
    });
  });

  it('does not count favorites of archived or deleted notes', () => {
    const stats = getUserStats({ notes, comments, favoriteIds: ['c', 'gone'], userId: 'me' });
    expect(stats.favorites).toBe(0);
  });

  it('is all zero for empty data', () => {
    expect(getUserStats({ notes: [], comments: [], favoriteIds: [], userId: 'me' })).toEqual({
      activeNotes: 0,
      archivedNotes: 0,
      favorites: 0,
      downloads: 0,
      likes: 0,
      comments: 0,
    });
  });

  it('computes admin totals', () => {
    const users = [
      { role: 'admin', status: 'active' },
      { role: 'user', status: 'active' },
      { role: 'user', status: 'blocked' },
    ];
    expect(getAdminStats({ users, notes, comments })).toEqual({
      users: 2,
      blockedUsers: 1,
      activeNotes: 3,
      archivedNotes: 1,
      downloads: 1,
      likes: 2,
      comments: 3,
    });
  });

  it('groups comment counts by note', () => {
    expect(commentCountsByNote(comments)).toEqual({ a: 2, d: 1 });
  });
});
