// Dashboard numbers are always derived from the saved data - never hardcoded.
export function commentCountsByNote(comments) {
  const counts = {};
  comments.forEach((c) => {
    counts[c.noteId] = (counts[c.noteId] || 0) + 1;
  });
  return counts;
}

export function getUserStats({ notes, comments, favoriteIds, userId }) {
  const mine = notes.filter((n) => n.ownerId === userId);
  const active = mine.filter((n) => !n.archived);
  const archived = mine.filter((n) => n.archived);
  const visibleIds = new Set(notes.filter((n) => !n.archived).map((n) => n.id));
  const favoritesCount = new Set(favoriteIds.filter((id) => visibleIds.has(id))).size;
  const myNoteIds = new Set(mine.map((n) => n.id));
  return {
    activeNotes: active.length,
    archivedNotes: archived.length,
    favorites: favoritesCount,
    downloads: mine.reduce((sum, n) => sum + n.downloads.length, 0),
    likes: mine.reduce((sum, n) => sum + n.likedBy.length, 0),
    comments: comments.filter((c) => myNoteIds.has(c.noteId)).length,
  };
}

export function getAdminStats({ users, notes, comments }) {
  return {
    users: users.filter((u) => u.role === 'user').length,
    blockedUsers: users.filter((u) => u.status === 'blocked').length,
    activeNotes: notes.filter((n) => !n.archived).length,
    archivedNotes: notes.filter((n) => n.archived).length,
    downloads: notes.reduce((sum, n) => sum + n.downloads.length, 0),
    likes: notes.reduce((sum, n) => sum + n.likedBy.length, 0),
    comments: comments.length,
  };
}
