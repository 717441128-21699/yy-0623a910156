import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { BarChart3, Calendar, ArrowLeft, CheckCircle2, XCircle, Clock, User, Stethoscope, FileText, AlertTriangle, Bell, ExternalLink } from 'lucide-react'

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ReviewDashboard() {
  const navigate = useNavigate()
  const { getReviewDashboard, getReportByDate, dailyReports, getClosingData, exceptions, flowRecords, records } = useAppStore()
  const [mode, setMode] = useState<'week' | 'month'>('week')
  const [anchorDate, setAnchorDate] = useState<string>(todayStr())

  const dashboard = getReviewDashboard(mode, anchorDate)
  const maxTrendVal = Math.max(1, ...dashboard.categoryTrend.flatMap(d => [d.unsigned, d.mismatch, d.unconfirmed, d.outdated]))

  function handlePrev() {
    const d = new Date(anchorDate + 'T00:00:00')
    d.setDate(d.getDate() - (mode === 'week' ? 7 : 30))
    setAnchorDate(d.toISOString().slice(0, 10))
  }

  function handleNext() {
    const d = new Date(anchorDate + 'T00:00:00')
    d.setDate(d.getDate() + (mode === 'week' ? 7 : 30))
    setAnchorDate(d.toISOString().slice(0, 10))
  }

  function handleDayClick(date: string) {
    navigate('/review')
    setTimeout(() => {
      const closing = getClosingData(date)
      const report = dailyReports.find(dr => dr.date === date)
      const evt = new CustomEvent('navigate-to-date', {
        detail: { date, openReport: !!report && closing.allResolved }
      })
      window.dispatchEvent(evt)
    }, 50)
  }

  const categoryColorMap: Record<string, string> = {
    unsigned: 'bg-danger-400',
    mismatch: 'bg-amber-400',
    unconfirmed: 'bg-navy-400',
    outdated: 'bg-navy-200',
  }

  const categoryLabelMap: Record<string, string> = {
    unsigned: '未签署',
    mismatch: '项目不一致',
    unconfirmed: '医生未确认',
    outdated: '模板过旧',
  }

  const anchorObj = new Date(anchorDate + 'T00:00:00')
  const startObj = new Date(anchorObj)
  startObj.setDate(startObj.getDate() - (mode === 'week' ? 6 : 29))
  const rangeLabel = `${startObj.getFullYear()}年${startObj.getMonth() + 1}月${startObj.getDate()}日 - ${anchorObj.getFullYear()}年${anchorObj.getMonth() + 1}月${anchorObj.getDate()}日`

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors"
            onClick={() => navigate('/review')}
          >
            <ArrowLeft className="h-4.5 w-4.5 text-navy-300" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-navy-500">关账复盘看板</h2>
            <p className="text-xs text-navy-200 mt-0.5">按周或月查看关账完成情况和异常趋势</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-25 rounded-lg border border-slate-100">
            <button
              className={`text-xs px-3 py-1.5 rounded-l-lg transition-colors ${mode === 'week' ? 'bg-navy-500 text-white' : 'text-navy-300 hover:text-navy-500'}`}
              onClick={() => setMode('week')}
            >
              按周
            </button>
            <button
              className={`text-xs px-3 py-1.5 rounded-r-lg transition-colors ${mode === 'month' ? 'bg-navy-500 text-white' : 'text-navy-300 hover:text-navy-500'}`}
              onClick={() => setMode('month')}
            >
              按月
            </button>
          </div>
          <div className="flex items-center gap-1 bg-slate-25 border border-slate-100 rounded px-2 py-1">
            <button className="text-navy-300 hover:text-navy-500 p-1" onClick={handlePrev}>
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <Calendar className="h-3.5 w-3.5 text-navy-200 mx-1" />
            <span className="text-xs text-navy-400 w-[240px] text-center">{rangeLabel}</span>
            <button className="text-navy-300 hover:text-navy-500 p-1" onClick={handleNext}>
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="card px-5 py-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-navy-300" />
          <span className="text-sm font-medium text-navy-500">每日关账完成情况</span>
          <span className="text-2xs text-navy-200 ml-2">点击可跳转至当日关账视图</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {dashboard.days.map((day) => {
            const hasRecords = day.totalRecords > 0
            return (
              <button
                key={day.date}
                className={`p-3 rounded-lg border transition-all text-left ${
                  day.closed && hasRecords
                    ? 'border-success-200 bg-success-50 hover:bg-success-100'
                    : !hasRecords
                    ? 'border-slate-75 bg-slate-25 opacity-50 cursor-not-allowed'
                    : 'border-amber-100 bg-amber-50 hover:bg-amber-100'
                }`}
                onClick={() => hasRecords && handleDayClick(day.date)}
                disabled={!hasRecords}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-navy-500">{day.label}</span>
                  {hasRecords ? (
                    day.closed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success-500" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-amber-400" />
                    )
                  ) : (
                    <Clock className="h-3.5 w-3.5 text-navy-100" />
                  )}
                </div>
                <div className="text-2xs text-navy-200 mb-1">
                  {hasRecords ? `${day.totalRecords}条记录` : '无记录'}
                </div>
                {hasRecords && day.pendingExceptions > 0 && (
                  <div className="text-2xs text-amber-500 font-medium">
                    {day.pendingExceptions}项待处理
                  </div>
                )}
                {hasRecords && day.closed && (
                  <div className="text-2xs text-success-500 font-medium">已完成关账</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-5">
        <div className="card px-5 py-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-navy-500">异常类别趋势</span>
          </div>
          <div className="space-y-2">
            {dashboard.categoryTrend.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-2xs text-navy-200 w-12 flex-shrink-0">{row.date}</span>
                <div className="flex-1 flex gap-0.5 h-5">
                  {(['unsigned', 'mismatch', 'unconfirmed', 'outdated'] as const).map((cat) => {
                    const val = row[cat]
                    const pct = maxTrendVal > 0 ? (val / maxTrendVal) * 100 : 0
                    return (
                      <div
                        key={cat}
                        className={`${categoryColorMap[cat]} rounded-sm opacity-80`}
                        style={{ width: pct > 0 ? `${Math.max(pct, 2)}%` : '0' }}
                        title={`${categoryLabelMap[cat]}: ${val}项`}
                      />
                    )
                  })}
                </div>
                <span className="text-2xs text-navy-100 w-8 text-right">
                  {row.unsigned + row.mismatch + row.unconfirmed + row.outdated}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-75">
            {(['unsigned', 'mismatch', 'unconfirmed', 'outdated'] as const).map((cat) => (
              <div key={cat} className="flex items-center gap-1.5">
                <div className={`h-2.5 w-2.5 rounded ${categoryColorMap[cat]}`} />
                <span className="text-2xs text-navy-300">{categoryLabelMap[cat]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card px-5 py-4">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-navy-300" />
            <span className="text-sm font-medium text-navy-500">医生维度异常统计</span>
          </div>
          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
            {dashboard.doctorStats.length === 0 ? (
              <p className="text-xs text-navy-200 text-center py-4">暂无数据</p>
            ) : (
              dashboard.doctorStats.map((doc, i) => {
                const pct = doc.total > 0 ? Math.round((doc.resolved / doc.total) * 100) : 100
                return (
                  <div key={i} className="flex items-center gap-3 py-1 border-b border-slate-75 last:border-0">
                    <div className="w-6 h-6 rounded-full bg-navy-100 flex items-center justify-center text-2xs font-semibold text-navy-500 flex-shrink-0">
                      {doc.name.slice(0, 1)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium text-navy-500">{doc.name}</span>
                        <span className="text-2xs text-navy-200">{doc.resolved}/{doc.total} 已处理</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${pct === 100 ? 'bg-success-400' : 'bg-navy-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex gap-1.5 mt-1">
                        {(['unsigned', 'mismatch', 'unconfirmed', 'outdated'] as const).map((cat) => (
                          doc.categories[cat] > 0 && (
                            <span key={cat} className="text-[10px] text-navy-200">
                              {categoryLabelMap[cat]} {doc.categories[cat]}
                            </span>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      <div className="card px-5 py-4">
        <div className="flex items-center gap-2 mb-4">
          <Stethoscope className="h-4 w-4 text-navy-300" />
          <span className="text-sm font-medium text-navy-500">治疗项目维度异常统计</span>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {dashboard.itemStats.length === 0 ? (
            <div className="col-span-4 text-center py-4 text-xs text-navy-200">暂无数据</div>
          ) : (
            dashboard.itemStats.slice(0, 8).map((item, i) => {
              const pct = item.total > 0 ? Math.round((item.resolved / item.total) * 100) : 100
              return (
                <div key={i} className="border border-slate-100 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-navy-500 truncate">{item.name}</span>
                    <span className={`text-2xs font-semibold ${pct === 100 ? 'text-success-500' : 'text-navy-400'}`}>
                      {pct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mb-1">
                    <div
                      className={`h-full rounded-full ${pct === 100 ? 'bg-success-400' : 'bg-amber-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-2xs text-navy-200">
                    共 {item.total} 项，已处理 {item.resolved}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      <ReminderEfficiencyView />
    </div>
  )
}

function ReminderEfficiencyView() {
  const navigate = useNavigate()
  const { exceptions, flowRecords, records } = useAppStore()

  interface OverdueItem {
    exception: typeof exceptions[0]
    mainFlow: typeof flowRecords[0]
    overdueDays: number
    reminderCount: number
    lastReminderAt: string | null
  }

  const overdueItems: OverdueItem[] = exceptions
    .filter(ex => ex.status !== 'resolved')
    .map(ex => {
      const mainFlow = flowRecords.find(f =>
        f.exceptionId === ex.id &&
        (f.action === '发送补签链接' || f.action === '退回医生补备注')
      )
      if (!mainFlow) return null
      const hoursSince = (Date.now() - new Date(mainFlow.timestamp).getTime()) / (1000 * 60 * 60)
      const overdueDays = Math.floor(hoursSince / 24)
      if (overdueDays < 1) return null
      const reminders = flowRecords.filter(f =>
        f.exceptionId === ex.id &&
        (f.action === '再次发送补签提醒' || f.action === '再次提醒医生补备注')
      )
      const lastReminder = reminders.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0]
      return {
        exception: ex,
        mainFlow,
        overdueDays,
        reminderCount: mainFlow.reminderCount || reminders.length,
        lastReminderAt: lastReminder?.timestamp || mainFlow.lastReminderAt || null,
      }
    })
    .filter((item): item is OverdueItem => item !== null)

  const doctorOverdue = new Map<string, { name: string; count: number; totalReminders: number; maxOverdue: number }>()
  overdueItems.forEach(item => {
    const existing = doctorOverdue.get(item.exception.doctorName) || {
      name: item.exception.doctorName, count: 0, totalReminders: 0, maxOverdue: 0,
    }
    existing.count += 1
    existing.totalReminders += item.reminderCount
    existing.maxOverdue = Math.max(existing.maxOverdue, item.overdueDays)
    doctorOverdue.set(item.exception.doctorName, existing)
  })

  return (
    <div className="card px-5 py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-danger-400" />
          <span className="text-sm font-medium text-navy-500">催办效率追踪</span>
          <span className="text-2xs text-navy-200 ml-1">超1天未闭环的待办事项</span>
        </div>
        {overdueItems.length > 0 && (
          <span className="badge bg-danger-50 text-danger-500">{overdueItems.length}项超期</span>
        )}
      </div>

      {overdueItems.length === 0 ? (
        <div className="text-center py-6">
          <CheckCircle2 className="h-8 w-8 text-success-300 mx-auto mb-2" />
          <p className="text-xs text-navy-300">暂无超期未闭环事项</p>
          <p className="text-2xs text-navy-200 mt-0.5">所有已发出的补签/退回均在1天内完成</p>
        </div>
      ) : (
        <>
          {doctorOverdue.size > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {Array.from(doctorOverdue.values()).sort((a, b) => b.maxOverdue - a.maxOverdue).map(doc => (
                <div key={doc.name} className="flex items-center gap-2 bg-danger-50 border border-danger-100 rounded-lg px-3 py-2">
                  <div className="w-5 h-5 rounded-full bg-danger-400 flex items-center justify-center text-[10px] font-bold text-white">
                    {doc.name.slice(0, 1)}
                  </div>
                  <div>
                    <span className="text-xs font-medium text-danger-500">{doc.name}</span>
                    <span className="text-2xs text-danger-400 ml-1.5">{doc.count}项超期 · 最多{doc.maxOverdue}天</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-danger-50">
                  <th className="px-2 py-2 text-left font-medium text-danger-500">患者</th>
                  <th className="px-2 py-2 text-left font-medium text-danger-500">治疗项目</th>
                  <th className="px-2 py-2 text-left font-medium text-danger-500">医生</th>
                  <th className="px-2 py-2 text-left font-medium text-danger-500">异常类型</th>
                  <th className="px-2 py-2 text-left font-medium text-danger-500">超期天数</th>
                  <th className="px-2 py-2 text-left font-medium text-danger-500">催办次数</th>
                  <th className="px-2 py-2 text-left font-medium text-danger-500">最后催办</th>
                  <th className="px-2 py-2 text-left font-medium text-danger-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {overdueItems
                  .sort((a, b) => b.overdueDays - a.overdueDays)
                  .map(item => {
                    const typeLabel = item.exception.type === 'missing_patient_signature'
                      ? '待补患者签名' : item.exception.type === 'missing_doctor_note'
                      ? '待补医生说明' : '模板过旧'
                    return (
                      <tr key={item.exception.id} className="border-t border-danger-50">
                        <td className="px-2 py-2 text-navy-500 font-medium">{item.exception.patientName}</td>
                        <td className="px-2 py-2 text-navy-400">{item.exception.treatmentItem}</td>
                        <td className="px-2 py-2 text-navy-400">{item.exception.doctorName}</td>
                        <td className="px-2 py-2 text-navy-300">{typeLabel}</td>
                        <td className="px-2 py-2">
                          <span className={`font-semibold ${item.overdueDays >= 3 ? 'text-danger-500' : item.overdueDays >= 2 ? 'text-amber-500' : 'text-navy-400'}`}>
                            {item.overdueDays}天
                          </span>
                        </td>
                        <td className="px-2 py-2">
                          {item.reminderCount > 0 ? (
                            <span className="text-amber-500 font-medium">{item.reminderCount}次</span>
                          ) : (
                            <span className="text-navy-200">未催办</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-navy-300">
                          {item.lastReminderAt
                            ? new Date(item.lastReminderAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                            : '-'
                          }
                        </td>
                        <td className="px-2 py-2">
                          <button
                            className="inline-flex items-center gap-1 text-2xs text-navy-400 hover:text-navy-500 font-medium"
                            onClick={() => navigate('/exceptions')}
                          >
                            <ExternalLink className="h-3 w-3" />
                            去处理
                          </button>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
