# Resolver — brand & engineering package (v1, July 2026)

The living visual version of this document is `/brand` on the deployed site
(resolver-site-test.onrender.com/brand). This file is the text source of truth
for any session continuing the work.

## Identity

- **Mark**: checkmark in an octagon ("a resolution, stamped"). Primary = ink
  black (`public/logo/recolor/oct-black-t.png`). Indigo original for app
  icon/favicon; white for dark surfaces. Lockup = mark at ~20px beside
  `resolver.chat` in Inter Tight 600, 7px gap. Never letterspace or recolor.
- **Color**: ink `#16181C`, paper `#FFFFFF`, band `#F5F5F4` (warm gray),
  indigo `#2A2FB8` (HERITAGE ONLY — dropped from all UI July 2026; survives solely as the blue app-icon asset), success
  `#3D7A50` on `#E8F0EB`, risk `#B4472F` on `#FBEFEC`, body text `#6B6E76`,
  faint `#9A9DA4`, hairline `rgba(22,24,28,.07)`.
- **Type**: Inter Tight only (Google Fonts), weights 400/500/600. Headlines
  600 at -0.03em; body 400 at 15-16.5px / 1.6; tiny caps labels +0.06em.
- **Components**: pill buttons (ink primary, band soft); cards 16-20px radius,
  band fill OR white+hairline+soft shadow; the four status chips (Live /
  Shadow / Human only / Draft ready) are the whole state vocabulary.
- **Motion**: arrivals = blurred fade-up (opacity+y26+blur7, .65s,
  cubic-bezier(.2,.7,.2,1), once); loops = CSS keyframes, >=2.4s periods;
  one set piece per page (pill carousel / dot globe / auto-accordion, 5s,
  pause on hover). Everything off under prefers-reduced-motion.
- **Voice**: plain, specific, verifiable. No invented stats/customers/
  testimonials. No "instantly/in seconds". Demo numbers labeled "demo data".
  This is a hard constraint.

## Accent-direction variants (owner to pick — see /brand §07)

DECIDED: V1 monochrome, all indigo accents dropped (July 2026). V2/V3 rejected.

## Engineering

- **Stack**: Vite + React 19 + TS. `src/saas/Landing.tsx` (one function per
  section), `src/saas/BrandPage.tsx` (/brand), `src/saas/AppConsole.tsx`
  (/app demo). Routing is path OR #hash (static-host fallback) in main.tsx.
- **Styling**: plain CSS in `src/index.css` — tokens in `:root`, purpose-named
  classes per section, console styles namespaced `cs-*` at the end. Tailwind
  imported for preflight only; do not add utility classes.
- **Animation**: motion/react for Reveal + SVG path draw; CSS keyframes for
  loops; rAF only for the dot globe. Guard everything with reduced-motion.
- **Build**: `npm run typecheck && npm run build` (tsc is part of build).
- **Deploy**: repo `ncthn/resolver-site-test` -> Render Docker web service
  `srv-d91r08a8qa3s73b3get0`. The GitHub webhook does NOT fire — after every
  push, trigger manually: `POST https://api.render.com/v1/services/<id>/deploys`
  with the Render API key (on the VPS at ~/.config/resolver/render.env).
- **Assets**: logos in `public/logo/recolor/`. `oct-black-t.png` is trimmed +
  artifact-cleaned; regenerate variants from `oct-bluewhite-t.png` if needed.

## Relationship to production (resolver.chat)

This repo is the design test bed. Production (repo hF9Z5/rsvlr) still runs the
old teal/two-bubble identity. Porting this identity to production is a separate,
deliberate step: landing, onboarding, login, dashboard tokens, embedded Polaris
panel, favicons, and the 5 Shopify listing images would all need the octagon
treatment. Do not port piecemeal without the owner's go.
