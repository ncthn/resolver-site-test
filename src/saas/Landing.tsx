// Resolver, marketing site. Monochrome restraint: ink on white, soft gray
// bands, borderless rounded cards, pill buttons, one neutral typeface.
// Animation language: blurred fade-up scroll reveals, looping in-card motion,
// an auto-advancing accordion with staggered visuals, a spinning wireframe
// globe, a dashed shield, and a draw-in analytics chart with a count-up.
// All honest: product-UI demos, no invented company metrics.
//
// Story of the page: supervised automation that earns the right to send.
// Draft-only first, lanes go live one category at a time, risk is hard-routed
// to a human, every action is on the record. Lead with the controls, then show
// the work, then the guardrails. The "AI writes your emails" pitch is the
// commodity; the control plane is the product.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useEffect as useCrispEffect } from 'react'
import { setSupportChat } from '../crisp'
import { motion, useInView } from 'motion/react';
import {
  Check, Plus, CircleCheck, PenLine, Inbox,
  Undo2, CreditCard, Timer, ListTree, Megaphone, BarChart3,
  Languages, Eye, Lock, Scale, X, ArrowRight, FileSearch, GitBranch,
  SlidersHorizontal, BellRing, Gavel, SearchX, ShieldAlert, Power,
} from 'lucide-react';

const LOGO = '/logo/recolor/oct-black-t.png';

const START = '/get-started';
const LOGIN = '/app';
// Cal.com, not the contact page. Every "Book a demo" pointed at /contact, so a visitor
// ready to talk had to fill a form and then wait for someone to answer it. This is the
// booking page itself: they pick a slot and it is done.
//
// A plain link rather than Cal's popup embed, deliberately. The embed is a vendor script
// on every page load for a button most visitors never press, and this page's job is to
// load fast. If demo volume ever justifies the inline experience, the popup is a drop-in
// upgrade from here.
const DEMO = 'https://cal.com/ops-only-upg4tp/30min';
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
          <a href="/#controls">Controls</a>
          <a href="/#guardrails">Guardrails</a>
          <a href="/#platform">Platform</a>
          <a href="/#security">Security</a>
          <a href="/pricing">Pricing</a>
        </nav>
        <div className="nv-cta">
          <a className="login" href={LOGIN}>Log in</a>
          <a className="btn soft sm demo" href={DEMO} target="_blank" rel="noopener noreferrer">Book a demo</a>
          <a className="btn pri sm" href={START}>Start in draft-only mode</a>
        </div>
      </div>
    </header>
  );
}

