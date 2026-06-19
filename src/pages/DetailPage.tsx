import { useParams, useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store'
import { ArrowLeft, User, Stethoscope, FileText, Clock, AlertTriangle, PenTool, Shield, CheckCircle2, XCircle } from 'lucide-react'
import type { SignStatus, ArchiveStatus, ExceptionType } from '@/types'

const signStatusLabel: Record<SignStatus, { text: string; color: string }> = {
  signed: { text: '已签署', color: 'text-success-500' },
  unsigned: { text: '未签署', color: 'text-danger-500' },
  partial: { text: '部分签署', color: 'text-amber-400' },
}

const archiveStatusLabel: Record<ArchiveStatus, { text: string; color: string; bg: string }> = {
  pending: { text: '待归档', color: 'text-amber-400', bg: 'bg-amber-50' },
  archived: { text: '已归档', color: 'text-success-500', bg: 'bg-success-50' },
  offline_archived: { text: '纸质归档', color: 'text-navy-300', bg: 'bg-navy-50' },
}

const exceptionLabel: Record<ExceptionType, string> = {
  missing_patient_signature: '缺少患者签名',
  missing_doctor_note: '缺少医生说明',
  outdated_template: '模板版本过旧',
}

function SignatureCanvas({ label, hasSignature }: { label: string; hasSignature: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
        <span className="text-xs font-medium text-navy-400">{label}</span>
        {hasSignature ? (
          <span className="inline-flex items-center gap-1 text-2xs text-success-500">
            <CheckCircle2 className="h-3 w-3" />
            已签署
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-2xs text-danger-400">
            <XCircle className="h-3 w-3" />
            未签署
          </span>
        )}
      </div>
      <div className="p-4">
        {hasSignature ? (
          <div className="relative bg-slate-25 border border-dashed border-slate-100 rounded-lg h-32 flex items-center justify-center overflow-hidden">
            <svg viewBox="0 0 300 80" className="w-full h-auto max-h-28 opacity-70">
              <path
                d="M20,50 C30,20 50,70 70,35 C90,0 110,60 130,40 C150,20 170,55 190,30 C210,5 230,50 250,35 C260,28 270,40 280,38"
                fill="none"
                stroke="#1B2A4A"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M50,65 C80,55 200,60 260,58"
                fill="none"
                stroke="#1B2A4A"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.5"
              />
            </svg>
            <div className="absolute top-2 right-2">
              <button className="rounded bg-white/80 px-2 py-1 text-2xs text-navy-300 hover:bg-white border border-slate-100">
                放大
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-25 border border-dashed border-slate-100 rounded-lg h-32 flex items-center justify-center">
            <div className="text-center">
              <PenTool className="h-6 w-6 text-navy-100 mx-auto mb-1" />
              <p className="text-2xs text-navy-200">暂无签名</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function TimelineItem({ log, isLast }: { log: { operator: string; operatorRole: string; action: string; detail: string; timestamp: string }; isLast: boolean }) {
  const actionColorMap: Record<string, string> = {
    '创建同意书': 'bg-navy-300',
    '患者签署': 'bg-success-400',
    '医生确认': 'bg-amber-400',
    '归档完成': 'bg-success-500',
  }
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${actionColorMap[log.action] || 'bg-navy-200'}`}>
          <div className="h-2 w-2 rounded-full bg-white" />
        </div>
        {!isLast && <div className="w-px flex-1 bg-slate-100 my-1" />}
      </div>
      <div className={`pb-4 ${isLast ? '' : ''}`}>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-navy-500">{log.action}</span>
          <span className="text-2xs text-navy-200">
            {new Date(log.timestamp).toLocaleString('zh-CN', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="text-xs text-navy-300">{log.detail}</p>
        <p className="text-2xs text-navy-200 mt-0.5">
          操作人：{log.operator}（{log.operatorRole}）
        </p>
      </div>
    </div>
  )
}

export default function DetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { getRecordById, getSignatureInfo, getRecordLogs } = useAppStore()

  const record = getRecordById(id || '')
  const signatureInfo = getSignatureInfo(id || '')
  const logs = getRecordLogs(id || '')

  if (!record) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center">
          <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto mb-3" />
          <p className="text-sm text-navy-300">未找到该记录</p>
          <button className="btn-primary text-xs mt-4" onClick={() => navigate('/review')}>
            返回列表
          </button>
        </div>
      </div>
    )
  }

  const isMismatch = record.treatmentItem !== record.chargeItem

  function formatDateTime(iso: string | null) {
    if (!iso) return '-'
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            className="rounded-lg p-1.5 hover:bg-slate-100 transition-colors"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-4.5 w-4.5 text-navy-300" />
          </button>
          <div>
            <h2 className="text-lg font-semibold text-navy-500">归档详情</h2>
            <p className="text-xs text-navy-200 mt-0.5">记录编号：{record.id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`badge ${archiveStatusLabel[record.archiveStatus].bg} ${archiveStatusLabel[record.archiveStatus].color}`}>
            {archiveStatusLabel[record.archiveStatus].text}
          </span>
          {record.exceptionType && (
            <span className="badge bg-amber-50 text-amber-400">
              {exceptionLabel[record.exceptionType]}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-5">
          <div className="card px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-4 w-4 text-navy-300" />
              <span className="text-sm font-medium text-navy-500">基本信息</span>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {[
                { label: '患者姓名', value: record.patientName },
                { label: '就诊号', value: record.patientId },
                { label: '主治医生', value: record.doctorName },
                { label: '医生编号', value: record.doctorId },
                { label: '治疗项目', value: record.treatmentItem },
                {
                  label: '收费项目',
                  value: (
                    <span className={isMismatch ? 'text-danger-500 font-medium' : ''}>
                      {record.chargeItem}
                      {isMismatch && <span className="ml-2 badge bg-danger-50 text-danger-500">与治疗项目不一致</span>}
                    </span>
                  ),
                },
                { label: '模板版本', value: signatureInfo?.templateVersion || record.templateVersion },
                {
                  label: '签署状态',
                  value: (
                    <span className={`inline-flex items-center gap-1.5 ${signStatusLabel[record.signStatus].color}`}>
                      <span className={`status-dot ${record.signStatus === 'signed' ? 'bg-success-400' : record.signStatus === 'unsigned' ? 'bg-danger-400' : 'bg-amber-400'}`} />
                      {signStatusLabel[record.signStatus].text}
                    </span>
                  ),
                },
                {
                  label: '医生确认',
                  value: record.doctorConfirmed ? (
                    <span className="text-success-500">已确认</span>
                  ) : (
                    <span className="text-danger-500 font-medium">未确认</span>
                  ),
                },
              ].map((field, i) => (
                <div key={i} className="flex items-start">
                  <span className="text-xs text-navy-200 w-20 flex-shrink-0">{field.label}</span>
                  <span className="text-xs text-navy-500">{field.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <PenTool className="h-4 w-4 text-navy-300" />
              <span className="text-sm font-medium text-navy-500">签署信息</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <SignatureCanvas label="患者签名" hasSignature={record.signStatus !== 'unsigned'} />
              <SignatureCanvas label="医生签名" hasSignature={record.doctorConfirmed} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-start">
                <span className="text-xs text-navy-200 w-24 flex-shrink-0">患者签署时间</span>
                <span className="text-xs text-navy-500">{formatDateTime(record.signedAt)}</span>
              </div>
              <div className="flex items-start">
                <span className="text-xs text-navy-200 w-24 flex-shrink-0">医生确认时间</span>
                <span className="text-xs text-navy-500">{formatDateTime(record.doctorConfirmedAt)}</span>
              </div>
            </div>
          </div>

          <div className="card px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-4 w-4 text-navy-300" />
              <span className="text-sm font-medium text-navy-500">告知内容</span>
              <span className="badge bg-navy-50 text-navy-300 ml-2">v{signatureInfo?.templateVersion}</span>
            </div>
            <div className="bg-slate-25 rounded-lg px-4 py-3 text-xs text-navy-400 leading-relaxed whitespace-pre-line max-h-60 overflow-y-auto">
              {signatureInfo?.informedContent}
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-medium text-navy-400">风险提示</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {signatureInfo?.risks.map((risk, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-navy-300">
                    <span className="status-dot bg-amber-300 mt-1.5 flex-shrink-0" />
                    {risk}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="card px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope className="h-4 w-4 text-navy-300" />
              <span className="text-sm font-medium text-navy-500">签署摘要</span>
            </div>
            <div className="space-y-3">
              {[
                { label: '创建时间', value: formatDateTime(record.createdAt) },
                { label: '签署状态', value: signStatusLabel[record.signStatus].text, valueColor: signStatusLabel[record.signStatus].color },
                { label: '医生确认', value: record.doctorConfirmed ? '已确认' : '未确认', valueColor: record.doctorConfirmed ? 'text-success-500' : 'text-danger-500' },
                { label: '归档状态', value: archiveStatusLabel[record.archiveStatus].text },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-75 last:border-0">
                  <span className="text-xs text-navy-200">{item.label}</span>
                  <span className={`text-xs font-medium ${item.valueColor || 'text-navy-500'}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card px-5 py-4">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-navy-300" />
              <span className="text-sm font-medium text-navy-500">操作记录</span>
            </div>
            <div className="space-y-0">
              {logs.map((log, i) => (
                <TimelineItem key={log.id} log={log} isLast={i === logs.length - 1} />
              ))}
            </div>
          </div>

          {isMismatch && (
            <div className="card px-5 py-4 border-danger-100 bg-danger-50">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-danger-400" />
                <span className="text-sm font-medium text-danger-500">项目不一致警告</span>
              </div>
              <p className="text-xs text-danger-400 leading-relaxed">
                治疗项目（{record.treatmentItem}）与收费项目（{record.chargeItem}）不一致，请核实是否存在收费错误或同意书签署项目有误。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
