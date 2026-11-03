# Flow State Studio — Web Portal Plan

_Draft 1 · November 2, 2026 · Approach: Hybrid (Arketa underneath, custom Flow State layer on top)_

## 1. The approach in one paragraph

Arketa is the **system of record**: clients, memberships, packs, payments, waivers, POS, payroll reporting, email/SMS marketing, and the staff-facing studio tools. We build a **Flow State layer** on Cloudflare Workers that owns the branded experience: the website, the schedule with filters, the class library, instructor profiles, and the custom booking flows that off-the-shelf tools handle poorly (The Flow and the Reset Room). Everything the custom layer can't do through Arketa's API falls back to Arketa's own widgets and branded app, so nothing blocks opening day.

### Why Arketa over Walla

| | Arketa | Walla |
|---|---|---|
| Developer API | Yes. Partner API with API key. It can read classes, clients and purchases, and create, cancel and check in reservations. | None published. Listings conflict, and integrations are limited to Zapier, ClassPass and Zoom. |
| Custom booking on top | Possible for anything modeled as a class | Embed-only |
| Branded client app, POS, payroll, CRM | Built in (confirm tiers in demo) | Built in |

**Recommendation: Arketa.** If Walla is still in the running, ask them directly whether they have a partner API. Without one, the custom Flow and Reset Room experiences can't be built on Walla.

## 2. What Arketa's API can and can't do

Read from Arketa's published Partner API spec (`sutrafitness.github.io/api-docs/swagger.yaml`), Nov 2, 2026.

| Need | API support | Plan |
|---|---|---|
| Read schedule, classes, rooms, locations | ✅ Read | Sync into our database on a schedule |
| Book a class for a client | ✅ `createReservation` (needs an existing purchase, or creates a new client) | Custom booking screens |
| Cancel / late-cancel / refund | ✅ `cancelReservation` | Custom account screens |
| Check-in | ✅ `checkInReservation` | Instructor check-in view (later) |
| Read clients and purchases | ✅ Read | Show credits and memberships in custom UI |
| Sell memberships, packs, merch | ❌ | Arketa checkout widget / app / front-desk POS |
| Create or edit classes | ❌ | Staff build the schedule in Arketa's dashboard |
| Room / resource booking | ❌ | Reset Room needs a workaround (see §4) |
| Waitlists | ❌ | Arketa's native waitlist (via widget/app) |
| Webhooks (change notifications) | ❌ | Poll on a timer (Cloudflare Cron Triggers) |
| Sandbox / test environment | ❌ | Use a separate test Arketa location or account |
| Support | "Provided as-is" | Build defensively and monitor for breaking changes |

Rate limit is about 25 requests per second. Auth is an API key the owner generates in Arketa → Settings → Integrations.

## 3. Who uses what

| User type | Where they work | Key jobs |
|---|---|---|
| Owner / Manager | Arketa dashboard (+ custom reports later) | Reporting, payroll, pricing, staff |
| Front Desk | Arketa dashboard + POS hardware | Check-in, POS, client accounts, selling memberships |
| Instructors | Arketa staff app | Class rosters, check-in |
| Visitors | **Flow State website** | Browse schedule, classes, instructors, pricing |
| Leads | **Website form → Arketa CRM** | Info request, intro offer, nurture journey |
| Clients / Members | **Website + branded app** | Book, buy, manage account, waivers, invite a guest, on-demand video |
| Guests | **Website / invite link** | Register, sign waiver, attend |

## 4. The five booking types

