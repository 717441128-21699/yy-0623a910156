import { useState } from 'react'
import { useAppStore } from '@/store'
import { useNavigate } from 'react-router-dom'
import { FileCheck, XCircle, AlertTriangle, Clock, ChevronDown, ChevronRight, CheckCircle2, PenTool, Stethoscope, FileText } from 'lucide-react'
import type { ConsentRecord } from '@/types'

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

export default function ClosingView() {
  const { getClosingData } = useAppStore()
  const closingData = getClosingData()
  const navigate = useNavigate()
  const [expandedKey, setExpandedKey] = useState<string | null>(null)

  const sections: { def: CategoryDef; records: ConsentRecord[]; resolved: number }[] = [
    { def: categories[0], records: closingData.unsigned, resolved: closingData.unsignedResolved },
    { def: categories[1], records: closingData.mismatch, resolved: closingData.mismatchResolved },
    { def: categories[2], records: closingData.unconfirmed, resolved: closingData.unconfirmedResolved },
    { def: categories[3], records: closingData.outdated, resolved: closingData.outdatedResolved },
  ]

  const totalItems = sections.reduce((s, sec) => s + sec.records.length, 0)
  const totalResolved = sections.reduce((s, sec) => s + sec.resolved, 0)
  const totalProgress = totalItems > 0 ? Math.round((totalResolved / totalItems) * 100) : 100

  const today = new Date()
  const dateStr = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`

  return (
    <div className="card px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileCheck className="h-4.5 w-4.5 text-navy-400" />
          <span className="text-sm font-semibold text-navy-500">今日关账视图</span>
          <span className="text-2xs text-navy-200 ml-1">{dateStr}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-navy-200">关账进度</span>
            <div className="w-32 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${totalProgress === 100 ? 'bg-success-400' : 'bg-navy-400'}`}
                style={{ width: `${totalProgress}%` }}
              />
            </div>
            <span className={`text-xs font-semibold ${totalProgress === 100 ? 'text-success-500' : 'text-navy-400'}`}>{totalProgress}%</span>
          </div>
          {totalProgress === 100 && (
            <span className="inline-flex items-center gap-1 text-2xs text-success-500 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              可关账
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
          const allDone = count === 0 || progress === 100

          return (
            <div key={section.def.key} className={`rounded-lg border ${isExpanded ? 'border-slate-100' : 'border-transparent'}`}>
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-25 transition-colors text-left"
                onClick={() => setExpandedKey(isExpanded ? null : section.def.key)}
              >
                <div className={`flex h-7 w-7 items-center justify-center rounded-md ${section.def.bgColor}`}>
                  <section.def.icon className={`h-3.5 w-3.5 ${section.def.color}`} />
                </div>
                <span className={`text-xs font-medium flex-1 ${allDone ? 'text-navy-200' : 'text-navy-500'}`}>
                  {section.def.label}
                </span>
                {allDone ? (
                  <CheckCircle2 className="h-4 w-4 text-success-400" />
                ) : (
                  <span className="text-xs text-navy-300">
                    {resolved}/{count} 已处理
                  </span>
                )}
                <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-success-400' : section.def.barColor}`}
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
                        const exResolved = r.archiveStatus === 'offline_archived' || r.archiveStatus === 'archived'
                        return (
                          <div
                            key={r.id}
                            className="flex items-center gap-3 py-1.5 px-2 rounded hover:bg-slate-25 cursor-pointer transition-colors"
                            onClick={() => navigate(`/detail/${r.id}`)}
                          >
                            <span className={`status-dot ${exResolved ? 'bg-success-400' : section.def.dotColor}`} />
                            <span className="text-xs text-navy-400 w-16">{r.id}</span>
                            <span className="text-xs text-navy-500 w-16">{r.patientName}</span>
                            <span className="text-xs text-navy-300 flex-1">{r.treatmentItem}</span>
                            <span className="text-xs text-navy-300">{r.doctorName}</span>
                            {exResolved ? (
                              <span className="badge bg-success-50 text-success-500">已处理</span>
                            ) : (
                              <span className={`badge ${section.def.bgColor} ${section.def.color}`}>待处理</span>
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
    </div>
  )
}
