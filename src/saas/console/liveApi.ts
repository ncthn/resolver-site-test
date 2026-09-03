// Live adapter: the same read/mutate surface the console uses, backed by the
// REAL resolver.chat API instead of the in-memory demo store. Tickets are
// cached here and components re-render through the same subscribe/notify
// mechanism the mock uses; sync getters read the cache. Only the surfaces
// listed in api.ts dispatch here — everything else stays demo.
import type { Category, Shop, Ticket, TicketStatus } from './types'

const BASE = '/api'

let tokenProvider: (() => Promise<string | null>) | null = null
export function setTokenProvider(p: () => Promise<string | null>) { tokenProvider = p }
export let CURRENT_EMAIL = ''
/* Selected store, so Sent/Bin/Filtered/Tasks/Activity honour the switcher. */
export let CURRENT_SHOP = 'all'
export function setCurrentShop(id: string) {
  if (CURRENT_SHOP === id) return
  CURRENT_SHOP = id
  // Drop the per-URL response cache for the scoped surfaces. Without this,
  // switching back to a previously-viewed store hit the identical-payload guard
  // and left the OTHER store's rows rendered (with Delete forever available).
  for (const k of Object.keys(RAW_SEEN)) {
    if (/^\/(tickets\/bin|sent|filtered-emails|customs\/tickets)/.test(k)) delete RAW_SEEN[k]
  }
  void refreshBinAndSent(); void refreshFiltered(); void refreshActivity(); void refreshCustoms(); void refreshTasks()
}
export function setCurrentEmail(e: string) { CURRENT_EMAIL = e; notify() }

const listeners = new Set<() => void>()
let version = 0
function notify() { version++; listeners.forEach((l) => l()) }
export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
export function getVersion() { return version }

let TICKETS: Ticket[] = []
/** Ids pulled in by server-side search, outside the normal /tickets window. */
const SEARCH_INJECTED = new Set<string>()
const SEARCH_INJECTED_AT = new Map<string, number>()
/** Ticket the operator currently has open; never expire its pin mid-reply. */
export let OPEN_TICKET_ID = ''
export function setOpenTicketId(id: string) { OPEN_TICKET_ID = id }
export const SHOPS: Shop[] = [{ id: 'all', name: 'All stores', domain: '', open_count: 0 }]
/** Raw production shop docs (policy, ai_support_sop, …) keyed by id. */
const RAW_SHOPS: Record<string, Record<string, unknown>> = {}
export let LAST_ERROR = ''
export let AUTH_ERROR = false
export function isAuthError() { return AUTH_ERROR }
function mutationFailed(what: string, e: unknown) {
  LAST_ERROR = `${what} failed: ${(e as Error).message}`
  notify()
}

let FIRST_LOAD_DONE = false
export function isLoaded() { return FIRST_LOAD_DONE }
// Identical-payload guard: polls whose raw response matches the previous one
// skip JSON.parse, cache rebuild, and notify() entirely — a no-change 12s poll
// causes ZERO re-renders (the compare on the full list payload measures ~1.4ms).
const RAW_SEEN: Record<string, string> = {}

// Stores that disappeared from the account since the shell last looked. Written by
// refreshShops when the list shrinks, drained by the shell so the message is shown
// once. Names are kept because the store is gone from SHOPS by the time anything
// wants to name it.
let REMOVED_SHOPS: { id: string; name: string }[] = []
export function getRemovedShops() { return REMOVED_SHOPS }
export function clearRemovedShops() { REMOVED_SHOPS = [] }

// One in-flight refresh at a time, and at most one per second. Four store rows fail
// their mailbox read together the moment a store is unlinked, and each failure is the
// same news; without this they become four identical GET /shops.
let shopRefreshAt = 0
let shopRefreshInFlight = false
export function refreshShopsNow() {
  const now = Date.now()
  if (shopRefreshInFlight || now - shopRefreshAt < 1000) return
  shopRefreshAt = now
  shopRefreshInFlight = true
  void refreshShops().finally(() => { shopRefreshInFlight = false })
}
async function apiFetchChanged(path: string): Promise<{ changed: boolean; data?: unknown }> {
  const token = tokenProvider ? await tokenProvider() : null
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  })
  if (!res.ok) {
    // Mirror apiFetch: without this an expired session froze every poll behind a
    // generic "HTTP 401" and the "Sign in again" banner never appeared.
    if (res.status === 401) { AUTH_ERROR = true; notify() }
    throw new Error(`HTTP ${res.status}`)
  }
  const text = await res.text()
  AUTH_ERROR = false
  if (RAW_SEEN[path] === text) return { changed: false }
  RAW_SEEN[path] = text
  return { changed: true, data: JSON.parse(text) }
}
/* ------------------------------------------------- plan (billing) gate ----- */
// The server blocks PAID work — generating or regenerating a draft, sending a
// reply, auto-send — with 402 + { plan_inactive: true } once an account's plan
// is POSITIVELY known to be inactive. Reads are never blocked: inbox, tickets,
// thread history, settings and past drafts keep working in every state, so this
// flag only raises a banner and lets the affected buttons explain themselves.
//
// Two sources, deliberately. The poll below is how the banner appears at all
// (nothing else in the console reads billing state), and the 402 handler in
// apiFetch is the immediate one: a merchant who cancels in another tab finds
// out on their next click, not up to two minutes later.
let PLAN_INACTIVE = false
let PLAN_URL: string | null = null
/** { inactive, managedPricingUrl } — inactive drives the banner and the disabled state. */
export function getPlanGate() { return { inactive: PLAN_INACTIVE, managedPricingUrl: PLAN_URL } }
function setPlanGate(inactive: boolean, url: string | null) {
  const nextUrl = url ?? PLAN_URL
  if (PLAN_INACTIVE === inactive && nextUrl === PLAN_URL) return
  PLAN_INACTIVE = inactive
  PLAN_URL = nextUrl
  notify()
}
export async function refreshPlanState() {
  try {
    const s = await apiFetch('/account/summary') as { planState?: string; managedPricingUrl?: string | null }
    // `planState` is planGate.ts's own verdict and the ONLY thing allowed to
    // paywall, now that inactive replaces the entire console rather than dimming
    // two buttons. It is 'unknown' for every uncertain state (billing off, no
    // company, unreadable company doc, no billing store, bypass shop, exempt
    // account, Shopify timeout, any thrown error) and only 'inactive' on a clean
    // "no active subscription".
    //
    // NOT hasSubscription, deliberately: that field reports false when the
    // Shopify read throws, so locking on it would put a paying merchant behind
    // the paywall on a single API blip. A response without planState (an older
    // server) leaves the gate exactly as it was, which means open.
    if (s.planState === 'active' || s.planState === 'inactive' || s.planState === 'unknown') {
      setPlanGate(s.planState === 'inactive', s.managedPricingUrl ?? null)
    }
  } catch { /* a failed read is not a cancel — leave the gate exactly as it was */ }
}

/** Ask the server for the plan verdict RIGHT NOW, apply it, and say what came back.
 *
 *  refreshPlanState() above is fire and forget on purpose: it is a poll, and a poll
 *  that failed must leave the gate exactly where it was rather than announce
 *  anything. That makes it useless to a button. A merchant who has just chosen a
 *  plan and presses Recheck has to be told which of three things happened — the plan
 *  is live (this screen goes), Shopify still says no, or we could not ask — and
 *  'nothing visibly happened' is the one answer that must not be possible. So this
 *  runs the same read and the same verdict rule, and returns the answer.
 *
 *  'unavailable' is NOT a verdict: it is the read failing, and it moves nothing. */
export async function recheckPlanState(): Promise<'active' | 'inactive' | 'unknown' | 'unavailable'> {
  try {
    // ?fresh=1 bypasses the server's per-account memo. The blocking verdict is cached for
    // 10s and the walled console polls every 10s, so without this the button would almost
    // always be answered from cache and could tell someone who just subscribed that they
    // still have no plan. Only this deliberate press pays for a live read.
    const s = await apiFetch('/account/summary?fresh=1') as { planState?: string; managedPricingUrl?: string | null }
    if (s.planState === 'active' || s.planState === 'inactive' || s.planState === 'unknown') {
      setPlanGate(s.planState === 'inactive', s.managedPricingUrl ?? null)
      return s.planState
    }
    // An older server with no planState at all. The gate stays as it was.
    return 'unavailable'
  } catch { return 'unavailable' }
}

async function apiFetch(path: string, init?: RequestInit) {
  const token = tokenProvider ? await tokenProvider() : null
  // FormData bodies must NOT get a manual Content-Type — the browser sets the
  // multipart boundary itself (a forced application/json breaks multer parsing).
  const isForm = typeof FormData !== 'undefined' && init?.body instanceof FormData
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) { AUTH_ERROR = res.status === 401 ? true : AUTH_ERROR; if (res.status === 401) notify() }
    const d = await res.json().catch(() => ({}))
    const msg = (d as { error?: string }).error || `HTTP ${res.status}`
    // The server saying a store is not ours is the one reliable signal that this
    // client's shop list is out of date. Refresh now rather than at the next 5-minute
    // tick, which is what left an unlinked store sitting in the switcher.
    if (res.status === 404 && /shop not found/i.test(msg)) refreshShopsNow()
    // Paid work refused because the plan is not active. Raise the banner from the
    // refusal itself so the merchant is told why, with the link that fixes it.
    if (res.status === 402 && (d as { plan_inactive?: boolean }).plan_inactive === true) {
      setPlanGate(true, (d as { managedPricingUrl?: string | null }).managedPricingUrl ?? null)
    }
    throw new Error(msg)
  }
  AUTH_ERROR = false
  return res.json()
}

/* Map a production ticket onto the console's shape with defensive defaults —
   the console type was derived from production, so this is mostly identity. */
function mapTicket(raw: Record<string, unknown>): Ticket {
  const r = raw as Partial<Ticket> & Record<string, unknown>
  const messages = Array.isArray(r.messages) ? r.messages : []
  return {
    ...r,
    id: String(r.id),
    shop_id: String(r.shop_id ?? ''),
    customer_email: String(r.customer_email ?? ''),
    customer_name: (r.customer_name as string | undefined) ?? null,
    customer_language: String(r.customer_language ?? 'en'),
    subject: String(r.subject ?? '(no subject)'),
    last_customer_message: String(r.last_customer_message ?? ''),
    last_customer_message_at: String(r.last_customer_message_at ?? r.created_at ?? new Date().toISOString()),
    message_count: typeof r.message_count === 'number' ? r.message_count : Math.max(1, messages.length),
    status: (r.status ?? 'OPEN') as TicketStatus,
    category: (r.category ?? 'GENERAL') as Category,
    sentiment: (r.sentiment as Ticket['sentiment']) ?? 'neutral',
    urgency_score: typeof r.urgency_score === 'number' ? r.urgency_score : 50,
    order_id: (r.order_id as string | undefined) ?? null,
    order_name: (r.order_name as string | undefined) ?? null,
    order_match_confidence: typeof r.order_match_confidence === 'number' ? r.order_match_confidence : (r.order_id ? 1 : 0),
    order_match_reason: String(r.order_match_reason ?? (r.order_id ? 'Matched by the pipeline' : 'No match')),
    order_snapshot: r.order_snapshot
      ? ({ payment_gateways: [], tracking_numbers: [], tracking_urls: [], tracking_status: [], line_items: [], ...(r.order_snapshot as object) } as unknown as Ticket['order_snapshot'])
      : undefined,
    draft_body: (r.draft_body as string | undefined) ?? null,
    draft_body_english: (r.draft_body_english as string | undefined) ?? null,
    draft_generated_at: (r.draft_generated_at as string | undefined) ?? null,
    chargeback_status: (r.chargeback_status as Ticket['chargeback_status']) ?? 'none',
    auto_resolved: !!r.auto_resolved,
    auto_send_queued_at: (r.auto_send_queued_at as string | undefined) ?? null,
    supplier_status: (r.supplier_status as Ticket['supplier_status']) ?? null,
    supplier_request_type: (r.supplier_request_type as string | undefined) ?? null,
    is_stuck: !!r.is_stuck,
    is_deleted: !!r.is_deleted,
    customer_history: (() => { const ch = r.customer_history as { total_orders?: number; total_refunds?: number } | string | undefined; if (ch && typeof ch === 'object') { const o = Number(ch.total_orders ?? 0); const rf = Number(ch.total_refunds ?? 0); return `${o} order${o === 1 ? '' : 's'}${rf ? ` · ${rf} refund${rf === 1 ? '' : 's'}` : ''}` } return String(ch ?? '') })(),
    preview: stripHtml(String(r.last_customer_message_english ?? r.last_customer_message ?? '')).slice(0, 200),
    messages: (() => {
      // Attribute AI auto-replies correctly: the server records them on the
      // ticket, so without this every auto-sent reply rendered as "You".
      const ids = new Set(((r.auto_sent_message_ids as string[] | undefined) ?? []).map(String))
      return ids.size ? messages.map((m) => (ids.has(String(m.id)) ? { ...m, auto_sent: true } : m)) : messages
    })(),
    notes: (r.notes as Ticket['notes']) ?? [],
    trace: (r.trace as Ticket['trace']) ?? undefined,
    ai_disabled: !!r.ai_disabled,
    created_at: String(r.created_at ?? new Date().toISOString()),
  } as Ticket
}

