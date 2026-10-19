import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { dashboardPath, useAuth, useEmailCode } from '../lib/auth.jsx';
import { friendlyError } from '../lib/format.js';

const CODE_LENGTH = 6;
const RESEND_AFTER = 30;

// One real input (so autofill, paste and screen readers work normally), drawn as six boxes.
function CodeInput({ value, onChange, inputRef, disabled }) {
  return (
    <div className="code-input">
      <input
        ref={inputRef}
        id="code"
        name="code"
        value={value}
        onChange={event => onChange(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))}
        required
        disabled={disabled}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern={`[0-9]{${CODE_LENGTH}}`}
        maxLength={CODE_LENGTH}
        aria-describedby="code-help"
      />
      <div className="code-boxes" aria-hidden="true">
        {Array.from({ length: CODE_LENGTH }, (_, index) => (
          <span key={index} className={index === Math.min(value.length, CODE_LENGTH - 1) ? 'current' : ''}>
            {value[index] ?? ''}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Login() {
  const [params] = useSearchParams();
  const as = ['student', 'scribe'].includes(params.get('as')) ? params.get('as') : null;
  const { loading, user, profile } = useAuth();
  const navigate = useNavigate();
  const { step, email, busy, error, sendCode, verifyCode, restart } = useEmailCode(
    `${window.location.origin}/login${as ? `?as=${as}` : ''}`
  );
  const codeInput = useRef(null);
  const [code, setCode] = useState('');
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (loading || !user) return;
    if (profile) navigate(dashboardPath(profile), { replace: true });
    else navigate(as ? `/register/${as}` : '/', { replace: true });
  }, [loading, user, profile, as, navigate]);

  // Each time a code is sent: clear the boxes and start the resend countdown.
  useEffect(() => {
    if (step !== 'code') return;
    setCode('');
    setWait(RESEND_AFTER);
  }, [step, email]);

  // Focus the boxes once they are enabled (they are disabled while a request is running).
  useEffect(() => {
    if (step === 'code' && !busy) codeInput.current?.focus();
  }, [step, busy]);

  useEffect(() => {
    if (!wait) return undefined;
    const timer = setTimeout(() => setWait(seconds => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const changeCode = next => {
    setCode(next);
    if (next.length === CODE_LENGTH && !busy) verifyCode(next);
  };

  const resend = async () => {
    await sendCode(email);
    setCode('');
    setWait(RESEND_AFTER);
  };

  const who = as === 'scribe' ? 'scribe' : as === 'student' ? 'student' : null;

  return (
    <section className="screen active auth-screen" aria-labelledby="login-title">
      <Link className="back-btn" to="/">Back</Link>
      <div className="auth-card">
        {step === 'email' ? (
          <form key="email" onSubmit={event => { event.preventDefault(); sendCode(event.currentTarget.email.value); }}>
            <h1 id="login-title" tabIndex={-1}>{who ? `Sign in as a ${who}` : 'Sign in'}</h1>
            <p className="auth-lead">We will email you a 6-digit code. No password needed, and new emails get an account automatically.</p>
            <label className="field" htmlFor="email">Email address</label>
            <input className="text-input" id="email" name="email" type="email" required autoComplete="email" placeholder="you@example.com" defaultValue={email} />
            {error && <p className="form-error" role="alert">{friendlyError(error)}</p>}
            <button className="primary-btn block" type="submit" disabled={busy}>
              {busy ? <><span className="spinner small" aria-hidden="true" /> Sending code</> : 'Send code'}
            </button>
          </form>
        ) : (
          <form key="code" onSubmit={event => { event.preventDefault(); verifyCode(code); }}>
            <h1 id="login-title" tabIndex={-1}>Enter your code</h1>
            <p className="auth-lead">
              We sent a 6-digit code to <strong>{email}</strong>.{' '}
              <button type="button" className="inline-link" onClick={restart}>Change email</button>
            </p>
            <label className="field" htmlFor="code">6-digit code</label>
            <CodeInput value={code} onChange={changeCode} inputRef={codeInput} disabled={busy} />
            <p id="code-help" className="field-help">The code expires in 10 minutes. You can also open the link in the email.</p>
            {error && <p className="form-error" role="alert">{friendlyError(error)}</p>}
            <button className="primary-btn block" type="submit" disabled={busy || code.length < CODE_LENGTH}>
              {busy ? <><span className="spinner small" aria-hidden="true" /> Checking</> : 'Sign in'}
            </button>
            <p className="auth-foot">
              Nothing arrived? Check your spam folder, or{' '}
              {wait > 0
                ? <span>send a new code in {wait}s</span>
                : <button type="button" className="inline-link" onClick={resend} disabled={busy}>send a new code</button>}
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
