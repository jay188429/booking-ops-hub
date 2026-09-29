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
        return '#64748b'
      case '확정-자동':
        return '#10b981'
      case '확정-수동':
        return '#06b6d4'
      case '검토':
        return '#f59e0b'
      case '기각':
        return '#ef4444'
      case '질문':
        return '#6366f1'
      case '판정':
        return '#1e293b'
      default:
        return '#475569'
    }
  }

  const isEdgeHighlighted = (from: string, to: string): boolean => {
    return highlightedEdge === `${from}-${to}`
  }

  const nodePositions: Record<string, [number, number]> = {
    접수: [80, 150],
    대기: [220, 150],
    판정: [360, 150],
    '확정-자동': [540, 50],
    '확정-수동': [540, 150],
    검토: [540, 250],
    기각: [540, 350],
    질문: [540, 450],
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
    <div className="w-full flex justify-center">
      <svg width="100%" height="550" viewBox="0 0 640 550" className="drop-shadow-2xl" style={{ maxWidth: '900px' }}>
        {/* 화살표 정의 */}
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#cbd5e1" />
          </marker>
          <marker id="arrowhead-highlight" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#fbbf24" />
          </marker>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          <linearGradient id="gradientBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* 배경 */}
        <rect width="640" height="550" fill="url(#gradientBg)" rx="12" />

        {/* 화살표 그리기 */}
        {edges.map(([from, to], idx) => {
          const [x1, y1] = nodePositions[from]
          const [x2, y2] = nodePositions[to]
          const isHighlighted = isEdgeHighlighted(from, to)

          return (
            <line
              key={`edge-${idx}`}
              x1={x1 + 30}
              y1={y1}
              x2={x2 - 30}
              y2={y2}
              stroke={isHighlighted ? '#fbbf24' : '#475569'}
              strokeWidth={isHighlighted ? 5 : 2.5}
              markerEnd={isHighlighted ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)'}
              filter={isHighlighted ? 'url(#glow)' : ''}
              opacity={isHighlighted ? 1 : 0.5}
              strokeLinecap="round"
            />
          )
        })}

        {/* 노드 그리기 */}
        {Object.entries(nodePositions).map(([node, [x, y]]) => {
          const count = counts[node as keyof NodeCounts] || 0
          const color = getNodeColor(node)
          const isSpecial = node === '판정'

          return (
            <g key={`node-${node}`}>
              {/* 노드 배경 (그림자) */}
              <circle
                cx={x + 20}
                cy={y + 2}
                r={31}
                fill="#000000"
                opacity="0.15"
              />

              {/* 노드 메인 원 */}
              <circle
                cx={x + 20}
                cy={y}
                r={30}
                fill={color}
                opacity="0.95"
                style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
              />

              {/* 노드 테두리 */}
              {isSpecial && (
                <circle
                  cx={x + 20}
                  cy={y}
                  r={30}
                  fill="none"
                  stroke="#94a3b8"
                  strokeWidth="2.5"
                  opacity="0.4"
                />
              )}

              {/* 노드 텍스트 */}
              <text
                x={x + 20}
                y={y + 1}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="#ffffff"
                letterSpacing="0.3"
                style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}
              >
                {node}
              </text>

              {/* 카운트 배지 */}
              <circle
                cx={x + 20}
                cy={y + 24}
                r={13}
                fill="#fb923c"
                opacity="0.95"
                style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.25))' }}
              />
              <text
                x={x + 20}
                y={y + 28}
                textAnchor="middle"
                fontSize="13"
                fontWeight="800"
                fill="#0f172a"
              >
                {count}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
