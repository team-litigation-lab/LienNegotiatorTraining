# LSH Lien Negotiator Training

The Lien Negotiator program, set up the way the Case Management course (`Case-Management-Training`) is: its own Cloudflare Worker, opened from the LSH Training Portal with single sign-on, trainee records in the shared `LSH_KV` namespace under a prefix of its own, and the LSH standard page style.

## What's in it

In the CM course's format: **Day cards** on the dashboard → the day's **Objectives** page → the day's **steps**, played one at a time.

| Day | Theme | Module 1: Slide Deck (Canva) | Module 2: Recorded Session (Google Drive) |
|---|---|---|---|
| **Day 1 · The Lien Negotiator Role, Pt. 1** | Liens, Lien Holders & Reductions (9 topics) | [34 slides](https://www.canva.com/design/DAGthtOQUg4/8AoCnBiC8yWJGOM_zLUXjg/view) | [Video](https://drive.google.com/file/d/1rmdqifC5m_3c9FYDZkrzsUampVKmUMaY/view) |
| **Day 2 · The Lien Negotiator Role, Pt. 2** | ERISA & Government Plan Liens (10 topics) | [72 slides](https://www.canva.com/design/DAHabx7BhKE/BPidIfAISKJuol56ntSmZg/view) | [Video](https://drive.google.com/file/d/1sUjQCpEqkrvf802Ck23aajx4Z2ox8zgE/view) |
| **Day 3 · Process Questions, Live Demo & Shadowing** | Releases, Net Sheets & Closing Statements (12 modules) | [Exercise](https://www.canva.com/design/DAGva6b4Q_Q/sJk9AIQaiwaxO__NlgPplA/view) | 8 videos, each embedded in full (below) |

- **Dashboard:** the CM banner (the completion ribbon, *Lien Negotiation Accelerator*, the workshop title, and **▶ Continue where you left off** once a day is started; no Roadmap button), then one Day card per day, drawn like the CM course's: *Day n · title* in the head, the day's icon and theme pill, **Start** / **Continue** / **Review**, and **☰ Topics** (the day's outline, with the slides each topic covers).
- **Objectives page** (the CM day page): *🎯 By the end of today you'll be able to …*, *📘 The Lesson* outline in two columns, *🧭 Today's Modules*, and **← Dashboard** / **Start Day n →**.
- **The day's steps** (the CM lesson player): a stage with the step's title, banner and chip, **← Previous · 🗺 Slide Map · Step n of N · Next →** under it (← → keys too), and the side panel (the day, **📋 Objectives**, **⛶ Full screen**). The steps are **Training Agenda** (the theme, objectives and numbered topics) → **Module 1 · Slide Deck** (the Canva deck) → **Module 2 · Recorded Session** (the Drive video) → **Day Complete**. Every step fits on one screen. A module counts as done once the trainee moves on from it with Next; the day is done when they reach Day Complete with both modules done. A trainee who leaves mid-day continues from the same step.
- **🛡 Admin:** every trainee who has opened the course, their batch, each day's status (modules done), when they were last active, with *Remove access* / *Restore access*; and **Course links**, to replace a module's deck or video without a deploy.

Days 1 and 2's objectives and topics were written from the decks' own slides (their section headings, with slide numbers).

**Day 3** (the Foundational schedule's *Day 18: Lien Negotiator Training*) is a day of activities, each its own step:

| Part | Module(s) |
|---|---|
| AM · Answering Process Questions | **📄 Digital Handouts** (Required Documents, Settlement Resistance, Settlement Release, Net Sheet, Closing Statement, each opened in an embedded viewer) · **✍️ Process Questions** (all 12, the five ★ Core ones marked; each answered in a box that saves to the trainee's account, with *Copy all answers* for the named document) · **Exercise** (Canva) |
| Live Demo | **▶ Tutorial Demo Recording** (Drafting and Sending Reduction Request and Closing Statement) · **🧭 Demo Guide** (the reference folders, NPI lookup, naming conventions, subject lines, and the two letter templates with Copy buttons) |
| PM · Shadowing and Training Video Viewing | **▶** Reduction & Disbursement Training · Lien Negotiator Recording · Kenneth, September 27 |
| Materials for Additional Reference | **▶** Kenneth, September 28 · Discussion with Kenneth · Lien Negotiator Recording of Gilda Marie Anagap · Bill, August 25, with William Allanigue (more in Tagalog) |

Every video is embedded in full (its own step, a full-size Drive player).

- **Trainer notes** (the facilitator's notes: which five questions to use when time is short, what to send in the GC and when, the shadow buddy, the demo activity files) show in the side panel **to a trainer only**. This page and this repository are public, so the **demo answer keys are deliberately not in it**; the checks refuse an answer key in `js/ln-course.js`. Keep them with the trainers.
- **Trainees' answers** are in `progress:<id>` (`{ answers: { "d3-questions": [ … ] } }`); Admin → Trainees → **✍️ Answers** shows them.
- The sample letter in the Demo Guide is signed with placeholders rather than a staff member's name, email and phone number.

| File | What it is |
|---|---|
| `js/ln-course.js` | **The course content.** The days, in order: title, theme, objectives, topics (with slides), and the modules (a Canva deck or a Drive video). |
| `index.html` | The page: the Day cards, the Objectives page, the day's player and Admin, and the hooks `js/portal-gate.js` expects of an engine. |
| `js/portal-gate.js` | The Portal sign-in screen. **The same file as in every LSH course repo** (copied from Case-Management-Training); change it in all of them. |
| `worker.js` | The Worker: the CM Worker's sign-in (tokens, admin password, Portal tickets, Batch IDs) unchanged, plus progress storage and the automatic Time In. |
| `wrangler.json` | The Worker's name (`liennegotiatortraining`) and its `LSH_KV` binding. |

## 🗂 The Lien Desk (the case activity, Days 2 and 3)

Each trainee works one settled case, step by step like the demo (`js/ln-desk.js`, the cases in `js/ln-desk-cases.js`): **Case File** (crisp documents on LSH Law Firm letterhead: the release(s), the settlement letter, itemized bills and ledgers, the PIP log, lien notices and payoff letters, the cost ledger, the retainer), **Email** (an inbox with scripted replies: the trainer returns the fully executed release; providers send corrected bills and answer reduction requests, approving, countering below their floor, or waiving; a funding company won't reduce; the client returns the signed closing statement; a missing name or DOL, or a wrong subject line, gets a realistic reply), **Net Sheet** (the firm's NET SETTLEMENT CALCULATIONS: settlement, atty fees, expense log, medical bills with PIP / Med / Health payments, adjustments, balance owed, agreed reduction and max offer, non-medical liens, total net settlement), and **Drafts** (the firm's **BILL REDUCTION REQUEST** letter and **SETTLEMENT CLOSING STATEMENT AND INSTRUCTION FOR DISTRIBUTION**, with the naming conventions checked).

- **Day 2:** download the Settlement Release(s) → email them to the trainer → the fully executed release comes back (or the trainer uploads a real one: Admin → 🗂 Lien Desk) → the initial Net Sheet, each balance squared with the PIP log → the Reduction Request(s), ready to send.
- **Day 3:** request updated bills and payoffs → send the Reduction Requests → finalize the Net Sheet with the agreed amounts → the Closing Statement (it must match the Net Sheet exactly) → send it with the Settlement Release Form(s) to the client → the client signs.

**12 cases.** Three are the original activities, rewritten (new names, LSH Law Firm, every scanned document recreated), with their figures checked against the answer keys:

| Case | From | The original's figures |
|---|---|---|
| **John Doe** (& Mary Doe, spouse) | the demo's case (Activity 1.2 and the closing statement activity) | Colonnade $7,858.13 → $700, Shreeve MRI $743.65 → $250, MediVista $168.55 → waived; net $5,024.19 before the two liens added |
| **Jane Doe** | Activity 1.1 | 40% fee; Brightcare $8,653.84 → $500, HighView MRI $2,018.26 → $900, Good Hope $66.65 → waived; net $4,144.81 before the two liens added |
| **James Doe** | Activity 2 | BI $10,000 + UM $25,000; PIP exhausted; Spinewell, Allied and Triad Lakes squared with the PIP log; Pagewood's bill went to the deductible |

and nine more from the CM course's mock PI cases (Sarah Miller, David Chen, Elena Rodriguez, Mark Thompson, Gladys Winslow, JT Taylor, Sophie Vane, Robert Lee, Bradley Peterson). Every case has a health subrogation lien and a pre-settlement funding lien. Provider and insurer names are made up, and every email address ends in `.example`. The answer keys themselves are not in this public repository.

## 🔐 Sign in on the Main Portal only

The same as the CM course. Trainees sign in once, on the LSH Training Portal, and open this program from there. The Portal sends them here with a signed, short-lived ticket (`?ticket=…`); `js/portal-gate.js` posts it to `/api/auth/portal`, and the Worker signs the trainee in and approves them (the Portal's approval is the only trainee approval). Someone who opens this site's link directly gets the *Admin* sign-in, where an admin types the admin password (`MASTER_ADMIN_PASSWORD`); a name + batch typed here is refused (403 `portal-required`).

- **Turning it on:** set `PORTAL_SSO_SECRET` (the same value as the Portal) and `MASTER_ADMIN_PASSWORD` as Worker secrets. Until `PORTAL_SSO_SECRET` is set, the sign-in screen tells an admin so, and no trainee can be signed in.
- **If a Portal launch fails:** the message says why: `bad-signature` means the Portal's and this Worker's `PORTAL_SSO_SECRET` differ; "expired" means the link is old (open the program again from the Portal).

## What's saved

Everything is in `LSH_KV` under the **`ln:`** prefix, so it never mixes with the CM (`cm:`) or EA/PA records in the same namespace.

- `trainee:<id>`: the trainee (the same id as every LSH course: name + Batch ID), `approved`, `lastActive`, and **`dayProgress`**, one entry per day: `{ "1": { done, doneAt, step, modules: { "d1-deck": true, … } } }` (`step` is where they left off in the day). This is the field the Portal's progress and attendance pages read for the other courses. A trainee can update their own record but never its approval.
- `checkin:<date>:<id>`: the automatic Time In on a trainee's first visit of the day (the same as the CM course).
- `settings:course`: the admin's replacement addresses, by module id: `{ "d1-deck": { link } }` (Admin → Course links).

## ✍️ Editing the course

- **Change a deck or video:** Admin → **Course links**, paste the new address next to the module, **Save course links**. It takes effect at once, no deploy. Leave a box blank to go back to the address in `js/ln-course.js`. To change it for good, edit `js/ln-course.js`.
- **Objectives and topics:** each day's `objectives` and `topics` (`{ h, slides }`) in `js/ln-course.js`. Keep the topics in step with the deck when it changes.
- **Add a module or a day:** add a module (`id`, `kind` `"deck"` or `"video"`, `title`, `link`) to a day's `modules`, or a new day (`day`, `title`, `theme`, `icon`, `objectives`, `topics`, `modules`) to `days`. Never reuse or renumber a module `id` or a `day`: progress is saved against them. (A trainee who had already finished that day still counts as done on the Portal until they mark a module on it.)
- **Deck links:** use the Canva **view** link (`https://www.canva.com/design/<id>/<token>/view`). The page embeds it as `…/view?embed`. A `canva.link/…` short link opens the editor (`/edit`), so don't use it here: the checks refuse an `/edit` link.
- **Video links:** the Drive file link (`https://drive.google.com/file/d/<id>/view`); the page embeds it as `…/preview`. The file has to be shared with the trainees (the legalsupporthelp.com Workspace, or *anyone with the link*), or the player asks them to sign in.

## Checks (GitHub Actions)

`.github/workflows/checks.yml` runs on every pull request and every push to `main`:

- **Syntax and files** (`.github/scripts/check-site.mjs`): every JavaScript file and inline `<script>` parses, every local file `index.html` loads exists, and every day has a theme, objectives, topics and modules, every module id is unique, and every module is a Canva deck or Drive video the page can embed (and no editor link).
- **Single sign-on and storage rules** (`.github/scripts/sso.cjs`): a Portal ticket signs a trainee in and approves them; a ticket with another secret (`signature`) or out of date (`expired`) is refused; an admin ticket works once; a name + batch typed here is refused; a missing `PORTAL_SSO_SECRET` says so; a trainee writes their own progress but never their approval, and reads and lists nobody else's records; every key is under `ln:`.
- **The Worker builds** (`wrangler deploy --dry-run`; nothing is deployed).
- **Smoke test in a browser** (`.github/scripts/smoke.cjs`): serves the site through `worker.js` with an in-memory KV store (`.github/scripts/server.mjs`); a trainee from the Portal lands on the Day cards and the opening cover is lifted; ☰ Topics lists the day's outline; Day card → Objectives → Start plays the Training Agenda, each module's deck or video and Day Complete; finishing the steps completes the day and survives a reload; the Slide Map jumps to a step; the admin password opens Admin with the trainees listed; every view at desktop and phone width, with no page error and no sideways scroll.
- **Every step fits on one screen** (`.github/scripts/fit.cjs`): at 1366×768, 1920×1080 and 1280×720 each day's Objectives page ends with its Start bar inside the window, and every step ends with its Previous / Next bar inside the window (the same rule as the CM course's `fit.cjs`).

To run them locally:

```bash
node .github/scripts/check-site.mjs && node .github/scripts/sso.cjs
```

```bash
MASTER_ADMIN_PASSWORD=ci-admin PORTAL_SSO_SECRET=ci-portal node .github/scripts/server.mjs 8787 &
node .github/scripts/smoke.cjs http://localhost:8787/ && node .github/scripts/fit.cjs http://localhost:8787/
```

## Deploy (Cloudflare Workers)

This repository is its own Worker, the same as the CM course.

1. In Cloudflare → Workers & Pages → Create → import this repository (leave the root directory as the repository root). The Worker is `liennegotiatortraining` (the name in `wrangler.json` must match the Worker name in Cloudflare), so the course is at `https://liennegotiatortraining.legalsupporthelp.workers.dev`.
2. KV: the Worker binds the same `LSH_KV` namespace as the CM course; every key is under `ln:`.
3. Secrets (Settings → Variables and Secrets):
   - `MASTER_ADMIN_PASSWORD`: admin sign-in (the LSH Training Portal's master admin password). Setting it switches on secure mode. Without it the Worker runs in open mode (anyone is an admin), for setting up only.
   - `PORTAL_SSO_SECRET`: the Portal sign-in secret (the same value as the Portal's).
   - `SESSION_SECRET`: optional.
4. `/version` shows the deployed build and whether both secrets are set.

`.assetsignore` keeps `worker.js`, `wrangler.json`, the Markdown files and `.github/` out of the published site.

### On the Training Portal (Training-Portal repo)

The Portal already lists **Lien Negotiator Training** (`LIEN NEGOTIATION`). To open this site from it, add its address next to the other programs':

- `functions/api/launch.js` and `programs.html`: `'LIEN NEGOTIATION': 'https://liennegotiatortraining.legalsupporthelp.workers.dev/'`
- `functions/api/program-progress.js` (`PROGRAMS`), for progress: `{ id: 'ln', label: 'Lien Negotiator Training', prefix: 'ln:', days: 3, url: 'https://liennegotiatortraining.legalsupporthelp.workers.dev/' }`

## 🎨 The standard page style

The LSH standard, shared with the Training Portal and the other programs: the block at the end of the `<style>` in `index.html`, marked **"The LSH standard page style"**, is a vendored copy of the CM course's (and the Portal's `theme.css`, the source of truth). Change it there first, then copy it down. Each program keeps its own backdrop photo in its own `body::before`; this program uses a soft navy-and-orange wash until it has a photo (put a `background-image` on `body::before` near the top of the `<style>`).
