# Portfolio CMS

A personal portfolio with an admin dashboard, built with **vanilla HTML, CSS and JavaScript (ES modules)** on top of **Supabase** (Database, Auth, Storage).

The public site has no hardcoded content. Text, images, links, section order and visibility all come from the database, and the owner edits them from `/admin` without touching code. There's no build step: the project is plain static files.

---

## Features

**Public site**

- Sections: Hero, About (Markdown + stats), Skills (by category, with optional proficiency), Experience / Education / Certifications timeline, Projects, Services, Testimonials, and Contact (details, social links and a working form)
- Project details page at `project.html?slug=…`, with Markdown content, tech tags, links and an image gallery lightbox
- Each section can be shown or hidden and reordered from the dashboard
- Title, meta description, Open Graph/Twitter tags, favicon and brand colour are set from the database
- Loading skeletons, plus friendly empty and error states
- Dark/light mode saved in `localStorage`, with no flash on load
- Scroll animations with `IntersectionObserver`, and animated stat counters and skill bars
- Accessibility: semantic landmarks, a skip link, keyboard navigation, visible focus states, alt text and `prefers-reduced-motion` support
- Images use `loading="lazy"`

**Admin dashboard (`/admin`)**

- Sign in with username (email) and password. Public sign-ups are disabled.
- Session check on every load, with automatic redirect to the login page
- Single-page app with hash routing: `#/overview`, `#/projects`, `#/skills`, and so on
- Full CRUD for every content type, with validated forms, toasts and delete confirmations
- Drag-and-drop reordering with the native HTML5 DnD API, plus touch and keyboard (↑/↓ on the handle) support
- Uploads to Supabase Storage with preview, replace and remove. File type and size are checked before upload, and unused files are cleaned up.
- Draft/published projects. Drafts never reach the public site.
- Markdown editor with a toolbar and live preview (custom parser with a strict allowlist)
- Messages inbox: read, mark read/unread, delete. An unread badge shows in the sidebar.
- Overview with counts for projects, total messages and unread messages
- Change-password page (asks for the current password again) and logout
- Responsive, including an off-canvas sidebar on mobile

---

## Folder structure

```
.
├── index.html                 Public home page
├── project.html               Project details page (?slug=…)
├── admin/
│   ├── login.html             Admin sign-in
│   └── index.html             Dashboard (single-page app)
├── css/
│   ├── base.css               Design tokens (light/dark), reset, typography, prose
│   ├── components.css         Buttons, forms, toasts, modals, skeletons, states…
│   ├── portfolio.css          Public site layout
│   └── dashboard.css          Dashboard + login layout
├── js/
│   ├── config.js              Supabase URL + public anon key (only)
│   ├── supabase-client.js     Shared client (supabase-js from the jsDelivr CDN)
│   ├── constants.js           Upload rules, limits, shared constants
│   ├── api.js                 Every database/storage call
│   ├── auth.js                Sign in/out, session guard, change password
│   ├── dom.js                 Safe DOM builder (textContent only), URL allowlist
│   ├── markdown.js            Tiny Markdown → DOM renderer (strict allowlist)
│   ├── ui.js                  Toasts, modals, confirm dialog, skeletons, states
│   ├── forms.js               Declarative form builder + validation + uploads
│   ├── dnd.js                 Sortable lists (HTML5 DnD + touch + keyboard)
│   ├── theme.js               Dark/light toggle
│   ├── theme-init.js          Applies the saved theme before first paint
│   ├── public/                main.js, project.js, sections.js, chrome.js, contact-form.js
│   └── admin/                 app.js (router), crud.js (shared list/singleton editors)
│                              and one module per section: overview, messages, sections,
│                              hero, about, experience, skills, projects, services,
│                              testimonials, contact, settings, account, login
├── setup.sql                  Tables, constraints, RLS, storage policies, seed data
├── _headers                   Security headers for Netlify
└── vercel.json                Security headers for Vercel
```

---

## Setup

### 1. Create a Supabase project

