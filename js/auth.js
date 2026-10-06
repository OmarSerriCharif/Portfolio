// Authentication helpers for the admin area (Supabase Auth, email + password).
// The dashboard UI is gated here, but every read/write is ALSO protected by RLS in the database.

import { supabase, isConfigured, ApiError } from './api.js';

const LOGIN_PAGE = 'login.html';
const DASHBOARD_PAGE = 'index.html';

export async function getSession() {
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

export async function isAdmin() {
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('is_admin');
  if (error) return false;
  return data === true;
}

/** Redirect to the login page unless a valid admin session exists. Returns the user. */
export async function requireAdmin() {
  if (!isConfigured) {
    redirectToLogin('config');
    return null;
  }
  const session = await getSession();
  if (!session) {
    redirectToLogin();
    return null;
  }
  // Validate the token with the server (not just local storage).
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData?.user) {
    await supabase.auth.signOut();
    redirectToLogin('expired');
    return null;
  }
  if (!(await isAdmin())) {
    await supabase.auth.signOut();
    redirectToLogin('forbidden');
    return null;
  }
  supabase.auth.onAuthStateChange((event, newSession) => {
    if (event === 'SIGNED_OUT' || !newSession) redirectToLogin();
  });
  return userData.user;
}

let redirecting = false;

export function redirectToLogin(reason = '') {
  if (redirecting) return;
  redirecting = true;
  const url = new URL(LOGIN_PAGE, location.href);
  if (reason) url.searchParams.set('reason', reason);
  location.replace(url.href);
}

export function redirectToDashboard() {
  location.replace(new URL(DASHBOARD_PAGE, location.href).href);
}

export async function signIn(email, password) {
  if (!supabase) throw new ApiError('Supabase is not configured. Edit js/config.js first.');
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    throw new ApiError(/invalid/i.test(error.message) ? 'Incorrect email or password.' : error.message, error);
  }
  if (!(await isAdmin())) {
    await supabase.auth.signOut();
    throw new ApiError('This account does not have admin access.');
  }
}

export async function signOut() {
  if (supabase) await supabase.auth.signOut();
  redirectToLogin();
}

export async function changePassword(currentPassword, newPassword) {
  const session = await getSession();
  if (!session) throw new ApiError('Your session has expired. Please sign in again.');
  // Re-authenticate with the current password before allowing the change.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: session.user.email,
    password: currentPassword,
  });
  if (reauthError) throw new ApiError('Your current password is incorrect.', reauthError);
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new ApiError(error.message, error);
}

export async function sendPasswordReset(email) {
  if (!supabase) throw new ApiError('Supabase is not configured.');
  const redirectTo = new URL(LOGIN_PAGE, location.href).href;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw new ApiError(error.message, error);
}
