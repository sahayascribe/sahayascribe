import { Link, useNavigate } from 'react-router-dom';
import { dashboardPath, useAuth } from '../lib/auth.jsx';

const Chevron = () => (
  <svg className="role-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m8 5 5 5-5 5" /></svg>
);

export default function Welcome() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const choose = role => {
    if (profile) return navigate(dashboardPath(profile));
    navigate(user ? `/register/${role}` : `/login?as=${role}`);
  };

  return (
    <section className="screen active welcome-screen" aria-labelledby="welcome-title">
      <div className="hero">
        <div className="hero-copy">
          <h1 id="welcome-title" tabIndex={-1}>The right support, right when it matters</h1>
          <p>
            SahayaScribe connects visually impaired students with volunteers who write their exam for them,
            simply, safely and on time.
          </p>
          <ul className="trust-row" aria-label="Why it is safe">
            <li>Every volunteer uploads an ID</li>
            <li>You set who is eligible</li>
            <li>Numbers shared only after a match</li>
          </ul>
        </div>

        <div className="role-panel">
          {profile ? (
            <>
              <p className="panel-kicker">Signed in</p>
              <h2>Welcome back, {profile.full_name.split(' ')[0]}</h2>
              <p className="panel-lead">{profile.role === 'student' ? 'Book and track your scribes.' : 'Find exams you can help with.'}</p>
              <Link className="primary-btn button-link block" to={dashboardPath(profile)}>Open my dashboard</Link>
            </>
          ) : (
            <>
              <p className="panel-kicker">Let’s get started</p>
              <h2>Who are you?</h2>
              <p className="panel-lead">Choose the option that best describes you.</p>
              <div className="role-choices" role="group" aria-label="Who are you?">
                <button className="role-card" type="button" onClick={() => choose('student')}>
                  <span className="role-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M4 5h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3Z" /><path d="M8 9h6M8 13h4" /></svg>
                  </span>
                  <strong>I am a student</strong>
                  <small>I need a scribe for my exam</small>
                  <Chevron />
                </button>
                <button className="role-card" type="button" onClick={() => choose('scribe')}>
                  <span className="role-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="m15 4 5 5L9 20H4v-5Z" /><path d="m13 6 5 5" /></svg>
                  </span>
                  <strong>I am a scribe</strong>
                  <small>I want to volunteer and help a student</small>
                  <Chevron />
                </button>
              </div>
              {!user && <p className="signin">Already registered? <button type="button" onClick={() => navigate('/login')}>Sign in</button></p>}
            </>
          )}
        </div>
      </div>

      <section className="how-it-works" aria-labelledby="how-title">
        <h2 id="how-title">How it works</h2>
        <ol>
          <li>
            <h3>Book your exam</h3>
            <p>Add the date, centre and question paper language, and the minimum qualification your scribe needs.</p>
          </li>
          <li>
            <h3>A matching volunteer accepts</h3>
            <p>Only scribes who meet your rules and are free at that time can see the request. Every volunteer uploads an ID.</p>
          </li>
          <li>
            <h3>Talk before the day</h3>
            <p>You both get each other’s phone number by email, and a reminder the day before the exam.</p>
          </li>
        </ol>
      </section>
    </section>
  );
}
