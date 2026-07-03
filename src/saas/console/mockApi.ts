// Mock API client. Every method mirrors a REAL production endpoint (see
// WIRING.md at the repo root) with the same inputs/outputs, implemented on an
// in-memory store. Wiring the redesign to the live app = replacing this
// module's internals with fetch calls to those endpoints — the UI does not
// change. Subscribe/notify gives components live re-renders on mutation.
import type { ActivityEvent, Category, Shop, Ticket, TicketStatus } from './types'

const now = Date.now()
const iso = (msAgo: number) => new Date(now - msAgo).toISOString()

export const SHOPS: Shop[] = [
  { id: 'all', name: 'All stores', domain: '', open_count: 0 },
  { id: 'aurora', name: 'AURORA', domain: 'aurora.com', open_count: 0 },
  { id: 'harbor', name: 'Harbor Goods', domain: 'harborgoods.com', open_count: 0 },
  { id: 'northbound', name: 'Northbound', domain: 'northbound.co', open_count: 0 },
]

const TICKETS: Ticket[] = [
  {
    id: 't-4471', shop_id: 'aurora',
    customer_email: 'maria.lopez@email.com', customer_name: 'Maria Lopez', customer_language: 'en',
    subject: 'Where is my order?',
    last_customer_message: 'Hi — I ordered 3 weeks ago and still haven’t received anything. Order #1042. Getting worried.',
    last_customer_message_at: iso(2 * 60_000), message_count: 1,
    status: 'OPEN', category: 'SHIPPING', sentiment: 'negative', urgency_score: 62,
    order_id: 'gid://1042', order_name: '#1042', order_match_confidence: 1,
    order_match_reason: 'Order number found in email body',
    order_snapshot: {
      order_name: '#1042', order_id: 'gid://1042', shopify_url: '#',
      created_at: iso(21 * 86_400_000), financial_status: 'paid', fulfillment_status: 'fulfilled',
      tracking_numbers: ['CP998341US'], tracking_urls: ['#'], tracking_status: ['In transit — customs cleared'],
      line_items: [{ title: 'Aurora Linen Set — Sand', quantity: 1, price: '148.00' }],
      total_price: '148.00', currency: 'USD', shipping_country: 'United States',
    },
    draft_body: 'Hi Maria — thanks for your patience! Your order #1042 shipped and is currently in transit: it cleared customs this morning and should arrive within 2–3 days. Here’s your live tracking: CP998341US. I’ll keep an eye on it and follow up the moment it’s delivered.',
    draft_body_english: null, draft_generated_at: iso(60_000),
    chargeback_status: 'none', auto_resolved: false,
    auto_send_queued_at: new Date(now + 170_000).toISOString(),
    supplier_status: null, supplier_request_type: null, is_stuck: false,
    customer_history: '3 orders · joined Mar 2025',
    messages: [
      { id: 'm1', from: 'maria.lopez@email.com', from_name: 'Maria Lopez', date: iso(2 * 60_000), body: 'Hi — I ordered 3 weeks ago and still haven’t received anything. Order #1042. Getting worried.', is_customer: true },
    ],
    created_at: iso(2 * 60_000),
  },
  {
    id: 't-4468', shop_id: 'aurora',
    customer_email: 'a.weber@email.de', customer_name: 'A. Weber', customer_language: 'de',
    subject: 'Chargeback threatened',
    last_customer_message: 'Das ist inakzeptabel. Ich melde das meiner Bank und meinem Anwalt, wenn es heute nicht gelöst wird.',
    last_customer_message_english: 'This is unacceptable. I am reporting this to my bank and my lawyer if it is not resolved today.',
    last_customer_message_at: iso(11 * 60_000), message_count: 3,
    status: 'ESCALATED', category: 'CHARGEBACK', sentiment: 'angry', urgency_score: 96,
    order_id: 'gid://1991', order_name: '#1991', order_match_confidence: 0.94,
    order_match_reason: 'Customer email matches order',
    order_snapshot: {
      order_name: '#1991', order_id: 'gid://1991', shopify_url: '#',
      created_at: iso(34 * 86_400_000), financial_status: 'paid', fulfillment_status: 'fulfilled',
      tracking_numbers: ['CP771222US'], tracking_urls: ['#'], tracking_status: ['Delivery attempt failed'],
      line_items: [{ title: 'Aurora Throw — Charcoal', quantity: 1, price: '59.00' }],
      total_price: '59.00', currency: 'USD', shipping_country: 'Germany',
    },
    draft_body: 'Hallo — es tut mir sehr leid, dass es so weit gekommen ist. Ich habe Ihren Fall soeben persönlich übernommen und melde mich innerhalb von 24 Stunden mit einer Lösung.',
    draft_body_english: 'Hello — I am very sorry it has come to this. I have just personally taken over your case and will get back to you within 24 hours with a resolution.',
    draft_generated_at: iso(10 * 60_000),
    chargeback_status: 'warning', auto_resolved: false,
    supplier_status: null, supplier_request_type: null, is_stuck: false,
    customer_history: '1 order · first contact',
    messages: [
      { id: 'm1', from: 'a.weber@email.de', from_name: 'A. Weber', date: iso(4 * 3_600_000), body: 'Wo ist meine Bestellung #1991? Die Zustellung ist fehlgeschlagen.', is_customer: true, body_english: 'Where is my order #1991? The delivery failed.' },
      { id: 'm2', from: 'support@aurora.com', from_name: 'AURORA Support', date: iso(3 * 3_600_000), body: 'Hallo — die Zustellung wird morgen erneut versucht. Hier ist Ihr Tracking-Link.', is_customer: false, body_english: 'Hello — delivery will be attempted again tomorrow. Here is your tracking link.' },
      { id: 'm3', from: 'a.weber@email.de', from_name: 'A. Weber', date: iso(11 * 60_000), body: 'Das ist inakzeptabel. Ich melde das meiner Bank und meinem Anwalt, wenn es heute nicht gelöst wird.', is_customer: true, body_english: 'This is unacceptable. I am reporting this to my bank and my lawyer if it is not resolved today.' },
    ],
    created_at: iso(4 * 3_600_000),
  },
  {
    id: 't-4462', shop_id: 'harbor',
    customer_email: 'james.carter@email.com', customer_name: 'James Carter', customer_language: 'en',
    subject: 'Return request',
    last_customer_message: 'Hi, the robe didn’t fit — can I return it for a refund?',
    last_customer_message_at: iso(24 * 60_000), message_count: 1,
    status: 'OPEN', category: 'REFUND', sentiment: 'neutral', urgency_score: 31,
    order_id: 'gid://2090', order_name: '#2090', order_match_confidence: 0.91,
    order_match_reason: 'Customer email matches order',
    order_snapshot: {
      order_name: '#2090', order_id: 'gid://2090', shopify_url: '#',
      created_at: iso(6 * 86_400_000), financial_status: 'paid', fulfillment_status: 'fulfilled',
      tracking_numbers: ['CP771204US'], tracking_urls: ['#'], tracking_status: ['Delivered'],
      line_items: [{ title: 'Harbor Robe — M', quantity: 1, price: '72.00' }],
      total_price: '72.00', currency: 'USD', shipping_country: 'United States',
    },
    draft_body: 'Hi James — absolutely, you’re within the 30-day window. Here’s your prepaid return label and the 3 quick steps. Your refund posts within 2 days of us receiving the item.',
    draft_body_english: null, draft_generated_at: iso(20 * 60_000),
    chargeback_status: 'none', auto_resolved: false,
    supplier_status: null, supplier_request_type: null, is_stuck: false,
    customer_history: '2 orders · joined Jan 2026',
    messages: [
      { id: 'm1', from: 'james.carter@email.com', from_name: 'James Carter', date: iso(24 * 60_000), body: 'Hi, the robe didn’t fit — can I return it for a refund?', is_customer: true },
    ],
    created_at: iso(24 * 60_000),
  },
  {
    id: 't-4455', shop_id: 'aurora',
    customer_email: 'sofia.rossi@email.it', customer_name: 'Sofia Rossi', customer_language: 'it',
    subject: 'Damaged on arrival',
    last_customer_message: 'La scatola è arrivata danneggiata e il set presenta delle macchie. Cosa possiamo fare?',
    last_customer_message_english: 'The box arrived damaged and the set has stains. What can we do?',
    last_customer_message_at: iso(38 * 60_000), message_count: 1,
    status: 'WAITING_SUPPLIER', category: 'DAMAGED', sentiment: 'negative', urgency_score: 55,
    order_id: 'gid://2061', order_name: '#2061', order_match_confidence: 1,
    order_match_reason: 'Order number found in email body',
    order_snapshot: {
      order_name: '#2061', order_id: 'gid://2061', shopify_url: '#',
      created_at: iso(9 * 86_400_000), financial_status: 'paid', fulfillment_status: 'fulfilled',
      tracking_numbers: ['CP663118US'], tracking_urls: ['#'], tracking_status: ['Delivered'],
      line_items: [{ title: 'Aurora Linen Set — Clay', quantity: 1, price: '148.00' }],
      total_price: '148.00', currency: 'USD', shipping_country: 'Italy',
    },
    draft_body: 'Ciao Sofia — mi dispiace tanto! Possiamo inviarti subito una sostituzione oppure rimborsarti completamente. Se puoi, inviaci una foto del danno così sistemiamo tutto oggi stesso.',
    draft_body_english: 'Hi Sofia — I’m so sorry! We can send a replacement right away or refund you in full. If you can, send us a photo of the damage and we’ll sort everything out today.',
    draft_generated_at: iso(30 * 60_000),
    chargeback_status: 'none', auto_resolved: false,
    supplier_status: 'REQUESTED', supplier_request_type: 'Replacement stock check', is_stuck: false,
    customer_history: '4 orders · VIP',
    messages: [
      { id: 'm1', from: 'sofia.rossi@email.it', from_name: 'Sofia Rossi', date: iso(38 * 60_000), body: 'La scatola è arrivata danneggiata e il set presenta delle macchie. Cosa possiamo fare?', is_customer: true, body_english: 'The box arrived damaged and the set has stains. What can we do?' },
    ],
    created_at: iso(38 * 60_000),
  },
  {
    id: 't-4449', shop_id: 'northbound',
    customer_email: 'mk@email.com', customer_name: null, customer_language: 'en',
    subject: 'Question about sizing',
    last_customer_message: 'Hey, do the jackets run true to size? Thinking about the field jacket in M.',
    last_customer_message_at: iso(60 * 60_000), message_count: 1,
    status: 'OPEN', category: 'GENERAL', sentiment: 'neutral', urgency_score: 12,
    order_id: null, order_name: null, order_match_confidence: 0,
    order_match_reason: 'No matching order found for sender',
    order_snapshot: null,
    draft_body: 'Hi — good question! The field jacket runs slightly large; most customers take one size down. The M fits like a typical L in high-street brands. Happy to help if you’re between sizes.',
    draft_body_english: null, draft_generated_at: iso(55 * 60_000),
    chargeback_status: 'none', auto_resolved: false,
    supplier_status: null, supplier_request_type: null, is_stuck: false,
    customer_history: 'No purchase history',
    messages: [
      { id: 'm1', from: 'mk@email.com', from_name: null, date: iso(60 * 60_000), body: 'Hey, do the jackets run true to size? Thinking about the field jacket in M.', is_customer: true },
    ],
    created_at: iso(60 * 60_000),
  },
  {
    id: 't-4440', shop_id: 'aurora',
    customer_email: 'chloe.martin@email.fr', customer_name: 'Chloé Martin', customer_language: 'fr',
    subject: 'Changement d’adresse',
    last_customer_message: 'Merci beaucoup, c’est parfait !',
    last_customer_message_english: 'Thank you very much, that’s perfect!',
    last_customer_message_at: iso(5 * 3_600_000), message_count: 3,
    status: 'RESOLVED', category: 'CANCEL', sentiment: 'neutral', urgency_score: 8,
    order_id: 'gid://2103', order_name: '#2103', order_match_confidence: 1,
    order_match_reason: 'Order number found in email body',
    order_snapshot: {
      order_name: '#2103', order_id: 'gid://2103', shopify_url: '#',
      created_at: iso(2 * 86_400_000), financial_status: 'paid', fulfillment_status: 'unfulfilled',
      tracking_numbers: [], tracking_urls: [], tracking_status: [],
      line_items: [{ title: 'Aurora Linen Set — Sand', quantity: 2, price: '296.00' }],
      total_price: '296.00', currency: 'EUR', shipping_country: 'France',
    },
    draft_body: null, draft_body_english: null, draft_generated_at: null,
    chargeback_status: 'none', auto_resolved: true, auto_sent_at: iso(5.5 * 3_600_000),
    supplier_status: null, supplier_request_type: null, is_stuck: false,
    customer_history: '2 orders',
    messages: [
      { id: 'm1', from: 'chloe.martin@email.fr', from_name: 'Chloé Martin', date: iso(6 * 3_600_000), body: 'Bonjour, pouvez-vous livrer au bureau plutôt qu’à la maison ?', is_customer: true, body_english: 'Hello, can you deliver to my office instead of my home?' },
      { id: 'm2', from: 'support@aurora.com', from_name: 'AURORA Support', date: iso(5.5 * 3_600_000), body: 'Bonjour Chloé — c’est fait ! L’adresse a été mise à jour avant l’expédition de la commande #2103.', is_customer: false, body_english: 'Hello Chloé — done! The address was updated before order #2103 shipped.' },
      { id: 'm3', from: 'chloe.martin@email.fr', from_name: 'Chloé Martin', date: iso(5 * 3_600_000), body: 'Merci beaucoup, c’est parfait !', is_customer: true, body_english: 'Thank you very much, that’s perfect!' },
    ],
    created_at: iso(6 * 3_600_000),
  },
]

