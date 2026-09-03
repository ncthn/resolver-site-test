// Faithful subset of the PRODUCTION types (rsvlr src/types.ts). Field names,
// enums and semantics match the live app exactly — this is what makes the
// preview wireable: the UI consumes only these shapes.
export type Category =
  | 'SHIPPING' | 'REFUND' | 'CANCEL' | 'NOT_RECEIVED' | 'DAMAGED'
  | 'PAYMENT' | 'GENERAL' | 'ANGRY' | 'CHARGEBACK' | 'PARTNERSHIP'

export type TicketStatus =
  | 'OPEN' | 'WAITING_CUSTOMER' | 'WAITING_SUPPLIER'
  | 'RESOLVED' | 'REPLACEMENT_SENT' | 'ESCALATED'

export interface LineItem {
  title: string
  quantity: number
  price: string
}

export interface OrderSnapshot {
  order_name: string
  order_id: string
  shopify_url: string
  created_at: string
  financial_status: string
  fulfillment_status: string
  tracking_numbers: string[]
  tracking_urls: string[]
  tracking_status: string[]
  /** e.g. shopify_payments, paypal, klarna — mirrors production payment_gateways */
  payment_gateways: string[]
  line_items: LineItem[]
  total_price: string
  currency: string
  shipping_country: string
}

export interface ThreadMessage {
  id: string
  from: string
  from_name: string | null
  date: string
  body: string
  is_customer: boolean
  body_english?: string
  auto_sent?: boolean
  /** Live Gmail attachments carry ids + numeric byte size; mock rows only filename + display size. */
  attachments?: { filename: string; size?: string | number; mimeType?: string; attachmentId?: string; messageId?: string }[]
}

/** One step of the drafting pipeline, surfaced as the decision trace. */
export interface TraceStep {
  step: string
  detail: string
  ok: boolean
  ms?: number
}

export interface Ticket {
  /** Why this ticket was pulled out of every automated lane. A lawyer, a chargeback
   *  and a copyright claim all set ESCALATED and all need different people to do
   *  different things, so the console names the rail instead of saying 'legal
   *  language'. Absent on tickets escalated before this field existed. */
  escalation_reason?: string
  id: string
  /** Precomputed plain-text list preview (client-side, from the stripped server snippet). */
  preview?: string
  /** Live Shopify Returns API status for the matched order (read_returns scope). */
  order_returns?: { id: string; name: string; status: string; total_quantity: number }[]
  shop_id: string
  customer_email: string
  customer_name: string | null
  customer_language: string
  subject: string
  last_customer_message: string
  last_customer_message_english?: string
  last_customer_message_at: string
  message_count: number
  status: TicketStatus
  category: Category
  sentiment: 'neutral' | 'negative' | 'angry'
  urgency_score: number
  /** Server-computed queue priority; the list endpoint returns it. */
  priority_score?: number
  next_action?: string | null
  order_id: string | null
  order_name: string | null
  order_match_confidence: number
  order_match_reason: string | null
  order_snapshot: OrderSnapshot | null
  draft_body: string | null
  draft_body_english: string | null
  has_draft?: boolean
  has_draft_en?: boolean
  draft_generated_at: string | null
  chargeback_status: 'none' | 'warning' | 'chargeback' | 'won' | 'lost' | null
  auto_resolved: boolean
  auto_sent_at?: string
  /** ISO timestamp of the queued dispatcher attempt (3-minute delay window). */
  auto_send_queued_at?: string
  /** Per-ticket kill switch — pipeline skips drafting AND auto-send. */
  ai_disabled?: boolean
  is_deleted?: boolean
  supplier_status: 'REQUESTED' | 'SUPPLIER_REPLIED' | 'RESOLVED' | null
  supplier_request_type: string | null
  is_stuck: boolean
  customer_history?: string
  messages: ThreadMessage[]
  trace?: TraceStep[]
  notes?: { id: string; author: string; body: string; at: string; ai?: boolean }[]
  /** Team member id this conversation is assigned to (null = unassigned). */
  assignee?: string | null
  created_at: string
}

export interface Shop {
  id: string
  name: string
  domain: string
  open_count: number
  /** False while the store is still served by the legacy support app (cutover). */
  served?: boolean
}

export interface ActivityEvent {
  at: string
  ev: string
  detail: string
  kind: 'ok' | 'hold' | 'send'
}

/* ---------------------------------------------------------------------------
   Console-side domain shapes. These used to live in mockApi.ts, which is gone:
   they are TYPES, not fabricated data, and both the live adapter and the views
   need them. A type has no runtime value to be wrong about. */

/** Kanban column of a task. */
export type TaskCol = 'todo' | 'doing' | 'waiting' | 'done'

/** One structured SOP rule for a store (when / if / then). */
export interface SopRuleV2 {
  id: string
  category: 'Refunds & returns' | 'Shipping' | 'Order changes' | 'Escalation' | 'Other'
  when: string
  conds: string[]
  then: string
  enabled: boolean
  /** Tickets this rule shaped in the last 30 days. No server counter feeds this
      yet, so the live adapter sets 0 and no surface renders it — a rendered 0
      would assert something nobody measured. */
  hits30d: number
  locked?: boolean
}

/** A {token} a store's rules can reference, resolved from the live shop policy. */
export interface SopVar { key: string; label: string; value: string; desc: string }

/** A saved reply. */
export interface Macro { id: string; label: string; body: string }

/** A payment dispute, as the console renders it. */
export interface Chargeback {
  id: string
  order_name: string
  customer: string
  shop_id: string
  amount: string
  currency: string
  gateway: string
  reason: string
  evidence_due: string | null
  ticket_id?: string
  status: 'needs_response' | 'under_review' | 'won' | 'lost'
  evidence: { label: string; ready: boolean }[]
}

/** An inbound triage rule, run before drafting. */
export interface InboxRule {
  id: string
  if_field: 'sender' | 'subject' | 'category' | 'language'
  if_value: string
  action: 'close' | 'assign' | 'skip_ai' | 'bin'
  target: string | null
  enabled: boolean
  hits30d: number
}

/** Where a return currently stands. */
export type ReturnStage = 'requested' | 'options_sent' | 'return_approved' | 'item_received' | 'refunded' | 'partial_refunded'
export interface ReturnFlow { stage: ReturnStage; option: 'A' | 'B' | null; updated_at: string }
