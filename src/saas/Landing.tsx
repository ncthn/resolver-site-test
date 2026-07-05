// Resolver, marketing site. Monochrome restraint: ink on white, soft gray
// bands, borderless rounded cards, pill buttons, one neutral typeface.
// Animation language (per references): blurred fade-up scroll reveals,
// looping in-card motion, a live classifier demo, an auto-advancing
// accordion with staggered visuals, a spinning wireframe globe, a dashed
// shield, and a draw-in analytics chart with a count-up. All honest:
// product-UI demos, no invented company metrics.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useInView } from 'motion/react';
import {
  ShoppingBag, Mail, Check, Plus, CircleCheck, PenLine, Inbox,
  Undo2, CreditCard, UserX, Timer, ListTree, Megaphone, BarChart3,
  Languages, Eye, Lock, Scale, X, ArrowRight, FileSearch, GitBranch,
  SlidersHorizontal, BellRing,
} from 'lucide-react';

const LOGO = '/logo/recolor/oct-black-t.png';

const START = '/get-started';
const LOGIN = '/app';
const DEMO = '/contact';
const PRICING_FULL = '/pricing';

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Scroll reveal, blurred fade-up, one treatment everywhere. */
export function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 26, filter: 'blur(7px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.65, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="Resolver home">
      <img src={LOGO} alt="" />
      <span className="wm">resolver.chat</span>
    </a>
  );
}

/* ============ nav ============ */
export function Nav() {
  return (
    <header className="nv">
      <div className="wrap nv-in">
        <Brand />
        <nav className="nv-links" aria-label="Primary">
          <a href="/#how">How it works</a>
          <a href="/#detect">Use cases</a>
          <a href="/#platform">Platform</a>
          <a href="/#security">Security</a>
          <a href="/pricing">Pricing</a>
        </nav>
        <div className="nv-cta">
          <a className="login" href={LOGIN}>Log in</a>
          <a className="btn soft sm demo" href={DEMO}>Book a demo</a>
          <a className="btn pri sm" href={START}>Start free</a>
        </div>
      </div>
    </header>
  );
}

/* ============ hero + product shot ============ */
function ConsoleMock() {
  return (
    <div className="shot" role="img" aria-label="The Resolver inbox: a ticket matched to its Shopify order with a drafted reply ready to approve">
      <div className="shot-bar"><i /><i /><i /><span className="addr">app.resolver.chat</span></div>
      <div className="console-mock">
        <aside className="cm-side">
          <div className="hd">Inbox</div>
          <div className="cm-row on"><span className="dot" style={{ background: 'var(--ink)' }} />Where is my order?<span className="n">12</span></div>
          <div className="cm-row"><span className="dot" style={{ background: '#8A8D94' }} />Returns &amp; refunds<span className="n">4</span></div>
          <div className="cm-row"><span className="dot" style={{ background: '#8A8D94' }} />Order changes<span className="n">3</span></div>
          <div className="cm-row"><span className="dot" style={{ background: '#8A8D94' }} />Product questions<span className="n">6</span></div>
          <div className="cm-row"><span className="dot" style={{ background: '#B4472F' }} />Escalated<span className="n">1</span></div>
          <div className="hd" style={{ marginTop: 14 }}>Store</div>
          <div className="cm-row">Analytics</div>
          <div className="cm-row">Automation log</div>
          <div className="cm-row">Settings</div>
        </aside>
        <div className="cm-main">
          <div className="subj">Where is my order?</div>
          <div className="meta">Sarah K. · sarah.k@gmail.com · 9:14 AM</div>
          <div className="cm-ev">
            <span className="ic ok"><CircleCheck size={13} strokeWidth={2.4} /></span>
            <div>
              <div className="t">Customer matched in Shopify<span>9:14:03</span></div>
              <div className="d">Email matched to an existing customer</div>
            </div>
          </div>
          <div className="cm-ev">
            <span className="ic ok"><CircleCheck size={13} strokeWidth={2.4} /></span>
            <div>
              <div className="t">Order found: #1042<span>9:14:10</span></div>
              <div className="d">Ana Coat Beige · $189.00</div>
            </div>
          </div>
          <div className="cm-ev">
            <span className="ic ok"><CircleCheck size={13} strokeWidth={2.4} /></span>
            <div>
              <div className="t">Shipping status retrieved: In transit<span>9:14:15</span></div>
              <div className="d">1Z999AA10123456784 (UPS) · customs cleared</div>
            </div>
          </div>
          <div className="cm-ev">
            <span className="ic ai"><PenLine size={12} strokeWidth={2.4} /></span>
            <div>
              <div className="t">Reply drafted<span>9:14:22</span></div>
            </div>
          </div>
          <div className="cm-draft">
            Hi Sarah,<br /><br />
            Thanks for reaching out! Your order has been shipped and is currently in
            transit, it cleared customs this morning and should arrive within 2 to 3 days.
            You can track it live here: ups.com/track<br /><br />
            Best regards,<br />Diana<span className="caret" aria-hidden="true" />
            <div className="acts"><span className="a1">Approve &amp; send</span><span className="a2">Edit</span></div>
          </div>
        </div>
        <aside className="cm-ctx">
          <div>
            <div className="hd">Order</div>
            <div className="cm-kv" style={{ marginTop: 10 }}>
              <span className="k">Number</span><span className="v">#1042</span>
              <span className="k">Status</span><span className="v"><span className="pill-st">Fulfilled</span></span>
              <span className="k">Placed</span><span className="v">Jun 24, 3:45 PM</span>
            </div>
          </div>
          <div className="cm-sep" />
          <div>
            <div className="hd">Items</div>
            <div className="cm-kv" style={{ marginTop: 10 }}>
              <span className="k">Product</span><span className="v">Ana Coat Beige</span>
              <span className="k">Quantity</span><span className="v">1</span>
              <span className="k">Price</span><span className="v">$189.00</span>
            </div>
          </div>
          <div className="cm-sep" />
          <div>
            <div className="hd">Shipping</div>
            <div className="cm-kv" style={{ marginTop: 10 }}>
              <span className="k">Status</span><span className="v"><span className="pill-tr">In transit</span></span>
              <span className="k">Carrier</span><span className="v">UPS</span>
              <span className="k">ETA</span><span className="v">2 to 3 days</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <>
      <section className="hero wrap" id="top">
        <motion.h1
          initial={{ opacity: 0, y: 18, filter: 'blur(7px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.65, ease: [0.2, 0.7, 0.2, 1] }}
        >
          Your customer emails, answered from the real order.
        </motion.h1>
        <motion.p
          className="lede"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: [0.2, 0.7, 0.2, 1] }}
        >
          Resolver matches every support email to the live Shopify order and drafts the
          reply in the customer&rsquo;s language, ready to approve, or to send on its own
          once you trust it.
        </motion.p>
        <motion.div
          className="ctas"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22 }}
        >
          <a className="btn pri" href={START}>Start free</a>
          <a className="btn soft" href={DEMO}>Book a demo</a>
        </motion.div>
      </section>
      <div className="stage">
        <div className="wrap">
          <motion.div
            initial={{ opacity: 0, y: 48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <ConsoleMock />
          </motion.div>
        </div>
      </div>
    </>
  );
}

