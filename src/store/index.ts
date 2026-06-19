import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ConsentRecord, ExceptionItem, OperationLog, SignatureInfo, FilterState, ExceptionType, FlowRecord } from '@/types'
import { consentRecords, exceptionItems, operationLogs, signatureInfos } from '@/utils/mockData'

interface AppState {
  records: ConsentRecord[]
  exceptions: ExceptionItem[]
  logs: Record<string, OperationLog[]>
  signatures: Record<string, SignatureInfo>
  flowRecords: FlowRecord[]
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

  getFilteredRecords: () => ConsentRecord[]
  getRecordById: (id: string) => ConsentRecord | undefined
  getExceptionsByType: (type: ExceptionType) => ExceptionItem[]
  getRecordLogs: (recordId: string) => OperationLog[]
  getSignatureInfo: (recordId: string) => SignatureInfo | undefined
  getFlowRecordsByRecord: (recordId: string) => FlowRecord[]
  getStats: () => { pending: number; exceptions: number; archived: number; total: number; processed: number }
  getClosingData: () => {
    unsigned: ConsentRecord[]
    mismatch: ConsentRecord[]
    unconfirmed: ConsentRecord[]
    outdated: ConsentRecord[]
    unsignedResolved: number
    mismatchResolved: number
    unconfirmedResolved: number
    outdatedResolved: number
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

function isExceptionResolved(r: ConsentRecord, exceptions: ExceptionItem[]): boolean {
  if (!r.exceptionType) return true
  const ex = exceptions.find(e => e.recordId === r.id)
  if (!ex) return false
  if (ex.status === 'resolved') return true
  if (r.archiveStatus === 'offline_archived') return true
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
            }
          })
          return { records: nextRecords, logs: nextLogs, selectedRecords: new Set<string>() }
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
          const nextLogs = { ...s.logs }
          if (ex) {
            nextLogs[ex.recordId] = [
              ...(nextLogs[ex.recordId] || []),
              {
                id: `OL${ex.recordId}-resign-${Date.now()}`,
                recordId: ex.recordId,
                operator: '张管理',
                operatorRole: '病案管理员',
                action: '发送补签链接',
                detail: note ? `发送补签链接至患者${ex.patientName}，备注：${note}` : `发送补签链接至患者${ex.patientName}`,
                timestamp: now,
              },
            ]
          }
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
          return { exceptions: updatedExceptions, logs: nextLogs, flowRecords: [...s.flowRecords, flowRecord] }
        }),

      returnToDoctor: (exceptionId, note) =>
        set((s) => {
          const now = new Date().toISOString()
          const ex = s.exceptions.find(e => e.id === exceptionId)
          const updatedExceptions = s.exceptions.map((e) =>
            e.id === exceptionId ? { ...e, status: 'processing' as const } : e
          )
          const nextLogs = { ...s.logs }
          if (ex) {
            nextLogs[ex.recordId] = [
              ...(nextLogs[ex.recordId] || []),
              {
                id: `OL${ex.recordId}-return-${Date.now()}`,
                recordId: ex.recordId,
                operator: '张管理',
                operatorRole: '病案管理员',
                action: '退回医生补备注',
                detail: note ? `退回至医生${ex.doctorName}补备注，备注：${note}` : `退回至医生${ex.doctorName}补备注`,
                timestamp: now,
              },
            ]
          }
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
          return { exceptions: updatedExceptions, logs: nextLogs, flowRecords: [...s.flowRecords, flowRecord] }
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
          const nextLogs = { ...s.logs }
          if (recordId) {
            nextLogs[recordId] = [
              ...(nextLogs[recordId] || []),
              {
                id: `OL${recordId}-offline-${Date.now()}`,
                recordId,
                operator: '张管理',
                operatorRole: '病案管理员',
                action: '标记线下纸质归档',
                detail: note ? `标记线下纸质已归档，备注：${note}` : '标记线下纸质已归档',
                timestamp: now,
              },
            ]
          }
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
          return { records: updatedRecords, exceptions: updatedExceptions, logs: nextLogs, flowRecords: [...s.flowRecords, flowRecord] }
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
        const relatedFlows = flowRecords
          .filter(f => f.recordId === recordId)
          .map(f => ({
            id: f.id,
            recordId: f.recordId,
            operator: f.operator,
            operatorRole: f.operatorRole,
            action: f.action,
            detail: f.note ? `${f.action}，备注：${f.note}` : f.action,
            timestamp: f.timestamp,
          }))
        const merged = [...baseLogs, ...relatedFlows]
        merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        return merged
      },

      getSignatureInfo: (recordId) => get().signatures[recordId],

      getFlowRecordsByRecord: (recordId) =>
        get().flowRecords.filter(f => f.recordId === recordId).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),

      getStats: () => {
        const { records, exceptions } = get()
        const unresolvedExceptions = records.filter(r => !isExceptionResolved(r, exceptions))
        const processedCount = records.filter(r => {
          if (r.archiveStatus === 'offline_archived') return true
          if (r.archiveStatus === 'archived') return true
          return false
        }).length
        return {
          pending: records.filter((r) => r.archiveStatus === 'pending').length,
          exceptions: unresolvedExceptions.length,
          archived: records.filter((r) => r.archiveStatus === 'archived').length,
          processed: processedCount,
          total: records.length,
        }
      },

      getClosingData: () => {
        const { records, exceptions } = get()
        const unsigned = records.filter(r => r.signStatus === 'unsigned' || r.signStatus === 'partial')
        const mismatch = records.filter(r => r.treatmentItem !== r.chargeItem)
        const unconfirmed = records.filter(r => !r.doctorConfirmed)
        const outdated = records.filter(r => r.exceptionType === 'outdated_template')
        const unsignedResolved = unsigned.filter(r => isExceptionResolved(r, exceptions)).length
        const mismatchResolved = mismatch.filter(r => isExceptionResolved(r, exceptions)).length
        const unconfirmedResolved = unconfirmed.filter(r => isExceptionResolved(r, exceptions)).length
        const outdatedResolved = outdated.filter(r => isExceptionResolved(r, exceptions)).length
        return { unsigned, mismatch, unconfirmed, outdated, unsignedResolved, mismatchResolved, unconfirmedResolved, outdatedResolved }
      },
    }),
    {
      name: 'consent-archive-store',
      partialize: (state) => ({
        records: state.records,
        exceptions: state.exceptions,
        logs: state.logs,
        flowRecords: state.flowRecords,
      }),
    }
  )
)
