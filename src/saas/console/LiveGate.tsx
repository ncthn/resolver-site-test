// Auth gate: signs into the SAME Firebase project as resolver.chat (public web
// config) and feeds ID tokens to the live adapter. Always rendered above the
// console — there is no un-authenticated mode left.
import { useEffect, useState } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, signOut, type User,
  sendPasswordResetEmail, fetchSignInMethodsForEmail,
} from 'firebase/auth'
import * as api from './api'

const firebaseConfig = {
  apiKey: 'AIzaSyCFxAMCdGONxuXNl_OFWD3XTG0juQ5VwgM',
  // Kept deliberately in step with src/lib/firebase.ts, which carries the full
  // rationale: same env var, same fail-safe fallback to the old firebaseapp.com
  // domain, so this console ships dark exactly like the main app. v3 is a separate
  // Vite root and cannot import that module, but Vite reads VITE_-prefixed keys from
  // process.env, so ONE Render variable flips both bundles together. Letting them
  // drift would sign users into two different auth origins.
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim() || 'resolver-app-d4ed2.firebaseapp.com',
  projectId: 'resolver-app-d4ed2',
}

function auth() {
  if (!getApps().length) initializeApp(firebaseConfig)
  return getAuth()
}

export function signOutConsole() { return signOut(auth()) }
/** The console's Firebase auth handle, for panels that need the signed-in user
 *  (Settings -> Account reads the provider list and changes the password). */
export function consoleAuth() { return auth() }

/* The rail's lockup, for the screens that render INSTEAD of the console shell.
   Sign-in, the session check and the paywall are all full-screen cards with no rail
   beside them, and they carried no mark of any kind: a white card on a grey field
   that said nothing about whose product it was. Same asset and same .c-brand markup
   the rail uses, sized down by .lg-brand, so there is exactly one lockup in the app.
   Exported from here rather than from AppConsole because AppConsole imports this
   module, and the reverse would close the cycle. */
export const LOGO = '/logo/recolor/oct-black-t.png'
export function ConsoleBrand() {
  return (
    <div className="c-brand lg-brand">
      <img src={LOGO} alt="" /><span className="bw">resolver.chat</span>
    </div>
  )
}

/* Google's mark, on Google's own sign-in button.
   DUPLICATED, deliberately: the identical SVG lives in src/saas/Onboarding.tsx for
   the onboarding wizard's own "Continue with Google". src/ and v3/ are separate app
   trees with separate builds and must not import across, so both surfaces carry the
   same four paths rather than sharing one.
   The literal hex values below are Google's fixed brand colours. They are the ONE
   place in this console where raw hex is correct: they may not be tokenised or
   recoloured, or the button stops being a Google sign-in button. */
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  )
}

// The live adapter holds tenant data in module scope: shops, settings, tickets,
// the team, and the request-identity map that suppresses responses it thinks
// have not changed. None of it was tied to who was signed in, so signing into a
// second account in the same tab showed the previous tenant's stores until the
// user happened to reload. Clearing the caches on sign-out is not enough on its
// own, because a request already in flight for the old session resolves
// afterwards and refills them, and every cache added later would have to
// remember to opt in. Dropping the module is the only version of this that
// cannot leak, so an identity change reloads the page.
// This cannot loop: SESSION_UID is null on every fresh load, so a reload only
// ever follows a uid that was recorded during this page's life.
let SESSION_UID: string | null = null

export function LiveGate({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  /** Not an error: a reset that worked, or a Google account being redirected. */
  const [note, setNote] = useState('')

  useEffect(() => onAuthStateChanged(auth(), (u) => {
    const uid = u?.uid ?? null
    if (SESSION_UID && uid !== SESSION_UID) { window.location.reload(); return }
    SESSION_UID = uid
    setUser(u)
    if (u) {
      api.setTokenProvider(() => u.getIdToken())
      api.setLiveCurrentEmail(u.email || '')
      api.startPolling()
    }
  }), [])

  if (user === undefined) {
    return <div className="lg-wrap"><ConsoleBrand /><div className="lg-card"><p className="lg-note">Checking session…</p></div></div>
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
    setBusy(true); setErr(''); setNote('')
    try { await signInWithEmailAndPassword(auth(), email, pw) }
    catch (e) { setErr((e as Error).message.replace('Firebase: ', '')) }
    setBusy(false)
  }
  /** Send a reset, or say why one would be pointless.
   *
   *  There was no way to recover a forgotten password anywhere in the product. Of the 14
   *  Firebase accounts, 6 sign in with a password, and one of those is Shopify's own
   *  reviewer account, so "I mistyped my password" was a dead end for the person deciding
   *  whether this app ships.
   *
   *  The check before sending is the part that matters. 8 of those accounts are Google,
   *  and Google accounts have no password: emailing them a reset would invite them to
   *  CREATE one for an account that never had one, which is a worse outcome than the dead
   *  end it replaces. So the address is asked about first and those people are pointed
   *  back at the button they actually use.
   *
   *  Firebase sends the mail itself, so this needs no mail provider to work. It currently
   *  arrives from the firebaseapp.com sender; pointing that at accounts@resolver.chat is a
   *  console + DNS change, not a code one. */
  const doReset = async () => {
    const addr = email.trim()
    if (!addr) { setErr('Enter your email address first, then choose Reset password.'); return }
    setBusy(true); setErr(''); setNote('')
    try {
      const methods = await fetchSignInMethodsForEmail(auth(), addr)
      if (methods.length && !methods.includes('password')) {
        setNote('That address signs in with Google. Use Continue with Google above, there is no password to reset.')
        setBusy(false); return
      }
      await sendPasswordResetEmail(auth(), addr)
      // Deliberately the same wording whether or not the account exists: a reset form
      // that distinguishes them tells a stranger which addresses are registered.
      setNote('If that address has an account, a reset link is on its way. Check spam too.')
    } catch (e) {
      const msg = (e as Error).message.replace('Firebase: ', '')
      if (/user-not-found|invalid-email/i.test(msg)) {
        setNote('If that address has an account, a reset link is on its way. Check spam too.')
      } else setErr(msg)
    }
    setBusy(false)
  }

  const doGoogle = async () => {
    setBusy(true); setErr(''); setNote('')
    try { await signInWithPopup(auth(), new GoogleAuthProvider()) }
    catch (e) { setErr((e as Error).message.replace('Firebase: ', '')) }
    setBusy(false)
  }

  return (
    <div className="lg-wrap">
      <ConsoleBrand />
      <div className="lg-card">
        <h1>Sign in</h1>
        <p className="lg-note">Use your Resolver account to open your support desk.</p>
        <button className="lg-google" disabled={busy} onClick={() => void doGoogle()}><GoogleIcon /> Continue with Google</button>
        <div className="lg-or">or</div>
        <input type="email" placeholder="you@store.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void doEmail() }} />
        {err && <p className="lg-err">{err}</p>}
        {note && <p className="lg-note" style={{ marginTop: 2 }}>{note}</p>}
        {/* Quiet by design: recovery is rare, and a link that competes with Sign in
            makes the common path harder. It only has to exist and be findable. */}
        <button className="lg-link" type="button" disabled={busy} onClick={() => void doReset()}>Forgot your password?</button>
        <button className="lg-submit" disabled={busy || !email || !pw} onClick={() => void doEmail()}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </div>
    </div>
  )
}
