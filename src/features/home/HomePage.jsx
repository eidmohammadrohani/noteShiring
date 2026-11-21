import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Download,
  GraduationCap,
  Heart,
  Menu,
  Search,
  Share2,
  Upload,
  X,
} from 'lucide-react';
import Logo from '../../components/common/Logo.jsx';
import Reveal from '../../components/common/Reveal.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';
import { useCommentCounts, useCurrentUser, useNotes } from '../../hooks/useData.js';
import { FACULTIES } from '../../utils/constants.js';
import { filterAndSortNotes } from '../../utils/notesQuery.js';
import { basePathFor, notePath } from '../../utils/paths.js';
import { formatDate } from '../../utils/dateUtils.js';
import { truncate } from '../../utils/text.js';

function Teaser({ note, href }) {
  return (
    <article className="teaser">
      <div className="note-subject">{note.subject || note.faculty || 'General'}</div>
      <h3>
        <Link to={href}>{note.title}</Link>
      </h3>
      <p>{truncate(note.content, 90)}</p>
      <div className="note-meta">
        <span>{note.ownerName}</span> <span aria-hidden="true">·</span>{' '}
        <span>{formatDate(note.createdAt)}</span>
      </div>
      <div className="note-stats">
        <span>
          <Heart size={14} aria-hidden="true" /> {note.likedBy.length}
          <span className="sr-only"> likes</span>
        </span>
        <span>
          <Download size={14} aria-hidden="true" /> {note.downloads.length}
          <span className="sr-only"> downloads</span>
        </span>
      </div>
    </article>
  );
}

