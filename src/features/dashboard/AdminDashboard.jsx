import { Link } from 'react-router-dom';
import { Archive, Ban, Download, FolderOpen, Heart, MessageSquare, Users } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import LearningBanner from '../../components/dashboard/LearningBanner.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useComments, useCurrentUser, useNotes, useUsers } from '../../hooks/useData.js';
import { getAdminStats } from '../../utils/stats.js';
import { formatDate, timeAgo } from '../../utils/dateUtils.js';
import { notePath } from '../../utils/paths.js';

export default function AdminDashboard() {
  const user = useCurrentUser();
  const users = useUsers();
  const notes = useNotes();
  const comments = useComments();
  const stats = getAdminStats({ users, notes, comments });
  const recentNotes = [...notes]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 5);
  const recentComments = comments.slice(0, 4);
  const titleOf = (id) => notes.find((n) => n.id === id)?.title || 'Deleted note';

  return (
    <>
      <PageHeader
        icon={Users}
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        subtitle="Here is what is happening across NoteHub."
      />
      <LearningBanner
        title="A better library starts with you."
        description="Help good ideas find their audience. Keep your community's shared knowledge useful and organised."
        to="/admin/notes"
        label="Manage the library"
      />
      <div className="stat-grid">
        <StatCard
          icon={Users}
          label="Total users"
          value={stats.users}
          tone="teal"
          to="/admin/users"
        />
        <StatCard
          icon={FolderOpen}
          label="Active notes"
          value={stats.activeNotes}
          to="/admin/notes"
        />
        <StatCard icon={Archive} label="Archived notes" value={stats.archivedNotes} tone="muted" />
        <StatCard
          icon={Download}
          label="Total downloads"
          value={stats.downloads}
          tone="teal"
          to="/admin/downloads"
        />
        <StatCard icon={Heart} label="Total likes" value={stats.likes} />
        <StatCard
          icon={MessageSquare}
          label="Total comments"
          value={stats.comments}
          tone="teal"
          to="/admin/comments"
        />
        <StatCard
          icon={Ban}
          label="Blocked users"
          value={stats.blockedUsers}
          tone="danger"
          to="/admin/users"
        />
      </div>

      <section className="card section" aria-labelledby="latest-notes">
        <div className="section-head">
          <h2 id="latest-notes">Latest uploads</h2>
          <Link to="/admin/notes">Manage notes</Link>
        </div>
        {recentNotes.length === 0 ? (
          <EmptyState icon={FolderOpen} title="No notes yet">
            Uploaded notes will appear here.
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Subject</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentNotes.map((n) => (
                  <tr key={n.id}>
                    <td>
                      <Link to={notePath('/admin', n.id)}>{n.title}</Link>{' '}
                      {n.archived && <span className="chip chip-muted">Archived</span>}
                    </td>
                    <td>{n.ownerName}</td>
                    <td>{n.subject || '-'}</td>
                    <td>{formatDate(n.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card section" aria-labelledby="latest-comments">
        <div className="section-head">
          <h2 id="latest-comments">Latest comments</h2>
          <Link to="/admin/comments">Moderate comments</Link>
        </div>
        {recentComments.length === 0 ? (
          <p className="muted">No comments yet.</p>
        ) : (
          <ul className="plain-list">
            {recentComments.map((c) => (
              <li key={c.id}>
                <strong>{c.userName}</strong> on <em>{titleOf(c.noteId)}</em>: {c.text}{' '}
                <span className="muted">· {timeAgo(c.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
