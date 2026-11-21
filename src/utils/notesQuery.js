import { toDayKey } from './dateUtils.js';

export const SORT_OPTIONS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'updated', label: 'Recently updated' },
];

export const DEFAULT_FILTERS = {
  query: '',
  scope: 'active', // active | favorites | archived | all
  sort: 'popular',
  faculty: '',
  semester: '',
  author: '',
  date: '',
};

function haystack(note) {
  return [
    note.title,
    note.content,
    note.subject,
    note.course,
    note.faculty,
    note.ownerName,
    (note.tags || []).join(' '),
  ]
    .join(' ')
    .toLowerCase();
}

export function popularityScore(note, commentCount = 0) {
  return (note.likedBy?.length || 0) + commentCount;
}

// Pure function: never mutates the saved notes. Search, scope, faculty,
// semester, author, date and sorting all combine (logical AND).
//   ctx.favoriteIds  - ids favorited by the current user
//   ctx.commentCounts - { [noteId]: number }
export function filterAndSortNotes(notes, filters = {}, ctx = {}) {
  const f = { ...DEFAULT_FILTERS, ...filters };
  const favorites = new Set(ctx.favoriteIds || []);
  const counts = ctx.commentCounts || {};
  const tokens = f.query.toLowerCase().split(/\s+/).filter(Boolean);
  const author = f.author.trim().toLowerCase();

  const result = notes.filter((note) => {
    if (f.scope === 'active' && note.archived) return false;
    if (f.scope === 'archived' && !note.archived) return false;
    if (f.scope === 'favorites' && (note.archived || !favorites.has(note.id))) return false;
    if (f.faculty && note.faculty !== f.faculty) return false;
    if (f.semester && String(note.semester) !== String(f.semester)) return false;
    if (author && !String(note.ownerName).toLowerCase().includes(author)) return false;
    if (f.date && toDayKey(note.createdAt) !== f.date) return false;
    if (tokens.length) {
      const text = haystack(note);
      if (!tokens.every((t) => text.includes(t))) return false;
    }
    return true;
  });

  const byId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const time = (iso) => Date.parse(iso) || 0;
  const comparators = {
    popular: (a, b) =>
      popularityScore(b, counts[b.id]) - popularityScore(a, counts[a.id]) ||
      (b.downloads?.length || 0) - (a.downloads?.length || 0) ||
      time(b.createdAt) - time(a.createdAt) ||
      byId(a, b),
    newest: (a, b) => time(b.createdAt) - time(a.createdAt) || byId(a, b),
    oldest: (a, b) => time(a.createdAt) - time(b.createdAt) || byId(a, b),
    updated: (a, b) => time(b.updatedAt) - time(a.updatedAt) || byId(a, b),
  };
  return [...result].sort(comparators[f.sort] || comparators.popular);
}

export function countFiltersActive(filters) {
  const f = { ...DEFAULT_FILTERS, ...filters };
  return ['query', 'faculty', 'semester', 'author', 'date'].filter((k) => f[k]).length;
}
