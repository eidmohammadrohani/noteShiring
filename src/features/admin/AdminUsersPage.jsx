import { useState } from 'react';
import { Ban, CheckCircle2, Trash2, Users } from 'lucide-react';
import SearchField from '../../components/common/SearchField.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useConfirm } from '../../components/common/ConfirmDialog.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useCurrentUser, useNotes, useUsers } from '../../hooks/useData.js';
import { deleteUserAccount, setUserBlocked } from '../../services/adminService.js';
import { toUserMessage } from '../../services/errors.js';
import { formatDate } from '../../utils/dateUtils.js';
import { initials } from '../../utils/text.js';

export default function AdminUsersPage() {
  const admin = useCurrentUser();
  const users = useUsers();
  const notes = useNotes();
  const confirm = useConfirm();
  const { notify } = useToast();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [busyId, setBusyId] = useState(null);

  const q = query.trim().toLowerCase();
  const list = users.filter(
    (u) =>
      (status === 'all' || u.status === status) &&
      (!q || `${u.name} ${u.email} ${u.studentId} ${u.department}`.toLowerCase().includes(q)),
  );

  async function toggleBlock(user) {
    if (busyId) return;
    const blocking = user.status !== 'blocked';
    const ok = await confirm({
      title: blocking ? `Block ${user.name}?` : `Unblock ${user.name}?`,
      message: blocking
        ? 'They will be logged out and will not be able to log in until you unblock them.'
        : 'They will be able to log in again.',
      confirmLabel: blocking ? 'Block user' : 'Unblock user',
      danger: blocking,
    });
    if (!ok) return;
    setBusyId(user.id);
    try {
      await setUserBlocked(user.id, blocking, admin);
      notify(blocking ? `${user.name} was blocked.` : `${user.name} was unblocked.`);
    } catch (e) {
      notify(toUserMessage(e), 'error');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(user) {
    if (busyId) return;
    const ok = await confirm({
      title: `Delete ${user.name}?`,
      message:
        'This permanently deletes the account together with their notes, comments, likes and favorites.',
      confirmLabel: 'Delete user',
      danger: true,
    });
    if (!ok) return;
    setBusyId(user.id);
    try {
      await deleteUserAccount(user.id, admin);
      notify(`${user.name} was deleted.`);
    } catch (e) {
      notify(toUserMessage(e), 'error');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageHeader
        icon={Users}
        title="Users"
        subtitle="Block or delete accounts. Administrator accounts are protected."
      />
      <div className="filters filters-row">
        <SearchField
          label="Search users"
          placeholder="Search by name, email, ID or department…"
          value={query}
          onChange={setQuery}
        />
        <label className="inline-field">
          <span>Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </label>
      </div>
      {list.length === 0 ? (
        <EmptyState icon={Users} title="No users match your search" />
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>ID</th>
                <th>Department</th>
                <th>Notes</th>
                <th>Joined</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((u) => {
                const protectedUser = u.role === 'admin';
                return (
                  <tr key={u.id}>
                    <td>
                      <div className="user-cell">
                        <div className="avatar" aria-hidden="true">
                          {initials(u.name)}
                        </div>
                        <div>
                          <div className="strong">{u.name}</div>
                          <div className="muted small">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>{u.studentId}</td>
                    <td>{u.department}</td>
                    <td>{notes.filter((n) => n.ownerId === u.id).length}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td>
                      <span
                        className={`chip ${u.status === 'blocked' ? 'chip-danger' : 'chip-ok'}`}
                      >
                        {protectedUser ? 'Admin' : u.status === 'blocked' ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          type="button"
                          className="btn btn-outline"
                          disabled={protectedUser || Boolean(busyId)}
                          onClick={() => toggleBlock(u)}
                          aria-label={`${u.status === 'blocked' ? 'Unblock' : 'Block'} ${u.name}`}
                        >
                          {u.status === 'blocked' ? (
                            <CheckCircle2 size={14} aria-hidden="true" />
                          ) : (
                            <Ban size={14} aria-hidden="true" />
                          )}
                          {u.status === 'blocked' ? 'Unblock' : 'Block'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-danger-outline"
                          disabled={protectedUser || Boolean(busyId)}
                          onClick={() => remove(u)}
                          aria-label={`Delete ${u.name}`}
                        >
                          <Trash2 size={14} aria-hidden="true" /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
