import { Moon, Settings2, Sun } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useTheme } from '../../hooks/useTheme.jsx';
import { useComments, useNotes, useUsers } from '../../hooks/useData.js';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const notes = useNotes();
  const users = useUsers();
  const comments = useComments();

  return (
    <>
      <PageHeader icon={Settings2} title="Settings" subtitle="Appearance and saved data." />
      <div className="settings-grid">
        <section className="card" aria-labelledby="appearance-h">
          <h2 id="appearance-h" className="section-title">
            Appearance
          </h2>
          <div className="segmented" role="group" aria-label="Theme">
            <button
              type="button"
              className={theme === 'light' ? 'is-active' : ''}
              aria-pressed={theme === 'light'}
              onClick={() => setTheme('light')}
            >
              <Sun size={15} aria-hidden="true" /> Light
            </button>
            <button
              type="button"
              className={theme === 'dark' ? 'is-active' : ''}
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme('dark')}
            >
              <Moon size={15} aria-hidden="true" /> Dark
            </button>
          </div>
          <p className="muted small">Your choice is remembered on this device.</p>
        </section>
        <section className="card" aria-labelledby="storage-h">
          <h2 id="storage-h" className="section-title">
            Data storage
          </h2>
          <p>
            Your notes, account details and comments are saved in MongoDB on the local server. Your
            data stays saved when you refresh or close the browser.
          </p>
          <p className="muted small">
            Your current workspace contains {notes.length} notes, {users.length} members and{' '}
            {comments.length} comments. The server must be running to load and save changes.
          </p>
        </section>
      </div>
    </>
  );
}
