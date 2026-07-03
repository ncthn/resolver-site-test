// Resolver — marketing site, "engineering document" direction.
// Ink + cool paper, the octagon's indigo as the only accent, IBM Plex Mono
// microlabels indexing every section, hairline rules, rectangular buttons.
// Schibsted Grotesk display · Instrument Sans body. No fabricated stats,
// no customer logos we don't have — serious means honest.
import { useState } from 'react';
import { motion } from 'motion/react';
import {
  ShoppingBag, Mail, GitBranch, Languages, ShieldAlert,
  FileSearch, Check, Plus, Inbox, Scale, Eye,
  PackageSearch, PenLine, SlidersHorizontal, BellRing, LineChart, Lock,
} from 'lucide-react';

const LOGO_B = '/logo/recolor/oct-bluewhite-t.png'; // blue mark — light surfaces
const LOGO_W = '/logo/recolor/oct-whiteblue-t.png'; // white mark — dark surfaces

const START = 'https://resolver.chat/get-started';
const LOGIN = 'https://resolver.chat/login';
const DEMO = 'https://resolver.chat/contact';
const PRICING_FULL = 'https://resolver.chat/pricing';

/* One reveal treatment, used everywhere: restrained fade-up on scroll. */
const rise = {
  initial: { y: 18 },
  whileInView: { y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: [0.2, 0.7, 0.2, 1] as const },
};

function Idx({ n, t }: { n: string; t: string }) {
  return (
    <div className="idx">
      <span className="n">{n}</span>
      <span className="t">{t}</span>
    </div>
  );
}

function Brand({ onInk = false }: { onInk?: boolean }) {
  return (
    <a className="brand" href="#top" aria-label="Resolver home">
      <img src={onInk ? LOGO_W : LOGO_B} alt="" />
      <span className="wm" style={onInk ? { color: 'var(--dk-tx)' } : undefined}>
        resolver<i>.chat</i>
      </span>
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
          <a href="#platform">Platform</a>
          <a href="#security">Security</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
        </nav>
        <div className="nv-cta">
          <a className="login" href={LOGIN}>Log in</a>
          <a className="btn sec sm" href={DEMO}>Book a demo</a>
          <a className="btn pri sm" href={START}>Start free</a>
        </div>
      </div>
    </header>
  );
}

/* ============ hero ============ */
function ResolutionRecord() {
  return (
    <motion.div
      className="rr"
      initial={{ y: 24 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, delay: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
      aria-label="Example of a resolved ticket"
    >
      <div className="rr-top">
        <span className="id">TICKET #4471 · SARAH K. · EN-US</span>
        <span className="st">Resolved</span>
      </div>
      <div className="rr-body">
        <p className="rr-msg">
          <b>Where is my order?</b> — &ldquo;It&rsquo;s been 9 days and nothing has arrived.
          I&rsquo;m starting to think this shop is a scam.&rdquo;
        </p>
        <div className="rr-order">
          <div className="kv">
            <span className="k">Order</span><span className="v">#1042 · 2 items · $74.00</span>
            <span className="k">Carrier</span><span className="v">DHL · <em>in transit</em> · customs cleared</span>
            <span className="k">Est. delivery</span><span className="v">2–3 days</span>
          </div>
        </div>
        <div className="rr-draft">
          Hi Sarah — your order #1042 cleared customs this morning and is with DHL for
          final delivery, estimated in 2–3 days. Here&rsquo;s your live tracking link.
          Sorry for the wait.
        </div>
      </div>
      <div className="rr-foot">
        <span className="lane">Auto-send</span>
        <span className="hold">Cancel window 30s</span>
        <span className="tm">matched on order # · confidence high</span>
      </div>
    </motion.div>
  );
}

function Hero() {
  return (
    <section className="hero" id="top">
      <div className="wrap hero-grid">
        <div>
          <div>
            <span className="mono acc">AI support operations · Shopify</span>
          </div>
          <motion.h1
            initial={{ y: 16 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.2, 0.7, 0.2, 1] }}
          >
            Support that reads the order <span className="u">before it answers.</span>
          </motion.h1>
          <motion.p
            className="lede"
            initial={{ y: 14 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: [0.2, 0.7, 0.2, 1] }}
          >
            Resolver matches every customer email to the live Shopify order, drafts the
            reply in the customer&rsquo;s language, and holds anything risky for a human.
            You approve — or turn on auto-send one lane at a time.
          </motion.p>
          <motion.div
            className="ctas"
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, delay: 0.24 }}
          >
            <a className="btn pri" href={START}>Start free</a>
            <a className="btn sec" href={DEMO}>Book a demo</a>
          </motion.div>
          <div className="fine">
            <span>Shadow mode by default</span>
            <span>No reply sent without your rules</span>
          </div>
        </div>
        <ResolutionRecord />
      </div>
      <div className="wrap ints">
        <div className="ints-in">
          <span className="cap">Runs on</span>
          <span className="it"><ShoppingBag size={16} strokeWidth={2.2} />Shopify Admin</span>
          <span className="it"><Mail size={16} strokeWidth={2.2} />Gmail</span>
          <span className="it"><PackageSearch size={16} strokeWidth={2.2} />Live carrier tracking</span>
          <span className="it"><Languages size={16} strokeWidth={2.2} />40+ languages</span>
        </div>
      </div>
    </section>
  );
}

