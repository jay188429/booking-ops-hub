import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface Booking {
  id: string
  customer: string
  date: string
  kind: string
  form: string
  memo: string
  slot_assigned?: string
  decision: string
  reason?: string
  options?: string
}

interface StatusBoardProps {
  refreshKey: number
}

export default function StatusBoard({ refreshKey }: StatusBoardProps) {
  const [bookings, setBookings] = useState<Record<string, Booking[]>>({
    '대기': [],
    '확정-자동': [],
    '확정-수동': [],
    '검토': [],
    '기각': [],
    '질문': [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBookings()
  }, [refreshKey])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const { data } = await supabase.from('bookings').select('*').order('date', { ascending: true })

      const grouped: Record<string, Booking[]> = {
        '대기': [],
        '확정-자동': [],
        '확정-수동': [],
        '검토': [],
        '기각': [],
        '질문': [],
      }

      data?.forEach((b: any) => {
        const decision = b.decision || 'pending'
        const statusKey = mapDecisionToStatus(decision)
        grouped[statusKey].push(b)
      })

      setBookings(grouped)
    } catch (err) {
      console.error('Error fetching bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const mapDecisionToStatus = (decision: string): string => {
    switch (decision) {
      case 'pending':
        return '대기'
      case 'confirmed_auto':
        return '확정-자동'
      case 'confirmed_human':
        return '확정-수동'
      case 'review':
        return '검토'
      case 'rejected':
        return '기각'
      case 'asking':
        return '질문'
      default:
        return '대기'
    }
  }

  const getCardColor = (status: string): string => {
    switch (status) {
      case '대기':
        return 'bg-gray-50 border-gray-200'
      case '확정-자동':
        return 'bg-green-50 border-green-200'
      case '확정-수동':
        return 'bg-green-100 border-green-400'
      case '검토':
        return 'bg-yellow-50 border-yellow-200'
      case '기각':
        return 'bg-red-50 border-red-200'
      case '질문':
        return 'bg-blue-50 border-blue-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const statuses = ['대기', '확정-자동', '확정-수동', '검토', '기각', '질문'] as const

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {statuses.map((status) => (
        <div key={status} className={`border rounded-lg p-4 ${getCardColor(status)}`}>
          <h3 className="font-semibold text-gray-800 mb-3">{status}</h3>
          <div className="space-y-3">
            {bookings[status].length === 0 ? (
              <p className="text-sm text-gray-500">예약 없음</p>
            ) : (
              bookings[status].map((booking) => (
                <div key={booking.id} className="bg-white rounded p-3 border border-gray-200 text-sm">
                  <div className="font-semibold text-gray-800">{booking.customer}</div>
                  <div className="text-gray-600">{booking.date}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {booking.kind} · {booking.form}
                  </div>
                  {booking.memo && <div className="text-xs text-gray-600 mt-1">{booking.memo}</div>}
                  {booking.slot_assigned && (
                    <div className="text-xs text-green-700 font-medium mt-1">확정: {booking.slot_assigned}</div>
                  )}
                  {status === '검토' && booking.options && (
                    <div className="text-xs text-yellow-700 font-medium mt-1">대상: {booking.options}</div>
                  )}
                  {booking.reason && (
                    <div className="text-xs text-gray-600 mt-1 line-clamp-1">{booking.reason}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
