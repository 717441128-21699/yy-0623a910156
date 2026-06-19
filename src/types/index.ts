export type SignStatus = 'signed' | 'unsigned' | 'partial'
export type ExceptionType = 'missing_patient_signature' | 'missing_doctor_note' | 'outdated_template'
export type ArchiveStatus = 'pending' | 'archived' | 'offline_archived'
export type Urgency = 'high' | 'medium' | 'low'
export type ExceptionStatus = 'pending' | 'processing' | 'resolved'

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
