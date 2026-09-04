import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface WorkflowGraphProps {
  refreshKey: number
  lastDecision?: {
    booking: any
    fromState: string
    toState: string
    timestamp: number
  }
}

interface NodeCounts {
  접수: number
  대기: number
  판정: number
  '확정-자동': number
  '확정-수동': number
  검토: number
  기각: number
  질문: number
}

export default function WorkflowGraph({ refreshKey, lastDecision }: WorkflowGraphProps) {
  const [counts, setCounts] = useState<NodeCounts>({
    접수: 0,
    대기: 0,
    판정: 0,
    '확정-자동': 0,
    '확정-수동': 0,
    검토: 0,
    기각: 0,
    질문: 0,
  })
  const [highlightedEdge, setHighlightedEdge] = useState<string | null>(null)

  useEffect(() => {
    fetchCounts()
  }, [refreshKey])

  useEffect(() => {
    if (lastDecision) {
      const edgeKey = `${lastDecision.fromState}-${lastDecision.toState}`
      setHighlightedEdge(edgeKey)
      const timer = setTimeout(() => setHighlightedEdge(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [lastDecision])

  const fetchCounts = async () => {
    try {
      const { data } = await supabase.from('bookings').select('decision')
      if (!data) return

      const newCounts: NodeCounts = {
        접수: 0,
        대기: 0,
        판정: 0,
        '확정-자동': 0,
        '확정-수동': 0,
        검토: 0,
        기각: 0,
        질문: 0,
      }

      data.forEach((b: any) => {
        if (!b.decision) {
          newCounts.대기++
        } else if (b.decision === 'pending') {
          newCounts.대기++
        } else if (b.decision === 'confirmed_auto') {
          newCounts['확정-자동']++
        } else if (b.decision === 'confirmed_human') {
          newCounts['확정-수동']++
        } else if (b.decision === 'review') {
          newCounts.검토++
        } else if (b.decision === 'rejected') {
          newCounts.기각++
        } else if (b.decision === 'asking') {
          newCounts.질문++
        }
      })

      setCounts(newCounts)
    } catch (err) {
      console.error('Error fetching counts:', err)
    }
  }

  const getNodeColor = (node: string): string => {
    switch (node) {
      case '대기':
        return '#e5e7eb'
      case '확정-자동':
        return '#bbf7d0'
      case '확정-수동':
        return '#86efac'
      case '검토':
        return '#fef08a'
      case '기각':
        return '#fecaca'
      case '질문':
        return '#bfdbfe'
      case '판정':
        return '#ffffff'
      default:
        return '#f3f4f6'
    }
  }

  const isEdgeHighlighted = (from: string, to: string): boolean => {
    return highlightedEdge === `${from}-${to}`
  }

  const nodePositions: Record<string, [number, number]> = {
    접수: [100, 150],
    대기: [250, 150],
    판정: [400, 150],
    '확정-자동': [600, 50],
    '확정-수동': [600, 150],
    검토: [600, 250],
    기각: [600, 350],
    질문: [600, 450],
  }

  const edges = [
    ['접수', '대기'],
    ['대기', '판정'],
    ['판정', '확정-자동'],
    ['판정', '확정-수동'],
    ['판정', '검토'],
    ['판정', '기각'],
    ['판정', '질문'],
    ['검토', '확정-수동'],
    ['질문', '대기'],
    ['확정-수동', '대기'],
  ]

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">판정 워크플로</h3>
      <svg width="100%" height="550" viewBox="0 0 700 550" className="border border-gray-200 rounded">
        {/* 화살표 정의 */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#666" />
          </marker>
          <marker id="arrowhead-highlight" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#ff6b6b" />
          </marker>
        </defs>

        {/* 화살표 그리기 */}
        {edges.map(([from, to], idx) => {
          const [x1, y1] = nodePositions[from]
          const [x2, y2] = nodePositions[to]
          const isHighlighted = isEdgeHighlighted(from, to)

          return (
            <line
              key={`edge-${idx}`}
              x1={x1 + 40}
              y1={y1}
              x2={x2 - 40}
              y2={y2}
              stroke={isHighlighted ? '#ff6b6b' : '#d1d5db'}
              strokeWidth={isHighlighted ? 3 : 2}
              markerEnd={isHighlighted ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)'}
              strokeDasharray={isHighlighted ? '0' : '0'}
            />
          )
        })}

        {/* 노드 그리기 */}
        {Object.entries(nodePositions).map(([node, [x, y]]) => {
          const count = counts[node as keyof NodeCounts] || 0
          const color = getNodeColor(node)
          const textColor = node === '판정' ? '#000' : '#000'
          const strokeColor = node === '판정' ? '#000' : 'none'

          return (
            <g key={`node-${node}`}>
              <circle cx={x + 20} cy={y} r={35} fill={color} stroke={strokeColor} strokeWidth={node === '판정' ? 2 : 0} />
              <text x={x + 20} y={y - 5} textAnchor="middle" fontSize="11" fontWeight="bold" fill={textColor}>
                {node}
              </text>
              <circle cx={x + 20} cy={y} r={12} fill="#666" />
              <text x={x + 20} y={y + 4} textAnchor="middle" fontSize="12" fontWeight="bold" fill="white">
                {count}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
