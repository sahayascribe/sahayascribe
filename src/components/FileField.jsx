import { useState } from 'react';
import { validateDocument } from '../lib/documents.js';

export default function FileField({ label, hint, required, onChange }) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleChange = event => {
    const file = event.target.files?.[0] ?? null;
    const problem = validateDocument(file);
    event.target.setCustomValidity(problem || '');
    setError(problem || '');
    setName(file && !problem ? file.name : '');
    onChange(problem ? null : file);
  };

  return (
    <label className="full upload-box">
      <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required={required} onChange={handleChange} />
      <span aria-hidden="true">↑</span>
      <strong>{label}</strong>
      <small>{name ? `Selected: ${name}` : hint}</small>
      {error && <small className="field-error" role="alert">{error}</small>}
    </label>
  );
}
