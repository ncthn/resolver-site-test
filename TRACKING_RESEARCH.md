# Fulfillment tracking integration research (punch list item 14)

Researched 2026-07-06. Question: how do we get live carrier tracking (delivery
attempts, customs, exceptions) into Resolver tickets, beyond what Shopify's
fulfillment object carries?

## Option A: 17TRACK Tracking API — RECOMMENDED primary

- Plain HTTP API + webhook push. Flow: POST /register with the tracking number
  (straight from the Shopify order snapshot) → 17TRACK monitors the carrier →
  our webhook receives every status transition. No polling.
- Carrier-agnostic (2,500+ carriers incl. Cainiao, Yanwu, 4PX — exactly the
  dropship mix). Enterprise tier registers 400k numbers/hour; irrelevant at our
  scale but means no ceiling.
- Pricing: prepaid annual quota packages (pay per registered number, valid 12
  months, no rollover). New accounts get a one-time 200 free numbers (the old
  100/month free allocation ended 2026-01-07). At Brinoa-scale volume this is
  cheap; cost scales per shipment, not per merchant.
- Fit for Resolver: register on ticket creation (or fulfillment webhook),
  webhook updates land in the ticket's order snapshot, and status transitions
  ("delivery attempt failed", "held at customs") can TRIGGER proactive drafts —
  the watchdog pattern applied to support.
- Effort estimate: one service file (register + webhook receiver + signature
  check), one Firestore field on tickets, one cron for backfill. ~1 to 2 days.

## Option B: ParcelWILL (formerly ParcelPanel) connector — secondary

- REST API v2 + webhooks; the merchant's API key comes from their ParcelWILL
  admin Integration tab. Server-side only.
- Catch: developer API access requires their 2,000-orders/month plan tier, and
  it only works for merchants who already run ParcelWILL on their store.
- Fit: a per-merchant connector like Gorgias/Zendesk have, not our backbone.
  Offer it in Settings > Integrations for merchants who already pay for it
  (their branded tracking page URL is also useful in drafts).

## Decision

Build 17TRACK as Resolver's own tracking layer (works for every tenant with
zero merchant setup), add a ParcelWILL connector later for merchants who have
it. The test app shows the affordance in the ticket Fulfillment card.

Sources:
- [17TRACK Tracking API](https://www.17track.net/en/api)
- [17TRACK API Quick Guide](https://help.17track.net/hc/en-us/articles/30944262120729--Tracking-API-Quick-Guide)
- [17TRACK API docs](https://api.17track.net/en/doc)
- [17TRACK plan details](https://help.17track.net/hc/en-us/articles/37575217580825-Plan-Details)
- [ParcelWILL API & Webhook docs](https://docs.parcelpanel.com/shopify/api-webhook/)
- [ParcelWILL API v2](https://docs.parcelpanel.com/shopify/api-webhook/api-v2/)
- [ParcelWILL on the Shopify App Store](https://apps.shopify.com/parcelpanel)
