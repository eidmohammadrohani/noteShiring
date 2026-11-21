import { useState } from 'react';
import FormField from '../../components/common/FormField.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { updateUserProfile } from '../../services/usersStorage.js';
import { toUserMessage } from '../../services/errors.js';
import { FACULTIES, SEMESTERS } from '../../utils/constants.js';
import { formatDate } from '../../utils/dateUtils.js';
import { initials } from '../../utils/text.js';

export default function ProfileForm({ user }) {
  const { notify } = useToast();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const current = editing ? { ...user, ...values } : user;
  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await updateUserProfile(user.id, values);
      notify('Profile updated.');
      setEditing(false);
      setValues({});
      setError('');
    } catch (e) {
      setError(toUserMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={save} noValidate aria-label="Profile details">
      <div className="profile-head">
        <div className="avatar avatar-lg" aria-hidden="true">
          {initials(user.name)}
        </div>
        <div>
          <h2 className="section-title">{user.name}</h2>
          <p className="muted">
            {user.role === 'admin' ? 'Administrator' : 'Student'} · member since{' '}
            {formatDate(user.createdAt)}
          </p>
        </div>
      </div>
      <fieldset disabled={!editing || busy} className="form-grid bare">
        <FormField id="p-name" label="Full name" error={error}>
          <input type="text" value={current.name} onChange={set('name')} />
        </FormField>
        <FormField id="p-email" label="Email">
          <input type="email" value={user.email} readOnly disabled />
        </FormField>
        <FormField id="p-sid" label="Student ID">
          <input type="text" value={user.studentId} readOnly disabled />
        </FormField>
        <FormField id="p-phone" label="Phone">
          <input type="tel" value={current.phone} onChange={set('phone')} />
        </FormField>
        <FormField id="p-uni" label="University">
          <input type="text" value={current.university} onChange={set('university')} />
        </FormField>
        <FormField id="p-faculty" label="Faculty">
          <select value={current.faculty} onChange={set('faculty')}>
            {FACULTIES.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </FormField>
        <FormField id="p-dept" label="Department">
          <input type="text" value={current.department} onChange={set('department')} />
        </FormField>
        <FormField id="p-sem" label="Semester">
          <select value={current.semester} onChange={set('semester')}>
            {SEMESTERS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </FormField>
        <FormField id="p-bio" label="Bio" full>
          <textarea rows={3} value={current.bio} onChange={set('bio')} />
        </FormField>
      </fieldset>
      <div className="form-actions">
        {editing ? (
          <>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => {
                setEditing(false);
                setValues({});
                setError('');
              }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : 'Save profile'}
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-primary" onClick={() => setEditing(true)}>
            Edit profile
          </button>
        )}
      </div>
    </form>
  );
}
