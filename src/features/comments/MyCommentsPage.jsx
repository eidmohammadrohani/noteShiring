import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { CommentItem } from '../../components/notes/CommentSection.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useComments, useCurrentUser, useNotes } from '../../hooks/useData.js';
import { addComment } from '../../services/commentsStorage.js';
import { toUserMessage } from '../../services/errors.js';
import { notePath } from '../../utils/paths.js';

export default function MyCommentsPage() {
  const user = useCurrentUser();
  const notes = useNotes();
  const comments = useComments();
  const { notify } = useToast();
  const [noteId, setNoteId] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const available = notes.filter((n) => !n.archived);
  const mine = comments.filter((c) => c.userId === user.id);
  const titleOf = (id) => notes.find((n) => n.id === id)?.title || 'Deleted note';

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (!noteId) throw new Error('Choose a note to comment on.');
      await addComment({ noteId, text }, user);
      setText('');
      setError('');
      notify('Comment posted.');
    } catch (e) {
      setError(e instanceof Error && !e.code ? e.message : toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        icon={MessageSquare}
        title="My comments"
        subtitle="Comments you have written. You can delete your own comments at any time."
      />

      <form className="card comment-form" onSubmit={submit} noValidate>
        <div className="form-grid">
          <div className="field field-full">
            <label htmlFor="comment-note">Note</label>
            <select id="comment-note" value={noteId} onChange={(e) => setNoteId(e.target.value)}>
              <option value="">Select a note…</option>
              {available.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </div>
          <div className="field field-full">
            <label htmlFor="comment-text">Comment</label>
            <textarea
              id="comment-text"
              rows={3}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError('');
              }}
              placeholder="Write your comment…"
              aria-invalid={error ? 'true' : undefined}
            />
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
          </div>
        </div>
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Posting…' : 'Post comment'}
          </button>
        </div>
      </form>

      {mine.length === 0 ? (
        <EmptyState icon={MessageSquare} title="You have not commented yet">
          Open any note and share your thoughts.
        </EmptyState>
      ) : (
        <div className="card comment-groups">
          {mine.map((c) => (
            <div key={c.id} className="comment-group">
              <p className="small">
                On <Link to={notePath('/app', c.noteId)}>{titleOf(c.noteId)}</Link>
              </p>
              <ul className="comment-list">
                <CommentItem comment={c} viewer={user} />
              </ul>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
