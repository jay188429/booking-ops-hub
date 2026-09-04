export interface JudgeResult {
  route: 'ask' | 'book'
  message?: string
  badge: 'blue' | 'green'
  isValid: boolean
  missingFields?: string[]
}

export function judge(formData: {
  customer: string
  kind: string
  form: string
  date: string
  slotsWanted: string[]
  address: string
}): JudgeResult {
  const missingFields: string[] = []

  if (!formData.customer) missingFields.push('고객사')
  if (!formData.kind) missingFields.push('종류')
  if (!formData.form) missingFields.push('형태')
  if (!formData.date) missingFields.push('날짜')
  if (formData.slotsWanted.length === 0) missingFields.push('희망 슬롯')
  if (formData.form === '외근' && !formData.address) missingFields.push('위치')

  if (missingFields.length > 0) {
    return {
      route: 'ask',
      message: `빈 칸: ${missingFields.join(', ')}`,
      badge: 'blue',
      isValid: false,
      missingFields,
    }
  }

  return {
    route: 'book',
    badge: 'green',
    isValid: true,
  }
}
