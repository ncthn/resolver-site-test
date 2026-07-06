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
export const deleteTicket = LIVE ? live.deleteTicket : mock.deleteTicket
export const restoreTicket = LIVE ? live.restoreTicket : mock.restoreTicket
export const getOutbound = LIVE ? live.getOutbound : mock.getOutbound
export const listBinSync = () => (LIVE ? live.listBinSync() : [])
export const getReturn = LIVE ? live.getReturn : mock.getReturn
export const startReturn = LIVE ? live.startReturn : mock.startReturn
export const advanceReturn = LIVE ? live.advanceReturn : mock.advanceReturn
export const getLiveMacros = () => (LIVE ? live.getMacros() : [])
export const createLiveMacro = live.createMacro
export const deleteLiveMacro = live.deleteMacro
export const SOP_RULES_V2 = LIVE ? live.SOP_RULES_LIVE : mock.SOP_RULES_V2
export const updateRulePartV2 = LIVE ? live.updateRulePartV2 : mock.updateRulePartV2
export const updateRuleCondV2 = LIVE ? live.updateRuleCondV2 : mock.updateRuleCondV2
export const toggleRuleV2 = LIVE ? live.toggleRuleV2 : mock.toggleRuleV2
export const deleteRuleV2 = LIVE ? live.deleteRuleV2 : mock.deleteRuleV2
export const addRuleV2 = LIVE ? live.addRuleV2 : mock.addRuleV2
export const getTasks = LIVE ? live.getTasks : mock.getTasks
export const moveTask = LIVE ? live.moveTask : mock.moveTask
export const createTask = LIVE ? live.createTask : mock.createTask
export const toggleTask = LIVE ? live.toggleTask : mock.toggleTask
export const INBOX_RULES = LIVE ? live.INBOX_RULES_LIVE : mock.INBOX_RULES
export const addInboxRule = LIVE ? live.addInboxRule : mock.addInboxRule
export const toggleInboxRule = LIVE ? live.toggleInboxRule : mock.toggleInboxRule
export const deleteInboxRule = LIVE ? live.deleteInboxRule : mock.deleteInboxRule

// Live-only plumbing (no-ops in demo mode)
export const setTokenProvider = live.setTokenProvider
export const startPolling = live.startPolling
export const liveError = () => (LIVE ? live.LAST_ERROR : '')
export const liveTicketIds = () => (LIVE ? live.liveTicketIds() : [])
export const getShopRaw = (shopId: string) => (LIVE ? live.getShopRaw(shopId) : null)
export const saveShopPolicy = live.saveShopPolicy
export const saveShopSop = live.saveShopSop
export const getLiveSettings = live.getLiveSettings
export const refreshLiveSettings = live.refreshSettings
export const setAutoSendMode = live.setAutoSendMode
export const liveLaneReadiness = live.laneReadiness
export const composeSearchOrder = live.composeSearchOrder
export const composeGenerateDraft = live.composeGenerateDraft
export const composeSendLive = live.composeSendLive
export const listLiveUsers = live.listUsers
export const createLiveUser = live.createUser
export const updateLiveUser = live.updateUser
export const getLiveStats = live.getLiveStats
export const refreshLiveStats = live.refreshStats
export const getLiveInsights = (shopId: string) => (LIVE ? live.getLiveInsights(shopId) : undefined)
export const refreshLiveInsights = live.refreshInsights
export type { LiveOrder, LiveUser, LiveStats } from './liveApi'