/* ============ hero + product shot ============ */
function ConsoleMock() {
  return (
    <div className="shot" role="img" aria-label="The Resolver inbox: a ticket matched to its Shopify order, a draft held in draft-only mode, waiting for approval">
      <div className="shot-bar"><i /><i /><i /><span className="addr">app.resolver.chat</span><span className="shot-mode">Draft-only mode · 0 sent today</span></div>
      <div className="console-mock">
        <aside className="cm-side">
          <div className="hd">Inbox</div>
          <div className="cm-row on"><span className="dot" style={{ background: 'var(--ink)' }} />Where is my order?<span className="n">12</span></div>
          <div className="cm-row"><span className="dot" style={{ background: '#8A8D94' }} />Returns &amp; refunds<span className="n">4</span></div>
          <div className="cm-row"><span className="dot" style={{ background: '#8A8D94' }} />Order changes<span className="n">3</span></div>
          <div className="cm-row"><span className="dot" style={{ background: '#8A8D94' }} />Product questions<span className="n">6</span></div>
          <div className="cm-row"><span className="dot" style={{ background: '#B4472F' }} />Held for a human<span className="n">1</span></div>
          <div className="hd" style={{ marginTop: 14 }}>Store</div>
          <div className="cm-row">Lanes</div>
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
              <div className="d">Same email as the order, two previous orders</div>
            </div>
          </div>
          <div className="cm-ev">
            <span className="ic ok"><CircleCheck size={13} strokeWidth={2.4} /></span>
            <div>
              <div className="t">Order #1042 attached<span>9:14:10</span></div>
              <div className="d">Ana Coat Beige · $189.00 · fulfilled Jun 24</div>
            </div>
          </div>
          <div className="cm-ev">
            <span className="ic ok"><CircleCheck size={13} strokeWidth={2.4} /></span>
            <div>
              <div className="t">Carrier scan: in transit<span>9:14:15</span></div>
              <div className="d">1Z999AA10123456784 (UPS) · customs cleared this morning</div>
            </div>
          </div>
          <div className="cm-ev">
            <span className="ic ai"><PenLine size={12} strokeWidth={2.4} /></span>
            <div>
              <div className="t">Draft written, held for approval<span>9:14:22</span></div>
              <div className="d">Lane: Where is my order · draft-only · sanity check passed</div>
            </div>
          </div>
          <div className="cm-draft">
            Hi Sarah,<br /><br />
            Thanks for checking in. Your order shipped and is on its way: it cleared
            customs this morning and should be with you in 2 to 3 days. You can follow
            it here: ups.com/track<br /><br />
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
            <div className="hd">Lane</div>
            <div className="cm-kv" style={{ marginTop: 10 }}>
              <span className="k">Category</span><span className="v">Where is my order</span>
              <span className="k">Mode</span><span className="v"><span className="pill-tr">Draft only</span></span>
              <span className="k">Cancel window</span><span className="v">30s when live</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="hero2 wrap" id="top">
      <div className="hero2-copy">
        <motion.span
          className="eyebrow"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
        >For Shopify stores</motion.span>
        <motion.h1
          initial={{ opacity: 0, y: 18, filter: 'blur(7px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.65, delay: 0.06, ease: [0.2, 0.7, 0.2, 1] }}
        >
          Support automation that <em>earns</em> the right to send.
        </motion.h1>
        <motion.p
          className="lede"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
        >
          Resolver reads each support email, attaches the Shopify order and the carrier&rsquo;s
          last scan, and writes the reply in the customer&rsquo;s language. It starts in
          draft-only mode. You switch sending on per category, once its drafts match what
          you would have sent yourself.
        </motion.p>
        <motion.div
          className="ctas"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.24 }}
        >
          <a className="btn pri" href={START}>Start in draft-only mode</a>
          <a className="btn soft" href={DEMO} target="_blank" rel="noopener noreferrer">Book a demo</a>
        </motion.div>
        <motion.span
          className="hero2-note"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.34 }}
        >Ten minutes to the first draft. Zero emails sent until you flip a lane.</motion.span>
      </div>
      <motion.div
        className="hero2-vis"
        initial={{ opacity: 0, x: 44 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
      >
        <ConsoleMock />
      </motion.div>
    </section>
  );
}

