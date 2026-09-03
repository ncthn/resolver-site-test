// Resolver app at /app.
// Consumes ONLY the data layer in ./console: types.ts (a faithful subset of
// rsvlr src/types.ts) and api.ts, which is now a thin, explicit re-export of
// liveApi.ts — the real resolver.chat API and the only implementation there is.
// The client-side demo mock and the ?demo=1 switch that reached it are gone;
// the demo account (reviewer@resolver-demo.test) is a real tenant on real data.
// Monochrome brand. No avatars, sender identity is text, not decoration.
import type { ReactNode } from 'react'
import { useEffect, useRef, useState, useSyncExternalStore, useMemo, useDeferredValue } from 'react'
import {
  Inbox, CircleCheck, ListChecks, Settings, Search,
  ChevronsUpDown, Package, Truck, ShieldCheck, Send, Pencil, Trash2,
  RefreshCw, Gavel, Clock, Check, Zap, ArrowUpRight, User, LayoutDashboard,
  Filter, FileText, X, Plus, PauseCircle, Languages, ChevronDown,
  Unlink, Loader2, Factory, RotateCcw, Tag, Paperclip, Download, Route,
  PanelLeft, MoreHorizontal, StickyNote, Sparkles, MapPin, Copy, Mail, Globe, LogOut, Unplug,} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Category, Ticket, TicketStatus, ThreadMessage } from './console/types'
import * as api from './console/api'
import { stripHtml } from './console/stripHtml'
import { LiveGate, signOutConsole, LOGO, ConsoleBrand, consoleAuth } from './console/LiveGate'
// Settings -> Account changes the signed-in user's own credentials: a mailed reset for
// an account that has a password, and linking one to an account that only has Google.
import { sendPasswordResetEmail, linkWithCredential, EmailAuthProvider } from 'firebase/auth'
import { setSupportChat } from '../crisp'
// Straight from the live adapter rather than through ./console/api: only the
// paywall calls it, and api.ts stays the console's public surface.
import { recheckPlanState } from './console/liveApi'


/* ------------------------------------------------------------- constants */
type View =
  | 'overview' | 'tickets' | 'resolved' | 'bin' | 'filtered'
  | 'compose' | 'sent' | 'tasks' | 'customs' | 'chargebacks'
  | 'ailog' | 'users' | 'settings'

const NAV: { group: string; items: { v: View; Ic: LucideIcon; label: string }[] }[] = [
  { group: '', items: [{ v: 'overview', Ic: LayoutDashboard, label: 'Overview' }] },
  {
    group: 'Inbox',
    items: [
      { v: 'tickets', Ic: Inbox, label: 'Tickets' },
      { v: 'resolved', Ic: CircleCheck, label: 'Resolved' },
      { v: 'bin', Ic: Trash2, label: 'Bin' },
      { v: 'filtered', Ic: Filter, label: 'Filtered' },
    ],
  },
  { group: 'Outbound', items: [{ v: 'compose', Ic: Pencil, label: 'Compose' }, { v: 'sent', Ic: Send, label: 'Sent' }] },
  {
    group: 'Operations',
    items: [
      { v: 'tasks', Ic: ListChecks, label: 'Tasks' },
      { v: 'chargebacks', Ic: Gavel, label: 'Chargebacks' },
      { v: 'ailog', Ic: Zap, label: 'Automation log' },
    ],
  },
]

const STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  WAITING_CUSTOMER: 'Waiting on customer',
  WAITING_SUPPLIER: 'Waiting on supplier',
  RESOLVED: 'Resolved',
  REPLACEMENT_SENT: 'Replacement sent',
  ESCALATED: 'Escalated',
}
const CATEGORY_LABEL: Partial<Record<Category, string>> = {
  SHIPPING: 'Shipping', REFUND: 'Refund', CANCEL: 'Order change', NOT_RECEIVED: 'Not received',
  DAMAGED: 'Damaged', PAYMENT: 'Payment', GENERAL: 'General', ANGRY: 'Angry',
  CHARGEBACK: 'Chargeback', PARTNERSHIP: 'Partnership',
}
const FILTERS = ['All', 'Mine', 'Open', 'Escalated', 'Waiting', 'Resolved'] as const

function statusChip(t: Ticket) {
  const queuedActive = !!t.auto_send_queued_at && Date.parse(t.auto_send_queued_at) > Date.now() - 120_000 && t.status !== 'RESOLVED' && t.status !== 'ESCALATED'
  if (queuedActive) return <span className="c-chip green">Sending soon</span>
  if (t.status === 'ESCALATED') return <span className="c-chip red">Escalated</span>
  if (t.status === 'RESOLVED') return <span className="c-chip mut">{t.auto_resolved ? 'Auto-resolved' : 'Resolved'}</span>
  if (t.status === 'WAITING_SUPPLIER') return <span className="c-chip ink">Supplier</span>
  if (t.status === 'WAITING_CUSTOMER') return <span className="c-chip mut">Waiting</span>
  if (t.draft_body || t.has_draft) return <span className="c-chip ink">Draft ready</span>
  return <span className="c-chip ink">Needs you</span>
}

function useStore() {
  return useSyncExternalStore(api.subscribe, api.getVersion)
}
function timeAgo(isoStr: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(isoStr).getTime()) / 1000))
  if (s < 60) return s + 's'
  if (s < 3600) return Math.floor(s / 60) + 'm'
  if (s < 86400) return Math.floor(s / 3600) + 'h'
  return Math.floor(s / 86400) + 'd'
}

/* ---------------------------------------------------------------- views */
/* ------------- tickets: the 3-pane, running the real state machine ----- */
function useOutsideClose(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return
    const h = () => close()
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [open, close])
}
function CategoryDropdown({ t }: { t: Ticket }) {
  const [open, setOpen] = useState(false)
  useOutsideClose(open, () => setOpen(false))
  return (
    <div className="c-status-wrap" onClick={(e) => e.stopPropagation()}>
      <button className="c-chip-btn" onClick={() => setOpen(!open)}>
        <Tag size={13} /> {CATEGORY_LABEL[t.category]} <ChevronDown size={13} />
      </button>
      {open && (
        <div className="c-menu">
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
            <button key={c} className={c === t.category ? 'on' : ''} onClick={() => { api.patchCategory(t.id, c); setOpen(false) }}>
              {CATEGORY_LABEL[c]} {c === t.category && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
/* Status lives in the conversation header, Gorgias-style: a chip with a
   colored state dot, right next to the chat, not buried in the side rail. */
const STATUS_DOT: Record<TicketStatus, string> = {
  OPEN: '#3D7A50', WAITING_CUSTOMER: '#9A9C9F', WAITING_SUPPLIER: '#9A9C9F',
  RESOLVED: '#9A9C9F', REPLACEMENT_SENT: '#16181C', ESCALATED: '#B4472F',
}
function StatusDropdown({ t }: { t: Ticket }) {
  const [open, setOpen] = useState(false)
  useOutsideClose(open, () => setOpen(false))
  return (
    <div className="c-status-wrap" onClick={(e) => e.stopPropagation()}>
      <button className="c-chip-btn c-statuschip" onClick={() => setOpen(!open)} aria-label="Ticket status">
        <span className="dot" style={{ background: STATUS_DOT[t.status] }} />
        {STATUS_LABEL[t.status]} <ChevronDown size={13} />
      </button>
      {open && (
        <div className="c-menu">
          {(Object.keys(STATUS_LABEL) as TicketStatus[]).map((st) => (
            <button key={st} className={st === t.status ? 'on' : ''} onClick={() => { api.patchStatus(t.id, st); setOpen(false) }}>
              <span className="mi"><span className="dot" style={{ background: STATUS_DOT[st] }} /> {STATUS_LABEL[st]}</span>
              {st === t.status && <Check size={13} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* Message bubble: ENGLISH-FIRST (like production TicketThread) — the English
   translation is the primary text; the native original expands on demand. */
function fmtAttSize(size?: string | number): string {
  if (size == null || size === '') return ''
  if (typeof size === 'string') return size
  if (size < 1024) return `${size} B`
  if (size < 1048576) return `${Math.round(size / 1024)} KB`
  return `${(size / 1048576).toFixed(1)} MB`
}
function Bubble({ m, lang, shopId }: { m: ThreadMessage; lang: string; shopId: string }) {
  const [showOrig, setShowOrig] = useState(false)
  const nativeText = stripHtml(m.body)
  const en = m.body_english ? stripHtml(m.body_english) : nativeText
  const bilingual = !!m.body_english && en !== nativeText
  return (
    <div className={'c-msg' + (m.is_customer ? '' : ' me')}>
      <div className={'bubble' + (!m.is_customer && m.auto_sent ? ' ai' : '')}>
        <span className="from">
          {m.is_customer ? (m.from_name ?? m.from) : m.auto_sent ? 'AI auto-reply' : 'You'}
          {!m.is_customer && m.auto_sent && <span className="aichip">AI</span>}
        </span>
        <span className="btext">{en}</span>
        {m.attachments && m.attachments.length > 0 && (
          <div className="atts">
            {m.attachments.map((a, i) => {
              const msgId = a.messageId || m.id
              const openable = !!(a.attachmentId && msgId)
              const open = async () => {
                if (!openable) return
                const url = await api.attachmentUrl(shopId, msgId, a.attachmentId!, a.mimeType)
                if (url) window.open(url, '_blank', 'noopener')
              }
              const sz = fmtAttSize(a.size)
              return (
                <span
                  className="att" key={a.filename + i}
                  role={openable ? 'button' : undefined} tabIndex={openable ? 0 : undefined}
                  style={openable ? { cursor: 'pointer' } : undefined}
                  title={openable ? `Open ${a.filename}` : undefined}
                  onClick={() => void open()}
                  onKeyDown={(e) => { if (openable && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); void open() } }}
                ><Paperclip size={11} /> {a.filename}{sz ? <i>{sz}</i> : null}</span>
              )
            })}
          </div>
        )}
        <span className="bfoot">
          <span className="at">{timeAgo(m.date)} ago</span>
          {bilingual && (
            <button className="orig" onClick={() => setShowOrig(!showOrig)} aria-expanded={showOrig}>
              <Languages size={10} /> {showOrig ? 'Hide original' : `${m.is_customer ? 'Original' : 'Sent'} · ${lang.toUpperCase()}`}
            </button>
          )}
        </span>
        {showOrig && <span className="native">{nativeText}</span>}
      </div>
    </div>
  )
}

/* Scrolls the thread to the newest message. Without it every ticket with more
   than two messages opened at the top and the agent scrolled on every one. */
function ThreadAutoScroll({ t }: { t: Ticket }) {
  useEffect(() => {
    const el = document.querySelector('.c-thread')
    if (el) el.scrollTop = el.scrollHeight
  }, [t.id, t.messages?.length])
  return null
}

/* Thread translation, BOTH directions. The old app translated every non-English
   message so agents could read the thread in English; v3 shipped without it,
   leaving FR/DE/NL/EL threads readable only in the original. Renders nothing —
   it fills message.body_english, which Bubble already prefers.

   As of the send-time/ingest-time storage this is a FALLBACK only: new mail is
   translated once by the pipeline and new replies store their English source, so
   this fires just for messages that predate that. */
function ThreadTranslator({ t }: { t: Ticket }) {
  useEffect(() => {
    const lang = (t.customer_language || 'en').toLowerCase().split(/[-_]/)[0]
    if (!lang || lang === 'en') return
    const ticketAtStart = t.id
    for (const m of t.messages ?? []) {
      if (m.body_english) continue
      // NOT just inbound. The AI writes and sends the reply in the customer's
      // language, and the send path nulls draft_body_english immediately after
      // sending, so nothing anywhere holds the English of what we sent. Skipping
      // agent messages here left every outbound EL/FR/DE reply permanently
      // unreadable to the team. Bubble already labels these 'Sent · <LANG>'.
      const clean = stripHtml(m.body ?? '')
      if (!clean || clean.length < 2) continue
      // Guarded inside liveApi against duplicate in-flight calls per message.
      void api.translateMessage(ticketAtStart, m.id, clean)
    }
  }, [t.id, t.messages, t.customer_language])
  return null
}

/* ══════════════════════════════════════════ why this draft was not sent ═══
   Replaces the old "N checks passed" chip, which was fed by `ticket.trace` —
   a field NO server has ever written (only the demo store), so in live mode
   it never rendered and the most-asked question about a held draft had no
   answer anywhere in the console.

   Everything below is derived from data that exists: the auto-send decision
   recorded by the pipeline (ticket field, else the draft_audit_log entry via
   api.getSendAudit), plus ticket state and the account's auto-send settings.
   When none of those say anything, `sendVerdict` returns null and the bar
   shows nothing at all — a missing record is never reported as a pass. */
interface SendVerdict {
  tone: 'ok' | 'warn' | 'mut'
  chip: string
  head: string
  rows: [string, string][]
  failures: string[]
  /** Set when the draft failed its checks and the AI was asked to fix it. A reply that
   *  was rewritten before sending is not the same event as one that was right first
   *  time, and a merchant judging whether to trust this lane needs to see the
   *  difference. */
  repair?: { ok: boolean; fixed: string[] } | null
}
function shopName(id: string): string {
  return api.SHOPS.find((s) => s.id === id)?.name ?? id
}
/** Effective auto-send mode for a store, read from the account settings the
 *  console already loads. Mirrors resolveMode() in src/services/autoSendPolicy:
 *  the global switch must be explicitly true, then the per-shop lane decides.
 *  Returns null when settings have not loaded — unknown is never rendered. */
function shopAutoSendMode(shopId: string): 'off' | 'shadow' | 'live' | null {
  if (!api.globalAutoSendSettingsLoaded()) return null
  if (!api.globalAutoSendEnabled()) return 'off'
  const per = (api.getLiveSettings() as { auto_send_per_shop?: Record<string, string> } | undefined)?.auto_send_per_shop ?? {}
  const m = per[shopId]
  return m === 'live' || m === 'shadow' ? m : 'off'
}
/* A decision recorded materially before the draft on screen describes an
   EARLIER draft — auto-send was on for these stores until it was switched
   off account-wide, so old records are sitting on tickets that have since
   been re-drafted. Such a record is still shown as evidence, but it never
   supplies the verdict. Ten minutes of slack covers the gap between the
   audit write and the draft write in the same pipeline run. */
function decisionIsStale(t: Ticket, dec: api.SendDecision | null): boolean {
  if (!dec?.at || !t.draft_generated_at) return false
  const d = Date.parse(dec.at), g = Date.parse(t.draft_generated_at)
  if (!Number.isFinite(d) || !Number.isFinite(g)) return false
  return d < g - 600_000
}
/* THE PAYWALL SCREEN.
   Rendered INSTEAD of the console — not over it, not around it — the whole time
   the account's plan is positively inactive. Disabling individual buttons was
   the earlier design and it was not a paywall: everything else still worked.

   It is a screen, not a dead end. It says what happened, offers the account's
   own Shopify plan page, says out loud that nothing was deleted, and leaves a
   way out (sign out) so a merchant is never trapped in it.

   It clears itself. `startPolling` re-reads /api/account/summary every two
   minutes and the adapter notifies; AppConsole is subscribed, so subscribing on
   Shopify brings the console back on its own, with no reload. The 'Choose a
   plan' link opens in a new tab precisely so this tab stays alive to notice.

   Only planGate.ts's own 'inactive' verdict gets here. Every uncertain state —
   billing off, no company, unreadable company doc, no billing store, a bypass
   shop, an exempt account, any thrown error — is 'unknown' and renders the
   console exactly as before. Reused .lg-* classes: native tokens, no new hex.

   ESCAPE HATCH, no deploy needed: `billing_exempt: true` on the company doc, or
   the account id in BILLING_GATE_EXEMPT_COMPANIES. Either makes planGate answer
   'unknown' for that account and this screen can never appear for it. */
function PlanPaywall({ url }: { url: string | null }) {
  // RECHECK. The poll clears this screen on its own, but a merchant who has just paid
  // is watching it and has no way to ask. Worse, they can arrive here on a plan that
  // IS active, because the verdict this client is holding was read before they paid.
  // Waiting, or knowing to reload, is not something to require of them.
  //
  // Three outcomes, all of them visible: 'checking' while the read is in flight, this
  // whole screen disappearing when the plan is live (the gate flips and the console
  // renders), and a line saying so when it is not. A press that appears to do nothing
  // is the one thing this button must never do, which is why it does not reuse the
  // fire-and-forget poll.
  const [check, setCheck] = useState<'idle' | 'checking' | 'still' | 'failed'>('idle')
  const recheck = async () => {
    setCheck('checking')
    const verdict = await recheckPlanState()
    // 'active' and 'unknown' both open the console, so this component is on its way
    // out and needs no words. Only the two states that keep it up say anything.
    setCheck(verdict === 'inactive' ? 'still' : verdict === 'unavailable' ? 'failed' : 'idle')
  }
  return (
    <div className="lg-wrap">
      <ConsoleBrand />
      <div className="lg-card">
        <h1>Choose a plan</h1>
        <p className="lg-note">
          Your Resolver plan is not active, so the console is paused. Nothing has been deleted.
        </p>
        {url ? (
          <a className="lg-submit" style={{ textAlign: 'center', textDecoration: 'none', display: 'block' }} href={url} target="_blank" rel="noreferrer">
            Choose a plan
          </a>
        ) : (
          <p className="lg-note">
            We could not tell which store your plan is billed on. Open Resolver from your Shopify
            admin, under Apps, and choose a plan there, or write to support@resolver.chat.
          </p>
        )}
        <button className="lg-ghost" onClick={() => void recheck()} disabled={check === 'checking'}>
          {check === 'checking' ? 'Checking…' : 'Recheck'}
        </button>
        {check === 'still' && <p className="lg-note">Still not active. Shopify can take a few seconds after you pick a plan.</p>}
        {check === 'failed' && <p className="lg-err">Could not check just now. Try again.</p>}
        <button className="lg-back" onClick={() => void signOutConsole()}>Sign out</button>
      </div>
    </div>
  )
}
function sendVerdict(t: Ticket, dec: api.SendDecision | null, auditState: api.SendAuditState): SendVerdict | null {
  const stale = decisionIsStale(t, dec)
  // Evidence is always listed; only a fresh record may decide the verdict.
  const fresh = stale ? null : dec
  const rows: [string, string][] = []
  if (stale) rows.push(['Heads up', 'this decision was recorded for an earlier draft of this reply'])
  if (dec?.rule_id) rows.push(['Rule', dec.rule_id])
  if (stale && dec?.reason) rows.push(['Said then', dec.reason])
  if (dec?.mode) rows.push(['Store lane', dec.mode === 'live' ? 'Live, replies can send themselves' : dec.mode === 'shadow' ? 'Shadow, decisions recorded only' : 'Off'])
  if (dec?.fallback_reason) rows.push(['Fell back because', dec.fallback_reason])
  if (dec?.send_error) rows.push(['Send error', dec.send_error])
  if (dec?.at) rows.push([stale ? 'Last decided' : 'Decided', timeAgo(dec.at) + ' ago'])
  if (dec) rows.push(['Recorded on', dec.source === 'ticket' ? 'the conversation' : 'the AI decision log'])
  // Sanity failures belong to the draft they were computed for.
  const failures = fresh?.sanity_failures ?? []
  const repair = fresh?.repair_attempted
    ? { ok: fresh.repair_succeeded === true, fixed: (fresh.repair_fixed ?? []) as string[] }
    : null

  // 1. Already queued. The countdown itself lives in the composer header; this
  //    explains what is about to happen and under which rule.
  const queuedAt = t.auto_send_queued_at ? Date.parse(t.auto_send_queued_at) : 0
  if (queuedAt && queuedAt > Date.now()) {
    return {
      tone: 'ok', chip: 'Sends itself shortly',
      head: `This reply is queued to go to the customer at ${new Date(queuedAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}. Cancel it above to keep it as a draft you send by hand.`,
      rows, failures, repair,
    }
  }
  // 2. Per-ticket and per-conversation blocks the operator can see and undo.
  if (t.ai_disabled) {
    return { tone: 'mut', chip: 'AI is off here', head: 'AI is switched off for this conversation, so nothing is drafted or sent automatically. Turn it back on with the AI switch above, or send this reply yourself.', rows, failures, repair }
  }
  if (t.status === 'ESCALATED') {
    // Say WHICH rail pulled it. "Legal language" covers a lawyer, a chargeback and a
    // copyright claim, and those need three different people to do three different
    // things. The reason recorded on the escalation names the rail; fall back to the
    // general sentence when an older ticket has none.
    const why = String(t.escalation_reason || '')
    const copyright = /copyright|trademark|counterfeit/i.test(why)
    return {
      tone: 'warn',
      chip: copyright ? 'Copyright claim' : 'Held for a human',
      head: copyright
        ? 'This message makes a copyright, trademark or counterfeit claim. It is out of every automated lane and needs a human today: replying, apologising or offering a refund can be read as admitting the claim.'
        : (why || 'Dispute or legal language was found in the customer message, so this conversation is pulled out of every automated lane. It will never auto-send.'),
      rows, failures, repair,
    }
  }
  // 3. A decision recorded for THIS draft. The answer whenever the policy ran.
  if (fresh) {
    if (failures.length) {
      return { tone: 'warn', chip: `Held · ${failures.length} check${failures.length === 1 ? '' : 's'} failed`, head: 'The draft did not pass its pre-send checks, so it was kept for you instead of being sent.', rows, failures, repair }
    }
    if (!fresh.auto_send) {
      // The pipeline records this code when it skipped drafting because the plan
      // lapsed. Same record, same panel — it just says which of the two it was,
      // so an empty composer is not read as the AI having failed.
      if (fresh.rule_id === 'HELD_NO_SUBSCRIPTION') {
        return { tone: 'warn', chip: 'Plan not active', head: fresh.reason || 'Your Resolver plan is not active, so nothing was drafted for this conversation.', rows, failures, repair }
      }
      return { tone: 'warn', chip: 'Held for review', head: fresh.reason || 'The auto-send policy blocked this draft.', rows, failures, repair }
    }
    if (fresh.actually_sent) {
      return { tone: 'ok', chip: 'Sent automatically', head: fresh.reason || 'The auto-send policy cleared this reply and it was sent.', rows, failures, repair }
    }
    if (fresh.mode === 'shadow') {
      return { tone: 'mut', chip: 'Recorded, not sent', head: `${shopName(t.shop_id)} is in shadow mode: the AI recorded that it would have sent this, but nothing left the mailbox. Send it yourself when it is right.`, rows, failures, repair }
    }
    if (fresh.mode === 'off' || fresh.mode === null) {
      return { tone: 'mut', chip: 'Not auto-sent', head: `The policy cleared this draft, but auto-send was not on for ${shopName(t.shop_id)} at the time, so it waits for you.`, rows, failures, repair }
    }
    return { tone: 'ok', chip: 'Cleared to send', head: fresh.reason || 'The auto-send policy cleared this reply.', rows, failures, repair }
  }
  // 4. No decision on record. Say why the policy never ran, using settings the
  //    console already has. Anything we cannot establish renders nothing.
  const mode = shopAutoSendMode(t.shop_id)
  if (mode === 'off') {
    return {
      tone: 'mut', chip: 'Auto-send is off',
      head: api.globalAutoSendEnabled()
        ? `Auto-send is not switched on for ${shopName(t.shop_id)}, so every draft on this store waits for a human.`
        : 'Auto-send is switched off for the whole account, so every draft waits for a human.',
      rows, failures, repair,
    }
  }
  if (mode === 'shadow') {
    return { tone: 'mut', chip: 'Shadow mode', head: `${shopName(t.shop_id)} is in shadow mode: the AI records what it would have done and never sends. Every reply goes out by hand.`, rows, failures, repair }
  }
  if (mode === 'live' && (auditState === 'none' || stale)) {
    // The pipeline writes an audit entry for every ticket the policy evaluates,
    // so a live store with no entry for this draft means it was skipped.
    return { tone: 'mut', chip: 'No decision recorded', head: 'No auto-send decision was recorded for this draft, so it is waiting for you. That happens when the AI was held back for this conversation, for example a truncated draft or a billing hold.', rows, failures, repair }
  }
  return null
}
/** Turn a pre-send check code into a sentence.
 *
 *  These were rendered raw, so a merchant opening "why wasn't this sent?" met
 *  `unauthorised_resolution:full_refund_without_return`. That is an engineer's string in
 *  a support agent's face: it says nothing about what the AI did wrong, and nothing
 *  about whether they should trust the reply sitting in front of them.
 *
 *  Unknown codes fall back to the raw string rather than being hidden. A check we forgot
 *  to name here is still a check that fired, and swallowing it would leave a draft held
 *  for no visible reason at all. */
function explainCheck(code: string): string {
  const [head] = code.split(':')
  const after = code.startsWith('after_repair:')
  const base = after ? code.slice('after_repair:'.length) : code
  const say = (t: string) => (after ? `Still wrong after the AI rewrote it: ${t.charAt(0).toLowerCase()}${t.slice(1)}` : t)

  if (base.startsWith('unauthorised_resolution:full_refund_without_return')) {
    return say('Offered a full refund while the customer keeps the item. Policy is a full refund only on return, or 30% if they keep it.')
  }
  if (base.startsWith('unauthorised_resolution:return_address')) {
    return say('Gave out the return address. That only goes out after a photo and your instruction.')
  }
  if (base.startsWith('refund_pct')) return say('Quoted a refund percentage that is not this store\'s policy.')
  if (base.startsWith('wrong_language')) return say('Written in the wrong language for this customer.')
  if (base.startsWith('tracking_not_in_order')) return say('Stated a tracking number this order does not have.')
  if (base.startsWith('unknown_url') || base.startsWith('malformed_url') || base.startsWith('empty_query_param_url')) {
    return say('Contains a link we do not recognise as one of yours.')
  }
  if (base.startsWith('placeholder')) return say('Still contains an unfilled template placeholder.')
  if (base.startsWith('hallucinated_identity')) return say('Refers to itself as an AI or uses the wrong name.')
  if (base.startsWith('too_short')) return say('Too short to answer the question.')
  if (base.startsWith('too_long')) return say('Far longer than a support reply should be.')
  if (base === 'looks_like_echo') return say('Echoes the customer back instead of answering.')
  void head
  return code
}

/* Expanded detail under the composer bar. Only ever rendered with a verdict. */
function SendWhy({ v }: { v: SendVerdict }) {
  return (
    <div className="c-why">
      <p className="hd">{v.head}</p>
      {v.repair && (
        <p className={'c-repair ' + (v.repair.ok ? 'ok' : 'warn')}>
          {v.repair.ok
            ? 'The AI caught a problem in its first draft and rewrote it before sending.'
            : 'The AI was asked to fix its first draft and the rewrite still failed, so nothing was sent.'}
          {v.repair.fixed.length > 0 && ` What it was asked to fix: ${v.repair.fixed.map(explainCheck).join(' ')}`}
        </p>
      )}
      {v.failures.length > 0 && (
        <ul className="fails">
          {v.failures.map((f) => <li key={f}>{explainCheck(f)}</li>)}
        </ul>
      )}
      {v.rows.length > 0 && (
        <dl className="kv">
          {v.rows.map(([k, val]) => <div key={k}><dt>{k}</dt><dd>{val}</dd></div>)}
        </dl>
      )}
    </div>
  )
}

/* Docked composer (Gorgias-pattern): Reply and Internal note live in one
   surface pinned under the thread. The reply tab IS the AI draft — click the
   text to edit it. Countdown and cooldown are quiet text, not pill clusters. */
function Composer({ t }: { t: Ticket }) {
  const [tab, setTab] = useState<'reply' | 'note'>('reply')
  const [editing, setEditing] = useState(false)
  // Preview of what the customer will actually receive for the CURRENT edit.
  // Keyed by the English it was produced from, so a further edit invalidates it
  // rather than showing a translation of text that no longer exists.
  const [preview, setPreview] = useState<{ from: string; native: string } | null>(null)
  const [editBody, setEditBody] = useState('')
  const [busy, setBusy] = useState<'' | 'send' | 'regen'>('')
  const [cooldownAt, setCooldownAt] = useState<Record<string, number>>({})
  const [note, setNote] = useState('')
  const [expand, setExpand] = useState<'' | 'native' | 'why'>('')
  const [bodyExpanded, setBodyExpanded] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [sendErr, setSendErr] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [, setTick] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => { setTab('reply'); setEditing(false); setBusy(''); setNote(''); setExpand(''); setBodyExpanded(false); setFiles([]); setSendErr('') }, [t.id])
  useEffect(() => {
    const needsTick = () => {
      const qa = t.auto_send_queued_at ? Date.parse(t.auto_send_queued_at) : 0
      if (qa && qa > Date.now() - 300_000) return true
      const cd = cooldownAt[t.id]
      return !!cd && Date.now() - cd < 200_000
    }
    if (!needsTick()) return
    const id = setInterval(() => { setTick((x) => x + 1); if (!needsTick()) clearInterval(id) }, 1000)
    return () => clearInterval(id)
  }, [t.id, t.auto_send_queued_at, cooldownAt])
  // An empty-string english draft must fall back to the native body. `??` only
  // catches null/undefined, so a '' english draft used to win and render the
  // composer completely blank while the row still said "Draft ready".
  const draftEN = (typeof t.draft_body_english === 'string' && t.draft_body_english.trim() !== '')
    ? t.draft_body_english
    : t.draft_body
  const aiPaused = !!(api.getLiveSettings() as { ai_paused?: boolean } | undefined)?.ai_paused
  const longDraft = (draftEN ?? '').length > 400
  // Clicking anywhere outside the composer minimizes open text boxes again:
  // an empty note tab folds back to Reply, an unchanged draft edit closes.
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        if (tab === 'note' && !note.trim()) setTab('reply')
        if (editing && editBody === (draftEN ?? '')) setEditing(false)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [tab, note, editing, editBody, draftEN])
  // Why this draft was (or was not) sent. The conversation itself is the first
  // source; the AI decision log is the fallback for admin sessions, fetched
  // once per ticket. Nothing is fetched when the ticket already carries the
  // decision, and nothing is rendered when neither source says anything.
  const ticketDecision = api.readSendDecision(t)
  const audit = api.getSendAudit(t.id)
  useEffect(() => {
    if (api.readSendDecision(t)) return
    void api.loadSendAudit(t.id)
  }, [t.id, t.draft_generated_at])
  const verdict = sendVerdict(t, ticketDecision ?? audit.decision, audit.state)
  const cooldownLeft = Math.max(0, 180 - Math.floor((Date.now() - (cooldownAt[t.id] ?? -1e12)) / 1000))
  const onCooldown = cooldownAt[t.id] != null && cooldownLeft > 0
  const held = t.status === 'ESCALATED'
  const autoMs = t.auto_send_queued_at ? new Date(t.auto_send_queued_at).getTime() - Date.now() : 0
  const mm = Math.floor(autoMs / 60000)
  const ss = String(Math.max(0, Math.floor((autoMs % 60000) / 1000))).padStart(2, '0')
  const doSend = async () => {
    setBusy('send')
    setSendErr('')
    try {
      // Base subtag only: customer_language may be a raw Shopify locale
      // ('en-US', 'pt-BR'); 'en-us' !== 'en' made the gate translate EN->EN and
      // then block the send because the output matched the input.
      const lang = (t.customer_language || 'en').toLowerCase().split(/[-_]/)[0]
      // What the operator sees/edits is ENGLISH; what the customer receives must
      // be in THEIR language. Mirrors the old app exactly, including the hard
      // block — a French customer must never receive an English reply because a
      // translation call quietly failed.
      const englishText = editing ? editBody : (draftEN ?? '')
      let bodyToSend = editing ? editBody : (t.draft_body ?? '')
      if (lang && lang !== 'en') {
        // Compare against what the textarea was actually seeded with (draftEN),
        // not draft_body_english alone — otherwise a null english draft makes us
        // treat customer-language text as English and translate it again.
        const untouchedDraft = !editing || editBody.trim() === (draftEN ?? '').trim()
        if (untouchedDraft && t.draft_body) {
          // The AI draft is already written in the customer's language.
          bodyToSend = t.draft_body
        } else {
          const r = await api.translateFromEnglish(englishText, lang, t.shop_id, t.id)
          const translated = (r?.translation ?? '').trim()
          if ((r as { truncated?: boolean } | undefined)?.truncated) {
            setSendErr('The translation was cut off mid-sentence — sending blocked. Shorten the reply and try again.')
            return
          }
          if (!translated || translated === englishText.trim()) {
            setSendErr(`Translation to ${lang.toUpperCase()} failed — sending blocked so the customer is not emailed in English. Try again, or use the pre-generated draft.`)
            return
          }
          bodyToSend = translated
        }
      }
      await api.postSend(t.id, bodyToSend, files, bodyToSend === englishText ? undefined : englishText)
      setCooldownAt((c) => ({ ...c, [t.id]: Date.now() }))
      setEditing(false)
      setFiles([])
    } catch (e) { setSendErr((e as Error).message || 'Send failed.') }
    finally { setBusy('') }
  }
  const addFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return
    const incoming = Array.from(list)
    const tooBig = incoming.filter((f) => f.size > 10 * 1024 * 1024)
    if (tooBig.length) window.alert(`Skipped ${tooBig.map((f) => f.name).join(', ')} — attachments are limited to 10 MB each.`)
    setFiles((cur) => {
      const next = [...cur, ...incoming.filter((f) => f.size <= 10 * 1024 * 1024)]
      if (next.length > 5) window.alert('A reply can carry up to 5 attachments — extra files were dropped.')
      return next.slice(0, 5)
    })
  }
  const [promptOpen, setPromptOpen] = useState(false)
  const [promptText, setPromptText] = useState('')
  useOutsideClose(promptOpen, () => setPromptOpen(false))
  // Regenerate, optionally with agent instructions. The route has always accepted
  // them and injects them as [AGENT INSTRUCTIONS FOR THIS REPLY: ...]; the console
  // never sent any, which is the 'write a reply from my prompt' the old app had.
  const doRegen = async (instructions?: string) => {
    if (aiPaused) return
    setBusy('regen')
    try { await api.postRegenerate(t.id, instructions); setPromptText(''); setPromptOpen(false) }
    catch { /* surfaced via the mutation banner */ }
    finally { setBusy('') }
  }
  // Floats above the button rather than taking a row in the bar: the composer
  // must not reflow every time someone reaches for the prompt.
  const promptBox = (
    <div className="c-prompt-pop" role="dialog" aria-label="Write this reply from a prompt">
      <div className="c-prompt-h">What should this reply say?</div>
      <textarea
        autoFocus rows={3} className="c-prompt-t" value={promptText}
        placeholder="Offer a 20% refund for the delay. Do not promise a reship."
        onChange={(e) => setPromptText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void doRegen(promptText) }
          if (e.key === 'Escape') setPromptOpen(false)
        }} />
      <div className="c-prompt-f">
        <span className="c-prompt-hint">{promptText.trim() ? 'Enter to write · Esc to close' : t.draft_body ? 'Leave empty to rewrite from scratch' : 'Leave empty for a plain draft'}</span>
        <button className="c-act prim" disabled={busy !== ''} onClick={() => void doRegen(promptText)}>
          {busy === 'regen' ? <Loader2 size={13} className="c-spin" /> : <Sparkles size={13} />}
          Write it
        </button>
      </div>
    </div>
  )
  // One control in both composer states: press it to regenerate, or type first
  // and it writes what you asked for.
  const regenControl = (label: string, icon: ReactNode) => (
    <div className="c-regen" onClick={(e) => e.stopPropagation()}>
      <button
        className={'c-act' + (promptOpen ? ' on' : '')} disabled={busy !== '' || aiPaused} aria-expanded={promptOpen}
        title={aiPaused ? 'AI is paused on this environment' : 'Start the reply over, or tell the AI what to write'}
        onClick={() => setPromptOpen((v) => !v)}
      >
        {busy === 'regen' ? <Loader2 size={13} className="c-spin" /> : icon} {label}
      </button>
      {promptOpen && promptBox}
    </div>
  )
  const saveNote = async () => {
    if (!note.trim()) return
    const text = note.trim()
    setNote(''); setTab('reply')
    // There is no server-side mention delivery, so nothing may imply a
    // teammate was notified. The note is filed, and that is all it claims.
    try { await api.addNote(t.id, text) }
    catch { setNote(text); setTab('note') }
  }
  const [macros, setMacros] = useState(false)
  useOutsideClose(macros, () => setMacros(false))
  const insertMacro = (m: api.Macro) => {
    setTab('reply')
    setEditing(true)
    setEditBody(api.fillMacro(m.body, t))
    setMacros(false)
  }
  const [composerH] = useState<string | undefined>(() => { try { return localStorage.getItem('resolver.h.composer') || undefined } catch { return undefined } })
  const startComposerResize = (e: React.PointerEvent) => {
    e.preventDefault()
    const el = rootRef.current; if (!el) return
    const startY = e.clientY
    const startH = el.getBoundingClientRect().height
    const move = (ev: PointerEvent) => { el.style.minHeight = Math.max(140, Math.min(560, startH + (startY - ev.clientY))) + 'px' }
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); document.body.style.userSelect = ''; try { localStorage.setItem('resolver.h.composer', el.style.minHeight) } catch { /* ignore */ } }
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  return (
    <div className="c-composer" ref={rootRef} style={composerH ? { minHeight: composerH } : undefined}>
      <div className="c-composer-grip" onPointerDown={startComposerResize} title="Drag to resize the draft area" />
      <div className="c-tabs" role="tablist">
        <button className={tab === 'reply' ? 'on' : ''} onClick={() => setTab('reply')} role="tab" aria-selected={tab === 'reply'}><Send size={11} /> Reply</button>
        <button className={'note' + (tab === 'note' ? ' on' : '')} onClick={() => setTab('note')} role="tab" aria-selected={tab === 'note'}><StickyNote size={11} /> Internal note</button>
        <span className="sp" />
        <div className="c-status-wrap" onClick={(e) => e.stopPropagation()}>
          <button className="c-macrobtn" onClick={() => setMacros(!macros)} title="Insert a saved reply">
            <FileText size={11} /> Saved replies <ChevronDown size={11} />
          </button>
          {macros && (
            <div className="c-menu" style={{ right: 0, left: 'auto' }}>
              {api.getLiveMacros().map((m) => (
                <button key={m.id} onClick={() => insertMacro(m)}>
                  <span className="mi">{m.label}</span>
                  <small onClick={(e) => { e.stopPropagation(); void api.deleteLiveMacro(m.id) }} title="Delete this saved reply">remove</small>
                </button>
              ))}
              {api.getLiveMacros().length === 0 && <button disabled style={{ opacity: .6 }}>No saved replies yet</button>}
              {editing && editBody.trim() && (
                <button onClick={() => {
                  const label = window.prompt('Name this saved reply:', '')
                  if (label && label.trim()) void api.createLiveMacro(label.trim(), editBody)
                  setMacros(false)
                }}>
                  <span className="mi"><Plus size={13} /> Save current draft as a reply</span>
                </button>
              )}
            </div>
          )}
        </div>
        {tab === 'reply' && !held && t.auto_send_queued_at && autoMs > 0 && (
          <span className="c-autosend hdr"><Clock size={12} /> Auto-sends in {mm}:{ss} · <button onClick={() => api.cancelAutoSend(t.id)}>Cancel</button></span>
        )}
        {tab === 'reply' && onCooldown && <span className="c-autosend mut hdr"><Clock size={12} /> Sent · {cooldownLeft}s cooldown</span>}
        {tab === 'reply' && t.draft_body && <span className="meta">drafted {timeAgo(t.draft_generated_at!)} ago</span>}
      </div>
      <input ref={fileInputRef} type="file" multiple style={{ display: 'none' }} onChange={(e) => { addFiles(e.target.files); e.currentTarget.value = '' }} />
      {tab === 'reply' ? (
        (t.draft_body || editing) ? (
          <>
            <div className="c-toline">
              <span className="k">To</span>
              <span className="v">{t.customer_name ?? t.customer_email} ({t.customer_email})</span>
              {held && <span className="held"><ShieldCheck size={11} /> Held for you · never auto-sent</span>}
            </div>
            {editing ? (
              <textarea
                className="c-edit" value={editBody} rows={6} autoFocus
                onChange={(e) => setEditBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false) }}
              />
            ) : (
              <><p className={'body editable' + (!bodyExpanded && longDraft ? ' clamped' : '')} title="Click to edit" onClick={() => { setEditing(true); setEditBody(draftEN ?? '') }}>{draftEN}</p>{longDraft && <button className="c-showmore" onClick={(e) => { e.stopPropagation(); setBodyExpanded((v) => !v) }}>{bodyExpanded ? 'Show less' : 'Show more'}</button>}</>
            )}
            {files.length > 0 && (
              <div className="atts" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '2px 0 6px' }}>
                {files.map((f, i) => (
                  <span className="att" key={f.name + i}>
                    <Paperclip size={11} /> {f.name}<i>{fmtAttSize(f.size)}</i>
                    <X size={11} style={{ cursor: 'pointer', marginLeft: 4, verticalAlign: '-2px' }} onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))} />
                  </span>
                ))}
              </div>
            )}
            {sendErr && (
              <div className="c-note" style={{ color: '#B4472F', margin: '2px 0 6px' }} role="alert">{sendErr}</div>
            )}
            {/* ONE bottom bar: toggles + countdown left, send right.
                Expanded panels open full-width underneath. */}
            <div className="c-cbar">
              {(t.draft_body_english || (editing && (t.customer_language || 'en').toLowerCase().split(/[-_]/)[0] !== 'en')) && (
                <button
                  className={'c-bartoggle' + (expand === 'native' ? ' on' : '')}
                  aria-expanded={expand === 'native'}
                  onClick={async () => {
                    if (expand === 'native') { setExpand(''); return }
                    setExpand('native')
                    // While editing, the stored native body is the translation of the
                    // OLD text. Translate the edit itself so the preview is honest.
                    const en = (editing ? editBody : (draftEN ?? '')).trim()
                    const lang = (t.customer_language || 'en').toLowerCase().split(/[-_]/)[0]
                    if (!editing || !en || lang === 'en' || preview?.from === en) return
                    try {
                      const r = await api.translateFromEnglish(en, lang, t.shop_id, t.id)
                      const native = (r?.translation ?? '').trim()
                      if (native) setPreview({ from: en, native })
                    } catch { /* the send path re-translates and blocks on failure */ }
                  }}
                >
                  <Languages size={11} /> {editing ? 'Preview in' : 'Sends in'} {t.customer_language.toUpperCase()} <ChevronDown size={11} className={expand === 'native' ? 'r' : ''} />
                </button>
              )}
              {/* ONE control: the verdict, in words, and the expander for the
                  evidence behind it. Absent entirely when nothing is known. */}
              {verdict && (
                <button
                  type="button"
                  className={'c-bartoggle c-checks ' + verdict.tone + (expand === 'why' ? ' on' : '')}
                  title={verdict.head}
                  aria-expanded={expand === 'why'}
                  onClick={() => setExpand(expand === 'why' ? '' : 'why')}
                >
                  <ShieldCheck size={11} />
                  {verdict.chip}
                  <ChevronDown size={11} className={expand === 'why' ? 'r' : ''} />
                </button>
              )}
              <span className="sp" />
              <button className="c-act" onClick={() => fileInputRef.current?.click()} title="Attach files — up to 5, 10 MB each">
                <Paperclip size={13} /> Attach{files.length > 0 ? ` (${files.length})` : ''}
              </button>
              {regenControl('Regenerate', <RefreshCw size={13} />)}
              {editing && <button className="c-act" onClick={() => setEditing(false)}>Discard edits</button>}
              {true && (
                <button className="c-act prim" disabled={busy !== '' || onCooldown || (editing && !editBody.trim())} onClick={doSend} title={onCooldown ? `Just sent — ${cooldownLeft}s cooldown` : undefined}>
                  {busy === 'send' ? <Loader2 size={14} className="c-spin" /> : <Send size={14} />} {editing ? (t.draft_body ? 'Send edited' : 'Send reply') : held ? 'Send reply' : 'Approve & send'}
                </button>
              )}
            </div>
            {expand === 'native' && !editing && <p className="c-native-p">{t.draft_body}</p>}
            {expand === 'native' && editing && (
              <p className="c-native-p">
                {preview?.from === editBody.trim()
                  ? preview.native
                  : 'Translating your edit\u2026'}
              </p>
            )}
            {expand === 'why' && verdict && <SendWhy v={verdict} />}
          </>
        ) : (
          /* No draft. "Why wasn't this sent" is asked here too — an empty
             composer is exactly when the operator wonders what the AI did. */
          <>
            <div className="c-cfoot" style={{ marginTop: 6 }}>
              {sendErr && <div className="c-note" style={{ color: '#B4472F', marginRight: 8 }} role="alert">{sendErr}</div>}
              <span className="c-autosend mut">{onCooldown ? `Reply sent · ${cooldownLeft}s` : t.status === 'RESOLVED' ? 'Resolved · no reply needed' : 'No draft yet'}</span>
              {verdict && (
                <button
                  type="button"
                  className={'c-bartoggle c-checks ' + verdict.tone + (expand === 'why' ? ' on' : '')}
                  title={verdict.head}
                  aria-expanded={expand === 'why'}
                  onClick={() => setExpand(expand === 'why' ? '' : 'why')}
                >
                  <ShieldCheck size={11} />
                  {verdict.chip}
                  <ChevronDown size={11} className={expand === 'why' ? 'r' : ''} />
                </button>
              )}
              <span className="sp" />
              <button className="c-act" onClick={() => { setEditing(true); setEditBody('') }}>
                <Pencil size={14} /> Write reply
              </button>
              {t.status !== 'RESOLVED' && (
                <>
                {regenControl(aiPaused ? 'AI paused' : 'Generate draft', <Zap size={14} />)}
                </>
              )}
            </div>
            {expand === 'why' && verdict && <SendWhy v={verdict} />}
          </>
        )
      ) : (
        <>
          <textarea
            className="c-notearea" rows={3} autoFocus value={note}
            placeholder="Context for your team — never sent to the customer…"
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveNote() }
              if (e.key === 'Escape') setTab('reply')
            }}
          />
          <div className="c-cfoot">
            <span className="c-autosend mut"><StickyNote size={12} /> Only your team sees this</span>
            <span className="sp" />
            <button className="c-act" onClick={() => setTab('reply')}>Cancel</button>
            <button className="c-act prim" disabled={!note.trim()} onClick={saveNote}>Save note</button>
          </div>
        </>
      )}
    </div>
  )
}

