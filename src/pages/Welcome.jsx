import { useNavigate } from 'react-router-dom';
import { dashboardPath, useAuth } from '../lib/auth.jsx';

// A sample confirmed booking, drawn the same way as the real ones on the dashboard.
function SampleTicket() {
  return (
    <figure className="sample-ticket" aria-hidden="true">
      <div className="request-card ticket status-accepted">
        <div className="request-card-head">
          <span className="request-status">Scribe confirmed</span>
          <h2>Financial Accounting</h2>
          <p>Mount Carmel College, Block B</p>
        </div>
        <div className="date-badge">
          <span className="date-weekday">Thu</span>
          <strong className="date-day">22</strong>
          <span className="date-month">Oct 2026</span>
          <span className="date-time">10:00 am – 1:00 pm</span>
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
            <div className="role-choices">
              <button className="role-card" type="button" onClick={() => navigate(dashboardPath(profile))}>
                <strong>Open my dashboard</strong>
                <small>{profile.role === 'student' ? 'Book and track your scribes' : 'Find exams you can help with'}</small>
              </button>
            </div>
          ) : (
            <>
              <div className="role-choices" role="group" aria-label="Choose how you will use SahayaScribe">
                <button className="role-card student-card" type="button" onClick={() => choose('student')}>
                  <strong>I need a scribe</strong>
                  <small>Book a volunteer for an upcoming exam</small>
                </button>
                <button className="role-card scribe-card" type="button" onClick={() => choose('scribe')}>
                  <strong>I want to volunteer</strong>
                  <small>Write exams for students who need help</small>
                </button>
              </div>
              {!user && <p className="signin">Already registered? <button type="button" onClick={() => navigate('/login')}>Sign in</button></p>}
            </>
          )}
        </div>
        <SampleTicket />
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
