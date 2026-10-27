# Study Abroad Money Tracker — Full Specification & Build Prompt

> **How to use this document:** Everything below is written so any AI coding
> agent (Claude Code, Cursor, ChatGPT, etc.) can read it top-to-bottom and
> build the entire app with no other context needed. Section 10 is the
> ready-to-paste prompt — copy that block into your AI coding tool of choice
> to kick off the build. Sections 1–9 are the reference spec the prompt
> points back to.

---

## 1. What this app is

A **single-user, local-only** personal finance tracker for a student studying
abroad, funded partly by an education loan (in INR) and partly by a
part-time job (paid in GBP), with tuition due in GBP-equivalent terms. It
replaces: a notes app for spending, a separate EMI calculator, a mental
model of "how much is my loan actually costing me," and a to-do list — in
one page.

It currently exists as a single-file HTML/CSS/JS prototype (`window.storage`
key-value backed). This spec describes that **exact feature set and business
logic**, to be rebuilt as a real local full-stack app with a proper backend
and database, and a completely new **glassmorphism + bento-grid** visual
design.

## 2. Who it's for / explicit non-goals

- **One person, one machine.** No accounts, no login, no multi-user
  support, no roles/permissions.
- **No production concerns.** No deployment, no HTTPS, no rate limiting,
  no CSRF tokens, no environment-based config beyond an optional port
  number. It runs on `localhost` only, started by hand.
- **No cloud dependency required.** All data lives in one local database
  file on disk. The one exception — fetching a live GBP→INR exchange
  rate — may call an external API, but the app must work fully offline
  with a manually-entered rate if that fails.
- Keep the **architecture as simple as it can possibly be** while still
  having a real backend + real database (not just localStorage) so data
  survives reinstalls/browser resets and could later be backed up as a
  single file.

## 3. Recommended tech stack (simple, local, single command to run)

| Layer | Choice | Why |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS | Fast dev loop, Tailwind makes glassmorphism/bento-grid layouts fast to build |
| Charts | Recharts or Chart.js | Both work fine; pick one and use it everywhere for consistency |
| Backend | Node.js + Express | Minimal, one file can hold the whole API |
| Database | SQLite via `better-sqlite3` | Zero-config, single file (`data/tracker.db`), no server process to manage, survives restarts, still real SQL (no JSON-file corruption risk) |
| Auth | **None** | Single implicit user; every API route is open on localhost |
| Process model | One Express process serves the built frontend **and** the JSON API on one port (e.g. `http://localhost:4000`) | One command (`npm run dev` in development, `npm start` for the built version) starts everything — no separate frontend/backend servers to juggle |
| Live FX rate | Backend fetches it server-side (e.g. `https://api.frankfurter.app/latest?from=GBP&to=INR`) and returns it to the frontend | Running server-side removes the browser CORS/sandbox problems the prototype had — this **will work** in the full-stack version where it didn't in the sandboxed single-file version |

Nothing here needs Docker, nothing needs a cloud database, nothing needs
an `.env` file beyond maybe `PORT=4000`.

## 4. Data model

Six tables/collections, all scoped to the single implicit user (no
`user_id` column needed). Suggested SQLite schema — an AI agent is free to
translate this 1:1 into `CREATE TABLE` statements.

### 4.1 `config` (single row, key-value or one fixed row)
| field | type | notes |
|---|---|---|
| loanSanctioned | REAL | INR, canonical |
| loanROI | REAL | % per annum |
| loanRepayStart | TEXT (date) | moratorium end / repayment start |
| loanTenure | INTEGER | years |
| loanRepaid | REAL | INR, canonical |
| repaySavings | REAL | INR, canonical — "already saved toward repayment" |
| schoApplied | TEXT | 'yes' \| 'no' |
| schoAppliedAmt | REAL | INR |
| schoReceived | REAL | INR |
| tuitionTotal | REAL | INR |
| tuitionPaid | REAL | INR |
| rent | REAL | INR, monthly, auto-added to every month's expenses |
| bills | REAL | INR, monthly, auto-added to every month's expenses |
| emergencyTarget | REAL | INR |
| emergencyCurrent | REAL | INR |
| progStart | TEXT | display label, e.g. "Sep 2026" |
| progEnd | TEXT | display label, e.g. "Sep 2028" |
| fxRate | REAL | GBP→INR, last known rate |
| fxUpdated | TEXT | human-readable timestamp of last update |
| fxManual | BOOLEAN | true if user set it by hand rather than live fetch |
| jobName | TEXT | employer/job name |
| jobRateGBP | REAL | canonical hourly rate in GBP |
| **display-currency preference per field** | — | see note below |

