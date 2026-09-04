import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import WeatherInfo from './WeatherInfo'
import { calculateTravelTime, formatTravelTime, PRESET_START } from '../lib/travelTime'
import type { TravelTimeResult } from '../lib/travelTime'

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
  latitude?: number
  longitude?: number
  address?: string
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
  const [travelTimes, setTravelTimes] = useState<Record<string, TravelTimeResult | null>>({})

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
      const confirmedOutings = data?.filter((booking: Booking) =>
        ['confirmed_auto', 'confirmed_human'].includes(booking.decision) &&
        booking.form === '외근' &&
        Boolean(booking.address?.trim())
      ) || []
      const results = await Promise.all(
        confirmedOutings.map(async (booking: Booking) => {
          try {
            return [booking.id, await calculateTravelTime(booking.address as string)] as const
          } catch (error) {
            console.error(`이동시간 계산 실패 (${booking.customer}):`, error)
            return [booking.id, null] as const
          }
        })
      )
      setTravelTimes(Object.fromEntries(results))
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
        return 'bg-slate-700/50 border-slate-600'
      case '확정-자동':
        return 'bg-green-900/30 border-green-700'
      case '확정-수동':
        return 'bg-green-900/40 border-green-700'
      case '검토':
        return 'bg-yellow-900/30 border-yellow-700'
      case '기각':
        return 'bg-red-900/30 border-red-700'
      case '질문':
        return 'bg-blue-900/30 border-blue-700'
      default:
        return 'bg-slate-700/50 border-slate-600'
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
    <div className="max-h-[620px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/40">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {statuses.map((status) => (
        <div key={status} className={`border rounded-lg p-4 flex flex-col h-96 ${getCardColor(status)}`}>
          <h3 className="font-semibold text-slate-100 mb-3 flex-shrink-0">{status}</h3>
          <div className="space-y-3 overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/30">
            {bookings[status].length === 0 ? (
              <p className="text-sm text-slate-200 font-medium">예약 없음</p>
            ) : (
              bookings[status].map((booking) => (
                <div key={booking.id} className="bg-slate-800/50 rounded p-3 border border-slate-600 text-sm">
                  <div className="font-bold text-white">{booking.customer}</div>
                  <div className="text-slate-50 font-medium mt-1">{booking.date}</div>
                  <div className="text-xs text-slate-100 font-medium mt-1">
                    {booking.kind} · {booking.form}
                  </div>
                  {booking.memo && <div className="text-xs text-slate-100 mt-1">{booking.memo}</div>}
                  {booking.slot_assigned && (
                    <div className="text-xs text-green-200 font-bold mt-1">확정: {booking.slot_assigned}</div>
                  )}
                  {status === '검토' && booking.options && (
                    <div className="text-xs text-yellow-200 font-bold mt-1">대상: {booking.options}</div>
                  )}
                  {booking.reason && (
                    <div className="text-xs text-slate-100 font-medium mt-1 line-clamp-2">{booking.reason}</div>
                  )}
                  {(status === '확정-자동' || status === '확정-수동') && booking.form === '외근' && booking.address && (
                    <div className="text-xs mt-2 pt-2 border-t border-slate-600">
                      <div className="text-slate-300 font-medium">출발지: {PRESET_START.name}</div>
                      {travelTimes[booking.id] ? (
                        <div className="text-orange-200 font-bold mt-1">{formatTravelTime(travelTimes[booking.id])}</div>
                      ) : (
                        <div className="text-slate-400 mt-1">이동시간 계산 중이거나 경로를 찾지 못했습니다.</div>
                      )}
                    </div>
                  )}
                  {(status === '확정-자동' || status === '확정-수동') && booking.form === '외근' && travelTimes[booking.id] && (
                    <div className="text-xs mt-2 pt-2 border-t border-slate-600">
                      <div className="text-slate-300 font-medium mb-1">예상 날씨:</div>
                      <WeatherInfo
                        latitude={travelTimes[booking.id]?.latitude as number}
                        longitude={travelTimes[booking.id]?.longitude as number}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ))}
      </div>
    </div>
  )
}
