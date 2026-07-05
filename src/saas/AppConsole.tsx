// Resolver app, implementable redesign at /app.
// Consumes ONLY the production-shaped data layer in ./console (types.ts =
// faithful subset of rsvlr src/types.ts; mockApi.ts = client whose methods
// map 1:1 to real endpoints, see WIRING.md). Swapping mockApi's internals
// for fetch calls wires this UI to the live app unchanged.
// Monochrome brand. No avatars, sender identity is text, not decoration.
import { useEffect, useState, useSyncExternalStore } from 'react'
import {
  Inbox, CircleCheck, ListChecks, Settings, Search,
  ChevronsUpDown, Package, Truck, ShieldCheck, Send, Pencil, Trash2,
  RefreshCw, Gavel, Clock, Check, Zap, ArrowUpRight, User, LayoutDashboard,
  Filter, FileText, X, Plus, PauseCircle, Languages, ChevronDown,
  Unlink, Loader2, Factory, RotateCcw, Tag,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Category, Ticket, TicketStatus } from './console/types'
import * as api from './console/mockApi'

const LOGO = '/logo/recolor/oct-black-t.png'

/* ------------------------------------------------------------- constants */
type View =
  | 'overview' | 'tickets' | 'resolved' | 'bin' | 'filtered'
  | 'compose' | 'sent' | 'tasks' | 'customs' | 'chargebacks'
  | 'ailog' | 'users' | 'settings'

const NAV: { group: string; items: { v: View; Ic: LucideIcon; label: string }[] }[] = [
  { group: '', items: [{ v: 'overview', Ic: LayoutDashboard, label: 'Overview' }] },
  {
    group: 'Inbox',
    items: [
      { v: 'tickets', Ic: Inbox, label: 'Tickets' },
      { v: 'resolved', Ic: CircleCheck, label: 'Resolved' },
      { v: 'bin', Ic: Trash2, label: 'Bin' },
      { v: 'filtered', Ic: Filter, label: 'Filtered' },
    ],
  },
  { group: 'Outbound', items: [{ v: 'compose', Ic: Pencil, label: 'Compose' }, { v: 'sent', Ic: Send, label: 'Sent' }] },
  {
    group: 'Operations',
    items: [
      { v: 'tasks', Ic: ListChecks, label: 'Tasks' },
      { v: 'chargebacks', Ic: Gavel, label: 'Chargebacks' },
    ],
  },
  { group: 'Automation', items: [{ v: 'ailog', Ic: Zap, label: 'Automation log' }] },
  { group: '', items: [{ v: 'settings', Ic: Settings, label: 'Settings' }] },
]

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  WAITING_CUSTOMER: 'Waiting on customer',
  WAITING_SUPPLIER: 'Waiting on supplier',
  RESOLVED: 'Resolved',
  REPLACEMENT_SENT: 'Replacement sent',
  ESCALATED: 'Escalated',
}
const CATEGORY_LABEL: Partial<Record<Category, string>> = {
  SHIPPING: 'Shipping', REFUND: 'Refund', CANCEL: 'Order change', NOT_RECEIVED: 'Not received',
  DAMAGED: 'Damaged', PAYMENT: 'Payment', GENERAL: 'General', ANGRY: 'Angry',
  CHARGEBACK: 'Chargeback', PARTNERSHIP: 'Partnership',
}
const FILTERS = ['All', 'Open', 'Escalated', 'Waiting', 'Resolved'] as const

function statusChip(t: Ticket) {
  if (t.auto_send_queued_at) return <span className="c-chip green">Sending soon</span>
  if (t.status === 'ESCALATED') return <span className="c-chip red">Escalated</span>
  if (t.status === 'RESOLVED') return <span className="c-chip mut">{t.auto_resolved ? 'Auto-resolved' : 'Resolved'}</span>
  if (t.status === 'WAITING_SUPPLIER') return <span className="c-chip ink">Supplier</span>
  if (t.status === 'WAITING_CUSTOMER') return <span className="c-chip mut">Waiting</span>
  if (t.draft_body) return <span className="c-chip ink">Draft ready</span>
  return <span className="c-chip ink">Needs you</span>
}

function useStore() {
  return useSyncExternalStore(api.subscribe, api.getVersion)
}
function timeAgo(isoStr: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000))
  if (s < 60) return s + 's'
  if (s < 3600) return Math.floor(s / 60) + 'm'
  if (s < 86400) return Math.floor(s / 3600) + 'h'
  return Math.floor(s / 86400) + 'd'
}

