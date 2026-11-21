import { Search } from 'lucide-react';

export default function SearchField({ label, placeholder, value, onChange }) {
  return (
    <div className="search-box">
      <Search size={16} aria-hidden="true" />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