let polling = false
// Per-row raw strings so unchanged tickets keep their object identity across
// polls — React then re-diffs only the rows that actually changed.
const ROW_RAW = new Map<string, { raw: string; ticket: Ticket }>()
export async function refreshTickets() {
  try {
    const r = await apiFetchChanged('/tickets')
    if (!r.changed) { if (!FIRST_LOAD_DONE) { FIRST_LOAD_DONE = true; notify() } return }
    const tks = r.data
    const prevById = new Map(TICKETS.map((t) => [t.id, t]))
    const nextRowRaw = new Map<string, { raw: string; ticket: Ticket }>()
    TICKETS = (Array.isArray(tks) ? tks : []).map((x) => {
      const rowRaw = JSON.stringify(x)
      const id = String((x as { id?: unknown }).id)
      const seen = ROW_RAW.get(id)
      if (seen && seen.raw === rowRaw) { nextRowRaw.set(id, seen); return seen.ticket }
      const mapped = mapTicket(x as Record<string, unknown>)
      const prev = prevById.get(mapped.id)
      // List rows are intentionally light (no thread/draft). Keep a previously
      // fetched full thread + draft so the OPEN ticket does not blank on every poll.
      if (prev) {
        // The list endpoint strips heavy fields (stripHeavyForList): messages,
        // draft, notes, order_snapshot, customer_history. Anything a detail
        // fetch already loaded must survive the poll, or writing a note makes
        // it vanish 12s later and opening a ticket empties its own thread.
        if (prev.messages?.length && !mapped.messages?.length) mapped.messages = prev.messages
        // has_draft is authoritative and IS published on list rows. Only carry a
        // draft forward when the server still says one exists — otherwise a
        // draft cleared by an auto-send or another agent came back to life and
        // could be sent a second time to the customer.
        const serverHasDraft = (mapped as { has_draft?: boolean }).has_draft
        if (serverHasDraft === false) { mapped.draft_body = null; mapped.draft_body_english = null; mapped.draft_generated_at = null }
        else if (prev.draft_body && !mapped.draft_body) { mapped.draft_body = prev.draft_body; mapped.draft_body_english = prev.draft_body_english; mapped.draft_generated_at = prev.draft_generated_at }
        if (prev.notes?.length && !mapped.notes?.length) mapped.notes = prev.notes
        if (prev.order_snapshot && !mapped.order_snapshot) mapped.order_snapshot = prev.order_snapshot
        if (prev.customer_history && !mapped.customer_history) mapped.customer_history = prev.customer_history
        if (prev.order_returns?.length && !mapped.order_returns?.length) mapped.order_returns = prev.order_returns
        if (prev.trace?.length && !mapped.trace?.length) mapped.trace = prev.trace
      }
      nextRowRaw.set(id, { raw: rowRaw, ticket: mapped })
      return mapped
    })
    // Preserve tickets pulled in by search: they are outside the /tickets window,
    // so a wholesale reassign evicted the one the agent had open mid-reply.
    const keepIds = new Set(TICKETS.map((t) => t.id))
    for (const prev of prevById.values()) {
      if (!SEARCH_INJECTED.has(prev.id)) continue
      // The server now owns this row again — stop pinning it.
      if (keepIds.has(prev.id)) { SEARCH_INJECTED.delete(prev.id); continue }
      // Never resurrect a deleted row, and expire the pin so a stale snapshot
      // can't be replied to hours later with a draft the server already cleared.
      const injectedAt = SEARCH_INJECTED_AT.get(prev.id) ?? 0
      const isOpen = prev.id === OPEN_TICKET_ID
      if (prev.is_deleted || (!isOpen && Date.now() - injectedAt > 10 * 60_000)) {
        SEARCH_INJECTED.delete(prev.id); SEARCH_INJECTED_AT.delete(prev.id); continue
      }
      TICKETS.push(prev)
    }
    ROW_RAW.clear(); nextRowRaw.forEach((v, k) => ROW_RAW.set(k, v))
    LAST_ERROR = ''
  } catch (e) {
    LAST_ERROR = (e as Error).message
  }
  FIRST_LOAD_DONE = true
  notify()
}
/** Start the Gmail consent flow and return Google's authorize URL.
 *
 *  The endpoint answers with JSON rather than a 302 because it sits behind the
 *  /api Bearer gate: a plain browser redirect would arrive without the token and
 *  401. So we fetch it with the token and navigate the top-level window ourselves.
 *  It also sets an HttpOnly state cookie on THIS response which the callback
 *  requires, so the request has to stay same-origin (BASE is relative).
 *
 *  Deliberately not apiFetch, but NOT because apiFetch hides the server's
 *  message: apiFetch reads d.error off a failed response and rethrows it, and
 *  it is apiFetchChanged that throws a bare `HTTP <status>`. The real reasons
 *  are that apiFetch calls res.json() on every success, and that it drives the
 *  console-wide AUTH_ERROR banner (raised on a 401, cleared on every success),
 *  so this one call could flip the whole console to "sign in again" or quietly
 *  clear a banner it knows nothing about. */
export async function connectInbox(): Promise<string> {
  const token = tokenProvider ? await tokenProvider() : null
  const res = await fetch(BASE + '/email-oauth/connect', {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'same-origin',
  })
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok) throw new Error(body.error || `Could not start the connection (HTTP ${res.status}).`)
  if (!body.url) throw new Error('The server did not return an authorization URL.')
  return body.url
}

/* ══════════════════════════════════════════════ per-store mailboxes ═══
   connectInbox above binds ONE mailbox to the WHOLE account: every store then
   answers from the same address and the console cannot say which mailbox a
   store actually sends from. Per-store is the model now. The same OAuth entry
   point takes ?shop_id=<id> to bind consent to a single store, and
   GET /api/shops/:id/mailbox reports which of the two a store is living on.
   connectInbox stays exported as the back-compat path for stores bound before
   this change; nothing in the console calls it without a shop id. */

/** How a store's mailbox authenticates. Only 'oauth' is connectable and
 *  disconnectable from the console: a 'dwd' mailbox address IS the credential
 *  that authenticates the store, 'postmark' is own-domain sending configured
 *  inline on the shop, and 'legacy' is a shop still sending through the shared
 *  environment token rather than an inbox of its own. Those three are settled
 *  outside the console and carry no control here. */
export type MailboxProvider = 'dwd' | 'oauth' | 'postmark' | 'legacy'
/** Where the mailbox a store is really sending from came from.
 *  'shop' is the correct end state (the store has its own inbox), 'company'
 *  means it is still inheriting the old account-wide mailbox and should be
 *  migrated, 'none' means the SERVER looked and found no mailbox at all, and
 *  'unknown' means we could not tell: a 200 whose body made no sense, or one
 *  with no `source` field. 'unknown' is deliberately NOT 'none': "we could
 *  not read it" must never render as "nothing connected", because 'none' is
 *  the value the console offers Connect on.
 *  'shop' vs 'company' only carries meaning for an 'oauth' store. On the 'dwd'
 *  and 'postmark' paths `source` is derived from the address itself, so those
 *  report 'shop' once they have one and 'none' while they do not. */
export type MailboxSource = 'shop' | 'company' | 'none' | 'unknown'
export interface ShopMailbox {
  address: string | null
  /** Null when the server named a provider this build does not know. Callers
   *  must treat that as "not connectable" rather than guessing. */
  provider: MailboxProvider | null
  source: MailboxSource
  connected_at?: string | null
}

/** Start Gmail consent for ONE store and return Google's authorize URL.
 *
 *  Same contract as connectInbox: JSON rather than a 302 (the route sits behind
 *  the /api Bearer gate), and the HttpOnly state cookie the callback verifies is
 *  set on THIS response, so the request must stay same-origin.
 *
 *  Deliberately not apiFetch, but NOT because apiFetch hides the server's
 *  message: apiFetch reads d.error off a failed response and rethrows it, and
 *  it is apiFetchChanged that throws a bare `HTTP <status>`. The real reasons
 *  are that apiFetch calls res.json() on every success, and that it drives the
 *  console-wide AUTH_ERROR banner (raised on a 401, cleared on every success),
 *  so one store's mailbox call could flip the whole console to "sign in again"
 *  or quietly clear a banner it knows nothing about. */
export async function connectInboxForShop(shopId: string): Promise<string> {
  const token = tokenProvider ? await tokenProvider() : null
  const res = await fetch(BASE + `/email-oauth/connect?shop_id=${encodeURIComponent(shopId)}`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'same-origin',
  })
  const body = (await res.json().catch(() => ({}))) as { url?: string; error?: string }
  if (!res.ok) throw new Error(body.error || `Could not start the connection (HTTP ${res.status}).`)
  if (!body.url) throw new Error('The server did not return an authorization URL.')
  return body.url
}

/** Unbind the mailbox this store owns. Hand-rolled for the same reason as
 *  connectInboxForShop: keeping a single store's call out of the shared
 *  AUTH_ERROR bookkeeping, not because apiFetch would swallow the refusal. */
