import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout.jsx';
import FormField from '../../components/common/FormField.jsx';
import { useToast } from '../../components/common/Toast.jsx';
import { useCurrentUser } from '../../hooks/useData.js';
import { registerUser } from '../../services/authService.js';
import { toUserMessage } from '../../services/errors.js';
import { FACULTIES, SEMESTERS } from '../../utils/constants.js';
import { basePathFor } from '../../utils/paths.js';
import { passwordStrength, validateRegistration } from '../../utils/validation.js';

const EMPTY = {
  fullName: '',
  studentId: '',
  email: '',
  phone: '',
  university: '',
  faculty: '',
  department: '',
  semester: '',
  password: '',
  confirmPassword: '',
};

export default function RegisterPage() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { notify } = useToast();
  const [values, setValues] = useState(EMPTY);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={basePathFor(user)} replace />;

  const strength = passwordStrength(values.password);
  const set = (key) => (e) => {
    setValues((v) => ({ ...v, [key]: e.target.value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const found = validateRegistration(values);
    if (!terms) found.terms = 'You must accept the terms to continue.';
    setErrors(found);
    if (Object.keys(found).length) {
      notify('Please complete all fields correctly.', 'error');
      return;
    }
    setBusy(true);
    try {
      await registerUser(values);
      notify('Account created! Please log in.');
      navigate('/login', {
        replace: true,
        state: { registered: true, email: values.email.trim() },
      });
    } catch (error) {
      if (error.details && error.details.errors) setErrors(error.details.errors);
      notify(toUserMessage(error), 'error');
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join NoteHub to upload and download notes."
      footer={
        <p>
          Already registered? <Link to="/login">Log in</Link>
        </p>
      }
    >
      <form onSubmit={submit} noValidate aria-label="Register">
        <div className="form-grid">
          <FormField id="reg-name" label="Full name" error={errors.fullName}>
            <input
              type="text"
              autoComplete="name"
              value={values.fullName}
              onChange={set('fullName')}
            />
          </FormField>
          <FormField id="reg-sid" label="Student ID" error={errors.studentId}>
            <input type="text" value={values.studentId} onChange={set('studentId')} />
          </FormField>
          <FormField id="reg-email" label="Email" error={errors.email}>
            <input type="email" autoComplete="email" value={values.email} onChange={set('email')} />
          </FormField>
          <FormField id="reg-phone" label="Phone" error={errors.phone}>
            <input type="tel" autoComplete="tel" value={values.phone} onChange={set('phone')} />
          </FormField>
          <FormField id="reg-uni" label="University" error={errors.university}>
            <input type="text" value={values.university} onChange={set('university')} />
          </FormField>
          <FormField id="reg-faculty" label="Faculty" error={errors.faculty}>
            <select value={values.faculty} onChange={set('faculty')}>
              <option value="">Select faculty</option>
              {FACULTIES.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </FormField>
          <FormField id="reg-dept" label="Department" error={errors.department}>
            <input type="text" value={values.department} onChange={set('department')} />
          </FormField>
          <FormField id="reg-sem" label="Semester" error={errors.semester}>
            <select value={values.semester} onChange={set('semester')}>
              <option value="">Select semester</option>
              {SEMESTERS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </FormField>
          <FormField id="reg-pw" label="Password" error={errors.password}>
            <input
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={set('password')}
            />
          </FormField>
          <FormField id="reg-pw2" label="Confirm password" error={errors.confirmPassword}>
            <input
              type="password"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={set('confirmPassword')}
            />
          </FormField>
        </div>
        <div className={`strength s${strength.score}`} aria-hidden="true">
          <span />
        </div>
        <p className="small muted" aria-live="polite">
          {strength.label}
        </p>
        <label className="check">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} /> I
          agree to share notes responsibly and follow the community rules.
        </label>
        {errors.terms && (
          <p className="field-error" role="alert">
            {errors.terms}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Register'}
        </button>
      </form>
    </AuthLayout>
  );
}
