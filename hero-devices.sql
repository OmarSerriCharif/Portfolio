-- =====================================================================
--  Laptop + phone mockup for the hero section.
--  Run once in Supabase → SQL Editor (safe to re-run).
--  Afterwards upload your own screen images in the dashboard → Hero.
-- =====================================================================

alter table public.hero add column if not exists phone_image_url text check (public.is_safe_url(phone_image_url));
alter table public.hero add column if not exists phone_image_alt text check (char_length(phone_image_alt) <= 200);
alter table public.hero drop constraint if exists hero_media_type_check;
alter table public.hero add constraint hero_media_type_check check (media_type in ('none', 'image', 'video', 'devices'));

-- Switch the hero to the mockup, with starter screens from the portfolio PDF
-- (only replaces the original seed image, never an image you uploaded).
update public.hero
set media_type      = 'devices',
    media_url       = case when media_url is null or media_url = 'assets/img/hero.jpg' then 'assets/img/og-image.jpg' else media_url end,
    media_alt       = case when media_url is null or media_url = 'assets/img/hero.jpg' then 'October Growth agency portfolio shown on a laptop' else media_alt end,
    phone_image_url = coalesce(phone_image_url, 'assets/img/work-1.jpg'),
    phone_image_alt = coalesce(phone_image_alt, 'Carbon laser campaign design shown on a phone')
where id = 1;
