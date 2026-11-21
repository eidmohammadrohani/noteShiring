import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Search, X } from 'lucide-react';
import Logo from '../common/Logo.jsx';
import ErrorBoundary from '../common/ErrorBoundary.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import { useConfirm } from '../common/ConfirmDialog.jsx';
import { useToast } from '../common/Toast.jsx';
import { useCurrentUser, useNotifications } from '../../hooks/useData.js';
import { useUnsaved } from '../../hooks/useUnsavedChanges.jsx';
import { logout } from '../../services/authService.js';
import { toUserMessage } from '../../services/errors.js';
import { ADMIN_NAV, USER_NAV } from '../../app/navConfig.js';
import { initials } from '../../utils/text.js';

export default function AppShell({ role }) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const confirm = useConfirm();
  const { notify } = useToast();
  const { guard, guardedNavigate } = useUnsaved();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);

  const isAdmin = role === 'admin';
  const nav = isAdmin ? ADMIN_NAV : USER_NAV;
  const currentPage =
    nav.find((item) => item.to === location.pathname)?.label ||
    (isAdmin ? 'Admin workspace' : 'Your workspace');
  const notifications = useNotifications(isAdmin ? null : user.id);
  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => setOpen(false), [location.pathname]);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const go = (to) => (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    guardedNavigate(to);
  };

  async function handleLogout() {
    if (loggingOut) return;
    if (!(await guard())) return;
    const ok = await confirm({
      title: 'Log out of NoteHub?',
      message: 'You will need to log in again to open your dashboard.',
      confirmLabel: 'Log out',
    });
    if (!ok) return;
    setLoggingOut(true);
    try {
      await logout();
      navigate('/login', { replace: true });
      notify('You have been logged out.', 'info');
    } catch (error) {
      notify(toUserMessage(error), 'error');
    } finally {
      setLoggingOut(false);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    const q = query.trim();
    const target = isAdmin ? '/admin/notes' : '/app/explore';
    guardedNavigate(q ? `${target}?q=${encodeURIComponent(q)}` : target);
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {open && (
        <div className="sidebar-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
      )}
      <aside id="sidebar" className={`sidebar${open ? ' open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-head">
          <Logo to={isAdmin ? '/admin' : '/app'} light onClick={go(isAdmin ? '/admin' : '/app')} />
          <button
            type="button"
            className="sidebar-close"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        {isAdmin && <div className="admin-tag">ADMIN CONSOLE</div>}
        <nav className="nav-group">
          {nav.map((item, i) => {
            if (item.divider) return <div className="nav-divider" key={`d${i}`} />;
            if (item.section)
              return (
                <div className="nav-label" key={item.label}>
                  {item.label}
                </div>
              );
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                onClick={go(item.to)}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
                {item.badge === 'unread' && unread > 0 && (
                  <span className="nav-badge" aria-label={`${unread} unread`}>
                    {unread}
                  </span>
                )}
              </NavLink>
            );
          })}
          <button type="button" className="nav-item" onClick={handleLogout} disabled={loggingOut}>
            <LogOut size={18} aria-hidden="true" />
            <span>Logout</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="avatar" aria-hidden="true">
            {initials(user.name)}
          </div>
          <div>
            <strong>{user.name}</strong>
            <span>{isAdmin ? 'Administrator' : 'Student workspace'}</span>
          </div>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="workspace-label">
            <span>NoteHub /</span> {currentPage}
          </div>
          <button
            type="button"
            className="icon-btn hamburger"
            aria-label="Open menu"
            aria-expanded={open}
            aria-controls="sidebar"
            onClick={() => setOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <form className="top-search" role="search" onSubmit={submitSearch}>
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search all notes"
              placeholder="Search notes…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </form>
          <div className="top-actions">
            <ThemeToggle />
            {!isAdmin && (
              <NavLink
                to="/app/notifications"
                className="icon-btn bell"
                aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
                onClick={go('/app/notifications')}
              >
                <Bell size={18} aria-hidden="true" />
                {unread > 0 && <span className="dot" aria-hidden="true" />}
              </NavLink>
            )}
            <div className="avatar" title={user.name} aria-label={`Signed in as ${user.name}`}>
              {initials(user.name)}
            </div>
          </div>
        </header>

        <main id="main" className="content" tabIndex={-1}>
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