const LOG: ActivityEvent[] = [
  { at: iso(30_000), ev: 'Queued for auto-send', detail: 'SHIPPING · t-4471 Maria Lopez · 3-min cancel window', kind: 'send' },
  { at: iso(60_000), ev: 'Draft created', detail: 'SHIPPING · grounded on order #1042 + live tracking', kind: 'ok' },
  { at: iso(11 * 60_000), ev: 'Escalated', detail: 'CHARGEBACK language detected · t-4468 · pulled from all lanes', kind: 'hold' },
  { at: iso(20 * 60_000), ev: 'Draft created', detail: 'REFUND · order #2090 within return window', kind: 'ok' },
  { at: iso(30 * 60_000), ev: 'Draft created (IT)', detail: 'DAMAGED · photo request per SOP · EN mirror attached', kind: 'ok' },
  { at: iso(32 * 60_000), ev: 'Supplier requested', detail: 'Replacement stock check · Aurora Linen Set — Clay', kind: 'hold' },
  { at: iso(5.5 * 3_600_000), ev: 'Auto-sent (FR)', detail: 'CANCEL · address updated pre-fulfillment · t-4440', kind: 'send' },
]

/* ------------------------------------------------------------- store core */
const listeners = new Set<() => void>()
let version = 0
function notify() { version++; listeners.forEach((l) => l()) }
export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
export function getVersion() { return version }

