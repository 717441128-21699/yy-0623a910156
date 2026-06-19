import { useState } from 'react'
import { useAppStore } from '@/store'
import type { ExceptionType, ExceptionStatus, Urgency, FlowRecord } from '@/types'
import { Send, ArrowLeftRight, Archive, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronRight, MessageSquare } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import NoteDialog from '@/components/NoteDialog'

const tabs: { type: ExceptionType; label: string; color: string; borderColor: string }[] = [
  { type: 'missing_patient_signature', label: '待补患者签名', color: 'text-danger-500', borderColor: 'border-danger-400' },
  { type: 'missing_doctor_note', label: '待补医生说明', color: 'text-amber-400', borderColor: 'border-amber-400' },
  { type: 'outdated_template', label: '模板版本过旧', color: 'text-navy-300', borderColor: 'border-navy-300' },
]

const urgencyMap: Record<Urgency, { label: string; color: string; bg: string }> = {
  high: { label: '紧急', color: 'text-danger-500', bg: 'bg-danger-50' },
  medium: { label: '一般', color: 'text-amber-400', bg: 'bg-amber-50' },
  low: { label: '低', color: 'text-navy-200', bg: 'bg-navy-50' },
}

const statusMap: Record<ExceptionStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  pending: { label: '待处理', icon: AlertCircle, color: 'text-danger-400' },
  processing: { label: '处理中', icon: Clock, color: 'text-amber-400' },
  resolved: { label: '已解决', icon: CheckCircle2, color: 'text-success-500' },
}

const typeColorMap: Record<ExceptionType, string> = {
  missing_patient_signature: 'bg-danger-400',
  missing_doctor_note: 'bg-amber-400',
  outdated_template: 'bg-navy-300',
}

interface PendingAction {
  exceptionId: string
  recordId: string
  action: 'resign' | 'return_doctor' | 'offline_archive'
}