/* Gorgias-pattern control: distill the thread into an AI internal note.
   Rendered as an explicit bordered button on a hairline strip that sits at
   the very bottom of the thread, directly above the drafting space. */
function SummarizePill({ t }: { t: Ticket }) {
  const [busy, setBusy] = useState(false)
  const hasSummary = (t.notes ?? []).some((n) => n.ai)
  if (t.messages.length < 2 || hasSummary) return null
  return (
    <div className="c-sumline">
      <button className="c-sum-pill" disabled={busy} onClick={async () => { setBusy(true); try { await api.summarizeThread(t.id) } catch { /* surfaced */ } finally { setBusy(false) } }}>
        {busy ? <Loader2 size={12} className="c-spin" /> : <Sparkles size={12} />} Summarize {t.messages.length} messages as a note
      </button>
    </div>
  )
}


/* ═══════════════════════════════════════════════ next step (triage state) ═══
   Restored from the old app: the team tracks what has to happen next on a
   ticket, independently of its status. PATCH /api/tickets/:id allows
   next_action through its server-side field allowlist. */
const NEXT_STEPS: { id: string; label: string; Ic: LucideIcon }[] = [
  { id: 'awaiting_customer', label: 'Waiting on customer', Ic: Mail },
  { id: 'awaiting_delivery', label: 'Waiting on delivery', Ic: Truck },
  { id: 'contact_supplier', label: 'Contact supplier', Ic: Factory },
  { id: 'awaiting_supplier', label: 'Waiting on supplier', Ic: Clock },
  { id: 'send_replacement', label: 'Send replacement', Ic: Send },
  { id: 'check_courier', label: 'Check with courier', Ic: Truck },
  { id: 'contact_aliexpress', label: 'Contact AliExpress', Ic: Globe },
  { id: 'process_refund', label: 'Process refund', Ic: RotateCcw },
]
function NextStepMenu({ t }: { t: Ticket }) {
  const [open, setOpen] = useState(false)
  useOutsideClose(open, () => setOpen(false))
  const cur = NEXT_STEPS.find((x) => x.id === (t as { next_action?: string | null }).next_action)
  return (
    <div className="c-status-wrap" onClick={(e) => e.stopPropagation()}>
      <button className={'c-chip-btn' + (cur ? '' : ' mutst')} onClick={() => setOpen(!open)} title={cur ? `Next step: ${cur.label}` : 'Set what has to happen next'}>
        {cur ? <cur.Ic size={12} /> : <Route size={12} />} {cur ? cur.label : 'Next step'} <ChevronDown size={12} />
      </button>
      {open && (
        <div className="c-menu">
          {NEXT_STEPS.map((n) => (
            <button key={n.id} onClick={() => { void api.setNextAction(t.id, n.id); setOpen(false) }}>
              <span className="mi"><n.Ic size={13} /> {n.label}</span>
              {(t as { next_action?: string | null }).next_action === n.id && <Check size={13} />}
            </button>
          ))}
          {(t as { next_action?: string | null }).next_action && (
            <button onClick={() => { void api.setNextAction(t.id, null); setOpen(false) }}>
              <span className="mi"><X size={13} /> Clear next step</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════ order match controls ═══
   v3 previously shipped Unlink ONLY, which was a one-way door: unlink a wrong
   order and there was no way to attach the right one. Restores the old app's
   search-and-match, re-run matching, refresh from Shopify, and timeline. */
function OrderMatchControls({ t }: { t: Ticket }) {
  const [q, setQ] = useState('')
  const [busy, setBusy] = useState<'' | 'match' | 'rematch' | 'refresh' | 'timeline'>('')
  const [msg, setMsg] = useState('')
  const [events, setEvents] = useState<{ at?: string; date?: string; label?: string; status?: string; message?: string }[] | null>(null)
  // Without this the card kept the previous ticket's search text and "Matched
  // #1234" result after switching tickets.
  useEffect(() => { setQ(''); setMsg(''); setEvents(null); setBusy('') }, [t.id])
  const run = async (kind: 'match' | 'rematch' | 'refresh', fn: () => Promise<unknown>) => {
    setBusy(kind); setMsg('')
    try {
      const r = await fn() as { matched?: boolean; order?: { order_name?: string }; order_name?: string; error?: string }
      if (kind !== 'refresh') setMsg(r?.matched ? `Matched ${r.order?.order_name ?? r.order_name ?? 'order'}` : (r?.error || 'No order found for that search'))
      else setMsg('Order refreshed from Shopify')
      if (kind === 'match') setQ('')
    } catch (e) { setMsg((e as Error).message) }
    finally { setBusy('') }
  }
  const timeline = async () => {
    setBusy('timeline'); setMsg('')
    try { const r = await api.getOrderTimeline(t.id); setEvents(r.events ?? []) }
    catch (e) { setMsg((e as Error).message) }
    finally { setBusy('') }
  }
  return (
    <>
      <div className="c-omatch">
        <input
          value={q} placeholder="Order # or customer email…"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && q.trim()) void run('match', () => api.matchOrder(t.id, q.trim())) }}
        />
        <button className="c-act" disabled={!q.trim() || busy !== ''} onClick={() => void run('match', () => api.matchOrder(t.id, q.trim()))}>
          {busy === 'match' ? <Loader2 size={13} className="c-spin" /> : <Search size={13} />} Match
        </button>
      </div>
      <div className="links c-omatch-links">
        <a className="link" onClick={() => { if (busy === '') void run('rematch', () => api.rematchOrder(t.id)) }}>
          {busy === 'rematch' ? <Loader2 size={12} className="c-spin" /> : <RefreshCw size={12} />} Re-run matching
        </a>
        {t.order_id && (
          <a className="link" onClick={() => { if (busy === '') void run('refresh', () => api.refreshOrder(t.id)) }}>
            {busy === 'refresh' ? <Loader2 size={12} className="c-spin" /> : <RotateCcw size={12} />} Refresh from Shopify
          </a>
        )}
        {t.order_id && (
          <a className="link" onClick={() => { if (busy === '') void timeline() }}>
            {busy === 'timeline' ? <Loader2 size={12} className="c-spin" /> : <Route size={12} />} Timeline
          </a>
        )}
        {t.order_id && (
          <a className="link" onClick={() => api.unlinkOrder(t.id)}><Unlink size={12} /> Unlink</a>
        )}
      </div>
      {msg && <div className="c-note" style={{ marginTop: 6 }}>{msg}</div>}
      {events && (
        <div className="c-tl" style={{ marginTop: 6 }}>
          {events.length === 0 && <div className="c-note">No timeline events.</div>}
          {events.map((e, i) => (
            <div className="e done" key={i}><i /><span>{e.label ?? e.status ?? e.message ?? 'event'}{(e.at ?? e.date) ? ` · ${String(e.at ?? e.date).slice(0, 10)}` : ''}</span></div>
          ))}
        </div>
      )}
    </>
  )
}

/* Assignment: who owns this conversation. Unassigned is a first-class state. */
function AssigneeMenu({ t }: { t: Ticket }) {
  const [open, setOpen] = useState(false)
  useOutsideClose(open, () => setOpen(false))
  const cur = api.getTeam().find((m) => m.id === t.assignee)
  return (
    <div className="c-status-wrap" onClick={(e) => e.stopPropagation()}>
      <button className={'c-chip-btn' + (cur ? '' : ' mutst')} onClick={() => setOpen(!open)} title={cur ? `Assigned to ${cur.name}` : 'Assign this conversation'}>
        {cur ? <span className="c-avatar sm">{cur.initials}</span> : <User size={13} />} {cur ? cur.name : 'Assign'} <ChevronDown size={12} />
      </button>
      {open && (
        <div className="c-menu">
          {api.getTeam().map((m) => (
            <button key={m.id} onClick={() => { void api.assignTicket(t.id, m.id); setOpen(false) }}>
              <span className="mi"><span className="c-avatar sm">{m.initials}</span> {m.name}</span>
              {t.assignee === m.id && <Check size={13} />}
            </button>
          ))}
          {t.assignee && (
            <button onClick={() => { void api.assignTicket(t.id, null); setOpen(false) }}>
              <span className="mi"><X size={13} /> Unassign</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

/* Internal-note body with @mentions highlighted. */
function NoteBody({ body }: { body: string }) {
  // Escape: a teammate name containing regex metacharacters threw during render.
  const names = api.getTeam().map((m) => m.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean).join('|')
  if (!names) return <>{body}</>
  const parts = body.split(new RegExp(`(@(?:${names}))`, 'g'))
  return (
    <>
      {parts.map((p, i) => (p.startsWith('@') ? <b className="c-mention" key={i}>{p}</b> : <span key={i}>{p}</span>))}
    </>
  )
}

function printTicket(t: Ticket) {
  const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
  const rows = (t.messages ?? []).map((m) => `<div style="margin:0 0 14px"><div style="font-size:12px;color:#6B6E76"><b>${esc(m.from_name ?? m.from)}</b> &middot; ${esc(new Date(m.date).toLocaleString())}</div><div style="white-space:pre-wrap;margin-top:4px">${esc(stripHtml(String(m.body ?? '')))}</div></div>`).join('')
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(t.subject || 'Ticket')}</title></head><body style="font-family:'Inter Tight',system-ui,sans-serif;max-width:720px;margin:24px auto;color:#16181C"><h2>${esc(t.subject || 'Conversation')}</h2><div style="font-size:13px;color:#6B6E76;margin-bottom:16px">${esc(t.customer_name || t.customer_email)} &middot; ${esc(t.shop_id)}${t.order_name ? ' &middot; Order ' + esc(t.order_name) : ''}</div>${rows}</body></html>`
  const iframe = document.createElement('iframe')
  iframe.setAttribute('sandbox', 'allow-modals allow-same-origin')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'
  iframe.srcdoc = html
  iframe.onload = () => {
    try { iframe.contentWindow?.focus(); iframe.contentWindow?.print() } catch { /* popup blocked */ }
    setTimeout(() => iframe.remove(), 1500)
  }
  document.body.appendChild(iframe)
}

function MoreMenu({ t }: { t: Ticket }) {
  const [open, setOpen] = useState(false)
  useOutsideClose(open, () => setOpen(false))
  return (
    <div className="c-status-wrap" onClick={(e) => e.stopPropagation()}>
      <button className="c-chip-btn ic" onClick={() => setOpen(!open)} title="More actions">
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <div className="c-menu">
          {/* "Ask supplier" moved into the Supplier card in the right-hand rail.
              It used to fire here with only a request type, and the route needs
              the issue text and the requested action as well — without them the
              Discord embed is rejected and the call 500s, every time. */}
          <button onClick={() => { printTicket(t); setOpen(false) }}>
            <span className="mi"><Download size={13} /> Export PDF</span>
          </button>
          <button onClick={() => { api.deleteTicket(t.id); setOpen(false) }}>
            <span className="mi"><Trash2 size={13} /> Move to Bin</span>
            <small>restorable</small>
          </button>
        </div>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════════ ask the supplier ═══
   POST /api/tickets/:id/supplier reads `{ type, issue, action }` off the body
   and passes all three to the Discord embed ("Issue" and "Action Needed" are
   required fields there). The console sent `{ type: 'STOCK' }` from a one-click
   menu item, so the embed was rejected and the route answered
   500 "Discord send failed" on every attempt — the last supplier request in the
   corpus predates the v3 console. The legacy app had exactly this form
   (SupplierBridge.tsx: type picker + required issue summary); it is restored
   here, with the request type mapped onto the real Discord channels the server
   routes to (KNOWN_CHANNELS in server.ts).

   Nothing is emailed to the customer: this posts to the supplier channel and
   flips the ticket to "waiting on supplier". */
const SUPPLIER_CHANNELS: { key: string; label: string; action: string }[] = [
  { key: 'REPLACEMENTS', label: 'Replacement', action: 'Send a replacement to the customer' },
  { key: 'QUALITY', label: 'Quality problem', action: 'Confirm the fault and tell us how to resolve it' },
  { key: 'SHIPPING', label: 'Shipping / tracking', action: 'Confirm the tracking number and current status' },
  { key: 'LOST', label: 'Lost in transit', action: 'Confirm the parcel is lost and reship or refund' },
  { key: 'STOCK', label: 'Stock / restock', action: 'Confirm whether this is in stock and when it ships' },
  { key: 'GENERAL', label: 'Something else', action: 'Investigate and reply with what you can do' },
]
// Supplier relay posts to our own Discord, so it is not a merchant-facing feature.
// Hidden from the rail and from Settings abilities; set true to restore it.
const SHOW_SUPPLIER = false
const SUPPLIER_CATEGORIES: Category[] = ['DAMAGED', 'NOT_RECEIVED', 'SHIPPING', 'REFUND']
const SUPPLIER_DEFAULT: Partial<Record<Category, string>> = {
  DAMAGED: 'QUALITY', NOT_RECEIVED: 'LOST', SHIPPING: 'SHIPPING', REFUND: 'GENERAL',
}
function SupplierCard({ t }: { t: Ticket }) {
  useStore()
  const [open, setOpen] = useState(false)
  const [channel, setChannel] = useState(() => SUPPLIER_DEFAULT[t.category] ?? 'GENERAL')
  const [issue, setIssue] = useState('')
  const [action, setAction] = useState('')
  const [busy, setBusy] = useState<'' | 'send' | 'close'>('')
  const [err, setErr] = useState('')
  // Switching ticket must not carry the previous conversation's draft request.
  useEffect(() => {
    setOpen(false); setIssue(''); setAction(''); setErr(''); setBusy('')
    setChannel(SUPPLIER_DEFAULT[t.category] ?? 'GENERAL')
  }, [t.id, t.category])
  const pick = (key: string) => {
    setChannel(key)
    // The action line is seeded from the request type and stays editable — it is
    // sent verbatim as the embed's "Action Needed", never a placeholder.
    const preset = SUPPLIER_CHANNELS.find((c) => c.key === key)?.action ?? ''
    setAction((cur) => (cur.trim() && !SUPPLIER_CHANNELS.some((c) => c.action === cur) ? cur : preset))
  }
  const send = async () => {
    if (!issue.trim() || !action.trim()) { setErr('Both the problem and what you want them to do are required.'); return }
    setBusy('send'); setErr('')
    try { await api.postSupplier(t.id, channel, issue.trim(), action.trim()); setOpen(false); setIssue('') }
    catch (e) { setErr((e as Error).message || 'The supplier message did not go out.') }
    finally { setBusy('') }
  }
  const close = async () => {
    setBusy('close'); setErr('')
    try { await api.resolveSupplier(t.id) }
    catch (e) { setErr((e as Error).message || 'Could not close the request.') }
    finally { setBusy('') }
  }
  const status = t.supplier_status
  if (status === 'REQUESTED' || status === 'SUPPLIER_REPLIED') {
    return (
      <div>
        <div className="c-kv"><span>Status</span><b>{status === 'REQUESTED' ? 'Waiting on supplier' : 'Supplier replied'}</b></div>
        {t.supplier_request_type && <div className="c-kv"><span>Sent to</span><b>{SUPPLIER_CHANNELS.find((c) => c.key === t.supplier_request_type)?.label ?? t.supplier_request_type}</b></div>}
        <p style={{ fontSize: 11.5, color: 'var(--tx-faint)', margin: '10px 0 0', lineHeight: 1.5 }}>
          A reminder goes out automatically if there is no answer in 48h. Close it here once the supplier has come back to you elsewhere — that only clears the flag, it emails nobody.
        </p>
        {err && <p className="c-note" style={{ margin: '6px 0 0', color: '#B4472F', fontSize: 11.5 }} role="alert">{err}</p>}
        <button className="c-act" style={{ marginTop: 10, padding: '7px 13px', fontSize: 12 }} disabled={busy !== ''} onClick={() => void close()}>
          {busy === 'close' ? <Loader2 size={13} className="c-spin" /> : <Check size={13} />} Close this request
        </button>
      </div>
    )
  }
  if (status === 'RESOLVED') {
    return (
      <div>
        <div className="c-kv"><span>Status</span><b className="green"><Check size={13} strokeWidth={2.6} /> Request closed</b></div>
        <button className="c-act" style={{ marginTop: 10, padding: '7px 13px', fontSize: 12 }} onClick={() => { pick(channel); setOpen(true) }}>
          <Factory size={13} /> Ask again
        </button>
        {open && <SupplierForm {...{ channel, pick, issue, setIssue, action, setAction, busy, err, send, cancel: () => setOpen(false) }} />}
      </div>
    )
  }
  if (!open) {
    return (
      <div>
        <p style={{ fontSize: 12.5, color: 'var(--tx-soft)', lineHeight: 1.5, margin: 0 }}>
          Post this conversation to the supplier channel. The customer is not emailed.
        </p>
        <button className="c-act" style={{ marginTop: 10, padding: '7px 13px', fontSize: 12 }} onClick={() => { pick(channel); setOpen(true) }}>
          <Factory size={13} /> Ask the supplier
        </button>
      </div>
    )
  }
  return <SupplierForm {...{ channel, pick, issue, setIssue, action, setAction, busy, err, send, cancel: () => setOpen(false) }} />
}
function SupplierForm({ channel, pick, issue, setIssue, action, setAction, busy, err, send, cancel }: {
  channel: string; pick: (k: string) => void
  issue: string; setIssue: (v: string) => void
  action: string; setAction: (v: string) => void
  busy: '' | 'send' | 'close'; err: string
  send: () => Promise<void>; cancel: () => void
}) {
  return (
    <div className="c-supform">
      <label className="f">
        <span>Request type</span>
        <select className="c-input" value={channel} onChange={(e) => pick(e.target.value)}>
          {SUPPLIER_CHANNELS.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </label>
      <label className="f">
        <span>What is wrong</span>
        <textarea className="c-input" rows={3} autoFocus value={issue} onChange={(e) => setIssue(e.target.value)}
          placeholder="Describe the problem for the supplier…" />
      </label>
      <label className="f">
        <span>What they should do</span>
        <input className="c-input" value={action} onChange={(e) => setAction(e.target.value)} placeholder="e.g. send a replacement" />
      </label>
      {err && <p className="c-note" style={{ margin: 0, color: '#B4472F', fontSize: 11.5 }} role="alert">{err}</p>}
      <div className="acts">
        <button className="c-act prim" style={{ padding: '7px 13px', fontSize: 12 }} disabled={busy !== '' || !issue.trim() || !action.trim()} onClick={() => void send()}>
          {busy === 'send' ? <Loader2 size={13} className="c-spin" /> : <Send size={13} />} {busy === 'send' ? 'Sending…' : 'Send to supplier'}
        </button>
        <button className="c-act" style={{ padding: '7px 13px', fontSize: 12 }} disabled={busy !== ''} onClick={cancel}>Cancel</button>
      </div>
    </div>
  )
}

/* Guided returns (RMA): a per-ticket state machine, not just a draft about
   the return. Every step writes an AI note into the thread; option B (keep
   the item, partial refund) skips the logistics legs entirely. */
const RETURN_STAGES: { key: api.ReturnStage[]; label: string }[] = [
  { key: ['requested'], label: 'Return requested' },
  { key: ['options_sent'], label: 'Options sent, awaiting choice' },
  { key: ['return_approved'], label: 'Approved, address sent' },
  { key: ['item_received'], label: 'Item received' },
  { key: ['refunded', 'partial_refunded'], label: 'Refund issued' },
]
function ReturnCard({ t }: { t: Ticket }) {
  useStore()
  const [busy, setBusy] = useState(false)
  // Sending the two options is the one step here that puts a real email in
  // front of the customer, so it is confirmed before it fires. Every other
  // step only records what already happened.
  const [confirmSend, setConfirmSend] = useState(false)
  const [err, setErr] = useState('')
  const r = api.getReturn(t.id)
  useEffect(() => { setConfirmSend(false); setErr('') }, [t.id, r?.stage])
  const act = async (choice?: 'A' | 'B') => {
    setBusy(true); setErr('')
    try { await api.advanceReturn(t.id, choice); setConfirmSend(false) }
    catch (e) { setErr((e as Error).message || 'That did not go through, nothing was sent.') }
    finally { setBusy(false) }
  }
  // Starting a return was a one-way door: POST /api/tickets/:id/return/cancel
  // exists and had no caller, so a tracker opened on the wrong conversation
  // stayed open for good. Cancelling discards the tracker, so it is confirmed.
  const cancel = async () => {
    if (!window.confirm('Cancel this return? The tracker is discarded and cannot be restored — a note recording the stage it was cancelled at is left on the conversation. The customer is not emailed.')) return
    const reason = window.prompt('Why is it being cancelled? Optional — it goes into the note.', '') ?? ''
    setBusy(true); setErr('')
    try { await api.cancelReturn(t.id, reason) }
    catch (e) { setErr((e as Error).message || 'Could not cancel the return.') }
    finally { setBusy(false) }
  }
  if (!r) {
    return (
      <div>
        <p style={{ fontSize: 12.5, color: 'var(--tx-soft)', lineHeight: 1.5, margin: 0 }}>No return in progress for this conversation. Starting one only opens the tracker, it emails nobody.</p>
        <button
          className="c-act" style={{ marginTop: 10, padding: '7px 13px', fontSize: 12 }} disabled={busy}
          onClick={async () => {
            setBusy(true); setErr('')
            // The 409 "already in progress" used to vanish, leaving a button
            // that looked broken instead of saying what happened.
            try { await api.startReturn(t.id) } catch (e) { setErr((e as Error).message || 'Could not start a return') }
            finally { setBusy(false) }
          }}
        >
          {busy ? <Loader2 size={13} className="c-spin" /> : <RotateCcw size={13} />} Start a return
        </button>
        {err && <p className="c-note" style={{ margin: '8px 0 0', color: '#B4472F', fontSize: 11.5 }} role="alert">{err}</p>}
      </div>
    )
  }
  const doneIdx = RETURN_STAGES.findIndex((st) => st.key.includes(r.stage))
  const isPartial = r.stage === 'partial_refunded'
  return (
    <div className="c-return">
      <div className="c-tl">
        {RETURN_STAGES.map((st, i) => {
          if (isPartial && (i === 2 || i === 3)) return null
          const state = i < doneIdx ? ' done' : i === doneIdx ? ' done now' : ''
          return <div className={'e' + state} key={st.label}><i /><span>{i === 4 && isPartial ? 'Partial refund issued (kept item)' : st.label}</span></div>
        })}
      </div>
      {r.option && <div className="c-kv" style={{ marginTop: 8 }}><span>Path</span><b>{r.option === 'A' ? 'A · return for full refund' : 'B · keep item, partial refund'}</b></div>}
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {r.stage === 'requested' && (
          confirmSend ? (
            <div className="c-rconfirm">
              <p>
                This emails <b>{t.customer_email}</b> both return options now: return the item at their cost for a full refund, or keep it for a partial refund.
                The message goes out on this conversation and cannot be unsent.
              </p>
              <div className="acts">
                <button className="c-act prim" style={{ padding: '7px 13px', fontSize: 12 }} disabled={busy} onClick={() => void act()}>
                  {busy ? <Loader2 size={13} className="c-spin" /> : <Send size={13} />} {busy ? 'Sending…' : 'Send the email'}
                </button>
                <button className="c-act" style={{ padding: '7px 13px', fontSize: 12 }} disabled={busy} onClick={() => setConfirmSend(false)}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="c-act prim" style={{ padding: '7px 13px', fontSize: 12, alignSelf: 'flex-start' }} disabled={busy} onClick={() => setConfirmSend(true)}>
              <Send size={13} /> Email the customer options A / B
            </button>
          )
        )}
        {r.stage === 'options_sent' && (
          <>
            {/* Only claim the email when the thread proves one left: an agent
                message timestamped at or after this step. The single return
                already in the corpus predates the send wiring, and telling its
                operator an email went out would be exactly the invention this
                audit exists to remove. */}
            {(() => {
              const at = Date.parse(r.updated_at)
              const msgs = t.messages ?? []
              if (!msgs.length || !Number.isFinite(at)) {
                return <p className="c-rsent mut"><Clock size={12} /> Options step completed {timeAgo(r.updated_at)} ago</p>
              }
              const sent = msgs.some((m) => !m.is_customer && Date.parse(m.date) >= at - 120_000)
              return sent
                ? <p className="c-rsent"><Check size={12} strokeWidth={2.6} /> Options emailed to {t.customer_email} · {timeAgo(r.updated_at)} ago</p>
                : <p className="c-rsent mut"><Clock size={12} /> Options step completed {timeAgo(r.updated_at)} ago · no outbound email on this thread since</p>
            })()}
            <span className="c-rhint">Record their answer when it arrives. Neither button emails anything.</span>
            <button className="c-act" style={{ padding: '7px 13px', fontSize: 12, alignSelf: 'flex-start' }} disabled={busy} onClick={() => void act('A')}>Customer chose A · full return</button>
            <button className="c-act" style={{ padding: '7px 13px', fontSize: 12, alignSelf: 'flex-start' }} disabled={busy} onClick={() => void act('B')}>Customer chose B · keep + partial</button>
          </>
        )}
        {r.stage === 'return_approved' && (
          <button className="c-act prim" style={{ padding: '7px 13px', fontSize: 12, alignSelf: 'flex-start' }} disabled={busy} onClick={() => void act()}>
            {busy ? <Loader2 size={13} className="c-spin" /> : <Package size={13} />} Mark item received
          </button>
        )}
        {r.stage === 'item_received' && (
          <button className="c-act prim" style={{ padding: '7px 13px', fontSize: 12, alignSelf: 'flex-start' }} disabled={busy} onClick={() => void act()}>
            {busy ? <Loader2 size={13} className="c-spin" /> : <Check size={13} />} Confirm refund issued
          </button>
        )}
        {(r.stage === 'refunded' || r.stage === 'partial_refunded') && (
          <span style={{ fontSize: 12, color: '#3D7A50', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Check size={13} strokeWidth={2.6} /> Closed {isPartial ? '· partial refund' : '· full refund'}</span>
        )}
        {err && <p className="c-note" style={{ margin: 0, color: '#B4472F', fontSize: 11.5 }} role="alert">{err}</p>}
        {r.stage !== 'refunded' && r.stage !== 'partial_refunded' && (
          <button className="c-act" style={{ padding: '7px 13px', fontSize: 12, alignSelf: 'flex-start' }} disabled={busy} onClick={() => void cancel()}>
            {busy ? <Loader2 size={13} className="c-spin" /> : <X size={13} />} Cancel this return
          </button>
        )}
      </div>
      <p style={{ fontSize: 11, color: 'var(--tx-faint)', marginTop: 10, lineHeight: 1.5 }}>
        Only the options step emails the customer. The rest record what has happened and write an internal note on the thread. Refunds are issued in Shopify, never by Resolver.
      </p>
    </div>
  )
}

let PENDING_OPEN: string | null = null
/* --------------------------------------- order / fulfillment status tone ---
   Shopify reports fulfillment and tracking state as UPPERCASE_UNDERSCORED GraphQL enums
   (FULFILLED, IN_TRANSIT, NOT_DELIVERED, FAILURE, CANCELED, LABEL_VOIDED, ...), while the
   seeded demo data uses title case ("In Transit", "fulfilled"). Everything below normalises
   before matching, so a step never silently fails to tick on real data, and so a failed or
   cancelled delivery is never painted as progress. */
const normStatus = (s: string | undefined) => String(s ?? '').replace(/[_\s]+/g, ' ').trim().toUpperCase()
const isFulfilledStatus = (s: string | undefined) => normStatus(s) === 'FULFILLED'
// PICKED UP is FulfillmentDisplayStatus.PICKED_UP, the customer collecting a local-pickup
// order, so it counts as delivered. CARRIER_PICKED_UP is a different value and does not.
const DELIVERED_STATUSES = new Set(['DELIVERED', 'PICKED UP'])
const FAILED_STATUSES = new Set(['FAILURE', 'CANCELED', 'CANCELLED', 'NOT DELIVERED', 'LABEL VOIDED', 'ERROR'])
const isDeliveredStatus = (s: string | undefined) => DELIVERED_STATUSES.has(normStatus(s))
/** Tone class for a tracking status. Delivered is positive, a failed or cancelled delivery is
 *  negative, anything still in flight stays neutral (no class = the default .c-kv b ink).
 *  Only classes that already exist in v3/src/index.css. */
function trackingTone(s: string | undefined): 'green' | 'red' | '' {
  const n = normStatus(s)
  if (DELIVERED_STATUSES.has(n)) return 'green'
  if (FAILED_STATUSES.has(n)) return 'red'
  return ''
}
/** Has the parcel actually moved? A failed or cancelled delivery has not, so it must not
 *  tick the in-transit step (the old /transit|Deliver/i also matched NOT_DELIVERED).
 *  Movement values checked against the 18 FulfillmentDisplayStatus values in Admin 2026-07:
 *  ATTEMPTED_DELIVERY, CARRIER_PICKED_UP, DELAYED, DELIVERED, IN_TRANSIT, OUT_FOR_DELIVERY,
 *  PICKED_UP, READY_FOR_PICKUP. The rest (CONFIRMED, SUBMITTED, LABEL_PRINTED,
 *  LABEL_PURCHASED, FULFILLED, MARKED_AS_FULFILLED) are pre-movement, and CANCELED,
 *  FAILURE, NOT_DELIVERED, LABEL_VOIDED are failures. */
const MOVED_STATUSES = new Set([
  'IN TRANSIT', 'OUT FOR DELIVERY', 'ATTEMPTED DELIVERY', 'READY FOR PICKUP',
  'CARRIER PICKED UP', 'DELAYED',
])
function isInTransitOrBeyond(s: string | undefined): boolean {
  const n = normStatus(s)
  if (FAILED_STATUSES.has(n)) return false
  return DELIVERED_STATUSES.has(n) || MOVED_STATUSES.has(n) || /TRANSIT/.test(n)
}
/** Demo tenants have no real Shopify admin behind their .myshopify.com domain, so the order
 *  deep link 404s. Hide the control rather than hand a reviewer a link that goes nowhere. */
function isDemoShop(shopId: string): boolean {
  return (api.getShopRaw(shopId) as { is_demo?: boolean } | null)?.is_demo === true
}
/** The backend derives this string from a Shopify customer lookup that yields zeros when it
 *  could not run at all (no admin token, expired token, Shopify outage) — indistinguishable
 *  from a genuinely new customer. When it claims zero orders on a ticket that is displaying a
 *  matched order, the count is provably wrong, so say nothing rather than assert it. */
function customerHistoryLabel(t: Ticket): string {
  const h = (t.customer_history ?? '').trim()
  if (!h) return 'Order history unavailable'
  if (/^0\s+orders\b/i.test(h) && !!t.order_snapshot) return 'Order history unavailable'
  return h
}

function openTicketById(id: string) { PENDING_OPEN = id; void api.getTicketFull(id) }

/** Stores whose auto-send lane is actually 'live'. A shop absent from the map
 *  is OFF server-side, so this is what decides whether anything can send. */
function autoSendLiveShops(): number {
  const per = (api.getLiveSettings() as { auto_send_per_shop?: Record<string, string> } | undefined)?.auto_send_per_shop ?? {}
  return Object.values(per).filter((m) => m === 'live').length
}

/* Is a support inbox connected for the stores currently in scope?
 *
 * GET /api/shops/:id/mailbox is the ONE definition of that (server.ts
 * resolveShopMailbox), so it is asked rather than guessed from the shop doc.
 * Three answers, and the third is the point:
 *   'connected' — a mailbox resolves for at least one store in scope, so mail
 *      can arrive. A 'legacy' store counts: it owns no binding (the route
 *      reports source 'none' for it) but the shared mailbox does poll it.
 *   'none'      — every store in scope came back with the SERVER saying it has
 *      no mailbox at all. Only this state may tell a merchant to connect one.
 *   'unknown'   — a read failed, or the account is not an admin (the route is
 *      adminOnly). Never rendered as "nothing connected".
 */
type InboxState = { state: 'checking' | 'connected' | 'none' | 'unknown'; address: string | null }
function useInboxState(shopId: string): InboxState {
  useStore()
  const ids = api.SHOPS.filter((x) => x.id !== 'all' && (shopId === 'all' || x.id === shopId)).map((x) => x.id).join(',')
  const [boxes, setBoxes] = useState<Record<string, api.ShopMailbox | 'err'>>({})
  useEffect(() => {
    let alive = true
    setBoxes({})
    for (const id of ids ? ids.split(',') : []) {
      api.getShopMailbox(id)
        .then((mb) => { if (alive) setBoxes((p) => ({ ...p, [id]: mb })) })
        .catch(() => { if (alive) setBoxes((p) => ({ ...p, [id]: 'err' })) })
    }
    return () => { alive = false }
  }, [ids])
  const list = ids ? ids.split(',') : []
  if (list.length === 0) return { state: 'unknown', address: null }
  const read = list.map((id) => boxes[id]).filter((x): x is api.ShopMailbox | 'err' => !!x)
  if (read.length < list.length) return { state: 'checking', address: null }
  const ok = read.filter((m): m is api.ShopMailbox => m !== 'err')
  if (ok.length < read.length) return { state: 'unknown', address: null }
  const livebox = ok.filter((m) => m.source === 'shop' || m.source === 'company' || m.provider === 'legacy')
  if (livebox.length) return { state: 'connected', address: livebox.find((m) => !!m.address)?.address ?? null }
  if (ok.every((m) => m.provider !== null && m.source === 'none')) return { state: 'none', address: null }
  return { state: 'unknown', address: null }
}

/* The screen a merchant sees the minute after installing. It used to be the
 * single grey line "No tickets in this view", which reads as broken on the one
 * account that is guaranteed to hit it: a store that has just installed and has
 * received no customer email yet.
 *
 * It says why it is empty in terms of the product working, and gives the one
 * next action that is TRUE for this account: connect an inbox when the server
 * says there is none, and otherwise nothing, because waiting is genuinely all
 * there is to do. Nothing is fabricated: no sample tickets, no counts. */
function InboxEmpty({ shopId, onConnectInbox }: { shopId: string; onConnectInbox: () => void }) {
  const mb = useInboxState(shopId)
  return (
    <div className="c-first">
      <span className="ic"><Inbox size={18} /></span>
      <h3>No tickets yet</h3>
      <p>Tickets appear here when a customer emails your connected support inbox.</p>
      {mb.state === 'connected' && (
        <p>{mb.address ? `${mb.address} is connected.` : 'Your support inbox is connected.'} Nothing to do until the first email arrives.</p>
      )}
      {mb.state === 'none' && (
        <>
          <p>No inbox is connected yet, so no email can reach Resolver.</p>
          <button className="pri" onClick={onConnectInbox}>Connect an inbox</button>
        </>
      )}
    </div>
  )
}

/** "Your inbox is still being imported."
 *
 *  The first import after onboarding runs for minutes in the background. Without a word
 *  about it the console shows an inbox that fills up on its own with no explanation of
 *  why it was empty a moment ago or whether anything more is coming, which reads as an
 *  unreliable product rather than a working one. The counts are the point: a bare
 *  "importing" spinner is no more informative than an empty list.
 *
 *  Disappears the moment the job stops, and says nothing at all when there is no job or
 *  the status cannot be read. A failed import is worth saying once, because that one IS
 *  actionable; a merchant who is not told simply sees mail that never arrived. */
function ImportBanner({ shopId }: { shopId: string }) {
  // Subscribe to the store: api.SHOPS is EMPTY on first render and filled by a fetch a
  // moment later. Without this the effect below ran once against an empty list, found
  // no store to ask about, and returned without ever scheduling a poll, so the banner
  // could not appear no matter what the import was doing. That is exactly what happened
  // on the first real onboarding: fourteen conversations arrived over two minutes and
  // the console said nothing at all.
  useStore()
  const [st, setSt] = useState<api.BackfillStatus | null>(null)
  const stRef = useRef<api.BackfillStatus | null>(null)
  stRef.current = st
  const [dismissed, setDismissed] = useState(false)
  // Depended on as a STRING. A fresh array every render would restart the poll every
  // render; this changes only when the set of stores in scope actually changes.
  const scope = api.SHOPS.filter((x) => x.id !== 'all' && (shopId === 'all' || x.id === shopId)).map((x) => x.id).join(',')
  useEffect(() => {
    let alive = true
    setSt(null); setDismissed(false)
    const ids = scope ? scope.split(',') : []
    if (!ids.length) return
    // Whichever store in scope is mid-import. Onboarding imports one store at a time,
    // so the first running job is the one worth reporting.
    const read = async () => {
      for (const id of ids) {
        const r = await api.getBackfillStatus(id)
        if (!alive) return
        if (r && r.status === 'running') {
          setSt(r)
          // Pull the tickets in as they land. The list is on a 12-second timer, which is
          // slow enough to look stuck next to a count that is climbing, and a merchant
          // watching an import is the one moment they are watching the list itself.
          void api.refreshTickets()
          return
        }
        if (r && r.status === 'failed') { setSt(r); return }
      }
      // The job just finished: one last pull, so the final arrivals are on screen
      // without waiting out the timer.
      if (alive) { if (stRef.current && stRef.current.status === 'running') void api.refreshTickets(); setSt(null) }
    }
    void read()
    const t = setInterval(() => { void read() }, 5000)
    return () => { alive = false; clearInterval(t) }
  }, [scope])

  if (!st || dismissed) return null
  if (st.status === 'failed') {
    return (
      <div className="c-note-bar warn">
        <span>Importing your inbox stopped before it finished. New mail still arrives normally, and older conversations may be missing.</span>
        <button onClick={() => setDismissed(true)}>Dismiss</button>
      </div>
    )
  }
  return (
    <div className="c-note-bar">
      <Loader2 size={13} className="c-spin" />
      <span>
        {st.total > 0
          ? `Importing your inbox: ${st.imported} conversation${st.imported === 1 ? '' : 's'} so far, ${st.processed} of ${st.total} checked.`
          : 'Importing your inbox. Counting your conversations.'}
      </span>
    </div>
  )
}

function TicketsView({ shopId, catFilter = null, onClearCat, onConnectInbox }: { shopId: string; catFilter?: Category | null; onClearCat?: () => void; onConnectInbox: () => void }) {
  useStore()
  const [sel, setSel] = useState<string | null>(() => { const pnd = PENDING_OPEN; PENDING_OPEN = null; return pnd })
  const [filter, setFilter] = useState<typeof FILTERS[number]>('Open')
  const [q, setQ] = useState('')
  const dq = useDeferredValue(q)

  // listTickets is async in production; the mock store is read synchronously.
  // Memoized: recomputes only when the tickets surface, scope, or filters change
  // — not on every unrelated notify() or keystroke (dq defers heavy recompute).
  const storeVersion = api.getVersion()
  const tickets = useMemo((): Ticket[] => {
    const base = api.liveTicketIds()
      .map((id) => api.getTicket(id))
      .filter((t): t is Ticket => !!t && !t.is_deleted)
      .filter((t) => shopId === 'all' || t.shop_id === shopId)
      .filter((t) => !catFilter || t.category === catFilter)
      .filter((t) => !dq || (t.subject + t.customer_email + (t.customer_name ?? '') + (t.order_name ?? '') + ' ' + (t.preview ?? '') + ' ' + (t.last_customer_message ?? '')).toLowerCase().includes(dq.toLowerCase()))
      // Priority first, then recency — matches the old app and the server's own
      // ordering. Recency-only sank angry/chargeback tickets below routine ones.
      .sort((a, b) => {
        const pa = typeof a.priority_score === 'number' ? a.priority_score : 0
        const pb = typeof b.priority_score === 'number' ? b.priority_score : 0
        if (pa !== pb) return pb - pa
        return String(b.last_customer_message_at || '').localeCompare(String(a.last_customer_message_at || ''))
      })
    // An active search shows all matches across every status (searching a resolved
    // customer must find them), not just the current tab's status.
    if (dq.trim().length >= 3) return base
    if (filter === 'All') return base
    if (filter === 'Mine') {
      // Assignment worked but had nowhere to land: no filter, no badge.
      const me = (api.getMe() as { id?: string; email?: string } | null)
      const mine = (api.getTeam() as { id: string; email?: string }[]).find((m) => !!m.email && !!me?.email && m.email.toLowerCase() === me.email.toLowerCase())
      return base.filter((t) => t.assignee && (t.assignee === mine?.id || t.assignee === me?.id))
    }
    // "Open" means unresolved, not the literal OPEN status: an ESCALATED ticket is
    // still a conversation a human owes the customer a reply on, and listing it only
    // under Escalated hid live chargeback/legal threats from the default tab.
    if (filter === 'Open') return base.filter((t) => t.status === 'OPEN' || t.status === 'ESCALATED' || t.status === 'WAITING_SUPPLIER')
    if (filter === 'Escalated') return base.filter((t) => t.status === 'ESCALATED')
    if (filter === 'Waiting') return base.filter((t) => t.status === 'WAITING_CUSTOMER' || t.status === 'WAITING_SUPPLIER')
    return base.filter((t) => t.status === 'RESOLVED' || t.status === 'REPLACEMENT_SENT')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeVersion, shopId, catFilter, dq, filter])

  // Scope the open ticket to the selected store: without this, switching stores
  // left the previous store's conversation (and its composer) on screen.
  const selected = sel ? api.getTicket(sel) : null
  const t = (selected && (shopId === 'all' || selected.shop_id === shopId) ? selected : null) ?? tickets[0]
  // Re-fetch when new activity lands, not only on ticket switch: messages are
  // stripped from list rows, so without this the open thread went stale.
  useEffect(() => { if (t?.id) { api.setOpenTicketId(t.id); void api.getTicketFull(t.id) } }, [t?.id, t?.message_count, t?.last_customer_message_at])
  useEffect(() => { if (!t?.id) return; void api.heartbeatViewing(t.id); const iv = setInterval(() => void api.heartbeatViewing(t.id), 12_000); return () => clearInterval(iv) }, [t?.id])
  useEffect(() => { const term = dq.trim(); if (term.length >= 3) { const h = setTimeout(() => void api.searchTickets(term), 300); return () => clearTimeout(h) } }, [dq])
  const paneRef = useRef<HTMLDivElement>(null)
  const startResize = (which: 'q' | 'ctx') => (e: React.PointerEvent) => {
    e.preventDefault()
    const pane = paneRef.current; if (!pane) return
    const startX = e.clientX
    const varName = which === 'q' ? '--q-w' : '--ctx-w'
    const cur = parseFloat(getComputedStyle(pane).getPropertyValue(varName)) || (which === 'q' ? 330 : 280)
    const min = which === 'q' ? 260 : 240, max = which === 'q' ? 560 : 460
    const move = (ev: PointerEvent) => {
      const dx = ev.clientX - startX
      const w = Math.max(min, Math.min(max, which === 'q' ? cur + dx : cur - dx))
      pane.style.setProperty(varName, w + 'px')
    }
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up)
      document.body.style.userSelect = ''
      try { localStorage.setItem('resolver.w.' + which, pane.style.getPropertyValue(varName)) } catch { /* ignore */ }
    }
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up)
  }
  const initVars: React.CSSProperties = {}
  try { const qw = localStorage.getItem('resolver.w.q'); const cw = localStorage.getItem('resolver.w.ctx'); if (qw) (initVars as Record<string, string>)['--q-w'] = qw; if (cw) (initVars as Record<string, string>)['--ctx-w'] = cw } catch { /* ignore */ }
  if (!t) {
    // "This store has never had a ticket" and "the filter you just clicked
    // matched none of your 200" are different facts. They shared one sentence,
    // so a brand-new store was told the same thing as a busy one.
    const anyInScope = api.listTicketsSync(shopId).length > 0
    const narrowed = filter !== 'All' || !!catFilter || dq.trim().length > 0
    return (
      <div className="c-page">
        {!api.isLoaded()
          ? <p className="c-note" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Loader2 size={14} className="c-spin" /> Loading your inbox…</p>
          : !anyInScope
            ? <InboxEmpty shopId={shopId} onConnectInbox={onConnectInbox} />
            : (
              <div className="c-first">
                <span className="ic"><Filter size={18} /></span>
                <h3>No tickets match this view</h3>
                {narrowed && <p>Your other tickets are still here.</p>}
                {narrowed && (
                  <button className="pri" onClick={() => { setFilter('All'); setQ(''); onClearCat?.() }}>Show all tickets</button>
                )}
              </div>
            )}
      </div>
    )
  }

  return (
    <div className="c-3pane" ref={paneRef} style={initVars}>
      <div className="c-split q" onPointerDown={startResize('q')} title="Drag to resize the ticket list" />
      <div className="c-split ctx" onPointerDown={startResize('ctx')} title="Drag to resize the side panel" />
      <section className="c-queue">
        <header className="c-q-head">
          <div className="c-q-title">
            {catFilter ? (CATEGORY_LABEL[catFilter] ?? catFilter) : 'Tickets'} <span className="n">{tickets.length}</span>
            {catFilter && <button className="c-catclear" onClick={onClearCat}>All types <X size={11} /></button>}
          </div>
          <div className="c-search"><Search size={14} /><input placeholder="Search tickets, orders, customers…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="c-ftabs">
            {FILTERS.map((f) => (
              <button key={f} className={f === filter ? 'on' : ''} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
        </header>
        <div className="c-list">
          {tickets.map((x) => (
            <button key={x.id} className={'c-row' + (x.id === t.id ? ' sel' : '')} onClick={() => setSel(x.id)}>
              <span className="main">
                <span className="top"><b>{x.customer_name ?? x.customer_email}</b><span className="time">{timeAgo(x.last_customer_message_at)}</span></span>
                <span className="sub">{(x as { problem_label?: string }).problem_label || x.subject}</span>
                <span className="prev">{x.preview ?? stripHtml(x.last_customer_message_english ?? x.last_customer_message)}</span>
                <span className="tags">
                  {statusChip(x)}
                  {rowTriageBadges(x)}
                  <span className="lang">{CATEGORY_LABEL[x.category]}</span>
                  <span className="lang">{x.customer_language.toUpperCase()}</span>
                  {shopId === 'all' && <span className="store">{x.shop_id}</span>}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <main className="c-conv">
        <header className="c-c-head">
          <div className="who">
            <div>
              <div className="nm">{t.customer_name ?? t.customer_email}{t.chargeback_status === 'warning' && <span className="c-chip red" style={{ marginLeft: 8 }}>Chargeback risk</span>}</div>
              <div className="meta">
                {t.customer_email} · {t.shop_id} · {t.message_count} message{t.message_count > 1 ? 's' : ''}
                {api.getViewers(t.id).map((v) => {
                  const m = api.getTeam().find((x) => (x as { email?: string }).email === v || x.id === v)
                  return <span className="c-presence" key={v}><i /> {m?.name ?? v} is viewing</span>
                })}
              </div>
            </div>
          </div>
          <div className="acts">
            <AssigneeMenu t={t} />
            <StatusDropdown t={t} />
            <NextStepMenu t={t} />
            <CategoryDropdown t={t} />
            <button className={'c-aiswitch' + (t.ai_disabled ? ' off' : '')} onClick={() => api.postAiToggle(t.id)} title={t.ai_disabled ? 'AI is off for this ticket: no drafting, no auto-send. Click to re-enable.' : 'AI is drafting on this ticket. Click to take over by hand.'}>
              <Zap size={12} /> AI <span className="sw"><i /></span>
            </button>
            <MoreMenu t={t} />
          </div>
        </header>

        <div className="c-thread">
          {t.is_deleted && (
            <div className="c-risk mut"><Trash2 size={14} /> This conversation is in the Bin. It will be permanently removed after 30 days.
              <button className="c-act" style={{ marginLeft: 'auto', padding: '5px 12px', fontSize: 11.5 }} onClick={() => api.restoreTicket(t.id)}><RotateCcw size={12} /> Restore</button>
            </div>
          )}
          {t.status === 'ESCALATED' && <div className="c-risk"><ShieldCheck size={14} /> Dispute language detected, pulled from every automated lane, routed to a human.</div>}
          {t.ai_disabled && <div className="c-risk mut"><PauseCircle size={14} /> AI is disabled for this ticket, no drafting, no auto-send, until re-enabled.</div>}
          {t.supplier_status === 'REQUESTED' && (
            <div className="c-risk mut"><Factory size={14} /> Waiting on supplier, {t.supplier_request_type} · sent by email. Auto-reminder if no reply in 48h.</div>
          )}
          {t.messages.length === 0 && (t.message_count ?? 0) > 0 && (
            <div className="c-risk mut"><Loader2 size={13} className="c-spin" /> Loading conversation…</div>
          )}
          {/* Follow-up work filed against this conversation, alongside the
              Next step chip in the header. Separate lifecycle from the ticket. */}
          <TicketTasks t={t} />
          <ThreadTranslator t={t} />
          <ThreadAutoScroll t={t} />
          {t.messages.map((m) => <Bubble m={m} lang={t.customer_language} shopId={t.shop_id} key={m.id} />)}
          {(t.notes ?? []).map((n) => (
            <div className={'c-inote' + (n.ai ? ' ai' : '')} key={n.id}>
              <span className="nh">
                {n.ai ? <Sparkles size={12} /> : <StickyNote size={12} />}
                <b>{n.ai ? 'Resolver AI' : n.author}</b> · Internal note{n.ai ? ' · summary' : ''}
                <span className="at">{timeAgo(n.at)} ago</span>
              </span>
              <NoteBody body={n.body} />
            </div>
          ))}
          <SummarizePill t={t} />
        </div>
        <Composer t={t} />
      </main>

      <aside className="c-ctx2">
        {['REFUND', 'DAMAGED'].includes(t.category) && (
          <div className="sec">
            <div className="h">Return</div>
            <div className="card"><ReturnCard t={t} /></div>
          </div>
        )}
        {/* Same gate the legacy SupplierBridge used: the categories that lead to
            a supplier request, plus any conversation that already has one. */}
        {/* Supplier relay is hidden from the console for now: it posts to OUR internal
            Discord channel, which is not something a merchant can act on or configure.
            Kept mounted only where a request already exists so an in-flight one stays
            visible and closable. Flip SHOW_SUPPLIER to bring the entry point back. */}
        {SHOW_SUPPLIER && (SUPPLIER_CATEGORIES.includes(t.category) || !!t.supplier_status) && (
          <div className="sec">
            <div className="h">Supplier</div>
            <div className="card"><SupplierCard t={t} /></div>
          </div>
        )}
        {!SHOW_SUPPLIER && !!t.supplier_status && (
          <div className="sec">
            <div className="h">Supplier</div>
            <div className="card"><SupplierCard t={t} /></div>
          </div>
        )}
        <div className="sec">
          <div className="h">Order match</div>
          <div className="card">
            {!t.order_snapshot && (
              <div className="c-kv"><span>Store</span><b>{api.SHOPS.find((s) => s.id === t.shop_id)?.name ?? t.shop_id}</b></div>
            )}
            <div className="c-kv stack"><span>Reason</span><b>{t.order_match_reason}</b></div>
            <div className="c-kv"><span>Confidence</span><b className={t.order_match_confidence >= 0.9 ? 'green' : t.order_match_confidence > 0 ? '' : 'red'}>{t.order_match_confidence > 0 ? Math.round(t.order_match_confidence * 100) + '%' : 'No match'}</b></div>
            <OrderMatchControls t={t} />
          </div>
        </div>
        {t.order_snapshot && (
          <>
            <div className="sec">
              <div className="h">Order {t.order_snapshot.order_name}</div>
              <div className="card">
                <div className="c-kv"><span>Store</span><b>{api.SHOPS.find((s) => s.id === t.shop_id)?.name ?? t.shop_id}</b></div>
                {t.order_snapshot.line_items.map((li) => (
                  <div className="line" key={li.title}><Package size={13} /><span>{li.quantity}× {li.title}</span></div>
                ))}
                <div className="c-kv"><span>Payment</span><b>{t.order_snapshot.financial_status}</b></div>
                {t.order_snapshot.payment_gateways[0] && (
                  <div className="c-kv"><span>Method</span><b>
                    {({ shopify_payments: 'Shopify Payments', paypal: 'PayPal', klarna: 'Klarna' } as Record<string, string>)[t.order_snapshot.payment_gateways[0]] ?? t.order_snapshot.payment_gateways[0]}
                    {['paypal', 'klarna'].includes(t.order_snapshot.payment_gateways[0]) && <span className="c-gwflag">dispute-prone</span>}
                  </b></div>
                )}
                <div className="c-kv"><span>Fulfillment</span><b>{t.order_snapshot.fulfillment_status}</b></div>
                <div className="c-kv"><span>Total</span><b>{(() => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: (t.order_snapshot!.currency || 'USD').toUpperCase() }).format(parseFloat(t.order_snapshot!.total_price) || 0) } catch { return `${t.order_snapshot!.total_price} ${t.order_snapshot!.currency}` } })()}</b></div>
                {(t.order_returns?.length ?? 0) > 0 && (
                  <div className="c-kv"><span>Return</span><b>{t.order_returns!.map((r) => `${r.name || 'Return'} · ${({ OPEN: 'Open', REQUESTED: 'Requested', CLOSED: 'Closed', DECLINED: 'Declined', CANCELED: 'Canceled' } as Record<string, string>)[r.status] ?? r.status}${r.total_quantity ? ` · ${r.total_quantity} item${r.total_quantity === 1 ? '' : 's'}` : ''}`).join(', ')}</b></div>
                )}
                <div className="c-kv"><span>Ships to</span><b>{t.order_snapshot.shipping_country}</b></div>
                {/* .links draws its own top border and padding, so it has to collapse with
                    the link rather than render as a stray divider on demo tickets. */}
                {!isDemoShop(t.shop_id) && !!(t.order_snapshot as { shopify_url?: string }).shopify_url && (
                  <div className="links">
                    <a className="link" href={(t.order_snapshot as { shopify_url?: string }).shopify_url} target="_blank" rel="noopener noreferrer"><ArrowUpRight size={12} /> Open in Shopify</a>
                  </div>
                )}
              </div>
            </div>
            <div className="sec">
              <div className="h">Timeline</div>
              <div className="card">
                <div className="c-tl">
                  <div className="e done"><i /><span>Order placed · {timeAgo(t.order_snapshot.created_at)} ago</span></div>
                  <div className={'e' + (isFulfilledStatus(t.order_snapshot.fulfillment_status) ? ' done' : '')}><i /><span>Fulfilled</span></div>
                  {t.order_snapshot.tracking_status[0] && (
                    <div className={'e' + (isInTransitOrBeyond(t.order_snapshot.tracking_status[0]) ? ' done' : '')}><i /><span>{t.order_snapshot.tracking_status[0]}</span></div>
                  )}
                  <div className={'e' + (isDeliveredStatus(t.order_snapshot.tracking_status[0]) ? ' done' : '')}><i /><span>Delivered</span></div>
                </div>
              </div>
            </div>
            {t.order_snapshot.tracking_numbers.length > 0 && (
              <div className="sec">
                <div className="h">Fulfillment</div>
                <div className="card">
                  <div className="line"><Truck size={13} /><span>{t.order_snapshot.tracking_numbers[0]}</span></div>
                  <div className="c-kv"><span>Status</span><b className={trackingTone(t.order_snapshot.tracking_status[0])}>{t.order_snapshot.tracking_status[0]}</b></div>
                  {(t.order_snapshot as { tracking_urls?: string[] }).tracking_urls?.[0] && <a className="link" href={(t.order_snapshot as { tracking_urls?: string[] }).tracking_urls![0]} target="_blank" rel="noopener noreferrer">Live tracking <ArrowUpRight size={12} /></a>}
                </div>
              </div>
            )}
          </>
        )}
        <div className="sec">
          <div className="h">Customer</div>
          <div className="card">
            <div className="line"><User size={13} /><span>{customerHistoryLabel(t)}</span></div>
            <div className="c-kv"><span>Sentiment</span><b className={t.sentiment === 'angry' ? 'red' : ''}>{t.sentiment}</b></div>
            <div className="c-kv"><span>Urgency</span><b>{t.urgency_score}/100</b></div>
          </div>
        </div>
      </aside>
    </div>
  )
}

/* ----------------------------------------------- derived list views ----- */
function DerivedList({ title, sub, filterFn, empty, onOpen, shopId }: {
  title: string; sub: string; filterFn: (t: Ticket) => boolean; empty: string; onOpen?: (id: string) => void
  shopId?: string
}) {
  useStore()
  const rows = api.liveTicketIds()
    .map((id) => api.getTicket(id)!)
    .filter((t) => !!t)
    // Honour the store switcher: this list is derived client-side from the
    // ticket cache, which holds every store the session can see, so without
    // this a single-store selection still showed every other store's tickets.
    .filter((t) => !shopId || shopId === 'all' || t.shop_id === shopId)
    .filter(filterFn)
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>{title}</h1><p>{sub}</p></div></header>
      <div className="c-card">
        <div className="c-rows">
          {rows.length === 0 && <p className="c-note" style={{ marginTop: 0 }}>{empty}</p>}
          {rows.map((t) => (
            <div className={'c-lrow' + (onOpen ? ' clickable' : '')} key={t.id} onClick={onOpen ? () => onOpen(t.id) : undefined} role={onOpen ? 'button' : undefined} tabIndex={onOpen ? 0 : undefined}>
              <span className="top"><b>{t.subject}</b><span className="time">{timeAgo(t.last_customer_message_at)} ago</span></span>
              <span className="sub">{t.customer_name ?? t.customer_email} · {CATEGORY_LABEL[t.category]} · {t.shop_id}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StaticList({ title, sub, rows }: { title: string; sub: string; rows: [string, string, string][] }) {
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>{title}</h1><p>{sub}</p></div></header>
      <div className="c-card">
        <div className="c-rows">
          {rows.map(([a, b, c], i) => (
            <div className="c-lrow" key={i}>
              <span className="top"><b>{a}</b><span className="time">{c}</span></span>
              <span className="sub">{b}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* Dispute tooling — pull the latest disputes from Shopify and backfill the
   email threads behind them. Both routes are adminOnly + superAdminOnly, so
   the buttons only render for the owner (an agent would just get a 403). */
const SETTINGS_TABS = ['Lanes', 'Filters', 'Stores', 'Policies & SOP', 'Saved replies', 'Operations', 'API', 'Team', 'Account', 'Notifications', 'Billing'] as const
/* An agent has no admin endpoints behind these, so everything else is hidden
   rather than rendered-then-403'd (the old app gated its nav the same way). */
// Saves behind 'Policies & SOP' all go through PATCH /api/shops/:id, which is
// adminOnly — an agent could open the tab and every edit failed silently.
const AGENT_SETTINGS_TABS = new Set<string>(['Saved replies', 'Account'])
/* Tabs backed by the single global settings/config document. */
const GLOBAL_SETTINGS_TABS = new Set<string>(['Filters', 'Notifications'])

/* Manual ops the old app exposed and v3 dropped: force a Gmail sync instead of
   waiting for cron, and merge duplicate tickets on demand. Both are admin /
   super-admin server-side, so they are gated to match. */
function OperationsSettings() {
  useStore()
  type JobKey = 'sync' | 'import' | 'health' | 'disputes' | 'backfill' | 'merge'
  type JobResult = { ok: boolean; text: string; at: string }
  const [busy, setBusy] = useState<JobKey | ''>('')
  const [results, setResults] = useState<Partial<Record<JobKey, JobResult>>>({})
  // Backfill needs a window and, for any company-scoped account, a named store
  // (POST /api/gmail/backfill 404s a company-scoped caller that omits shop_id).
  const [importDays, setImportDays] = useState(30)
  const importShop = api.currentShopId()
  const importShopName = api.SHOPS.find((s) => s.id === importShop)?.name ?? importShop

  const JOBS: { key: JobKey; label: string; desc: string; Icon: LucideIcon; superOnly?: boolean; confirm?: string; blocked?: string; control?: React.ReactNode; run: () => Promise<string> }[] = [
    {
      key: 'sync', label: 'Sync inbox', Icon: RefreshCw,
      desc: 'Pull new mail for every connected store. Runs automatically every few minutes — use this after fixing a credential or when chasing a missing email.',
      run: async () => {
        const r = await api.syncGmailNow() as { processed?: number; failedShops?: string[] }
        if (r?.failedShops?.length) throw new Error(`Failed for ${r.failedShops.join(', ')}`)
        return `${r?.processed ?? 0} email${r?.processed === 1 ? '' : 's'} processed`
      },
    },
    {
      key: 'import', label: 'Import older mail', Icon: Download,
      desc: 'Sync only picks up new mail. This reads back through the mailbox and creates conversations for email that arrived before the store was connected.',
      blocked: importShop === 'all' ? 'Choose one store in the switcher at the top of the sidebar first — a backfill runs against a single mailbox.' : undefined,
      confirm: `Import the last ${importDays} days of mail for ${importShopName}? Existing conversations are left alone; older email becomes new tickets.`,
      control: (
        <label className="c-jobfield">
          <span>Go back</span>
          <select className="c-input" value={importDays} onChange={(e) => setImportDays(Number(e.target.value))}>
            {[7, 30, 60, 90].map((d) => <option key={d} value={d}>{d} days</option>)}
          </select>
        </label>
      ),
      run: async () => {
        const r = await api.backfillGmail(importDays, importShop)
        if (r.failedShops.length) throw new Error(`Failed for ${r.failedShops.join(', ')}`)
        return `${r.processed} email${r.processed === 1 ? '' : 's'} imported`
      },
    },
    {
      key: 'health', label: 'Refresh health checks', Icon: Zap,
      // Only the super-admin route re-tests credentials: GET /api/system/status
      // reads the per-store results out of the snapshot the daily cron wrote, so
      // for everyone else this re-checks the shared services and re-reads that
      // snapshot. The wording now says which one you get.
      desc: api.isSuperAdmin()
        ? 'Re-test every store credential and mailbox connection now instead of waiting for the scheduled check.'
        : 'Re-check the shared services and reload the latest per-store credential results.',
      run: async () => {
        if (api.isSuperAdmin()) { const r = await api.probeShops(); await api.refreshHealth(); return `${r.count} store${r.count === 1 ? '' : 's'} re-tested` }
        await api.refreshHealth(); return 'Health checks refreshed'
      },
    },
    {
      key: 'disputes', label: 'Sync chargeback disputes', Icon: Gavel, superOnly: true,
      desc: 'Pull the latest disputes from Shopify Payments into the Chargebacks tab.',
      run: async () => {
        const r = await api.syncDisputes() as { synced?: number } | null
        return r?.synced != null ? `${r.synced} dispute${r.synced === 1 ? '' : 's'} synced` : 'Disputes synced'
      },
    },
    {
      key: 'backfill', label: 'Backfill chargeback threads', Icon: Mail, superOnly: true,
      desc: 'Attach the original customer email to disputes that were imported without one.',
      run: async () => {
        const r = await api.backfillChargebackThreads() as { linked?: number } | null
        return r?.linked != null ? `${r.linked} thread${r.linked === 1 ? '' : 's'} linked` : 'Backfill finished'
      },
    },
    {
      key: 'merge', label: 'Merge duplicate tickets', Icon: Copy, superOnly: true,
      confirm: 'Merge duplicate tickets now? This combines threads that share a customer and subject.',
      desc: 'Combine tickets that arrived twice for the same conversation. Cannot be undone.',
      run: async () => {
        const r = await api.mergeDuplicates() as { merged?: number } | null
        return r?.merged != null ? `${r.merged} ticket${r.merged === 1 ? '' : 's'} merged` : 'Merge finished'
      },
    },
  ]

  const run = async (job: typeof JOBS[number]) => {
    if (job.confirm && !window.confirm(job.confirm)) return
    setBusy(job.key)
    const at = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    try {
      const text = await job.run()
      setResults((r) => ({ ...r, [job.key]: { ok: true, text, at } }))
    } catch (e) {
      setResults((r) => ({ ...r, [job.key]: { ok: false, text: (e as Error).message || 'Failed', at } }))
    } finally { setBusy('') }
  }

  const visible = JOBS.filter((j) => !j.superOnly || api.isSuperAdmin())
  return (
    <div>
      <div className="c-set-head">
        <h3>Operations</h3>
        <p>Manual runs of jobs that normally happen on a schedule. Nothing here changes customer-facing settings.</p>
      </div>
      <div className="c-ops">
        {visible.map((j) => {
          const res = results[j.key]
          return (
            <div className="c-opsrow" key={j.key}>
              <span className="ic"><j.Icon size={15} /></span>
              <div className="tx">
                <b>{j.label}</b>
                <p>{j.desc}</p>
                {j.control && !j.blocked && <div className="ctl">{j.control}</div>}
                {j.blocked && <span className="res err"><X size={12} /> {j.blocked}</span>}
                {res && (
                  <span className={'res' + (res.ok ? ' ok' : ' err')}>
                    {res.ok ? <Check size={12} /> : <X size={12} />} {res.text} · {res.at}
                  </span>
                )}
              </div>
              <button className="c-act" disabled={busy !== '' || !!j.blocked} onClick={() => void run(j)}>
                {busy === j.key ? <Loader2 size={13} className="c-spin" /> : <RefreshCw size={13} />}
                {busy === j.key ? 'Running' : 'Run'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* Row triage badges (#6): the old app surfaced overdue/stale/risk at a glance so
   an agent never had to open a ticket to know what needed them. */
function hoursSince(iso?: string | null): number {
  if (!iso) return 0
  const ms = Date.now() - new Date(iso).getTime()
  return ms > 0 ? ms / 3_600_000 : 0
}
function rowTriageBadges(x: Ticket) {
  const out: React.ReactNode[] = []
  const awaitingUs = x.status === 'OPEN' || x.status === 'ESCALATED'
  const h = hoursSince(x.last_customer_message_at)
  if (awaitingUs && h >= 24) out.push(<span className="c-bdg red" key="sla" title={`No reply for ${Math.floor(h)}h`}>SLA {Math.floor(h)}h</span>)
  else if (awaitingUs && h >= 12) out.push(<span className="c-bdg amber" key="sla" title={`No reply for ${Math.floor(h)}h`}>{Math.floor(h)}h</span>)
  const d = Math.floor(h / 24)
  if (awaitingUs && d >= 3) out.push(<span className="c-bdg amber" key="stale" title="Waiting several days">{d}d stale</span>)
  if (x.order_name) out.push(<span className="c-bdg mut" key="ord">{x.order_name}</span>)
  // Substring match across ALL gateways, from the projected list field first:
  // exact-match on [0] missed ["shopify_payments","paypal"] and "PayPal".
  const gws = ((x as { payment_gateways?: string[] }).payment_gateways ?? x.order_snapshot?.payment_gateways ?? []).map((g) => String(g).toLowerCase())
  const risky = gws.find((g) => g.includes('paypal') || g.includes('klarna'))
  if (risky) out.push(<span className="c-bdg amber" key="gw" title="Dispute-prone payment method">{risky.includes('paypal') ? 'PayPal' : 'Klarna'}</span>)
  if (x.chargeback_status && x.chargeback_status !== 'none') out.push(<span className="c-bdg red" key="cb">Chargeback</span>)
  if (x.is_stuck) out.push(<span className="c-bdg red" key="stuck" title="Flagged as stuck">Stuck</span>)
  if (x.supplier_status === 'REQUESTED') out.push(<span className="c-bdg mut" key="sup">Supplier</span>)
  const asg = x.assignee ? api.getTeam().find((m) => m.id === x.assignee) : null
  if (asg) out.push(<span className="c-bdg mut" key="asg" title={`Assigned to ${asg.name}`}>{asg.initials}</span>)
  if (x.ai_disabled) out.push(<span className="c-bdg mut" key="ai" title="AI is off for this ticket">AI off</span>)
  return out
}

/* Global auto-send kill switch (#2). settings.auto_send_enabled gates EVERY
   shop; with no UI, turning it off was a one-way door. Super-admin only. */
function GlobalAutoSendSwitch() {
  useStore()
  const on = api.globalAutoSendEnabled()
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (!api.isSuperAdmin()) return null
  const toggle = async () => {
    const next = !on
    if (next && !window.confirm('Re-enable auto-send globally? Each store still needs its own lane set to live.')) return
    setBusy(true); setErr('')
    try { await api.setGlobalAutoSend(next) } catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }
  return (
    <div className="c-killrow" style={{ borderColor: 'var(--line)', background: '#fff' }}>
      <div>
        <b>Auto-send master switch</b>
        <p>{on
          ? 'Auto-send is armed. Each store still follows its own lane setting below.'
          : 'Auto-send is OFF for every store, whatever the lanes below say. Nothing is sent automatically.'}</p>
        {err && <p className="c-note" style={{ color: '#B4472F' }}>{err}</p>}
      </div>
      <button className={'c-switch' + (on ? ' on green' : '')} disabled={busy} onClick={() => void toggle()} aria-label="Auto-send master switch"><span className="k" /></button>
    </div>
  )
}

/* Service + per-store health (#3). Without this an expired Gmail delegation is
   indistinguishable from a quiet day. */
function HealthStrip() {
  useStore()
  const h = api.getHealth()
  useEffect(() => { void api.refreshHealth(); const id = setInterval(() => void api.refreshHealth(), 600_000); return () => clearInterval(id) }, [])
  if (!h) return null
  // Annotated explicitly: the ROOT tsconfig (the real build gate) widens
  // Object.entries values to unknown, unlike the v3 config.
  const core: Record<string, { ok: boolean; error?: string }> = h.core ?? {}
  const coreBad = Object.entries(core).filter(([, v]) => !v.ok)
  const shopBad = h.shops.filter((sh) => sh.delegation_ok === false || sh.shopify_token_ok === false)
  if (!coreBad.length && !shopBad.length) {
    return <div className="c-note" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={13} /> All services and stores healthy</div>
  }
  return (
    <div className="c-card" style={{ borderColor: '#E5B8AC', background: '#FDF6F4' }}>
      <div className="c-card-h" style={{ color: '#B4472F' }}>Attention needed</div>
      {coreBad.map(([k, v]) => <div className="c-kv" key={k}><span>{k}</span><b className="red">{v.error || 'unavailable'}</b></div>)}
      {shopBad.map((sh) => (
        <div className="c-kv" key={sh.id}><span>{sh.name || sh.id}</span><b className="red">
          {sh.delegation_ok === false ? 'mailbox delegation failing' : ''}
          {sh.delegation_ok === false && sh.shopify_token_ok === false ? ' · ' : ''}
          {sh.shopify_token_ok === false ? 'Shopify token failing' : ''}
        </b></div>
      ))}
    </div>
  )
}

/* AI decision audit (#4): what the AI decided, why, and whether it was sent —
   the evidence base for trusting auto-send. */
function AiDecisionAudit() {
  useStore()
  const [days, setDays] = useState(7)
  const rows = api.getAuditLog()
  const shadow = api.getShadowStats() as { total?: number; by_decision?: { auto_send?: number; blocked?: number } } | null
  useEffect(() => { void api.refreshAuditLog(days) }, [days])
  if (!api.isAdmin()) return null
  return (
    <div style={{ marginTop: 10 }}>
      <div className="c-set-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div><h3>AI decisions</h3><p>Every draft the AI produced, the rule it followed, and whether it was sent.</p></div>
        <span style={{ display: 'flex', gap: 6 }}>
          {[1, 7, 30].map((d) => <button key={d} className={'c-act' + (d === days ? ' prim' : '')} onClick={() => setDays(d)}>{d}d</button>)}
        </span>
      </div>
      {shadow && (
        <div className="c-kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 10 }}>
          <div className="c-kpi"><span className="n">{shadow.total ?? rows.length}</span><span className="l">decisions</span></div>
          <div className="c-kpi"><span className="n">{shadow.by_decision?.auto_send ?? '—'}</span><span className="l">would auto-send</span></div>
          <div className="c-kpi"><span className="n">{shadow.by_decision?.blocked ?? '—'}</span><span className="l">held back</span></div>
        </div>
      )}
      <div className="c-card">
        {rows.length === 0 && <div className="kb-empty" style={{ padding: 20 }}>No AI decisions recorded in this window.</div>}
        {rows.slice(0, 100).map((r, i) => {
          const g = (k: string) => (r as Record<string, unknown>)[k]
          const decision = (g('decision') ?? {}) as Record<string, unknown>
          return (
            <div className="c-lrow" key={String(g('id') ?? i)}>
              <div className="top">
                <b>{String(g('subject') ?? g('ticket_id') ?? 'decision')}</b>
                <span className="time">{g('created_at') ? timeAgo(String(g('created_at'))) : ''}</span>
              </div>
              <span className="sub">
                {String(g('shop_id') ?? '')}
                {decision.rule_id ? ` · rule ${String(decision.rule_id)}` : ''}
                {decision.reason ? ` · ${String(decision.reason)}` : ''}
                {g('outcome') ? ` · ${String(g('outcome'))}` : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChargebackTools() {
  const [busy, setBusy] = useState<'' | 'sync' | 'backfill'>('')
  const [msg, setMsg] = useState('')
  const run = async (kind: 'sync' | 'backfill') => {
    setBusy(kind); setMsg('')
    try {
      if (kind === 'sync') { const r = await api.syncDisputes(); setMsg(`Synced${r?.disputes ?? r?.synced ?? ''}`.trim()) }
      else { const r = await api.backfillChargebackThreads(); setMsg(`Backfilled${r?.updated != null ? ' ' + r.updated : ''}`) }
    } catch (e) { setMsg((e as Error).message) }
    finally { setBusy('') }
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {msg && <span className="c-note">{msg}</span>}
      <button className="c-act" disabled={busy !== ''} onClick={() => void run('sync')}>
        {busy === 'sync' ? <Loader2 size={13} className="c-spin" /> : <RefreshCw size={13} />} Sync disputes
      </button>
      <button className="c-act" disabled={busy !== ''} onClick={() => void run('backfill')}>
        {busy === 'backfill' ? <Loader2 size={13} className="c-spin" /> : <Mail size={13} />} Backfill threads
      </button>
    </div>
  )
}

/* Filtered inbound with recovery. The old app could restore a wrongly-filtered
   customer email; v3 shipped a read-only list, so a real customer caught by a
   filter was unreachable. Restore/delete are adminOnly server-side.

   Restore reports its real outcome. It used to fire and refresh, which read as
   success even when the message had not moved, so a merchant could click it all
   day on a mail that never became a ticket. */
function LiveFiltered() {
  useStore()
  const rows = api.getFilteredRaw()
  const admin = api.isAdmin()
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [note, setNote] = useState<{ id: string; ok: boolean; text: string } | null>(null)
  const act = async (id: string, kind: 'restore' | 'delete') => {
    setBusy(id); setErr(''); setNote(null)
    try {
      if (kind === 'restore') {
        const r = await api.restoreFilteredEmail(id)
        setNote({ id, ok: r?.success === true, text: r?.message || (r?.success ? 'Restored.' : 'This message was not restored.') })
      } else {
        await api.deleteFilteredEmail(id)
      }
    }
    catch (e) { setErr((e as Error).message) }
    finally { setBusy('') }
  }
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Filtered</h1><p>Suppressed inbound, never reached the inbox{admin ? ' · restore anything caught by mistake' : ''}</p></div></header>
      {err && <div className="c-note" style={{ color: 'var(--red)' }}>{err}</div>}
      {note && <div className="c-note" style={note.ok ? undefined : { color: 'var(--red)' }}>{note.text}</div>}
      <div className="c-card">
        {rows.length === 0 && <div className="kb-empty" style={{ padding: 24 }}>Nothing filtered recently.</div>}
        {rows.map((f) => (
          <div className="c-lrow" key={f.id || f.subject + f.at}>
            <div className="top">
              <b>{f.subject}</b>
              <span className="time">{f.at}</span>
            </div>
            <span className="sub">{f.from} · {f.reason}</span>
            {admin && f.id && (
              <span style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <button className="c-act" disabled={busy === f.id} onClick={() => void act(f.id, 'restore')}>
                  {busy === f.id ? <Loader2 size={12} className="c-spin" /> : <RotateCcw size={12} />} Restore
                </button>
                <button className="c-act" disabled={busy === f.id} onClick={() => { if (window.confirm('Delete this filtered email permanently?')) void act(f.id, 'delete') }}>
                  <Trash2 size={12} />
                </button>
              </span>
            )}
            {note && note.id === f.id && (
              <span className="sub" style={note.ok ? { marginTop: 6 } : { marginTop: 6, color: 'var(--red)' }}>{note.text}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function LiveStaticList({ title, sub, rows, empty }: { title: string; sub: string; rows: [string, string, string][]; empty: string }) {
  useStore()
  if (!rows.length) return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>{title}</h1><p>{sub}</p></div></header>
      <div className="c-card"><div className="kb-empty" style={{ padding: 24 }}>{empty}</div></div>
    </div>
  )
  return <StaticList title={title} sub={sub} rows={rows} />
}

function ChargebacksView({ shopId, onOpen }: { shopId: string; onOpen: (id: string) => void }) {
  useStore()
  const [open, setOpen] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [copied, setCopied] = useState<string | null>(null)
  const rows = shopId === 'all' ? api.getChargebacks() : api.getChargebacks().filter((c) => c.shop_id === shopId)
  const needs = rows.filter((c) => c.status === 'needs_response')
  // At-risk value grouped BY CURRENCY — never summed across currencies (adding
  // TWD+EUR+USD as one unit is what produced the bogus "$6,000 on 25 orders").
  const fmtMoney = (v: number, ccy: string) => { try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: (ccy || 'USD').toUpperCase(), maximumFractionDigits: 2 }).format(v) } catch { return `${v.toFixed(2)} ${(ccy || 'USD').toUpperCase()}` } }
  const atRiskByCcy = needs.reduce<Record<string, number>>((m, c) => { const cc = (c.currency || 'USD').toUpperCase(); m[cc] = (m[cc] || 0) + (parseFloat(c.amount) || 0); return m }, {})
  const atRiskEntries = Object.entries(atRiskByCcy).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])
  const decided = rows.filter((c) => c.status === 'won' || c.status === 'lost')
  const winRate = decided.length ? Math.round((decided.filter((c) => c.status === 'won').length / decided.length) * 100) : 0
  const dueIn = (iso: string | null) => { if (!iso) return NaN; const _t = new Date(iso).getTime(); return isNaN(_t) ? NaN : Math.ceil((_t - Date.now()) / 86400000) }
  const STATUS: Record<api.Chargeback['status'], [string, string]> = {
    needs_response: ['Needs response', 'red'], under_review: ['Under review', 'mut'], won: ['Won', 'green'], lost: ['Lost', 'mut'],
  }
  const GW: Record<string, string> = { shopify_payments: 'Shopify Payments', paypal: 'PayPal', klarna: 'Klarna' }
  const REBUT: Record<string, string> = {
    'Product not received': 'Carrier tracking confirms this order was shipped to the customer\u2019s address and shows delivery. The tracking number and proof of delivery are attached.',
    'Goods/services not received': 'Carrier tracking confirms this order was shipped and delivered to the address on file. Tracking and delivery confirmation are attached.',
    'Fraudulent': 'The order was placed with matching billing and shipping details and delivered to the cardholder\u2019s address. AVS/CVV checks passed at checkout and we have no prior fraud reports on this account.',
    'Unrecognized charge': 'The charge corresponds to a genuine order placed and fulfilled under our store name. Order confirmation and fulfillment records are attached.',
    'Not as described': 'The item shipped matches the product listing the customer purchased. The customer did not open a return under our stated returns policy before disputing.',
    'Product unacceptable': 'The item shipped matches the listing and passed our standard checks. The customer did not request a return under our stated policy.',
    'Duplicate charge': 'This is a single, unique order \u2014 there is no duplicate transaction. The order record and one matching charge are attached.',
    'Subscription canceled': 'This charge is for a one-time order, not a recurring subscription. Order and fulfillment records are attached.',
  }
  const buildRebuttal = (c: api.Chargeback) => {
    const amt = fmtMoney(parseFloat(c.amount) || 0, c.currency)
    const network = c.gateway === 'paypal' ? 'PayPal' : c.gateway === 'klarna' ? 'Klarna' : 'card network'
    const specific = REBUT[c.reason] || 'This is a valid transaction; the supporting order, fulfillment and customer-communication records are attached.'
    const evLines = c.evidence.map((e) => `- ${e.label}: ${e.ready ? 'attached' : 'to attach before submitting'}`).join('\n')
    return [`To the ${network} dispute team,`, '', `We are contesting the dispute on order ${c.order_name} (${amt}) placed by ${c.customer}, filed as \u201C${c.reason}\u201D.`, '', specific, '', 'Supporting evidence:', evLines, '', 'Given the evidence above, we respectfully ask that this dispute be resolved in the merchant\u2019s favour.', '', 'Thank you for your review.'].join('\n')
  }
  useEffect(() => { const cc = rows.find((x) => x.id === open); setDraft(cc ? buildRebuttal(cc) : '') }, [open])
  return (
    <div className="c-page">
      <header className="c-page-h">
        <div><h1>Chargebacks</h1><p>Every dispute, its deadline, and the evidence to fight it</p></div>
        {api.isSuperAdmin() && <ChargebackTools />}
      </header>
      <div className="c-kpis" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="c-kpi"><span className="n">{needs.length}</span><span className="l">need a response</span></div>
        <div className="c-kpi"><span className="n" style={atRiskEntries.length > 1 ? { fontSize: 19 } : undefined}>{atRiskEntries.length === 0 ? '—' : atRiskEntries.map(([cc, v]) => fmtMoney(v, cc)).join(' + ')}</span><span className="l">at risk right now</span></div>
        <div className="c-kpi"><span className="n">{decided.length ? `${winRate}%` : '—'}</span><span className="l">{decided.length ? `win rate, ${decided.length} decided` : 'no decided disputes yet'}</span></div>
      </div>
      <div className="c-card">
        <table className="c-table">
          <thead><tr><th>Order</th><th>Customer</th><th>Store</th><th>Amount</th><th>Method</th><th>Reason</th><th>Evidence due</th><th>Status</th><th /></tr></thead>
          <tbody>
            {rows.length === 0 && (<tr><td colSpan={9} style={{ padding: 20, opacity: .6 }}>No open disputes. New chargebacks sync in here automatically.</td></tr>)}
            {rows.map((c) => {
              const d = dueIn(c.evidence_due)
              const [label, tone] = STATUS[c.status]
              return (
                <tr key={c.id}>
                  <td><b>{c.order_name}</b></td>
                  <td>{c.customer}</td>
                  <td>{c.shop_id}</td>
                  <td>{fmtMoney(parseFloat(c.amount) || 0, c.currency)}</td>
                  <td>{GW[c.gateway] ?? c.gateway}</td>
                  <td>{c.reason}</td>
                  <td>{c.status === 'needs_response' && c.evidence_due && !isNaN(d) ? <span className={'c-due' + (d <= 3 ? ' hot' : '')}>{d <= 0 ? 'today' : `in ${d} day${d === 1 ? '' : 's'}`}</span> : <span className="c-dash">—</span>}</td>
                  <td><span className={'c-chip ' + tone}>{label}</span></td>
                  <td>{(c.status === 'needs_response' || c.status === 'under_review') && (
                    <button className="c-act" style={{ padding: '6px 12px', fontSize: 11.5 }} onClick={() => setOpen(open === c.id ? null : c.id)}>
                      {open === c.id ? 'Close' : 'Build response'}
                    </button>
                  )}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {open && (() => {
          const c = rows.find((x) => x.id === open)
    if (!c) return null
          const ready = c.evidence.filter((e) => e.ready).length
          return (
            <div className="c-cbdrawer">
              <div className="hd">
                <b>Response for {c.order_name} · {c.reason}</b>
                <span className="sub">{ready} of {c.evidence.length} evidence pieces ready · Resolver assembled these from the order and the conversation</span>
              </div>
              <div className="list">
                {c.evidence.map((e) => (
                  <div className={'ev' + (e.ready ? ' ok' : '')} key={e.label}>
                    <span className="ic">{e.ready ? <Check size={11} strokeWidth={2.8} /> : <Clock size={11} />}</span>
                    {e.label}
                    <span className="st">{e.ready ? 'ready' : 'add manually'}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: '6px 16px 0' }}>
                <div className="c-card-h" style={{ fontSize: 12.5, margin: '2px 0 6px' }}>Draft response <span className="c-note" style={{ fontWeight: 400 }}>· editable · assembled from the order &amp; evidence, no AI needed</span></div>
                <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={10} style={{ width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', fontSize: 12.5, lineHeight: 1.5, border: '1px solid var(--line)', borderRadius: 8, padding: '10px 12px', resize: 'vertical' }} />
              </div>
              <div className="ft">
                <span className="c-note" style={{ margin: 0 }}>Review, then copy into Shopify to submit — chargeback responses are final once sent, so this app never auto-submits.</span>
                <span className="sp" />
                <button className="c-act" onClick={() => { void navigator.clipboard?.writeText(draft).catch(() => { /* ignore */ }); setCopied(c.id); setTimeout(() => setCopied(null), 1400) }}>{copied === c.id ? <Check size={14} /> : <Copy size={14} />} {copied === c.id ? 'Copied' : 'Copy response'}</button>
                <button className="c-act prim" onClick={() => onOpen(c.ticket_id ?? c.id)}>
                  <ShieldCheck size={14} /> Open the conversation
                </button>
              </div>
            </div>
          )
        })()}
        <p className="c-note">Chargeback tickets are never auto-replied. The linked conversation is pulled from every automated lane and sits at the top of your queue.</p>
      </div>
    </div>
  )
}

function AiLog() {
  useStore()
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Automation log</h1><p>Every automated action, auditable · live from this session</p></div></header>
      <AiDecisionAudit />
      <div className="c-set-head" style={{ marginTop: 18 }}>
        <h3>Activity</h3>
        <p>Every automated action on this account, newest first.</p>
      </div>
      <div className="c-card">
        <div className="c-rows">
          {api.getLog().length === 0 && <p className="c-note" style={{ marginTop: 0 }}>No automated activity yet.</p>}
          {api.getLog().map((e, i) => (
            <div className="c-ev" key={i}>
              <span className={'ic ' + e.kind}>{e.kind === 'hold' ? <PauseCircle size={13} /> : e.kind === 'send' ? <Send size={12} /> : <Check size={13} />}</span>
              <span className="t"><b>{e.ev}</b>, {e.detail}</span>
              <span className="at">{timeAgo(e.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function BinView({ onOpen }: { onOpen: (id: string) => void }) {
  useStore()
  const rows = api.listBinSync()
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Bin</h1><p>Nothing here is deleted yet. Open or restore any conversation; items are removed for good after 30 days.</p></div></header>
      <div className="c-card">
        <div className="c-rows">
          {rows.length === 0 && <p className="c-note" style={{ marginTop: 0 }}>Bin is empty.</p>}
          {rows.map((t) => (
            <div className="c-ev c-ev-click" key={t.id} onClick={() => onOpen(t.id)} role="button">
              <span className="t"><b>{t.subject}</b>, {t.customer_name ?? t.customer_email}</span>
              <button className="c-act" onClick={(e) => { e.stopPropagation(); api.restoreTicket(t.id) }}><RotateCcw size={13} /> Restore</button>
              {api.isAdmin() && (
                <button className="c-act red" onClick={(e) => { e.stopPropagation(); if (window.confirm(`Permanently delete "${t.subject}"? This cannot be undone.`)) api.permanentDelete(t.id) }}><Trash2 size={13} /> Delete forever</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const KANBAN_COLS: { id: api.TaskCol; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'doing', label: 'In progress' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'done', label: 'Done' },
]
/* Where a card came from. Anything not listed is a hand-made task and gets no
   badge — the badge exists to tell "raised for me" apart from "typed by me". */
const TASK_SOURCE_LABEL: Record<string, string> = {
  stuck_ticket: 'From a stuck ticket',
  chargeback_due: 'Chargeback deadline',
  shop_health: 'Store check',
}
/* WHAT the task is, as opposed to where it came from. The same list backs the
   create form, the editor and the card chip, so a generated task and a
   hand-made one are labelled identically. Rows written before the field
   existed carry no type and get no chip — never a guessed "Other". */
const TASK_TYPE_LABEL: Record<api.TaskType, string> = {
  email_change: 'Email change',
  address_change: 'Address change',
  cancel_request: 'Cancellation',
  refund_to_process: 'Refund to process',
  supplier_followup: 'Supplier follow-up',
  other: 'Other',
}
const TASK_TYPE_ICON: Record<api.TaskType, LucideIcon> = {
  email_change: Mail,
  address_change: MapPin,
  cancel_request: X,
  refund_to_process: RotateCcw,
  supplier_followup: Factory,
  other: ListChecks,
}
const SNOOZE_DAYS = 7

/* `due` is an ISO date on new rows, but older rows hold free text ("today",
   "unscheduled"). Anything that does not parse is echoed back untouched. */
function parseDue(due: string): Date | null {
  if (!due) return null
  const m = due.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  const d = new Date(due)
  return isNaN(d.getTime()) ? null : d
}
function dueDayDiff(due: string): number | null {
  const d = parseDue(due)
  if (!d) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const at = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((at.getTime() - today.getTime()) / 86_400_000)
}
function dueLabel(due: string): string {
  if (!due) return ''
  const diff = dueDayDiff(due)
  if (diff === null) return due
  if (diff === 0) return 'due today'
  if (diff === 1) return 'due tomorrow'
  if (diff === -1) return 'due yesterday'
  if (diff < 0) return `${-diff} days overdue`
  if (diff <= 14) return `due in ${diff} days`
  return 'due ' + parseDue(due)!.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
function dueIsLate(due: string, col: api.TaskCol): boolean {
  if (col === 'done') return false
  const diff = dueDayDiff(due)
  return diff !== null && diff < 0
}
function dueInputValue(due: string): string {
  const d = parseDue(due)
  if (!d) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function shortDate(iso: string): string {
  const d = new Date(iso)
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}
function taskSnoozed(k: api.ConsoleTask): boolean {
  return !!k.snoozedUntil && new Date(k.snoozedUntil).getTime() > Date.now()
}
/** Raised by the system (derived ticket card or a generated row) vs typed by hand. */
function taskIsAuto(k: api.ConsoleTask): boolean {
  return !!k.derived || (!!k.source && k.source !== 'manual')
}
function taskShopName(id?: string): string {
  if (!id) return ''
  const s = api.SHOPS.find((x) => x.id === id)
  return s?.name || id
}
function snoozeUntilIso(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(9, 0, 0, 0)
  return d.toISOString()
}
function isoDatePlus(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/* A bare date input made setting "tomorrow" a calendar expedition. The four
   dates people actually pick are one click; the input stays for everything
   else and both write the same `due` string. */
const DUE_QUICK: { label: string; days: number | null }[] = [
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
  { label: 'No date', days: null },
]
function DueField({ value, onChange, compact }: { value: string; onChange: (v: string) => void; compact?: boolean }) {
  return (
    <div className={'kb-duefield' + (compact ? ' compact' : '')}>
      <span>Due</span>
      <div className="kb-duequick">
        {DUE_QUICK.map((q) => {
          const iso = q.days === null ? '' : isoDatePlus(q.days)
          return (
            <button type="button" key={q.label} className={value === iso ? 'on' : ''} onClick={() => onChange(iso)}>{q.label}</button>
          )
        })}
      </div>
      <input className="c-input" type="date" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Exact due date" />
    </div>
  )
}
/* `allowEmpty` is for editing rows written before the field existed: leaving
   it blank sends no `type` at all rather than stamping them "Other". */
function TypeField({ value, onChange, allowEmpty }: { value: api.TaskType | ''; onChange: (v: api.TaskType | '') => void; allowEmpty?: boolean }) {
  return (
    <label className="kb-typefield">
      <span>Type</span>
      <select className="c-input" value={value} onChange={(e) => onChange(e.target.value as api.TaskType | '')}>
        {allowEmpty && <option value="">Not set</option>}
        {api.TASK_TYPES.map((tt) => <option key={tt} value={tt}>{TASK_TYPE_LABEL[tt]}</option>)}
      </select>
    </label>
  )
}
/* POST and PATCH /api/kanban-tasks have always accepted priority ('low' |
   'normal' | 'high'), and the board already renders the High/Low chips — but
   only the task generator could ever set one, so an operator could see the
   chip and never produce or clear it. */
const TASK_PRIORITY_LABEL: Record<api.TaskPriority, string> = { low: 'Low', normal: 'Normal', high: 'High' }
function PriorityField({ value, onChange }: { value: api.TaskPriority; onChange: (v: api.TaskPriority) => void }) {
  return (
    <label className="kb-typefield">
      <span>Priority</span>
      <select className="c-input" value={value} onChange={(e) => onChange(e.target.value as api.TaskPriority)}>
        {(['high', 'normal', 'low'] as api.TaskPriority[]).map((p) => <option key={p} value={p}>{TASK_PRIORITY_LABEL[p]}</option>)}
      </select>
    </label>
  )
}
function TaskTypeChip({ k }: { k: api.ConsoleTask }) {
  if (!k.type) return null
  const Ic = TASK_TYPE_ICON[k.type]
  return <span className="c-chip ink"><Ic size={10} style={{ marginRight: 4 }} /> {TASK_TYPE_LABEL[k.type]}</span>
}

function TaskTags({ k, showStore }: { k: api.ConsoleTask; showStore: boolean }) {
  const src = k.derived ? 'From a ticket' : (k.source ? TASK_SOURCE_LABEL[k.source] : '')
  const store = showStore ? taskShopName(k.shopId) : ''
  if (!src && !store && !k.type && k.priority !== 'high' && k.priority !== 'low' && !taskSnoozed(k)) return null
  return (
    <div className="kb-tags">
      <TaskTypeChip k={k} />
      {src && <span className="c-chip ink">{src}</span>}
      {k.priority === 'high' && <span className="c-chip red">High priority</span>}
      {k.priority === 'low' && <span className="c-chip mut">Low priority</span>}
      {store && <span className="c-chip mut">{store}</span>}
      {taskSnoozed(k) && <span className="c-chip mut">Snoozed to {shortDate(k.snoozedUntil!)}</span>}
    </div>
  )
}

function TaskEditor({ k, wrap, onClose, onSaved }: { k: api.ConsoleTask; wrap: string; onClose: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState(k.t)
  const [detail, setDetail] = useState(k.d)
  const [due, setDue] = useState(dueInputValue(k.due))
  const [type, setType] = useState<api.TaskType | ''>(k.type ?? '')
  const [priority, setPriority] = useState<api.TaskPriority>(k.priority ?? 'normal')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const dirty = title.trim() !== k.t || detail.trim() !== k.d || due !== dueInputValue(k.due) || type !== (k.type ?? '') || priority !== (k.priority ?? 'normal')
  const save = async () => {
    if (!title.trim()) { setErr('A title is required.'); return }
    if (!dirty) { onClose(); return }
    setBusy(true); setErr('')
    try {
      // `type` is omitted, not blanked, when the operator left it unset — a
      // legacy row keeps having no type rather than becoming "Other".
      await api.updateTask(k.id, { title: title.trim(), detail: detail.trim(), due, priority, ...(type ? { type } : {}) })
      onSaved()
      onClose()
    } catch (e) {
      setErr((e as Error).message || 'Could not save the change')
    } finally { setBusy(false) }
  }
  return (
    <div className={wrap + ' kb-edit'}>
      <input className="c-input" autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
        onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') onClose() }} />
      <input className="c-input" value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Detail, optional"
        onKeyDown={(e) => { if (e.key === 'Enter') void save(); if (e.key === 'Escape') onClose() }} />
      <TypeField value={type} onChange={setType} allowEmpty />
      <PriorityField value={priority} onChange={setPriority} />
      <DueField value={due} onChange={setDue} />
      {err && <p className="c-note" style={{ margin: 0, color: '#B4472F' }}>{err}</p>}
      <div className="kb-editact">
        <button className="c-act prim" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</button>
        <button className="c-act" disabled={busy} onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

/* ══════════════════════════════ tasks attached to this conversation ═══
   `ticket_id` was already written on every task created from a ticket and
   never read back for hand-made rows: the only ticket link in the console
   was the derived `sup:` card. This is the missing half — the open work for
   THIS conversation, with a one-click complete, where the operator is
   already looking.

   Completing a task does NOT resolve, close or otherwise touch the ticket.
   They are separate lifecycles: a refund can still be owed after the reply
   went out, and a conversation can be resolved with work outstanding. The
   only call made here is moveTask(id, 'done').

   Derived `sup:` cards are deliberately excluded — the WAITING_SUPPLIER
   banner directly above says the same thing, and they are not documents. */
function TicketTasks({ t }: { t: Ticket }) {
  useStore()
  const [, setTick] = useState(0)
  const rerender = () => setTick((n) => n + 1)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [type, setType] = useState<api.TaskType>('other')
  const [due, setDue] = useState('')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  useEffect(() => { setAdding(false); setTitle(''); setType('other'); setDue(''); setErr(''); setEditing(null) }, [t.id])

  const mine = api.getTasks().filter((k) => k.ticketId === t.id && !k.derived)
  const open = mine.filter((k) => k.col !== 'done')
  const doneCount = mine.length - open.length

  const add = async () => {
    const ti = title.trim()
    if (!ti || busy) return
    setBusy('add'); setErr('')
    try {
      await api.createTask(ti, '', { due: due || undefined, ticketId: t.id, type, shopId: t.shop_id })
      setTitle(''); setDue(''); setType('other'); setAdding(false)
      rerender()
    } catch (e) {
      setErr((e as Error).message || 'Could not save the task, nothing was created.')
    } finally { setBusy('') }
  }
  const complete = async (k: api.ConsoleTask) => {
    setBusy(k.id); setErr('')
    try { await api.moveTask(k.id, 'done'); rerender() }
    catch (e) { setErr((e as Error).message || 'Could not complete the task') }
    finally { setBusy('') }
  }

  if (open.length === 0 && !adding) {
    return (
      <div className="c-tktasks empty">
        <ListChecks size={14} />
        <span className="tx">{doneCount > 0 ? `No open tasks on this conversation · ${doneCount} completed` : 'No tasks on this conversation'}</span>
        <button className="c-act" onClick={() => setAdding(true)}><Plus size={12} /> Add a task</button>
      </div>
    )
  }
  return (
    <div className="c-tktasks">
      <div className="hd">
        <ListChecks size={14} />
        <b>{open.length} open task{open.length === 1 ? '' : 's'} on this conversation</b>
        {doneCount > 0 && <span className="mut">{doneCount} completed</span>}
        <span className="sp" />
        {!adding && <button className="c-act" onClick={() => setAdding(true)}><Plus size={12} /> Add a task</button>}
      </div>
      {open.map((k) => (
        editing === k.id
          ? <TaskEditor key={k.id} k={k} wrap="c-tkedit" onClose={() => setEditing(null)} onSaved={rerender} />
          : (
            <div className="row" key={k.id}>
              <button
                className="c-check" disabled={busy === k.id}
                title="Mark this task done. It does not change the conversation."
                aria-label={`Complete task: ${k.t}`}
                onClick={() => void complete(k)}
              >
                {busy === k.id ? <Loader2 size={11} className="c-spin" /> : null}
              </button>
              <span className="tx"><b>{k.t}</b>{k.d ? ` · ${k.d}` : ''}</span>
              <TaskTypeChip k={k} />
              {dueLabel(k.due) && <span className={'due' + (dueIsLate(k.due, k.col) ? ' late' : '')}>{dueLabel(k.due)}</span>}
              <button className="lk" onClick={() => setEditing(k.id)}><Pencil size={11} /> Edit</button>
            </div>
          )
      ))}
      {adding && (
        <div className="add">
          <input
            className="c-input" autoFocus placeholder="What has to happen" value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void add(); if (e.key === 'Escape') setAdding(false) }}
          />
          <TypeField value={type} onChange={(v) => setType((v || 'other') as api.TaskType)} />
          <DueField value={due} onChange={setDue} compact />
          <div className="kb-editact">
            <button className="c-act prim" disabled={busy === 'add' || !title.trim()} onClick={() => void add()}>{busy === 'add' ? 'Adding…' : 'Add task'}</button>
            <button className="c-act" disabled={busy === 'add'} onClick={() => { setAdding(false); setErr('') }}>Cancel</button>
          </div>
        </div>
      )}
      {err && <p className="c-note" style={{ margin: 0, color: '#B4472F', fontSize: 11.5 }} role="alert">{err}</p>}
    </div>
  )
}

function TasksView({ shopId, onOpen }: { shopId: string; onOpen?: (id: string) => void }) {
  useStore()
  // The demo adapter has no notify() for edit/delete, so the view keeps its own
  // tick and bumps it after every mutation. Live mode re-renders via useStore().
  const [, setTick] = useState(0)
  const rerender = () => setTick((n) => n + 1)
  const [mode, setMode] = useState<'board' | 'list'>(() => { try { return localStorage.getItem('resolver.tasks_view') === 'list' ? 'list' : 'board' } catch { return 'board' } })
  useEffect(() => { try { localStorage.setItem('resolver.tasks_view', mode) } catch { /* ignore */ } }, [mode])
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [detail, setDetail] = useState('')
  const [due, setDue] = useState('')
  const [type, setType] = useState<api.TaskType>('other')
  const [priority, setPriority] = useState<api.TaskPriority>('normal')
  const [busy, setBusy] = useState(false)
  const [addErr, setAddErr] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [showSnoozed, setShowSnoozed] = useState(false)

  const allTasks = api.getTasks()
  const snoozedCount = allTasks.filter(taskSnoozed).length
  const tasks = showSnoozed ? allTasks : allTasks.filter((k) => !taskSnoozed(k))
  const showStore = shopId === 'all'

  const submit = async () => {
    const t = title.trim()
    if (!t || busy) return
    setBusy(true); setAddErr('')
    try {
      await api.createTask(t, detail.trim(), { due: due || undefined, shopId: shopId !== 'all' ? shopId : undefined, type, priority })
      setTitle(''); setDetail(''); setDue(''); setType('other'); setPriority('normal'); setAdding(false)
      rerender()
    } catch (e) {
      // Never discard what was typed — the form stays open with the text in it.
      setAddErr((e as Error).message || 'Could not save the task')
    } finally { setBusy(false) }
  }
  const remove = async (k: api.ConsoleTask) => {
    if (!window.confirm(`Delete "${k.t}"? This cannot be undone.`)) return
    await api.deleteTask(k.id)
    rerender()
  }
  const snooze = async (k: api.ConsoleTask, days: number) => {
    await api.snoozeTask(k.id, days > 0 ? snoozeUntilIso(days) : '')
    rerender()
  }
  const onDrop = (e: React.DragEvent, col: api.TaskCol) => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/task')
    if (id) void api.moveTask(id, col)
  }

  const actions = (k: api.ConsoleTask) => (
    <>
      <button title="Edit this task" onClick={(e) => { e.stopPropagation(); setEditing(k.id) }}>Edit</button>
      {taskIsAuto(k) && !k.derived && (
        taskSnoozed(k)
          ? <button title="Bring this task back now" onClick={(e) => { e.stopPropagation(); void snooze(k, 0) }}>Un-snooze</button>
          : <button title={`Hide this task until ${shortDate(snoozeUntilIso(SNOOZE_DAYS))}`} onClick={(e) => { e.stopPropagation(); void snooze(k, SNOOZE_DAYS) }}>Snooze {SNOOZE_DAYS}d</button>
      )}
      <button title="Delete this task" onClick={(e) => { e.stopPropagation(); void remove(k) }}>Delete</button>
    </>
  )

  return (
    <div className="c-page">
      <header className="c-page-h">
        <div>
          <h1>Tasks</h1>
          <p>Follow-up work for this account, what you add by hand plus what the console raises from your conversations</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {snoozedCount > 0 && (
            <button className={'c-chip-btn' + (showSnoozed ? '' : ' mutst')} onClick={() => setShowSnoozed(!showSnoozed)}>
              <Clock size={13} /> {showSnoozed ? 'Hide snoozed' : `Show snoozed (${snoozedCount})`}
            </button>
          )}
          <div className="c-seg">
            {(['board', 'list'] as const).map((m) => (
              <button key={m} className={mode === m ? 'on' : ''} onClick={() => setMode(m)}>{m === 'board' ? 'Board' : 'List'}</button>
            ))}
          </div>
          <button className="c-act prim" onClick={() => { setAdding(!adding); setAddErr('') }}><Plus size={14} /> New task</button>
        </div>
      </header>
      {adding && (
        <div className="c-card kb-new">
          <div className="kb-newrow">
            <input
              className="c-input" autoFocus placeholder="What needs doing"
              value={title} onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit(); if (e.key === 'Escape') setAdding(false) }}
            />
            <input
              className="c-input" placeholder="Detail, optional"
              value={detail} onChange={(e) => setDetail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void submit(); if (e.key === 'Escape') setAdding(false) }}
            />
            <TypeField value={type} onChange={(v) => setType((v || 'other') as api.TaskType)} />
            <button className="c-act prim" disabled={busy || !title.trim()} onClick={() => void submit()}>{busy ? 'Adding…' : 'Add'}</button>
          </div>
          <div className="kb-newrow"><PriorityField value={priority} onChange={setPriority} /><DueField value={due} onChange={setDue} /></div>
          <p className="c-note" style={{ margin: 0 }}>
            {shopId === 'all' ? 'Filed against the whole account. Pick a store in the switcher to file it there.' : `Filed against ${taskShopName(shopId)}.`}
          </p>
          {addErr && <p className="c-note" style={{ margin: 0, color: '#B4472F' }}>{addErr} — nothing was saved, your text is still here.</p>}
        </div>
      )}
      {allTasks.length === 0 && (
        <div className="c-card">
          <p className="c-note" style={{ margin: 0 }}>
            No tasks yet. Add one with New task, and conversations left waiting on a supplier show up here on their own.
          </p>
        </div>
      )}
      {mode === 'board' ? (
        <div className="c-kanban">
          {KANBAN_COLS.map((col) => {
            const items = tasks.filter((k) => k.col === col.id)
            return (
              <div className="kb-col" key={col.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, col.id)}>
                <div className="kb-h">{col.label}<span className="n">{items.length}</span></div>
                <div className="kb-list">
                  {items.map((k) => (
                    editing === k.id
                      ? <TaskEditor key={k.id} k={k} wrap="kb-card" onClose={() => setEditing(null)} onSaved={rerender} />
                      : (
                        <div
                          className={'kb-card' + (col.id === 'done' ? ' done' : '') + (taskIsAuto(k) ? ' derived' : '')} key={k.id} draggable={!k.derived}
                          onDragStart={k.derived ? undefined : (e) => e.dataTransfer.setData('text/task', k.id)}
                        >
                          <div className="t">{k.t}</div>
                          {k.d && <div className="d">{k.d}</div>}
                          <TaskTags k={k} showStore={showStore} />
                          <div className="kb-foot">
                            <span className="kb-when">
                              <span className={'due' + (dueIsLate(k.due, k.col) ? ' late' : '')}>{dueLabel(k.due) || (k.derived ? 'from a ticket' : 'no due date')}</span>
                              {k.createdAt && <span className="age">added {timeAgo(k.createdAt)} ago</span>}
                            </span>
                            <div className="mv">
                              {/* A hand-made task filed from a ticket carries
                                  ticket_id too — it used to be written and
                                  never read, so only derived cards could jump
                                  back to the conversation. */}
                              {onOpen && k.ticketId && <button title="Open the conversation this task belongs to" onClick={() => onOpen(k.ticketId!)}>Open ticket →</button>}
                              {!k.derived && (
                                <>
                                  {KANBAN_COLS.filter((c) => c.id !== col.id).map((c) => (
                                    <button key={c.id} title={'Move to ' + c.label} onClick={() => void api.moveTask(k.id, c.id)}>→ {c.label}</button>
                                  ))}
                                  {actions(k)}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                  ))}
                  {items.length === 0 && <div className="kb-empty">Drop here</div>}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="c-card">
          <div className="c-rows">
            {tasks.length === 0 && (
              <p className="c-note" style={{ marginTop: 0 }}>
                {allTasks.length === 0 ? 'Nothing on the board.' : `Nothing to show, ${snoozedCount} snoozed task${snoozedCount === 1 ? '' : 's'} hidden.`}
              </p>
            )}
            {tasks.map((k) => (
              editing === k.id
                ? <TaskEditor key={k.id} k={k} wrap="c-ev" onClose={() => setEditing(null)} onSaved={rerender} />
                : (
                  <div className={'c-ev' + (k.derived ? ' c-ev-click' : '')} key={k.id} style={k.col === 'done' ? { opacity: .45 } : undefined} onClick={k.derived && onOpen && k.ticketId ? () => onOpen(k.ticketId!) : undefined} role={k.derived ? 'button' : undefined}>
                    {k.derived
                      ? <span className="c-taskic" title="Waiting on a supplier answer, tracked on the ticket"><Factory size={13} /></span>
                      : (
                        <button className={'c-check' + (k.col === 'done' ? ' on' : '')} onClick={(e) => { e.stopPropagation(); void api.toggleTask(k.id) }} aria-label={k.col === 'done' ? 'Reopen task' : 'Mark task done'}>
                          {k.col === 'done' && <Check size={12} strokeWidth={3} />}
                        </button>
                      )}
                    <span className="t" style={k.col === 'done' ? { textDecoration: 'line-through' } : undefined}>
                      <b>{k.t}</b>{k.d ? ', ' + k.d : ''}
                    </span>
                    <TaskTags k={k} showStore={showStore} />
                    <span className="c-chip mut">{KANBAN_COLS.find((c) => c.id === k.col)!.label}</span>
                    <span className="at">
                      <span className={dueIsLate(k.due, k.col) ? 'late' : undefined}>{dueLabel(k.due) || (k.derived ? 'from a ticket' : 'no due date')}</span>
                      {k.createdAt && <span className="age"> · added {timeAgo(k.createdAt)} ago</span>}
                    </span>
                    {!k.derived && (
                      <span className="kb-rowact">
                        {onOpen && k.ticketId && (
                          <button className="c-act" title="Open the conversation this task belongs to" onClick={(e) => { e.stopPropagation(); onOpen(k.ticketId!) }}><Inbox size={12} /> Open ticket</button>
                        )}
                        <button className="c-act" onClick={(e) => { e.stopPropagation(); setEditing(k.id) }}><Pencil size={12} /> Edit</button>
                        {taskIsAuto(k) && (
                          taskSnoozed(k)
                            ? <button className="c-act" onClick={(e) => { e.stopPropagation(); void snooze(k, 0) }}><Clock size={12} /> Un-snooze</button>
                            : <button className="c-act" onClick={(e) => { e.stopPropagation(); void snooze(k, SNOOZE_DAYS) }}><Clock size={12} /> Snooze {SNOOZE_DAYS}d</button>
                        )}
                        <button className="c-act red" onClick={(e) => { e.stopPropagation(); void remove(k) }}><Trash2 size={12} /> Delete</button>
                      </span>
                    )}
                  </div>
                )
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SentView() {
  useStore()
  const rows = [...api.getOutbound()].sort((a, b) => b.at.localeCompare(a.at))
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Sent</h1><p>Outbound mail across stores</p></div></header>
      <div className="c-card">
        <div className="c-rows">
          {rows.length === 0 && <p className="c-note" style={{ marginTop: 0 }}>Nothing sent yet.</p>}
          {rows.map((r, i) => (
            <div className="c-ev" key={i}>
              <span className="t"><b>{r.subject}</b>, to {r.to} · from {r.from}</span>
              <span className="at">{timeAgo(r.at)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function UsersView() { return <LiveTeam /> }

function FilterList({ kind, title, hint }: { kind: 'keywords' | 'senders' | 'allow'; title: string; hint: string }) {
  useStore()
  const [v, setV] = useState('')
  const items = api.getMailFilters()[kind]
  const addItem = (val: string) => { const t = val.trim(); if (!t) return; void api.setMailFilters(kind, [...items, t]) }
  const removeItem = (val: string) => { void api.setMailFilters(kind, items.filter((x) => x !== val)) }
  return (
    <div className="c-filterblock">
      <div className="hd">{title}</div>
      <p className="c-note" style={{ margin: '2px 0 10px' }}>{hint}</p>
      <div className="chips">
        {items.map((x) => (
          <span className="fchip" key={x}>{x}<button onClick={() => removeItem(x)} aria-label={'remove ' + x}><X size={11} /></button></span>
        ))}
      </div>
      <div className="add">
        <input
          className="c-input" placeholder={'Add to ' + title.toLowerCase() + '…'} value={v}
          onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && v.trim()) { addItem(v); setV('') } }}
        />
        <button className="c-act" onClick={() => { if (v.trim()) { addItem(v); setV('') } }}>Add</button>
      </div>
    </div>
  )
}
const RULE_IF_LABEL: Record<api.InboxRule['if_field'], string> = { sender: 'sender contains', subject: 'subject contains', category: 'category is', language: 'language is' }
const RULE_ACT_LABEL: Record<api.InboxRule['action'], string> = { close: 'close as filtered', assign: 'assign to', skip_ai: 'skip AI drafting', bin: 'move to bin' }

/* Non-AI inbox automation: condition -> action rows, evaluated before any
   drafting. The seeded rules cover the daily patterns (marketing blasts,
   out-of-office loops, partnership routing, language routing). */
function InboxRules() {
  useStore()
  const [adding, setAdding] = useState(false)
  const [nw, setNw] = useState<{ if_field: api.InboxRule['if_field']; if_value: string; action: api.InboxRule['action']; target: string }>({ if_field: 'sender', if_value: '', action: 'close', target: 'nathan' })
  const save = async () => {
    if (!nw.if_value.trim()) return
    await api.addInboxRule({ if_field: nw.if_field, if_value: nw.if_value.trim(), action: nw.action, target: nw.action === 'assign' ? nw.target : null })
    setNw({ ...nw, if_value: '' }); setAdding(false)
  }
  return (
    <div className="c-filterblock">
      <div className="hd">Rules</div>
      <p className="c-note" style={{ margin: '4px 0 10px' }}>Run on every inbound email before drafting. Conditions are simple on purpose; the AI playbook handles anything that needs judgment.</p>
      <div className="c-rows" style={{ gap: 6 }}>
        {api.INBOX_RULES.map((r) => (
          <div className={'c-inboxrule' + (r.enabled ? '' : ' off')} key={r.id}>
            <button className={'c-switch sm' + (r.enabled ? ' on green' : '')} onClick={() => api.toggleInboxRule(r.id)} aria-label="toggle rule"><span className="k" /></button>
            <span className="tx">
              If <b>{RULE_IF_LABEL[r.if_field]}</b> <code>{r.if_value}</code> then <b>{RULE_ACT_LABEL[r.action]}</b>
              {r.action === 'assign' && r.target && <> <span className="c-avatar sm" style={{ margin: '0 3px', verticalAlign: '-3px' }}>{api.getTeam().find((m) => m.id === r.target)?.initials}</span><b>{api.getTeam().find((m) => m.id === r.target)?.name}</b></>}
            </span>
            <span className="hits">{r.hits30d}× / 30d</span>
            <button className="del" title="Delete rule" onClick={() => api.deleteInboxRule(r.id)}><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
      {!adding ? (
        <button className="c-act" style={{ marginTop: 10 }} onClick={() => setAdding(true)}><Plus size={14} /> Add rule</button>
      ) : (
        <div className="c-rulebuilder">
          <span className="lbl">If</span>
          <select value={nw.if_field} onChange={(e) => setNw({ ...nw, if_field: e.target.value as api.InboxRule['if_field'] })}>
            <option value="sender">sender contains</option>
            <option value="subject">subject contains</option>
          </select>
          <input autoFocus placeholder={nw.if_field === 'sender' ? '@domain.com' : nw.if_field === 'subject' ? 'phrase…' : nw.if_field === 'category' ? 'PARTNERSHIP' : 'IT'} value={nw.if_value} onChange={(e) => setNw({ ...nw, if_value: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') void save() }} />
          <span className="lbl">then</span>
          <select value={nw.action} onChange={(e) => setNw({ ...nw, action: e.target.value as api.InboxRule['action'] })}>
            <option value="close">close as filtered</option>
          </select>
          {nw.action === 'assign' && (
            <select value={nw.target} onChange={(e) => setNw({ ...nw, target: e.target.value })}>
              {api.getTeam().map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          )}
          <span className="sp" />
          <button className="c-act" onClick={() => setAdding(false)}>Cancel</button>
          <button className="c-act prim" disabled={!nw.if_value.trim()} onClick={() => void save()}><Check size={13} /> Save</button>
        </div>
      )}
    </div>
  )
}

function FilterSettings() {
  return (
    <div className="c-rows" style={{ gap: 22 }}>
      <InboxRules />
      <FilterList kind="keywords" title="Blocked keywords" hint="Inbound mail containing these goes to Filtered instead of the inbox." />
      <FilterList kind="senders" title="Blocked senders" hint="Matched against the from address. Prefixes and domains both work." />
      {/* Always-allow is read by ticketPipeline (both the new-ticket and reply
          paths) and the legacy app exposed it; v3 hid it behind !LIVE, leaving
          no way to rescue a real customer whose mail trips a broad keyword.
          The Filters tab is already super-admin-only in live, which matches the
          server-side restriction on this key. */}
      <FilterList kind="allow" title="Always allow" hint="These senders always reach the inbox, whatever the rules above say." />
      <p className="c-note">Inbound rules run before drafting. Everything filtered stays visible under Inbox, Filtered.</p>
    </div>
  )
}

/** Your own sign-in: how you get in, and how to change it.
 *
 *  There was no way to change a password anywhere in the product, and no way at all to
 *  ADD one to an account created with Google. Of 14 accounts, 8 are Google-only and 6 have
 *  a password. A Google-only merchant who wanted to hand a teammate a password, or sign in
 *  somewhere Google is awkward, had no route: their only credential was the Google button.
 *
 *  Two different jobs, decided by what the account already has, because they are different
 *  Firebase operations and offering the wrong one is a dead end:
 *
 *    has a password  -> send a reset link. Deliberately a mailed link rather than an
 *                       in-page "new password" field: changing a password in place needs
 *                       a recent sign-in and otherwise fails with requires-recent-login,
 *                       which would strand exactly the person who has been working all day.
 *    Google only     -> link an email/password credential to the existing account. Not a
 *                       new account and not a replacement for Google: afterwards both work.
 */
function AccountSettings() {
  const user = consoleAuth().currentUser
  const providers = (user?.providerData ?? []).map((p) => p.providerId)
  const hasPassword = providers.includes('password')
  const hasGoogle = providers.includes('google.com')
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [err, setErr] = useState('')

  const sendReset = async () => {
    if (!user?.email) return
    setBusy(true); setErr(''); setNote('')
    try {
      await sendPasswordResetEmail(consoleAuth(), user.email)
      setNote(`A reset link is on its way to ${user.email}. Check spam too.`)
    } catch (e) { setErr((e as Error).message.replace('Firebase: ', '')) }
    setBusy(false)
  }

  const setPassword = async () => {
    if (!user?.email) return
    if (pw.length < 8) { setErr('Use at least 8 characters.'); return }
    setBusy(true); setErr(''); setNote('')
    try {
      await linkWithCredential(user, EmailAuthProvider.credential(user.email, pw))
      setPw('')
      setNote('Password set. You can now sign in with Google or with your email and this password.')
    } catch (e) {
      const msg = (e as Error).message.replace('Firebase: ', '')
      // The one failure worth translating: Firebase asks for a fresh sign-in before it
      // will attach a credential to an old session.
      setErr(/requires-recent-login/i.test(msg)
        ? 'For security, sign out and back in with Google, then set the password.'
        : msg)
    }
    setBusy(false)
  }

  return (
    <div>
      <div className="c-card">
        <div className="c-card-h">Your sign-in</div>
        <p className="c-note">{user?.email || 'Not signed in'}</p>
        <p className="c-note" style={{ marginTop: 2 }}>
          {hasGoogle && hasPassword ? 'You can sign in with Google or with a password.'
            : hasGoogle ? 'You sign in with Google. There is no password on this account yet.'
            : hasPassword ? 'You sign in with your email and a password.'
            : 'No sign-in method could be read for this account.'}
        </p>

        {hasPassword && (
          <div style={{ marginTop: 10 }}>
            <button className="c-act" disabled={busy} onClick={() => void sendReset()}>
              {busy ? <Loader2 size={13} className="c-spin" /> : null} Send a password reset link
            </button>
          </div>
        )}

        {!hasPassword && hasGoogle && (
          <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="password" placeholder="New password, 8+ characters" value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void setPassword() }}
              style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '7px 9px', font: 'inherit', minWidth: 240 }}
            />
            <button className="c-act prim" disabled={busy || !pw.trim()} onClick={() => void setPassword()}>
              {busy ? <Loader2 size={13} className="c-spin" /> : null} Set a password
            </button>
          </div>
        )}

        {note && <p className="c-note" style={{ marginTop: 8 }}>{note}</p>}
        {err && <p className="c-note" style={{ marginTop: 8, color: '#B4472F' }}>{err}</p>}
      </div>
    </div>
  )
}

function NotifSettings() {
  useStore()
  const saved = (api.getLiveSettings() as { notification_prefs?: Record<string, boolean> }).notification_prefs ?? {}
  const [n, setN] = useState({ esc: true, fail: true, digest: false, supplier: true })
  useEffect(() => { setN((prev) => ({ ...prev, ...saved })); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [JSON.stringify(saved)])
  const toggle = (k: keyof typeof n) => { const next = { ...n, [k]: !n[k] }; setN(next); void api.saveNotificationPrefs(next) }
  const channel = (api.getLiveSettings() as { alerts_channel?: string }).alerts_channel ?? 'none'
  // `wired` = a server-side hook actually delivers this alert. Escalations fire
  // from the pipeline, auto-send failures from the dispatcher. The other two
  // have no producer yet, so they are shown disabled rather than pretending.
  const ROWS: [keyof typeof n, string, string, boolean][] = [
    ['esc', 'Escalations', 'Alert me the moment dispute or legal language is detected', true],
    ['fail', 'Auto-send failures', 'Alert me when a queued send fails or is cancelled by the system', true],
    ['supplier', 'Supplier replies', 'Alert me when a supplier answers a request', false],
    ['digest', 'Daily digest', 'One morning summary: volume, backlog, and anything waiting on you', false],
  ]
  return (
    <div>
      <div className="c-rows">
        {ROWS.map(([k, title, sub, wired]) => (
          <div className={'c-notifrow' + (wired ? '' : ' is-off')} key={k}>
            <div>
              <b>{title}{!wired && <span className="c-store-tag" style={{ marginLeft: 8 }}>not yet available</span>}</b>
              <p>{sub}</p>
            </div>
            <button
              className={'c-switch green' + (wired && n[k] ? ' on' : '')}
              disabled={!wired}
              title={wired ? title : 'No delivery hook for this alert yet'}
              onClick={() => { if (wired) toggle(k) }}
              aria-label={title}
            ><span className="k" /></button>
          </div>
        ))}
      </div>
      <p className="c-note">
        {channel === 'none'
          ? 'No alert channel is configured on this deployment, so nothing can be delivered. Set TELEGRAM_BOT_TOKEN and TELEGRAM_AUTO_SEND_CHAT_ID to turn these on.'
          : 'Alerts are delivered to the connected Telegram channel.'}
      </p>
    </div>
  )
}

/* ══════════════════════════════════════════════ SETTINGS > BILLING ═══
   The only place outside a Shopify store admin where a merchant can see their plan
   and stop paying for it.

   WHY IT HAD TO EXIST: cancelling lived only in the embedded Shopify panel
   (src/saas/EmbeddedHome.tsx), which is reached through a store's admin. An account
   with an active subscription and no linked store could not reach that panel at all,
   so it had no route to cancelling from anywhere in Resolver. This tab, before this,
   printed a hardcoded "Owner · internal" and no plan information whatsoever.

   WHAT DECIDES "ACTIVE": planState, planGate.ts's own verdict. NOT hasSubscription —
   that field reports false whenever the Shopify read throws, so a screen built on it
   would tell a paying merchant their plan had lapsed every time Shopify blipped.
   planState is 'unknown' for every uncertain state, including the account with no
   linked store, which is why Cancel is offered on anything that is not a positive
   'inactive' and the server is left to answer honestly.

   THE CONFIRMATION is mandatory and names the exact store the charge sits on, which is
   the store /api/billing/cancel itself resolves. Its wording is EmbeddedHome's, kept
   word for word so the two surfaces speak with one voice; the owner set prorate: false,
   so the sentence about the paid period not being refunded is a fact, not a hedge.

   THE OUTCOME is the server's `message`, rendered verbatim. The route re-reads Shopify
   after the mutation and can come back "still active, nothing was cancelled"; writing
   our own success line here would turn that answer into a lie. */
function BillingSettings() {
  useStore()
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  // What the SERVER said happened. `cancelled` is carried only to pick the wording of
  // the line beside the message, never to compose the message itself.
  const [done, setDone] = useState<{ cancelled: boolean; message: string } | null>(null)
  useEffect(() => {
    void api.refreshBillingSummary()
    void api.refreshShopCounts()
  }, [])

  const s = api.getBillingSummary()
  const loadErr = api.getBillingError()
  const store = s?.billingShopDomain || ''
  const planName = s?.plan ? s.plan.charAt(0).toUpperCase() + s.plan.slice(1) : 'No plan'
  const state = s?.planState ?? null
  // Positive 'inactive' is the only verdict that may say the plan is off. Everything
  // else uncertain says it could not be confirmed rather than guessing either way.
  const stateLabel = state === 'active' ? 'Active' : state === 'inactive' ? 'Not active' : 'Could not be confirmed'
  const stateClass = state === 'active' ? 'green' : state === 'inactive' ? 'red' : undefined
  // Offered unless the plan is positively inactive AND there is a store carrying the
  // charge to cancel it on. The unlinked-store account reads 'unknown', not 'active',
  // and it is the whole reason this control exists, so 'unknown' must not hide it.
  // Admin only: POST /api/billing/cancel is adminOnly and a visible 403 is worse than
  // no button.
  const canCancel = !!s && state !== 'inactive' && !!store && api.isAdmin()

  const doCancel = async () => {
    setBusy(true); setErr('')
    try {
      const r = await api.cancelSubscription()
      setConfirm(false)
      setDone({ cancelled: r.cancelled, message: r.message })
    } catch (e) {
      setErr((e as Error).message || 'Could not cancel the plan.')
    }
    setBusy(false)
  }

  return (
    <div className="c-rows">
      <div className="c-set-head"><h3>Billing</h3><p>Your plan is billed through Shopify, on one of your stores.</p></div>

      {!s && !loadErr && <p className="c-note" style={{ margin: 0 }}>Reading your plan…</p>}
      {!s && loadErr && <p className="c-note" style={{ margin: 0, color: 'var(--red)' }} role="alert">{loadErr}</p>}

      {s && (
        <>
          <div className="c-kv"><span>Plan</span><b>{planName}</b></div>
          <div className="c-kv"><span>Subscription</span><b className={stateClass}>{stateLabel}</b></div>
          <div className="c-kv"><span>Billed on</span><b>{store || 'Not known'}</b></div>
          <div className="c-kv">
            <span>Stores used</span>
            <b>{s.storeCap === null ? String(s.linkedStores) : `${s.linkedStores} of ${s.storeCap}`}</b>
          </div>

          {s.billingOnUnlinkedStore && (
            <p className="c-note" style={{ marginBottom: 0 }}>
              That store is no longer linked to this account. The charge stayed with it, so cancel it here.
            </p>
          )}
          {loadErr && <p className="c-note" style={{ marginBottom: 0, color: 'var(--red)' }} role="alert">{loadErr}</p>}

          {/* The server's own sentence, verbatim. */}
          {done && (
            <div className="c-rconfirm" style={{ marginTop: 12 }} role="status">
              <p>{done.message}</p>
              <div className="acts">
                <button className="c-act" style={{ padding: '7px 13px', fontSize: 12 }} onClick={() => setDone(null)}>Close</button>
              </div>
            </div>
          )}

          {confirm ? (
            <div className="c-rconfirm" style={{ marginTop: 12 }}>
              <p>
                {store
                  ? <>Your plan is billed on <b>{store}</b>. Cancelling it stops Resolver for every store on this account.</>
                  : 'Cancelling stops Resolver for every store on this account.'}
                {s.billingOnUnlinkedStore ? ' That store is no longer linked to this account, but the charge stayed with it.' : ''}
              </p>
              <p>Paid features stop as soon as you confirm, not at the end of the current billing period. The period you have already paid for is not refunded.</p>
              <p>To use Resolver again later, choose a plan again on Shopify.</p>
              {err && <p style={{ color: 'var(--red)' }} role="alert">{err}</p>}
              <div className="acts">
                <button className="c-act red" style={{ padding: '7px 13px', fontSize: 12 }} disabled={busy} onClick={() => void doCancel()}>
                  {busy ? 'Cancelling…' : 'Cancel plan'}
                </button>
                <button className="c-act" style={{ padding: '7px 13px', fontSize: 12 }} disabled={busy} onClick={() => { setConfirm(false); setErr('') }}>Keep my plan</button>
              </div>
            </div>
          ) : (
            <>
              {err && <p className="c-note" style={{ marginBottom: 0, color: 'var(--red)' }} role="alert">{err}</p>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                {s.managedPricingUrl && (
                  /* New tab on purpose: this tab stays alive, and its next read picks
                     up the plan the merchant just chose on Shopify. */
                  <a className="c-act prim" href={s.managedPricingUrl} target="_blank" rel="noreferrer">
                    {state === 'active' ? 'Manage plan' : 'Choose a plan'} <ArrowUpRight size={13} />
                  </a>
                )}
                <button className="c-act" disabled={api.isBillingLoading()} onClick={() => void api.refreshBillingSummary(true)}>
                  {api.isBillingLoading() ? 'Checking…' : 'Refresh'}
                </button>
                {canCancel && (
                  <button className="c-act red" onClick={() => { setErr(''); setDone(null); setConfirm(true) }}>Cancel plan</button>
                )}
              </div>
              {!s.managedPricingUrl && (
                <p className="c-note" style={{ marginBottom: 0 }}>
                  We could not tell which store your plan is billed on. Write to support@resolver.chat.
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}


/** Settings tab to open on the next SettingsView mount, set by a link that points
 *  at one (the empty inbox's "Connect an inbox"). One-shot, like PENDING_OPEN. */
let PENDING_SETTINGS_TAB: typeof SETTINGS_TABS[number] | null = null
function SettingsView() {
  // The support bubble lives here and nowhere else in the console. A merchant working
  // their inbox should not have a chat widget floating over their tickets all day; a
  // merchant in Settings is the one who has a question about the product. Admins only,
  // because an agent's support route is their own admin, not us.
  const canChat = api.isAdmin()
  useEffect(() => {
    setSupportChat(canChat)
    return () => setSupportChat(false)
  }, [canChat])

  const [tab, setTab] = useState<typeof SETTINGS_TABS[number]>(() => {
    const pnd = PENDING_SETTINGS_TAB; PENDING_SETTINGS_TAB = null
    return pnd ?? (api.isAdmin() ? 'Lanes' : 'Saved replies')
  })
  useStore()
  return (
    <div className="c-page">
      <header className="c-page-h"><div><h1>Settings</h1><p>{api.liveCurrentEmail() || 'Signed in'}</p></div></header>
      <div className="c-set">
        <nav className="c-set-nav">
          {SETTINGS_TABS
            .filter((x) => api.isAdmin() || AGENT_SETTINGS_TABS.has(x))
            // These write the SINGLE GLOBAL settings doc, which is super-admin
            // only server-side — showing them to a plain admin guarantees a 403.
            .filter((x) => api.isSuperAdmin() || !GLOBAL_SETTINGS_TABS.has(x))
            .map((x) => (
            <button key={x} className={x === tab ? 'on' : ''} onClick={() => setTab(x)}>{x}</button>
          ))}
        </nav>
        <div className="c-set-body">
          {tab === 'Lanes' && <LiveLanes />}
          {tab === 'Stores' && <StoresSettings />}
          {tab === 'Policies & SOP' && <SopSettings />}
          {tab === 'Saved replies' && <MacrosSettings />}
          {tab === 'Operations' && <OperationsSettings />}
          {tab === 'API' && <ApiKeysSettings />}
          {tab === 'Team' && <LiveTeam />}
          {tab === 'Account' && <AccountSettings />}
          {tab === 'Filters' && <FilterSettings />}
          {tab === 'Notifications' && <NotifSettings />}
          {tab === 'Billing' && <BillingSettings />}
        </div>
      </div>
      {/* The one place a merchant looks for help. A support product with no way to reach
          its own support reads badly to a reviewer and worse to a customer. */}
      <p className="c-note" style={{ textAlign: 'center', marginTop: 4 }}>
        Questions? Email <a href="mailto:hello@resolver.chat">hello@resolver.chat</a>
      </p>
    </div>
  )
}

/* Manual store connection: Shopify admin token + a Gmail mailbox reached by
   Workspace domain-wide delegation. Ported from the legacy AddShopModal. The
   server runs the same three checks again on create, and both routes are
   super-admin only (validation delivers a real test email to the mailbox). */
type MCheck = { state: 'idle' | 'running' | 'ok' | 'error'; error?: string }
function ManualStoreConnect({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ id: '', name: '', gmail_address: '', shopify_domain: '', shopify_admin_token: '', ai_brand_voice_hint: '', signature_block: '' })
  const [chk, setChk] = useState<{ shopify: MCheck; workspace: MCheck; send: MCheck }>({ shopify: { state: 'idle' }, workspace: { state: 'idle' }, send: { state: 'idle' } })
  const [busy, setBusy] = useState<'' | 'validate' | 'save'>('')
  const [err, setErr] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  const required = f.id.trim() && f.name.trim() && f.gmail_address.trim() && f.shopify_domain.trim() && f.shopify_admin_token.trim()
  const allOk = chk.shopify.state === 'ok' && chk.workspace.state === 'ok' && chk.send.state === 'ok'

  const validate = async () => {
    setBusy('validate'); setErr(''); setOkMsg('')
    setChk({ shopify: { state: 'running' }, workspace: { state: 'running' }, send: { state: 'running' } })
    try {
      const r = await api.validateShopManual({
        id: f.id.trim().toLowerCase(), gmail_address: f.gmail_address.trim().toLowerCase(),
        shopify_domain: f.shopify_domain.trim().toLowerCase(), shopify_admin_token: f.shopify_admin_token.trim(),
      })
      setChk({
        shopify: r?.shopify?.ok ? { state: 'ok' } : { state: 'error', error: r?.shopify?.error ?? 'Shopify check failed.' },
        workspace: r?.delegation?.ok ? { state: 'ok' } : { state: 'error', error: r?.delegation?.error ?? 'Workspace delegation check failed.' },
        send: r?.test_send?.ok ? { state: 'ok' } : { state: 'error', error: r?.test_send?.error ?? 'Test send failed.' },
      })
    } catch (e) {
      setChk({ shopify: { state: 'error' }, workspace: { state: 'error' }, send: { state: 'error' } })
      setErr((e as Error).message)
    } finally { setBusy('') }
  }
  const save = async () => {
    setBusy('save'); setErr('')
    try {
      await api.createShopManual({
        id: f.id.trim().toLowerCase(), name: f.name.trim(), gmail_address: f.gmail_address.trim().toLowerCase(),
        shopify_domain: f.shopify_domain.trim().toLowerCase(), shopify_admin_token: f.shopify_admin_token.trim(),
        ai_brand_voice_hint: f.ai_brand_voice_hint.trim() || undefined, signature_block: f.signature_block.trim() || undefined,
      })
      setOkMsg(`Store ${f.name.trim()} connected.`)
      onDone()
    } catch (e) { setErr((e as Error).message) } finally { setBusy('') }
  }
  const Row = ({ k, label, hint }: { k: keyof typeof chk; label: string; hint: string }) => {
    const c = chk[k]
    return (
      <div className="c-kv" style={{ alignItems: 'flex-start' }}>
        <span>{c.state === 'running' ? <Loader2 size={12} className="c-spin" /> : c.state === 'ok' ? <Check size={12} /> : c.state === 'error' ? <X size={12} /> : <span style={{ opacity: .4 }}>•</span>} {label}</span>
        <b className={c.state === 'error' ? 'red' : c.state === 'ok' ? 'green' : ''} style={{ textAlign: 'right', maxWidth: '60%' }}>
          {c.state === 'error' ? (c.error || 'failed') : c.state === 'ok' ? 'passed' : hint}
        </b>
      </div>
    )
  }
  return (
    <div className="c-card" style={{ marginTop: 10 }}>
      <div className="c-card-h">Connect a store manually</div>
      <p className="c-note">Uses a Shopify admin API token plus a mailbox reached by Workspace domain-wide delegation. Validation sends a real test email to that mailbox.</p>
      <div style={{ display: 'grid', gap: 8, marginTop: 8 }}>
        {([['id', 'Store id (slug)'], ['name', 'Display name'], ['gmail_address', 'Support mailbox'], ['shopify_domain', 'Shopify domain'], ['shopify_admin_token', 'Admin API token']] as const).map(([k, label]) => (
          <label key={k} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12.5 }}>
            {label}
            <input value={f[k]} onChange={set(k)} spellCheck={false}
              type={k === 'shopify_admin_token' ? 'password' : 'text'}
              placeholder={k === 'shopify_domain' ? 'yourstore.myshopify.com' : k === 'gmail_address' ? 'support@yourdomain.com' : ''}
              style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '7px 9px', font: 'inherit' }} />
          </label>
        ))}
      </div>
      <div style={{ marginTop: 10 }}>
        <Row k="shopify" label="Shopify auth" hint="admin token + scopes" />
        <Row k="workspace" label="Workspace delegation" hint="domain-wide delegation for the mailbox" />
        <Row k="send" label="Test send" hint="sends and trashes one message" />
      </div>
      {err && <p className="c-note" style={{ color: '#B4472F' }}>{err}</p>}
      {okMsg && <p className="c-note" style={{ color: '#3D7A50' }}>{okMsg}</p>}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="c-act" disabled={!required || busy !== ''} onClick={() => void validate()}>
          {busy === 'validate' ? <Loader2 size={13} className="c-spin" /> : <ShieldCheck size={13} />} Run checks
        </button>
        <button className="c-act prim" disabled={!required || !allOk || busy !== ''} title={!allOk ? 'All three checks must pass first' : undefined} onClick={() => void save()}>
          {busy === 'save' ? <Loader2 size={13} className="c-spin" /> : <Plus size={13} />} Connect store
        </button>
      </div>
    </div>
  )
}

function StoresSettings() {
  useStore()
  // Per-store mailbox state. Its own names on purpose: `connecting` /
  // `connectErr` / `connectBusy` below belong to the Shopify STORE connect flow
  // and sharing them made a mailbox failure look like a store failure.
  const [mailboxes, setMailboxes] = useState<Record<string, api.ShopMailbox>>({})
  const [mailboxBusy, setMailboxBusy] = useState<string | null>(null)
  const [mailboxErr, setMailboxErr] = useState<Record<string, string>>({})
  // Bumped after a successful disconnect so the statuses are re-read.
  const [mailboxNonce, setMailboxNonce] = useState(0)
  const mailboxStoreIds = api.SHOPS.filter((x) => x.id !== 'all').map((x) => x.id).join(',')
  const mailboxAdmin = api.isAdmin()
  const [removing, setRemoving] = useState<string | null>(null)
  const [removeErr, setRemoveErr] = useState('')
  // Per-store open counts come from GET /api/tickets/counts, not the ticket
  // cache: the all-stores list is capped at 300 merged rows, so a low-volume
  // store frequently has none of its tickets in it and read as "0 open".
  useEffect(() => { void api.refreshShopCounts(); void api.refreshArchivedShops() }, [])
  const archived = api.getArchivedShops()
  const doRemove = async (id: string, name: string) => {
    setRemoveErr('')
    // Archiving stops sync + drafting for the store; tickets are kept.
    if (!window.confirm(`Remove ${name}? Its inbox stops syncing and it disappears from the store list. Existing tickets are kept.`)) return
    setRemoving(id)
    const r = await api.deleteShop(id)
    setRemoving(null)
    if (!r.ok) setRemoveErr(r.error || 'Could not remove the store.')
    else await api.refreshLiveSettings()
  }
  const doRestore = async (id: string, name: string) => {
    setRemoveErr('')
    // Restoring resumes inbox sync AND drafting for the store, so replies can
    // start going to that store's customers again — confirmed, not one-click.
    if (!window.confirm(`Bring ${name} back? Its inbox starts syncing again and the AI resumes drafting replies for it.`)) return
    setRemoving(id)
    const r = await api.restoreShop(id)
    setRemoving(null)
    if (!r.ok) setRemoveErr(r.error || 'Could not bring the store back.')
    else await api.refreshLiveSettings()
  }
  // Which mailbox each store actually sends from. Read admin-only, matching the
  // connect/disconnect endpoints: nobody else can act on the answer.
  useEffect(() => {
    if (!mailboxAdmin) return
    const ids = mailboxStoreIds ? mailboxStoreIds.split(',') : []
    if (ids.length === 0) return
    let cancelled = false
    void (async () => {
      const next: Record<string, api.ShopMailbox> = {}
      const errs: Record<string, string> = {}
      await Promise.all(ids.map(async (id) => {
        try { next[id] = await api.getShopMailbox(id) }
        catch (e) {
          const m = (e as Error)?.message || ''
          // 'shop not found' is not a mailbox problem, it is this store having left
          // the account. The adapter is already refetching; printing the server's
          // raw 404 on the row just labelled a departed store as broken.
          if (/shop not found/i.test(m)) return
          errs[id] = m || 'Could not read which mailbox this store uses.'
        }
      }))
      if (cancelled) return
      setMailboxes(next)
      setMailboxErr(errs)
    })()
    return () => { cancelled = true }
  }, [mailboxStoreIds, mailboxNonce, mailboxAdmin])
  const doConnectShopInbox = async (id: string) => {
    setMailboxErr((p) => ({ ...p, [id]: '' }))
    setMailboxBusy(id)
    try {
      // Navigate the top window: this begins Google consent, and the state
      // cookie set on the fetch is what the callback verifies.
      window.location.href = await api.connectInboxForShop(id)
    } catch (e) {
      setMailboxErr((p) => ({ ...p, [id]: (e as Error)?.message || 'Could not start the connection.' }))
      setMailboxBusy(null)
    }
  }
  const doDisconnectShopInbox = async (id: string, name: string) => {
    // Unlinking stops this store's mail: confirmed, never one click.
    if (!window.confirm(`Disconnect the inbox for ${name}? Its mail stops arriving and no replies are sent for it until an inbox is connected again.`)) return
    setMailboxErr((p) => ({ ...p, [id]: '' }))
    setMailboxBusy(id)
    try {
      await api.disconnectShopMailbox(id)
      setMailboxNonce((n) => n + 1)
    } catch (e) {
      setMailboxErr((p) => ({ ...p, [id]: (e as Error)?.message || 'Could not disconnect the inbox.' }))
    }
    setMailboxBusy(null)
  }
  // Re-read ONE store's mailbox status. A status the console could not read is
  // not a dead end and is never guessed at: the row says so plainly and offers
  // this instead.
  const doRetryMailbox = async (id: string) => {
    setMailboxErr((p) => ({ ...p, [id]: '' }))
    setMailboxBusy(id)
    try {
      const next = await api.getShopMailbox(id)
      setMailboxes((p) => ({ ...p, [id]: next }))
    } catch (e) {
      setMailboxErr((p) => ({ ...p, [id]: (e as Error)?.message || 'Could not read which mailbox this store uses.' }))
      // Drop the stale entry rather than keep a value this read just failed to
      // confirm, so the row falls back to "inbox status unavailable".
      setMailboxes((p) => { const c = { ...p }; delete c[id]; return c })
    }
    setMailboxBusy(null)
  }
  const stores = api.SHOPS.filter((x) => x.id !== 'all')
  return (
      <div className="c-rows" style={{ gap: 10 }}>
        <div className="c-set-head"><h3>Connected stores</h3><p>Your Shopify stores. Orders, fulfillments and customers sync read-only — Resolver never writes to your store.</p></div>
        {api.isAdmin() && (
          <p className="c-note" style={{ margin: '0 0 2px' }}>
            Every store sends from its own support inbox. A store marked "using the account mailbox" is still on the older
            shared connection: connect its own inbox to give it a dedicated address. A store marked "inbox status unavailable"
            is one the console could not read a status for, not one that has stopped sending.
          </p>
        )}
        {stores.length === 0 && <p className="c-note" style={{ margin: 0 }}>No connected stores yet — connect your first Shopify store below.</p>}
        {stores.map((st) => {
          const raw = api.getShopRaw(st.id) as { gmail_address?: string; email_config?: { fromAddress?: string; sendingDomain?: string; verificationStatus?: string; provider?: string } } | null
          const ec = raw?.email_config
          const gmail = raw?.gmail_address
          const from = ec?.fromAddress || gmail || '—'
          const via = ec?.provider === 'postmark' ? `own domain (${ec.sendingDomain ?? 'Postmark'})` : gmail ? 'Gmail' : 'not connected'
          const mailOk = ec ? ec.verificationStatus === 'verified' : !!gmail
          const legacy = st.served === false
          const mb = mailboxes[st.id]
          const mbErr = mailboxErr[st.id] || ''
          // 'shop' is the end state. 'company' is a store still inheriting the
          // old account-wide mailbox and is shown as something to resolve, not
          // as a healthy connection. 'none' is the SERVER saying there is no
          // mailbox, and it is the only value that opens the fresh-connect
          // path. 'unknown' is the server answering in a shape the adapter
          // could not read, which is never the same claim as 'none'.
          // null = not read yet (or not an admin).
          const mbSource = mb ? mb.source : null
          // The provider decides whether a control may exist at all. Only an
          // oauth mailbox is ours to connect or unlink: a 'dwd' address IS the
          // credential that authenticates the store, 'postmark' is own-domain
          // sending set up on the store itself, and 'legacy' is a shop sending
          // through the shared environment token. Those three are settled
          // elsewhere, so they get a status and no buttons.
          const mbProvider = mb ? mb.provider : null
          const mbOauth = mbProvider === 'oauth'
          const mbLegacy = mbProvider === 'legacy'
          // The honest "we cannot tell" state, and the gate every control below
          // is ANDed with. Three ways to land in it: the read has not come back
          // (or failed outright, mbErr), the body carried no usable `source`, or
          // the server named a provider this build does not know. None of the
          // three is evidence that the store is unconnected, so none of them may
          // put a control on the row or call the store broken.
          const mbLoading = !mb && !mbErr
          const mbUnknownSource = !!mb && mbSource === 'unknown'
          const mbUnknownProvider = !!mb && mbProvider === null
          const mbReadable = !!mb && !mbUnknownSource && !mbUnknownProvider
          // The one state a merchant has to resolve: an oauth store still
          // riding the shared account mailbox. Nothing else is flagged.
          const mbInherited = mbOauth && mbSource === 'company'
          // Connect is offered on an oauth store, and on a store the SERVER
          // reported as having no mailbox at all, the fresh-connect path, which
          // a brand-new store does take: a dwd store WITH a live mailbox never
          // reports 'none' because on that path `source` is derived from
          // gmail_address itself, but one without an address genuinely does.
          // mbReadable is a separate AND term, never an alternative, so an
          // unrecognised provider fails closed here even when source reads
          // 'none'; and 'none' now only ever comes from the server.
          const mbCanConnect = mailboxAdmin && mbReadable && !mbLegacy && (mbOauth || mbSource === 'none')
          // Unlink only ever touches a mailbox this store owns through oauth.
          const mbCanDisconnect = mailboxAdmin && mbReadable && mbOauth && mbSource === 'shop'
          // Re-reading only helps a transient failure or a body we could not
          // parse. An unrecognised provider would come back the same, so no
          // retry is offered there.
          const mbCanRetry = mailboxAdmin && (!!mbErr || mbUnknownSource)
          const mbLabel = mbLoading ? 'checking the inbox'
            // 'legacy' is known from the provider alone, so it is answered
            // before the "could not read" branch: the row must never carry the
            // shared-mailbox tag and an "unavailable" label at the same time.
            : mbLegacy ? "not this store's own inbox"
            : !mbReadable ? 'inbox status unavailable'
            : mbSource === 'none' ? 'no inbox connected'
            : mbSource === 'company' ? 'using the account mailbox'
            : "this store's own inbox"
          const mbHint = mbLoading ? 'Reading which mailbox this store sends from.'
            : mbLegacy ? 'Sending through the shared account mailbox on the legacy connection rather than an inbox of its own. Managed outside the console.'
            : (!mb || mbUnknownSource) ? 'The inbox status could not be read, so none is shown. This does not mean the store is disconnected, and nothing about its sending has changed.'
            : mbUnknownProvider ? 'This store reported a mailbox type the console does not recognise, so no inbox controls are offered. Nothing about its sending has changed.'
            : mbSource === 'none' ? 'No inbox is connected for this store yet.'
            : mbProvider === 'dwd' ? "Delegated mailbox. The address is this store's own credential, so it is managed outside the console."
            : mbProvider === 'postmark' ? 'This store sends from its own domain through Postmark, configured on the store itself.'
            : mbInherited ? 'Still sending from the shared account mailbox. Connect this store\'s own inbox to give it a dedicated address.'
            : mbSource === 'shop' ? 'This store has its own connected inbox.'
            : undefined
          // Amber claims something needs attention, so it is only used where the
          // console actually knows that. An unreadable status is neutral, and so
          // is legacy: it is a working mailbox with nothing to do here.
          const mbTone = !mbReadable || mbLegacy ? undefined : mbSource === 'shop' ? 'ok' : 'warn'
          const mbBtn = mbSource === 'shop' ? 'Reconnect this inbox'
            : mbInherited ? "Give this store its own inbox"
            : "Connect this store's inbox"
          return (
            <div className={'c-storerow' + (legacy ? ' is-legacy' : '')} key={st.id}>
              <span className={'dot' + (legacy ? ' off' : '')} />
              <div className="tx">
                <div className="l1">
                  <b>{st.name}</b>
                  <span className="dom">{st.domain}</span>
                  {legacy && <span className="c-store-tag" title="Still handled by the old support app">old app</span>}
                  {mbInherited && (
                    <span
                      className="c-store-tag"
                      title={`${st.name} is still sending from the shared account mailbox. Connect its own inbox to give it a dedicated address.`}
                      style={{ background: '#FBEFEC', color: '#B4472F', borderColor: 'rgba(180,71,47,.28)' }}
                    >account mailbox</span>
                  )}
                  {mbLegacy && (
                    <span
                      className="c-store-tag"
                      title={`${st.name} sends through the shared account mailbox on the legacy connection, not an inbox of its own.`}
                    >shared mailbox</span>
                  )}
                </div>
                <div className="l2">
                  {/* A legacy store sends from the shared account mailbox and the
                      server returns address: null for it on purpose, because
                      shop.gmail_address is not the credential on that path. Falling
                      back to it here would print the store's own address as the
                      sender, which is the mislabelling this row is fixing. */}
                  {mbLegacy
                    ? <span title="This store sends through the shared account mailbox, so it has no per-store sending address.">shared account mailbox</span>
                    : <code>{mb?.address || from}</code>}
                  <span className="sep">·</span>
                  <span>{via}</span>
                  <span className="sep">·</span>
                  <span className={mailOk ? 'ok' : 'warn'}>{mailOk ? 'sending' : 'setup needed'}</span>
                  {mailboxAdmin && (
                    <>
                      <span className="sep">·</span>
                      <span className={mbTone} title={mbHint}>{mbLabel}</span>
                    </>
                  )}
                </div>
                {mbErr && (
                  <div style={{ marginTop: 3, fontSize: 11.5, lineHeight: 1.5, color: '#B4472F' }}>{mbErr}</div>
                )}
              </div>
              <span className="open">{api.getShopOpenCount(st.id) ?? api.getCounts(st.id).open} open</span>
              {mbCanRetry && (
                <button
                  className="c-act"
                  style={{ flex: '0 0 auto', padding: '6px 12px', fontSize: 11.5 }}
                  disabled={mailboxBusy === st.id}
                  title={`Read the inbox status for ${st.name} again`}
                  onClick={() => void doRetryMailbox(st.id)}
                >
                  {mailboxBusy === st.id ? <Loader2 size={13} className="c-spin" /> : <RotateCcw size={13} />} Retry
                </button>
              )}
              {mbCanConnect && (
                <button
                  className="c-act"
                  style={{ flex: '0 0 auto', padding: '6px 12px', fontSize: 11.5 }}
                  disabled={mailboxBusy === st.id}
                  title={mbInherited
                    ? `Move ${st.name} off the shared account mailbox and onto its own inbox`
                    : mbSource === 'shop' ? `Reconnect the inbox for ${st.name}` : `Connect an inbox for ${st.name}`}
                  onClick={() => void doConnectShopInbox(st.id)}
                >
                  {mailboxBusy === st.id ? <Loader2 size={13} className="c-spin" /> : <Mail size={13} />} {mbBtn}
                </button>
              )}
              {mbCanDisconnect && (
                <button
                  className="c-act"
                  style={{ flex: '0 0 auto', padding: '6px 12px', fontSize: 11.5 }}
                  disabled={mailboxBusy === st.id}
                  title={`Unlink the inbox connected to ${st.name}`}
                  onClick={() => void doDisconnectShopInbox(st.id, st.name)}
                >
                  <Unlink size={13} /> Disconnect
                </button>
              )}
              {api.isAdmin() && (
                <button className="rm" disabled={removing === st.id} title={`Remove ${st.name}`} onClick={() => void doRemove(st.id, st.name)}>
                  {removing === st.id ? <Loader2 size={13} className="c-spin" /> : <Trash2 size={13} />}
                </button>
              )}
            </div>
          )
        })}
        <p className="c-note" style={{ marginTop: 2 }}>Orders, fulfillments and customers sync read-only. Resolver never writes to your store.</p>
        {/* App Store requirement 2.3.1: an install may only begin from a Shopify-owned
            surface, and an app must never ask a merchant to type their shop domain. This
            used to be a free-text "your-store.myshopify.com" box with a Connect button
            that drove a real install, visible to every account admin, which is a
            straight rejection.

            No capability is lost. Adding a second store already has a sanctioned path
            and it is the one named here: install Resolver on that store from the App
            Store, then join it to this account with the account key, which the in-admin
            panel offers under "Connect an existing account". */}
        <p className="c-note" style={{ marginTop: 6 }}>
          To add another store, install Resolver on it from the Shopify App Store, then join it to this account with your account key.
        </p>
        {removeErr && <p className="c-note" style={{ margin: '4px 0 0', color: '#B4472F' }}>{removeErr}</p>}
        {/* Removing a store was a one-way door here: the list only ever asked for
            active stores, and POST /api/shops/:id/restore had no caller at all. */}
        {api.isAdmin() && archived.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="c-set-head"><h3>Removed stores</h3><p>These stores are archived: their inbox is not syncing and no replies are drafted for them. Their tickets are still here, and bringing one back restores it exactly as it was.</p></div>
            {archived.map((st) => (
              <div className="c-storerow is-archived" key={st.id}>
                <span className="dot off" />
                <div className="tx">
                  <div className="l1"><b>{st.name}</b><span className="dom">{st.domain}</span></div>
                  <div className="l2"><span>removed {timeAgo(st.archivedAt)} ago</span></div>
                </div>
                <button className="c-act" style={{ padding: '6px 12px', fontSize: 11.5 }} disabled={removing === st.id} onClick={() => void doRestore(st.id, st.name)}>
                  {removing === st.id ? <Loader2 size={13} className="c-spin" /> : <RotateCcw size={13} />} Bring back
                </button>
              </div>
            ))}
          </div>
        )}
        {api.isSuperAdmin() && <ManualStoreConnect onDone={() => void api.refreshLiveSettings()} />}
      </div>
  )
}

function LiveEmails() {
  useStore()
  const stores = api.SHOPS.filter((x) => x.id !== 'all')
  return (
    <div className="c-rows" style={{ gap: 10 }}>
      <p className="c-note" style={{ margin: 0 }}>How customer replies are sent for each connected store.</p>
      {stores.length === 0 && <p className="c-note" style={{ margin: 0 }}>No connected stores yet.</p>}
      {stores.map((st) => {
        const raw = api.getShopRaw(st.id) as { gmail_address?: string; email_config?: { fromAddress?: string; sendingDomain?: string; verificationStatus?: string; provider?: string } } | null
        const ec = raw?.email_config
        const gmail = raw?.gmail_address
        const from = ec?.fromAddress || gmail || '\u2014'
        const via = ec?.provider === 'postmark' ? `own domain (${ec.sendingDomain ?? 'Postmark'})` : gmail ? 'Gmail' : 'not connected'
        const verified = ec ? ec.verificationStatus === 'verified' : !!gmail
        return (
          <div className="c-storecard" key={st.id}>
            <div className="hd">
              <span className="dot" />
              <b>{st.name}</b>
              <span className="dom">{from}</span>
              <span className="sp" />
              <span className="open">{verified ? 'connected' : 'setup needed'}</span>
            </div>
            <div className="ft"><span>Replies send from {from} via {via}.</span></div>
          </div>
        )
      })}
    </div>
  )
}

function EmailsSettings() {
  const [method, setMethod] = useState<'gmail' | 'domain'>('gmail')
  const [verifying, setVerifying] = useState(false)
  return (
    <div className="c-rows" style={{ gap: 12 }}>
      <div className="c-card-h" style={{ marginBottom: 0 }}>How replies are sent</div>
      <div className="c-mailopts">
        <button className={'c-mailopt' + (method === 'gmail' ? ' on' : '')} onClick={() => setMethod('gmail')}>
          <span className="ic"><Mail size={15} /></span>
          <b>Through your Gmail</b>
          <span className="d">Replies send from support@aurora.com via the connected Gmail. Customers see your address, nothing changes for them.</span>
          <span className="st green">Connected · verified</span>
        </button>
        <button className={'c-mailopt' + (method === 'domain' ? ' on' : '')} onClick={() => setMethod('domain')}>
          <span className="ic"><Globe size={15} /></span>
          <b>From your domain, no Gmail needed</b>
          <span className="d">Resolver sends as support@aurora.com through its own sending infrastructure. Add three DNS records once, then retire the Gmail dependency.</span>
          <span className="st">Requires DNS setup</span>
        </button>
      </div>
      {method === 'domain' && (
        <div className="c-dnscard">
          <div className="c-card-h" style={{ marginBottom: 4 }}>DNS records for aurora.com</div>
          {[
            ['CNAME', 'resolver._domainkey', 'dkim.resolver.chat'],
            ['CNAME', 'rsvbounce', 'bounce.resolver.chat'],
            ['TXT', '@', 'v=spf1 include:spf.resolver.chat ~all'],
          ].map(([type, host, val]) => (
            <div className="rec" key={host}>
              <span className="ty">{type}</span>
              <code className="h">{host}</code>
              <code className="v">{val}</code>
            </div>
          ))}
          <div className="row" style={{ marginTop: 10 }}>
            <button className="c-act prim" disabled={verifying} onClick={() => { setVerifying(true); setTimeout(() => setVerifying(false), 1800) }}>
              {verifying ? <Loader2 size={14} className="c-spin" /> : <ShieldCheck size={14} />} {verifying ? 'Checking records…' : 'Verify records'}
            </button>
            <span className="c-note" style={{ margin: 0 }}>DNS can take up to an hour to propagate.</span>
          </div>
        </div>
      )}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12 }}>
        <div className="c-kv"><span>Send verification</span><b className="green">Verified</b></div>
        <div className="c-kv"><span>DKIM / SPF</span><b className="green">Verified</b></div>
        <div className="c-kv"><span>Loop protection</span><b>On, auto-replies filtered</b></div>
      </div>
    </div>
  )
}

const SOP2_TABS = ['Rules', 'Template', 'Variables', 'Voice', 'Knowledge', 'Abilities'] as const

/* VarText rows for live mode: current policy values (or defaults) so
   {tokens} inside live rules render as value chips. */
function liveVarRows(shopId: string): api.SopVar[] {
  const pol = ((api.getShopRaw(shopId)?.policy ?? {}) as Record<string, unknown>)
  const defs: [string, string, string][] = [
    ['partial_refund_pct', 'Keep-the-item partial refund', String(pol.partialRefundPct ?? '30') + '%'],
    ['partialRefundPct', 'Keep-the-item partial refund', String(pol.partialRefundPct ?? '30') + '%'],
    ['delivery_estimate', 'Delivery estimate', String(pol.deliveryEstimate ?? '5-10 business days')],
    ['deliveryEstimate', 'Delivery estimate', String(pol.deliveryEstimate ?? '5-10 business days')],
    ['tracking_issue_window', 'Tracking number delay', String(pol.trackingIssueWindow ?? '24-48h')],
    ['refund_timeline', 'Refund settlement time', String(pol.refundTimeline ?? '5-10 business days')],
    ['refundTimeline', 'Refund settlement time', String(pol.refundTimeline ?? '5-10 business days')],
    ['no_movement_days', 'Lost-shipment threshold', String(pol.noMovementDays ?? '15')],
    ['noMovementDays', 'Lost-shipment threshold', String(pol.noMovementDays ?? '15')],
  ]
  return defs.map(([key, label, value]) => ({ key, label, value, desc: 'Live policy value' }))
}
const RULE_CATS = ['Refunds & returns', 'Shipping', 'Order changes', 'Escalation', 'Other'] as const

/* Render {variable} tokens inside rule text as live value chips. */
function VarText({ text, vars }: { text: string; vars: api.SopVar[] }) {
  const parts = text.split(/(\{[a-z_]+\})/g)
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\{([a-z_]+)\}$/)
        if (!m) return <span key={i}>{p}</span>
        const v = vars.find((x) => x.key === m[1])
        return <b className="c-varchip" key={i} title={v ? v.label + ' · change it in Variables' : m[1]}>{v ? v.value : m[1]}</b>
      })}
    </>
  )
}

function EditableLine({ value, onSave, disabled, vars = [] }: { value: string; onSave: (v: string) => void; disabled?: boolean; vars?: api.SopVar[] }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value)
  if (disabled) return <span className="tx lock"><VarText text={value} vars={vars} /></span>
  if (!editing) return <span className="tx" title="Click to edit" onClick={() => { setV(value); setEditing(true) }}><VarText text={value} vars={vars} /></span>
  return (
    <textarea
      autoFocus rows={2} value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { onSave(v.trim() || value); setEditing(false) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave(v.trim() || value); setEditing(false) }
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}

/* The per-store playbook, Gorgias-depth: structured WHEN / IF / THEN rules,
   policy variables the rules reference, voice controls, knowledge sources,
   and what Resolver is allowed to do. */
function CopyBox({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <pre style={{ background: '#16181C', color: '#E9F1EB', borderRadius: 10, padding: '12px 14px', margin: '6px 0', fontSize: 11.5, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'ui-monospace, Menlo, monospace' }}>{text}</pre>
      <button className="c-act" style={{ position: 'absolute', top: 8, right: 8, padding: '3px 9px', fontSize: 11 }} onClick={() => { void navigator.clipboard?.writeText(text).catch(() => { /* ignore */ }); setDone(true); setTimeout(() => setDone(false), 1400) }}>{done ? <Check size={12} /> : <Copy size={12} />} {done ? 'Copied' : (label || 'Copy')}</button>
    </div>
  )
}

function ApiKeysSettings() {
  useStore()
  const [keys, setKeys] = useState<api.ApiKeyRow[] | null>(null)
  const [err, setErr] = useState('')
  const [name, setName] = useState('')
  const [full, setFull] = useState(false)
  // `expires_at` is accepted by the mint route and checked on every request the
  // key makes; the console never sent it, so every key here was permanent.
  const [expiry, setExpiry] = useState('')
  const [busy, setBusy] = useState('')
  const [secret, setSecret] = useState<{ id: string; key: string } | null>(null)
  const READ = ['tickets:read', 'disputes:read', 'customs:read', 'tasks:read', 'shops:read', 'stats:read']
  const FULL = [...READ, 'tickets:write', 'tasks:write']
  const load = () => { api.listApiKeys().then((k) => setKeys(k)).catch((e) => setErr((e as Error).message)) }
  useEffect(load, [])
  const create = async () => {
    if (!name.trim()) return
    setBusy('create'); setSecret(null); setErr('')
    try {
      // End of the chosen day, so "expires 12 Aug" means the key still works
      // all of the 12th. The server requires a future ISO 8601 timestamp.
      const iso = expiry ? new Date(`${expiry}T23:59:59`).toISOString() : undefined
      const r = await api.createApiKey(name.trim(), full ? FULL : READ, iso)
      setSecret(r); setName(''); setFull(false); setExpiry(''); load()
    }
    catch (e) { setErr((e as Error).message) }
    setBusy('')
  }
  const revoke = async (id: string) => {
    if (!window.confirm('Revoke this key? Any Claude or script using it stops working immediately.')) return
    setBusy(id); setErr('')
    try { await api.revokeApiKey(id); load() } catch (e) { setErr((e as Error).message) }
    setBusy('')
  }
  const CONNECT_PROMPT = 'Connect to my Resolver support desk. API base: https://app.resolver.chat/api/v1 — send the header \"Authorization: Bearer <your key>\" on every request. Read https://resolver.chat/llms.txt first (it lists everything you can do), then call GET /me and GET /tickets?status=OPEN. Never POST /tickets/{id}/reply without my approval — it emails a real customer.'
  const MCP_CONFIG = '{\n  \"mcpServers\": {\n    \"resolver\": {\n      \"command\": \"npx\",\n      \"args\": [\"-y\", \"resolver-mcp-server\"],\n      \"env\": { \"RESOLVER_API_KEY\": \"<your key>\" }\n    }\n  }\n}'
  const active = (keys ?? []).filter((k) => !k.revoked)
  return (
    <div className="c-rows" style={{ gap: 12 }}>
      <div className="c-set-head"><h3>API &amp; MCP</h3><p>Connect your own AI assistant (Claude, a script, an MCP client) to this support desk with a secure key. Read-only keys can read tickets; full-access keys can also draft and send replies. Revoke anytime.</p></div>

      {secret && (
        <div style={{ padding: '12px 14px', background: 'var(--band)', borderRadius: 10, border: '1px solid #3D7A50' }}>
          <p className="c-note" style={{ margin: '0 0 6px', color: 'var(--ink)', fontWeight: 600 }}>Your new key — copy it now. For your security it is stored only as a hash and can never be shown again; afterwards you will just see its last 4 characters to identify it.</p>
          <CopyBox text={secret.key} label="Copy key" />
        </div>
      )}

      {active.length > 0 && (
        <div className="c-rows" style={{ gap: 6 }}>
          {active.map((k) => (
            <div className="c-storecard" key={k.id}>
              <div className="hd">
                <b>{k.name || 'Key'}</b>
                <code style={{ background: 'var(--band)', borderRadius: 5, padding: '1px 7px', fontSize: 11.5 }}>{k.last4 ? `rsk_${k.mode === 'test' ? 'test' : 'live'}_••••${k.last4}` : (k.prefix ? `${k.prefix}…` : 'rsk_••••')}</code>
                <span className="dom">{(k.scopes || []).some((s) => s.endsWith(':write')) ? 'full access' : 'read-only'}{k.mode === 'test' ? ' · test' : ''}</span>
                <span className="sp" style={{ flex: 1 }} />
                <span className="c-note" style={{ margin: 0, fontSize: 11 }}>
                  {k.last_used_at ? 'last used ' + timeAgo(k.last_used_at) + ' ago' : 'never used'}
                  {k.expires_at ? ` · expires ${String(k.expires_at).slice(0, 10)}` : ''}
                </span>
                <button className="c-act" style={{ padding: '4px 9px', fontSize: 11 }} disabled={busy === k.id} onClick={() => void revoke(k.id)}>Revoke</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {keys && active.length === 0 && !secret && <p className="c-note" style={{ margin: 0 }}>No keys yet.</p>}

      <div className="c-rulebuilder" style={{ marginTop: 2 }}>
        <div className="c-keyform">
          <label className="f">
            <span>Name</span>
            <input placeholder="e.g. My Claude" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void create() }} />
          </label>
          <label className="f">
            <span>Expires <i>optional</i></span>
            <input type="date" value={expiry} min={isoDatePlus(1)} onChange={(e) => setExpiry(e.target.value)} aria-label="Key expiry date, optional" />
          </label>
          <button
            type="button" className="c-toggle desc c-keyaccess" role="switch" aria-checked={full}
            onClick={() => setFull(!full)}
          >
            <span className={'c-switch sm' + (full ? ' on green' : '')}><span className="k" /></span>
            <span className="tx"><b>Full access</b><small>Can draft and send replies. Leave off for read-only.</small></span>
          </button>
          <button className="c-act prim" disabled={!name.trim() || busy === 'create'} onClick={() => void create()}>{busy === 'create' ? <Loader2 size={13} className="c-spin" /> : <Plus size={13} />} Create key</button>
        </div>
      </div>
      {err && <p className="c-note" style={{ margin: 0, color: '#B4472F' }}>{err}</p>}

      <div style={{ padding: '14px 16px', background: 'var(--band)', borderRadius: 10, marginTop: 4 }}>
        <div className="c-card-h" style={{ fontSize: 13, margin: '0 0 8px' }}>Connect your Claude</div>
        <p className="c-note" style={{ margin: '0 0 6px' }}><b>Easiest — works with any Claude.</b> Create a key above, then paste this to Claude (swap in your key):</p>
        <CopyBox text={CONNECT_PROMPT} label="Copy" />
        <p className="c-note" style={{ margin: '10px 0 6px' }}><b>Claude Desktop (tools / MCP).</b> Add this to your <code style={{ background: 'none', padding: 0 }}>claude_desktop_config.json</code>:</p>
        <CopyBox text={MCP_CONFIG} label="Copy" />
        <p className="c-note" style={{ margin: '8px 0 0' }}>Full reference: <a className="link" href="https://resolver.chat/for-ai" target="_blank" rel="noreferrer">resolver.chat/for-ai</a> · machine-readable: <a className="link" href="https://resolver.chat/llms.txt" target="_blank" rel="noreferrer">resolver.chat/llms.txt</a></p>
      </div>
    </div>
  )
}

const MACRO_TOKENS: [string, string][] = [
  ['{first_name}', "customer's first name"],
  ['{order}', 'order number'],
  ['{tracking}', 'tracking number'],
  ['{tracking_status}', 'latest tracking status'],
]
function MacrosSettings() {
  useStore()
  const macros = api.getLiveMacros()
  const [nl, setNl] = useState('')
  const [nb, setNb] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const reset = () => { setNl(''); setNb(''); setEditId(null) }
  const insertToken = (tok: string) => {
    const el = bodyRef.current
    if (!el) { setNb((b) => b + tok); return }
    const start = el.selectionStart ?? nb.length, end = el.selectionEnd ?? nb.length
    setNb(nb.slice(0, start) + tok + nb.slice(end))
    requestAnimationFrame(() => { el.focus(); const p = start + tok.length; try { el.setSelectionRange(p, p) } catch { /* ignore */ } })
  }
  const startEdit = (m: { id: string; label: string; body: string }) => { setEditId(m.id); setNl(m.label); setNb(m.body); requestAnimationFrame(() => bodyRef.current?.focus()) }
  const save = async () => {
    if (!nl.trim() || !nb.trim()) return
    setBusy('save'); setErr('')
    // Edit updates in place. This used to DELETE then CREATE, so a failed create
    // after a successful delete destroyed the saved reply outright.
    try {
      if (editId) await api.updateLiveMacro(editId, nl.trim(), nb.trim())
      else await api.createLiveMacro(nl.trim(), nb.trim())
      reset()
    }
    catch (e) { setErr((e as Error).message) }
    setBusy('')
  }
  const del = async (id: string) => { if (!window.confirm('Delete this saved reply?')) return; setBusy(id); try { await api.deleteLiveMacro(id); if (editId === id) reset(); setErr('') } catch (e) { setErr((e as Error).message) } setBusy('') }
  const seed = async () => { setBusy('seed'); try { await api.seedLiveMacros(); setErr('') } catch (e) { setErr((e as Error).message) } setBusy('') }
  const inputStyle = { fontFamily: 'inherit', fontSize: 13, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 11px', color: 'var(--ink)' } as React.CSSProperties
  return (
    <div>
      <div className="c-set-head"><h3>Saved replies</h3><p>Reusable replies your team can drop into any draft. Variables fill in automatically from each ticket.</p></div>
      <div className="c-rows" style={{ gap: 10 }}>
        {macros.length === 0 && (
          <div style={{ padding: '14px 16px', background: 'var(--band)', borderRadius: 10 }}>
            <p className="c-note" style={{ margin: '0 0 10px' }}>No saved replies yet — generate a starter set built from your support playbook, then edit any of them.</p>
            <button className="c-act prim" disabled={busy === 'seed'} onClick={() => void seed()}>{busy === 'seed' ? <Loader2 size={13} className="c-spin" /> : <Zap size={13} />} Generate a starter set from your SOP</button>
          </div>
        )}
        {macros.map((m) => (
          <div className="c-storecard" key={m.id}>
            <div className="hd"><b>{m.label}</b><span className="sp" style={{ flex: 1 }} />
              <button className="c-act" style={{ padding: '4px 9px', fontSize: 11 }} onClick={() => startEdit(m)}>Edit</button>
              <button className="c-act" style={{ padding: '4px 9px', fontSize: 11 }} disabled={busy === m.id} onClick={() => void del(m.id)}>Delete</button>
            </div>
            <div className="ft"><span style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{m.body}</span></div>
          </div>
        ))}
        <div className="c-rulebuilder" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 9, marginTop: 4 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)' }}>{editId ? 'Edit saved reply' : 'New saved reply'}</div>
          <input placeholder="Name (e.g. Tracking follow-up)" value={nl} onChange={(e) => setNl(e.target.value)} style={inputStyle} />
          <textarea ref={bodyRef} placeholder="Reply text…" value={nb} onChange={(e) => setNb(e.target.value)} rows={5} style={{ ...inputStyle, resize: 'vertical' }} />
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--tx-faint)', marginBottom: 5 }}>Click to insert a variable</div>
            <div className="c-tokens">
              {MACRO_TOKENS.map(([t, d]) => <button type="button" className="c-token" key={t} onClick={() => insertToken(t)} title={'Inserts the ' + d}>{t}<small>{d}</small></button>)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {macros.length > 0 && !editId && <button className="c-act" disabled={busy === 'seed'} onClick={() => void seed()}>{busy === 'seed' ? <Loader2 size={13} className="c-spin" /> : <Zap size={13} />} Add starter set</button>}
            <span className="sp" style={{ flex: 1 }} />
            {editId && <button className="c-act" onClick={reset}>Cancel</button>}
            <button className="c-act prim" disabled={!nl.trim() || !nb.trim() || busy === 'save'} onClick={() => void save()}>{busy === 'save' ? <Loader2 size={13} className="c-spin" /> : (editId ? <Check size={13} /> : <Plus size={13} />)} {editId ? 'Save changes' : 'Add saved reply'}</button>
          </div>
        </div>
        {err && <p className="c-note" style={{ margin: 0, color: '#B4472F' }}>{err}</p>}
      </div>
    </div>
  )
}

function SopSettings() {
  useStore()
  const [shopId, setShopId] = useState('')
  const [tab, setTab] = useState<typeof SOP2_TABS[number]>('Rules')
  useEffect(() => {
    if (!shopId && api.SHOPS.length > 1) setShopId(api.SHOPS[1].id)
  })
  const rules = api.SOP_RULES_V2[shopId] ?? []
  return (
    <div className="c-rows" style={{ gap: 14 }}>
      <div className="c-sopshops">
        {api.SHOPS.filter((x) => x.id !== 'all').map((x) => (
          <button key={x.id} className={shopId === x.id ? 'on' : ''} onClick={() => setShopId(x.id)}>{x.name}</button>
        ))}
      </div>
      <div className="c-sop2tabs">
        {SOP2_TABS.map((t2) => (
          <button key={t2} className={tab === t2 ? 'on' : ''} onClick={() => setTab(t2)}>
            {t2}
            {t2 === 'Rules' && <span className="n">{rules.length}</span>}
          </button>
        ))}
      </div>
      {tab === 'Rules' && (
        <>
          <SopRules shopId={shopId} rules={rules} vars={liveVarRows(shopId)} />
          <div className="c-card-h" style={{ marginTop: 10 }}>Raw SOP text</div>
          <LiveSopText shopId={shopId} />
        </>
      )}
      {tab === 'Template' && <DropshipTemplate shopId={shopId} />}
      {tab === 'Variables' && <LiveSopVars shopId={shopId} />}
      {tab === 'Voice' && <LiveSopVoice shopId={shopId} />}
      {tab === 'Knowledge' && <LiveSopKnowledge shopId={shopId} />}
      {tab === 'Abilities' && <LiveSopAbilities shopId={shopId} />}
    </div>
  )
}

/* The dropshipping playbook template, in Settings as well as in onboarding.
 *
 * A merchant meets the wizard once. Everything it sets has to be reachable afterwards or
 * it is a one-time decision they can never revisit, and every store that onboarded before
 * the template existed, including all of ours, has no route to it at all.
 *
 * Rewriting the playbook replaces it, so this says so before it does anything. */
function DropshipTemplate({ shopId }: { shopId: string }) {
  useStore()
  const [qs, setQs] = useState<Array<Record<string, unknown>>>([])
  const [vals, setVals] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const policy = ((api.getShopRaw(shopId)?.policy ?? {}) as Record<string, unknown>)

  useEffect(() => {
    let alive = true
    api.sopTemplateQuestions()
      .then((r) => { if (alive) setQs(r.questions) })
      .catch((e) => { if (alive) setErr((e as Error).message) })
    return () => { alive = false }
  }, [])

  // Prefill from what this shop already has, so this reads as editing rather than
  // starting again. A merchant who only wants to change the return window should not
  // have to retype the other eight answers.
  useEffect(() => {
    if (!qs.length) return
    const seed: Record<string, string> = {}
    for (const q of qs) {
      const k = String(q.key)
      const v = policy[k]
      if (v !== undefined && v !== null && v !== '') seed[k] = String(v)
    }
    setVals((prev) => ({ ...seed, ...prev }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qs.length, shopId])

  const save = async () => {
    setBusy(true); setErr(''); setMsg('')
    try {
      const answers: Record<string, unknown> = {}
      for (const q of qs) {
        const k = String(q.key); const raw = vals[k]
        if (raw === undefined || raw === '') continue
        answers[k] = q.kind === 'number' ? Number(raw) : q.kind === 'bool' ? raw === 'true' : raw
      }
      await api.sopTemplateSave(answers, shopId)
      setMsg('Playbook rewritten from these answers.')
      await api.refreshShops()
    } catch (e) { setErr((e as Error).message || 'Could not save.') }
    finally { setBusy(false) }
  }

  if (!shopId) return <p className="c-note">Pick a store above.</p>
  return (
    <div className="c-card">
      <p className="c-note" style={{ marginTop: 0 }}>
        Rewrites this store&apos;s playbook from your answers, and sets the same values the
        pre-send checks use. It replaces the current playbook.
      </p>
      {qs.map((q) => {
        const k = String(q.key); const kind = String(q.kind); const val = vals[k] ?? ''
        return (
          <div key={k} className="c-field">
            <label>{String(q.label)}</label>
            {kind === 'choice' ? (
              <div className="c-seg">
                {(q.options as Array<{ value: string; label: string }>).map((o) => (
                  <button key={o.value} className={val === o.value ? 'on' : ''} onClick={() => setVals((p) => ({ ...p, [k]: o.value }))}>{o.label}</button>
                ))}
              </div>
            ) : kind === 'bool' ? (
              <div className="c-seg">
                {[['true', 'Yes'], ['false', 'No']].map(([v, l]) => (
                  <button key={v} className={(val || 'true') === v ? 'on' : ''} onClick={() => setVals((p) => ({ ...p, [k]: v }))}>{l}</button>
                ))}
              </div>
            ) : (
              <input value={val} placeholder={String(q.placeholder ?? '')} onChange={(e) => setVals((p) => ({ ...p, [k]: e.target.value }))} />
            )}
            {!!q.help && <p className="c-note" style={{ margin: '3px 0 0' }}>{String(q.help)}</p>}
          </div>
        )
      })}
      {err && <p className="c-note" style={{ color: '#B4472F' }}>{err}</p>}
      {msg && <p className="c-note" style={{ color: '#3D7A50' }}>{msg}</p>}
      <button className="c-btn pri" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Rewrite the playbook'}</button>
    </div>
  )
}

function SopRules({ shopId, rules, vars }: { shopId: string; rules: api.SopRuleV2[]; vars: api.SopVar[] }) {
  const [adding, setAdding] = useState(false)
  const [nw, setNw] = useState({ category: 'Refunds & returns' as typeof RULE_CATS[number], when: '', cond: '', then: '' })
  const [busy, setBusy] = useState<'' | 'save'>('')
  const byCat = RULE_CATS.map((cat) => ({ cat, items: rules.filter((r) => r.category === cat) })).filter((g) => g.items.length > 0)
  const save = async () => {
    if (!nw.when.trim() || !nw.then.trim()) return
    setBusy('save')
    await api.addRuleV2(shopId, { category: nw.category, when: nw.when.trim(), conds: nw.cond.trim() ? [nw.cond.trim()] : [], then: nw.then.trim() })
    setNw({ category: nw.category, when: '', cond: '', then: '' }); setAdding(false); setBusy('')
  }
  return (
    <>
      {byCat.map((g) => (
        <div className="c-sopgroup" key={g.cat}>
          <div className="gh">{g.cat}</div>
          {g.items.map((r) => (
            <div className={'c-rule2' + (r.enabled ? '' : ' off') + (r.locked ? ' locked' : '')} key={r.id}>
              <div className="side">
                <button
                  className={'c-switch sm' + (r.enabled ? ' on green' : '')}
                  disabled={r.locked}
                  title={r.locked ? 'Safety rule, always on' : 'Toggle rule'}
                  onClick={() => api.toggleRuleV2(shopId, r.id)}
                ><span className="k" /></button>
              </div>
              <div className="body">
                <div className="line"><span className="kw when">When</span><EditableLine value={r.when} disabled={r.locked} vars={vars} onSave={(v) => api.updateRulePartV2(shopId, r.id, 'when', v)} /></div>
                {r.conds.map((c, i) => (
                  <div className="line" key={i}><span className="kw iff">If</span><EditableLine value={c} disabled={r.locked} vars={vars} onSave={(v) => api.updateRuleCondV2(shopId, r.id, i, v)} /></div>
                ))}
                <div className="line"><span className="kw then">Then</span><span className="tx thenline" style={{ cursor: r.locked ? 'default' : 'text' }}>
                  <ThenEditable r={r} shopId={shopId} vars={vars} />
                </span></div>
              </div>
              <div className="meta">
                {r.locked ? <span className="lockchip"><ShieldCheck size={11} /> Always on</span> : (
                  <button className="del" title="Delete rule" onClick={() => api.deleteRuleV2(shopId, r.id)}><Trash2 size={12} /></button>
                )}
              </div>
            </div>
          ))}
        </div>
      ))}
      {!adding ? (
        <button className="c-act" style={{ alignSelf: 'flex-start' }} onClick={() => setAdding(true)}><Plus size={14} /> Add rule</button>
      ) : (
        <div className="c-sopadd">
          <div className="row" style={{ marginBottom: 10 }}>
            <select value={nw.category} onChange={(e) => setNw({ ...nw, category: e.target.value as typeof RULE_CATS[number] })}>
              {RULE_CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="c-addline"><span className="kw when">When</span><input placeholder="a customer asks to change the delivery address" value={nw.when} onChange={(e) => setNw({ ...nw, when: e.target.value })} autoFocus /></div>
          <div className="c-addline"><span className="kw iff">If</span><input placeholder="optional condition, e.g. the order has not shipped yet" value={nw.cond} onChange={(e) => setNw({ ...nw, cond: e.target.value })} /></div>
          <div className="c-addline"><span className="kw then">Then</span><input placeholder="what Resolver should do or say" value={nw.then} onChange={(e) => setNw({ ...nw, then: e.target.value })} /></div>
          <div className="row" style={{ marginTop: 10 }}>
            <span className="sp" />
            <button className="c-act" onClick={() => setAdding(false)}>Cancel</button>
            <button className="c-act prim" disabled={!nw.when.trim() || !nw.then.trim() || busy !== ''} onClick={() => void save()}>
              {busy === 'save' ? <Loader2 size={13} className="c-spin" /> : <Check size={13} />} Save rule
            </button>
          </div>
        </div>
      )}
      <p className="c-note" style={{ margin: 0 }}>Every enabled rule constrains every draft for this store. Values in green come from Variables.</p>
    </>
  )
}

function ThenEditable({ r, shopId, vars }: { r: api.SopRuleV2; shopId: string; vars: api.SopVar[] }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(r.then)
  if (r.locked) return <VarText text={r.then} vars={vars} />
  if (!editing) return <span title="Click to edit" onClick={() => { setV(r.then); setEditing(true) }}><VarText text={r.then} vars={vars} /></span>
  return (
    <textarea
      autoFocus rows={2} value={v} className="theneditor"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => { api.updateRulePartV2(shopId, r.id, 'then', v.trim() || r.then); setEditing(false) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); api.updateRulePartV2(shopId, r.id, 'then', v.trim() || r.then); setEditing(false) }
        if (e.key === 'Escape') setEditing(false)
      }}
    />
  )
}

function LiveSopVoice({ shopId }: { shopId: string }) {
  useStore()
  const raw = api.getShopRaw(shopId)
  const [voice, setVoice] = useState('')
  const [signoff, setSignoff] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => {
    setVoice(String((raw as { ai_brand_voice_hint?: string } | null)?.ai_brand_voice_hint ?? ''))
    setSignoff(String((raw as { signature_block?: string } | null)?.signature_block ?? ''))
    setDirty(false); setErr('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, raw ? 1 : 0])
  const save = async () => {
    setBusy(true)
    try { await api.saveShopVoice(shopId, { ai_brand_voice_hint: voice, signature_block: signoff }); setDirty(false); setErr('') }
    catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }
  if (!raw) return <p className="c-note" style={{ margin: 0 }}>Loading live shop…</p>
  return (
    <div className="c-rows" style={{ gap: 14 }}>
      <p className="c-note" style={{ margin: 0 }}><b>Live:</b> the tone and sign-off every draft for this store follows.</p>
      <label className="c-voicefield">Tone &amp; voice
        <textarea rows={3} value={voice} onChange={(e) => { setVoice(e.target.value); setDirty(true) }} placeholder="e.g. warm and concise; apologize once, then fix the problem" />
      </label>
      <label className="c-voicefield">Sign-off
        <input value={signoff} onChange={(e) => { setSignoff(e.target.value); setDirty(true) }} placeholder="e.g. Best, the Brinoa team" />
      </label>
      <div className="row" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="c-act prim" disabled={!dirty || busy} onClick={() => void save()}>
          {busy ? <Loader2 size={13} className="c-spin" /> : <Check size={13} />} {busy ? 'Saving…' : dirty ? 'Save voice' : 'Saved'}
        </button>
        {err && <span className="c-note" style={{ margin: 0, color: '#B4472F' }}>{err}</span>}
      </div>
    </div>
  )
}

const ABILITY_DEFS: { key: string; label: string; risk: 'low' | 'medium' | 'high' }[] = [
  { key: 'share_tracking', label: 'Share tracking and delivery updates', risk: 'low' },
  { key: 'edit_address', label: 'Update the shipping address before fulfillment', risk: 'medium' },
  { key: 'partial_refund', label: 'Offer a partial refund and let the customer keep the item', risk: 'medium' },
  { key: 'discount_code', label: 'Offer a discount code', risk: 'medium' },
  { key: 'reship', label: 'Arrange a free reshipment', risk: 'medium' },
  { key: 'cancel_order', label: 'Cancel an unfulfilled order', risk: 'high' },
  { key: 'full_refund', label: 'Issue a full refund', risk: 'high' },
]
function LiveSopAbilities({ shopId }: { shopId: string }) {
  useStore()
  const raw = api.getShopRaw(shopId) as { abilities?: Record<string, boolean> } | null
  const ab = raw?.abilities ?? {}
  const isOn = (k: string) => ab[k] !== false
  const toggle = (k: string) => { void api.saveShopAbilities(shopId, { ...ab, [k]: !isOn(k) }) }
  if (!raw) return <p className="c-note" style={{ margin: 0 }}>Loading live shop…</p>
  return (
    <div className="c-rows" style={{ gap: 8 }}>
      <p className="c-note" style={{ margin: 0 }}><b>Live:</b> what Resolver may do on this store. A disabled ability makes those replies escalate to a human. Money never moves without a human.</p>
      {ABILITY_DEFS.map((a) => (
        <div className={'c-srcrow' + (isOn(a.key) ? '' : ' off')} key={a.key}>
          <span className={'riskchip ' + a.risk}>{a.risk}</span>
          <div className="l"><b>{a.label}</b></div>
          <button className={'c-switch sm' + (isOn(a.key) ? ' on green' : '')} onClick={() => toggle(a.key)} aria-label="toggle ability"><span className="k" /></button>
        </div>
      ))}
    </div>
  )
}
function LiveSopKnowledge({ shopId }: { shopId: string }) {
  useStore()
  const raw = api.getShopRaw(shopId) as { knowledge_sources?: { id: string; title: string; text: string; enabled: boolean }[] } | null
  const list = raw?.knowledge_sources ?? []
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const persist = async (next: typeof list) => { setBusy(true); try { await api.saveShopKnowledge(shopId, next) } finally { setBusy(false) } }
  const add = () => { if (!text.trim()) return; const id = 'k' + Math.random().toString(36).slice(2, 9); void persist([...list, { id, title: title.trim(), text: text.trim(), enabled: true }]); setTitle(''); setText('') }
  if (!raw) return <p className="c-note" style={{ margin: 0 }}>Loading live shop…</p>
  return (
    <div className="c-rows" style={{ gap: 8 }}>
      <p className="c-note" style={{ margin: 0 }}><b>Live:</b> facts the drafts must follow — sizing, materials, shipping zones, policies. Disable one and it stops influencing replies.</p>
      {list.map((k) => (
        <div className={'c-srcrow' + (k.enabled ? '' : ' off')} key={k.id}>
          <span className="ic"><FileText size={14} /></span>
          <div className="l"><b>{k.title || 'Note'}</b><span className="d">{k.text.slice(0, 80)}{k.text.length > 80 ? '…' : ''}</span></div>
          <button className="link" onClick={() => void persist(list.filter((x) => x.id !== k.id))}>Remove</button>
          <button className={'c-switch sm' + (k.enabled ? ' on green' : '')} onClick={() => void persist(list.map((x) => x.id === k.id ? { ...x, enabled: !x.enabled } : x))} aria-label="toggle source"><span className="k" /></button>
        </div>
      ))}
      {list.length === 0 && <p className="c-note" style={{ margin: 0 }}>No knowledge yet. Add the facts your drafts should always get right.</p>}
      <div className="c-rows" style={{ gap: 6, marginTop: 6 }}>
        <input className="c-input" placeholder="Title (optional), e.g. Shipping zones" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="c-livesop" rows={3} placeholder="The fact drafts should follow…" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="c-act" style={{ alignSelf: 'flex-start' }} disabled={!text.trim() || busy} onClick={add}><Plus size={14} /> Add knowledge</button>
      </div>
    </div>
  )
}
/* Live mode: the Variables tab edits the REAL per-shop policy knobs
   (shop.policy on resolver.chat) and the Rules tab edits the raw SOP text —
   the structured-rules model ships to production later. */
const LIVE_POLICY_FIELDS = [
  // Set this and the AI can send return details itself once a customer's photos arrive.
  // Leave it empty and the pre-send guard falls back to recognising an address by shape,
  // which is safe but blunter.
  { key: 'returnAddress', label: 'Return address', desc: 'Where customers send returns. The AI sends this only after the customer has provided photos.', ph: 'Unit 4, 58 Example Road, City, 12345, Country', numeric: false },
  { key: 'partialRefundPct', label: 'Keep-the-item partial refund (%)', desc: 'Option B percentage when a return is not worth the shipping.', ph: '30', numeric: true },
  { key: 'deliveryEstimate', label: 'Delivery estimate', desc: 'The honest customer-facing estimate for standard shipping.', ph: '5-10 business days', numeric: false },
  { key: 'trackingIssueWindow', label: 'Tracking number delay', desc: 'How long carriers typically take to issue a tracking number.', ph: '24-48h', numeric: false },
  { key: 'refundTimeline', label: 'Refund settlement time', desc: 'What customers are told about when refunds land back.', ph: '5-10 business days', numeric: false },
  { key: 'noMovementDays', label: 'Lost-shipment threshold (days)', desc: 'Days of tracking silence before a shipment counts as stuck.', ph: '15', numeric: true },
] as const

function LiveSopVars({ shopId }: { shopId: string }) {
  useStore()
  const raw = api.getShopRaw(shopId)
  const policy = ((raw?.policy ?? {}) as Record<string, unknown>)
  const [vals, setVals] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')
  useEffect(() => {
    setVals(Object.fromEntries(LIVE_POLICY_FIELDS.map((f) => [f.key, policy[f.key] != null ? String(policy[f.key]) : ''])))
    setErr('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, raw ? 1 : 0])
  const save = async () => {
    const next: Record<string, string | number> = {}
    for (const f of LIVE_POLICY_FIELDS) {
      const v = (vals[f.key] ?? '').trim()
      if (!v) continue
      next[f.key] = f.numeric ? Number(v) : v
    }
    try { await api.saveShopPolicy(shopId, Object.keys(next).length ? next : null); setErr('') }
    catch (e) { setErr((e as Error).message) }
  }
  if (!raw) return <p className="c-note" style={{ margin: 0 }}>Loading live shop…</p>
  return (
    <div className="c-rows" style={{ gap: 8 }}>
      <p className="c-note" style={{ margin: 0 }}><b>Live:</b> these are the real policy knobs on resolver.chat for this store. Blank keeps the default shown in grey; saving applies to the next draft.</p>
      {LIVE_POLICY_FIELDS.map((f) => (
        <div className="c-varrow" key={f.key}>
          <div className="l"><b>{f.label}</b><span className="d">{f.desc}</span></div>
          <input
            value={vals[f.key] ?? ''} placeholder={f.ph}
            onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
            onBlur={() => void save()}
            onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          />
        </div>
      ))}
      {err && <p className="c-note" style={{ margin: 0, color: '#B4472F' }}>{err}</p>}
    </div>
  )
}

function LiveSopText({ shopId }: { shopId: string }) {
  useStore()
  const raw = api.getShopRaw(shopId)
  const settings = api.getLiveSettings()
  const [usingGlobal, setUsingGlobal] = useState(false)
  const [text, setText] = useState('')
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  useEffect(() => { void api.refreshLiveSettings() }, [])
  useEffect(() => {
    const shopSop = String(raw?.ai_support_sop ?? '')
    const global = String((settings as { sop_text?: string } | undefined)?.sop_text ?? '')
    setText(shopSop || global)
    setUsingGlobal(!shopSop && !!global)
    setDirty(false)
    setErr('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId, raw ? 1 : 0, settings ? 1 : 0])
  const save = async () => {
    setBusy(true)
    try { await api.saveShopSop(shopId, text); setDirty(false); setErr('') }
    catch (e) { setErr((e as Error).message) }
    setBusy(false)
  }
  if (!raw) return <p className="c-note" style={{ margin: 0 }}>Loading live shop…</p>
  return (
    <div className="c-rows" style={{ gap: 10 }}>
      <p className="c-note" style={{ margin: 0 }}>{usingGlobal ? <><b>Global SOP:</b> no store-specific override yet — this is the shared SOP every store follows. Edit and save to set one just for this store.</> : <><b>Live:</b> the real SOP text every draft for this store follows.</>}</p>
      <textarea
        className="c-livesop" rows={16} value={text}
        onChange={(e) => { setText(e.target.value); setDirty(true) }}
        placeholder="No SOP yet. Write the rules drafts must follow, one per line."
      />
      <div className="row" style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button className="c-act prim" disabled={!dirty || busy} onClick={() => void save()}>
          {busy ? <Loader2 size={13} className="c-spin" /> : <Check size={13} />} {busy ? 'Saving…' : dirty ? 'Save SOP' : 'Saved'}
        </button>
        {err && <span className="c-note" style={{ margin: 0, color: '#B4472F' }}>{err}</span>}
      </div>
    </div>
  )
}

/* Live lanes: the real per-shop auto-send modes + the real graduation metric.
   Production's model is per SHOP (off / draft-only / live) with category
   readiness underneath; the per-category switches ship server-side later. */
function LiveLanes() {
  useStore()
  const [readiness, setReadiness] = useState<Record<string, { needed: number; lanes: { category: string; reviewed: number; clean: number; clean_rate: number; ready: boolean }[]; readiness_waived?: boolean; proven_live_sends?: number; waiver_threshold?: number }>>({})
  const [err, setErr] = useState('')
  const shops = api.SHOPS.filter((x) => x.id !== 'all')
  const settings = api.getLiveSettings()
  const perShop = settings.auto_send_per_shop ?? {}
  // rendered at the top of the lanes list below
  useEffect(() => { void api.refreshLiveSettings() }, [])
  useEffect(() => {
    let alive = true
    for (const sh of shops) {
      if (readiness[sh.id]) continue
      api.liveLaneReadiness(sh.id)
        .then((r) => { if (alive) setReadiness((prev) => ({ ...prev, [sh.id]: r })) })
        .catch((e) => { if (alive) setErr((e as Error).message) })
    }
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shops.map((x) => x.id).join(',')])
  const setMode = async (shopId: string, mode: 'off' | 'shadow' | 'live') => {
    try { await api.setAutoSendMode(shopId, mode); setErr('') }
    catch (e) { setErr((e as Error).message) }
  }
  if (shops.length === 0) return <p className="c-note" style={{ margin: 0 }}>Loading live shops…</p>
  return (
    <>
      <p className="c-note" style={{ margin: '0 0 6px' }}><b>Live:</b> these switches control the real resolver.chat pipeline. Draft only means every draft waits for a human; Auto-send uses the production cancel window and risk holds.</p>
      <GlobalAutoSendSwitch />
      {shops.map((sh) => {
        const mode = perShop[sh.id] ?? 'off'
        const rd = readiness[sh.id]
        return (
          <div className="c-lane-set grad" key={sh.id} style={{ alignItems: 'flex-start' }}>
            <div className="nmwrap">
              <span className="nm">{sh.name}</span>
              {rd && rd.lanes.length > 0 && (
                <span className="gradline" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 5 }}>
                  {rd.lanes.slice(0, 4).map((l) => (
                    <span key={l.category} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 92, fontSize: 10.5, color: 'var(--tx-faint)' }}>{l.category}</span>
                      <span className="gbar"><i style={{ width: Math.min(100, (l.reviewed / rd.needed) * 100) + '%', background: l.clean_rate >= 0.85 ? '#3D7A50' : 'var(--tx-faint)' }} /></span>
                      <span className="gtxt">{l.reviewed} reviewed · {Math.round(l.clean_rate * 100)}% clean{l.ready ? ' · ready' : ''}</span>
                    </span>
                  ))}
                </span>
              )}
              {rd && rd.lanes.length === 0 && !rd.readiness_waived && <span className="gtxt" style={{ marginTop: 4 }}>No reviewed drafts yet. The metric fills as your team approves or edits drafts.</span>}
              {/* The bars above are the EARNED route. They are not the only route, and when
                  a store is grandfathered they are not the route in force: the policy
                  returns ALLOW_PROVEN_HISTORY and never looks at a lane. Without this line
                  this screen reads "REFUND: 3 of 25 reviewed, not ready" while REFUND is
                  auto-sending all day, which is worse than showing nothing, because this is
                  the screen an operator checks before trusting a lane. */}
              {rd?.readiness_waived && (
                <span className="c-waiver">
                  Every category on this store can auto-send, whatever the bars above say.
                  It was grandfathered on {(rd.proven_live_sends ?? 0).toLocaleString()} past sends,
                  over the {(rd.waiver_threshold ?? 250).toLocaleString()} needed, so lanes are not checked individually.
                </span>
              )}
            </div>
            <div className="modes">
              {(['off', 'shadow', 'live'] as const).map((m) => (
                <button key={m} className={mode === m ? 'on' : ''} onClick={() => void setMode(sh.id, m)}>{{ off: 'Off', shadow: 'Draft only', live: 'Auto-send' }[m]}</button>
              ))}
            </div>
          </div>
        )
      })}
      {err && <p className="c-note" style={{ margin: 0, color: '#B4472F' }}>{err}</p>}
      <p className="c-note" style={{ margin: 0 }}>A lane earns auto-send after 25+ reviewed drafts with 85%+ sent unedited. Chargeback and legal language always routes to a human regardless of mode.</p>
    </>
  )
}

/* Live compose: the staged flow against the real endpoints — find the order
   on the actual store, AI-draft with the production composer (native language
   + subject), review, send from the shop mailbox. Creates a real ticket. */
/* What kind of outbound message this is. Copy and intent only — the draft
   itself is generated server-side from the real order. */
const COMPOSE_TEMPLATES = [
  { id: 'address', label: 'Address issue', desc: 'Ask for a correct or complete shipping address', icon: MapPin, intent: 'we could not validate the shipping address on this order and need a corrected, complete address to deliver it' },
  { id: 'delay', label: 'Shipping delay', desc: 'Apologize for the delay and share an ETA', icon: Clock, intent: 'we are sorry about the delay on this order, it is moving again and we will share the updated delivery estimate' },
  { id: 'replacement', label: 'Replacement', desc: 'Confirm details to ship a replacement', icon: RotateCcw, intent: 'we are preparing a replacement shipment and want to confirm the item and address before it goes out' },
  { id: 'custom', label: 'Custom message', desc: 'Write your own intent, Resolver drafts it', icon: Pencil, intent: '' },
] as const
type ComposeTemplateId = typeof COMPOSE_TEMPLATES[number]['id']

function LiveCompose({ shopId: selectedShopId }: { shopId?: string }) {
  useStore()
  const shops = api.SHOPS.filter((x) => x.id !== 'all')
  const [shopId, setShopId] = useState('')
  const [stage, setStage] = useState<'search' | 'template' | 'review' | 'sent'>('search')
  const [q, setQ] = useState('')
  const [order, setOrder] = useState<api.LiveOrder | null>(null)
  const [searched, setSearched] = useState(false)
  const [to, setTo] = useState('')
  const [tmpl, setTmpl] = useState<ComposeTemplateId | null>(null)
  const [intent, setIntent] = useState('')
  const [draft, setDraft] = useState<{ draft: string; english: string; language: string; subject: string } | null>(null)
  const [busy, setBusy] = useState<'' | 'search' | 'draft' | 'send'>('')
  const [err, setErr] = useState('')
  // Seed from (and follow) the global store switcher. Defaulting to shops[0]
  // meant an agent working in store B composed and sent real mail from store A's
  // mailbox, under A's brand, threaded into A's inbox.
  useEffect(() => {
    const wanted = selectedShopId && selectedShopId !== 'all' ? selectedShopId : ''
    if (wanted && shops.some((x) => x.id === wanted)) { if (shopId !== wanted) setShopId(wanted); return }
    // On 'All stores' do NOT auto-pick: silently defaulting to shops[0] is how
    // proactive mail went out under the wrong brand.
    if (!wanted) return
  }, [selectedShopId, shops, shopId])
  const search = async () => {
    if (!q.trim() || !shopId) return
    setBusy('search'); setErr(''); setSearched(false)
    try {
      const r = await api.composeSearchOrder(q.trim(), shopId)
      setOrder(r.order)
      if (r.order?.customer_email) setTo(String(r.order.customer_email))
      setSearched(true)
    } catch (e) { setErr((e as Error).message) }
    setBusy('')
  }
  const doDraft = async (id: ComposeTemplateId) => {
    const base = COMPOSE_TEMPLATES.find((x) => x.id === id)!
    const text = id === 'custom' ? intent : base.intent
    if (!text.trim()) return
    setBusy('draft'); setErr('')
    try {
      const r = await api.composeGenerateDraft(order, text, shopId)
      setDraft(r)
      setStage('review')
    } catch (e) { setErr((e as Error).message) }
    setBusy('')
  }
  const doSend = async () => {
    if (!draft || !to.trim()) return
    setBusy('send'); setErr('')
    try {
      await api.composeSendLive({
        to: to.trim(),
        subject: draft.subject || `About your order ${order?.order_name ?? ''}`.trim(),
        body: draft.draft,
        order_snapshot: (order as Record<string, unknown>) ?? undefined,
        order_id: order?.order_id ? String(order.order_id) : undefined,
        language: draft.language,
        shop_id: shopId,
      })
      setStage('sent')
    } catch (e) { setErr((e as Error).message) }
    setBusy('')
  }
  const reset = () => { setStage('search'); setQ(''); setOrder(null); setSearched(false); setTo(''); setTmpl(null); setIntent(''); setDraft(null); setErr('') }
  return (
    <div className="c-page">
      <div className="c-cwrap">
        <header className="c-page-h" style={{ marginBottom: 0 }}>
          <div><h1>Compose</h1><p><b>Live:</b> sends a real email from the store mailbox and opens a ticket.</p></div>
        </header>
        {err && <p className="c-note" style={{ margin: 0, color: '#B4472F' }}>{err}</p>}
        {stage === 'search' && (
          <div className="c-card c-compose2">
            <div className="c-cp-row">
              <label className="grow">Store
                <select value={shopId} onChange={(e) => setShopId(e.target.value)} disabled={!!selectedShopId && selectedShopId !== 'all'} title={selectedShopId && selectedShopId !== 'all' ? 'Following the store selected in the sidebar' : undefined}>
                  <option value="">Select a store…</option>
                  {shops.map((sh) => <option key={sh.id} value={sh.id}>{sh.name}</option>)}
                </select>
              </label>
            </div>
            <label>Find the order
              <span className="c-cp-search"><Search size={14} /><input autoFocus placeholder="Order number, customer email or name…" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void search() }} /></span>
            </label>
            <div className="row" style={{ display: 'flex', gap: 10 }}>
              <button className="c-act prim" disabled={!q.trim() || !shopId || busy === 'search'} onClick={() => void search()}>
                {busy === 'search' ? <Loader2 size={14} className="c-spin" /> : <Search size={14} />} Search
              </button>
            </div>
            {searched && (order ? (
              <div className="c-cp-orders">
                <button onClick={() => setStage('template')}>
                  <Package size={14} />
                  <span className="o"><b>{order.order_name ?? 'Order'}</b> · {String(order.shipping_name ?? order.customer_display_name ?? order.customer_email ?? '')}</span>
                  <span className="i">{(order.line_items ?? []).map((li: { title: string; quantity: number }) => `${li.quantity}× ${li.title}`).join(', ').slice(0, 60)}</span>
                  <ChevronDown size={13} style={{ transform: 'rotate(-90deg)' }} />
                </button>
              </div>
            ) : (
              <p className="c-note" style={{ margin: 0 }}>No order matched. Try the order number or the customer email.</p>
            ))}
            <button className="c-cp-skip" onClick={() => { setOrder(null); setStage('template') }}>Continue without an order</button>
          </div>
        )}
        {stage === 'template' && (
          <div className="c-card c-compose2">
            <div className="c-cp-row">
              {order ? (
                <span className="c-orderchip"><Package size={13} /> {order.order_name} · {String(order.shipping_name ?? order.customer_email ?? '')}
                  <button onClick={() => setStage('search')} aria-label="change order"><X size={12} /></button>
                </span>
              ) : (
                <button className="c-cp-skip" style={{ margin: 0 }} onClick={() => setStage('search')}>No order attached · find one</button>
              )}
            </div>
            {!order && (
              <label>Send to
                <span className="c-cp-search"><input placeholder="customer@email.com" value={to} onChange={(e) => setTo(e.target.value)} /></span>
              </label>
            )}
            <div className="c-tmplgrid">
              {COMPOSE_TEMPLATES.map((x) => (
                <button key={x.id} className={'c-tmplcard' + (tmpl === x.id ? ' on' : '')} onClick={() => { setTmpl(x.id); if (x.id !== 'custom') void doDraft(x.id) }}>
                  <span className="ic"><x.icon size={15} /></span>
                  <b>{x.label}</b>
                  <span className="d">{x.desc}</span>
                </button>
              ))}
            </div>
            {tmpl === 'custom' && (
              <>
                <label>What do you need to say?
                  <textarea rows={3} autoFocus value={intent} onChange={(e) => setIntent(e.target.value)} />
                </label>
                <div className="row">
                  <button className="c-act prim" disabled={!intent.trim() || !shopId || busy === 'draft'} onClick={() => void doDraft('custom')}>
                    {busy === 'draft' ? <Loader2 size={14} className="c-spin" /> : <Sparkles size={14} />} Draft with AI
                  </button>
                </div>
              </>
            )}
            {busy === 'draft' && tmpl !== 'custom' && <p className="c-note" style={{ margin: 0 }}><Loader2 size={13} className="c-spin" /> Writing the draft…</p>}
          </div>
        )}
        {stage === 'review' && draft && (
          <div className="c-card c-compose2">
            <div className="c-cp-row meta">
              <span className="k">To</span>{to ? <span className="v">{to}</span> : <input placeholder="customer@email.com" value={to} onChange={(e) => setTo(e.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 6, padding: '3px 8px', fontSize: 12.5, fontFamily: 'inherit' }} />}
              <span className="sp" />
              {order?.order_name && <span className="c-chip ink">{order.order_name}</span>}
              <span className="c-chip mut"><Languages size={11} /> {draft.language}</span>
            </div>
            <div className="c-cp-row meta">
              <span className="k">Sending as</span>
              <span className="v"><b>{shops.find((x) => x.id === shopId)?.name ?? '—'}</b>{(() => { const raw = api.getShopRaw(shopId) as { gmail_address?: string } | null; return raw?.gmail_address ? ` · ${raw.gmail_address}` : '' })()}</span>
            </div>
            <div className="c-cp-row meta">
              <span className="k">Subject</span>
              <input className="v" style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 7, padding: '5px 8px', font: 'inherit' }}
                value={draft.subject ?? ''} placeholder="Subject"
                onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
            </div>
            <p className="body editable" title="Click to edit" style={{ fontSize: 13.5, lineHeight: 1.65, cursor: 'text', whiteSpace: 'pre-wrap' }}
              contentEditable suppressContentEditableWarning
              /* innerText, NOT textContent: the browser inserts <div>/<br> for
                 newlines and textContent drops them, which silently merged every
                 paragraph into one block in the email the customer received. */
              onBlur={(e) => setDraft({ ...draft, draft: e.currentTarget.innerText ?? draft.draft })}
            >{draft.draft}</p>
            {draft.english && draft.english !== draft.draft && <p className="c-native-p">{draft.english}</p>}
            <div className="c-cfoot" style={{ marginTop: 14 }}>
              <button className="c-act" onClick={() => setStage('template')}>Back</button>
              <span className="sp" />
              <button className="c-act prim" disabled={busy === 'send' || !to.trim() || !shopId} onClick={() => void doSend()}>
                {busy === 'send' ? <Loader2 size={14} className="c-spin" /> : <Send size={14} />} Send for real
              </button>
            </div>
          </div>
        )}
        {stage === 'sent' && (
          <div className="c-card c-compose2 sent">
            <span className="ok"><Check size={18} strokeWidth={2.6} /></span>
            <b>Sent to {to}</b>
            <p className="c-note" style={{ margin: 0 }}>Delivered from the store mailbox. A ticket now tracks the conversation.</p>
            <button className="c-act" onClick={reset}>Compose another</button>
          </div>
        )}
      </div>
    </div>
  )
}

/* Live team: the real user list on resolver.chat. Roles are admin/agent with
   a read-only flag; invitees sign in with Google using the invited email. */
function LiveTeam() {
  const [users, setUsers] = useState<api.LiveUser[] | null>(null)
  const [err, setErr] = useState('')
  const [showRoles, setShowRoles] = useState(false)
  const [adding, setAdding] = useState(false)
  const [nw, setNw] = useState({ name: '', email: '', role: 'agent' as 'admin' | 'agent' })
  const [busy, setBusy] = useState('')
  const load = () => { api.listLiveUsers().then(setUsers).catch((e) => setErr((e as Error).message)) }
  useEffect(load, [])
  const patch = async (id: string, p: Record<string, unknown>) => {
    setBusy(id)
    try { await api.updateLiveUser(id, p); load(); setErr('') }
    catch (e) { setErr((e as Error).message) }
    setBusy('')
  }
  const del = async (u: api.LiveUser) => {
    const activeAdmins = (users ?? []).filter((x) => x.role === 'admin' && x.is_active).length
    if (u.role === 'admin' && u.is_active && activeAdmins <= 1) { setErr('Cannot remove the last active admin.'); return }
    if (!window.confirm(`Remove ${u.name} (${u.email})? This permanently deletes their access.`)) return
    setBusy(u.id)
    try { await api.deleteLiveUser(u.id); load(); setErr('') }
    catch (e) { setErr((e as Error).message) }
    setBusy('')
  }
  const invite = async () => {
    if (!nw.email.trim() || !nw.name.trim()) return
    setBusy('invite')
    try { await api.createLiveUser({ email: nw.email.trim().toLowerCase(), name: nw.name.trim(), role: nw.role }); setNw({ name: '', email: '', role: 'agent' }); setAdding(false); load(); setErr('') }
    catch (e) { setErr((e as Error).message) }
    setBusy('')
  }
  if (!users) return <p className="c-note" style={{ margin: 0 }}>{err || 'Loading team…'}</p>
  return (
    <div className="c-rows" style={{ gap: 0 }}>
      <div className="c-set-head"><h3>Team</h3><p>People who can sign in to this workspace. Set each person's role, or remove them.</p></div>
      <p className="c-note" style={{ margin: '0 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}><span><b>Live:</b> the real team on resolver.chat. New members sign in with Google using the invited email.</span><button type="button" onClick={() => setShowRoles((v) => !v)} title="What do the roles mean?" style={{ border: 'none', background: 'var(--band)', color: 'var(--tx-soft)', borderRadius: '50%', width: 18, height: 18, fontSize: 11, cursor: 'pointer', flex: 'none' }}>?</button></p>
      {showRoles && (
        <div style={{ margin: '0 0 10px', padding: '10px 12px', background: 'var(--band)', borderRadius: 8, lineHeight: 1.7, fontSize: 12 }}>
          <div><b>Admin</b> — manages team, stores, billing and all settings, plus full ticket actions.</div>
          <div><b>Agent</b> — works tickets only (reply, resolve, assign); no settings, team, stores or billing.</div>
          <div><b>Read-only</b> — can view everything but can’t send, edit or change ticket status (stacks on either role).</div>
        </div>
      )}
      {users.map((u) => (
        <div className="c-teamrow" key={u.id}>
          <div className="hd">
            <span className="c-avatar sm" style={{ width: 26, height: 26, fontSize: 11 }}>{u.name.slice(0, 1).toUpperCase()}</span>
            <b>{u.name}</b>
            <span className="stores">{u.email}</span>
            <span className="sp" style={{ flex: 1 }} />
            <span className="at">{u.last_login_at ? 'last seen ' + timeAgo(u.last_login_at) + ' ago' : 'never signed in'}</span>
            <select value={u.role} disabled={busy === u.id} onChange={(e) => void patch(u.id, { role: e.target.value })}>
              <option value="admin">Admin</option>
              <option value="agent">Agent</option>
            </select>
            <button
              type="button" className="c-toggle" role="switch"
              aria-checked={u.role === 'admin' ? false : !!u.read_only}
              disabled={busy === u.id || u.role === 'admin'}
              title={u.role === 'admin' ? 'Admins cannot be read-only: it would block every action, including turning it back off. Set the role to Agent first.' : 'Read-only: can view everything, cannot send or change anything'}
              onClick={() => void patch(u.id, { read_only: !u.read_only })}
            >
              <span className={'c-switch sm' + (u.role !== 'admin' && u.read_only ? ' on green' : '')}><span className="k" /></span>
              <span className="tx">read-only</span>
            </button>
            <button className={'c-switch sm' + (u.is_active ? ' on green' : '')} title={u.is_active ? 'Active · click to deactivate' : 'Deactivated · click to reactivate'} disabled={busy === u.id} onClick={() => void patch(u.id, { is_active: !u.is_active })}><span className="k" /></button>
            <button className="c-act" style={{ padding: '4px 9px', fontSize: 11 }} title="Remove teammate" disabled={busy === u.id} onClick={() => void del(u)}>Remove</button>
          </div>
        </div>
      ))}
      {err && <p className="c-note" style={{ margin: '8px 0 0', color: '#B4472F' }}>{err}</p>}
      {!adding ? (
        <button className="c-act" style={{ marginTop: 14, alignSelf: 'flex-start' }} onClick={() => setAdding(true)}><Plus size={14} /> Invite teammate</button>
      ) : (
        <div className="c-rulebuilder" style={{ marginTop: 14 }}>
          <input autoFocus placeholder="Name" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} style={{ minWidth: 120 }} />
          <input placeholder="email@company.com" value={nw.email} onChange={(e) => setNw({ ...nw, email: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') void invite() }} />
          <select value={nw.role} onChange={(e) => setNw({ ...nw, role: e.target.value as 'admin' | 'agent' })}>
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
          <span className="sp" />
          <button className="c-act" onClick={() => setAdding(false)}>Cancel</button>
          <button className="c-act prim" disabled={!nw.email.trim() || !nw.name.trim() || busy === 'invite'} onClick={() => void invite()}>
            {busy === 'invite' ? <Loader2 size={13} className="c-spin" /> : <Check size={13} />} Invite
          </button>
        </div>
      )}
    </div>
  )
}

/* Live overview: only real numbers from /api/stats — no demo garnish. The
   trend/insight cards return once their production endpoints exist. */
function LiveOverview({ shopId }: { shopId: string }) {
  useStore()
  const [days, setDays] = useState<7 | 30 | 90>(7)
  const key = `${shopId || 'all'}:${days}`
  const st = api.getLiveStats(key)
  const statsErr = api.getStatsError(key)
  useEffect(() => { void api.refreshLiveStats(shopId, days); void api.refreshCsat(); if (shopId === 'all') void api.refreshShopCounts(); if (shopId && shopId !== 'all') void api.refreshLiveInsights(shopId) }, [shopId, days])
  const counts = api.getCounts(shopId)
  const fmtH = (h: number | null | undefined) => (h == null ? '—' : h < 1 ? Math.round(h * 60) + 'm' : h.toFixed(1) + 'h')
  const daily = Object.entries(st?.dailyCreated ?? {}).sort((a, b) => a[0].localeCompare(b[0])).slice(-14)
  const maxDaily = Math.max(1, ...daily.map(([, n]) => n))
  const cats = Object.entries(st?.categoryBreakdown ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 7)
  const maxCat = Math.max(1, ...cats.map(([, n]) => n))
  const bk = st?.backlogAge
  const buckets: [string, number][] = ([['Under 1 day', bk?.under_1d], ['1–3 days', bk?.one_to_three_d], ['3–7 days', bk?.three_to_seven_d], ['Over 7 days', bk?.over_seven_d]] as [string, number | undefined][]).map(([k, n]) => [k, Number(n) || 0] as [string, number]).filter(([, n]) => n > 0)
  const maxBucket = Math.max(1, ...buckets.map(([, n]) => n))
  const KPIS = [
    { label: 'Open backlog', v: String(st?.backlogAge?.open_total ?? counts.open), sub: st?.backlogAge?.oldest_hours ? `oldest ${fmtH(st.backlogAge.oldest_hours)}` : (shopId === 'all' ? 'across your stores' : 'this store') },
    { label: `Created (${days}d)`, v: st ? String(st.createdInWindow ?? st.createdThisWeek) : '…', sub: `${st?.createdToday ?? '…'} today` },
    { label: `Resolved (${days}d)`, v: st ? String(st.resolvedInWindow ?? st.resolvedThisWeek ?? 0) : '…', sub: 'closed in range' },
    { label: 'Resolution rate', v: st?.resolutionRate != null ? Math.round(st.resolutionRate) + '%' : '…', sub: `of tickets created in ${days}d` },
    { label: 'Median first reply', v: st ? fmtH(st.p50FrtHours) : '…', sub: st?.p90FrtHours != null ? `p90 ${fmtH(st.p90FrtHours)}` : 'inbound to first response' },
    { label: 'Unanswered now', v: st ? String(st.unansweredInWindow ?? 0) : '…', sub: 'no agent reply yet' },
    { label: 'SLA breaches', v: st ? String(st.breachOver24h ?? 0) : '…', sub: st?.breachOver48h != null ? `${st.breachOver48h} over 48h` : 'over 24h to reply' },
    { label: 'Disputes at risk', v: st ? String(st.chargebacks ?? 0) : '…', sub: 'open chargebacks/inquiries' },
  ]
  return (
    <div className="c-page">
      <HealthStrip />
      <header className="c-page-h">
        <div><h1>Overview</h1><p><b>Live</b> · real numbers from your stores</p></div>
        <div className="c-seg">
          {([7, 30, 90] as const).map((d) => (
            <button key={d} className={days === d ? 'on' : ''} onClick={() => setDays(d)}>{d === 7 ? 'Last 7 days' : d + ' days'}</button>
          ))}
        </div>
      </header>
      {statsErr && !st && (
        <p className="c-note" style={{ color: '#B4472F', margin: '0 0 10px' }} role="alert">
          Could not load these numbers — {statsErr}. They are not zero; they are unknown.
        </p>
      )}
      <div className="c-kpis k8">
        {KPIS.map((k) => (
          <div className="c-kpi" key={k.label}>
            <div className="n">{k.v}</div>
            <div className="l">{k.label}</div>
            <div className="s">{k.sub}</div>
          </div>
        ))}
      </div>
      <div className="c-card">
        <div className="c-card-h">Where tickets stand</div>
        <div className="c-statmix">
          {([['Open', st?.open], ['Waiting on customer', st?.waitingCustomer], ['Waiting on supplier', st?.waitingSupplier], ['Escalated', st?.escalated], ['Stuck', st?.stuck], ['Resolved', st?.resolved]] as [string, number | undefined][]).map(([lbl, n]) => (
            <div className="cell" key={lbl}><span className="n">{n == null ? '…' : n}</span><span className="l">{lbl}</span></div>
          ))}
        </div>
      </div>
      {shopId === 'all' && (() => {
        // Server-truth per store (GET /api/tickets/counts). The client cache this
        // used to count holds at most 300 merged rows, so quieter stores were
        // simply missing from the chart.
        const perStore = api.SHOPS.filter((s) => s.id !== 'all').map((s) => ({ s, open: api.getShopOpenCount(s.id) ?? api.getCounts(s.id).open })).filter((x) => x.open > 0).sort((a, b) => b.open - a.open)
        if (perStore.length === 0) return null
        const mx = Math.max(1, ...perStore.map((x) => x.open))
        return (
          <div className="c-card">
            <div className="c-card-h">Open backlog by store</div>
            <div className="c-rows">
              {perStore.map(({ s, open }) => (
                <div className="c-lane-row wide" key={s.id}>
                  <span className="nm">{s.name}</span>
                  <span className="bar"><i style={{ width: (open / mx) * 100 + '%' }} /></span>
                  <span className="pct">{open}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })()}
      <div className="c-card">
        <div className="c-card-h" style={{ display: 'flex', alignItems: 'center' }}>Customer satisfaction<span style={{ flex: 1 }} /><button className={'c-switch sm' + (api.csatEnabled() ? ' on green' : '')} onClick={() => { if (api.isSuperAdmin()) void api.setCsatEnabled(!api.csatEnabled()) }} disabled={!api.isSuperAdmin()} title={api.isSuperAdmin() ? 'One-click survey after resolution' : 'The satisfaction survey is set for all accounts by Resolver'} aria-label="Satisfaction survey"><span className="k" /></button></div>
        {(() => { const cs = api.getCsatSummary(); return cs.count === 0
          ? <p className="c-note" style={{ margin: 0 }}>No ratings yet. {api.csatEnabled() ? 'A one-click survey goes out after each resolution once this app is sending customer mail.' : 'Enable the survey to collect ratings after resolutions.'}</p>
          : (
            <div>
              <div style={{ fontSize: 28, fontWeight: 700 }}>{cs.avg.toFixed(1)} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--tx-faint)' }}>/5 · {cs.count} rating{cs.count === 1 ? '' : 's'}</span></div>
              {cs.dist.map(([sc, n]) => (<div key={sc} style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, margin: '3px 0' }}><span style={{ width: 22 }}>{sc}★</span><span style={{ flex: 1, height: 6, background: 'var(--band)', borderRadius: 3, overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: (cs.count ? (n / cs.count) * 100 : 0) + '%', background: '#3D7A50' }} /></span><span style={{ width: 20, textAlign: 'right', color: 'var(--tx-faint)' }}>{n}</span></div>))}
            </div>
          ) })()}
      </div>
      <div className="c-grid2">
        <div className="c-card">
          <div className="c-card-h">Tickets created, last 14 days</div>
          {daily.length === 0 ? <p className="c-note" style={{ margin: 0 }}>No tickets in range yet.</p> : (
            <div className="c-bars">
              {daily.map(([d, n]) => (
                <div className="col" key={d}>
                  <div className="vwrap"><i style={{ height: (n / maxDaily) * 100 + '%' }} /></div>
                  <span>{d.slice(5).replace('-', '/')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="c-card">
          <div className="c-card-h">Top categories</div>
          {cats.length === 0 ? <p className="c-note" style={{ margin: 0 }}>Nothing categorized yet.</p> : (
            <div className="c-rows">
              {cats.map(([name, n]) => (
                <div className="c-lane-row wide" key={name}>
                  <span className="nm">{name}</span>
                  <span className="bar"><i style={{ width: (n / maxCat) * 100 + '%' }} /></span>
                  <span className="pct">{n}</span>
                </div>
              ))}
            </div>
          )}
          {buckets.length > 0 && (
            <>
              <div className="c-card-h" style={{ marginTop: 24 }}>Backlog by age</div>
              <div className="c-rows">
                {buckets.map(([b, n]) => (
                  <div className="c-lane-row" key={b}>
                    <span className="nm">{b}</span>
                    <span className="bar"><i style={{ width: (Number(n) / maxBucket) * 100 + '%' }} /></span>
                    <span className="pct">{String(n)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {shopId !== 'all' && (() => {
        const ins = api.getLiveInsights(shopId)
        return (
          <div className="c-card">
            <div className="c-card-h">Insights <span className="c-chip mut" style={{ marginLeft: 8 }}>mined from your last 60 days</span></div>
            {!ins ? <p className="c-note" style={{ margin: 0 }}>Analyzing recent tickets…</p>
              : ins.insights.length === 0 ? <p className="c-note" style={{ margin: 0 }}>No trend stands out across {ins.tickets} recent tickets. That is a good sign.</p>
              : (
                <div className="c-rows" style={{ gap: 2 }}>
                  {ins.insights.map((x, i) => (
                    <div className="c-insight" key={i}>
                      <span className={'dot ' + x.severity} />
                      <div className="bd">
                        <div className="hd"><b>{x.label}</b>{x.count > 0 && <span className="ct">{x.count} tickets</span>}</div>
                        <p>{x.detail}</p>
                        <span className="act">Suggested: {x.action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        )
      })()}
      {shopId === 'all' && <p className="c-note" style={{ margin: 0 }}>Pick a single store for trend insights; everything else on this page is live data.</p>}
    </div>
  )
}

/* ---------------------------------------------------------------- shell */
const TOUR: { sel: string; title: string; body: string; place: 'right' | 'bottom' | 'left' | 'top' }[] = [
  { sel: '.c-store', title: 'All your stores, one inbox', body: 'Switch between stores or work across all of them at once. Counts follow.', place: 'right' },
  { sel: '.c-ftabs', title: 'The queue, sliced', body: 'Open, escalated, waiting, resolved. Escalations always float to the top.', place: 'bottom' },
  { sel: '.c-composer', title: 'Drafts, not homework', body: 'Every ticket arrives with a reply already written from the real order. Click the text to edit it, then approve. Notes for your team live in the same place.', place: 'top' },
  { sel: '.c-statuschip', title: 'Status lives with the chat', body: 'Move tickets through open, waiting, resolved right from the header. Escalations happen automatically on risk.', place: 'bottom' },
  { sel: '.c-auto', title: 'Autonomy, on a leash', body: 'This shows which lanes auto-send. The kill switch in Settings stops everything instantly.', place: 'right' },
]
function Tour({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = TOUR[i]
  useEffect(() => {
    const el = document.querySelector(step.sel)
    if (!el) { if (i < TOUR.length - 1) setI(i + 1); else onDone(); return }
    el.scrollIntoView({ block: 'nearest' })
    setRect(el.getBoundingClientRect())
  }, [i, step.sel, onDone])
  if (!rect) return null
  // Vertically center side bubbles on the target and clamp every placement
  // inside the viewport so a bottom-anchored step can never spill off-screen.
  const EST_H = 170
  const sideTop = Math.max(12, Math.min(rect.top + rect.height / 2 - EST_H / 2, window.innerHeight - EST_H - 12))
  const pos: React.CSSProperties =
    step.place === 'right' ? { left: Math.min(rect.right + 16, window.innerWidth - 300), top: sideTop } :
    step.place === 'left' ? { right: window.innerWidth - rect.left + 16, top: sideTop } :
    step.place === 'bottom' ? { left: Math.min(rect.left, window.innerWidth - 320), top: Math.min(rect.bottom + 12, window.innerHeight - EST_H - 12) } :
    { left: Math.min(rect.left, window.innerWidth - 320), top: Math.max(rect.top - 12, EST_H + 12), transform: 'translateY(-100%)' }
  return (
    <>
      <div className="tour-glow" style={{ left: rect.left - 6, top: rect.top - 6, width: rect.width + 12, height: rect.height + 12 }} />
      <div className={'tour-bubble ' + step.place} style={pos}>
        <b>{step.title}</b>
        <p>{step.body}</p>
        <div className="row">
          <span className="n">{i + 1} of {TOUR.length}</span>
          <span className="sp" />
          <button className="skip" onClick={onDone}>Skip tour</button>
          <button className="next" onClick={() => (i < TOUR.length - 1 ? setI(i + 1) : onDone())}>{i < TOUR.length - 1 ? 'Next' : 'Done'}</button>
        </div>
      </div>
    </>
  )
}

export function AppConsole() {
  const storeVersion = useStore()
  const [view, setView] = useState<View>('tickets')
  const [collapsed, setCollapsed] = useState(false)
  const [tour, setTour] = useState(false)
  useEffect(() => {
    if (!localStorage.getItem('resolver.tour_done')) {
      const id = setTimeout(() => setTour(true), 900)
      return () => clearTimeout(id)
    }
  }, [])
  const endTour = () => { setTour(false); localStorage.setItem('resolver.tour_done', '1') }
  const [shopIdx, setShopIdx] = useState(0)
  const [catFilter, setCatFilter] = useState<Category | null>(null)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [storeOpen, setStoreOpen] = useState(false)
  useOutsideClose(storeOpen, () => setStoreOpen(false))
  // SHOPS is spliced in place by the poll; indexing by position white-screened
  // the console when the list shrank. Clamp.
  // Read through the same subscribed render path as everything else, so a 402 or the
  // 120s poll re-renders the banner. Declared above the early returns, per the hook rule.
  const planGate = api.getPlanGate()
  const safeShopIdx = Math.min(shopIdx, Math.max(0, api.SHOPS.length - 1))
  const shopId = api.SHOPS[safeShopIdx]?.id ?? 'all'
  // A store can be unlinked from somewhere else entirely: the panel inside Shopify,
  // another tab, a teammate. The adapter notices within a second of the first failed
  // per-store call; this turns that into something the merchant is actually told.
  const [goneShop, setGoneShop] = useState<{ name: string; remaining: number } | null>(null)
  // The selected store, remembered by id. SHOPS is spliced in place, so by the time a
  // removal is visible the entry that would name it has already gone.
  const selectedShop = useRef<{ id: string; name: string } | null>(null)
  useEffect(() => {
    const s = api.SHOPS[safeShopIdx]
    if (s && s.id !== 'all') selectedShop.current = { id: s.id, name: s.name }
  }, [safeShopIdx, storeVersion])
  useEffect(() => {
    const removed = api.getRemovedShops()
    if (!removed.length) return
    const mine = selectedShop.current ? removed.find((r) => r.id === selectedShop.current!.id) : undefined
    // Drained whether or not it was the open store: a store leaving is news exactly
    // once, and a queue that is never emptied would re-fire on every poll.
    api.clearRemovedShops()
    if (!mine) return
    selectedShop.current = null
    setShopIdx(0)
    setGoneShop({ name: mine.name, remaining: Math.max(0, api.SHOPS.length - 1) })
  }, [storeVersion])
  // Sent / Bin / Filtered / Activity are fetched server-side; tell the adapter
  // which store is selected so they honour the switcher like the inbox does.
  useEffect(() => { api.setCurrentShop(shopId) }, [shopId])
  const counts = api.getCounts(shopId)
  const aiPaused = !!(api.getLiveSettings() as { ai_paused?: boolean } | undefined)?.ai_paused

  const badge: Partial<Record<View, number>> = {
    tickets: counts.open + ((counts as { escalated?: number }).escalated ?? 0), tasks: api.getTasks().filter((t) => t.col !== 'done' && !taskSnoozed(t)).length, chargebacks: (shopId === 'all' ? api.getChargebacks() : api.getChargebacks().filter((c) => c.shop_id === shopId)).filter((c) => c.status === 'needs_response').length,
  }

  const CONTENT: Record<View, () => React.ReactElement> = {
    overview: () => <LiveOverview shopId={shopId} />,
    tickets: () => <TicketsView shopId={shopId} catFilter={catFilter} onClearCat={() => setCatFilter(null)} onConnectInbox={() => { PENDING_SETTINGS_TAB = 'Stores'; setView('settings') }} />,
    resolved: () => <DerivedList shopId={shopId} title="Resolved" sub="Closed conversations" filterFn={(t) => t.status === 'RESOLVED' || t.status === 'REPLACEMENT_SENT'} empty={api.listTicketsSync(shopId).length === 0 ? 'Nothing here yet. Conversations move here once they are resolved.' : 'No resolved conversations.'} onOpen={(id) => { openTicketById(id); setView('tickets') }} />,
    bin: () => <BinView onOpen={(id) => { openTicketById(id); setView('tickets') }} />,
    filtered: () => <LiveFiltered />,
    compose: () => <LiveCompose shopId={shopId} />,
    sent: () => <SentView />,
    tasks: () => <TasksView shopId={shopId} onOpen={(id) => { openTicketById(id); setView('tickets') }} />,
    customs: () => <LiveStaticList title="Customs" sub="Clearance requests detected in tracking" rows={api.getCustoms()} empty="No customs holds right now." />,
    chargebacks: () => <ChargebacksView shopId={shopId} onOpen={(id) => { openTicketById(id); setView('tickets') }} />,
    ailog: () => <AiLog />,
    users: () => <UsersView />,
    settings: () => <SettingsView />,
  }

  const goneDialog = goneShop && (
    <div className="c-gone-wrap" role="dialog" aria-modal="true" aria-label={`${goneShop.name} was disconnected`}>
      <div className="c-gone">
        <span className="ic"><Unplug size={18} /></span>
        <h3>{goneShop.name} was disconnected</h3>
        <p>
          {goneShop.remaining > 0
            ? `This store is no longer on your Resolver account, so its tickets and settings are not here any more. Your other ${goneShop.remaining === 1 ? 'store is' : `${goneShop.remaining} stores are`} unaffected.`
            : 'This store is no longer on your Resolver account, and it was the last one. Connect a store to start receiving tickets again.'}
        </p>
        <div className="acts">
          {goneShop.remaining > 0 ? (
            <>
              <button className="pri" onClick={() => { setGoneShop(null); setStoreOpen(true) }}>Switch store</button>
              <button className="sec" onClick={() => setGoneShop(null)}>Stay on all stores</button>
            </>
          ) : (
            <>
              <button className="pri" onClick={() => { setGoneShop(null); setView('settings') }}>Connect a store</button>
              <button className="sec" onClick={() => setGoneShop(null)}>Not now</button>
            </>
          )}
        </div>
      </div>
    </div>
  )

  const shell = (
    <div className={'console2' + (collapsed ? ' collapsed' : '')}>
      {goneDialog}
      <aside className="c-rail">
        <div className="c-brand">
          <img src={LOGO} alt="" /><span className="bw">resolver.chat</span>
          <button className="c-collapse" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
            <PanelLeft size={15} />
          </button>
        </div>

        <div className="c-store-wrap" onClick={(e) => e.stopPropagation()}>
          <button className="c-store" onClick={() => setStoreOpen(!storeOpen)}>
            <span className="dot">{(api.SHOPS[safeShopIdx]?.name ?? '?')[0]}</span>
            <span className="nm">{(api.SHOPS[safeShopIdx]?.name ?? 'All stores')}<small>{counts.open} open{shopId === 'all' ? ` · ${Math.max(0, api.SHOPS.length - 1)} stores` : ''}</small></span>
            <ChevronsUpDown size={14} className="mut" />
          </button>
          {storeOpen && (
            <div className="c-store-menu">
              {api.SHOPS.map((s, i) => {
                const legacy = s.served === false
                return (
                  <button
                    key={s.id}
                    className={(i === shopIdx ? 'on' : '') + (legacy ? ' c-store-legacy' : '')}
                    disabled={legacy}
                    title={legacy ? 'Still handled by the old support app — not migrated yet' : undefined}
                    onClick={() => { if (legacy) return; setShopIdx(i); setStoreOpen(false) }}
                  >
                    {s.name}
                    {legacy && <span className="c-store-tag">old app</span>}
                    {!legacy && i === shopIdx && <Check size={13} />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <nav className="c-nav">
          {NAV.map((g, gi) => (
            <div key={gi} className="grp">
              {g.group && <div className="glabel">{g.group}</div>}
              {g.items.map((it) => (
                <div key={it.v}>
                  <a className={'item' + (view === it.v && (it.v !== 'tickets' || !catFilter) ? ' on' : '')} onClick={() => { setView(it.v); if (it.v === 'tickets') setCatFilter(null) }}>
                    <it.Ic size={16} /> <span>{it.label}</span>
                    {badge[it.v] != null && badge[it.v]! > 0 && <span className="n">{badge[it.v]}</span>}
                    {it.v === 'tickets' && (
                      <button
                        className={'twist' + (inboxOpen ? ' open' : '')}
                        aria-label={inboxOpen ? 'Collapse ticket types' : 'Expand ticket types'}
                        onClick={(e) => { e.stopPropagation(); setInboxOpen(!inboxOpen) }}
                      ><ChevronDown size={13} /></button>
                    )}
                  </a>
                  {it.v === 'tickets' && inboxOpen && (() => {
                    const byCat = new Map<Category, number>()
                    for (const t of api.listTicketsSync(shopId)) byCat.set(t.category, (byCat.get(t.category) ?? 0) + 1)
                    return (
                      <div className="subs">
                        {[...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([cat, n]) => (
                          <a key={cat} className={'sub' + (view === 'tickets' && catFilter === cat ? ' on' : '')}
                            onClick={() => { setView('tickets'); setCatFilter(cat) }}>
                            <span>{CATEGORY_LABEL[cat] ?? cat}</span><span className="n">{n}</span>
                          </a>
                        ))}
                      </div>
                    )
                  })()}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="c-rail-foot">
          <a className={'item c-set-link' + (view === 'settings' ? ' on' : '')} onClick={() => setView('settings')}>
            <Settings size={16} /> <span>Settings</span>
          </a>
          <div className="c-auto">
            <b>{(() => {
              if (aiPaused) return 'AI paused'
              // The real master switch, read from live settings.
              if (!api.globalAutoSendSettingsLoaded()) return 'Auto-send —'
              // The master switch alone sends NOTHING: a shop missing from
              // auto_send_per_shop is off (autoSendPolicy.resolveMode), so a
              // fresh account with the master on and no lane set is not armed.
              // It said "Auto-send armed · 0 stores live", which claims the
              // opposite of what the pipeline would do.
              return api.globalAutoSendEnabled() && autoSendLiveShops() > 0 ? 'Auto-send armed' : 'Auto-send off'
            })()}</b>
            <p>{(() => {
              if (aiPaused) return 'Drafting is off on this environment'
              if (!api.globalAutoSendSettingsLoaded()) return 'Checking…'
              if (!api.globalAutoSendEnabled()) return 'Nothing sends automatically'
              const live = autoSendLiveShops()
              if (live === 0) return 'No store is set to send automatically'
              return `${live} store${live === 1 ? '' : 's'} live · risky tickets always wait`
            })()}</p>
          </div>
          <div className="c-me">
            {(() => { const em = api.liveCurrentEmail(); const nm = em ? em.split('@')[0] : 'Nathan'; return (<><span className="av">{(nm[0] || 'N').toUpperCase()}</span><span>{nm}<small>{em || 'Owner'}</small></span></>) })()}
            <button className="c-tourbtn" title="Replay the welcome tour" onClick={() => { setView('tickets'); setTour(true) }}>?</button>
            <button className="c-tourbtn" title="Sign out" aria-label="Sign out" onClick={() => void signOutConsole()}><LogOut size={14} /></button>
          </div>
        </div>
      </aside>

      <div className="c-main"><div className="c-stack">
        <ImportBanner shopId={shopId} />
        {api.isLiveAuthError() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: '#FBEFEC', color: '#B4472F', fontSize: 12.5, fontWeight: 500 }}>
            Your session expired — the console can no longer reach the server.
            <button className="c-act" style={{ padding: '3px 10px', fontSize: 11.5 }} onClick={() => window.location.reload()}>Sign in again</button>
          </div>
        )}
        {!api.isLiveAuthError() && api.liveError() && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 14px', background: '#FDF6EC', color: '#8A6D1F', fontSize: 12 }}>
            {api.liveError()}
          </div>
        )}
        <div className="c-view" key={view}>{CONTENT[view]()}</div>
      </div></div>
      {tour && view === 'tickets' && <Tour onDone={endTour} />}
    </div>
  )
  // The paywall replaces the console, inside LiveGate so the session, the poll
  // that clears it and the sign-out button all still exist.
  return <LiveGate>{planGate.inactive ? <PlanPaywall url={planGate.managedPricingUrl} /> : shell}</LiveGate>
}
