export type SignStatus = 'signed' | 'unsigned' | 'partial'
export type ExceptionType = 'missing_patient_signature' | 'missing_doctor_note' | 'outdated_template'
export type ArchiveStatus = 'pending' | 'archived' | 'offline_archived'
export type Urgency = 'high' | 'medium' | 'low'
export type ExceptionStatus = 'pending' | 'processing' | 'resolved'
export type MismatchStatus = 'pending' | 'corrected' | 'archived'
export type UnconfirmedStatus = 'pending' | 'confirmed' | 'archived'

export interface ConsentRecord {
  id: string
  patientName: string
  patientId: string
  treatmentItem: string
  chargeItem: string
  doctorName: string
  doctorId: string
  signStatus: SignStatus
  doctorConfirmed: boolean
  templateVersion: string
  signedAt: string | null
  doctorConfirmedAt: string | null
  createdAt: string
  exceptionType: ExceptionType | null
  archiveStatus: ArchiveStatus
  mismatchHandled?: boolean
  unconfirmedHandled?: boolean
}

export interface ExceptionItem {
  id: string
  recordId: string
  type: ExceptionType
  patientName: string
  treatmentItem: string
  doctorName: string
  urgency: Urgency
  status: ExceptionStatus
  createdAt: string
  resolvedAt: string | null
}

export interface FlowRecord {
  id: string
  exceptionId: string
  recordId: string
  action: string
  operator: string
  operatorRole: string
  note: string
  timestamp: string
  reminderCount?: number
  lastReminderAt?: string
}

export interface ReminderRecord {
  id: string
  exceptionId: string
  recordId: string
  type: 'resign' | 'doctor_note'
  operator: string
  operatorRole: string
  note: string
  timestamp: string
}

export interface PendingExceptionDetail {
  recordId: string
  patientName: string
  treatmentItem: string
  doctorName: string
  category: 'unsigned' | 'mismatch' | 'unconfirmed' | 'outdated'
  stuckStep: string
  lastActionAt: string
  reminderCount: number
  lastReminderAt: string | null
}

export interface DailyReport {
  id: string
  date: string
  generatedAt: string
  generatedBy: string
  generatedByRole: string
  totalRecords: number
  pendingExceptions: number
  unsignedCount: number
  unsignedResolved: number
  mismatchCount: number
  mismatchResolved: number
  unconfirmedCount: number
  unconfirmedResolved: number
  outdatedCount: number
  outdatedResolved: number
  actionSummary: DailyReportItem[]
  operatorSummary: { name: string; role: string; count: number }[]
  pendingExceptionDetails: PendingExceptionDetail[]
}

export interface OperationLog {
  id: string
  recordId: string
  operator: string
  operatorRole: string
  action: string
  detail: string
  timestamp: string
}

export interface SignatureInfo {
  patientSignatureUrl: string | null
  doctorSignatureUrl: string | null
  informedContent: string
  templateVersion: string
  risks: string[]
}

export interface FilterState {
  dateStart: string
  dateEnd: string
  doctor: string
  treatmentItem: string
  patientName: string
  signStatus: SignStatus | ''
  archiveStatus: ArchiveStatus | ''
}

export interface ClosingCategory {
  key: string
  label: string
  icon: string
  color: string
  bgColor: string
  borderColor: string
}

export interface DailyReportItem {
  recordId: string
  patientName: string
  treatmentItem: string
  doctorName: string
  category: 'unsigned' | 'mismatch' | 'unconfirmed' | 'outdated'
  action: string
  operator: string
  operatorRole: string
  timestamp: string
  note: string
}

export interface DailyReport {
  id: string
  date: string
  generatedAt: string
  generatedBy: string
  generatedByRole: string
  totalRecords: number
  pendingExceptions: number
  unsignedCount: number
  unsignedResolved: number
  mismatchCount: number
  mismatchResolved: number
  unconfirmedCount: number
  unconfirmedResolved: number
  outdatedCount: number
  outdatedResolved: number
  actionSummary: DailyReportItem[]
  operatorSummary: { name: string; role: string; count: number }[]
}
