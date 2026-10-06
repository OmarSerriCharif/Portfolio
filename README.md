# October Growth — company website + Supabase CMS

A fully dynamic company website with a secure admin dashboard, built with **plain HTML, CSS and JavaScript (ES modules)**. There are no frameworks and no build step. All content lives in **Supabase** (Database, Auth and Storage) and is edited from `/admin/`.

The seed data in `setup.sql` comes from the *October Growth — Agency Portfolio 2026* PDF: services, prices, add-ons, conferences, projects, statistics and contact details. Anything the PDF does not contain is left empty rather than made up. That covers testimonials, team, FAQs, mission/vision, business hours and social links. The matching sections ship **hidden** until you add real content.

---

## Folder structure

```
/
├── index.html              Homepage (sections rendered in the order set in the dashboard)
├── service.html            Service details  → service.html?slug=…
├── pricing.html            Pricing packages, add-ons, FAQs, contact
├── case-study.html         Project details  → case-study.html?slug=…
├── admin/
│   ├── login.html          Admin sign-in (Supabase Auth, email + password)
│   └── index.html          Dashboard (hash routing: #/overview, #/services, …)
├── css/
│   ├── base.css            Tokens, light/dark themes, reset, typography
│   ├── components.css      Buttons, cards, forms, skeletons, dialogs, toasts, accordion
│   ├── company.css         Public site layout and sections
│   └── dashboard.css       Admin layout, lists, editors, inbox, login
├── js/
│   ├── config.js           Supabase URL + anon key (the only file you edit)
│   ├── api.js              Supabase client and data helpers
│   ├── auth.js             Login, session check, logout, change/reset password
│   ├── main.js             Public bootstrap: branding, theme, SEO, header, footer, states
│   ├── utils.js            Safe DOM builder, URL/email/phone validation, formatting
│   ├── markdown.js         Strict Markdown → DOM renderer (no HTML strings)
│   ├── icons.js            Inline SVG icon set
│   ├── theme-init.js       Applies saved theme/brand colours before first paint
│   ├── public/
│   │   ├── home.js         Homepage orchestrator
│   │   ├── sections.js     Hero, about, why-us, industries, process, clients, testimonials, team, FAQ
│   │   ├── services.js     Service cards + service page
│   │   ├── pricing.js      Packages, features, add-ons + pricing page
│   │   ├── case-study.js   Project cards + case-study page
│   │   └── contact.js      Contact details + lead form
│   └── admin/
│       ├── dashboard.js    Auth guard, layout, router
│       ├── login.js        Login page logic
│       ├── ui.js           Toasts, dialogs, confirmations, states
│       ├── fields.js       Form builder, validation, uploads, Markdown editor
│       ├── crud.js         Generic list/edit/reorder/publish manager
│       ├── common.js       Shared field definitions
│       ├── overview.js     Live counts
│       ├── settings.js     Site settings, social links, documents
│       ├── sections.js     Section order/visibility/headings
│       ├── navigation.js   Header/footer links
│       ├── hero.js         Hero content + element order
│       ├── about.js        About, statistics, values
│       ├── services.js     Services + features/benefits/deliverables
│       ├── pricing.js      Pricing packages
│       ├── packages.js     Package features
│       ├── addons.js       Add-ons
│       ├── industries.js   Industries
│       ├── why-choose-us.js
│       ├── process.js
│       ├── case-studies.js Case studies + gallery + linked services
│       ├── clients.js      Clients / conferences
│       ├── testimonials.js
│       ├── team.js
│       ├── faqs.js
│       ├── messages.js     Lead inbox
│       └── users.js        Account + change password
├── assets/
│   ├── img/                Logo, favicon, OG image and creative extracted from the PDF
│   └── docs/               The agency portfolio PDF (downloadable from the site)
├── setup.sql               Schema, constraints, triggers, RLS, storage, seed data
├── netlify.toml            Netlify config with security headers
├── vercel.json             Vercel config with security headers
└── .nojekyll               Lets GitHub Pages serve every file as-is
```

---

## 1. Create the Supabase project

1. Go to <https://supabase.com>, sign in and click **New project**.
2. Choose an organisation, a name, a strong database password (store it in a password manager; it is never used by the website) and a region close to your visitors (e.g. *Middle East* or *Europe*).
3. Wait until the project has finished provisioning.

## 2. Open the SQL Editor

In the project, open **SQL Editor** in the left sidebar and click **New query**.

