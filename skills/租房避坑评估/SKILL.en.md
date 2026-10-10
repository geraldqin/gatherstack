---
name: Rental pitfall check
description: Help first-time renters inspect a listing: overall verdict + main risks + a status table. Input format is unrestricted (JSON, page text, notes). Output Markdown, not JSON.
---

# Purpose

For **first-time renters**: from the materials they provide, explain what to watch, where it is risky, and what information is still missing, so they are less likely to skip critical items.

**The checklist is the core, not the input format.** Materials can be JSON from the collector Skill, detail-page Markdown, chat excerpts, user notes — anything that contains rental information.

This Skill **does not open pages or scrape**. Use only the current-turn user text and attachments. If information is missing, mark Unknown or To confirm. Do not invent facts.

Default to a **single-listing** inspection. When materials clearly cover multiple listings, use a side-by-side table (item on the left, each listing’s status on the right). Do not paste a long essay per listing.

**The reader is a person**: output must be readable Markdown (short lists + one status table). Do not output JSON or wrap a whole structured object in a code fence.

Guiding principle: **stay calm even when hunting for a place**. If the materials or chat pressure you to “decide today” or “pay a deposit or it is gone” → overall verdict leans Caution / Not recommended, and put that in Main risks.

# Input

Accept any readable material, for example:

- JSON from **Rent listing collector** (one object or an array)
- Side-panel “read current page” Markdown / HTML
- Pasted listing text, screenshot transcriptions, spoken notes, in-person visit impressions
- Optional preferences: budget, min bedrooms, must have elevator, workplace, whether shared housing is OK, whether a sublessor is OK, pets, etc.

Prefer structured fields when present; otherwise infer from natural language. Labels with the same meaning are equivalent across languages (e.g. monthly rent ≈ `rentMonthly`; entire-unit / shared ≈ `entire` / `shared` or their local-language page forms; shared “how many households” ≈ `coliving.households`; occupied rooms ≈ `coliving.occupiedRooms`).

# Output rules

- English Markdown, **exactly three blocks**: Overall → Main risks → Items. No extra sections for parameter maps, missing info, or questions to ask.
- No small talk and no long restating of the source.
- Items are one table: `Item | Status` (multi-listing: `Item | Listing 1 | Listing 2 | …`). Do not write numbered long paragraphs.
- Status values only: `Reasonable` / `Suitable` / `Unreasonable` / `To confirm` / `Unknown`.
  - **Reasonable**: the term itself does not look like an obvious trap
  - **Suitable**: acceptable given the user’s preferences (prefer this when preferences exist)
  - **Unreasonable**: already clearly a problem or should not be accepted
  - **To confirm**: must ask or inspect in person before concluding (includes verbal “no problem” that is not trustworthy)
  - **Unknown**: the materials have no related information at all
- **Items that need an in-person visit** (solid walls, leaks, heating, gas, noise, cockroaches, formaldehyde, original documents, etc.): mark those items To confirm; **summarize** what to ask / look at under Main risks (you may write “To confirm: …”). Do not add extra sections.

# Must-cover checklist for first-time renters

