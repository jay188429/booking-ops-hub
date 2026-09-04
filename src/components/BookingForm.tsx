import { useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { judge } from '../lib/judge'

interface BookingFormProps {
  onSuccess?: () => void
}

const SLOT_OPTIONS = [
  { id: 'morning', label: '오전 10-12' },
  { id: 'afternoon1', label: '오후-1 13-15' },
  { id: 'afternoon2', label: '오후-2 15-17' },
]

const KIND_OPTIONS = ['서울', '경기', '지방', '내부']
const FORM_OPTIONS = ['외근', '온라인']
const SLOT_START_TIMES: Record<string, string> = {
  morning: '10:00',
  afternoon1: '13:00',
  afternoon2: '15:00',
}

export default function BookingForm({ onSuccess }: BookingFormProps) {
  const [formData, setFormData] = useState({
    customer: '',
    kind: '',
    form: '',
    memo: '',
    address: '',
    date: '',
    slotsWanted: [] as string[],
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [slotOrder, setSlotOrder] = useState<Record<string, number>>({})

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
    setError(null)
  }

  const handleSlotChange = (slotId: string) => {
    setFormData((prev) => {
      const newSlots = prev.slotsWanted.includes(slotId)
        ? prev.slotsWanted.filter(s => s !== slotId)
        : [...prev.slotsWanted, slotId]
      return { ...prev, slotsWanted: newSlots }
    })
    setError(null)

    if (!formData.slotsWanted.includes(slotId)) {
      const newOrder = Math.max(0, ...Object.values(slotOrder), 0) + 1
      setSlotOrder((prev) => ({ ...prev, [slotId]: newOrder }))
    } else {
      setSlotOrder((prev) => {
        const { [slotId]: _, ...rest } = prev
        return rest
      })
    }
  }

  const judgeResult = useMemo(() => judge(formData), [formData])

  const sendSlackNotification = async (bookingData: {
    customer: string
    service: string
    date: string
    time: string
    address: string
    latitude?: number
    longitude?: number
    }) => {
      try {
        const { error } = await supabase.functions.invoke('send-slack-notification', {
          body: bookingData,
        })

        if (error) {
          throw error
        }
      } catch (err) {
        console.error('Slack notification failed:', err)
      }
  }

  const addToGoogleCalendar = async (bookingData: {
    customer: string
    service: string
    date: string
    time: string
    address: string
  }) => {
    try {
      const { error } = await supabase.functions.invoke('add-to-google-calendar', {
        body: bookingData,
      })

      if (error) throw error
    } catch (err) {
      console.error('Google Calendar integration failed:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!judgeResult.isValid) {
      setError(judgeResult.message || '필수 항목을 모두 입력해주세요')
      return
    }

    setLoading(true)

    try {
      const slotsWantedStr = formData.slotsWanted
        .sort((a, b) => (slotOrder[a] || 0) - (slotOrder[b] || 0))
        .map(id => SLOT_OPTIONS.find(s => s.id === id)?.label || '')
        .filter(Boolean)
        .join(',')
      const calendarTime = SLOT_START_TIMES[formData.slotsWanted[0]] || '10:00'
      const calendarService = formData.memo || `${formData.kind} ${formData.form} 예약`

      const { error: insertError } = await supabase
        .from('bookings')
        .insert([
          {
            customer: formData.customer,
            service: formData.memo || `${formData.kind} ${formData.form} 예약`,
            address: formData.address || '',
            date: formData.date,
            status: 'pending',
            decision_status: 'waiting',
            time: slotsWantedStr || '미정',
            via: 'form',
          },
        ])

      if (insertError) throw insertError

      // Send Slack notification
      await sendSlackNotification({
        customer: formData.customer,
        service: calendarService,
        date: formData.date,
        time: calendarTime,
        address: formData.address,
      })

      await addToGoogleCalendar({
        customer: formData.customer,
        service: calendarService,
        date: formData.date,
        time: calendarTime,
        address: formData.address,
      })

      // Reset form
      setFormData({
        customer: '',
        kind: '',
        form: '',
        memo: '',
        address: '',
        date: '',
        slotsWanted: [],
      })
      setSlotOrder({})

      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '예약 추가에 실패했습니다'
      setError(message)
      console.error('Error inserting booking:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 p-4 bg-white rounded-lg shadow-md"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">새 예약 추가</h2>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${
          judgeResult.badge === 'blue' ? 'bg-blue-500' : 'bg-green-500'
        }`}>
          {judgeResult.badge === 'blue' ? '작성 중' : '완성'}
        </span>
      </div>

      {judgeResult.message && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded">
          {judgeResult.message}
        </div>
      )}

      {error && <div className="mb-4 p-3 bg-red-100 text-red-800 rounded">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 고객사 */}
        <input
          type="text"
          name="customer"
          placeholder="고객사"
          value={formData.customer}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />

        {/* 종류 */}
        <select
          name="kind"
          value={formData.kind}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        >
          <option value="">종류 선택</option>
          {KIND_OPTIONS.map(k => (
            <option key={k} value={k}>{k}</option>
          ))}
        </select>

        {/* 형태 */}
        <select
          name="form"
          value={formData.form}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        >
          <option value="">형태 선택</option>
          {FORM_OPTIONS.map(f => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>

        {/* 메모 */}
        <input
          type="text"
          name="memo"
          placeholder="메모 (예: 미팅, 기획 회의)"
          value={formData.memo}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />

        {/* 위치 */}
        <input
          type="text"
          name="address"
          placeholder={formData.form === '외근' ? '위치 (필수)' : '위치 (선택)'}
          value={formData.address}
          onChange={handleInputChange}
          className={`px-3 py-2 border rounded focus:outline-none ${
            formData.form === '외근' && !formData.address
              ? 'border-red-300 focus:border-red-500'
              : 'border-gray-300 focus:border-blue-500'
          }`}
        />

        {/* 날짜 */}
        <input
          type="date"
          name="date"
          value={formData.date}
          onChange={handleInputChange}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* 희망 슬롯 */}
      <div className="mt-4 p-3 bg-gray-50 rounded">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          희망 슬롯 (체크 순서가 우선순위)
        </label>
        <div className="space-y-2">
          {SLOT_OPTIONS.map(slot => (
            <div key={slot.id} className="flex items-center">
              <input
                type="checkbox"
                id={slot.id}
                checked={formData.slotsWanted.includes(slot.id)}
                onChange={() => handleSlotChange(slot.id)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor={slot.id} className="ml-2 text-sm text-gray-700">
                {slot.label}
              </label>
              {formData.slotsWanted.includes(slot.id) && slotOrder[slot.id] && (
                <span className="ml-2 px-2 py-1 bg-blue-200 text-blue-800 rounded text-xs font-semibold">
                  {slotOrder[slot.id]}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !judgeResult.isValid}
        className={`mt-4 px-6 py-2 rounded text-white font-medium transition-colors ${
          judgeResult.isValid
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-gray-400 cursor-not-allowed'
        }`}
      >
        {loading ? '추가 중...' : '예약하기'}
      </button>
    </form>
  )
}
