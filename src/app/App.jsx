import { BrowserRouter } from 'react-router-dom';
import { useEffect } from 'react';
import ErrorBoundary from '../components/common/ErrorBoundary.jsx';
import { ConfirmProvider } from '../components/common/ConfirmDialog.jsx';
import { ToastProvider } from '../components/common/Toast.jsx';
import { ThemeProvider } from '../hooks/useTheme.jsx';
import AppRoutes from './router.jsx';
import { useStoreVersion } from '../hooks/useData.js';
import { getConnectionStatus, refreshState } from '../services/apiClient.js';
import { toUserMessage } from '../services/errors.js';

function ApiBoundary({ children }) {
  useStoreVersion();
  const { ready, loading, error } = getConnectionStatus();
  const reload = () => {
    void refreshState().catch(() => {});
  };
  useEffect(() => {
    reload();
    const timer = setInterval(reload, 30000);
    window.addEventListener('focus', reload);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', reload);
    };
  }, []);
  if (!ready) {
    return (
      <main className="connection-screen">
        <section className="card" aria-live="polite">
          <h1>{error ? 'Unable to load NoteHub' : 'Loading NoteHub…'}</h1>
          <p>{error ? toUserMessage(error) : 'Connecting to your saved notes.'}</p>
          {error && (
            <button type="button" className="btn btn-primary" onClick={reload} disabled={loading}>
              {loading ? 'Connecting…' : 'Try again'}
            </button>
          )}
        </section>
      </main>
    );
  }
  return (
    <>
      {error && (
        <div className="banner banner-warn connection-alert" role="alert">
          <span>{toUserMessage(error)} Some workspace data may be out of date.</span>
          <button type="button" className="btn btn-outline" onClick={reload} disabled={loading}>
            {loading ? 'Connecting…' : 'Retry'}
          </button>
        </div>
      )}
      {children}
    </>
  );
}

// Providers shared by the app and by tests (tests add their own Router).
export function AppProviders({ children }) {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <ConfirmProvider>
            <ApiBoundary>{children}</ApiBoundary>
          </ConfirmProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
