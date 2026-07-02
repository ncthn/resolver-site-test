import { useState, useEffect, useRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  Inbox, Package, Globe, ShieldCheck, Zap, Check, ArrowRight, Plus, Star,
  Lock, ScanSearch, MessageSquare, Sparkles, ListChecks, BarChart3, Mail,
  CircleCheck, Gavel, Twitter, Linkedin, Github, Send, Pencil, RefreshCw,
  Truck, User, Clock, Languages,
} from 'lucide-react'

/* ================================================================
   Resolver marketing landing — rebuilt from scratch as block components.
   Refs: gorgias (bento density, big stat callouts, gradient blocks),
   humane (app-UI-led hero, one signature instrument reused),
   weav (overlapping color sheets, generous radii).
   ================================================================ */

const LOGO_W = '/logo/recolor/oct-whiteblue-t.png' // white mark — dark surfaces
const LOGO_B = '/logo/recolor/oct-bluewhite-t.png' // blue mark — light surfaces

/* ---------------- scroll reveal ---------------- */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const els = Array.from(ref.current?.querySelectorAll<HTMLElement>('.reveal') ?? [])
    const revealAll = () => els.forEach((e) => e.classList.add('in'))
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce || typeof IntersectionObserver === 'undefined') { revealAll(); return }
    const vh = window.innerHeight
    const pending: HTMLElement[] = []
    els.forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.top < vh && r.bottom > 0) el.classList.add('in')
      else pending.push(el)
    })
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' })
    pending.forEach((el) => io.observe(el))
    const fb = window.setTimeout(revealAll, 1000)
    return () => { io.disconnect(); clearTimeout(fb) }
  }, [])
  return ref
}

/* ---------------- shared bits ---------------- */
function SectionHead({ eyebrow, title, sub, light, center }: { eyebrow: string; title: string; sub?: string; light?: boolean; center?: boolean }) {
  return (
    <div className={'shead' + (center ? ' center' : '') + (light ? ' light' : '')}>
      <span className="lbl reveal">{eyebrow}</span>
      <h2 className="big reveal">{title}</h2>
      {sub && <p className="ssub reveal">{sub}</p>}
    </div>
  )
}

