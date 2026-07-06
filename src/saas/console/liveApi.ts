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
  setInterval(() => { void refresh() }, 12_000)
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
