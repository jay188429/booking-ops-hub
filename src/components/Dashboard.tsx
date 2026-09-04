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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* 헤더 */}
      <div className="border-b border-slate-700 backdrop-blur-sm bg-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-400 via-red-400 to-pink-400 bg-clip-text text-transparent mb-2">
                판정 대시보드
              </h1>
              <p className="text-slate-400 text-sm">예약 판정 흐름 모니터링</p>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-3 px-4 py-2 rounded-lg bg-slate-700/50 border border-slate-600 cursor-pointer hover:bg-slate-700 transition-colors">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={autoJudge}
                    onChange={handleAutoJudgeToggle}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all ${
                    autoJudge ? 'bg-orange-500 border-orange-500' : 'border-slate-500'
                  }`}></div>
                </div>
                <span className="text-sm font-medium text-slate-200">자동 판정</span>
                <span className="text-xs text-slate-400">
                  {autoJudge ? '자동 확정' : '수동 확인'}
                </span>
              </label>

              <button
                onClick={handleJudgeAll}
                disabled={judging}
                className="px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 shadow-lg"
              >
                {judging ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-white border-r-transparent animate-spin"></div>
                    판정 중...
                  </span>
                ) : (
                  '전부 판정'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* 워크플로 그래프 */}
        <div className="backdrop-blur-sm bg-slate-800/50 rounded-xl border border-slate-700 p-6 shadow-xl">
          <WorkflowGraph refreshKey={refreshKey} lastDecision={lastDecision} />
        </div>

        {/* 판정 로그와 상태 보드 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 판정 로그 */}
          <div className="lg:col-span-1 backdrop-blur-sm bg-slate-800/50 rounded-xl border border-slate-700 p-6 shadow-xl max-h-96 overflow-hidden">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              판정 로그
            </h3>
            <JudgmentLog realtimeEvent={realtimeEvent} />
          </div>

          {/* 상태 보드 */}
          <div className="lg:col-span-2 backdrop-blur-sm bg-slate-800/50 rounded-xl border border-slate-700 p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500"></span>
              상태 현황
            </h3>
            <StatusBoard refreshKey={refreshKey} />
          </div>
        </div>
      </div>
    </div>
  )
}
