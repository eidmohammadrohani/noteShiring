import { useState } from 'react';
import { MessageSquare, Reply, Trash2 } from 'lucide-react';
import EmptyState from '../common/EmptyState.jsx';
import { useConfirm } from '../common/ConfirmDialog.jsx';
import { useToast } from '../common/Toast.jsx';
import { addComment, deleteComment, replyToComment } from '../../services/commentsStorage.js';
import { toUserMessage } from '../../services/errors.js';
import { LIMITS } from '../../utils/constants.js';
import { timeAgo } from '../../utils/dateUtils.js';

export function CommentItem({ comment, viewer, noteTitle }) {
  const confirm = useConfirm();
  const { notify } = useToast();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isAdmin = viewer.role === 'admin';
  const canDelete = isAdmin || viewer.id === comment.userId;

  async function remove() {
    if (busy) return;
    const ok = await confirm({
      title: 'Delete this comment?',
      message: 'This will permanently remove the comment.',
      confirmLabel: 'Delete comment',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await deleteComment(comment.id, viewer);
      notify('Comment deleted.');
    } catch (e) {
      notify(toUserMessage(e), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function sendReply(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await replyToComment(comment.id, reply, viewer);
      setReply('');
      setReplying(false);
      setError('');
      notify('Reply posted.');
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="comment">
      <div className="comment-head">
        <strong>{comment.userName}</strong>
        {noteTitle && <span className="muted"> on {noteTitle}</span>}
        <span className="muted"> · {timeAgo(comment.createdAt)}</span>
      </div>
      <p className="comment-text">{comment.text}</p>

      {comment.replies.length > 0 && (
        <ul className="replies">
          {comment.replies.map((r) => (
            <li key={r.id}>
              <span className="chip">Admin</span> <strong>{r.userName}</strong>
              <span className="muted"> · {timeAgo(r.createdAt)}</span>
              <p className="comment-text">{r.text}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="comment-actions">
        {isAdmin && (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={busy}
            onClick={() => setReplying((v) => !v)}
            aria-expanded={replying}
          >
            <Reply size={14} aria-hidden="true" /> Reply
          </button>
        )}
        {canDelete && (
          <button
            type="button"
            className="btn btn-ghost danger"
            disabled={busy}
            onClick={remove}
            aria-label={`Delete comment by ${comment.userName}`}
          >
            <Trash2 size={14} aria-hidden="true" /> Delete
          </button>
        )}
      </div>

      {replying && (
        <form className="reply-form" onSubmit={sendReply}>
          <label className="sr-only" htmlFor={`reply-${comment.id}`}>
            Reply to {comment.userName}
          </label>
          <textarea
            id={`reply-${comment.id}`}
            rows={2}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Write a reply…"
            aria-invalid={error ? 'true' : undefined}
          />
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Posting…' : 'Post reply'}
          </button>
        </form>
      )}
    </li>
  );
}

export default function CommentSection({ noteId, comments, viewer }) {
  const { notify } = useToast();
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await addComment({ noteId, text }, viewer);
      setText('');
      setError('');
      notify('Comment posted.');
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="section-title">
        Comments ({comments.length})
      </h2>
      <form className="comment-form" onSubmit={submit} noValidate>
        <label htmlFor="new-comment">Add a comment</label>
        <textarea
          id="new-comment"
          rows={3}
          value={text}
          maxLength={LIMITS.COMMENT_MAX + 50}
          onChange={(e) => {
            setText(e.target.value);
            setError('');
          }}
          placeholder="Share feedback or ask a question…"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'new-comment-error' : undefined}
        />
        {error && (
          <p className="field-error" id="new-comment-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Posting…' : 'Post comment'}
        </button>
      </form>
      {comments.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No comments yet">
          Be the first to share feedback on this note.
        </EmptyState>
      ) : (
        <ul className="comment-list">
          {comments.map((c) => (
            <CommentItem key={c.id} comment={c} viewer={viewer} />
          ))}
        </ul>
      )}
    </section>
  );
}
