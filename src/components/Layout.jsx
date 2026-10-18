import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { isConfigured } from '../lib/supabase.js';
import { useToast } from './Toast.jsx';

function readPreference(key) {
  try { return localStorage.getItem(key) === 'on'; } catch { return false; }
}

function usePreference(key, className, notify, labels) {
  const [on, setOn] = useState(() => readPreference(key));
  useEffect(() => {
    document.body.classList.toggle(className, on);
    try { localStorage.setItem(key, on ? 'on' : 'off'); } catch { /* storage unavailable */ }
  }, [key, className, on]);
  const toggle = () => {
    setOn(value => !value);
    notify(on ? labels[1] : labels[0]);
  };
  return [on, toggle];
}

export default function Layout() {
  const { user, signOut } = useAuth();
  const notify = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [contrast, toggleContrast] = usePreference('sahaya-contrast', 'high-contrast', notify, ['High contrast on', 'High contrast off']);
  const [largeText, toggleLargeText] = usePreference('sahaya-large-text', 'large-text', notify, ['Larger text on', 'Larger text off']);

  // Move focus to the new page's heading so screen readers announce it.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    const timer = setTimeout(() => document.querySelector('main h1')?.focus({ preventScroll: true }), 50);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    notify('You have signed out.');
    navigate('/');
  };

  return (
    <>
      <a className="skip-link" href="#main">Skip to main content</a>
      <header className="topbar">
        <Link className="brand" to="/" aria-label="SahayaScribe home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>Sahaya<span>Scribe</span></span>
        </Link>
        <div className="header-actions">
          <button className="icon-btn" type="button" onClick={toggleContrast} aria-pressed={contrast} aria-label="High contrast">
            <span aria-hidden="true">◐</span>
          </button>
          <button className="text-btn" type="button" onClick={toggleLargeText} aria-pressed={largeText} aria-label="Larger text">
            A<span aria-hidden="true">+</span>
          </button>
          {user && <button className="lang-btn" type="button" onClick={handleSignOut}>Sign out</button>}
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        {!isConfigured && (
          <div className="notice config-notice" role="alert">
            <b aria-hidden="true">!</b>
            <p><strong>Supabase is not configured.</strong> Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild.</p>
          </div>
        )}
        <Outlet />
      </main>
      <footer>
        <span>© {new Date().getFullYear()} SahayaScribe</span>
        <span>Accessible support for every student.</span>
      </footer>
    </>
  );
}
