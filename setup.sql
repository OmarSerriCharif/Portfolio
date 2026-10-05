-- =============================================================================
--  Portfolio CMS — Supabase setup
--  Run this whole file once in the Supabase SQL editor (Dashboard → SQL Editor).
--  It is idempotent: re-running it recreates policies/functions and only seeds
--  empty tables, so it will not duplicate your content.
--
--  Contents
--    1. Extensions & helpers (updated_at trigger)
--    2. Admin registry + is_admin()
--    3. Content tables (with NOT NULL / CHECK / length constraints)
--    4. Row Level Security policies
--    5. Reorder RPC
--    6. Storage bucket + storage policies
--    7. Sample seed data
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. Helpers
-- -----------------------------------------------------------------------------

-- Keeps updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Admin registry
--    Only users listed here are treated as admins by RLS. Even if someone
--    managed to create an account (sign-ups should be disabled), they would
--    have no write access unless their id is in this table.
-- -----------------------------------------------------------------------------

create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER so it can read public.admins regardless of the caller's RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3. Content tables
-- -----------------------------------------------------------------------------

-- Reusable URL check: absolute http(s) URL.
-- (Inlined in each CHECK because domains + nullable columns keep it simple.)

-- Site-wide settings (single row, id = 1).
create table if not exists public.site_settings (
  id               smallint primary key default 1 check (id = 1),
  site_title       text not null check (char_length(site_title) between 1 and 80),
  logo_text        text not null default '' check (char_length(logo_text) <= 40),
  logo_url         text check (logo_url is null or logo_url ~ '^https?://'),
  favicon_url      text check (favicon_url is null or favicon_url ~ '^https?://'),
  primary_color    text not null default '#D9A441' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  meta_title       text not null check (char_length(meta_title) between 1 and 70),
  meta_description text not null default '' check (char_length(meta_description) <= 170),
  og_image_url     text check (og_image_url is null or og_image_url ~ '^https?://'),
  footer_text      text not null default '' check (char_length(footer_text) <= 200),
  updated_at       timestamptz not null default now()
);

-- Page sections: visibility, order and headings for each public section.
create table if not exists public.sections (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique check (key in
                  ('hero','about','skills','experience','projects','services','testimonials','contact')),
  nav_label     text not null check (char_length(nav_label) between 1 and 30),
  title         text not null default '' check (char_length(title) <= 80),
  subtitle      text not null default '' check (char_length(subtitle) <= 200),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  updated_at    timestamptz not null default now()
);

-- Hero (single row).
create table if not exists public.hero (
  id                smallint primary key default 1 check (id = 1),
  eyebrow           text not null default '' check (char_length(eyebrow) <= 80),
  name              text not null check (char_length(name) between 1 and 80),
  headline          text not null check (char_length(headline) between 1 and 140),
  bio               text not null default '' check (char_length(bio) <= 600),
  profile_image_url text check (profile_image_url is null or profile_image_url ~ '^https?://'),
  cv_url            text check (cv_url is null or cv_url ~ '^https?://'),
  cv_label          text not null default 'Download CV' check (char_length(cv_label) between 1 and 40),
  -- Array of {label, url, style: "primary"|"ghost"}
  cta_buttons       jsonb not null default '[]'::jsonb
                    check (jsonb_typeof(cta_buttons) = 'array' and jsonb_array_length(cta_buttons) <= 4),
  updated_at        timestamptz not null default now()
);

-- About (single row) + stats.
create table if not exists public.about (
  id         smallint primary key default 1 check (id = 1),
  body       text not null default '' check (char_length(body) <= 5000),
  image_url  text check (image_url is null or image_url ~ '^https?://'),
  updated_at timestamptz not null default now()
);

