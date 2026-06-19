import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConsentRecord, ExceptionItem, OperationLog, SignatureInfo, FilterState, ExceptionType, FlowRecord, DailyReport, ReminderRecord, PendingExceptionDetail } from '@/types'
import { consentRecords, exceptionItems, operationLogs, signatureInfos } from '@/utils/mockData'

function isSameDay(iso: string, dateStr: string): boolean {
  const d = new Date(iso)
  return d.toISOString().slice(0, 10) === dateStr
}

function isInDateRange(iso: string, dateStr: string): boolean {
  return isSameDay(iso, dateStr)
}

interface AppState {
  records: ConsentRecord[]
  exceptions: ExceptionItem[]
  logs: Record<string, OperationLog[]>
  signatures: Record<string, SignatureInfo>
  flowRecords: FlowRecord[]
  reminderRecords: ReminderRecord[]
  dailyReports: DailyReport[]
  filters: FilterState
  selectedRecords: Set<string>
  exceptionTab: ExceptionType

  setFilters: (filters: Partial<FilterState>) => void
  resetFilters: () => void
  toggleSelectRecord: (id: string) => void
  toggleSelectAll: (ids: string[]) => void
  clearSelection: () => void
  setExceptionTab: (tab: ExceptionType) => void
  batchArchive: () => void
  resolveException: (id: string, action: string) => void
  markOfflineArchived: (recordId: string) => void
  sendResignLink: (exceptionId: string, note: string) => void
  returnToDoctor: (exceptionId: string, note: string) => void
  markOfflineArchivedWithNote: (exceptionId: string, note: string) => void
  addFlowRecord: (exceptionId: string, recordId: string, action: string, note: string) => void
  markPatientResigned: (exceptionId: string, note: string) => void
  markDoctorNoted: (exceptionId: string, note: string) => void
  markMismatchHandled: (recordId: string, note: string) => void
  markUnconfirmedHandled: (recordId: string, note: string) => void
  sendReminder: (exceptionId: string, note: string) => void
  generateDailyReport: (dateStr: string, operator: string, operatorRole: string) => DailyReport | null
  getReportByDate: (dateStr: string) => DailyReport | undefined
  getPendingExceptionDetails: (dateStr: string) => PendingExceptionDetail[]
  getReviewDashboard: (mode: 'week' | 'month', anchorDate: string) => {
    days: { date: string; label: string; totalRecords: number; pendingExceptions: number; closed: boolean; report?: DailyReport }[]
    doctorStats: { name: string; total: number; resolved: number; categories: Record<string, number> }[]
    itemStats: { name: string; total: number; resolved: number }[]
    categoryTrend: { date: string; unsigned: number; mismatch: number; unconfirmed: number; outdated: number }[]
  }

  getFilteredRecords: () => ConsentRecord[]
  getRecordById: (id: string) => ConsentRecord | undefined
  getExceptionsByType: (type: ExceptionType) => ExceptionItem[]
  getRecordLogs: (recordId: string) => OperationLog[]
  getSignatureInfo: (recordId: string) => SignatureInfo | undefined
  getFlowRecordsByRecord: (recordId: string) => FlowRecord[]
  getStats: () => { pending: number; exceptions: number; archived: number; total: number; processed: number }
  getClosingData: (dateStr: string) => {
    unsigned: ConsentRecord[]
    mismatch: ConsentRecord[]
    unconfirmed: ConsentRecord[]
    outdated: ConsentRecord[]
    unsignedResolved: number
    mismatchResolved: number
    unconfirmedResolved: number
    outdatedResolved: number
    allResolved: boolean
    totalRecordsOnDate: number
    pendingExceptionDetails: PendingExceptionDetail[]
  }
}

const defaultFilters: FilterState = {
  dateStart: '',
  dateEnd: '',
  doctor: '',
  treatmentItem: '',
  patientName: '',
  signStatus: '',
  archiveStatus: '',
}

function isTypeAExResolved(r: ConsentRecord, type: ExceptionType, exceptions: ExceptionItem[]): boolean {
  const ex = exceptions.find(e => e.recordId === r.id && e.type === type)
  if (!ex) return false
  if (ex.status === 'resolved') return true
  if (r.archiveStatus === 'offline_archived' || r.archiveStatus === 'archived') return true
  return false
}

