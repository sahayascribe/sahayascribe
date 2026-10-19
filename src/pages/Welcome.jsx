import { Link, useNavigate } from 'react-router-dom';
import { dashboardPath, useAuth } from '../lib/auth.jsx';

const Chevron = () => (
  <svg className="role-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m8 5 5 5-5 5" /></svg>
);

// A sample confirmed booking, drawn the same way as the real ones on the dashboard.
function SampleBooking() {
  return (
    <figure className="sample-ticket" aria-hidden="true">
      <div className="request-card status-accepted">
        <div className="request-card-head">
          <div className="date-badge">
            <span className="date-month">Oct</span>
            <strong className="date-day">22</strong>
            <span className="date-weekday">Thu</span>
          </div>
          <div>
            <span className="request-status">Scribe confirmed</span>
            <h2>Financial Accounting</h2>
            <p>Mount Carmel College, Block B</p>
            <p className="request-time">
              <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" /><path d="M8 4.5V8l2.5 1.5" /></svg>
              10:00 am – 1:00 pm
            </p>
          </div>
        </div>
        <div className="ticket-body">
          <div className="profile-row match-row">
            <div className="avatar">KS</div>
            <div>
              <h3>Karthik Shetty</h3>
              <p>BCom, Bengaluru</p>
            </div>
          </div>
          <dl className="facts">
            <div><dt>Question paper language</dt><dd>English</dd></div>
            <div><dt>Scribe phone</dt><dd>99001 12233</dd></div>
          </dl>
        </div>
      </div>
      <figcaption>A confirmed booking. Both of you get each other’s number.</figcaption>
    </figure>
  );
}

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
          <h1 id="welcome-title" tabIndex={-1}>
            {profile ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'Find a scribe for your exam'}
          </h1>
          <p>
            SahayaScribe connects visually impaired students with volunteers who write their exam for them.
            You set who is eligible. Phone numbers are shared only once a scribe accepts.
          </p>

          {profile ? (
            <div className="welcome-actions">
              <Link className="primary-btn button-link" to={dashboardPath(profile)}>Open my dashboard</Link>
              <span className="muted">{profile.role === 'student' ? 'Book and track your scribes' : 'Find exams you can help with'}</span>
            </div>
          ) : (
            <>
              <div className="role-choices" role="group" aria-label="Choose how you will use SahayaScribe">
                <button className="role-card" type="button" onClick={() => choose('student')}>
                  <span className="role-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M4 5h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3Z" /><path d="M8 9h6M8 13h4" /></svg>
                  </span>
                  <strong>I need a scribe</strong>
                  <small>Book a volunteer for an upcoming exam</small>
                  <Chevron />
                </button>
                <button className="role-card" type="button" onClick={() => choose('scribe')}>
                  <span className="role-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="m15 4 5 5L9 20H4v-5Z" /><path d="m13 6 5 5" /></svg>
                  </span>
                  <strong>I want to volunteer</strong>
                  <small>Write exams for students who need help</small>
                  <Chevron />
                </button>
              </div>
              {!user && <p className="signin">Already registered? <button type="button" onClick={() => navigate('/login')}>Sign in</button></p>}
            </>
          )}
        </div>
        <SampleBooking />
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
