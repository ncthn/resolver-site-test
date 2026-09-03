// Resolver, all non-home marketing pages, sharing the Landing shell
// (Nav/Foot/Reveal) so the brand is identical A-Z: pricing, about, contact,
// integrations, faq, and the legal set. Same rules: monochrome, Inter Tight,
// honest copy, no invented numbers.
import { useEffect, useRef, useState } from 'react';
import { Nav, Foot, Reveal } from './Landing';
import {
  Check, Plus, ShoppingBag, Mail, Timer, Languages, Lock, Send,
  ShieldCheck, Inbox, FileText,
} from 'lucide-react';

const START = '/get-started';
const DEMO_MAIL = 'hello@resolver.chat';

// Cal.com booking. The contact page owns the scheduler; every "Book a demo"
// link on the site lands here rather than bouncing to cal.com, so the visitor
// stays on resolver.chat and still gets a real calendar.
const CAL_LINK = 'ops-only-upg4tp/30min';
export const CAL_URL = `https://cal.com/${CAL_LINK}`;

// Cal's embed.js does not define window.Cal itself, it expects the vendor
// queueing stub to already be there and flushes into it. Appending the script
// on its own throws "Cal is not defined" inside embed.js, so install the stub
// first, exactly as Cal's own snippet does.
function installCalStub() {
  const w = window as any;
  if (w.Cal) return;
  const d = document;
  const push = (a: any, ar: any) => { a.q.push(ar); };
  w.Cal = function (...ar: any[]) {
    const cal = w.Cal;
    if (!cal.loaded) {
      cal.ns = {};
      cal.q = cal.q || [];
      const sc = d.createElement('script');
      sc.src = 'https://app.cal.com/embed/embed.js';
      sc.async = true;
      d.head.appendChild(sc);
      cal.loaded = true;
    }
    if (ar[0] === 'init') {
      const api = function (...a: any[]) { push(api, a); };
      const namespace = ar[1];
      (api as any).q = (api as any).q || [];
      if (typeof namespace === 'string') {
        cal.ns[namespace] = cal.ns[namespace] || api;
        push(cal.ns[namespace], ar);
        push(cal, ['initNamespace', namespace]);
      } else {
        push(cal, ar);
      }
      return;
    }
    push(cal, ar);
  };
  w.Cal.q = [];
}

