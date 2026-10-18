// Today's date in India as YYYY-MM-DD, matching public.today_ist() in the database.
export const todayIST = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());

export function formatDate(value) {
  if (!value) return 'Date not set';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTime(value) {
  if (!value) return '';
  const [hours, minutes] = value.split(':').map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
}

export const formatDateTime = value =>
  new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

export const initials = name => String(name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();

export const firstName = name => String(name || '').trim().split(/\s+/)[0];

export const mapsUrl = address => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

export function greeting() {
  const hour = Number(new Intl.DateTimeFormat('en-IN', { hour: 'numeric', hourCycle: 'h23', timeZone: 'Asia/Kolkata' }).format(new Date()));
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Turns Supabase/Postgres errors into messages people can act on.
export function friendlyError(error) {
  const message = error?.message || String(error || '');
  if (/failed to fetch|networkerror|load failed/i.test(message)) return 'Could not reach SahayaScribe. Please check your internet connection.';
  if (/duplicate key.*mobile/i.test(message)) return 'This mobile number is already registered.';
  if (/duplicate key.*_pkey/i.test(message)) return 'You have already registered.';
  if (/check constraint/i.test(message)) return 'Some details are not valid. Please check the form and try again.';
  if (/row-level security|permission denied/i.test(message)) return 'You are not allowed to do that.';
  if (/token has expired|otp.*(expired|invalid)|invalid.*otp/i.test(message)) return 'That code is wrong or has expired. Please request a new one.';
  if (/rate limit|too many/i.test(message)) return 'Too many attempts. Please wait a minute and try again.';
  return message || 'Something went wrong. Please try again.';
}
