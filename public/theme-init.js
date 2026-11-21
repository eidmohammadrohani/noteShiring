// Apply the saved theme before React paints, including the OS preference.
try {
  const saved = localStorage.getItem('notehub:theme');
  const theme =
    saved === 'light' || saved === 'dark'
      ? saved
      : window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
  document.documentElement.setAttribute('data-theme', theme);
} catch {
  // Theme preference storage can be disabled by the browser.
}
