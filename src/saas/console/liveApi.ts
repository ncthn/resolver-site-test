// Live adapter: the same read/mutate surface the console uses, backed by the
// REAL resolver.chat API instead of the in-memory demo store. Tickets are
// cached here and components re-render through the same subscribe/notify
// mechanism the mock uses; sync getters read the cache. Only the surfaces
// listed in api.ts dispatch here — everything else stays demo.
import type { Category, Shop, Ticket, TicketStatus } from './types'

const BASE = 'https://resolver.chat/api'

let tokenProvider: (() => Promise<string | null>) | null = null
export function setTokenProvider(p: () => Promise<string | null>) { tokenProvider = p }

const listeners = new Set<() => void>()
let version = 0
function notify() { version++; listeners.forEach((l) => l()) }
export function subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l) } }
export function getVersion() { return version }

let TICKETS: Ticket[] = []
export const SHOPS: Shop[] = [{ id: 'all', name: 'All stores', domain: '', open_count: 0 }]
/** Raw production shop docs (policy, ai_support_sop, …) keyed by id. */
const RAW_SHOPS: Record<string, Record<string, unknown>> = {}
export let LAST_ERROR = ''

async function apiFetch(path: string, init?: RequestInit) {
  const token = tokenProvider ? await tokenProvider() : null
  const res = await fetch(BASE + path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string> | undefined),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error((d as { error?: string }).error || `HTTP ${res.status}`)
  }
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
    customer_history: String(r.customer_history ?? ''),
    messages,
    notes: (r.notes as Ticket['notes']) ?? [],
    trace: (r.trace as Ticket['trace']) ?? undefined,
    ai_disabled: !!r.ai_disabled,
    created_at: String(r.created_at ?? new Date().toISOString()),
  } as Ticket
}