export default function ExceptionsPage() {
  const { exceptionTab, setExceptionTab, getExceptionsByType, sendResignLink, returnToDoctor, markOfflineArchivedWithNote, flowRecords, exceptions } = useAppStore()
  const navigate = useNavigate()
  const items = getExceptionsByType(exceptionTab)

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [expandedFlow, setExpandedFlow] = useState<string | null>(null)

  const pendingCount = exceptions.filter(e => e.type === 'missing_patient_signature' && e.status !== 'resolved').length
  const doctorCount = exceptions.filter(e => e.type === 'missing_doctor_note' && e.status !== 'resolved').length
  const templateCount = exceptions.filter(e => e.type === 'outdated_template' && e.status !== 'resolved').length
  const countMap: Record<ExceptionType, number> = {
    missing_patient_signature: pendingCount,
    missing_doctor_note: doctorCount,
    outdated_template: templateCount,
  }

  function handleActionClick(item: typeof items[0], action: PendingAction['action']) {
    setPendingAction({ exceptionId: item.id, recordId: item.recordId, action })
  }

  function handleNoteConfirm(note: string) {
    if (!pendingAction) return
    if (pendingAction.action === 'resign') {
      sendResignLink(pendingAction.exceptionId, note)
    } else if (pendingAction.action === 'return_doctor') {
      returnToDoctor(pendingAction.exceptionId, note)
    } else if (pendingAction.action === 'offline_archive') {
      markOfflineArchivedWithNote(pendingAction.exceptionId, note)
    }
    setPendingAction(null)
  }

  function getFlowRecordsForException(exceptionId: string): FlowRecord[] {
    return flowRecords
      .filter(f => f.exceptionId === exceptionId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  const actionLabels: Record<string, { title: string; label: string }> = {
    resign: { title: '发送补签链接', label: '确认发送' },
    return_doctor: { title: '退回医生补备注', label: '确认退回' },
    offline_archive: { title: '标记线下纸质归档', label: '确认归档' },
  }

  const currentActionLabel = pendingAction ? actionLabels[pendingAction.action] : { title: '', label: '' }

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-navy-500">异常处理</h2>
        <p className="text-xs text-navy-200 mt-1">分类处理同意书异常问题，确保归档合规</p>
      </div>

      <div className="flex border-b border-slate-100">
        {tabs.map((tab) => (
          <button
            key={tab.type}
            className={`relative px-5 py-3 text-sm font-medium transition-colors ${
              exceptionTab === tab.type
                ? `${tab.color} border-b-2 ${tab.borderColor}`
                : 'text-navy-200 hover:text-navy-400'
            }`}
            onClick={() => setExceptionTab(tab.type)}
          >
            {tab.label}
            {countMap[tab.type] > 0 && (
              <span className={`ml-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-2xs font-semibold ${
                exceptionTab === tab.type ? 'bg-navy-500 text-white' : 'bg-slate-100 text-navy-200'
              }`}>
                {countMap[tab.type]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="card px-6 py-12 text-center">
            <CheckCircle2 className="h-10 w-10 text-success-400 mx-auto mb-3" />
            <p className="text-sm text-navy-300">该类别暂无异常项</p>
          </div>
        ) : (
          items.map((item, i) => {
            const StatusIcon = statusMap[item.status].icon
            const itemFlows = getFlowRecordsForException(item.id)
            const isFlowExpanded = expandedFlow === item.id

            return (
              <div
                key={item.id}
                className="card overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="flex">
                  <div className={`w-1 flex-shrink-0 ${typeColorMap[item.type]}`} />
                  <div className="flex-1 px-4 py-3.5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-semibold text-navy-500">{item.patientName}</span>
                          <span className={`badge ${urgencyMap[item.urgency].bg} ${urgencyMap[item.urgency].color}`}>
                            {urgencyMap[item.urgency].label}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs">
                            <StatusIcon className={`h-3.5 w-3.5 ${statusMap[item.status].color}`} />
                            <span className={statusMap[item.status].color}>{statusMap[item.status].label}</span>
                          </span>
                          {itemFlows.length > 0 && (
                            <button
                              className="inline-flex items-center gap-1 text-2xs text-navy-200 hover:text-navy-400 transition-colors ml-2"
                              onClick={() => setExpandedFlow(isFlowExpanded ? null : item.id)}
                            >
                              <MessageSquare className="h-3 w-3" />
                              {itemFlows.length}条流转
                              {isFlowExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-6 text-xs text-navy-300">
                          <span>记录编号：{item.recordId}</span>
                          <span>治疗项目：{item.treatmentItem}</span>
                          <span>主治医生：{item.doctorName}</span>
                          <span>创建时间：{new Date(item.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {item.status !== 'resolved' && (
                          <>
                            {exceptionTab === 'missing_patient_signature' && (
                              <button
                                className="btn-primary text-xs"
                                onClick={() => handleActionClick(item, 'resign')}
                                disabled={item.status === 'processing'}
                              >
                                <Send className="h-3.5 w-3.5" />
                                发送补签链接
                              </button>
                            )}
                            {exceptionTab === 'missing_doctor_note' && (
                              <button
                                className="btn-amber text-xs"
                                onClick={() => handleActionClick(item, 'return_doctor')}
                                disabled={item.status === 'processing'}
                              >
                                <ArrowLeftRight className="h-3.5 w-3.5" />
                                退回医生补备注
                              </button>
                            )}
                            {exceptionTab === 'outdated_template' && (
                              <button
                                className="btn-success text-xs"
                                onClick={() => handleActionClick(item, 'offline_archive')}
                              >
                                <Archive className="h-3.5 w-3.5" />
                                标记线下纸质已归档
                              </button>
                            )}
                            <button
                              className="btn-secondary text-xs"
                              onClick={() => navigate(`/detail/${item.recordId}`)}
                            >
                              查看详情
                            </button>
                          </>
                        )}
                        {item.status === 'resolved' && (
                          <button
                            className="btn-secondary text-xs"
                            onClick={() => navigate(`/detail/${item.recordId}`)}
                          >
                            查看详情
                          </button>
                        )}
                      </div>
                    </div>

                    {isFlowExpanded && itemFlows.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-75 animate-fade-in-up">
                        <div className="flex items-center gap-1.5 mb-2">
                          <MessageSquare className="h-3.5 w-3.5 text-navy-200" />
                          <span className="text-2xs font-medium text-navy-300">流转记录</span>
                        </div>
                        <div className="space-y-2 pl-4">
                          {itemFlows.map((flow) => (
                            <div key={flow.id} className="flex items-start gap-2">
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-navy-50 flex-shrink-0 mt-0.5">
                                <div className="h-1.5 w-1.5 rounded-full bg-navy-300" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-navy-400">{flow.action}</span>
                                  <span className="text-2xs text-navy-200">
                                    {new Date(flow.timestamp).toLocaleString('zh-CN', {
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                </div>
                                <p className="text-2xs text-navy-200">
                                  操作人：{flow.operator}（{flow.operatorRole}）
                                </p>
                                {flow.note && (
                                  <p className="text-2xs text-navy-300 mt-0.5 bg-slate-25 rounded px-2 py-1 inline-block">
                                    备注：{flow.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <NoteDialog
        open={pendingAction !== null}
        title={currentActionLabel.title}
        actionLabel={currentActionLabel.label}
        onClose={() => setPendingAction(null)}
        onConfirm={handleNoteConfirm}
      />
    </div>
  )
}
