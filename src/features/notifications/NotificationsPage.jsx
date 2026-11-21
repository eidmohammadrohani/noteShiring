import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useCurrentUser, useNotes, useNotifications } from '../../hooks/useData.js';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '../../services/notificationsStorage.js';
import { timeAgo } from '../../utils/dateUtils.js';
import { notePath } from '../../utils/paths.js';
import { toUserMessage } from '../../services/errors.js';

export default function NotificationsPage() {
  const user = useCurrentUser();
  const notifications = useNotifications(user.id);
  const notes = useNotes();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [busy, setBusy] = useState(false);
  const unread = notifications.filter((n) => !n.read).length;

  async function open(item) {
    if (busy) return;
    setBusy(true);
    try {
      if (!item.read) await markNotificationRead(item.id);
      if (item.noteId && notes.some((n) => n.id === item.noteId))
        navigate(notePath('/app', item.noteId));
    } catch (error) {
      notify(toUserMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function markAll() {
    if (busy) return;
    setBusy(true);
    try {
      await markAllNotificationsRead(user.id);
      notify('All notifications marked as read.', 'info');
    } catch (error) {
      notify(toUserMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        icon={Bell}
        title="Notifications"
        subtitle={unread ? `${unread} unread` : 'You are all caught up.'}
        actions={
          <button
            type="button"
            className="btn btn-outline"
            disabled={unread === 0 || busy}
            onClick={markAll}
          >
            <CheckCheck size={16} aria-hidden="true" /> Mark all as read
          </button>
        }
      />
      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications">
          You will be notified when someone likes, downloads or comments on your notes.
        </EmptyState>
      ) : (
        <ul className="card notif-list">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                className={`notif-item${n.read ? '' : ' unread'}`}
                disabled={busy}
                onClick={() => open(n)}
              >
                <Bell size={16} aria-hidden="true" />
                <span className="notif-text">
                  {n.text}
                  <span className="muted small"> · {timeAgo(n.createdAt)}</span>
                </span>
                {!n.read && <span className="chip chip-accent">New</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
