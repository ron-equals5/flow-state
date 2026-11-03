# Flow State Studio — Web Portal Plan

_Draft 2 · November 2, 2026 · Approach: **Custom-first**, built on Cloudflare with Claude, with Stripe, Gusto and Twilio rented for the regulated pieces_

## 1. The approach in one paragraph

We build the Flow State platform ourselves: the website, booking for all five booking types, memberships and credits, waivers, the front desk, instructor tools, CRM journeys, reporting and the client app. It runs on Cloudflare and is built by an experienced developer working with Claude. We **rent only the regulated, commodity pieces**: Stripe for payments, billing and card readers, Gusto for payroll, Twilio and an email service for messages, and Slack for staff chat. Those are hard to get right, and rebuilding them wouldn't make Flow State any better.

**Rule of thumb:** build what makes Flow State different; rent what's regulated.

### Why custom

- **The custom parts are the brand.** The Flow, the Reset Room, Restricted Flow blocks and the "grounded to electric" experience are what make Flow State different. Off-the-shelf tools handle them poorly.
- **Arketa's API is too limited to build on.** It can book, cancel and check in classes, but it can't sell memberships, create classes, book rooms, run waitlists or send change notifications.
- **Own the data and the experience.** No vendor limits, no tier upsells, and client data stays with the studio.
- **Lower running cost.** About $200–450 a month in software, versus about $650–1,150 on Arketa (§9).
- **Claude changes the build math.** An experienced developer with Claude can reach an opening-ready version in about 3–4 weeks and parity with Arketa's features in about 10–12.

### Options considered

| Option | Verdict |
|---|---|
| **Custom-first** (build on Cloudflare, rent Stripe, Gusto, Twilio) | **Chosen.** Full control of the custom booking types, lowest running cost. |
| Hybrid (Arketa underneath, custom layer on top) | **Fallback only.** Arketa's API limits the custom booking types. Arketa runs month to month, so it stays available if the go/no-go fails (§8). |
| Off-the-shelf only (Arketa or Walla with an embedded widget) | Rejected. The Flow and Reset Room would be limited to what those tools already do. |

## 2. Build vs. rent

| Area | Build (Cloudflare + Claude) | Rent |
|---|---|---|
| Website, schedule and filters, class library, instructor profiles | ✓ | |
| All five booking types, The Flow, Reset Room, Restricted Flow blocks, waitlists | ✓ | |
| Memberships, packs, credits, expirations, late-cancel rules | ✓ Our rules (credit ledger, §5) | **Stripe Billing**: charging, retries, receipts |
| One-time purchases (singles, packs, events, series, merch) | ✓ | **Stripe Checkout / Payment Element** |
| Front-desk POS and retail | ✓ Our screens | **Stripe Terminal** card readers |
| Waivers | ✓ E-signature with an audit trail; signed PDFs stored in R2 | NJ lawyer reviews the waiver text |
| Client accounts, guests, invite a guest | ✓ | |
| Instructor class view and check-in | ✓ | |
| CRM journeys | ✓ Cloudflare Workflows | **Twilio** (texts), **Resend or Postmark** (email) |
| Video on demand | ✓ Gated by membership | **Cloudflare Stream** |
| Client app | ✓ Phone-friendly web app first, then Expo | Apple and Google developer accounts |
| Owner reporting | ✓ Built around Flow State's numbers | |
| Payroll | Export hours and classes taught | **Gusto** |
| Staff chat | | **Slack** or WhatsApp |

## 3. Who uses what

Everyone uses the Flow State platform, with role-based access.

| User type | Where they work | Key jobs |
|---|---|---|
| Owner / Manager | Admin + reports | Schedule builder, pricing and products, staff and pay rates, reporting, payroll export |
| Front Desk | Front-desk screen + Stripe Terminal | Check-in, POS, client accounts, selling memberships, waivers on a tablet |
| Instructors | Instructor view (phone) | Class rosters, check-in, their own schedule |
| Visitors | Website | Browse schedule, classes, instructors, pricing |
| Leads | Website lead form | Info request, intro offer, nurture journey |
| Clients / Members | Website + app | Book, buy, manage account, waivers, invite a guest, on-demand video |
| Guests | Invite link | Register, sign waiver, attend |

## 4. Spaces and booking types

| Space | Allowed formats |
|---|---|
| 1st Floor | Non-heated group classes, The Flow |
| 2nd Floor | Infrared-heated and non-heated classes (heat flagged per class) |
| Reset Room | Self-serve wellness and recovery, rented by the slot |