/* ============ controls: the trust ladder (auto-advancing accordion) ============ */
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
    t: 'Draft-only mode first',
    p: 'Every store starts here. Resolver drafts every reply and sends none of them. You read its drafts next to what your team would have written, and count how often you would have changed a word.',
    viz: (
      <div className="acc-shot" key="a">
        <Rows rows={[
          ['Where is my order? · #4471', <span className="st draft" key="1">Draft ready</span>],
          ['Refund request · #4468', <span className="st draft" key="2">Draft ready</span>],
          ['Address change · #4465', <span className="st draft" key="3">Draft ready</span>],
          [<span key="l">Sent without a human</span>, <b key="4">0 · draft-only mode</b>],
        ]} />
      </div>
    ),
  },
  {
    t: 'Live, one category at a time',
    p: 'Switch sending on per category, per store. Where-is-my-order can go live while returns stay draft-only. Every automated send waits out a cancel window you set, and one click pulls it back.',
    viz: (
      <div className="acc-shot" key="b">
        <Rows rows={[
          ['Where is my order', <span className="st live" key="1">Live · 30s window</span>],
          ['Returns', <span className="st shadow" key="2">Draft only</span>],
          ['Order changes', <span className="st shadow" key="3">Draft only</span>],
          ['Disputes', <span className="st human" key="4">Human only</span>],
        ]} />
      </div>
    ),
  },
  {
    t: 'Risk never goes live',
    p: 'Chargeback, dispute, and legal language is pulled out of every lane and pushed to the top of the human queue. This is routing in the pipeline, not a line in a prompt, so no setting can override it.',
    viz: (
      <div className="acc-shot" key="c">
        <Rows rows={[
          ['“I’m disputing this with my bank”', <span className="st human" key="1">Flagged</span>],
          [<span key="l1">Removed from every lane</span>, <b key="2">✓</b>],
          [<span key="l2">Top of the human queue</span>, <b key="3">✓</b>],
          [<span key="l3">Automated replies on this thread</span>, <b key="4">Blocked</b>],
        ]} />
      </div>
    ),
  },
  {
    t: 'Every action on the record',
    p: 'What was sent, when, on which lane, and the order, scan, and policy line the draft was built on. Audit the machine the way you would audit a new hire.',
    viz: (
      <div className="acc-shot" key="d">
        <Rows rows={[
          [<span key="l1">9:14:03</span>, <b key="1">Customer matched</b>],
          [<span key="l2">9:14:10</span>, <b key="2">Order #1042 attached</b>],
          [<span key="l3">9:14:22</span>, <b key="3">Draft written · Where is my order</b>],
          [<span key="l4">9:15:02</span>, <b key="4">Sent after the 30s window</b>],
        ]} />
      </div>
    ),
  },
];

