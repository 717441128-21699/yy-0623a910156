import { useAppStore } from '@/store'
import { doctors, treatmentItems } from '@/utils/mockData'
import { ClipboardCheck, FileCheck, AlertTriangle, Archive, Search, RotateCcw, Download, CheckSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { SignStatus, ArchiveStatus } from '@/types'
import { useState } from 'react'

const signStatusMap: Record<SignStatus, { label: string; color: string }> = {
  signed: { label: '已签署', color: 'bg-success-400' },
  unsigned: { label: '未签署', color: 'bg-danger-400' },
  partial: { label: '部分签署', color: 'bg-amber-400' },
}

const archiveStatusMap: Record<ArchiveStatus, { label: string; color: string; bg: string }> = {
  pending: { label: '待归档', color: 'text-amber-400', bg: 'bg-amber-50' },
  archived: { label: '已归档', color: 'text-success-500', bg: 'bg-success-50' },
  offline_archived: { label: '纸质归档', color: 'text-navy-300', bg: 'bg-navy-50' },
}

const exceptionLabelMap: Record<string, string> = {
  missing_patient_signature: '缺患者签名',
  missing_doctor_note: '缺医生说明',
  outdated_template: '模板过旧',
}

export default function ReviewPage() {
  const { filters, setFilters, resetFilters, getFilteredRecords, getStats, selectedRecords, toggleSelectRecord, toggleSelectAll, batchArchive, clearSelection } = useAppStore()
  const navigate = useNavigate()
  const filtered = getFilteredRecords()
  const stats = getStats()
  const [page, setPage] = useState(1)
  const pageSize = 12
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const allPageIds = paged.map((r) => r.id)
  const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedRecords.has(id))

  function handleRowClick(id: string) {
    navigate(`/detail/${id}`)
  }

  function formatDate(iso: string | null) {
    if (!iso) return '-'
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-navy-500">审查列表</h2>
          <p className="text-xs text-navy-200 mt-1">每日关账前审查签署记录，确保同意书完整合规</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs" onClick={() => { clearSelection() }}>
            <RotateCcw className="h-3.5 w-3.5" />
            重置筛选
          </button>
          <button className="btn-primary text-xs">
            <Download className="h-3.5 w-3.5" />
            导出报表
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { icon: ClipboardCheck, label: '总记录', value: stats.total, color: 'text-navy-500', bg: 'bg-navy-50' },
          { icon: FileCheck, label: '待审查', value: stats.pending, color: 'text-amber-400', bg: 'bg-amber-50' },
          { icon: AlertTriangle, label: '异常项', value: stats.exceptions, color: 'text-danger-500', bg: 'bg-danger-50' },
          { icon: Archive, label: '已归档', value: stats.archived, color: 'text-success-500', bg: 'bg-success-50' },
        ].map((s, i) => (
          <div key={i} className="card px-4 py-3.5 flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${s.bg}`}>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-navy-500 animate-count-up">{s.value}</p>
              <p className="text-2xs text-navy-200">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card px-4 py-3.5">
        <div className="flex items-center gap-2 mb-3">
          <Search className="h-4 w-4 text-navy-200" />
          <span className="text-sm font-medium text-navy-400">筛选条件</span>
        </div>
        <div className="grid grid-cols-7 gap-3">
          <div>
            <label className="block text-2xs text-navy-200 mb-1">开始日期</label>
            <input
              type="date"
              className="w-full rounded-md border border-slate-100 bg-slate-25 px-3 py-1.5 text-xs text-navy-500 focus:border-navy-300 focus:outline-none focus:ring-1 focus:ring-navy-200"
              value={filters.dateStart}
              onChange={(e) => setFilters({ dateStart: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-2xs text-navy-200 mb-1">结束日期</label>
            <input
              type="date"
              className="w-full rounded-md border border-slate-100 bg-slate-25 px-3 py-1.5 text-xs text-navy-500 focus:border-navy-300 focus:outline-none focus:ring-1 focus:ring-navy-200"
              value={filters.dateEnd}
              onChange={(e) => setFilters({ dateEnd: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-2xs text-navy-200 mb-1">医生</label>
            <select
              className="w-full rounded-md border border-slate-100 bg-slate-25 px-3 py-1.5 text-xs text-navy-500 focus:border-navy-300 focus:outline-none focus:ring-1 focus:ring-navy-200"
              value={filters.doctor}
              onChange={(e) => setFilters({ doctor: e.target.value })}
            >
              <option value="">全部医生</option>
              {doctors.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-2xs text-navy-200 mb-1">治疗项目</label>
            <select
              className="w-full rounded-md border border-slate-100 bg-slate-25 px-3 py-1.5 text-xs text-navy-500 focus:border-navy-300 focus:outline-none focus:ring-1 focus:ring-navy-200"
              value={filters.treatmentItem}
              onChange={(e) => setFilters({ treatmentItem: e.target.value })}
            >
              <option value="">全部项目</option>
              {treatmentItems.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-2xs text-navy-200 mb-1">患者姓名</label>
            <input
              type="text"
              placeholder="搜索患者"
              className="w-full rounded-md border border-slate-100 bg-slate-25 px-3 py-1.5 text-xs text-navy-500 placeholder:text-navy-100 focus:border-navy-300 focus:outline-none focus:ring-1 focus:ring-navy-200"
              value={filters.patientName}
              onChange={(e) => setFilters({ patientName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-2xs text-navy-200 mb-1">签署状态</label>
            <select
              className="w-full rounded-md border border-slate-100 bg-slate-25 px-3 py-1.5 text-xs text-navy-500 focus:border-navy-300 focus:outline-none focus:ring-1 focus:ring-navy-200"
              value={filters.signStatus}
              onChange={(e) => setFilters({ signStatus: e.target.value as SignStatus | '' })}
            >
              <option value="">全部状态</option>
              <option value="signed">已签署</option>
              <option value="unsigned">未签署</option>
              <option value="partial">部分签署</option>
            </select>
          </div>
          <div>
            <label className="block text-2xs text-navy-200 mb-1">归档状态</label>
            <select
              className="w-full rounded-md border border-slate-100 bg-slate-25 px-3 py-1.5 text-xs text-navy-500 focus:border-navy-300 focus:outline-none focus:ring-1 focus:ring-navy-200"
              value={filters.archiveStatus}
              onChange={(e) => setFilters({ archiveStatus: e.target.value as ArchiveStatus | '' })}
            >
              <option value="">全部</option>
              <option value="pending">待归档</option>
              <option value="archived">已归档</option>
              <option value="offline_archived">纸质归档</option>
            </select>
          </div>
        </div>
      </div>

      {selectedRecords.size > 0 && (
        <div className="card px-4 py-2.5 flex items-center justify-between bg-navy-50 border-navy-100">
          <span className="text-xs text-navy-400">
            已选择 <strong>{selectedRecords.size}</strong> 条记录
          </span>
          <div className="flex items-center gap-2">
            <button className="btn-success text-xs" onClick={batchArchive}>
              <CheckSquare className="h-3.5 w-3.5" />
              批量归档
            </button>
            <button className="btn-ghost text-xs" onClick={clearSelection}>
              取消选择
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-25">
                <th className="px-3 py-2.5 text-left font-medium text-navy-200 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={() => toggleSelectAll(allPageIds)}
                    className="rounded border-navy-200 text-navy-500 focus:ring-navy-300"
                  />
                </th>
                <th className="px-3 py-2.5 text-left font-medium text-navy-200">编号</th>
                <th className="px-3 py-2.5 text-left font-medium text-navy-200">患者</th>
                <th className="px-3 py-2.5 text-left font-medium text-navy-200">治疗项目</th>
                <th className="px-3 py-2.5 text-left font-medium text-navy-200">收费项目</th>
                <th className="px-3 py-2.5 text-left font-medium text-navy-200">医生</th>
                <th className="px-3 py-2.5 text-left font-medium text-navy-200">签署状态</th>
                <th className="px-3 py-2.5 text-left font-medium text-navy-200">医生确认</th>
                <th className="px-3 py-2.5 text-left font-medium text-navy-200">签署时间</th>
                <th className="px-3 py-2.5 text-left font-medium text-navy-200">异常</th>
                <th className="px-3 py-2.5 text-left font-medium text-navy-200">归档</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((r, i) => {
                const isMismatch = r.treatmentItem !== r.chargeItem
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-slate-75 transition-colors cursor-pointer hover:bg-slate-25 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-25/50'}`}
                    onClick={() => handleRowClick(r.id)}
                  >
                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedRecords.has(r.id)}
                        onChange={() => toggleSelectRecord(r.id)}
                        className="rounded border-navy-200 text-navy-500 focus:ring-navy-300"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-medium text-navy-400">{r.id}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-navy-500">{r.patientName}</div>
                      <div className="text-2xs text-navy-200">{r.patientId}</div>
                    </td>
                    <td className="px-3 py-2.5 text-navy-400">{r.treatmentItem}</td>
                    <td className="px-3 py-2.5">
                      <span className={isMismatch ? 'text-danger-500 font-medium' : 'text-navy-400'}>
                        {r.chargeItem}
                      </span>
                      {isMismatch && (
                        <span className="ml-1 badge bg-danger-50 text-danger-500">不一致</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-navy-400">{r.doctorName}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`status-dot ${signStatusMap[r.signStatus].color}`} />
                        {signStatusMap[r.signStatus].label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {r.doctorConfirmed ? (
                        <span className="text-success-500">已确认</span>
                      ) : (
                        <span className="text-danger-500 font-medium">未确认</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-navy-300">{formatDate(r.signedAt)}</td>
                    <td className="px-3 py-2.5">
                      {r.exceptionType ? (
                        <span className="badge bg-amber-50 text-amber-400">
                          {exceptionLabelMap[r.exceptionType]}
                        </span>
                      ) : (
                        <span className="text-navy-100">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`badge ${archiveStatusMap[r.archiveStatus].bg} ${archiveStatusMap[r.archiveStatus].color}`}>
                        {archiveStatusMap[r.archiveStatus].label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <span className="text-2xs text-navy-200">
            共 {filtered.length} 条记录，第 {page}/{totalPages || 1} 页
          </span>
          <div className="flex items-center gap-1">
            <button
              className="rounded px-2.5 py-1 text-2xs text-navy-200 hover:bg-slate-100 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >
              首页
            </button>
            <button
              className="rounded px-2.5 py-1 text-2xs text-navy-200 hover:bg-slate-100 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              上一页
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, totalPages - 4))
              const p = start + i
              if (p > totalPages) return null
              return (
                <button
                  key={p}
                  className={`rounded px-2.5 py-1 text-2xs ${p === page ? 'bg-navy-500 text-white' : 'text-navy-200 hover:bg-slate-100'}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              )
            })}
            <button
              className="rounded px-2.5 py-1 text-2xs text-navy-200 hover:bg-slate-100 disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              下一页
            </button>
            <button
              className="rounded px-2.5 py-1 text-2xs text-navy-200 hover:bg-slate-100 disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              末页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
