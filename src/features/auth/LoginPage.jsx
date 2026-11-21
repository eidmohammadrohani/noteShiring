import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import AuthLayout from './AuthLayout.jsx';
import FormField from '../../components/common/FormField.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useCurrentUser } from '../../hooks/useData.js';
import { login } from '../../services/authService.js';
import { toUserMessage } from '../../services/errors.js';
import { basePathFor } from '../../utils/paths.js';
import { validateLogin } from '../../utils/validation.js';

// The account decides the destination: admins go to /admin, students to /app.
function resolveTarget(user, from) {
  const base = basePathFor(user);
  return typeof from === 'string' && (from === base || from.startsWith(`${base}/`)) ? from : base;
}

export default function LoginPage() {
  const user = useCurrentUser();
  const location = useLocation();
  const { notify } = useToast();
  const [identifier, setIdentifier] = useState(location.state?.email || '');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={resolveTarget(user, location.state?.from)} replace />;

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const found = validateLogin({ identifier, password });
    setErrors(found);
    setFormError('');
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const account = await login(identifier, password);
      notify(`Welcome back, ${account.name.split(' ')[0]}!`);
      // The re-render above redirects based on the account's role.
    } catch (error) {
      setFormError(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Log in"
      subtitle="Welcome back. The system detects whether you are a student or an administrator."
      footer={
        <p>
          New to NoteHub? <Link to="/register">Create an account</Link>
        </p>
      }
    >
      {location.state?.registered && (
        <div className="banner banner-ok" role="status">
          Account created. Please log in.
        </div>
      )}
      <form onSubmit={submit} noValidate aria-label="Log in">
        <FormField id="login-id" label="Email or student ID" error={errors.identifier}>
          <input
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="you@university.edu"
          />
        </FormField>
        <FormField id="login-password" label="Password" error={errors.password}>
          <input
            type={show ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </FormField>
        <label className="check">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          {show ? (
            <EyeOff size={14} aria-hidden="true" />
          ) : (
            <Eye size={14} aria-hidden="true" />
          )}{' '}
          Show password
        </label>
        {formError && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>
        <p className="center small">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