> Note on currency toggles: every INR-denominated config field above (loan,
> tuition, scholarship, rent, bills, emergency fund) must be **enterable in
> either ₹ or £** at the UI layer, but always **stored canonically in
> INR**. Keep a small per-field "which currency is this field currently
> shown in" preference (can be a JSON blob column `displayCurrencyPrefs` or
> a separate small table) purely for UI convenience — it must never affect
> the stored canonical value.

### 4.2 `ledger_entries` (Daily Ledger — day-to-day income/expense)
| field | type | notes |
|---|---|---|
| id | TEXT/UUID | primary key |
| date | TEXT (date) | |
| type | TEXT | 'income' \| 'expense' |
| category | TEXT | one of: Food, Rent, Bills, Transport, Books/Supplies, Tuition Payment, Part-time Income, Scholarship Received, Other |
| currency | TEXT | 'GBP' \| 'INR' — which currency the user originally typed the amount in |
| amountGBP | REAL | **canonical** amount in GBP, regardless of `currency` above |
| note | TEXT | optional free text |

**Critical rule:** the INR figure shown anywhere for an entry is **never
stored** — it's always `amountGBP * config.fxRate` computed live at read
time, so every ₹ figure across the whole app moves together whenever the
FX rate changes. Do not freeze a per-entry conversion rate.

### 4.3 `disbursements` (loan tranches, tracked by date)
| field | type | notes |
|---|---|---|
| id | TEXT/UUID | |
| date | TEXT (date) | when this tranche was disbursed |
| amountINR | REAL | canonical INR |

Each tranche accrues interest **from its own disbursal date**, not from a
single global "loan start date." This is what lets partial/staggered
disbursals be tracked accurately (see §6.2).

### 4.4 `job_entries` (part-time job hours log)
| field | type | notes |
|---|---|---|
| id | TEXT/UUID | |
| date | TEXT (date) | |
| hours | REAL | hours worked that day |
| note | TEXT | optional |

Earnings for any entry/period are always computed live as
`hours * config.jobRateGBP` — never stored, so a rate change retroactively
recalculates historical earnings display (mirrors the FX-rate philosophy
above; document this as an intentional design choice, not a bug).

### 4.5 `milestones` (program calendar, Sep 2026 → Sep 2028, 25 months)
| field | type | notes |
|---|---|---|
| key | TEXT | 'YYYY-MM', primary key, one row per month in the program range |
| text | TEXT | editable milestone description |
| done | BOOLEAN | |

Seed defaults on first run:
- `2026-09`: "Program begins · first tuition installment due"
- `2027-01`: "Spring term tuition installment due"
- `2027-06`: "Scholarship renewal review"
- `2027-09`: "Second-year tuition installment due"
- `2028-01`: "Final term tuition installment due"
- `2028-09`: "Program ends · loan repayment plan begins"
- All other months in range: empty text, editable by the user.

### 4.6 `todos`, `weekly_targets`, `monthly_targets` (Timeline tab checklists)
Same shape for all three:
| field | type | notes |
|---|---|---|
| id | TEXT/UUID | |
| period_key | TEXT | `todos`: ISO date 'YYYY-MM-DD' · `weekly_targets`: ISO week 'YYYY-Www' · `monthly_targets`: 'YYYY-MM' |
| text | TEXT | |
| done | BOOLEAN | |

The UI only ever shows the current day/week/month's items front-and-center
(today's to-do, this week's targets, this month's targets) but old
periods' rows stay in the database as history — don't delete them, just
don't surface them in the default view.

## 5. Feature spec, tab by tab

### 5.1 Overview
- Four headline cards: **Loan outstanding** (incl. interest), **Tuition
  remaining**, **This month's savings** (income − expenses, job earnings
  included), **Emergency fund** (current vs target, with a progress bar).
- "Today" panel: today's total spend, emergency-fund progress bar, and a
  callout: "Loan grew by ₹X today, projected ₹Y this month."
- Loan utilisation donut chart (disbursed-of-sanctioned %).
- Income vs. expenses bar chart, last 6 months.

### 5.2 Daily Ledger
- Add-entry form: date, type (income/expense), category (fixed list
  above), currency toggle (£/₹) for how you're entering the amount, live
  converted-amount preview, optional note.