/** Inline Cal.com booker with a plain-link fallback if the embed cannot load. */
function CalBooker() {
  const box = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    installCalStub();
    const Cal = (window as any).Cal;
    Cal('init', { origin: 'https://app.cal.com' });
    Cal('inline', {
      elementOrSelector: box.current,
      calLink: CAL_LINK,
      config: { layout: 'month_view' },
    });
    Cal('ui', { hideEventTypeDetails: false, layout: 'month_view' });
    // The embed is queued, not awaited, so there is no error callback to hook.
    // If nothing rendered by then, assume it was blocked and offer the link.
    const t = setTimeout(() => {
      if (!box.current?.querySelector('iframe')) setFailed(true);
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <div className="cal-inline" ref={box} hidden={failed} />
      {failed && (
        <div className="pg-card cal-fallback">
          <p style={{ color: 'var(--tx-soft)', fontSize: 13.5, lineHeight: 1.6 }}>
            The calendar could not load here, it is usually a blocker extension.
          </p>
          <a className="btn pri" href={CAL_URL} target="_blank" rel="noopener noreferrer" style={{ marginTop: 14 }}>
            Open the booking page
          </a>
        </div>
      )}
    </>
  );
}


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
    { name: 'Solo', m: 59, a: 47, vol: '300 tickets / mo', blurb: 'One store, one seat.', feats: ['1 store · 1 seat', 'Order-grounded drafts', 'Draft-only + auto-send lanes', '40+ languages', 'Chargeback & legal flags'], rec: false },
    { name: 'Team', m: 249, a: 199, vol: '2,500 tickets / mo', blurb: 'Growing operations.', feats: ['Everything in Solo', '3 stores · 3 seats', 'Per-store voice & policies', 'Lane analytics', 'Priority email support'], rec: true },
    { name: 'Portfolio', m: 599, a: 479, vol: '6,000 tickets / mo', blurb: 'Multi-brand operators.', feats: ['Everything in Team', 'Unlimited stores · 10 seats', 'Cross-store insights'], rec: false },
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
    <Page title="Pay for tickets, not features." sub="Every AI feature is on every plan, tiers only change stores, seats, and monthly ticket volume.">
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
            <p style={{ color: 'var(--tx-soft)', fontSize: 14, marginTop: 6 }}>From 6,000 tickets/mo, unlimited seats, SSO, data residency, dedicated CSM, custom contract.</p>
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
          <p><b>Billing runs through Shopify.</b> Plans are managed, upgraded, and cancelled from the Shopify admin, no separate card on file.</p>
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
    <Page title="Built by operators, for operators." sub="Resolver comes out of running Shopify stores with long shipping windows, not out of a helpdesk company's roadmap.">
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
            reply, paste the tracking link, forty times a day. The tools organized the
            work; they didn&rsquo;t do it.
          </p>
          <p>
            Resolver is the tool we wanted: it reads the order before it answers, writes
            the reply in the customer&rsquo;s language, and, this part matters, holds
            anything risky for a human. Chargeback threats and legal language never get
            an automated reply. Autonomy is granted one lane at a time, and revocable
            with one switch.
          </p>
          <p>
            We don&rsquo;t publish invented customer counts or ROI multiples. The product
            starts in draft-only mode precisely so you can judge it on its drafts, on your
            real tickets, before a single email sends.
          </p>
        </div>
      </Reveal>
      <Reveal>
        <div className="pg-grid3" style={{ marginTop: 48 }}>
          {[
            ['Grounded, always', 'Every reply is anchored to data it can cite: the order, the tracking, your policies.'],
            ['Risk never automated', 'Dispute and legal language routes to a human, enforced in the pipeline, not a prompt.'],
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
            <a className="btn soft" href="/contact#book" style={{ background: '#fff' }}>Book a demo</a>
          </div>
        </div>
      </Reveal>
    </Page>
  );
}

/* ================================ contact =============================== */
export function ContactPage() {
  const [sent, setSent] = useState(false);

  // Arriving at /contact#book from a "Book a demo" link: the anchor does not
  // exist yet when the browser tries its native jump, so do it after render.
  useEffect(() => {
    if (window.location.hash !== '#book') return;
    const t = setTimeout(() => {
      document.getElementById('book')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 120);
    return () => clearTimeout(t);
  }, []);
  return (
    <Page title="Talk to us." sub="Grab a slot below. If a form suits you better, there is one under the calendar.">
      <Reveal>
        <div className="cal-sec lead" id="book">
          <h2>Pick a time.</h2>
          <p>Thirty minutes, live, on your own inbox if you want to bring it.</p>
          <CalBooker />
        </div>
      </Reveal>
      <Reveal>
        <h2 className="pg-h2">Or write to us.</h2>
        <div className="pg-2col">
          <div className="pg-card">
            {sent ? (
              <div className="pg-sent">
                <span className="ok"><Check size={18} strokeWidth={2.5} /></span>
                <h3 style={{ fontSize: 17 }}>Message sent</h3>
                <p style={{ color: 'var(--tx-soft)', fontSize: 14, marginTop: 6 }}>We reply within one business day, usually faster.</p>
              </div>
            ) : (
              <form className="pg-form" onSubmit={(e) => {
                e.preventDefault();
                // No contact endpoint exists — previously this just showed
                // "Message sent" and dropped the message. Hand off to mail.
                const f = e.currentTarget as HTMLFormElement;
                const get = (n: string) => (f.elements.namedItem(n) as HTMLInputElement | HTMLTextAreaElement | null)?.value ?? '';
                const body = encodeURIComponent(`${get('message')}\n\n— ${get('name')} (${get('email')})`);
                const subject = encodeURIComponent('Resolver enquiry');
                window.location.href = `mailto:${DEMO_MAIL}?subject=${subject}&body=${body}`;
                setSent(true);
              }}>
                <label>Name<input required name="name" autoComplete="name" placeholder="Your name" /></label>
                <label>Email<input required name="email" type="email" autoComplete="email" placeholder="you@store.com" /></label>
                <label>Store (optional)<input name="store" placeholder="yourstore.com" /></label>
                <label>What do you need?<textarea required name="message" rows={5} placeholder="A demo, a pricing question, a migration from another helpdesk…" /></label>
                <button className="btn pri" type="submit"><Send size={15} /> Send message</button>
              </form>
            )}
          </div>
          <div>
            <div className="pg-card">
              <h3 style={{ fontSize: 15 }}>Email</h3>
              <p style={{ color: 'var(--tx-soft)', fontSize: 13.5, marginTop: 8 }}>
                <a href={`mailto:${DEMO_MAIL}`} style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>{DEMO_MAIL}</a>
              </p>
            </div>
            <div className="pg-card" style={{ marginTop: 14 }}>
              <h3 style={{ fontSize: 15 }}>Already a customer?</h3>
              <p style={{ color: 'var(--tx-soft)', fontSize: 13.5, marginTop: 8, lineHeight: 1.6 }}>
                Reply to any email from us, or write in from the app, those queues are watched first.
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
      Ic: ShoppingBag, t: 'Shopify', p: 'The system of record. Orders, customers, fulfillments, returns, and disputes, read-only scopes, so Resolver can see everything and change nothing.',
      pts: ['Order matching by number and email', 'Live order & fulfillment status', 'Read-only: cannot modify your store'],
    },
    {
      Ic: Mail, t: 'Gmail', p: 'Your existing support mailbox stays the source of truth. Replies send as you; turn Resolver off and your inbox is exactly where you left it.',
      pts: ['Sends from your own address', 'Loop protection filters auto-replies', 'Nothing held hostage'],
    },
    {
      Ic: Timer, t: 'Carrier tracking', p: 'Live tracking events folded into every draft, including customs status, the thing long-window stores get asked about most.',
      pts: ['Tracking status from Shopify fulfilments', 'Customs clearance detection', 'Delivery-failure alerts'],
    },
    {
      Ic: Languages, t: '40+ languages', p: 'Not an integration you configure, a property of the drafting engine. Customers get answered in their language; you review an English mirror.',
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
                Resolver completely, there is no residual access.
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
  ['Does it start sending emails as soon as I install it?', 'No. Every store starts in draft-only mode: Resolver drafts, nothing sends. You review drafts against what your team would have written, then enable sending one lane at a time. The default state of every lane is off.'],
  ['What happens when a customer threatens a chargeback?', 'The ticket is flagged, pulled out of every automated lane, and pushed to the top of the human queue. This routing is enforced in the pipeline itself, no setting can auto-reply to dispute or legal language.'],
  ['How does it know my store’s policies?', 'During setup you provide your support SOP and policies. Every draft is constrained by them, refund windows, reshipment rules, tone. Change the policy and the next draft follows it.'],
  ['What about emails it can’t match to an order?', 'Unmatched or low-confidence tickets are held for a human with everything Resolver could find attached. It never guesses an order match to force an automated reply.'],
  ['Which data does Resolver access?', 'Read-only Shopify scopes (orders, customers, products, fulfillments, returns, disputes) and the support mailbox you connect. Customer data is processed under a signed DPA and never used to train AI models.'],
  ['How long does setup take?', 'Installing the Shopify app, connecting Gmail, and uploading your SOP is about ten minutes. Drafting starts right after, in draft-only mode, where it stays until you decide otherwise.'],
  ['Can I run multiple stores?', 'Yes, every store carries its own voice, SOP, and lane configuration, and the inbox can be viewed per-store or across all stores. Team runs 3 stores; Portfolio is unlimited.'],
  ['What languages does it support?', 'Detection and native drafting in 40+ languages. Your team reviews an English mirror of every non-English draft, so you can supervise conversations you couldn’t read otherwise.'],
  ['Can one teammate take over a ticket completely?', 'Yes, every ticket has its own AI switch. Turn it off and Resolver stops drafting and sending for that conversation entirely, until you turn it back on.'],
  ['What happens if I cancel?', 'Your inbox is your inbox, everything lives in Gmail and Shopify, so nothing is exported or lost. Uninstalling the app revokes all access immediately.'],
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

      <h3 style={{ fontSize: 16, margin: '28px 0 10px' }}>Sub-processors</h3>
      <p>We use the following processors to deliver the service. We will give notice before adding a new one, and you may object.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="pg-table">
          <thead><tr><th>Processor</th><th>Purpose</th><th>Region</th></tr></thead>
          <tbody>
            <tr><td>Shopify Inc.</td><td>Order, customer and fulfilment data for the connected store</td><td>United States / EU</td></tr>
            <tr><td>Google LLC (Gmail / Workspace)</td><td>Sending and receiving support email on your mailbox</td><td>United States / EU</td></tr>
            <tr><td>OpenAI, L.L.C.</td><td>Drafting and translating replies. Zero-retention terms; not used for training</td><td>United States</td></tr>
            <tr><td>Google Cloud Platform</td><td>Application hosting, database and secret storage</td><td>United States</td></tr>
            <tr><td>Render Services, Inc.</td><td>Application hosting</td><td>United States</td></tr>
            <tr><td>Postmark (ActiveCampaign)</td><td>Transactional email for stores using their own domain</td><td>United States</td></tr>
            <tr><td>Stripe, Inc.</td><td>Subscription billing</td><td>United States</td></tr>
          </tbody>
        </table>
      </div>
      <h3 style={{ fontSize: 16, margin: '28px 0 10px' }}>Your rights and our basis</h3>
      <p>We process customer data as a processor on your instructions, under Art. 28 GDPR, with legitimate interest as the basis for providing support. You may request access, correction, export or deletion at any time, and we answer within 30 days. International transfers rely on Standard Contractual Clauses.</p>
      <h3 style={{ fontSize: 16, margin: '28px 0 10px' }}>Shopify Protected Customer Data</h3>
      <p>We request only the scopes needed to match an email to its order. Customer data is used solely to answer that customer, is never sold, never used to train any model, and is deleted on request or when you uninstall the app.</p>
      <h3 style={{ fontSize: 16, margin: '28px 0 10px' }}>Retention and breach notice</h3>
      <p>Tickets and message history are retained for the life of your account and deleted within 30 days of termination. We notify you without undue delay, and within 72 hours where required, of any personal-data breach affecting your data.</p>
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
      <h3>Who you are contracting with</h3>
      <p>The service is provided by Resolver Ventures LLC. Notices may be sent to <a href="mailto:hello@resolver.chat">hello@resolver.chat</a>.</p>
      <h3>Term and termination</h3>
      <p>The agreement runs while you have an active subscription or connected store. Either party may terminate at any time: you by cancelling in the Shopify admin or uninstalling, we on 30 days&rsquo; notice except for non-payment or misuse, where we may suspend immediately. On termination we stop processing and delete your data within 30 days, and you may export it before then.</p>
      <h3>Acceptable use</h3>
      <p>Do not use the service to send unlawful, deceptive or unsolicited bulk email, or to process data you have no right to process. We may suspend an account that does.</p>
      <h3>Changes</h3>
      <p>We may change these terms; material changes are announced before they take effect and continued use is acceptance. The current version is always at this page with the date above.</p>
      <h3>Governing law</h3>
      <p>These terms are governed by the laws of the State of Delaware, United States, and the parties submit to its courts. Nothing here removes consumer rights that cannot be waived under your local law.</p>
    </Legal>
  );
}
export function CookiesPage() {
  return (
    <Legal title="Cookie policy" updated="July 2026">
      <h3>What we set</h3>
      <p>The marketing site sets no tracking cookies and runs no third-party analytics or advertising trackers. The app sets strictly necessary cookies for authentication, session tokens, nothing else.</p>
      <h3>What we don&rsquo;t</h3>
      <p>No advertising pixels, no cross-site tracking, no fingerprinting. This is also why there is no cookie banner: there is nothing to consent to.</p>
    </Legal>
  );
}

/** Data Processing Addendum. Previously a soft-200 to the homepage, so any
 *  contract or DPIA citing resolver.chat/dpa referenced nothing. */
export function DpaPage() {
  return (
    <Legal title="Data processing addendum" updated="August 2026">
      <p>This addendum forms part of the Terms of Service and applies where Resolver Ventures LLC (&ldquo;processor&rdquo;) processes personal data on behalf of you (&ldquo;controller&rdquo;) under Art. 28 GDPR and equivalent laws.</p>
      <h3>Subject matter and duration</h3>
      <p>We process customer support correspondence and the Shopify order data needed to answer it, for as long as you have an active account, and delete it within 30 days of termination.</p>
      <h3>Nature and purpose</h3>
      <p>Matching inbound email to the correct order, drafting a reply in the customer&rsquo;s language, and sending it from your mailbox on your instruction.</p>
      <h3>Categories of data and data subjects</h3>
      <p>Name, email address, postal address, phone number, order and fulfilment details, and the content of the messages themselves. Data subjects are your customers and your staff.</p>
      <h3>Our obligations</h3>
      <p>We process only on your documented instructions; bind our personnel to confidentiality; apply the security measures described on the Security page; assist you with data-subject requests and with Art. 32&ndash;36 obligations; and delete or return the data at the end of the service.</p>
      <h3>Sub-processors</h3>
      <p>The current list, with purpose and region, is on the <a href="/privacy">Privacy page</a>. We give notice before adding a new sub-processor and you may object.</p>
      <h3>International transfers</h3>
      <p>Transfers outside the EEA and UK rely on the European Commission&rsquo;s Standard Contractual Clauses together with the UK Addendum.</p>
      <h3>Breach notification</h3>
      <p>We notify you without undue delay, and within 72 hours where required, of any personal-data breach affecting your data, with the information you need for your own reporting.</p>
      <h3>Audit</h3>
      <p>On reasonable written request, and no more than once a year, we will provide the information necessary to demonstrate compliance with this addendum.</p>
    </Legal>
  );
}

/** Security overview. Also previously a soft-200. */
export function SecurityPage() {
  return (
    <Legal title="Security" updated="August 2026">
      <h3>Credentials</h3>
      <p>Shopify admin tokens and mailbox refresh tokens are stored in Google Secret Manager, never in the database and never in logs. They are never returned by any API response.</p>
      <h3>Access to your mailbox</h3>
      <p>Mail access uses Google Workspace domain-wide delegation or your own OAuth grant, scoped to sending and reading the connected mailbox. You can revoke it at any time from your Google admin console.</p>
      <h3>Isolation</h3>
      <p>Every record is keyed to the store it belongs to, and every read and write is scoped to the account that owns that store. Database access is server-side only; the browser never queries it directly.</p>
      <h3>Encryption</h3>
      <p>All traffic is TLS. Data at rest is encrypted by Google Cloud Firestore and Secret Manager.</p>
      <h3>AI processing</h3>
      <p>Drafting and translation use OpenAI under zero-retention terms. Your data is not used to train any model. Drafts are held for a human to approve unless you explicitly enable automatic sending for a category.</p>
      <h3>Backups</h3>
      <p>The database is exported daily to a separate storage bucket with its own retention.</p>
      <h3>Reporting an issue</h3>
      <p>Email <a href="mailto:hello@resolver.chat">hello@resolver.chat</a>. We acknowledge security reports within one business day.</p>
    </Legal>
  );
}