export default function HomePage() {
  const user = useCurrentUser();
  const notes = useNotes();
  const counts = useCommentCounts();
  const [menu, setMenu] = useState(false);
  const base = basePathFor(user);
  const hrefFor = (note) => (user ? notePath(base, note.id) : '/login');
  const ctx = { commentCounts: counts };
  const featured = filterAndSortNotes(notes, { scope: 'active', sort: 'popular' }, ctx).slice(0, 3);
  const latest = filterAndSortNotes(notes, { scope: 'active', sort: 'newest' }, ctx).slice(0, 3);
  const active = notes.filter((n) => !n.archived);

  return (
    <div className="home">
      <header className="home-nav">
        <div className="wrap nav-inner">
          <Logo />
          <nav className={`home-links${menu ? ' open' : ''}`} aria-label="Primary">
            <a href="#categories" onClick={() => setMenu(false)}>
              Categories
            </a>
            <a href="#featured" onClick={() => setMenu(false)}>
              Featured
            </a>
            <a href="#how" onClick={() => setMenu(false)}>
              How it works
            </a>
            <a href="#about" onClick={() => setMenu(false)}>
              About
            </a>
          </nav>
          <div className="home-cta">
            <ThemeToggle />
            {user ? (
              <Link className="btn btn-primary" to={base}>
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link className="btn btn-ghost" to="/login">
                  Log in
                </Link>
                <Link className="btn btn-primary" to="/register">
                  Register
                </Link>
              </>
            )}
            <button
              type="button"
              className="icon-btn menu-toggle"
              aria-label={menu ? 'Close menu' : 'Open menu'}
              aria-expanded={menu}
              onClick={() => setMenu((m) => !m)}
            >
              {menu ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        <section className="hero">
          <div className="wrap hero-layout">
            <div>
              <span className="eyebrow">Your next great study session starts here</span>
              <h1>
                Good notes.
                <br />
                <span className="hero-highlight">Better learning.</span>
              </h1>
              <p>
                NoteHub is where students upload lecture notes, discover what classmates wrote, and
                learn together.
              </p>
              <div className="row-actions center-row">
                <Link className="btn btn-primary btn-lg" to={user ? base : '/register'}>
                  {user ? 'Open dashboard' : 'Get started free'}{' '}
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a className="btn btn-outline btn-lg" href="#featured">
                  Browse notes
                </a>
              </div>
              <ul className="hero-stats" aria-label="Platform statistics">
                <li>
                  <strong>{active.length}</strong> notes shared
                </li>
                <li>
                  <strong>{notes.reduce((s, n) => s + n.downloads.length, 0)}</strong> downloads
                </li>
                <li>
                  <strong>{FACULTIES.length}</strong> faculties
                </li>
              </ul>
            </div>
            <div className="hero-visual">
              <img
                className="hero-photo"
                src="/images/study-together.png"
                width="1672"
                height="941"
                fetchPriority="high"
                alt="Three university students sharing notes and studying together in a library"
              />
              <div className="photo-caption">
                <span className="caption-icon">
                  <BookOpen size={22} aria-hidden="true" />
                </span>
                <div>
                  <strong>A little shared knowledge.</strong>
                  <span>A whole new perspective.</span>
                </div>
              </div>
              <span className="floating-tag">
                <GraduationCap size={18} aria-hidden="true" /> Made for curious minds
              </span>
            </div>
          </div>
        </section>

        <section id="categories" className="home-section">
          <div className="wrap">
            <h2>Popular categories</h2>
            <div className="category-grid">
              {FACULTIES.map((f) => (
                <Link
                  key={f}
                  className="category"
                  to={user ? `${base}/explore?q=${encodeURIComponent(f)}` : '/login'}
                >
                  <GraduationCap size={22} aria-hidden="true" />
                  <strong>{f}</strong>
                  <span className="muted">
                    {active.filter((n) => n.faculty === f).length} notes
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section id="featured" className="home-section alt">
          <div className="wrap">
            <h2>Featured notes</h2>
            {featured.length ? (
              <Reveal className="teaser-grid">
                {featured.map((n) => (
                  <Teaser key={n.id} note={n} href={hrefFor(n)} />
                ))}
              </Reveal>
            ) : (
              <p className="muted">No notes yet. Be the first to share one.</p>
            )}
            <h2 className="spaced">Latest uploads</h2>
            {latest.length ? (
              <Reveal className="teaser-grid">
                {latest.map((n) => (
                  <Teaser key={n.id} note={n} href={hrefFor(n)} />
                ))}
              </Reveal>
            ) : null}
          </div>
        </section>

        <section id="how" className="home-section">
          <Reveal className="wrap">
            <h2>How it works</h2>
            <ol className="steps">
              <li>
                <Upload size={22} aria-hidden="true" />
                <strong>Upload</strong>
                <span>Write a note or attach a file in a minute.</span>
              </li>
              <li>
                <Search size={22} aria-hidden="true" />
                <strong>Discover</strong>
                <span>Search by subject, faculty, semester or author.</span>
              </li>
              <li>
                <Share2 size={22} aria-hidden="true" />
                <strong>Share &amp; discuss</strong>
                <span>Like, comment and save the notes you love.</span>
              </li>
            </ol>
          </Reveal>
        </section>

        <section id="about" className="home-section alt">
          <div className="wrap">
            <h2>Why choose NoteHub</h2>
            <div className="category-grid">
              <div className="category">
                <BookOpen size={22} aria-hidden="true" />
                <strong>Organised</strong>
                <span className="muted">Favorites and an archive keep your library tidy.</span>
              </div>
              <div className="category">
                <Heart size={22} aria-hidden="true" />
                <strong>Community-driven</strong>
                <span className="muted">The most helpful notes rise to the top.</span>
              </div>
              <div className="category">
                <Download size={22} aria-hidden="true" />
                <strong>Easy downloads</strong>
                <span className="muted">Take notes offline whenever you need them.</span>
              </div>
            </div>
          </div>
        </section>

        <section className="home-section cta">
          <div className="wrap center">
            <h2>Ready to share what you know?</h2>
            <Link className="btn btn-primary btn-lg" to={user ? base : '/register'}>
              {user ? 'Go to your dashboard' : 'Create your account'}
            </Link>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="wrap">
          © {new Date().getFullYear()} NoteHub. Demo data is stored only in your browser.
        </div>
      </footer>
    </div>
  );
}
