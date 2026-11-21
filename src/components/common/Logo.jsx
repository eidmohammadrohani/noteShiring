import { Link } from 'react-router-dom';

export function LogoMark({ size = 38 }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="logo-mark"
    >
      <rect x="1" y="1" width="46" height="46" rx="14" fill="var(--accent)" />
      <path d="M12 14h7l10 16V14h7v21h-7L19 19v16h-7V14Z" fill="var(--accent-contrast)" />
      <path
        d="M12 36c5-2 8-2 12 0 4-2 7-2 12 0"
        stroke="var(--accent-contrast)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="m37 7 1.2 3.4L42 12l-3.8 1.4L37 17l-1.3-3.6L32 12l3.7-1.6L37 7Z" fill="#ffd78f" />
    </svg>
  );
}

export default function Logo({ to = '/', light = false, onClick }) {
  return (
    <Link
      to={to}
      className={`brand${light ? ' brand-light' : ''}`}
      onClick={onClick}
      aria-label="NoteHub home"
    >
      <LogoMark />
      <span>
        Note<span className="brand-accent">Hub</span>
      </span>
    </Link>
  );
}