/* ============ detection ticker ============ */
const DETECT = [
  'Where is my order?', 'Address change', 'Cancellation request', 'Refund demand',
  'Tracking not updating', 'Damaged on arrival', 'Wrong size received', 'Customs fee dispute',
  'Duplicate order', 'Payment question', 'Return request', 'Order never arrived',
];
const DETECT_RISK = ['Chargeback threat', 'Legal threat'];

function Ticker() {
  const rowA = [...DETECT.slice(0, 6), DETECT_RISK[0], ...DETECT.slice(6, 9)];
  const rowB = [...DETECT.slice(9), DETECT_RISK[1], ...DETECT.slice(0, 5)];
  const Chip = ({ label }: { label: string }) => (
    <span className={DETECT_RISK.includes(label) ? 'tick-chip risk' : 'tick-chip'}>
      <b aria-hidden="true" />{label}
    </span>
  );
  return (
    <section className="tick">
      <motion.div className="wrap" {...rise}>
        <Idx n="01" t="Detection" />
        <h2 className="sec-h2">Every request classified<br />before it escalates.</h2>
        <p className="sec-sub">
          Resolver reads each inbound email, identifies what the customer actually needs,
          and routes it — including the two categories that must never get an automated
          reply.
        </p>
      </motion.div>
      <div className="tick-rail" aria-hidden="true">
        <div className="tick-row">
          {[...rowA, ...rowA].map((l, i) => <Chip key={`a${i}`} label={l} />)}
        </div>
        <div className="tick-row rev">
          {[...rowB, ...rowB].map((l, i) => <Chip key={`b${i}`} label={l} />)}
        </div>
      </div>
    </section>
  );
}

