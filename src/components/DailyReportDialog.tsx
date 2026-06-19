import { useRef } from 'react'
import type { DailyReport } from '@/types'
import { X, Download, Printer, FileCheck } from 'lucide-react'

interface Props {
  open: boolean
  report: DailyReport | null
  history: DailyReport[]
  onClose: () => void
  onSelectHistory: (date: string) => void
  selectedDate: string
}

export default function DailyReportDialog({ open, report, history, onClose, onSelectHistory, selectedDate }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  if (!open) return null

  function formatDate(d: string) {
    return d.replace(/(\d{4})-(\d{2})-(\d{2})/, '$1年$2月$3日')
  }

  function formatDT(iso: string) {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  function handlePrint() {
    if (!printRef.current) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(`
      <!doctype html><html><head><title>关账日报 ${selectedDate}</title>
      <style>
        body{font-family:"Microsoft YaHei",sans-serif;padding:32px;color:#1B2A4A;max-width:900px;margin:auto}
        h1{font-size:22px;font-weight:600;text-align:center;margin:0 0 8px}
        .muted{color:#8E9BB5;font-size:12px;text-align:center;margin-bottom:24px}
        .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
        .cell{border:1px solid #E2E4EB;border-radius:6px;padding:12px}
        .cell .lbl{font-size:12px;color:#8E9BB5;margin-bottom:4px}
        .cell .val{font-size:18px;font-weight:700;color:#1B2A4A}
        .cell .s{font-size:11px;color:#34C759}
        table{width:100%;border-collapse:collapse;font-size:12px;margin-top:16px}
        th,td{border:1px solid #E2E4EB;padding:8px;text-align:left}
        th{background:#F5F6FA;font-weight:500;color:#576C92}
        .sec{font-size:14px;font-weight:600;margin:20px 0 8px;padding-bottom:4px;border-bottom:2px solid #1B2A4A}
        .ops{display:flex;gap:12px;flex-wrap:wrap}
        .op{background:#F5F6FA;padding:8px 12px;border-radius:6px;font-size:12px}
        .danger{color:#D32F2F}
        .warn{color:#D4913D}
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 300)
  }

  function handleExport() {
    if (!report) return
    const lines: string[] = []
    lines.push(`关账日报 - ${formatDate(selectedDate)}`)
    lines.push(`生成时间：${formatDT(report.generatedAt)}`)
    lines.push(`经办人：${report.generatedBy}（${report.generatedByRole}）`)
    lines.push('')
    lines.push(`总记录数：${report.totalRecords}`)
    lines.push(`未处理异常：${report.pendingExceptions}项`)
    lines.push(`未签署：${report.unsignedResolved}/${report.unsignedCount}  项目不一致：${report.mismatchResolved}/${report.mismatchCount}`)
    lines.push(`医生未确认：${report.unconfirmedResolved}/${report.unconfirmedCount}  模板过旧：${report.outdatedResolved}/${report.outdatedCount}`)
    lines.push('')
    if (report.pendingExceptionDetails && report.pendingExceptionDetails.length > 0) {
      lines.push('【未处理异常明细】')
      lines.push('患者,治疗项目,医生,问题类别,卡在哪一步,最后处理时间,催办次数,最后催办时间')
      report.pendingExceptionDetails.forEach(d => {
        lines.push([
          d.patientName,
          d.treatmentItem,
          d.doctorName,
          { unsigned: '未签署', mismatch: '项目不一致', unconfirmed: '医生未确认', outdated: '模板过旧' }[d.category],
          d.stuckStep,
          formatDT(d.lastActionAt),
          d.reminderCount,
          d.lastReminderAt ? formatDT(d.lastReminderAt) : '-',
        ].join(','))
      })
      lines.push('')
    }
    lines.push('【处理动作明细】')
    lines.push('时间,患者,治疗项目,医生,类别,处理动作,操作人,备注')
    report.actionSummary.forEach(a => {
      lines.push([
        formatDT(a.timestamp),
        a.patientName,
        a.treatmentItem,
        a.doctorName,
        { unsigned: '未签署', mismatch: '项目不一致', unconfirmed: '医生未确认', outdated: '模板过旧' }[a.category],
        a.action,
        `${a.operator}(${a.operatorRole})`,
        a.note || '',
      ].join(','))
    })
    lines.push('')
    lines.push('【经办人统计】')
    report.operatorSummary.forEach(o => {
      lines.push(`${o.name}(${o.role}),${o.count}次操作`)
    })
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `关账日报_${selectedDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const categoryLabel: Record<string, string> = {
    unsigned: '未签署',
    mismatch: '项目不一致',
    unconfirmed: '医生未确认',
    outdated: '模板过旧',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-8">
      <div className="fixed inset-0 bg-navy-900/40" onClick={onClose} />
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-lg shadow-xl flex flex-col animate-fade-in-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <FileCheck className="h-5 w-5 text-navy-500" />
            <span className="text-base font-semibold text-navy-500">关账日报</span>
            <span className="text-2xs text-navy-200 ml-1">{formatDate(selectedDate)}</span>
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <>
                <button className="btn-secondary text-xs" onClick={handleExport}>
                  <Download className="h-3.5 w-3.5" />
                  导出CSV
                </button>
                <button className="btn-primary text-xs" onClick={handlePrint}>
                  <Printer className="h-3.5 w-3.5" />
                  打印
                </button>
              </>
            )}
            <button className="rounded p-1 hover:bg-slate-100" onClick={onClose}>
              <X className="h-4 w-4 text-navy-300" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-44 border-r border-slate-100 flex-shrink-0 overflow-y-auto">
            <div className="px-4 py-3 border-b border-slate-100">
              <p className="text-2xs text-navy-200 mb-2">历史日报</p>
              <div className="space-y-1">
                {history.length === 0 && (
                  <p className="text-2xs text-navy-100">暂无历史</p>
                )}
                {history.slice().sort((a, b) => b.date.localeCompare(a.date)).map(h => (
                  <button
                    key={h.id}
                    className={`w-full text-left text-xs px-2.5 py-1.5 rounded ${
                      h.date === selectedDate ? 'bg-navy-500 text-white' : 'text-navy-300 hover:bg-slate-25'
                    }`}
                    onClick={() => onSelectHistory(h.date)}
                  >
                    {formatDate(h.date)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6" ref={printRef}>
            {report ? (
              <div>
                <h1 className="text-xl font-bold text-navy-500 text-center mb-1">关账日报</h1>
                <p className="text-xs text-navy-200 text-center mb-6">
                  {formatDate(report.date)} · 生成时间 {formatDT(report.generatedAt)} · 经办人 {report.generatedBy}（{report.generatedByRole}）
                </p>

                <div className="grid grid-cols-4 gap-3 mb-6">
                  {[
                    { lbl: '当日总记录', val: report.totalRecords },
                    { lbl: '未签署（完成/总数）', val: `${report.unsignedResolved}/${report.unsignedCount}` },
                    { lbl: '项目不一致', val: `${report.mismatchResolved}/${report.mismatchCount}` },
                    { lbl: '医生未确认', val: `${report.unconfirmedResolved}/${report.unconfirmedCount}` },
                  ].map((s, i) => (
                    <div key={i} className="border border-slate-100 rounded px-3 py-3">
                      <p className="text-2xs text-navy-200 mb-1">{s.lbl}</p>
                      <p className="text-base font-bold text-navy-500">{s.val}</p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="border border-slate-100 rounded px-3 py-3">
                    <p className="text-2xs text-navy-200 mb-1">模板过旧（完成/总数）</p>
                    <p className="text-base font-bold text-navy-500">{report.outdatedResolved}/{report.outdatedCount}</p>
                  </div>
                  <div className={`border rounded px-3 py-3 ${
                    report.pendingExceptions === 0
                      ? 'border-success-100 bg-success-50'
                      : 'border-danger-100 bg-danger-50'
                  }`}>
                    <p className={`text-2xs mb-1 ${report.pendingExceptions === 0 ? 'text-success-500' : 'text-danger-500'}`}>未处理异常</p>
                    <p className={`text-base font-bold ${report.pendingExceptions === 0 ? 'text-success-500' : 'text-danger-500'}`}>
                      {report.pendingExceptions === 0 ? '0 项 ✓' : `${report.pendingExceptions} 项`}
                    </p>
                  </div>
                  <div className={`border rounded px-3 py-3 ${
                    report.pendingExceptions === 0
                      ? 'border-success-100 bg-success-50'
                      : 'border-amber-100 bg-amber-50'
                  }`}>
                    <p className={`text-2xs mb-1 ${report.pendingExceptions === 0 ? 'text-success-500' : 'text-amber-400'}`}>关账结果</p>
                    <p className={`text-base font-bold ${report.pendingExceptions === 0 ? 'text-success-500' : 'text-amber-400'}`}>
                      {report.pendingExceptions === 0 ? '全部完成 ✓' : '待继续处理'}
                    </p>
                  </div>
                </div>

                {report.pendingExceptionDetails && report.pendingExceptionDetails.length > 0 && (
                  <>
                    <p className="text-sm font-semibold text-danger-500 pb-1 border-b-2 border-danger-200 mb-3 inline-block">未处理异常明细</p>
                    <div className="overflow-x-auto mb-6">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-danger-50">
                            <th className="px-2 py-2 text-left font-medium text-danger-500">患者</th>
                            <th className="px-2 py-2 text-left font-medium text-danger-500">治疗项目</th>
                            <th className="px-2 py-2 text-left font-medium text-danger-500">医生</th>
                            <th className="px-2 py-2 text-left font-medium text-danger-500">问题类别</th>
                            <th className="px-2 py-2 text-left font-medium text-danger-500">卡在哪一步</th>
                            <th className="px-2 py-2 text-left font-medium text-danger-500">最后处理时间</th>
                            <th className="px-2 py-2 text-left font-medium text-danger-500">催办</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.pendingExceptionDetails.map((d, i) => (
                            <tr key={i} className="border-t border-danger-50">
                              <td className="px-2 py-1.5 text-navy-500">{d.patientName}</td>
                              <td className="px-2 py-1.5 text-navy-400">{d.treatmentItem}</td>
                              <td className="px-2 py-1.5 text-navy-400">{d.doctorName}</td>
                              <td className="px-2 py-1.5 text-navy-300">{categoryLabel[d.category]}</td>
                              <td className="px-2 py-1.5 text-amber-500 font-medium">{d.stuckStep}</td>
                              <td className="px-2 py-1.5 text-navy-300">{formatDT(d.lastActionAt)}</td>
                              <td className="px-2 py-1.5">
                                {d.reminderCount > 0 ? (
                                  <span className="text-danger-500 font-medium">
                                    已催{d.reminderCount}次 · 最后{formatDT(d.lastReminderAt!)}
                                  </span>
                                ) : (
                                  <span className="text-navy-200">未催办</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                <p className="text-sm font-semibold text-navy-500 pb-1 border-b-2 border-navy-500 mb-3 inline-block">处理动作明细</p>
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="px-2 py-2 text-left font-medium text-navy-300">时间</th>
                        <th className="px-2 py-2 text-left font-medium text-navy-300">患者</th>
                        <th className="px-2 py-2 text-left font-medium text-navy-300">治疗项目</th>
                        <th className="px-2 py-2 text-left font-medium text-navy-300">医生</th>
                        <th className="px-2 py-2 text-left font-medium text-navy-300">问题类别</th>
                        <th className="px-2 py-2 text-left font-medium text-navy-300">处理动作</th>
                        <th className="px-2 py-2 text-left font-medium text-navy-300">操作人</th>
                        <th className="px-2 py-2 text-left font-medium text-navy-300">备注</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.actionSummary.length === 0 && (
                        <tr><td colSpan={8} className="px-2 py-6 text-center text-xs text-navy-200">当日无处理动作</td></tr>
                      )}
                      {report.actionSummary.map((a, i) => (
                        <tr key={i} className="border-t border-slate-75">
                          <td className="px-2 py-1.5 text-navy-300">{formatDT(a.timestamp)}</td>
                          <td className="px-2 py-1.5 text-navy-500">{a.patientName}</td>
                          <td className="px-2 py-1.5 text-navy-400">{a.treatmentItem}</td>
                          <td className="px-2 py-1.5 text-navy-400">{a.doctorName}</td>
                          <td className="px-2 py-1.5 text-navy-300">{categoryLabel[a.category]}</td>
                          <td className="px-2 py-1.5 text-navy-500 font-medium">{a.action}</td>
                          <td className="px-2 py-1.5 text-navy-300">{a.operator}</td>
                          <td className="px-2 py-1.5 text-navy-200">{a.note || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="text-sm font-semibold text-navy-500 pb-1 border-b-2 border-navy-500 mb-3 inline-block">经办人统计</p>
                <div className="flex flex-wrap gap-3">
                  {report.operatorSummary.length === 0 && (
                    <p className="text-xs text-navy-200">当日无操作记录</p>
                  )}
                  {report.operatorSummary.map((o, i) => (
                    <div key={i} className="bg-slate-50 px-3 py-2 rounded">
                      <p className="text-xs text-navy-500 font-medium">{o.name}</p>
                      <p className="text-2xs text-navy-200">{o.role} · {o.count}次操作</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <FileCheck className="h-12 w-12 text-navy-100 mb-3" />
                <p className="text-sm text-navy-300 mb-1">当日关账尚未完成</p>
                <p className="text-xs text-navy-200">请先完成四类待办项后生成日报</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