export async function disconnectShopMailbox(shopId: string): Promise<void> {
  const token = tokenProvider ? await tokenProvider() : null
  const res = await fetch(BASE + `/shops/${encodeURIComponent(shopId)}/mailbox/disconnect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'same-origin',
  })
  const body = (await res.json().catch(() => ({}))) as { error?: string }
  if (!res.ok) throw new Error(body.error || `Could not disconnect the mailbox (HTTP ${res.status}).`)
  // The store row reads its address out of the shop doc, so pull it fresh.
  await refreshShops()
}

/** Which mailbox a store is sending from right now, and where it came from. */
/** How far this store's inbox import has got, or null when there has never been one.
 *
 *  A first import runs for minutes after onboarding. Without this the console shows an
 *  inbox that is filling up with no explanation of why it was empty a moment ago or
 *  whether more is coming, which reads as an unreliable product rather than a working
 *  one. Everything here fails soft: an import that cannot be described is simply not
 *  mentioned, never announced as broken. */
export interface BackfillStatus {
  status: 'running' | 'done' | 'failed'
  total: number
  processed: number
  imported: number
}
export async function getBackfillStatus(shopId: string): Promise<BackfillStatus | null> {
  try {
    const token = tokenProvider ? await tokenProvider() : null
    const res = await fetch(BASE + `/onboarding/history-backfill?shop_id=${encodeURIComponent(shopId)}`, {
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: 'same-origin',
    })
    if (!res.ok) return null
    const j = await res.json() as { running?: boolean; job?: { status?: string; total?: number; processed?: number; imported?: number } | null }
    if (!j || !j.job) return null
    const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
    // The server's `running` is the authority: it is the only side that knows whether
    // the job's process is still alive, and a job that died still SAYS it is running.
    const status = j.running ? 'running' : (j.job.status === 'done' ? 'done' : 'failed')
    return { status, total: n(j.job.total), processed: n(j.job.processed), imported: n(j.job.imported) }
  } catch { return null }
}

/** The dropshipping playbook questions, and saving answers for one shop. Served rather
 *  than duplicated so Settings and the onboarding wizard render the same list. */
export async function sopTemplateQuestions(): Promise<{ questions: Array<Record<string, unknown>> }> {
  return await apiFetch('/onboarding/sop-template') as { questions: Array<Record<string, unknown>> }
}
export async function sopTemplateSave(answers: Record<string, unknown>, shopId: string): Promise<{ ok: boolean }> {
  return await apiFetch('/onboarding/sop-template', {
    method: 'POST',
    body: JSON.stringify({ answers, shop_id: shopId }),
  }) as { ok: boolean }
}

export async function getShopMailbox(shopId: string): Promise<ShopMailbox> {
  const token = tokenProvider ? await tokenProvider() : null
  const res = await fetch(BASE + `/shops/${encodeURIComponent(shopId)}/mailbox`, {
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    credentials: 'same-origin',
  })
  // provider and source stay plain strings here: this is untrusted JSON, and
  // narrowing them to the unions up front would make normalising other
  // spellings impossible. A non-JSON body, and a JSON body that is not a plain
  // object (null, a bare string, an array), both collapse to {}: reading
  // .source off null would throw, and every field is re-validated below.
  const parsed: unknown = await res.json().catch(() => null)
  const body = (parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}) as
    Partial<Omit<ShopMailbox, 'provider' | 'source'>> & { source?: string; provider?: string; error?: string }
  if (!res.ok) throw new Error(body.error || `Could not read this store's mailbox (HTTP ${res.status}).`)
  // Three real answers, plus an honest "we could not tell". A missing or
  // unrecognised source is 'unknown', NEVER 'none'. 'none' means the server
  // looked and found nothing, and it is the value the console offers Connect
  // on: inferring it from a malformed or empty body put a Connect button on
  // every healthy store and called each of them "no inbox connected".
  const source: MailboxSource =
    body.source === 'shop' || body.source === 'company' || body.source === 'none' ? body.source : 'unknown'
  // 'gmail_oauth' is what the credential path is called; the route reports it
  // as 'oauth'. Accept both so a naming mismatch cannot silently hide every
  // Connect button. 'legacy' is a shop on the shared environment token: a real,
  // working mailbox that is not the store's own, and read-only from here. Fail
  // closed on anything else: null means no control at all, which is the safe
  // direction when the credential shape is unknown. Never guess the provider
  // from whether an address came back.
  const provider: MailboxProvider | null =
    body.provider === 'oauth' || body.provider === 'gmail_oauth' ? 'oauth'
    : body.provider === 'dwd' ? 'dwd'
    : body.provider === 'postmark' ? 'postmark'
    : body.provider === 'legacy' ? 'legacy'
    : null
  return {
    address: typeof body.address === 'string' && body.address ? body.address : null,
    provider,
    source,
    connected_at: typeof body.connected_at === 'string' ? body.connected_at : null,
  }
}

export async function refreshShops() {
  try {
    const r = await apiFetchChanged('/shops')
    if (!r.changed) return
    const shopsRaw = r.data
    const list = Array.isArray(shopsRaw) ? shopsRaw : ((shopsRaw as { shops?: unknown[] }).shops ?? [])
    // Which stores this refresh drops. Captured BEFORE the splice, because after it
    // the only record that the store was ever here is gone.
    const incoming = new Set((list as Record<string, unknown>[]).map((s) => String(s.id)))
    const dropped = SHOPS.filter((s) => s.id !== 'all' && !incoming.has(s.id)).map((s) => ({ id: s.id, name: s.name }))
    if (dropped.length) REMOVED_SHOPS = [...REMOVED_SHOPS, ...dropped.filter((d) => !REMOVED_SHOPS.some((r) => r.id === d.id))]
    SHOPS.splice(1, SHOPS.length - 1, ...(list as Record<string, unknown>[]).map((s) => ({
      id: String(s.id), name: String(s.name ?? s.id), domain: String(s.shopify_domain ?? ''), open_count: 0,
      served: s.served !== false,
    })))
    for (const sh of list as Record<string, unknown>[]) RAW_SHOPS[String(sh.id)] = sh
    for (const sh of list as Record<string, unknown>[]) seedLiveRules(String(sh.id), sh.sop_rules)
  } catch { /* keep last */ }
  notify()
}
export async function refresh() { await Promise.all([refreshTickets(), refreshShops()]) }
export function startPolling() {
  if (polling) return
  polling = true
  void refresh()
  void refreshSettings()
  void refreshBinAndSent()
  void refreshMacros()
  void refreshTasks()
  void refreshInboxRules()
  void refreshChargebacks()
  void refreshCustoms()
  void refreshFiltered()
  void refreshActivity()
  void refreshUsers()
  void refreshMe()
  void refreshCsat()
  void refreshPlanState()
  setInterval(() => { void refreshTickets() }, 12_000)
  setInterval(() => { void refreshShops() }, 300_000)
  setInterval(() => { void refreshActivity() }, 30_000)
  setInterval(() => { void refreshChargebacks() }, 60_000)
  setInterval(() => { void refreshBinAndSent() }, 30_000)
  // Slow bucket: surfaces that previously fetched exactly once per session and
  // went stale for the rest of the day (tasks badge, filtered, customs).
  setInterval(() => { void refreshTasks(); void refreshFiltered(); void refreshCustoms() }, 120_000)
  // Billing state, asymmetric. The 402 handler above makes a cancel bite immediately,
  // so this poll exists to CLEAR the wall once a plan is chosen. While the wall is up
  // the merchant has usually just paid and is watching, so ask every 10s; once the
  // console is open, drop to 120s so an ordinary session is not polling billing
  // constantly. Recovery was taking minutes because this ran at 120s on top of the
  // server's own 60s memo.
  let planTick = 0
  setInterval(() => {
    planTick += 10
    if (PLAN_INACTIVE || planTick >= 120) { planTick = 0; void refreshPlanState() }
  }, 10_000)
}

/* ------------------------------------------------------------- reads ----- */
export function listTicketsSync(shopId?: string) {
  return TICKETS.filter((t) => !t.is_deleted && (!shopId || shopId === 'all' || t.shop_id === shopId))
}
export async function listTickets(opts: { shopId?: string; q?: string } = {}) {
  return TICKETS.filter((t) =>
    (!opts.shopId || opts.shopId === 'all' || t.shop_id === opts.shopId) &&
    (!opts.q || (t.subject + t.customer_email + (t.customer_name ?? '') + (t.order_name ?? '')).toLowerCase().includes(opts.q.toLowerCase())),
  )
}
export async function getTicketFull(id: string): Promise<void> {
  try {
    const raw = await apiFetch(`/tickets/${id}`) as Record<string, unknown>
    const full = mapTicket(raw)
    const idx = TICKETS.findIndex((t) => t.id === id)
    if (idx >= 0) TICKETS[idx] = full; else TICKETS.push(full)
    // Keep the row-identity cache pointing at the ENRICHED ticket. Without this
    // the next poll's byte-identical row check returned the pre-detail light
    // object, blanking the open thread and draft.
    const seen = ROW_RAW.get(id)
    if (seen) ROW_RAW.set(id, { raw: seen.raw, ticket: full })
    notify()
  } catch { /* keep the cached list row */ }
}
export function getTicket(id: string): Ticket | null {
  return TICKETS.find((t) => t.id === id) ?? null
}
// Server-side search: pulls matches that may be OUTSIDE the loaded window (old
// tickets by email / order / name) and merges them into TICKETS so the list +
// open-ticket both work. Light rows; unchanged tickets keep their identity.
export async function searchTickets(q: string): Promise<void> {
  try {
    const rows = await apiFetch(`/tickets/search?q=${encodeURIComponent(q)}`) as unknown[]
    if (!Array.isArray(rows) || rows.length === 0) return
    const have = new Set(TICKETS.map((t) => t.id))
    let added = 0
    for (const raw of rows) {
      const m = mapTicket(raw as Record<string, unknown>)
      if (!have.has(m.id)) { TICKETS.push(m); have.add(m.id); SEARCH_INJECTED.add(m.id); SEARCH_INJECTED_AT.set(m.id, Date.now()); added++ }
    }
    if (added) notify()
  } catch { /* ignore */ }
}
export function liveTicketIds(): string[] {
  return TICKETS.filter((t) => !t.is_deleted).map((t) => t.id)
}
export function getCounts(shopId?: string) {
  // Exclude soft-deleted and search-pinned rows: the badge otherwise counts
  // tickets the list does not show, permanently.
  // 'open' matches the inbox's default Open tab (status OPEN only) so the badge
  // and the list never disagree; escalated/waiting have their own tabs.
  const scope = TICKETS.filter((t) => !t.is_deleted && !SEARCH_INJECTED.has(t.id) && (!shopId || shopId === 'all' || t.shop_id === shopId))
  return {
    open: scope.filter((t) => t.status === 'OPEN').length,
    escalated: scope.filter((t) => t.status === 'ESCALATED').length,
    queued: scope.filter((t) => !!t.auto_send_queued_at).length,
  }
}

/* --------------------------------------------------------- mutations ----- */
export async function patchStatus(id: string, status: TicketStatus) {
  const t = TICKETS.find((x) => x.id === id)
  const old = t?.status
  if (t) { t.status = status; notify() }
  apiFetch(`/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
    .catch((e) => { if (t && old) t.status = old; mutationFailed('Status change', e) })
}
export async function patchCategory(id: string, category: Category) {
  const t = TICKETS.find((x) => x.id === id)
  const old = t?.category
  if (t) { t.category = category; notify() }
  apiFetch(`/tickets/${id}/category`, { method: 'PATCH', body: JSON.stringify({ category }) })
    .catch((e) => { if (t && old) t.category = old; mutationFailed('Category change', e) })
}
export async function postSend(id: string, body: string, files?: File[], bodyEnglish?: string) {
  const t = TICKETS.find((x) => x.id === id)
  const saved = t ? { status: t.status, draft_body: t.draft_body, draft_body_english: t.draft_body_english, messages: t.messages } : null
  if (t) {
    const pending = {
      id: `pending-${Date.now()}`, from: 'you', from_name: 'You', date: new Date().toISOString(), body, is_customer: false,
      ...(files?.length ? { attachments: files.map((f) => ({ filename: f.name, size: f.size })) } : {}),
    }
    t.messages = [...(t.messages ?? []), pending]
    t.draft_body = null; t.draft_body_english = null
    t.status = 'WAITING_CUSTOMER'
    notify()
  }
  try {
    if (files && files.length > 0) {
      const fd = new FormData()
      fd.append('body', body)
      if (bodyEnglish && bodyEnglish.trim()) fd.append('body_english', bodyEnglish.trim())
      for (const f of files.slice(0, 5)) fd.append('attachments', f)
      await apiFetch(`/tickets/${id}/send`, { method: 'POST', body: fd })
    } else {
      await apiFetch(`/tickets/${id}/send`, { method: 'POST', body: JSON.stringify(bodyEnglish && bodyEnglish.trim() ? { body, body_english: bodyEnglish.trim() } : { body }) })
    }
    // Deferred deliberately — see above. An immediate refetch races the server's
    // own post-response bookkeeping AND Gmail's thread indexing, and makes a
    // successful send look like it never happened.
    setTimeout(() => { void getTicketFull(id) }, 3000)
  } catch (e) {
    if (t && saved) { t.status = saved.status; t.draft_body = saved.draft_body; t.draft_body_english = saved.draft_body_english; t.messages = saved.messages }
    mutationFailed('Send', e)
    throw e
  }
}
export async function postRegenerate(id: string, instructions?: string) {
  try {
    // The route has always accepted `instructions` and injects them into the
    // prompt as [AGENT INSTRUCTIONS FOR THIS REPLY: ...]. The console just never
    // sent them, so the legacy app's "write a reply from my prompt" was lost.
    const body = instructions && instructions.trim() ? JSON.stringify({ instructions: instructions.trim() }) : undefined
    await apiFetch(`/tickets/${id}/regenerate`, { method: 'POST', ...(body ? { body } : {}) })
  } catch (e) { mutationFailed('Regenerate', e); throw e }
  // Must be the DETAIL fetch: refresh() reloads stripped list rows, and the
  // carry-over then restored the OLD draft, so Regenerate appeared to do nothing.
  await getTicketFull(id)
}
export async function postAiToggle(id: string) {
  const t = TICKETS.find((x) => x.id === id)
  // The server reads `{disabled}` (or `{enabled:false}`) off the BODY. Sending
  // no body made `enabled` always false, so every click wrote ai_disabled:false
  // — the switch looked like it worked (optimistic flip + 200) but AI kept
  // drafting on tickets a human had taken over. Send the desired state.
  const desired = !(t?.ai_disabled)
  if (t) { t.ai_disabled = desired; notify() }
  apiFetch(`/tickets/${id}/ai-toggle`, { method: 'POST', body: JSON.stringify({ disabled: desired }) })
    .catch((e) => { if (t) t.ai_disabled = !desired; mutationFailed('AI toggle', e) })
}
export async function addNote(id: string, body: string) {
  const r = await apiFetch(`/tickets/${id}/notes`, { method: 'POST', body: JSON.stringify({ body }) }) as { note: NonNullable<Ticket['notes']>[number] }
  const t = TICKETS.find((x) => x.id === id)
  if (t) { t.notes = [...(t.notes ?? []), r.note] }
  notify()
}
export async function summarizeThread(id: string) {
  const r = await apiFetch(`/tickets/${id}/summarize`, { method: 'POST' }) as { note: NonNullable<Ticket['notes']>[number] }
  const t = TICKETS.find((x) => x.id === id)
  if (t) { t.notes = [...(t.notes ?? []), r.note] }
  notify()
}

/* -------------------------------------------- live shop policy + SOP ----- */
export function getShopRaw(shopId: string): Record<string, unknown> | null {
  return RAW_SHOPS[shopId] ?? null
}
export async function saveShopPolicy(shopId: string, policy: Record<string, string | number> | null) {
  await apiFetch(`/shops/${shopId}`, { method: 'PATCH', body: JSON.stringify({ policy }) })
  if (RAW_SHOPS[shopId]) RAW_SHOPS[shopId].policy = policy
  notify()
}
let CSAT_SUMMARY: { avg: number; count: number; dist: [number, number][]; recent: { rating: number; comment: string; shop_id: string; at: string }[] } = { avg: 0, count: 0, dist: [], recent: [] }
export function getCsatSummary() { return CSAT_SUMMARY }
export async function refreshCsat() { try { CSAT_SUMMARY = await apiFetch('/csat/summary') as typeof CSAT_SUMMARY } catch { /* keep */ } notify() }
function _lines(v: unknown): string[] { return String(v ?? '').split('\n').map((x) => x.trim()).filter(Boolean) }
export function getMailFilters(): { keywords: string[]; senders: string[]; allow: string[] } {
  const s = SETTINGS_CACHE as Record<string, unknown>
  return { keywords: _lines(s.filter_keywords), senders: _lines(s.filter_senders), allow: _lines(s.filter_always_allow) }
}
export async function setMailFilters(kind: 'keywords' | 'senders' | 'allow', values: string[]) {
  const field = kind === 'keywords' ? 'filter_keywords' : kind === 'senders' ? 'filter_senders' : 'filter_always_allow'
  const value = values.join('\n')
  await apiFetch('/settings', { method: 'PATCH', body: JSON.stringify({ [field]: value }) })
  ;(SETTINGS_CACHE as Record<string, unknown>)[field] = value
  notify()
}
export async function setCsatEnabled(enabled: boolean) {
  (SETTINGS_CACHE as Record<string, unknown>).csat_enabled = enabled; notify()
  apiFetch('/settings', { method: 'PATCH', body: JSON.stringify({ csat_enabled: enabled }) })
    .catch((e) => { (SETTINGS_CACHE as Record<string, unknown>).csat_enabled = !enabled; mutationFailed('Survey toggle', e) })
}
export async function saveShopKnowledge(shopId: string, sources: { id: string; title: string; text: string; enabled: boolean }[]) {
  await apiFetch(`/shops/${shopId}`, { method: 'PATCH', body: JSON.stringify({ knowledge_sources: sources }) })
  if (RAW_SHOPS[shopId]) (RAW_SHOPS[shopId] as Record<string, unknown>).knowledge_sources = sources
  notify()
}
export async function saveShopAbilities(shopId: string, abilities: Record<string, boolean>) {
  await apiFetch(`/shops/${shopId}`, { method: 'PATCH', body: JSON.stringify({ abilities }) })
  if (RAW_SHOPS[shopId]) (RAW_SHOPS[shopId] as Record<string, unknown>).abilities = abilities
  notify()
}
export async function saveShopVoice(shopId: string, fields: { ai_brand_voice_hint?: string; signature_block?: string }) {
  await apiFetch(`/shops/${shopId}`, { method: 'PATCH', body: JSON.stringify(fields) })
  if (RAW_SHOPS[shopId]) Object.assign(RAW_SHOPS[shopId] as Record<string, unknown>, fields)
  notify()
}
export async function saveShopSop(shopId: string, sop: string) {
  await apiFetch(`/shops/${shopId}`, { method: 'PATCH', body: JSON.stringify({ ai_support_sop: sop }) })
  if (RAW_SHOPS[shopId]) RAW_SHOPS[shopId].ai_support_sop = sop
  notify()
}

/* ------------------------------------------ live auto-send + readiness --- */
let SETTINGS_CACHE: { auto_send_enabled?: boolean; auto_send_per_shop?: Record<string, 'off' | 'shadow' | 'live'> } = {}
export function getLiveSettings() { return SETTINGS_CACHE }
export async function refreshSettings() {
  try { SETTINGS_CACHE = await apiFetch('/settings') as typeof SETTINGS_CACHE } catch { /* keep last */ }
  notify()
}
export async function setAutoSendMode(shopId: string, mode: 'off' | 'shadow' | 'live') {
  await apiFetch('/admin/auto-send-mode', { method: 'POST', body: JSON.stringify({ per_shop: { [shopId]: mode } }) })
  SETTINGS_CACHE.auto_send_per_shop = { ...(SETTINGS_CACHE.auto_send_per_shop ?? {}), [shopId]: mode }
  notify()
}
export async function laneReadiness(shopId: string) {
  return await apiFetch(`/lanes/readiness?shop_id=${encodeURIComponent(shopId)}`) as { needed: number; lanes: { category: string; reviewed: number; clean: number; clean_rate: number; ready: boolean }[]; readiness_waived?: boolean; proven_live_sends?: number; waiver_threshold?: number }
}

/* --------------------------------------------------------- live compose --- */
export interface LiveOrder { order_name?: string; order_id?: string; customer_email?: string; shipping_name?: string; customer_display_name?: string; shipping_country?: string; total_price?: string; currency?: string; line_items?: { title: string; quantity: number }[]; [k: string]: unknown }
export async function composeSearchOrder(query: string, shopId: string) {
  return await apiFetch('/compose/search-order', { method: 'POST', body: JSON.stringify({ query, shop_id: shopId }) }) as { order: LiveOrder | null; confidence?: number; reason?: string }
}
export async function composeGenerateDraft(order: LiveOrder | null, instructions: string, shopId: string) {
  return await apiFetch('/compose/generate-draft', { method: 'POST', body: JSON.stringify({ order, instructions, shop_id: shopId }) }) as { draft: string; english: string; language: string; subject: string }
}
export async function composeSendLive(data: { to: string; subject: string; body: string; order_snapshot?: Record<string, unknown>; order_id?: string; language?: string; shop_id: string }) {
  return await apiFetch('/compose/send', { method: 'POST', body: JSON.stringify(data) })
}

/* ------------------------------------------------------------ live team --- */
export interface LiveUser { id: string; email: string; name: string; role: 'admin' | 'agent'; read_only: boolean; is_active: boolean; last_login_at: string | null }
export async function listUsers() {
  return await apiFetch('/users') as LiveUser[]
}
/* The assignment roster reads /team, which any authenticated session can see —
   /api/users is adminOnly (management surface), which left the Assign menu
   EMPTY for agent sessions. */
type TeamMember = { id: string; email: string; name: string; role?: string }
let USERS: TeamMember[] = []
export async function refreshUsers() { try { USERS = await apiFetch('/team') as TeamMember[] } catch { /* keep */ } notify() }
let VIEWERS_LIVE: Record<string, string[]> = {}
export function getViewers(ticketId: string): string[] { return VIEWERS_LIVE[ticketId] ?? [] }
export async function heartbeatViewing(ticketId: string) {
  try {
    const r = await apiFetch(`/tickets/${ticketId}/viewing`, { method: 'POST' }) as { viewers?: string[] }
    const next = r.viewers ?? []
    const prev = VIEWERS_LIVE[ticketId] ?? []
    if (next.length === prev.length && next.every((v, i) => v === prev[i])) return
    VIEWERS_LIVE[ticketId] = next
    notify()
  } catch { /* ignore */ }
}
export function getTeam(): { id: string; name: string; initials: string; email: string }[] {
  return USERS.map((u) => ({ id: u.id, name: u.name || u.email, email: u.email, initials: ((u.name || u.email || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('') || '?').toUpperCase() }))
}
export async function assignTicket(id: string, userId: string | null) {
  const t = TICKETS.find((x) => x.id === id); if (t) (t as { assignee?: string | null }).assignee = userId
  notify()
  await apiFetch(`/tickets/${id}/assignee`, { method: 'PATCH', body: JSON.stringify({ userId }) }).catch(() => void refresh())
}
export async function saveNotificationPrefs(prefs: Record<string, boolean>) {
  await apiFetch('/settings', { method: 'PATCH', body: JSON.stringify({ notification_prefs: prefs }) })
  ;(SETTINGS_CACHE as Record<string, unknown>).notification_prefs = prefs
  notify()
}
export async function createUser(data: { email: string; name: string; role: 'admin' | 'agent' }) {
  return await apiFetch('/users', { method: 'POST', body: JSON.stringify(data) })
}
export async function updateUser(id: string, patch: Record<string, unknown>) {
  return await apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}
export async function deleteUser(id: string) {
  return await apiFetch(`/users/${id}`, { method: 'DELETE' })
}
export async function connectShopify(shopDomain: string): Promise<{ installUrl: string }> {
  return await apiFetch('/shopify/connect', { method: 'POST', body: JSON.stringify({ shop: shopDomain }) }) as { installUrl: string }
}

/* -------------------------------------------------------- live bin/sent --- */
let BIN: Ticket[] = []
let SENT: { at: string; to: string; subject: string; from: string }[] = []
export function listBinSync() { return BIN }
/** Search-pinned rows are inbox-only; other views must not surface them. */
export function isSearchPinned(id: string) { return SEARCH_INJECTED.has(id) }
export function getOutbound() { return SENT }
export async function refreshBinAndSent() {
  const _sq = CURRENT_SHOP && CURRENT_SHOP !== 'all' ? `shop_id=${encodeURIComponent(CURRENT_SHOP)}&` : ''
  const [binR, sentR] = await Promise.allSettled([apiFetchChanged(`/tickets/bin?${_sq}`.replace(/[?&]$/, '')), apiFetchChanged(`/sent?${_sq}limit=100`)])
  const binChanged = binR.status === 'fulfilled' && binR.value.changed
  const sentChanged = sentR.status === 'fulfilled' && sentR.value.changed
  if (!binChanged && !sentChanged) return
  try {
    if (binChanged) {
      const bin = (binR as PromiseFulfilledResult<{ changed: boolean; data?: unknown }>).value.data
      BIN = (Array.isArray(bin) ? bin : []).map((x) => mapTicket(x as Record<string, unknown>))
    }
  } catch { /* keep last */ }
  try {
    if (!sentChanged) { notify(); return }
    const sentRaw = (sentR as PromiseFulfilledResult<{ changed: boolean; data?: unknown }>).value.data as unknown[]
    SENT = (Array.isArray(sentRaw) ? sentRaw : []).map((r) => {
      const x = r as Record<string, unknown>
      return {
        at: String(x.sent_at ?? x.created_at ?? x.at ?? ''),
        to: String(x.to ?? x.customer_email ?? ''),
        subject: String(x.subject ?? x.details ?? 'Outbound email'),
        from: String(x.sent_by ?? x.shop_id ?? x.performed_by ?? ''),
      }
    }).filter((x) => x.at)
  } catch { /* keep last */ }
  notify()
}
type LiveActivity = { at: string; ev: string; detail: string; kind: 'send' | 'ok' | 'hold' }
let ACTIVITY: LiveActivity[] = []
export function getLog(): LiveActivity[] { return ACTIVITY }
export async function refreshActivity() {
  try {
    const r = await apiFetchChanged('/activity-logs?limit=100')
    if (!r.changed) return
    const raw = r.data as Record<string, unknown>[]
    ACTIVITY = (Array.isArray(raw) ? raw : []).map((l) => {
      const action = String(l.action ?? '')
      const kind: LiveActivity['kind'] = /auto.?send|sent/i.test(action) ? 'send' : /escalat|hold|supplier|flag|cancel|paused/i.test(action) ? 'hold' : 'ok'
      return { at: String(l.created_at ?? l.at ?? ''), ev: action || 'Action', detail: String(l.details ?? l.detail ?? l.shop_id ?? ''), kind }
    }).filter((x) => x.at)
  } catch { /* keep last */ }
  notify()
}
export async function cancelAutoSend(id: string) {
  const t = TICKETS.find((x) => x.id === id)
  const old = t?.auto_send_queued_at
  if (t) { t.auto_send_queued_at = undefined; notify() }
  apiFetch(`/admin/cancel-pending-auto-send/${id}`, { method: 'POST' })
    .catch((e) => { if (t) t.auto_send_queued_at = old ?? undefined; mutationFailed('Cancel auto-send', e) })
}
export async function permanentDelete(id: string) {
  try {
    await apiFetch(`/tickets/${id}/permanent`, { method: 'DELETE' })
    BIN = BIN.filter((x) => x.id !== id)
    notify()
  } catch (e) { mutationFailed('Delete forever', e) }
}
/* The route destructures `{ type, issue, action }` and hands ALL THREE to
   discordService.sendSupplierMessage, which builds the embed with
   `addFields({name:'Issue', value:data.issue}, {name:'Action Needed', value:data.action})`.
   discord.js v14 rejects an undefined field value, so the embed threw, the
   send returned null and the route answered 500 "Discord send failed" — EVERY
   time. The console only ever sent `{type}`, so "Ask supplier" has been dead,
   not merely incomplete (no supplier request has been recorded since the v3
   cutover). Both fields are required here for that reason. */
export async function postSupplier(id: string, requestType: string, issue: string, action: string) {
  const t = TICKETS.find((x) => x.id === id)
  const old = t?.supplier_status
  if (t) { t.supplier_status = 'REQUESTED'; notify() }
  try {
    await apiFetch(`/tickets/${id}/supplier`, {
      method: 'POST',
      body: JSON.stringify({ type: requestType, issue, action }),
    })
    void getTicketFull(id)
  } catch (e) {
    if (t) { t.supplier_status = old ?? null; notify() }
    mutationFailed('Ask supplier', e)
    throw e
  }
}
/* Close out a supplier request that was answered off-channel. `supplier_status`
   is on PATCH /api/tickets/:id's ALLOWED_TICKET_FIELDS allowlist.
   Without it a REQUESTED ticket can never leave that state from the
   console — the request form hides itself once a request exists. Writes an
   internal flag only: no email, no Discord message, and a new request can be
   raised straight afterwards. */
export async function resolveSupplier(id: string) {
  const t = TICKETS.find((x) => x.id === id)
  const old = t?.supplier_status
  if (t) { t.supplier_status = 'RESOLVED'; notify() }
  try {
    await apiFetch(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ supplier_status: 'RESOLVED' }) })
    void getTicketFull(id)
  } catch (e) {
    if (t) { t.supplier_status = old ?? null; notify() }
    mutationFailed('Close supplier request', e)
    throw e
  }
}
/* Signed URL for a Gmail attachment: <a>/<img> can't send an Authorization
   header, so the server accepts ?token= on /attachments/ paths (private,
   no-store). Built on demand so the Firebase token is always fresh. */
export async function attachmentUrl(shopId: string, messageId: string, attachmentId: string, mimeType?: string): Promise<string | null> {
  const token = tokenProvider ? await tokenProvider() : null
  if (!token) return null
  const qs = new URLSearchParams({ mimeType: mimeType || 'application/octet-stream', shop_id: shopId, token })
  return `${BASE}/attachments/${encodeURIComponent(messageId)}/${encodeURIComponent(attachmentId)}?${qs.toString()}`
}
export async function unlinkOrder(id: string) {
  apiFetch(`/tickets/${id}/unlink-order`, { method: 'POST' })
    .then(() => { void getTicketFull(id) })
    .catch((e) => mutationFailed('Unlink order', e))
}
export async function deleteTicket(id: string) {
  const t = TICKETS.find((x) => x.id === id)
  if (t) { t.is_deleted = true; notify() }
  try {
    await apiFetch(`/tickets/${id}`, { method: 'DELETE' })
    void refreshBinAndSent()
  } catch (e) { if (t) t.is_deleted = false; mutationFailed('Move to bin', e) }
}
export async function restoreTicket(id: string) {
  const row = BIN.find((x) => x.id === id)
  BIN = BIN.filter((x) => x.id !== id)
  notify()
  try {
    await apiFetch(`/tickets/${id}/restore`, { method: 'POST' })
    void refreshTickets(); void refreshBinAndSent()
  } catch (e) { if (row) { BIN = [row, ...BIN] } mutationFailed('Restore', e) }
}

/* ----------------------------------------------------------- live stats --- */
export interface LiveStats {
  total: number; open: number; resolved: number; escalated: number
  createdToday: number; createdThisWeek: number; resolvedThisWeek: number
  categoryBreakdown: Record<string, number>
  dailyCreated: Record<string, number>
  avgResponseTimeHours: number | null
  p50FrtHours: number | null
  p90FrtHours?: number | null
  resolutionRate: number | null
  createdInWindow?: number; resolvedInWindow?: number
  unansweredInWindow?: number; breachOver24h?: number; breachOver48h?: number
  waitingCustomer?: number; waitingSupplier?: number; stuck?: number
  chargebacks?: number; chargebackRevenue?: number
  backlogAge?: { open_total?: number; oldest_hours?: number; under_1d?: number; one_to_three_d?: number; three_to_seven_d?: number; over_seven_d?: number; buckets?: Record<string, number> }
  [k: string]: unknown
}
const STATS: Record<string, LiveStats | undefined> = {}
export function getLiveStats(key: string) { return STATS[key] }
const STATS_ERR: Record<string, string> = {}
/** Why the Overview has no numbers. Swallowing the error made a failed /stats
 *  indistinguishable from "no data yet" — every KPI just showed an ellipsis
 *  forever with nothing to diagnose. */
export function getStatsError(key: string): string | null { return STATS_ERR[key] ?? null }
export async function refreshStats(shopId: string | undefined, days: number) {
  const key = `${shopId ?? 'all'}:${days}`
  try {
    const q = new URLSearchParams({ days: String(days), ...(shopId && shopId !== 'all' ? { shop_id: shopId } : {}) })
    STATS[key] = await apiFetch(`/stats?${q}`) as LiveStats
    delete STATS_ERR[key]
  } catch (e) { STATS_ERR[key] = (e as Error).message || 'Could not load stats' }
  notify()
}

/* ------------------------------------------------------- live returns ---- */
export function getReturn(ticketId: string): { stage: 'requested' | 'options_sent' | 'return_approved' | 'item_received' | 'refunded' | 'partial_refunded'; option: 'A' | 'B' | null; updated_at: string } | null {
  const t = TICKETS.find((x) => x.id === ticketId) as (Ticket & { returns?: { stage: 'requested' | 'options_sent' | 'return_approved' | 'item_received' | 'refunded' | 'partial_refunded'; option: 'A' | 'B' | null; updated_at: string } | null }) | undefined
  return t?.returns ?? null
}
export async function startReturn(ticketId: string) {
  await apiFetch(`/tickets/${ticketId}/return/start`, { method: 'POST' })
  void refresh()
}
/* POST /api/tickets/:id/return/cancel had no caller, so a return tracker opened
   on the wrong conversation could never be closed — every later visit showed a
   return in progress that nobody intended. The route clears `returns`, writes
   an AI note recording the stage it was cancelled at, and takes an optional
   `reason` that goes into that note. */
export async function cancelReturn(ticketId: string, reason?: string) {
  await apiFetch(`/tickets/${ticketId}/return/cancel`, {
    method: 'POST',
    body: JSON.stringify(reason && reason.trim() ? { reason: reason.trim() } : {}),
  })
  const t = TICKETS.find((x) => x.id === ticketId) as (Ticket & { returns?: unknown }) | undefined
  if (t) t.returns = null
  notify()
  await getTicketFull(ticketId)
}
export async function advanceReturn(ticketId: string, choice?: 'A' | 'B') {
  const r = await apiFetch(`/tickets/${ticketId}/return/advance`, { method: 'POST', body: JSON.stringify({ choice }) }) as { returns: { stage: 'requested' | 'options_sent' | 'return_approved' | 'item_received' | 'refunded' | 'partial_refunded'; option: 'A' | 'B' | null; updated_at: string } }
  const t = TICKETS.find((x) => x.id === ticketId) as (Ticket & { returns?: unknown }) | undefined
  if (t) t.returns = r.returns
  notify(); void refresh()
}

/* ---------------------------------------------------------- live macros --- */
let LIVE_MACROS: { id: string; label: string; body: string }[] = []
export function getMacros() { return LIVE_MACROS }

/** Fill a saved reply's {tokens} from the ticket on screen. Pure; unknown or
    missing fields degrade to neutral wording rather than leaving a raw token.
    Lived in mockApi.ts, but it never used mock data: the ticket is the live
    one and the body is the merchant's own macro. */
export function fillMacro(body: string, t: Ticket): string {
  const first = (t.customer_name ?? '').split(' ')[0] || 'there'
  return body
    .replace(/\{first_name\}/g, first)
    .replace(/\{order\}/g, t.order_name ?? 'your order')
    .replace(/\{tracking\}/g, t.order_snapshot?.tracking_urls?.[0] && t.order_snapshot.tracking_numbers[0] ? t.order_snapshot.tracking_numbers[0] : 'the tracking link')
    .replace(/\{tracking_status\}/g, t.order_snapshot?.tracking_status?.[0] ?? 'in transit')
}
export async function refreshMacros() {
  try { LIVE_MACROS = await apiFetch('/macros') as typeof LIVE_MACROS } catch { /* keep last */ }
  notify()
}
export async function createMacro(label: string, body: string) {
  await apiFetch('/macros', { method: 'POST', body: JSON.stringify({ label, body }) })
  await refreshMacros()
}
export async function updateMacro(id: string, label: string, body: string) {
  await apiFetch(`/macros/${id}`, { method: 'PATCH', body: JSON.stringify({ label, body }) })
  await refreshMacros()
}
export async function deleteMacro(id: string) {
  await apiFetch(`/macros/${id}`, { method: 'DELETE' })
  LIVE_MACROS = LIVE_MACROS.filter((m) => m.id !== id)
  notify()
}
export interface ApiKeyRow { id: string; name: string; scopes: string[]; mode?: string; prefix?: string; last4?: string; created_at?: string; last_used_at?: string | null; expires_at?: string | null; revoked?: boolean }
export async function listApiKeys(): Promise<ApiKeyRow[]> {
  const r = await apiFetch('/account/api-keys') as { data?: ApiKeyRow[] }
  return r.data ?? []
}
/* `expires_at` is accepted by POST /api/account/api-keys and ENFORCED on every
   request (apiKeyService.ts:117 rejects a key past its expiry). The console
   never sent it, so every key ever minted here lives until someone remembers
   to revoke it. ISO 8601, must be in the future — the server 400s otherwise.
   (`mode` is deliberately still not sent: it is inert unless the V1_REQUIRE_MODE
   env var is set, so a "test key" control would promise a sandbox that does
   not exist.) */
export async function createApiKey(name: string, scopes: string[], expiresAt?: string): Promise<{ id: string; key: string }> {
  const body: Record<string, unknown> = { name, scopes }
  if (expiresAt) body.expires_at = expiresAt
  return await apiFetch('/account/api-keys', { method: 'POST', body: JSON.stringify(body) }) as { id: string; key: string }
}
export async function revokeApiKey(id: string): Promise<void> {
  await apiFetch(`/account/api-keys/${id}`, { method: 'DELETE' })
}
export async function seedMacros() {
  await apiFetch('/admin/seed-macros', { method: 'POST' })
  await refreshMacros()
}

/* ------------------------------------------------- live structured rules -- */
import type { SopRuleV2 } from './types'
export const SOP_RULES_LIVE: Record<string, SopRuleV2[]> = {}
const rulesDirty = new Set<string>()
const saveTimers: Record<string, ReturnType<typeof setTimeout>> = {}

export function seedLiveRules(shopId: string, raw: unknown) {
  if (rulesDirty.has(shopId)) return
  const arr = Array.isArray(raw) ? raw : []
  SOP_RULES_LIVE[shopId] = (arr as Record<string, unknown>[]).map((r) => ({
    id: String(r.id ?? 'r' + Math.abs(JSON.stringify(r).length)),
    category: (r.category as SopRuleV2['category']) ?? 'Other',
    when: String(r.when ?? ''),
    conds: Array.isArray(r.conds) ? (r.conds as string[]) : [],
    then: String(r.then ?? ''),
    enabled: r.enabled !== false,
    hits30d: 0,
    locked: !!r.locked,
  }))
}

function scheduleRulesSave(shopId: string) {
  rulesDirty.add(shopId)
  notify()
  clearTimeout(saveTimers[shopId])
  saveTimers[shopId] = setTimeout(() => {
    const rules = (SOP_RULES_LIVE[shopId] ?? []).map(({ hits30d, ...r }) => { void hits30d; return r })
    apiFetch(`/shops/${shopId}`, { method: 'PATCH', body: JSON.stringify({ sop_rules: rules }) })
      .then(() => { rulesDirty.delete(shopId); if (RAW_SHOPS[shopId]) RAW_SHOPS[shopId].sop_rules = rules })
      .catch(() => { LAST_ERROR = 'Saving rules failed — retrying on next edit'; notify() })
  }, 700)
}

export function updateRulePartV2(shopId: string, id: string, part: 'when' | 'then', text: string) {
  const r = (SOP_RULES_LIVE[shopId] ?? []).find((x) => x.id === id)
  if (r && !r.locked) { r[part] = text; scheduleRulesSave(shopId) }
}
export function updateRuleCondV2(shopId: string, id: string, idx: number, text: string) {
  const r = (SOP_RULES_LIVE[shopId] ?? []).find((x) => x.id === id)
  if (r && !r.locked) { if (text.trim()) r.conds[idx] = text; else r.conds.splice(idx, 1); scheduleRulesSave(shopId) }
}
export function toggleRuleV2(shopId: string, id: string) {
  const r = (SOP_RULES_LIVE[shopId] ?? []).find((x) => x.id === id)
  if (r && !r.locked) { r.enabled = !r.enabled; scheduleRulesSave(shopId) }
}
export function deleteRuleV2(shopId: string, id: string) {
  const list = SOP_RULES_LIVE[shopId] ?? []
  const i = list.findIndex((x) => x.id === id)
  if (i >= 0 && !list[i].locked) { list.splice(i, 1); scheduleRulesSave(shopId) }
}
export async function addRuleV2(shopId: string, rule: Omit<SopRuleV2, 'id' | 'hits30d' | 'enabled'>) {
  const list = (SOP_RULES_LIVE[shopId] = SOP_RULES_LIVE[shopId] ?? [])
  list.push({ ...rule, id: 'r' + Math.random().toString(36).slice(2, 10), hits30d: 0, enabled: true })
  scheduleRulesSave(shopId)
}

/* --------------------------------------------------------- live insights -- */
export interface LiveInsight { severity: 'warn' | 'info' | 'good'; label: string; detail: string; count: number; action: string }
const INSIGHTS_LIVE: Record<string, { tickets: number; insights: LiveInsight[] } | undefined> = {}
export function getLiveInsights(shopId: string) { return INSIGHTS_LIVE[shopId] }
export async function refreshInsights(shopId: string) {
  if (!shopId || shopId === 'all') return
  try { INSIGHTS_LIVE[shopId] = await apiFetch(`/insights?shop_id=${encodeURIComponent(shopId)}`) as { tickets: number; insights: LiveInsight[] } } catch { /* keep last */ }
  notify()
}

/* ------------------------------------------------------------ live tasks -- */
import type { TaskCol } from './types'
export type TaskSource = 'manual' | 'stuck_ticket' | 'chargeback_due' | 'shop_health'
export type TaskPriority = 'low' | 'normal' | 'high'
/* What the task IS, as opposed to where it came from (`source`). Used by both
   hand-made and generated cards; POST/PATCH /api/kanban-tasks carry it as
   `type`. An unrecognised or absent value maps to 'other' — never to a guess,
   and never invented for rows that predate the field (see mapTask). */
export type TaskType =
  | 'email_change' | 'address_change' | 'cancel_request'
  | 'refund_to_process' | 'supplier_followup' | 'other'
/* Rows the console renders. `derived` marks the read-only cards the server
   synthesises from WAITING_SUPPLIER tickets (id `sup:<ticketId>`) — they are
   not documents, so nothing but "open the ticket" may be offered on them. */
export interface LiveTask {
  id: string; t: string; d: string; due: string; col: TaskCol; ticketId?: string
  derived: boolean
  shopId?: string
  source: TaskSource
  sourceKey?: string
  /** Absent on rows written before the field existed — the view shows no type
      chip at all rather than labelling them "Other". */
  type?: TaskType
  priority: TaskPriority
  snoozedUntil?: string
  createdAt?: string
  updatedAt?: string
}
interface RawTask {
  id?: unknown; title?: unknown; detail?: unknown; col?: unknown; due?: unknown
  ticket_id?: unknown; shop_id?: unknown; source?: unknown; source_key?: unknown
  priority?: unknown; snoozed_until?: unknown; created_at?: unknown; updated_at?: unknown
  type?: unknown
  derived?: unknown
}
const TASK_COLS: TaskCol[] = ['todo', 'doing', 'waiting', 'done']
const TASK_SOURCES: TaskSource[] = ['manual', 'stuck_ticket', 'chargeback_due', 'shop_health']
export const TASK_TYPES: TaskType[] = ['email_change', 'address_change', 'cancel_request', 'refund_to_process', 'supplier_followup', 'other']
const TASK_PRIORITIES: TaskPriority[] = ['low', 'normal', 'high']
const str = (v: unknown) => (typeof v === 'string' ? v : '')
/* Older rows predate shop_id/source/priority/snoozed_until — every one of them
   is defaulted here so the view never has to guard a missing field. */
function mapTask(r: RawTask): LiveTask {
  const id = String(r.id ?? '')
  const derived = r.derived === true || id.startsWith('sup:')
  const source = TASK_SOURCES.includes(str(r.source) as TaskSource)
    ? (str(r.source) as TaskSource)
    : (derived ? 'stuck_ticket' : 'manual')
  return {
    id,
    t: str(r.title),
    d: str(r.detail),
    due: str(r.due),
    col: TASK_COLS.includes(str(r.col) as TaskCol) ? (str(r.col) as TaskCol) : 'todo',
    ticketId: str(r.ticket_id) || undefined,
    derived,
    shopId: str(r.shop_id) || undefined,
    source,
    sourceKey: str(r.source_key) || undefined,
    type: TASK_TYPES.includes(str(r.type) as TaskType) ? (str(r.type) as TaskType) : undefined,
    priority: TASK_PRIORITIES.includes(str(r.priority) as TaskPriority) ? (str(r.priority) as TaskPriority) : 'normal',
    snoozedUntil: str(r.snoozed_until) || undefined,
    createdAt: str(r.created_at) || undefined,
    updatedAt: str(r.updated_at) || undefined,
  }
}
let TASKS_LIVE: LiveTask[] = []
export function getTasks() { return TASKS_LIVE }
export async function refreshTasks() {
  try {
    const raw = await apiFetch(`/kanban-tasks?include_snoozed=1${CURRENT_SHOP && CURRENT_SHOP !== 'all' ? `&shop_id=${encodeURIComponent(CURRENT_SHOP)}` : ''}`)
    TASKS_LIVE = (Array.isArray(raw) ? raw as RawTask[] : []).map(mapTask).filter((k) => !!k.id)
  } catch { /* keep last */ }
  notify()
}
export async function moveTask(id: string, col: TaskCol) {
  const k = TASKS_LIVE.find((x) => x.id === id)
  if (!k || k.derived) return
  const old = k.col
  k.col = col
  notify()
  try {
    await apiFetch(`/kanban-tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ col }) })
  } catch (e) {
    k.col = old
    mutationFailed('Move', e)
    void refreshTasks()
  }
}
/* `ticketId` is what makes a hand-made task belong to a conversation. It was
   already accepted by POST /api/kanban-tasks and simply never sent from here,
   which is why the ticket ↔ task link only ever existed on derived `sup:`
   cards. Both the Tasks board and the ticket panel now read it back. */