- Entries list grouped by month, newest month first, each month showing
  a summary strip (in / out / net) followed by individual entry rows
  (category icon, date, note, dual ₹/£ amount, delete button).
- **This is the tab getting the biggest visual upgrade** — see §7. Ditch
  any "handwritten ledger / dashed lines" look entirely in favor of clean
  glass cards.

### 5.3 Loan Analytics
- **Loan inputs**: sanctioned amount, ROI %, repayment-start date,
  tenure (years), amount already repaid, amount already saved toward
  repayment — every money field has the ₹/£ toggle, autosaves as you
  type (debounced ~500ms), no separate "save" click required for these.
- **Disbursements**: add a tranche (date + amount, either currency),
  see a running list sorted by date, delete any tranche, running total
  shown in both currencies. This is the source of truth for "how much is
  currently disbursed" — there is no separate manually-entered
  "disbursed so far" field; it's always the sum of tranches dated on or
  before today.
- **Hero card**: total outstanding today (big number), how fast it's
  growing per day, and a principal-vs-interest visual breakdown bar.
- **Interest movement**: today's accrual, month-so-far, month-projected,
  next-month-projected, total interest accrued to date — plus a 13-month
  projection line chart of principal+interest growth.
- **Where you stand**: sanctioned, disbursed, remaining sanction, amount
  spent (auto-derived from Daily Ledger expense entries — explicitly
  labeled as automatic, not manual), amount unspent, repaid-to-date.
- **Repayment projection**: projected total due at repayment-start date,
  estimated monthly EMI (standard amortization formula), % of that
  saved so far with a progress bar.
- **Payoff planner**: user picks any target payoff date; app computes
  total due by that date (see §6.4), what's left after current savings,
  days/months remaining, and required savings **per day** and **per
  month** to close the loan to zero by that date.

### 5.4 Tuition & Budget
- Scholarship: applied yes/no, amount applied for, amount confirmed —
  every money field with ₹/£ toggle.
- Tuition: total, paid so far — remaining/covered-by-scholarship/%-paid
  stats plus a progress bar.
- Monthly budget: rent, bills (auto-folded into every month's expense
  total in Overview and the ledger — never need to log them daily),
  emergency fund target and current amount.

### 5.5 Part-time Job (new tab)
- Job details: employer name (free text), hourly rate (₹/£ toggle).
- Log-hours form: date, hours worked, optional note, live "hours × rate
  = earning" preview before submitting.
- Earnings summary: this month's hours, this month's earnings, all-time
  earnings.
- Hours log, newest first, same card visual language as the Daily
  Ledger.
