import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { decide } from '../lib/decide'
import WorkflowGraph from './WorkflowGraph'
import JudgmentLog from './JudgmentLog'
import StatusBoard from './StatusBoard'

export default function Dashboard() {
  const [autoJudge, setAutoJudge] = useState(true)
  const [judging, setJudging] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [lastDecision, setLastDecision] = useState<any>(null)
  const [realtimeEvent, setRealtimeEvent] = useState<any>(null)

  useEffect(() => {
    const saved = localStorage.getItem('auto-judge')
    if (saved !== null) {
      setAutoJudge(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('bookings-board')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'bookings',
      }, (payload) => {
        const next = payload.new as any
        const previous = payload.old as any
        setRealtimeEvent({ ...payload, receivedAt: Date.now() })
        setRefreshKey((value) => value + 1)

        if (payload.eventType === 'INSERT') {
          setLastDecision({ fromState: '접수', toState: '대기', booking: next, timestamp: Date.now() })
        } else if (payload.eventType === 'UPDATE') {
          const from = previous?.decision || 'pending'
          const to = next?.decision || from
          const state = (decision: string) => ({
            pending: '대기', confirmed_auto: '확정-자동', confirmed_human: '확정-수동',
            review: '검토', rejected: '기각', asking: '질문',
          } as Record<string, string>)[decision] || '대기'
          const edge = from === 'pending' && to !== 'pending'
            ? { fromState: '판정', toState: state(to) }
            : from === 'review' && to === 'confirmed_human'
              ? { fromState: '검토', toState: '확정-수동' }
              : from === 'confirmed_human' && to === 'pending'
                ? { fromState: '확정-수동', toState: '대기' }
                : from === 'asking' && to === 'pending'
                  ? { fromState: '질문', toState: '대기' }
                  : null
          if (edge) setLastDecision({ ...edge, booking: next, timestamp: Date.now() })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleAutoJudgeToggle = () => {
    const newValue = !autoJudge
    setAutoJudge(newValue)
    localStorage.setItem('auto-judge', JSON.stringify(newValue))
  }

  const handleJudgeAll = async () => {
    setJudging(true)
    try {
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: true })
      if (bookingsError) throw bookingsError

      const pendingBookings = (bookings || []).filter((booking: any) => !booking.decision || booking.decision === 'pending')
      if (pendingBookings.length === 0) {
        alert('판정할 예약이 없습니다.')
        setJudging(false)
        return
      }

      const { data: allBookings, error: allBookingsError } = await supabase.from('bookings').select('*')
      if (allBookingsError) throw allBookingsError

      const workingBookings = [...(allBookings || [])]
      for (const booking of pendingBookings) {
        const result = decide(
          {
            kind: booking.kind,
            date: booking.date,
            slots_wanted: booking.slots_wanted,
            customer: booking.customer,
          },
          workingBookings,
          autoJudge
        )

        const { error: updateError } = await supabase
          .from('bookings')
          .update({
            decision: result.decision,
            reason: result.reason,
            options: result.options,
            slot_assigned: result.slotAssigned,
            trace: result.trace.join('\n'),
          })
          .eq('id', booking.id)

        if (updateError) throw updateError
        const index = workingBookings.findIndex((item: any) => item.id === booking.id)
        if (index >= 0) {
          workingBookings[index] = {
            ...workingBookings[index],
            decision: result.decision,
            slot_assigned: result.slotAssigned,
          }
        }

        setLastDecision({
          booking,
          fromState: 'pending',
          toState: result.decision,
          timestamp: Date.now(),
        })

        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      setRefreshKey((prev) => prev + 1)
      alert('모든 예약을 판정했습니다.')
    } catch (err) {
      console.error('Error judging bookings:', err)
      alert('판정 중 오류가 발생했습니다.')
    } finally {
      setJudging(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 토글과 버튼 */}
      <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoJudge}
              onChange={handleAutoJudgeToggle}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-700">자동 판정</span>
          </label>
          <span className="text-xs text-gray-500">
            {autoJudge ? '(자동으로 확정)' : '(수동 확인 필요)'}
          </span>
        </div>

        <button
          onClick={handleJudgeAll}
          disabled={judging}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
        >
          {judging ? '판정 중...' : '전부 판정'}
        </button>
      </div>

      {/* 워크플로 그래프 */}
      <WorkflowGraph refreshKey={refreshKey} lastDecision={lastDecision} />

      {/* 판정 로그 */}
      <JudgmentLog realtimeEvent={realtimeEvent} />

      {/* 상태 보드 */}
      <StatusBoard refreshKey={refreshKey} />
    </div>
  )
}
