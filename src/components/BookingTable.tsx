import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import MapModal from './MapModal'
import WeatherInfo from './WeatherInfo'

interface Booking {
  id: string
  customer: string
  service: string
  date: string
  time: string
  address: string
  latitude?: number
  longitude?: number
  status: 'pending' | 'confirmed'
  decision_status: 'waiting' | 'auto' | 'human' | 'blocked' | 'question'
}

interface BookingTableProps {
  refreshKey?: number
  showJudgement?: boolean
}

export default function BookingTable({ refreshKey, showJudgement = false }: BookingTableProps) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null)
  const [isMapOpen, setIsMapOpen] = useState(false)

  useEffect(() => {
    fetchBookings()
  }, [refreshKey])

  async function fetchBookings() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .not('decision', 'in', '("confirmed_auto","confirmed_human")')
        .order('date', { ascending: false })

      if (error) throw error
      setBookings(data || [])
    } catch (error) {
      console.error('Error fetching bookings:', error)
      setBookings([])
    } finally {
      setLoading(false)
    }
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'pending' ? 'confirmed' : 'pending'
    setToggling(id)

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', id)

      if (error) throw error
      await fetchBookings()
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setToggling(null)
    }
  }

  async function toggleDecision(id: string, currentDecision: Booking['decision_status']) {
    const nextDecision = currentDecision === 'human' ? 'auto' : 'human'
    setToggling(id)

    try {
      const { error } = await supabase
        .from('bookings')
        .update({ decision_status: nextDecision })
        .eq('id', id)

      if (error) throw error
      await fetchBookings()
    } catch (error) {
      console.error('Error updating decision:', error)
    } finally {
      setToggling(null)
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'pending'
      ? 'bg-yellow-100 text-yellow-800'
      : 'bg-green-100 text-green-800'
  }

  const getStatusLabel = (status: string) => {
    return status === 'pending' ? '대기중' : '확정'
  }

  const handleAddressClick = (address: string) => {
    setSelectedAddress(address)
    setIsMapOpen(true)
  }

  const getAddressElement = (address: string) => {
    if (!address || address.trim() === '') {
      return '-'
    }
    return (
      <button
        onClick={() => handleAddressClick(address)}
        className="text-orange-400 underline hover:text-orange-300 transition-colors"
      >
        {address}
      </button>
    )
  }

  if (loading) {
    return <div className="p-4 text-center text-slate-400">로딩 중...</div>
  }

  if (bookings.length === 0) {
    return <div className="p-4 text-center text-slate-400">예약이 없습니다</div>
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full border-collapse">
        <thead className="bg-slate-700/50 border-b border-slate-600">
          <tr>
            <th className="px-4 py-2 text-left text-slate-200 font-semibold">고객사</th>
            <th className="px-4 py-2 text-left text-slate-200 font-semibold">서비스</th>
            <th className="px-4 py-2 text-left text-slate-200 font-semibold">날짜</th>
            <th className="px-4 py-2 text-left text-slate-200 font-semibold">시간</th>
            <th className="px-4 py-2 text-left text-slate-200 font-semibold">주소</th>
            <th className="px-4 py-2 text-left text-slate-200 font-semibold">위도/경도</th>
            <th className="px-4 py-2 text-left text-slate-200 font-semibold">날씨</th>
            <th className="px-4 py-2 text-center text-slate-200 font-semibold">상태</th>
            {showJudgement && <th className="px-4 py-2 text-center text-slate-200 font-semibold">판정</th>}
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} className="border-b border-slate-600 hover:bg-slate-700/30 transition-colors">
              <td className="px-4 py-2 text-slate-50 font-medium">{booking.customer}</td>
              <td className="px-4 py-2 text-slate-50 font-medium">{booking.service}</td>
              <td className="px-4 py-2 text-slate-50 font-medium">{booking.date}</td>
              <td className="px-4 py-2 text-slate-50 font-medium">{booking.time}</td>
              <td className="px-4 py-2 text-slate-50">
                {getAddressElement(booking.address)}
              </td>
              <td className="px-4 py-2 text-sm">
                {booking.latitude && booking.longitude ? (
                  <span className="text-slate-100 font-medium">
                    {booking.latitude.toFixed(4)}, {booking.longitude.toFixed(4)}
                  </span>
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </td>
              <td className="px-4 py-2 text-sm">
                {booking.latitude && booking.longitude ? (
                  <WeatherInfo latitude={booking.latitude} longitude={booking.longitude} />
                ) : (
                  <span className="text-slate-400">-</span>
                )}
              </td>
              <td className="px-4 py-2 text-center">
                <button
                  onClick={() => toggleStatus(booking.id, booking.status)}
                  disabled={toggling === booking.id}
                  className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition-opacity ${getStatusColor(booking.status)} ${
                    toggling === booking.id ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'
                  }`}
                >
                  {getStatusLabel(booking.status)}
                </button>
              </td>
              {showJudgement && <td className="px-4 py-2 text-center">
                <button
                  type="button"
                  onClick={() => toggleDecision(booking.id, booking.decision_status)}
                  disabled={toggling === booking.id}
                  className="rounded-md bg-orange-600 px-3 py-1 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
                >
                  판정
                </button>
                <span className="ml-2 text-sm font-semibold text-slate-300">{booking.decision_status}</span>
              </td>}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {selectedAddress && (
        <MapModal
          address={selectedAddress}
          isOpen={isMapOpen}
          onClose={() => {
            setIsMapOpen(false)
            setSelectedAddress(null)
          }}
        />
      )}
    </>
  )
}