- **Integration rule:** this month's job earnings are automatically
  added into "income" for that month everywhere income is totaled
  (Overview's "this month's savings," etc.) — it is real income, not a
  separate silo.

### 5.6 Timeline
- **Today's to-do**: simple add/check-off/delete list, scoped to
  today's date, with a date badge.
- **This week's targets**: same pattern, scoped to the current ISO week
  (Mon–Sun), with a "12 Aug – 18 Aug" style badge.
- **This month's targets**: same pattern, scoped to the current
  calendar month.
- **Program calendar**: the 25-month vertical milestone timeline from
  §4.5 — editable text per month, checkbox to mark done, current month
  visually highlighted.

### 5.7 FX rate banner (persistent, top of page)
- Big "£1 = ₹X" display.
- "Refresh live" button — backend fetches from a public rate API and
  returns it (this genuinely works now, unlike the sandboxed prototype).
- Manual override input + "Set" button — always available as a fallback
  and always instantly reflected across the entire app.
- Last-updated timestamp, and whether the current rate is live or
  manually set.

## 6. Business logic — exact formulas

All dates are plain calendar dates (no timezone gymnastics needed — this
is a single local user in one timezone).

**6.1 Currency conversion**
```
toINR(gbpAmount) = gbpAmount * fxRate
toGBP(inrAmount) = fxRate > 0 ? inrAmount / fxRate : 0
```
Always compute live from the *current* `fxRate` — never store a frozen
per-record conversion.

**6.2 Loan interest (per-tranche simple interest)**
```
dailyRate = loanROI / 100 / 365
activeTranches = disbursements where date <= today

principal (currently disbursed) = sum(amountINR for activeTranches)

totalInterestToDate = sum over activeTranches of:
    amountINR * dailyRate * daysBetween(tranche.date, today)

todayInterest      = principal * dailyRate
monthSoFar         = principal * dailyRate * dayOfMonth(today)
monthProjected     = principal * dailyRate * daysInMonth(thisMonth)
nextMonthProjected = principal * dailyRate * daysInMonth(nextMonth)

outstanding = principal + totalInterestToDate - loanRepaid
```

**6.3 Utilisation**
```
totalExpensesINR = sum of toINR(amountGBP) for all ledger_entries where type='expense'
utilised        = min(totalExpensesINR, principal)
remainingUtil   = principal - utilised
remainingSanction = loanSanctioned - principal
```

**6.4 Repayment projection & payoff planner (shared formula)**

Given any target date `T` (either `loanRepayStart`, or a user-chosen
payoff date in the planner):
```
projectedTotalAt(T) = sum over activeTranches of:
    amountINR + amountINR * dailyRate * daysBetween(tranche.date, max(T, tranche.date))
```
- **Repayment projection card** uses `T = loanRepayStart`, then:
  ```
  EMI = P * r * (1+r)^n / ((1+r)^n - 1)     where P = projectedTotalAt(loanRepayStart),
                                                    r = loanROI/100/12,
                                                    n = loanTenure * 12
  (fallback: EMI = P / n  if r = 0)
  savedPct = min(repaySavings / P * 100, 100)
  ```
- **Payoff planner** uses `T = user-chosen date`, then:
  ```
  totalDue = max(projectedTotalAt(T) - loanRepaid, 0)
  needed   = max(totalDue - repaySavings, 0)
  daysLeft   = daysBetween(today, T)
  monthsLeft = daysLeft / 30.44
  perDay   = needed / daysLeft
  perMonth = needed / monthsLeft
  ```

**6.5 Tuition**
```
scholarshipCovered = schoReceived
remaining = max(tuitionTotal - tuitionPaid - schoReceived, 0)
pctPaid   = min((tuitionPaid + schoReceived) / tuitionTotal * 100, 100)
```

**6.6 Monthly totals (used by Overview + charts)**
```
for a given month key 'YYYY-MM':
  income  = sum(toINR(amountGBP) for ledger_entries where type='income' and month matches)
          + toINR(sum(hours * jobRateGBP) for job_entries in that month)
  expense = sum(toINR(amountGBP) for ledger_entries where type='expense' and month matches)
          + rent + bills
  net = income - expense
```

**6.7 Job earnings**
```
earningsGBP(entry) = entry.hours * config.jobRateGBP   (computed live, not stored)
```

## 7. Visual design direction (this is the part to make ultimate)

The prototype used a "vintage paper ledger" look (Fraunces serif, IBM
Plex Mono numbers, dotted/dashed lines, a red rubber-stamp badge). **Throw
that out.** The new design should be:

- **Glassmorphism**: frosted-glass panels — semi-transparent backgrounds
  (`backdrop-blur`), soft borders (1px, low-opacity white/light), subtle
  drop shadows, layered depth. Use a rich gradient or soft animated
  mesh-gradient background behind everything so the glass effect actually
  reads (glass on flat white looks like nothing).
- **Bento grid layout**: the Overview tab especially should be an
  asymmetric bento grid — mix of large and small tiles (e.g., one big
  "loan outstanding" hero tile, a couple of medium chart tiles, several
  small stat tiles), not a uniform 4-across grid of equal cards.
- **Typography**: keep a serif/display font for headings and numbers for
  visual richness, and a clean sans for body copy — but pick a modern
  pairing (e.g. a variable display serif + Inter) rather than the
  old-fashioned mono-everywhere look.
- **Color**: a cohesive palette that still distinguishes income/green,
  expense/red, loan/warning tones — but rendered as soft glowing accent
  colors against glass, not flat vintage swatches.
- **Motion**: subtle hover lift/scale on cards, smooth tab transitions,
  animated number count-ups on the headline stats, animated progress
  bars/charts on load. Keep it tasteful — this is a personal finance tool,
  not a game.
- **Charts**: restyle to match the glass aesthetic (translucent fills,
  soft gradients under line charts, rounded bar corners).
- Every screen must stay fully responsive and usable on a laptop browser
  window — no fixed-width layouts.

## 8. Suggested API surface (Express)

```
GET    /api/config              → current config row
PUT    /api/config              → update config (partial patch ok)

GET    /api/entries             → all ledger entries
POST   /api/entries             → create
DELETE /api/entries/:id         → delete

GET    /api/disbursements       → all tranches
POST   /api/disbursements       → create
DELETE /api/disbursements/:id   → delete

GET    /api/job/entries         → all job hour logs
POST   /api/job/entries         → create
DELETE /api/job/entries/:id     → delete

GET    /api/milestones          → all 25 months
PUT    /api/milestones/:key     → update text/done

GET    /api/todos?date=YYYY-MM-DD
POST   /api/todos
PATCH  /api/todos/:id
DELETE /api/todos/:id

GET    /api/weekly-targets?week=YYYY-Www
POST   /api/weekly-targets
PATCH  /api/weekly-targets/:id
DELETE /api/weekly-targets/:id

GET    /api/monthly-targets?month=YYYY-MM
POST   /api/monthly-targets
PATCH  /api/monthly-targets/:id
DELETE /api/monthly-targets/:id

GET    /api/fx/refresh          → server fetches live GBP→INR rate, updates config, returns it
```

All computed figures (interest, EMI, payoff planner, monthly totals) can
be calculated **either** on the backend (return ready-to-render numbers)
**or** on the frontend from raw data — for an app this size, doing the
math in the frontend from the raw API data is simpler and perfectly fine;
no need for a calculation-only endpoint layer.

## 9. Local run experience (what "done" looks like)

```
git clone/download the project
npm install
npm run dev        # starts Express (serves API) + Vite dev server, or a single combined dev script
# open http://localhost:4000 (or whatever port) in a browser
```
No signup, no config file editing required to get started (sensible
defaults, empty state everywhere), one SQLite file created automatically
on first run at `./data/tracker.db`.

---

## 10. THE PROMPT — copy everything below this line into your AI coding agent

```
Build me a local-only, single-user, full-stack personal finance tracker
for a student studying abroad (loan in INR, income/expenses in GBP,
tuition tracked in both). This is for my own personal use on my own
machine only — do NOT add authentication, login, user accounts, HTTPS,
rate limiting, CSRF protection, or any other production/security
hardening. Keep the architecture as simple as possible while still using
a real backend and a real database (not browser localStorage).

STACK:
- Frontend: React + Vite + Tailwind CSS, with Recharts (or Chart.js) for
  charts.
- Backend: Node.js + Express, one process, serves both the built
  frontend and a JSON REST API on a single port (default 4000).
- Database: SQLite via better-sqlite3, single file at ./data/tracker.db,
  created automatically on first run with sensible empty defaults.
- No auth of any kind. No .env requirements beyond an optional PORT.
- Must run locally with just `npm install` then `npm run dev`.

DATA MODEL: implement exactly these tables — config (single row),
ledger_entries, disbursements, job_entries, milestones, todos,
weekly_targets, monthly_targets — with the exact fields described in
section 4 of the attached spec.

FEATURES: implement all six tabs exactly as described in section 5 of
the attached spec — Overview, Daily Ledger, Loan Analytics (including
per-tranche disbursement tracking, interest engine, EMI calculator, and
the payoff planner), Tuition & Budget, Part-time Job, and Timeline
(today's to-do + this week's targets + this month's targets + the
25-month program milestone calendar for Sep 2026 → Sep 2028).

BUSINESS LOGIC: use the exact formulas in section 6 of the attached spec
for currency conversion, per-tranche simple-interest accrual, EMI
amortization, the payoff planner, tuition math, and monthly income/expense
totals (including folding part-time job earnings into monthly income).
Every ₹ figure derived from a GBP-denominated record (ledger entries,
job earnings) must be computed live from the current FX rate at read
time — never store a frozen conversion. Every loan/tuition/budget money
field must be enterable in either ₹ or £ via a small toggle, always
stored canonically in INR.

FX RATE: fetch the live GBP→INR rate from a free public API
(e.g. api.frankfurter.app) from the BACKEND (not the browser, to avoid
CORS issues), with a manual-override input in the UI as a fallback that
always works instantly offline.

DESIGN: build a genuinely premium, modern UI using glassmorphism
(frosted translucent panels, backdrop blur, soft borders/shadows, a rich
gradient or animated mesh background) and an asymmetric bento-grid layout
for the Overview tab in particular. Use a modern serif/sans font pairing,
a cohesive accent-color palette (clear income/expense/warning
distinctions), subtle hover and load animations, and glass-styled charts.
Make it visually the best version of a personal finance dashboard you
can — this is the one part of the app that should NOT be kept simple.

Follow section 8 of the attached spec for the REST API surface, and
section 9 for what a working local dev experience should look like.
Start by scaffolding the project structure and the SQLite schema, then
build tab by tab, then apply the glassmorphism/bento visual pass last
once all the data and calculations are working correctly.
```
