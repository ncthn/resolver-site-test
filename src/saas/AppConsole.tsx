// Resolver app, implementable redesign at /app.
// Consumes ONLY the production-shaped data layer in ./console (types.ts =
// faithful subset of rsvlr src/types.ts; mockApi.ts = client whose methods
// map 1:1 to real endpoints, see WIRING.md). Swapping mockApi's internals
// for fetch calls wires this UI to the live app unchanged.
// Monochrome brand. No avatars, sender identity is text, not decoration.
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import {
  Inbox, CircleCheck, ListChecks, Settings, Search,
  ChevronsUpDown, Package, Truck, ShieldCheck, Send, Pencil, Trash2,
  RefreshCw, Gavel, Clock, Check, Zap, ArrowUpRight, User, LayoutDashboard,
  Filter, FileText, X, Plus, PauseCircle, Languages, ChevronDown,
  Unlink, Loader2, Factory, RotateCcw, Tag, Paperclip, Download, Route,
  PanelLeft, MoreHorizontal, StickyNote, Sparkles, MapPin, Copy, Mail, Globe,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Category, Ticket, TicketStatus, ThreadMessage, TraceStep } from './console/types'
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
      { v: 'ailog', Ic: Zap, label: 'Automation log' },
    ],
  },
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
const RANGES = ['7d', '30d', '90d'] as const
type Range = typeof RANGES[number]
const OV: Record<Range, {
  volume: [string, number][]; resolved: string; autoRate: string; avgReply: string
  lanes: [string, number][]; cats: [string, number][]; langs: [string, number][]
  stores: [string, number, string, string, string][]
}> = {
  '7d': {
    volume: [['Mon', 62], ['Tue', 78], ['Wed', 54], ['Thu', 88], ['Fri', 100], ['Sat', 46], ['Sun', 58]],
    resolved: '148', autoRate: '64%', avgReply: '38m',
    lanes: [['Shipping / WISMO', 84], ['Order changes', 71], ['Returns & refunds', 0], ['General', 0]],
    cats: [['Shipping', 61], ['Returns & refunds', 24], ['Order changes', 18], ['Product questions', 15], ['Damaged', 9], ['Payment', 4]],
    langs: [['EN', 58], ['DE', 16], ['FR', 12], ['IT', 8], ['ES', 6]],
    stores: [['AURORA', 4, '86', '71%', '31m'], ['Harbor Goods', 1, '39', '58%', '44m'], ['Northbound', 1, '23', '52%', '52m']],
  },
  '30d': {
    volume: [['W1', 68], ['W2', 82], ['W3', 74], ['W4', 100], ['W5', 61], ['W6', 70], ['W7', 77]],
    resolved: '612', autoRate: '61%', avgReply: '42m',
    lanes: [['Shipping / WISMO', 81], ['Order changes', 66], ['Returns & refunds', 0], ['General', 0]],
    cats: [['Shipping', 244], ['Returns & refunds', 108], ['Order changes', 84], ['Product questions', 66], ['Damaged', 41], ['Payment', 22]],
    langs: [['EN', 55], ['DE', 17], ['FR', 13], ['IT', 9], ['ES', 6]],
    stores: [['AURORA', 4, '358', '68%', '35m'], ['Harbor Goods', 1, '160', '55%', '48m'], ['Northbound', 1, '94', '49%', '58m']],
  },
  '90d': {
    volume: [['Apr', 71], ['May', 88], ['Jun', 100], ['Jul', 42], ['', 0], ['', 0], ['', 0]].filter(x => x[0] !== '') as [string, number][],
    resolved: '1,742', autoRate: '57%', avgReply: '47m',
    lanes: [['Shipping / WISMO', 76], ['Order changes', 58], ['Returns & refunds', 0], ['General', 0]],
    cats: [['Shipping', 689], ['Returns & refunds', 312], ['Order changes', 240], ['Product questions', 198], ['Damaged', 119], ['Payment', 66]],
    langs: [['EN', 54], ['DE', 18], ['FR', 13], ['IT', 9], ['ES', 6]],
    stores: [['AURORA', 4, '1,014', '63%', '39m'], ['Harbor Goods', 1, '455', '51%', '53m'], ['Northbound', 1, '273', '46%', '64m']],
  },
}

