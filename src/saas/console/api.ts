// The console's adapter surface. ONE implementation: the real resolver.chat API
// in liveApi.ts.
//
// There used to be a second one — an in-memory client-side mock (mockApi.ts)
// entered with ?demo=1 — and this file re-exported it with `export * from
// './mockApi'` before dispatching a subset. That meant any name NOT explicitly
// dispatched silently resolved to fabricated data in production. Both the mock
// and the demo switch are gone. The only demo that exists is the real reviewer
// account (reviewer@resolver-demo.test): real shops, real tickets, this same
// adapter.
//
// There is deliberately no `export *` here. Every name is listed. A surface the
// live adapter has not implemented is now a COMPILE ERROR, not a silent
// fall-through to invented numbers. Keep it that way.
import * as live from './liveApi'
import type { TaskCol } from './types'

/* Domain shapes the views consume. Types only — nothing here has a runtime
   value that could be fake. */
export type {
  TaskCol, SopRuleV2, SopVar, Macro, Chargeback, InboxRule, ReturnStage, ReturnFlow,
} from './types'

/* ------------------------------------------------------------ store + shell */
export const subscribe = live.subscribe
export const getVersion = live.getVersion
export const SHOPS = live.SHOPS
/** Whether the account's plan is positively inactive, and where to go and fix it. */
export const getPlanGate = live.getPlanGate
/** Stores that left the account since the shell last looked. */
export const getRemovedShops = live.getRemovedShops
export const clearRemovedShops = live.clearRemovedShops
export const setCurrentShop = live.setCurrentShop
/** Store the switcher currently has selected ('all' = every store). */
export const currentShopId = () => live.CURRENT_SHOP
export const isLoaded = live.isLoaded
export const isLiveAuthError = live.isAuthError
export const liveError = () => live.LAST_ERROR
export const setTokenProvider = live.setTokenProvider
export const startPolling = live.startPolling
export const setLiveCurrentEmail = live.setCurrentEmail
export const liveCurrentEmail = () => live.CURRENT_EMAIL

/* ---------------------------------------------------------------- tickets */
export const listTickets = live.listTickets
export const listTicketsSync = live.listTicketsSync
export const liveTicketIds = live.liveTicketIds
export const getTicket = live.getTicket
export const getTicketFull = live.getTicketFull
export const getCounts = live.getCounts
export const patchStatus = live.patchStatus
export const patchCategory = live.patchCategory
export const postSend = live.postSend
export const postRegenerate = live.postRegenerate
export const postAiToggle = live.postAiToggle
export const addNote = live.addNote
export const summarizeThread = live.summarizeThread
export const deleteTicket = live.deleteTicket
export const restoreTicket = live.restoreTicket
export const permanentDelete = live.permanentDelete
export const cancelAutoSend = live.cancelAutoSend
export const searchTickets = live.searchTickets
export const isSearchPinned = live.isSearchPinned
export const setOpenTicketId = live.setOpenTicketId
export const listBinSync = live.listBinSync
export const getOutbound = live.getOutbound
export const getLog = live.getLog
export const attachmentUrl = live.attachmentUrl
export const translateFromEnglish = live.translateFromEnglish
export const translateMessage = live.translateMessage
export const assignTicket = live.assignTicket
export const heartbeatViewing = live.heartbeatViewing
export const getTeam = live.getTeam
export const getViewers = live.getViewers
export const getMailFilters = live.getMailFilters
export const setMailFilters = live.setMailFilters

/* ------------------------------------------------------------------ orders */
export const matchOrder = live.matchOrder
export const rematchOrder = live.rematchOrder
export const refreshOrder = live.refreshOrder
export const unlinkOrder = live.unlinkOrder
export const getOrderTimeline = live.getOrderTimeline
export const setNextAction = live.setNextAction
export type { LiveOrder } from './liveApi'

/* --------------------------------------------------------------- mailboxes */
/* connectInbox is the back-compat account-wide path and has no console caller
   any more; the per-store calls below are what the Stores tab uses. */
