// Resolver brand package, /brand (also #brand on the static test env).
// The single source of truth for the identity: logo, color, type, components,
// motion, voice, plus three accent-direction variants side by side for review,
// and the engineering notes another session needs to continue the work.
const LOGO_BLACK = '/logo/recolor/oct-black-t.png';
const LOGO_BLUE = '/logo/recolor/oct-bluewhite-t.png';
const LOGO_WHITE = '/logo/recolor/oct-whiteblue-t.png';

const COLORS = [
  { name: 'Ink', hex: '#16181C', use: 'Text, primary buttons, dark cards. The brand carries in black.' },
  { name: 'Paper', hex: '#FFFFFF', use: 'Page ground. Sections alternate paper and band.' },
  { name: 'Band', hex: '#F5F5F4', use: 'Soft section bands and card fills. Never pure gray, warm bias.' },
  { name: 'Indigo (heritage)', hex: '#2A2FB8', use: 'The original mark’s blue. NOT used in UI, kept only as the app-icon variant.' },
  { name: 'Success', hex: '#3D7A50', use: 'Live / fulfilled / sent states. On #E8F0EB chips.' },
  { name: 'Risk', hex: '#B4472F', use: 'Chargeback, legal, escalation. On #FBEFEC chips.' },
  { name: 'Text soft', hex: '#6B6E76', use: 'Body copy and secondary text.' },
];

