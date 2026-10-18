import { useNavigate } from 'react-router-dom';
import { dashboardPath, useAuth } from '../lib/auth.jsx';

export default function Welcome() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const choose = role => {
    if (profile) return navigate(dashboardPath(profile));
    navigate(user ? `/register/${role}` : `/login?as=${role}`);
  };

  return (
    <section className="screen active welcome-screen" aria-labelledby="welcome-title">
      <div className="hero-copy">
        <div className="eyebrow"><span aria-hidden="true">✦</span> Support for every exam</div>
        <h1 id="welcome-title" tabIndex={-1}>The right support,<br /><em>right when it matters.</em></h1>
        <p>SahayaScribe connects visually impaired students with volunteer scribes—simply, safely, and on time.</p>
        <div className="trust-row" aria-label="Service benefits">
          <span><b aria-hidden="true">✓</b> Volunteers share ID</span>
          <span><b aria-hidden="true">✓</b> Eligibility rules you set</span>
          <span><b aria-hidden="true">✓</b> Contacts shared only after a match</span>
        </div>
      </div>
      <div className="role-panel">
        <p className="step-label">LET'S GET STARTED</p>
        <h2>{profile ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'Who are you?'}</h2>
        <p>{profile ? 'Continue to your dashboard.' : 'Choose the option that best describes you.'}</p>
        {profile ? (
          <button className={`role-card ${profile.role}-card`} type="button" onClick={() => navigate(dashboardPath(profile))}>
            <span className="role-icon" aria-hidden="true">{profile.role === 'student' ? '♿' : '✎'}</span>
            <span><strong>Open my dashboard</strong><small>{profile.role === 'student' ? 'Book and track your scribes' : 'Find exams you can help with'}</small></span>
            <span className="arrow" aria-hidden="true">→</span>
          </button>
        ) : (
          <>
            <button className="role-card student-card" type="button" onClick={() => choose('student')}>
              <span className="role-icon" aria-hidden="true">♿</span>
              <span><strong>I am a Student</strong><small>I need a scribe for my examination</small></span>
              <span className="arrow" aria-hidden="true">→</span>
            </button>
            <button className="role-card scribe-card" type="button" onClick={() => choose('scribe')}>
              <span className="role-icon" aria-hidden="true">✎</span>
              <span><strong>I am a Scribe</strong><small>I want to volunteer and help a student</small></span>
              <span className="arrow" aria-hidden="true">→</span>
            </button>
            {!user && <p className="signin">Already registered? <button type="button" onClick={() => navigate('/login')}>Sign in</button></p>}
          </>
        )}
      </div>
    </section>
  );
}