/* `priority` was the same shape of gap as `ticketId`: POST and PATCH
   /api/kanban-tasks have always accepted 'low' | 'normal' | 'high' (validated,
   anything else coerced to 'normal'), the board already RENDERS the High/Low
   chips, and nothing in the console could ever set one — only the task
   generator cron could. */
export async function createTask(t: string, d: string, opts: { due?: string; shopId?: string; ticketId?: string; type?: TaskType; priority?: TaskPriority } = {}) {
  const shop = opts.shopId ?? CURRENT_SHOP
  const body: Record<string, unknown> = { title: t, detail: d }
  if (opts.due) body.due = opts.due
  if (opts.ticketId) body.ticket_id = opts.ticketId
  if (opts.type && TASK_TYPES.includes(opts.type)) body.type = opts.type
  if (opts.priority && TASK_PRIORITIES.includes(opts.priority)) body.priority = opts.priority
  if (shop && shop !== 'all') body.shop_id = shop
  await apiFetch('/kanban-tasks', { method: 'POST', body: JSON.stringify(body) })
  await refreshTasks()
}
export async function updateTask(id: string, patch: { title?: string; detail?: string; due?: string; type?: TaskType; priority?: TaskPriority }) {
  const k = TASKS_LIVE.find((x) => x.id === id)
  if (!k || k.derived) return
  const prev = { t: k.t, d: k.d, due: k.due, type: k.type, priority: k.priority }
  if (patch.title !== undefined) k.t = patch.title
  if (patch.detail !== undefined) k.d = patch.detail
  if (patch.due !== undefined) k.due = patch.due
  if (patch.type !== undefined) k.type = patch.type
  if (patch.priority !== undefined) k.priority = patch.priority
  notify()
  try {
    await apiFetch(`/kanban-tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })
  } catch (e) {
    k.t = prev.t; k.d = prev.d; k.due = prev.due; k.type = prev.type; k.priority = prev.priority
    mutationFailed('Task edit', e)
    void refreshTasks()
  }
}
export async function deleteTask(id: string) {
  const k = TASKS_LIVE.find((x) => x.id === id)
  if (!k || k.derived) return
  const before = TASKS_LIVE
  TASKS_LIVE = TASKS_LIVE.filter((x) => x.id !== id)
  notify()
  try {
    await apiFetch(`/kanban-tasks/${encodeURIComponent(id)}`, { method: 'DELETE' })
  } catch (e) {
    TASKS_LIVE = before
    mutationFailed('Delete task', e)
    void refreshTasks()
  }
}
/** Push a generated task out of the way until `untilIso` (empty = un-snooze). */
export async function snoozeTask(id: string, untilIso: string) {
  const k = TASKS_LIVE.find((x) => x.id === id)
  if (!k || k.derived) return
  const old = k.snoozedUntil
  k.snoozedUntil = untilIso || undefined
  notify()
  try {
    await apiFetch(`/kanban-tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ snoozed_until: untilIso || null }) })
  } catch (e) {
    k.snoozedUntil = old
    mutationFailed('Snooze', e)
    void refreshTasks()
  }
}
export async function toggleTask(id: string) {
  const k = TASKS_LIVE.find((x) => x.id === id)
  if (k && !k.derived) await moveTask(id, k.col === 'done' ? 'todo' : 'done')
}

