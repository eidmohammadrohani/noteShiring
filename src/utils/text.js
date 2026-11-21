export function countWords(text) {
  const trimmed = String(text ?? '').trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export function countChars(text) {
  return String(text ?? '').length;
}

export function truncate(text, max = 140) {
  const clean = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function initials(name) {
  return (
    String(name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

export function slugify(text) {
  return (
    String(text ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'note'
  );
}

export function plural(count, one, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}
