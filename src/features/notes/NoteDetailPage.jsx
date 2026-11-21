import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Bookmark,
  Download,
  FileX,
  Heart,
  Paperclip,
  Pencil,
  Trash2,
  Users,
} from 'lucide-react';
import EmptyState from '../../components/common/EmptyState.jsx';
import Modal from '../../components/common/Modal.jsx';
import CommentSection from '../../components/notes/CommentSection.jsx';
import { useComments, useCurrentUser, useFavoriteIds, useNotes } from '../../hooks/useData.js';
import { useNoteActions } from './useNoteActions.js';
import { canModifyNote, canViewNote } from '../../services/notesStorage.js';
import { formatDateTime } from '../../utils/dateUtils.js';
import { formatFileSize } from '../../utils/files.js';
import { basePathFor, noteEditPath } from '../../utils/paths.js';

export default function NoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const notes = useNotes();
  const comments = useComments();
  const favoriteIds = useFavoriteIds(user.id);
  const actions = useNoteActions();
  const [showDownloaders, setShowDownloaders] = useState(false);
  const base = basePathFor(user);
  const listPath = user.role === 'admin' ? `${base}/notes` : `${base}/explore`;

  const note = notes.find((n) => n.id === id);
  if (!note || !canViewNote(note, user)) {
    return (
      <EmptyState
        icon={FileX}
        title="Note not found"
        action={
          <Link className="btn btn-primary" to={listPath}>
            Back to notes
          </Link>
        }
      >
        This note may have been deleted, archived by its author, or the link is incorrect.
      </EmptyState>
    );
  }

  const mine = canModifyNote(note, user);
  const liked = note.likedBy.includes(user.id);
  const favorite = favoriteIds.includes(note.id);
  const noteComments = comments
    .filter((c) => c.noteId === note.id)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const meta = [
    note.subject,
    note.course,
    note.faculty,
    note.semester && `Semester ${note.semester}`,
  ].filter(Boolean);

  async function handleDelete() {
    if (await actions.remove(note))
      navigate(user.role === 'admin' ? `${base}/notes` : `${base}/my-notes`, { replace: true });
  }

  return (
    <article className="note-detail">
      <Link className="back-link" to={listPath}>
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </Link>

      <header className="card detail-head">
        {note.archived && <span className="chip chip-muted">Archived</span>}
        <h1>{note.title}</h1>
        <p className="muted">
          By <strong>{note.ownerName}</strong> · created{' '}
          <time dateTime={note.createdAt}>{formatDateTime(note.createdAt)}</time>
          {note.updatedAt !== note.createdAt && (
            <>
              {' '}
              · modified <time dateTime={note.updatedAt}>{formatDateTime(note.updatedAt)}</time>
            </>
          )}
        </p>
        {meta.length > 0 && (
          <ul className="tag-list" aria-label="Details">
            {meta.map((m) => (
              <li key={m} className="chip">
                {m}
              </li>
            ))}
          </ul>
        )}
        {note.tags.length > 0 && (
          <ul className="tag-list" aria-label="Tags">
            {note.tags.map((t) => (
              <li key={t} className="chip chip-accent">
                #{t}
              </li>
            ))}
          </ul>
        )}
        <div className="row-actions">
          {!note.archived && (
            <>
              <button
                type="button"
                className={`btn btn-outline${liked ? ' is-on' : ''}`}
                aria-pressed={liked}
                onClick={() => actions.like(note)}
              >
                <Heart size={16} aria-hidden="true" fill={liked ? 'currentColor' : 'none'} />{' '}
                {liked ? 'Liked' : 'Like'} ({note.likedBy.length})
              </button>
              <button
                type="button"
                className={`btn btn-outline${favorite ? ' is-on' : ''}`}
                aria-pressed={favorite}
                onClick={() => actions.favorite(note)}
              >
                <Bookmark size={16} aria-hidden="true" fill={favorite ? 'currentColor' : 'none'} />{' '}
                {favorite ? 'Favorited' : 'Favorite'}
              </button>
            </>
          )}
          <button type="button" className="btn btn-primary" onClick={() => actions.download(note)}>
            <Download size={16} aria-hidden="true" /> Download
          </button>
          {mine && (
            <>
              <Link className="btn btn-outline" to={noteEditPath(base, note.id)}>
                <Pencil size={16} aria-hidden="true" /> Edit
              </Link>
              {note.archived ? (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => actions.restore(note)}
                >
                  <ArchiveRestore size={16} aria-hidden="true" /> Restore
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => actions.archive(note)}
                >
                  <Archive size={16} aria-hidden="true" /> Archive
                </button>
              )}
              <button type="button" className="btn btn-danger-outline" onClick={handleDelete}>
                <Trash2 size={16} aria-hidden="true" /> Delete
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowDownloaders(true)}
              >
                <Users size={16} aria-hidden="true" /> Who downloaded ({note.downloads.length})
              </button>
            </>
          )}
        </div>
      </header>

      <section className="card" aria-label="Note content">
        {note.content ? (
          <div className="note-content">{note.content}</div>
        ) : (
          <p className="muted">This note only has an attachment.</p>
        )}
        {note.file && (
          <div className="file-pill">
            <Paperclip size={16} aria-hidden="true" />
            <span className="file-name">{note.file.name}</span>
            <span className="muted">{formatFileSize(note.file.size)}</span>
          </div>
        )}
      </section>

      <CommentSection noteId={note.id} comments={noteComments} viewer={user} />

      {showDownloaders && (
        <Modal
          title={`Downloaded "${note.title}"`}
          onClose={() => setShowDownloaders(false)}
          labelId="downloaders-title"
          footer={
            <button
              type="button"
              className="btn btn-primary"
              data-autofocus
              onClick={() => setShowDownloaders(false)}
            >
              Close
            </button>
          }
        >
          {note.downloads.length === 0 ? (
            <p>No downloads yet for this note.</p>
          ) : (
            <ul className="plain-list">
              {[...note.downloads].reverse().map((d, i) => (
                <li key={`${d.userId}-${d.at}-${i}`}>
                  <strong>{d.userName}</strong>{' '}
                  <span className="muted">- {formatDateTime(d.at)}</span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </article>
  );
}
