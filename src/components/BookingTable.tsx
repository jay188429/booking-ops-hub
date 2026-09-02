import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import MapModal from './MapModal'

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
}

interface BookingTableProps {
  refreshKey?: number
}

export default function BookingTable({ refreshKey }: BookingTableProps) {
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
        className="text-blue-600 underline hover:text-blue-800 transition-colors"
      >
        {address}
      </button>
    )
  }

  if (loading) {
    return <div className="p-4 text-center text-gray-500">로딩 중...</div>
  }

  if (bookings.length === 0) {
    return <div className="p-4 text-center text-gray-500">예약이 없습니다</div>
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border border-gray-300 px-4 py-2 text-left">고객사</th>
            <th className="border border-gray-300 px-4 py-2 text-left">서비스</th>
            <th className="border border-gray-300 px-4 py-2 text-left">날짜</th>
            <th className="border border-gray-300 px-4 py-2 text-left">시간</th>
            <th className="border border-gray-300 px-4 py-2 text-left">주소</th>
            <th className="border border-gray-300 px-4 py-2 text-left">위도/경도</th>
            <th className="border border-gray-300 px-4 py-2 text-center">상태</th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((booking) => (
            <tr key={booking.id} className="hover:bg-gray-50">
              <td className="border border-gray-300 px-4 py-2">{booking.customer}</td>
              <td className="border border-gray-300 px-4 py-2">{booking.service}</td>
              <td className="border border-gray-300 px-4 py-2">{booking.date}</td>
              <td className="border border-gray-300 px-4 py-2">{booking.time}</td>
              <td className="border border-gray-300 px-4 py-2">
                {getAddressElement(booking.address)}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-sm">
                {booking.latitude && booking.longitude ? (
                  <span className="text-gray-600">
                    {booking.latitude.toFixed(4)}, {booking.longitude.toFixed(4)}
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </td>
              <td className="border border-gray-300 px-4 py-2 text-center">
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
