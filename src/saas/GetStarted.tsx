// Resolver, onboarding welcome flow (/get-started), the new-brand version of
// the production wizard (rsvlr src/saas/Onboarding.tsx): Install the Shopify
// app → create your login → SOP upload + policy extraction → connect Gmail →
// shadow mode. Demo-functional: each step advances with realistic states; the
// SOP step shows the policy-extraction concept (structured fields distilled
// from the uploaded document) that personalization is built on.
import { useEffect, useState } from 'react';
import {
  ShoppingBag, Mail, FileText, Check, ArrowRight, Loader2, Eye, Lock, FileSearch,
} from 'lucide-react';

const LOGO = '/logo/recolor/oct-black-t.png';
const STEPS = ['Store', 'Account', 'Policies', 'Inbox', 'History', 'Done'] as const;

function Stepper({ at }: { at: number }) {
  return (
    <div className="ob-stepper" aria-label="Setup progress">
      {STEPS.map((s, i) => (
        <div className={'ob-step' + (i < at ? ' done' : i === at ? ' on' : '')} key={s}>
          <span className="dot">{i < at ? <Check size={11} strokeWidth={3} /> : i + 1}</span>
          <span className="lb">{s}</span>
          {i < STEPS.length - 1 && <span className="ln" />}
        </div>
      ))}
    </div>
  );
}

