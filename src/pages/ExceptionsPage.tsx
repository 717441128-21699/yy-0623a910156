import { useAppStore } from '@/store'
import type { ExceptionType, ExceptionStatus, Urgency } from '@/types'
import { Send, ArrowLeftRight, Archive, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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

export default function ExceptionsPage() {
  const { exceptionTab, setExceptionTab, getExceptionsByType, resolveException, sendResignLink, returnToDoctor, markOfflineArchived } = useAppStore()
  const navigate = useNavigate()
  const items = getExceptionsByType(exceptionTab)

  const pendingCount = useAppStore().exceptions.filter(e => e.type === 'missing_patient_signature' && e.status !== 'resolved').length
  const doctorCount = useAppStore().exceptions.filter(e => e.type === 'missing_doctor_note' && e.status !== 'resolved').length
  const templateCount = useAppStore().exceptions.filter(e => e.type === 'outdated_template' && e.status !== 'resolved').length
  const countMap: Record<ExceptionType, number> = {
    missing_patient_signature: pendingCount,
    missing_doctor_note: doctorCount,
    outdated_template: templateCount,
  }

  function handleAction(item: typeof items[0], action: string) {
    if (action === 'resign') {
      sendResignLink(item.id)
    } else if (action === 'return_doctor') {
      returnToDoctor(item.id)
    } else if (action === 'offline_archive') {
      markOfflineArchived(item.recordId)
      resolveException(item.id, 'offline_archive')
    } else if (action === 'resolve') {
      resolveException(item.id, action)
    }
  }

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
                                onClick={() => handleAction(item, 'resign')}
                                disabled={item.status === 'processing'}
                              >
                                <Send className="h-3.5 w-3.5" />
                                发送补签链接
                              </button>
                            )}
                            {exceptionTab === 'missing_doctor_note' && (
                              <button
                                className="btn-amber text-xs"
                                onClick={() => handleAction(item, 'return_doctor')}
                                disabled={item.status === 'processing'}
                              >
                                <ArrowLeftRight className="h-3.5 w-3.5" />
                                退回医生补备注
                              </button>
                            )}
                            {exceptionTab === 'outdated_template' && (
                              <button
                                className="btn-success text-xs"
                                onClick={() => handleAction(item, 'offline_archive')}
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
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
