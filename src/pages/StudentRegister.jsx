import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FileField from '../components/FileField.jsx';
import { readStudentForm, StudentFields } from '../components/ProfileFields.jsx';
import { useAuth } from '../lib/auth.jsx';
import { removeDocument, uploadDocument } from '../lib/documents.js';
import { friendlyError } from '../lib/format.js';
import { supabase } from '../lib/supabase.js';

export default function StudentRegister() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [certificate, setCertificate] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async event => {
    event.preventDefault();
    const { values } = readStudentForm(event.currentTarget);
    setBusy(true);
    setError('');
    let certificatePath = null;
    try {
      if (certificate) certificatePath = await uploadDocument(user.id, certificate, 'disability-certificate');
      const { error: insertError } = await supabase.from('students').insert({ ...values, certificate_path: certificatePath });
      if (insertError) throw insertError;
      // Go to the success page first; it waits while the new profile loads.
      // Refreshing first would let the "already registered" guard redirect elsewhere.
      navigate('/student/registered', { replace: true, state: { registered: true } });
      refreshProfile();
    } catch (err) {
      if (certificatePath) removeDocument(certificatePath);
      setError(friendlyError(err));
      setBusy(false);
    }
  };

  return (
    <section className="screen active form-screen" aria-labelledby="student-reg-title">
      <div className="form-heading">
        <Link className="back-btn" to="/">← Back</Link>
        <span className="kicker">STUDENT REGISTRATION</span>
        <h1 id="student-reg-title" tabIndex={-1}>Tell us about yourself</h1>
        <p>This helps us find the right scribe for you. Fields marked * are required.</p>
      </div>
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <StudentFields />
          <FileField label="Upload Disability Certificate" hint="Optional, but recommended · PDF, JPG or PNG up to 5 MB · Only admins can see it" onChange={setCertificate} />
        </div>
        <label className="check-row"><input required type="checkbox" /><span>I confirm that I require a scribe for examinations.</span></label>
        <p className="hint">Your mobile number is shared only with the scribe who accepts your exam.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-btn" type="submit" disabled={busy}>
          {busy ? 'Saving registration…' : <>Register as Student <span aria-hidden="true">→</span></>}
        </button>
      </form>
    </section>
  );
}
