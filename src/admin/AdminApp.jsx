import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth, useEmailCode } from '../lib/auth.jsx';
import { qualificationLabel } from '../lib/constants.js';
import { documentUrl } from '../lib/documents.js';
import { formatDate, formatDateTime, formatTime, friendlyError, initials } from '../lib/format.js';
import { isConfigured, supabase } from '../lib/supabase.js';

function LoginView({ message }) {
  const { step, email, busy, error, sendCode, verifyCode, restart } = useEmailCode();
  return (
    <section className="login-view">
      <div className="login-art" aria-hidden="true"><span>Sa</span><i></i><i></i><i></i></div>
      <form
        className="login-card"
        onSubmit={event => {
          event.preventDefault();
          const field = event.currentTarget.elements.namedItem(step === 'email' ? 'email' : 'code');
          step === 'email' ? sendCode(field.value) : verifyCode(field.value);
        }}
      >
        <div className="admin-badge">PRIVATE ADMIN</div>
        <h1>Welcome back</h1>
        <p>{step === 'email' ? 'Sign in with your admin email to view SahayaScribe registrations.' : `Enter the code we sent to ${email}.`}</p>
        {step === 'email' ? (
          <label>Admin email<input key="email" name="email" type="email" autoComplete="email" required placeholder="you@sahayascribe.com" /></label>
        ) : (
          <label>One-time code<input key="code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required autoFocus placeholder="Code from your email" /></label>
        )}
        <p className="error" role="alert">{message || (error ? friendlyError(error) : '')}</p>
        <button type="submit" disabled={busy || !isConfigured}>
          {busy ? 'Please wait…' : step === 'email' ? <>Send code <span>→</span></> : <>Open dashboard <span>→</span></>}
        </button>
        {step === 'code' && <button type="button" className="link-btn" onClick={restart}>Use a different email</button>}
        <small>🔒 This page is not linked from the student website.</small>
      </form>
    </section>
  );
}

function NotAdmin({ email, onSignOut }) {
  return (
    <section className="login-view">
      <div className="login-art" aria-hidden="true"><span>Sa</span><i></i><i></i><i></i></div>
      <div className="login-card">
        <div className="admin-badge">PRIVATE ADMIN</div>
        <h1>No admin access</h1>
        <p>{email} is not an administrator account.</p>
        <button type="button" onClick={onSignOut}>Sign out</button>
      </div>
    </section>
  );
}

function DocumentButton({ path, label }) {
  const [busy, setBusy] = useState(false);
  if (!path) return <span className="muted">—</span>;
  const open = async () => {
    // Open the tab synchronously so pop-up blockers allow it, then point it at the signed URL.
    const tab = window.open('about:blank', '_blank');
    setBusy(true);
    try {
      const url = await documentUrl(path);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      }
    } catch (error) {
      tab?.close();
      window.alert(friendlyError(error));
    } finally {
      setBusy(false);
    }
  };
  return <button type="button" className="doc-btn" onClick={open} disabled={busy}>{busy ? 'Opening…' : label}</button>;
}

const Person = ({ name }) => <div className="person"><span>{initials(name)}</span><b>{name}</b></div>;

const TABS = {
  students: {
    title: 'Registered students',
    search: 'Search by name, mobile or institution',
    head: ['STUDENT', 'MOBILE', 'SCHOOL / COLLEGE', 'YEAR', 'MEDIUM', 'CERTIFICATE', 'REGISTERED'],
    row: item => [
      <Person name={item.full_name} />, item.mobile, item.institution, item.semester_year,
      <span className="chip">{item.medium}</span>,
      <DocumentButton path={item.certificate_path} label="View" />, formatDateTime(item.created_at)
    ]
  },
  scribes: {
    title: 'Registered scribes',
    search: 'Search by name, mobile or city',
    head: ['SCRIBE', 'MOBILE', 'CITY', 'AGE', 'QUALIFICATION', 'BACKGROUND', 'WRITING MEDIUM', 'ID', 'REGISTERED'],
    row: item => [
      <Person name={item.full_name} />, item.mobile, item.city, item.age,
      `${qualificationLabel(item.qualification_level)} · ${item.qualification}`, item.background,
      item.writing_mediums.join(', '), <DocumentButton path={item.id_document_path} label="View ID" />, formatDateTime(item.created_at)
    ]
  },
  requests: {
    title: 'Exam requests',
    search: 'Search by subject, centre, student or scribe',
    head: ['STATUS', 'SUBJECT', 'DATE', 'TIME', 'STUDENT', 'SCRIBE', 'CENTRE', 'MEDIUM', 'CREATED'],
    row: item => [
      <span className={`chip status-${item.status}`}>{item.status}</span>, item.subject, formatDate(item.exam_date),
      `${formatTime(item.start_time)} – ${formatTime(item.end_time)}`, item.student?.full_name ?? '—',
      item.scribe?.full_name ?? '—', item.centre_name, item.question_medium, formatDateTime(item.created_at)
    ]
  }
};

