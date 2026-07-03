// Resolver app — full redesign preview at /app, modeled on the REAL app's
// information architecture (repo hF9Z5/rsvlr): nav groups Overview / Inbox
// (Tickets, Resolved, Bin, Filtered) / Outbound (Compose, Sent) / Operations
// (Tasks, Customs, Chargebacks) / Automation log / Users / Settings; 3-pane
// tickets with order-match evidence, EN mirror of native-language drafts,
// the pending-auto-send cancel window, per-lane off/shadow/live modes and
// the kill switch. Monochrome brand: ink + band, semantic green/red only.
// All data is demo-shaped like production data.
import { useEffect, useState } from 'react'
import {
  Inbox, CircleCheck, ListChecks, Settings, Search, Users,
  ChevronsUpDown, Package, Truck, ShieldCheck, Send, Pencil, Trash2,
  RefreshCw, Gavel, Clock, Check, Zap, ArrowUpRight, User, LayoutDashboard,
  Filter, FileText, Landmark, X, Plus, PauseCircle, Languages, ChevronDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const LOGO = '/logo/recolor/oct-black-t.png'

/* ------------------------------------------------------------------ data */
type View =
  | 'overview' | 'tickets' | 'resolved' | 'bin' | 'filtered'
  | 'compose' | 'sent' | 'tasks' | 'customs' | 'chargebacks'
  | 'ailog' | 'users' | 'settings'

const NAV: { group: string; items: { v: View; Ic: LucideIcon; label: string; n?: number }[] }[] = [
  { group: '', items: [{ v: 'overview', Ic: LayoutDashboard, label: 'Overview' }] },
  {
    group: 'Inbox',
    items: [
      { v: 'tickets', Ic: Inbox, label: 'Tickets', n: 12 },
      { v: 'resolved', Ic: CircleCheck, label: 'Resolved' },
      { v: 'bin', Ic: Trash2, label: 'Bin' },
      { v: 'filtered', Ic: Filter, label: 'Filtered' },
    ],
  },
  {
    group: 'Outbound',
    items: [
      { v: 'compose', Ic: Pencil, label: 'Compose' },
      { v: 'sent', Ic: Send, label: 'Sent' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { v: 'tasks', Ic: ListChecks, label: 'Tasks', n: 3 },
      { v: 'customs', Ic: Landmark, label: 'Customs', n: 2 },
      { v: 'chargebacks', Ic: Gavel, label: 'Chargebacks', n: 1 },
    ],
  },
  {
    group: 'Automation',
    items: [{ v: 'ailog', Ic: Zap, label: 'Automation log' }],
  },
  {
    group: '',
    items: [
      { v: 'users', Ic: Users, label: 'Users' },
      { v: 'settings', Ic: Settings, label: 'Settings' },
    ],
  },
]

const STORES = ['All stores', 'AURORA', 'Harbor Goods', 'Northbound']

type TStatus = 'needs' | 'draft' | 'queued' | 'escalated' | 'sent'
const ST: Record<TStatus, { label: string; cls: string }> = {
  needs: { label: 'Needs you', cls: 'ink' },
  draft: { label: 'Draft ready', cls: 'ink' },
  queued: { label: 'Sending soon', cls: 'green' },
  escalated: { label: 'Escalated', cls: 'red' },
  sent: { label: 'Auto-sent', cls: 'mut' },
}

type Ticket = {
  id: string; name: string; initials: string; store: string; lang: string
  status: TStatus; subject: string; preview: string; time: string; unread?: boolean
  msg: string; at: string
  draftNative: string; draftEN: string; chips: string[]
  match: { via: string; conf: 'High' | 'Low'; order: string; item: string; oStatus: string; placed: string; total: string; tracking: string; eta: string }
  customer: string
  risk?: string
}

const TICKETS: Ticket[] = [
  {
    id: 't1', name: 'Maria Lopez', initials: 'ML', store: 'AURORA', lang: 'EN', status: 'queued',
    subject: 'Where is my order?', preview: 'I ordered 3 weeks ago and still nothing…', time: '2m', unread: true,
    msg: 'Hi — I ordered 3 weeks ago and still haven’t received anything. Order #1042. Getting worried.',
    at: '09:14',
    draftNative: 'Hi Maria — thanks for your patience! Your order #1042 shipped and is currently in transit: it cleared customs this morning and should arrive within 2–3 days. Here’s your live tracking: CP998341US. I’ll keep an eye on it and follow up the moment it’s delivered.',
    draftEN: '',
    chips: ['Order #1042', 'Live tracking', 'Refund policy', 'Tone: warm'],
    match: { via: 'Order number in email', conf: 'High', order: '#1042', item: 'Aurora Linen Set — Sand', oStatus: 'In transit', placed: '21 days ago', total: '$148.00', tracking: 'CP998341US', eta: '2–3 days' },
    customer: '3 orders · joined Mar 2025',
  },
  {
    id: 't2', name: 'A. Weber', initials: 'AW', store: 'AURORA', lang: 'DE', status: 'escalated',
    subject: 'Chargeback threatened', preview: 'Ich melde das meiner Bank und meinem Anwalt.', time: '11m', unread: true,
    msg: 'Das ist inakzeptabel. Ich melde das meiner Bank und meinem Anwalt, wenn es heute nicht gelöst wird.',
    at: '08:51', risk: 'Dispute language detected — pulled from every automated lane, routed to a human.',
    draftNative: 'Hallo — es tut mir sehr leid, dass es so weit gekommen ist. Ich habe Ihren Fall soeben persönlich übernommen und melde mich innerhalb von 24 Stunden mit einer Lösung.',
    draftEN: 'Hello — I’m very sorry it has come to this. I have just personally taken over your case and will get back to you within 24 hours with a resolution.',
    chips: ['Held for human', 'Order #1991', 'Dispute risk'],
    match: { via: 'Customer email', conf: 'High', order: '#1991', item: 'Aurora Throw — Charcoal', oStatus: 'Disputed', placed: '34 days ago', total: '$59.00', tracking: '—', eta: '—' },
    customer: '1 order · first contact',
  },
  {
    id: 't3', name: 'James Carter', initials: 'JC', store: 'Harbor Goods', lang: 'EN', status: 'draft',
    subject: 'Return request', preview: 'It didn’t fit — can I return it?', time: '24m',
    msg: 'Hi, the robe didn’t fit — can I return it for a refund?', at: '08:38',
    draftNative: 'Hi James — absolutely, you’re within the 30-day window. Here’s your prepaid return label and the 3 quick steps. Your refund posts within 2 days of us receiving the item.',
    draftEN: '',
    chips: ['Order #2090', 'Within window', 'Return policy'],
    match: { via: 'Customer email', conf: 'High', order: '#2090', item: 'Harbor Robe — M', oStatus: 'Delivered', placed: '6 days ago', total: '$72.00', tracking: 'CP771204US', eta: 'delivered' },
    customer: '2 orders · joined Jan 2026',
  },
  {
    id: 't4', name: 'Sofia Rossi', initials: 'SR', store: 'AURORA', lang: 'IT', status: 'needs',
    subject: 'Damaged on arrival', preview: 'La scatola è arrivata danneggiata…', time: '38m',
    msg: 'La scatola è arrivata danneggiata e il set presenta delle macchie. Cosa possiamo fare?', at: '08:24',
    draftNative: 'Ciao Sofia — mi dispiace tanto! Possiamo inviarti subito una sostituzione oppure rimborsarti completamente. Se puoi, inviaci una foto del danno così sistemiamo tutto oggi stesso.',
    draftEN: 'Hi Sofia — I’m so sorry! We can send you a replacement right away or refund you in full. If you can, send us a photo of the damage and we’ll sort everything out today.',
    chips: ['Order #2061', 'Photo requested', 'Replacement policy'],
    match: { via: 'Order number in email', conf: 'High', order: '#2061', item: 'Aurora Linen Set — Clay', oStatus: 'Delivered', placed: '9 days ago', total: '$148.00', tracking: 'CP663118US', eta: 'delivered' },
    customer: '4 orders · VIP',
  },
  {
    id: 't5', name: 'Unknown sender', initials: '?', store: 'Northbound', lang: 'EN', status: 'needs',
    subject: 'Question about sizing', preview: 'Do the jackets run true to size?', time: '1h',
    msg: 'Hey, do the jackets run true to size? Thinking about the field jacket in M.', at: '07:56',
    draftNative: 'Hi — good question! The field jacket runs slightly large; most customers take one size down. The M fits like a typical L in high-street brands. Happy to help if you’re between sizes.',
    draftEN: '',
    chips: ['No order — pre-sale', 'Size guide'],
    match: { via: 'No order matched', conf: 'Low', order: '—', item: '—', oStatus: '—', placed: '—', total: '—', tracking: '—', eta: '—' },
    customer: 'No purchase history',
  },
]

const FILTERS = ['All', 'Needs you', 'Draft ready', 'Sending soon', 'Escalated'] as const

const AILOG: { at: string; ev: string; detail: string; kind: 'ok' | 'hold' | 'send' }[] = [
  { at: '09:15:02', ev: 'Queued for auto-send', detail: 'WISMO lane · #4471 Maria Lopez · 30s cancel window', kind: 'send' },
  { at: '09:14:22', ev: 'Draft created', detail: 'WISMO lane · grounded on order #1042 + live tracking', kind: 'ok' },
  { at: '08:52:07', ev: 'Held for human', detail: 'Dispute language detected · #4468 A. Weber · pulled from all lanes', kind: 'hold' },
  { at: '08:39:44', ev: 'Draft created', detail: 'Returns lane · order #2090 within return window', kind: 'ok' },
  { at: '08:24:19', ev: 'Draft created (IT)', detail: 'Damage lane · photo request per SOP · EN mirror attached', kind: 'ok' },
  { at: '07:58:03', ev: 'Auto-sent', detail: 'Address change · #2061 updated before fulfillment · Sofia Rossi', kind: 'send' },
  { at: '07:31:40', ev: 'Filtered', detail: 'Marketing newsletter suppressed from inbox', kind: 'hold' },
]

const LANES_INIT = [
  { name: 'Where is my order?', mode: 'live' as 'off' | 'shadow' | 'live' },
  { name: 'Returns & refunds', mode: 'shadow' as 'off' | 'shadow' | 'live' },
  { name: 'Order changes', mode: 'shadow' as 'off' | 'shadow' | 'live' },
  { name: 'Product questions', mode: 'off' as 'off' | 'shadow' | 'live' },
]

/* --------------------------------------------------------------- helpers */
function Chip({ s }: { s: TStatus }) {
  return <span className={'c-chip ' + ST[s].cls}>{ST[s].label}</span>
}
function Av({ t, sm }: { t: Ticket; sm?: boolean }) {
  return (
    <span className={'c-av' + (sm ? ' sm' : '')} style={{ background: t.status === 'escalated' ? '#B4472F' : 'var(--ink)' }}>
      {t.initials}
    </span>
  )
}

/* ---------------------------------------------------------------- views */
function Overview() {
  const KPIS = [
    { label: 'Open tickets', v: '12', sub: 'across 3 stores' },
    { label: 'Awaiting your approval', v: '5', sub: 'drafts ready' },
    { label: 'Auto-sent today', v: '23', sub: 'WISMO + address lanes' },
    { label: 'Escalated', v: '1', sub: 'dispute language' },
  ]
  const BACKLOG = [['<4h', 7], ['4–24h', 3], ['1–3d', 2], ['3d+', 0]] as const
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
                <span className="bar"><i style={{ width: (n / 12) * 100 + '%' }} /></span>
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
          {AILOG.slice(0, 4).map((e) => (
            <div className="c-ev" key={e.at}>
              <span className={'ic ' + e.kind}>{e.kind === 'hold' ? <PauseCircle size={13} /> : e.kind === 'send' ? <Send size={12} /> : <Check size={13} />}</span>
              <span className="t"><b>{e.ev}</b> — {e.detail}</span>
              <span className="at">{e.at}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Tickets({ killed }: { killed: boolean }) {
  const [sel, setSel] = useState('t1')
  const [filter, setFilter] = useState<typeof FILTERS[number]>('All')
  const [mirror, setMirror] = useState(false)
  const [countdown, setCountdown] = useState(24)
  const [cancelled, setCancelled] = useState(false)
  const t = TICKETS.find((x) => x.id === sel)!

  useEffect(() => { setMirror(false) }, [sel])
  useEffect(() => {
    if (t.status !== 'queued' || cancelled || killed) return
    const id = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000)
    return () => clearInterval(id)
  }, [t.status, cancelled, killed])

  const list = TICKETS.filter((x) => {
    if (filter === 'All') return true
    if (filter === 'Needs you') return x.status === 'needs'
    if (filter === 'Draft ready') return x.status === 'draft'
    if (filter === 'Sending soon') return x.status === 'queued'
    return x.status === 'escalated'
  })
  const hasNative = t.draftEN !== ''
  const body = mirror && hasNative ? t.draftEN : t.draftNative
  const queuedActive = t.status === 'queued' && !cancelled && !killed && countdown > 0

  return (
    <div className="c-3pane">
      {/* list */}
      <section className="c-queue">
        <header className="c-q-head">
          <div className="c-q-title">Tickets <span className="n">12</span></div>
          <div className="c-search"><Search size={14} /><input placeholder="Search tickets, orders, customers…" /></div>
          <div className="c-ftabs">
            {FILTERS.map((f) => (
              <button key={f} className={f === filter ? 'on' : ''} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
        </header>
        <div className="c-list">
          {list.map((x) => (
            <button key={x.id} className={'c-row' + (x.id === sel ? ' sel' : '') + (x.unread ? ' unread' : '')} onClick={() => setSel(x.id)}>
              <Av t={x} />
              <span className="main">
                <span className="top"><b>{x.name}</b><span className="time">{x.time}</span></span>
                <span className="sub">{x.subject}</span>
                <span className="prev">{x.preview}</span>
                <span className="tags"><Chip s={x.status} /><span className="lang">{x.lang}</span><span className="store">{x.store}</span></span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* thread */}
      <main className="c-conv">
        <header className="c-c-head">
          <div className="who">
            <Av t={t} />
            <div>
              <div className="nm">{t.name} <span className="lang">{t.lang}</span></div>
              <div className="meta">{t.name.toLowerCase().replace(/[^a-z]/g, '')}@email.com · {t.store}</div>
            </div>
          </div>
          <div className="acts">
            <button className="c-chip-btn"><RefreshCw size={13} /> Status: Open <ChevronDown size={13} /></button>
            <button className="c-chip-btn red"><Gavel size={13} /> Escalate</button>
          </div>
        </header>

        <div className="c-thread">
          {t.risk && <div className="c-risk"><ShieldCheck size={14} /> {t.risk}</div>}
          {killed && <div className="c-risk mut"><PauseCircle size={14} /> Auto-send is paused by the kill switch — all drafts hold for approval.</div>}
          <div className="c-msg">
            <Av t={t} sm />
            <div className="bubble">{t.msg}<span className="at">{t.at}</span></div>
          </div>

          <div className={'c-draft' + (t.status === 'escalated' ? ' esc' : '')}>
            <div className="h">
              <span className="tag">{t.status === 'escalated' ? 'Held for a human' : 'Resolver drafted a reply'}</span>
              {hasNative && (
                <button className={'c-mirror' + (mirror ? ' on' : '')} onClick={() => setMirror(!mirror)}>
                  <Languages size={12} /> {mirror ? 'EN mirror' : `Original · ${t.lang}`}
                </button>
              )}
            </div>
            <p className="body">{body}</p>
            <div className="chips">{t.chips.map((c) => <span key={c}><Check size={11} /> {c}</span>)}</div>
            <div className="acts">
              {t.status === 'escalated' ? (
                <>
                  <button className="c-act prim"><Send size={14} /> Send as specialist</button>
                  <button className="c-act"><Pencil size={14} /> Edit</button>
                </>
              ) : queuedActive ? (
                <>
                  <span className="c-count"><Clock size={13} /> Auto-sends in {countdown}s</span>
                  <button className="c-act red" onClick={() => setCancelled(true)}><X size={14} /> Cancel send</button>
                  <button className="c-act"><Pencil size={14} /> Edit</button>
                </>
              ) : (
                <>
                  <button className="c-act prim"><Send size={14} /> Approve &amp; send</button>
                  <button className="c-act"><Pencil size={14} /> Edit</button>
                  <button className="c-act ic" title="Regenerate"><RefreshCw size={14} /></button>
                </>
              )}
              {t.status === 'queued' && (cancelled || killed) && <span className="c-held"><PauseCircle size={13} /> Held — waiting for your approval</span>}
            </div>
          </div>
        </div>
      </main>

      {/* context */}
      <aside className="c-ctx2">
        <div className="sec">
          <div className="h">Order match</div>
          <div className="card">
            <div className="c-kv"><span>Matched via</span><b>{t.match.via}</b></div>
            <div className="c-kv"><span>Confidence</span><b className={t.match.conf === 'High' ? 'green' : 'red'}>{t.match.conf}</b></div>
            <a className="link">Wrong order? Change match</a>
          </div>
        </div>
        {t.match.order !== '—' && (
          <>
            <div className="sec">
              <div className="h">Order {t.match.order}</div>
              <div className="card">
                <div className="line"><Package size={13} /><span>{t.match.item}</span></div>
                <div className="c-kv"><span>Status</span><b className={t.status === 'escalated' ? 'red' : 'green'}>{t.match.oStatus}</b></div>
                <div className="c-kv"><span>Placed</span><b>{t.match.placed}</b></div>
                <div className="c-kv"><span>Total</span><b>{t.match.total}</b></div>
              </div>
            </div>
            <div className="sec">
              <div className="h">Fulfillment</div>
              <div className="card">
                <div className="line"><Truck size={13} /><span>{t.match.tracking === '—' ? 'Not yet shipped' : t.match.tracking}</span></div>
                {t.match.tracking !== '—' && <a className="link">Live tracking <ArrowUpRight size={12} /></a>}
              </div>
            </div>
          </>
        )}
        <div className="sec">
          <div className="h">Customer</div>
          <div className="card"><div className="line"><User size={13} /><span>{t.customer}</span></div></div>
        </div>
      </aside>
    </div>
  )
}

function SimpleList({ title, sub, rows }: { title: string; sub: string; rows: [string, string, string][] }) {
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>{title}</h1><p>{sub}</p></div></header>
      <div className="c-card">
        <div className="c-rows">
          {rows.map(([a, b, c], i) => (
            <div className="c-ev" key={i}>
              <span className="t"><b>{a}</b> — {b}</span>
              <span className="at">{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Compose() {
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Compose</h1><p>New outbound email</p></div></header>
      <div className="c-card c-compose">
        <label>From<select><option>support@aurora.com (AURORA)</option><option>hello@harborgoods.com</option></select></label>
        <label>To<input placeholder="customer@email.com" /></label>
        <label>Subject<input placeholder="Subject" /></label>
        <label>Message<textarea rows={8} placeholder="Write your message — or start from an order: type # to attach one." /></label>
        <div className="row">
          <button className="c-act prim"><Send size={14} /> Send</button>
          <button className="c-act"><FileText size={14} /> Save draft</button>
        </div>
      </div>
    </div>
  )
}

function Chargebacks() {
  const rows = [
    { o: '#1991', cust: 'A. Weber', store: 'AURORA', amt: '$59.00', reason: 'Product not received', due: 'Evidence due in 6 days', st: 'Needs response' },
  ]
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Chargebacks</h1><p>Disputes from Shopify Payments · demo data</p></div></header>
      <div className="c-card">
        <table className="c-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Store</th><th>Amount</th><th>Reason</th><th>Deadline</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.o}>
                <td><b>{r.o}</b></td><td>{r.cust}</td><td>{r.store}</td><td>{r.amt}</td>
                <td>{r.reason}</td><td>{r.due}</td><td><span className="c-chip red">{r.st}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="c-note">Dispute tickets are never auto-replied. The linked conversation is at the top of your human queue.</p>
      </div>
    </div>
  )
}

function AiLog() {
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Automation log</h1><p>Every automated action, auditable · demo data</p></div></header>
      <div className="c-card">
        <div className="c-rows">
          {AILOG.map((e) => (
            <div className="c-ev" key={e.at}>
              <span className={'ic ' + e.kind}>{e.kind === 'hold' ? <PauseCircle size={13} /> : e.kind === 'send' ? <Send size={12} /> : <Check size={13} />}</span>
              <span className="t"><b>{e.ev}</b> — {e.detail}</span>
              <span className="at">{e.at}</span>
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
          <div className="c-ev"><span className="c-av sm" style={{ background: 'var(--ink)' }}>N</span><span className="t"><b>Nathan</b> — Owner · all stores</span><span className="at">you</span></div>
          <div className="c-ev"><span className="c-av sm" style={{ background: '#6B6E76' }}>C</span><span className="t"><b>Chandan</b> — Agent · AURORA only</span><span className="at">active</span></div>
        </div>
      </div>
    </div>
  )
}

type Lanes = typeof LANES_INIT
function SettingsView({ lanes, setLanes, killed, setKilled }: {
  lanes: Lanes; setLanes: (l: Lanes) => void
  killed: boolean; setKilled: (b: boolean) => void
}) {
  const [tab, setTab] = useState<'Lanes' | 'Stores' | 'Policies & SOP' | 'Billing'>('Lanes')
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Settings</h1><p>AURORA · owner access</p></div></header>
      <div className="c-set">
        <nav className="c-set-nav">
          {(['Lanes', 'Stores', 'Policies & SOP', 'Billing'] as const).map((x) => (
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
                      <button
                        key={m}
                        className={l.mode === m ? 'on' : ''}
                        onClick={() => setLanes(lanes.map((x, j) => (j === i ? { ...x, mode: m } : x)))}
                      >{m}</button>
                    ))}
                  </div>
                  <span className="note">{l.mode === 'live' ? (killed ? 'paused by kill switch' : 'auto-send · 30s cancel window') : l.mode === 'shadow' ? 'drafts only, nothing sends' : 'no drafting'}</span>
                </div>
              ))}
              <p className="c-note">Dispute and legal language always routes to a human, regardless of lane modes.</p>
            </>
          )}
          {tab === 'Stores' && (
            <div className="c-rows">
              {['AURORA · aurora.com · 12 open', 'Harbor Goods · harborgoods.com · 7 open', 'Northbound · northbound.co · 5 open'].map((s) => (
                <div className="c-ev" key={s}><span className="t"><b>{s.split(' · ')[0]}</b> — {s.split(' · ').slice(1).join(' · ')}</span><span className="at">connected</span></div>
              ))}
              <button className="c-act" style={{ marginTop: 14, alignSelf: 'flex-start' }}><Plus size={14} /> Add store</button>
            </div>
          )}
          {tab === 'Policies & SOP' && (
            <div className="c-rows">
              <div className="c-ev"><span className="ic ok"><FileText size={13} /></span><span className="t"><b>support-sop-v3.pdf</b> — uploaded Jun 12 · constrains every draft</span><span className="at">replace</span></div>
              <div className="c-kv"><span>Refund window</span><b>30 days</b></div>
              <div className="c-kv"><span>Reshipment policy</span><b>Free reship on damage w/ photo</b></div>
              <div className="c-kv"><span>Tone</span><b>Warm, plain, no exclamation marks</b></div>
            </div>
          )}
          {tab === 'Billing' && (
            <div className="c-rows">
              <div className="c-kv"><span>Plan</span><b>Team — $249/mo</b></div>
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
  const [view, setView] = useState<View>('tickets')
  const [store, setStore] = useState(1)
  const [storeOpen, setStoreOpen] = useState(false)
  const [lanes, setLanes] = useState<Lanes>(LANES_INIT)
  const [killed, setKilled] = useState(false)

  const CONTENT: Record<View, () => React.ReactElement> = {
    overview: () => <Overview />,
    tickets: () => <Tickets killed={killed} />,
    resolved: () => <SimpleList title="Resolved" sub="Closed conversations" rows={[
      ['Where is my order? · Emma Wilson', 'auto-resolved with live tracking', '1h ago'],
      ['Return request · Lucas Meyer', 'label sent, refund pending item receipt', '3h ago'],
      ['Address change · Chloé Martin', 'updated before fulfillment, auto-sent (FR)', '5h ago'],
    ]} />,
    bin: () => <SimpleList title="Bin" sub="Deleted conversations — recoverable for 30 days" rows={[
      ['Spam · "Grow your store 10x"', 'deleted manually', 'yesterday'],
    ]} />,
    filtered: () => <SimpleList title="Filtered" sub="Suppressed inbound — never reached the inbox" rows={[
      ['Newsletter · Shopify Weekly', 'marketing filter', '07:31'],
      ['Auto-reply · Out of office', 'loop protection', '06:12'],
    ]} />,
    compose: () => <Compose />,
    sent: () => <SimpleList title="Sent" sub="Outbound mail across stores" rows={[
      ['Re: Where is my order? · Maria Lopez', 'auto-sent · WISMO lane · EN', '09:15'],
      ['Re: Cambio indirizzo · Sofia Rossi', 'auto-sent · address lane · IT', '07:58'],
      ['Re: Return request · James Carter', 'sent by Nathan after edit', 'yesterday'],
    ]} />,
    tasks: () => <SimpleList title="Tasks" sub="Follow-ups the AI queued for you" rows={[
      ['Check reshipment stock · Aurora Linen Set', 'damage claim #2061 awaiting photo', 'due today'],
      ['Confirm supplier ETA · Harbor Robe', 'restock answer promised to 2 customers', 'due tomorrow'],
      ['Review dispute evidence · #1991', 'chargeback deadline in 6 days', 'due in 3 days'],
    ]} />,
    customs: () => <SimpleList title="Customs" sub="Clearance requests detected in tracking" rows={[
      ['#1042 · CP998341US', 'cleared this morning — customer notified in draft', '09:02'],
      ['#2088 · CP584201US', 'fee requested by carrier — customer asked to pay €4.20', 'yesterday'],
    ]} />,
    chargebacks: () => <Chargebacks />,
    ailog: () => <AiLog />,
    users: () => <UsersView />,
    settings: () => <SettingsView lanes={lanes} setLanes={setLanes} killed={killed} setKilled={setKilled} />,
  }

  return (
    <div className="console2">
      <aside className="c-rail">
        <div className="c-brand"><img src={LOGO} alt="" /><span>resolver.chat</span></div>

        <div className="c-store-wrap">
          <button className="c-store" onClick={() => setStoreOpen(!storeOpen)}>
            <span className="dot">{STORES[store][0]}</span>
            <span className="nm">{STORES[store]}<small>{store === 0 ? '24 open · 3 stores' : '12 open'}</small></span>
            <ChevronsUpDown size={14} className="mut" />
          </button>
          {storeOpen && (
            <div className="c-store-menu">
              {STORES.map((s, i) => (
                <button key={s} className={i === store ? 'on' : ''} onClick={() => { setStore(i); setStoreOpen(false) }}>
                  {s} {i === store && <Check size={13} />}
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
                  {it.n != null && <span className="n">{it.n}</span>}
                </a>
              ))}
            </div>
          ))}
        </nav>

        <div className="c-rail-foot">
          <div className={'c-auto' + (killed ? ' off' : '')}>
            <b>{killed ? 'Auto-send paused' : 'Auto-send active'}</b>
            <p>{killed ? 'Kill switch is on' : `${lanes.filter((l) => l.mode === 'live').length} lane live · risky tickets always wait`}</p>
          </div>
          <div className="c-me"><span className="av">N</span><span>Nathan<small>Owner</small></span></div>
        </div>
      </aside>

      <div className="c-main">{CONTENT[view]()}</div>
    </div>
  )
}
