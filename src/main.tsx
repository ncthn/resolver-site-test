import { createRoot } from 'react-dom/client'
import './index.css'
import { Landing } from './saas/Landing'
import { AppConsole } from './saas/AppConsole'

// path /app works locally + on the real web-service backend; #app is the fallback
// for the static test env (no SPA rewrite rule there).
const path = window.location.pathname.replace(/\/+$/, '')
const hash = window.location.hash.replace(/^#\/?/, '').replace(/\/+$/, '')
const isApp = path === '/app' || hash === 'app'
createRoot(document.getElementById('root')!).render(isApp ? <AppConsole /> : <Landing />)
