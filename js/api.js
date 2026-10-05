/**
 * Data access layer — every database and storage call lives here.
 *
 * Public functions only read visible/published content (RLS enforces this on
 * the server as well; the explicit filters also keep hidden content out of the
 * public site when the admin happens to be logged in).
 */
import { supabase } from './supabase-client.js';
import { STORAGE_BUCKET } from './constants.js';

/** Tables that have display_order and can be listed/reordered. */
export const ORDERED_TABLES = [
  'sections', 'about_stats', 'skill_categories', 'skills', 'timeline_items',
  'projects', 'services', 'testimonials', 'social_links',
];

/* -------------------------------------------------------------------------- */
/* Error handling                                                              */
/* -------------------------------------------------------------------------- */

/** Convert a Supabase/PostgREST error into a readable Error. */
function toError(error) {
  const messages = {
    '23505': 'That value is already in use. Please choose another (for example a different slug).',
    '23514': 'Some values do not meet the database rules. Please review the form.',
    '23502': 'A required field is missing.',
    '42501': 'You are not authorized to do that. Please sign in again.',
    'PGRST301': 'Your session has expired. Please sign in again.',
  };
  const friendly = messages[error?.code] || error?.message || 'Something went wrong. Please try again.';
  const err = new Error(friendly);
  err.code = error?.code;
  err.cause = error;
  return err;
}

/** Throw on error, otherwise return data. */
function unwrap({ data, error }) {
  if (error) throw toError(error);
  return data;
}

/* -------------------------------------------------------------------------- */
/* Public site                                                                 */
/* -------------------------------------------------------------------------- */

const byOrder = (query) => query.order('display_order', { ascending: true }).order('created_at', { ascending: true });

export async function getSiteSettings() {
  return unwrap(await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle());
}

/** Load everything the home page needs, in parallel. */
export async function getPublicContent() {
  const visible = (table) => byOrder(supabase.from(table).select('*').eq('is_visible', true));

  const [
    settings, sections, hero, about, stats, categories, skills, timeline,
    projects, services, testimonials, contact, socials,
  ] = await Promise.all([
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('sections').select('*').order('display_order'),
    supabase.from('hero').select('*').eq('id', 1).maybeSingle(),
    supabase.from('about').select('*').eq('id', 1).maybeSingle(),
    visible('about_stats'),
    visible('skill_categories'),
    visible('skills'),
    supabase.from('timeline_items').select('*').eq('is_visible', true)
      .order('display_order').order('start_date', { ascending: false }),
    byOrder(supabase.from('projects')
      .select('id,title,slug,category,summary,cover_image_url,tech_stack,live_url,github_url,is_featured')
      .eq('status', 'published')),
    visible('services'),
    visible('testimonials'),
    supabase.from('contact_info').select('*').eq('id', 1).maybeSingle(),
    visible('social_links'),
  ]).then((results) => results.map(unwrap));

  // Nest skills under their categories.
  const skillCategories = categories.map((cat) => ({
    ...cat,
    skills: skills.filter((s) => s.category_id === cat.id),
  }));

  return {
    settings, sections, hero, about, stats, skillCategories, timeline,
    projects, services, testimonials, contact, socials,
  };
}

/** A single published project by slug (null if missing or draft). */
export async function getPublishedProject(slug) {
  return unwrap(await supabase.from('projects').select('*')
    .eq('slug', slug).eq('status', 'published').maybeSingle());
}

/** Minimal data for the project page's header/footer. */
export async function getProjectPageChrome() {
  const [settings, sections, contact, socials] = await Promise.all([
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
    supabase.from('sections').select('*').order('display_order'),
    supabase.from('contact_info').select('*').eq('id', 1).maybeSingle(),
    byOrder(supabase.from('social_links').select('*').eq('is_visible', true)),
  ]).then((results) => results.map(unwrap));
  return { settings, sections, contact, socials };
}

/** Save a contact form message. Anonymous users can insert but never read. */
export async function sendContactMessage({ name, email, subject, body }) {
  const { error } = await supabase.from('messages').insert({
    name: name.trim(),
    email: email.trim(),
    subject: subject.trim(),
    body: body.trim(),
  });
  if (error) throw toError(error);
}

/* -------------------------------------------------------------------------- */
/* Admin: generic CRUD                                                         */
/* -------------------------------------------------------------------------- */