const delay = (ms = 120) => new Promise((r) => setTimeout(r, ms))
const log = (ev: string, detail: string, kind: ActivityEvent['kind']) => {
  LOG.unshift({ at: new Date().toISOString(), ev, detail, kind })
}

/* --------------------------------------------------------------- client */
/** GET /api/tickets — list with shop + status-bucket + text filters. */
export async function listTickets(opts: { shopId?: string; q?: string } = {}) {
  await delay(0)
  return TICKETS.filter((t) =>
    (!opts.shopId || opts.shopId === 'all' || t.shop_id === opts.shopId) &&
    (!opts.q || (t.subject + t.customer_email + (t.customer_name ?? '') + (t.order_name ?? '')).toLowerCase().includes(opts.q.toLowerCase())),
  )
}
/** GET /api/tickets/counts */
export function getCounts(shopId?: string) {
  const scope = TICKETS.filter((t) => !shopId || shopId === 'all' || t.shop_id === shopId)
  return {
    open: scope.filter((t) => ['OPEN', 'ESCALATED', 'WAITING_SUPPLIER'].includes(t.status)).length,
    escalated: scope.filter((t) => t.status === 'ESCALATED').length,
    queued: scope.filter((t) => !!t.auto_send_queued_at).length,
  }
}
/** PATCH /api/tickets/:id/status */
export async function patchStatus(id: string, status: TicketStatus) {
  await delay()
  const t = TICKETS.find((x) => x.id === id)!
  t.status = status
  log('Status changed', `${t.subject} → ${status}`, 'ok')
  notify()
}
/** PATCH /api/tickets/:id/category */
export async function patchCategory(id: string, category: Category) {
  await delay()
  const t = TICKETS.find((x) => x.id === id)!
  t.category = category
  log('Category changed', `${t.subject} → ${category}`, 'ok')
  notify()
}
/** POST /api/tickets/:id/send — 180s UI cooldown after success (SendButton). */
export async function postSend(id: string, body: string) {
  await delay(350)
  const t = TICKETS.find((x) => x.id === id)!
  t.messages.push({ id: 'm' + Date.now(), from: 'support@aurora.com', from_name: 'Support', date: new Date().toISOString(), body, is_customer: false })
  t.message_count++
  t.draft_body = null
  t.draft_body_english = null
  t.auto_send_queued_at = undefined
  t.status = 'WAITING_CUSTOMER'
  log('Reply sent', `${t.subject} · by you`, 'send')
  notify()
}
/** POST /api/tickets/:id/regenerate */
export async function postRegenerate(id: string) {
  await delay(900)
  const t = TICKETS.find((x) => x.id === id)!
  t.draft_body = (t.draft_body ?? '') + '\n\nP.S. If anything else comes up, just reply to this email — I’m on it.'
  t.draft_generated_at = new Date().toISOString()
  log('Draft regenerated', t.subject, 'ok')
  notify()
}
/** POST /api/tickets/:id/ai-toggle — per-ticket kill switch (ai_disabled). */
export async function postAiToggle(id: string) {
  await delay()
  const t = TICKETS.find((x) => x.id === id)!
  t.ai_disabled = !t.ai_disabled
  if (t.ai_disabled) t.auto_send_queued_at = undefined
  log(t.ai_disabled ? 'AI disabled for ticket' : 'AI re-enabled for ticket', t.subject, t.ai_disabled ? 'hold' : 'ok')
  notify()
}
/** DELETE /api/pending-auto-send/:id (cancel the queued dispatcher attempt). */
export async function cancelAutoSend(id: string) {
  await delay()
  const t = TICKETS.find((x) => x.id === id)!
  t.auto_send_queued_at = undefined
  log('Auto-send cancelled', `${t.subject} · held for approval`, 'hold')
  notify()
}
/** POST /api/tickets/:id/unlink-order */
export async function unlinkOrder(id: string) {
  await delay()
  const t = TICKETS.find((x) => x.id === id)!
  t.order_id = null; t.order_name = null; t.order_snapshot = null
  t.order_match_confidence = 0; t.order_match_reason = 'Unlinked by operator'
  log('Order unlinked', t.subject, 'hold')
  notify()
}
export function getLog() { return LOG }
export function getTicket(id: string) { return TICKETS.find((x) => x.id === id) }