/* ============ live classifier (how-card 1) ============ */
const CLS_CATS: [string, string, number][] = [
  ['Where is my order?', 'var(--ink)', 12],
  ['Returns & refunds', '#8A8D94', 4],
  ['Order changes', '#8A8D94', 3],
  ['Chargeback threat', '#B4472F', 1],
  ['Product questions', '#8A8D94', 6],
];
const CLS_MAILS: [string, number][] = [
  ['“It’s been 9 days, where is my package?”', 0],
  ['“I’d like to send the coat back.”', 1],
  ['“Can you ship to my new address instead?”', 2],
  ['“I’m disputing this charge with my bank.”', 3],
  ['“Does the jacket run true to size?”', 4],
];
function LiveClassifier() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced()) return;
    const id = setInterval(() => setI((v) => (v + 1) % CLS_MAILS.length), 2600);
    return () => clearInterval(id);
  }, []);
  const hit = CLS_MAILS[i][1];
  return (
    <div className="hviz classify">
      <div className="inmail" key={i}>
        <span className="env"><Mail size={12} strokeWidth={2.2} /></span>
        {CLS_MAILS[i][0]}
      </div>
      {CLS_CATS.map(([label, color, n], idx) => (
        <div className={idx === hit ? 'l hit' : 'l'} key={label}>
          <span className="sw" style={{ background: color }} />{label}
          {idx === hit && <span className="plus" key={`p${i}`}>+1</span>}
          <span style={{ marginLeft: 'auto', color: 'var(--tx-faint)' }}>{n}</span>
        </div>
      ))}
    </div>
  );
}

