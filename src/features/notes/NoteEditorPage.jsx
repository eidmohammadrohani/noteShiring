import { Link, useParams } from 'react-router-dom';
import { FileX } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import NoteEditor from '../../components/notes/NoteEditor.jsx';
import { useCurrentUser, useNotes } from '../../hooks/useData.js';
import { canModifyNote } from '../../services/notesStorage.js';
import { basePathFor } from '../../utils/paths.js';

export default function NoteEditorPage({ mode }) {
  const { id } = useParams();
  const user = useCurrentUser();
  const notes = useNotes();
  const base = basePathFor(user);

  if (mode === 'create') {
    return (
      <>
        <PageHeader title="Upload a note" subtitle="Share your notes with everyone on NoteHub." />
        <NoteEditor key="new" />
      </>
    );
  }

  const note = notes.find((n) => n.id === id);
  if (!note) {
    return (
      <EmptyState
        icon={FileX}
        title="Note not found"
        action={
          <Link
            className="btn btn-primary"
            to={`${base}/${user.role === 'admin' ? 'notes' : 'my-notes'}`}
          >
            Back to notes
          </Link>
        }
      >
        This note may have been deleted or the link is incorrect.
      </EmptyState>
    );
  }
  if (!canModifyNote(note, user)) {
    return (
      <EmptyState
        icon={FileX}
        title="You cannot edit this note"
        action={
          <Link className="btn btn-primary" to={`${base}/explore`}>
            Back to Explore
          </Link>
        }
      >
        Only the author or an administrator can edit a note.
      </EmptyState>
    );
  }
  return (
    <>
      <PageHeader title="Edit note" subtitle={note.title} />
      <NoteEditor key={note.id} note={note} />
    </>
  );
}