/* ---------------------------------------------------- live chargebacks ----- */
import type { Chargeback } from './types'
import { stripHtml } from './stripHtml'
function _relTime(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso).getTime()
  if (isNaN(d)) return ''
  const sec = Math.floor((Date.now() - d) / 1000)
  if (sec < 60) return 'just now'
  if (sec < 3600) return `${Math.floor(sec / 60)}m`
  if (sec < 86_400) return `${Math.floor(sec / 3600)}h`
  return `${Math.floor(sec / 86_400)}d`
}
let CHARGEBACKS_LIVE: Chargeback[] = []
export function getChargebacks() { return CHARGEBACKS_LIVE }
export async function refreshChargebacks() {
  try {
    const r = await apiFetchChanged('/disputes')
    if (!r.changed) return
    CHARGEBACKS_LIVE = r.data as Chargeback[]
  } catch { /* keep last */ }
  notify()
}
export async function submitChargeback(id: string) {
  // Real disputes are submitted inside Shopify (evidence upload is final); the
  // console opens the conversation instead of firing a blind submission. Kept
  // for API-shape parity with the demo adapter.
  void id
}
let CUSTOMS_LIVE: [string, string, string][] = []
export function getCustoms() { return CUSTOMS_LIVE }
export async function refreshCustoms() {
  try {
    const rr = await apiFetchChanged(`/customs/tickets${CURRENT_SHOP && CURRENT_SHOP !== 'all' ? `?shop_id=${encodeURIComponent(CURRENT_SHOP)}` : ''}`)
    if (!rr.changed) return
    const raw = rr.data as any[]
    CUSTOMS_LIVE = raw.map((c) => [
      `${c.order_name || '—'} · ${c.customs_id || c.shipping_country || ''}`.trim(),
      c.status ? `status: ${c.status}` : 'awaiting customer',
      _relTime(c.created_at),
    ] as [string, string, string])
  } catch { /* keep last */ }
  notify()
}
let FILTERED_LIVE: [string, string, string][] = []
export interface FilteredRow { id: string; subject: string; from: string; reason: string; at: string }
let FILTERED_RAW: FilteredRow[] = []
export function getFiltered() { return FILTERED_LIVE }
/** Raw rows (with ids) so admins can restore a wrongly-filtered customer email. */
export function getFilteredRaw() { return FILTERED_RAW }
export async function refreshFiltered() {
  try {
    const rr = await apiFetchChanged(`/filtered-emails${CURRENT_SHOP && CURRENT_SHOP !== 'all' ? `?shop_id=${encodeURIComponent(CURRENT_SHOP)}` : ''}`)
    if (!rr.changed) return
    const raw = rr.data as any[]
    FILTERED_LIVE = raw.slice(0, 200).map((f) => [
      stripHtml(`${f.subject || f.snippet || '(no subject)'}`).trim() || '(no subject)',
      `${f.from_name ? f.from_name + ' <' + (f.from || '?') + '>' : (f.from || 'unknown sender')} · ${f.filter_reason || 'filtered'}`,
      _relTime(f.filtered_at),
    ] as [string, string, string])
    FILTERED_RAW = raw.slice(0, 200).map((f) => ({
      id: String(f.id ?? ''),
      subject: stripHtml(String(f.subject || f.snippet || '(no subject)')).trim() || '(no subject)',
      from: String(f.from_name ? f.from_name + ' <' + (f.from || '?') + '>' : (f.from || 'unknown sender')),
      reason: String(f.filter_reason || 'filtered'),
      at: _relTime(f.filtered_at),
    }))
  } catch { /* keep last */ }
  notify()
}

