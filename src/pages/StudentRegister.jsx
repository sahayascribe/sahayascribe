import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FileField from '../components/FileField.jsx';
import { useAuth } from '../lib/auth.jsx';
import { STUDY_MEDIUMS } from '../lib/constants.js';
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
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    let certificatePath = null;
    try {
      if (certificate) certificatePath = await uploadDocument(user.id, certificate, 'disability-certificate');
      const { error: insertError } = await supabase.from('students').insert({
        full_name: form.get('fullName').trim(),
        mobile: form.get('mobile').trim(),
        institution: form.get('institution').trim(),
        semester_year: form.get('semesterYear').trim(),
        medium: form.get('medium'),
        certificate_path: certificatePath
      });
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
          <label>Full Name *<input name="fullName" required minLength={2} maxLength={120} autoComplete="name" placeholder="Enter your full name" /></label>
          <label>Mobile Number *<input name="mobile" required type="tel" autoComplete="tel-national" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} placeholder="10-digit mobile number" title="10-digit Indian mobile number" /></label>
          <label>School / College *<input name="institution" required minLength={2} maxLength={160} placeholder="Name of institution" /></label>
          <label>Semester / Year *<input name="semesterYear" required maxLength={40} placeholder="e.g. Semester 4" /></label>
          <label className="full">Medium of Study *
            <select name="medium" required defaultValue="">
              <option value="" disabled>Select your medium</option>
              {STUDY_MEDIUMS.map(medium => <option key={medium}>{medium}</option>)}
            </select>
          </label>
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
