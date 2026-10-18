import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase.js';

const AuthContext = createContext(null);

async function fetchProfile(userId) {
  const [student, scribe, admin] = await Promise.all([
    supabase.from('students').select('*').eq('id', userId).maybeSingle(),
    supabase.from('scribes').select('*').eq('id', userId).maybeSingle(),
    supabase.rpc('is_admin')
  ]);
  const error = student.error || scribe.error || admin.error;
  if (error) throw error;
  const profile = student.data ? { role: 'student', ...student.data } : scribe.data ? { role: 'scribe', ...scribe.data } : null;
  return { profile, isAdmin: Boolean(admin.data) };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined);
  const [state, setState] = useState({ loading: true, profile: null, isAdmin: false, error: null });
  const userId = session?.user?.id;

  useEffect(() => {
    if (!supabase) {
      setSession(null);
      return undefined;
    }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    // Only store the session here: calling Supabase inside this callback can deadlock.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setState({ loading: false, profile: null, isAdmin: false, error: null });
      return null;
    }
    setState(current => ({ ...current, loading: true }));
    try {
      const result = await fetchProfile(userId);
      setState({ loading: false, error: null, ...result });
      return result.profile;
    } catch (error) {
      setState({ loading: false, profile: null, isAdmin: false, error });
      return null;
    }
  }, [userId]);

  // Reload only when the signed-in user changes, not on every token refresh.
  const sessionReady = session !== undefined;
  useEffect(() => {
    if (sessionReady) refreshProfile();
  }, [sessionReady, refreshProfile]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
  }, []);

  const value = {
    loading: session === undefined || state.loading,
    session,
    user: session?.user ?? null,
    profile: state.profile,
    isAdmin: state.isAdmin,
    error: state.error,
    refreshProfile,
    signOut
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const dashboardPath = profile => (profile?.role === 'scribe' ? '/scribe' : profile?.role === 'student' ? '/student' : '/');

// Email one-time code sign-in shared by the public site and the admin page.
export function useEmailCode() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const run = async action => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const sendCode = address =>
    run(async () => {
      const normalised = address.trim().toLowerCase();
      const { error: sendError } = await supabase.auth.signInWithOtp({ email: normalised, options: { shouldCreateUser: true } });
      if (sendError) throw sendError;
      setEmail(normalised);
      setStep('code');
    });

  const verifyCode = token =>
    run(async () => {
      const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: token.trim(), type: 'email' });
      if (verifyError) throw verifyError;
    });

  const restart = () => {
    setStep('email');
    setError('');
  };

  return { step, email, busy, error, sendCode, verifyCode, restart };
}
