-- =====================================================================
--  October Growth — Supabase schema, security policies and seed data
--  Run this whole file once in the Supabase SQL Editor.
--  It is idempotent for the schema (safe to re-run); the seed section
--  only inserts rows when the tables are empty.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
--  1. Helper functions
-- ---------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- URL allow-list shared by every URL column. Mirrors URL_RE in js/utils.js.
-- Allows http(s), mailto:, tel:, #anchors, absolute paths and simple relative paths.
-- Rejects javascript:, data:, vbscript: and anything with whitespace or angle brackets.
create or replace function public.is_safe_url(u text)
returns boolean
language sql
immutable
as $$
  select u is null or (
    length(u) <= 2048 and
    u ~ '^(https?://[^\s<>"]+|mailto:[^\s<>"]+|tel:[+0-9() .-]+|#[A-Za-z0-9_-]*|/[^\s<>"]*|[A-Za-z0-9_][A-Za-z0-9_./?=&#%+-]*)$'
  );
$$;

-- ---------------------------------------------------------------------
--  2. Admin registry
-- ---------------------------------------------------------------------

create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------
--  3. Tables
-- ---------------------------------------------------------------------

-- Site settings (single row, id = 1)
create table if not exists public.site_settings (
  id                 smallint primary key default 1 check (id = 1),
  company_name       text not null check (char_length(company_name) between 1 and 120),
  site_title         text not null check (char_length(site_title) between 1 and 120),
  tagline            text check (char_length(tagline) <= 200),
  logo_url           text check (public.is_safe_url(logo_url)),
  logo_dark_url      text check (public.is_safe_url(logo_dark_url)),
  logo_alt           text check (char_length(logo_alt) <= 120),
  favicon_url        text check (public.is_safe_url(favicon_url)),
  primary_color      text not null default '#182551' check (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color    text not null default '#F1EADC' check (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color       text not null default '#C8A664' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  default_theme      text not null default 'system' check (default_theme in ('system', 'light', 'dark')),
  allow_theme_toggle boolean not null default true,
  seo_title          text check (char_length(seo_title) <= 120),
  seo_description    text check (char_length(seo_description) <= 320),
  seo_keywords       text check (char_length(seo_keywords) <= 500),
  og_image_url       text check (public.is_safe_url(og_image_url)),
  canonical_url      text check (canonical_url is null or (public.is_safe_url(canonical_url) and canonical_url ~ '^https?://')),
  footer_text        text check (char_length(footer_text) <= 500),
  copyright_text     text check (char_length(copyright_text) <= 200),
  contact_email      text check (contact_email is null or contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  contact_phone      text check (contact_phone is null or contact_phone ~ '^[+0-9() .-]{6,30}$'),
  location           text check (char_length(location) <= 200),
  business_hours     text check (char_length(business_hours) <= 300),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- Page sections: visibility + order of every homepage block
create table if not exists public.sections (
  id            uuid primary key default gen_random_uuid(),
  key           text not null unique check (key ~ '^[a-z0-9_]{2,40}$'),
  eyebrow       text check (char_length(eyebrow) <= 80),
  title         text check (char_length(title) <= 160),
  subtitle      text check (char_length(subtitle) <= 500),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.navigation_items (
  id              uuid primary key default gen_random_uuid(),
  label           text not null check (char_length(label) between 1 and 50),
  link_type       text not null default 'section' check (link_type in ('section', 'page', 'external')),
  target          text not null check (char_length(target) between 1 and 2048 and public.is_safe_url(target)),
  open_in_new_tab boolean not null default false,
  location        text not null default 'both' check (location in ('header', 'footer', 'both')),
  is_visible      boolean not null default true,
  display_order   integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.social_links (
  id            uuid primary key default gen_random_uuid(),
  platform      text not null check (platform in ('instagram', 'facebook', 'x', 'linkedin', 'tiktok', 'youtube', 'whatsapp', 'snapchat', 'threads', 'behance', 'website', 'other')),
  label         text check (char_length(label) <= 60),
  url           text not null check (public.is_safe_url(url) and url ~ '^(https?://|mailto:|tel:)'),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Hero (single row)
create table if not exists public.hero (
  id                  smallint primary key default 1 check (id = 1),
  badge               text check (char_length(badge) <= 80),
  headline            text not null check (char_length(headline) between 1 and 200),
  subheadline         text check (char_length(subheadline) <= 300),
  description         text check (char_length(description) <= 1000),
  media_type          text not null default 'image' check (media_type in ('none', 'image', 'video')),
  media_url           text check (public.is_safe_url(media_url)),
  media_poster_url    text check (public.is_safe_url(media_poster_url)),
  media_alt           text check (char_length(media_alt) <= 200),
  primary_cta_label   text check (char_length(primary_cta_label) <= 40),
  primary_cta_url     text check (public.is_safe_url(primary_cta_url)),
  secondary_cta_label text check (char_length(secondary_cta_label) <= 40),
  secondary_cta_url   text check (public.is_safe_url(secondary_cta_url)),
  stat_value          text check (char_length(stat_value) <= 30),
  stat_label          text check (char_length(stat_label) <= 80),
  trust_statement     text check (char_length(trust_statement) <= 200),
  -- ordered list of {"key": "...", "visible": true|false}
  elements            jsonb not null default '[{"key":"badge","visible":true},{"key":"headline","visible":true},{"key":"subheadline","visible":true},{"key":"description","visible":true},{"key":"ctas","visible":true},{"key":"stat","visible":true},{"key":"trust","visible":true}]'::jsonb
                      check (jsonb_typeof(elements) = 'array'),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- About (single row)
create table if not exists public.about (
  id         smallint primary key default 1 check (id = 1),
  heading    text not null check (char_length(heading) between 1 and 160),
  body       text check (char_length(body) <= 5000),
  mission    text check (char_length(mission) <= 1000),
  vision     text check (char_length(vision) <= 1000),
  image_url  text check (public.is_safe_url(image_url)),
  image_alt  text check (char_length(image_alt) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.company_values (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 80),
  description   text check (char_length(description) <= 500),
  icon          text check (char_length(icon) <= 40),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.statistics (
  id            uuid primary key default gen_random_uuid(),
  value         text not null check (char_length(value) between 1 and 30),
  label         text not null check (char_length(label) between 1 and 80),
  description   text check (char_length(description) <= 200),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.services (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) between 1 and 100),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  short_description text check (char_length(short_description) <= 300),
  description       text check (char_length(description) <= 20000),
  icon              text check (char_length(icon) <= 40),
  cover_image_url   text check (public.is_safe_url(cover_image_url)),
  cover_image_alt   text check (char_length(cover_image_alt) <= 200),
  starting_price    numeric(12, 2) check (starting_price >= 0),
  currency          text not null default 'AED' check (currency ~ '^[A-Z]{3}$'),
  pricing_type      text check (pricing_type in ('fixed', 'starting_from', 'monthly', 'per_post', 'per_hour', 'percentage', 'quote', 'custom')),
  price_note        text check (char_length(price_note) <= 150),
  cta_label         text check (char_length(cta_label) <= 40),
  cta_url           text check (public.is_safe_url(cta_url)),
  is_featured       boolean not null default false,
  is_visible        boolean not null default true,
  status            text not null default 'draft' check (status in ('draft', 'published')),
  display_order     integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.service_features (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid not null references public.services (id) on delete cascade,
  kind          text not null default 'feature' check (kind in ('feature', 'benefit', 'deliverable')),
  title         text not null check (char_length(title) between 1 and 150),
  description   text check (char_length(description) <= 500),
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.pricing_packages (
  id                uuid primary key default gen_random_uuid(),
  service_id        uuid references public.services (id) on delete set null,
  name              text not null check (char_length(name) between 1 and 100),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  short_description text check (char_length(short_description) <= 300),
  description       text check (char_length(description) <= 10000),
  price             numeric(12, 2) check (price >= 0),
  currency          text not null default 'AED' check (currency ~ '^[A-Z]{3}$'),
  pricing_period    text not null default 'one_time' check (pricing_period in ('one_time', 'monthly', 'quarterly', 'yearly', 'per_post', 'per_hour', 'percentage', 'custom')),
  price_note        text check (char_length(price_note) <= 150),
  minimum_price     numeric(12, 2) check (minimum_price >= 0),
  original_price    numeric(12, 2) check (original_price >= 0),
  discount_label    text check (char_length(discount_label) <= 40),
  badge             text check (char_length(badge) <= 40),
  is_popular        boolean not null default false,
  is_featured       boolean not null default false,
  image_url         text check (public.is_safe_url(image_url)),
  cta_label         text check (char_length(cta_label) <= 40),
  cta_url           text check (public.is_safe_url(cta_url)),
  is_visible        boolean not null default true,
  status            text not null default 'draft' check (status in ('draft', 'published')),
  display_order     integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint pricing_packages_percentage_range check (pricing_period <> 'percentage' or price is null or price <= 100)
);

create table if not exists public.package_features (
  id            uuid primary key default gen_random_uuid(),
  package_id    uuid not null references public.pricing_packages (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 150),
  description   text check (char_length(description) <= 300),
  is_included   boolean not null default true,
  quantity      text check (char_length(quantity) <= 40),
  limitation    text check (char_length(limitation) <= 150),
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.addons (
  id            uuid primary key default gen_random_uuid(),
  service_id    uuid references public.services (id) on delete set null,
  group_label   text check (char_length(group_label) <= 80),
  name          text not null check (char_length(name) between 1 and 100),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 100),
  description   text check (char_length(description) <= 2000),
  price         numeric(12, 2) check (price >= 0),
  currency      text not null default 'AED' check (currency ~ '^[A-Z]{3}$'),
  pricing_type  text not null default 'fixed' check (pricing_type in ('fixed', 'starting_from', 'per_unit', 'monthly', 'per_hour', 'percentage', 'quote')),
  price_note    text check (char_length(price_note) <= 150),
  quantity      text check (char_length(quantity) <= 60),
  icon          text check (char_length(icon) <= 40),
  image_url     text check (public.is_safe_url(image_url)),
  cta_label     text check (char_length(cta_label) <= 40),
  cta_url       text check (public.is_safe_url(cta_url)),
  is_visible    boolean not null default true,
  status        text not null default 'draft' check (status in ('draft', 'published')),
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.industries (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 100),
  description   text check (char_length(description) <= 1000),
  icon          text check (char_length(icon) <= 40),
  image_url     text check (public.is_safe_url(image_url)),
  image_alt     text check (char_length(image_alt) <= 200),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.why_choose_us (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 100),
  description   text check (char_length(description) <= 1000),
  icon          text check (char_length(icon) <= 40),
  image_url     text check (public.is_safe_url(image_url)),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.process_steps (
  id            uuid primary key default gen_random_uuid(),
  step_number   integer check (step_number between 1 and 99),
  title         text not null check (char_length(title) between 1 and 100),
  description   text check (char_length(description) <= 1000),
  icon          text check (char_length(icon) <= 40),
  image_url     text check (public.is_safe_url(image_url)),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Clients / conferences the company has worked with
create table if not exists public.clients (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 200),
  category      text check (char_length(category) <= 80),
  logo_url      text check (public.is_safe_url(logo_url)),
  website_url   text check (public.is_safe_url(website_url)),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.case_studies (
  id                uuid primary key default gen_random_uuid(),
  title             text not null check (char_length(title) between 1 and 160),
  slug              text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 120),
  short_description text check (char_length(short_description) <= 400),
  content           text check (char_length(content) <= 30000),
  cover_image_url   text check (public.is_safe_url(cover_image_url)),
  cover_image_alt   text check (char_length(cover_image_alt) <= 200),
  client_name       text check (char_length(client_name) <= 150),
  industry_id       uuid references public.industries (id) on delete set null,
  -- ordered list of {"value": "...", "label": "..."}
  results           jsonb not null default '[]'::jsonb check (jsonb_typeof(results) = 'array'),
  platforms         text[] not null default '{}',
  live_url          text check (public.is_safe_url(live_url)),
  is_featured       boolean not null default false,
  is_visible        boolean not null default true,
  status            text not null default 'draft' check (status in ('draft', 'published')),
  display_order     integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.case_study_images (
  id            uuid primary key default gen_random_uuid(),
  case_study_id uuid not null references public.case_studies (id) on delete cascade,
  image_url     text not null check (public.is_safe_url(image_url)),
  alt_text      text check (char_length(alt_text) <= 200),
  caption       text check (char_length(caption) <= 200),
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.case_study_services (
  case_study_id uuid not null references public.case_studies (id) on delete cascade,
  service_id    uuid not null references public.services (id) on delete cascade,
  primary key (case_study_id, service_id)
);

create table if not exists public.testimonials (
  id            uuid primary key default gen_random_uuid(),
  client_name   text not null check (char_length(client_name) between 1 and 120),
  role          text check (char_length(role) <= 120),
  company       text check (char_length(company) <= 120),
  photo_url     text check (public.is_safe_url(photo_url)),
  quote         text not null check (char_length(quote) between 1 and 1500),
  rating        smallint check (rating between 1 and 5),
  is_visible    boolean not null default true,
  status        text not null default 'draft' check (status in ('draft', 'published')),
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.team_members (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) between 1 and 120),
  job_title     text check (char_length(job_title) <= 120),
  bio           text check (char_length(bio) <= 1000),
  photo_url     text check (public.is_safe_url(photo_url)),
  -- list of {"platform": "...", "url": "..."}
  social_links  jsonb not null default '[]'::jsonb check (jsonb_typeof(social_links) = 'array'),
  is_visible    boolean not null default true,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.faqs (
  id            uuid primary key default gen_random_uuid(),
  question      text not null check (char_length(question) between 1 and 300),
  answer        text not null check (char_length(answer) between 1 and 5000),
  is_visible    boolean not null default true,
  status        text not null default 'draft' check (status in ('draft', 'published')),
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.documents (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 1 and 150),
  description   text check (char_length(description) <= 500),
  file_url      text not null check (public.is_safe_url(file_url)),
  is_public     boolean not null default false,
  display_order integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 120),
  email       text not null check (char_length(email) <= 254 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text check (phone is null or phone ~ '^[+0-9() .-]{6,30}$'),
  company     text check (char_length(company) <= 150),
  service     text check (char_length(service) <= 150),
  budget      text check (char_length(budget) <= 100),
  message     text not null check (char_length(message) between 10 and 5000),
  source_page text check (char_length(source_page) <= 200),
  status      text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'converted', 'closed')),
  is_read     boolean not null default false,
  notes       text check (char_length(notes) <= 5000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
--  4. Indexes
-- ---------------------------------------------------------------------

create index if not exists sections_order_idx           on public.sections (display_order);
create index if not exists navigation_items_order_idx   on public.navigation_items (display_order);
create index if not exists social_links_order_idx       on public.social_links (display_order);
create index if not exists company_values_order_idx     on public.company_values (display_order);
create index if not exists statistics_order_idx         on public.statistics (display_order);
create index if not exists services_public_idx          on public.services (status, is_visible, display_order);
create index if not exists service_features_service_idx on public.service_features (service_id, display_order);
create index if not exists packages_public_idx          on public.pricing_packages (status, is_visible, display_order);
create index if not exists packages_service_idx         on public.pricing_packages (service_id);
create index if not exists package_features_package_idx on public.package_features (package_id, display_order);
create index if not exists addons_public_idx            on public.addons (status, is_visible, display_order);
create index if not exists addons_service_idx           on public.addons (service_id);
create index if not exists industries_order_idx         on public.industries (display_order);
create index if not exists why_choose_us_order_idx      on public.why_choose_us (display_order);
create index if not exists process_steps_order_idx      on public.process_steps (display_order);
create index if not exists clients_order_idx            on public.clients (display_order);
create index if not exists case_studies_public_idx      on public.case_studies (status, is_visible, display_order);
create index if not exists case_studies_industry_idx    on public.case_studies (industry_id);
create index if not exists case_study_images_cs_idx     on public.case_study_images (case_study_id, display_order);
create index if not exists case_study_services_svc_idx  on public.case_study_services (service_id);
create index if not exists testimonials_public_idx      on public.testimonials (status, is_visible, display_order);
create index if not exists team_members_order_idx       on public.team_members (display_order);
create index if not exists faqs_public_idx              on public.faqs (status, is_visible, display_order);
create index if not exists documents_order_idx          on public.documents (display_order);
create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_status_idx  on public.contact_messages (status, is_read);
create index if not exists contact_messages_email_idx   on public.contact_messages (email, created_at desc);

-- ---------------------------------------------------------------------
--  5. Triggers
-- ---------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'site_settings', 'sections', 'navigation_items', 'social_links', 'hero', 'about',
    'company_values', 'statistics', 'services', 'service_features', 'pricing_packages',
    'package_features', 'addons', 'industries', 'why_choose_us', 'process_steps', 'clients',
    'case_studies', 'case_study_images', 'testimonials', 'team_members', 'faqs', 'documents',
    'contact_messages'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t || '_set_updated_at', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- Contact messages: force safe defaults for public submissions and throttle spam.
create or replace function public.contact_messages_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
begin
  if not public.is_admin() then
    new.status     := 'new';
    new.is_read    := false;
    new.notes      := null;
    new.created_at := now();
    new.updated_at := now();

    select count(*) into recent
    from public.contact_messages
    where lower(email) = lower(new.email)
      and created_at > now() - interval '10 minutes';

    if recent >= 3 then
      raise exception 'Too many messages. Please wait a few minutes before trying again.'
        using errcode = 'P0001';
    end if;
  end if;
  new.email := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists contact_messages_before_insert on public.contact_messages;
create trigger contact_messages_before_insert
  before insert on public.contact_messages
  for each row execute function public.contact_messages_before_insert();

-- ---------------------------------------------------------------------
--  6. Reorder RPC (admin only, runs with the caller's RLS)
-- ---------------------------------------------------------------------

create or replace function public.reorder_items(p_table text, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  i integer;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_table not in (
    'sections', 'navigation_items', 'social_links', 'company_values', 'statistics', 'services',
    'service_features', 'pricing_packages', 'package_features', 'addons', 'industries',
    'why_choose_us', 'process_steps', 'clients', 'case_studies', 'case_study_images',
    'testimonials', 'team_members', 'faqs', 'documents'
  ) then
    raise exception 'Table % cannot be reordered', p_table using errcode = '22023';
  end if;

  for i in 1 .. coalesce(array_length(p_ids, 1), 0) loop
    execute format('update public.%I set display_order = $1 where id = $2', p_table)
      using i, p_ids[i];
  end loop;
end;
$$;

revoke all on function public.reorder_items(text, uuid[]) from public, anon;
grant execute on function public.reorder_items(text, uuid[]) to authenticated;

-- ---------------------------------------------------------------------
--  7. Row Level Security
-- ---------------------------------------------------------------------

alter table public.admin_users enable row level security;

drop policy if exists "admins read admin list" on public.admin_users;
create policy "admins read admin list" on public.admin_users
  for select to authenticated
  using (public.is_admin() or user_id = auth.uid());
-- No insert/update/delete policies: admins are only added from the SQL editor.

do $$
declare
  t text;
begin
  -- Enable RLS and give the admin full access on every content table.
  foreach t in array array[
    'site_settings', 'sections', 'navigation_items', 'social_links', 'hero', 'about',
    'company_values', 'statistics', 'services', 'service_features', 'pricing_packages',
    'package_features', 'addons', 'industries', 'why_choose_us', 'process_steps', 'clients',
    'case_studies', 'case_study_images', 'case_study_services', 'testimonials', 'team_members',
    'faqs', 'documents', 'contact_messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', 'admin full access', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())',
      'admin full access', t
    );
  end loop;

  -- Singletons and always-public tables: anyone may read.
  foreach t in array array['site_settings', 'hero', 'about'] loop
    execute format('drop policy if exists %I on public.%I', 'public read', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', 'public read', t);
  end loop;

  -- Tables with a visibility flag only: visible rows are public.
  foreach t in array array[
    'sections', 'navigation_items', 'social_links', 'company_values', 'statistics',
    'industries', 'why_choose_us', 'process_steps', 'clients', 'team_members'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'public read visible', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (is_visible)',
      'public read visible', t
    );
  end loop;

  -- Tables with visibility + publishing workflow: only published & visible rows are public.
  foreach t in array array['services', 'pricing_packages', 'addons', 'case_studies', 'testimonials', 'faqs'] loop
    execute format('drop policy if exists %I on public.%I', 'public read published', t);
    execute format(
      'create policy %I on public.%I for select to anon, authenticated using (is_visible and status = %L)',
      'public read published', t, 'published'
    );
  end loop;
end;
$$;

-- Child tables inherit their parent's visibility.
drop policy if exists "public read published parent" on public.service_features;
create policy "public read published parent" on public.service_features
  for select to anon, authenticated
  using (exists (
    select 1 from public.services s
    where s.id = service_features.service_id and s.is_visible and s.status = 'published'
  ));

drop policy if exists "public read published parent" on public.package_features;
create policy "public read published parent" on public.package_features
  for select to anon, authenticated
  using (exists (
    select 1 from public.pricing_packages p
    where p.id = package_features.package_id and p.is_visible and p.status = 'published'
  ));

drop policy if exists "public read published parent" on public.case_study_images;
create policy "public read published parent" on public.case_study_images
  for select to anon, authenticated
  using (exists (
    select 1 from public.case_studies c
    where c.id = case_study_images.case_study_id and c.is_visible and c.status = 'published'
  ));

drop policy if exists "public read published parent" on public.case_study_services;
create policy "public read published parent" on public.case_study_services
  for select to anon, authenticated
  using (
    exists (select 1 from public.case_studies c
            where c.id = case_study_services.case_study_id and c.is_visible and c.status = 'published')
    and exists (select 1 from public.services s
                where s.id = case_study_services.service_id and s.is_visible and s.status = 'published')
  );

drop policy if exists "public read public documents" on public.documents;
create policy "public read public documents" on public.documents
  for select to anon, authenticated
  using (is_public);

-- Visitors may submit leads but never read, update or delete them.
drop policy if exists "public submit messages" on public.contact_messages;
create policy "public submit messages" on public.contact_messages
  for insert to anon, authenticated
  with check (status = 'new' and is_read = false and notes is null);

-- ---------------------------------------------------------------------
--  8. Storage buckets and policies
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('media', 'media', true, 26214400,
   array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/x-icon', 'image/vnd.microsoft.icon', 'video/mp4', 'video/webm']),
  ('documents', 'documents', true, 20971520,
   array['application/pdf'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin list site files"   on storage.objects;
drop policy if exists "admin upload site files" on storage.objects;
drop policy if exists "admin update site files" on storage.objects;
drop policy if exists "admin delete site files" on storage.objects;

-- Public buckets serve files by URL without a select policy; listing is admin-only.
create policy "admin list site files" on storage.objects
  for select to authenticated
  using (bucket_id in ('media', 'documents') and public.is_admin());

create policy "admin upload site files" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('media', 'documents') and public.is_admin());

create policy "admin update site files" on storage.objects
  for update to authenticated
  using (bucket_id in ('media', 'documents') and public.is_admin())
  with check (bucket_id in ('media', 'documents') and public.is_admin());

create policy "admin delete site files" on storage.objects
  for delete to authenticated
  using (bucket_id in ('media', 'documents') and public.is_admin());

-- ---------------------------------------------------------------------
--  9. Seed data — extracted from "October Growth — Agency Portfolio 2026"
--     Fields not present in the portfolio are left NULL / empty.
-- ---------------------------------------------------------------------

insert into public.site_settings (
  id, company_name, site_title, tagline, logo_url, logo_dark_url, logo_alt, favicon_url,
  primary_color, secondary_color, accent_color, default_theme, allow_theme_toggle,
  seo_title, seo_description, seo_keywords, og_image_url, canonical_url,
  footer_text, copyright_text, contact_email, contact_phone, location, business_hours
) values (
  1,
  'October Growth',
  'October Growth | Social Media & Content Agency, Abu Dhabi',
  'Social media management and custom content for clinics, brands and events.',
  'assets/img/logo.png',
  'assets/img/logo-light.png',
  'October Growth logo',
  'assets/img/favicon.png',
  '#182551', '#F1EADC', '#C8A664',
  'system', true,
  'October Growth | Social Media & Content Agency, Abu Dhabi',
  'October Growth is an Abu Dhabi marketing agency: social media management, custom content, paid ads and live event & conference coverage in English and Arabic.',
  'October Growth, social media management, content creation, Abu Dhabi marketing agency, clinic marketing, medical conference coverage, event coverage, bilingual Arabic English content, paid ad management, website creation',
  'assets/img/og-image.jpg',
  null,
  'Social media management and custom content for clinics, brands and events.',
  '© {year} October Growth. All rights reserved.',
  'octgrowth@gmail.com',
  '+971 56 461 1101',
  'Abu Dhabi, UAE',
  null
) on conflict (id) do nothing;

insert into public.sections (key, eyebrow, title, subtitle, is_visible, display_order)
select * from (values
  ('hero',          null,                  null,                                 null,                                                                                                   true,  1),
  ('about',         'About the agency',    'Who We Are',                         null,                                                                                                   true,  2),
  ('services',      'Services',            'What We Do',                         null,                                                                                                   true,  3),
  ('why_choose_us', 'Why October Growth',  'Why Choose Us',                      null,                                                                                                   true,  4),
  ('case_studies',  'Selected creative',   'Our Work',                           'Healthcare and aesthetics campaigns, designed in English and Arabic to turn scrolls into bookings.',   true,  5),
  ('industries',    'Who we work with',    'Clinics, Brands & Events',           null,                                                                                                   true,  6),
  ('clients',       'Medical congresses',  'Conferences We Work With',           '21 conferences & congresses',                                                                          true,  7),
  ('pricing',       'Pricing',             'Services Prices',                    null,                                                                                                   true,  8),
  ('addons',        'Add-on service',      'Website Creation',                   'Choose the type of website that fits your business.',                                                  true,  9),
  ('process',       'How it works',        'Our Process',                        null,                                                                                                   false, 10),
  ('testimonials',  'Testimonials',        'What Clients Say',                   null,                                                                                                   false, 11),
  ('team',          'Team',                'Meet the Team',                      null,                                                                                                   false, 12),
  ('faqs',          'FAQ',                 'Frequently Asked Questions',         null,                                                                                                   false, 13),
  ('contact',       'Get in touch',        'Let’s Build Something Great',        'Ready to get started? Reach out and we’ll tailor a plan for your brand.',                              true,  14)
) as v(key, eyebrow, title, subtitle, is_visible, display_order)
where not exists (select 1 from public.sections);

insert into public.navigation_items (label, link_type, target, location, display_order)
select * from (values
  ('About',    'section', 'about',        'both', 1),
  ('Services', 'section', 'services',     'both', 2),
  ('Work',     'section', 'case_studies', 'both', 3),
  ('Pricing',  'page',    'pricing.html', 'both', 4),
  ('Contact',  'section', 'contact',      'both', 5)
) as v(label, link_type, target, location, display_order)
where not exists (select 1 from public.navigation_items);

insert into public.hero (
  id, badge, headline, subheadline, description, media_type, media_url, media_alt,
  primary_cta_label, primary_cta_url, secondary_cta_label, secondary_cta_url,
  stat_value, stat_label, trust_statement
) values (
  1,
  'Abu Dhabi, UAE',
  'Social media management and custom content for clinics, brands and events.',
  'An Abu Dhabi marketing agency helping businesses grow, wherever they are in the world.',
  'We manage your social media accounts and create custom content that brings more patients through your clinic doors.',
  'image',
  'assets/img/hero.jpg',
  'Bilingual healthcare and aesthetics campaign designs created by October Growth',
  'Get started', '#contact',
  'View prices', 'pricing.html',
  '1.18M+', 'video views, filmed in-house',
  '20+ medical conferences covered'
) on conflict (id) do nothing;

insert into public.about (id, heading, body, mission, vision, image_url, image_alt)
values (
  1,
  'Who We Are',
  E'October Growth is an Abu Dhabi marketing agency helping businesses grow, wherever they are in the world.\n\nWe manage your social media accounts and create custom content that brings more patients through your clinic doors.\n\nTaking part in a conference or an event? We cover everything you do there and turn it into social stories, at competitive prices.',
  null,
  null,
  'assets/img/work-3.jpg',
  'Soft light treatment campaign design produced by October Growth'
) on conflict (id) do nothing;

insert into public.statistics (value, label, display_order)
select * from (values
  ('20+',     'Medical conferences',   1),
  ('1.18M+',  'Video views, in-house', 2),
  ('2',       'Flagship 2026 events',  3),
  ('EN · AR', 'Bilingual content',     4)
) as v(value, label, display_order)
where not exists (select 1 from public.statistics);

insert into public.why_choose_us (title, description, icon, display_order)
select * from (values
  ('Dedicated Manager', 'One named contact on every account.', 'user',  1),
  ('Custom Content',    'Never stock, never templated.',       'pen',   2),
  ('Bilingual EN / AR', 'Natural, patient-friendly Arabic.',   'type',  3)
) as v(title, description, icon, display_order)
where not exists (select 1 from public.why_choose_us);

insert into public.industries (name, description, icon, display_order)
select * from (values
  ('Clinics',
   'We manage your social media accounts and create custom content that brings more patients through your clinic doors.',
   'activity', 1),
  ('Brands',
   'Custom graphics, reels and stories built for each brand, with captions in natural English and simple Arabic.',
   'briefcase', 2),
  ('Events & Conferences',
   'Taking part in a conference or an event? We cover everything you do there and turn it into social stories, at competitive prices.',
   'calendar', 3)
) as v(name, description, icon, display_order)
where not exists (select 1 from public.industries);

insert into public.services (name, slug, short_description, description, icon, cta_label, cta_url, is_featured, status, display_order)
select * from (values
  ('Social Media Management', 'social-media-management',
   'Instagram, Facebook, X and LinkedIn, scheduled and managed.',
   E'Instagram, Facebook, X and LinkedIn, scheduled and managed.\n\nWe handle **scheduled and managed posts**, **written captions**, and **replies to patients through messages**.',
   'share', 'Get started', '#contact', true, 'published', 1),
  ('Content Creation', 'content-creation',
   'Custom graphics, reels and stories built for each brand.',
   E'Custom graphics, reels and stories built for each brand — content that builds trust and announces your discounts and news.\n\nNever stock, never templated.',
   'image', 'Get started', '#contact', true, 'published', 2),
  ('Caption Writing', 'caption-writing',
   'Natural English and simple Arabic.',
   E'Captions written in natural English and simple Arabic.\n\nBilingual EN / AR content with natural, patient-friendly Arabic.',
   'pen', 'Get started', '#contact', false, 'published', 3),
  ('Dedicated Account Manager', 'dedicated-account-manager',
   'One named point of contact on every account.',
   'One named point of contact on every account.',
   'user', 'Get started', '#contact', false, 'published', 4),
  ('Paid Ad Management', 'paid-ad-management',
   'Campaign setup, targeting and ongoing optimization.',
   'Campaign setup, targeting and ongoing optimization, with weekly reports.',
   'target', 'Get started', '#contact', true, 'published', 5),
  ('Influencer Coordination', 'influencer-coordination',
   'Sourcing, briefing and managing creator campaigns.',
   'Sourcing, briefing and managing creator campaigns.',
   'users', 'Get started', '#contact', false, 'published', 6),
  ('Performance Reporting', 'performance-reporting',
   'Monthly reach, engagement and growth reports.',
   'Monthly reach, engagement and growth reports.',
   'bar-chart', 'Get started', '#contact', false, 'published', 7),
  ('Event & Conference Coverage', 'event-conference-coverage',
   'Live social stories and reels from the floor.',
   E'Live social media coverage for medical conferences and major events.\n\nTaking part in a conference or an event? We cover everything you do there and turn it into social stories, at competitive prices.',
   'video', 'Get started', '#contact', true, 'published', 8),
  ('Website Creation', 'website-creation',
   'Portfolio, corporate and e-commerce websites.',
   'Choose the type of website that fits your business: portfolio, event or blog websites, business and corporate websites, or a full e-commerce store.',
   'monitor', 'Get started', '#contact', false, 'published', 9)
) as v(name, slug, short_description, description, icon, cta_label, cta_url, is_featured, status, display_order)
where not exists (select 1 from public.services);

insert into public.service_features (service_id, kind, title, description, display_order)
select s.id, v.kind, v.title, v.description, v.display_order
from (values
  ('social-media-management',   'feature',     'Instagram, Facebook, X and LinkedIn', null, 1),
  ('social-media-management',   'feature',     'Scheduled and managed posts', null, 2),
  ('social-media-management',   'feature',     'Written captions', null, 3),
  ('social-media-management',   'feature',     'Replies to patients through messages', null, 4),
  ('content-creation',          'feature',     'Custom graphics', null, 1),
  ('content-creation',          'feature',     'Reels', null, 2),
  ('content-creation',          'feature',     'Stories', null, 3),
  ('content-creation',          'benefit',     'Builds trust and announces your discounts and news', null, 4),
  ('caption-writing',           'feature',     'Natural English', null, 1),
  ('caption-writing',           'feature',     'Simple, patient-friendly Arabic', null, 2),
  ('dedicated-account-manager', 'benefit',     'One named point of contact on every account', null, 1),
  ('paid-ad-management',        'feature',     'Campaign setup', null, 1),
  ('paid-ad-management',        'feature',     'Targeting', null, 2),
  ('paid-ad-management',        'feature',     'Ongoing optimization', null, 3),
  ('paid-ad-management',        'deliverable', 'Weekly reports', null, 4),
  ('influencer-coordination',   'feature',     'Sourcing creators', null, 1),
  ('influencer-coordination',   'feature',     'Briefing', null, 2),
  ('influencer-coordination',   'feature',     'Managing creator campaigns', null, 3),
  ('performance-reporting',     'deliverable', 'Monthly reach, engagement and growth reports', null, 1),
  ('event-conference-coverage', 'feature',     'Live coverage', 'Real-time posts and stories from the floor', 1),
  ('event-conference-coverage', 'feature',     'Reels & highlights', 'Quick video from sessions and speakers', 2),
  ('event-conference-coverage', 'feature',     'Bilingual EN / AR', 'Captions written for both audiences', 3),
  ('event-conference-coverage', 'deliverable', 'Post-event recap', 'Wrap-up content to extend reach after the event', 4),
  ('website-creation',          'deliverable', 'Portfolio / Event / Blog websites', null, 1),
  ('website-creation',          'deliverable', 'Business / Corporate websites', null, 2),
  ('website-creation',          'deliverable', 'E-commerce stores', null, 3)
) as v(slug, kind, title, description, display_order)
join public.services s on s.slug = v.slug
where not exists (select 1 from public.service_features);

insert into public.pricing_packages (
  service_id, name, slug, short_description, price, currency, pricing_period, price_note, minimum_price,
  cta_label, cta_url, status, display_order
)
select s.id, v.name, v.slug, v.short_description, v.price, 'AED', v.pricing_period, v.price_note, v.minimum_price,
       'Get started', '#contact', 'published', v.display_order
from (values
  ('social-media-management', 'Social Media Management', 'social-media-management',
   'Instagram, Facebook, X and LinkedIn. Scheduled and managed posts, written captions, and replies to patients through messages.',
   890.00, 'monthly', null, null::numeric, 1),
  ('content-creation', 'Content Creation', 'content-creation',
   'Custom graphics, reels and stories that build trust and announce your discounts and news.',
   99.00, 'per_post', null, null::numeric, 2),
  ('paid-ad-management', 'Paid Ad Management', 'paid-ad-management',
   'Campaign setup, targeting and ongoing optimization, with weekly reports.',
   15.00, 'percentage', 'of the campaign budget', 5000.00, 3),
  ('event-conference-coverage', 'Event & Conference Coverage', 'event-conference-coverage',
   'Live social media coverage for medical conferences and major events.',
   100.00, 'per_hour', null, null::numeric, 4)
) as v(service_slug, name, slug, short_description, price, pricing_period, price_note, minimum_price, display_order)
join public.services s on s.slug = v.service_slug
where not exists (select 1 from public.pricing_packages);

insert into public.package_features (package_id, name, is_included, display_order)
select p.id, v.name, true, v.display_order
from (values
  ('social-media-management',   'Instagram, Facebook, X and LinkedIn', 1),
  ('social-media-management',   'Scheduled and managed posts', 2),
  ('social-media-management',   'Written captions', 3),
  ('social-media-management',   'Replies to patients through messages', 4),
  ('content-creation',          'Custom graphics', 1),
  ('content-creation',          'Reels and stories', 2),
  ('content-creation',          'Announcements for your discounts and news', 3),
  ('paid-ad-management',        'Campaign setup', 1),
  ('paid-ad-management',        'Targeting', 2),
  ('paid-ad-management',        'Ongoing optimization', 3),
  ('paid-ad-management',        'Weekly reports', 4),
  ('event-conference-coverage', 'Live posts and stories from the floor', 1),
  ('event-conference-coverage', 'Reels & highlights from sessions and speakers', 2),
  ('event-conference-coverage', 'Bilingual EN / AR captions', 3),
  ('event-conference-coverage', 'Post-event recap content', 4)
) as v(slug, name, display_order)
join public.pricing_packages p on p.slug = v.slug
where not exists (select 1 from public.package_features);

insert into public.addons (service_id, group_label, name, slug, description, price, currency, pricing_type, icon, cta_label, cta_url, status, display_order)
select s.id, 'Website Creation', v.name, v.slug, v.description, v.price, 'AED', 'fixed', v.icon, 'Get started', '#contact', 'published', v.display_order
from (values
  ('Portfolio / Event / Blog', 'website-portfolio-event-blog', 'Scope: page count, basic layout, contact forms.', 999.00, 'file', 1),
  ('Business / Corporate', 'website-business-corporate', 'Scope: content management system (CMS), custom branding, CRM sync.', 2999.00, 'briefcase', 2),
  ('E-commerce Store', 'website-ecommerce-store', 'Scope: product volume, UAE payment gateways (e.g., PayTabs), logistics APIs.', 7999.00, 'tag', 3)
) as v(name, slug, description, price, icon, display_order)
left join public.services s on s.slug = 'website-creation'
where not exists (select 1 from public.addons);

insert into public.clients (name, category, display_order)
select v.name, 'Medical conference', v.display_order
from (values
  ('The Future Child Black Book', 1),
  ('6th Abu Dhabi Brain Conference', 2),
  ('3rd Diabetes Education & Technology Conference', 3),
  ('Emirates Respiratory Infection Conference', 4),
  ('Emirates PH Congress 2026', 5),
  ('6th Dubai International Neurology Congress', 6),
  ('SIMC 2026 – Sakina Integrated Mental Health Conference', 7),
  ('Emirates Pediatric Pulmonary Conference', 8),
  ('9th A Day in Allergy & Respiratory Medicine', 9),
  ('3rd Al Ain Neurology Conference', 10),
  ('Magrabi Health Symposium: Advances in Ophthalmology', 11),
  ('1st Al Ain Region Pharmacy Conference', 12),
  ('Mind Bloom 1st Child Psychiatry & Neurology Conference', 13),
  ('Emirates Cerebrovascular & Stroke Forum 2025', 14),
  ('3rd Annual Diabetes & Endocrine Conference', 15),
  ('ETS Annual Congress 2025', 16),
  ('7th Emirates Multiple Sclerosis Forum 2025', 17),
  ('Abu Dhabi Neuroscience Milestones: Patient Forum', 18),
  ('1st International Specialty Pharmacy Conference', 19),
  ('5th Abu Dhabi Brain Conference', 20),
  ('2nd Diabetes Education Conference', 21)
) as v(name, display_order)
where not exists (select 1 from public.clients);

insert into public.case_studies (
  title, slug, short_description, content, cover_image_url, cover_image_alt, client_name,
  industry_id, results, platforms, is_featured, status, display_order
)
select v.title, v.slug, v.short_description, v.content, v.cover_image_url, v.cover_image_alt, v.client_name,
       i.id, v.results::jsonb, v.platforms::text[], v.is_featured, 'published', v.display_order
from (values
  ('Healthcare & Aesthetics Campaigns', 'healthcare-aesthetics-campaigns',
   'Healthcare and aesthetics campaigns, designed in English and Arabic to turn scrolls into bookings.',
   E'Healthcare and aesthetics campaigns, designed in **English and Arabic** to turn scrolls into bookings.\n\n> Design samples are creative work produced by the team for a healthcare client.',
   'assets/img/work-1.jpg', 'Carbon laser campaign design in English and Arabic',
   'Healthcare client', 'Clinics', '[{"value":"EN / AR","label":"Bilingual designs"}]', '{}', true, 1),
  ('Proven Video Performance', 'proven-video-performance',
   '1.18M+ combined views across four videos, filmed, captioned and edited in-house.',
   E'Four videos, **filmed, captioned and edited in-house**, reaching a combined 1.18M+ views.\n\n- 103K views\n- 182K views\n- 502K views\n- 392K views',
   'assets/img/video-3.jpg', 'Still from an in-house video produced by October Growth',
   null, null, '[{"value":"1.18M+","label":"Combined views"},{"value":"4","label":"Videos filmed, captioned & edited in-house"},{"value":"502K","label":"Views on the top video"}]', '{}', true, 2),
  ('LIVEX 2026', 'livex-2026',
   'Event social media coverage.',
   'Event social media coverage for **LIVEX 2026**.',
   null, null,
   'LIVEX 2026', 'Events & Conferences', '[]', '{}', false, 3),
  ('Abu Dhabi Book Fair 2026', 'abu-dhabi-book-fair-2026',
   'Event social media coverage. معرض أبوظبي للكتاب 2026',
   E'Event social media coverage for the **Abu Dhabi Book Fair 2026** (معرض أبوظبي للكتاب 2026).',
   null, null,
   'Abu Dhabi Book Fair 2026', 'Events & Conferences', '[]', '{}', false, 4)
) as v(title, slug, short_description, content, cover_image_url, cover_image_alt, client_name, industry_name, results, platforms, is_featured, display_order)
left join public.industries i on i.name = v.industry_name
where not exists (select 1 from public.case_studies);

insert into public.case_study_images (case_study_id, image_url, alt_text, caption, display_order)
select c.id, v.image_url, v.alt_text, v.caption, v.display_order
from (values
  ('healthcare-aesthetics-campaigns', 'assets/img/work-1.jpg', 'Carbon laser campaign design, 150 AED offer, English and Arabic', null, 1),
  ('healthcare-aesthetics-campaigns', 'assets/img/work-2.jpg', 'Whitening IV drip campaign design', null, 2),
  ('healthcare-aesthetics-campaigns', 'assets/img/work-3.jpg', 'Soft light treatment laser hair bleaching campaign design, 99 AED', null, 3),
  ('healthcare-aesthetics-campaigns', 'assets/img/work-4.jpg', 'Soft light treatment hair bleaching limited time offer design', null, 4),
  ('proven-video-performance', 'assets/img/video-1.jpg', 'Still from in-house video one', '103K views', 1),
  ('proven-video-performance', 'assets/img/video-2.jpg', 'Still from in-house video two', '182K views', 2),
  ('proven-video-performance', 'assets/img/video-3.jpg', 'Still from in-house video three', '502K views', 3),
  ('proven-video-performance', 'assets/img/video-4.jpg', 'Still from in-house video four', '392K views', 4)
) as v(slug, image_url, alt_text, caption, display_order)
join public.case_studies c on c.slug = v.slug
where not exists (select 1 from public.case_study_images);

insert into public.case_study_services (case_study_id, service_id)
select c.id, s.id
from (values
  ('healthcare-aesthetics-campaigns', 'content-creation'),
  ('healthcare-aesthetics-campaigns', 'caption-writing'),
  ('proven-video-performance', 'content-creation'),
  ('proven-video-performance', 'caption-writing'),
  ('livex-2026', 'event-conference-coverage'),
  ('abu-dhabi-book-fair-2026', 'event-conference-coverage')
) as v(case_slug, service_slug)
join public.case_studies c on c.slug = v.case_slug
join public.services s on s.slug = v.service_slug
where not exists (select 1 from public.case_study_services);

insert into public.documents (title, description, file_url, is_public, display_order)
select 'Agency Portfolio 2026', 'Our services, selected work and prices.', 'assets/docs/october-growth-portfolio.pdf', true, 1
where not exists (select 1 from public.documents);

-- ---------------------------------------------------------------------
-- 10. Register the admin (run AFTER creating the user in Authentication → Users)
-- ---------------------------------------------------------------------
-- insert into public.admin_users (user_id)
-- select id from auth.users where email = 'admin@example.com'
-- on conflict do nothing;
