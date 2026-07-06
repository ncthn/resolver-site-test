# Test-app punch list (Nathan, 2026-07-06)

Loop job 6934f827 works through this top to bottom. Update statuses every iteration.

| # | Item | Status |
|---|------|--------|
| 1 | Note/edit text boxes: clicking outside must minimize them again | DONE (batch 1) |
| 2 | "Summarize 3 messages": must read as a button; fix spacing around it; sits at the bottom of the thread, directly above the drafting space | DONE (batch 1) |
| 3 | Internal notes look bad (incl. AI summary note): restyle clean | DONE (batch 1) |
| 4 | Compose: rebuild on the ComeDown Support compose pattern (production repo IS comedown-support: check its compose/outbound UI) | DONE (batch 2) |
| 5 | Tasks: I/W/D chips incomprehensible: use explicit labels | DONE (batch 1) |
| 6 | Chargebacks tab: more features (deadlines, evidence, respond flow, amounts, outcomes) | DONE (batch 3) |
| 7 | "Shadow mode": rename explicitly (draft-only vs auto-send live) everywhere | DONE (batch 1) |
| 8 | Settings > Stores: connection key per store + nicer UI | DONE (batch 2) |
| 9 | Settings > Policies & SOP: go much deeper PER STORE: list all rules, view/edit/create/delete, AI assistance | DONE (batch 3) |
| 10 | Settings > Email → "Emails"; add path for sending NOT via Gmail (own domain via Resolver, e.g. Postmark like production) | DONE (batch 2) |
| 11 | Team tab: "owners see every store" pill looks stupid: plain text | DONE (batch 1) |
| 12 | Billing: link to the Shopify app billing page | DONE (batch 1) |
| 13 | Orders context: show payment method, warning flag when PayPal or Klarna (check comedown-support integration for source field) | DONE (batch 2) |
| 14 | Fulfillment tracking: research ParcelPanel + 17TRACK integrations, document feasibility, add UI affordance | TODO |
| 15 | Resolved/Filtered/Customs/Sent list views: alignment is off, clean them up | DONE (batch 1) |

Rules: deploy each batch (push, manual Render trigger, verify deploy commit SHA + cache-busted URL), verify in preview with screenshots, no em dashes in UI text, V1 monochrome brand, honesty rule (demo data labeled demo).
