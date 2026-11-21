export function isIsoDate(value) {
  return typeof value === 'string' && value !== '' && !Number.isNaN(Date.parse(value));
}

export function formatDate(iso) {
  if (!isIsoDate(iso)) return '-';
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(iso) {
  if (!isIsoDate(iso)) return '-';
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Local calendar day as YYYY-MM-DD; used by the "search by date" filter.
export function toDayKey(iso) {
  if (!isIsoDate(iso)) return '';
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function timeAgo(iso, now = Date.now()) {
  if (!isIsoDate(iso)) return '-';
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return formatDate(iso);
}

// Returns an ISO timestamp that is always later than `previous`, so a quick
// edit still produces a visibly newer "modified" time.
export function nextTimestamp(previous) {
  const now = Date.now();
  const prev = isIsoDate(previous) ? Date.parse(previous) : 0;
  return new Date(now > prev ? now : prev + 1).toISOString();
}