## 3. Run `setup.sql`

1. Open `setup.sql` from this project, copy **all** of it, paste it into the editor and click **Run**.
2. It creates all tables, constraints, indexes, `updated_at` triggers, the reorder function, Row Level Security policies, the `media` and `documents` storage buckets with their policies, and the seed data.
3. The schema part is safe to re-run. Seed rows are only inserted into empty tables.

## 4. Create the admin account

1. Go to **Authentication → Users → Add user → Create new user**.
2. Enter the admin's **email** (it is the username) and a strong password, and tick **Auto Confirm User**.
3. Go back to the **SQL Editor** and register that user as an admin (replace the email):

   ```sql
   insert into public.admin_users (user_id)
   select id from auth.users where email = 'admin@yourcompany.com'
   on conflict do nothing;
   ```

Only users listed in `admin_users` can change anything. A signed-in user who is not in that table gets the same read-only access as any visitor. To remove an admin, `delete from public.admin_users where user_id = '…';`.

## 5. Disable public sign-ups

**Authentication → Sign In / Providers** (older dashboards: *Authentication → Providers / Settings*):

- Turn **off** “Allow new users to sign up”.
- Keep the **Email** provider enabled (needed for password login).
- Disable any other providers you don't use.

## 6. Configure authentication

**Authentication → URL Configuration:**

- **Site URL**: your live URL, e.g. `https://www.yourdomain.com`
- **Redirect URLs**: add `https://www.yourdomain.com/admin/login.html` (and `http://localhost:8080/admin/login.html` for local testing). The *Forgot password?* link sends users there.

Optional but recommended: under **Authentication → Policies / Passwords**, set a minimum password length of 10. Under **Rate limits**, keep the defaults.

## 7 & 8. Add the Supabase URL and anon key to `config.js`

Go to **Project Settings → API** (or **Data API / API Keys**) and copy:

- **Project URL**, e.g. `https://abcdefghijkl.supabase.co`
- the **anon / publishable** key (public)

Edit `js/config.js`:

```js
export const SUPABASE_URL = "https://abcdefghijkl.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOi…";
```

The anon key is designed to be public. Every permission is enforced by Row Level Security in the database. **Never** put the `service_role` key, database password or any other secret in this project.

## 9. Configure Storage

`setup.sql` already created two **public** buckets:

| Bucket      | Used for                                               | Server limit                          |
|-------------|--------------------------------------------------------|---------------------------------------|
| `media`     | Logo, favicon, OG image, hero media, all content images | 25 MB, PNG/JPEG/WebP/GIF/ICO/MP4/WebM |
| `documents` | PDFs (company profile, portfolio…)                     | 20 MB, PDF                            |

Only admins can upload, replace, list or delete files (storage policies on `storage.objects`). Anyone can view a file **if they have its URL**, which is what lets images and PDFs show on the public site. Don't upload confidential files.

The dashboard also checks file type, extension and size before uploading (images 5 MB, favicon 1 MB, video 25 MB, PDF 20 MB). You can check the buckets under **Storage**.

## 10. Run locally