1. Sign in at [supabase.com](https://supabase.com) and click **New project**.
2. Choose a name, a strong database password and a region, then wait for the project to finish provisioning.

### 2. Run `setup.sql`

1. In the Supabase dashboard, open **SQL Editor → New query**.
2. Paste the whole contents of [`setup.sql`](setup.sql) and click **Run**.

The script creates:

- all content tables, with `NOT NULL`, `CHECK` and length constraints that match the client-side validation
- `updated_at` triggers
- the `admins` table and the `is_admin()` helper
- Row Level Security policies on every table
- a `reorder_items()` function for drag-and-drop ordering
- a public `portfolio` storage bucket (10 MB limit, images and PDF only) with admin-only write policies
- realistic sample content

The script is idempotent. You can run it again safely: it won't duplicate content.

### 3. Disable public sign-ups

Go to **Authentication → Sign In / Providers** (called **Providers → Email** in older dashboards) and turn **off** "Allow new users to sign up". Leave the Email provider itself enabled so the admin can still sign in.

### 4. Create the admin user

1. Go to **Authentication → Users → Add user → Create new user**.
2. Enter the admin email (this is the login username) and a strong password, and tick **Auto Confirm User**.
3. Register the user as an admin. In the SQL Editor, run:

   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com'
   on conflict do nothing;
   ```

Only users listed in `public.admins` get write access. Even if a sign-up were somehow created, that account couldn't change anything.

### 5. Add your URL and anon key to `js/config.js`

In **Project Settings → API** (or **Data API**), copy the **Project URL** and the **anon / public** key into [`js/config.js`](js/config.js):

```js
export const SUPABASE_URL = 'https://abcdefghijklmno.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi…';
```

> ⚠️ Only use the **anon** key. **Never** put the `service_role` key in any frontend file. The anon key is safe to publish because every table and the storage bucket are protected by RLS.

### 6. Run locally

ES modules don't load over `file://`, so serve the folder over HTTP. Any static server works:

```bash
# Python 3
python3 -m http.server 8080

# or Node.js
npx serve .
```

Then open:

- Public site: <http://localhost:8080/>
- Dashboard: <http://localhost:8080/admin/> (redirects to the login page)

### 7. Deploy

No build step is needed. Deploy the repository root as static files.

**Netlify**
1. **Add new site → Import an existing project** (or drag and drop the folder onto the Netlify dashboard).
2. Leave the build command empty, and set the publish directory to `/` (the repository root).
3. `_headers` adds security headers automatically.

**Vercel**
1. **Add New → Project** and import the repository.
2. Set the framework preset to **Other**, and leave the build command and output directory empty.
3. `vercel.json` adds security headers automatically.

**GitHub Pages**
1. Push the repository to GitHub.
2. Go to **Settings → Pages → Build and deployment**, choose **Deploy from a branch**, and pick your branch with the `/ (root)` folder.
3. The site is served at `https://<user>.github.io/<repo>/`. All paths are relative, so it works from a sub-path.

After deploying, set **Authentication → URL Configuration → Site URL** in Supabase to your live URL.

---

## Using the dashboard

| Page | What you manage |
| --- | --- |
| Overview | Counts (projects, messages, unread), recent messages, quick links |
| Messages | Contact form inbox: open, mark read/unread, delete, reply by email |
| Sections | Show/hide and drag to reorder page sections; menu labels, headings, subheadings |
| Hero | Status line, name, headline, bio, photo, CTA buttons (label + link + style), CV PDF |
| About | Markdown text, image, stats (value + label) |
| Experience & Education | Timeline entries (experience, education, certification) with dates and Markdown |
| Skills | Categories and skills (icon, optional proficiency 0–100) |
| Projects | Title, slug, category, summary, Markdown content, cover, gallery, tags, links, featured, draft/published |
| Services | Title, icon, description |
| Testimonials | Name, role, photo, quote |
| Contact | Email, phone, location, intro, form on/off, social links |
| Site settings | Site title, logo, favicon, brand colour, SEO title/description, Open Graph image, footer |
| Account | Change password |

Every list item has a visibility toggle and a drag handle. You can also reorder with the keyboard: focus the handle and press ↑ or ↓.

### Markdown syntax

`# Heading`, `**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, fenced code blocks, `- lists`, `1. lists`, `> quotes`, `[links](https://…)`, `![images](https://…)` and `---`. Raw HTML is displayed as text, never executed.

---

## Security model

- **RLS is the real protection.** Hiding admin pages in JavaScript is only a UX convenience. The rules are:
  - Anyone can **read** visible rows (`is_visible = true`), published projects (`status = 'published'`), the settings, hero, about and contact rows, and the section list.
  - Anyone can **insert** a contact message, but only as unread, and never read messages back.
  - Only admins (users in `public.admins`) can **create, update or delete** content, **read** hidden rows and drafts, and **read, update or delete** messages.
- **Storage:** the `portfolio` bucket is publicly readable. Only admins can upload, replace or delete files. The bucket itself enforces a 10 MB limit and an image/PDF MIME allowlist. SVG is rejected because it can carry scripts.
- **Rendering:** all database content is inserted with `textContent` or `setAttribute` through `js/dom.js`, and the code never uses `innerHTML`. Links go through a protocol allowlist (`http`, `https`, `mailto`, `tel`, anchors and relative paths). The Markdown renderer builds DOM nodes directly from a tag/attribute allowlist.
- **Validation:** forms validate on the client, and the same rules are enforced by `CHECK` constraints in the database.
- **Content Security Policy:** every page ships a CSP `<meta>` tag. It allows scripts only from the site itself and `cdn.jsdelivr.net`, and connections only to `*.supabase.co`. It has no inline scripts or styles.
- **Contact form abuse:** a honeypot field plus a per-browser cooldown. For stronger protection, enable [Supabase Auth CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha) or add an Edge Function with rate limiting.
- **Password changes** ask for the current password again first.

---

## Troubleshooting

- **"Almost there — add your Supabase project URL…"**: `js/config.js` still has the placeholder values.
- **Blank page or module errors in the console**: you opened the file directly (`file://`). Use a local server (see step 6).
- **"This account does not have admin access"**: the user isn't registered in `public.admins`. Run the SQL from step 4.
- **Uploads fail with 403**: the user isn't an admin, or `setup.sql` wasn't run completely (storage policies).
- **Custom Supabase domain**: add it to `connect-src` in the CSP `<meta>` tag of the four HTML files.
- **Sections missing on the public site**: check that the section and its items are visible, and that projects are published.