| Item name (use these English names in output) | Why it matters | How to judge |
|------------------------|------------|----------|
| Counterparty character | Can you trust the signing party | Evidence only from materials: non-calendar rent accounting, bait listings, pressure to sign, hostility, one-sided clauses → Unreasonable; no clues at all → Unknown. If it is unclear whether it is landlord or agent, say in Main risks that the judgement is about the “signing / showing party” |
| Payment and deposit traps | Wrong money flow can mean no viewing and a scam | **Never trust “pay a goodwill fee to view”** — a common scam. **Deposit ≠ retainer**: do not pay a deposit; pay any money only **after signing**. If materials require payment before viewing, or verbal “deposit to lock the unit” → Unreasonable, overall Not recommended |
| Cash needed to sign | How much cash is needed on signing day | First payment ≈ monthly rent × months paid + deposit + agency fee. If there is a yearly service fee, divide by 12 and add into monthly cost. Too high → Unreasonable or To confirm; missing numbers → Unknown |
| Value for money | Is it expensive; can you compare | Unit price if rent and area exist; else Unknown. If commute matters, “a bit more expensive but closer” can be Suitable (see Commute) |
| Commute | Will the commute grind you down; time is a cost | Metro distance; if the user gave a workplace, prefer commute reasonableness. **New grads / office workers should live closer**: paying a bit more rent to save a lot of commute time can be a suitable long-term trade |
| Livability and in-person checks | Daily friction; do not miss hardware when viewing | Elevator, floor, facing, fit-out, residential water/electric, **gas**, heating, essential appliances. Distinguish gas: **piped natural gas** vs **bottled LPG** vs **electric only**. “Has gas” on the page is not enough. **Low floors (especially ground) or north-facing** tend to be damper → To confirm / Unreasonable. Easy to miss in person: knock for solid walls, noise, leaks, heating, lighting the stove, cockroaches, formaldehyde. Not stated or not visited → To confirm, and put it in Main risks |
| Move-in and lease term | Term vs payment rhythm; churn signals | **Rent must be billed by calendar month/year**; 360-day years, 30×12 months, etc. → Unreasonable, write in Main risks. **One month deposit + one month rent**, **view anytime / move in anytime** are often churn signals → To confirm or Unreasonable, not a plus |
| Hidden costs | Will you keep paying extra after moving in | Commercial water/electric, self-heating, high agency fees → Unreasonable; for **shared** housing, household count is under Pets and shared-housing limits; gas type and ignition under Livability |
| Counterparty | Who you sign with, and whether they are reliable | **Be cautious with professional sublessors**. Hostile / coercive / gut-bad → Unreasonable, walk away. **Bait listing** that changes on arrival → Unreasonable, stop looking. Sublessors need the original lease; direct lets need property certificate + ID; agents need a verifiable entity. No verification plan mentioned → To confirm / Unknown |
| Noise and surroundings | Can you sleep | Street / viaduct / construction / sports ground noise; shared housing must ask about partitions; **roommates’ schedules and jobs** also affect noise (ask the landlord; see Pets and shared-housing limits). Cockroaches, formaldehyde, leaks, noise often absent from the page: **ask first, then visit**. Not visited → To confirm. Cockroaches or a chemical smell already → Unreasonable |
| Pets and shared-housing limits | Household count and roommates; avoid breaking rules after move-in | **For shared housing, find out how many households / occupied rooms**. Many households → shared water/electric often higher and less controllable; put in Main risks or To confirm; ask how costs are split (equal / metered / included). When needed **ask the landlord what current roommates roughly do and whether schedules are stable** (churn, night shifts, parties). Not stated → To confirm. Pets allowed, gender limits, overnight guests, shared electric, etc. unclear → Unknown / To confirm |
| Deposit refund and early exit | Mid-lease and checkout disputes | Distinguish tenant early exit vs landlord selling / terminating; tenant may claim sale does not break the lease. Both sides’ rules missing → Unknown / To confirm |
| Contract and signing pace | Paper terms and mindset | Prefer the local housing-authority model lease. Heavy pressure to close → Unreasonable or To confirm; remind them to stay calm |

# Evaluation rules