function Controls() {
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
    <section className="acc wrap" id="controls">
      <Reveal className="center">
        <span className="eyebrow">Control</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Nothing sends<br />until a lane earns it.</h2>
        <p className="sec-sub">Four rules, enforced in the product, not promised in a deck. This is the order you will meet them in.</p>
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

/* ============ ledger: one ticket, every step on the record ============ */
const LEDGER: [string, string, string, 'ok' | 'draft' | 'hold'][] = [
  ['9:14:03', 'Email received', '“Wo ist meine Bestellung? Es sind schon 9 Tage.” · language: German', 'ok'],
  ['9:14:04', 'Category: Where is my order', 'Lane for this store is draft-only', 'ok'],
  ['9:14:06', 'Customer matched by email', 'Two previous orders, no open returns', 'ok'],
  ['9:14:10', 'Order #2087 attached', 'Fulfilled Jun 24 · Ana Coat Beige · $189.00', 'ok'],
  ['9:14:15', 'Carrier checked', 'UPS · in transit · customs cleared this morning', 'ok'],
  ['9:14:18', 'Policy applied', 'Your SOP: delivery window 8 to 14 days, reshipment after 21', 'ok'],
  ['9:14:22', 'Draft written in German, mirrored in English', 'Sanity check against order and policy: passed', 'draft'],
  ['now', 'Waiting for a human', 'Nothing was sent. The draft is in your review queue.', 'hold'],
];
const LEDGER_LABEL = { ok: 'Done', draft: 'Draft ready', hold: 'Held' } as const;

function Ledger() {
  return (
    <section className="ledger wrap" id="ledger">
      <Reveal className="center">
        <span className="eyebrow">One ticket</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>What happens to one email,<br />step by step.</h2>
        <p className="sec-sub">Nineteen seconds of work, every line written to the automation log. Demo data, real sequence.</p>
      </Reveal>
      <Reveal>
        <div className="gs-card">
          <div className="gs-l">
            <h3>No step skipped. No step hidden.</h3>
            <p>
              Resolver never writes a reply it cannot back with an order, a carrier scan, or a
              line from your policy. When it cannot tie the email to an order with evidence, it
              stops and hands you what it found.
            </p>
            <a href="#guardrails">What it refuses to automate <ArrowRight size={15} strokeWidth={2.2} /></a>
          </div>
          <div className="ledger-card" role="img" aria-label="Automation log for one ticket: received, categorized, customer matched, order attached, carrier checked, policy applied, draft written, held for a human">
            {LEDGER.map(([t, e, d, s], i) => (
              <div className="lrow" key={t + e} style={{ ['--i' as string]: i }}>
                <span className="t">{t}</span>
                <span className="e">{e}<span>{d}</span></span>
                <span className={`st ${s}`}>{LEDGER_LABEL[s]}</span>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ============ guardrails: what never gets an automated answer ============ */
function Guardrails() {
  const rails = [
    {
      ic: <CreditCard size={19} strokeWidth={2} />,
      t: 'Chargeback and dispute language',
      p: '“I am disputing this with my bank.” The thread is pulled out of every lane, flagged, and pushed to the top of the human queue.',
      out: 'Automated replies blocked',
    },
    {
      ic: <Gavel size={19} strokeWidth={2} />,
      t: 'Legal and regulator language',
      p: 'A lawyer, a consumer authority, a formal complaint. Same rail, same outcome: automation stops for that thread and a person picks it up.',
      out: 'Routed to a human',
    },
    {
      ic: <SearchX size={19} strokeWidth={2} />,
      t: 'No order match',
      p: 'If the email cannot be tied to an order with evidence, Resolver holds it with everything it found attached. It never guesses a match to force a reply.',
      out: 'Held with context',
    },
    {
      ic: <ShieldAlert size={19} strokeWidth={2} />,
      t: 'Drafts that fail the check',
      p: 'Every draft is checked against the order and your policy before it can be approved or sent. A draft that promises what the policy does not allow is held.',
      out: 'Held for review',
    },
  ];
  return (
    <section className="guard wrap" id="guardrails">
      <Reveal className="center">
        <span className="eyebrow">Guardrails</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Some emails must never<br />get an automated answer.</h2>
        <p className="sec-sub">These rules run in the pipeline on every ticket, for every store. There is no setting that turns them off.</p>
      </Reveal>
      <div className="guard-grid">
        {rails.map((r, i) => (
          <Reveal delay={i * 0.08} key={r.t}>
            <div className="gcard" style={{ height: '100%' }}>
              <span className="mic">{r.ic}</span>
              <h3>{r.t}</h3>
              <p>{r.p}</p>
              <span className="out"><Lock size={13} strokeWidth={2.4} />{r.out}</span>
            </div>
          </Reveal>
        ))}
      </div>
      <Reveal delay={0.2}>
        <div className="guard-kill">
          <div>
            <h3>And one switch stops everything.</h3>
            <p>A single setting per store halts all automated sending, immediately. Drafting continues so nothing piles up unread.</p>
          </div>
          <span className="btn" style={{ background: '#fff', color: 'var(--ink)', cursor: 'default' }}><Power size={15} strokeWidth={2.4} />Kill switch</span>
        </div>
      </Reveal>
    </section>
  );
}

/* ============ before / with resolver ============ */
function BeforeAfter() {
  const before: string[] = [
    'Open the inbox to 40 unread tickets and triage them by hand',
    'Tab between Gmail, Shopify, and the carrier site for every reply',
    'Paste a half-personalized template and hope the tone lands',
    'Miss the one email that quietly mentions a bank dispute',
    'Answer German customers through a translator tab',
  ];
  const after: string[] = [
    'Every ticket already categorized, matched to its order, and drafted',
    'Order, carrier scan, and history attached to the conversation',
    'Replies in your store’s voice, checked against your policy',
    'Dispute language flagged and routed to you before anything else',
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

/* ============ platform: drafting engine + control plane ============ */
function Platform() {
  const engine = [
    { ic: <FileSearch size={17} strokeWidth={2} />, t: 'Order matching', p: 'Order number first, customer email second, with the evidence shown on the ticket.' },
    { ic: <Languages size={17} strokeWidth={2} />, t: '40+ languages', p: 'Drafted in the customer’s language, mirrored in English so you can review it.' },
    { ic: <Timer size={17} strokeWidth={2} />, t: 'Carrier scans', p: 'The last scan and customs status, folded into the reply as facts, not guesses.' },
    { ic: <ListTree size={17} strokeWidth={2} />, t: 'Policy grounding', p: 'Your SOP constrains every draft: delivery windows, refund rules, reshipment terms.' },
    { ic: <Megaphone size={17} strokeWidth={2} />, t: 'Store voice', p: 'Tone set per store, from plain to formal. Multi-brand operators keep them apart.' },
    { ic: <BarChart3 size={17} strokeWidth={2} />, t: 'Lane reports', p: 'What each lane handled alone, what it held for you, per store, per week.' },
  ];
  const control = [
    { ic: <Eye size={17} strokeWidth={2} />, t: 'Review queue', p: 'Every draft readable, editable, and approvable before it leaves.' },
    { ic: <GitBranch size={17} strokeWidth={2} />, t: 'Send lanes', p: 'Off, draft-only, live. Switched per category, per store.' },
    { ic: <Undo2 size={17} strokeWidth={2} />, t: 'Cancel window', p: 'Automated sends wait out a delay you set; one click pulls them back.' },
    { ic: <BellRing size={17} strokeWidth={2} />, t: 'Risk rail', p: 'Chargeback, dispute, and legal language always routes to a human.' },
    { ic: <SlidersHorizontal size={17} strokeWidth={2} />, t: 'Kill switch', p: 'One setting stops all automated sending for the store, immediately.' },
    { ic: <Inbox size={17} strokeWidth={2} />, t: 'Automation log', p: 'What was sent, when, on which lane, and on what evidence.' },
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
            <h3>One drafting engine. Anchored to the order.</h3>
            <p>Everything the model writes is tied to data it can cite on the ticket. Never a template, never a guess.</p>
            <a href="#ledger">Follow one ticket through it <ArrowRight size={15} strokeWidth={2.2} /></a>
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
            <p>Autonomy is granted lane by lane, and revoked in one click.</p>
            <a href={START}>Start in draft-only mode <ArrowRight size={15} strokeWidth={2.2} /></a>
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

/* ============ guarantees ============ */
function Guarantees() {
  const stats = [
    { v: '0', k: 'emails sent by default. Every store, every lane, starts in draft-only mode' },
    { v: '40+', k: 'languages detected, with the reply drafted in the customer’s own language' },
    { v: '30s', k: 'cancel window on every automated send. One click pulls it back' },
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
            <h3>Product guarantees.<br />Not benchmarks.</h3>
            <p>
              None of the numbers on the right is a customer result. They are how the product
              behaves, on every plan, from the first minute. The lanes, the window, the
              languages: that is how you keep the machine on a leash while it does the work.
            </p>
            <a className="btn pri" href={DEMO} target="_blank" rel="noopener noreferrer">See it on your tickets</a>
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

/* ============ setup timeline ============ */
function Setup() {
  const steps = [
    { when: 'Today', t: 'Install the Shopify app', p: 'One-click install from the App Store. Read-only scopes.' },
    { when: '+5 min', t: 'Connect Gmail', p: 'Your existing support mailbox. Replies send as you.' },
    { when: '+10 min', t: 'Upload your SOP', p: 'Policies, delivery windows, tone. Every draft follows it.' },
    { when: 'Week 1', t: 'Flip your first lane live', p: 'After a week of reading drafts, switch on where-is-my-order.' },
  ];
  return (
    <section className="setup wrap">
      <Reveal className="center">
        <span className="eyebrow">Setup</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Set up once. Supervised for good.</h2>
        <p className="sec-sub">Ten minutes to the first draft. Nothing sends until you decide it should.</p>
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
            <p>Not policies in a prompt. Hard routing in the code path every ticket takes.</p>
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
            <p>Long delivery windows, customs questions, and customers in forty languages are the normal case, not the edge case.</p>
            <div className="art"><Globe /></div>
            <div className="g-list">
              <div className="gl"><Languages size={15} strokeWidth={2.2} />Replies drafted in the customer&rsquo;s language, mirrored in English</div>
              <div className="gl"><Timer size={15} strokeWidth={2.2} />Live scans from international carriers, customs status included</div>
              <div className="gl"><Inbox size={15} strokeWidth={2.2} />Multi-store: per-store voice, policies, and lanes</div>
            </div>
          </div>
        </Reveal>
        <Reveal delay={0.1} className="ana-card">
          <div>
            <h3>Watch the work happen without doing it.</h3>
            <p>
              The lane report shows what Resolver handled alone, what it held for you, and
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
      feats: ['Order-grounded drafts', 'Draft-only + live lanes', '40+ languages', 'Chargeback & legal rail'],
      cta: 'Start in draft-only mode', href: START, rec: false,
    },
    {
      name: 'Team', blurb: 'Growing operations.', price: '$249', vol: 'Up to 2,500 tickets / mo',
      feats: ['Everything in Solo', '3 stores · 3 seats', 'Per-store voice & policies', 'Lane reports'],
      cta: 'Start in draft-only mode', href: START, rec: true,
    },
    {
      name: 'Portfolio', blurb: 'Multi-brand operators.', price: '$599', vol: 'Up to 6,000 tickets / mo',
      feats: ['Everything in Team', 'Unlimited stores · 10 seats', 'Cross-store insights', 'Priority support'],
      cta: 'Start in draft-only mode', href: START, rec: false,
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
        <p className="sec-sub">Every control is on every plan. You only choose ticket volume.</p>
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
    a: 'No. Every store starts in draft-only mode: Resolver drafts, nothing sends. You review drafts against what your team would have written, then enable sending one lane at a time. The default state of every lane is off.',
  },
  {
    q: 'What happens when a customer threatens a chargeback?',
    a: 'The ticket is flagged, pulled out of every automated lane, and pushed to the top of the human queue. This routing is enforced in the pipeline itself. No setting can auto-reply to dispute or legal language.',
  },
  {
    q: 'How do I know a lane is ready to go live?',
    a: 'Read its drafts for a week in draft-only mode and count how many you would have sent unchanged. When that number is high enough for you, switch the lane to live. If it drops, switch it back. Nothing about the decision is hidden or automatic.',
  },
  {
    q: 'How does it know my store’s policies?',
    a: 'During setup you provide your support SOP and policies. Every draft is constrained by them: delivery windows, refund rules, reshipment terms, tone. Change the policy and the next draft follows it.',
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
    a: 'Installing the Shopify app, connecting Gmail, and uploading your SOP is about ten minutes. Drafting starts right after, in draft-only mode, where it stays until you decide otherwise.',
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
          <h2>Put it in draft-only mode tonight. Judge it on tomorrow&rsquo;s drafts.</h2>
          <p>Ten minutes of setup. Nothing sends until you flip a lane.</p>
          <div className="ctas">
            <a className="btn pri" href={START}>Start in draft-only mode</a>
            <a className="btn soft" href={DEMO} target="_blank" rel="noopener noreferrer" style={{ background: '#fff' }}>Book a demo</a>
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
      ['Controls', '/#controls'], ['Guardrails', '/#guardrails'], ['Platform', '/#platform'],
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
            <p>Supervised AI support for Shopify stores that ship worldwide.</p>
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
  // A visitor with a question is exactly who a support bubble is for, so the marketing
  // site shows it unconditionally.
  useCrispEffect(() => { setSupportChat(true) }, [])

  return (
    <div>
      <Nav />
      <main>
        <Hero />
        <Controls />
        <Ledger />
        <Guardrails />
        <BeforeAfter />
        <Platform />
        <Guarantees />
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
