import { createRoot } from 'react-dom/client'
import './index.css'
import { Landing } from './saas/Landing'
import { AppConsole } from './saas/AppConsole'
import { BrandPage } from './saas/BrandPage'
import { PricingPage, AboutPage, ContactPage, IntegrationsPage, FaqPage, PrivacyPage, TermsPage, CookiesPage } from './saas/pages'

// Path routing with #hash fallback for static hosts without rewrites.
const path = window.location.pathname.replace(/\/+$/, '')
const hash = window.location.hash.replace(/^#\/?/, '').replace(/\/+$/, '')
const r = (p: string) => path === '/' + p || hash === p

const ROUTES: [boolean, () => React.ReactElement][] = [
  [r('app'), () => <AppConsole />],
  [r('brand'), () => <BrandPage />],
  [r('pricing'), () => <PricingPage />],
  [r('about'), () => <AboutPage />],
  [r('contact'), () => <ContactPage />],
  [r('integrations'), () => <IntegrationsPage />],
  [r('faq'), () => <FaqPage />],
  [r('privacy'), () => <PrivacyPage />],
  [r('terms'), () => <TermsPage />],
  [r('cookies'), () => <CookiesPage />],
]
const match = ROUTES.find(([ok]) => ok)
createRoot(document.getElementById('root')!).render(match ? match[1]() : <Landing />)