/* ---------------------------------------------------------------- views */
function Overview({ shopId }: { shopId: string }) {
  useStore()
  const counts = api.getCounts(shopId)
  const KPIS = [
    { label: 'Open tickets', v: String(counts.open), sub: shopId === 'all' ? 'across 3 stores' : 'this store' },
    { label: 'Queued to auto-send', v: String(counts.queued), sub: '3-min cancel window' },
    { label: 'Escalated', v: String(counts.escalated), sub: 'dispute language' },
    { label: 'Avg first reply', v: '38m', sub: 'last 7 days · demo' },
  ]
  const BACKLOG = [['<4h', 4], ['4 to 24h', 1], ['1 to 3d', 1], ['3d+', 0]] as const
  const VOLUME = [['Mon', 62], ['Tue', 78], ['Wed', 54], ['Thu', 88], ['Fri', 100], ['Sat', 46], ['Sun', 58]] as const
  const HEALTH = [
    ['Gmail connection', 'Connected · support@aurora.com'],
    ['Shopify sync', '3 stores · read-only scopes'],
    ['Tracking provider', 'Live · 14 carriers'],
    ['Drafting queue', 'Idle · 0 waiting'],
  ]
  return (
    <div className="c-page">
      <header className="c-page-h">
        <div><h1>Overview</h1><p>Today at a glance · demo data</p></div>
        <span className="c-pill-mut"><Clock size={13} /> Last 7 days</span>
      </header>
      <div className="c-kpis">
        {KPIS.map((k) => (
          <div className="c-kpi" key={k.label}>
            <div className="n">{k.v}</div>
            <div className="l">{k.label}</div>
            <div className="s">{k.sub}</div>
          </div>
        ))}
      </div>
      <div className="c-grid2">
        <div className="c-card">
          <div className="c-card-h">Daily ticket volume</div>
          <div className="c-bars">
            {VOLUME.map(([d, pct]) => (
              <div className="col" key={d}>
                <div className="wrap"><i style={{ height: pct + '%' }} /></div>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="c-card">
          <div className="c-card-h">Backlog by age</div>
          <div className="c-rows">
            {BACKLOG.map(([b, n]) => (
              <div className="c-lane-row" key={b}>
                <span className="nm">{b}</span>
                <span className="bar"><i style={{ width: (n / 6) * 100 + '%' }} /></span>
                <span className="pct">{n}</span>
              </div>
            ))}
          </div>
          <div className="c-card-h" style={{ marginTop: 26 }}>System health</div>
          <div className="c-rows">
            {HEALTH.map(([k, v]) => (
              <div className="c-kv" key={k}><span>{k}</span><b><Check size={13} /> {v}</b></div>
            ))}
          </div>
        </div>
      </div>
      <div className="c-card">
        <div className="c-card-h">Recent automation activity</div>
        <div className="c-rows">
          {api.getLog().slice(0, 5).map((e, i) => (
            <div className="c-ev" key={i}>
              <span className={'ic ' + e.kind}>{e.kind === 'hold' ? <PauseCircle size={13} /> : e.kind === 'send' ? <Send size={12} /> : <Check size={13} />}</span>
              <span className="t"><b>{e.ev}</b>, {e.detail}</span>
              <span className="at">{timeAgo(e.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------- tickets: the 3-pane, running the real state machine ----- */
function useOutsideClose(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return
    const h = () => close()
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [open, close])
}
function CategoryDropdown({ t }: { t: Ticket }) {
  const [open, setOpen] = useState(false)
  useOutsideClose(open, () => setOpen(false))
  return (
    <div className="c-status-wrap" onClick={(e) => e.stopPropagation()}>
      <button className="c-chip-btn" onClick={() => setOpen(!open)}>
        <Tag size={13} /> {CATEGORY_LABEL[t.category]} <ChevronDown size={13} />
      </button>
      {open && (
        <div className="c-menu">
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
            <button key={c} className={c === t.category ? 'on' : ''} onClick={() => { api.patchCategory(t.id, c); setOpen(false) }}>
              {CATEGORY_LABEL[c]} {c === t.category && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
function StatusDropdown({ t }: { t: Ticket }) {
  const [open, setOpen] = useState(false)
  useOutsideClose(open, () => setOpen(false))
  return (
    <div className="c-status-wrap" onClick={(e) => e.stopPropagation()}>
      <button className="c-chip-btn" onClick={() => setOpen(!open)}>
        <RefreshCw size={13} /> {STATUS_LABEL[t.status]} <ChevronDown size={13} />
      </button>
      {open && (
        <div className="c-menu">
          {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => (
            <button key={s} className={s === t.status ? 'on' : ''} onClick={() => { api.patchStatus(t.id, s); setOpen(false) }}>
              {STATUS_LABEL[s]} {s === t.status && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AutoSendBar({ t }: { t: Ticket }) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [])
  if (!t.auto_send_queued_at) return null
  const ms = new Date(t.auto_send_queued_at).getTime() - Date.now()
  if (ms <= 0) return null
  const mm = Math.floor(ms / 60000)
  const ss = String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')
  return (
    <>
      <span className="c-count"><Clock size={13} /> Auto-sends in {mm}:{ss}</span>
      <button className="c-act red" onClick={() => api.cancelAutoSend(t.id)}><X size={14} /> Cancel send</button>
    </>
  )
}

function TicketsView({ shopId }: { shopId: string }) {
  useStore()
  const [sel, setSel] = useState('t-4471')
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All')
  const [q, setQ] = useState('')
  const [mirror, setMirror] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState('')
  const [busy, setBusy] = useState<'' | 'send' | 'regen'>('')
  const [cooldownAt, setCooldownAt] = useState<Record<string, number>>({})

  // listTickets is async in production; the mock store is read synchronously.
  const tickets = ((): Ticket[] => {
    const base = ['t-4471', 't-4468', 't-4462', 't-4455', 't-4449', 't-4440']
      .map((id) => api.getTicket(id))
      .filter((t): t is Ticket => !!t && !t.is_deleted)
      .filter((t) => shopId === 'all' || t.shop_id === shopId)
      .filter((t) => !q || (t.subject + t.customer_email + (t.customer_name ?? '') + (t.order_name ?? '')).toLowerCase().includes(q.toLowerCase()))
    if (filter === 'All') return base
    if (filter === 'Open') return base.filter((t) => t.status === 'OPEN')
    if (filter === 'Escalated') return base.filter((t) => t.status === 'ESCALATED')
    if (filter === 'Waiting') return base.filter((t) => t.status === 'WAITING_CUSTOMER' || t.status === 'WAITING_SUPPLIER')
    return base.filter((t) => t.status === 'RESOLVED')
  })()

  const t = api.getTicket(sel) ?? tickets[0]
  useEffect(() => { setMirror(false); setEditing(false); setBusy('') }, [sel])
  if (!t) return <div className="c-page"><p>No tickets.</p></div>

  const isForeign = t.customer_language !== 'en'
  const draftShown = mirror && t.draft_body_english ? t.draft_body_english : t.draft_body
  const cooldownLeft = Math.max(0, 180 - Math.floor((Date.now() - (cooldownAt[t.id] ?? -1e12)) / 1000))
  const onCooldown = cooldownAt[t.id] != null && cooldownLeft > 0

  const doSend = async () => {
    setBusy('send')
    await api.postSend(t.id, editing ? editBody : (t.draft_body ?? ''))
    setCooldownAt((c) => ({ ...c, [t.id]: Date.now() }))
    setEditing(false)
    setBusy('')
  }
  const doRegen = async () => {
    setBusy('regen')
    await api.postRegenerate(t.id)
    setBusy('')
  }

  return (
    <div className="c-3pane">
      <section className="c-queue">
        <header className="c-q-head">
          <div className="c-q-title">Tickets <span className="n">{api.getCounts(shopId).open}</span></div>
          <div className="c-search"><Search size={14} /><input placeholder="Search tickets, orders, customers…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="c-ftabs">
            {FILTERS.map((f) => (
              <button key={f} className={f === filter ? 'on' : ''} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
        </header>
        <div className="c-list">
          {tickets.map((x) => (
            <button key={x.id} className={'c-row' + (x.id === t.id ? ' sel' : '')} onClick={() => setSel(x.id)}>
              <span className="main">
                <span className="top"><b>{x.customer_name ?? x.customer_email}</b><span className="time">{timeAgo(x.last_customer_message_at)}</span></span>
                <span className="sub">{x.subject}</span>
                <span className="prev">{x.last_customer_message_english ?? x.last_customer_message}</span>
                <span className="tags">
                  {statusChip(x)}
                  <span className="lang">{CATEGORY_LABEL[x.category]}</span>
                  <span className="lang">{x.customer_language.toUpperCase()}</span>
                  {shopId === 'all' && <span className="store">{x.shop_id}</span>}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <main className="c-conv">
        <header className="c-c-head">
          <div className="who">
            <div>
              <div className="nm">{t.customer_name ?? t.customer_email}{t.chargeback_status === 'warning' && <span className="c-chip red" style={{ marginLeft: 8 }}>Chargeback risk</span>}</div>
              <div className="meta">{t.customer_email} · {t.shop_id} · {t.message_count} message{t.message_count > 1 ? 's' : ''}</div>
            </div>
          </div>
          <div className="acts">
            {isForeign && (
              <button className={'c-mirror' + (mirror ? ' on' : '')} onClick={() => setMirror(!mirror)} title={mirror ? 'Showing English translation' : 'Showing original language'}>
                <Languages size={12} /> {mirror ? 'EN' : t.customer_language.toUpperCase()}
              </button>
            )}
            <CategoryDropdown t={t} />
            <StatusDropdown t={t} />
            {!t.supplier_status && (
              <button className="c-chip-btn" title="Open a supplier request" onClick={() => api.postSupplier(t.id, 'Stock / reshipment check')}>
                <Factory size={13} /> Ask supplier
              </button>
            )}
            <button className={'c-chip-btn' + (t.ai_disabled ? ' red' : '')} onClick={() => api.postAiToggle(t.id)} title="Per-ticket AI kill switch">
              <Zap size={13} /> {t.ai_disabled ? 'AI off' : 'AI on'}
            </button>
            <button className="c-chip-btn" title="Move to bin" onClick={() => api.deleteTicket(t.id)}>
              <Trash2 size={13} />
            </button>
          </div>
        </header>

        <div className="c-thread">
          {t.status === 'ESCALATED' && <div className="c-risk"><ShieldCheck size={14} /> Dispute language detected, pulled from every automated lane, routed to a human.</div>}
          {t.ai_disabled && <div className="c-risk mut"><PauseCircle size={14} /> AI is disabled for this ticket, no drafting, no auto-send, until re-enabled.</div>}
          {t.supplier_status === 'REQUESTED' && (
            <div className="c-risk mut"><Factory size={14} /> Waiting on supplier, {t.supplier_request_type} · sent by email. Auto-reminder if no reply in 48h.</div>
          )}
          {t.messages.map((m) => (
            <div key={m.id} className={'c-msg' + (m.is_customer ? '' : ' me')}>
              <div className="bubble">
                <span className="from">{m.from_name ?? m.from}{!m.is_customer && t.auto_sent_at && <span className="c-chip mut" style={{ marginLeft: 8 }}>AI</span>}</span>
                {mirror && m.body_english ? m.body_english : m.body}
                <span className="at">{timeAgo(m.date)} ago</span>
              </div>
            </div>
          ))}

          {t.draft_body ? (
            <div className={'c-draft' + (t.status === 'ESCALATED' ? ' esc' : '')}>
              <div className="h">
                <span className="tag">{t.status === 'ESCALATED' ? 'Held for a human' : 'Resolver drafted a reply'}</span>
                <span className="c-drafted-at">drafted {timeAgo(t.draft_generated_at!)} ago</span>
              </div>
              {editing ? (
                <textarea className="c-edit" value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={6} />
              ) : (
                <p className="body">{draftShown}</p>
              )}
              {t.order_name && (
                <div className="chips">
                  <span><Check size={11} /> {t.order_name}</span>
                  {t.order_snapshot?.tracking_numbers[0] && <span><Check size={11} /> Live tracking</span>}
                  <span><Check size={11} /> SOP policies</span>
                </div>
              )}
              <div className="acts">
                <AutoSendBar t={t} />
                {onCooldown ? (
                  <span className="c-held"><Clock size={13} /> Sent, cooldown {cooldownLeft}s (anti double-send)</span>
                ) : (
                  <>
                    <button className="c-act prim" disabled={busy !== ''} onClick={doSend}>
                      {busy === 'send' ? <Loader2 size={14} className="c-spin" /> : <Send size={14} />} {editing ? 'Send edited' : 'Approve & send'}
                    </button>
                    <button className="c-act" onClick={() => { setEditing(!editing); setEditBody(t.draft_body ?? '') }}>
                      <Pencil size={14} /> {editing ? 'Discard edit' : 'Edit'}
                    </button>
                    <button className="c-act ic" title="Regenerate" disabled={busy !== ''} onClick={doRegen}>
                      {busy === 'regen' ? <Loader2 size={14} className="c-spin" /> : <RefreshCw size={14} />}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="c-draft">
              <div className="h"><span className="tag">{t.status === 'RESOLVED' ? 'Resolved, no reply needed' : 'No draft yet'}</span></div>
              {t.status !== 'RESOLVED' && (
                <div className="acts">
                  <button className="c-act" disabled={busy !== ''} onClick={doRegen}>
                    {busy === 'regen' ? <Loader2 size={14} className="c-spin" /> : <Zap size={14} />} Generate draft
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <aside className="c-ctx2">
        <div className="sec">
          <div className="h">Order match</div>
          <div className="card">
            <div className="c-kv"><span>Reason</span><b>{t.order_match_reason}</b></div>
            <div className="c-kv"><span>Confidence</span><b className={t.order_match_confidence >= 0.9 ? 'green' : t.order_match_confidence > 0 ? '' : 'red'}>{t.order_match_confidence > 0 ? Math.round(t.order_match_confidence * 100) + '%' : 'No match'}</b></div>
            {t.order_id && (
              <a className="link" onClick={() => api.unlinkOrder(t.id)}><Unlink size={12} /> Wrong order? Unlink</a>
            )}
          </div>
        </div>
        {t.order_snapshot && (
          <>
            <div className="sec">
              <div className="h">Order {t.order_snapshot.order_name}</div>
              <div className="card">
                {t.order_snapshot.line_items.map((li) => (
                  <div className="line" key={li.title}><Package size={13} /><span>{li.quantity}× {li.title}</span></div>
                ))}
                <div className="c-kv"><span>Payment</span><b>{t.order_snapshot.financial_status}</b></div>
                <div className="c-kv"><span>Fulfillment</span><b>{t.order_snapshot.fulfillment_status}</b></div>
                <div className="c-kv"><span>Total</span><b>{t.order_snapshot.currency === 'EUR' ? '€' : '$'}{t.order_snapshot.total_price}</b></div>
                <div className="c-kv"><span>Ships to</span><b>{t.order_snapshot.shipping_country}</b></div>
                <a className="link">Open in Shopify <ArrowUpRight size={12} /></a>
                <a className="link" onClick={() => api.refreshOrder(t.id)}><RotateCcw size={12} /> Refresh snapshot</a>
              </div>
            </div>
            <div className="sec">
              <div className="h">Timeline</div>
              <div className="card">
                <div className="c-tl">
                  <div className="e done"><i /><span>Order placed · {timeAgo(t.order_snapshot.created_at)} ago</span></div>
                  <div className={'e' + (t.order_snapshot.fulfillment_status === 'fulfilled' ? ' done' : '')}><i /><span>Fulfilled</span></div>
                  {t.order_snapshot.tracking_status[0] && (
                    <div className={'e' + (/transit|Deliver/i.test(t.order_snapshot.tracking_status[0]) ? ' done' : '')}><i /><span>{t.order_snapshot.tracking_status[0]}</span></div>
                  )}
                  <div className={'e' + (/^Delivered/i.test(t.order_snapshot.tracking_status[0] ?? '') ? ' done' : '')}><i /><span>Delivered</span></div>
                </div>
              </div>
            </div>
            {t.order_snapshot.tracking_numbers.length > 0 && (
              <div className="sec">
                <div className="h">Fulfillment</div>
                <div className="card">
                  <div className="line"><Truck size={13} /><span>{t.order_snapshot.tracking_numbers[0]}</span></div>
                  <div className="c-kv"><span>Status</span><b className="green">{t.order_snapshot.tracking_status[0]}</b></div>
                  <a className="link">Live tracking <ArrowUpRight size={12} /></a>
                </div>
              </div>
            )}
          </>
        )}
        <div className="sec">
          <div className="h">Customer</div>
          <div className="card">
            <div className="line"><User size={13} /><span>{t.customer_history}</span></div>
            <div className="c-kv"><span>Sentiment</span><b className={t.sentiment === 'angry' ? 'red' : ''}>{t.sentiment}</b></div>
            <div className="c-kv"><span>Urgency</span><b>{t.urgency_score}/100</b></div>
          </div>
        </div>
      </aside>
    </div>
  )
}

/* ----------------------------------------------- derived list views ----- */
function DerivedList({ title, sub, filterFn, empty }: {
  title: string; sub: string; filterFn: (t: Ticket) => boolean; empty: string
}) {
  useStore()
  const rows = ['t-4471', 't-4468', 't-4462', 't-4455', 't-4449', 't-4440']
    .map((id) => api.getTicket(id)!)
    .filter(filterFn)
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>{title}</h1><p>{sub}</p></div></header>
      <div className="c-card">
        <div className="c-rows">
          {rows.length === 0 && <p className="c-note" style={{ marginTop: 0 }}>{empty}</p>}
          {rows.map((t) => (
            <div className="c-ev" key={t.id}>
              <span className="t"><b>{t.subject}</b>, {t.customer_name ?? t.customer_email} · {CATEGORY_LABEL[t.category]}</span>
              <span className="at">{timeAgo(t.last_customer_message_at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StaticList({ title, sub, rows }: { title: string; sub: string; rows: [string, string, string][] }) {
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>{title}</h1><p>{sub}</p></div></header>
      <div className="c-card">
        <div className="c-rows">
          {rows.map(([a, b, c], i) => (
            <div className="c-ev" key={i}><span className="t"><b>{a}</b>, {b}</span><span className="at">{c}</span></div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Compose() {
  const [from, setFrom] = useState('support@aurora.com')
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle')
  const doSend = async () => {
    if (!to || !subject) return
    setState('sending')
    await api.sendCompose(from, to, subject)
    setState('sent')
    setTo(''); setSubject(''); setBody('')
    setTimeout(() => setState('idle'), 2500)
  }
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Compose</h1><p>New outbound email</p></div></header>
      <div className="c-card c-compose">
        <label>From<select value={from} onChange={(e) => setFrom(e.target.value)}><option>support@aurora.com</option><option>hello@harborgoods.com</option><option>care@northbound.co</option></select></label>
        <label>To<input placeholder="customer@email.com" value={to} onChange={(e) => setTo(e.target.value)} /></label>
        <label>Subject<input placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
        <label>Message<textarea rows={8} placeholder="Write your message, or type # to attach an order." value={body} onChange={(e) => setBody(e.target.value)} /></label>
        <div className="row">
          <button className="c-act prim" disabled={state !== 'idle' || !to || !subject} onClick={doSend}>
            {state === 'sending' ? <Loader2 size={14} className="c-spin" /> : <Send size={14} />} {state === 'sent' ? 'Sent ✓' : 'Send'}
          </button>
          <button className="c-act"><FileText size={14} /> Save draft</button>
        </div>
      </div>
    </div>
  )
}

function ChargebacksView() {
  useStore()
  const rows = ['t-4468'].map((id) => api.getTicket(id)!)
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Chargebacks</h1><p>Disputes from Shopify Payments · demo data</p></div></header>
      <div className="c-card">
        <table className="c-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Store</th><th>Amount</th><th>Signal</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td><b>{t.order_name}</b></td><td>{t.customer_name}</td><td>{t.shop_id}</td>
                <td>${t.order_snapshot?.total_price}</td>
                <td>Dispute language in email</td>
                <td><span className="c-chip red">{t.chargeback_status === 'warning' ? 'Warning' : t.chargeback_status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="c-note">Chargeback tickets are never auto-replied, the linked conversation sits at the top of your queue.</p>
      </div>
    </div>
  )
}

function AiLog() {
  useStore()
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Automation log</h1><p>Every automated action, auditable · live from this session</p></div></header>
      <div className="c-card">
        <div className="c-rows">
          {api.getLog().map((e, i) => (
            <div className="c-ev" key={i}>
              <span className={'ic ' + e.kind}>{e.kind === 'hold' ? <PauseCircle size={13} /> : e.kind === 'send' ? <Send size={12} /> : <Check size={13} />}</span>
              <span className="t"><b>{e.ev}</b>, {e.detail}</span>
              <span className="at">{timeAgo(e.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BinView() {
  useStore()
  const rows = ['t-4471', 't-4468', 't-4462', 't-4455', 't-4449', 't-4440']
    .map((id) => api.getTicket(id))
    .filter((t): t is Ticket => !!t && !!t.is_deleted)
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Bin</h1><p>Deleted conversations, recoverable for 30 days</p></div></header>
      <div className="c-card">
        <div className="c-rows">
          {rows.length === 0 && <p className="c-note" style={{ marginTop: 0 }}>Bin is empty.</p>}
          {rows.map((t) => (
            <div className="c-ev" key={t.id}>
              <span className="t"><b>{t.subject}</b>, {t.customer_name ?? t.customer_email}</span>
              <button className="c-act" onClick={() => api.restoreTicket(t.id)}><RotateCcw size={13} /> Restore</button>
              <button className="c-act red" onClick={() => api.permanentDelete(t.id)}><Trash2 size={13} /> Delete forever</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const KANBAN_COLS: { id: api.TaskCol; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'doing', label: 'In progress' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'done', label: 'Done' },
]
function TasksView() {
  useStore()
  const [mode, setMode] = useState<'board' | 'list'>('board')
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const tasks = api.getTasks()
  const onDrop = (e: React.DragEvent, col: api.TaskCol) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/task')
    if (id) api.moveTask(id, col)
  }
  return (
    <div className="c-page">
      <header className="c-page-h">
        <div><h1>Tasks</h1><p>Follow-ups the AI queued, plus your own</p></div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="c-seg">
            {(['board', 'list'] as const).map((m) => (
              <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m === 'board' ? 'Board' : 'List'}</button>
            ))}
          </div>
          <button className="c-act prim" onClick={() => setAdding(!adding)}><Plus size={14} /> New task</button>
        </div>
      </header>
      {adding && (
        <div className="c-card" style={{ display: 'flex', gap: 10 }}>
          <input
            className="c-input" autoFocus placeholder="Task title, Enter to add"
            value={title} onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) { api.createTask(title.trim(), 'added manually'); setTitle(''); setAdding(false) } if (e.key === 'Escape') setAdding(false) }}
          />
          <button className="c-act" onClick={() => { if (title.trim()) { api.createTask(title.trim(), 'added manually'); setTitle(''); setAdding(false) } }}>Add</button>
        </div>
      )}
      {mode === 'board' ? (
        <div className="c-kanban">
          {KANBAN_COLS.map((col) => {
            const items = tasks.filter((k) => k.col === col.id)
            return (
              <div className="kb-col" key={col.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, col.id)}>
                <div className="kb-h">{col.label}<span className="n">{items.length}</span></div>
                <div className="kb-list">
                  {items.map((k) => (
                    <div
                      className={'kb-card' + (col.id === 'done' ? ' done' : '')} key={k.id} draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/task', k.id)}
                    >
                      <div className="t">{k.t}</div>
                      <div className="d">{k.d}</div>
                      <div className="kb-foot">
                        <span className="due">{k.due}</span>
                        <div className="mv">
                          {KANBAN_COLS.filter((c) => c.id !== col.id).slice(0, 3).map((c) => (
                            <button key={c.id} title={'Move to ' + c.label} onClick={() => api.moveTask(k.id, c.id)}>{c.label[0]}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && <div className="kb-empty">Drop here</div>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="c-card">
          <div className="c-rows">
            {tasks.map((k) => (
              <div className="c-ev" key={k.id} style={k.col === 'done' ? { opacity: .45 } : undefined}>
                <button className={'c-check' + (k.col === 'done' ? ' on' : '')} onClick={() => api.toggleTask(k.id)} aria-label="toggle task">
                  {k.col === 'done' && <Check size={12} strokeWidth={3} />}
                </button>
                <span className="t" style={k.col === 'done' ? { textDecoration: 'line-through' } : undefined}><b>{k.t}</b>, {k.d}</span>
                <span className="c-chip mut">{KANBAN_COLS.find((c) => c.id === k.col)!.label}</span>
                <span className="at">{k.due}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SentView() {
  useStore()
  const fromTickets = ['t-4471', 't-4468', 't-4462', 't-4455', 't-4449', 't-4440']
    .map((id) => api.getTicket(id))
    .filter((t): t is Ticket => !!t)
    .flatMap((t) => t.messages.filter((m) => !m.is_customer).map((m) => ({ at: m.date, to: t.customer_email, subject: 'Re: ' + t.subject, from: m.from })))
  const rows = [...api.getOutbound(), ...fromTickets].sort((a, b) => b.at.localeCompare(a.at))
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Sent</h1><p>Outbound mail across stores</p></div></header>
      <div className="c-card">
        <div className="c-rows">
          {rows.length === 0 && <p className="c-note" style={{ marginTop: 0 }}>Nothing sent yet.</p>}
          {rows.map((r, i) => (
            <div className="c-ev" key={i}>
              <span className="t"><b>{r.subject}</b>, to {r.to} · from {r.from}</span>
              <span className="at">{timeAgo(r.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function UsersView() {
  return (
    <div className="c-page">
      <header className="c-page-h">
        <div><h1>Users</h1><p>Team access · 2 of 3 seats used</p></div>
        <button className="c-act prim"><Plus size={14} /> Invite</button>
      </header>
      <div className="c-card">
        <div className="c-rows">
          <div className="c-ev"><span className="t"><b>Nathan</b>, Owner · all stores</span><span className="at">you</span></div>
          <div className="c-ev"><span className="t"><b>Chandan</b>, Agent · AURORA only</span><span className="at">active</span></div>
        </div>
      </div>
    </div>
  )
}

const LANES_INIT = [
  { name: 'Shipping / WISMO', mode: 'live' as 'off' | 'shadow' | 'live' },
  { name: 'Returns & refunds', mode: 'shadow' as 'off' | 'shadow' | 'live' },
  { name: 'Order changes', mode: 'live' as 'off' | 'shadow' | 'live' },
  { name: 'General questions', mode: 'shadow' as 'off' | 'shadow' | 'live' },
]
type Lanes = typeof LANES_INIT

function SettingsView({ lanes, setLanes, killed, setKilled }: {
  lanes: Lanes; setLanes: (l: Lanes) => void; killed: boolean; setKilled: (b: boolean) => void
}) {
  const [tab, setTab] = useState<'Lanes' | 'Stores' | 'Policies & SOP' | 'Email' | 'Team' | 'Billing'>('Lanes')
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Settings</h1><p>AURORA · owner access</p></div></header>
      <div className="c-set">
        <nav className="c-set-nav">
          {(['Lanes', 'Stores', 'Policies & SOP', 'Email', 'Team', 'Billing'] as const).map((x) => (
            <button key={x} className={x === tab ? 'on' : ''} onClick={() => setTab(x)}>{x}</button>
          ))}
        </nav>
        <div className="c-set-body">
          {tab === 'Lanes' && (
            <>
              <div className={'c-kill' + (killed ? ' on' : '')}>
                <div>
                  <b>Kill switch</b>
                  <p>{killed ? 'All automated sending is paused. Drafts still generate and hold for approval.' : 'One switch stops all automated sending immediately. Drafting continues.'}</p>
                </div>
                <button className={'c-switch' + (killed ? ' on' : '')} onClick={() => setKilled(!killed)} aria-label="Kill switch"><span className="k" /></button>
              </div>
              {lanes.map((l, i) => (
                <div className="c-lane-set" key={l.name}>
                  <span className="nm">{l.name}</span>
                  <div className="modes">
                    {(['off', 'shadow', 'live'] as const).map((m) => (
                      <button key={m} className={l.mode === m ? 'on' : ''} onClick={() => setLanes(lanes.map((x, j) => (j === i ? { ...x, mode: m } : x)))}>{m}</button>
                    ))}
                  </div>
                  <span className="note">{l.mode === 'live' ? (killed ? 'paused by kill switch' : 'auto-send · 3-min cancel window') : l.mode === 'shadow' ? 'drafts only, nothing sends' : 'no drafting'}</span>
                </div>
              ))}
              <p className="c-note">Chargeback and legal language always routes to a human, regardless of lane modes.</p>
            </>
          )}
          {tab === 'Stores' && (
            <div className="c-rows">
              {['AURORA, aurora.com · 4 open', 'Harbor Goods, harborgoods.com · 1 open', 'Northbound, northbound.co · 1 open'].map((s) => (
                <div className="c-ev" key={s}><span className="t"><b>{s.split(', ')[0]}</b>, {s.split(', ')[1]}</span><span className="at">connected</span></div>
              ))}
              <button className="c-act" style={{ marginTop: 14, alignSelf: 'flex-start' }}><Plus size={14} /> Add store</button>
            </div>
          )}
          {tab === 'Policies & SOP' && (
            <div className="c-rows">
              <div className="c-ev"><span className="ic ok"><FileText size={13} /></span><span className="t"><b>support-sop-v3.pdf</b>, uploaded Jun 12 · constrains every draft</span><span className="at">replace</span></div>
              <div className="c-kv"><span>Refund window</span><b>30 days</b></div>
              <div className="c-kv"><span>Reshipment policy</span><b>Free reship on damage w/ photo</b></div>
              <div className="c-kv"><span>Tone</span><b>Warm, plain, no exclamation marks</b></div>
            </div>
          )}
          {tab === 'Email' && (
            <div className="c-rows">
              <div className="c-kv"><span>Provider</span><b>Gmail, support@aurora.com</b></div>
              <div className="c-kv"><span>Send verification</span><b className="green">Verified</b></div>
              <div className="c-kv"><span>DKIM / SPF</span><b className="green">Verified</b></div>
              <div className="c-kv"><span>Loop protection</span><b>On, auto-replies filtered</b></div>
            </div>
          )}
          {tab === 'Team' && (
            <div className="c-rows">
              <div className="c-ev"><span className="t"><b>Nathan</b>, owner, all stores</span><span className="at">you</span></div>
              <div className="c-ev"><span className="t"><b>Chandan</b>, agent, AURORA only</span><span className="at">active</span></div>
              <button className="c-act" style={{ marginTop: 14, alignSelf: 'flex-start' }}><Plus size={14} /> Invite teammate</button>
            </div>
          )}
          {tab === 'Billing' && (
            <div className="c-rows">
              <div className="c-kv"><span>Plan</span><b>Team, $249/mo</b></div>
              <div className="c-kv"><span>Usage this cycle</span><b>1,412 of 2,500 tickets</b></div>
              <div className="c-kv"><span>Stores</span><b>3 of 3</b></div>
              <div className="c-kv"><span>Managed by</span><b>Shopify billing</b></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- shell */
export function AppConsole() {
  useStore()
  const [view, setView] = useState<View>('tickets')
  const [shopIdx, setShopIdx] = useState(0)
  const [storeOpen, setStoreOpen] = useState(false)
  useOutsideClose(storeOpen, () => setStoreOpen(false))
  const [lanes, setLanes] = useState<Lanes>(LANES_INIT)
  const [killed, setKilled] = useState(false)
  const shopId = api.SHOPS[shopIdx].id
  const counts = api.getCounts(shopId)

  const badge: Partial<Record<View, number>> = {
    tickets: counts.open, tasks: 3, chargebacks: counts.escalated,
  }

  const CONTENT: Record<View, () => React.ReactElement> = {
    overview: () => <Overview shopId={shopId} />,
    tickets: () => <TicketsView shopId={shopId} />,
    resolved: () => <DerivedList title="Resolved" sub="Closed conversations" filterFn={(t) => t.status === 'RESOLVED'} empty="Nothing resolved yet today." />,
    bin: () => <BinView />,
    filtered: () => <StaticList title="Filtered" sub="Suppressed inbound, never reached the inbox" rows={[
      ['Newsletter · Shopify Weekly', 'marketing filter', '2h'],
      ['Auto-reply · Out of office', 'loop protection', '3h'],
    ]} />,
    compose: () => <Compose />,
    sent: () => <SentView />,
    tasks: () => <TasksView />,
    customs: () => <StaticList title="Customs" sub="Clearance requests detected in tracking" rows={[
      ['#1042 · CP998341US', 'cleared this morning, customer notified in draft', '2h'],
      ['#2088 · CP584201US', 'fee requested by carrier, customer asked to pay €4.20', 'yesterday'],
    ]} />,
    chargebacks: () => <ChargebacksView />,
    ailog: () => <AiLog />,
    users: () => <UsersView />,
    settings: () => <SettingsView lanes={lanes} setLanes={setLanes} killed={killed} setKilled={setKilled} />,
  }

  return (
    <div className="console2">
      <aside className="c-rail">
        <div className="c-brand"><img src={LOGO} alt="" /><span>resolver.chat</span></div>

        <div className="c-store-wrap" onClick={(e) => e.stopPropagation()}>
          <button className="c-store" onClick={() => setStoreOpen(!storeOpen)}>
            <span className="dot">{api.SHOPS[shopIdx].name[0]}</span>
            <span className="nm">{api.SHOPS[shopIdx].name}<small>{counts.open} open{shopId === 'all' ? ' · 3 stores' : ''}</small></span>
            <ChevronsUpDown size={14} className="mut" />
          </button>
          {storeOpen && (
            <div className="c-store-menu">
              {api.SHOPS.map((s, i) => (
                <button key={s.id} className={i === shopIdx ? 'on' : ''} onClick={() => { setShopIdx(i); setStoreOpen(false) }}>
                  {s.name} {i === shopIdx && <Check size={13} />}
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="c-nav">
          {NAV.map((g, gi) => (
            <div key={gi} className="grp">
              {g.group && <div className="glabel">{g.group}</div>}
              {g.items.map((it) => (
                <a key={it.v} className={'item' + (view === it.v ? ' on' : '')} onClick={() => setView(it.v)}>
                  <it.Ic size={16} /> <span>{it.label}</span>
                  {badge[it.v] != null && badge[it.v]! > 0 && <span className="n">{badge[it.v]}</span>}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="c-rail-foot">
          <div className={'c-auto' + (killed ? ' off' : '')}>
            <b>{killed ? 'Auto-send paused' : 'Auto-send active'}</b>
            <p>{killed ? 'Kill switch is on' : `${lanes.filter((l) => l.mode === 'live').length} lanes live · risky tickets always wait`}</p>
          </div>
          <div className="c-me"><span className="av">N</span><span>Nathan<small>Owner</small></span></div>
        </div>
      </aside>

      <div className="c-main"><div className="c-view" key={view}>{CONTENT[view]()}</div></div>
    </div>
  )
}
