// Live-mode auth gate: signs into the SAME Firebase project as resolver.chat
// (public web config) and feeds ID tokens to the live adapter. Rendered above
// the console only when ?live=1; demo mode never loads Firebase.
import { useEffect, useState } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, signOut, type User,
} from 'firebase/auth'
import * as api from './api'

const firebaseConfig = {
  apiKey: 'AIzaSyCFxAMCdGONxuXNl_OFWD3XTG0juQ5VwgM',
  authDomain: 'resolver-app-d4ed2.firebaseapp.com',
  projectId: 'resolver-app-d4ed2',
}

function auth() {
  if (!getApps().length) initializeApp(firebaseConfig)
  return getAuth()
}

export function LiveGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => onAuthStateChanged(auth(), (u) => {
    setUser(u)
    if (u) {
      api.setTokenProvider(() => u.getIdToken())
      api.startPolling()
    }
  }), [])

  if (user === undefined) {
    return <div className="lg-wrap"><div className="lg-card"><p className="lg-note">Checking session…</p></div></div>
  }
  if (user) {
    return (
      <>
        {children}
        <button className="lg-signout" title={`Signed in as ${user.email} · click to sign out`} onClick={() => void signOut(auth())}>
          LIVE · {user.email?.split('@')[0]}
        </button>
      </>
    )
  }

  const doEmail = async () => {
    setBusy(true); setErr('')
    try { await signInWithEmailAndPassword(auth(), email, pw) }
    catch (e) { setErr((e as Error).message.replace('Firebase: ', '')) }
    setBusy(false)
  }
  const doGoogle = async () => {
    setBusy(true); setErr('')
    try { await signInWithPopup(auth(), new GoogleAuthProvider()) }
    catch (e) { setErr((e as Error).message.replace('Firebase: ', '')) }
    setBusy(false)
  }

  return (
    <div className="lg-wrap">
      <div className="lg-card">
        <h1>Live mode</h1>
        <p className="lg-note">This console is wired to resolver.chat. Sign in with your Resolver account; real tickets, real sends.</p>
        <button className="lg-google" disabled={busy} onClick={() => void doGoogle()}>Continue with Google</button>
        <div className="lg-or">or</div>
        <input type="email" placeholder="you@store.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void doEmail() }} />
        {err && <p className="lg-err">{err}</p>}
        <button className="lg-submit" disabled={busy || !email || !pw} onClick={() => void doEmail()}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <a className="lg-back" href="/app?live=0">Back to the demo</a>
      </div>
    </div>
  )
}
