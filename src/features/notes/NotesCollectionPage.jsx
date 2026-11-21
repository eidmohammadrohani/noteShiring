import { Link } from 'react-router-dom';
import { Archive, Bookmark, Compass, FolderOpen, Plus, ShieldCheck } from 'lucide-react';
import PageHeader from '../../components/common/PageHeader.jsx';
import NotesBrowser from '../../components/notes/NotesBrowser.jsx';

const COLLECTIONS = {
  explore: {
    title: 'Explore notes',
    subtitle: 'Find a fresh perspective. Discover useful notes from your student community.',
    icon: Compass,
  },
  mine: {
    title: 'My notes',
    subtitle: 'Your knowledge, organised. Keep your notes up to date and ready to share.',
    icon: FolderOpen,
  },
  favorites: {
    title: 'Favorites',
    subtitle: 'A little inspiration, saved for later. Your bookmarked notes live here.',
    icon: Bookmark,
  },
  archive: {
    title: 'Archive',
    subtitle: 'Room for what comes next. Restore an archived note whenever you need it.',
    icon: Archive,
  },
  admin: {
    title: 'Notes',
    subtitle: 'Keep the library useful. Review, update and manage shared notes.',
    icon: ShieldCheck,
  },
};

export default function NotesCollectionPage({ source }) {
  const collection = COLLECTIONS[source];

  return (
    <>
      <PageHeader
        {...collection}
        actions={
          source === 'mine' && (
            <Link className="btn btn-primary" to="/app/notes/new">
              <Plus size={16} aria-hidden="true" /> New note
            </Link>
          )
        }
      />
      <NotesBrowser key={source} source={source} />
    </>
  );
}