/* ------------------------------------------------------ live inbox rules -- */
import type { InboxRule } from './types'
export const INBOX_RULES_LIVE: InboxRule[] = []
export async function refreshInboxRules() {
  try {
    const raw = await apiFetch('/inbox-rules') as { id: string; if_field: 'sender' | 'subject'; if_value: string; enabled: boolean; hits30d: number }[]
    INBOX_RULES_LIVE.splice(0, INBOX_RULES_LIVE.length, ...raw.map((r) => ({
      id: r.id, if_field: r.if_field, if_value: r.if_value, action: 'close' as const, target: null, enabled: r.enabled, hits30d: r.hits30d,
    })))
  } catch { /* keep last */ }
  notify()
}
export async function addInboxRule(r: Omit<InboxRule, 'id' | 'enabled' | 'hits30d'>) {
  await apiFetch('/inbox-rules', { method: 'POST', body: JSON.stringify({ if_field: r.if_field, if_value: r.if_value }) })
  await refreshInboxRules()
}
export async function toggleInboxRule(id: string) {
  const r = INBOX_RULES_LIVE.find((x) => x.id === id)
  if (!r) return
  r.enabled = !r.enabled
  notify()
  await apiFetch(`/inbox-rules/${id}`, { method: 'PATCH', body: JSON.stringify({ enabled: r.enabled }) }).catch(() => void refreshInboxRules())
}
export async function deleteInboxRule(id: string) {
  await apiFetch(`/inbox-rules/${id}`, { method: 'DELETE' })
  await refreshInboxRules()
}

/* ═══════════════════════════════════════════════════════════ session role ═══
   The console previously never learned WHO was signed in beyond their email,
   so every admin-only surface rendered for agents and then 403'd on click
   (the empty-Assign-menu class of bug). /api/auth/whoami is the old app's
   source of truth and already exists server-side. */
export interface SessionUser {
  id: string; email: string; name: string
  role: 'admin' | 'agent'
  read_only: boolean
  restricted_shop_id: string | null
  redact_identity: boolean
}
let ME: SessionUser | null = null
export function getMe(): SessionUser | null { return ME }
/** Admin-or-better. Defaults to FALSE while unknown so we never flash admin UI. */
export function isAdmin(): boolean { return ME?.role === 'admin' }
/** Super admin owns cross-tenant/destructive tooling (disputes sync, merges). */
/* Read live: /settings can land before OR after /auth/whoami, so snapshotting
   this at whoami time hid every super-admin tool from the owner. */
export function isSuperAdmin(): boolean {
  try { return !!(getLiveSettings() as { is_super_admin?: boolean } | undefined)?.is_super_admin } catch { return false }
}
export function isReadOnly(): boolean { return !!ME?.read_only }
export async function refreshMe() {
  try {
    const r = await apiFetch('/auth/whoami') as { user?: Partial<SessionUser> }
    const u = r?.user
    if (!u || !u.email) return
    // is_super_admin is reported by GET /api/settings (companyId absent);
    // fall back to it so super-admin-only tooling shows for the owner.
    // NOTE: is_super_admin comes from GET /api/settings, which may not have
    // landed yet. Do NOT snapshot it here — isSuperAdmin() reads it live below.
    ME = {
      id: String(u.id ?? u.email), email: String(u.email), name: String(u.name ?? u.email),
      role: (u.role === 'admin' ? 'admin' : 'agent'),
      read_only: !!u.read_only,
      restricted_shop_id: (u.restricted_shop_id as string | null) ?? null,
      redact_identity: !!u.redact_identity,
    }
    notify()
  } catch { /* leave ME null -> treated as agent, never as admin */ }
}

/* ══════════════════════════════════════════════════════ order re-matching ═══
   Restores the old app's controls. v3 previously shipped unlinkOrder ONLY,
   which was a one-way door: unlink a wrong order and there was no way back. */
export async function matchOrder(id: string, query: string) {
  const r = await apiFetch(`/tickets/${id}/match-order`, { method: 'POST', body: JSON.stringify({ query }) })
  await getTicketFull(id)
  return r as { matched?: boolean; order?: { order_name?: string }; order_name?: string; error?: string }
}
export async function rematchOrder(id: string) {
  const r = await apiFetch(`/tickets/${id}/rematch`, { method: 'POST' })
  await getTicketFull(id)
  return r as { matched?: boolean; order_name?: string }
}
export async function refreshOrder(id: string) {
  const r = await apiFetch(`/tickets/${id}/refresh-order`, { method: 'POST' })
  await getTicketFull(id)
  return r
}
export async function getOrderTimeline(id: string) {
  return await apiFetch(`/tickets/${id}/order-timeline`) as { events: { at?: string; date?: string; label?: string; status?: string; message?: string }[] }
}

/* ═════════════════════════════════════════════════════════ next action ═══
   The old app's triage vocabulary. PATCH /api/tickets/:id already allows
   next_action through its field allowlist. */
export async function setNextAction(id: string, next: string | null) {
  const t = TICKETS.find((x) => x.id === id)
  const old = (t as { next_action?: string | null } | undefined)?.next_action
  if (t) { (t as { next_action?: string | null }).next_action = next; notify() }
  apiFetch(`/tickets/${id}`, { method: 'PATCH', body: JSON.stringify({ next_action: next }) })
    .catch((e) => { if (t) (t as { next_action?: string | null }).next_action = old ?? null; mutationFailed('Next step', e) })
}

/* ═══════════════════════════════════════════════ filtered-email recovery ═══ */
export interface RestoreFilteredResult {
  success: boolean
  status: 'restored' | 'still_filtered' | 'unreadable' | 'unsupported' | 'skipped'
  message: string
  ticket_id?: string
}
/* Returns the server's verdict. A 200 here does NOT mean the mail was restored:
   the route answers 200 with success:false when the message could not be put
   back, so callers must read the result rather than assume it worked. */
export async function restoreFilteredEmail(id: string): Promise<RestoreFilteredResult> {
  const r = await apiFetch(`/filtered-emails/${id}/restore`, { method: 'POST' })
  await refreshFiltered()
  return r as RestoreFilteredResult
}
export async function deleteFilteredEmail(id: string) {
  await apiFetch(`/filtered-emails/${id}`, { method: 'DELETE' })
  await refreshFiltered()
}

/* ══════════════════════════════════════════════════ chargeback tooling ═══
   All three are adminOnly + superAdminOnly server-side — the UI gates to
   super admin so nobody else sees a button that will 403. */
