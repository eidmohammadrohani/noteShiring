import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from './AuthLayout.jsx';
import FormField from '../../components/common/FormField.jsx';
import { requestPasswordReset, resetPassword } from '../../services/authService.js';
import { toUserMessage } from '../../services/errors.js';
import { isValidEmail } from '../../utils/validation.js';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function sendCode(event) {
    event.preventDefault();
    if (busy) return;
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setStep(2);
    } catch (error) {
      setEmailError(toUserMessage(error));
    } finally {
      setBusy(false);
    }
  }

  async function submitReset(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await resetPassword(email, code, password, confirm);
      setDone(true);
      setErrors({});
    } catch (error) {
      setErrors(error.details?.errors || { code: toUserMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  if (done)
    return (
      <AuthLayout title="Password updated" subtitle="You can now log in with your new password.">
        <Link className="btn btn-primary btn-block" to="/login" state={{ email }}>
          Go to log in
        </Link>
      </AuthLayout>
    );

  return (
    <AuthLayout
      title="Reset your password"
      subtitle={
        step === 1
          ? 'Enter your account email to request a reset code.'
          : `If an account exists for ${email}, a reset code was issued.`
      }
      footer={<Link to="/login">Back to log in</Link>}
    >
      {step === 1 ? (
        <form onSubmit={sendCode} noValidate aria-label="Request reset code">
          <FormField id="fp-email" label="Email" error={emailError}>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormField>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Requesting…' : 'Send reset code'}
          </button>
        </form>
      ) : (
        <form onSubmit={submitReset} noValidate aria-label="Choose a new password">
          <p className="banner banner-warn">
            Local development: ask the person running NoteHub to retrieve your reset code from the
            server terminal. Email delivery is not configured.
          </p>
          <FormField id="fp-code" label="Reset code" error={errors.code}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </FormField>
          <FormField id="fp-pw" label="New password" error={errors.password || errors.newPassword}>
            <input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormField>
          <FormField id="fp-pw2" label="Confirm new password">
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </FormField>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? 'Saving…' : 'Update password'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
