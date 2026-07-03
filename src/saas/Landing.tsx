// Resolver — marketing site. Monochrome restraint: ink on white, soft gray
// bands, borderless rounded cards, pill buttons, one neutral typeface.
// The product mockups do the selling; the octagon mark carries the only
// real color. No fabricated stats, no customer logos we don't have.
import { useState } from 'react';
import {
  ShoppingBag, Mail, Check, Plus, CircleCheck, PenLine, Inbox,
  Undo2, CreditCard, UserX, Timer, ListTree, Megaphone, BarChart3,
  Languages, Eye, Lock, Scale,
} from 'lucide-react';

const LOGO_B = '/logo/recolor/oct-bluewhite-t.png'; // blue mark — light surfaces

const START = 'https://resolver.chat/get-started';
const LOGIN = 'https://resolver.chat/login';
const DEMO = 'https://resolver.chat/contact';
const PRICING_FULL = 'https://resolver.chat/pricing';

function Brand() {
  return (
    <a className="brand" href="#top" aria-label="Resolver home">
      <img src={LOGO_B} alt="" />
      <span className="wm">resolver.chat</span>
    </a>
  );
}

/* ============ nav ============ */
function Nav() {
  return (
    <header className="nv">
      <div className="wrap nv-in">
        <Brand />
        <nav className="nv-links" aria-label="Primary">
          <a href="#how">How it works</a>
          <a href="#detect">Use cases</a>
          <a href="#features">Features</a>
          <a href="#pricing">Pricing</a>
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
          <div className="cm-row on"><span className="dot" style={{ background: 'var(--indigo)' }} />Where is my order?<span className="n">12</span></div>
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
            transit — it cleared customs this morning and should arrive within 2–3 days.
            You can track it live here: ups.com/track<br /><br />
            Best regards,<br />Diana
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
              <span className="k">ETA</span><span className="v">2–3 days</span>
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
        <h1>Your customer emails, answered from the real order.</h1>
        <p className="lede">
          Resolver matches every support email to the live Shopify order and drafts the
          reply in the customer&rsquo;s language — ready to approve, or to send on its own
          once you trust it.
        </p>
        <div className="ctas">
          <a className="btn pri" href={START}>Start free</a>
          <a className="btn soft" href={DEMO}>Book a demo</a>
        </div>
      </section>
      <div className="stage">
        <div className="wrap"><ConsoleMock /></div>
      </div>
    </>
  );
}

