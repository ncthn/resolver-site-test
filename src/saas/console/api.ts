// Adapter switch for the console. Demo (mock store) by default; /app?live=1
// persists live mode and wires the implemented surfaces to the REAL
// resolver.chat API (?live=0 switches back). Types and every not-yet-wired
// surface come from the mock so the whole console keeps working during the
// migration — WIRING.md tracks the mapping.
export * from './mockApi'
import * as mock from './mockApi'
import * as live from './liveApi'

export const LIVE = (() => {
  try {
    const u = new URL(window.location.href)
    if (u.searchParams.get('live') === '1') localStorage.setItem('resolver.live', '1')
    if (u.searchParams.get('live') === '0') localStorage.removeItem('resolver.live')
    return localStorage.getItem('resolver.live') === '1'
  } catch { return false }
})()

// Dispatched surfaces (shadow the star re-exports above)
export const subscribe = LIVE ? live.subscribe : mock.subscribe
export const getVersion = LIVE ? live.getVersion : mock.getVersion
export const SHOPS = LIVE ? live.SHOPS : mock.SHOPS
export const listTickets = LIVE ? live.listTickets : mock.listTickets
export const listTicketsSync = LIVE ? live.listTicketsSync : mock.listTicketsSync
export const getTicket = LIVE ? live.getTicket : mock.getTicket
export const getCounts = LIVE ? live.getCounts : mock.getCounts
export const patchStatus = LIVE ? live.patchStatus : mock.patchStatus
export const patchCategory = LIVE ? live.patchCategory : mock.patchCategory
export const postSend = LIVE ? live.postSend : mock.postSend
export const postRegenerate = LIVE ? live.postRegenerate : mock.postRegenerate
export const postAiToggle = LIVE ? live.postAiToggle : mock.postAiToggle
export const addNote = LIVE ? live.addNote : mock.addNote
export const summarizeThread = LIVE ? live.summarizeThread : mock.summarizeThread

// Live-only plumbing (no-ops in demo mode)
export const setTokenProvider = live.setTokenProvider
export const startPolling = live.startPolling
export const liveError = () => (LIVE ? live.LAST_ERROR : '')
export const liveTicketIds = () => (LIVE ? live.liveTicketIds() : [])
export const getShopRaw = (shopId: string) => (LIVE ? live.getShopRaw(shopId) : null)
export const saveShopPolicy = live.saveShopPolicy
export const saveShopSop = live.saveShopSop
