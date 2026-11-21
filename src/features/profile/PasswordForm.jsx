import { useState } from 'react';
import FormField from '../../components/common/FormField.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { changePassword } from '../../services/authService.js';
import { toUserMessage } from '../../services/errors.js';

export default function PasswordForm({ user }) {
  const { notify } = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await changePassword(user.id, form.current, form.next, form.confirm);
      setForm({ current: '', next: '', confirm: '' });
      setErrors({});
      notify('Password changed. Please log in again.');
    } catch (e) {
      setErrors(e.details?.errors || { current: toUserMessage(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={submit} noValidate aria-label="Change password">
      <h2 className="section-title">Change password</h2>
      <div className="form-grid">
        <FormField
          id="pw-current"
          label="Current password"
          error={errors.currentPassword || errors.current}
          full
        >
          <input
            type="password"
            autoComplete="current-password"
            value={form.current}
            onChange={set('current')}
          />
        </FormField>
        <FormField id="pw-new" label="New password" error={errors.newPassword}>
          <input
            type="password"
            autoComplete="new-password"
            value={form.next}
            onChange={set('next')}
          />
        </FormField>
        <FormField id="pw-confirm" label="Confirm new password">
          <input
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={set('confirm')}
          />
        </FormField>
      </div>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Update password'}
        </button>
      </div>
    </form>
  );
}