let polling = false
export async function refresh() {
  try {
    const [tks, shopsRaw] = await Promise.all([apiFetch('/tickets'), apiFetch('/shops')])
    TICKETS = (Array.isArray(tks) ? tks : []).map((x) => mapTicket(x as Record<string, unknown>))
    const list = Array.isArray(shopsRaw) ? shopsRaw : ((shopsRaw as { shops?: unknown[] }).shops ?? [])
    SHOPS.splice(1, SHOPS.length - 1, ...(list as Record<string, unknown>[]).map((s) => ({
      id: String(s.id), name: String(s.name ?? s.id), domain: String(s.shopify_domain ?? ''), open_count: 0,
    })))
    for (const sh of list as Record<string, unknown>[]) RAW_SHOPS[String(sh.id)] = sh
    for (const sh of list as Record<string, unknown>[]) seedLiveRules(String(sh.id), sh.sop_rules)
    LAST_ERROR = ''
  } catch (e) {
    LAST_ERROR = (e as Error).message
  }
  notify()
}
export function startPolling() {
  if (polling) return
  polling = true
  void refresh()
  void refreshBinAndSent()
  void refreshMacros()
  setInterval(() => { void refresh() }, 12_000)
  setInterval(() => { void refreshBinAndSent() }, 30_000)
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
export function getTicket(id: string): Ticket | null {
  return TICKETS.find((t) => t.id === id) ?? null
}
export function liveTicketIds(): string[] {
  return TICKETS.filter((t) => !t.is_deleted).map((t) => t.id)
}
export function getCounts(shopId?: string) {
  const scope = TICKETS.filter((t) => !shopId || shopId === 'all' || t.shop_id === shopId)
  return {
    open: scope.filter((t) => ['OPEN', 'ESCALATED', 'WAITING_SUPPLIER'].includes(t.status)).length,
    escalated: scope.filter((t) => t.status === 'ESCALATED').length,
    queued: scope.filter((t) => !!t.auto_send_queued_at).length,
  }
}

/* --------------------------------------------------------- mutations ----- */
export async function patchStatus(id: string, status: TicketStatus) {
  await apiFetch(`/tickets/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
  const t = TICKETS.find((x) => x.id === id); if (t) t.status = status
  notify(); void refresh()
}
export async function patchCategory(id: string, category: Category) {
  await apiFetch(`/tickets/${id}/category`, { method: 'PATCH', body: JSON.stringify({ category }) })
  const t = TICKETS.find((x) => x.id === id); if (t) t.category = category
  notify(); void refresh()
}
export async function postSend(id: string, body: string) {
  await apiFetch(`/tickets/${id}/send`, { method: 'POST', body: JSON.stringify({ body }) })
  void refresh()
}
export async function postRegenerate(id: string) {
  await apiFetch(`/tickets/${id}/regenerate`, { method: 'POST' })
  void refresh()
}
export async function postAiToggle(id: string) {
  await apiFetch(`/tickets/${id}/ai-toggle`, { method: 'POST' })
  const t = TICKETS.find((x) => x.id === id); if (t) t.ai_disabled = !t.ai_disabled
  notify(); void refresh()
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
  return await apiFetch(`/lanes/readiness?shop_id=${encodeURIComponent(shopId)}`) as { needed: number; lanes: { category: string; reviewed: number; clean: number; clean_rate: number; ready: boolean }[] }
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
export async function createUser(data: { email: string; name: string; role: 'admin' | 'agent' }) {
  return await apiFetch('/users', { method: 'POST', body: JSON.stringify(data) })
}
export async function updateUser(id: string, patch: Record<string, unknown>) {
  return await apiFetch(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

/* -------------------------------------------------------- live bin/sent --- */
let BIN: Ticket[] = []
let SENT: { at: string; to: string; subject: string; from: string }[] = []
export function listBinSync() { return BIN }
export function getOutbound() { return SENT }
export async function refreshBinAndSent() {
  try {
    const bin = await apiFetch('/tickets/bin')
    BIN = (Array.isArray(bin) ? bin : []).map((x) => mapTicket(x as Record<string, unknown>))
  } catch { /* keep last */ }
  try {
    const sentRaw = await apiFetch('/sent?limit=100') as unknown[]
    SENT = (Array.isArray(sentRaw) ? sentRaw : []).map((r) => {
      const x = r as Record<string, unknown>
      return {
        at: String(x.created_at ?? x.at ?? ''),
        to: String(x.customer_email ?? x.to ?? ''),
        subject: String(x.details ?? x.subject ?? 'Outbound email'),
        from: String(x.shop_id ?? x.performed_by ?? ''),
      }
    }).filter((x) => x.at)
  } catch { /* keep last */ }
  notify()
}
export async function deleteTicket(id: string) {
  await apiFetch(`/tickets/${id}`, { method: 'DELETE' })
  const t = TICKETS.find((x) => x.id === id); if (t) t.is_deleted = true
  notify(); void refresh(); void refreshBinAndSent()
}
export async function restoreTicket(id: string) {
  await apiFetch(`/tickets/${id}/restore`, { method: 'POST' })
  BIN = BIN.filter((x) => x.id !== id)
  notify(); void refresh(); void refreshBinAndSent()
}

/* ----------------------------------------------------------- live stats --- */
export interface LiveStats {
  total: number; open: number; resolved: number; escalated: number
  createdToday: number; createdThisWeek: number; resolvedThisWeek: number
  categoryBreakdown: Record<string, number>
  dailyCreated: Record<string, number>
  avgResponseTimeHours: number | null
  p50FrtHours: number | null
  resolutionRate: number | null
  backlogAge?: { open_total?: number; oldest_hours?: number; buckets?: Record<string, number> }
  [k: string]: unknown
}
const STATS: Record<string, LiveStats | undefined> = {}
export function getLiveStats(key: string) { return STATS[key] }
export async function refreshStats(shopId: string | undefined, days: number) {
  const key = `${shopId ?? 'all'}:${days}`
  try {
    const q = new URLSearchParams({ days: String(days), ...(shopId && shopId !== 'all' ? { shop_id: shopId } : {}) })
    STATS[key] = await apiFetch(`/stats?${q}`) as LiveStats
  } catch { /* keep last */ }
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
export async function advanceReturn(ticketId: string, choice?: 'A' | 'B') {
  const r = await apiFetch(`/tickets/${ticketId}/return/advance`, { method: 'POST', body: JSON.stringify({ choice }) }) as { returns: { stage: 'requested' | 'options_sent' | 'return_approved' | 'item_received' | 'refunded' | 'partial_refunded'; option: 'A' | 'B' | null; updated_at: string } }
  const t = TICKETS.find((x) => x.id === ticketId) as (Ticket & { returns?: unknown }) | undefined
  if (t) t.returns = r.returns
  notify(); void refresh()
}

/* ---------------------------------------------------------- live macros --- */
let LIVE_MACROS: { id: string; label: string; body: string }[] = []
export function getMacros() { return LIVE_MACROS }
export async function refreshMacros() {
  try { LIVE_MACROS = await apiFetch('/macros') as typeof LIVE_MACROS } catch { /* keep last */ }
  notify()
}
export async function createMacro(label: string, body: string) {
  await apiFetch('/macros', { method: 'POST', body: JSON.stringify({ label, body }) })
  await refreshMacros()
}
export async function deleteMacro(id: string) {
  await apiFetch(`/macros/${id}`, { method: 'DELETE' })
  LIVE_MACROS = LIVE_MACROS.filter((m) => m.id !== id)
  notify()
}

/* ------------------------------------------------- live structured rules -- */
import type { SopRuleV2 } from './mockApi'
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
