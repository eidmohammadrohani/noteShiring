import { cloneElement } from 'react';

// Wraps a single control with a label, optional hint and an accessible error.
export default function FormField({ id, label, error, hint, children, full = false }) {
  const describedBy =
    [error ? `${id}-error` : '', hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field${full ? ' field-full' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {cloneElement(children, {
        id,
        'aria-invalid': error ? 'true' : undefined,
        'aria-describedby': describedBy,
        className: `${children.props.className || ''}${error ? ' has-error' : ''}`.trim(),
      })}
      {hint && !error && (
        <p className="field-hint" id={`${id}-hint`}>
          {hint}
        </p>
      )}
      {error && (
        <p className="field-error" id={`${id}-error`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