export async function syncDisputes() {
  const r = await apiFetch('/disputes/sync', { method: 'POST' })
  await refreshChargebacks()
  return r as { disputes?: number; synced?: number; created?: number; updated?: number }
}
export async function fetchChargebackEmail(email: string, chargebackStatus: string, shopId: string) {
  return await apiFetch('/chargebacks/fetch-email', { method: 'POST', body: JSON.stringify({ email, chargeback_status: chargebackStatus, shop_id: shopId }) })
}
export async function backfillChargebackThreads() {
  const r = await apiFetch('/chargebacks/backfill-threads', { method: 'POST' })
  await refreshChargebacks()
  return r as { updated?: number }
}

/* ══════════════════════════════════════════════════════ manual ops ═══ */
export async function syncGmailNow() {
  const r = await apiFetch('/gmail/sync', { method: 'POST' }) as { summary?: { shop_id?: string; status?: string; result?: { processed?: number }; error?: string }[] }
  await refreshTickets()
  // The server reports PER SHOP; reading a top-level `processed` meant a sync in
  // which every shop failed still said "Inbox sync finished".
  const rows = Array.isArray(r?.summary) ? r.summary : []
  return {
    processed: rows.reduce((n, x) => n + (x.result?.processed ?? 0), 0),
    failedShops: rows.filter((x) => x.status && x.status !== 'fulfilled').map((x) => x.shop_id || '?'),
  }
}
export async function mergeDuplicates() {
  const r = await apiFetch('/tickets/merge-duplicates', { method: 'POST' })
  await refreshTickets()
  return r as { merged?: number }
}

/* ═══════════════════════════════════════════════ outbound translation ═══
   The old app did NOT send what the agent typed: for a non-English customer it
   translated the agent's English into the customer's language first, and
   BLOCKED the send if translation failed (so a French customer could never
   receive an English reply by accident). v3 shipped without this, so every
   manual reply went out in English. Restored here.
   NOTE: /api/translate-from-english is NOT gated by INTERNAL_AI_PAUSED (that
   gate lives only in generateDraft), so this works while drafting stays paused. */
export async function translateFromEnglish(text: string, language: string, shopId: string, ticketId: string) {
  return await apiFetch('/translate-from-english', {
    method: 'POST',
    body: JSON.stringify({ text, language, shop_id: shopId, ticket_id: ticketId }),
  }) as { translation?: string }
}

/* ═══════════════════════════════════════════════ inbound translation ═══
   The old app translated every non-English customer message on demand so agents
   read English. v3 never called /api/translate, so FR/DE/NL threads showed
   only the original text. Results persist server-side in message_translations,
   so this runs once per message, not once per render. */
const TRANSLATING = new Set<string>()
export async function translateMessage(ticketId: string, messageId: string, text: string) {
  const k = `${ticketId}:${messageId}`
  if (TRANSLATING.has(k)) return
  TRANSLATING.add(k)
  try {
    const r = await apiFetch('/translate', {
      method: 'POST',
      body: JSON.stringify({ text, ticket_id: ticketId, message_id: messageId }),
    }) as { translation?: string }
    const tr = (r?.translation ?? '').trim()
    if (!tr) return
    const t = TICKETS.find((x) => x.id === ticketId)
    const m = t?.messages?.find((x) => x.id === messageId)
    if (m && !m.body_english) { m.body_english = tr; notify() }
  } catch { /* leave the original text visible */ }
  finally { TRANSLATING.delete(k) }
}

/* ═══════════════════════════════════════ global auto-send kill switch (#2) ═══
   settings.auto_send_enabled gates EVERY shop (autoSendPolicy resolveMode
   returns 'off' for all when false). There was no UI for it, so once off it
   could not be turned back on from the console. Super-admin only server-side. */
/** True only once settings have actually loaded AND the switch is on. Defaulting
 *  to true made the console claim "Auto-send armed" on every cold load. */
export function globalAutoSendSettingsLoaded(): boolean {
  try { return Object.keys(getLiveSettings() ?? {}).length > 0 } catch { return false }
}
export function globalAutoSendEnabled(): boolean {
  try {
    const st = getLiveSettings() as { auto_send_enabled?: boolean } | undefined
    if (!st || Object.keys(st).length === 0) return false // unknown != armed
    return st.auto_send_enabled === true
  } catch { return false }
}
export async function setGlobalAutoSend(enabled: boolean) {
  await apiFetch('/settings', { method: 'PATCH', body: JSON.stringify({ auto_send_enabled: enabled }) })
  ;(SETTINGS_CACHE as Record<string, unknown>).auto_send_enabled = enabled
  notify()
  await refreshSettings()
}

/* ═════════════════════════════════════════════ service + shop health (#3) ═══
   An expired Gmail delegation previously looked exactly like a quiet day. */
export interface HealthReport {
  core: Record<string, { ok: boolean; error?: string }>
  shops: { id: string; name?: string; delegation_ok?: boolean; shopify_token_ok?: boolean; error?: string }[]
  checked_at?: string
}
let HEALTH: HealthReport | null = null
export function getHealth() { return HEALTH }
export async function refreshHealth() {
  try {
    const r = await apiFetch('/system/status') as Record<string, unknown>
    const core: HealthReport['core'] = {}
    // Server keys are firebase/ai/gmail/shopify/discord, each {connected, error}.
    // Reading .ok/.status made every service look down on a healthy system.
    // Discord deliberately absent: it is our internal supplier relay, so a missing
    // DISCORD_BOT_TOKEN is an operator concern, never something to show a merchant
    // under "Attention needed" on their own dashboard.
    const KEYMAP: [string, string][] = [['firebase', 'firestore'], ['ai', 'openai'], ['gmail', 'gmail'], ['shopify', 'shopify']]
    for (const [srcKey, label] of KEYMAP) {
      const v = r[srcKey] as { connected?: boolean; ok?: boolean; status?: string; error?: string } | boolean | undefined
      if (v === undefined) continue
      if (typeof v === 'boolean') core[label] = { ok: v }
      else core[label] = { ok: v.connected ?? v.ok ?? v.status === 'ok', error: v.error ?? undefined }
    }
    const rawShops = (r.shops ?? r.shop_health ?? []) as Record<string, unknown>[]
    HEALTH = {
      core,
      shops: (Array.isArray(rawShops) ? rawShops : []).map((x) => ({
        id: String(x.id ?? x.shop_id ?? '?'), name: x.name as string | undefined,
        delegation_ok: x.delegation_ok as boolean | undefined,
        shopify_token_ok: (x.shopify_token_ok ?? x.shopify_ok) as boolean | undefined,
        error: x.error as string | undefined,
      })),
      checked_at: r.checked_at as string | undefined,
    }
  } catch { /* keep last */ }
  notify()
}

/* ═══════════════════════════════════════════════ AI decision audit (#4) ═══
   The evidence base for trusting auto-send: what the AI decided and why. */
let AUDIT: Record<string, unknown>[] = []
let SHADOW: Record<string, unknown> | null = null
export function getAuditLog() { return AUDIT }
export function getShadowStats() { return SHADOW }
export async function refreshAuditLog(days = 7) {
  try {
    const r = await apiFetch(`/admin/audit-log?days=${days}&limit=200`) as unknown
    AUDIT = Array.isArray(r) ? r as Record<string, unknown>[] : ((r as { entries?: Record<string, unknown>[] })?.entries ?? [])
  } catch { AUDIT = [] }
  try { SHADOW = await apiFetch(`/admin/shadow-stats?days=${days}`) as Record<string, unknown> } catch { SHADOW = null }
  notify()
}

/* ═══════════════════════════════════ why this draft was (not) sent ═══
   The composer used to show a "checks passed" chip fed by `ticket.trace`,
   which NOTHING on the server has ever produced — only the demo store. In
   live mode the chip never rendered, so the one question an operator asks a
   held draft ("why is this still sitting here?") had no answer on screen,
   even though the pipeline records a precise one.

   Two real sources, in order of preference:

   1. The TICKET itself. src/services/ticketPipeline.ts computes an
      AutoSendDecision ({ auto_send, reason, rule_id } — see
      src/services/autoSendPolicy.ts) plus the effective mode, and a backend
      agent is persisting them on the ticket doc. Both plausible shapes are
      accepted so whichever lands is read without another frontend change:
        a) nested  `auto_send_decision: { auto_send, reason, rule_id, mode,
                    sanity_failures?, decided_at? }`
        b) flat    `auto_send_reason` + `auto_send_rule_id` + `auto_send_mode`
      NOTE (2026-08-04): neither exists yet. 40 of the most recently updated
      live ticket docs were read and carry NO decision field, so today this
      resolver returns null for every ticket and source (2) does the work.

   2. GET /api/admin/audit-log?ticket_id=… — the draft_audit_log entry the
      pipeline already writes (verified live: decision{auto_send,reason,
      rule_id}, mode, sanity_failures, fallback_reason, send_error,
      actually_sent, created_at). adminOnly, so it is fetched only for admin
      sessions; agents fall back to whatever the ticket carries.

   Neither present → the caller renders NOTHING. There is deliberately no
   "looks fine" default: a missing record is not evidence of a passed check. */
export interface SendDecision {
  /** true = policy wanted to send, false = policy blocked. */
  auto_send: boolean
  /** Human sentence straight from the policy — never composed here. */
  reason: string
  /** Machine code, e.g. `danger.brinoa.general.long_with_tracking`. */
  rule_id: string | null
  /** Effective mode for the ticket at decision time. */
  mode: 'off' | 'shadow' | 'live' | null
  /** Hard blocks from checkDraft(); empty when the draft passed or wasn't checked. */
  sanity_failures: string[]
  /** The one repair attempt, when a draft failed its checks and the AI was asked to
   *  rewrite it. A reply that was corrected before sending is a different event from one
   *  that was right first time, and the console says which. */
  repair_attempted?: boolean
  repair_succeeded?: boolean
  repair_fixed?: string[]
  /** Why a wanted send fell back to a Gmail draft (audit-log only). */
  fallback_reason: string | null
  send_error: string | null
  actually_sent: boolean
  /** ISO of when this was recorded; '' when the record carries no timestamp. */
  at: string
  source: 'ticket' | 'audit'
}
const _mode = (v: unknown): SendDecision['mode'] => (v === 'off' || v === 'shadow' || v === 'live' ? v : null)
const _strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x) : [])
/** Read the decision off a ticket doc. Returns null when the ticket predates
 *  the field (or the backend has not landed it) — callers must render nothing,
 *  not a reassurance. */
export function readSendDecision(ticket: unknown): SendDecision | null {
  const t = (ticket && typeof ticket === 'object' ? ticket : null) as Record<string, unknown> | null
  if (!t) return null
  const nested = (t.auto_send_decision && typeof t.auto_send_decision === 'object')
    ? t.auto_send_decision as Record<string, unknown>
    : null
  const reason = str(nested?.reason ?? nested?.message ?? t.auto_send_reason)
  const ruleId = str(nested?.rule_id ?? nested?.code ?? nested?.rule ?? t.auto_send_rule_id)
  const mode = _mode(nested?.mode ?? t.auto_send_mode)
  // A record with neither a sentence nor a code says nothing renderable.
  if (!reason && !ruleId) return null
  const sent = nested?.auto_send ?? nested?.will_send ?? t.auto_send
  return {
    auto_send: sent === true,
    reason,
    rule_id: ruleId || null,
    mode,
    sanity_failures: _strs(nested?.sanity_failures ?? t.sanity_failures),
    // Read from the same two places as everything else here: the nested decision record
    // the pipeline writes, falling back to a top-level field on older tickets.
    repair_attempted: (nested?.repair_attempted ?? t.repair_attempted) === true,
    repair_succeeded: (nested?.repair_succeeded ?? t.repair_succeeded) === true,
    repair_fixed: _strs(nested?.repair_fixed ?? t.repair_fixed),
    fallback_reason: str(nested?.fallback_reason) || null,
    send_error: str(nested?.send_error) || null,
    actually_sent: (nested?.actually_sent ?? t.auto_sent_at) ? true : false,
    at: str(nested?.decided_at ?? nested?.at ?? nested?.created_at ?? nested?.updated_at),
    source: 'ticket',
  }
}
function decisionFromAudit(e: Record<string, unknown>): SendDecision | null {
  const d = (e.decision && typeof e.decision === 'object' ? e.decision : null) as Record<string, unknown> | null
  if (!d) return null
  const reason = str(d.reason)
  const ruleId = str(d.rule_id)
  if (!reason && !ruleId) return null
  return {
    auto_send: d.auto_send === true,
    reason,
    rule_id: ruleId || null,
    mode: _mode(e.mode),
    sanity_failures: _strs(e.sanity_failures),
    fallback_reason: str(e.fallback_reason) || null,
    send_error: str(e.send_error) || null,
    actually_sent: e.actually_sent === true,
    at: str(e.created_at),
    source: 'audit',
  }
}
export type SendAuditState = 'idle' | 'loading' | 'none' | 'ready' | 'denied' | 'error'
const SEND_AUDIT: Record<string, SendDecision | null> = {}
const SEND_AUDIT_STATE: Record<string, SendAuditState> = {}
export function getSendAudit(ticketId: string): { state: SendAuditState; decision: SendDecision | null } {
  return { state: SEND_AUDIT_STATE[ticketId] ?? 'idle', decision: SEND_AUDIT[ticketId] ?? null }
}
/** Fetch the newest draft_audit_log entry for one ticket. Admin-only route, so
 *  non-admin sessions are short-circuited to 'denied' without a request. One
 *  fetch per ticket per session unless `force` — the log only gains an entry
 *  when a new draft is generated, which reloads the ticket anyway. */
