/**
 * Authentication helpers for the admin area.
 *
 * Supabase Auth is email-based, so the admin's email address is the username.
 * Client-side checks here only improve the UX (redirects, messages); the real
 * protection is Row Level Security in the database.
 */
import { supabase, isConfigured } from './supabase-client.js';

const LOGIN_PAGE = 'login.html';
const DASHBOARD_PAGE = 'index.html';

let redirecting = false;

/** Send the browser to the login page (once, even if called repeatedly). */
function goToLogin() {
  if (redirecting) return;
  redirecting = true;
  window.location.replace(LOGIN_PAGE);
}

/** Current session or null. */
export async function getSession() {
  if (!isConfigured) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

/** Is the signed-in user registered in public.admins? */
async function isAdminUser(userId) {
  const { data, error } = await supabase.from('admins').select('user_id').eq('user_id', userId).maybeSingle();
  return !error && Boolean(data);
}

/**
 * Sign in with email + password. Rejects accounts that are not admins.
 * Error messages are intentionally generic to avoid leaking which part failed.
 */
export async function signIn(email, password) {
  if (!isConfigured) throw new Error('Supabase is not configured yet. Add your URL and anon key to js/config.js.');
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    if (error.status === 429) throw new Error('Too many attempts. Please wait a moment and try again.');
    throw new Error('Invalid username or password.');
  }
  if (!(await isAdminUser(data.user.id))) {
    await supabase.auth.signOut();
    throw new Error('This account does not have admin access.');
  }
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
  goToLogin();
}

/**
 * Guard for admin pages: resolves with the session if the user is a signed-in
 * admin, otherwise redirects to the login page (and never resolves).
 * Also redirects if the session ends later (sign-out in another tab, expiry).
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session || !(await isAdminUser(session.user.id))) {
    if (session) await supabase.auth.signOut();
    goToLogin();
    return new Promise(() => {});
  }
  supabase.auth.onAuthStateChange((event, newSession) => {
    if (event === 'SIGNED_OUT' || !newSession) goToLogin();
  });
  return session;
}

/** On the login page: skip the form if an admin session already exists. */
export async function redirectIfSignedIn() {
  const session = await getSession();
  if (session && (await isAdminUser(session.user.id))) {
    window.location.replace(DASHBOARD_PAGE);
    return true;
  }
  return false;
}

/**
 * Change the password after re-verifying the current one, so an unattended
 * session can't be used to take over the account.
 */
export async function changePassword(currentPassword, newPassword) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Your session has expired. Please sign in again.');

  const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
  if (verifyError) throw new Error('Your current password is incorrect.');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(error.message || 'Could not update the password.');
}
