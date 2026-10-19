import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CodeInput, { CODE_LENGTH } from '../components/CodeInput.jsx';
import { useAuth, useEmailCode } from '../lib/auth.jsx';
import { qualificationLabel } from '../lib/constants.js';
import { documentUrl } from '../lib/documents.js';
import { formatDate, formatDateTime, formatTime, friendlyError, initials } from '../lib/format.js';
import { isConfigured, supabase } from '../lib/supabase.js';

const Brand = () => (
  <span className="brand">
    <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 3 25 14 16 29 7 14Z" />
      <path className="brand-slit" d="M16 14v11" />
      <circle className="brand-hole" cx="16" cy="13" r="2.4" />
    </svg>
    <span>SahayaScribe</span>
    <span className="admin-tag">Admin</span>
  </span>
);

function AuthShell({ children }) {
  return (
    <main className="admin-auth">
      <Brand />
      <div className="auth-card">{children}</div>
      <p className="admin-note">This page is private and not linked from the public site.</p>
    </main>
  );
}

function LoginView({ message }) {
  const { step, email, busy, error, sendCode, verifyCode, restart } = useEmailCode(`${window.location.origin}/admin.html`);
  const [code, setCode] = useState('');
  const codeInput = useRef(null);

  useEffect(() => { if (step === 'code') setCode(''); }, [step, email]);
  useEffect(() => { if (step === 'code' && !busy) codeInput.current?.focus(); }, [step, busy]);

  const changeCode = next => {
    setCode(next);
    if (next.length === CODE_LENGTH && !busy) verifyCode(next);
  };
  const shownError = message || (error ? friendlyError(error) : '');

  return (
    <AuthShell>
      {step === 'email' ? (
        <form key="email" onSubmit={event => { event.preventDefault(); sendCode(event.currentTarget.email.value); }}>
          <h1>Admin sign in</h1>
          <p className="auth-lead">Only confirmed admin emails can open the dashboard.</p>
          <label className="field" htmlFor="email">Admin email</label>
          <input className="text-input" id="email" name="email" type="email" autoComplete="email" required placeholder="you@sahayascribe.com" defaultValue={email} />
          {shownError && <p className="form-error" role="alert">{shownError}</p>}
          <button className="primary-btn block" type="submit" disabled={busy || !isConfigured}>
            {busy ? <><span className="spinner small" aria-hidden="true" /> Sending code</> : 'Send code'}
          </button>
        </form>
      ) : (
        <form key="code" onSubmit={event => { event.preventDefault(); verifyCode(code); }}>
          <h1>Enter your code</h1>
          <p className="auth-lead">
            We sent a 6-digit code to <strong>{email}</strong>.{' '}
            <button type="button" className="inline-link" onClick={restart}>Change email</button>
          </p>
          <label className="field" htmlFor="code">6-digit code</label>
          <CodeInput value={code} onChange={changeCode} inputRef={codeInput} disabled={busy} describedBy="code-help" />
          <p id="code-help" className="field-help">The code expires in 10 minutes. You can also open the link in the email.</p>
          {shownError && <p className="form-error" role="alert">{shownError}</p>}
          <button className="primary-btn block" type="submit" disabled={busy || code.length < CODE_LENGTH}>
            {busy ? <><span className="spinner small" aria-hidden="true" /> Checking</> : 'Open dashboard'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}

function NotAdmin({ email, onSignOut }) {
  return (
    <AuthShell>
      <h1>No admin access</h1>
      <p className="auth-lead"><strong>{email}</strong> is not an admin account. Sign out and use an admin email.</p>
      <button className="primary-btn block" type="button" onClick={onSignOut}>Sign out</button>
    </AuthShell>
  );
}

function DocumentButton({ path, label }) {
  const [busy, setBusy] = useState(false);
  if (!path) return <span className="muted">Not uploaded</span>;
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

const Person = ({ name, sub }) => (
  <div className="person">
    <span aria-hidden="true">{initials(name)}</span>
    <div><b>{name}</b>{sub && <small>{sub}</small>}</div>
  </div>
);

const STATUS = { open: 'Waiting', accepted: 'Confirmed', cancelled: 'Cancelled' };
const Status = ({ value }) => <span className={`request-status status-${value}`}>{STATUS[value] ?? value}</span>;

const TABS = {
  students: {
    label: 'Students',
    search: 'Search by name, mobile or institution',
    head: ['Student', 'Institution', 'Year', 'Medium', 'Certificate', 'Registered'],
    row: item => [
      <Person name={item.full_name} sub={item.mobile} />, item.institution, item.semester_year, item.medium,
      <DocumentButton path={item.certificate_path} label="View" />, formatDateTime(item.created_at)
    ]
  },
  scribes: {
    label: 'Scribes',
    search: 'Search by name, mobile or city',
    head: ['Scribe', 'City', 'Age', 'Qualification', 'Background', 'Writes in', 'ID', 'Registered'],
    row: item => [
      <Person name={item.full_name} sub={item.mobile} />, item.city, item.age,
      `${qualificationLabel(item.qualification_level)}, ${item.qualification}`, item.background,
      item.writing_mediums.join(', '), <DocumentButton path={item.id_document_path} label="View ID" />, formatDateTime(item.created_at)
    ]
  },
  requests: {
    label: 'Requests',
    search: 'Search by subject, centre, student or scribe',
    head: ['Status', 'Subject', 'Exam date', 'Student', 'Scribe', 'Centre', 'Language', 'Created'],
    row: item => [
      <Status value={item.status} />,
      <b>{item.subject}</b>,
      <div className="when"><b>{formatDate(item.exam_date)}</b><small>{formatTime(item.start_time)} – {formatTime(item.end_time)}</small></div>,
      item.student?.full_name ?? '—', item.scribe?.full_name ?? <span className="muted">Not yet</span>,
      item.centre_name, item.question_medium, formatDateTime(item.created_at)
    ]
  }
};

function Dashboard({ user, onSignOut }) {
  const [data, setData] = useState(null);
  const [activeTab, setActiveTab] = useState('students');
  const [term, setTerm] = useState('');
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    const [students, scribes, requests] = await Promise.all([
      supabase.from('students').select('*').order('created_at', { ascending: false }),
      supabase.from('scribes').select('*').order('created_at', { ascending: false }),
      supabase
        .from('exam_requests')
        .select('*, student:students(full_name, mobile), scribe:scribes(full_name, mobile)')
        .order('exam_date', { ascending: false })
    ]);
    setRefreshing(false);
    const loadError = students.error || scribes.error || requests.error;
    if (loadError) return setError(friendlyError(loadError));
    setError('');
    setData({ students: students.data, scribes: scribes.data, requests: requests.data });
  }, []);

  useEffect(() => { load(); }, [load]);

  const tab = TABS[activeTab];
  const rows = useMemo(() => {
    if (!data) return [];
    const needle = term.trim().toLowerCase();
    return data[activeTab].filter(item => JSON.stringify(item).toLowerCase().includes(needle));
  }, [data, activeTab, term]);

  const count = (key, status) => (data ? (status ? data[key].filter(r => r.status === status).length : data[key].length) : '–');
  const stats = [
    ['Students', count('students')],
    ['Scribes', count('scribes')],
    ['Waiting for a scribe', count('requests', 'open')],
    ['Confirmed exams', count('requests', 'accepted')]
  ];

  return (
    <div className="admin-shell">
      <header className="topbar">
        <Brand />
        <div className="header-actions">
          <span className="admin-user" title={user.email}>
            <span aria-hidden="true">{initials(user.email)}</span>
            <span className="admin-email">{user.email}</span>
          </span>
          <button className="tool-btn sign-out" type="button" onClick={onSignOut}>Sign out</button>
        </div>
      </header>

      <main className="admin-main" id="main">
        <div className="admin-head">
          <div>
            <h1>Overview</h1>
            <p>Everyone registered on SahayaScribe and every exam request.</p>
          </div>
          <button className="outline-btn" type="button" onClick={load} disabled={refreshing}>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        <dl className="stats">
          {stats.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>

        {error && <p className="form-error" role="alert">{error}</p>}

        <section className="table-card" aria-label={tab.label}>
          <div className="table-tools">
            <div className="tabs" role="group" aria-label="Choose a list">
              {Object.entries(TABS).map(([key, t]) => (
                <button key={key} type="button" aria-pressed={activeTab === key} onClick={() => { setActiveTab(key); setTerm(''); }}>
                  {t.label} <span className="tab-count">{data ? data[key].length : ''}</span>
                </button>
              ))}
            </div>
            <label className="search">
              <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="9" cy="9" r="6" /><path d="m14 14 4 4" /></svg>
              <input type="search" aria-label={tab.search} placeholder={tab.search} value={term} onChange={event => setTerm(event.target.value)} />
            </label>
          </div>

          {data === null ? (
            <div className="table-empty"><span className="spinner" aria-hidden="true" /><p>Loading…</p></div>
          ) : rows.length ? (
            <div className="table-wrap">
              <table>
                <thead><tr>{tab.head.map(heading => <th key={heading} scope="col">{heading}</th>)}</tr></thead>
                <tbody>
                  {rows.map(item => (
                    <tr key={item.id}>
                      {tab.row(item).map((cell, index) => <td key={index} data-label={tab.head[index]}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="table-empty">
              <h2>{term ? 'No matches' : 'Nothing here yet'}</h2>
              <p>{term ? 'Try a different name, number or place.' : 'New registrations and requests appear here.'}</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function AdminApp() {
  const { loading, user, isAdmin, error, signOut } = useAuth();
  if (loading) return <div className="admin-loading" aria-busy="true"><span className="spinner" aria-hidden="true" /><p>Loading…</p></div>;
  if (!user) return <LoginView message={isConfigured ? '' : 'Supabase is not configured for this build.'} />;
  if (error) return <LoginView message={friendlyError(error)} />;
  if (!isAdmin) return <NotAdmin email={user.email} onSignOut={signOut} />;
  return <Dashboard user={user} onSignOut={signOut} />;
}
