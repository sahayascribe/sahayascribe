import { Navigate, useLocation } from 'react-router-dom';
import { dashboardPath, useAuth } from '../lib/auth.jsx';

export function Loading({ label = 'Loading…' }) {
  return (
    <section className="screen active success-screen" aria-busy="true">
      <h1 tabIndex={-1}>{label}</h1>
    </section>
  );
}

export function LoadError({ error }) {
  return (
    <section className="screen active success-screen">
      <span className="kicker coral">SOMETHING WENT WRONG</span>
      <h1 tabIndex={-1}>We could not load your account</h1>
      <p>{error?.message || 'Please check your connection and refresh the page.'}</p>
    </section>
  );
}

// Signed in, but not yet registered for the given role.
export function RequireNewProfile({ role, children }) {
  const { loading, user, profile, error } = useAuth();
  if (loading) return <Loading />;
  if (error) return <LoadError error={error} />;
  if (!user) return <Navigate to={`/login?as=${role}`} replace />;
  if (profile) return <Navigate to={dashboardPath(profile)} replace />;
  return children;
}

// Signed in and registered with the given role.
export function RequireRole({ role, children }) {
  const { loading, user, profile, error } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (error) return <LoadError error={error} />;
  if (!user) return <Navigate to={`/login?as=${role}`} replace state={{ from: location.pathname }} />;
  if (!profile) return location.state?.registered ? <Loading /> : <Navigate to={`/register/${role}`} replace />;
  if (profile.role !== role) return <Navigate to={dashboardPath(profile)} replace />;
  return children;
}
