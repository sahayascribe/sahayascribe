import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DateBadge, RequestFacts } from '../components/RequestDetails.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../lib/auth.jsx';
import { firstName, friendlyError, greeting, initials, mapsUrl, todayIST } from '../lib/format.js';
import { supabase } from '../lib/supabase.js';

const STATUS_LABELS = { open: 'Waiting for a scribe', accepted: 'Scribe confirmed', cancelled: 'Cancelled' };

function RatingForm({ request, onRated }) {
  const notify = useToast();
  const [stars, setStars] = useState(0);
  const [busy, setBusy] = useState(false);

  const submit = async event => {
    event.preventDefault();
    if (!stars) return notify('Please choose a star rating.');
    setBusy(true);
    const feedback = new FormData(event.currentTarget).get('feedback');
    const { error } = await supabase.rpc('rate_scribe', { p_request_id: request.id, p_stars: stars, p_feedback: feedback });
    setBusy(false);
    if (error) return notify(friendlyError(error));
    notify('Thank you for your feedback.');
    onRated();
  };

  return (
    <form className="rating-card inline-rating" onSubmit={submit}>
      <h3>Rate {firstName(request.scribe_name)}</h3>
      <div className="rating-stars" role="radiogroup" aria-label={`Rate ${request.scribe_name} out of five`}>
        {[1, 2, 3, 4, 5].map(value => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={stars === value}
            aria-label={`${value} star${value > 1 ? 's' : ''}`}
            className={value <= stars ? 'selected' : ''}
            onClick={() => setStars(value)}
          >★</button>
        ))}
      </div>
      <textarea name="feedback" aria-label="Optional feedback" rows={3} maxLength={1000} placeholder="Share a few words (optional)" />
      <button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Submit Rating'}</button>
    </form>
  );
}

function RequestCard({ request, onChange }) {
  const notify = useToast();
  const [busy, setBusy] = useState(false);
  const upcoming = request.exam_date >= todayIST();
  const accepted = request.status === 'accepted';

  const cancel = async () => {
    const warning = accepted
      ? 'Cancel this request? Your scribe will be released. Please cancel at least 12 hours before the exam.'
      : 'Cancel this request?';
    if (!window.confirm(warning)) return;
    setBusy(true);
    const { error } = await supabase.rpc('cancel_request', { p_request_id: request.id });
    setBusy(false);
    if (error) return notify(friendlyError(error));
    notify('Request cancelled.');
    onChange();
  };

  return (
    <article className={`request-card status-${request.status}`}>
      <div className="request-card-head">
        <div>
          <span className="request-status">{upcoming || request.status !== 'open' ? STATUS_LABELS[request.status] : 'No scribe found'}</span>
          <h2>{request.subject}</h2>
          <p>{request.centre_name}</p>
        </div>
        <DateBadge request={request} />
      </div>

      {accepted && (
        <div className="profile-row match-row">
          <div className="avatar">{initials(request.scribe_name)}</div>
          <div>
            <h3>{request.scribe_name}</h3>
            <p>{request.scribe_qualification} · {request.scribe_city}</p>
            {request.scribe_rating_count > 0 && (
              <div className="stars" aria-label={`${request.scribe_rating} out of 5 stars from ${request.scribe_rating_count} ratings`}>
                ★ <small>{request.scribe_rating} ({request.scribe_rating_count})</small>
              </div>
            )}
          </div>
        </div>
      )}

      <RequestFacts request={request} extra={accepted ? [['Scribe phone', request.scribe_mobile]] : []} />

      {request.status !== 'cancelled' && upcoming && (
        <div className="button-row">
          {accepted
            ? <a className="primary-btn button-link" href={`tel:+91${request.scribe_mobile}`}>☎ Call scribe</a>
            : <a className="outline-btn button-link" href={mapsUrl(request.centre_address)} target="_blank" rel="noopener noreferrer">View location</a>}
          <button className="danger-link" type="button" onClick={cancel} disabled={busy}>{busy ? 'Cancelling…' : 'Cancel request'}</button>
        </div>
      )}

      {accepted && !upcoming && (request.my_rating
        ? <p className="hint">You rated this scribe {request.my_rating} out of 5. Thank you!</p>
        : <RatingForm request={request} onRated={onChange} />)}
    </article>
  );
}

export default function StudentDashboard() {
  const { profile } = useAuth();
  const [requests, setRequests] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase.rpc('student_requests');
    if (loadError) return setError(friendlyError(loadError));
    setError('');
    setRequests(data);
  }, []);

  useEffect(() => { load(); }, [load]);

  const today = todayIST();
  const upcoming = (requests || []).filter(r => r.status !== 'cancelled' && r.exam_date >= today).reverse();
  const past = (requests || []).filter(r => r.status === 'cancelled' || r.exam_date < today);

  return (
    <section className="screen active dashboard" aria-labelledby="dashboard-title">
      <div className="dash-head">
        <div>
          <span className="kicker">STUDENT DASHBOARD</span>
          <h1 id="dashboard-title" tabIndex={-1}>{greeting()}, {firstName(profile.full_name)}</h1>
          <p>Ready for your next exam?</p>
        </div>
        <div className="dash-actions">
          <Link className="outline-btn button-link" to="/student/profile">My profile</Link>
          <Link className="primary-btn button-link" to="/student/book">+ Book a Scribe</Link>
        </div>
      </div>

      <div className="feature-grid">
        <article><span aria-hidden="true">⌁</span><h2>Eligibility rules</h2><p>Only scribes who match your language, qualification and background rules can see your exam.</p></article>
        <article><span aria-hidden="true">♢</span><h2>ID on file</h2><p>Every volunteer uploads an ID document when they register.</p></article>
        <article><span aria-hidden="true">↻</span><h2>Private contacts</h2><p>Phone numbers are shared only between you and the scribe who accepts.</p></article>
      </div>

      <div className="notice"><b aria-hidden="true">!</b><p><strong>Cancellation policy</strong> Please cancel at least 12 hours before the exam so your scribe can plan.</p></div>

      {error && <p className="form-error" role="alert">{error}</p>}
      <h2 className="section-title">Upcoming exams</h2>
      <div className="request-list" aria-live="polite" aria-busy={requests === null}>
        {requests === null ? (
          <div className="empty-card compact"><span aria-hidden="true">⌛</span><h2>Loading your requests…</h2></div>
        ) : upcoming.length ? (
          upcoming.map(request => <RequestCard key={request.id} request={request} onChange={load} />)
        ) : (
          <div className="empty-card compact">
            <span aria-hidden="true">☷</span><h2>No upcoming exams</h2>
            <p>Book a scribe and your request will appear here.</p>
            <Link className="outline-btn button-link" to="/student/book">Book your first scribe</Link>
          </div>
        )}
      </div>

      {past.length > 0 && (
        <>
          <h2 className="section-title">Past and cancelled</h2>
          <div className="request-list">{past.map(request => <RequestCard key={request.id} request={request} onChange={load} />)}</div>
        </>
      )}
    </section>
  );
}
