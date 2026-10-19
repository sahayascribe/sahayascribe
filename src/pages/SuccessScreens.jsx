import { Link } from 'react-router-dom';

export function StudentRegistered() {
  return (
    <section className="screen active success-screen" aria-labelledby="student-success-title">
      <div className="success-icon" aria-hidden="true">✓</div>
      <h1 id="student-success-title" tabIndex={-1}>Your profile is ready</h1>
      <p>Thank you for registering. You can now book a scribe for your exam.</p>
      <Link className="primary-btn button-link" to="/student/book">Book a scribe</Link>
    </section>
  );
}

export function ScribeRegistered() {
  return (
    <section className="screen active success-screen" aria-labelledby="scribe-success-title">
      <div className="success-icon coral-bg" aria-hidden="true">✓</div>
      <h1 id="scribe-success-title" tabIndex={-1}>Thank you for volunteering</h1>
      <p>Your profile is ready. You can now view student exam requests that match your eligibility.</p>
      <Link className="primary-btn coral-btn button-link" to="/scribe">Browse eligible exams</Link>
    </section>
  );
}

export function RequestSent() {
  return (
    <section className="screen active success-screen" aria-labelledby="request-success-title">
      <div className="success-icon" aria-hidden="true">✓</div>
      <h1 id="request-success-title" tabIndex={-1}>Your request is live</h1>
      <p>Scribes who match your rules can now see it. We will email you as soon as one accepts.</p>
      <div className="matching-card">
        <span className="pulse" aria-hidden="true"></span>
        <div><strong>Waiting for a volunteer</strong><small>Scribes who match your medium, qualification and background rules can see this exam.</small></div>
      </div>
      <Link className="primary-btn button-link" to="/student">Go to dashboard</Link>
    </section>
  );
}

export function NotFound() {
  return (
    <section className="screen active success-screen" aria-labelledby="not-found-title">
      <h1 id="not-found-title" tabIndex={-1}>We couldn’t find that page</h1>
      <p>The link may be old or mistyped.</p>
      <Link className="primary-btn button-link" to="/">Go to home</Link>
    </section>
  );
}
