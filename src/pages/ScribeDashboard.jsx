import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { RequestFacts, RequestHead } from '../components/RequestDetails.jsx';
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
    <article className="request-card status-accepted">
      <RequestHead request={exam} status="You are writing this exam" subtitle={`For ${exam.student_name}, ${exam.institution}`} />
      <div className="ticket-body">
        <RequestFacts request={exam} extra={[['Exam centre', exam.centre_name], ['Student phone', exam.student_mobile]]} />
        <div className="button-row">
          <a className="primary-btn button-link" href={`tel:+91${exam.student_mobile}`}>Call student</a>
          <a className="outline-btn button-link" href={mapsUrl(exam.centre_address)} target="_blank" rel="noopener noreferrer">View on map</a>
          <button className="danger-link" type="button" onClick={withdraw} disabled={busy}>{busy ? 'Withdrawing…' : 'I can no longer attend'}</button>
        </div>
      </div>
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
    <article className="request-card status-open">
      <RequestHead request={request} status="Needs a scribe" subtitle={`For ${request.student_name}, ${request.institution}`} />
      <div className="ticket-body">
        <RequestFacts request={request} extra={[['Exam centre', request.centre_name]]} />
        <div className="button-row">
          <button className="primary-btn" type="button" onClick={accept} disabled={busy}>{busy ? 'Accepting…' : 'Accept this exam'}</button>
          <a className="outline-btn button-link" href={mapsUrl(request.centre_address)} target="_blank" rel="noopener noreferrer">View on map</a>
        </div>
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
          <h1 id="scribe-requests-title" tabIndex={-1}>Hello, {firstName(profile.full_name)}</h1>
          <p>Choose an exam you can write. Only requests that match your profile are shown.</p>
        </div>
        <div className="dash-actions">
          <Link className="outline-btn button-link" to="/scribe/profile">My profile</Link>
          <button className="primary-btn" type="button" onClick={load}>Refresh list</button>
        </div>
      </div>

      <div className="dash-layout">
        <div className="dash-main">
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
          <div className="empty-card compact"><h2>Loading eligible exams…</h2><p>Checking language, qualification and background rules.</p></div>
        ) : openRequests.length ? (
          openRequests.map(request => <OpenRequestCard key={request.id} request={request} onAccepted={load} />)
        ) : (
          <div className="empty-card compact"><h2>No exams to show</h2><p>No open requests match your profile right now. New exams appear here as students book them.</p></div>
        )}
      </div>
        </div>

        <aside className="dash-aside" aria-label="About choosing exams">
          <div className="aside-block">
            <h2>You choose</h2>
            <p>Nothing is assigned to you automatically. Accept only exams you are sure you can attend.</p>
          </div>
          <div className="aside-block">
            <h2>Why an exam may be missing</h2>
            <ul>
              <li>The student blocked your background or needs a higher qualification.</li>
              <li>You cannot write the question paper language.</li>
              <li>It clashes with an exam you already accepted.</li>
            </ul>
          </div>
          <div className="aside-block">
            <h2>If plans change</h2>
            <p>Withdraw as early as you can. The student is emailed and the exam opens for other scribes.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
