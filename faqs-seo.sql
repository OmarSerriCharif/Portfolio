-- =====================================================================
--  SEO FAQs for October Growth
--  Every answer uses only facts from the Agency Portfolio 2026 PDF.
--  Run once in Supabase → SQL Editor. Safe to re-run: existing questions
--  are skipped. Edit or reorder them later in the dashboard (#/faqs).
-- =====================================================================

insert into public.faqs (question, answer, status, is_visible, display_order)
select v.question, v.answer, 'published', true, v.display_order
from (values
  (1,
   $q$What does October Growth do?$q$,
   $a$October Growth is an Abu Dhabi marketing agency offering **social media management and custom content for clinics, brands and events**. We manage your social media accounts, create custom graphics, reels and stories, write captions in English and Arabic, run paid ads, coordinate influencer campaigns, cover conferences and events live, and build websites.$a$),

  (2,
   $q$Where is October Growth based, and do you work with clients outside the UAE?$q$,
   $a$We are based in **Abu Dhabi, UAE**, and we help businesses grow wherever they are in the world.$a$),

  (3,
   $q$Which social media platforms do you manage?$q$,
   $a$We manage **Instagram, Facebook, X and LinkedIn**. That includes scheduled and managed posts, written captions, and replies to patients through messages.$a$),

  (4,
   $q$How much does social media management cost in Abu Dhabi?$q$,
   $a$Social media management costs **AED 890 per month**. It covers Instagram, Facebook, X and LinkedIn, with scheduled and managed posts, written captions, and replies to patients through messages.$a$),

  (5,
   $q$How much does social media content creation cost?$q$,
   $a$Content creation costs **AED 99 per post**. Every post is custom: graphics, reels and stories built for your brand to build trust and announce your discounts and news. Never stock, never templated.$a$),

  (6,
   $q$How much does paid ad management cost?$q$,
   $a$Paid ad management is **15% of the campaign budget, with a minimum of AED 5,000**. It includes campaign setup, targeting, ongoing optimization and weekly reports.$a$),

  (7,
   $q$Do you offer social media coverage for medical conferences and events?$q$,
   $a$Yes. Event and conference coverage costs **AED 100 per hour** and includes:

- Live coverage: real-time posts and stories from the floor
- Reels and highlights: quick video from sessions and speakers
- Bilingual captions in English and Arabic
- Post-event recap content to extend your reach after the event

We have worked with 20+ medical conferences and congresses, and covered LIVEX 2026 and the Abu Dhabi Book Fair 2026.$a$),

  (8,
   $q$Do you create content in Arabic?$q$,
   $a$Yes. All our content can be **bilingual, English and Arabic**. We write captions in natural English and simple, patient-friendly Arabic, so your posts speak to both audiences.$a$),

  (9,
   $q$Do you work with clinics and healthcare brands?$q$,
   $a$Yes. We manage social media for clinics and create custom content that brings more patients through your clinic doors. Our healthcare and aesthetics campaigns are designed in English and Arabic to turn scrolls into bookings.$a$),

  (10,
   $q$Will I have a dedicated account manager?$q$,
   $a$Yes. Every account has **one named point of contact**: a dedicated manager who looks after your account.$a$),

  (11,
   $q$Do you build websites, and how much do they cost?$q$,
   $a$Yes. Choose the type of website that fits your business:

- **Portfolio / Event / Blog: AED 999.** Scope: page count, basic layout, contact forms.
- **Business / Corporate: AED 2,999.** Scope: content management system (CMS), custom branding, CRM sync.
- **E-commerce Store: AED 7,999.** Scope: product volume, UAE payment gateways (e.g., PayTabs), logistics APIs.$a$),

  (12,
   $q$Do you offer influencer marketing?$q$,
   $a$Yes. Our influencer coordination service covers **sourcing, briefing and managing creator campaigns** for your brand.$a$),

  (13,
   $q$Will I receive performance reports?$q$,
   $a$Yes. We provide **monthly reach, engagement and growth reports**. Paid ad campaigns also come with weekly reports.$a$),

  (14,
   $q$Do you film and edit videos in-house?$q$,
   $a$Yes. Our videos are filmed, captioned and edited in-house. Four of our videos reached a combined **1.18M+ views** (103K, 182K, 392K and 502K views).$a$),

  (15,
   $q$How do I get started with October Growth?$q$,
   $a$Reach out and we'll tailor a plan for your brand. Call **+971 56 461 1101**, email **octgrowth@gmail.com**, or send us a message using the contact form on this page.$a$)
) as v(display_order, question, answer)
where not exists (select 1 from public.faqs f where f.question = v.question);

-- Show the FAQ section on the website.
update public.sections
set is_visible = true,
    eyebrow    = coalesce(eyebrow, 'FAQ'),
    title      = coalesce(title, 'Frequently Asked Questions')
where key = 'faqs';