export async function loadSendAudit(ticketId: string, force = false) {
  if (!ticketId) return
  if (!force && SEND_AUDIT_STATE[ticketId] && SEND_AUDIT_STATE[ticketId] !== 'error') return
  if (!isAdmin()) { SEND_AUDIT_STATE[ticketId] = 'denied'; notify(); return }
  SEND_AUDIT_STATE[ticketId] = 'loading'
  try {
    const r = await apiFetch(`/admin/audit-log?ticket_id=${encodeURIComponent(ticketId)}&limit=5`) as unknown
    const entries = (Array.isArray(r) ? r : ((r as { entries?: unknown[] })?.entries ?? [])) as Record<string, unknown>[]
    const newest = entries
      .filter((e) => e && typeof e === 'object')
      .sort((a, b) => str(b.created_at).localeCompare(str(a.created_at)))[0]
    const d = newest ? decisionFromAudit(newest) : null
    SEND_AUDIT[ticketId] = d
    SEND_AUDIT_STATE[ticketId] = d ? 'ready' : 'none'
  } catch {
    SEND_AUDIT[ticketId] = null
    SEND_AUDIT_STATE[ticketId] = 'error'
  }
  notify()
}

/* ═══════════════════════════════════════ manual store connection (owner) ═══
   The Shopify-token + Gmail-domain-delegation path, ported from the legacy
   AddShopModal. Both routes are super-admin only server-side: validation
   DWD-impersonates the mailbox and DELIVERS a test email to it, so merchants
   use the OAuth flow instead. */
export interface ShopCheck { ok?: boolean; error?: string }
export async function validateShopManual(input: { id: string; gmail_address: string; shopify_domain: string; shopify_admin_token: string }) {
  return await apiFetch('/shops/validate', { method: 'POST', body: JSON.stringify(input) }) as
    { shopify?: ShopCheck; delegation?: ShopCheck; test_send?: ShopCheck }
}
export async function createShopManual(input: {
  id: string; name: string; gmail_address: string; shopify_domain: string; shopify_admin_token: string;
  ai_brand_voice_hint?: string; signature_block?: string;
}) {
  const r = await apiFetch('/shops', { method: 'POST', body: JSON.stringify(input) })
  await refreshShops()
  return r
}

/** Archive a store (soft delete). Backend: DELETE /api/shops/:id (adminOnly). */
export async function deleteShop(shopId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await apiFetch(`/shops/${encodeURIComponent(shopId)}`, { method: 'DELETE' })
    if (!r || (r as { error?: string }).error) return { ok: false, error: (r as { error?: string })?.error || 'Failed' }
    await refreshShops()
    void refreshArchivedShops()
    return { ok: true }
  } catch (e) { return { ok: false, error: (e as Error).message } }
}

/* ═══════════════════════════════════════════════ archived store recovery ═══
   Archiving is reachable from the console (the Remove button) and was a
   one-way door: GET /api/shops accepts ?includeArchived=true and the console
   never sent it, and POST /api/shops/:id/restore (adminOnly)
   had no caller at all. An archived store keeps its tickets but stops syncing,
   so "removed by mistake" meant a support ticket to us. Both restored here. */
export interface ArchivedShop { id: string; name: string; domain: string; archivedAt: string }
let ARCHIVED_SHOPS: ArchivedShop[] = []
export function getArchivedShops() { return ARCHIVED_SHOPS }
export async function refreshArchivedShops() {
  try {
    const raw = await apiFetch('/shops?includeArchived=true') as { shops?: Record<string, unknown>[] } | Record<string, unknown>[]
    const list = Array.isArray(raw) ? raw : (raw.shops ?? [])
    ARCHIVED_SHOPS = (list as Record<string, unknown>[])
      // `deleted_at` is the archive marker (shopService.archiveShop stamps it,
      // restoreShop nulls it). It survives stripSecretRef, so it is readable here.
      .filter((s) => typeof s.deleted_at === 'string' && !!s.deleted_at)
      .map((s) => ({
        id: String(s.id), name: String(s.name ?? s.id),
        domain: String(s.shopify_domain ?? ''), archivedAt: String(s.deleted_at),
      }))
      .sort((a, b) => b.archivedAt.localeCompare(a.archivedAt))
  } catch { /* keep last */ }
  notify()
}
export async function restoreShop(shopId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await apiFetch(`/shops/${encodeURIComponent(shopId)}/restore`, { method: 'POST' })
    await refreshShops()
    await refreshArchivedShops()
    return { ok: true }
  } catch (e) { return { ok: false, error: (e as Error).message } }
}

/* ═════════════════════════════════════════════════ true per-store open ═══
   GET /api/tickets/counts had NO caller. Every per-store "N open" in the
   console was counted client-side out of the /api/tickets cache — which for
   an all-stores view is the newest 120 per shop merged and then sliced to 300
   rows total (the GET /api/tickets all-stores branch). A quiet store falls out of that window
   entirely and reads as 0 open when it is not. This endpoint runs the real
   per-shop query (OPEN + WAITING_CUSTOMER + WAITING_SUPPLIER, deleted rows
   excluded) and is the number the server itself intends the sidebar to use.

   It is uncached server-side and reads every open ticket of every owned shop,
   so it is fetched lazily by the views that show per-store totals, throttled
   to once a minute — never on the 12s ticket poll. */
let SHOP_COUNTS: Record<string, { open: number; oldest_age_hours: number | null }> = {}
let SHOP_COUNTS_AT = 0
let SHOP_COUNTS_INFLIGHT: Promise<void> | null = null
/** Server-truth open count, or null while it has not been loaded. Callers must
 *  render their own fallback rather than showing 0 for "not known yet". */
export function getShopOpenCount(shopId: string): number | null {
  const row = SHOP_COUNTS[shopId]
  return row ? row.open : null
}
export function getShopOldestHours(shopId: string): number | null {
  return SHOP_COUNTS[shopId]?.oldest_age_hours ?? null
}
export async function refreshShopCounts(force = false): Promise<void> {
  if (!force && Date.now() - SHOP_COUNTS_AT < 60_000) return
  if (SHOP_COUNTS_INFLIGHT) return SHOP_COUNTS_INFLIGHT
  SHOP_COUNTS_INFLIGHT = (async () => {
    try {
      const r = await apiFetch('/tickets/counts') as { counts?: Record<string, { open?: number; oldest_age_hours?: number | null }> }
      const next: typeof SHOP_COUNTS = {}
      for (const [id, v] of Object.entries(r?.counts ?? {})) {
        next[id] = { open: Number(v?.open) || 0, oldest_age_hours: typeof v?.oldest_age_hours === 'number' ? v.oldest_age_hours : null }
      }
      SHOP_COUNTS = next
      SHOP_COUNTS_AT = Date.now()
      notify()
    } catch { /* keep last; callers fall back to the cache count */ }
    finally { SHOP_COUNTS_INFLIGHT = null }
  })()
  return SHOP_COUNTS_INFLIGHT
}

/* ═══════════════════════════════════════════════ import older mail ═══
   POST /api/gmail/backfill { days, shop_id } (adminOnly) had no v3 caller;
   the legacy app exposed it as api.gmailBackfill(days). "Sync inbox" only
   picks up NEW mail, so a store connected today started with an empty inbox
   and there was no way to pull the conversations that arrived before it.
   A company-scoped caller MUST name an owned shop (the handler 404s
   without one), so the caller passes the selected store. */
export async function backfillGmail(days: number, shopId?: string): Promise<{ processed: number; failedShops: string[] }> {
  const body: Record<string, unknown> = { days }
  if (shopId && shopId !== 'all') body.shop_id = shopId
  const r = await apiFetch('/gmail/backfill', { method: 'POST', body: JSON.stringify(body) }) as
    { shops?: { shop_id?: string; result?: { processed?: number }; error?: string }[] }
  const rows = Array.isArray(r?.shops) ? r.shops : []
  await refreshTickets()
  return {
    processed: rows.reduce((n, x) => n + (x.result?.processed ?? 0), 0),
    failedShops: rows.filter((x) => x.error).map((x) => x.shop_id || '?'),
  }
}

/* ═══════════════════════════════════════════ real credential re-probe ═══
   GET /api/system/status returns the per-shop `shops:` array straight out of
   readShopHealthLatest() — a snapshot written by the daily cron. Re-reading it
   cannot detect a delegation that expired an hour ago, which is exactly what
   the console's "Refresh health checks" button claimed to do. POST
   /api/shops/probe (adminOnly + superAdminOnly) is the call
   that actually re-tests every mailbox and Shopify token and rewrites that
   snapshot. It had no caller. */
export async function probeShops(): Promise<{ count: number }> {
  const r = await apiFetch('/shops/probe', { method: 'POST' }) as { count?: number }
  await refreshHealth()
  return { count: Number(r?.count) || 0 }
}

/* ═══════════════════════════════════════════════════ billing (the plan) ═══
   What Settings > Billing reads and writes. Cancelling used to exist ONLY in the
   embedded Shopify panel (src/saas/EmbeddedHome.tsx), which is reached through a
   store's admin — so an account with an active subscription and no linked store had
   no route to it, and no way to stop paying from anywhere in Resolver.

   Every field below is GET /api/account/summary's own, named exactly as the server
   names it, so the two surfaces cannot drift.

   `hasSubscription` is deliberately NOT carried here. It reports false when the
   Shopify read throws, which is an outage and not a cancel; a screen that said "not
   active" on a blip would be telling a paying merchant they had lost their plan.
   `planState` is planGate.ts's own verdict, 'unknown' for every uncertain state, and
   is the only field allowed to say a plan is off. */
export interface BillingSummary {
  /** Plan handle as Shopify bills it ('starter', …), or null. */
  plan: string | null
  /** planGate.ts's verdict. null when an older server did not send one. */
  planState: 'active' | 'inactive' | 'unknown' | null
  /** The account's own Shopify Managed Pricing page. */
  managedPricingUrl: string | null
  /** The store the charge actually sits on, as the SERVER resolved it. POST
   *  /api/billing/cancel resolves it the same way, so this is the store the
   *  confirmation may safely name: what is shown is what gets cancelled. */
  billingShopDomain: string | null
  /** The plan is reachable only through a store this account no longer links. */
  billingOnUnlinkedStore: boolean
  linkedStores: number
  storeCap: number | null
  isDemo: boolean
}

/** POST /api/billing/cancel's answer. `message` is the server's own sentence about
 *  what happened, written AFTER it re-read Shopify, and is the only thing worth
 *  showing: it is also how "there was nothing active to cancel" arrives. */
export interface CancelResult {
  ok: boolean
  cancelled: boolean
  alreadyInactive: boolean
  shopDomain: string
  billingOnUnlinkedStore: boolean
  message: string
}

let BILLING: BillingSummary | null = null
let BILLING_ERROR = ''
let BILLING_LOADING = false
let billingReadAt = 0
export function getBillingSummary(): BillingSummary | null { return BILLING }
/** Why the plan could not be read, or ''. Kept apart from the summary so a failed
 *  refresh never blanks a good reading that is already on screen. */
export function getBillingError(): string { return BILLING_ERROR }
export function isBillingLoading(): boolean { return BILLING_LOADING }

/** Read the account's plan. Throttled to 30s unless `force`, which also sends
 *  ?fresh=1 and so bypasses the server's own per-account memo — the cost is one
 *  live Shopify read and it is only ever paid for a deliberate press or straight
 *  after a cancel.
 *
 *  It does NOT touch the plan gate. Cancelling from this tab turns planState
 *  'inactive', and applying that here would swap the console for the paywall in the
 *  same tick the server's sentence about what happened was rendered. The existing
 *  billing poll (and the 402 on the next paid action) raises the wall on its own. */
export async function refreshBillingSummary(force = false): Promise<void> {
  if (BILLING_LOADING) return
  if (!force && BILLING && Date.now() - billingReadAt < 30_000) return
  BILLING_LOADING = true
  notify()
  try {
    const s = await apiFetch('/account/summary' + (force ? '?fresh=1' : '')) as Record<string, unknown>
    const ps = String(s.planState ?? '')
    const shops = Array.isArray(s.shops) ? s.shops as { demo?: boolean }[] : []
    BILLING = {
      plan: typeof s.plan === 'string' ? s.plan : null,
      planState: ps === 'active' || ps === 'inactive' || ps === 'unknown' ? ps : null,
      managedPricingUrl: typeof s.managedPricingUrl === 'string' ? s.managedPricingUrl : null,
      billingShopDomain: typeof s.billingShopDomain === 'string' && s.billingShopDomain ? s.billingShopDomain : null,
      billingOnUnlinkedStore: s.billingOnUnlinkedStore === true,
      linkedStores: typeof s.linkedStores === 'number' ? s.linkedStores : shops.filter((x) => !x.demo).length,
      storeCap: typeof s.storeCap === 'number' ? s.storeCap : null,
      isDemo: s.isDemo === true,
    }
    BILLING_ERROR = ''
    billingReadAt = Date.now()
  } catch (e) {
    BILLING_ERROR = (e as Error).message || 'Could not read your plan just now.'
  } finally {
    BILLING_LOADING = false
    notify()
  }
}

/** Cancel the Shopify subscription that carries this account's plan.
 *
 *  adminOnly server-side. There is no undo: Shopify's cancel ends the subscription
 *  and its billing cycle immediately, and the owner set prorate: false, so the period
 *  already paid for is not refunded.
 *
 *  The route re-reads Shopify after the mutation, so `ok: true, cancelled: false` is a
 *  real answer ("there is no active subscription on X, nothing was cancelled") and not
 *  a failure. A cancel Shopify would not confirm arrives as a THROWN error carrying the
 *  server's wording, never as a quiet success. Callers must render `message` verbatim
 *  and must not compose a success line of their own. */
export async function cancelSubscription(): Promise<CancelResult> {
  const r = await apiFetch('/billing/cancel', { method: 'POST' }) as Partial<CancelResult>
  // The plan just changed. Re-read it before returning so the tab that rendered the
  // message is already showing the state that produced it.
  await refreshBillingSummary(true)
  return {
    ok: r.ok === true,
    cancelled: r.cancelled === true,
    alreadyInactive: r.alreadyInactive === true,
    shopDomain: String(r.shopDomain ?? ''),
    billingOnUnlinkedStore: r.billingOnUnlinkedStore === true,
    message: String(r.message ?? ''),
  }
}
