# FlatMatch

Three flatmates each fill in their flat requirements **privately**. FlatMatch shows the 2–3 flats that fit all three, with a clear breakdown of what each person **gets** ✅ and **gives up** ⚠️.

FlatMatch doesn't pick the flat. It filters and explains, so the group argues about *which tradeoff to make*, not *whether a place even qualifies*.

## The problem

Riya, Meera and Kavita (Pune) spent four months looking for a shared 3BHK and shortlisted nothing. Every listing died in the WhatsApp group one objection at a time, usually after someone had already fallen for it:

- **Kavita**: her commute to Hinjewadi must be short. A Baner flat at 45 min each way was a no.
- **Riya**: must be within 20 min of her gym and family (Aundh). Kothrud, across town, was a no.
- **Meera**: has a knee condition, so a high floor with no lift is a hard no.

The fix is to collect everyone's constraints up front and privately (which avoids anchoring, defensiveness and guilt), then check every listing against all of them at once.

## How it works

1. **Group setup**: the coordinator creates a group and gets a link plus a 6-character code to share on WhatsApp. There are three member slots with editable names and no login.
2. **Private forms**: each member picks her name and fills in her budget, no-go areas, key places with a max commute, dealbreakers (lift, parking, bathrooms, pets, furnishing) and weighted nice-to-haves.
3. **Status page**: shows ✓ submitted or waiting for each person, never their answers.
4. **Results** unlock automatically once the third member submits.

### The matching logic (`lib/matching.ts`)

It is fully deterministic: no LLM and no randomness, so the same inputs always give the same output.

| Step | What happens |
|---|---|
| **0. Bedrooms** | Only listings with at least one bedroom per person are considered. |
| **1. Hard filter** | A listing is dropped if it breaks **any** member's dealbreaker: rent ÷ 3 above her max, an excluded area, a commute over her limit to any key place, no lift above the floor she can manage, or missing parking, bathrooms, pet-friendliness or furnishing she requires. |
| **2. Score** | Each survivor gets a 0–100 fit score per person: 70% weighted nice-to-haves met (semi-furnished earns half credit) and 30% slack, meaning how far under her budget and commute limits it is. Commutes at ≥85% of the limit and rent at ≥90% of the budget are shown as ⚠️ compromises. |
| **3. Fairness** | Group score = mean personal score − 0.5 × (max − min). A flat where one person carries all the compromises ranks below a balanced one, even if its average is higher. The shortlist is picked greedily with a penalty when the same person would again be the worst-off, so one person isn't always the one giving things up. Each card shows a fairness badge: *Balanced*, *Somewhat uneven* or *Uneven*. |
| **4. Near misses** | Listings that fail exactly **one** constraint are listed with whose constraint it is and by how much, e.g. *"fails Riya's 20-min limit to Gym & family (Aundh) by 4 min"*. They are sorted by closeness and try to name a different person each time. If fewer than 2 flats pass, they become the main suggestion; otherwise they sit in a collapsible "Nearly made it" section. |
| **Conflicts** | A "Where you conflict" summary lists the areas that work for everyone, pairs whose area and commute limits barely overlap (*"Riya's gym & family commute and Kavita's office commute overlap in only 3 areas: Balewadi, Pashan, Pimple Saudagar"*), the budget cap set by the lowest budget, and each person's most restrictive dealbreaker. |

### What's automated vs. what the humans decide

| Automated | Humans decide |
|---|---|
| Rejecting flats that break anyone's dealbreaker | Which of the 2–3 flats to visit or take |
| Per-person gets/compromises, with numbers | Which compromises are acceptable, and to whom |
| Fairness indicator and conflict summary | Whether someone relaxes a constraint (see near misses) |
| (Optional) Gemini paragraph summarising tradeoffs, told to stay neutral | Everything that matters beyond the data: the vibe, the landlord, the light |

### Gemini (optional)

Gemini is used only for:

- **Explain tradeoffs**: one neutral paragraph per shortlisted flat, written from the server's own match results. The system prompt forbids recommending or picking a flat and forbids inventing details.
- **Paste a listing**: turns raw listing text into structured fields, which the user reviews before saving.