function isUnsignedResolved(r: ConsentRecord, exceptions: ExceptionItem[], flowRecords: FlowRecord[]): boolean {
  if (r.signStatus === 'signed') return true
  if (r.archiveStatus === 'offline_archived' || r.archiveStatus === 'archived') return true
  if (r.exceptionType === 'missing_patient_signature') {
    const ex = exceptions.find(e => e.recordId === r.id)
    if (ex?.status === 'resolved') return true
    const hasResignedMark = flowRecords.some(f => f.recordId === r.id && f.action === '标记患者已补签')
    return hasResignedMark
  }
  return false
}

function isMismatchResolved(r: ConsentRecord, exceptions: ExceptionItem[], flowRecords: FlowRecord[]): boolean {
  if (r.treatmentItem === r.chargeItem) return true
  if (r.archiveStatus === 'offline_archived' || r.archiveStatus === 'archived') return true
  if (r.mismatchHandled) return true
  const hasMarked = flowRecords.some(f => f.recordId === r.id && f.action === '标记项目已核对')
  return hasMarked
}

function isUnconfirmedResolved(r: ConsentRecord, exceptions: ExceptionItem[], flowRecords: FlowRecord[]): boolean {
  if (r.doctorConfirmed) return true
  if (r.archiveStatus === 'offline_archived' || r.archiveStatus === 'archived') return true
  if (r.unconfirmedHandled) return true
  if (r.exceptionType === 'missing_doctor_note') {
    const ex = exceptions.find(e => e.recordId === r.id)
    if (ex?.status === 'resolved') return true
  }
  const hasMarked = flowRecords.some(f => f.recordId === r.id && f.action === '标记医生已补说明')
  return hasMarked
}