function ImportStep({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'ask' | 'scanning' | 'confirm'>('ask');
  const [scanned, setScanned] = useState(0);
  useEffect(() => {
    if (phase !== 'scanning') return;
    const id = setInterval(() => {
      setScanned((n) => {
        if (n >= 412) { clearInterval(id); setTimeout(() => setPhase('confirm'), 400); return 412; }
        return Math.min(412, n + 23);
      });
    }, 90);
    return () => clearInterval(id);
  }, [phase]);
  return (
    <section className="ob-card">
      <span className="ob-ic"><FileSearch size={22} strokeWidth={1.9} /></span>
      {phase === 'ask' && (
        <>
          <h1>Learn from your last 30 days.</h1>
          <p>
            Resolver can read your recent support conversations to learn your tone, your
            most common requests, and how you actually answer. Nothing is changed or
            sent; you confirm everything it finds.
          </p>
          <div className="ob-perm">
            <div><Lock size={13} /> Read-only scan of the connected mailbox</div>
            <div><Lock size={13} /> Findings are shown to you before anything is used</div>
          </div>
          <button className="btn pri" onClick={() => setPhase('scanning')}>Analyze my last 30 days</button>
          <button className="ob-skip" onClick={onDone}>Skip, start from my SOP only</button>
        </>
      )}
      {phase === 'scanning' && (
        <>
          <h1>Reading your conversations…</h1>
          <p>Pairing customer questions with the answers your team actually sent.</p>
          <div className="ob-scan">
            <div className="bar"><i style={{ width: (scanned / 412) * 100 + '%' }} /></div>
            <span>{scanned} of 412 conversations</span>
          </div>
        </>
      )}
      {phase === 'confirm' && (
        <>
          <h1>Here&rsquo;s what we learned. Confirm it.</h1>
          <div className="ob-extract" style={{ marginTop: 14 }}>
            <div className="ok"><Check size={13} strokeWidth={2.6} /> 412 conversations analyzed</div>
            {[
              ['Top requests', 'Shipping 38%, returns 19%, sizing 12%'],
              ['Languages seen', 'EN 61%, DE 15%, FR 13%, IT 7%'],
              ['Your tone', 'Warm, concise, first-name greetings, no exclamation marks'],
              ['Reply patterns', '5 example replies saved as voice references'],
              ['Suggested first lane', 'Shipping / WISMO, your most repetitive volume'],
            ].map(([k, v]) => (
              <div className="row" key={k}><span>{k}</span><b>{v}</b></div>
            ))}
            <span className="ob-fine">Every one of these is editable later in Settings → Policies.</span>
          </div>
          <button className="btn pri" onClick={onDone}>Use this <ArrowRight size={15} /></button>
          <button className="ob-skip" onClick={onDone}>Discard the analysis</button>
        </>
      )}
    </section>
  );
}

export function GetStarted() {
  const [at, setAt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sopDone, setSopDone] = useState(false);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');

  useEffect(() => { window.scrollTo(0, 0) }, [at]);
  const advance = () => setAt((v) => Math.min(v + 1, STEPS.length - 1));
  const fake = (ms: number, then?: () => void) => {
    setBusy(true);
    setTimeout(() => { setBusy(false); then?.(); advance(); }, ms);
  };

  return (
    <div className="ob">
      <header className="ob-head">
        <a className="brand" href="/"><img src={LOGO} alt="" /><span className="wm">resolver.chat</span></a>
        <span className="ob-exit"><a href="/">Exit setup</a></span>
      </header>
      <main className="ob-main">
        <Stepper at={at} />

        {at === 0 && (
          <section className="ob-card">
            <span className="ob-ic"><ShoppingBag size={22} strokeWidth={1.9} /></span>
            <h1>Install the Shopify app</h1>
            <p>
              Setup starts in your Shopify admin: one click from the App Store, read-only scopes. No account needed first; your login comes right after the install.
            </p>
            <div className="ob-perm">
              <div><Lock size={13} /> Orders, customers, fulfillments: <b>read-only</b></div>
              <div><Lock size={13} /> Resolver cannot modify your store</div>
            </div>
            <button className="btn pri" disabled={busy} onClick={() => fake(900)}>
              {busy ? <Loader2 size={15} className="c-spin" /> : <ShoppingBag size={15} />} Install from the App Store
            </button>
            <span className="ob-fine">Demo flow, no real install happens on this preview.</span>
          </section>
        )}

        {at === 1 && (
          <section className="ob-card">
            <span className="ob-ic"><Check size={22} strokeWidth={2} /></span>
            <h1>Store connected. Create your login.</h1>
            <p>Your Resolver account manages every store you connect. This is the email you&rsquo;ll sign in with.</p>
            <div className="ob-form">
              <label>Email<input type="email" placeholder="you@store.com" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
              <label>Password<input type="password" placeholder="At least 8 characters" value={pw} onChange={(e) => setPw(e.target.value)} /></label>
            </div>
            <button className="btn pri" disabled={busy || !email || pw.length < 8} onClick={() => fake(700)}>
              {busy ? <Loader2 size={15} className="c-spin" /> : null} Create account <ArrowRight size={15} />
            </button>
          </section>
        )}

        {at === 2 && (
          <section className="ob-card">
            <span className="ob-ic"><FileText size={22} strokeWidth={1.9} /></span>
            <h1>Teach it your policies.</h1>
            <p>
              Upload your support SOP as a PDF, a doc, or plain notes. Resolver distills it into
              structured policies that constrain every draft. You can edit any of them later.
            </p>
            {!sopDone ? (
              <button className="ob-drop" disabled={busy} onClick={() => { setBusy(true); setTimeout(() => { setBusy(false); setSopDone(true); }, 1400); }}>
                {busy ? <><Loader2 size={16} className="c-spin" /> Reading your document…</> : <>Drop your SOP here, or click to upload</>}
              </button>
            ) : (
              <div className="ob-extract">
                <div className="ok"><Check size={13} strokeWidth={2.6} /> support-sop.pdf read. Here&rsquo;s what we extracted:</div>
                {[
                  ['Refund window', '30 days from delivery'],
                  ['Reshipment', 'Free reship on damage, photo required'],
                  ['Order changes', 'Allowed until fulfillment'],
                  ['Tone', 'Warm, plain language, no exclamation marks'],
                  ['Escalate always', 'Chargebacks, legal threats, press'],
                ].map(([k, v]) => (
                  <div className="row" key={k}><span>{k}</span><b>{v}</b></div>
                ))}
                <span className="ob-fine">Wrong somewhere? Everything is editable in Settings → Policies.</span>
              </div>
            )}
            {sopDone && (
              <button className="btn pri" onClick={advance}>Looks right <ArrowRight size={15} /></button>
            )}
          </section>
        )}

        {at === 3 && (
          <section className="ob-card">
            <span className="ob-ic"><Mail size={22} strokeWidth={1.9} /></span>
            <h1>Connect your support inbox.</h1>
            <p>
              Replies send from your own Gmail address. Turn Resolver off at any time and
              your inbox is exactly where you left it. Nothing is held hostage.
            </p>
            <button className="btn pri" disabled={busy} onClick={() => fake(1100)}>
              {busy ? <Loader2 size={15} className="c-spin" /> : <Mail size={15} />} Connect Gmail
            </button>
            <span className="ob-fine">Demo flow, no real OAuth happens on this preview.</span>
          </section>
        )}

        {at === 4 && (
          <ImportStep onDone={advance} />
        )}

        {at === 5 && (
          <section className="ob-card">
            <span className="ob-ic" style={{ background: '#E8F0EB', color: '#3D7A50' }}><Eye size={22} strokeWidth={1.9} /></span>
            <h1>You&rsquo;re in shadow mode.</h1>
            <p>
              Resolver is now reading new tickets and drafting silently. Nothing sends. Compare its drafts to what you would have written, then turn on your first
              lane when they&rsquo;ve earned it.
            </p>
            <div className="ob-extract" style={{ marginTop: 4 }}>
              {[
                ['Every lane', 'Shadow, drafts only'],
                ['Chargebacks & legal', 'Human only, always'],
                ['Your next step', 'Review drafts for a few days, then flip WISMO live'],
              ].map(([k, v]) => (
                <div className="row" key={k}><span>{k}</span><b>{v}</b></div>
              ))}
            </div>
            <a className="btn pri" href="/app">Open your inbox <ArrowRight size={15} /></a>
          </section>
        )}
      </main>
    </div>
  );
}
