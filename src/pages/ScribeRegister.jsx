import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FileField from '../components/FileField.jsx';
import { readScribeForm, ScribeFields } from '../components/ProfileFields.jsx';
import { useAuth } from '../lib/auth.jsx';
import { removeDocument, uploadDocument } from '../lib/documents.js';
import { friendlyError } from '../lib/format.js';
import { supabase } from '../lib/supabase.js';

export default function ScribeRegister() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [idDocument, setIdDocument] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async event => {
    event.preventDefault();
    const { values, error: formError } = readScribeForm(event.currentTarget);
    if (formError) return setError(formError);
    if (!idDocument) return setError('Please upload a College ID or masked Aadhaar.');
    setBusy(true);
    setError('');
    let idPath = null;
    try {
      idPath = await uploadDocument(user.id, idDocument, 'id');
      const { error: insertError } = await supabase.from('scribes').insert({ ...values, id_document_path: idPath });
      if (insertError) throw insertError;
      // Go to the success page first; it waits while the new profile loads.
      // Refreshing first would let the "already registered" guard redirect elsewhere.
      navigate('/scribe/registered', { replace: true, state: { registered: true } });
      refreshProfile();
    } catch (err) {
      if (idPath) removeDocument(idPath);
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <section className="screen active form-screen" aria-labelledby="scribe-reg-title">
      <div className="form-heading">
        <Link className="back-btn" to="/">Back</Link>
        <h1 id="scribe-reg-title" tabIndex={-1}>Volunteer your time</h1>
        <p>A few details help students find the right scribe for their exam.</p>
      </div>
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <ScribeFields />
          <FileField required label="ID document *" hint="College ID or masked Aadhaar. PDF, JPG or PNG up to 5 MB. Only admins can see it." onChange={setIdDocument} />
        </div>
        <label className="check-row"><input required type="checkbox" /><span>I agree to volunteer as a scribe for visually impaired students.</span></label>
        <p className="hint">Your mobile number is shared only with students whose exams you accept.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-btn coral-btn" type="submit" disabled={busy}>
          {busy ? 'Saving registration…' : 'Create scribe profile'}
        </button>
      </form>
    </section>
  );
}