/* ============ how it works ============ */
function How() {
  return (
    <section className="how wrap" id="how">
      <Reveal className="center">
        <span className="eyebrow">How it works</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Ready-to-send replies,<br />powered by your store&rsquo;s live data.</h2>
      </Reveal>
      <div className="how-grid">
        <Reveal>
          <div className="hcard" style={{ height: '100%' }}>
            <h3>Detect &amp; categorize every request</h3>
            <p>Resolver reads each inbound email and identifies what the customer actually needs, no rules to configure.</p>
            <div className="visual"><LiveClassifier /></div>
          </div>
        </Reveal>
        <Reveal delay={0.1}>
          <div className="hcard" style={{ height: '100%' }}>
            <h3>Pull the order &amp; tracking context automatically</h3>
            <p>Order, fulfillment, customer history, live carrier events, everything needed to resolve the issue, attached to the ticket.</p>
            <div className="visual">
              <div className="hviz seq">
                {[
                  ['Order', '#1042 · $189.00'],
                  ['Status', 'Fulfilled'],
                  ['Carrier', 'UPS · In transit'],
                  ['Customs', 'Cleared'],
                  ['ETA', '2 to 3 days'],
                ].map(([k, v], i) => (
                  <div className="kv2" key={k} style={{ ['--d' as string]: `${0.4 + i * 0.55}s` }}>
                    {k} <b>{v}</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.2}>
          <div className="hcard" style={{ height: '100%' }}>
            <h3>Draft a personal reply in their language</h3>
            <p>Written in your store&rsquo;s tone, grounded in the real data, in the customer&rsquo;s own language. You approve, or automate it.</p>
            <div className="visual">
              <div className="hviz">
                <div className="l" style={{ paddingLeft: 4, color: 'var(--tx-faint)', fontSize: 11 }}>DE · inbound</div>
                <div className="bubble">Wo ist meine Bestellung? Es sind schon 9 Tage…</div>
                <div className="typing" aria-hidden="true"><i /><i /><i /></div>
                <div className="bubble reply-anim">Hallo Lena, deine Bestellung #2087 ist unterwegs und kommt in 2 to 3 Tagen an. Hier ist dein Live-Tracking…</div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============ integrations ============ */
function Integrations() {
  return (
    <section className="ints wrap">
      <Reveal>
        <div className="ints-card">
          <div className="tx">
            <h3>Connected to the tools already running your store</h3>
            <p>Customer, order, and delivery data pulled automatically, so every reply is grounded in what actually happened.</p>
          </div>
          <div className="apps">
            <div className="appic"><span className="tile"><ShoppingBag size={24} strokeWidth={1.8} /></span>Shopify</div>
            <div className="appic"><span className="tile"><Mail size={24} strokeWidth={1.8} /></span>Gmail</div>
            <div className="appic"><span className="tile"><Timer size={24} strokeWidth={1.8} /></span>Tracking</div>
            <div className="appic"><span className="tile"><Languages size={24} strokeWidth={1.8} /></span>40+ languages</div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ============ detection set piece ============ */
const PILLS = [
  'Where is my order?', 'Address changes', 'Order cancellations', 'Refund requests',
  'Shipping delays', 'Damaged items', 'Returns', 'Chargeback threats',
  'Customs questions', 'Duplicate orders', 'Wrong size received', 'Payment issues',
];
function Detect() {
  return (
    <section className="detect" id="detect">
      <div className="wrap">
        <Reveal className="center" >
          <span className="eyebrow">Use cases</span>
        </Reveal>
        <Reveal>
          <div className="detect-stage" style={{ marginTop: 40 }} aria-label={`Detecting requests like ${PILLS.join(', ')} before they escalate`}>
            <span className="side">Detecting requests like</span>
            <div className="pillcol-mask" aria-hidden="true">
              <div className="pillcol">
                {[...PILLS, ...PILLS].map((p, i) => (
                  <span key={i} className={p === 'Chargeback threats' ? 'dpill risk' : 'dpill'}>{p}</span>
                ))}
              </div>
            </div>
            <span className="side">before they escalate.</span>
          </div>
          <p className="detect-sub">Chargeback and legal language is never auto-replied, it goes straight to a human.</p>
        </Reveal>
      </div>
    </section>
  );
}

/* ============ accordion set piece ============ */
function Rows({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <>
      {rows.map(([l, r], i) => (
        <div className="row" key={i} style={{ ['--i' as string]: i }}>
          {typeof l === 'string' ? <b>{l}</b> : l}
          {r}
        </div>
      ))}
    </>
  );
}
const ACC_ITEMS = [
  {
    t: 'Shadow mode first',
    p: 'Resolver drafts silently alongside your team while you compare its answers to yours. Nothing sends until a lane earns it.',
    viz: (
      <div className="acc-shot" key="a">
        <Rows rows={[
          ['Where is my order? · #4471', <span className="st draft" key="1">Draft ready</span>],
          ['Refund request · #4468', <span className="st draft" key="2">Draft ready</span>],
          ['Address change · #4465', <span className="st draft" key="3">Draft ready</span>],
          [<span key="l">Sent automatically</span>, <b key="4">0, shadow mode</b>],
        ]} />
      </div>
    ),
  },
  {
    t: 'Auto-send, one lane at a time',
    p: 'Turn on sending per category, per store, with a delay and a cancel window on every automated reply.',
    viz: (
      <div className="acc-shot" key="b">
        <Rows rows={[
          ['WISMO lane', <span className="st live" key="1">Live · 30s window</span>],
          ['Returns lane', <span className="st shadow" key="2">Shadow</span>],
          ['Order changes', <span className="st shadow" key="3">Shadow</span>],
          ['Disputes', <span className="st human" key="4">Human only</span>],
        ]} />
      </div>
    ),
  },
  {
    t: 'Risk always escalates',
    p: 'Chargeback and legal language is detected and hard-routed to a human, enforced in the pipeline, not left to a prompt.',
    viz: (
      <div className="acc-shot" key="c">
        <Rows rows={[
          ['“I’m disputing this with my bank”', <span className="st human" key="1">Flagged</span>],
          [<span key="l1">Pulled from auto-send</span>, <b key="2">✓</b>],
          [<span key="l2">Pushed to top of human queue</span>, <b key="3">✓</b>],
          [<span key="l3">Auto-replies to this ticket</span>, <b key="4">Blocked</b>],
        ]} />
      </div>
    ),
  },
  {
    t: 'Every action logged',
    p: 'What sent, when, on which lane, and why, audit the machine like you’d audit an employee.',
    viz: (
      <div className="acc-shot" key="d">
        <Rows rows={[
          [<span key="l1">9:14:03</span>, <b key="1">Customer matched</b>],
          [<span key="l2">9:14:10</span>, <b key="2">Order #1042 attached</b>],
          [<span key="l3">9:14:22</span>, <b key="3">Draft created · WISMO lane</b>],
          [<span key="l4">9:15:02</span>, <b key="4">Sent after cancel window</b>],
        ]} />
      </div>
    ),
  },
];

function Accordion() {
  const [on, setOn] = useState(0);
  const paused = useRef(false);
  useEffect(() => {
    if (reduced()) return;
    const id = setInterval(() => {
      if (!paused.current) setOn((v) => (v + 1) % ACC_ITEMS.length);
    }, 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <section className="acc wrap">
      <Reveal className="center">
        <span className="eyebrow">Control</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Automation you can<br />actually supervise.</h2>
      </Reveal>
      <Reveal>
        <div
          className="acc-grid"
          onMouseEnter={() => { paused.current = true; }}
          onMouseLeave={() => { paused.current = false; }}
        >
          <div className="acc-list">
            {ACC_ITEMS.map((it, i) => (
              <div className={on === i ? 'acc-item on' : 'acc-item'} key={it.t} onClick={() => setOn(i)}>
                <div className="acc-head" role="button" aria-expanded={on === i}>{it.t}</div>
                <div className="acc-body"><p>{it.p}</p></div>
                <div className="acc-bar" key={on === i ? `bar-${i}-${on}` : `off-${i}`}><i /></div>
              </div>
            ))}
          </div>
          <div className="acc-viz">{ACC_ITEMS[on].viz}</div>
        </div>
      </Reveal>
    </section>
  );
}

/* ============ money section ============ */
function Money() {
  const cards = [
    { ic: <Undo2 size={19} strokeWidth={2} />, t: 'Refunds you could’ve prevented', p: 'Small delivery questions escalate into unnecessary refunds when customers are left without answers.' },
    { ic: <CreditCard size={19} strokeWidth={2} />, t: 'Disputes you didn’t see coming', p: 'Unresolved frustration quietly turns into chargebacks, complaints, and bad reviews if you don’t answer fast.' },
    { ic: <UserX size={19} strokeWidth={2} />, t: 'Customers you lost without noticing', p: 'Slow responses damage trust and reduce the chances customers ever come back.' },
  ];
  return (
    <section className="money wrap">
      <Reveal className="center">
        <span className="eyebrow">Why it matters</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Slow support isn&rsquo;t just slow.<br />It&rsquo;s silently costing you money.</h2>
      </Reveal>
      <div className="money-grid">
        {cards.map((c, i) => (
          <Reveal delay={i * 0.08} key={c.t}>
            <div className="mcard" style={{ height: '100%' }}>
              <span className="mic">{c.ic}</span>
              <h3>{c.t}</h3>
              <p>{c.p}</p>
            </div>
          </Reveal>
        ))}
        <Reveal delay={0.2} className="mcard cta">
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', width: '100%' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h3>Ready to stop losing money to slow support?</h3>
              <p style={{ marginTop: 6 }}>Put Resolver in shadow mode tonight and judge it on its drafts.</p>
            </div>
            <a className="btn" href={START} style={{ background: '#fff', color: 'var(--ink)' }}>Start free</a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============ before / with resolver ============ */
function BeforeAfter() {
  const before: string[] = [
    'Open the inbox to 40 unread tickets, triage by hand',
    'Tab between Gmail, Shopify, and the carrier site for every reply',
    'Copy-paste half-personalized templates, hope the tone lands',
    'Miss the one email that quietly threatens a chargeback',
    'Answer German customers through a translator tab',
  ];
  const after: string[] = [
    'Every ticket already categorized, matched, and drafted',
    'Order, tracking, and history attached to the conversation',
    'Replies in your store’s voice, grounded in the real order',
    'Dispute language flagged and routed to you first',
    'Customers answered in their own language, mirrored in English',
  ];
  return (
    <section className="ba wrap">
      <Reveal className="center">
        <span className="eyebrow">The difference</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>The same inbox.<br />A different morning.</h2>
      </Reveal>
      <div className="ba-grid">
        <Reveal>
          <div className="ba-card before" style={{ height: '100%' }}>
            <span className="cap">Without Resolver</span>
            <ul>
              {before.map((t) => (
                <li key={t}><span className="m"><X size={12} strokeWidth={2.6} /></span>{t}</li>
              ))}
            </ul>
          </div>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="ba-card after" style={{ height: '100%' }}>
            <span className="cap">With Resolver</span>
            <ul>
              {after.map((t) => (
                <li key={t}><span className="m"><Check size={12} strokeWidth={2.6} /></span>{t}</li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============ stats stack ============ */
function Stats() {
  const stats = [
    { v: '40+', k: 'languages detected, replies drafted directly in the customer’s own language' },
    { v: '3', k: 'send lanes per store: off, shadow, live, switched per request category' },
    { v: '30s', k: 'cancel window on every automated send, one click pulls it back' },
  ];
  return (
    <section className="stats wrap">
      <Reveal className="center">
        <span className="eyebrow">Guarantees</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>What you control, always.</h2>
      </Reveal>
      <div className="stats-grid" style={{ marginTop: 48 }}>
        <Reveal>
          <div className="stats-copy" style={{ height: '100%' }}>
            <h3>Real controls.<br />Not a black box.</h3>
            <p>
              Every number on the right is a product guarantee, not a benchmark. The lanes,
              the windows, the languages, they&rsquo;re how you keep the machine on a leash
              while it does the work.
            </p>
            <a className="btn pri" href={DEMO}>See it on your tickets</a>
          </div>
        </Reveal>
        <div className="stats-cards">
          {stats.map((s, i) => (
            <Reveal delay={i * 0.1} key={s.v}>
              <div className="stat-card">
                <span className="v">{s.v}</span>
                <span className="k">{s.k}</span>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ platform: gorgias-style split cards ============ */
function Platform() {
  const engine = [
    { ic: <FileSearch size={17} strokeWidth={2} />, t: 'Order matching', p: 'Order number first, customer email second, with the evidence shown.' },
    { ic: <Languages size={17} strokeWidth={2} />, t: 'Language detection', p: 'Drafted in the customer’s language, mirrored in English for review.' },
    { ic: <Timer size={17} strokeWidth={2} />, t: 'Tracking enrichment', p: 'Live carrier events folded into the reply, customs status included.' },
    { ic: <ListTree size={17} strokeWidth={2} />, t: 'Policy grounding', p: 'Your SOP constrains every draft, refund windows, reshipment rules.' },
    { ic: <Megaphone size={17} strokeWidth={2} />, t: 'Brand voice', p: 'Tone configured per store, from plain to formal.' },
    { ic: <BarChart3 size={17} strokeWidth={2} />, t: 'Support analytics', p: 'Recurring issues, delivery problems, and refund patterns, surfaced.' },
  ];
  const control = [
    { ic: <Eye size={17} strokeWidth={2} />, t: 'Approval queue', p: 'Every draft reviewable before anything leaves the building.' },
    { ic: <GitBranch size={17} strokeWidth={2} />, t: 'Send lanes', p: 'Off, shadow, live, switched per category, per store.' },
    { ic: <Undo2 size={17} strokeWidth={2} />, t: 'Cancel window', p: 'Auto-sends wait out a delay you set; one click pulls them back.' },
    { ic: <BellRing size={17} strokeWidth={2} />, t: 'Escalation rules', p: 'Chargeback and legal language always routes to a human.' },
    { ic: <SlidersHorizontal size={17} strokeWidth={2} />, t: 'Kill switch', p: 'One setting stops all automated sending, immediately.' },
    { ic: <Inbox size={17} strokeWidth={2} />, t: 'Automation log', p: 'What sent, when, on which lane, and why, fully auditable.' },
  ];
  return (
    <section className="gsplit wrap" id="platform">
      <Reveal className="center">
        <span className="eyebrow">Platform</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>A drafting engine and a control plane.<br />Built as one.</h2>
      </Reveal>
      <Reveal>
        <div className="gs-card">
          <div className="gs-l">
            <h3>One drafting engine. Grounded in the order.</h3>
            <p>Everything the AI writes is anchored to data it can cite, never a template, never a guess.</p>
            <a href="#how">See how it works <ArrowRight size={15} strokeWidth={2.2} /></a>
          </div>
          <div className="gs-grid">
            {engine.map((f) => (
              <div className="gs-it" key={f.t}>
                <span className="gic">{f.ic}</span>
                <div><h5>{f.t}</h5><p>{f.p}</p></div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
      <Reveal delay={0.08}>
        <div className="gs-card">
          <div className="gs-l">
            <h3>One control plane. Nothing sends without your rules.</h3>
            <p>Autonomy is granted lane by lane, and revocable in one click.</p>
            <a href={START}>Start in shadow mode <ArrowRight size={15} strokeWidth={2.2} /></a>
          </div>
          <div className="gs-grid">
            {control.map((f) => (
              <div className="gs-it" key={f.t}>
                <span className="gic">{f.ic}</span>
                <div><h5>{f.t}</h5><p>{f.p}</p></div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ============ setup timeline ============ */
function Setup() {
  const steps = [
    { when: 'Today', t: 'Install the Shopify app', p: 'One-click install from the App Store. Read-only scopes.' },
    { when: '+5 min', t: 'Connect Gmail', p: 'Your existing support mailbox, replies send as you.' },
    { when: '+10 min', t: 'Upload your SOP', p: 'Policies, refund windows, tone. Every draft follows it.' },
    { when: 'Week 1', t: 'Flip your first lane live', p: 'After watching drafts in shadow mode, turn on WISMO.' },
  ];
  return (
    <section className="setup wrap">
      <Reveal className="center">
        <span className="eyebrow">Setup</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Set up once. Supervised forever.</h2>
        <p className="sec-sub">Ten minutes to first draft. Nothing sends until you decide it should.</p>
      </Reveal>
      <div className="setup-grid">
        {steps.map((s, i) => (
          <Reveal delay={i * 0.1} key={s.t}>
            <div className="scard">
              <span className="dot"><i /></span>
              <div className="when">{s.when}</div>
              <h4>{s.t}</h4>
              <p>{s.p}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ============ security: dot-matrix shield + rotating dot globe ============ */
function Shield() {
  return (
    <div className="shield-wrap" aria-hidden="true">
      <svg viewBox="0 0 170 190" fill="none">
        <defs>
          <pattern id="shdots" width="9" height="9" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill="rgba(22,24,28,.38)" />
          </pattern>
          <clipPath id="shclip">
            <path d="M85 8 L152 34 V96 C152 140 122 168 85 182 C48 168 18 140 18 96 V34 Z" />
          </clipPath>
          <linearGradient id="shscan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g clipPath="url(#shclip)">
          <rect x="0" y="0" width="170" height="190" fill="url(#shdots)" />
          <rect className="sh-scan" x="0" y="-60" width="170" height="60" fill="url(#shscan)" />
        </g>
        <path
          d="M85 8 L152 34 V96 C152 140 122 168 85 182 C48 168 18 140 18 96 V34 Z"
          stroke="var(--ink)" strokeWidth="1.4" opacity=".55"
        />
        <circle cx="85" cy="94" r="30" fill="#fff" stroke="var(--line)" />
        <path d="M71 94 L81 105 L100 82" stroke="var(--ink)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

/* Rotating dot-sphere: ~230 fibonacci points, orthographic projection, rAF. */
function Globe() {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    const N = 230, R = 86, CX = 95, CY = 95;
    const pts: { x: number; y: number; z: number }[] = [];
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(1 - y * y);
      const th = ga * i;
      pts.push({ x: Math.cos(th) * rad, y, z: Math.sin(th) * rad });
    }
    const dots = pts.map(() => {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      svg.appendChild(c);
      return c;
    });
    let t = 0;
    let raf = 0;
    const still = reduced();
    const draw = () => {
      for (let i = 0; i < N; i++) {
        const p = pts[i];
        const sx = p.x * Math.cos(t) + p.z * Math.sin(t);
        const sz = -p.x * Math.sin(t) + p.z * Math.cos(t);
        const depth = (sz + 1) / 2; // 0 back, 1 front
        const d = dots[i];
        d.setAttribute('cx', String(CX + sx * R));
        d.setAttribute('cy', String(CY + p.y * R));
        d.setAttribute('r', String(0.9 + depth * 1.5));
        d.setAttribute('fill', `rgba(22,24,28,${(0.10 + depth * 0.55).toFixed(3)})`);
      }
      if (!still) { t += 0.0042; raf = requestAnimationFrame(draw); }
    };
    draw();
    return () => { cancelAnimationFrame(raf); dots.forEach((d) => d.remove()); };
  }, []);
  return (
    <div className="globe" aria-hidden="true">
      <svg ref={ref} viewBox="0 0 190 190" />
    </div>
  );
}
function CountUp({ to, duration = 1400 }: { to: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    if (reduced()) { setV(to); return; }
    const t0 = performance.now();
    const id = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setV(Math.round(to * eased));
      if (p >= 1) clearInterval(id);
    }, 24);
    return () => clearInterval(id);
  }, [inView, to, duration]);
  return <span ref={ref}>{v.toLocaleString('en-US')}</span>;
}
function Security() {
  return (
    <section className="sec2 wrap" id="security">
      <Reveal className="center">
        <span className="eyebrow">Security &amp; data</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Built to be trusted with the inbox.</h2>
        <p className="sec-sub">Support email is customer PII plus money conversations. The boring parts are load-bearing.</p>
      </Reveal>
      <div className="sec2-grid">
        <Reveal>
          <div className="g-card" style={{ height: '100%' }}>
            <h3>Guardrails, enforced in the pipeline</h3>
            <p>Not policies in a prompt, hard routing in the code path every ticket takes.</p>
            <div className="art"><Shield /></div>
            <div className="g-list">
              <div className="gl"><Lock size={15} strokeWidth={2.2} />Read-only Shopify scopes, Resolver can&rsquo;t modify your store</div>
              <div className="gl"><Scale size={15} strokeWidth={2.2} />Chargeback &amp; legal language hard-routed to a human</div>
              <div className="gl"><Check size={15} strokeWidth={2.2} />Signed DPA, your data never trains AI models</div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="g-card" style={{ height: '100%' }}>
            <h3>Built for stores that ship worldwide</h3>
            <p>Long shipping windows, customs questions, and customers in forty languages are the normal case, not the edge case.</p>
            <div className="art"><Globe /></div>
            <div className="g-list">
              <div className="gl"><Languages size={15} strokeWidth={2.2} />Replies drafted in the customer&rsquo;s language, mirrored in English</div>
              <div className="gl"><Timer size={15} strokeWidth={2.2} />Live tracking from international carriers, customs status included</div>
              <div className="gl"><Inbox size={15} strokeWidth={2.2} />Multi-store: per-store voice, policies, and lanes</div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="ana-card">
          <div>
            <h3>Watch the work happen without doing it.</h3>
            <p>
              The analytics view shows what Resolver handled, what it held for you, and
              why, per lane, per store, per week.
            </p>
          </div>
          <div className="ana-shot" role="img" aria-label="Analytics demo: tickets resolved without a human, trending up">
            <div className="ana-top">
              <span className="num"><CountUp to={1284} /></span>
              <span className="lbl">tickets resolved without a human · demo data</span>
            </div>
            <svg viewBox="0 0 520 150" fill="none">
              <line x1="0" y1="130" x2="520" y2="130" stroke="var(--line)" />
              <line x1="0" y1="85" x2="520" y2="85" stroke="var(--line)" strokeDasharray="3 5" />
              <line x1="0" y1="40" x2="520" y2="40" stroke="var(--line)" strokeDasharray="3 5" />
              <motion.path
                d="M8 122 C60 118 90 108 130 102 C180 94 210 96 250 84 C300 69 330 74 380 55 C430 37 470 30 512 22"
                stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 1.6, ease: 'easeOut' }}
              />
              <motion.circle
                cx="512" cy="22" r="4.5" fill="var(--ink)"
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: 1.5, duration: 0.3 }}
              />
            </svg>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============ pricing ============ */
function Pricing() {
  const plans = [
    {
      name: 'Solo', blurb: 'One store, one seat.', price: '$59', vol: 'Up to 300 tickets / mo',
      feats: ['Order-grounded drafts', 'Shadow + auto-send lanes', '40+ languages', 'Chargeback & legal flags'],
      cta: 'Start free', href: START, rec: false,
    },
    {
      name: 'Team', blurb: 'Growing operations.', price: '$249', vol: 'Up to 2,500 tickets / mo',
      feats: ['Everything in Solo', '3 stores · 3 seats', 'Per-store voice & policies', 'Lane analytics'],
      cta: 'Start free', href: START, rec: true,
    },
    {
      name: 'Portfolio', blurb: 'Multi-brand operators.', price: '$599', vol: 'Up to 6,000 tickets / mo',
      feats: ['Everything in Team', 'Unlimited stores · 10 seats', 'Cross-store insights', 'Priority support'],
      cta: 'Start free', href: START, rec: false,
    },
    {
      name: 'Enterprise', blurb: 'Custom contract.', price: 'Custom', vol: 'From 6,000 tickets / mo',
      feats: ['Everything in Portfolio', 'Unlimited seats', 'SSO & data residency', 'Dedicated CSM'],
      cta: 'Talk to us', href: DEMO, rec: false,
    },
  ];
  return (
    <section className="price wrap" id="pricing">
      <Reveal className="center">
        <span className="eyebrow">Pricing</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Pay for tickets, not features.</h2>
        <p className="sec-sub">Every AI feature is on every plan, you only choose ticket volume.</p>
      </Reveal>
      <div className="price-grid">
        {plans.map((p, i) => (
          <Reveal delay={i * 0.08} key={p.name}>
            <div className={p.rec ? 'plan rec' : 'plan'} style={{ height: '100%' }}>
              <div className="p-cap">
                <h3>{p.name}</h3>
                {p.rec && <span className="p-rec">Most chosen</span>}
              </div>
              <p className="p-blurb">{p.blurb}</p>
              <div className="p-price">{p.price}{p.price !== 'Custom' && <span> /mo</span>}</div>
              <div className="p-vol">{p.vol}</div>
              <div className="inc">Included</div>
              <ul>
                {p.feats.map((f) => (
                  <li key={f}><Check size={15} strokeWidth={2.4} />{f}</li>
                ))}
              </ul>
              <a className={p.rec ? 'btn' : 'btn soft'} href={p.href} style={p.rec ? undefined : { background: '#fff' }}>{p.cta}</a>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="price-note">
        Annual billing takes 20% off · full details at <a href={PRICING_FULL}>resolver.chat/pricing</a>
      </p>
    </section>
  );
}

/* ============ FAQ ============ */
const FAQS = [
  {
    q: 'Does it start sending emails as soon as I install it?',
    a: 'No. Every store starts in shadow mode: Resolver drafts, nothing sends. You review drafts against what your team would have written, then enable sending one lane at a time. The default state of every lane is off.',
  },
  {
    q: 'What happens when a customer threatens a chargeback?',
    a: 'The ticket is flagged, pulled out of every automated lane, and pushed to the top of the human queue. This routing is enforced in the pipeline itself, no setting can auto-reply to dispute or legal language.',
  },
  {
    q: 'How does it know my store’s policies?',
    a: 'During setup you provide your support SOP and policies. Every draft is constrained by them, refund windows, reshipment rules, tone. Change the policy and the next draft follows it.',
  },
  {
    q: 'What about emails it can’t match to an order?',
    a: 'Unmatched or low-confidence tickets are held for a human with everything Resolver could find attached. It never guesses an order match to force an automated reply.',
  },
  {
    q: 'Which data does Resolver access?',
    a: 'Read-only Shopify scopes (orders, customers, products, fulfillments, returns, disputes) and the support mailbox you connect. Customer data is processed under a signed DPA and never used to train AI models.',
  },
  {
    q: 'How long does setup take?',
    a: 'Installing the Shopify app, connecting Gmail, and uploading your SOP is about ten minutes. Drafting starts right after, in shadow mode, where it stays until you decide otherwise.',
  },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="faq wrap" id="faq">
      <Reveal className="center">
        <span className="eyebrow">FAQ</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Reasonable questions.</h2>
      </Reveal>
      <Reveal>
        <div className="faq-list">
          {FAQS.map((f, i) => (
            <div className={open === i ? 'faq-item open' : 'faq-item'} key={i}>
              <button
                className="faq-q"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
              >
                {f.q}
                <Plus size={18} strokeWidth={2.2} />
              </button>
              <div className="faq-a"><p>{f.a}</p></div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ============ final CTA ============ */
function Cta() {
  return (
    <section className="cta">
      <div className="wrap">
        <Reveal>
          <h2>See how Resolver handles your support, on your real tickets.</h2>
          <p>Ten minutes of setup. Nothing sends until you say so.</p>
          <div className="ctas">
            <a className="btn pri" href={START}>Start free</a>
            <a className="btn soft" href={DEMO} style={{ background: '#fff' }}>Book a demo</a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============ footer ============ */
export function Foot() {
  const cols: [string, [string, string][]][] = [
    ['Product', [
      ['How it works', '/#how'], ['Use cases', '/#detect'], ['Platform', '/#platform'],
      ['Security', '/#security'], ['Pricing', '/pricing'], ['Integrations', '/integrations'],
    ]],
    ['Company', [
      ['About', '/about'], ['Contact', '/contact'], ['FAQ', '/faq'],
    ]],
    ['Legal', [
      ['Privacy', '/privacy'], ['Terms', '/terms'], ['Cookies', '/cookies'],
    ]],
  ];
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div className="fb">
            <Brand />
            <p>AI customer support for Shopify merchants with long shipping windows.</p>
          </div>
          {cols.map(([h, links]) => (
            <div key={h}>
              <div className="fh">{h}</div>
              <ul>
                {links.map(([l, href]) => (
                  <li key={l}><a href={href}>{l}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="foot-bar">
          <span>© 2026 Resolver Ventures LLC</span>
          <span>All rights reserved</span>
        </div>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <div>
      <Nav />
      <main>
        <Hero />
        <How />
        <Integrations />
        <Detect />
        <Accordion />
        <Money />
        <BeforeAfter />
        <Stats />
        <Platform />
        <Setup />
        <Security />
        <Pricing />
        <Faq />
        <Cta />
      </main>
      <Foot />
    </div>
  );
}