function Variant({ tone }: { tone: 'mono' | 'indigo' | 'ink' }) {
  const T = {
    mono: {
      name: 'V1 · Monochrome', note: 'current site',
      bg: '#fff', ink: '#16181C', soft: '#6B6E76', band: '#F5F5F4',
      pri: '#16181C', priTx: '#fff', badgeBg: '#F5F5F4', badgeTx: '#6B6E76', chip: '#2A2FB8',
    },
    indigo: {
      name: 'V2 · Indigo accent', note: 'CTAs & highlights in brand blue',
      bg: '#fff', ink: '#16181C', soft: '#6B6E76', band: '#F0F1FA',
      pri: '#2A2FB8', priTx: '#fff', badgeBg: '#EEEFF9', badgeTx: '#2A2FB8', chip: '#2A2FB8',
    },
    ink: {
      name: 'V3 · Ink-forward', note: 'dark surfaces, white type',
      bg: '#16181C', ink: '#FFFFFF', soft: 'rgba(255,255,255,.62)', band: 'rgba(255,255,255,.08)',
      pri: '#FFFFFF', priTx: '#16181C', badgeBg: 'rgba(255,255,255,.1)', badgeTx: 'rgba(255,255,255,.7)', chip: '#8B90F5',
    },
  }[tone];
  return (
    <div className="variant">
      <div className="vh"><b>{T.name}</b><span>{T.note}</span></div>
      <div className="vmock" style={{ background: T.bg }}>
        <span className="vbadge" style={{ background: T.badgeBg, color: T.badgeTx }}>AI support operations</span>
        <h4 style={{ color: T.ink }}>Your customer emails, answered from the real order.</h4>
        <p style={{ color: T.soft }}>Matched to the live Shopify order, drafted in the customer&rsquo;s language.</p>
        <div className="vctas">
          <span className="vbtn" style={{ background: T.pri, color: T.priTx }}>Start free</span>
          <span className="vbtn" style={{ background: T.band, color: T.ink }}>Book a demo</span>
        </div>
        <div className="vcard" style={{ background: T.band, color: T.soft }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
            <i style={{ width: 7, height: 7, borderRadius: 99, background: T.chip, display: 'inline-block' }} />
            <b style={{ color: T.ink, fontWeight: 500 }}>Where is my order?</b>
          </span>
          <span>Draft ready</span>
        </div>
      </div>
    </div>
  );
}

export function BrandPage() {
  return (
    <div className="bp wrap">
      <div className="bp-head">
        <h1>Resolver, brand package</h1>
        <span className="v">v1 · July 2026 · resolver.chat</span>
      </div>

      {/* 01 logo */}
      <section className="bp-sec">
        <span className="n">01 · Logo</span>
        <h2>The octagon carries the brand.</h2>
        <p className="d">
          A checkmark inside an octagon, a resolution, stamped. The primary mark is ink
          black; the indigo original survives as the color source for the palette. The
          lockup is the mark at cap-height beside &ldquo;resolver.chat&rdquo; set in Inter
          Tight 600, gap 7px. Never letterspace the wordmark, never recolor the mark
          outside these three variants, keep clear space of one check-width around it.
        </p>
        <div className="bp-grid c3">
          <div className="bp-card">
            <div className="bp-logo-row">
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <img src={LOGO_BLACK} alt="" style={{ height: 24 }} />
                <span style={{ fontWeight: 600, fontSize: 21, letterSpacing: '-.022em' }}>resolver.chat</span>
              </span>
            </div>
            <div className="cap">Primary, ink on paper. Nav, footer, documents.</div>
          </div>
          <div className="bp-card">
            <div className="bp-logo-row"><img src={LOGO_BLUE} alt="" style={{ height: 64 }} /></div>
            <div className="cap">Indigo mark, app icon, favicon, small square contexts.</div>
          </div>
          <div className="bp-card oninkbg">
            <div className="bp-logo-row"><img src={LOGO_WHITE} alt="" style={{ height: 64 }} /></div>
            <div className="cap" style={{ color: 'rgba(255,255,255,.55)' }}>Reversed, dark surfaces only.</div>
          </div>
        </div>
      </section>

      {/* 02 color */}
      <section className="bp-sec">
        <span className="n">02 · Color</span>
        <h2>Monochrome. Full stop.</h2>
        <p className="d">
          Ink on paper with warm-gray bands, no accent color in the UI at all. The decision
          is final: V1 monochrome, indigo dropped. Semantic green/red exist only inside
          product UI status chips.
        </p>
        <div className="bp-grid c4">
          {COLORS.map((c) => (
            <div className="bp-card" key={c.name} style={{ padding: 16 }}>
              <div className="sw-big" style={{ background: c.hex }} />
              <div className="sw-name">{c.name}</div>
              <div className="sw-hex">{c.hex}</div>
              <div className="cap">{c.use}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 03 type */}
      <section className="bp-sec">
        <span className="n">03 · Typography</span>
        <h2>One family: Inter Tight.</h2>
        <p className="d">
          Weights 400/500/600 only. Headlines 600 with −0.03em tracking and text-wrap
          balance; body 400 at 15 to 16.5px, line-height 1.55 to 1.65; UI labels 500. No second
          typeface, no mono, no all-caps except tiny 11 to 13px labels with +0.06em.
        </p>
        <div style={{ marginTop: 8 }}>
          <div className="type-row"><span className="tag">Display · 600 · −.035em</span><span style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-.035em', lineHeight: 1.05 }}>Answered from the real order.</span></div>
          <div className="type-row"><span className="tag">Section · 600 · −.03em</span><span style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-.03em' }}>Automation you can supervise.</span></div>
          <div className="type-row"><span className="tag">Card title · 600</span><span style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-.02em' }}>Detect &amp; categorize every request</span></div>
          <div className="type-row"><span className="tag">Body · 400 · 1.6</span><span style={{ fontSize: 15.5, color: 'var(--tx-soft)', maxWidth: '52ch' }}>Resolver matches every support email to the live Shopify order and drafts the reply in the customer&rsquo;s language.</span></div>
          <div className="type-row"><span className="tag">Label · 500 · caps</span><span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--tx-faint)' }}>Security &amp; data</span></div>
        </div>
      </section>

      {/* 04 components */}
      <section className="bp-sec">
        <span className="n">04 · Components</span>
        <h2>Pills, soft cards, status chips.</h2>
        <div className="bp-grid c3">
          <div className="bp-card">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span className="btn pri sm">Start free</span>
              <span className="btn soft sm" style={{ background: '#fff' }}>Book a demo</span>
            </div>
            <div className="cap">Buttons are full pills, 500 weight. Primary is ink (V1), one primary per view.</div>
          </div>
          <div className="bp-card">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11.5, fontWeight: 500, borderRadius: 999, padding: '3px 10px', background: '#E8F0EB', color: '#3D7A50' }}>Live · 30s window</span>
              <span style={{ fontSize: 11.5, fontWeight: 500, borderRadius: 999, padding: '3px 10px', background: '#F5F5F4', color: '#6B6E76' }}>Shadow</span>
              <span style={{ fontSize: 11.5, fontWeight: 500, borderRadius: 999, padding: '3px 10px', background: '#FBEFEC', color: '#B4472F' }}>Human only</span>
              <span style={{ fontSize: 11.5, fontWeight: 500, borderRadius: 999, padding: '3px 10px', background: '#EEEFF9', color: '#2A2FB8' }}>Draft ready</span>
            </div>
            <div className="cap">Status chips: tinted bg + dark tone of the same hue. The four states above are the entire vocabulary.</div>
          </div>
          <div className="bp-card" style={{ background: '#fff', border: '1px solid var(--line)', boxShadow: 'var(--cardsh)' }}>
            <b style={{ fontSize: 14 }}>Soft card</b>
            <div className="cap">Cards: 16 to 20px radius, band fill OR white + hairline + soft shadow. Never hard borders, never both fills at once.</div>
          </div>
        </div>
      </section>

      {/* 05 motion */}
      <section className="bp-sec">
        <span className="n">05 · Motion</span>
        <h2>Calm loops, one set piece per page.</h2>
        <div className="bp-list">
          <div className="li"><b>Arrival</b><span>blurred fade-up: opacity 0→1, y 26→0, blur 7→0, 0.65s, cubic-bezier(.2,.7,.2,1), once, −80px margin. Grids stagger children by 80 to 120ms.</span></div>
          <div className="li"><b>Loops</b><span>in-card demos loop on CSS keyframes (cycling highlights, sequenced fills, typing dots). Subtle, ≥2.4s periods, never two loops fighting in one viewport.</span></div>
          <div className="li"><b>Set pieces</b><span>one theatrical moment per page (pill carousel, dot globe, auto-advancing accordion at 5s with filling progress bar). JS-driven pieces pause on hover.</span></div>
          <div className="li"><b>Respect</b><span>every animation is disabled under prefers-reduced-motion; content must be complete and readable with all animation off.</span></div>
        </div>
      </section>

      {/* 06 voice */}
      <section className="bp-sec">
        <span className="n">06 · Voice</span>
        <h2>Plain, specific, verifiable.</h2>
        <div className="bp-grid c3" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="bp-card">
            <b style={{ fontSize: 14 }}>Do</b>
            <div className="cap">Short declaratives. Concrete mechanics (&ldquo;order number first, customer email second&rdquo;). Product guarantees as numbers (3 lanes, 30s window). Name the fear honestly: chargebacks, refunds, silence.</div>
          </div>
          <div className="bp-card">
            <b style={{ fontSize: 14 }}>Don&rsquo;t</b>
            <div className="cap">No invented customer stats or ROI. No &ldquo;instantly / in seconds / revolutionize&rdquo;. No fake logo walls or testimonials. No exclamation marks. Demo numbers are always labeled demo.</div>
          </div>
        </div>
      </section>

      {/* 07 variants */}
      <section className="bp-sec">
        <span className="n">07 · Accent direction, DECIDED: V1</span>
        <h2>Three treatments, same system.</h2>
        <p className="d">
          Decision made July 2026: V1 monochrome ships, and even the &ldquo;slight indigo&rdquo;
          accents were dropped after review. V2/V3 kept below for the record only.
        </p>
        <div className="bp-grid c3">
          <Variant tone="mono" />
          <Variant tone="indigo" />
          <Variant tone="ink" />
        </div>
      </section>

      {/* 08 engineering */}
      <section className="bp-sec">
        <span className="n">08 · Engineering notes</span>
        <h2>How this is built, for the next session.</h2>
        <div className="bp-list">
          <div className="li"><b>Stack</b><span>Vite + React 19 + TypeScript. Marketing site is src/saas/Landing.tsx (single file, one function per section); this page is src/saas/BrandPage.tsx; the app demo is src/saas/AppConsole.tsx at /app.</span></div>
          <div className="li"><b>Styling</b><span>plain CSS in src/index.css, design tokens as CSS custom properties in :root, purpose-named classes per section. Tailwind is imported for preflight only; don&rsquo;t add utility soup.</span></div>
          <div className="li"><b>Animation</b><span>motion/react for scroll reveals (the Reveal component) and SVG path draws; CSS keyframes for loops; rAF only for the dot globe. Everything guarded by prefers-reduced-motion.</span></div>
          <div className="li"><b>Assets</b><span>logo PNGs in public/logo/recolor (oct-black-t is primary). Fonts: Google Fonts, Inter Tight 400/500/600, the only family.</span></div>
          <div className="li"><b>Honesty rule</b><span>no fabricated metrics, customers, or testimonials anywhere. Product facts and clearly-labeled demo data only. This is a hard constraint, not a preference.</span></div>
          <div className="li"><b>Deploy</b><span>repo ncthn/resolver-site-test → Render (Docker). The GitHub webhook does NOT fire: after pushing, trigger via Render API POST /v1/services/&#123;id&#125;/deploys. Full details in BRAND.md at the repo root.</span></div>
        </div>
      </section>
    </div>
  );
}
