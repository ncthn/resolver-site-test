import { useState } from 'react'
import {
  Inbox, CircleCheck, Mail, ListChecks, BarChart3, Settings, Search,
  ChevronsUpDown, Package, Truck, ShieldCheck, Sparkles, Send, Pencil,
  RefreshCw, Gavel, Clock, Globe, Check, Zap, ArrowUpRight, User,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const LOGO = '/logo/recolor/oct-bluewhite-t.png' // blue mark — light app chrome

const STORES = [
  { id: 'aurora', name: 'AURORA', hue: '#2A2FB8', count: 12 },
  { id: 'harbor', name: 'Harbor Goods', hue: '#5B61E6', count: 7 },
  { id: 'northbound', name: 'Northbound', hue: '#23278F', count: 5 },
]

const NAV: [LucideIcon, string, number | null][] = [
  [Inbox, 'Inbox', 12], [CircleCheck, 'Resolved', null], [Mail, 'Compose', null],
  [ListChecks, 'Tasks & rules', null], [BarChart3, 'Reporting', null],
]

type Flag = 'auto' | 'esc' | 'sent' | 'wait'
type Conv = {
  id: string; name: string; initials: string; store: string; flag: Flag; lang: string;
  subject: string; preview: string; time: string; unread: boolean;
  order: { no: string; status: string; item: string; tracking: string; placed: string; total: string };
  msgs: { me: boolean; t: string; at: string }[];
  draft: { conf: number; ms: string; body: string; chips: string[]; esc?: boolean };
  history: string; risk?: string;
}

const CONVS: Conv[] = [
  {
    id: 'c1', name: 'Maria Lopez', initials: 'ML', store: 'AURORA', flag: 'auto', lang: 'EN',
    subject: 'Where is my order?', preview: 'I ordered 3 weeks ago and still nothing 😟', time: '2m',
    unread: true,
    order: { no: '#1042', status: 'In transit', item: 'Aurora Linen Set — Sand', tracking: 'CP998341US', placed: '21 days ago', total: '$148.00' },
    msgs: [{ me: false, t: 'Hi — I ordered 3 weeks ago and still haven\'t received anything. Order #1042. Getting worried 😟', at: '09:14' }],
    draft: { conf: 96, ms: '0.8s', chips: ['Order #1042', 'Live tracking', 'Refund policy', 'Tone: warm'], body: 'Hi Maria — thanks for your patience! Your order #1042 shipped and is currently in transit, arriving in 2–3 days. Here\'s your live tracking: CP998341US. I\'ll keep an eye on it and follow up the moment it\'s delivered.' },
    history: '3 orders · joined Mar 2025',
  },
  {
    id: 'c2', name: 'A. Weber', initials: 'AW', store: 'AURORA', flag: 'esc', lang: 'DE',
    subject: 'Chargeback threatened', preview: 'I\'m reporting this to my bank and my lawyer.', time: '11m',
    unread: true, risk: 'Legal threat detected',
    order: { no: '#1991', status: 'Disputed', item: 'Aurora Throw — Charcoal', tracking: '—', placed: '34 days ago', total: '$59.00' },
    msgs: [{ me: false, t: 'This is unacceptable. I\'m reporting this to my bank and my lawyer if not resolved today.', at: '08:51' }],
    draft: { conf: 0, ms: '—', esc: true, chips: ['Held for human', 'Order #1991', 'Dispute risk'], body: 'Escalated — never auto-sent. A specialist should personally review the dispute and reply within 24h. Suggested opener drafted below for the human to approve.' },
    history: '1 order · first contact',
  },
  {
    id: 'c3', name: 'James Carter', initials: 'JC', store: 'AURORA', flag: 'wait', lang: 'EN',
    subject: 'Return request', preview: 'It didn\'t fit — can I return it?', time: '24m',
    unread: false,
    order: { no: '#2090', status: 'Delivered', item: 'Aurora Robe — M', tracking: 'CP771204US', placed: '6 days ago', total: '$72.00' },
    msgs: [{ me: false, t: 'Hi, the robe didn\'t fit — can I return it for a refund?', at: '08:38' }],
    draft: { conf: 92, ms: '0.6s', chips: ['Order #2090', 'Within window', 'Return policy', 'Tone: warm'], body: 'Hi James — absolutely, you\'re within the 30-day window. Here\'s your prepaid return label and 3 quick steps. Your refund posts within 2 days of us receiving it.' },
    history: '2 orders · joined Jan 2026',
  },
  {
    id: 'c4', name: 'Sofia Rossi', initials: 'SR', store: 'AURORA', flag: 'sent', lang: 'IT',
    subject: 'Change shipping address', preview: 'Can you send it to my office instead?', time: '1h',
    unread: false,
    order: { no: '#2061', status: 'Pre-fulfillment', item: 'Aurora Linen Set — Clay', tracking: '—', placed: '1 day ago', total: '$148.00' },
    msgs: [{ me: false, t: 'Puoi spedirlo al mio ufficio invece di casa?', at: '07:20' }, { me: true, t: 'Certo! Ho aggiornato l\'indirizzo di spedizione al tuo ufficio. L\'ordine #2061 non era ancora stato evaso.', at: '07:20' }],
    draft: { conf: 98, ms: '0.5s', chips: ['Order #2061', 'Not yet fulfilled', 'Address updated', 'Auto-sent'], body: 'Auto-sent in Italian — address updated before fulfillment. No action needed.' },
    history: '4 orders · VIP',
  },
]

const LANE: Record<string, string> = { c1: 'WISMO', c2: 'Disputes', c3: 'Returns', c4: 'Address changes' }

const FLAG_META: Record<Flag, { label: string; cls: string; dot: string }> = {
  auto: { label: 'Auto-drafted', cls: 'cs-b-auto', dot: '#5B61E6' },
  esc: { label: 'Escalated', cls: 'cs-b-esc', dot: '#D14343' },
  sent: { label: 'Auto-sent', cls: 'cs-b-sent', dot: '#8C8DA3' },
  wait: { label: 'Needs you', cls: 'cs-b-wait', dot: '#2A2FB8' },
}

const TABS = ['Needs you', 'Auto-sent', 'Escalated', 'All'] as const

const KPIS: { Ic: LucideIcon; label: string; value: string; delta: string; up: boolean; soft: string; fg: string }[] = [
  { Ic: CircleCheck, label: 'Tickets resolved', value: '1,284', delta: '+18%', up: true, soft: 'var(--teal-soft)', fg: 'var(--teal)' },
  { Ic: Zap, label: 'Auto-send rate', value: '72%', delta: '+6 pts', up: true, soft: '#ECEBF8', fg: 'var(--indigo)' },
  { Ic: Clock, label: 'Avg first reply', value: '0.9s', delta: '−2.1s', up: true, soft: 'var(--teal-soft)', fg: 'var(--teal)' },
  { Ic: ShieldCheck, label: 'Escalated to human', value: '4.3%', delta: '−0.8 pts', up: true, soft: '#ECEBF8', fg: 'var(--indigo)' },
]
const TREND = [['Mon', 62], ['Tue', 78], ['Wed', 54], ['Thu', 88], ['Fri', 100], ['Sat', 46], ['Sun', 58]] as const
const LANES: [string, number, boolean][] = [['WISMO', 84, true], ['Returns', 71, true], ['Address changes', 63, true], ['Disputes', 0, false]]
const STORE_ROWS = [
  { name: 'AURORA', hue: '#2A2FB8', open: 12, resolved: '612', auto: '74%', resp: '0.8s' },
  { name: 'Harbor Goods', hue: '#5B61E6', open: 7, resolved: '408', auto: '69%', resp: '1.1s' },
  { name: 'Northbound', hue: '#23278F', open: 5, resolved: '264', auto: '71%', resp: '0.9s' },
]

function Report() {
  return (
    <div className="cs-report">
      <header className="cs-rep-head">
        <div>
          <div className="cs-rep-title">Reporting</div>
          <div className="cs-rep-sub">AURORA · all lanes</div>
        </div>
        <span className="cs-lane-chip"><Clock size={13} /> Last 7 days</span>
      </header>

      <div className="cs-kpis">
        {KPIS.map((k) => (
          <div className="cs-kpi" key={k.label}>
            <div className="cs-kpi-ic" style={{ background: k.soft, color: k.fg }}><k.Ic size={17} /></div>
            <div className="cs-kpi-n">{k.value}</div>
            <div className="cs-kpi-l">{k.label}</div>
            <div className={'cs-kpi-d ' + (k.up ? 'up' : 'dn')}>{k.delta}</div>
          </div>
        ))}
      </div>

      <div className="cs-rep-grid">
        <div className="cs-rep-card">
          <div className="cs-rep-card-h">Resolved per day</div>
          <div className="cs-bars">
            {TREND.map(([d, pct]) => (
              <div className="cs-bar-col" key={d}>
                <div className="cs-bar-wrap"><div className="cs-bar" style={{ height: pct + '%' }} /></div>
                <span className="cs-bar-d">{d}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="cs-rep-card">
          <div className="cs-rep-card-h">Resolved by lane</div>
          <div className="cs-lanes">
            {LANES.map(([name, pct, auto]) => (
              <div className="cs-lane-row" key={name}>
                <span className="cs-lane-nm">{name}</span>
                <span className="cs-lane-bar"><i style={{ width: Math.max(pct, 3) + '%', background: auto ? 'var(--teal)' : 'var(--tx-faint)' }} /></span>
                <span className="cs-lane-pct">{auto ? pct + '%' : 'human'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cs-rep-card">
        <div className="cs-rep-card-h">By store</div>
        <table className="cs-table">
          <thead><tr><th>Store</th><th>Open</th><th>Resolved</th><th>Auto-send</th><th>Avg first reply</th></tr></thead>
          <tbody>
            {STORE_ROWS.map((s) => (
              <tr key={s.name}>
                <td><span className="cs-dot" style={{ background: s.hue }} />{s.name}</td>
                <td>{s.open}</td><td>{s.resolved}</td><td>{s.auto}</td><td>{s.resp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AppConsole() {
  const [sel, setSel] = useState('c1')
  const [tab, setTab] = useState<typeof TABS[number]>('Needs you')
  const [autopilot, setAutopilot] = useState(true)
  const [view, setView] = useState<'inbox' | 'reporting'>('inbox')
  const c = CONVS.find((x) => x.id === sel)!

  return (
    <div className="console">
      {/* ---- sidebar ---- */}
      <aside className="cs-rail">
        <div className="cs-brand"><img src={LOGO} alt="" /><span>resolver<span style={{ opacity: .55 }}>.chat</span></span></div>

        <button className="cs-store">
          <span className="cs-store-dot" style={{ background: STORES[0].hue }}>A</span>
          <span className="cs-store-nm">{STORES[0].name}<small>{STORES[0].count} open</small></span>
          <ChevronsUpDown size={15} className="cs-mut" />
        </button>

        <nav className="cs-nav">
          {NAV.map(([Ic, label, n], i) => {
            const v = i === 0 ? 'inbox' : i === 4 ? 'reporting' : null
            return (
              <a key={label} className={'cs-navi' + (v && v === view ? ' on' : '')} onClick={() => v && setView(v)} style={v ? { cursor: 'pointer' } : undefined}>
                <Ic size={17} /> <span>{label}</span>
                {n != null && <span className="cs-count">{n}</span>}
              </a>
            )
          })}
        </nav>

        <div className="cs-rail-card">
          <div className="cs-rail-card-h"><Zap size={13} /> Autopilot</div>
          <p>Auto-send is on for <b>2 lanes</b>. Risky tickets always wait for you.</p>
          <button className={'cs-switch' + (autopilot ? ' on' : '')} onClick={() => setAutopilot(!autopilot)}>
            <span className="k" />
          </button>
        </div>

        <div className="cs-rail-foot">
          <a className="cs-navi"><Settings size={17} /> <span>Settings</span></a>
          <div className="cs-me"><span className="cs-me-av">N</span><span className="cs-me-nm">Nathan<small>Owner</small></span></div>
        </div>
      </aside>

      {view === 'reporting' ? <Report /> : (<>
      {/* ---- queue ---- */}
      <section className="cs-queue">
        <header className="cs-q-head">
          <div className="cs-q-title">Inbox <span className="cs-q-n">12</span></div>
          <div className="cs-search"><Search size={15} /><input placeholder="Search tickets, orders, customers…" /></div>
          <div className="cs-tabs">
            {TABS.map((t) => <button key={t} className={'cs-tab' + (t === tab ? ' on' : '')} onClick={() => setTab(t)}>{t}</button>)}
          </div>
        </header>
        <div className="cs-list">
          {CONVS.map((x) => {
            const f = FLAG_META[x.flag]
            return (
              <button key={x.id} className={'cs-row' + (x.id === sel ? ' sel' : '') + (x.unread ? ' unread' : '')} onClick={() => setSel(x.id)}>
                <span className="cs-av" style={{ background: x.flag === 'esc' ? '#D14343' : 'var(--indigo)' }}>{x.initials}</span>
                <span className="cs-row-main">
                  <span className="cs-row-top"><b>{x.name}</b><span className="cs-row-time">{x.time}</span></span>
                  <span className="cs-row-sub">{x.subject}</span>
                  <span className="cs-row-prev">{x.preview}</span>
                  <span className="cs-row-tags">
                    <span className={'cs-badge ' + f.cls}><span className="cs-bdot" style={{ background: f.dot }} />{f.label}</span>
                    <span className="cs-lang">{x.lang}</span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* ---- conversation ---- */}
      <main className="cs-conv">
        <header className="cs-c-head">
          <div className="cs-c-who">
            <span className="cs-av lg" style={{ background: c.flag === 'esc' ? '#D14343' : 'var(--indigo)' }}>{c.initials}</span>
            <div>
              <div className="cs-c-nm">{c.name} <span className="cs-lang">{c.lang}</span></div>
              <div className="cs-c-meta"><Mail size={12} /> {c.name.toLowerCase().replace(/[^a-z]/g, '')}@email.com · {c.store}</div>
            </div>
          </div>
          <div className="cs-c-actions">
            <span className="cs-lane-chip"><Zap size={13} /> {LANE[c.id]} lane</span>
            <button className="cs-chip-btn"><Globe size={14} /> {c.order.no}</button>
            <button className="cs-chip-btn esc"><Gavel size={14} /> Escalate</button>
          </div>
        </header>

        <div className="cs-thread">
          {c.risk && <div className="cs-risk"><ShieldCheck size={15} /> {c.risk} — pulled from auto-send, routed to a human.</div>}
          {c.msgs.map((m, i) => (
            <div key={i} className={'cs-msg' + (m.me ? ' me' : '')}>
              {!m.me && <span className="cs-av sm" style={{ background: c.flag === 'esc' ? '#D14343' : 'var(--indigo)' }}>{c.initials}</span>}
              <div className="cs-bubble">{m.t}<span className="cs-at">{m.at}</span></div>
            </div>
          ))}
        </div>

        {/* AI draft = the compose surface, docked at the bottom (the hero) */}
        <div className="cs-dock">
          <div className={'cs-draft' + (c.draft.esc ? ' esc' : '')}>
            <div className="cs-draft-h">
              <span className="cs-draft-tag"><span className="cs-spark"><Sparkles size={12} /></span> {c.draft.esc ? 'Held for a human' : 'Resolver drafted a reply'}</span>
              {!c.draft.esc
                ? <span className="cs-conf"><span className="cs-conf-bar"><i style={{ width: c.draft.conf + '%' }} /></span>{c.draft.conf}% · {c.draft.ms}</span>
                : <span className="cs-draft-meta cs-hold"><Clock size={12} /> never auto-sent</span>}
            </div>
            <p className="cs-draft-body">{c.draft.body}</p>
            <div className="cs-draft-chips">
              {c.draft.chips.map((ch) => <span key={ch} className="cs-dchip"><Check size={11} /> {ch}</span>)}
            </div>
            <div className="cs-draft-acts">
              {c.draft.esc
                ? (<><button className="cs-act prim"><Send size={15} /> Send to specialist</button><button className="cs-act"><Pencil size={15} /> Edit</button></>)
                : (<><button className="cs-act go"><Send size={15} /> Approve &amp; send</button><button className="cs-act"><Pencil size={15} /> Edit</button><button className="cs-act ic" title="Regenerate"><RefreshCw size={15} /></button></>)}
            </div>
          </div>
        </div>
      </main>

      {/* ---- order context ---- */}
      <aside className="cs-ctx">
        <div className="cs-ctx-sec">
          <div className="cs-ctx-h">Order {c.order.no}</div>
          <div className="cs-ctx-card">
            <div className="cs-ctx-line"><Package size={14} /><span>{c.order.item}</span></div>
            <div className="cs-ctx-kv"><span>Status</span><b className={c.flag === 'esc' ? 'red' : 'teal'}>{c.order.status}</b></div>
            <div className="cs-ctx-kv"><span>Placed</span><b>{c.order.placed}</b></div>
            <div className="cs-ctx-kv"><span>Total</span><b>{c.order.total}</b></div>
          </div>
        </div>
        <div className="cs-ctx-sec">
          <div className="cs-ctx-h">Fulfillment</div>
          <div className="cs-ctx-card">
            <div className="cs-ctx-line"><Truck size={14} /><span>{c.order.tracking === '—' ? 'Not yet shipped' : c.order.tracking}</span></div>
            {c.order.tracking !== '—' && <a className="cs-ctx-link">Live tracking <ArrowUpRight size={13} /></a>}
          </div>
        </div>
        <div className="cs-ctx-sec">
          <div className="cs-ctx-h">Customer</div>
          <div className="cs-ctx-card">
            <div className="cs-ctx-line"><User size={14} /><span>{c.history}</span></div>
          </div>
        </div>
      </aside>
      </>)}
    </div>
  )
}
