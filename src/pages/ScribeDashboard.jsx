import { useCallback, useEffect, useState } from 'react';
import { DateBadge, RequestFacts } from '../components/RequestDetails.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../lib/auth.jsx';
import { firstName, friendlyError, mapsUrl } from '../lib/format.js';
import { supabase } from '../lib/supabase.js';

function AssignmentCard({ exam, onChange }) {
  const notify = useToast();
  const [busy, setBusy] = useState(false);

  const withdraw = async () => {
    if (!window.confirm('Withdraw from this exam? The student will need another scribe, so please only do this if you really cannot attend.')) return;
    setBusy(true);
    const { error } = await supabase.rpc('withdraw_from_request', { p_request_id: exam.id });
    setBusy(false);
    if (error) return notify(friendlyError(error));
    notify('You have withdrawn. The request is open for other scribes again.');
    onChange();
  };

  return (
    <article className="request-card">
      <div className="request-card-head">
        <div>
          <span className="request-status accepted">You are writing this exam</span>
          <h2>{exam.subject}</h2>
          <p>{exam.student_name} • {exam.institution}</p>
        </div>
        <DateBadge request={exam} />
      </div>
      <RequestFacts request={exam} extra={[['Student phone', exam.student_mobile]]} />
      <div className="button-row">
        <a className="primary-btn coral-btn button-link" href={`tel:+91${exam.student_mobile}`}>☎ Contact student</a>
        <a className="outline-btn button-link" href={mapsUrl(exam.centre_address)} target="_blank" rel="noopener noreferrer">⌖ View location</a>
      </div>
      <button className="danger-link" type="button" onClick={withdraw} disabled={busy}>{busy ? 'Withdrawing…' : 'I can no longer attend'}</button>
    </article>
  );
}

function OpenRequestCard({ request, onAccepted }) {
  const notify = useToast();
  const [busy, setBusy] = useState(false);

  const accept = async () => {
    setBusy(true);
    const { error } = await supabase.rpc('accept_request', { p_request_id: request.id });
    setBusy(false);
    if (error) {
      notify(friendlyError(error));
      return onAccepted();
    }
    notify('Exam accepted. The student can now see your details.');
    onAccepted();
  };

  return (
    <article className="request-card">
      <div className="request-card-head">
        <div>
          <span className="request-status">Open request</span>
          <h2>{request.subject}</h2>
          <p>{request.student_name} • {request.institution}</p>
        </div>
        <DateBadge request={request} />
      </div>
      <RequestFacts request={request} />
      <div className="button-row">
        <button className="primary-btn coral-btn" type="button" onClick={accept} disabled={busy}>{busy ? 'Accepting…' : 'Accept this exam'}</button>
        <a className="outline-btn button-link" href={mapsUrl(request.centre_address)} target="_blank" rel="noopener noreferrer">View location</a>
      </div>
    </article>
  );
}

export default function ScribeDashboard() {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState(null);
  const [openRequests, setOpenRequests] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [mine, open] = await Promise.all([supabase.rpc('scribe_assignments'), supabase.rpc('eligible_requests')]);
    const loadError = mine.error || open.error;
    if (loadError) return setError(friendlyError(loadError));
    setError('');
    setAssignments(mine.data);
    setOpenRequests(open.data);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <section className="screen active dashboard" aria-labelledby="scribe-requests-title">
      <div className="dash-head">
        <div>
          <span className="kicker coral">SCRIBE DASHBOARD</span>
          <h1 id="scribe-requests-title" tabIndex={-1}>Hello {firstName(profile.full_name)}, choose an exam to help with</h1>
          <p>Only requests that match your profile and eligibility rules are shown here.</p>
        </div>
        <button className="primary-btn coral-btn" type="button" onClick={load}>Refresh list</button>
      </div>

      <div className="notice blue"><b aria-hidden="true">i</b><p><strong>You choose</strong> Pick the exam you want to accept. If a student blocks your background, or the time clashes with an exam you already accepted, it will not appear here.</p></div>

      {error && <p className="form-error" role="alert">{error}</p>}

      {assignments?.length > 0 && (
        <>
          <h2 className="section-title">Your upcoming exams</h2>
          <div className="request-list">{assignments.map(exam => <AssignmentCard key={exam.id} exam={exam} onChange={load} />)}</div>
        </>
      )}

      <h2 className="section-title">Exams you can help with</h2>
      <div className="request-list" aria-live="polite" aria-busy={openRequests === null}>
        {openRequests === null ? (
          <div className="empty-card compact"><span aria-hidden="true">⌛</span><h2>Loading eligible exams…</h2><p>Checking medium, qualification and background rules.</p></div>
        ) : openRequests.length ? (
          openRequests.map(request => <OpenRequestCard key={request.id} request={request} onAccepted={load} />)
        ) : (
          <div className="empty-card compact"><span aria-hidden="true">☷</span><h2>No exams to show</h2><p>No eligible open requests right now. New exams will appear here when students submit them.</p></div>
        )}
      </div>
    </section>
  );
}
