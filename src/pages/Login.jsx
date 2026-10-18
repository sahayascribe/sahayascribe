import { useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { dashboardPath, useAuth, useEmailCode } from '../lib/auth.jsx';
import { friendlyError } from '../lib/format.js';

export default function Login() {
  const [params] = useSearchParams();
  const as = ['student', 'scribe'].includes(params.get('as')) ? params.get('as') : null;
  const { loading, user, profile } = useAuth();
  const navigate = useNavigate();
  const { step, email, busy, error, sendCode, verifyCode, restart } = useEmailCode();
  const codeInput = useRef(null);

  useEffect(() => {
    if (loading || !user) return;
    if (profile) navigate(dashboardPath(profile), { replace: true });
    else navigate(as ? `/register/${as}` : '/', { replace: true });
  }, [loading, user, profile, as, navigate]);

  useEffect(() => {
    if (step === 'code') codeInput.current?.focus();
  }, [step]);

  const coral = as === 'scribe';

  return (
    <section className="screen active form-screen" aria-labelledby="login-title">
      <div className="form-heading">
        <Link className="back-btn" to="/">← Back</Link>
        <span className={`kicker${coral ? ' coral' : ''}`}>{as ? `${as.toUpperCase()} SIGN IN` : 'SIGN IN'}</span>
        <h1 id="login-title" tabIndex={-1}>{step === 'email' ? 'Sign in with your email' : 'Enter your code'}</h1>
        <p>
          {step === 'email'
            ? 'We will email you a one-time code. No password needed. New here? The same code creates your account.'
            : `We sent a code to ${email}. It expires in a few minutes.`}
        </p>
      </div>

      {step === 'email' ? (
        <form className="form-card" onSubmit={event => { event.preventDefault(); sendCode(event.currentTarget.email.value); }}>
          <div className="form-grid">
            <label className="full">Email address *
              <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" />
            </label>
          </div>
          {error && <p className="form-error" role="alert">{friendlyError(error)}</p>}
          <button className={`primary-btn${coral ? ' coral-btn' : ''}`} type="submit" disabled={busy}>
            {busy ? 'Sending code…' : <>Send code <span aria-hidden="true">→</span></>}
          </button>
        </form>
      ) : (
        <form className="form-card" onSubmit={event => { event.preventDefault(); verifyCode(event.currentTarget.code.value); }}>
          <div className="form-grid">
            <label className="full">One-time code *
              <input ref={codeInput} name="code" required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} placeholder="Code from your email" />
            </label>
          </div>
          {error && <p className="form-error" role="alert">{friendlyError(error)}</p>}
          <button className={`primary-btn${coral ? ' coral-btn' : ''}`} type="submit" disabled={busy}>
            {busy ? 'Checking…' : <>Verify and continue <span aria-hidden="true">→</span></>}
          </button>
          <p className="signin">Wrong email or no code? <button type="button" onClick={restart}>Start again</button></p>
        </form>
      )}
    </section>
  );
}
