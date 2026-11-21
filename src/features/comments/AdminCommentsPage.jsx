import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, Search } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { CommentItem } from '../../components/notes/CommentSection.jsx';
import { useComments, useCurrentUser, useNotes } from '../../hooks/useData.js';
import { notePath } from '../../utils/paths.js';

export default function AdminCommentsPage() {
  const user = useCurrentUser();
  const notes = useNotes();
  const comments = useComments();
  const [query, setQuery] = useState('');
  const titleOf = (id) => notes.find((n) => n.id === id)?.title || 'Deleted note';

  const q = query.trim().toLowerCase();
  const list = comments.filter(
    (c) => !q || `${c.text} ${c.userName} ${titleOf(c.noteId)}`.toLowerCase().includes(q),
  );

  return (
    <>
      <PageHeader
        title="Comments"
        subtitle="Reply to feedback or remove comments that break the rules."
      />
      <div className="filters">
        <div className="search-box">
          <Search size={16} aria-hidden="true" />
          <input
            type="search"
            aria-label="Search comments"
            placeholder="Search comments, users or notes…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={comments.length ? 'No comments match your search' : 'No comments yet'}
        >
          Comments written on notes appear here.
        </EmptyState>
      ) : (
        <div className="card comment-groups">
          {list.map((c) => (
            <div key={c.id} className="comment-group">
              <p className="small">
                On <Link to={notePath('/admin', c.noteId)}>{titleOf(c.noteId)}</Link>
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
