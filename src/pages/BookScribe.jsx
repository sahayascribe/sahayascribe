import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BLOCKABLE_BACKGROUNDS, REQUEST_QUALIFICATION_LEVELS, WRITING_MEDIUMS } from '../lib/constants.js';
import { friendlyError, mapsUrl, todayIST } from '../lib/format.js';
import { supabase } from '../lib/supabase.js';

export default function BookScribe() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [address, setAddress] = useState('');

  const handleSubmit = async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (form.get('endTime') <= form.get('startTime')) return setError('The end time must be after the start time.');
    setBusy(true);
    setError('');
    const { error: insertError } = await supabase.from('exam_requests').insert({
      exam_date: form.get('examDate'),
      start_time: form.get('startTime'),
      end_time: form.get('endTime'),
      centre_name: form.get('centreName').trim(),
      centre_address: form.get('centreAddress').trim(),
      subject: form.get('subject').trim(),
      question_medium: form.get('questionMedium'),
      min_qualification_level: Number(form.get('minQualification')),
      blocked_backgrounds: form.getAll('blockedBackgrounds'),
      notes: form.get('notes').trim() || null
    });
    if (insertError) {
      setError(friendlyError(insertError));
      setBusy(false);
      return;
    }
    navigate('/student/requested', { replace: true });
  };

  return (
    <section className="screen active form-screen" aria-labelledby="book-title">
      <div className="form-heading">
        <Link className="back-btn" to="/student">Back to dashboard</Link>
        <h1 id="book-title" tabIndex={-1}>Book a scribe</h1>
        <p>Share your exam details. Eligible volunteers will see the request and can accept it.</p>
      </div>
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <label>Exam date *<input name="examDate" required type="date" min={todayIST()} /></label>
          <div className="split">
            <label>From *<input name="startTime" required type="time" /></label>
            <label>To *<input name="endTime" required type="time" /></label>
          </div>
          <label>Exam centre name *<input name="centreName" required minLength={2} maxLength={160} placeholder="Centre name" /></label>
          <label>Subject *<input name="subject" required minLength={2} maxLength={120} placeholder="e.g. Economics" /></label>
          <label className="full">Exam centre address *
            <span className="input-action">
              <input name="centreAddress" required minLength={5} maxLength={300} placeholder="Full address" value={address} onChange={event => setAddress(event.target.value)} />
              {address.trim().length >= 5 && (
                <a className="otp-btn" href={mapsUrl(address)} target="_blank" rel="noopener noreferrer">Check on map</a>
              )}
            </span>
          </label>
          <label>Question paper language *
            <select name="questionMedium" required defaultValue="">
              <option value="" disabled>Select language</option>
              {WRITING_MEDIUMS.map(medium => <option key={medium}>{medium}</option>)}
            </select>
          </label>
          <label>Minimum scribe qualification *
            <select name="minQualification" required defaultValue="">
              <option value="" disabled>Select qualification</option>
              {REQUEST_QUALIFICATION_LEVELS.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
            </select>
          </label>
          <fieldset className="full">
            <legend>Scribe backgrounds to exclude (optional)</legend>
            <div className="choice-pills">
              {BLOCKABLE_BACKGROUNDS.map(background => (
                <label key={background}><input type="checkbox" name="blockedBackgrounds" value={background} /><span>{background}</span></label>
              ))}
            </div>
          </fieldset>
          <label className="full">Notes for the scribe
            <textarea name="notes" rows={4} maxLength={1000} placeholder="Exam hall instructions, entry time, centre contact..." />
          </label>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="primary-btn" type="submit" disabled={busy}>
          {busy ? 'Sending request…' : 'Send request'}
        </button>
      </form>
    </section>
  );
}
