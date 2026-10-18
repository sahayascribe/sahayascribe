import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import FileField from '../components/FileField.jsx';
import { useAuth } from '../lib/auth.jsx';
import { BACKGROUNDS, OCCUPATIONS, QUALIFICATION_LEVELS, WRITING_MEDIUMS } from '../lib/constants.js';
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
    const form = new FormData(event.currentTarget);
    const writingMediums = form.getAll('writingMedium');
    if (!writingMediums.length) return setError('Please choose at least one medium you can write in.');
    if (!idDocument) return setError('Please upload a College ID or masked Aadhaar.');
    setBusy(true);
    setError('');
    let idPath = null;
    try {
      idPath = await uploadDocument(user.id, idDocument, 'id');
      const { error: insertError } = await supabase.from('scribes').insert({
        full_name: form.get('fullName').trim(),
        mobile: form.get('mobile').trim(),
        age: Number(form.get('age')),
        city: form.get('city').trim(),
        occupation: form.get('occupation'),
        qualification_level: Number(form.get('qualificationLevel')),
        qualification: form.get('qualification').trim(),
        background: form.get('background'),
        writing_mediums: writingMediums,
        id_document_path: idPath
      });
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
        <Link className="back-btn" to="/">← Back</Link>
        <span className="kicker coral">SCRIBE REGISTRATION</span>
        <h1 id="scribe-reg-title" tabIndex={-1}>Volunteer your time</h1>
        <p>A few details help students find the right scribe for their exam.</p>
      </div>
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>Full Name *<input name="fullName" required minLength={2} maxLength={120} autoComplete="name" placeholder="Enter your full name" /></label>
          <label>Mobile Number *<input name="mobile" required type="tel" autoComplete="tel-national" inputMode="numeric" pattern="[6-9][0-9]{9}" maxLength={10} placeholder="10-digit mobile number" title="10-digit Indian mobile number" /></label>
          <label>Age *<input name="age" required type="number" min={16} max={100} placeholder="Your age" /></label>
          <label>City *<input name="city" required minLength={2} maxLength={80} placeholder="Your city" /></label>
          <fieldset className="full">
            <legend>You are a *</legend>
            <div className="choice-pills">
              {OCCUPATIONS.map(occupation => (
                <label key={occupation}><input required type="radio" name="occupation" value={occupation} /><span>{occupation}</span></label>
              ))}
            </div>
          </fieldset>
          <label>Highest Qualification *
            <select name="qualificationLevel" required defaultValue="">
              <option value="" disabled>Select level</option>
              {QUALIFICATION_LEVELS.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
            </select>
          </label>
          <label>Course / Degree *<input name="qualification" required maxLength={120} placeholder="e.g. BCom, BSc, Engineering, SSLC" /></label>
          <label className="full">Background / Stream *
            <select name="background" required defaultValue="">
              <option value="" disabled>Select background</option>
              {BACKGROUNDS.map(background => <option key={background}>{background}</option>)}
            </select>
          </label>
          <fieldset className="full">
            <legend>Which medium can you write in? * <small>(select all that apply)</small></legend>
            <div className="choice-pills">
              {WRITING_MEDIUMS.map(medium => (
                <label key={medium}><input type="checkbox" name="writingMedium" value={medium} /><span>{medium}</span></label>
              ))}
            </div>
          </fieldset>
          <FileField required label="Upload ID for verification *" hint="College ID or masked Aadhaar · PDF, JPG or PNG up to 5 MB · Only admins can see it" onChange={setIdDocument} />
        </div>
        <label className="check-row"><input required type="checkbox" /><span>I agree to volunteer as a scribe for visually impaired students.</span></label>
        <p className="hint">Your mobile number is shared only with students whose exams you accept.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-btn coral-btn" type="submit" disabled={busy}>
          {busy ? 'Saving registration…' : <>Register as Scribe <span aria-hidden="true">→</span></>}
        </button>
      </form>
    </section>
  );
}