export const connectInbox = live.connectInbox
export const connectInboxForShop = live.connectInboxForShop
export const disconnectShopMailbox = live.disconnectShopMailbox
export const getBackfillStatus = live.getBackfillStatus
// Pull the ticket list now, rather than waiting out its 12-second timer. Used while an
// import is running, when the list is the thing the merchant is watching.
export const refreshTickets = live.refreshTickets
// Pull the shop list again after a save that changed policy, so the form reflects what
// was stored rather than what was typed.
export const refreshShops = live.refreshShops
export const sopTemplateQuestions = live.sopTemplateQuestions
export const sopTemplateSave = live.sopTemplateSave
export const getShopMailbox = live.getShopMailbox
export const backfillGmail = live.backfillGmail
export const syncGmailNow = live.syncGmailNow
export const mergeDuplicates = live.mergeDuplicates
export type { BackfillStatus } from './liveApi'
export type { ShopMailbox, MailboxSource, MailboxProvider } from './liveApi'

/* ----------------------------------------------------------------- returns */
export const getReturn = live.getReturn
export const startReturn = live.startReturn
export const advanceReturn = live.advanceReturn
export const cancelReturn = live.cancelReturn

/* ----------------------------------------------------------- saved replies */
export const getLiveMacros = live.getMacros
export const createLiveMacro = live.createMacro
export const updateLiveMacro = live.updateMacro
export const deleteLiveMacro = live.deleteMacro
export const seedLiveMacros = live.seedMacros
export const fillMacro = live.fillMacro

/* -------------------------------------------------------------- API tokens */
export const listApiKeys = live.listApiKeys
export const createApiKey = live.createApiKey
export const revokeApiKey = live.revokeApiKey
export type { ApiKeyRow } from './liveApi'

/* ------------------------------------------------------------- SOP / rules */
export const SOP_RULES_V2 = live.SOP_RULES_LIVE
export const updateRulePartV2 = live.updateRulePartV2
export const updateRuleCondV2 = live.updateRuleCondV2
export const toggleRuleV2 = live.toggleRuleV2
export const deleteRuleV2 = live.deleteRuleV2
export const addRuleV2 = live.addRuleV2
export const getShopRaw = live.getShopRaw
export const saveShopPolicy = live.saveShopPolicy
export const saveShopSop = live.saveShopSop
export const saveShopVoice = live.saveShopVoice
export const saveShopKnowledge = live.saveShopKnowledge
export const saveShopAbilities = live.saveShopAbilities

/* ------------------------------------------------------------------- tasks */
export interface ConsoleTask {
  id: string; t: string; d: string; due: string; col: TaskCol; ticketId?: string
  derived?: boolean
  shopId?: string
  source?: live.TaskSource
  sourceKey?: string
  /** What the task is (email change, refund to process, …). Absent on rows
      written before the field existed — the view shows no chip rather than
      guessing a type. */
  type?: live.TaskType
  priority?: live.TaskPriority
  snoozedUntil?: string
  createdAt?: string
  updatedAt?: string
}
export type { TaskSource, TaskPriority, TaskType } from './liveApi'
export const TASK_TYPES = live.TASK_TYPES
export const getTasks: () => ConsoleTask[] = live.getTasks
export const moveTask = live.moveTask
export const createTask = live.createTask
export const toggleTask = live.toggleTask
export const updateTask = live.updateTask
export const deleteTask = live.deleteTask
export const snoozeTask = live.snoozeTask

/* ----------------------------------------------------------- inbox triage */
export const INBOX_RULES = live.INBOX_RULES_LIVE
export const addInboxRule = live.addInboxRule
export const toggleInboxRule = live.toggleInboxRule
export const deleteInboxRule = live.deleteInboxRule
export const getCustoms = live.getCustoms
export const getFiltered = live.getFiltered
export const getFilteredRaw = live.getFilteredRaw
export const restoreFilteredEmail = live.restoreFilteredEmail
export const deleteFilteredEmail = live.deleteFilteredEmail
export type { FilteredRow } from './liveApi'

