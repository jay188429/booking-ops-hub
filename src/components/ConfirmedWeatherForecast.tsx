import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import WeatherInfo from './WeatherInfo'

interface ConfirmedBooking {
  id: string
  customer: string
  date: string
  form: string
  latitude?: number
  longitude?: number
}

interface ConfirmedWeatherForecastProps {
  refreshKey: number
}

export default function ConfirmedWeatherForecast({ refreshKey }: ConfirmedWeatherForecastProps) {
  const [confirmedBookings, setConfirmedBookings] = useState<ConfirmedBooking[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchConfirmedBookings()
  }, [refreshKey])

  const fetchConfirmedBookings = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('bookings')
        .select('id, customer, date, form, latitude, longitude')
        .in('decision', ['confirmed_auto', 'confirmed_human'])
        .eq('form', '외근')
        .order('date', { ascending: true })

      if (data) {
        const uniqueByDate = Array.from(
          new Map(
            data.map(b => [b.date, b])
          ).values()
        )
        setConfirmedBookings(uniqueByDate)
      }
    } catch (err) {
      console.error('Error fetching confirmed bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-6">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (confirmedBookings.length === 0) {
    return (
      <div className="text-center py-6 text-slate-400">
        확정된 외근 예약이 없습니다.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {confirmedBookings.map((booking) => (
        <div
          key={booking.id}
          className="bg-gradient-to-br from-slate-700/50 to-slate-800/50 rounded-lg p-4 border border-slate-600 hover:border-orange-500 transition-colors"
        >
          <div className="mb-3">
            <div className="text-sm font-bold text-white mb-1">{booking.customer}</div>
            <div className="text-xs text-slate-300">{booking.date}</div>
          </div>

          <div className="border-t border-slate-600 pt-3">
            {booking.latitude && booking.longitude ? (
              <div className="text-xs">
                <div className="text-slate-300 font-medium mb-2">📍 예상 날씨</div>
                <WeatherInfo latitude={booking.latitude} longitude={booking.longitude} />
              </div>
            ) : (
              <div className="text-xs text-slate-400">위치 정보 없음</div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
