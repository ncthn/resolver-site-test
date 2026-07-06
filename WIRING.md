# /app redesign — wiring map to the live app (rsvlr)

The preview at `/app` consumes ONLY `src/saas/console/{types.ts, mockApi.ts}`.
`types.ts` is a faithful subset of production `src/types.ts` (same field
names, same enums). To wire the redesign into the live app, reimplement each
mockApi method with the real endpoint — the UI needs no changes.

| mockApi method        | Production endpoint                          | Notes |
|-----------------------|----------------------------------------------|-------|
| listTickets           | GET /api/tickets                             | shop + query filters |
| getCounts             | GET /api/tickets/counts                      | |
| getTicket             | GET /api/tickets/:id                         | includes messages[] |
| patchStatus           | PATCH /api/tickets/:id/status                | 6 real statuses |
| patchCategory         | PATCH /api/tickets/:id/category              | Category enum |
| postSend              | POST /api/tickets/:id/send                   | UI applies 180s cooldown after success (SendButton behavior) |
| postRegenerate        | POST /api/tickets/:id/regenerate             | |
| postAiToggle          | POST /api/tickets/:id/ai-toggle              | per-ticket ai_disabled |
| cancelAutoSend        | (pending_auto_send cancel)                   | clears auto_send_queued_at |
| unlinkOrder           | POST /api/tickets/:id/unlink-order           | rematch = POST /:id/rematch, match = /:id/match-order |
| getLog                | (ai-activity feed)                           | |
| exportPdf             | client-side exportTicketPdf.ts               | 334 attachment + PDF hits/14d in prod logs |
| (per-message translate) | POST /api/translate                        | 261 hits/14d; UI is ENGLISH-FIRST with per-message Original expanders |
| deleteTicket          | DELETE /api/tickets/:id                      | soft delete to bin |
| restoreTicket         | POST /api/tickets/:id/restore                | |
| permanentDelete       | DELETE /api/tickets/:id/permanent            | |
| postSupplier          | POST /api/tickets/:id/supplier               | opens supplier request, status -> WAITING_SUPPLIER |
| refreshOrder          | POST /api/tickets/:id/refresh-order          | re-pull order snapshot |
| sendCompose           | (compose/outbound send)                      | |
| getTasks/toggleTask   | (tasks queue)                                | |

Semantics respected from production:
- `auto_send_queued_at` = ISO time of the dispatcher attempt (3-MINUTE window,
  not seconds); UI shows countdown + Cancel.
- `draft_body` + `draft_body_english` = native draft + EN mirror; messages
  carry `body_english` (translated at intake).
- `ai_disabled` = per-ticket kill switch (skips drafting AND auto-send),
  independent of the global shop mode.
- Statuses: OPEN / WAITING_CUSTOMER / WAITING_SUPPLIER / RESOLVED /
  REPLACEMENT_SENT / ESCALATED. Supplier bridge = supplier_status +
  supplier_request_type.
- `chargeback_status` 'warning' renders the risk chip; chargeback tickets are
  never auto-replied.
- Send button: 180s anti-double-send cooldown after a successful send.
- No avatars anywhere — sender identity is text.

Not yet in the preview (exists in production, add when wiring): merge-duplicates
(0 human hits/14d), per-message supplier thread (0 hits/14d), quoted-reply
stripping, attachment download proxy.

Translation semantics (matches production TicketThread/TicketDetailPanel):
messages render the ENGLISH translation as primary text with an "Original · XX"
expander per message; agent messages get "Sent · XX"; the draft compose surface
is the ENGLISH mirror (draft_body_english) while draft_body (native) is what
actually sends — shown under a "Sends in XX" expander. Auto-sent messages carry
an AI chip. The decision trace on the draft card maps to the pipeline stages
(classify -> match -> tracking -> policy -> risk scan -> lane decision) and the
draft_audit_log.

## Live mode (switch-on phase 1, 2026-07-06)

/app?live=1 wires the console to the REAL resolver.chat API (?live=0 back to
demo). src/saas/console/api.ts is the adapter switch; liveApi.ts implements
tickets list/read/counts + status, category, send, regenerate, AI toggle,
notes and summarize against production, with a 12s poll and the same
subscribe/notify contract as the mock. LiveGate.tsx signs into the production
Firebase project (Google or email) and feeds ID tokens to the adapter.
Production CORS allows the test-site origin + localhost:5195 via CORS_ORIGIN.
Everything not yet wired (tasks, chargebacks, SOP editor, settings) stays on
the demo store in live mode.

Phase 2 (same day): live mode also covers Settings > Policies & SOP —
Variables edits the real shop.policy knobs (PATCH /api/shops/:id) and Rules
becomes a raw ai_support_sop editor until the structured-rules model ships to
production. Live shops populate the store chips automatically.

Phase 3 (same day): live Lanes — per-shop auto-send modes drive the real
POST /api/admin/auto-send-mode, with the real graduation metric per category
from GET /api/lanes/readiness under each shop. Demo lanes unchanged.

Phase 4 (same day): live Compose — order search (compose/search-order),
AI drafting with native language + translated subject (compose/generate-draft)
and real sending that opens a ticket (compose/send), per store, with a manual
recipient when no order is attached. Demo compose unchanged.
