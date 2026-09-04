import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type BoardStatus = 'waiting' | 'auto' | 'human' | 'blocked' | 'question'

interface Booking {
  id: number
  customer: string
  service: string
  date: string
  time: string
  address: string | null
  status: 'pending' | 'confirmed'
  decision_status: BoardStatus
}

const columns: Array<{
  key: BoardStatus
  label: string
  className: string
}> = [
  { key: 'waiting', label: '대기', className: 'border-slate-200 bg-slate-50' },
  { key: 'auto', label: '자동', className: 'border-green-200 bg-green-50' },
  { key: 'human', label: '사람', className: 'border-yellow-200 bg-yellow-50' },
  { key: 'blocked', label: '막힘', className: 'border-red-200 bg-red-50' },
  { key: 'question', label: '질문', className: 'border-blue-200 bg-blue-50' },
]

export default function StatusBoard({ refreshKey = 0 }: { refreshKey?: number }) {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [rerunKey, setRerunKey] = useState(0)

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true)
      const { data, error } = await supabase
        .from('bookings')
        .select('id, customer, service, date, time, address, status, decision_status')
        .order('date', { ascending: true })
        .order('time', { ascending: true })

      if (error) {
        console.error('Error fetching dashboard bookings:', error)
        setBookings([])
      } else {
        const loaded = (data || []) as Booking[]
        const waiting = loaded.filter((booking) => booking.decision_status === 'waiting')
        const automaticallyClassified = await Promise.all(waiting.map(async (booking) => {
          const nextStatus: BoardStatus = booking.address?.trim() ? 'auto' : 'question'
          const { error: updateError } = await supabase
            .from('bookings')
            .update({ decision_status: nextStatus })
            .eq('id', booking.id)

          if (updateError) {
            console.error('Error updating automatic decision:', updateError)
            return booking
          }
          return { ...booking, decision_status: nextStatus }
        }))
        const classifiedById = new Map(automaticallyClassified.map((booking) => [booking.id, booking]))
        setBookings(loaded.map((booking) => classifiedById.get(booking.id) || booking))
      }
      setLoading(false)
    }

    fetchBookings()
  }, [refreshKey, rerunKey])

  const groupedBookings = useMemo(() => {
    const groups: Record<BoardStatus, Booking[]> = {
      waiting: [],
      auto: [],
      human: [],
      blocked: [],
      question: [],
    }

    bookings.forEach((booking) => {
      groups[booking.decision_status].push(booking)
    })

    return groups
  }, [bookings])

  if (loading) {
    return <div className="h-96 rounded-xl bg-white p-8 text-center text-slate-500 shadow-sm">로딩 중...</div>
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm md:p-7">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">상태 보드</h2>
          <p className="mt-1 text-sm text-slate-500">예약의 현재 처리 상태를 한눈에 확인합니다.</p>
        </div>
        <button
          type="button"
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          onClick={() => setRerunKey((value) => value + 1)}
        >
          전부 자동 판정
        </button>
      </div>

      <div className="grid min-h-[28rem] grid-cols-1 gap-3 md:grid-cols-5">
        {columns.map((column) => {
          const items = groupedBookings[column.key]
          return (
            <div key={column.key} className={`rounded-xl border p-3 ${column.className}`}>
              <div className="mb-3 inline-flex rounded-md bg-white/80 px-2.5 py-1 text-sm font-bold text-slate-700 shadow-sm">
                {column.label} ({items.length})
              </div>
              <div className="space-y-2">
                {items.map((booking) => (
                  <article key={booking.id} className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                    <h3 className="truncate font-semibold text-slate-800">{booking.customer}</h3>
                    <p className="mt-1 text-xs text-slate-500">{booking.date} {booking.time}</p>
                    <p className="truncate text-sm text-slate-600">{booking.service}</p>
                    {booking.address && <p className="truncate text-xs text-slate-500">{booking.address}</p>}
                  </article>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
