import { createRoot } from 'react-dom/client'
import './index.css'
import { Landing } from './saas/Landing'
import { AppConsole } from './saas/AppConsole'
import { BrandPage } from './saas/BrandPage'

// Paths work locally + on the web-service backend; #hash is the fallback for
// static hosts with no SPA rewrite rule.
const path = window.location.pathname.replace(/\/+$/, '')
const hash = window.location.hash.replace(/^#\/?/, '').replace(/\/+$/, '')
const route = path === '/app' || hash === 'app' ? 'app' : path === '/brand' || hash === 'brand' ? 'brand' : path === '/v2' || hash === 'v2' ? 'v2' : 'landing'
createRoot(document.getElementById('root')!).render(
  route === 'app' ? <AppConsole /> : route === 'brand' ? <BrandPage /> : <Landing accent={route === 'v2'} />
)
