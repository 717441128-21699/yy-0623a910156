import { useState } from 'react'
import { useAppStore } from '@/store'
import { useNavigate } from 'react-router-dom'
import { FileCheck, XCircle, AlertTriangle, ChevronDown, ChevronRight, CheckCircle2, PenTool, Stethoscope, FileText, Calendar, FileDown, CheckSquare, Send } from 'lucide-react'
import type { ConsentRecord } from '@/types'
import type { ExceptionType } from '@/types'
import DailyReportDialog from '@/components/DailyReportDialog'
import NoteDialog from '@/components/NoteDialog'

interface CategoryDef {
  key: string
  label: string
  icon: typeof XCircle
  color: string
  bgColor: string
  dotColor: string
  barColor: string
}

const categories: CategoryDef[] = [
  { key: 'unsigned', label: '未签署同意书', icon: PenTool, color: 'text-danger-500', bgColor: 'bg-danger-50', dotColor: 'bg-danger-400', barColor: 'bg-danger-400' },
  { key: 'mismatch', label: '项目不一致', icon: AlertTriangle, color: 'text-amber-400', bgColor: 'bg-amber-50', dotColor: 'bg-amber-400', barColor: 'bg-amber-400' },
  { key: 'unconfirmed', label: '医生未确认', icon: Stethoscope, color: 'text-navy-400', bgColor: 'bg-navy-50', dotColor: 'bg-navy-300', barColor: 'bg-navy-400' },
  { key: 'outdated', label: '模板版本过旧', icon: FileText, color: 'text-navy-200', bgColor: 'bg-slate-25', dotColor: 'bg-navy-100', barColor: 'bg-navy-200' },
]

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface PendingMark {
  type: 'mismatch' | 'unconfirmed' | 'resigned' | 'noted' | 'offline'
  id: string
  exceptionId?: string
  title: string
  label: string
}