Without `GEMINI_API_KEY` the app works fully and those buttons are hidden.

### Stand-ins for external APIs

- **Listings** (`lib/listings.ts`): 99acres and MagicBricks have no open API, so v1 uses 26 seeded mock Pune listings plus listings members add. Everything goes through the `ListingSource` interface, so a real property API can plug in there.
- **Commute** (`lib/commute.ts`): a hand-built peak-hour travel-time matrix between 16 Pune areas. The `CommuteProvider` interface is synchronous and deterministic. To use Google Maps Distance Matrix, fetch the matrix for the relevant areas once and serve `minutes()` from that cache.

## Tech

Next.js 14 (App Router) + TypeScript + Tailwind CSS · Supabase Postgres via `@supabase/supabase-js` · Gemini via `@google/generative-ai` · Vitest.

All database access happens in server routes using the service-role key. RLS is enabled with no policies, so the public anon key can read nothing. Answers only leave the server once all three members have submitted. After submitting, a member's browser holds an edit token, so nobody else who picks her name can see or change her answers.

```
app/                   pages + API routes (app/api/**)
components/            UI
lib/matching.ts        the matching engine (+ matching.test.ts)
lib/commute.ts         travel-time matrix
lib/listings.ts        listing source interface
lib/seed-listings.ts   mock listings (source of truth for the SQL seed)
lib/sample-group.ts    Riya / Meera / Kavita demo answers
lib/store.ts           storage interface + in-memory fallback
lib/supabase-store.ts  Supabase implementation
supabase/schema.sql    tables, RLS, seed listings
```

## Run locally

Requires Node 18.17+ (Node 20+ recommended).

```bash
npm install
cp .env.example .env.local   # then fill in values (see below)
npm run dev                  # http://localhost:3000
npm test                     # Vitest
npm run build
```

**No Supabase yet?** The app still runs. It falls back to in-memory storage (a yellow banner says so) and data is lost on restart. That's fine for trying it out, but not for deploying.

Click **"Load sample group (Riya, Meera, Kavita)"** on the home page to see results immediately.

## Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → **New query**, paste all of `supabase/schema.sql`, and click **Run**. This creates the tables, locks them down with RLS and seeds the listings. It's safe to re-run.
3. Go to **Project Settings → API** (or **Data API** / **API Keys**) and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **service_role** secret key → `SUPABASE_SERVICE_ROLE_KEY`
4. Put both in `.env.local` and restart `npm run dev`. The yellow "demo storage" banner should disappear.

If you edit `lib/seed-listings.ts`, run `npm run seed:sql` to regenerate the seed block in `schema.sql` (a test checks they match).

## Environment variables

| Name | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes (for persistence) | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | yes (for persistence) | **Server-only.** Never prefix with `NEXT_PUBLIC_`, and never commit it. |
| `GEMINI_API_KEY` | optional | Enables "Explain tradeoffs" and "Paste listing" |
| `GEMINI_MODEL` | optional | Defaults to `gemini-flash-latest` (always the current Flash model) |

`.env*` files are git-ignored except `.env.example`.

## Deploy (Vercel)

Import the GitHub repo in Vercel, add the env vars above before the first deploy, then click Deploy. Every push to `main` redeploys.

## Credits

Background video and photo (`public/videos/city-sunset.mp4`, and its first frame `city-sunset-poster.jpg`): "Scenic sunset view over city river skyline" from [Pexels](https://www.pexels.com/video/scenic-sunset-view-over-city-river-skyline-38697718/), free to use under the Pexels licence. It plays at half speed. Visitors with reduced-motion or data-saver turned on see the photo instead of the video.

Desktop background photo (`public/images/pune-aerial.jpg`): aerial view of Pune from [Pexels](https://www.pexels.com/photo/aerial-photography-of-buildings-under-blue-sky-and-clouds-5972982/), free to use under the Pexels licence. It's only loaded on screens 1024px and wider.
