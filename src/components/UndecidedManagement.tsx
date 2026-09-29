import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { notifyConfirmedCalendar } from '../lib/calendar'

interface UndecidedManagementProps {
  refreshKey: number
}

interface Booking {
  id: string
  customer: string
  kind: string
  date: string
  slots_wanted?: string
  decision: string
  reason?: string
  options?: string
  slot_assigned?: string
  trace?: string
  candidate?: string
}

export default function UndecidedManagement({ refreshKey }: UndecidedManagementProps) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchBookings()
  }, [refreshKey])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const { data, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .order('date', { ascending: true })

      if (fetchError) throw fetchError

      console.log('All bookings:', data)

      // 새 예약은 decision_status만 waiting으로 저장될 수 있으므로,
      // decision이 비어 있는 대기 예약도 미확정 목록에 포함한다.
      const undecided = (data || [])
        .filter((b: any) =>
          ['pending', 'review', 'rejected', 'asking'].includes(b.decision) ||
          (!b.decision && (!b.decision_status || b.decision_status === 'waiting'))
        )
        .map((b: any) => ({
          ...b,
          decision: b.decision || 'pending',
          reason: b.reason || '아직 판정하지 않았습니다.',
        }))

      console.log('Undecided bookings:', undecided)
      setBookings(undecided)
    } catch (err) {
      const message = err instanceof Error ? err.message : '예약 조회 실패'
      setError(message)
      console.error('Error fetching bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (bookingId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(bookingId)) {
      newExpanded.delete(bookingId)
    } else {
      newExpanded.add(bookingId)
    }
    setExpandedRows(newExpanded)
  }

  const handleConfirm = async (booking: Booking) => {
    if (!booking.candidate) return

    try {
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          decision: 'confirmed_human',
          slot_assigned: booking.candidate,
        })
        .eq('id', booking.id)

      if (updateError) throw updateError
      await notifyConfirmedCalendar({
        ...booking,
        decision: 'confirmed_human',
        slot_assigned: booking.candidate,
      })
      fetchBookings()
    } catch (err) {
      const message = err instanceof Error ? err.message : '업데이트 실패'
      setError(message)
      console.error('Error confirming booking:', err)
    }
  }

  const handleReview = async (selectedCustomer: string, otherCustomer: string) => {
    try {
      const selectedBooking = bookings.find(b => b.customer === selectedCustomer)
      const otherBooking = bookings.find(b => b.customer === otherCustomer)

      if (!selectedBooking || !otherBooking) return

      // 선택한 쪽은 confirmed_human으로 업데이트
      await supabase
        .from('bookings')
        .update({
          decision: 'confirmed_human',
          slot_assigned: selectedBooking.candidate,
        })
        .eq('id', selectedBooking.id)

      await notifyConfirmedCalendar({
        ...selectedBooking,
        decision: 'confirmed_human',
        slot_assigned: selectedBooking.candidate,
      })

      // 다른 쪽은 pending으로 되돌림
      await supabase
        .from('bookings')
        .update({
          decision: 'pending',
        })
        .eq('id', otherBooking.id)

      fetchBookings()
    } catch (err) {
      const message = err instanceof Error ? err.message : '업데이트 실패'
      setError(message)
      console.error('Error updating review bookings:', err)
    }
  }

  const getBadgeColor = (decision: string) => {
    switch (decision) {
      case 'pending':
        return 'bg-gray-200 text-gray-800'
      case 'confirmed_auto':
        return 'bg-green-200 text-green-800'
      case 'confirmed_human':
        return 'bg-green-300 border-2 border-green-600 text-green-800'
      case 'review':
        return 'bg-yellow-200 text-yellow-800'
      case 'rejected':
        return 'bg-red-200 text-red-800'
      case 'asking':
        return 'bg-blue-200 text-blue-800'
      default:
        return 'bg-gray-200 text-gray-800'
    }
  }

  const getDecisionLabel = (decision: string) => {
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
        return '거절'
      case 'asking':
        return '질문'
      default:
        return decision
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">로드 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-slate-800/50 rounded-xl shadow-lg p-6 border border-slate-700 backdrop-blur-sm">
      <h2 className="text-2xl font-bold text-slate-100 mb-4">미확정 관리</h2>

      {error && <div className="mb-4 p-3 bg-red-900/30 text-red-300 rounded border border-red-700">{error}</div>}

      {bookings.length === 0 ? (
        <p className="text-slate-400">미확정 예약이 없습니다.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-700">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-700/50 border-b border-slate-600">
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-200">고객사</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-200">날짜</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-200">상태</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-200">사유</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-slate-200">액션</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id} className="border-b border-slate-600 hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-200">{booking.customer}</td>
                  <td className="px-4 py-3 text-sm text-slate-200">{booking.date}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-3 py-1 rounded font-semibold text-xs ${getBadgeColor(booking.decision)}`}>
                      {getDecisionLabel(booking.decision)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="text-slate-300">{booking.reason}</div>
                    {booking.decision === 'review' && booking.options && (
                      <div className="mt-1 text-xs text-slate-400">
                        대상: {booking.options}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm space-y-1">
                    {booking.decision === 'pending' && booking.candidate && (
                      <>
                        <button
                          onClick={() => handleConfirm(booking)}
                          className="block w-full px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 transition-colors"
                        >
                          확정
                        </button>
                      </>
                    )}

                    {booking.decision === 'review' && booking.options && (
                      <div className="space-y-1">
                        {booking.options.split(',').map((customer) => (
                          <button
                            key={customer}
                            onClick={() => {
                              const otherCustomer = booking.options
                                ?.split(',')
                                .find(c => c !== customer) || ''
                              handleReview(customer.trim(), otherCustomer)
                            }}
                            className="block w-full px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition-colors"
                          >
                            {customer.trim()} 이 쪽으로 확정
                          </button>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => toggleExpanded(booking.id)}
                      className="block w-full px-3 py-1 bg-slate-600 text-white rounded text-xs hover:bg-slate-700 transition-colors"
                    >
                      {expandedRows.has(booking.id) ? '과정 숨기기' : '과정 보기'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 확장된 행의 trace 표시 */}
      {bookings.map((booking) => (
        expandedRows.has(booking.id) && booking.trace && (
          <div key={`trace-${booking.id}`} className="mt-6 p-4 bg-slate-700/50 rounded border border-slate-600">
            <h3 className="font-semibold text-slate-200 mb-3">{booking.customer} - 판정 과정</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-slate-300">
              {booking.trace.split('\n').map((line, idx) => (
                <li key={idx}>{line}</li>
              ))}
            </ol>
          </div>
        )
      ))}
    </div>
  )
}
