# LSH Lien Negotiator Training

The Lien Negotiator program, set up the way the Case Management course (`Case-Management-Training`) is: its own Cloudflare Worker, opened from the LSH Training Portal with single sign-on, trainee records in the shared `LSH_KV` namespace under a prefix of its own, and the LSH standard page style.

## What's in it

| Part | Slide deck (Canva) | Recorded session (Google Drive) |
|---|---|---|
| **Part 1: The Lien Negotiator Role, Pt. 1** | [34 slides](https://www.canva.com/design/DAGthtOQUg4/8AoCnBiC8yWJGOM_zLUXjg/view) | [Video](https://drive.google.com/file/d/1rmdqifC5m_3c9FYDZkrzsUampVKmUMaY/view) |
| **Part 2: The Lien Negotiator Role, Pt. 2** (ERISA liens: basics, process, key risks) | [72 slides](https://www.canva.com/design/DAHabx7BhKE/BPidIfAISKJuol56ntSmZg/view) | [Video](https://drive.google.com/file/d/1sUjQCpEqkrvf802Ck23aajx4Z2ox8zgE/view) |

- **🏠 Dashboard:** the trainee's progress across the parts (the same hero, progress track and module cards as the CM dashboard), with *Start* / *Continue* on the next part.
- **One page per part:** the Canva deck and the recorded session, embedded side by side as two tabs (**🎞 Slide deck** / **▶ Recorded session**), each with *Open in a new tab*. A part always opens on its slides. The trainee checks off *I went through the slide deck* and *I watched the recorded session*; with both checked the part is complete.
- **🛡 Admin:** every trainee who has opened the course, their batch, each part's status and when they were last active, with *Remove access* / *Restore access*; and **Course links**, to replace a part's deck or video without a deploy.

| File | What it is |
|---|---|
| `js/ln-course.js` | **The course content.** The parts, in order: title, summary, Canva deck link, Drive video link. Add a part by adding an entry. |
| `index.html` | The page: the dashboard, the part pages and Admin, and the hooks `js/portal-gate.js` expects of an engine. |
| `js/portal-gate.js` | The Portal sign-in screen. **The same file as in every LSH course repo** (copied from Case-Management-Training); change it in all of them. |
| `worker.js` | The Worker: the CM Worker's sign-in (tokens, admin password, Portal tickets, Batch IDs) unchanged, plus progress storage and the automatic Time In. |
| `wrangler.json` | The Worker's name (`liennegotiatortraining`) and its `LSH_KV` binding. |

## 🔐 Sign in on the Main Portal only

The same as the CM course. Trainees sign in once, on the LSH Training Portal, and open this program from there. The Portal sends them here with a signed, short-lived ticket (`?ticket=…`); `js/portal-gate.js` posts it to `/api/auth/portal`, and the Worker signs the trainee in and approves them (the Portal's approval is the only trainee approval). Someone who opens this site's link directly gets the *Admin* sign-in, where an admin types the admin password (`MASTER_ADMIN_PASSWORD`); a name + batch typed here is refused (403 `portal-required`).

- **Turning it on:** set `PORTAL_SSO_SECRET` (the same value as the Portal) and `MASTER_ADMIN_PASSWORD` as Worker secrets. Until `PORTAL_SSO_SECRET` is set, the sign-in screen tells an admin so, and no trainee can be signed in.
- **If a Portal launch fails:** the message says why: `bad-signature` means the Portal's and this Worker's `PORTAL_SSO_SECRET` differ; "expired" means the link is old (open the program again from the Portal).

## What's saved

Everything is in `LSH_KV` under the **`ln:`** prefix, so it never mixes with the CM (`cm:`) or EA/PA records in the same namespace.

- `trainee:<id>`: the trainee (the same id as every LSH course: name + Batch ID), `approved`, `lastActive`, and **`dayProgress`**, one entry per part, keyed by the part's `day` in `js/ln-course.js`: `{ "1": { deck, video, done, doneAt } }`. This is the field the Portal's progress and attendance pages read for the other courses. A trainee can update their own record but never its approval.
- `checkin:<date>:<id>`: the automatic Time In on a trainee's first visit of the day (the same as the CM course).
- `settings:course`: the admin's replacement deck/video addresses (Admin → Course links).

## ✍️ Editing the course

- **Change a deck or video:** Admin → **Course links**, paste the new address, **Save course links**. It takes effect at once, no deploy. Leave a box blank to go back to the address in `js/ln-course.js`. To change it for good, edit `js/ln-course.js`.
- **Add a part:** add an entry to `modules` in `js/ln-course.js` with a new `id` and the next `day`. Never reuse or renumber an `id` or `day`: progress is saved against them.
- **Deck links:** use the Canva **view** link (`https://www.canva.com/design/<id>/<token>/view`). The page embeds it as `…/view?embed`. A `canva.link/…` short link opens the editor (`/edit`), so don't use it here: the checks refuse an `/edit` link.
- **Video links:** the Drive file link (`https://drive.google.com/file/d/<id>/view`); the page embeds it as `…/preview`. The file has to be shared with the trainees (the legalsupporthelp.com Workspace, or *anyone with the link*), or the player asks them to sign in.

## Checks (GitHub Actions)

`.github/workflows/checks.yml` runs on every pull request and every push to `main`:

- **Syntax and files** (`.github/scripts/check-site.mjs`): every JavaScript file and inline `<script>` parses, every local file `index.html` loads exists, and every part has a Canva deck and a Drive video the page can embed (and no editor link).
- **Single sign-on and storage rules** (`.github/scripts/sso.cjs`): a Portal ticket signs a trainee in and approves them; a ticket with another secret (`signature`) or out of date (`expired`) is refused; an admin ticket works once; a name + batch typed here is refused; a missing `PORTAL_SSO_SECRET` says so; a trainee writes their own progress but never their approval, and reads and lists nobody else's records; every key is under `ln:`.
- **The Worker builds** (`wrangler deploy --dry-run`; nothing is deployed).
- **Smoke test in a browser** (`.github/scripts/smoke.cjs`): serves the site through `worker.js` with an in-memory KV store (`.github/scripts/server.mjs`); a trainee from the Portal lands on the dashboard and the opening cover is lifted; each part shows its deck and video; checking both off completes the part and survives a reload; the admin password opens Admin with the trainees listed; every view at desktop and phone width, with no page error and no sideways scroll.

To run them locally:

```bash
node .github/scripts/check-site.mjs && node .github/scripts/sso.cjs
```

```bash
MASTER_ADMIN_PASSWORD=ci-admin PORTAL_SSO_SECRET=ci-portal node .github/scripts/server.mjs 8787 &
node .github/scripts/smoke.cjs http://localhost:8787/
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
- `functions/api/program-progress.js` (`PROGRAMS`), for progress: `{ id: 'ln', label: 'Lien Negotiator Training', prefix: 'ln:', days: 2, url: 'https://liennegotiatortraining.legalsupporthelp.workers.dev/' }`

## 🎨 The standard page style

The LSH standard, shared with the Training Portal and the other programs: the block at the end of the `<style>` in `index.html`, marked **"The LSH standard page style"**, is a vendored copy of the CM course's (and the Portal's `theme.css`, the source of truth). Change it there first, then copy it down. Each program keeps its own backdrop photo in its own `body::before`; this program uses a soft navy-and-orange wash until it has a photo (put a `background-image` on `body::before` near the top of the `<style>`).
