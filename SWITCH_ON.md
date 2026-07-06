# Switch-on status and cutover runbook (2026-07-06)

The console at /app?live=1 runs against the REAL resolver.chat backend behind
the production Firebase login. This file tracks what is wired and what the
actual cutover takes.

## Wired to production (live mode)

- Tickets: list, read, English-mirror thread, status, category, AI toggle,
  send (with correction capture), regenerate, internal notes, AI summaries
- Bin: real deleted tickets, restore, soft-delete from the ticket menu
- Sent: outbound activity log
- Resolved: real resolved tickets
- Compose: order search, AI draft (native + translated subject), real send
  that opens a tracking ticket
- Settings > Policies & SOP: FULL structured WHEN/IF/THEN rules editor live
  (shop.sop_rules, rendered into the drafting prompt with policy tokens),
  plus policy knobs (Variables) and raw SOP text
- Settings > Lanes: real per-shop auto-send modes + the real graduation
  metric per category
- Settings > Team: real users, roles, read-only, activate, invites
- Auth: production Firebase project, Google or email/password; 12s ticket
  poll, 30s bin/sent poll

## Still demo in live mode (honest gaps)

- Overview: WIRED (live KPIs, daily volume, categories, backlog from /api/stats); trend Insights still need their production endpoint
- Returns flow: WIRED (server-side state machine live on resolver.chat)
- Macros: WIRED (company-scoped CRUD live; insert, save-from-draft, remove)
- Tasks, Chargebacks workbench, CSAT, inbox rules
  (features that do not exist server-side yet — each needs its production
  model before wiring)
- Settings > Filters / Emails / Stores / Notifications / Billing (config
  surfaces pending production endpoints or accounts: filters config, Postmark
  + Entri env, connection keys)
- Welcome tour, sub-tab counts derive from live tickets and work

## Cutover runbook (when Nathan says go)

1. Point app.resolver.chat (or resolver.chat/app) at this frontend build —
   either serve dist/ from the rsvlr server or move DNS to the Render static
   site with /api proxied to the backend origin.
2. Set live mode as the DEFAULT for that origin (flip the api.ts LIVE
   resolver from the query flag to hostname-based).
3. Add the final origin to CORS_ORIGIN on the rsvlr service.
4. Keep the old dashboard reachable at a fallback path for a week.
5. The demo (/app on the marketing site) stays as the public product tour.

Prereqs owned by Nathan: Postmark + Entri credentials for the domain-first
mail path, the 17TRACK account for tracking, and the go decision itself.
