import type { ConsentRecord, ExceptionItem, OperationLog, SignatureInfo } from '@/types'

export const doctors = ['王建华', '李明远', '张秀英', '陈志强', '刘雅琴']

export const treatmentItems = [
  '种植牙手术',
  '智齿拔除',
  '根管治疗',
  '正畸初诊',
  '全瓷冠修复',
  '牙周刮治',
  '牙齿美白',
  '活动义齿',
]

export const templateVersions = ['v3.2', 'v3.1', 'v2.8', 'v2.5']

const patients = [
  { name: '赵文静', id: 'P20240001' },
  { name: '孙鹏飞', id: 'P20240002' },
  { name: '周丽华', id: 'P20240003' },
  { name: '吴国栋', id: 'P20240004' },
  { name: '郑美玲', id: 'P20240005' },
  { name: '钱浩然', id: 'P20240006' },
  { name: '冯晓燕', id: 'P20240007' },
  { name: '陆志豪', id: 'P20240008' },
  { name: '韩雪梅', id: 'P20240009' },
  { name: '杨建国', id: 'P20240010' },
  { name: '许婷婷', id: 'P20240011' },
  { name: '黄伟明', id: 'P20240012' },
  { name: '曹秀兰', id: 'P20240013' },
  { name: '邓晓峰', id: 'P20240014' },
  { name: '林淑芬', id: 'P20240015' },
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomDate(daysBack: number): string {
  const d = new Date()
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack))
  d.setHours(8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60))
  return d.toISOString()
}

export const consentRecords: ConsentRecord[] = Array.from({ length: 48 }, (_, i) => {
  const patient = randomItem(patients)
  const doctor = randomItem(doctors)
  const treatment = randomItem(treatmentItems)
  const createdAt = randomDate(14)
  const hasException = Math.random() < 0.35
  const exceptionType = hasException
    ? randomItem(['missing_patient_signature', 'missing_doctor_note', 'outdated_template'] as const)
    : null

  let signStatus: ConsentRecord['signStatus'] = 'signed'
  let doctorConfirmed = true
  let signedAt: string | null = new Date(createdAt).toISOString()
  let doctorConfirmedAt: string | null = new Date(createdAt).toISOString()
  let archiveStatus: ConsentRecord['archiveStatus'] = 'archived'

  if (exceptionType === 'missing_patient_signature') {
    signStatus = 'unsigned'
    signedAt = null
    doctorConfirmed = Math.random() > 0.3
    archiveStatus = 'pending'
  } else if (exceptionType === 'missing_doctor_note') {
    doctorConfirmed = false
    doctorConfirmedAt = null
    signStatus = Math.random() > 0.4 ? 'signed' : 'partial'
    archiveStatus = 'pending'
  } else if (exceptionType === 'outdated_template') {
    signStatus = 'signed'
    archiveStatus = 'pending'
  }

  const isChargeMismatch = Math.random() < 0.1
  const chargeItem = isChargeMismatch ? randomItem(treatmentItems.filter(t => t !== treatment)) : treatment

  return {
    id: `CR${String(i + 1).padStart(4, '0')}`,
    patientName: patient.name,
    patientId: patient.id,
    treatmentItem: treatment,
    chargeItem,
    doctorName: doctor,
    doctorId: `D${doctors.indexOf(doctor) + 1}`,
    signStatus,
    doctorConfirmed,
    templateVersion: exceptionType === 'outdated_template' ? randomItem(['v2.5', 'v2.8']) : 'v3.2',
    signedAt,
    doctorConfirmedAt,
    createdAt,
    exceptionType,
    archiveStatus,
  }
})

export const exceptionItems: ExceptionItem[] = consentRecords
  .filter(r => r.exceptionType !== null)
  .map((r, i) => ({
    id: `EX${String(i + 1).padStart(4, '0')}`,
    recordId: r.id,
    type: r.exceptionType!,
    patientName: r.patientName,
    treatmentItem: r.treatmentItem,
    doctorName: r.doctorName,
    urgency: (['high', 'medium', 'low'] as const)[Math.floor(Math.random() * 3)],
    status: (['pending', 'processing', 'resolved'] as const)[Math.floor(Math.random() * 3)],
    createdAt: r.createdAt,
    resolvedAt: null,
  }))

export const operationLogs: Record<string, OperationLog[]> = consentRecords.reduce(
  (acc, r) => {
    const logs: OperationLog[] = [
      {
        id: `OL${r.id}-1`,
        recordId: r.id,
        operator: r.doctorName,
        operatorRole: '主治医生',
        action: '创建同意书',
        detail: `为患者 ${r.patientName} 创建 ${r.treatmentItem} 治疗同意书`,
        timestamp: r.createdAt,
      },
    ]
    if (r.signedAt) {
      logs.push({
        id: `OL${r.id}-2`,
        recordId: r.id,
        operator: r.patientName,
        operatorRole: '患者',
        action: '患者签署',
        detail: `患者 ${r.patientName} 签署同意书`,
        timestamp: r.signedAt,
      })
    }
    if (r.doctorConfirmedAt) {
      logs.push({
        id: `OL${r.id}-3`,
        recordId: r.id,
        operator: r.doctorName,
        operatorRole: '主治医生',
        action: '医生确认',
        detail: `医生 ${r.doctorName} 确认同意书内容`,
        timestamp: r.doctorConfirmedAt!,
      })
    }
    if (r.archiveStatus === 'archived') {
      logs.push({
        id: `OL${r.id}-4`,
        recordId: r.id,
        operator: '张管理',
        operatorRole: '病案管理员',
        action: '归档完成',
        detail: '电子同意书归档完成',
        timestamp: new Date(new Date(r.createdAt).getTime() + 3600000).toISOString(),
      })
    }
    acc[r.id] = logs
    return acc
  },
  {} as Record<string, OperationLog[]>
)

export const signatureInfos: Record<string, SignatureInfo> = consentRecords.reduce(
  (acc, r) => {
    acc[r.id] = {
      patientSignatureUrl: r.signStatus !== 'unsigned' ? `/signatures/${r.id}_patient.png` : null,
      doctorSignatureUrl: r.doctorConfirmed ? `/signatures/${r.id}_doctor.png` : null,
      informedContent: `${r.treatmentItem}知情同意书\n\n尊敬的患者：\n\n根据您的病情，医生建议您进行${r.treatmentItem}治疗。在治疗前，我们有必要向您说明以下事项：\n\n一、治疗目的\n通过${r.treatmentItem}治疗，改善您的口腔健康状况，恢复口腔功能。\n\n二、治疗方式\n医生将根据您的具体情况，采用适当的${r.treatmentItem}治疗技术。\n\n三、可能的风险及并发症\n请参阅下方风险提示。\n\n四、替代治疗方案\n您有权选择其他替代治疗方案或放弃治疗。\n\n五、费用说明\n本次治疗费用将按照诊所收费标准收取。`,
      templateVersion: r.templateVersion,
      risks: [
        '治疗过程中可能出现疼痛不适',
        '可能发生术后感染',
        '可能出现出血情况',
        '个别情况下可能影响邻牙',
        '治疗效果可能因个体差异而不同',
        '可能需要后续修复治疗',
      ],
    }
    return acc
  },
  {} as Record<string, SignatureInfo>
)