/* ============ how it works: 3 soft cards ============ */
function How() {
  return (
    <section className="how wrap" id="how">
      <div className="center">
        <span className="eyebrow">How it works</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Ready-to-send replies,<br />powered by your store&rsquo;s live data.</h2>
      </div>
      <div className="how-grid">
        <div className="hcard">
          <h3>Detect &amp; categorize every request</h3>
          <p>Resolver reads each inbound email and identifies what the customer actually needs — no rules to configure.</p>
          <div className="visual">
            <div className="hviz">
              <div className="l hl"><span className="sw" style={{ background: 'var(--indigo)' }} />Where is my order? <span style={{ marginLeft: 'auto', color: 'var(--tx-faint)' }}>12</span></div>
              <div className="l"><span className="sw" style={{ background: '#8A8D94' }} />Returns &amp; refunds <span style={{ marginLeft: 'auto', color: 'var(--tx-faint)' }}>4</span></div>
              <div className="l"><span className="sw" style={{ background: '#8A8D94' }} />Order changes <span style={{ marginLeft: 'auto', color: 'var(--tx-faint)' }}>3</span></div>
              <div className="l"><span className="sw" style={{ background: '#B4472F' }} />Chargeback threat <span style={{ marginLeft: 'auto', color: 'var(--tx-faint)' }}>1</span></div>
              <div className="l"><span className="sw" style={{ background: '#8A8D94' }} />Product questions <span style={{ marginLeft: 'auto', color: 'var(--tx-faint)' }}>6</span></div>
            </div>
          </div>
        </div>
        <div className="hcard">
          <h3>Pull the order &amp; tracking context automatically</h3>
          <p>Order, fulfillment, customer history, live carrier events — everything needed to resolve the issue, attached to the ticket.</p>
          <div className="visual">
            <div className="hviz">
              <div className="kv2">Order <b>#1042 · $189.00</b></div>
              <div className="kv2">Status <b>Fulfilled</b></div>
              <div className="kv2">Carrier <b>UPS · In transit</b></div>
              <div className="kv2">Customs <b>Cleared</b></div>
              <div className="kv2">ETA <b>2–3 days</b></div>
            </div>
          </div>
        </div>
        <div className="hcard">
          <h3>Draft a personal reply in their language</h3>
          <p>Written in your store&rsquo;s tone, grounded in the real data, in the customer&rsquo;s own language. You approve — or automate it.</p>
          <div className="visual">
            <div className="hviz">
              <div className="l" style={{ paddingLeft: 4, color: 'var(--tx-faint)', fontSize: 11 }}>DE · inbound</div>
              <div className="bubble">Wo ist meine Bestellung? Es sind schon 9 Tage…</div>
              <div className="l" style={{ paddingLeft: 4, color: 'var(--tx-faint)', fontSize: 11, marginTop: 6 }}>DE · drafted reply</div>
              <div className="bubble">Hallo Lena — deine Bestellung #2087 ist unterwegs und kommt in 2–3 Tagen an. Hier ist dein Live-Tracking…</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ integrations ============ */
function Integrations() {
  return (
    <section className="ints wrap">
      <div className="ints-card">
        <div className="tx">
          <h3>Connected to the tools already running your store</h3>
          <p>Customer, order, and delivery data pulled automatically — so every reply is grounded in what actually happened.</p>
        </div>
        <div className="apps">
          <div className="appic"><span className="tile"><ShoppingBag size={24} strokeWidth={1.8} /></span>Shopify</div>
          <div className="appic"><span className="tile"><Mail size={24} strokeWidth={1.8} /></span>Gmail</div>
          <div className="appic"><span className="tile"><Timer size={24} strokeWidth={1.8} /></span>Tracking</div>
          <div className="appic"><span className="tile"><Languages size={24} strokeWidth={1.8} /></span>40+ languages</div>
        </div>
      </div>
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
        <div className="detect-stage" aria-label={`Detecting requests like ${PILLS.join(', ')} before they escalate`}>
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
        <p className="detect-sub">Chargeback and legal language is never auto-replied — it goes straight to a human.</p>
      </div>
    </section>
  );
}

/* ============ money section ============ */
function Money() {
  return (
    <section className="money wrap">
      <div className="center">
        <span className="eyebrow">Why it matters</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Slow support isn&rsquo;t just slow.<br />It&rsquo;s silently costing you money.</h2>
      </div>
      <div className="money-grid">
        <div className="mcard">
          <span className="mic"><Undo2 size={19} strokeWidth={2} /></span>
          <h3>Refunds you could&rsquo;ve prevented</h3>
          <p>Small delivery questions escalate into unnecessary refunds when customers are left without answers.</p>
        </div>
        <div className="mcard">
          <span className="mic"><CreditCard size={19} strokeWidth={2} /></span>
          <h3>Disputes you didn&rsquo;t see coming</h3>
          <p>Unresolved frustration quietly turns into chargebacks, complaints, and bad reviews if you don&rsquo;t answer fast.</p>
        </div>
        <div className="mcard">
          <span className="mic"><UserX size={19} strokeWidth={2} /></span>
          <h3>Customers you lost without noticing</h3>
          <p>Slow responses damage trust and reduce the chances customers ever come back.</p>
        </div>
        <div className="mcard cta" style={{ gridColumn: 'span 3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap', width: '100%' }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <h3>Ready to stop losing money to slow support?</h3>
              <p style={{ marginTop: 6 }}>Put Resolver in shadow mode tonight and judge it on its drafts.</p>
            </div>
            <a className="btn" href={START} style={{ background: '#fff', color: 'var(--ink)' }}>Start free</a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============ features: quiet 4-col ============ */
function Features() {
  const cols = [
    {
      ic: <ListTree size={19} strokeWidth={2} />, t: 'Approval & auto-send controls',
      p: 'Review replies manually, or automate specific lanes with a delay and a cancel window. Every store starts in shadow mode.',
    },
    {
      ic: <Eye size={19} strokeWidth={2} />, t: 'Action & conversation timelines',
      p: 'Every AI action is recorded — what was matched, drafted, and sent, and why. Audit everything.',
    },
    {
      ic: <Megaphone size={19} strokeWidth={2} />, t: 'Brand voice personalization',
      p: 'Replies aligned with your store’s tone, policies, and support SOP — configured per store.',
    },
    {
      ic: <BarChart3 size={19} strokeWidth={2} />, t: 'Support analytics',
      p: 'Identify recurring issues, delivery problems, and refund patterns across your inbox.',
    },
  ];
  return (
    <section className="feats wrap" id="features">
      <div className="center">
        <span className="eyebrow">Features</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>All the tools to scale support<br />without scaling your team.</h2>
      </div>
      <div className="feats-grid">
        {cols.map((c) => (
          <div className="fcol" key={c.t}>
            <span className="fic">{c.ic}</span>
            <h4>{c.t}</h4>
            <p>{c.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============ trust strip (compact, inside features rhythm) ============ */
function Trust() {
  const rows = [
    { ic: <Lock size={19} strokeWidth={2} />, t: 'Read-only Shopify access', p: 'Orders, customers, fulfillments — read scopes only. Resolver can’t modify your store.' },
    { ic: <Scale size={19} strokeWidth={2} />, t: 'Risk never gets automated', p: 'Chargeback and legal language is hard-routed to a human, enforced in the pipeline.' },
    { ic: <Inbox size={19} strokeWidth={2} />, t: 'Gmail stays yours', p: 'Replies send through your own mailbox. Turn Resolver off and nothing is held hostage.' },
    { ic: <Check size={19} strokeWidth={2} />, t: 'No training on your data', p: 'Customer data is processed under a signed DPA and never used to train AI models.' },
  ];
  return (
    <section className="feats wrap" id="security">
      <div className="center">
        <span className="eyebrow">Security &amp; data</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Built to be trusted with the inbox.</h2>
      </div>
      <div className="feats-grid">
        {rows.map((c) => (
          <div className="fcol" key={c.t}>
            <span className="fic">{c.ic}</span>
            <h4>{c.t}</h4>
            <p>{c.p}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============ pricing ============ */
function Pricing() {
  const plans = [
    {
      name: 'Solo', blurb: 'One store, one seat.', price: '$59', vol: 'Up to 300 tickets / mo',
      feats: ['1 store · 1 seat', 'All AI features included', 'Shadow + auto-send lanes'],
      cta: 'Start free', href: START, rec: false,
    },
    {
      name: 'Team', blurb: 'Growing operations.', price: '$249', vol: 'Up to 2,500 tickets / mo',
      feats: ['3 stores · 3 seats', 'Per-store voice & policies', 'Lane analytics'],
      cta: 'Start free', href: START, rec: true,
    },
    {
      name: 'Portfolio', blurb: 'Multi-brand operators.', price: '$599', vol: 'Up to 6,000 tickets / mo',
      feats: ['Unlimited stores · 10 seats', 'Cross-store insights', 'Priority support'],
      cta: 'Start free', href: START, rec: false,
    },
    {
      name: 'Enterprise', blurb: 'Custom contract.', price: 'Custom', vol: 'Unlimited volume',
      feats: ['Unlimited stores & seats', 'SSO & data residency', 'Dedicated CSM'],
      cta: 'Talk to us', href: DEMO, rec: false,
    },
  ];
  return (
    <section className="price wrap" id="pricing">
      <div className="center">
        <span className="eyebrow">Pricing</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Priced by ticket volume. Nothing else.</h2>
        <p className="sec-sub">Every AI feature is on every plan — tiers only change stores, seats, and volume.</p>
      </div>
      <div className="price-grid">
        {plans.map((p) => (
          <div className={p.rec ? 'plan rec' : 'plan'} key={p.name}>
            <div className="p-cap">
              <h3>{p.name}</h3>
              {p.rec && <span className="p-rec">Most chosen</span>}
            </div>
            <p className="p-blurb">{p.blurb}</p>
            <div className="p-price">{p.price}{p.price !== 'Custom' && <span> /mo</span>}</div>
            <div className="p-vol">{p.vol}</div>
            <ul>
              {p.feats.map((f) => (
                <li key={f}><Check size={15} strokeWidth={2.4} />{f}</li>
              ))}
            </ul>
            <a className={p.rec ? 'btn' : 'btn soft'} href={p.href} style={p.rec ? undefined : { background: '#fff' }}>{p.cta}</a>
          </div>
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
    a: 'The ticket is flagged, pulled out of every automated lane, and pushed to the top of the human queue. This routing is enforced in the pipeline itself — no setting can auto-reply to dispute or legal language.',
  },
  {
    q: 'How does it know my store’s policies?',
    a: 'During setup you provide your support SOP and policies. Every draft is constrained by them — refund windows, reshipment rules, tone. Change the policy and the next draft follows it.',
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
    a: 'Installing the Shopify app, connecting Gmail, and uploading your SOP is about ten minutes. Drafting starts right after — in shadow mode, where it stays until you decide otherwise.',
  },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="faq wrap" id="faq">
      <div className="center">
        <span className="eyebrow">FAQ</span>
        <h2 className="sec-h2" style={{ marginTop: 18 }}>Reasonable questions.</h2>
      </div>
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
    </section>
  );
}

/* ============ final CTA ============ */
function Cta() {
  return (
    <section className="cta">
      <div className="wrap">
        <h2>See how Resolver handles your support, on your real tickets.</h2>
        <p>Ten minutes of setup. Nothing sends until you say so.</p>
        <div className="ctas">
          <a className="btn pri" href={START}>Start free</a>
          <a className="btn soft" href={DEMO} style={{ background: '#fff' }}>Book a demo</a>
        </div>
      </div>
    </section>
  );
}

/* ============ footer ============ */
function Foot() {
  const cols: [string, [string, string][]][] = [
    ['Product', [
      ['How it works', '#how'], ['Use cases', '#detect'], ['Features', '#features'],
      ['Pricing', '#pricing'], ['FAQ', '#faq'],
    ]],
    ['Company', [
      ['About', 'https://resolver.chat/about'], ['Contact', 'https://resolver.chat/contact'],
      ['Blog', 'https://resolver.chat/blog'],
    ]],
    ['Legal', [
      ['Privacy', 'https://resolver.chat/privacy'], ['Terms', 'https://resolver.chat/terms'],
      ['Cookies', 'https://resolver.chat/cookies'],
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
        <Money />
        <Features />
        <Trust />
        <Pricing />
        <Faq />
        <Cta />
      </main>
      <Foot />
    </div>
  );
}
