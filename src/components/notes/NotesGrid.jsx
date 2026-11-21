import NoteCard from './NoteCard.jsx';

export default function NotesGrid({ notes, viewer, base, commentCounts, favoriteIds, actions }) {
  const favorites = new Set(favoriteIds);

  return (
    <div className="notes-grid">
      {notes.map((note) => (
        <NoteCard
          key={note.id}
          note={note}
          viewer={viewer}
          base={base}
          commentCount={commentCounts[note.id] || 0}
          isFavorite={favorites.has(note.id)}
          actions={actions}
        />
      ))}
    </div>
  );
}
