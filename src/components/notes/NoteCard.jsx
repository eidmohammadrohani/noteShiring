import { Link } from 'react-router-dom';
import {
  Archive,
  ArchiveRestore,
  Bookmark,
  Download,
  Eye,
  Heart,
  MessageSquare,
  Pencil,
  Trash2,
} from 'lucide-react';
import { canModifyNote } from '../../services/notesStorage.js';
import { fileTag } from '../../utils/files.js';
import { formatDate } from '../../utils/dateUtils.js';
import { noteEditPath, notePath } from '../../utils/paths.js';
import { truncate } from '../../utils/text.js';

export default function NoteCard({
  note,
  viewer,
  base,
  commentCount = 0,
  isFavorite = false,
  actions,
}) {
  const mine = canModifyNote(note, viewer);
  const liked = note.likedBy.includes(viewer.id);
  const title = note.title;

  return (
    <article className={`note-card${note.archived ? ' is-archived' : ''}`} aria-label={title}>
      <div className="note-cover">
        <span className="file-tag">{fileTag(note)}</span>
        {note.archived && <span className="chip chip-muted">Archived</span>}
      </div>
      <div className="note-body">
        <div className="note-subject">{note.subject || note.faculty || 'General'}</div>
        <h3 className="note-title">
          <Link to={notePath(base, note.id)}>{title}</Link>
        </h3>
        <p className="note-excerpt">
          {truncate(note.content, 130) || 'Attachment only - open to download.'}
        </p>
        {note.tags.length > 0 && (
          <ul className="tag-list" aria-label="Tags">
            {note.tags.slice(0, 3).map((tag) => (
              <li key={tag} className="chip">
                {tag}
              </li>
            ))}
          </ul>
        )}
        <div className="note-meta">
          <span>{note.ownerName}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={note.createdAt}>{formatDate(note.createdAt)}</time>
          {note.updatedAt !== note.createdAt && (
            <span className="muted"> (edited {formatDate(note.updatedAt)})</span>
          )}
        </div>
        <div className="note-stats" aria-label="Statistics">
          <span title="Likes">
            <Heart size={14} aria-hidden="true" /> {note.likedBy.length}
            <span className="sr-only"> likes</span>
          </span>
          <span title="Comments">
            <MessageSquare size={14} aria-hidden="true" /> {commentCount}
            <span className="sr-only"> comments</span>
          </span>
          <span title="Downloads">
            <Download size={14} aria-hidden="true" /> {note.downloads.length}
            <span className="sr-only"> downloads</span>
          </span>
        </div>
        <div className="note-actions">
          {!note.archived && (
            <>
              <button
                type="button"
                className={`icon-btn${liked ? ' is-on' : ''}`}
                aria-pressed={liked}
                aria-label={`${liked ? 'Unlike' : 'Like'} ${title}`}
                onClick={() => actions.like(note)}
              >
                <Heart size={16} aria-hidden="true" fill={liked ? 'currentColor' : 'none'} />
              </button>
              <button
                type="button"
                className={`icon-btn${isFavorite ? ' is-on' : ''}`}
                aria-pressed={isFavorite}
                aria-label={`${isFavorite ? 'Remove from favorites' : 'Add to favorites'}: ${title}`}
                onClick={() => actions.favorite(note)}
              >
                <Bookmark
                  size={16}
                  aria-hidden="true"
                  fill={isFavorite ? 'currentColor' : 'none'}
                />
              </button>
            </>
          )}
          <Link className="icon-btn" to={notePath(base, note.id)} aria-label={`View ${title}`}>
            <Eye size={16} aria-hidden="true" />
          </Link>
          <button
            type="button"
            className="icon-btn"
            aria-label={`Download ${title}`}
            onClick={() => actions.download(note)}
          >
            <Download size={16} aria-hidden="true" />
          </button>
          {mine && (
            <>
              <Link
                className="icon-btn"
                to={noteEditPath(base, note.id)}
                aria-label={`Edit ${title}`}
              >
                <Pencil size={16} aria-hidden="true" />
              </Link>
              {note.archived ? (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Restore ${title}`}
                  onClick={() => actions.restore(note)}
                >
                  <ArchiveRestore size={16} aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Archive ${title}`}
                  onClick={() => actions.archive(note)}
                >
                  <Archive size={16} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                className="icon-btn danger"
                aria-label={`Delete ${title}`}
                onClick={() => actions.remove(note)}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