/* ---- bin (DELETE /api/tickets/:id · POST /:id/restore · DELETE /:id/permanent) */
export async function deleteTicket(id: string) {
  await delay()
  const t = TICKETS.find((x) => x.id === id)!
  t.is_deleted = true
  log('Moved to bin', t.subject, 'hold')
  notify()
}
export async function restoreTicket(id: string) {
  await delay()
  const t = TICKETS.find((x) => x.id === id)!
  t.is_deleted = false
  log('Restored from bin', t.subject, 'ok')
  notify()
}
export async function permanentDelete(id: string) {
  await delay()
  const i = TICKETS.findIndex((x) => x.id === id)
  if (i >= 0) { log('Permanently deleted', TICKETS[i].subject, 'hold'); TICKETS.splice(i, 1) }
  notify()
}
/** POST /api/tickets/:id/supplier — open a supplier request (SupplierBridge). */
export async function postSupplier(id: string, requestType: string) {
  await delay(250)
  const t = TICKETS.find((x) => x.id === id)!
  t.supplier_status = 'REQUESTED'
  t.supplier_request_type = requestType
  t.status = 'WAITING_SUPPLIER'
  log('Supplier requested', `${requestType} · ${t.subject}`, 'hold')
  notify()
}
/** POST /api/tickets/:id/refresh-order — re-pull the order snapshot. */
export async function refreshOrder(id: string) {
  await delay(700)
  const t = TICKETS.find((x) => x.id === id)!
  log('Order refreshed', `${t.order_name ?? t.subject} · snapshot re-pulled from Shopify`, 'ok')
  notify()
}
/* ---- outbound compose (POST /api/compose in production) */
const OUTBOUND: { at: string; to: string; subject: string; from: string }[] = []
export async function sendCompose(from: string, to: string, subject: string) {
  await delay(300)
  OUTBOUND.unshift({ at: new Date().toISOString(), to, subject, from })
  log('Outbound sent', `${subject} → ${to}`, 'send')
  notify()
}
export function getOutbound() { return OUTBOUND }
/* ---- tasks (production: tasks queue) */
const TASKS = [
  { id: 'k1', t: 'Check reshipment stock · Aurora Linen Set', d: 'damage claim #2061 awaiting supplier', due: 'due today', done: false },
  { id: 'k2', t: 'Confirm supplier ETA · Harbor Robe', d: 'restock answer promised to 2 customers', due: 'due tomorrow', done: false },
  { id: 'k3', t: 'Review dispute evidence · #1991', d: 'chargeback deadline in 6 days', due: 'due in 3 days', done: false },
]
export function getTasks() { return TASKS }
export async function toggleTask(id: string) {
  await delay(60)
  const k = TASKS.find((x) => x.id === id)!
  k.done = !k.done
  if (k.done) log('Task completed', k.t, 'ok')
  notify()
}
