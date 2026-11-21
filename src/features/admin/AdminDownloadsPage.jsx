import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download } from 'lucide-react';
import SearchField from '../../components/common/SearchField.jsx';
import PageHeader from '../../components/common/PageHeader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import { useNotes } from '../../hooks/useData.js';
import { formatDateTime } from '../../utils/dateUtils.js';
import { notePath } from '../../utils/paths.js';

export default function AdminDownloadsPage() {
  const notes = useNotes();
  const [query, setQuery] = useState('');

  const events = notes
    .flatMap((n) => n.downloads.map((d, i) => ({ key: `${n.id}-${i}`, note: n, ...d })))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  const q = query.trim().toLowerCase();
  const list = events.filter(
    (e) => !q || `${e.userName} ${e.note.title}`.toLowerCase().includes(q),
  );

  return (
    <>
      <PageHeader
        icon={Download}
        title="Downloads"
        subtitle="See who downloaded which note and when."
      />
      <div className="filters">
        <SearchField
          label="Search downloads"
          placeholder="Search by user or note…"
          value={query}
          onChange={setQuery}
        />
      </div>
      {list.length === 0 ? (
        <EmptyState
          icon={Download}
          title={events.length ? 'No downloads match your search' : 'No downloads yet'}
        >
          Every download is recorded with the person and the time.
        </EmptyState>
      ) : (
        <div className="card table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Note</th>
                <th>Author</th>
                <th>Downloaded by</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.key}>
                  <td>
                    <Link to={notePath('/admin', e.note.id)}>{e.note.title}</Link>
                  </td>
                  <td>{e.note.ownerName}</td>
                  <td>{e.userName}</td>
                  <td>{formatDateTime(e.at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