| Booking type | How it works |
|---|---|
| **Instructor-led classes** | Class occurrences tagged by type, name, instructor, floor and heat. Filterable schedule. |
| **The Flow** | Two steps: **choose the block, then choose a start time**. Each block generates start-time slots with their own capacity. |
| **Restricted Flow blocks** | Flow blocks with eligibility rules (for example members only or a specific program). Rules still need defining. |
| **Reset Room** | One person books the slot and invites one other: an existing member, or a first-time guest with a guest pass, registration and waiver. |
| **Pop-ups / Events** | Their own pricing; member credits don't apply. |
| **Workshop Series** | One purchase reserves every class in the series. |

## 5. The core design: a credit ledger with eligibility rules

Bookings don't decrement a simple credit count. Every purchase creates **entitlements**, and every booking is checked against **eligibility rules** for that booking type. All changes are written to an append-only **ledger**.

- **Unlimited membership:** an entitlement valid for the billing period, with optional limits (for example one booking per day).
- **Finite monthly membership:** N credits per period that reset at renewal.
- **Packs and single classes:** N credits with an expiration date.
- **Events:** member credits don't apply; requires an event ticket.
- **Series:** one purchase reserves every occurrence in the series.
- **Restricted Flow blocks:** only eligible products or groups can book.
- **Reset Room:** the booker's entitlement covers the slot; a guest pass or the invitee's own entitlement covers the guest.
- **Late cancel and no-show:** rules forfeit the credit or charge a fee.

Getting this model right early keeps every later feature cheap.

## 6. Architecture

```
Visitors / Members / Staff
        │
        ▼
flowstatestudionj.com — Cloudflare Workers (Hono API)
  ├─ Astro: public site (schedule, classes, instructors, pricing, Flow, Reset Room)
  ├─ React app: member account, front desk, instructor view, admin
  ├─ D1: core data (clients, products, entitlements, ledger, schedule, waivers)
  ├─ Durable Objects: one per class occurrence, Flow slot and Reset Room slot
  │     (capacity, waitlist promotion and guest holds, one request at a time)
  ├─ Queues: notifications · Workflows: CRM journeys, membership lifecycle
  ├─ Cron: credit expiry, Stripe reconciliation
  ├─ R2: signed waiver PDFs · Stream: on-demand video
  └─ Access: protects admin and staff tools
        │
        ▼
Stripe (Billing, Checkout, Terminal, webhooks) · Twilio · Resend/Postmark · Gusto (export) · Slack
```

- **Sign-in:** magic link plus passkeys (for example Better Auth on D1). No passwords to manage.
- **Stripe webhooks:** idempotent handling so a repeated event never charges or credits twice. Stripe is the record for money; the ledger is the record for credits.
- **App:** Expo, sharing a typed API client with the web app.
- **Backups:** D1 Time Travel (point-in-time restore), plus nightly exports to R2.
- **Monitoring:** Cloudflare observability with alerts on errors and failed webhooks.

### Key data entities

Location · Space · ClassType · ClassTemplate · ClassOccurrence · FlowBlock · FlowSlot · ResetRoomSlot · Booking · WaitlistEntry · Client · Guest · Invite · Product (membership, pack, single, event, series, merch) · Purchase · Entitlement · LedgerEntry · EligibilityRule · Waiver (versioned) · WaiverSignature · Staff · Role · PayRate · Lead · JourneyEvent

## 7. Start this week (outside approvals that take weeks)

- [ ] **Twilio A2P 10DLC registration** for texting. Carrier approval can take 1–3 weeks.
- [ ] **Apple Developer account for the business.** Requires a D-U-N-S number, which can take 1–2 weeks.
- [ ] **Stripe account activation**, plus ordering Terminal card readers.
- [ ] **Waiver text** reviewed by a NJ lawyer.
- [ ] **Squarespace leads export** and a plan for moving the domain.
- [ ] **Confirm the opening date** and set the go/no-go date one week before it.

## 8. Timeline

| Weeks | Ships |
|---|---|
| **1–2** | Data model, sign-in, schedule and filters, class booking, waivers, Stripe single classes and packs |
| **3–4 · Opening-ready** | The Flow, memberships, front-desk check-in and register, instructor view, admin schedule builder |
| **5–8** | Reset Room with guest invites, waitlists, events and series, Restricted Flow blocks, CRM journeys, reporting, payroll export |
| **9–12** | Expo native app, on-demand video, polish |

**Go/no-go:** one week before opening. If the opening-ready version isn't solid, open with a lighter process for a few weeks (front desk takes bookings and payments manually through Stripe), or sign up for Arketa month to month as a bridge. Don't rush into an annual contract.

