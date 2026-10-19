import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import FileField from '../components/FileField.jsx';
import { readScribeForm, readStudentForm, ScribeFields, StudentFields } from '../components/ProfileFields.jsx';
import { useToast } from '../components/Toast.jsx';
import { useAuth } from '../lib/auth.jsx';
import { documentUrl, removeDocument, uploadDocument } from '../lib/documents.js';
import { friendlyError } from '../lib/format.js';
import { supabase } from '../lib/supabase.js';

const ROLE = {
  student: {
    table: 'students',
    documentColumn: 'certificate_path',
    documentKind: 'disability-certificate',
    documentLabel: 'disability certificate',
    Fields: StudentFields,
    read: readStudentForm,
    coral: false
  },
  scribe: {
    table: 'scribes',
    documentColumn: 'id_document_path',
    documentKind: 'id',
    documentLabel: 'ID document',
    Fields: ScribeFields,
    read: readScribeForm,
    coral: true
  }
};

function CurrentDocument({ path, label }) {
  const notify = useToast();
  if (!path) return <p className="hint">No {label} uploaded yet.</p>;
  const open = async () => {
    // Open the tab synchronously so pop-up blockers allow it, then point it at the signed URL.
    const tab = window.open('about:blank', '_blank');
    try {
      const url = await documentUrl(path);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      }
    } catch (error) {
      tab?.close();
      notify(friendlyError(error));
    }
  };
  return (
    <p className="hint">
      Your current {label} is on file. <button type="button" className="inline-link" onClick={open}>View it</button>
    </p>
  );
}

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const notify = useToast();
  const config = ROLE[profile.role];
  const { Fields } = config;
  const [newDocument, setNewDocument] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [acceptedCount, setAcceptedCount] = useState(0);

  useEffect(() => {
    if (profile.role !== 'scribe') return;
    supabase.rpc('scribe_assignments').then(({ data }) => setAcceptedCount(data?.length ?? 0));
  }, [profile.role]);

  const handleSubmit = async event => {
    event.preventDefault();
    const { values, error: formError } = config.read(event.currentTarget);
    if (formError) return setError(formError);
    setBusy(true);
    setError('');
    let uploadedPath = null;
    try {
      if (newDocument) {
        uploadedPath = await uploadDocument(user.id, newDocument, config.documentKind);
        values[config.documentColumn] = uploadedPath;
      }
      const { error: updateError } = await supabase.from(config.table).update(values).eq('id', user.id);
      if (updateError) throw updateError;
      // The old file is no longer referenced; remove it so only the latest copy is kept.
      const oldPath = profile[config.documentColumn];
      if (uploadedPath && oldPath && oldPath !== uploadedPath) removeDocument(oldPath);
      await refreshProfile();
      setNewDocument(null);
      setFormKey(key => key + 1);
      notify('Your profile has been updated.');
    } catch (err) {
      if (uploadedPath) removeDocument(uploadedPath);
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const dashboard = `/${profile.role}`;

  return (
    <section className="screen active form-screen" aria-labelledby="profile-title">
      <div className="form-heading">
        <Link className="back-btn" to={dashboard}>Back to dashboard</Link>
        <h1 id="profile-title" tabIndex={-1}>My profile</h1>
        <p>Keep your details up to date. Signed in as {user.email}.</p>
      </div>

      {acceptedCount > 0 && (
        <div className="notice blue profile-notice">
          <b aria-hidden="true">i</b>
          <p>
            <strong>You have {acceptedCount} accepted exam{acceptedCount > 1 ? 's' : ''}.</strong> Changes to your languages,
            qualification or background apply to future requests only. Your accepted exams stay as they are. If you can no
            longer write one of them, withdraw from it on your dashboard so the student can find another scribe.
          </p>
        </div>
      )}

      <form key={formKey} className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <Fields profile={profile} />
          <FileField
            label={`Replace ${config.documentLabel}`}
            hint="Optional. PDF, JPG or PNG up to 5 MB. Only admins can see it."
            onChange={setNewDocument}
          />
        </div>
        <CurrentDocument path={profile[config.documentColumn]} label={config.documentLabel} />
        <p className="hint">
          {profile.role === 'student'
            ? 'Your mobile number is shared only with the scribe who accepts your exam. If you change it, your scribe sees the new number.'
            : 'Your mobile number is shared only with students whose exams you accept. If you change it, they see the new number.'}
        </p>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className={`primary-btn${config.coral ? ' coral-btn' : ''}`} type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}