export default function ClosingView() {
  const {
    getClosingData, dailyReports, getReportByDate, generateDailyReport,
    exceptions, flowRecords, markMismatchHandled, markUnconfirmedHandled,
    markPatientResigned, markDoctorNoted, markOfflineArchivedWithNote
  } = useAppStore()

  const navigate = useNavigate()
  const [closingDate, setClosingDate] = useState<string>(todayStr())
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [reportOpen, setReportOpen] = useState(false)
  const [pendingMark, setPendingMark] = useState<PendingMark | null>(null)

  const closingData = getClosingData(closingDate)
  const existingReport = getReportByDate(closingDate)

  const sections: { def: CategoryDef; records: ConsentRecord[]; resolved: number }[] = [
    { def: categories[0], records: closingData.unsigned, resolved: closingData.unsignedResolved },
    { def: categories[1], records: closingData.mismatch, resolved: closingData.mismatchResolved },
    { def: categories[2], records: closingData.unconfirmed, resolved: closingData.unconfirmedResolved },
    { def: categories[3], records: closingData.outdated, resolved: closingData.outdatedResolved },
  ]

  const totalItems = sections.reduce((s, sec) => s + sec.records.length, 0)
  const totalResolved = sections.reduce((s, sec) => s + sec.resolved, 0)
  const totalProgress = totalItems > 0 ? Math.round((totalResolved / totalItems) * 100) : 100
  const allDone = closingData.allResolved

  const dateObj = new Date(closingDate + 'T00:00:00')
  const dateStr = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日`

  function isResolvedForRecord(r: ConsentRecord, catKey: string): boolean {
    switch (catKey) {
      case 'unsigned':
        if (r.signStatus === 'signed') return true
        if (r.archiveStatus === 'offline_archived' || r.archiveStatus === 'archived') return true
        if (flowRecords.some(f => f.recordId === r.id && f.action === '标记患者已补签')) return true
        const ex1 = exceptions.find(e => e.recordId === r.id && e.type === 'missing_patient_signature')
        return ex1?.status === 'resolved'
      case 'mismatch':
        if (r.treatmentItem === r.chargeItem) return true
        if (r.archiveStatus === 'offline_archived' || r.archiveStatus === 'archived') return true
        if (r.mismatchHandled) return true
        return flowRecords.some(f => f.recordId === r.id && f.action === '标记项目已核对')
      case 'unconfirmed':
        if (r.doctorConfirmed) return true
        if (r.archiveStatus === 'offline_archived' || r.archiveStatus === 'archived') return true
        if (r.unconfirmedHandled) return true
        const ex2 = exceptions.find(e => e.recordId === r.id && e.type === 'missing_doctor_note')
        if (ex2?.status === 'resolved') return true
        return flowRecords.some(f => f.recordId === r.id && f.action === '标记医生已补说明')
      case 'outdated':
        if (r.exceptionType !== 'outdated_template') return true
        if (r.archiveStatus === 'offline_archived' || r.archiveStatus === 'archived') return true
        const ex3 = exceptions.find(e => e.recordId === r.id && e.type === 'outdated_template')
        return ex3?.status === 'resolved'
      default:
        return false
    }
  }

  function findException(r: ConsentRecord, type: ExceptionType) {
    return exceptions.find(e => e.recordId === r.id && e.type === type)
  }

  function handleQuickMark(r: ConsentRecord, cat: string) {
    if (cat === 'mismatch') {
      setPendingMark({ type: 'mismatch', id: r.id, title: '标记项目已核对', label: '确认核对' })
    } else if (cat === 'unconfirmed') {
      const ex = findException(r, 'missing_doctor_note')
      if (ex) {
        setPendingMark({ type: 'noted', id: r.id, exceptionId: ex.id, title: '标记医生已补说明', label: '确认标记' })
      } else {
        setPendingMark({ type: 'unconfirmed', id: r.id, title: '标记医生已补说明', label: '确认标记' })
      }
    } else if (cat === 'unsigned') {
      const ex = findException(r, 'missing_patient_signature')
      if (ex) {
        setPendingMark({ type: 'resigned', id: r.id, exceptionId: ex.id, title: '标记患者已补签', label: '确认标记' })
      }
    } else if (cat === 'outdated') {
      const ex = findException(r, 'outdated_template')
      if (ex) {
        setPendingMark({ type: 'offline', id: r.id, exceptionId: ex.id, title: '标记线下纸质归档', label: '确认归档' })
      }
    }
  }

  function handleNoteConfirm(note: string) {
    if (!pendingMark) return
    switch (pendingMark.type) {
      case 'mismatch':
        markMismatchHandled(pendingMark.id, note)
        break
      case 'unconfirmed':
        markUnconfirmedHandled(pendingMark.id, note)
        break
      case 'resigned':
        if (pendingMark.exceptionId) markPatientResigned(pendingMark.exceptionId, note)
        break
      case 'noted':
        if (pendingMark.exceptionId) markDoctorNoted(pendingMark.exceptionId, note)
        break
      case 'offline':
        if (pendingMark.exceptionId) markOfflineArchivedWithNote(pendingMark.exceptionId, note)
        break
    }
    setPendingMark(null)
  }

  function handleGenerateReport() {
    generateDailyReport(closingDate, '张管理', '病案管理员')
    setReportOpen(true)
  }

  function handleViewReport() {
    setReportOpen(true)
  }

  return (
    <div className="card px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <FileCheck className="h-4.5 w-4.5 text-navy-400" />
          <span className="text-sm font-semibold text-navy-500">关账视图</span>
          <div className="flex items-center gap-1.5 bg-slate-25 border border-slate-100 rounded px-2 py-1">
            <Calendar className="h-3.5 w-3.5 text-navy-200" />
            <input
              type="date"
              value={closingDate}
              onChange={(e) => {
                setClosingDate(e.target.value)
                setExpandedKey(null)
              }}
              className="bg-transparent border-0 text-xs text-navy-400 focus:outline-none w-[120px] text-center"
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-navy-200">关账进度</span>
            <div className="w-32 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-success-400' : 'bg-navy-400'}`}
                style={{ width: `${totalProgress}%` }}
              />
            </div>
            <span className={`text-xs font-semibold ${allDone ? 'text-success-500' : 'text-navy-400'}`}>{totalProgress}%</span>
          </div>
          {allDone ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-2xs text-success-500 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                可关账
              </span>
              {existingReport ? (
                <button className="btn-secondary text-xs" onClick={handleViewReport}>
                  <FileDown className="h-3.5 w-3.5" />
                  查看日报
                </button>
              ) : (
                <button className="btn-success text-xs" onClick={handleGenerateReport}>
                  <CheckSquare className="h-3.5 w-3.5" />
                  生成并查看日报
                </button>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 text-2xs text-navy-200">
              <Send className="h-3 w-3" />
              {closingData.totalRecordsOnDate}条记录，{totalResolved}/{totalItems}已处理
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {sections.map((section) => {
          const isExpanded = expandedKey === section.def.key
          const count = section.records.length
          const resolved = section.resolved
          const progress = count > 0 ? Math.round((resolved / count) * 100) : 100
          const allDoneSec = count === 0 || progress === 100
          return (
            <div key={section.def.key} className={`rounded-lg border ${isExpanded ? 'border-slate-100' : 'border-transparent'}`}>
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-25 transition-colors text-left"
                onClick={() => setExpandedKey(isExpanded ? null : section.def.key)}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-md ${section.def.bgColor}`}>
                  <section.def.icon className={`h-3.5 w-3.5 ${section.def.color}`} />
                </div>
                <span className={`text-xs font-medium flex-1 ${allDoneSec ? 'text-navy-200' : 'text-navy-500'}`}>
                  {section.def.label}
                </span>
                {allDoneSec ? (
                  <CheckCircle2 className="h-4 w-4 text-success-400" />
                ) : (
                  <span className="text-xs text-navy-300">
                    {resolved}/{count} 已处理
                  </span>
                )}
                <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${allDoneSec ? 'bg-success-400' : section.def.barColor}`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-navy-200" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-navy-200" />
                )}
              </button>

              {isExpanded && (
                <div className="px-3 pb-2 animate-fade-in-up">
                  {section.records.length === 0 ? (
                    <div className="flex items-center gap-2 py-3 pl-10">
                      <CheckCircle2 className="h-4 w-4 text-success-400" />
                      <span className="text-xs text-navy-300">该类别无待办项</span>
                    </div>
                  ) : (
                    <div className="pl-10 space-y-0.5">
                      {section.records.map((r) => {
                        const resolved = isResolvedForRecord(r, section.def.key)
                        return (
                          <div
                            key={r.id}
                            className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-slate-25 transition-colors"
                          >
                            <span className={`status-dot ${resolved ? 'bg-success-400' : section.def.dotColor}`} />
                            <span className="text-xs text-navy-400 w-16 cursor-pointer" onClick={() => navigate(`/detail/${r.id}`)}>{r.id}</span>
                            <span className="text-xs text-navy-500 w-16 cursor-pointer" onClick={() => navigate(`/detail/${r.id}`)}>{r.patientName}</span>
                            <span className="text-xs text-navy-300 flex-1 cursor-pointer" onClick={() => navigate(`/detail/${r.id}`)}>{r.treatmentItem}</span>
                            <span className="text-xs text-navy-300 w-16">{r.doctorName}</span>
                            {resolved ? (
                              <span className="badge bg-success-50 text-success-500">已处理</span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={`badge ${section.def.bgColor} ${section.def.color}`}>待处理</span>
                                <button
                                  className="btn-secondary text-[11px] py-1 px-2"
                                  onClick={(e) => { e.stopPropagation(); handleQuickMark(r, section.def.key) }}
                                >
                                  快速处理
                                </button>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <DailyReportDialog
        open={reportOpen}
        report={existingReport || getReportByDate(closingDate) || null}
        history={dailyReports}
        selectedDate={closingDate}
        onClose={() => setReportOpen(false)}
        onSelectHistory={(d) => setClosingDate(d)}
      />

      <NoteDialog
        open={pendingMark !== null}
        title={pendingMark?.title || ''}
        actionLabel={pendingMark?.label || ''}
        onClose={() => setPendingMark(null)}
        onConfirm={handleNoteConfirm}
      />
    </div>
  )
}
