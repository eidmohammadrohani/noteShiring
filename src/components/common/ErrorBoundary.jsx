import { Component } from 'react';

// Catches render errors in one section so the rest of the app keeps working.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env && import.meta.env.DEV) {
      console.error('[NoteHub] Render error:', error, info?.componentStack);
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="error-panel" role="alert">
        <h2>Something went wrong on this page</h2>
        <p>The rest of NoteHub is still working. You can try again or go back to the dashboard.</p>
        <div className="row-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </button>
          <a className="btn btn-outline" href="/">
            Go to home
          </a>
        </div>
        {import.meta.env && import.meta.env.DEV && (
          <pre className="error-detail">{String(this.state.error)}</pre>
        )}
      </div>
    );
  }
}