/* ---------------- nav (liquid glass) ---------------- */
function GlassNav() {
  const [floated, setFloated] = useState(false)
  useEffect(() => {
    const onScroll = () => setFloated(window.scrollY > 24)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div className={'navwrap' + (floated ? ' floated' : '')}>
      <nav>
        <a className="brand" href="#top"><img className="logo" src={LOGO_B} alt="resolver.chat" /><span className="wm">resolver<span className="dot">.chat</span></span></a>
        <div className="nl"><a href="#how">How it works</a><a href="#features">Features</a><a href="#results">Results</a><a href="#pricing">Pricing</a><a href="#security">Security</a><a href="#faq">FAQ</a></div>
        <div className="nr"><a className="login" href="#">Sign in</a><a className="btn btn-indigo" href="#cta">Start setup</a></div>
      </nav>
    </div>
  )
}

/* ---------------- hero: real app UI, LIVE — tickets resolve themselves ---------------- */
type HStage = 'new' | 'drafting' | 'sent'
const HPOOL: { name: string; initials: string; subj: string; lang: string; order: string; body: string }[] = [
  { name: 'Maria Lopez', initials: 'ML', subj: 'Where is my order?', lang: 'EN', order: '#1042', body: "Hi Maria — your order #1042 shipped and is in transit, arriving in 2–3 days. Here's live tracking: CP998…" },
  { name: 'James Carter', initials: 'JC', subj: 'Can I return this?', lang: 'EN', order: '#2090', body: "Hi James — you're within the 30-day window. Here's your prepaid return label and the 3 quick steps." },
  { name: 'Noah Dubois', initials: 'ND', subj: 'Où est ma commande ?', lang: 'FR', order: '#2114', body: 'Bonjour Noah — votre commande #2114 est en route et arrive dans 2 à 3 jours. Voici votre suivi en direct.' },
  { name: 'Sofia Rossi', initials: 'SR', subj: 'Change my address', lang: 'IT', order: '#2061', body: 'Ciao Sofia — ho aggiornato il tuo indirizzo. Il tuo ordine #2061 non era ancora stato spedito.' },
  { name: 'Lena Meyer', initials: 'LM', subj: 'Cancel my order', lang: 'DE', order: '#2137', body: 'Hallo Lena — deine Bestellung #2137 wurde storniert. Die Rückerstattung ist unterwegs.' },
]
const HBADGE: Record<HStage, [string, string]> = { new: ['cs-b-new', 'New'], drafting: ['cs-b-wait', 'Drafting…'], sent: ['cs-b-done', '✓ Auto-sent'] }

function HeroConsole() {
  const [q, setQ] = useState<{ p: number; stage: HStage }[]>([{ p: 0, stage: 'drafting' }, { p: 1, stage: 'new' }])
  const [done, setDone] = useState(47)
  const nextP = useRef(2)
  useEffect(() => {
    const t = setInterval(() => {
      setQ(([a, b]) => {
        if (a.stage === 'new') return [{ ...a, stage: 'drafting' }, b]
        if (a.stage === 'drafting') return [{ ...a, stage: 'sent' }, b]
        const fresh = { p: nextP.current % HPOOL.length, stage: 'new' as HStage }
        nextP.current++
        setDone((d) => d + 1)
        return [b.stage === 'new' ? { ...b, stage: 'drafting' } : b, fresh]
      })
    }, 1800)
    return () => clearInterval(t)
  }, [])
  const act = q.find((x) => x.stage !== 'sent') ?? q[0]
  const t = HPOOL[act.p % HPOOL.length]
  const open = 4 + ((59 - done) % 9)
  return (
    <div className="heroapp reveal">
      <div className="ha-chrome">
        <aside className="ha-rail">
          <div className="ha-brand"><img src={LOGO_B} alt="" /><span>resolver<i>.chat</i></span></div>
          <div className="ha-store"><span className="ha-sd">A</span><span>AURORA<small>{open} open</small></span></div>
          <div className="ha-nav">
            <span className="on"><Inbox size={14} /> Inbox <b>{open}</b></span>
            <span><CircleCheck size={14} /> Resolved <b className="dim">{done}</b></span>
            <span><BarChart3 size={14} /> Reporting</span>
          </div>
          <div className="ha-auto"><Zap size={12} /> Autopilot · 2 lanes</div>
        </aside>
        <div className="ha-main">
          <div className="ha-q">
            {q.map((x) => {
              const p = HPOOL[x.p % HPOOL.length]
              const [cls, label] = HBADGE[x.stage]
              return (
                <div className={'ha-row st-' + x.stage + (x.stage === 'drafting' ? ' sel' : '')} key={x.p + p.name}>
                  <span className="ha-av">{p.initials}</span>
                  <span className="ha-rmain"><b>{p.name}</b><i>{p.subj}</i><span className="ha-tags"><span className={'cs-badge ' + cls}>{label}</span><span className="cs-lang">{p.lang}</span></span></span>
                </div>
              )
            })}
            <div className="ha-row"><span className="ha-av esc">AW</span><span className="ha-rmain"><b>A. Weber</b><i>Chargeback threatened</i><span className="ha-tags"><span className="cs-badge cs-b-esc">Escalated · human</span><span className="cs-lang">DE</span></span></span></div>
          </div>
          <div className="cs-draft ha-draft" key={act.p}>
            <div className="cs-draft-h"><span className="cs-draft-tag"><span className="cs-spark"><Sparkles size={12} /></span> Resolver drafted a reply</span><span className="cs-conf"><span className="cs-conf-bar"><i style={{ width: '96%' }} /></span>96% · 0.8s</span></div>
            <p className="cs-draft-body">{t.body}</p>
            <div className="cs-draft-chips"><span className="cs-dchip"><Check size={11} /> Order {t.order}</span><span className="cs-dchip"><Check size={11} /> Live tracking</span><span className="cs-dchip"><Check size={11} /> Store policy</span><span className="cs-dchip"><Check size={11} /> Tone: warm</span></div>
            <div className="cs-draft-acts"><button className="cs-act go"><Send size={14} /> Approve &amp; send</button><button className="cs-act"><Pencil size={14} /> Edit</button><button className="cs-act ic"><RefreshCw size={14} /></button></div>
          </div>
        </div>
      </div>
      <div className="ha-ctx">
        <div className="ha-ctx-h">ORDER {t.order}</div>
        <div className="ha-ctx-line"><Package size={13} /> Aurora Linen Set</div>
        <div className="ha-ctx-kv"><span>Status</span><b>In transit</b></div>
        <div className="ha-ctx-kv"><span>Total</span><b>$148.00</b></div>
      </div>
    </div>
  )
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="wrap">
        <div className="hgrid">
          <div>
            <span className="hbadge reveal"><Sparkles size={13} /> AI support agent for Shopify</span>
            <h1 className="reveal">Your support inbox, <em>resolved by morning.</em></h1>
            <p className="hsub reveal">Resolver reads every email, pulls the real Shopify order, and drafts the reply in your customer's language — then sends it, or hands the risky ones to you. You wake up to a cleared queue.</p>
            <div className="acts reveal"><a className="btn btn-indigo" href="#cta">Start free setup <ArrowRight size={16} /></a><a className="btn btn-ghost" href="#cta">Book a demo</a></div>
            <div className="micro reveal"><Check size={13} /> Shadow mode first <Check size={13} /> Live order data <Check size={13} /> Auto-send only by lane</div>
          </div>
          <HeroConsole />
        </div>
        <div className="herotrust reveal">
          <span className="ht-cap">Trusted by fast-growing Shopify brands</span>
          <span className="ht-logos"><b>AURORA</b><i>+</i><b>Harbor&nbsp;Goods</b><i>+</i><b>NORTHBOUND</b><i>+</i><b>Lumora</b><i>+</i><b>Maison&nbsp;Vela</b></span>
        </div>
      </div>
    </section>
  )
}

