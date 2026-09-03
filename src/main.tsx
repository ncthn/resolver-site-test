import { createRoot } from 'react-dom/client'
import './index.css'
import { Landing } from './saas/Landing'
import { AppConsole } from './saas/AppConsole'
import { BrandPage } from './saas/BrandPage'
import { PricingPage, AboutPage, ContactPage, IntegrationsPage, FaqPage, PrivacyPage, TermsPage, CookiesPage, DpaPage, SecurityPage } from './saas/pages'
import { GetStarted } from './saas/GetStarted'

// Embedded (Shopify admin iframe) loads render the CONSOLE, not the marketing
// site. The previous guard redirected framed loads to '/login', which the legacy
// bundle used to serve; after the merge that path returns this same shell, so
// the embedded panel looped forever and showed the marketing page inside the
// Shopify admin. That is almost certainly what the reviewers saw.
let isEmbedded = false
try {
  const q = new URLSearchParams(window.location.search)
  isEmbedded = window.self !== window.top && (!!q.get('host') || q.get('embedded') === '1')
} catch { isEmbedded = true } // cross-origin top means we are framed

// Path routing with #hash fallback for static hosts without rewrites.
const path = window.location.pathname.replace(/\/+$/, '')
const hash = window.location.hash.replace(/^#\/?/, '').replace(/\/+$/, '')
const r = (p: string) => path === '/' + p || hash === p

const ROUTES: [boolean, () => React.ReactElement][] = [
  [r('app'), () => <AppConsole />],
  [r('get-started'), () => <GetStarted />],
  [r('brand'), () => <BrandPage />],
  [r('pricing'), () => <PricingPage />],
  [r('about'), () => <AboutPage />],
  [r('contact'), () => <ContactPage />],
  [r('integrations'), () => <IntegrationsPage />],
  [r('faq'), () => <FaqPage />],
  [r('privacy'), () => <PrivacyPage />],
  [r('terms'), () => <TermsPage />],
  [r('cookies'), () => <CookiesPage />],
  [r('dpa'), () => <DpaPage />],
  [r('security'), () => <SecurityPage />],
]
// Shopify OAuth and billing return to /onboarding; v3 had no such route, so a
// merchant who had just installed landed on the marketing homepage with no
// signal the install worked (and no error surface when it did not).
if (!isEmbedded && (path === '/onboarding' || hash === 'onboarding')) {
  const qs = window.location.search || ''
  window.location.replace('/app' + qs)
}
const match = isEmbedded ? undefined : ROUTES.find(([ok]) => ok)
createRoot(document.getElementById('root')!).render(
  isEmbedded ? <AppConsole /> : match ? match[1]() : <Landing />,
)