function isOutdatedResolved(r: ConsentRecord, exceptions: ExceptionItem[], flowRecords: FlowRecord[]): boolean {
  if (r.exceptionType !== 'outdated_template') return true
  if (r.archiveStatus === 'offline_archived' || r.archiveStatus === 'archived') return true
  const ex = exceptions.find(e => e.recordId === r.id)
  if (ex?.status === 'resolved') return true
  return false
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      records: consentRecords,
      exceptions: exceptionItems,
      logs: operationLogs,
      signatures: signatureInfos,
      flowRecords: [],
      reminderRecords: [],
      dailyReports: [],
      filters: { ...defaultFilters },
      selectedRecords: new Set<string>(),
      exceptionTab: 'missing_patient_signature',

      setFilters: (partial) =>
        set((s) => ({ filters: { ...s.filters, ...partial } })),

      resetFilters: () => set({ filters: { ...defaultFilters } }),

      toggleSelectRecord: (id) =>
        set((s) => {
          const next = new Set(s.selectedRecords)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          return { selectedRecords: next }
        }),

      toggleSelectAll: (ids) =>
        set((s) => {
          const allSelected = ids.every((id) => s.selectedRecords.has(id))
          const next = new Set(s.selectedRecords)
          if (allSelected) {
            ids.forEach((id) => next.delete(id))
          } else {
            ids.forEach((id) => next.add(id))
          }
          return { selectedRecords: next }
        }),

      clearSelection: () => set({ selectedRecords: new Set<string>() }),

      setExceptionTab: (tab) => set({ exceptionTab: tab }),

      batchArchive: () =>
        set((s) => {
          const now = new Date().toISOString()
          const nextRecords = s.records.map((r) =>
            s.selectedRecords.has(r.id) && r.archiveStatus === 'pending'
              ? { ...r, archiveStatus: 'archived' as const }
              : r
          )
          const nextLogs = { ...s.logs }
          const nextFlows = [...s.flowRecords]
          s.selectedRecords.forEach((id) => {
            const r = s.records.find(rec => rec.id === id)
            if (r && r.archiveStatus === 'pending') {
              nextLogs[id] = [
                ...(nextLogs[id] || []),
                {
                  id: `OL${id}-batch-${Date.now()}`,
                  recordId: id,
                  operator: '张管理',
                  operatorRole: '病案管理员',
                  action: '归档完成',
                  detail: '批量标记归档完成',
                  timestamp: now,
                },
              ]
              nextFlows.push({
                id: `FR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${id}`,
                exceptionId: '',
                recordId: id,
                action: '归档完成',
                operator: '张管理',
                operatorRole: '病案管理员',
                note: '批量归档',
                timestamp: now,
              })
            }
          })
          return { records: nextRecords, logs: nextLogs, flowRecords: nextFlows, selectedRecords: new Set<string>() }
        }),

      resolveException: (id, action) =>
        set((s) => ({
          exceptions: s.exceptions.map((e) =>
            e.id === id ? { ...e, status: 'resolved' as const, resolvedAt: new Date().toISOString() } : e
          ),
        })),

      markOfflineArchived: (recordId) =>
        set((s) => ({
          records: s.records.map((r) =>
            r.id === recordId ? { ...r, archiveStatus: 'offline_archived' as const } : r
          ),
        })),

      sendResignLink: (exceptionId, note) =>
        set((s) => {
          const now = new Date().toISOString()
          const ex = s.exceptions.find(e => e.id === exceptionId)
          const updatedExceptions = s.exceptions.map((e) =>
            e.id === exceptionId ? { ...e, status: 'processing' as const } : e
          )
          const flowRecord: FlowRecord = {
            id: `FR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            exceptionId,
            recordId: ex?.recordId || '',
            action: '发送补签链接',
            operator: '张管理',
            operatorRole: '病案管理员',
            note,
            timestamp: now,
          }
          return { exceptions: updatedExceptions, flowRecords: [...s.flowRecords, flowRecord] }
        }),

      returnToDoctor: (exceptionId, note) =>
        set((s) => {
          const now = new Date().toISOString()
          const ex = s.exceptions.find(e => e.id === exceptionId)
          const updatedExceptions = s.exceptions.map((e) =>
            e.id === exceptionId ? { ...e, status: 'processing' as const } : e
          )
          const flowRecord: FlowRecord = {
            id: `FR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            exceptionId,
            recordId: ex?.recordId || '',
            action: '退回医生补备注',
            operator: '张管理',
            operatorRole: '病案管理员',
            note,
            timestamp: now,
          }
          return { exceptions: updatedExceptions, flowRecords: [...s.flowRecords, flowRecord] }
        }),

      markOfflineArchivedWithNote: (exceptionId, note) =>
        set((s) => {
          const now = new Date().toISOString()
          const ex = s.exceptions.find(e => e.id === exceptionId)
          const recordId = ex?.recordId || ''
          const updatedRecords = s.records.map((r) =>
            r.id === recordId ? { ...r, archiveStatus: 'offline_archived' as const } : r
          )
          const updatedExceptions = s.exceptions.map((e) =>
            e.id === exceptionId ? { ...e, status: 'resolved' as const, resolvedAt: now } : e
          )
          const flowRecord: FlowRecord = {
            id: `FR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            exceptionId,
            recordId,
            action: '标记线下纸质归档',
            operator: '张管理',
            operatorRole: '病案管理员',
            note,
            timestamp: now,
          }
          return { records: updatedRecords, exceptions: updatedExceptions, flowRecords: [...s.flowRecords, flowRecord] }
        }),

      addFlowRecord: (exceptionId, recordId, action, note) =>
        set((s) => {
          const now = new Date().toISOString()
          const flowRecord: FlowRecord = {
            id: `FR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            exceptionId,
            recordId,
            action,
            operator: '张管理',
            operatorRole: '病案管理员',
            note,
            timestamp: now,
          }
          return { flowRecords: [...s.flowRecords, flowRecord] }
        }),

      markPatientResigned: (exceptionId, note) =>
        set((s) => {
          const now = new Date().toISOString()
          const ex = s.exceptions.find(e => e.id === exceptionId)
          const recordId = ex?.recordId || ''
          const updatedExceptions = s.exceptions.map((e) =>
            e.id === exceptionId ? { ...e, status: 'resolved' as const, resolvedAt: now } : e
          )
          const updatedRecords = s.records.map((r) =>
            r.id === recordId && r.signStatus !== 'signed'
              ? { ...r, signStatus: 'signed' as const, signedAt: now }
              : r
          )
          const flowRecord: FlowRecord = {
            id: `FR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            exceptionId,
            recordId,
            action: '标记患者已补签',
            operator: '张管理',
            operatorRole: '病案管理员',
            note,
            timestamp: now,
          }
          return { records: updatedRecords, exceptions: updatedExceptions, flowRecords: [...s.flowRecords, flowRecord] }
        }),

      markDoctorNoted: (exceptionId, note) =>
        set((s) => {
          const now = new Date().toISOString()
          const ex = s.exceptions.find(e => e.id === exceptionId)
          const recordId = ex?.recordId || ''
          const updatedExceptions = s.exceptions.map((e) =>
            e.id === exceptionId ? { ...e, status: 'resolved' as const, resolvedAt: now } : e
          )
          const updatedRecords = s.records.map((r) =>
            r.id === recordId && !r.doctorConfirmed
              ? { ...r, doctorConfirmed: true, doctorConfirmedAt: now, unconfirmedHandled: true }
              : r.id === recordId
              ? { ...r, unconfirmedHandled: true }
              : r
          )
          const flowRecord: FlowRecord = {
            id: `FR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            exceptionId,
            recordId,
            action: '标记医生已补说明',
            operator: '张管理',
            operatorRole: '病案管理员',
            note,
            timestamp: now,
          }
          return { records: updatedRecords, exceptions: updatedExceptions, flowRecords: [...s.flowRecords, flowRecord] }
        }),

      markMismatchHandled: (recordId, note) =>
        set((s) => {
          const now = new Date().toISOString()
          const updatedRecords = s.records.map((r) =>
            r.id === recordId ? { ...r, mismatchHandled: true } : r
          )
          const flowRecord: FlowRecord = {
            id: `FR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            exceptionId: '',
            recordId,
            action: '标记项目已核对',
            operator: '张管理',
            operatorRole: '病案管理员',
            note,
            timestamp: now,
          }
          return { records: updatedRecords, flowRecords: [...s.flowRecords, flowRecord] }
        }),

      markUnconfirmedHandled: (recordId, note) =>
        set((s) => {
          const now = new Date().toISOString()
          const updatedRecords = s.records.map((r) =>
            r.id === recordId ? { ...r, unconfirmedHandled: true } : r
          )
          const flowRecord: FlowRecord = {
            id: `FR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            exceptionId: '',
            recordId,
            action: '标记医生已补说明',
            operator: '张管理',
            operatorRole: '病案管理员',
            note,
            timestamp: now,
          }
          return { records: updatedRecords, flowRecords: [...s.flowRecords, flowRecord] }
        }),

      sendReminder: (exceptionId, note) =>
        set((s) => {
          const now = new Date().toISOString()
          const ex = s.exceptions.find(e => e.id === exceptionId)
          if (!ex) return s
          const type: 'resign' | 'doctor_note' = ex.type === 'missing_patient_signature' ? 'resign' : 'doctor_note'

          const existingFlowIndex = s.flowRecords.findIndex(
            f => f.exceptionId === exceptionId &&
              (f.action === '发送补签链接' || f.action === '退回医生补备注')
          )

          const nextFlowRecords = [...s.flowRecords]
          if (existingFlowIndex >= 0) {
            const existing = nextFlowRecords[existingFlowIndex]
            nextFlowRecords[existingFlowIndex] = {
              ...existing,
              reminderCount: (existing.reminderCount || 0) + 1,
              lastReminderAt: now,
            }
          }

          const reminderRecord: ReminderRecord = {
            id: `RM-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            exceptionId,
            recordId: ex.recordId,
            type,
            operator: '张管理',
            operatorRole: '病案管理员',
            note,
            timestamp: now,
          }

          const flowRecord: FlowRecord = {
            id: `FR-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            exceptionId,
            recordId: ex.recordId,
            action: type === 'resign' ? '再次发送补签提醒' : '再次提醒医生补备注',
            operator: '张管理',
            operatorRole: '病案管理员',
            note,
            timestamp: now,
          }

          return {
            flowRecords: [...nextFlowRecords, flowRecord],
            reminderRecords: [...s.reminderRecords, reminderRecord],
          }
        }),

      generateDailyReport: (dateStr, operator, operatorRole) => {
        const state = get()
        const closing = state.getClosingData(dateStr)
        const pendingDetails = state.getPendingExceptionDetails(dateStr)

        const actionSummary: DailyReport['actionSummary'] = []
        const operatorMap = new Map<string, { name: string; role: string; count: number }>()

        function addOp(name: string, role: string) {
          const key = `${name}-${role}`
          const existing = operatorMap.get(key) || { name, role, count: 0 }
          existing.count += 1
          operatorMap.set(key, existing)
        }

        state.flowRecords
          .filter(f => isSameDay(f.timestamp, dateStr))
          .forEach(f => {
            const r = state.records.find(rec => rec.id === f.recordId)
            if (!r) return
            let category: DailyReport['actionSummary'][0]['category'] | null = null
            const relatedEx = f.exceptionId
              ? state.exceptions.find(e => e.id === f.exceptionId)
              : null
            if (relatedEx) {
              if (relatedEx.type === 'missing_patient_signature') category = 'unsigned'
              else if (relatedEx.type === 'missing_doctor_note') category = 'unconfirmed'
              else if (relatedEx.type === 'outdated_template') category = 'outdated'
            }
            if (!category) {
              if (f.action === '标记项目已核对' || f.action === '标记线下纸质归档') {
                if (r.treatmentItem !== r.chargeItem) category = 'mismatch'
                else category = 'outdated'
              } else if (f.action === '标记医生已补说明') {
                category = 'unconfirmed'
              } else if (f.action === '标记患者已补签' || f.action === '发送补签链接' || f.action === '再次发送补签提醒') {
                category = 'unsigned'
              } else if (f.action === '退回医生补备注' || f.action === '再次提醒医生补备注') {
                category = 'unconfirmed'
              } else if (f.action === '归档完成') {
                if (r.exceptionType === 'outdated_template') category = 'outdated'
                else if (r.signStatus === 'unsigned' || r.signStatus === 'partial') category = 'unsigned'
                else if (!r.doctorConfirmed) category = 'unconfirmed'
                else if (r.treatmentItem !== r.chargeItem) category = 'mismatch'
                else category = 'outdated'
              } else {
                if (r.signStatus === 'unsigned' || r.signStatus === 'partial') category = 'unsigned'
                else if (r.treatmentItem !== r.chargeItem) category = 'mismatch'
                else if (!r.doctorConfirmed) category = 'unconfirmed'
                else if (r.exceptionType === 'outdated_template') category = 'outdated'
              }
            }
            if (!category) category = 'unsigned'
            actionSummary.push({
              recordId: r.id,
              patientName: r.patientName,
              treatmentItem: r.treatmentItem,
              doctorName: r.doctorName,
              category,
              action: f.action,
              operator: f.operator,
              operatorRole: f.operatorRole,
              timestamp: f.timestamp,
              note: f.note,
            })
            addOp(f.operator, f.operatorRole)
          })

        const report: DailyReport = {
          id: `DR-${dateStr}-${Date.now()}`,
          date: dateStr,
          generatedAt: new Date().toISOString(),
          generatedBy: operator,
          generatedByRole: operatorRole,
          totalRecords: closing.totalRecordsOnDate,
          pendingExceptions: pendingDetails.length,
          unsignedCount: closing.unsigned.length,
          unsignedResolved: closing.unsignedResolved,
          mismatchCount: closing.mismatch.length,
          mismatchResolved: closing.mismatchResolved,
          unconfirmedCount: closing.unconfirmed.length,
          unconfirmedResolved: closing.unconfirmedResolved,
          outdatedCount: closing.outdated.length,
          outdatedResolved: closing.outdatedResolved,
          actionSummary,
          operatorSummary: Array.from(operatorMap.values()),
          pendingExceptionDetails: pendingDetails,
        }

        set((s) => ({
          dailyReports: [...s.dailyReports.filter(dr => dr.date !== dateStr), report],
        }))
        return report
      },

      getReportByDate: (dateStr) => get().dailyReports.find(dr => dr.date === dateStr),

      getPendingExceptionDetails: (dateStr) => {
        const state = get()
        const closing = state.getClosingData(dateStr)
        const details: PendingExceptionDetail[] = []

        function getStuckStep(r: ConsentRecord, category: string): string {
          const relatedFlows = state.flowRecords
            .filter(f => f.recordId === r.id)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          if (category === 'unsigned') {
            const resignedFlow = relatedFlows.find(f => f.action === '发送补签链接')
            if (resignedFlow) return '已发送补签链接，等待患者补签'
            return '待发送补签链接'
          }
          if (category === 'mismatch') {
            return '项目不一致，待核对处理'
          }
          if (category === 'unconfirmed') {
            const returnFlow = relatedFlows.find(f => f.action === '退回医生补备注')
            if (returnFlow) return '已退回医生，等待补填说明'
            return '待退回医生补备注'
          }
          if (category === 'outdated') {
            return '模板过旧，待线下归档处理'
          }
          return '待处理'
        }

        function getLastActionAt(r: ConsentRecord): string {
          const related = state.flowRecords.filter(f => f.recordId === r.id)
          if (related.length === 0) return r.createdAt
          return related.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0].timestamp
        }

        function getReminderInfo(r: ConsentRecord) {
          const relatedFlows = state.flowRecords.filter(f => f.recordId === r.id)
          const mainFlow = relatedFlows.find(f => f.action === '发送补签链接' || f.action === '退回医生补备注')
          if (mainFlow) {
            return {
              count: mainFlow.reminderCount || 0,
              last: mainFlow.lastReminderAt || null,
            }
          }
          return { count: 0, last: null }
        }

        closing.unsigned.forEach(r => {
          if (!isUnsignedResolved(r, state.exceptions, state.flowRecords)) {
            const reminder = getReminderInfo(r)
            details.push({
              recordId: r.id,
              patientName: r.patientName,
              treatmentItem: r.treatmentItem,
              doctorName: r.doctorName,
              category: 'unsigned',
              stuckStep: getStuckStep(r, 'unsigned'),
              lastActionAt: getLastActionAt(r),
              reminderCount: reminder.count,
              lastReminderAt: reminder.last,
            })
          }
        })
        closing.mismatch.forEach(r => {
          if (!isMismatchResolved(r, state.exceptions, state.flowRecords)) {
            details.push({
              recordId: r.id,
              patientName: r.patientName,
              treatmentItem: r.treatmentItem,
              doctorName: r.doctorName,
              category: 'mismatch',
              stuckStep: getStuckStep(r, 'mismatch'),
              lastActionAt: getLastActionAt(r),
              reminderCount: 0,
              lastReminderAt: null,
            })
          }
        })
        closing.unconfirmed.forEach(r => {
          if (!isUnconfirmedResolved(r, state.exceptions, state.flowRecords)) {
            const reminder = getReminderInfo(r)
            details.push({
              recordId: r.id,
              patientName: r.patientName,
              treatmentItem: r.treatmentItem,
              doctorName: r.doctorName,
              category: 'unconfirmed',
              stuckStep: getStuckStep(r, 'unconfirmed'),
              lastActionAt: getLastActionAt(r),
              reminderCount: reminder.count,
              lastReminderAt: reminder.last,
            })
          }
        })
        closing.outdated.forEach(r => {
          if (!isOutdatedResolved(r, state.exceptions, state.flowRecords)) {
            details.push({
              recordId: r.id,
              patientName: r.patientName,
              treatmentItem: r.treatmentItem,
              doctorName: r.doctorName,
              category: 'outdated',
              stuckStep: getStuckStep(r, 'outdated'),
              lastActionAt: getLastActionAt(r),
              reminderCount: 0,
              lastReminderAt: null,
            })
          }
        })

        return details
      },

      getFilteredRecords: () => {
        const { records, filters } = get()
        return records.filter((r) => {
          if (filters.dateStart && r.createdAt < filters.dateStart) return false
          if (filters.dateEnd && r.createdAt > filters.dateEnd + 'T23:59:59') return false
          if (filters.doctor && r.doctorName !== filters.doctor) return false
          if (filters.treatmentItem && r.treatmentItem !== filters.treatmentItem) return false
          if (filters.patientName && !r.patientName.includes(filters.patientName)) return false
          if (filters.signStatus && r.signStatus !== filters.signStatus) return false
          if (filters.archiveStatus && r.archiveStatus !== filters.archiveStatus) return false
          return true
        })
      },

      getRecordById: (id) => get().records.find((r) => r.id === id),

      getExceptionsByType: (type) => get().exceptions.filter((e) => e.type === type),

      getRecordLogs: (recordId) => {
        const { logs, flowRecords } = get()
        const baseLogs = logs[recordId] || []
        const flowIds = new Set<string>()
        const relatedFlows: OperationLog[] = flowRecords
          .filter(f => f.recordId === recordId)
          .map(f => {
            flowIds.add(f.id)
            return {
              id: f.id,
              recordId: f.recordId,
              operator: f.operator,
              operatorRole: f.operatorRole,
              action: f.action,
              detail: f.note ? `${f.action}${f.note ? '，备注：' + f.note : ''}` : f.action,
              timestamp: f.timestamp,
            }
          })
        const filteredBase = baseLogs.filter(b => !flowIds.has(b.id))
        const merged = [...filteredBase, ...relatedFlows]
        merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        const seen = new Set<string>()
        return merged.filter(m => {
          const key = `${m.action}-${m.timestamp}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
      },

      getSignatureInfo: (recordId) => get().signatures[recordId],

      getFlowRecordsByRecord: (recordId) =>
        get().flowRecords.filter(f => f.recordId === recordId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),

      getStats: () => {
        const { records, exceptions } = get()
        const unresolved = records.filter(r => {
          if (r.archiveStatus === 'offline_archived' || r.archiveStatus === 'archived') return false
          const hasIssue = (r.signStatus !== 'signed') ||
            (r.treatmentItem !== r.chargeItem) ||
            (!r.doctorConfirmed) ||
            (r.exceptionType !== null)
          if (!hasIssue) return false
          const { flowRecords } = get()
          const hasEx = exceptions.find(e => e.recordId === r.id)
          if (r.exceptionType && hasEx) {
            if (hasEx.status === 'resolved') return false
            return !isTypeAExResolved(r, r.exceptionType, exceptions)
          }
          if (r.signStatus !== 'signed' && !isUnsignedResolved(r, exceptions, flowRecords)) return true
          if (r.treatmentItem !== r.chargeItem && !isMismatchResolved(r, exceptions, flowRecords)) return true
          if (!r.doctorConfirmed && !isUnconfirmedResolved(r, exceptions, flowRecords)) return true
          if (r.exceptionType === 'outdated_template' && !isOutdatedResolved(r, exceptions, flowRecords)) return true
          return false
        })
        const processedCount = records.filter(r =>
          r.archiveStatus === 'offline_archived' || r.archiveStatus === 'archived'
        ).length
        return {
          pending: records.filter((r) => r.archiveStatus === 'pending').length,
          exceptions: unresolved.length,
          archived: records.filter((r) => r.archiveStatus === 'archived').length,
          processed: processedCount,
          total: records.length,
        }
      },

      getReviewDashboard: (mode, anchorDate) => {
        const state = get()
        const anchor = new Date(anchorDate + 'T00:00:00')
        const dayCount = mode === 'week' ? 7 : 30
        const days: ReturnType<AppState['getReviewDashboard']>['days'] = []

        for (let i = dayCount - 1; i >= 0; i--) {
          const d = new Date(anchor)
          d.setDate(d.getDate() - i)
          const dateStr = d.toISOString().slice(0, 10)
          const closing = state.getClosingData(dateStr)
          const report = state.dailyReports.find(dr => dr.date === dateStr)
          const label = `${d.getMonth() + 1}/${d.getDate()}`
          const pending = closing.pendingExceptionDetails.length
          days.push({
            date: dateStr,
            label,
            totalRecords: closing.totalRecordsOnDate,
            pendingExceptions: pending,
            closed: closing.allResolved,
            report,
          })
        }

        const doctorMap = new Map<string, { name: string; total: number; resolved: number; categories: Record<string, number> }>()
        const itemMap = new Map<string, { name: string; total: number; resolved: number }>()

        days.forEach(day => {
          const closing = state.getClosingData(day.date)
          const all = [...closing.unsigned, ...closing.mismatch, ...closing.unconfirmed, ...closing.outdated]
          const unique = Array.from(new Map(all.map(r => [r.id, r])).values())
          unique.forEach(r => {
            if (!doctorMap.has(r.doctorName)) {
              doctorMap.set(r.doctorName, { name: r.doctorName, total: 0, resolved: 0, categories: { unsigned: 0, mismatch: 0, unconfirmed: 0, outdated: 0 } })
            }
            const doc = doctorMap.get(r.doctorName)!
            doc.total += 1

            let cat: string | null = null
            if (closing.unsigned.some(u => u.id === r.id)) {
              cat = 'unsigned'
              doc.categories.unsigned += 1
              if (isUnsignedResolved(r, state.exceptions, state.flowRecords)) doc.resolved += 1
            } else if (closing.mismatch.some(m => m.id === r.id)) {
              cat = 'mismatch'
              doc.categories.mismatch += 1
              if (isMismatchResolved(r, state.exceptions, state.flowRecords)) doc.resolved += 1
            } else if (closing.unconfirmed.some(u => u.id === r.id)) {
              cat = 'unconfirmed'
              doc.categories.unconfirmed += 1
              if (isUnconfirmedResolved(r, state.exceptions, state.flowRecords)) doc.resolved += 1
            } else if (closing.outdated.some(o => o.id === r.id)) {
              cat = 'outdated'
              doc.categories.outdated += 1
              if (isOutdatedResolved(r, state.exceptions, state.flowRecords)) doc.resolved += 1
            }

            if (!itemMap.has(r.treatmentItem)) {
              itemMap.set(r.treatmentItem, { name: r.treatmentItem, total: 0, resolved: 0 })
            }
            const item = itemMap.get(r.treatmentItem)!
            item.total += 1
            if (cat === 'unsigned' && isUnsignedResolved(r, state.exceptions, state.flowRecords)) item.resolved += 1
            else if (cat === 'mismatch' && isMismatchResolved(r, state.exceptions, state.flowRecords)) item.resolved += 1
            else if (cat === 'unconfirmed' && isUnconfirmedResolved(r, state.exceptions, state.flowRecords)) item.resolved += 1
            else if (cat === 'outdated' && isOutdatedResolved(r, state.exceptions, state.flowRecords)) item.resolved += 1
          })
        })

        const categoryTrend = days.map(day => {
          const closing = state.getClosingData(day.date)
          const un = closing.unsigned.filter(r => !isUnsignedResolved(r, state.exceptions, state.flowRecords)).length
          const mm = closing.mismatch.filter(r => !isMismatchResolved(r, state.exceptions, state.flowRecords)).length
          const uc = closing.unconfirmed.filter(r => !isUnconfirmedResolved(r, state.exceptions, state.flowRecords)).length
          const od = closing.outdated.filter(r => !isOutdatedResolved(r, state.exceptions, state.flowRecords)).length
          return { date: day.label, unsigned: un, mismatch: mm, unconfirmed: uc, outdated: od }
        })

        return {
          days,
          doctorStats: Array.from(doctorMap.values()).sort((a, b) => b.total - a.total),
          itemStats: Array.from(itemMap.values()).sort((a, b) => b.total - a.total),
          categoryTrend,
        }
      },

      getClosingData: (dateStr) => {
        const { records, exceptions, flowRecords } = get()
        const recordsOnDate = records.filter(r => isInDateRange(r.createdAt, dateStr))
        const unsigned = recordsOnDate.filter(r => r.signStatus === 'unsigned' || r.signStatus === 'partial')
        const mismatch = recordsOnDate.filter(r => r.treatmentItem !== r.chargeItem)
        const unconfirmed = recordsOnDate.filter(r => !r.doctorConfirmed)
        const outdated = recordsOnDate.filter(r => r.exceptionType === 'outdated_template')

        const unsignedResolved = unsigned.filter(r => isUnsignedResolved(r, exceptions, flowRecords)).length
        const mismatchResolved = mismatch.filter(r => isMismatchResolved(r, exceptions, flowRecords)).length
        const unconfirmedResolved = unconfirmed.filter(r => isUnconfirmedResolved(r, exceptions, flowRecords)).length
        const outdatedResolved = outdated.filter(r => isOutdatedResolved(r, exceptions, flowRecords)).length

        const allResolved =
          (unsigned.length === 0 || unsignedResolved === unsigned.length) &&
          (mismatch.length === 0 || mismatchResolved === mismatch.length) &&
          (unconfirmed.length === 0 || unconfirmedResolved === unconfirmed.length) &&
          (outdated.length === 0 || outdatedResolved === outdated.length)

        const pendingExceptionDetails: PendingExceptionDetail[] = []
        function addDetail(r: ConsentRecord, category: PendingExceptionDetail['category'], stuck: string) {
          const relatedFlows = flowRecords.filter(f => f.recordId === r.id)
          const mainFlow = relatedFlows.find(f => f.action === '发送补签链接' || f.action === '退回医生补备注')
          const lastAction = relatedFlows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0]
          pendingExceptionDetails.push({
            recordId: r.id,
            patientName: r.patientName,
            treatmentItem: r.treatmentItem,
            doctorName: r.doctorName,
            category,
            stuckStep: stuck,
            lastActionAt: lastAction ? lastAction.timestamp : r.createdAt,
            reminderCount: mainFlow?.reminderCount || 0,
            lastReminderAt: mainFlow?.lastReminderAt || null,
          })
        }
        unsigned.forEach(r => {
          if (!isUnsignedResolved(r, exceptions, flowRecords)) {
            const hasSent = flowRecords.some(f => f.recordId === r.id && f.action === '发送补签链接')
            addDetail(r, 'unsigned', hasSent ? '已发送补签链接，等待患者补签' : '待发送补签链接')
          }
        })
        mismatch.forEach(r => {
          if (!isMismatchResolved(r, exceptions, flowRecords)) {
            addDetail(r, 'mismatch', '项目不一致，待核对处理')
          }
        })
        unconfirmed.forEach(r => {
          if (!isUnconfirmedResolved(r, exceptions, flowRecords)) {
            const hasSent = flowRecords.some(f => f.recordId === r.id && f.action === '退回医生补备注')
            addDetail(r, 'unconfirmed', hasSent ? '已退回医生，等待补填说明' : '待退回医生补备注')
          }
        })
        outdated.forEach(r => {
          if (!isOutdatedResolved(r, exceptions, flowRecords)) {
            addDetail(r, 'outdated', '模板过旧，待线下归档处理')
          }
        })

        return {
          unsigned,
          mismatch,
          unconfirmed,
          outdated,
          unsignedResolved,
          mismatchResolved,
          unconfirmedResolved,
          outdatedResolved,
          allResolved,
          totalRecordsOnDate: recordsOnDate.length,
          pendingExceptionDetails,
        }
      },
    }),
    {
      name: 'consent-archive-store-v3',
      partialize: (state) => ({
        records: state.records,
        exceptions: state.exceptions,
        logs: state.logs,
        flowRecords: state.flowRecords,
        reminderRecords: state.reminderRecords,
        dailyReports: state.dailyReports,
      }),
    }
  )
)
