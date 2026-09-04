import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface LogEntry {
  id: string
  customer: string
  decision: string
  trace: string[]
  timestamp: number
}

export default function JudgmentLog({ realtimeEvent }: { realtimeEvent?: any }) {
  const [logs, setLogs] = useState<LogEntry[]>([])

  useEffect(() => {
    fetchRecentLogs()
  }, [])

  useEffect(() => {
    const updated = realtimeEvent?.new
    if (!updated || !updated.decision || updated.decision === 'pending') return
    const newLog: LogEntry = {
      id: `${updated.id}-${realtimeEvent.receivedAt}`,
      customer: updated.customer,
      decision: updated.decision,
      trace: updated.trace ? updated.trace.split('\n') : [],
      timestamp: realtimeEvent.receivedAt,
    }
    setLogs((prev) => [newLog, ...prev].slice(0, 12))
  }, [realtimeEvent])

  const fetchRecentLogs = async () => {
    try {
      const { data } = await supabase
        .from('bookings')
        .select('id, customer, decision, trace')
        .in('decision', ['confirmed_auto', 'confirmed_human', 'rejected', 'review', 'asking'])
        .order('created_at', { ascending: false })
        .limit(12)

      if (data) {
        setLogs(
          data.map((b: any) => ({
            id: b.id,
            customer: b.customer,
            decision: b.decision,
            trace: b.trace ? b.trace.split('\n') : [],
            timestamp: Date.now(),
          }))
        )
      }
    } catch (err) {
      console.error('Error fetching logs:', err)
    }
  }

  const getBadgeColor = (decision: string) => {
    switch (decision) {
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
        return decision
    }
  }

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('ko-KR')
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">판정 로그</h3>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {logs.length === 0 ? (
          <p className="text-gray-500 text-sm">판정된 예약이 없습니다.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="border-l-4 border-gray-300 pl-4 py-2">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-600">{formatTime(log.timestamp)}</span>
                <span className="font-semibold text-gray-800">{log.customer}</span>
                <span className={`px-2 py-1 rounded text-xs font-semibold ${getBadgeColor(log.decision)}`}>
                  {getDecisionLabel(log.decision)}
                </span>
              </div>
              {log.trace.length > 0 && (
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  {log.trace.slice(-3).map((line, idx) => (
                    <div key={idx} className="text-gray-500">
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