/* ------------------------------------------------------------ chargebacks */
export const getChargebacks = live.getChargebacks
export const submitChargeback = live.submitChargeback
export const syncDisputes = live.syncDisputes
export const fetchChargebackEmail = live.fetchChargebackEmail
export const backfillChargebackThreads = live.backfillChargebackThreads

/* -------------------------------------------------------------- suppliers */
export const postSupplier = live.postSupplier
export const resolveSupplier = live.resolveSupplier

/* --------------------------------------------------------------- compose */
export const composeSearchOrder = live.composeSearchOrder
export const composeGenerateDraft = live.composeGenerateDraft
export const composeSendLive = live.composeSendLive

/* --------------------------------------------- settings / autonomy / CSAT */
export const getLiveSettings = live.getLiveSettings
export const refreshLiveSettings = live.refreshSettings
export const setAutoSendMode = live.setAutoSendMode
export const liveLaneReadiness = live.laneReadiness
export const globalAutoSendEnabled = live.globalAutoSendEnabled
export const setGlobalAutoSend = live.setGlobalAutoSend
export const globalAutoSendSettingsLoaded = live.globalAutoSendSettingsLoaded
export const saveNotificationPrefs = live.saveNotificationPrefs
export const getCsatSummary = live.getCsatSummary
export const setCsatEnabled = live.setCsatEnabled
export const refreshCsat = live.refreshCsat
export const csatEnabled = () => !!(live.getLiveSettings() as { csat_enabled?: boolean }).csat_enabled

/* ------------------------------------------------------- stats / insights */
export const getLiveStats = live.getLiveStats
export const refreshLiveStats = live.refreshStats
export const getStatsError = live.getStatsError
export const getLiveInsights = live.getLiveInsights
export const refreshLiveInsights = live.refreshInsights
export type { LiveStats } from './liveApi'

/* ------------------------------------------------- health / audit / trust */
export const getHealth = live.getHealth
export const refreshHealth = live.refreshHealth
export const getAuditLog = live.getAuditLog
export const refreshAuditLog = live.refreshAuditLog
export const getShadowStats = live.getShadowStats
/** Why a draft was (or was not) auto-sent. readSendDecision is a pure reader over
    the ticket doc; the audit-log fallback is an admin-only route. */
export const readSendDecision = live.readSendDecision
export const getSendAudit = live.getSendAudit
export const loadSendAudit = live.loadSendAudit
export type { SendDecision, SendAuditState, HealthReport } from './liveApi'

/* --------------------------------------------------------- session + users */
export const getMe = live.getMe
export const isAdmin = live.isAdmin
export const isSuperAdmin = live.isSuperAdmin
export const isReadOnly = live.isReadOnly
export const refreshMe = live.refreshMe
export const listLiveUsers = live.listUsers
export const createLiveUser = live.createUser
export const updateLiveUser = live.updateUser
export const deleteLiveUser = live.deleteUser
export type { SessionUser, LiveUser } from './liveApi'

/* ------------------------------------------------------------------ stores */
export const connectShopify = live.connectShopify
export const validateShopManual = live.validateShopManual
export const createShopManual = live.createShopManual
export const deleteShop = live.deleteShop
export const getArchivedShops = live.getArchivedShops
export const refreshArchivedShops = live.refreshArchivedShops
export const restoreShop = live.restoreShop
export const getShopOpenCount = live.getShopOpenCount
export const refreshShopCounts = live.refreshShopCounts
export const probeShops = live.probeShops
export type { ArchivedShop } from './liveApi'

/* ---------------------------------------------------------------- billing */
export type { BillingSummary, CancelResult } from './liveApi'
export const getBillingSummary = live.getBillingSummary
export const getBillingError = live.getBillingError
export const isBillingLoading = live.isBillingLoading
export const refreshBillingSummary = live.refreshBillingSummary
export const cancelSubscription = live.cancelSubscription
