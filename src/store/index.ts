import { create } from 'zustand'
import type { ConsentRecord, ExceptionItem, OperationLog, SignatureInfo, FilterState, ExceptionType } from '@/types'
import { consentRecords, exceptionItems, operationLogs, signatureInfos } from '@/utils/mockData'

interface AppState {
  records: ConsentRecord[]
  exceptions: ExceptionItem[]
  logs: Record<string, OperationLog[]>
  signatures: Record<string, SignatureInfo>
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
  sendResignLink: (exceptionId: string) => void
  returnToDoctor: (exceptionId: string) => void

  getFilteredRecords: () => ConsentRecord[]
  getRecordById: (id: string) => ConsentRecord | undefined
  getExceptionsByType: (type: ExceptionType) => ExceptionItem[]
  getRecordLogs: (recordId: string) => OperationLog[]
  getSignatureInfo: (recordId: string) => SignatureInfo | undefined
  getStats: () => { pending: number; exceptions: number; archived: number; total: number }
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

export const useAppStore = create<AppState>((set, get) => ({
  records: consentRecords,
  exceptions: exceptionItems,
  logs: operationLogs,
  signatures: signatureInfos,
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
      const next = s.records.map((r) =>
        s.selectedRecords.has(r.id) && r.archiveStatus === 'pending'
          ? { ...r, archiveStatus: 'archived' as const }
          : r
      )
      return { records: next, selectedRecords: new Set<string>() }
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

  sendResignLink: (exceptionId) =>
    set((s) => ({
      exceptions: s.exceptions.map((e) =>
        e.id === exceptionId ? { ...e, status: 'processing' as const } : e
      ),
    })),

  returnToDoctor: (exceptionId) =>
    set((s) => ({
      exceptions: s.exceptions.map((e) =>
        e.id === exceptionId ? { ...e, status: 'processing' as const } : e
      ),
    })),

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

  getRecordLogs: (recordId) => get().logs[recordId] || [],

  getSignatureInfo: (recordId) => get().signatures[recordId],

  getStats: () => {
    const { records } = get()
    return {
      pending: records.filter((r) => r.archiveStatus === 'pending').length,
      exceptions: records.filter((r) => r.exceptionType !== null).length,
      archived: records.filter((r) => r.archiveStatus === 'archived').length,
      total: records.length,
    }
  },
}))
