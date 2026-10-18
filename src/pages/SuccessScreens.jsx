import { Link } from 'react-router-dom';

export function StudentRegistered() {
  return (
    <section className="screen active success-screen" aria-labelledby="student-success-title">
      <div className="success-icon" aria-hidden="true">✓</div>
      <span className="kicker">REGISTRATION COMPLETE</span>
      <h1 id="student-success-title" tabIndex={-1}>You’re all set!</h1>
      <p>Thank you for registering. You can now book a scribe for your exam.</p>
      <Link className="primary-btn button-link" to="/student/book">Book a Scribe <span aria-hidden="true">→</span></Link>
    </section>
  );
}

export function ScribeRegistered() {
  return (
    <section className="screen active success-screen" aria-labelledby="scribe-success-title">
      <div className="success-icon coral-bg" aria-hidden="true">✓</div>
      <span className="kicker coral">WELCOME ABOARD</span>
      <h1 id="scribe-success-title" tabIndex={-1}>Thank you for volunteering!</h1>
      <p>Your profile is ready. You can now view student exam requests that match your eligibility.</p>
      <Link className="primary-btn coral-btn button-link" to="/scribe">Browse eligible exams <span aria-hidden="true">→</span></Link>
    </section>
  );
}

export function RequestSent() {
  return (
    <section className="screen active success-screen" aria-labelledby="request-success-title">
      <div className="success-icon" aria-hidden="true">✓</div>
      <span className="kicker">REQUEST SENT</span>
      <h1 id="request-success-title" tabIndex={-1}>Your request is live.</h1>
      <p>Eligible scribes can now view it and choose to accept. You will see their details on your dashboard.</p>
      <div className="matching-card">
        <span className="pulse" aria-hidden="true"></span>
        <div><strong>Waiting for a volunteer</strong><small>Scribes who match your medium, qualification and background rules can see this exam.</small></div>
      </div>
      <Link className="primary-btn button-link" to="/student">Go to dashboard <span aria-hidden="true">→</span></Link>
    </section>
  );
}

export function NotFound() {
  return (
    <section className="screen active success-screen" aria-labelledby="not-found-title">
      <span className="kicker">PAGE NOT FOUND</span>
      <h1 id="not-found-title" tabIndex={-1}>We couldn’t find that page</h1>
      <p>The link may be old or mistyped.</p>
      <Link className="primary-btn button-link" to="/">Go to home <span aria-hidden="true">→</span></Link>
    </section>
  );
}
