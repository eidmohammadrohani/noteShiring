import { Link } from 'react-router-dom';

export default function StatCard({ icon: Icon, label, value, tone = 'accent', to }) {
  const body = (
    <>
      <div className={`stat-icon tone-${tone}`} aria-hidden="true">
        <Icon size={20} />
      </div>
      <div>
        <div
          className="stat-value"
          data-testid={`stat-${label.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {Number(value).toLocaleString()}
        </div>
        <div className="stat-label">{label}</div>
      </div>
    </>
  );
  return to ? (
    <Link className="stat-card is-link" to={to}>
      {body}
    </Link>
  ) : (
    <div className="stat-card">{body}</div>
  );
}
