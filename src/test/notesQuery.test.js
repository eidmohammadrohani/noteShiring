import { describe, expect, it } from 'vitest';
import { filterAndSortNotes } from '../utils/notesQuery.js';
import { makeNote } from './helpers.js';

const make = (id, o = {}) =>
  makeNote(id, {
    title: id,
    content: '',
    ownerId: 'u1',
    ownerName: 'Alice',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...o,
  });

const notes = [
  make('alpha', {
    title: 'Alpha Trees',
    content: 'binary tree traversal',
    createdAt: '2026-01-03T10:00:00.000Z',
    updatedAt: '2026-01-04T10:00:00.000Z',
    faculty: 'Business',
    semester: '2',
    tags: ['exam'],
    likedBy: ['a', 'b'],
  }),
  make('beta', {
    title: 'Beta Cells',
    content: 'cell biology notes',
    ownerName: 'Bob',
    createdAt: '2026-01-02T10:00:00.000Z',
    updatedAt: '2026-01-02T10:00:00.000Z',
    faculty: 'Medicine',
    semester: '3',
  }),
  make('gamma', {
    title: 'Gamma Rays',
    content: 'physics of light',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-06T10:00:00.000Z',
    faculty: 'Business',
    semester: '3',
    likedBy: ['a'],
  }),
  make('delta', {
    title: 'Delta Archive',
    content: 'tree of life',
    archived: true,
    faculty: 'Medicine',
    createdAt: '2026-01-05T10:00:00.000Z',
  }),
];
const ids = (list) => list.map((n) => n.id);

describe('search', () => {
  it('matches title and content case-insensitively', () => {
    expect(ids(filterAndSortNotes(notes, { query: 'ALPHA' }))).toEqual(['alpha']);
    expect(ids(filterAndSortNotes(notes, { query: 'physics' }))).toEqual(['gamma']);
  });

  it('requires every word to match, and also searches tags and author', () => {
    expect(ids(filterAndSortNotes(notes, { query: 'binary traversal' }))).toEqual(['alpha']);
    expect(ids(filterAndSortNotes(notes, { query: 'binary physics' }))).toEqual([]);
    expect(ids(filterAndSortNotes(notes, { query: 'exam' }))).toEqual(['alpha']);
    expect(ids(filterAndSortNotes(notes, { query: 'bob' }))).toEqual(['beta']);
  });

  it('hides archived notes from the default scope', () => {
    expect(ids(filterAndSortNotes(notes, { query: 'tree' }))).toEqual(['alpha']);
  });
});

describe('scopes and filters', () => {
  it('shows only archived notes in the archived scope', () => {
    expect(ids(filterAndSortNotes(notes, { scope: 'archived' }))).toEqual(['delta']);
  });

  it('favorites scope returns favorites only and never archived ones', () => {
    const ctx = { favoriteIds: ['alpha', 'delta'] };
    expect(ids(filterAndSortNotes(notes, { scope: 'favorites' }, ctx))).toEqual(['alpha']);
  });

  it('combines search with the favorites scope', () => {
    const ctx = { favoriteIds: ['alpha', 'gamma'] };
    expect(ids(filterAndSortNotes(notes, { scope: 'favorites', query: 'light' }, ctx))).toEqual([
      'gamma',
    ]);
    expect(ids(filterAndSortNotes(notes, { scope: 'favorites', query: 'cell' }, ctx))).toEqual([]);
  });

  it('combines faculty, semester, author and date filters', () => {
    expect(ids(filterAndSortNotes(notes, { faculty: 'Business', semester: '3' }))).toEqual([
      'gamma',
    ]);
    expect(ids(filterAndSortNotes(notes, { author: 'bo' }))).toEqual(['beta']);
    expect(ids(filterAndSortNotes(notes, { scope: 'all', faculty: 'Medicine' }))).toHaveLength(2);
  });

  it('filters by creation day', () => {
    const day = new Date('2026-01-02T10:00:00.000Z');
    const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    expect(ids(filterAndSortNotes(notes, { date: key }))).toEqual(['beta']);
  });

  it('returns an empty list when nothing matches and never changes the input', () => {
    const copy = JSON.stringify(notes);
    expect(filterAndSortNotes(notes, { query: 'zzz' })).toEqual([]);
    filterAndSortNotes(notes, { sort: 'oldest' });
    expect(JSON.stringify(notes)).toBe(copy);
  });
});

describe('sorting', () => {
  it('sorts newest, oldest and recently updated', () => {
    expect(ids(filterAndSortNotes(notes, { sort: 'newest' }))).toEqual(['alpha', 'beta', 'gamma']);
    expect(ids(filterAndSortNotes(notes, { sort: 'oldest' }))).toEqual(['gamma', 'beta', 'alpha']);
    expect(ids(filterAndSortNotes(notes, { sort: 'updated' }))).toEqual(['gamma', 'alpha', 'beta']);
  });

  it('sorts by likes plus comments for "popular"', () => {
    expect(
      ids(filterAndSortNotes(notes, { sort: 'popular' }, { commentCounts: { beta: 5 } })),
    ).toEqual(['beta', 'alpha', 'gamma']);
  });

  it('keeps sorting while a search is active', () => {
    expect(ids(filterAndSortNotes(notes, { query: 'a', sort: 'oldest' }))).toEqual([
      'gamma',
      'beta',
      'alpha',
    ]);
  });
});
