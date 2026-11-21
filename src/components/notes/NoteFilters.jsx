import { RotateCcw } from 'lucide-react';
import SearchField from '../common/SearchField.jsx';
import { FACULTIES, SEMESTERS } from '../../utils/constants.js';
import { SORT_OPTIONS, countFiltersActive } from '../../utils/notesQuery.js';

const SCOPE_LABELS = {
  active: 'All',
  favorites: 'Favorites',
  archived: 'Archived',
  all: 'Everything',
};

export default function NoteFilters({
  filters,
  onChange,
  onReset,
  scopes,
  defaultScope,
  defaultSort,
}) {
  const active =
    countFiltersActive(filters) +
    (filters.scope !== defaultScope ? 1 : 0) +
    (filters.sort !== defaultSort ? 1 : 0);

  return (
    <section className="filters" aria-label="Search and filters">
      <div className="filters-row">
        <SearchField
          label="Search notes"
          placeholder="Search by title, content, subject, tag or author…"
          value={filters.query}
          onChange={(query) => onChange({ query })}
        />
        <label className="inline-field">
          <span>Sort by</span>
          <select value={filters.sort} onChange={(e) => onChange({ sort: e.target.value })}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-outline" onClick={onReset} disabled={active === 0}>
          <RotateCcw size={15} aria-hidden="true" /> Clear filters
        </button>
      </div>

      {scopes.length > 1 && (
        <div className="segmented" role="group" aria-label="Show notes">
          {scopes.map((scope) => (
            <button
              key={scope}
              type="button"
              className={filters.scope === scope ? 'is-active' : ''}
              aria-pressed={filters.scope === scope}
              onClick={() => onChange({ scope })}
            >
              {SCOPE_LABELS[scope]}
            </button>
          ))}
        </div>
      )}

      <div className="filters-row filters-extra">
        <label className="inline-field">
          <span>Faculty</span>
          <select value={filters.faculty} onChange={(e) => onChange({ faculty: e.target.value })}>
            <option value="">Any faculty</option>
            {FACULTIES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="inline-field">
          <span>Semester</span>
          <select value={filters.semester} onChange={(e) => onChange({ semester: e.target.value })}>
            <option value="">Any semester</option>
            {SEMESTERS.map((s) => (
              <option key={s} value={s}>
                Semester {s}
              </option>
            ))}
          </select>
        </label>
        <label className="inline-field">
          <span>Uploaded by</span>
          <input
            type="text"
            placeholder="User name"
            value={filters.author}
            onChange={(e) => onChange({ author: e.target.value })}
          />
        </label>
        <label className="inline-field">
          <span>Date</span>
          <input
            type="date"
            value={filters.date}
            onChange={(e) => onChange({ date: e.target.value })}
          />
        </label>
      </div>
    </section>
  );
}
