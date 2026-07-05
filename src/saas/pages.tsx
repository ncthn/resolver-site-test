// Resolver — all non-home marketing pages, sharing the Landing shell
// (Nav/Foot/Reveal) so the brand is identical A-Z: pricing, about, contact,
// integrations, faq, and the legal set. Same rules: monochrome, Inter Tight,
// honest copy, no invented numbers.
import { useState } from 'react';
import { Nav, Foot, Reveal } from './Landing';
import {
  Check, Plus, ShoppingBag, Mail, Timer, Languages, Lock, Send,
  ShieldCheck, Inbox, FileText,
} from 'lucide-react';

const START = '/get-started';
const DEMO_MAIL = 'hello@resolver.chat';

function Page({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div>
      <Nav />
      <main className="pg wrap">
        <Reveal>
          <h1 className="pg-h1">{title}</h1>
          {sub && <p className="pg-sub">{sub}</p>}
        </Reveal>
        {children}
      </main>
      <Foot />
    </div>
  );
}

/* ================================ pricing ================================ */
export function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const plans = [
    { name: 'Solo', m: 59, a: 47, vol: '300 tickets / mo', blurb: 'One store, one seat.', feats: ['1 store · 1 seat', 'Order-grounded drafts', 'Shadow + auto-send lanes', '40+ languages', 'Chargeback & legal flags'], rec: false },
    { name: 'Team', m: 249, a: 199, vol: '2,500 tickets / mo', blurb: 'Growing operations.', feats: ['Everything in Solo', '3 stores · 3 seats', 'Per-store voice & policies', 'Lane analytics', 'Priority email support'], rec: true },
    { name: 'Portfolio', m: 599, a: 479, vol: '6,000 tickets / mo', blurb: 'Multi-brand operators.', feats: ['Everything in Team', 'Unlimited stores · 10 seats', 'Cross-store insights', 'Priority support'], rec: false },
  ];
  const rows: [string, string, string, string][] = [
    ['Stores', '1', '3', 'Unlimited'],
    ['Seats', '1', '3', '10'],
    ['Tickets / month', '300', '2,500', '6,000'],
    ['AI drafting & lanes', '✓', '✓', '✓'],
    ['Native-language replies', '✓', '✓', '✓'],
    ['Chargeback & legal routing', '✓', '✓', '✓'],
    ['Per-store voice & policies', '—', '✓', '✓'],
    ['Cross-store insights', '—', '—', '✓'],
  ];
  return (
    <Page title="Pay for tickets, not features." sub="Every AI feature is on every plan — tiers only change stores, seats, and monthly ticket volume.">
      <Reveal>
        <div className="pg-toggle">
          {([['Monthly', false], ['Annual · 20% off', true]] as [string, boolean][]).map(([l, v]) => (
            <button key={l} className={annual === v ? 'on' : ''} onClick={() => setAnnual(v)}>{l}</button>
          ))}
        </div>
        <div className="price-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginTop: 28 }}>
          {plans.map((p) => (
            <div className={p.rec ? 'plan rec' : 'plan'} key={p.name}>
              <div className="p-cap"><h3>{p.name}</h3>{p.rec && <span className="p-rec">Most chosen</span>}</div>
              <p className="p-blurb">{p.blurb}</p>
              <div className="p-price">${annual ? p.a : p.m}<span> /mo</span></div>
              <div className="p-vol">Up to {p.vol}{annual && ` · billed $${p.a * 12}/yr`}</div>
              <div className="inc">Included</div>
              <ul>{p.feats.map((f) => <li key={f}><Check size={15} strokeWidth={2.4} />{f}</li>)}</ul>
              <a className={p.rec ? 'btn' : 'btn soft'} href={START} style={p.rec ? undefined : { background: '#fff' }}>Start free</a>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal>
        <div className="pg-card" style={{ marginTop: 18, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h3 style={{ fontSize: 18 }}>Enterprise</h3>
            <p style={{ color: 'var(--tx-soft)', fontSize: 14, marginTop: 6 }}>From 6,000 tickets/mo — unlimited seats, SSO, data residency, dedicated CSM, custom contract.</p>
          </div>
          <a className="btn pri" href="/contact">Talk to us</a>
        </div>
      </Reveal>
      <Reveal>
        <div className="pg-card" style={{ marginTop: 40 }}>
          <h3 style={{ fontSize: 17, marginBottom: 16 }}>Compare plans</h3>
          <div style={{ overflowX: 'auto' }}>
            <table className="pg-table">
              <thead><tr><th></th><th>Solo</th><th>Team</th><th>Portfolio</th></tr></thead>
              <tbody>
                {rows.map(([f, a, b, c]) => (
                  <tr key={f}><td>{f}</td><td>{a}</td><td>{b}</td><td>{c}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Reveal>
      <Reveal>
        <div className="pg-notes">
          <p><b>Billing runs through Shopify.</b> Plans are managed, upgraded, and cancelled from the Shopify admin — no separate card on file.</p>
          <p><b>What counts as a ticket?</b> One inbound customer conversation in a calendar month, however many messages it takes to resolve.</p>
          <p><b>Over your volume?</b> Nothing breaks: drafting continues and we ask you to pick a bigger tier for the next cycle.</p>
        </div>
      </Reveal>
    </Page>
  );
}

/* ================================ about ================================= */
export function AboutPage() {
  return (
    <Page title="Built by operators, for operators." sub="Resolver comes out of running Shopify stores with long shipping windows — not out of a helpdesk company's roadmap.">
      <Reveal>
        <div className="pg-prose">
          <p>
            We run e-commerce stores. The kind where the product ships from far away,
            the customer waits three weeks, and the support inbox fills up with the same
            question in eleven languages: <i>where is my order?</i>
          </p>
          <p>
            Every helpdesk we tried treated that inbox as a queue of strangers. None of
            them read the order first. So the workflow was always the same: open the
            email, open Shopify, open the carrier site, translate the German, write the
            reply, paste the tracking link — forty times a day. The tools organized the
            work; they didn&rsquo;t do it.
          </p>
          <p>
            Resolver is the tool we wanted: it reads the order before it answers, writes
            the reply in the customer&rsquo;s language, and — this part matters — holds
            anything risky for a human. Chargeback threats and legal language never get
            an automated reply. Autonomy is granted one lane at a time, and revocable
            with one switch.
          </p>
          <p>
            We don&rsquo;t publish invented customer counts or ROI multiples. The product
            starts in shadow mode precisely so you can judge it on its drafts, on your
            real tickets, before a single email sends.
          </p>
        </div>
      </Reveal>
      <Reveal>
        <div className="pg-grid3" style={{ marginTop: 48 }}>
          {[
            ['Grounded, always', 'Every reply is anchored to data it can cite: the order, the tracking, your policies.'],
            ['Risk never automated', 'Dispute and legal language routes to a human — enforced in the pipeline, not a prompt.'],
            ['Honest by default', 'No fake logos, no invented stats. Demo data is labeled demo. That rule extends to this website.'],
          ].map(([t, p]) => (
            <div className="pg-card" key={t}>
              <h3 style={{ fontSize: 16 }}>{t}</h3>
              <p style={{ color: 'var(--tx-soft)', fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>{p}</p>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal>
        <div className="pg-cta">
          <h2>See it on your own tickets.</h2>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24, flexWrap: 'wrap' }}>
            <a className="btn pri" href={START}>Start free</a>
            <a className="btn soft" href="/contact" style={{ background: '#fff' }}>Book a demo</a>
          </div>
        </div>
      </Reveal>
    </Page>
  );
}

/* ================================ contact =============================== */
export function ContactPage() {
  const [sent, setSent] = useState(false);
  return (
    <Page title="Talk to us." sub="A demo, a pricing question, or a hard support-ops problem — we read everything.">
      <Reveal>
        <div className="pg-2col">
          <div className="pg-card">
            {sent ? (
              <div className="pg-sent">
                <span className="ok"><Check size={18} strokeWidth={2.5} /></span>
                <h3 style={{ fontSize: 17 }}>Message sent</h3>
                <p style={{ color: 'var(--tx-soft)', fontSize: 14, marginTop: 6 }}>We reply within one business day — usually faster.</p>
              </div>
            ) : (
              <form className="pg-form" onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                <label>Name<input required placeholder="Your name" /></label>
                <label>Email<input required type="email" placeholder="you@store.com" /></label>
                <label>Store (optional)<input placeholder="yourstore.com" /></label>
                <label>What do you need?<textarea required rows={5} placeholder="A demo, a pricing question, a migration from another helpdesk…" /></label>
                <button className="btn pri" type="submit"><Send size={15} /> Send message</button>
              </form>
            )}
          </div>
          <div>
            <div className="pg-card">
              <h3 style={{ fontSize: 15 }}>Book a demo</h3>
              <p style={{ color: 'var(--tx-soft)', fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>
                Twenty minutes, your real ticket examples if you want. We&rsquo;ll show the
                draft-approve-automate loop end to end.
              </p>
            </div>
            <div className="pg-card" style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: 15 }}>Email</h3>
              <p style={{ color: 'var(--tx-soft)', fontSize: 13.5, marginTop: 8 }}>
                <a href={`mailto:${DEMO_MAIL}`} style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>{DEMO_MAIL}</a>
              </p>
            </div>
            <div className="pg-card" style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: 15 }}>Already a customer?</h3>
              <p style={{ color: 'var(--tx-soft)', fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>
                Reply to any email from us, or write in from the app — those queues are watched first.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
    </Page>
  );
}

/* ============================= integrations ============================= */
export function IntegrationsPage() {
  const main = [
    {
      Ic: ShoppingBag, t: 'Shopify', p: 'The system of record. Orders, customers, fulfillments, returns, and disputes — read-only scopes, so Resolver can see everything and change nothing.',
      pts: ['Order matching by number and email', 'Live order & fulfillment status', 'Read-only: cannot modify your store'],
    },
    {
      Ic: Mail, t: 'Gmail', p: 'Your existing support mailbox stays the source of truth. Replies send as you; turn Resolver off and your inbox is exactly where you left it.',
      pts: ['Sends from your own address', 'Loop protection filters auto-replies', 'Nothing held hostage'],
    },
    {
      Ic: Timer, t: 'Carrier tracking', p: 'Live tracking events folded into every draft — including customs status, the thing long-window stores get asked about most.',
      pts: ['14+ carriers', 'Customs clearance detection', 'Delivery-failure alerts'],
    },
    {
      Ic: Languages, t: '40+ languages', p: 'Not an integration you configure — a property of the drafting engine. Customers get answered in their language; you review an English mirror.',
      pts: ['Detection at intake', 'Native drafting, not post-translation', 'English mirror for review'],
    },
  ];
  return (
    <Page title="Connected to the tools already running your store." sub="Four integrations, deliberately: the ones that ground every reply in what actually happened.">
      <Reveal>
        <div className="pg-grid2">
          {main.map((m) => (
            <div className="pg-card" key={m.t}>
              <span className="pg-ic"><m.Ic size={20} strokeWidth={1.9} /></span>
              <h3 style={{ fontSize: 17, marginTop: 14 }}>{m.t}</h3>
              <p style={{ color: 'var(--tx-soft)', fontSize: 14, marginTop: 8, lineHeight: 1.6 }}>{m.p}</p>
              <ul className="pg-list">
                {m.pts.map((x) => <li key={x}><Check size={14} strokeWidth={2.4} />{x}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal>
        <div className="pg-card" style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
            <span className="pg-ic"><Lock size={20} strokeWidth={1.9} /></span>
            <div>
              <h3 style={{ fontSize: 16 }}>How access works</h3>
              <p style={{ color: 'var(--tx-soft)', fontSize: 14, marginTop: 8, lineHeight: 1.65, maxWidth: '70ch' }}>
                Shopify access is requested with read scopes only (orders, customers, products,
                fulfillments, returns, disputes). Customer data is processed under a signed DPA
                and never used to train AI models. Disconnecting either integration stops
                Resolver completely — there is no residual access.
              </p>
            </div>
          </div>
        </div>
      </Reveal>
      <Reveal>
        <div className="pg-cta">
          <h2>Ten minutes from install to first draft.</h2>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            <a className="btn pri" href={START}>Start free</a>
          </div>
        </div>
      </Reveal>
    </Page>
  );
}

/* ================================= faq ================================== */
const FAQ_ALL: [string, string][] = [
  ['Does it start sending emails as soon as I install it?', 'No. Every store starts in shadow mode: Resolver drafts, nothing sends. You review drafts against what your team would have written, then enable sending one lane at a time. The default state of every lane is off.'],
  ['What happens when a customer threatens a chargeback?', 'The ticket is flagged, pulled out of every automated lane, and pushed to the top of the human queue. This routing is enforced in the pipeline itself — no setting can auto-reply to dispute or legal language.'],
  ['How does it know my store’s policies?', 'During setup you provide your support SOP and policies. Every draft is constrained by them — refund windows, reshipment rules, tone. Change the policy and the next draft follows it.'],
  ['What about emails it can’t match to an order?', 'Unmatched or low-confidence tickets are held for a human with everything Resolver could find attached. It never guesses an order match to force an automated reply.'],
  ['Which data does Resolver access?', 'Read-only Shopify scopes (orders, customers, products, fulfillments, returns, disputes) and the support mailbox you connect. Customer data is processed under a signed DPA and never used to train AI models.'],
  ['How long does setup take?', 'Installing the Shopify app, connecting Gmail, and uploading your SOP is about ten minutes. Drafting starts right after — in shadow mode, where it stays until you decide otherwise.'],
  ['Can I run multiple stores?', 'Yes — every store carries its own voice, SOP, and lane configuration, and the inbox can be viewed per-store or across all stores. Team runs 3 stores; Portfolio is unlimited.'],
  ['What languages does it support?', 'Detection and native drafting in 40+ languages. Your team reviews an English mirror of every non-English draft, so you can supervise conversations you couldn’t read otherwise.'],
  ['Can one teammate take over a ticket completely?', 'Yes — every ticket has its own AI switch. Turn it off and Resolver stops drafting and sending for that conversation entirely, until you turn it back on.'],
  ['What happens if I cancel?', 'Your inbox is your inbox — everything lives in Gmail and Shopify, so nothing is exported or lost. Uninstalling the app revokes all access immediately.'],
];
export function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <Page title="Reasonable questions." sub="The answers a careful operator should demand before piping customer email through anything.">
      <Reveal>
        <div className="faq-list" style={{ margin: '8px auto 0' }}>
          {FAQ_ALL.map(([q, a], i) => (
            <div className={open === i ? 'faq-item open' : 'faq-item'} key={i}>
              <button className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                {q}<Plus size={18} strokeWidth={2.2} />
              </button>
              <div className="faq-a"><p>{a}</p></div>
            </div>
          ))}
        </div>
      </Reveal>
      <Reveal>
        <div className="pg-cta">
          <h2>Something we didn&rsquo;t answer?</h2>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
            <a className="btn soft" href="/contact" style={{ background: '#fff' }}>Ask us directly</a>
          </div>
        </div>
      </Reveal>
    </Page>
  );
}

/* ================================ legal ================================= */
function Legal({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <Page title={title} sub={`Last updated ${updated}`}>
      <Reveal><div className="pg-prose legal">{children}</div></Reveal>
    </Page>
  );
}
export function PrivacyPage() {
  return (
    <Legal title="Privacy policy" updated="July 2026">
      <h3>What we process</h3>
      <p>Resolver processes support emails and the Shopify order data needed to answer them: order status, fulfillment and tracking, customer purchase history. Shopify access uses read-only scopes.</p>
      <h3>How AI is used</h3>
      <p>Drafts are generated by AI providers under a signed Data Processing Agreement. Customer data is never used to train AI models, never sold, and never shared for advertising.</p>
      <h3>Where data lives</h3>
      <p>Your inbox stays in Gmail; your orders stay in Shopify. Resolver stores ticket metadata and drafts for the duration of your subscription. Uninstalling revokes access immediately and deletes stored tokens.</p>
      <h3>Your rights</h3>
      <p>Export or deletion requests: <a href="mailto:hello@resolver.chat">hello@resolver.chat</a>. We answer within 30 days, usually much faster.</p>
    </Legal>
  );
}
export function TermsPage() {
  return (
    <Legal title="Terms of service" updated="July 2026">
      <h3>The service</h3>
      <p>Resolver drafts and optionally sends replies to your customer support email, grounded in your Shopify data and your written policies. You control what sends: lanes default to off, and dispute or legal language always routes to a human.</p>
      <h3>Your responsibilities</h3>
      <p>You confirm you have the right to connect the mailbox and store you connect, and that your policies given to Resolver are accurate. Replies sent from your mailbox are your communications.</p>
      <h3>Billing</h3>
      <p>Subscriptions are billed through Shopify and can be upgraded, downgraded, or cancelled there at any time. Fees are non-refundable for the current billing period.</p>
      <h3>Liability</h3>
      <p>The service is provided as-is. Our aggregate liability is capped at the fees paid in the preceding three months.</p>
    </Legal>
  );
}
export function CookiesPage() {
  return (
    <Legal title="Cookie policy" updated="July 2026">
      <h3>What we set</h3>
      <p>The marketing site sets no tracking cookies and runs no third-party analytics. The app sets strictly necessary cookies for authentication — session tokens, nothing else.</p>
      <h3>What we don&rsquo;t</h3>
      <p>No advertising pixels, no cross-site tracking, no fingerprinting. This is also why there is no cookie banner: there is nothing to consent to.</p>
    </Legal>
  );
}