/* ============ how it works ============ */
function How() {
  const steps = [
    {
      n: 'STEP 01', t: 'Match', ic: <FileSearch size={19} strokeWidth={2} />,
      p: 'Each email is matched to the Shopify order — by order number, then by customer email — and enriched with fulfillment status and live carrier tracking.',
    },
    {
      n: 'STEP 02', t: 'Draft', ic: <PenLine size={19} strokeWidth={2} />,
      p: 'Resolver writes the reply in the customer’s language, grounded in the real order data and your store’s policies — not a template, not a guess.',
    },
    {
      n: 'STEP 03', t: 'Decide', ic: <GitBranch size={19} strokeWidth={2} />,
      p: 'The draft lands in a lane you control: hold for approval, or auto-send with a delay and a cancel window. Risky tickets always escalate to a human.',
    },
  ];
  return (
    <section className="steps" id="how">
      <motion.div className="wrap" {...rise}>
        <Idx n="02" t="How it works" />
        <h2 className="sec-h2">Match. Draft. Decide.</h2>
        <p className="sec-sub">
          Three stages, each one inspectable. You can read exactly why every reply says
          what it says.
        </p>
        <div className="steps-grid">
          {steps.map((s) => (
            <div className="step" key={s.t}>
              <span className="sn">{s.n}</span>
              <h3>{s.t}</h3>
              <p>{s.p}</p>
              <div className="sic">{s.ic}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

/* ============ cost of silence (dark) ============ */
function Cost() {
  const cols = [
    {
      n: 'FAILURE 01', t: 'WISMO becomes a refund',
      p: 'A "where is my order?" left unanswered for days turns into a refund demand — for a package that was already on the truck. The money was never at risk until the silence made it so.',
      tag: 'Preventable with a same-day, tracking-grounded reply',
    },
    {
      n: 'FAILURE 02', t: 'A dispute becomes a chargeback',
      p: 'Chargeback language hides inside ordinary-looking emails. Miss it in a crowded inbox and the first time you hear about it is from your payment processor — with a fee attached.',
      tag: 'Preventable with detection and human escalation',
    },
    {
      n: 'FAILURE 03', t: 'A slow reply becomes a lost customer',
      p: 'Long shipping windows already test a customer’s patience. A support queue measured in days confirms their worst assumption about your store. They don’t complain twice — they leave.',
      tag: 'Preventable with drafts ready before you open the inbox',
    },
  ];
  return (
    <section className="dark cost">
      <motion.div className="wrap" {...rise}>
        <Idx n="03" t="Cost of silence" />
        <h2 className="sec-h2">Slow support doesn&rsquo;t feel expensive.<br />It is.</h2>
        <div className="cost-grid">
          {cols.map((c) => (
            <div className="cost-col" key={c.n}>
              <span className="cn">{c.n}</span>
              <h3>{c.t}</h3>
              <p>{c.p}</p>
              <span className="tag">{c.tag}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

/* ============ platform split ============ */
function Split() {
  const drafting = [
    { b: 'Order matching', s: 'order number first, customer email second — with the evidence shown' },
    { b: 'Language detection', s: 'replies written in the customer’s language, not translated boilerplate' },
    { b: 'Tracking enrichment', s: 'live carrier events folded into the reply, customs status included' },
    { b: 'Policy grounding', s: 'your SOP and store policies constrain every draft' },
    { b: 'Brand voice', s: 'tone configured per store, from plain to formal' },
  ];
  const control = [
    { b: 'Approval queue', s: 'every draft reviewable before anything leaves the building' },
    { b: 'Send lanes', s: 'off · shadow · live — switched per category, per store' },
    { b: 'Cancel window', s: 'auto-sends wait out a delay you set; one click pulls them back' },
    { b: 'Escalation rules', s: 'chargeback and legal language always routes to a human' },
    { b: 'Kill switch', s: 'one setting stops all automated sending, immediately' },
  ];
  return (
    <section className="split" id="platform">
      <motion.div className="wrap" {...rise}>
        <Idx n="04" t="Platform" />
        <h2 className="sec-h2">A drafting engine.<br />And a control plane over it.</h2>
        <p className="sec-sub">
          The AI writes; you govern. The two halves ship as one product — automation
          without a control plane is how support tools end up apologizing in public.
        </p>
        <div className="split-grid">
          <div className="split-card">
            <span className="sc-cap">Drafting engine</span>
            <h3>Replies grounded in the order</h3>
            <p className="sc-sub">Everything the AI writes is anchored to data it can cite.</p>
            <div className="split-list">
              {drafting.map((li) => (
                <div className="split-li" key={li.b}>
                  <Check size={16} strokeWidth={2.4} />
                  <span><b>{li.b}</b> — {li.s}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="split-card inkside">
            <span className="sc-cap">Control plane</span>
            <h3>Nothing sends without your rules</h3>
            <p className="sc-sub">Autonomy is granted lane by lane, and revocable in one click.</p>
            <div className="split-list">
              {control.map((li) => (
                <div className="split-li" key={li.b}>
                  <Check size={16} strokeWidth={2.4} />
                  <span><b>{li.b}</b> — {li.s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ============ feature bento ============ */
function Bento() {
  return (
    <section className="bento">
      <motion.div className="wrap" {...rise}>
        <div className="bento-grid">
          <div className="bcard w3">
            <div className="bic"><Eye size={17} strokeWidth={2.2} /></div>
            <h4>Shadow mode</h4>
            <p>
              Resolver drafts silently alongside your team while you compare its answers
              to yours. Turn on sending only when the drafts have earned it — per lane,
              per store.
            </p>
            <div className="bmini">
              <div className="row"><span>WISMO lane</span><span className="ok">LIVE</span></div>
              <div className="row"><span>Refund lane</span><span>SHADOW</span></div>
              <div className="row"><span>Disputes</span><span className="no">HUMAN ONLY</span></div>
            </div>
          </div>
          <div className="bcard w3">
            <div className="bic"><Languages size={17} strokeWidth={2.2} /></div>
            <h4>Native-language replies</h4>
            <p>
              The customer writes in German, the reply goes out in German — drafted
              directly, not machine-translated after the fact. Your team reviews an
              English mirror of every draft.
            </p>
            <div className="bmini">
              <div className="row"><span>Inbound</span><span>DE · &ldquo;Wo ist meine Bestellung?&rdquo;</span></div>
              <div className="row"><span>Outbound</span><span className="ok">DE · draft ready</span></div>
              <div className="row"><span>Review copy</span><span>EN · mirrored</span></div>
            </div>
          </div>
          <div className="bcard w2">
            <div className="bic"><SlidersHorizontal size={17} strokeWidth={2.2} /></div>
            <h4>Per-store policies</h4>
            <p>Each store carries its own voice, SOP, and lane configuration. Run three brands without the replies blurring together.</p>
          </div>
          <div className="bcard w2">
            <div className="bic"><BellRing size={17} strokeWidth={2.2} /></div>
            <h4>Escalation triggers</h4>
            <p>Chargeback language, legal threats, and anything below the confidence bar skip automation and go to the top of the human queue.</p>
          </div>
          <div className="bcard w2">
            <div className="bic"><LineChart size={17} strokeWidth={2.2} /></div>
            <h4>Automation log</h4>
            <p>Every automated action is recorded: what sent, when, on which lane, and why. Audit the machine like you&rsquo;d audit an employee.</p>
          </div>
        </div>
      </motion.div>
    </section>
  );
}

/* ============ facts band ============ */
function Facts() {
  const facts = [
    { v: <>40<i>+</i></>, k: 'Languages detected and replied in-language' },
    { v: <>3</>, k: 'Send lanes per store — off, shadow, live' },
    { v: <>0</>, k: 'Auto-replies ever sent to chargeback or legal threats' },
    { v: <>1</>, k: 'Switch to stop all automated sending' },
  ];
  return (
    <section className="facts">
      <div className="wrap">
        <div className="facts-grid">
          {facts.map((f, i) => (
            <div className="fact" key={i}>
              <div className="fv">{f.v}</div>
              <div className="fk">{f.k}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ trust / security ============ */
function Trust() {
  const rows = [
    {
      ic: <Lock size={17} strokeWidth={2.2} />, t: 'Read-only Shopify access',
      p: 'Resolver requests read scopes only — orders, customers, products, fulfillments, returns, disputes. It cannot modify your store.',
    },
    {
      ic: <Scale size={17} strokeWidth={2.2} />, t: 'Risk never gets automated',
      p: 'Chargeback and legal language is detected and hard-routed to a human. This is enforced in the pipeline, not left to a prompt.',
    },
    {
      ic: <ShieldAlert size={17} strokeWidth={2.2} />, t: 'Your data stays yours',
      p: 'Customer data is processed under a signed DPA and never used to train AI models. No data is sold or shared for advertising.',
    },
    {
      ic: <Inbox size={17} strokeWidth={2.2} />, t: 'Gmail stays the source of truth',
      p: 'Replies send through your own mailbox. Turn Resolver off and your inbox is exactly where you left it — nothing held hostage.',
    },
  ];
  return (
    <section className="trust" id="security">
      <motion.div className="wrap" {...rise}>
        <Idx n="05" t="Security & data" />
        <h2 className="sec-h2">Built to be trusted with the inbox.</h2>
        <p className="sec-sub">
          Support email is customer PII plus money conversations. The boring parts are
          load-bearing.
        </p>
        <div className="trust-grid">
          {rows.map((r) => (
            <div className="trow" key={r.t}>
              <div className="tic">{r.ic}</div>
              <div>
                <h4>{r.t}</h4>
                <p>{r.p}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

/* ============ pricing ============ */
function Pricing() {
  const plans = [
    {
      name: 'Solo', blurb: 'One store, one seat.', price: '$59', vol: '300 tickets / mo',
      feats: ['1 store · 1 seat', 'All AI features included', 'Shadow + auto-send lanes'],
      cta: 'Start setup', href: START, rec: false,
    },
    {
      name: 'Team', blurb: 'Growing operations.', price: '$249', vol: '2,500 tickets / mo',
      feats: ['3 stores · 3 seats', 'Per-store voice & policies', 'Lane analytics'],
      cta: 'Start setup', href: START, rec: true,
    },
    {
      name: 'Portfolio', blurb: 'Multi-brand operators.', price: '$599', vol: '6,000 tickets / mo',
      feats: ['Unlimited stores · 10 seats', 'Cross-store insights', 'Priority support'],
      cta: 'Start setup', href: START, rec: false,
    },
    {
      name: 'Enterprise', blurb: 'Custom contract.', price: 'Custom', vol: 'Unlimited volume',
      feats: ['Unlimited stores & seats', 'SSO & data residency', 'Dedicated CSM'],
      cta: 'Talk to us', href: DEMO, rec: false,
    },
  ];
  return (
    <section className="price" id="pricing">
      <motion.div className="wrap" {...rise}>
        <Idx n="06" t="Pricing" />
        <h2 className="sec-h2">Priced by ticket volume.<br />Nothing else.</h2>
        <p className="sec-sub">
          Every AI feature is on every plan. Tiers only change stores, seats, and monthly
          ticket volume.
        </p>
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
              <a className={p.rec ? 'btn pri' : 'btn sec'} href={p.href}>{p.cta}</a>
            </div>
          ))}
        </div>
        <p className="price-note">
          Annual billing takes 20% off. Full plan details at <a href={PRICING_FULL}>resolver.chat/pricing</a>.
        </p>
      </motion.div>
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
    a: 'The ticket is flagged, pulled out of every automated lane, and pushed to the top of the human queue. This routing is enforced in the pipeline itself — no prompt or setting can auto-reply to dispute or legal language.',
  },
  {
    q: 'How does it know what my store’s policies are?',
    a: 'During setup you provide your support SOP and policies (a document upload or written directly). Every draft is constrained by them — refund windows, reshipment rules, tone. Change the policy and the next draft follows it.',
  },
  {
    q: 'What does it do with emails it can’t match to an order?',
    a: 'Unmatched or low-confidence tickets are held for a human with everything Resolver could find attached. It never guesses an order match to force an automated reply.',
  },
  {
    q: 'Which data does Resolver access?',
    a: 'Read-only Shopify scopes (orders, customers, products, fulfillments, returns, disputes) and the support mailbox you connect. Customer data is processed under a signed DPA and never used to train AI models.',
  },
  {
    q: 'How long does setup take?',
    a: 'Installing the Shopify app, connecting Gmail, and uploading your SOP is a ten-minute job. Drafting starts right after — in shadow mode, where it stays until you decide otherwise.',
  },
];

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="faq" id="faq">
      <motion.div className="wrap" {...rise}>
        <Idx n="07" t="FAQ" />
        <h2 className="sec-h2">Reasonable questions.</h2>
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
      </motion.div>
    </section>
  );
}

/* ============ final CTA ============ */
function Cta() {
  return (
    <section className="dark cta">
      <motion.div className="wrap cta-in" {...rise}>
        <Idx n="08" t="Start" />
        <h2>Put it in shadow mode tonight.<br />Judge it on its drafts.</h2>
        <p>
          Ten minutes of setup. No reply leaves your inbox until you say so — and you can
          revoke that permission with one switch.
        </p>
        <div className="ctas">
          <a className="btn onink" href={START}>Start free</a>
          <a className="btn ghost-onink" href={DEMO}>Book a demo</a>
        </div>
        <div className="fine">Shopify app · Gmail · shadow mode by default</div>
      </motion.div>
    </section>
  );
}

/* ============ footer ============ */
function Foot() {
  const cols: [string, [string, string][]][] = [
    ['Product', [
      ['How it works', '#how'], ['Platform', '#platform'], ['Security', '#security'],
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
            <Brand onInk />
            <p>AI support operations for Shopify merchants with long shipping windows.</p>
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
          <span>Built for operators, not call centers.</span>
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
        <Ticker />
        <How />
        <Cost />
        <Split />
        <Bento />
        <Facts />
        <Trust />
        <Pricing />
        <Faq />
        <Cta />
      </main>
      <Foot />
    </div>
  );
}