create table if not exists public.about_stats (
  id            uuid primary key default gen_random_uuid(),
  value         text not null check (char_length(value) between 1 and 20),
  label         text not null check (char_length(label) between 1 and 60),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Skills, grouped by category.
create table if not exists public.skill_categories (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 60),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.skills (
  id            uuid primary key default gen_random_uuid(),
  category_id   uuid not null references public.skill_categories (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  icon          text not null default '' check (char_length(icon) <= 8),
  proficiency   smallint check (proficiency is null or proficiency between 0 and 100),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists skills_category_idx on public.skills (category_id);

-- Experience, education and certifications (timeline).
create table if not exists public.timeline_items (
  id            uuid primary key default gen_random_uuid(),
  kind          text not null default 'experience' check (kind in ('experience','education','certification')),
  title         text not null check (char_length(title) between 1 and 120),
  organization  text not null check (char_length(organization) between 1 and 120),
  location      text not null default '' check (char_length(location) <= 80),
  start_date    date not null,
  end_date      date check (end_date is null or end_date >= start_date),
  description   text not null default '' check (char_length(description) <= 4000),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Projects.
create table if not exists public.projects (
  id              uuid primary key default gen_random_uuid(),
  title           text not null check (char_length(title) between 1 and 120),
  slug            text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  category        text not null default '' check (char_length(category) <= 40),
  summary         text not null check (char_length(summary) between 1 and 300),
  content         text not null default '' check (char_length(content) <= 20000),
  cover_image_url text check (cover_image_url is null or cover_image_url ~ '^https?://'),
  gallery         text[] not null default '{}' check (cardinality(gallery) <= 12),
  tech_stack      text[] not null default '{}' check (cardinality(tech_stack) <= 20),
  live_url        text check (live_url is null or live_url ~ '^https?://'),
  github_url      text check (github_url is null or github_url ~ '^https?://'),
  is_featured     boolean not null default false,
  status          text not null default 'draft' check (status in ('draft','published')),
  display_order   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Services.
create table if not exists public.services (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 80),
  description   text not null default '' check (char_length(description) <= 600),
  icon          text not null default '' check (char_length(icon) <= 8),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Testimonials.
create table if not exists public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 80),
  role          text not null default '' check (char_length(role) <= 120),
  photo_url     text check (photo_url is null or photo_url ~ '^https?://'),
  quote         text not null check (char_length(quote) between 1 and 1000),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Contact details (single row) + social links.
create table if not exists public.contact_info (
  id         smallint primary key default 1 check (id = 1),
  intro      text not null default '' check (char_length(intro) <= 400),
  email      text check (email is null or (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254)),
  phone      text check (phone is null or (phone ~ '^[0-9+()\-\s.]{5,30}$')),
  location   text not null default '' check (char_length(location) <= 120),
  form_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.social_links (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null check (char_length(platform) between 1 and 40),
  url           text not null check (url ~ '^(https?://|mailto:)' and char_length(url) <= 500),
  icon          text not null default '' check (char_length(icon) <= 8),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Contact form messages.
create table if not exists public.messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(btrim(name)) between 2 and 100),
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  subject    text not null default '' check (char_length(subject) <= 150),
  body       text not null check (char_length(btrim(body)) between 10 and 5000),
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists messages_created_idx on public.messages (created_at desc);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array[
    'site_settings','sections','hero','about','about_stats','skill_categories','skills',
    'timeline_items','projects','services','testimonials','contact_info','social_links'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_updated_at', t);
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 4. Row Level Security
--    Public (anon) may only READ visible/published content and INSERT messages.
--    Admins (rows in public.admins) may do everything.
-- -----------------------------------------------------------------------------

alter table public.admins enable row level security;
drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins
  for select to authenticated using (user_id = auth.uid());
-- No insert/update/delete policies: admins are managed from the SQL editor only.

-- Single-row tables and sections: always publicly readable.
do $$
declare t text;
begin
  foreach t in array array['site_settings','hero','about','contact_info','sections'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read" on public.%I', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format(
      'create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- List tables with an is_visible flag: public sees visible rows, admin sees all.
do $$
declare t text;
begin
  foreach t in array array['about_stats','skill_categories','skills','timeline_items',
                           'services','testimonials','social_links'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public read visible" on public.%I', t);
    execute format('create policy "public read visible" on public.%I for select to anon, authenticated using (is_visible)', t);
    execute format('drop policy if exists "admin read all" on public.%I', t);
    execute format('create policy "admin read all" on public.%I for select to authenticated using (public.is_admin())', t);
    execute format('drop policy if exists "admin write" on public.%I', t);
    execute format(
      'create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Projects: drafts are never public.
alter table public.projects enable row level security;
drop policy if exists "public read published" on public.projects;
create policy "public read published" on public.projects
  for select to anon, authenticated using (status = 'published');
drop policy if exists "admin read all" on public.projects;
create policy "admin read all" on public.projects
  for select to authenticated using (public.is_admin());
drop policy if exists "admin write" on public.projects;
create policy "admin write" on public.projects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Messages: anyone can submit (unread only), only admin can read/update/delete.
alter table public.messages enable row level security;
drop policy if exists "anyone can send" on public.messages;
create policy "anyone can send" on public.messages
  for insert to anon, authenticated with check (is_read = false);
drop policy if exists "admin read" on public.messages;
create policy "admin read" on public.messages
  for select to authenticated using (public.is_admin());
drop policy if exists "admin update" on public.messages;
create policy "admin update" on public.messages
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "admin delete" on public.messages;
create policy "admin delete" on public.messages
  for delete to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- 5. Reorder RPC — sets display_order for a list of ids in one round trip.
--    SECURITY INVOKER: RLS still applies, and we additionally require admin.
-- -----------------------------------------------------------------------------

create or replace function public.reorder_items(p_table text, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;
  if p_table not in ('sections','about_stats','skill_categories','skills','timeline_items',
                     'projects','services','testimonials','social_links') then
    raise exception 'Table % cannot be reordered', p_table using errcode = '22023';
  end if;
  execute format(
    'update public.%I t set display_order = x.ord - 1
       from unnest($1) with ordinality as x(id, ord)
      where t.id = x.id', p_table)
  using p_ids;
end;
$$;

revoke all on function public.reorder_items(text, uuid[]) from public, anon;
grant execute on function public.reorder_items(text, uuid[]) to authenticated;

-- -----------------------------------------------------------------------------
-- 6. Storage: public bucket for images and the CV.
--    Size and MIME type are also enforced server-side by the bucket settings.
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'portfolio', 'portfolio', true, 10485760,
  array['image/jpeg','image/png','image/webp','image/gif','image/x-icon','image/vnd.microsoft.icon','application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "portfolio public read" on storage.objects;
create policy "portfolio public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'portfolio');

drop policy if exists "portfolio admin insert" on storage.objects;
create policy "portfolio admin insert" on storage.objects
  for insert to authenticated with check (bucket_id = 'portfolio' and public.is_admin());

drop policy if exists "portfolio admin update" on storage.objects;
create policy "portfolio admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'portfolio' and public.is_admin())
  with check (bucket_id = 'portfolio' and public.is_admin());

drop policy if exists "portfolio admin delete" on storage.objects;
create policy "portfolio admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'portfolio' and public.is_admin());

-- -----------------------------------------------------------------------------
-- 7. Seed data (only inserted into empty tables)
-- -----------------------------------------------------------------------------

insert into public.site_settings (id, site_title, logo_text, primary_color, meta_title, meta_description, footer_text)
values (1, 'Omar Serri Charif', 'OMAR.SERRI', '#D9A441',
        'Omar Serri Charif — Digital Marketing Specialist',
        'Digital Marketing Specialist working across social strategy, paid media and content photography for healthcare brands in the UAE.',
        '© 2026 Omar Serri Charif. All rights reserved.')
on conflict (id) do nothing;

insert into public.sections (key, nav_label, title, subtitle, is_visible, display_order)
select * from (values
  ('hero',         'Home',         '',                  '',                                                         true,  0),
  ('about',        'About',        'About Me',          'A little about how I work and what drives me.',            true,  1),
  ('experience',   'Experience',   'Experience',        'Where I have worked, studied and certified.',              true,  2),
  ('skills',       'Skills',       'Skills & Tools',    'The strategy, social and creative toolkit I use daily.',   true,  3),
  ('projects',     'Projects',     'Selected Projects', 'Independent brands and campaigns I have built.',           true,  4),
  ('services',     'Services',     'What I Can Do',     'Ways I can help your brand grow.',                         true,  5),
  ('testimonials', 'Testimonials', 'Kind Words',        'What colleagues and clients say.',                         true,  6),
  ('contact',      'Contact',      'Let’s build something.', 'Have a campaign, event or brand in mind? Say hello.', true, 7)
) as v(key, nav_label, title, subtitle, is_visible, display_order)
where not exists (select 1 from public.sections);

insert into public.hero (id, eyebrow, name, headline, bio, cv_label, cta_buttons)
values (1,
  'Available for new opportunities',
  'Omar Serri Charif',
  'Digital Marketing Specialist',
  'I work across social strategy, paid media and content photography — currently running campaigns for medical conferences and healthcare brands across the UAE.',
  'Download CV',
  '[{"label":"See the work","url":"#projects","style":"primary"},{"label":"Get in touch","url":"#contact","style":"ghost"}]'::jsonb)
on conflict (id) do nothing;

insert into public.about (id, body)
values (1,
'I’m a **results-driven Digital Marketing Specialist** with 4+ years of experience across social media, paid advertising, SEO/AEO and content production. I like the part of marketing where a data point turns into a decision — and the part where I’m behind a camera capturing the moment a conference room comes alive.

Right now I split my time between **MCO**, a medical conference organizer, and the **Emirates Thoracic Society**, where I run everything from ad budgets to public health awareness campaigns. On the side, I build independent content brands, because I’d rather learn growth by doing it than just studying it.

- Based in Abu Dhabi / Dubai, UAE
- Speaks Arabic, English and German
- B.Sc. Business Administration, Istanbul Gelisim University')
on conflict (id) do nothing;

insert into public.about_stats (value, label, display_order)
select * from (values
  ('4+',   'Years of experience', 0),
  ('40%',  'Engagement growth at MCO', 1),
  ('2×',   'Page engagement at ETS', 2),
  ('8M+',  'Organic TikTok views', 3)
) as v(value, label, display_order)
where not exists (select 1 from public.about_stats);

do $$
declare c_strategy uuid; c_social uuid; c_creative uuid;
begin
  if exists (select 1 from public.skill_categories) then return; end if;
  insert into public.skill_categories (name, display_order) values ('Strategy', 0)      returning id into c_strategy;
  insert into public.skill_categories (name, display_order) values ('Social & Paid', 1) returning id into c_social;
  insert into public.skill_categories (name, display_order) values ('Creative', 2)      returning id into c_creative;
  insert into public.skills (category_id, name, icon, proficiency, display_order) values
    (c_strategy, 'Digital Marketing Strategy', '🧭', 90, 0),
    (c_strategy, 'SEO',                        '🔎', 80, 1),
    (c_strategy, 'AEO',                        '💬', 70, 2),
    (c_strategy, 'Marketing Budget Management','📊', 85, 3),
    (c_social,   'Social Media Ads',           '📣', 90, 0),
    (c_social,   'Community Management',       '🤝', 88, 1),
    (c_social,   'Meta Ads Manager',           '🎯', 85, 2),
    (c_social,   'Google Analytics',           '📈', 75, 3),
    (c_creative, 'Content Photography',        '📷', 92, 0),
    (c_creative, 'Videography',                '🎬', 80, 1),
    (c_creative, 'CapCut',                     '✂️', 85, 2),
    (c_creative, 'Canva',                      '🎨', 90, 3),
    (c_creative, 'Adobe Suite',                '🖌️', 70, 4);
end $$;

insert into public.timeline_items (kind, title, organization, location, start_date, end_date, description, display_order)
select * from (values
  ('experience', 'Marketing Executive & Content Photographer', 'MCO — Medetarian Conference Organizing', 'Dubai, UAE',
   date '2025-08-01', null::date,
   '- Manage all company social accounts, growing audience engagement by **40%**
- Shoot professional event photography and live social content at major conferences
- Grew the organic follower base by **30%+** within 3 months
- Built onboarding workflows while training new marketing interns', 0),
  ('experience', 'Social Media Marketing Specialist', 'ETS — Emirates Thoracic Society', 'Abu Dhabi, UAE',
   date '2025-08-01', null::date,
   '- Own the full marketing budget and resource allocation
- Ran COPD & Asthma awareness campaigns reaching millions at a fraction of standard cost
- **Doubled** page engagement through a data-driven content strategy
- Recovered a suspended platform account with zero business interruption', 1),
  ('experience', 'Event Assistant & Digital Marketing Specialist', 'Istanbul Gelisim University', 'Istanbul, Türkiye',
   date '2021-12-01', date '2024-12-01',
   '- Coordinated logistics and marketing collateral for large-scale student events
- Captured photography and video content throughout ceremonies and celebrations', 2),
  ('education', 'B.Sc. Business Administration', 'Istanbul Gelisim University', 'Istanbul, Türkiye',
   date '2020-09-01', date '2024-06-01', 'Focus on marketing, consumer behaviour and digital business.', 3),
  ('certification', 'Apple Ads Certified', 'Apple', '', date '2025-03-01', null::date, '', 4),
  ('certification', 'Advertising with Meta', 'Meta Blueprint', '', date '2024-10-01', null::date, '', 5),
  ('certification', 'Measure & Optimize Social Media Campaigns', 'Meta Blueprint', '', date '2024-09-01', null::date, '', 6),
  ('certification', 'Google Ads Master Essentials & Fundamentals', 'Coursera', '', date '2024-05-01', null::date, '', 7),
  ('certification', 'Marketing Tools: SEO', 'LinkedIn Learning', '', date '2023-11-01', null::date, '', 8)
) as v(kind, title, organization, location, start_date, end_date, description, display_order)
where not exists (select 1 from public.timeline_items);

insert into public.projects (title, slug, category, summary, content, tech_stack, is_featured, status, display_order)
select * from (values
  ('Travel TikTok Channel', 'travel-tiktok-channel', 'Content Brand',
   'An independent travel channel grown from zero to 20K+ followers and 8M+ views — entirely organic, no paid promotion.',
   '## The challenge
Grow a brand-new travel account without any ad budget, using only content strategy.

## The approach
- Researched trending formats and **hooks** in the travel niche
- Built a weekly shooting and editing routine
- Tested posting times and caption styles, then doubled down on what worked

## Results
- **20K+** followers
- **8M+** total views
- Several videos crossed 1M views organically

> Consistency beat budget. Every week of data made the next week of content better.',
   array['TikTok','CapCut','Content Strategy','Analytics'], true, 'published', 0),
  ('Health & Fitness Channel', 'health-fitness-channel', 'Faceless Brand',
   'A faceless fitness brand across TikTok, Instagram and YouTube with an original mascot and a repeatable creative workflow.',
   '## Overview
A faceless content brand built around an original mascot, published across **three platforms**.

## Workflow
1. Scripting and hook writing
2. Asset creation with the mascot
3. Editing in CapCut and Canva
4. Scheduling and cross-posting

## What I learned
Building a *system* matters more than any single video.',
   array['Instagram','YouTube','TikTok','Canva'], true, 'published', 1),
  ('COPD Awareness Campaign', 'copd-awareness-campaign', 'Healthcare Campaign',
   'A public health awareness campaign for the Emirates Thoracic Society that reached millions at a fraction of standard cost.',
   '## Goal
Raise awareness of COPD and asthma across the UAE.

## Execution
- Audience research with pulmonologists
- Short-form educational videos and carousels
- Tight **Meta Ads** budget with weekly optimisation

## Impact
Multi-million impressions at a fraction of the standard cost per reach.',
   array['Meta Ads','Photography','Copywriting'], false, 'draft', 2)
) as v(title, slug, category, summary, content, tech_stack, is_featured, status, display_order)
where not exists (select 1 from public.projects);

insert into public.services (title, description, icon, display_order)
select * from (values
  ('Social Media Management', 'Strategy, calendars, community management and monthly reporting across all major platforms.', '📱', 0),
  ('Paid Advertising',        'Meta and Google campaigns planned, launched and optimised against clear business goals.',   '🎯', 1),
  ('Event & Content Photography', 'Conference coverage and on-brand content shoots, delivered fast for live social posting.', '📷', 2)
) as v(title, description, icon, display_order)
where not exists (select 1 from public.services);

insert into public.testimonials (name, role, quote, display_order)
select * from (values
  ('Dr. Layla Haddad', 'Board Member, Emirates Thoracic Society',
   'Omar turned our awareness campaign into something people actually shared. The results far exceeded what we expected from our budget.', 0),
  ('Karim Mansour', 'Events Director, MCO',
   'Reliable, creative and fast. His live conference coverage kept our social channels buzzing throughout every event.', 1)
) as v(name, role, quote, display_order)
where not exists (select 1 from public.testimonials);

insert into public.contact_info (id, intro, email, phone, location)
values (1,
  'Open to marketing roles, freelance campaigns and event coverage. I usually reply within a day.',
  'omar.serri.ch@gmail.com', '+971 56 461 1101', 'Abu Dhabi / Dubai, UAE')
on conflict (id) do nothing;

insert into public.social_links (platform, url, icon, display_order)
select * from (values
  ('LinkedIn',  'https://linkedin.com/in/omarserri', 'in', 0),
  ('Instagram', 'https://instagram.com/',            '📸', 1),
  ('TikTok',    'https://tiktok.com/',               '🎵', 2)
) as v(platform, url, icon, display_order)
where not exists (select 1 from public.social_links);

-- =============================================================================
--  After creating your admin user in Authentication → Users, register it:
--
--    insert into public.admins (user_id)
--    select id from auth.users where email = 'you@example.com'
--    on conflict do nothing;
-- =============================================================================
