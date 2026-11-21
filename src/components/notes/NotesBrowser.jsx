import { useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Archive, Bookmark, FileText, SearchX } from 'lucide-react';
import NotesGrid from './NotesGrid.jsx';
import NoteFilters from './NoteFilters.jsx';
import EmptyState from '../common/EmptyState.jsx';
import { useCommentCounts, useCurrentUser, useFavoriteIds, useNotes } from '../../hooks/useData.js';
import { useNoteActions } from '../../features/notes/useNoteActions.js';
import { DEFAULT_FILTERS, filterAndSortNotes } from '../../utils/notesQuery.js';
import { basePathFor, newNotePath } from '../../utils/paths.js';

const PAGE_SIZE = 24;

const EMPTY_STATES = {
  favorites: {
    icon: Bookmark,
    title: 'No favorites yet',
    description: 'Tap the bookmark on any note to save it here.',
  },
  archived: {
    icon: Archive,
    title: 'Nothing archived',
    description: 'Archived notes stay safe here and can be restored at any time.',
  },
  active: {
    icon: FileText,
    title: 'No notes yet',
    description: 'Notes will appear here as soon as they are created.',
  },
  search: {
    icon: SearchX,
    title: 'No notes match your search',
    description: 'Try different words or remove a filter.',
  },
};

// What each page shows. `scopes` = tabs offered, `base` = which notes feed it.
const SOURCES = {
  explore: { scopes: ['active', 'favorites'], scope: 'active', sort: 'popular', mine: false },
  mine: {
    scopes: ['active', 'favorites', 'archived'],
    scope: 'active',
    sort: 'updated',
    mine: true,
  },
  favorites: { scopes: ['favorites'], scope: 'favorites', sort: 'popular', mine: false },
  archive: { scopes: ['archived'], scope: 'archived', sort: 'updated', mine: true },
  admin: { scopes: ['all', 'active', 'archived'], scope: 'all', sort: 'newest', mine: false },
};

function initialQuery(search) {
  try {
    return new URLSearchParams(search).get('q') || '';
  } catch {
    return '';
  }
}

export default function NotesBrowser({ source }) {
  const config = SOURCES[source];
  const user = useCurrentUser();
  const location = useLocation();
  const notes = useNotes();
  const favoriteIds = useFavoriteIds(user.id);
  const commentCounts = useCommentCounts();
  const actions = useNoteActions();
  const base = basePathFor(user);

  const defaults = { ...DEFAULT_FILTERS, scope: config.scope, sort: config.sort };
  const [filters, setFilters] = useState({ ...defaults, query: initialQuery(location.search) });
  const [limit, setLimit] = useState(PAGE_SIZE);
  // Follow the top-bar search box (?q=...) without remounting.
  const [lastSearch, setLastSearch] = useState(location.search);
  if (lastSearch !== location.search) {
    setLastSearch(location.search);
    setLimit(PAGE_SIZE);
    setFilters((f) => ({ ...f, query: initialQuery(location.search) }));
  }

  const pool = useMemo(
    () => (config.mine ? notes.filter((n) => n.ownerId === user.id) : notes),
    [config.mine, notes, user.id],
  );
  const results = useMemo(
    () => filterAndSortNotes(pool, filters, { favoriteIds, commentCounts }),
    [pool, filters, favoriteIds, commentCounts],
  );
  const shown = results.slice(0, limit);

  const change = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setLimit(PAGE_SIZE);
  };
  const reset = () => {
    setFilters(defaults);
    setLimit(PAGE_SIZE);
  };

  const poolForScope = filterAndSortNotes(pool, { scope: filters.scope }, { favoriteIds });
  const trulyEmpty = poolForScope.length === 0;
  const emptyState = trulyEmpty
    ? EMPTY_STATES[filters.scope] || EMPTY_STATES.active
    : EMPTY_STATES.search;
  let emptyAction = null;
  if (!trulyEmpty) {
    emptyAction = (
      <button type="button" className="btn btn-outline" onClick={reset}>
        Clear search and filters
      </button>
    );
  } else if (filters.scope === 'active' && user.role !== 'admin') {
    emptyAction = (
      <Link className="btn btn-primary" to={newNotePath(base)}>
        Create a note
      </Link>
    );
  }

  return (
    <div>
      <NoteFilters
        filters={filters}
        onChange={change}
        onReset={reset}
        scopes={config.scopes}
        defaultScope={config.scope}
        defaultSort={config.sort}
      />
      <p className="result-count" aria-live="polite">
        Showing {shown.length} of {results.length} {results.length === 1 ? 'note' : 'notes'}
      </p>

      {results.length === 0 ? (
        <EmptyState icon={emptyState.icon} title={emptyState.title} action={emptyAction}>
          {emptyState.description}
        </EmptyState>
      ) : (
        <>
          <NotesGrid
            notes={shown}
            viewer={user}
            base={base}
            commentCounts={commentCounts}
            favoriteIds={favoriteIds}
            actions={actions}
          />
          {results.length > shown.length && (
            <div className="center">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setLimit((n) => n + PAGE_SIZE)}
              >
                Show more
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