function Dashboard({ user, onSignOut }) {
  const [data, setData] = useState({ students: [], scribes: [], requests: [] });
  const [activeTab, setActiveTab] = useState('students');
  const [term, setTerm] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [students, scribes, requests] = await Promise.all([
      supabase.from('students').select('*').order('created_at', { ascending: false }),
      supabase.from('scribes').select('*').order('created_at', { ascending: false }),
      supabase
        .from('exam_requests')
        .select('*, student:students(full_name, mobile), scribe:scribes(full_name, mobile)')
        .order('exam_date', { ascending: false })
    ]);
    const loadError = students.error || scribes.error || requests.error;
    if (loadError) return setError(friendlyError(loadError));
    setError('');
    setData({ students: students.data, scribes: scribes.data, requests: requests.data });
  }, []);

  useEffect(() => { load(); }, [load]);

  const tab = TABS[activeTab];
  const rows = useMemo(() => {
    const needle = term.trim().toLowerCase();
    return data[activeTab].filter(item => JSON.stringify(item).toLowerCase().includes(needle));
  }, [data, activeTab, term]);

  return (
    <section className="dashboard-view">
      <aside>
        <div className="brand"><span>S</span>Sahaya<strong>Scribe</strong></div>
        <p>ADMIN CONSOLE</p>
        <nav>
          {[['students', '◉ Students'], ['scribes', '✎ Scribes'], ['requests', '☷ Requests']].map(([key, label]) => (
            <button key={key} type="button" className={activeTab === key ? 'active' : ''} aria-pressed={activeTab === key} onClick={() => { setActiveTab(key); setTerm(''); }}>{label}</button>
          ))}
        </nav>
        <button className="logout" type="button" onClick={onSignOut}>↪ Sign out</button>
      </aside>
      <div className="content">
        <header>
          <div><p>REGISTRATIONS</p><h1>{tab.title}</h1></div>
          <div className="admin-user"><span>{initials(user.email)}</span><div><b>Administrator</b><small>{user.email}</small></div></div>
        </header>
        <div className="stats">
          <article className="purple"><span>♿</span><div><small>Total students</small><strong>{data.students.length}</strong></div></article>
          <article className="orange"><span>✎</span><div><small>Total scribes</small><strong>{data.scribes.length}</strong></div></article>
          <article className="green"><span>✦</span><div><small>Open / accepted requests</small><strong>{data.requests.filter(r => r.status === 'open').length} / {data.requests.filter(r => r.status === 'accepted').length}</strong></div></article>
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <section className="table-card">
          <div className="table-tools">
            <label><span aria-hidden="true">⌕</span><input type="search" aria-label={tab.search} placeholder={tab.search} value={term} onChange={event => setTerm(event.target.value)} /></label>
            <button type="button" onClick={load}>↻ Refresh</button>
          </div>
          {rows.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr>{tab.head.map(heading => <th key={heading}>{heading}</th>)}</tr></thead>
                <tbody>{rows.map(item => <tr key={item.id}>{tab.row(item).map((cell, index) => <td key={index}>{cell}</td>)}</tr>)}</tbody>
              </table>
            </div>
          ) : (
            <div className="empty"><span aria-hidden="true">☷</span><h2>Nothing to show</h2><p>New entries will appear here.</p></div>
          )}
        </section>
      </div>
    </section>
  );
}

export default function AdminApp() {
  const { loading, user, isAdmin, error, signOut } = useAuth();
  if (loading) return <p className="admin-loading">Loading…</p>;
  if (!user) return <LoginView message={isConfigured ? '' : 'Supabase is not configured for this build.'} />;
  if (error) return <LoginView message={friendlyError(error)} />;
  if (!isAdmin) return <NotAdmin email={user.email} onSignOut={signOut} />;
  return <Dashboard user={user} onSignOut={signOut} />;
}