## 9. Cost estimate

_Researched November 2, 2026. Twilio and Stripe Billing figures are estimates to confirm. Development time isn't included._

**Summary:** about **$200–450 a month** in software, plus **about 2.7–2.9% of card sales** in processing, plus **about 0.7% of membership revenue** for Stripe Billing, plus **about $500–700 up front** for hardware.

### Monthly

| Tool | Est. cost / month | Notes |
|---|---|---|
| Cloudflare Workers Paid (+ D1, Durable Objects, Queues, R2) | $5–25 | Most usage fits in the $5 base at this scale |
| Cloudflare Stream (video on demand) | $5–20 | $5 per 1,000 minutes stored + $1 per 1,000 watched |
| Gusto payroll (Simple) | ~$140 | $49 base + $6 per person, assuming 15 staff |
| Twilio texts | ~$20–50 | Estimate; depends on volume. Plus small 10DLC registration fees. |
| Email (Resend or Postmark) | $0–20 | Free tiers may cover early volume |
| Expo | $0–19 | Free tier may be enough |
| Apple Developer | ~$8 | $99 a year |
| Slack Pro (optional) | $0–130 | $7.25–8.75 per user, or $0 with WhatsApp |
| Domain | ~$1 | About $10–12 a year |
| **Total** | **~$200–450** | |

### Payments

- **Card processing (Stripe):** 2.9% + 30¢ online, 2.7% + 5¢ in person. Example: $40,000 a month in card sales ≈ $1,100–1,200 in fees.
- **Stripe Billing:** about 0.7% of recurring membership revenue (confirm current rate). Example: $30,000 a month in memberships ≈ $210.

### One-time

| Item | Est. cost |
|---|---|
| Card readers (Stripe S700 + M2) | ~$360 |
| Receipt printer and cash drawer | ~$150–300 |
| Google Play developer account | $25 |
| Waiver legal review | Quote needed |

### Compared with the hybrid (Arketa) plan

The Arketa plan would cost about $650–1,150 a month in software, plus the same card processing. Custom saves roughly $400–700 a month, but the bigger reasons to go custom are control of the experience and the data.

## 10. Open questions

### For the studio
1. **Opening date:** what's the exact date, and when must booking go live? This sets the go/no-go.
2. **The Flow:** how long are the blocks, how often do start times run, how many people per start, and how long is the circuit?
3. **Restricted Flow blocks:** who are they restricted to, and why?
4. **Reset Room:** what's the slot length and price? Do credits apply? How do guest passes work?
5. **Pricing:** what's the full list for memberships, packs, single classes, events and series? What are the late-cancel and no-show rules?
6. **On-demand video:** is it needed at launch or later? Where will the content come from?
7. **Hardware:** which card readers and receipt printer? Is door access in scope?
8. **Staff chat:** Slack or WhatsApp?
9. **Content:** who supplies class descriptions, instructor bios and photos, and when?

### For the build
10. **Support:** who handles bugs and front-desk issues day to day, and after hours?
11. **ClassPass and other aggregators:** are they wanted? Integrating needs partner approval from them.
12. **Instructor pay:** what are the rules (per class, per head, tiers)? They shape the payroll export.

## 11. Risks

| Risk | Mitigation |
|---|---|
| **We are the vendor**: support, uptime, and one person holding the knowledge | Runbooks, tests, a CLAUDE.md and docs so another developer (or Claude) can pick it up, monitoring with alerts |
| **Opening is this month** | Opening-ready scope only; go/no-go one week out; manual or Arketa month-to-month fallback |
| **Money edge cases** (failed payments, freezes, prorating, refunds, late-cancel fees) | Stripe handles charging; the ledger handles credits; idempotent webhooks; tests for each rule; nightly reconciliation |
| **Outside approvals** (Twilio, Apple, Stripe) | Start them this week (§7) |
| **Front-desk reliability at 6am** | Durable Objects for capacity, a printable roster fallback, monitoring, D1 point-in-time restore |
| **Security of client data and waivers** | Least-privilege roles, Cloudflare Access on staff tools, signed waiver PDFs in private R2 storage |

## Appendix: Arketa research (for the fallback)

- **Partner API:** can read classes, clients, purchases and rooms; can create, cancel and check in reservations. No membership sales, class creation, room booking, waitlists, webhooks or sandbox. Provided as-is.
- **Pricing:** studio tiers are quote-only. Third-party reviews report about $200 (Core), $450 (Growth) and $699 (Suite) a month. Only Suite includes the branded app. Plans renew month to month unless annual.
- **Walla:** no published API.