/* ---------------- stats sheet (big gorgias-style callouts) ---------------- */
const STATS: [string, string, string][] = [
  ['92%', 'of tickets resolved before you read them', '+18% m/m'],
  ['<2 min', 'average first reply, day or night', '−2.1s vs last week'],
  ['30+', 'languages, answered natively', 'auto-detected'],
  ['120 hrs', 'saved per week on support', 'across 3 stores'],
]
function StatsSheet() {
  return (
    <section className="sheet c-white" style={{ zIndex: 3 }}>
      <div className="wrap">
        <div className="statgrid">
          {STATS.map(([n, l, d], i) => (
            <div className="statcard reveal" key={i}>
              <div className="bn">{n}</div>
              <div className="sl">{l}</div>
              <div className="sd">{d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- repeat-work bento ---------------- */
const LANES: [string, number, boolean][] = [['"Where is my order?"', 84, true], ['Returns', 71, true], ['Address changes', 63, true], ['Disputes', 0, false]]
function RepeatWork() {
  return (
    <section className="sheet c-tint" style={{ zIndex: 4 }}>
      <div className="wrap"><div className="stmt">
        <div>
          <span className="pill-tag reveal"><img src={LOGO_B} style={{ height: 15 }} /> Ask Resolver — how do I get started?</span>
          <p className="lede reveal">Most support volume is <b>repeat work</b> — "where is my order?", returns, address changes, cancellations. Resolver clears it <b>while you sleep</b>.</p>
          <div className="stmt-chips reveal">
            <span><b>~70%</b> is repeat work</span>
            <span><b>0</b> rules to write</span>
            <span>clears <b>overnight</b></span>
          </div>
        </div>
        <div className="stmt-r">
          {LANES.map(([nm, pct, auto], i) => (
            <div className="lanetile reveal" key={i}>
              <div className="lt-top"><span className="lt-nm">{nm}</span><span className="lt-pct">{auto ? pct + '%' : 'human'}</span></div>
              <div className="lt-bar"><i style={{ width: (auto ? pct : 100) + '%', opacity: auto ? 1 : .35 }} /></div>
              <div className="lt-sub">{auto ? 'auto-resolved' : 'always kept for a human'}</div>
            </div>
          ))}
        </div>
      </div></div>
    </section>
  )
}

/* ---------------- how it works ---------------- */
const STEPS: [LucideIcon, string, string, string][] = [
  [Mail, '01', 'Reads every email', 'A ticket lands; Resolver reads the whole thread and detects the language — no rules to write.'],
  [Package, '02', 'Pulls the real order', 'Matches the customer to their Shopify order, fulfilment status and live carrier tracking.'],
  [Sparkles, '03', 'Drafts the resolution', "A ready, on-policy reply in the customer's language. Most tickets need nothing else from you."],
  [CircleCheck, '04', 'You approve, or it sends', 'Review the draft, or flip the lane to auto-send with a delay and a cancel window you control.'],
]
function HowItWorks() {
  return (
    <section className="sheet c-white" id="how" style={{ zIndex: 5 }}>
      <div className="wrap">
        <SectionHead eyebrow="How it works" title="Live in 10 minutes, resolving by tonight." />
        <div className="steps">
          {STEPS.map(([Ic, n, h, p], i) => (
            <div className="step reveal" key={i}>
              <div className="si"><Ic size={20} /></div>
              <div className="n">{n}</div><h4>{h}</h4><p>{p}</p>
            </div>
          ))}
        </div>
        <div className="pipe pipe-lt reveal"><span className="node">Draft</span><ArrowRight className="arr" size={16} /><span className="node">Approved</span><ArrowRight className="arr" size={16} /><span className="node on"><Zap size={14} /> Auto-send</span></div>
      </div>
    </section>
  )
}

/* ---------------- per-store control: set it once → every draft follows ---------------- */
function ControlBento() {
  return (
    <section className="sheet c-tint float" id="features" style={{ zIndex: 6 }}>
      <div className="wrap"><div className="cgrid">
        <div className="ctile big reveal">
          <span className="lbl">You stay the boss</span>
          <h2 className="big" style={{ marginTop: 14 }}>Tell it how to sound. Once.</h2>
          <p className="ssub">Five minutes of setup per store — pick a tone, set your rules, list what it must never say. From then on, every single draft follows them. No macros, no templates, no training period.</p>
          <div className="blist">
            <div className="bli"><span className="bic"><MessageSquare size={15} /></span><div><b>One voice per store</b><i>Warm for AURORA, formal for Harbor Goods — each brand sounds like itself.</i></div></div>
            <div className="bli"><span className="bic"><Lock size={15} /></span><div><b>Hard guardrails</b><i>Words it can't use, promises it can't make, discounts it can't give.</i></div></div>
            <div className="bli"><span className="bic"><Zap size={15} /></span><div><b>Autopilot per ticket type</b><i>Order-status questions send themselves; disputes never do.</i></div></div>
          </div>
          <a className="btn btn-indigo" style={{ marginTop: 28 }} href="#cta">Start setup <ArrowRight size={16} /></a>
        </div>
        <div className="ctile stack">
          <div className="stack-cap reveal">You set it once…</div>
          <div className="setcard reveal"><div className="lf"><span className="ci"><MessageSquare size={16} /></span><div><div className="t">Tone of voice</div><div className="s">How replies should sound</div></div></div><div className="v">Warm ▾</div></div>
          <div className="setcard reveal"><div className="lf"><span className="ci"><ScanSearch size={16} /></span><div><div className="t">Response length</div><div className="s">Short, medium or detailed</div></div></div><div className="v lite">Short ▾</div></div>
          <div className="setcard reveal"><div className="lf"><span className="ci"><Lock size={16} /></span><div><div className="t">Prohibited phrases</div><div className="s">"free", "guaranteed", "refund immediately"…</div></div></div><div className="v lite">Manage · 29</div></div>
          <div className="stack-cap reveal">…and every draft follows it</div>
          <div className="proofcard reveal">
            <div className="pc-h"><Sparkles size={13} /> Draft · Maria Lopez</div>
            <p>"Hi Maria — thanks for your patience! Your order shipped and arrives in 2–3 days. Here's your live tracking."</p>
            <div className="cs-draft-chips"><span className="cs-dchip"><Check size={11} /> Warm</span><span className="cs-dchip"><Check size={11} /> Short</span><span className="cs-dchip"><Check size={11} /> 0 banned words</span><span className="cs-dchip"><Check size={11} /> No promises</span></div>
          </div>
        </div>
      </div></div>
    </section>
  )
}

/* ---------------- grounded: reads the order → decides → replies with tracking IN the message ---------------- */
function Grounded() {
  return (
    <section className="sheet c-white" style={{ zIndex: 7 }}>
      <div className="wrap">
        <SectionHead eyebrow="No made-up answers" title="Every reply is built from the real order." sub="Before it writes a word, Resolver opens the customer's actual Shopify order — and the live tracking link goes straight into the message." />
        <div className="ggrid">
          <div className="gstep reveal">
            <div className="gs-h"><span className="gs-n">1</span> Reads the real order <ArrowRight className="gs-arr" size={15} /></div>
            <div className="dpanel lite">
              <div className="gc-h">Shopify · Order #1042</div>
              <div className="gc-l"><Package size={14} /> Aurora Linen Set — Sand</div>
              <div className="gc-kv"><span>Status</span><b>In transit</b></div>
              <div className="gc-kv"><span>Tracking</span><b className="trackb"><Truck size={12} /> CP998341US · live</b></div>
              <div className="gc-kv"><span>Placed</span><b>21 days ago</b></div>
              <div className="gc-kv"><span>Total</span><b>$148.00</b></div>
              <div className="gc-kv"><span>Customer</span><b>3 orders · since 2025</b></div>
              <div className="gc-kv"><span>Your policy</span><b>Refund after 30 days</b></div>
            </div>
          </div>
          <div className="gstep reveal">
            <div className="gs-h"><span className="gs-n">2</span> Decides what to do <ArrowRight className="gs-arr" size={15} /></div>
            <div className="dpanel lite">
              {([['Question', '"Where is my order?"'], ['Answer lives in', 'Tracking + ETA'], ['Tone', 'Warm · short'], ['Language', 'English']] as [string, string][]).map(([a, b], i) => <div className="think" key={i}><span>{a}</span><span className="r">{b}</span></div>)}
              <div className="think ok"><span>Risk check</span><span className="r">clear → auto-send</span></div>
            </div>
          </div>
          <div className="gstep reveal">
            <div className="gs-h"><span className="gs-n">3</span> Replies — tracking included</div>
            <div className="dpanel ind">
              <div className="dt"><Globe size={16} /> Sent · 0.8s after the email landed</div>
              <div className="b me">Where is my order? I placed it 3 weeks ago.</div>
              <div className="b">Hi Maria! Your order #1042 shipped and is in transit, arriving in 2–3 days. Track it live here: <span className="track"><Truck size={11} /> CP998341US ↗</span> — I'll keep an eye on it for you.</div>
              <div className="src">Every claim traced to<span><Package size={11} /> order #1042</span><span><Truck size={11} /> live tracking</span><span><ShieldCheck size={11} /> your policy</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------------- shadow mode (gradient indigo, sandwich top) ---------------- */
function ShadowMode() {
  return (
    <section className="sheet c-grad" style={{ zIndex: 8 }}>
      <div className="wrap"><div className="cols2">
        <div>
          <span className="lbl reveal">Zero risk to start</span>
          <h2 className="big reveal" style={{ marginTop: 14, maxWidth: '15ch' }}>It sends nothing until you say so.</h2>
          <p className="ssub reveal" style={{ maxWidth: '48ch' }}>Install it and change nothing about how you work. Resolver just writes the drafts — you read them. When they look right, let it send one ticket type at a time.</p>
          <div className="tl reveal">
            <div className="tl-i"><span className="tl-n">1</span><div><b>Day one — it only drafts</b><i>Every reply is written for you. Nothing reaches a customer.</i></div></div>
            <div className="tl-i"><span className="tl-n">2</span><div><b>When you're ready — let one type send</b><i>Start with "where is my order?". Each send has a delay and a cancel window.</i></div></div>
            <div className="tl-i"><span className="tl-n">3</span><div><b>Always — risky ones wait for you</b><i>Chargebacks, legal threats and big refunds are never sent automatically.</i></div></div>
          </div>
          <div className="quote br reveal">"I read the first fifty drafts. They were all right. Now it just runs."</div>
          <div className="qm reveal">store owner · 4 stores · 2,000 tickets / month</div>
        </div>
        <div className="reveal">
          <div className="shcard">
            <div className="shcard-h"><span className="shdot" /> Held for a human · never auto-sent</div>
            <div className="shrow"><span className="ha-av esc">AW</span><div><b>A. Weber · #1991</b><i>"…reporting this to my bank and my lawyer."</i></div></div>
            <div className="shrisk"><ShieldCheck size={14} /> Legal threat detected — pulled from auto-send and routed to you with the full order attached.</div>
            <div className="shrow ok"><span className="ha-av">ML</span><div><b>Maria Lopez · #1042</b><i>Auto-drafted · 96% confidence · cleared &amp; sent</i></div></div>
            <div className="shrow ok"><span className="ha-av">JC</span><div><b>James Carter · #2090</b><i>Return label · within window · auto-sent</i></div></div>
          </div>
        </div>
      </div></div>
    </section>
  )
}

/* ---------------- results (sandwich bottom, mined app data) ---------------- */
function Results() {
  return (
    <section className="sheet c-white" id="results" style={{ zIndex: 9 }}>
      <div className="wrap">
        <SectionHead eyebrow="Results" title="The numbers after one month live." />
        <div className="resgrid">
          {([['Tickets resolved', '1,284', '+18%'], ['Auto-send rate', '72%', '+6 pts'], ['Avg first reply', '0.9s', '−2.1s'], ['Escalated to human', '4.3%', '−0.8 pts']] as [string, string, string][]).map(([l, v, d], i) => (
            <div className="cs-kpi reveal" key={i}><div className="cs-kpi-ic"><BarChart3 size={17} /></div><div className="cs-kpi-n">{v}</div><div className="cs-kpi-l">{l}</div><div className="cs-kpi-d up2">{d}</div></div>
          ))}
        </div>
        <div className="resbento">
          <div className="rescard reveal">
            <div className="rescard-h">Resolved per day</div>
            <div className="cs-bars">{([['Mon', 62], ['Tue', 78], ['Wed', 54], ['Thu', 88], ['Fri', 100], ['Sat', 46], ['Sun', 58]] as [string, number][]).map(([d, p]) => <div className="cs-bar-col" key={d}><div className="cs-bar-wrap"><div className="cs-bar" style={{ height: p + '%' }} /></div><span className="cs-bar-d">{d}</span></div>)}</div>
          </div>
          <div className="rescard reveal">
            <div className="rescard-h">Resolved by lane</div>
            <div className="cs-lanes">{LANES.map(([n, p, a]) => <div className="cs-lane-row" key={n}><span className="cs-lane-nm">{n}</span><span className="cs-lane-bar"><i style={{ width: Math.max(a ? p : 100, 4) + '%', background: a ? 'var(--indigo)' : '#C9C8DC' }} /></span><span className="cs-lane-pct">{a ? p + '%' : 'human'}</span></div>)}</div>
          </div>
        </div>
        <div className="rescard full reveal">
          <div className="rescard-h">By store</div>
          <table className="cs-table"><thead><tr><th>Store</th><th>Open</th><th>Resolved</th><th>Auto-send</th><th>Avg first reply</th></tr></thead><tbody>
            {([['AURORA', '#2A2FB8', '12', '612', '74%', '0.8s'], ['Harbor Goods', '#5B61E6', '7', '408', '69%', '1.1s'], ['Northbound', '#23278F', '5', '264', '71%', '0.9s']] as string[][]).map((s) => <tr key={s[0]}><td><span className="cs-dot" style={{ background: s[1] }} />{s[0]}</td><td>{s[2]}</td><td>{s[3]}</td><td>{s[4]}</td><td>{s[5]}</td></tr>)}
          </tbody></table>
        </div>
      </div>
    </section>
  )
}

/* ---------------- global ops: languages + stores ---------------- */
const LDEMO: Record<string, { cust: string; reply: string }> = {
  FR: { cust: "Où est ma commande ? Je l'ai passée il y a 3 semaines.", reply: 'Bonjour ! Votre commande est en route — arrivée dans 2 à 3 jours. Voici votre suivi en direct.' },
  DE: { cust: 'Wo ist meine Bestellung? Ich habe vor 3 Wochen bestellt.', reply: 'Hallo! Ihre Bestellung ist unterwegs — Ankunft in 2–3 Tagen. Hier ist Ihre Live-Sendungsverfolgung.' },
  ES: { cust: '¿Dónde está mi pedido? Lo hice hace 3 semanas.', reply: 'Hola! Tu pedido está en camino — llega en 2–3 días. Aquí tienes el seguimiento en vivo.' },
}
function LanguagesDemo() {
  const [lang, setLang] = useState('FR')
  const d = LDEMO[lang]
  return (
    <div>
      <div className="langtabs">
        <span className="lt-lbl">Customer writes in</span>
        {Object.keys(LDEMO).map((l) => <button key={l} className={'tb' + (l === lang ? ' on' : '')} onClick={() => setLang(l)}>{l}</button>)}
      </div>
      <div className="lchat" key={lang}>
        <div className="lc-b cust">{d.cust}</div>
        <div className="lc-b bot"><Sparkles size={12} /> {d.reply}</div>
      </div>
      <div className="lc-en" key={lang + '-en'}>
        <div className="lc-en-h">What you see — English, side by side</div>
        <div className="lc-en-l"><b>Customer:</b> Where is my order? I placed it 3 weeks ago.</div>
        <div className="lc-en-l"><b>Resolver:</b> Hi! Your order is on the way — arriving in 2–3 days. Here's your live tracking.</div>
      </div>
    </div>
  )
}
const STORES: [string, string, string, string, string][] = [
  ['A', 'AURORA', '12 open', 'AUTO', '#2A2FB8'],
  ['H', 'Harbor Goods', '7 open', 'SHADOW', '#5B61E6'],
  ['N', 'Northbound', '5 open', 'AUTO', '#23278F'],
  ['L', 'Lumora', '3 open', 'AUTO', '#7B7FE8'],
]
function GlobalOps() {
  return (
    <section className="sheet c-tint" style={{ zIndex: 10 }}>
      <div className="wrap"><div className="cols2 top">
        <div>
          <span className="lbl reveal">Any language</span>
          <h3 className="h3 reveal">Your customer reads French. You read English.</h3>
          <p className="ssub reveal">Resolver detects the language, answers natively in it, and shows you the English right next to it — you stay in control without a translator.</p>
          <div className="reveal"><LanguagesDemo /></div>
          <div className="chiprow reveal"><span><Languages size={12} /> 30+ languages</span><span><ScanSearch size={12} /> auto-detected</span><span><Globe size={12} /> no translator needed</span></div>
        </div>
        <div>
          <span className="lbl reveal">One inbox, every store</span>
          <h3 className="h3 reveal">Run ten storefronts without ten VAs.</h3>
          <p className="ssub reveal">All your stores land in one queue. Each keeps its own voice and its own rules — and you see everything in one place.</p>
          <div className="qsum reveal"><Inbox size={14} /> One queue · <b>27 open</b> across 4 stores</div>
          <div className="stores2">{STORES.map(([a, n, o, b, c], i) => <div className="scard reveal" key={i}><div className="av" style={{ background: c }}>{a}</div><div className="nm">{n}</div><div className="mt">{o} <span className={'ba ' + (b === 'AUTO' ? 'auto' : 'sh')}>{b}</span></div></div>)}</div>
        </div>
      </div></div>
    </section>
  )
}

/* ---------------- escalate (gradient indigo) ---------------- */
function Escalate() {
  return (
    <section className="sheet c-grad" style={{ zIndex: 11 }}>
      <div className="wrap"><div className="cols2">
        <div>
          <span className="lbl reveal">Escalate lane</span>
          <h2 className="big reveal" style={{ marginTop: 14 }}>Chargebacks and lawyers never get auto-replied.</h2>
          <p className="ssub reveal" style={{ maxWidth: '44ch' }}>Resolver detects chargeback language, legal threats and refunds over your threshold, pulls them out of auto-send, and pushes them to the top of your queue with full order context attached.</p>
          <div className="chiprow dark reveal"><span><Gavel size={12} /> legal threats</span><span><ShieldCheck size={12} /> chargebacks</span><span><Lock size={12} /> refunds over threshold</span></div>
        </div>
        <div className="reveal">
          <div className="escbox">
            <div style={{ fontSize: 15 }}>"…I'm reporting this to my bank and my lawyer."</div>
            <div className="pillE"><Gavel size={12} /> ESCALATED · HUMAN</div>
            <div className="escmeta">Pulled from auto-send · flagged: legal threat · routed to a human with order #1991 attached.</div>
          </div>
          <div className="zero br reveal">0 auto-sent to a lawyer.</div>
        </div>
      </div></div>
    </section>
  )
}

/* ---------------- security + testimonials ---------------- */
const SEC: [LucideIcon, string, string][] = [
  [Lock, 'Encrypted end to end', 'Data encrypted in transit and at rest with AES-256. Tokens scoped to the minimum Shopify access needed.'],
  [ShieldCheck, 'GDPR compliant', 'Full data-subject request handling, EU data residency available, and customer redaction webhooks supported.'],
  [CircleCheck, 'You stay in control', 'Human-in-the-loop by default, a full audit log of every draft and send, and an instant kill-switch per lane.'],
]
const TESTI: [string, string, string, string][] = [
  ['AT', 'Austin Arthur', 'Founder, Aurora Threads', 'Resolver answers overnight in three languages. We stopped hiring for support and our first-reply time dropped to minutes.'],
  ['KM', 'Keliana Mery', 'Ops Lead, Harbor Goods', 'It pulls the real order before replying, so customers get the right answer the first time. The chargeback flags alone paid for it.'],
  ['DS', 'Dani Soto', 'Owner, Northbound', 'Shadow mode sold me. I watched it for a week, trusted it, flipped the lanes. Now I barely open the inbox.'],
]
function TrustBlock() {
  return (
    <section className="sheet c-white float" id="security" style={{ zIndex: 12 }}>
      <div className="wrap">
        <SectionHead eyebrow="Security & trust" title="Your customers' data, handled properly." />
        <div className="secgrid">{SEC.map(([Ic, h, p], i) => <div className="seccard reveal" key={i}><div className="ic"><Ic size={20} /></div><h4>{h}</h4><p>{p}</p></div>)}</div>
        <div className="badges reveal">{['AES-256 encryption', 'GDPR ready', 'Built for Shopify', 'SOC 2 (in progress)', 'EU data residency'].map((b) => <span className="badge" key={b}><ShieldCheck size={13} /> {b}</span>)}</div>
        <div className="tdivide reveal"><span className="lbl">Loved by operators</span></div>
        <div className="tcards">{TESTI.map(([av, nm, rl, q], i) => <div className="tcard reveal" key={i}><div className="stars">{[0, 1, 2, 3, 4].map((s) => <Star key={s} size={14} fill="currentColor" />)}</div><div className="q">"{q}"</div><div className="who"><div className="av">{av}</div><div><div className="nm">{nm}</div><div className="rl">{rl}</div></div></div></div>)}</div>
      </div>
    </section>
  )
}

/* ---------------- pricing ---------------- */
const PLANS: { name: string; tag?: string; desc: string; m: number; feats: string[] }[] = [
  { name: 'Solo', desc: '1 store · 1 seat · 300 tickets/mo', m: 59, feats: ['Shadow mode', 'Live order data', 'All languages', 'Email support'] },
  { name: 'Team', tag: 'Most popular', desc: '3 stores · 3 seats · 2,500 tickets/mo', m: 249, feats: ['Everything in Solo', 'Auto-send lanes', 'Escalation rules', 'Priority support'] },
  { name: 'Portfolio', desc: 'Unlimited stores · 10 seats · 6,000/mo', m: 599, feats: ['Everything in Team', 'Cross-store queue', 'Reporting suite', 'Onboarding call'] },
  { name: 'Enterprise', desc: 'Custom volume & contract', m: 0, feats: ['Custom volume', 'SLA & DPA', 'EU residency', 'Dedicated manager'] },
]
function Pricing() {
  const [annual, setAnnual] = useState(true)
  const price = (m: number) => (annual ? Math.round(m * 0.8) : m)
  return (
    <section className="sheet c-tint" id="pricing" style={{ zIndex: 13 }}>
      <div className="wrap">
        <SectionHead center eyebrow="Pricing" title="Pricing that scales with your tickets." />
        <div className="ptoggle reveal">
          <span className={annual ? '' : 'on'}>Monthly</span>
          <button className={'switch' + (annual ? ' annual' : '')} onClick={() => setAnnual(!annual)} aria-label="Toggle billing period"><span className="knob" /></button>
          <span className={annual ? 'on' : ''}>Annual</span>
          <span className="save">Save 20%</span>
        </div>
        <div className="prices">
          {PLANS.map((p, i) => (
            <div className={'plan reveal' + (p.tag ? ' rec' : '')} key={i}>
              {p.tag && <span className="tag">{p.tag}</span>}
              <div className="pn">{p.name}</div>
              <div className="pd">{p.desc}</div>
              <div className="pr">{p.m ? <>${price(p.m)}<span> /mo{annual ? ' · billed annually' : ''}</span></> : 'Custom'}</div>
              <ul>{p.feats.map((f) => <li key={f}><Check className="ck" size={13} /> {f}</li>)}</ul>
              <a className={'btn ' + (p.tag ? 'btn-light' : 'btn-ghost')} href="#cta">{p.m ? 'Start setup' : 'Talk to us'}</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ---------------- FAQ + CTA (CTA card bridges into footer) ---------------- */
const FAQS: [string, string][] = [
  ['Will it send something wrong to a customer?', 'Not unless you let it. Resolver starts in shadow mode and sends nothing until you turn on a lane — and even then, chargebacks, legal threats and large refunds are always held for a human.'],
  ['How long does setup take?', 'About 10 minutes: connect Shopify, connect your inbox, and Resolver starts drafting. No rules, no macros, no training period.'],
  ['Does it really use live order data?', 'Yes. Every draft is grounded in the actual Shopify order — fulfilment status, carrier tracking, totals and your store policy.'],
  ['What languages are supported?', '30+ languages, auto-detected per ticket. Replies go out natively and your team sees the English alongside.'],
  ['Can I run multiple stores?', 'Yes — every store flows into one queue with its own voice, policies and lane settings. Filter to one store or work them all at once.'],
]
function FaqCta() {
  const [open, setOpen] = useState(0)
  return (
    <section className="sheet c-white" id="faq" style={{ zIndex: 14 }}>
      <div className="wrap"><div className="fgrid">
        <div>
          <SectionHead eyebrow="FAQ" title="Questions, answered." />
          <div className="faq">
            {FAQS.map(([q, a], i) => (
              <div className={'qa' + (open === i ? ' open' : '')} key={i}>
                <div className="q" onClick={() => setOpen(open === i ? -1 : i)}>{q}<Plus className="pl" size={18} /></div>
                <div className="a"><p>{a}</p></div>
              </div>
            ))}
          </div>
        </div>
        <div className="ctacard reveal" id="cta">
          <img src={LOGO_W} alt="" style={{ height: 34 }} />
          <h3>Let your inbox resolve itself tonight.</h3>
          <p>Install free, watch it work in shadow mode, and flip on auto-send when you're ready.</p>
          <div className="acts"><a className="btn btn-light" href="#">Start free setup <ArrowRight size={16} /></a><a className="btn btn-ghost-d" href="#">Book a demo</a></div>
          <div className="ctachecks"><span><Check size={12} /> Free to install</span><span><Check size={12} /> Shadow mode first</span><span><Check size={12} /> Cancel anytime</span></div>
        </div>
      </div></div>
    </section>
  )
}

/* ---------------- footer ---------------- */
function Footer() {
  return (
    <footer>
      <div className="wrap">
        <div className="foot">
          <div>
            <a className="brand" href="#top"><img className="logo" src={LOGO_W} alt="resolver.chat" style={{ height: 27 }} /><span className="wm" style={{ color: '#fff' }}>resolver.chat</span></a>
            <p className="tag">AI customer support that resolves itself — grounded in your real Shopify orders.</p>
            <div className="social"><a href="#" aria-label="X"><Twitter size={16} /></a><a href="#" aria-label="LinkedIn"><Linkedin size={16} /></a><a href="#" aria-label="GitHub"><Github size={16} /></a></div>
          </div>
          <div><h5>Product</h5><a className="fl" href="#how">How it works</a><a className="fl" href="#features">Features</a><a className="fl" href="#pricing">Pricing</a><a className="fl" href="#security">Security</a><a className="fl" href="#cta">Start setup</a></div>
          <div><h5>Resources</h5><a className="fl" href="#">Docs</a><a className="fl" href="#faq">FAQ</a><a className="fl" href="#">Blog</a><a className="fl" href="#">Status</a><a className="fl" href="#">Contact</a></div>
          <div><h5>Company</h5><a className="fl" href="#">About</a><a className="fl" href="#">Careers</a><a className="fl" href="#">Privacy</a><a className="fl" href="#">Terms</a><a className="fl" href="#">Security</a></div>
        </div>
        <div className="copy"><span>© 2026 Resolver Ventures LLC</span><span>Built for operators, not call centers.</span></div>
      </div>
    </footer>
  )
}

/* ---------------- page ---------------- */
export function Landing() {
  const ref = useReveal()
  return (
    <div ref={ref}>
      <GlassNav />
      <Hero />
      <StatsSheet />
      <RepeatWork />
      <HowItWorks />
      <ControlBento />
      <Grounded />
      <ShadowMode />
      <Results />
      <GlobalOps />
      <Escalate />
      <TrustBlock />
      <Pricing />
      <FaqCta />
      <Footer />
    </div>
  )
}