1. Use only information **already readable** in the materials; missing → Unknown or To confirm; never invent.
2. If monthly rent, area, location, and entire/shared are all missing → mark related items Unknown, put in Main risks, ask them to fill in before deciding.
3. Goodwill / lock-in fee before viewing, or a deposit before signing → Payment and deposit traps Unreasonable; overall may be Not recommended.
4. Non-calendar rent accounting → Move-in and lease term and Counterparty character Unreasonable; must go in Main risks.
5. One+one payment, or emphasis on view anytime / move in anytime → Move-in and lease term at least To confirm; do not call it a plus.
6. Hard constraints not met → Main risks; overall may be Not recommended.
7. Agency fee near or above one month’s rent → Main risks.
8. Commercial water/electric, or no elevator and high floor → Main risks. Low floor or north-facing → Livability To confirm or Unreasonable, and note mold/dampness to check.
9. Sublessor / re-let with no original lease, or direct let with no ID/title check → Counterparty To confirm / Unknown, Main risks. Same if the party is unclear or a professional sublessor.
10. Hostile, coercive, bad chemistry, or gut-uneasy → Counterparty Unreasonable; overall leans Not recommended / Caution.
11. Bait listing that switches to another unit → Counterparty Unreasonable, overall Not recommended; say not to keep looking at other units they push.
12. Shared housing with no partition info, or clear noise clues → Noise To confirm / Unreasonable, Main risks.
13. No visit, or no mention of cockroaches, smell, leaks, solid walls, heating, gas → related items To confirm, **summarized in Main risks**. Verbal “none / we have gas” must **not** be Reasonable / Suitable. No piped gas, bottles only, or electric only → at least note convenience; aged hose, no ventilation, no alarm → Unreasonable.
14. **Shared** housing with no household/room count or utility split → Pets and shared-housing limits and Hidden costs To confirm / Unknown; Main risks: “To confirm: households, how utilities are split; ask landlord about roommate jobs/schedules if needed.” Obviously overcrowded (many rooms per floor) → at least To confirm, may lean Unreasonable (split costs and churn). User mentioned pets or house rules not stated → Pets and shared-housing limits Unknown / To confirm.
15. Deposit, cleaning fee, or either side’s early-exit rules missing → Deposit refund or Contract Unknown / To confirm.
16. Multi-listing: do not compare total price of shared vs entire; commute may note “a bit more expensive but closer.” More than 4 listings may split tables; item rows stay aligned.
17. Overall uses only: `Consider` / `Caution` / `Not recommended` (severe missing info may also be Caution).
18. Main risks holds **confirmed risks** and **to-confirm items** in one section, written once; if none, write “None”. Do not split “missing info” / “ask before signing” / “undetermined” sections.

# Output structure

Stick to these three blocks. Punctuation may vary; do not rename checklist items:

```markdown
## Overall
Consider | Caution | Not recommended — one sentence (may include: do not rush)
(multi-listing: one short line per listing, or a small table | Listing | Overall |)

## Main risks
- …… (confirmed risks)
- To confirm: …… (must ask or inspect; omit this line if none)
(if nothing, write “None”)

## Items
| Item | Status |
|------|------|
| Counterparty character |  |
| Payment and deposit traps |  |
| Cash needed to sign |  |
| Value for money |  |
| Commute |  |
| Livability and in-person checks |  |
| Move-in and lease term |  |
| Hidden costs |  |
| Counterparty |  |
| Noise and surroundings |  |
| Pets and shared-housing limits |  |
| Deposit refund and early exit |  |
| Contract and signing pace |  |
```

For multiple listings, change the items table to: `Item | Listing 1 status | Listing 2 status | …`.

# Example (single listing; shape only)

```markdown
## Overall
Caution — metro and layout are OK, but quarterly pay plus agency fee makes the first payment high, view-anytime suggests churn, gas and documents unverified; ask first, do not rush a deposit.

## Main risks
- No elevator, high floor
- Agency fee about one month’s rent
- View anytime may mean high tenant churn
- Self-heating cost is on the tenant
- To confirm: calendar-year billing; piped vs bottled/electric-only gas and whether the stove lights; leaks/heating/solid walls/cockroaches/formaldehyde/damp; direct-let documents or sublessor original lease; exit and deposit rules

## Items
| Item | Status |
|------|------|
| Counterparty character | Unknown |
| Payment and deposit traps | To confirm |
| Cash needed to sign | Unreasonable |
| Value for money | Reasonable |
| Commute | Suitable |
| Livability and in-person checks | To confirm |
| Move-in and lease term | Unreasonable |
| Hidden costs | Unreasonable |
| Counterparty | To confirm |
| Noise and surroundings | To confirm |
| Pets and shared-housing limits | Unknown |
| Deposit refund and early exit | Unknown |
| Contract and signing pace | Unknown |
```

# Related Skill

To extract structured fields from a page for storage, use **Rent listing collector**. This Skill does not depend on that format; collector output is only optional input.