function Overview({ shopId }: { shopId: string }) {
  useStore()
  const [range, setRange] = useState<Range>('7d')
  const d = OV[range]
  const counts = api.getCounts(shopId)
  const KPIS = [
    { label: 'Open tickets', v: String(counts.open), sub: shopId === 'all' ? 'across 3 stores' : 'this store' },
    { label: 'Resolved', v: d.resolved, sub: 'in range · demo' },
    { label: 'Auto-send rate', v: d.autoRate, sub: 'of resolved, no human touch' },
    { label: 'Avg first reply', v: d.avgReply, sub: 'inbound to first response' },
    { label: 'Queued to auto-send', v: String(counts.queued), sub: '3-min cancel window' },
    { label: 'Escalated', v: String(counts.escalated), sub: 'dispute or legal language' },
  ]
  const BACKLOG = [['<4h', 4], ['4-24h', 1], ['1-3d', 1], ['3d+', 0]] as const
  const HEALTH = [
    ['Gmail connection', 'Connected · support@aurora.com'],
    ['Shopify sync', '3 stores · read-only scopes'],
    ['Tracking provider', 'Live · 14 carriers'],
    ['Drafting queue', 'Idle · 0 waiting'],
  ]
  const maxCat = d.cats[0][1]
  return (
    <div className="c-page">
      <header className="c-page-h">
        <div><h1>Overview</h1><p>Demo data</p></div>
        <div className="c-seg">
          {RANGES.map((r) => (
            <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{r === '7d' ? 'Last 7 days' : r === '30d' ? '30 days' : '90 days'}</button>
          ))}
        </div>
      </header>
      <div className="c-kpis six">
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
          <div className="c-card-h">Ticket volume</div>
          <div className="c-bars">
            {d.volume.map(([lb, pct]) => (
              <div className="col" key={lb}>
                <div className="vwrap"><i style={{ height: pct + '%' }} /></div>
                <span>{lb}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="c-card">
          <div className="c-card-h">Auto-send rate by lane</div>
          <div className="c-rows">
            {d.lanes.map(([name, pct]) => (
              <div className="c-lane-row wide" key={name}>
                <span className="nm">{name}</span>
                <span className="bar"><i style={{ width: Math.max(pct, 2) + '%', background: pct > 0 ? '#3D7A50' : 'var(--tx-faint)' }} /></span>
                <span className="pct">{pct > 0 ? pct + '%' : 'human'}</span>
              </div>
            ))}
          </div>
          <div className="c-card-h" style={{ marginTop: 24 }}>Backlog by age</div>
          <div className="c-rows">
            {BACKLOG.map(([b, n]) => (
              <div className="c-lane-row" key={b}>
                <span className="nm">{b}</span>
                <span className="bar"><i style={{ width: (n / 6) * 100 + '%' }} /></span>
                <span className="pct">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="c-grid2">
        <div className="c-card">
          <div className="c-card-h">Top categories</div>
          <div className="c-rows">
            {d.cats.map(([name, n]) => (
              <div className="c-lane-row wide" key={name}>
                <span className="nm">{name}</span>
                <span className="bar"><i style={{ width: (n / maxCat) * 100 + '%' }} /></span>
                <span className="pct">{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="c-card">
          <div className="c-card-h">Customer languages</div>
          <div className="c-langs">
            {d.langs.map(([lg, pct]) => (
              <div className="c-lang" key={lg}><b>{lg}</b><span>{pct}%</span></div>
            ))}
          </div>
          <p className="c-note">Every non-English conversation is mirrored in English for review.</p>
          <div className="c-card-h" style={{ marginTop: 22 }}>System health</div>
          <div className="c-rows">
            {HEALTH.map(([k, v]) => (
              <div className="c-kv" key={k}><span>{k}</span><b><Check size={13} /> {v}</b></div>
            ))}
          </div>
        </div>
      </div>
      <div className="c-card">
        <div className="c-card-h">Automation readiness</div>
        <div className="c-rows">
          {api.LANE_STATS.map((st) => {
            const ready = api.laneReadiness(st) === 'ready'
            const live = st.lane === 'Shipping / WISMO' || st.lane === 'Order changes'
            return (
              <div className="c-ev" key={st.lane}>
                <span className={'ic ' + (live ? 'send' : ready ? 'ok' : '')}>{live ? <Zap size={12} /> : ready ? <Check size={13} /> : <Clock size={12} />}</span>
                <span className="t">
                  <b>{st.lane}</b>, {st.reviewed} drafts reviewed, {Math.round(st.cleanRate * 100)}% sent unedited
                </span>
                <span className={'c-chip ' + (live ? 'green' : ready ? 'ink' : 'mut')}>{live ? 'Live' : ready ? 'Ready to go live' : `${Math.max(0, st.needed - st.reviewed)} more to qualify`}</span>
              </div>
            )
          })}
        </div>
        <p className="c-note">Best practice: keep a lane on Draft only until 25+ drafts were reviewed and 85%+ shipped unedited, then turn on auto-send. Highest-volume lanes first.</p>
      </div>
      <div className="c-card">
        <div className="c-card-h">By store</div>
        <table className="c-table">
          <thead><tr><th>Store</th><th>Open</th><th>Resolved</th><th>Auto-send</th><th>Avg first reply</th></tr></thead>
          <tbody>
            {d.stores.map(([nm, open, res, auto, fr]) => (
              <tr key={nm}><td><b>{nm}</b></td><td>{open}</td><td>{res}</td><td>{auto}</td><td>{fr}</td></tr>
            ))}
          </tbody>
        </table>
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
/* Status lives in the conversation header, Gorgias-style: a chip with a
   colored state dot, right next to the chat, not buried in the side rail. */
const STATUS_DOT: Record<TicketStatus, string> = {
  OPEN: '#3D7A50', WAITING_CUSTOMER: '#9A9C9F', WAITING_SUPPLIER: '#9A9C9F',
  RESOLVED: '#9A9C9F', REPLACEMENT_SENT: '#16181C', ESCALATED: '#B4472F',
}
function StatusDropdown({ t }: { t: Ticket }) {
  const [open, setOpen] = useState(false)
  useOutsideClose(open, () => setOpen(false))
  return (
    <div className="c-status-wrap" onClick={(e) => e.stopPropagation()}>
      <button className="c-chip-btn c-statuschip" onClick={() => setOpen(!open)} aria-label="Ticket status">
        <span className="dot" style={{ background: STATUS_DOT[t.status] }} />
        {STATUS_LABEL[t.status]} <ChevronDown size={13} />
      </button>
      {open && (
        <div className="c-menu">
          {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((st) => (
            <button key={st} className={st === t.status ? 'on' : ''} onClick={() => { api.patchStatus(t.id, st); setOpen(false) }}>
              <span className="mi"><span className="dot" style={{ background: STATUS_DOT[st] }} /> {STATUS_LABEL[st]}</span>
              {st === t.status && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* Message bubble: ENGLISH-FIRST (like production TicketThread) — the English
   translation is the primary text; the native original expands on demand. */
function Bubble({ m, lang }: { m: ThreadMessage; lang: string }) {
  const [showOrig, setShowOrig] = useState(false)
  const en = m.body_english ?? m.body
  const bilingual = !!m.body_english && m.body_english !== m.body
  return (
    <div className={'c-msg' + (m.is_customer ? '' : ' me')}>
      <div className={'bubble' + (!m.is_customer && m.auto_sent ? ' ai' : '')}>
        <span className="from">
          {m.is_customer ? (m.from_name ?? m.from) : m.auto_sent ? 'AI auto-reply' : 'You'}
          {!m.is_customer && m.auto_sent && <span className="aichip">AI</span>}
        </span>
        {en}
        {m.attachments && m.attachments.length > 0 && (
          <div className="atts">
            {m.attachments.map((a) => (
              <span className="att" key={a.filename}><Paperclip size={11} /> {a.filename}<i>{a.size}</i></span>
            ))}
          </div>
        )}
        <span className="bfoot">
          <span className="at">{timeAgo(m.date)} ago</span>
          {bilingual && (
            <button className="orig" onClick={() => setShowOrig(!showOrig)} aria-expanded={showOrig}>
              <Languages size={10} /> {showOrig ? 'Hide original' : `${m.is_customer ? 'Original' : 'Sent'} · ${lang.toUpperCase()}`}
            </button>
          )}
        </span>
        {showOrig && <span className="native">{m.body}</span>}
      </div>
    </div>
  )
}

/* Decision-trace step list; the toggle lives on the composer's single
   bottom bar, expanded content renders full-width below it. */
function TraceList({ steps }: { steps: TraceStep[] }) {
  return (
    <div className="tr-list">
      {steps.map((x) => (
        <div className={'tr-step' + (x.ok ? '' : ' flag')} key={x.step}>
          <span className="ic">{x.ok ? <Check size={11} strokeWidth={2.6} /> : <ShieldCheck size={11} strokeWidth={2.4} />}</span>
          <span className="tx"><b>{x.step}</b> — {x.detail}</span>
          {x.ms != null && <span className="ms">{x.ms}ms</span>}
        </div>
      ))}
    </div>
  )
}

/* Docked composer (Gorgias-pattern): Reply and Internal note live in one
   surface pinned under the thread. The reply tab IS the AI draft — click the
   text to edit it. Countdown and cooldown are quiet text, not pill clusters. */
function Composer({ t }: { t: Ticket }) {
  const [tab, setTab] = useState<'reply' | 'note'>('reply')
  const [editing, setEditing] = useState(false)
  const [editBody, setEditBody] = useState('')
  const [busy, setBusy] = useState<'' | 'send' | 'regen'>('')
  const [cooldownAt, setCooldownAt] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [expand, setExpand] = useState<'' | 'native' | 'trace'>('')
  const [, setTick] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => { setTab('reply'); setEditing(false); setBusy(''); setNote(''); setExpand('') }, [t.id])
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000)
    return () => clearInterval(id)
  }, [])
  const draftEN = t.draft_body_english ?? t.draft_body
  // Clicking anywhere outside the composer minimizes open text boxes again:
  // an empty note tab folds back to Reply, an unchanged draft edit closes.
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        if (tab === 'note' && !note.trim()) setTab('reply')
        if (editing && editBody === (draftEN ?? '')) setEditing(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [tab, note, editing, editBody, draftEN])
  const cooldownLeft = Math.max(0, 180 - Math.floor((Date.now() - (cooldownAt[t.id] ?? -1e12)) / 1000))
  const onCooldown = cooldownAt[t.id] != null && cooldownLeft > 0
  const held = t.status === 'ESCALATED'
  const autoMs = t.auto_send_queued_at ? new Date(t.auto_send_queued_at).getTime() - Date.now() : 0
  const mm = Math.floor(autoMs / 60000)
  const ss = String(Math.max(0, Math.floor((autoMs % 60000) / 1000))).padStart(2, '0')
  const doSend = async () => {
    setBusy('send')
    await api.postSend(t.id, editing ? editBody : (t.draft_body ?? ''))
    setCooldownAt((c) => ({ ...c, [t.id]: Date.now() }))
    setEditing(false)
    setBusy('')
  }
  const doRegen = async () => { setBusy('regen'); await api.postRegenerate(t.id); setBusy('') }
  const saveNote = () => { if (note.trim()) { api.addNote(t.id, note.trim()); setNote(''); setTab('reply') } }
  return (
    <div className="c-composer" ref={rootRef}>
      <div className="c-tabs" role="tablist">
        <button className={tab === 'reply' ? 'on' : ''} onClick={() => setTab('reply')} role="tab" aria-selected={tab === 'reply'}><Send size={11} /> Reply</button>
        <button className={'note' + (tab === 'note' ? ' on' : '')} onClick={() => setTab('note')} role="tab" aria-selected={tab === 'note'}><StickyNote size={11} /> Internal note</button>
        <span className="sp" />
        {tab === 'reply' && t.draft_body && <span className="meta">drafted {timeAgo(t.draft_generated_at!)} ago</span>}
      </div>
      {tab === 'reply' ? (
        t.draft_body ? (
          <>
            <div className="c-toline">
              <span className="k">To</span>
              <span className="v">{t.customer_name ?? t.customer_email} ({t.customer_email})</span>
              {held && <span className="held"><ShieldCheck size={11} /> Held for you · never auto-sent</span>}
            </div>
            {editing ? (
              <textarea
                className="c-edit" value={editBody} rows={6} autoFocus
                onChange={(e) => setEditBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false) }}
              />
            ) : (
              <p className="body editable" title="Click to edit" onClick={() => { setEditing(true); setEditBody(draftEN ?? '') }}>{draftEN}</p>
            )}
            {/* ONE bottom bar: toggles + countdown left, send right.
                Expanded panels open full-width underneath. */}
            <div className="c-cbar">
              {t.draft_body_english && !editing && (
                <button className={'c-bartoggle' + (expand === 'native' ? ' on' : '')} onClick={() => setExpand(expand === 'native' ? '' : 'native')} aria-expanded={expand === 'native'}>
                  <Languages size={11} /> Sends in {t.customer_language.toUpperCase()} <ChevronDown size={11} className={expand === 'native' ? 'r' : ''} />
                </button>
              )}
              {t.trace && (
                <button className={'c-bartoggle' + (expand === 'trace' ? ' on' : '')} onClick={() => setExpand(expand === 'trace' ? '' : 'trace')} aria-expanded={expand === 'trace'}>
                  <Route size={11} /> {t.trace.length} checks{t.trace.filter((x) => !x.ok).length > 0 ? ` · ${t.trace.filter((x) => !x.ok).length} flag` : ''} <ChevronDown size={11} className={expand === 'trace' ? 'r' : ''} />
                </button>
              )}
              {!held && t.auto_send_queued_at && autoMs > 0 && (
                <span className="c-autosend"><Clock size={12} /> Auto-sends in {mm}:{ss} · <button onClick={() => api.cancelAutoSend(t.id)}>Cancel</button></span>
              )}
              {onCooldown && <span className="c-autosend mut"><Clock size={12} /> Sent · {cooldownLeft}s cooldown</span>}
              <span className="sp" />
              {editing && <button className="c-act" onClick={() => setEditing(false)}>Discard edits</button>}
              {!onCooldown && (
                <button className="c-act prim" disabled={busy !== ''} onClick={doSend}>
                  {busy === 'send' ? <Loader2 size={14} className="c-spin" /> : <Send size={14} />} {editing ? 'Send edited' : held ? 'Send reply' : 'Approve & send'}
                </button>
              )}
            </div>
            {expand === 'native' && !editing && <p className="c-native-p">{t.draft_body}</p>}
            {expand === 'trace' && t.trace && <TraceList steps={t.trace} />}
          </>
        ) : (
          <div className="c-cfoot" style={{ marginTop: 6 }}>
            <span className="c-autosend mut">{t.status === 'RESOLVED' ? 'Resolved · no reply needed' : 'No draft yet'}</span>
            <span className="sp" />
            {t.status !== 'RESOLVED' && (
              <button className="c-act" disabled={busy !== ''} onClick={doRegen}>
                {busy === 'regen' ? <Loader2 size={14} className="c-spin" /> : <Zap size={14} />} Generate draft
              </button>
            )}
          </div>
        )
      ) : (
        <>
          <textarea
            className="c-notearea" rows={3} autoFocus value={note}
            placeholder="Context for your team — never sent to the customer…"
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote() }
              if (e.key === 'Escape') setTab('reply')
            }}
          />
          <div className="c-cfoot">
            <span className="c-autosend mut"><StickyNote size={12} /> Only your team sees this</span>
            <span className="sp" />
            <button className="c-act" onClick={() => setTab('reply')}>Cancel</button>
            <button className="c-act prim" disabled={!note.trim()} onClick={saveNote}>Save note</button>
          </div>
        </>
      )}
    </div>
  )
}

/* Gorgias-pattern control: distill the thread into an AI internal note.
   Rendered as an explicit bordered button on a hairline strip that sits at
   the very bottom of the thread, directly above the drafting space. */
function SummarizePill({ t }: { t: Ticket }) {
  const [busy, setBusy] = useState(false)
  const hasSummary = (t.notes ?? []).some((n) => n.ai)
  if (t.messages.length < 2 || hasSummary) return null
  return (
    <div className="c-sumline">
      <button className="c-sum-pill" disabled={busy} onClick={async () => { setBusy(true); await api.summarizeThread(t.id); setBusy(false) }}>
        {busy ? <Loader2 size={12} className="c-spin" /> : <Sparkles size={12} />} Summarize {t.messages.length} messages as a note
      </button>
    </div>
  )
}

function MoreMenu({ t }: { t: Ticket }) {
  const [open, setOpen] = useState(false)
  useOutsideClose(open, () => setOpen(false))
  return (
    <div className="c-status-wrap" onClick={(e) => e.stopPropagation()}>
      <button className="c-chip-btn ic" onClick={() => setOpen(!open)} title="More actions">
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="c-menu">
          {!t.supplier_status && (
            <button onClick={() => { api.postSupplier(t.id, 'Stock / reshipment check'); setOpen(false) }}>
              <span className="mi"><Factory size={13} /> Ask supplier</span>
            </button>
          )}
          <button onClick={() => { api.exportPdf(t.id); setOpen(false) }}>
            <span className="mi"><Download size={13} /> Export PDF</span>
          </button>
          <button onClick={() => { api.deleteTicket(t.id); setOpen(false) }}>
            <span className="mi"><Trash2 size={13} /> Move to Bin</span>
            <small>restorable</small>
          </button>
        </div>
      )}
    </div>
  )
}

let PENDING_OPEN: string | null = null
function openTicketById(id: string) { PENDING_OPEN = id }

function TicketsView({ shopId }: { shopId: string }) {
  useStore()
  const [sel, setSel] = useState(() => { const pnd = PENDING_OPEN; PENDING_OPEN = null; return pnd ?? 't-4471' })
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All')
  const [q, setQ] = useState('')

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
  if (!t) return <div className="c-page"><p>No tickets.</p></div>

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
            <StatusDropdown t={t} />
            <CategoryDropdown t={t} />
            <button className={'c-aiswitch' + (t.ai_disabled ? ' off' : '')} onClick={() => api.postAiToggle(t.id)} title={t.ai_disabled ? 'AI is off for this ticket: no drafting, no auto-send. Click to re-enable.' : 'AI is drafting on this ticket. Click to take over by hand.'}>
              <Zap size={12} /> AI <span className="sw"><i /></span>
            </button>
            <MoreMenu t={t} />
          </div>
        </header>

        <div className="c-thread">
          {t.is_deleted && (
            <div className="c-risk mut"><Trash2 size={14} /> This conversation is in the Bin. It will be permanently removed after 30 days.
              <button className="c-act" style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: 11.5 }} onClick={() => api.restoreTicket(t.id)}><RotateCcw size={12} /> Restore</button>
            </div>
          )}
          {t.status === 'ESCALATED' && <div className="c-risk"><ShieldCheck size={14} /> Dispute language detected, pulled from every automated lane, routed to a human.</div>}
          {t.ai_disabled && <div className="c-risk mut"><PauseCircle size={14} /> AI is disabled for this ticket, no drafting, no auto-send, until re-enabled.</div>}
          {t.supplier_status === 'REQUESTED' && (
            <div className="c-risk mut"><Factory size={14} /> Waiting on supplier, {t.supplier_request_type} · sent by email. Auto-reminder if no reply in 48h.</div>
          )}
          {t.messages.map((m) => <Bubble m={m} lang={t.customer_language} key={m.id} />)}
          {(t.notes ?? []).map((n) => (
            <div className={'c-note' + (n.ai ? ' ai' : '')} key={n.id}>
              <span className="nh">
                {n.ai ? <Sparkles size={12} /> : <StickyNote size={12} />}
                <b>{n.ai ? 'Resolver AI' : n.author}</b> · Internal note{n.ai ? ' · summary' : ''}
                <span className="at">{timeAgo(n.at)} ago</span>
              </span>
              {n.body}
            </div>
          ))}
          <SummarizePill t={t} />
        </div>
        <Composer t={t} />
      </main>

      <aside className="c-ctx2">
        <div className="sec">
          <div className="h">Order match</div>
          <div className="card">
            <div className="c-kv"><span>Reason</span><b>{t.order_match_reason}</b></div>
            <div className="c-kv"><span>Confidence</span><b className={t.order_match_confidence >= 0.9 ? 'green' : t.order_match_confidence > 0 ? '' : 'red'}>{t.order_match_confidence > 0 ? Math.round(t.order_match_confidence * 100) + '%' : 'No match'}</b></div>
            {t.order_id && (
              <div className="links">
                <a className="link" onClick={() => api.unlinkOrder(t.id)}><Unlink size={12} /> Wrong order? Unlink</a>
              </div>
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
                {t.order_snapshot.payment_gateways[0] && (
                  <div className="c-kv"><span>Method</span><b>
                    {({ shopify_payments: 'Shopify Payments', paypal: 'PayPal', klarna: 'Klarna' } as Record<string, string>)[t.order_snapshot.payment_gateways[0]] ?? t.order_snapshot.payment_gateways[0]}
                    {['paypal', 'klarna'].includes(t.order_snapshot.payment_gateways[0]) && <span className="c-gwflag">dispute-prone</span>}
                  </b></div>
                )}
                <div className="c-kv"><span>Fulfillment</span><b>{t.order_snapshot.fulfillment_status}</b></div>
                <div className="c-kv"><span>Total</span><b>{t.order_snapshot.currency === 'EUR' ? '€' : '$'}{t.order_snapshot.total_price}</b></div>
                <div className="c-kv"><span>Ships to</span><b>{t.order_snapshot.shipping_country}</b></div>
                <div className="links">
                  <a className="link"><ArrowUpRight size={12} /> Open in Shopify</a>
                </div>
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
                  <div className="c-kv"><span>Source</span><b>17TRACK push · demo</b></div>
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
            <div className="c-lrow" key={t.id}>
              <span className="top"><b>{t.subject}</b><span className="time">{timeAgo(t.last_customer_message_at)} ago</span></span>
              <span className="sub">{t.customer_name ?? t.customer_email} · {CATEGORY_LABEL[t.category]} · {t.shop_id}</span>
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
            <div className="c-lrow" key={i}>
              <span className="top"><b>{a}</b><span className="time">{c}</span></span>
              <span className="sub">{b}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const COMPOSE_ORDERS = [
  { name: '#1042', who: 'Maria Lopez', item: 'Aurora Linen Set, Sand' },
  { name: '#2090', who: 'James Carter', item: 'Harbor Robe, M' },
  { name: '#2061', who: 'Sofia Rossi', item: 'Aurora Linen Set, Clay' },
  { name: '#2103', who: 'Chloé Martin', item: 'Aurora Linen Set, Sand x2' },
]
const COMPOSE_TEMPLATES = [
  { id: 'address', label: 'Address issue', desc: 'Ask for a correct or complete shipping address', icon: MapPin, intent: 'we could not validate the shipping address on this order and need a corrected, complete address to deliver it' },
  { id: 'delay', label: 'Shipping delay', desc: 'Apologize for the delay and share an ETA', icon: Clock, intent: 'we are sorry about the delay on this order, it is moving again and we will share the updated delivery estimate' },
  { id: 'replacement', label: 'Replacement', desc: 'Confirm details to ship a replacement', icon: RotateCcw, intent: 'we are preparing a replacement shipment and want to confirm the item and address before it goes out' },
  { id: 'custom', label: 'Custom message', desc: 'Write your own intent, Resolver drafts it', icon: Pencil, intent: '' },
] as const
type ComposeTemplateId = typeof COMPOSE_TEMPLATES[number]['id']

/* Compose, rebuilt on the ComeDown Support pattern: find the order first,
   pick what kind of message this is, review the AI draft, send. */
function Compose() {
  const [stage, setStage] = useState<'search' | 'template' | 'review' | 'sent'>('search')
  const [from, setFrom] = useState('support@aurora.com')
  const [orderQ, setOrderQ] = useState('')
  const [order, setOrder] = useState<typeof COMPOSE_ORDERS[0] | null>(null)
  const [tmpl, setTmpl] = useState<ComposeTemplateId | null>(null)
  const [intent, setIntent] = useState('')
  const [lang, setLang] = useState('English')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState<'' | 'drafting' | 'sending'>('')
  const matches = COMPOSE_ORDERS.filter((o) => !orderQ.trim() || (o.name + o.who + o.item).toLowerCase().includes(orderQ.toLowerCase()))
  const recipient = order ? order.who.toLowerCase().replace(' ', '.') + '@email.com' : 'customer@email.com'
  const doDraft = async (id: ComposeTemplateId) => {
    const base = COMPOSE_TEMPLATES.find((x) => x.id === id)!
    const text = id === 'custom' ? intent : base.intent
    if (!text.trim()) return
    setBusy('drafting')
    const d = await api.composeDraft(text, lang, order?.name ?? null)
    setDraft(d)
    setBusy('')
    setStage('review')
  }
  const doSend = async () => {
    setBusy('sending')
    await api.sendCompose(from, recipient, order ? 'About your order ' + order.name : 'From ' + from)
    setBusy('')
    setStage('sent')
  }
  const reset = () => { setStage('search'); setOrder(null); setOrderQ(''); setTmpl(null); setIntent(''); setDraft('') }
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Compose</h1><p>Find the order, pick the message, review the draft, send.</p></div></header>

      {stage === 'search' && (
        <div className="c-card c-compose2">
          <div className="c-cp-row">
            <label className="grow">Sending from
              <select value={from} onChange={(e) => setFrom(e.target.value)}>
                <option>support@aurora.com</option><option>hello@harborgoods.com</option><option>care@northbound.co</option>
              </select>
            </label>
          </div>
          <label>Find the order
            <span className="c-cp-search"><Search size={14} /><input autoFocus placeholder="Order number, customer name, product…" value={orderQ} onChange={(e) => setOrderQ(e.target.value)} /></span>
          </label>
          <div className="c-cp-orders">
            {matches.map((o) => (
              <button key={o.name} onClick={() => { setOrder(o); setStage('template') }}>
                <Package size={14} />
                <span className="o"><b>{o.name}</b> · {o.who}</span>
                <span className="i">{o.item}</span>
                <ChevronDown size={13} style={{ transform: 'rotate(-90deg)' }} />
              </button>
            ))}
            {matches.length === 0 && <p className="c-note" style={{ margin: '6px 0 0' }}>No orders match. Demo data covers 4 recent orders.</p>}
          </div>
          <button className="c-cp-skip" onClick={() => { setOrder(null); setStage('template') }}>Continue without an order</button>
        </div>
      )}

      {stage === 'template' && (
        <div className="c-card c-compose2">
          <div className="c-cp-row">
            {order ? (
              <span className="c-orderchip"><Package size={13} /> {order.name} · {order.who} · {order.item}
                <button onClick={() => setStage('search')} aria-label="change order"><X size={12} /></button>
              </span>
            ) : (
              <button className="c-cp-skip" style={{ margin: 0 }} onClick={() => setStage('search')}>No order attached · find one</button>
            )}
            <span className="sp" />
            <label className="inline">Language
              <select value={lang} onChange={(e) => setLang(e.target.value)}>
                <option>English</option><option>French</option><option>German</option><option>Italian</option><option>Spanish</option>
              </select>
            </label>
          </div>
          <div className="c-tmplgrid">
            {COMPOSE_TEMPLATES.map((x) => (
              <button key={x.id} className={'c-tmplcard' + (tmpl === x.id ? ' on' : '')} onClick={() => { setTmpl(x.id); if (x.id !== 'custom') void doDraft(x.id) }}>
                <span className="ic"><x.icon size={15} /></span>
                <b>{x.label}</b>
                <span className="d">{x.desc}</span>
              </button>
            ))}
          </div>
          {tmpl === 'custom' && (
            <>
              <label>What do you need to say?
                <textarea rows={3} autoFocus placeholder="e.g. the replacement ships Monday and we added a 10% discount code SORRY10" value={intent} onChange={(e) => setIntent(e.target.value)} />
              </label>
              <div className="row">
                <button className="c-act prim" disabled={!intent.trim() || busy === 'drafting'} onClick={() => void doDraft('custom')}>
                  {busy === 'drafting' ? <Loader2 size={14} className="c-spin" /> : <Sparkles size={14} />} Draft with AI
                </button>
              </div>
            </>
          )}
          {busy === 'drafting' && tmpl !== 'custom' && <p className="c-note" style={{ margin: 0 }}><Loader2 size={13} className="c-spin" /> Writing the draft…</p>}
        </div>
      )}

      {stage === 'review' && (
        <div className="c-card c-compose2">
          <div className="c-cp-row meta">
            <span className="k">To</span><span className="v">{order ? order.who : 'Customer'} ({recipient})</span>
            <span className="sp" />
            {order && <span className="c-chip ink">{order.name}</span>}
            <span className="c-chip mut"><Languages size={11} /> {lang}</span>
          </div>
          <p className="body editable" title="Click to edit" style={{ fontSize: 13.5, lineHeight: 1.65, cursor: 'text' }}
            contentEditable suppressContentEditableWarning
            onBlur={(e) => setDraft(e.currentTarget.textContent ?? draft)}
          >{draft}</p>
          <div className="c-cfoot" style={{ marginTop: 14 }}>
            <button className="c-act" onClick={() => setStage('template')}>Back</button>
            <span className="sp" />
            <button className="c-act prim" disabled={busy === 'sending'} onClick={doSend}>
              {busy === 'sending' ? <Loader2 size={14} className="c-spin" /> : <Send size={14} />} Send
            </button>
          </div>
        </div>
      )}

      {stage === 'sent' && (
        <div className="c-card c-compose2 sent">
          <span className="ok"><Check size={18} strokeWidth={2.6} /></span>
          <b>Sent to {order ? order.who : 'the customer'}</b>
          <p className="c-note" style={{ margin: 0 }}>Delivered from {from}. It will appear in Sent.</p>
          <button className="c-act" onClick={reset}>Compose another</button>
        </div>
      )}
    </div>
  )
}

function ChargebacksView() {
  useStore()
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const rows = api.CHARGEBACKS
  const needs = rows.filter((c) => c.status === 'needs_response')
  const atRisk = needs.reduce((a, c) => a + parseFloat(c.amount), 0)
  const decided = rows.filter((c) => c.status === 'won' || c.status === 'lost')
  const winRate = decided.length ? Math.round((decided.filter((c) => c.status === 'won').length / decided.length) * 100) : 0
  const dueIn = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
  const STATUS: Record<api.Chargeback['status'], [string, string]> = {
    needs_response: ['Needs response', 'red'], under_review: ['Under review', 'mut'], won: ['Won', 'green'], lost: ['Lost', 'mut'],
  }
  const GW: Record<string, string> = { shopify_payments: 'Shopify Payments', paypal: 'PayPal', klarna: 'Klarna' }
  const submit = async (id: string) => { setBusy(id); await api.submitChargeback(id); setBusy(''); setOpen(null) }
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Chargebacks</h1><p>Every dispute, its deadline, and the evidence to fight it · demo data</p></div></header>
      <div className="c-kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="c-kpi"><span className="n">{needs.length}</span><span className="l">need a response</span></div>
        <div className="c-kpi"><span className="n">${atRisk.toFixed(2)}</span><span className="l">at risk right now</span></div>
        <div className="c-kpi"><span className="n">{winRate}%</span><span className="l">win rate, decided disputes</span></div>
      </div>
      <div className="c-card">
        <table className="c-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Store</th><th>Amount</th><th>Method</th><th>Reason</th><th>Evidence due</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.map((c) => {
              const d = dueIn(c.evidence_due)
              const [label, tone] = STATUS[c.status]
              return (
                <tr key={c.id}>
                  <td><b>{c.order_name}</b></td>
                  <td>{c.customer}</td>
                  <td>{c.shop_id}</td>
                  <td>${c.amount}</td>
                  <td>{GW[c.gateway] ?? c.gateway}</td>
                  <td>{c.reason}</td>
                  <td>{c.status === 'needs_response' ? <span className={'c-due' + (d <= 3 ? ' hot' : '')}>{d <= 0 ? 'today' : `in ${d} day${d === 1 ? '' : 's'}`}</span> : '·'}</td>
                  <td><span className={'c-chip ' + tone}>{label}</span></td>
                  <td>{c.status === 'needs_response' && (
                    <button className="c-act" style={{ padding: '6px 12px', fontSize: 11.5 }} onClick={() => setOpen(open === c.id ? null : c.id)}>
                      {open === c.id ? 'Close' : 'Build response'}
                    </button>
                  )}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {open && (() => {
          const c = rows.find((x) => x.id === open)!
          const ready = c.evidence.filter((e) => e.ready).length
          return (
            <div className="c-cbdrawer">
              <div className="hd">
                <b>Response for {c.order_name} · {c.reason}</b>
                <span className="sub">{ready} of {c.evidence.length} evidence pieces ready · Resolver assembled these from the order and the conversation</span>
              </div>
              <div className="list">
                {c.evidence.map((e) => (
                  <div className={'ev' + (e.ready ? ' ok' : '')} key={e.label}>
                    <span className="ic">{e.ready ? <Check size={11} strokeWidth={2.8} /> : <Clock size={11} />}</span>
                    {e.label}
                    <span className="st">{e.ready ? 'ready' : 'add manually'}</span>
                  </div>
                ))}
              </div>
              <div className="ft">
                <span className="c-note" style={{ margin: 0 }}>Submitting sends the package to {GW[c.gateway] ?? c.gateway} through Shopify. You cannot edit it after.</span>
                <span className="sp" />
                <button className="c-act prim" disabled={busy === c.id} onClick={() => void submit(c.id)}>
                  {busy === c.id ? <Loader2 size={14} className="c-spin" /> : <ShieldCheck size={14} />} Submit response
                </button>
              </div>
            </div>
          )
        })()}
        <p className="c-note">Chargeback tickets are never auto-replied. The linked conversation is pulled from every automated lane and sits at the top of your queue.</p>
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

function BinView({ onOpen }: { onOpen: (id: string) => void }) {
  useStore()
  const rows = ['t-4471', 't-4468', 't-4462', 't-4455', 't-4449', 't-4440']
    .map((id) => api.getTicket(id))
    .filter((t): t is Ticket => !!t && !!t.is_deleted)
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Bin</h1><p>Nothing here is deleted yet. Open or restore any conversation; items are removed for good after 30 days.</p></div></header>
      <div className="c-card">
        <div className="c-rows">
          {rows.length === 0 && <p className="c-note" style={{ marginTop: 0 }}>Bin is empty.</p>}
          {rows.map((t) => (
            <div className="c-ev c-ev-click" key={t.id} onClick={() => onOpen(t.id)} role="button">
              <span className="t"><b>{t.subject}</b>, {t.customer_name ?? t.customer_email}</span>
              <button className="c-act" onClick={(e) => { e.stopPropagation(); api.restoreTicket(t.id) }}><RotateCcw size={13} /> Restore</button>
              <button className="c-act red" onClick={(e) => { e.stopPropagation(); api.permanentDelete(t.id) }}><Trash2 size={13} /> Delete forever</button>
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
                            <button key={c.id} title={'Move to ' + c.label} onClick={() => api.moveTask(k.id, c.id)}>→ {c.label}</button>
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
const ROLE_PRESETS: Record<string, Record<string, boolean>> = {
  Owner: { approve: true, lanes: true, billing: true, exports: true, del: true, filters: true, invite: true, analytics: true },
  Admin: { approve: true, lanes: true, billing: false, exports: true, del: true, filters: true, invite: true, analytics: true },
  Agent: { approve: true, lanes: false, billing: false, exports: false, del: false, filters: false, invite: false, analytics: false },
}
const PERM_LABELS: [string, string][] = [
  ['approve', 'Approve & send replies'], ['lanes', 'Lane modes & kill switch'],
  ['del', 'Delete tickets to Bin'], ['filters', 'Manage mail filters'],
  ['exports', 'Export conversations'], ['analytics', 'View analytics'],
  ['invite', 'Invite teammates'], ['billing', 'Billing & plan'],
]
const ALL_STORES = ['AURORA', 'Harbor Goods', 'Northbound']
function TeamSettings() {
  const [users, setUsers] = useState([
    { name: 'Nathan', role: 'Owner', stores: [...ALL_STORES], perms: { ...ROLE_PRESETS.Owner } },
    { name: 'Chandan', role: 'Agent', stores: ['AURORA'], perms: { ...ROLE_PRESETS.Agent } },
  ])
  const set = (ui: number, patch: Partial<typeof users[0]>) =>
    setUsers(users.map((x, i) => (i === ui ? { ...x, ...patch } : x)))
  return (
    <div className="c-rows">
      {users.map((u, ui) => (
        <div className="c-teamrow" key={u.name}>
          <div className="hd">
            <b>{u.name}</b>
            <div className="c-seg sm">
              {(['Owner', 'Admin', 'Agent'] as const).map((r) => (
                <button key={r} className={u.role === r ? 'on' : ''} onClick={() => set(ui, { role: r, perms: { ...ROLE_PRESETS[r] } })}>{r}</button>
              ))}
            </div>
            {ui === 0 && <span className="at" style={{ marginLeft: 'auto' }}>you</span>}
          </div>
          <div className="storesel">
            <span className="lbl">Stores</span>
            {ALL_STORES.map((st) => {
              const on = u.stores.includes(st)
              return (
                <button
                  key={st} className={'stchip' + (on ? ' on' : '')}
                  onClick={() => set(ui, { stores: on ? u.stores.filter((x) => x !== st) : [...u.stores, st] })}
                  disabled={u.role === 'Owner'}
                >{on && <Check size={11} strokeWidth={2.6} />}{st}</button>
              )
            })}
            {u.role === 'Owner' && <span className="stores">sees every store</span>}
          </div>
          <div className="perms">
            {PERM_LABELS.map(([k, label]) => (
              <label key={k} className={u.role === 'Owner' ? 'lock' : ''}>
                <input
                  type="checkbox" checked={u.role === 'Owner' ? true : !!u.perms[k]}
                  disabled={u.role === 'Owner'}
                  onChange={() => set(ui, { perms: { ...u.perms, [k]: !u.perms[k] } })}
                /> {label}
              </label>
            ))}
          </div>
        </div>
      ))}
      <button className="c-act" style={{ marginTop: 14, alignSelf: 'flex-start' }}><Plus size={14} /> Invite teammate</button>
      <p className="c-note">Picking a role applies its preset; fine-tune any permission per person. Owners always hold everything.</p>
    </div>
  )
}

function FilterList({ kind, title, hint }: { kind: 'keywords' | 'senders' | 'allow'; title: string; hint: string }) {
  useStore()
  const [v, setV] = useState('')
  const items = api.MAIL_FILTERS[kind]
  return (
    <div className="c-filterblock">
      <div className="hd">{title}</div>
      <p className="c-note" style={{ margin: '2px 0 10px' }}>{hint}</p>
      <div className="chips">
        {items.map((x) => (
          <span className="fchip" key={x}>{x}<button onClick={() => api.removeFilter(kind, x)} aria-label={'remove ' + x}><X size={11} /></button></span>
        ))}
      </div>
      <div className="add">
        <input
          className="c-input" placeholder={'Add to ' + title.toLowerCase() + '…'} value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) { api.addFilter(kind, v); setV('') } }}
        />
        <button className="c-act" onClick={() => { if (v.trim()) { api.addFilter(kind, v); setV('') } }}>Add</button>
      </div>
    </div>
  )
}
function FilterSettings() {
  return (
    <div className="c-rows" style={{ gap: 22 }}>
      <FilterList kind="keywords" title="Blocked keywords" hint="Inbound mail containing these goes to Filtered instead of the inbox." />
      <FilterList kind="senders" title="Blocked senders" hint="Matched against the from address. Prefixes and domains both work." />
      <FilterList kind="allow" title="Always allow" hint="These senders always reach the inbox, whatever the rules above say." />
      <p className="c-note">Filters are per company. Everything filtered stays visible under Inbox, Filtered.</p>
    </div>
  )
}

function NotifSettings() {
  const [n, setN] = useState({ esc: true, fail: true, digest: false, supplier: true })
  const ROWS: [keyof typeof n, string, string][] = [
    ['esc', 'Escalations', 'Email me the moment dispute or legal language is detected'],
    ['fail', 'Auto-send failures', 'Email me when a queued send fails or is cancelled by the system'],
    ['supplier', 'Supplier replies', 'Email me when a supplier answers a request'],
    ['digest', 'Daily digest', 'One morning email: volume, backlog, and anything waiting on you'],
  ]
  return (
    <div className="c-rows">
      {ROWS.map(([k, title, sub]) => (
        <div className="c-notifrow" key={k}>
          <div><b>{title}</b><p>{sub}</p></div>
          <button className={'c-switch green' + (n[k] ? ' on' : '')} onClick={() => setN({ ...n, [k]: !n[k] })} aria-label={title}><span className="k" /></button>
        </div>
      ))}
    </div>
  )
}

type Lanes = typeof LANES_INIT

function SettingsView({ lanes, setLanes, killed, setKilled }: {
  lanes: Lanes; setLanes: (l: Lanes) => void; killed: boolean; setKilled: (b: boolean) => void
}) {
  const [tab, setTab] = useState<'Lanes' | 'Filters' | 'Stores' | 'Policies & SOP' | 'Emails' | 'Team' | 'Notifications' | 'Billing'>('Lanes')
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Settings</h1><p>AURORA · owner access</p></div></header>
      <div className="c-set">
        <nav className="c-set-nav">
          {(['Lanes', 'Filters', 'Stores', 'Policies & SOP', 'Emails', 'Team', 'Notifications', 'Billing'] as const).map((x) => (
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
              {lanes.map((l, i) => {
                const st = api.LANE_STATS.find((x) => x.lane === l.name)
                const ready = st && l.mode !== 'live' && api.laneReadiness(st) === 'ready'
                return (
                  <div className="c-lane-set grad" key={l.name}>
                    <div className="nmwrap">
                      <span className="nm">{l.name}</span>
                      {st && (
                        <span className="gradline">
                          <span className="gbar"><i style={{ width: Math.min(100, (st.reviewed / st.needed) * 100) + '%', background: st.cleanRate >= 0.85 ? '#3D7A50' : 'var(--tx-faint)' }} /></span>
                          <span className="gtxt">{st.reviewed} reviewed · {Math.round(st.cleanRate * 100)}% sent unedited</span>
                        </span>
                      )}
                    </div>
                    <div className="modes">
                      {(['off', 'shadow', 'live'] as const).map((m) => (
                        <button key={m} className={l.mode === m ? 'on' : ''} onClick={() => setLanes(lanes.map((x, j) => (j === i ? { ...x, mode: m } : x)))}>{{ off: 'Off', shadow: 'Draft only', live: 'Auto-send' }[m]}</button>
                      ))}
                    </div>
                    <span className="note">
                      {ready ? (
                        <button className="c-gradbtn" onClick={() => setLanes(lanes.map((x, j) => (j === i ? { ...x, mode: 'live' } : x)))}>
                          <Check size={11} strokeWidth={2.6} /> Ready, turn on auto-send
                        </button>
                      ) : l.mode === 'live' ? (killed ? 'paused by kill switch' : 'sends on its own · 3-min cancel window')
                        : l.mode === 'shadow' ? (st && st.reviewed < st.needed ? `every draft waits for you · ${st.needed - st.reviewed} more reviews to qualify` : 'every draft waits for your approval')
                        : 'no drafting on this lane'}
                    </span>
                  </div>
                )
              })}
              <p className="c-note">A lane qualifies for live after {api.LANE_STATS[0].needed}+ reviewed drafts with 85%+ sent unedited. Chargeback and legal language always routes to a human, regardless of modes.</p>
            </>
          )}
          {tab === 'Stores' && <StoresSettings />}
          {tab === 'Policies & SOP' && <SopSettings />}
          {tab === 'Emails' && <EmailsSettings />}
          {tab === 'Team' && <TeamSettings />}
          {tab === 'Filters' && <FilterSettings />}
          {tab === 'Notifications' && <NotifSettings />}
          {tab === 'Billing' && (
            <div className="c-rows">
              <div className="c-kv"><span>Plan</span><b>Team, $249/mo</b></div>
              <div className="c-kv"><span>Usage this cycle</span><b>1,412 of 2,500 tickets</b></div>
              <div className="c-kv"><span>Stores</span><b>3 of 3</b></div>
              <div className="c-kv"><span>Managed by</span><b>Shopify billing</b></div>
              <a className="link" style={{ marginTop: 10 }} href="https://admin.shopify.com/store/aurora/charges/resolver/pricing_plans" target="_blank" rel="noreferrer">Manage plan in the Shopify admin <ArrowUpRight size={12} /></a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const STORE_ROWS = [
  { name: 'AURORA', domain: 'aurora.com', open: 4, key: 'rsv_live_a7f39c21d8b44e02' },
  { name: 'Harbor Goods', domain: 'harborgoods.com', open: 1, key: 'rsv_live_9k2m1x84qz7w5v0p' },
  { name: 'Northbound', domain: 'northbound.co', open: 1, key: 'rsv_live_p3q8r6t1y4u9i2o5' },
]
function StoresSettings() {
  const [revealed, setRevealed] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (k: string) => {
    void navigator.clipboard?.writeText(k).catch(() => { /* demo */ })
    setCopied(k)
    setTimeout(() => setCopied(null), 1400)
  }
  return (
    <div className="c-rows" style={{ gap: 10 }}>
      {STORE_ROWS.map((st) => (
        <div className="c-storecard" key={st.name}>
          <div className="hd">
            <span className="dot" />
            <b>{st.name}</b>
            <span className="dom">{st.domain}</span>
            <span className="sp" />
            <span className="open">{st.open} open</span>
          </div>
          <div className="keyrow">
            <span className="k">Connection key</span>
            <code>{revealed === st.name ? st.key : st.key.slice(0, 9) + '••••••••••'}</code>
            <button onClick={() => setRevealed(revealed === st.name ? null : st.name)}>{revealed === st.name ? 'Hide' : 'Reveal'}</button>
            <button onClick={() => copy(st.key)}>{copied === st.key ? <Check size={12} /> : <Copy size={12} />} {copied === st.key ? 'Copied' : 'Copy'}</button>
          </div>
          <div className="ft">
            <span>Orders, fulfillments and customers sync read-only.</span>
            <a className="link">Reconnect <ArrowUpRight size={11} /></a>
          </div>
        </div>
      ))}
      <button className="c-act" style={{ marginTop: 6, alignSelf: 'flex-start' }}><Plus size={14} /> Add store</button>
    </div>
  )
}

function EmailsSettings() {
  const [method, setMethod] = useState<'gmail' | 'domain'>('gmail')
  const [verifying, setVerifying] = useState(false)
  return (
    <div className="c-rows" style={{ gap: 12 }}>
      <div className="c-card-h" style={{ marginBottom: 0 }}>How replies are sent</div>
      <div className="c-mailopts">
        <button className={'c-mailopt' + (method === 'gmail' ? ' on' : '')} onClick={() => setMethod('gmail')}>
          <span className="ic"><Mail size={15} /></span>
          <b>Through your Gmail</b>
          <span className="d">Replies send from support@aurora.com via the connected Gmail. Customers see your address, nothing changes for them.</span>
          <span className="st green">Connected · verified</span>
        </button>
        <button className={'c-mailopt' + (method === 'domain' ? ' on' : '')} onClick={() => setMethod('domain')}>
          <span className="ic"><Globe size={15} /></span>
          <b>From your domain, no Gmail needed</b>
          <span className="d">Resolver sends as support@aurora.com through its own sending infrastructure. Add three DNS records once, then retire the Gmail dependency.</span>
          <span className="st">Requires DNS setup</span>
        </button>
      </div>
      {method === 'domain' && (
        <div className="c-dnscard">
          <div className="c-card-h" style={{ marginBottom: 4 }}>DNS records for aurora.com</div>
          {[
            ['CNAME', 'resolver._domainkey', 'dkim.resolver.chat'],
            ['CNAME', 'rsvbounce', 'bounce.resolver.chat'],
            ['TXT', '@', 'v=spf1 include:spf.resolver.chat ~all'],
          ].map(([type, host, val]) => (
            <div className="rec" key={host}>
              <span className="ty">{type}</span>
              <code className="h">{host}</code>
              <code className="v">{val}</code>
            </div>
          ))}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="c-act prim" disabled={verifying} onClick={() => { setVerifying(true); setTimeout(() => setVerifying(false), 1800) }}>
              {verifying ? <Loader2 size={14} className="c-spin" /> : <ShieldCheck size={14} />} {verifying ? 'Checking records…' : 'Verify records'}
            </button>
            <span className="c-note" style={{ margin: 0 }}>DNS can take up to an hour to propagate.</span>
          </div>
        </div>
      )}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <div className="c-kv"><span>Send verification</span><b className="green">Verified</b></div>
        <div className="c-kv"><span>DKIM / SPF</span><b className="green">Verified</b></div>
        <div className="c-kv"><span>Loop protection</span><b>On, auto-replies filtered</b></div>
      </div>
    </div>
  )
}

const SOP_CATEGORIES = ['Refunds & returns', 'Shipping', 'Tone & voice', 'Escalation', 'Other'] as const
/* Per-store rules: every rule Resolver follows for this store, editable in
   place, with an AI assist that turns plain words into a crisp rule. */
function SopSettings() {
  useStore()
  const [shopId, setShopId] = useState('aurora')
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [adding, setAdding] = useState(false)
  const [newText, setNewText] = useState('')
  const [newCat, setNewCat] = useState<typeof SOP_CATEGORIES[number]>('Refunds & returns')
  const [busy, setBusy] = useState<'' | 'polish' | 'save'>('')
  const rules = api.SOP_RULES[shopId] ?? []
  const byCat = SOP_CATEGORIES.map((cat) => ({ cat, items: rules.filter((r) => r.category === cat) })).filter((g) => g.items.length > 0)
  const startEdit = (r: api.SopRule) => { setEditing(r.id); setEditText(r.text) }
  const saveEdit = async () => {
    if (editing && editText.trim()) { await api.updateSopRule(shopId, editing, editText.trim()) }
    setEditing(null)
  }
  const polish = async () => {
    if (!newText.trim()) return
    setBusy('polish')
    setNewText(await api.aiPolishRule(newText))
    setBusy('')
  }
  const addRule = async () => {
    if (!newText.trim()) return
    setBusy('save')
    await api.addSopRule(shopId, newCat, newText.trim())
    setNewText(''); setAdding(false); setBusy('')
  }
  return (
    <div className="c-rows" style={{ gap: 14 }}>
      <div className="c-sopshops">
        {api.SHOPS.filter((x) => x.id !== 'all').map((x) => (
          <button key={x.id} className={shopId === x.id ? 'on' : ''} onClick={() => { setShopId(x.id); setEditing(null); setAdding(false) }}>{x.name}</button>
        ))}
      </div>
      <div className="c-ev" style={{ borderTop: 'none', paddingTop: 0 }}>
        <span className="ic ok"><FileText size={13} /></span>
        <span className="t"><b>support-sop-v3.pdf</b>, uploaded Jun 12 · the source document these rules were extracted from</span>
        <span className="at" style={{ display: 'inline-flex', gap: 10 }}><a className="link">Replace</a><a className="link">Re-extract</a></span>
      </div>
      {byCat.map((g) => (
        <div className="c-sopgroup" key={g.cat}>
          <div className="gh">{g.cat}</div>
          {g.items.map((r) => (
            <div className={'c-soprule' + (r.enabled ? '' : ' off')} key={r.id}>
              <button className={'c-switch sm' + (r.enabled ? ' on green' : '')} onClick={() => void api.toggleSopRule(shopId, r.id)} aria-label="toggle rule"><span className="k" /></button>
              {editing === r.id ? (
                <textarea
                  autoFocus rows={2} value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onBlur={() => void saveEdit()}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void saveEdit() } if (e.key === 'Escape') setEditing(null) }}
                />
              ) : (
                <span className="tx" title="Click to edit" onClick={() => startEdit(r)}>{r.text}</span>
              )}
              <button className="del" title="Delete rule" onClick={() => void api.deleteSopRule(shopId, r.id)}><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
      ))}
      {rules.length === 0 && <p className="c-note" style={{ margin: 0 }}>No rules for this store yet. Add the first one below or upload an SOP document.</p>}
      {!adding ? (
        <button className="c-act" style={{ alignSelf: 'flex-start' }} onClick={() => setAdding(true)}><Plus size={14} /> Add rule</button>
      ) : (
        <div className="c-sopadd">
          <div className="row" style={{ marginBottom: 8 }}>
            <select value={newCat} onChange={(e) => setNewCat(e.target.value as typeof SOP_CATEGORIES[number])}>
              {SOP_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <textarea
            autoFocus rows={2} value={newText}
            placeholder="Describe the policy in plain words, e.g. if the customer ordered the wrong size we exchange it for free once"
            onChange={(e) => setNewText(e.target.value)}
          />
          <div className="row" style={{ marginTop: 8 }}>
            <button className="c-act" disabled={!newText.trim() || busy !== ''} onClick={() => void polish()}>
              {busy === 'polish' ? <Loader2 size={13} className="c-spin" /> : <Sparkles size={13} />} Tighten with AI
            </button>
            <span className="sp" />
            <button className="c-act" onClick={() => { setAdding(false); setNewText('') }}>Cancel</button>
            <button className="c-act prim" disabled={!newText.trim() || busy !== ''} onClick={() => void addRule()}>
              {busy === 'save' ? <Loader2 size={13} className="c-spin" /> : <Check size={13} />} Save rule
            </button>
          </div>
        </div>
      )}
      <p className="c-note" style={{ margin: 0 }}>Every enabled rule constrains every draft for this store. Disabled rules stay here but are ignored.</p>
    </div>
  )
}

/* ---------------------------------------------------------------- shell */
const TOUR: { sel: string; title: string; body: string; place: 'right' | 'bottom' | 'left' | 'top' }[] = [
  { sel: '.c-store', title: 'All your stores, one inbox', body: 'Switch between stores or work across all of them at once. Counts follow.', place: 'right' },
  { sel: '.c-ftabs', title: 'The queue, sliced', body: 'Open, escalated, waiting, resolved. Escalations always float to the top.', place: 'bottom' },
  { sel: '.c-composer', title: 'Drafts, not homework', body: 'Every ticket arrives with a reply already written from the real order. Click the text to edit it, then approve. Notes for your team live in the same place.', place: 'top' },
  { sel: '.c-statuschip', title: 'Status lives with the chat', body: 'Move tickets through open, waiting, resolved right from the header. Escalations happen automatically on risk.', place: 'bottom' },
  { sel: '.c-auto', title: 'Autonomy, on a leash', body: 'This shows which lanes auto-send. The kill switch in Settings stops everything instantly.', place: 'right' },
]
function Tour({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = TOUR[i]
  useEffect(() => {
    const el = document.querySelector(step.sel)
    if (!el) { if (i < TOUR.length - 1) setI(i + 1); else onDone(); return }
    el.scrollIntoView({ block: 'nearest' })
    setRect(el.getBoundingClientRect())
  }, [i, step.sel, onDone])
  if (!rect) return null
  const pos: React.CSSProperties =
    step.place === 'right' ? { left: rect.right + 14, top: Math.max(12, rect.top + rect.height / 2 - 40) } :
    step.place === 'left' ? { right: window.innerWidth - rect.left + 14, top: Math.max(12, rect.top + rect.height / 2 - 40) } :
    step.place === 'bottom' ? { left: Math.min(rect.left, window.innerWidth - 320), top: rect.bottom + 12 } :
    { left: Math.min(rect.left, window.innerWidth - 320), top: rect.top - 12, transform: 'translateY(-100%)' }
  return (
    <>
      <div className="tour-glow" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />
      <div className={'tour-bubble ' + step.place} style={pos}>
        <b>{step.title}</b>
        <p>{step.body}</p>
        <div className="row">
          <span className="n">{i + 1} of {TOUR.length}</span>
          <span className="sp" />
          <button className="skip" onClick={onDone}>Skip tour</button>
          <button className="next" onClick={() => (i < TOUR.length - 1 ? setI(i + 1) : onDone())}>{i < TOUR.length - 1 ? 'Next' : 'Done'}</button>
        </div>
      </div>
    </>
  )
}

export function AppConsole() {
  useStore()
  const [view, setView] = useState<View>('tickets')
  const [collapsed, setCollapsed] = useState(false)
  const [tour, setTour] = useState(false)
  useEffect(() => {
    if (!localStorage.getItem('resolver.tour_done')) {
      const id = setTimeout(() => setTour(true), 900)
      return () => clearTimeout(id)
    }
  }, [])
  const endTour = () => { setTour(false); localStorage.setItem('resolver.tour_done', '1') }
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
    bin: () => <BinView onOpen={(id) => { openTicketById(id); setView('tickets') }} />,
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
    <div className={'console2' + (collapsed ? ' collapsed' : '')}>
      <aside className="c-rail">
        <div className="c-brand">
          <img src={LOGO} alt="" /><span className="bw">resolver.chat</span>
          <button className="c-collapse" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <PanelLeft size={15} />
          </button>
        </div>

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
          <a className={'item c-set-link' + (view === 'settings' ? ' on' : '')} onClick={() => setView('settings')}>
            <Settings size={16} /> <span>Settings</span>
          </a>
          <div className={'c-auto' + (killed ? ' off' : '')}>
            <b>{killed ? 'Auto-send paused' : 'Auto-send active'}</b>
            <p>{killed ? 'Kill switch is on' : `${lanes.filter((l) => l.mode === 'live').length} lanes live · risky tickets always wait`}</p>
          </div>
          <div className="c-me">
            <span className="av">N</span><span>Nathan<small>Owner</small></span>
            <button className="c-tourbtn" title="Replay the welcome tour" onClick={() => { setView('tickets'); setTour(true) }}>?</button>
          </div>
        </div>
      </aside>

      <div className="c-main"><div className="c-view" key={view}>{CONTENT[view]()}</div></div>
      {tour && view === 'tickets' && <Tour onDone={endTour} />}
    </div>
  )
}
