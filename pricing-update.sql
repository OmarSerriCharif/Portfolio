-- =====================================================================
--  Pricing update
--  • "Starting from" before every price (packages and add-ons)
--  • Content Creation: AED 99 is for image posts only (reels not included)
--  • New offer: Social Media Management + 10 image posts, AED 1,900 / month
--  • FAQ answers updated to match
--  Run once in Supabase → SQL Editor. Safe to re-run.
-- =====================================================================

-- 1. "Text before the price" field, editable per package / add-on in the dashboard
alter table public.pricing_packages add column if not exists price_prefix text check (char_length(price_prefix) <= 40);
alter table public.addons           add column if not exists price_prefix text check (char_length(price_prefix) <= 40);

update public.pricing_packages set price_prefix = 'Starting from' where price_prefix is null;
update public.addons           set price_prefix = 'Starting from' where price_prefix is null;

-- 2. Content Creation price covers image posts only
update public.pricing_packages
set short_description = 'Custom image posts that build trust and announce your discounts and news. Reels are not included.',
    price_note        = 'image posts only'
where slug = 'content-creation';

delete from public.package_features
where package_id = (select id from public.pricing_packages where slug = 'content-creation');

insert into public.package_features (package_id, name, is_included, display_order)
select p.id, v.name, v.is_included, v.display_order
from public.pricing_packages p
cross join (values
  ('Custom image post designs',                 true,  1),
  ('Announcements for your discounts and news', true,  2),
  ('Reels',                                     false, 3)
) as v(name, is_included, display_order)
where p.slug = 'content-creation';

-- 3. New offer: Social Media Management + 10 image posts
insert into public.pricing_packages (
  service_id, name, slug, short_description, price, currency, pricing_period, price_prefix,
  badge, is_popular, is_featured, cta_label, cta_url, status, is_visible, display_order
)
select s.id,
       'Social Media Management + 10 Posts',
       'social-media-management-10-posts',
       'Monthly social media management plus 10 custom image posts.',
       1900, 'AED', 'monthly', 'Starting from',
       'Special offer', true, true, 'Get the offer', '#contact', 'published', true, 0
from (select 1) as one
left join public.services s on s.slug = 'social-media-management'
where not exists (select 1 from public.pricing_packages where slug = 'social-media-management-10-posts');

insert into public.package_features (package_id, name, quantity, is_included, display_order)
select p.id, v.name, v.quantity, true, v.display_order
from public.pricing_packages p
cross join (values
  ('Instagram, Facebook, X and LinkedIn',  null, 1),
  ('Scheduled and managed posts',          null, 2),
  ('Written captions',                     null, 3),
  ('Replies to patients through messages', null, 4),
  ('Custom image posts',                   '10 posts per month', 5)
) as v(name, quantity, display_order)
where p.slug = 'social-media-management-10-posts'
  and not exists (select 1 from public.package_features f where f.package_id = p.id);

-- 4. FAQ answers (only changes the FAQs added by faqs-seo.sql)
update public.faqs set answer = $a$Social media management starts from **AED 890 per month**. It covers Instagram, Facebook, X and LinkedIn, with scheduled and managed posts, written captions, and replies to patients through messages.

Special offer: social media management **plus 10 custom image posts**, starting from **AED 1,900 per month**.$a$
where question = $q$How much does social media management cost in Abu Dhabi?$q$;

update public.faqs set answer = $a$Content creation starts from **AED 99 per image post**. Every post is a custom image design built for your brand to build trust and announce your discounts and news. Never stock, never templated. Reels are not included in this price; contact us for a quote.$a$
where question = $q$How much does social media content creation cost?$q$;

update public.faqs set answer = $a$Paid ad management starts from **15% of the campaign budget, with a minimum of AED 5,000**. It includes campaign setup, targeting, ongoing optimization and weekly reports.$a$
where question = $q$How much does paid ad management cost?$q$;

update public.faqs set answer = $a$Yes. Event and conference coverage starts from **AED 100 per hour** and includes:

- Live coverage: real-time posts and stories from the floor
- Reels and highlights: quick video from sessions and speakers
- Bilingual captions in English and Arabic
- Post-event recap content to extend your reach after the event

We have worked with 20+ medical conferences and congresses, and covered LIVEX 2026 and the Abu Dhabi Book Fair 2026.$a$
where question = $q$Do you offer social media coverage for medical conferences and events?$q$;

update public.faqs set answer = $a$Yes. Choose the type of website that fits your business:

- **Portfolio / Event / Blog: starting from AED 999.** Scope: page count, basic layout, contact forms.
- **Business / Corporate: starting from AED 2,999.** Scope: content management system (CMS), custom branding, CRM sync.
- **E-commerce Store: starting from AED 7,999.** Scope: product volume, UAE payment gateways (e.g., PayTabs), logistics APIs.$a$
where question = $q$Do you build websites, and how much do they cost?$q$;
