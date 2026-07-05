# SOP personalization for arbitrary customers — research + architecture
*Produced July 2026 by two research agents: one market survey, one code-grounded
audit of the production repo (local checkout: /Users/comedownmachine/Apps/triagr-app).*

## The problem, confirmed
Resolver's drafting quality today comes from a prompt that IS Brinoa's playbook
in code, plus RAG over Brinoa's resolved tickets. A new tenant gets someone
else's refund policy, confidently applied. Key evidence (file:line in prod):

- `openAIService.ts:236-356` — the PLAYBOOK RULES block hardcodes Brinoa policy:
  Option A/B refund ladder (30% partial), customer-pays-return-to-China, 5-10 day
  delivery claims, dropship secrecy, real internal case citations.
- `Onboarding.tsx:398-435` — **the SOP upload step is theater**: the file is never
  uploaded; a fake 10.5s animation shows a hardcoded "what we picked up" list.
- `ticketPipeline.ts:1007-1013` (+ `server.ts:1859`) — **cross-tenant RAG leak**:
  <2 shop-scoped examples → silently broadens to ALL shops, so new tenants'
  drafts are few-shot anchored on Brinoa agent replies (also a data-isolation issue).
- `autoSendPolicy.ts:118-160` — every auto-send rule keyed `shop_id === 'brinoa'`:
  the core feature is permanently inert for every other tenant.
- `settings/config` is install-wide: one global `sop_text` and one global spam
  keyword list shared across ALL tenants (`firebaseService.ts:242-253`).
- Scattered literals: "Brinoa Assistant" sanity regexes, "Chandan" in the
  follow-up gate prompt, Brinoa-named classifier few-shots, name→".com" domain guess.

## What the market does (survey of Gorgias, Fin, Siena, Decagon, Lorikeet, Yuma, eesel)
Seven recurring patterns:
1. Three-layer separation everywhere: knowledge (RAG) ≠ policy/guidance ≠ tone.
2. Structured, bounded guidance beats free-text SOPs (Gorgias WHEN/IF/THEN,
   100-item caps; Fin 100×2,500-char items; Decagon SOP→AOP conversion).
3. Per-intent onboarding, top-volume first (WISMO, returns, cancellations).
4. Scenario templates as cold-start — a form dressed as guidance.
5. Bootstrap by importing existing artifacts: macros, help-center crawl,
   historical tickets (Yuma/eesel's replay-over-history is the standout).
6. Explicit feedback loops (thumbs + edit-the-guidance) beat implicit learning;
   only Yuma claims true draft-edit absorption.
7. Simulation/preview before go-live — replaying the agent over the merchant's
   own past tickets is both QA and the sales moment.

## Architecture (full detail in the agent output; summary)
1. **`ShopPolicy` schema** per shop (refunds: window/partial-%/options; returns:
   who-pays/labels/address; shipping estimates; disclosure; reviews; escalation
   triggers; tone fields; custom lanes; free-text addendum). Battle-tested rule
   LANGUAGE stays as code templates, parameterized by policy values —
   `renderPolicyBlock(policy)` replaces the hardcoded middle of the prompt.
2. **Prompt assembly**: BASE_RULES (generic, tenant-independent) +
   renderPolicyBlock + renderVoiceBlock (tone + approved exemplar snippets) +
   RAG strictly shop-scoped + capped learnedGuidance block.
3. **Real SOP extraction at onboarding**: `/api/onboarding/sop-extract` —
   pdf/docx text → one structured-output LLM call against the schema →
   the existing "what we picked up" card shows REAL values, inline-editable.
   (The /get-started flow on this test site now demos exactly this UX.)
4. **Zero-history bootstrap**: (a) Gmail 90-day sent-thread import + distillation
   into voice examples (machinery exists: listThreadsByDateRange/backfillInbox);
   (b) 10-question voice quiz → tone fields + approved synthetic exemplars;
   (c) shadow-mode edit-distance capture (`draft_corrections` collection).
5. **Feedback loop**: weekly cron clusters correction pairs (reuse embedBatch);
   ≥3 similar corrections → one candidate rule into `shops/{id}.learned_guidance[]`,
   visible + deletable in Settings. No fine-tuning. `policy_version` stamped into
   the existing draft audit log.
6. **Migration**: transcribe today's hardcoded values into brinoa's policy doc;
   verify renderPolicyBlock reproduces current behavior via the existing
   dry-run replay endpoint; shops without a policy doc keep the legacy path.

## Build order
1. **Stop the bleeding (~1 day)** — delete the cross-shop RAG fallback, scope the
   global filters per company, parameterize the Brinoa/Chandan literals.
   *These are live multi-tenant issues, worth doing before any new tenant onboards.*
2. ShopPolicy v0 + renderPolicyBlock for the 6 hard-rule values (2-3 days).
3. Real SOP extraction wired into the existing onboarding step (2-3 days).
4. Voice quiz + voice block (2 days).
5. Gmail history import + distillation (3-4 days).
6. Correction capture + weekly distillation (3-5 days).
7. Generic auto-send graduation state machine replacing brinoa-keyed rules
   (3 days + shadow soak).

Slices 1-3 = the MVP answer to "how do we do this for other customers."
