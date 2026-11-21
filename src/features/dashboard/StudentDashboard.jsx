import { Link } from 'react-router-dom';
import {
  Archive,
  Bell,
  Bookmark,
  Download,
  FolderOpen,
  Heart,
  MessageSquare,
  Plus,
} from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import StatCard from '../../components/dashboard/StatCard.jsx';
import LearningBanner from '../../components/dashboard/LearningBanner.jsx';
import NotesGrid from '../../components/notes/NotesGrid.jsx';
import { useNoteActions } from '../notes/useNoteActions.js';
import {
  useCommentCounts,
  useComments,
  useCurrentUser,
  useFavoriteIds,
  useNotes,
  useNotifications,
} from '../../hooks/useData.js';
import { getUserStats } from '../../utils/stats.js';
import { filterAndSortNotes } from '../../utils/notesQuery.js';
import { timeAgo } from '../../utils/dateUtils.js';

export default function StudentDashboard() {
  const user = useCurrentUser();
  const notes = useNotes();
  const comments = useComments();
  const commentCounts = useCommentCounts();
  const favoriteIds = useFavoriteIds(user.id);
  const notifications = useNotifications(user.id);
  const actions = useNoteActions();

  const stats = getUserStats({ notes, comments, favoriteIds, userId: user.id });
  const ctx = { favoriteIds, commentCounts };
  const recent = filterAndSortNotes(notes, { scope: 'active', sort: 'updated' }, ctx)
    .filter((n) => n.ownerId === user.id)
    .slice(0, 3);
  const popular = filterAndSortNotes(notes, { scope: 'active', sort: 'popular' }, ctx).slice(0, 3);
  const unread = notifications.filter((n) => !n.read).length;

  const renderCards = (list) => (
    <NotesGrid
      notes={list}
      viewer={user}
      base="/app"
      commentCounts={commentCounts}
      favoriteIds={favoriteIds}
      actions={actions}
    />
  );

  return (
    <>
      <PageHeader
        icon={FolderOpen}
        title={`Welcome back, ${user.name.split(' ')[0]}`}
        subtitle="Here is what is happening with your notes."
        actions={
          <Link className="btn btn-primary" to="/app/notes/new">
            <Plus size={16} aria-hidden="true" /> New note
          </Link>
        }
      />

      <LearningBanner
        title="Make room for your next big idea."
        description="Turn today's lecture into tomorrow's understanding. Your best study notes start here."
        to="/app/notes/new"
        label="Start writing"
      />
      <div className="stat-grid">
        <StatCard
          icon={FolderOpen}
          label="Active notes"
          value={stats.activeNotes}
          to="/app/my-notes"
        />
        <StatCard
          icon={Bookmark}
          label="Favorites"
          value={stats.favorites}
          tone="teal"
          to="/app/favorites"
        />
        <StatCard
          icon={Archive}
          label="Archived"
          value={stats.archivedNotes}
          tone="muted"
          to="/app/archive"
        />
        <StatCard icon={Download} label="Downloads" value={stats.downloads} tone="teal" />
        <StatCard icon={Heart} label="Likes" value={stats.likes} />
        <StatCard
          icon={MessageSquare}
          label="Comments"
          value={stats.comments}
          tone="teal"
          to="/app/comments"
        />
      </div>

      <section className="section" aria-labelledby="recent-h">
        <div className="section-head">
          <h2 id="recent-h">Recently updated by you</h2>
          <Link to="/app/my-notes">View all</Link>
        </div>
        {recent.length ? (
          renderCards(recent)
        ) : (
          <EmptyState
            icon={FolderOpen}
            title="You have not created a note yet"
            action={
              <Link className="btn btn-primary" to="/app/notes/new">
                Create your first note
              </Link>
            }
          >
            Notes you upload show up here and are visible to everyone.
          </EmptyState>
        )}
      </section>

      <section className="section" aria-labelledby="popular-h">
        <div className="section-head">
          <h2 id="popular-h">Popular on NoteHub</h2>
          <Link to="/app/explore">Explore all</Link>
        </div>
        {popular.length ? (
          renderCards(popular)
        ) : (
          <p className="muted">No notes have been shared yet.</p>
        )}
      </section>

      <section className="section card" aria-labelledby="notif-h">
        <div className="section-head">
          <h2 id="notif-h">
            <Bell size={18} aria-hidden="true" /> Notifications{' '}
            {unread > 0 && <span className="chip chip-accent">{unread} new</span>}
          </h2>
          <Link to="/app/notifications">See all</Link>
        </div>
        {notifications.length === 0 ? (
          <p className="muted">You are all caught up.</p>
        ) : (
          <ul className="plain-list">
            {notifications.slice(0, 3).map((n) => (
              <li key={n.id} className={n.read ? '' : 'unread'}>
                {n.text} <span className="muted">· {timeAgo(n.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
