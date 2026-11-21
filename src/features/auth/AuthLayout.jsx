import Logo from '../../components/common/Logo.jsx';
import ThemeToggle from '../../components/layout/ThemeToggle.jsx';

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <aside className="auth-side">
        <Logo light />
        <div className="auth-story">
          <img
            className="auth-photo"
            src="/images/study-together.png"
            width="1672"
            height="941"
            alt="Students learning together at a library table"
          />
          <span className="auth-eyebrow">A SPACE TO LEARN. A COMMUNITY TO GROW.</span>
          <h2>
            Share knowledge.
            <br />
            Build a better future.
          </h2>
          <p>Upload your lecture notes, discover what other students wrote, and learn together.</p>
        </div>
        <small>© NoteHub</small>
      </aside>
      <main className="auth-main" id="main">
        <div className="auth-top">
          <span className="auth-brand-mobile">
            <Logo />
          </span>
          <ThemeToggle />
        </div>
        <div className="auth-card card">
          <h1>{title}</h1>
          {subtitle && <p className="muted">{subtitle}</p>}
          {children}
          {footer && <div className="auth-footer">{footer}</div>}
        </div>
      </main>
    </div>
  );
}