| Booking type | How it's set up in Arketa | Custom layer |
|---|---|---|
| **Instructor-led classes** | Standard classes, tagged by type, floor and heat | Schedule with filters for instructor, class type, class name, and infrared vs. non-heated |
| **The Flow** | Each Flow **start time** is a small-capacity "class" (for example every 10 min) inside a Flow block | Two-step picker: **choose the block → choose a start time**. Shows live spots per start time. |
| **Reset Room** | Modeled as a 2-spot "class" or appointment per time slot (**to confirm in Arketa demo**) | Book the slot, then invite one person: an existing member, or a first-time guest with a guest pass, waiver and registration |
| **Pop-ups / Events** | Events with their own pricing (member credits don't apply) | Event pages on the website; purchase via Arketa checkout |
| **Workshop Series** | Arketa series / course sold as one purchase | Series pages on the website; purchase via Arketa checkout |

**Restricted Flow blocks.** The brief calls these out but doesn't define them. We need to confirm who they're restricted to (for example members only, a women's life-stage program, or invite only) and how the restriction is enforced. Arketa can likely limit which purchases are valid for a class, which would cover most cases.

**Reset Room risk.** The API can't book rooms or resources. If Arketa's room-rental feature isn't usable as a "class", there are two options. One is to keep Reset Room booking inside Arketa's widget and app. The other is to run it on our own booking engine (Cloudflare D1 + Durable Objects to prevent double-booking) with payment through Stripe. In that case member credits wouldn't apply automatically. This is the biggest open decision after opening.

## 5. Spaces

| Space | Allowed formats | Arketa setup |
|---|---|---|
| 1st Floor | Non-heated group classes, The Flow | Room: "1st Floor" |
| 2nd Floor | Infrared-heated and non-heated classes | Room: "2nd Floor"; heat flagged per class |
| Reset Room | Self-serve recovery, rented by the slot | Room: "Reset Room" |

## 6. Technical architecture (custom layer)

```
Visitors / Members ──► flowstatestudionj.com (Cloudflare Worker)
                         ├─ Website pages (schedule, classes, instructors, pricing, Flow, Reset Room)
                         ├─ Custom booking API  ──► Arketa Partner API (reservations)
                         ├─ Content store: D1 (class library, instructor profiles, filter tags)
                         ├─ Schedule cache: synced from Arketa every few minutes (Cron Trigger)
                         └─ Lead form ──► Arketa CRM (via Zapier or API)
Purchases, waivers, waitlists ──► Arketa widgets / branded app
Front desk, POS, payroll, staff ──► Arketa dashboard + hardware
```

- **Hosting:** Cloudflare Workers with static assets. A scaffold is already live at `flow-state.ron-bca.workers.dev`.
- **Front end:** Astro (fast, content-first), styled from the existing brand: navy `#09003E`, lavender `#9982E3`, pink `#E64FB9`, flame `#EE2405`, and bold uppercase Helvetica.
- **Data:** Cloudflare D1 for content and the schedule cache. KV for short-lived caches.
- **Client sign-in:** match members to their Arketa client record by email, with a magic link (no passwords to manage).
- **Secrets:** the Arketa API key is stored as a Worker secret and never sent to the browser.

## 7. Phases

### Phase 0 — Decide and set up (this week)
- [ ] Arketa demo focused on the open questions in §9. Sign up, pick a plan tier, and confirm the branded app and POS hardware.
- [ ] Confirm the opening date and the date booking must go live.
- [ ] Generate the Arketa API key and test the read endpoints.
- [ ] Export "Get First Access" leads from Squarespace.

### Phase 1 — Open for business (before opening day)
- [ ] **Arketa setup:** spaces, class types and classes, instructors, pricing (unlimited, finite monthly, single, packs, events, series, merch), waivers, staff roles, POS hardware, and payroll rates.
- [ ] **The Flow and Reset Room** set up natively in Arketa as a stopgap.
- [ ] **New website** on the Worker: home, about, classes, instructors, pricing, Flow, Reset Room, FAQ and contact, with Arketa's schedule and checkout widgets embedded.
- [ ] **Lead form** feeding Arketa, plus a welcome email/SMS journey.
- [ ] **Branded client app** launched through Arketa.
- [ ] **Domain move:** point flowstatestudionj.com from Squarespace to the Worker.

### Phase 2 — Custom schedule and The Flow (opening + about 4–6 weeks)
- [ ] Schedule sync from Arketa into D1.
- [ ] Custom schedule with all four filters.
- [ ] Class description library and instructor profiles, linked to the schedule.
- [ ] **The Flow booking picker** (block → start time) using `createReservation`.
- [ ] Member sign-in, "my bookings", and cancel.

### Phase 3 — Reset Room and growth (opening + about 2–3 months)
- [ ] Reset Room booking with invite-a-guest (member or guest pass) and waivers.
- [ ] Restricted Flow blocks.
- [ ] CRM journeys: intro offer → first visit → membership, win-back, and life-stage programs.
- [ ] Owner dashboard with key numbers (bookings, revenue, retention), if Arketa's reports fall short.

### Phase 4 — Evaluate
- [ ] Decide whether Arketa's branded app is enough, or whether a custom app (Expo / React Native) on the same booking API is worth it.
- [ ] Revisit anything Arketa can't do. Their enterprise agreement starts at $10k/year and may unlock API features.

## 8. Covered by Arketa (no custom build planned)

POS and hardware, payroll, staff chat, waivers, waitlists, membership and pack sales, video on demand, and email/SMS sending. We'll check each one in the demo. Anything that falls short moves into Phase 3 or 4.

## 9. Open questions for the studio

1. **Opening date:** what's the exact date, and when must booking go live?
2. **The Flow:** how long are the blocks, how often do start times run, how many people per start time, and how long is the circuit?
3. **Restricted Flow blocks:** who are they restricted to, and why?
4. **Reset Room:** what's the slot length and price? Do member credits apply? Is a guest pass free on a first visit? How many guest passes does a member get?
5. **Pricing:** what's the full price list for memberships, packs, single classes, events and series?
6. **On-demand video:** is it needed at launch or later? Where will the content come from?
7. **Hardware:** what card reader and receipt printer are needed (confirm with Arketa), and is door access in scope?
8. **Staff chat:** is it in Arketa or a separate tool (for example Slack or WhatsApp)?
9. **Content:** who supplies the class descriptions, instructor bios and photos, and when?

## 10. Risks

| Risk | Mitigation |
|---|---|
| Opening this month leaves little build time | Phase 1 relies on Arketa as it comes, and custom work follows opening |
| Arketa API is "as-is", with no sandbox or webhooks | Separate test location, polling with caching, monitoring, and fallback to Arketa widgets |
| Reset Room can't be booked via the API | Confirm the setup in the demo; the fallback is our own booking engine |
| Data lives in two places | Arketa is always the source of truth; our layer only caches and links to it |
