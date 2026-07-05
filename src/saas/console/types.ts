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
  attachments?: { filename: string; size: string }[]
}

/** One step of the drafting pipeline, surfaced as the decision trace. */
export interface TraceStep {
  step: string
  detail: string
  ok: boolean
  ms?: number
}

export interface Ticket {
  id: string
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
  order_id: string | null
  order_name: string | null
  order_match_confidence: number
  order_match_reason: string | null
  order_snapshot: OrderSnapshot | null
  draft_body: string | null
  draft_body_english: string | null
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
  created_at: string
}

export interface Shop {
  id: string
  name: string
  domain: string
  open_count: number
}

export interface ActivityEvent {
  at: string
  ev: string
  detail: string
  kind: 'ok' | 'hold' | 'send'
}
