import { useState, useEffect, useRef } from 'react'
import {
  Inbox, Package, Globe, ShieldCheck, Zap, Check, ArrowRight, Plus, Star,
  Lock, ScanSearch, MessageSquare, Sparkles, ListChecks, BarChart3, Mail,
  CircleCheck, Languages as LangIcon, Store, Gavel, Clock, Twitter, Linkedin, Github
} from 'lucide-react'

/* ---------- scroll reveal ---------- */
function useReveal() {
  const ref = useRef(null)
  useEffect(() => {
    const els = ref.current?.querySelectorAll('.reveal') || []
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } })
    }, { threshold: 0.12 })
    els.forEach(el => io.observe(el))
    return () => io.disconnect()
  }, [])
  return ref
}

const LOGO_W = '/logo/recolor/oct-whiteblue-t.png'   // white mark — for dark backgrounds
const LOGO_B = '/logo/recolor/oct-bluewhite-t.png'   // blue mark — for light backgrounds

/* ---------- nav (floating pill, docks on scroll) ---------- */
function Nav() {
  const [docked, setDocked] = useState(false)
  useEffect(() => {
    const onScroll = () => setDocked(window.scrollY > 24)
    window.addEventListener('scroll', onScroll); return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div className={'navwrap' + (docked ? ' docked' : '')}>
      <nav>
        <a className="brand" href="#top"><img className="logo" src={LOGO_B} alt="resolver.chat" /><span className="wm">resolver<span style={{ opacity:.55 }}>.chat</span></span></a>
        <div className="nl">
          <a href="#how">How it works</a><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#security">Security</a><a href="#faq">FAQ</a>
        </div>
        <div className="nr"><a className="login" href="#">Sign in</a><a className="btn btn-indigo" href="#cta">Start setup</a></div>
      </nav>
    </div>
  )
}

/* ---------- interactive inbox ---------- */
const TICKETS = [
  { id:'t1', red:true,  title:'Chargeback threatened', who:'A. Weber · DE', q:'"I\'m reporting this to my bank and my lawyer."',
    esc:true,  head:'Held for a human — never auto-sent', meta:'#1991 · disputed · $59',
    body:'Hi A. Weber — I\'m sorry about order #1991. I\'ve escalated this to a specialist who will personally review the dispute and reply within 24 hours.' },
  { id:'t2', red:false, title:'Where is my order?', who:'Maria Lopez · US', q:'"I ordered 3 weeks ago and still nothing 😟"',
    esc:false, head:'Auto-drafted · 0.8s', meta:'#1042 · in transit · 21 days',
    body:'Hi Maria — your order #1042 shipped and is in transit, arriving in 2–3 days. Here\'s live tracking: CP998… I\'ll keep an eye on it.' },
  { id:'t3', red:false, title:'Return request', who:'James Carter · GB', q:'"It didn\'t fit — can I return it?"',
    esc:false, head:'Auto-drafted · policy-aware', meta:'#2090 · delivered · within window',
    body:'Hi James — happy to help with your return. Here\'s your prepaid label and the 3 quick steps to send it back.' },
]
function InboxDemo() {
  const [sel, setSel] = useState('t2')
  const t = TICKETS.find(x => x.id === sel)
  return (
    <div className="window">
      <div className="win-h"><span className="ico"><MessageSquare size={11} /></span> resolver.chat · Inbox</div>
      <div className="win-body">
        <div className="win-list">
          {TICKETS.map(x => (
            <div key={x.id} className={'tk' + (x.id===sel?' sel':'')} onClick={() => setSel(x.id)}>
              <div className="t"><span className="dotc" style={{ background: x.red ? 'var(--red)' : 'var(--teal)' }} />{x.title}</div>
              <div className="s">{x.who}</div>
            </div>
          ))}
        </div>
        <div className="win-pane">
          <div className="q">{t.who} · {t.q}</div>
          <div key={t.id} className={'draft' + (t.esc?' esc':'')}>
            <div className="dh" style={{ color: t.esc ? '#B23636' : 'var(--teal)' }}>
              {t.esc ? <Gavel size={11} /> : <Sparkles size={11} />}{t.head}
            </div>
            <div className="bd">{t.body}</div>
            <div style={{ fontSize:11, color:'#9A9AB0', marginTop:10 }}>{t.meta}</div>
            <div className="act">
              {t.esc
                ? <><span className="mini rv">Review</span><span className="mini gh">Edit</span></>
                : <><span className="mini go">Approve &amp; send</span><span className="mini gh">Edit</span></>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ---------- languages ---------- */
const LANGS = {
  EN:"Hi! Your order is on its way and arrives in 2–3 days. Here's your live tracking — I'll keep an eye on it. Thanks for your patience!",
  FR:"Bonjour ! Votre commande est en route et arrive dans 2 à 3 jours. Voici votre suivi en direct — je garde un œil dessus. Merci de votre patience !",
  DE:"Hallo! Ihre Bestellung ist unterwegs und kommt in 2–3 Tagen an. Hier ist Ihre Live-Sendungsverfolgung — ich behalte sie im Auge. Danke für Ihre Geduld!",
  ES:"¡Hola! Tu pedido está en camino y llega en 2–3 días. Aquí tienes el seguimiento en vivo — lo estaré vigilando. ¡Gracias por tu paciencia!",
}
function Languages() {
  const [lang, setLang] = useState('FR')
  return (
    <>
      <div className="langtabs">{['EN','FR','DE','ES'].map(l => (
        <span key={l} className={'tb' + (l===lang?' on':'')} onClick={() => setLang(l)}>{l}</span>))}</div>
      <div className="reply" key={lang}>{LANGS[lang]}</div>
    </>
  )
}

/* ---------- pricing ---------- */
const PLANS = [
  { n:'Solo', d:'1 store · 1 seat · 300 tickets/mo', m:59, rec:false,
    f:['Shadow + auto-send','Live order & tracking lookup','Chargeback & legal flags','30+ languages'] },
  { n:'Team', d:'3 stores · 3 seats · 2,500 tickets/mo', m:249, rec:true,
    f:['Everything in Solo','Per-store voice & policy','Lane analytics','Priority email support'] },
  { n:'Portfolio', d:'Unlimited stores · 10 seats · 6,000/mo', m:599, rec:false,
    f:['Everything in Team','Cross-store insights','Custom rules engine','Priority support'] },
  { n:'Enterprise', d:'Custom volume & contract', m:null, rec:false,
    f:['Unlimited everything','SSO & data residency','Dedicated success manager','SLA & security review'] },
]
function Pricing() {
  const [annual, setAnnual] = useState(true)
  const price = (m) => m == null ? 'Custom' : (annual ? Math.round(m * 0.8) : m)
  return (
    <div className="wrap">
      <span className="lbl reveal">Pricing</span>
      <h2 className="big reveal" style={{ marginTop:10 }}>Pricing that scales with your tickets.</h2>
      <div className="ptoggle reveal">
        <span className={annual ? '' : 'on'}>Monthly</span>
        <button className={'switch' + (annual ? ' annual' : '')} onClick={() => setAnnual(a => !a)} aria-label="toggle billing"><span className="knob" /></button>
        <span className={annual ? 'on' : ''}>Annual</span>
        <span className="save">Save 20%</span>
      </div>
      <div className="prices">
        {PLANS.map(p => (
          <div key={p.n} className={'plan reveal' + (p.rec ? ' rec' : '')}>
            {p.rec && <span className="tag">Most popular</span>}
            <div className="pn">{p.n}</div><div className="pd">{p.d}</div>
            <div className="pr">{p.m==null ? 'Custom' : <>${price(p.m)}<span>/mo</span></>}</div>
            <ul>{p.f.map(x => <li key={x}><Check className="ck" size={14} />{x}</li>)}</ul>
            <a className={'btn ' + (p.rec ? 'btn-light' : 'btn-ghost')} href="#cta">{p.m==null ? 'Talk to us' : 'Start setup'}</a>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- faq ---------- */
const FAQS = [
  { q:'Will it send something wrong to a customer?', a:'Not unless you let it. Resolver starts in shadow mode and sends nothing until you turn on a lane — and even then, chargebacks, legal threats and large refunds are always held for a human.' },
  { q:'How long does setup take?', a:'About 10 minutes. Install from Shopify, connect your support inbox, and Resolver starts drafting grounded replies immediately in shadow mode.' },
  { q:'Does it really use live order data?', a:'Yes — every reply is written against the real Shopify order, fulfilment status and live carrier tracking, so answers are accurate, not generic.' },
  { q:'What languages are supported?', a:'30+. Resolver detects the customer\'s language, replies natively, and shows your team the English version alongside.' },
  { q:'Can I run multiple stores?', a:'Yes — every storefront flows into one shared inbox, each with its own voice, policy and shadow/auto setting. Filter to one or work them all at once.' },
]
function Faq() {
  const [open, setOpen] = useState(0)
  return (
    <div className="wrap">
      <span className="lbl reveal" style={{ display:'block', textAlign:'center' }}>FAQ</span>
      <h2 className="big reveal" style={{ marginTop:10, textAlign:'center' }}>Questions, answered.</h2>
      <div className="faq">
        {FAQS.map((f, i) => (
          <div key={i} className={'qa reveal' + (open===i ? ' open' : '')}>
            <div className="q" onClick={() => setOpen(open===i ? -1 : i)}>{f.q}<Plus className="pl" size={20} /></div>
            <div className="a"><p>{f.a}</p></div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- page ---------- */
export default function App() {
  const ref = useReveal()
  return (
    <div id="top" ref={ref}>
      <Nav />

      {/* HERO */}
      <section className="band c-indigo hero">
        <div className="wrap">
          <div className="grid">
            <div>
              <span className="hbadge reveal"><Sparkles size={13} /> AI support agent for Shopify</span>
              <h1 className="reveal">Your support inbox, resolved by morning.</h1>
              <p className="sub reveal">Resolver reads every email, pulls the real Shopify order, and drafts the reply in your customer's language — then sends it, or hands the risky ones to you. You wake up to a cleared queue.</p>
              <div className="acts reveal"><a className="btn btn-light" href="#cta">Start free setup <ArrowRight size={16} /></a><a className="btn btn-ghost-d" href="#cta">Book a demo</a></div>
              <div className="micro reveal"><Check size={13} /> Shadow mode first <Check size={13} /> Live order data <Check size={13} /> Auto-send only by lane</div>
            </div>
            <div className="reveal"><InboxDemo /></div>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="band c-white trust">
        <div className="wrap">
          <div className="cap reveal">Trusted by fast-growing Shopify &amp; dropshipping brands</div>
          <div className="logos reveal"><span>AURORA</span><span>Harbor&nbsp;Goods</span><span>NORTHBOUND</span><span>Lumora</span><span>Maison&nbsp;Vela</span></div>
          <div className="stats">
            {[['92%','of tickets resolved before you read them',false],['< 2 min','average first reply, day or night',true],['30+','languages, answered natively',false],['120 hrs','saved per week on support',false]].map(([n,l,t],i)=>(
              <div className="stat reveal" key={i}><div className={'n'+(t?' t':'')}>{n}</div><div className="l">{l}</div></div>
            ))}
          </div>
        </div>
      </section>

      {/* STATEMENT */}
      <section className="band c-tint raised">
        <div className="wrap">
          <span className="pill-tag reveal"><img src={LOGO_B} style={{ height:15 }} /> Ask Resolver — how do I get started?</span>
          <p className="lede reveal">Most support volume is <b>repeat work</b> — WISMO, returns, address changes, cancellations. Resolver clears it <b>while you sleep</b>, so your team only touches what truly needs a human.</p>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="band c-white raised">
        <div className="wrap">
          <span className="lbl reveal">How it works</span>
          <h2 className="big reveal" style={{ marginTop:10 }}>Live in 10 minutes, resolving by tonight.</h2>
          <div className="steps">
            {[[Mail,'01','Reads every email','A ticket lands; Resolver reads the whole thread and detects the language — no rules to write.'],
              [Package,'02','Pulls the real order','Matches the customer to their Shopify order, fulfilment status and live carrier tracking.'],
              [Sparkles,'03','Drafts the resolution','A ready, on-policy reply in the customer\'s language. Most tickets need nothing else from you.'],
              [CircleCheck,'04','You approve, or it sends','Review the draft, or flip the lane to auto-send with a delay and a cancel window you control.']].map(([Ic,n,h,p],i)=>(
              <div className="step reveal" key={i}><div className="si"><Ic size={20} /></div><div className="n">{n}</div><h4>{h}</h4><p>{p}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURE */}
      <section id="features" className="band c-tint feat raised">
        <div className="wrap"><div className="grid">
          <div>
            <span className="lbl reveal">Per-store control</span>
            <h2 className="reveal" style={{ marginTop:10 }}>Set the voice. Keep control.</h2>
            <p className="p reveal">Give every storefront its own tone, policy and signature — then decide, lane by lane, what runs on autopilot and what waits for you.</p>
            <a className="btn btn-indigo reveal" style={{ marginTop:24 }} href="#cta">Explore settings <ArrowRight size={16} /></a>
            <div className="navlist">
              {[[Inbox,'Tickets'],[CircleCheck,'Resolved'],[Mail,'Compose'],[ListChecks,'Tasks & rules'],[BarChart3,'Reporting']].map(([Ic,t],i)=>(
                <div className="li reveal" key={i}><Ic className="ic" size={18} />{t}</div>))}
            </div>
          </div>
          <div>
            <div className="setcard reveal"><div className="lf"><span className="ci"><MessageSquare size={16} /></span><div><div className="t">Tone of voice</div><div className="s">How replies should sound</div></div></div><div className="v">Warm ▾</div></div>
            <div className="setcard reveal"><div className="lf"><span className="ci"><ScanSearch size={16} /></span><div><div className="t">Response length</div><div className="s">Short, medium or detailed</div></div></div><div className="v lite">Short ▾</div></div>
            <div className="setcard reveal"><div className="lf"><span className="ci"><Lock size={16} /></span><div><div className="t">Prohibited phrases</div><div className="s">Words it should never use</div></div></div><div className="v lite">Manage · 29</div></div>
          </div>
        </div></div>
      </section>

      {/* DUO */}
      <section className="band c-white duo raised">
        <div className="wrap">
          <span className="lbl reveal">Grounded</span>
          <h2 className="big reveal" style={{ marginTop:10 }}>It shows its work — on the real order.</h2>
          <div className="pair">
            <div className="dpanel lite reveal">
              <div className="dt"><ScanSearch size={16} /> Reasoning</div>
              {[['Customer','Maria Lopez · #1042'],['Knowledge','Order · tracking · policy'],['Tone','Warm · short'],['Action','Send live tracking + ETA']].map(([a,b],i)=>(
                <div className="think" key={i}><span>{a}</span><span className="r">{b}</span></div>))}
              <div className="think ok"><span>Risk check</span><span className="r">clear · auto-send</span></div>
            </div>
            <div className="dpanel ind reveal">
              <div className="dt"><Globe size={16} /> Reply sent · in the customer's language</div>
              <div className="b me">Where is my order? I placed it 3 weeks ago.</div>
              <div className="b">Hi Maria! Your order #1042 shipped and is in transit, arriving in 2–3 days. Here's live tracking — I'll keep an eye on it and follow up if anything stalls.</div>
              <div className="src">Grounded in<span><Package size={11} /> order #1042</span><span><Globe size={11} /> tracking</span><span><ShieldCheck size={11} /> policy</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* SHADOW */}
      <section className="band c-indigo raised-lg">
        <div className="wrap">
          <span className="lbl reveal">Shadow mode</span>
          <h2 className="big reveal" style={{ marginTop:10, maxWidth:'20ch', color:'#fff' }}>Nothing sends until you trust it.</h2>
          <p className="sub reveal" style={{ opacity:.85, marginTop:16, maxWidth:'58ch', fontSize:17 }}>Resolver starts in shadow mode — it drafts every reply and sends nothing while you watch. Flip lanes to auto-send one at a time, each with a delay, a cancel window, and risky tickets always kept for a human.</p>
          <div className="pipe reveal"><span className="node">Draft</span><ArrowRight className="arr" size={16} /><span className="node">Approved</span><ArrowRight className="arr" size={16} /><span className="node on"><Zap size={14} /> Auto-send</span></div>
          <div className="quote br reveal">"I read the first fifty drafts. They were all right. Now it just runs."</div>
          <div className="qm reveal">store owner · 4 stores · 2,000 tickets / month</div>
        </div>
      </section>

      {/* LANGUAGES */}
      <section className="band c-white raised">
        <div className="wrap">
          <span className="lbl reveal">Any language</span>
          <h2 className="big reveal" style={{ marginTop:10 }}>Replies natively. Your team only reads English.</h2>
          <p className="p reveal" style={{ color:'var(--tx-soft)', marginTop:14, maxWidth:'52ch', fontSize:16 }}>Your buyers are in the US, France, Germany, Mexico and beyond. Resolver writes in their language and shows you the English alongside — control without a translator.</p>
          <div className="reveal"><Languages /></div>
        </div>
      </section>

      {/* STORES */}
      <section className="band c-tint raised">
        <div className="wrap">
          <span className="lbl reveal">One inbox, every store</span>
          <h2 className="big reveal" style={{ marginTop:10 }}>Run ten storefronts without ten VAs.</h2>
          <p className="p reveal" style={{ color:'var(--tx-soft)', marginTop:14, maxWidth:'52ch', fontSize:16 }}>Every store flows into one shared queue — each with its own voice, policy and shadow/auto setting. Filter to one, or work them all at once.</p>
          <div className="stores">
            {[['L','Lumora','12 open','AUTO','#7C3AED'],['V','Vexa','5 open','SHADOW','#0E9488'],['N','Northbound','9 open','AUTO','#2A2FB8'],['M','Maison Vela','3 open','SHADOW','#D14343']].map(([a,n,o,b,c],i)=>(
              <div className="scard reveal" key={i}><div className="av" style={{ background:c }}>{a}</div><div className="nm">{n}</div><div className="mt">{o} <span className={'ba '+(b==='AUTO'?'auto':'sh')}>{b}</span></div></div>
            ))}
          </div>
        </div>
      </section>

      {/* ESCALATE */}
      <section className="band c-indigo esc raised">
        <div className="wrap"><div className="grid">
          <div>
            <span className="lbl reveal">Escalate lane</span>
            <h2 className="big reveal" style={{ marginTop:10, color:'#fff' }}>Chargebacks and lawyers never get auto-replied.</h2>
            <p className="sub reveal" style={{ opacity:.85, marginTop:14, maxWidth:'42ch', fontSize:16 }}>Resolver detects chargeback language, legal threats and refunds over your threshold, pulls them out of auto-send, and pushes them to the top of your queue with full order context attached.</p>
          </div>
          <div className="reveal">
            <div className="escbox">
              <div style={{ fontSize:15 }}>"…I'm reporting this to my bank and my lawyer."</div>
              <div className="pillE"><Gavel size={12} /> ESCALATED · HUMAN</div>
              <div style={{ fontSize:13, color:'#B6B6DC', marginTop:14 }}>Pulled from auto-send · flagged: legal threat · routed to a human with order #1991 attached.</div>
            </div>
            <div className="zero br">0 auto-sent to a lawyer.</div>
          </div>
        </div></div>
      </section>

      {/* SECURITY */}
      <section id="security" className="band c-white sec raised">
        <div className="wrap">
          <span className="lbl reveal">Security &amp; trust</span>
          <h2 className="big reveal" style={{ marginTop:10 }}>Your customers' data, handled properly.</h2>
          <div className="grid">
            {[[Lock,'Encrypted end to end','Data encrypted in transit and at rest with AES-256. Tokens scoped to the minimum Shopify access needed.'],
              [ShieldCheck,'GDPR compliant','Full data-subject request handling, EU data residency available, and customer redaction webhooks supported.'],
              [CircleCheck,'You stay in control','Human-in-the-loop by default, a full audit log of every draft and send, and an instant kill-switch per lane.']].map(([Ic,h,p],i)=>(
              <div className="seccard reveal" key={i}><div className="ic"><Ic size={20} /></div><h4>{h}</h4><p>{p}</p></div>
            ))}
          </div>
          <div className="badges reveal">{['AES-256 encryption','GDPR ready','Built for Shopify','SOC 2 (in progress)','EU data residency'].map(b=>(
            <span className="badge" key={b}><ShieldCheck size={13} /> {b}</span>))}</div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="band c-tint raised">
        <div className="wrap">
          <span className="lbl reveal">Loved by operators</span>
          <h2 className="big reveal" style={{ marginTop:10 }}>From first sale to peak season.</h2>
          <div className="tcards">
            {[['AT','Austin Arthur','Founder, Aurora Threads','Resolver answers overnight in three languages. We stopped hiring for support and our first-reply time dropped to minutes.'],
              ['KM','Keliana Mery','Ops Lead, Harbor Goods','It pulls the real order before replying, so customers get the right answer the first time. The chargeback flags alone paid for it.'],
              ['DS','Dani Soto','Owner, Northbound','Shadow mode sold me. I watched it for a week, trusted it, flipped the lanes. Now I barely open the inbox.']].map(([av,nm,rl,q],i)=>(
              <div className="tcard reveal" key={i}><div className="stars">{[0,1,2,3,4].map(s=><Star key={s} size={14} fill="currentColor" />)}</div><div className="q">"{q}"</div><div className="who"><div className="av">{av}</div><div><div className="nm">{nm}</div><div className="rl">{rl}</div></div></div></div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="band c-white raised"><Pricing /></section>

      {/* FAQ */}
      <section id="faq" className="band c-tint raised"><Faq /></section>

      {/* CTA */}
      <section id="cta" className="band c-indigo end raised-lg">
        <div className="wrap">
          <h2 className="reveal">Let your inbox resolve itself tonight.</h2>
          <p className="sub reveal">Install free, watch it work in shadow mode, and flip on auto-send when you're ready.</p>
          <div className="acts reveal"><a className="btn btn-light" href="#">Start free setup <ArrowRight size={16} /></a><a className="btn btn-ghost-d" href="#">Book a demo</a></div>
        </div>
      </section>

      {/* FOOTER — blue/white logo, wired links */}
      <footer>
        <div className="wrap">
          <div className="foot">
            <div>
              <a className="brand" href="#top"><img className="logo" src={LOGO_W} alt="resolver.chat" style={{ height:27 }} /><span className="wm" style={{ color:'#fff' }}>resolver<span style={{ opacity:.6 }}>.chat</span></span></a>
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
    </div>
  )
}
