# SpentWise

A personal expense tracker. Next.js 16 (App Router) + Supabase, styled to
Material 3 and built to install as a PWA on iOS.

- **Home** — what this month cost, budget left, recent transactions
- **Add** — one screen, four taps: amount → category → date → save
- **Reports** — budget meter, category share, per-category breakdown
- **Settings** — name, currency, budgets, categories, sign out

---

## 1. Set up Supabase

Everything below is on the **free tier**. No paid add-on is needed.

### 1.1 Create the project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Pick an organisation, name the project (`spentwise`), and **save the database
   password somewhere** — it's shown once.
3. Choose the region closest to you. This is the single biggest factor in how
   fast the app feels, and it can't be changed later.
4. Wait ~2 minutes for provisioning.

### 1.2 Create the tables

1. In the dashboard, open **SQL Editor** → **New query**.
2. Paste the entire contents of [`supabase/schema.sql`](supabase/schema.sql).
3. Click **Run**.

That creates `profiles`, `categories` and `expenses`, turns on Row Level
Security with per-user policies, adds the `category_totals()` reporting
function, and installs a trigger that gives every new account a profile plus
six starter categories. The script is idempotent — re-running it is safe.

Check it worked: **Table Editor** should list the three tables, each showing
**RLS enabled**.

### 1.3 Configure auth

**Authentication → Sign In / Providers → Email**

- Make sure **Email** is enabled.
- **Confirm email** — your call:
  - **Off** (suggested while you're the only user): you sign up and are
    straight in. Simpler, and it sidesteps the free-tier email limit below.
  - **On**: Supabase emails a confirmation link. The app handles this — it
    shows a "check your inbox" notice, and `/auth/callback` completes the
    sign-in when the link is opened.

> **Free-tier email limit:** the built-in SMTP sends only a handful of messages
> per hour and is explicitly not meant for production. If you keep
> confirmations on and hit the cap, either wait it out or add your own SMTP
> under **Project Settings → Authentication → SMTP Settings** (Resend, Brevo
> and Mailgun all have free tiers).

**Authentication → URL Configuration**

- **Site URL:** `http://localhost:3000` for now; change it to your real domain
  after deploying.
- **Redirect URLs:** add both, so confirmation links work in either place:
  - `http://localhost:3000/auth/callback`
  - `https://your-domain.com/auth/callback`

### 1.4 Copy the keys

**Project Settings → API Keys**, then in the project root:

```bash
cp .env.local.example .env.local
```

Fill in:

| Variable | Where it comes from |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL, e.g. `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | The **anon** / **publishable** key |

Both are `NEXT_PUBLIC_` on purpose — they ship to the browser, which is fine,
because RLS is what actually protects the data. **Never** put the
`service_role` / secret key in this file; it bypasses RLS entirely and nothing
here needs it.

---

## 2. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>, create an account, and add an expense.

```bash
npm run build && npm start   # production build
npm run lint                 # eslint (Next.js 16 removed `next lint`)
npm run icons                # regenerate app icons after a brand change
```

---

## 3. Deploy

Any Node host works. On Vercel:

1. Push the repo and import it.
2. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under
   **Settings → Environment Variables**.
3. Deploy.
4. Go back to Supabase → **Authentication → URL Configuration**, set the
   **Site URL** to your deployed domain, and add
   `https://your-domain.com/auth/callback` to **Redirect URLs**.

A real HTTPS domain matters here: iOS will not install a PWA, and will not
register a service worker, over plain HTTP. `localhost` is the one exception.

---

## 4. Install on iPhone

Service workers and "Add to Home Screen" both need HTTPS, so do this against
the deployed URL, not your laptop's IP.

1. Open the site in **Safari** (Chrome on iOS can't install PWAs).
2. Tap **Share** → **Add to Home Screen** → **Add**.
3. Launch it from the home screen icon.

It then runs with no browser chrome, keeps its own session, and shows an
offline notice instead of Safari's error page when the connection drops. The
Settings screen repeats these steps and hides them once you're installed.

What's been done for iOS specifically:

- `viewport-fit=cover` plus `env(safe-area-inset-*)` padding, so content clears
  the notch and the home indicator
- every text input is 16px, which is what stops Safari zooming on focus
- `user-scalable=no` and `overscroll-behavior: none` to kill the rubber-band
- `apple-mobile-web-app-capable` and a 180×180 apple-touch-icon
- 48px+ touch targets, and primary actions kept in the lower two-thirds

---

## Free-tier things worth knowing

| Limit | What it means here |
|---|---|
| **Pauses after ~7 days of no activity** | The project sleeps and the app returns connection errors. Un-pause from the dashboard (takes a minute). Opening the app regularly avoids it. |
| **500 MB database** | An expense row is roughly 100 bytes. You'd need well over a million entries to notice. |
| **50,000 monthly active users** | Not a concern for a personal app. |
| **2 active projects per organisation** | Worth knowing before you spin up a staging copy. |
| **Built-in SMTP is rate-limited** | See 1.3. Turning off email confirmation is the simplest fix for personal use. |
| **No automatic backups on free** | The data is small — periodically export from the Table Editor if it matters to you. |

Every query is scoped to the signed-in user and grouped in Postgres where
possible (`category_totals()`), which keeps payloads small enough that the free
tier's bandwidth allowance never comes into play.

---

## How it's put together

```
app/
  layout.tsx              root shell — fonts, PWA metadata, viewport
  manifest.ts             web app manifest
  page.tsx                / → /home
  login/                  sign in + sign up (server actions)
  auth/callback/          exchanges the email link for a session
  (app)/
    layout.tsx            signed-in shell with the bottom nav
    home/                 dashboard
    add/                  add expense + its server actions
    expenses/             full month list, with delete
    reports/              budget meter, share, breakdown
    settings/             profile, categories, sign out
components/               icon, nav, app bar, rows, chart, forms
lib/
  supabase/server.ts      SSR client + requireUser()
  queries.ts              every read, server-only
  categories.ts           the validated category palette
  format.ts               currency + date formatting
proxy.ts                  session refresh + route guarding
supabase/schema.sql       tables, RLS, functions, triggers
scripts/generate-icons.mjs
```

**Auth is checked in three places** — `proxy.ts` for routing, `requireUser()`
in every page, and again inside every Server Action. The last one is the one
that matters: Server Actions are reachable by direct POST, so a proxy matcher
alone would not protect them.

**Next.js 16 notes.** This version renamed `middleware` to `proxy`, made
`cookies()` / `params` / `searchParams` async, defaults to Turbopack, and
dropped `next lint`. The code follows all four — read
`node_modules/next/dist/docs/` before changing framework-level files.

### The category palette

The five category colours (`lib/categories.ts`) were validated against the
`#f8f9ff` surface for colourblind separation, chroma, lightness and contrast —
worst adjacent pair is ΔE 11.7 under deuteranopia and ΔE 16.5 with normal
vision. Grey is reserved for "Other" and for expenses whose category was
deleted.

If you change them, re-run that check rather than eyeballing it, and keep every
chart direct-labelled so identity never depends on colour alone.

### Why the reports screen isn't a donut

The mockups showed a donut for category share; this uses a horizontal stacked
bar instead. At phone width it keeps long category names readable, compares
lengths along one axis rather than by angle, and needs no centre label. Say the
word if you'd rather have the donut back — the data shape is identical.