export async function listRows(table, { filter } = {}) {
  let query = supabase.from(table).select('*');
  if (filter) for (const [col, val] of Object.entries(filter)) query = query.eq(col, val);
  if (ORDERED_TABLES.includes(table)) query = byOrder(query);
  return unwrap(await query);
}

export async function getSingleton(table) {
  return unwrap(await supabase.from(table).select('*').eq('id', 1).maybeSingle());
}

export async function saveSingleton(table, values) {
  return unwrap(await supabase.from(table).upsert({ ...values, id: 1 }).select().single());
}

export async function createRow(table, values) {
  const payload = { ...values };
  // New list items go to the end.
  if (ORDERED_TABLES.includes(table) && payload.display_order === undefined) {
    const { data } = await supabase.from(table).select('display_order')
      .order('display_order', { ascending: false }).limit(1);
    payload.display_order = data?.length ? data[0].display_order + 1 : 0;
  }
  return unwrap(await supabase.from(table).insert(payload).select().single());
}

export async function updateRow(table, id, values) {
  return unwrap(await supabase.from(table).update(values).eq('id', id).select().single());
}

export async function deleteRow(table, id) {
  unwrap(await supabase.from(table).delete().eq('id', id));
}

/** Persist a new order: ids[0] gets display_order 0, and so on. */
export async function reorder(table, ids) {
  unwrap(await supabase.rpc('reorder_items', { p_table: table, p_ids: ids }));
}

/* -------------------------------------------------------------------------- */
/* Admin: overview + messages                                                  */
/* -------------------------------------------------------------------------- */

export async function getCounts() {
  const count = (table, apply = (q) => q) =>
    apply(supabase.from(table).select('id', { count: 'exact', head: true }));
  const results = await Promise.all([
    count('projects'),
    count('projects', (q) => q.eq('status', 'published')),
    count('messages'),
    count('messages', (q) => q.eq('is_read', false)),
    count('skills'),
    count('testimonials'),
  ]);
  for (const r of results) if (r.error) throw toError(r.error);
  const [projects, published, messages, unread, skills, testimonials] = results.map((r) => r.count ?? 0);
  return { projects, published, drafts: projects - published, messages, unread, skills, testimonials };
}

export async function countUnreadMessages() {
  const { count, error } = await supabase.from('messages')
    .select('id', { count: 'exact', head: true }).eq('is_read', false);
  if (error) throw toError(error);
  return count ?? 0;
}

export async function listMessages({ unreadOnly = false, limit } = {}) {
  let query = supabase.from('messages').select('*').order('created_at', { ascending: false });
  if (unreadOnly) query = query.eq('is_read', false);
  if (limit) query = query.limit(limit);
  return unwrap(await query);
}

export async function setMessageRead(id, isRead) {
  unwrap(await supabase.from('messages').update({ is_read: isRead }).eq('id', id));
}

export async function deleteMessage(id) {
  unwrap(await supabase.from('messages').delete().eq('id', id));
}

/* -------------------------------------------------------------------------- */
/* Storage                                                                     */
/* -------------------------------------------------------------------------- */

const PUBLIC_PREFIX = `/storage/v1/object/public/${STORAGE_BUCKET}/`;

/** Upload a file into the bucket and return its public URL. */
export async function uploadFile(file, folder = 'uploads') {
  const ext = (file.name.split('.').pop() || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '');
  const base = file.name
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'file';
  const unique = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const path = `${folder}/${base}-${unique}.${ext}`;

  unwrap(await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: '31536000',
    contentType: file.type,
    upsert: false,
  }));
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Storage path for a public URL of our bucket, or null for external URLs. */
export function storagePathFromUrl(url) {
  if (typeof url !== 'string') return null;
  const index = url.indexOf(PUBLIC_PREFIX);
  return index === -1 ? null : decodeURIComponent(url.slice(index + PUBLIC_PREFIX.length).split('?')[0]);
}

/** Delete files by their public URLs (external URLs are ignored). */
export async function deleteFilesByUrl(urls) {
  const paths = [...new Set(urls.map(storagePathFromUrl).filter(Boolean))];
  if (!paths.length) return;
  unwrap(await supabase.storage.from(STORAGE_BUCKET).remove(paths));
}
