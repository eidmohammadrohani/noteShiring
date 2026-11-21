import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useCurrentUser, useNotes } from '../../hooks/useData.js';
import { useNoteActions } from './useNoteActions.js';
import { canViewNote } from '../../services/notesStorage.js';
import { formatDateTime } from '../../utils/dateUtils.js';
import { notePath } from '../../utils/paths.js';

export default function DownloadsPage() {
  const user = useCurrentUser();
  const notes = useNotes();
  const actions = useNoteActions();

  const rows = notes
    .filter((n) => canViewNote(n, user))
    .map((n) => {
      const mine = n.downloads.filter((d) => d.userId === user.id);
      return mine.length ? { note: n, count: mine.length, last: mine[mine.length - 1].at } : null;
    })
    .filter(Boolean)
    .sort((a, b) => Date.parse(b.last) - Date.parse(a.last));

  return (
    <>
      <PageHeader icon={Download} title="My downloads" subtitle="Notes you have downloaded." />
      {rows.length === 0 ? (
        <EmptyState
          icon={Download}
          title="No downloads yet"
          action={
            <Link className="btn btn-primary" to="/app/explore">
              Explore notes
            </Link>
          }
        >
          Download a note and it will be listed here.
        </EmptyState>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Note</th>
                <th>Author</th>
                <th>Times</th>
                <th>Last downloaded</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ note, count, last }) => (
                <tr key={note.id}>
                  <td>
                    <Link to={notePath('/app', note.id)}>{note.title}</Link>
                  </td>
                  <td>{note.ownerName}</td>
                  <td>{count}</td>
                  <td>{formatDateTime(last)}</td>
                  <td>
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => actions.download(note)}
                      aria-label={`Download ${note.title} again`}
                    >
                      <Download size={14} aria-hidden="true" /> Again
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
