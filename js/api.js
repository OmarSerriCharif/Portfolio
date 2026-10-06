// Supabase data layer. The only external dependency of the project is supabase-js (ES module via CDN).
// Security is enforced by Row Level Security in the database (see setup.sql), not by this file.

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const isConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY &&
  /^https:\/\/.+/.test(SUPABASE_URL) &&
  !SUPABASE_URL.includes('YOUR-PROJECT') &&
  !SUPABASE_ANON_KEY.includes('YOUR-SUPABASE')
);

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export class ApiError extends Error {
  constructor(message, cause = null) {
    super(message);
    this.name = 'ApiError';
    this.cause = cause;
  }
}

function friendlyMessage(error) {
  if (!error) return 'Something went wrong.';
  const code = error.code || '';
  const msg = error.message || String(error);
  if (code === '23505') return 'That value is already in use. Slugs and other unique fields must be different from existing records.';
  if (code === '23514') return 'One of the values is not allowed (check lengths, formats and URLs).';
  if (code === '23503') return 'This record is linked to another record that does not exist or is still in use.';
  if (code === '23502') return 'A required field is missing.';
  if (code === '42501' || code === 'PGRST301' || /row-level security/i.test(msg)) return 'You do not have permission to do that.';
  if (code === 'P0001') return msg;
  if (/Failed to fetch|NetworkError|network/i.test(msg)) return 'Network error. Check your connection and try again.';
  if (/JWT|token/i.test(msg)) return 'Your session has expired. Please sign in again.';
  return msg;
}

function ensureClient() {
  if (!supabase) {
    throw new ApiError('The website is not connected to Supabase yet. Add your project URL and anon key to js/config.js.');
  }
}

async function run(builder) {
  ensureClient();
  const { data, error, count } = await builder;
  if (error) throw new ApiError(friendlyMessage(error), error);
  return { data, count };
}

const PUBLISHED_TABLES = new Set(['services', 'pricing_packages', 'addons', 'case_studies', 'testimonials', 'faqs']);
const VISIBLE_TABLES = new Set([
  ...PUBLISHED_TABLES, 'sections', 'navigation_items', 'social_links', 'company_values', 'statistics',
  'industries', 'why_choose_us', 'process_steps', 'clients', 'team_members',
]);

/* ------------------------------------------------------------------ */
/*  Public reads                                                       */
/* ------------------------------------------------------------------ */

export async function getSingleton(table) {
  ensureClient();
  const { data } = await run(supabase.from(table).select('*').eq('id', 1).maybeSingle());
  return data;
}

/**
 * Read public rows. Filters to published + visible rows explicitly, so a signed-in admin
 * browsing the public site sees exactly what visitors see.
 */
export async function listPublic(table, { select = '*', eq = {}, order = 'display_order', ascending = true, limit = null } = {}) {
  ensureClient();
  let query = supabase.from(table).select(select);
  if (PUBLISHED_TABLES.has(table)) query = query.eq('status', 'published');
  if (VISIBLE_TABLES.has(table)) query = query.eq('is_visible', true);
  if (table === 'documents') query = query.eq('is_public', true);
  for (const [col, val] of Object.entries(eq)) query = query.eq(col, val);
  if (order) query = query.order(order, { ascending }).order('created_at', { ascending: true });
  if (limit) query = query.limit(limit);
  const { data } = await run(query);
  return data || [];
}

export async function getPublicBySlug(table, slug, select = '*') {
  ensureClient();
  let query = supabase.from(table).select(select).eq('slug', slug);
  if (PUBLISHED_TABLES.has(table)) query = query.eq('status', 'published').eq('is_visible', true);
  const { data } = await run(query.maybeSingle());
  return data;
}

export async function submitContactMessage(payload) {
  ensureClient();
  // No .select(): visitors are not allowed to read messages back.
  await run(supabase.from('contact_messages').insert(payload));
}

/* ------------------------------------------------------------------ */
/*  Admin CRUD (RLS only allows these for users in admin_users)        */
/* ------------------------------------------------------------------ */

export async function adminList(table, { select = '*', eq = {}, order = 'display_order', ascending = true, range = null, filters = null, count = false } = {}) {
  ensureClient();
  let query = supabase.from(table).select(select, count ? { count: 'exact' } : undefined);
  for (const [col, val] of Object.entries(eq)) {
    if (val === null) query = query.is(col, null);
    else query = query.eq(col, val);
  }
  if (typeof filters === 'function') query = filters(query);
  if (order) query = query.order(order, { ascending });
  if (order && order !== 'created_at') query = query.order('created_at', { ascending: true });
  if (range) query = query.range(range[0], range[1]);
  const result = await run(query);
  return count ? { rows: result.data || [], total: result.count || 0 } : (result.data || []);
}

export async function adminGet(table, id) {
  ensureClient();
  const { data } = await run(supabase.from(table).select('*').eq('id', id).maybeSingle());
  return data;
}

export async function adminInsert(table, values) {
  ensureClient();
  const { data } = await run(supabase.from(table).insert(values).select().single());
  return data;
}

export async function adminUpdate(table, id, values) {
  ensureClient();
  const { data } = await run(supabase.from(table).update(values).eq('id', id).select().single());
  return data;
}

export async function adminUpsertSingleton(table, values) {
  ensureClient();
  const { data } = await run(supabase.from(table).upsert({ ...values, id: 1 }).select().single());
  return data;
}

export async function adminDelete(table, id) {
  ensureClient();
  await run(supabase.from(table).delete().eq('id', id));
}

export async function adminDeleteWhere(table, eq) {
  ensureClient();
  let query = supabase.from(table).delete();
  for (const [col, val] of Object.entries(eq)) query = query.eq(col, val);
  await run(query);
}

export async function adminInsertMany(table, rows) {
  ensureClient();
  if (!rows.length) return;
  await run(supabase.from(table).insert(rows));
}

export async function reorder(table, ids) {
  ensureClient();
  await run(supabase.rpc('reorder_items', { p_table: table, p_ids: ids }));
}

export async function countRows(table, eq = {}) {
  ensureClient();
  let query = supabase.from(table).select('*', { count: 'exact', head: true });
  for (const [col, val] of Object.entries(eq)) query = query.eq(col, val);
  const { count } = await run(query);
  return count || 0;
}

/* ------------------------------------------------------------------ */
/*  Storage                                                            */
/* ------------------------------------------------------------------ */

export const BUCKETS = { media: 'media', documents: 'documents' };

export async function uploadFile(bucket, file, folder = 'uploads') {
  ensureClient();
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const safeFolder = String(folder).replace(/[^a-z0-9/_-]/gi, '').replace(/^\/+|\/+$/g, '') || 'uploads';
  const path = `${safeFolder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new ApiError(friendlyMessage(error), error);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

/** Delete a file if (and only if) the URL points to one of this project's storage buckets. */
export async function deleteFileByUrl(url) {
  if (!supabase || !url) return false;
  const prefix = `${SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/`;
  if (!url.startsWith(prefix)) return false;
  const rest = decodeURIComponent(url.slice(prefix.length));
  const slash = rest.indexOf('/');
  if (slash < 0) return false;
  const bucket = rest.slice(0, slash);
  const path = rest.slice(slash + 1);
  if (!Object.values(BUCKETS).includes(bucket)) return false;
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) throw new ApiError(friendlyMessage(error), error);
  return true;
}