ES modules need to be served over HTTP (opening the files directly with `file://` won't work):

```bash
# from the project folder, any static server works
python3 -m http.server 8080
# or
npx serve -l 8080 .
```

Then open:

- Website: <http://localhost:8080/>
- Dashboard: <http://localhost:8080/admin/login.html>

## 11. Deploy to Netlify

1. Push this folder to a Git repository (GitHub/GitLab/Bitbucket).
2. In Netlify, choose **Add new site → Import an existing project** and pick the repo.
3. Build command: *(leave empty)*. Publish directory: `.`
4. Deploy. `netlify.toml` adds security headers (CSP, frame protection, no-index for `/admin/`).
5. Add the Netlify URL (or your custom domain) to the Supabase **Site URL / Redirect URLs** (step 6).

Or drag-and-drop the folder onto <https://app.netlify.com/drop>.

## 12. Deploy to Vercel

1. In Vercel, click **Add New → Project** and import the repo.
2. Framework preset: **Other**. Build command: *(none)*. Output directory: `.`
3. Deploy. `vercel.json` adds the same security headers.
4. Add the Vercel URL to Supabase **Site URL / Redirect URLs**.

## 13. Deploy to GitHub Pages

1. Push the project to a GitHub repository.
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, choose your branch and `/ (root)`, then save.
3. The site will be at `https://<user>.github.io/<repo>/`. All paths are relative, so sub-folders work.
4. Add that URL (plus `/admin/login.html`) to Supabase **Redirect URLs**.

GitHub Pages can't set custom security headers. If you need the CSP headers, use Netlify or Vercel.

After deploying, set **Site settings → Canonical base URL** in the dashboard to your live domain so canonical and Open Graph URLs point to it.

---

## Using the dashboard

| Route                  | What you manage                                                                                       |
|------------------------|-------------------------------------------------------------------------------------------------------|
| `#/overview`           | Live counts: services, packages, add-ons, case studies, testimonials, leads, unread, published, drafts |
| `#/messages`           | Lead inbox: read/unread, status (New → Contacted → Qualified → Converted → Closed), notes, delete       |
| `#/settings`           | Company info, contact, logo/favicon, brand colours, default theme, SEO, footer, social links, documents |
| `#/sections`           | Homepage section order (drag & drop), visibility, eyebrow/heading/intro text                          |
| `#/navigation`         | Header/footer links to sections, pages or external URLs                                               |
| `#/hero`               | Hero text, CTAs, statistic, trust line, image/video, element order & visibility                        |
| `#/about`              | Company description, mission, vision, image, statistics, values                                       |
| `#/services`           | Services (+ features, benefits, deliverables via **Features**)                                       |
| `#/pricing`            | Pricing packages (+ their features via **Features**)                                                  |
| `#/package-features`   | All package features with a package filter; reassign features between packages                       |
| `#/addons`             | Add-ons / optional services, grouped by *Group*                                                       |
| `#/case-studies`       | Projects, results, platforms, linked services, gallery (via **Gallery**)                              |
| `#/clients`            | Clients / conferences list                                                                           |
| `#/testimonials`, `#/team`, `#/faqs`, `#/industries`, `#/why-choose-us`, `#/process` | Respective content |
| `#/change-password`    | Account info and password change (re-authenticates with the current password)                        |

- **Reorder**: drag rows by the handle. On touch screens or with a keyboard, use the ▲/▼ buttons.
- **Draft vs hidden**: *Draft* content is never served to visitors (enforced by RLS). *Hidden* rows are kept but not shown.
- **Markdown** (long descriptions, FAQ answers, case-study content): `# heading`, `**bold**`, `*italic*`, `[link](https://…)`, `- list`, `1. list`, `> quote`. A live preview is shown next to the editor. Raw HTML is shown as plain text, never rendered.
- **Links/CTAs** accept `#contact` (section on the current page), `pricing.html`, `service.html?slug=…`, `https://…`, `mailto:` and `tel:`. `javascript:` and `data:` URLs are rejected by both the form and the database.
- **Copyright** text supports `{year}`.

## Security model

- **Row Level Security** is enabled on every table.
  - Visitors (`anon`) can only `SELECT` published + visible rows. Child rows (features, gallery images) are only readable when their parent is published.
  - Visitors can `INSERT` contact messages and nothing else. A trigger forces `status = 'new'`, `is_read = false` and empty notes, and allows at most 3 messages per email per 10 minutes.
  - Only users listed in `admin_users` (checked by the `is_admin()` function) can insert, update, delete, reorder or read leads.
- **Storage**: only admins can write to the `media` and `documents` buckets, which only accept the listed MIME types and sizes.
- **Database constraints** mirror the form validation: lengths, slugs, hex colours, currency codes, prices ≥ 0, percentages ≤ 100, safe URLs, email and phone formats.
- **No unsafe HTML**: all database content is inserted with `textContent` / `createElement`, and Markdown is converted straight into DOM nodes with a strict allow-list.
- The frontend only contains the public anon key. The dashboard's client-side checks are for convenience; the database enforces the rules.

## Content notes from the PDF

- Prices: Social Media Management **AED 890 / month**, Content Creation **AED 99 / post**, Paid Ad Management **15 % of the campaign budget (minimum AED 5,000)**, Event & Conference Coverage **AED 100 / hour**.
- Add-on (Website Creation): Portfolio / Event / Blog **AED 999**, Business / Corporate **AED 2,999**, E-commerce Store **AED 7,999**. The PDF does not state a billing period, so they are shown as plain prices.
- No package is marked “Most popular” because the PDF doesn't name one. Set it in **Pricing** if you want one.
- Contact: +971 56 461 1101 · octgrowth@gmail.com · Abu Dhabi, UAE.
