# Feature gaps vs Gorgias, Repline, Humane (2026-07-06)

What they ship that Resolver does not, ranked by how well it fits our wedge
(email-first, order-grounded, supervised automation for Shopify dropship).

## P1 — build next (fits the wedge, buildable now)

| Gap | Who has it | Notes |
|---|---|---|
| Carrier tracking layer | Repline (ParcelWILL), Humane (DHL/DPD/Hermes/UPS) | Already researched: 17TRACK webhooks (TRACKING_RESEARCH.md). Unlocks proactive drafts on "delivery failed". |
| Guided returns flow (RMA) — SHIPPED in test app 2026-07-06 | Humane (their killer feature) | Not just drafting ABOUT a return: a return state machine per ticket (request → approved → label/address sent → received → refund options). We stop at the draft today. |
| Support insights / trends — SHIPPED in test app 2026-07-06 | Repline ("recurring issues, delivery problems, refund trends") | Overview shows volume; it should mine topics: "sizing complaints doubled on product X". We have the data (categories + corpus). |
| Macros / saved replies | Gorgias (macros with variables) | Compose has templates; the ticket view has none. Small feature, daily-use value. |
| CSAT survey | Gorgias | One-click rating appended after resolution; feeds lane trust and the marketing site (honest numbers eventually). |
| Pre-reply check surfaced in UI | Humane ("escalation prevention") | Production already runs draftSanityCheck; the app never shows it. Cheap parity: a "checks passed" line on the draft (we show trace; add the sanity verdict). |

## P2 — team + revenue scale

| Gap | Who has it | Notes |
|---|---|---|
| Assignment + collision detection | Gorgias | "Sarah is viewing" presence, assignee per ticket, @mentions in internal notes (notes exist, mentions don't). |
| Non-AI rules builder | Gorgias | Auto-tag, auto-close spam, routing by condition. Our Filters tab is a start; no actions. |
| Pre-sales / revenue AI | Gorgias (AI converts pre-purchase questions, revenue attribution stats) | Different wedge (sales, not ops). Later. |
| Help center + deflection | Gorgias | Self-service article portal; our Knowledge tab could publish outward eventually. |

## P3 — positioning, not urgent

- Live chat widget + social channels (Instagram/FB/WhatsApp/TikTok/SMS) and voice — Gorgias's moat; contradicts our email-first focus for now.
- Shopify WRITE actions (refund, cancel, edit address from the ticket) — Gorgias has them; we intentionally market read-only. When we add them, they go behind the Abilities tab as guarded, human-confirmed actions.
- EU hosting + zero-training pledge (Humane's trust page) — adopt the claims when contractually true (OpenAI ZDR pending).

## Where we already match or beat them

- Per-store SOP editor with structured rules, variables, voice, knowledge, abilities (deeper than Repline/Humane expose; Gorgias-level guidance).
- Draft-only → graduated auto-send with kill switch + decision trace per draft.
- English-mirror translation workflow (40+ languages) and bilingual drafts.
- Chargebacks workbench with evidence assembly.
- Correction learning: capture shipped (prod), distillation next (Humane markets this; we now have the data path).
- Honest onboarding: 30-day history import with confirm, SOP extraction.
