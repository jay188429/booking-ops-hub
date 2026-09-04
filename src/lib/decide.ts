import { requiredSlots, occupied, SLOTS } from './slots'

export interface DecideResult {
  decision: 'asking' | 'rejected' | 'review' | 'pending' | 'confirmed_auto' | 'confirmed_human'
  reason: string
  options?: string
  slotAssigned?: string
  candidate?: string
  trace: string[]
}

export function decide(
  booking: {
    kind: string
    date: string
    slots_wanted?: string
    customer: string
  },
  allBookings: Array<{
    date: string
    decision: string
    slot_assigned?: string
    kind: string
    slots_wanted?: string
    customer: string
  }>,
  autoOn: boolean
): DecideResult {
  const trace: string[] = []

  // 1. 필수 정보 검사
  const missingFields: string[] = []
  if (!booking.kind) missingFields.push('종류')
  if (!booking.date) missingFields.push('날짜')

  const wantedSlots = booking.slots_wanted
    ? booking.slots_wanted.split(',').map(s => s.trim()).filter(s => s)
    : []

  if (wantedSlots.length === 0) missingFields.push('희망 슬롯')

  if (missingFields.length > 0) {
    trace.push(`1 빈 칸 검사: ${missingFields.join(', ')}`)
    return {
      decision: 'asking',
      reason: `빈 칸: ${missingFields.join(', ')}`,
      trace,
    }
  }

  trace.push('1 빈 칸 검사: 없음')

  // 2. 종류별 필요한 칸 계산
  const required = requiredSlots(booking.kind, wantedSlots)
  trace.push(`2 종류 ${booking.kind} -> 필요한 칸 ${required.length}개 (희망 ${wantedSlots.join(',')})`)

  // 3. 그 날짜에 이미 찬 칸 확인
  const occupiedSlots = occupied(booking.date, allBookings)
  const available = SLOTS.map(slot => ({
    slot,
    isAvailable: !occupiedSlots.has(slot),
  }))
  trace.push(
    `3 ${booking.date} 달력: ${available.map(a => `${a.slot} ${a.isAvailable ? 'O' : 'X'}`).join(', ')}`
  )

  // 4. 희망 슬롯 순서대로 필요한 칸이 전부 비어있는 후보 찾기
  let firstCandidate: string | null = null
  for (const slot of wantedSlots) {
    const requiredForSlot = requiredSlots(booking.kind, [slot])
    const allAvailable = requiredForSlot.every(s => !occupiedSlots.has(s))
    if (allAvailable) {
      firstCandidate = requiredForSlot.join('+')
      break
    }
  }

  trace.push(`4 희망 순서대로 필요한 칸이 전부 O 인 후보: ${firstCandidate || '없음'}`)

  // 5. 후보가 없으면 rejected
  if (!firstCandidate) {
    const emptySlots = available.filter(a => a.isAvailable).map(a => a.slot)
    trace.push(`결과: 거절 - 희망 슬롯 전부 찼음`)
    return {
      decision: 'rejected',
      reason: '희망 슬롯 전부 찼음',
      options: emptySlots.join(','),
      trace,
    }
  }

  // 6. 같은 날짜의 다른 pending 예약 중 동점 확인
  const pendingOnSameDay = allBookings.filter(
    b =>
      b.date === booking.date &&
      b.decision === 'pending' &&
      b.customer !== booking.customer
  )

  let conflictBooking: typeof pendingOnSameDay[0] | null = null
  for (const other of pendingOnSameDay) {
    const otherWanted = other.slots_wanted
      ? other.slots_wanted.split(',').map(s => s.trim()).filter(s => s)
      : []
    if (otherWanted.length === 0 || !other.kind) continue

    let otherFirstCandidate: string | null = null
    for (const slot of otherWanted) {
      const requiredForSlot = requiredSlots(other.kind, [slot])
      const allAvailable = requiredForSlot.every(s => !occupiedSlots.has(s))
      if (allAvailable) {
        otherFirstCandidate = requiredForSlot.join('+')
        break
      }
    }

    if (otherFirstCandidate && otherFirstCandidate === firstCandidate) {
      conflictBooking = other
      break
    }
  }

  if (conflictBooking) {
    trace.push(
      `5 같은 날 대기 요청 비교: 겹치는 유일 후보 있음 - ${conflictBooking.customer}`
    )
    trace.push(`결과: 검토 - 동점`)
    return {
      decision: 'review',
      reason: `동점 - ${conflictBooking.customer} 도 같은 칸이 유일 후보`,
      options: `${booking.customer},${conflictBooking.customer}`,
      trace,
    }
  }

  trace.push(`5 같은 날 대기 요청 비교: 겹치는 유일 후보 없음`)

  // 7. 자동/수동 확정
  if (autoOn) {
    trace.push(`결과: 확정-자동 - 빈 칸 ${firstCandidate} 확정`)
    return {
      decision: 'confirmed_auto',
      slotAssigned: firstCandidate,
      reason: `빈 칸 ${firstCandidate} 확정`,
      trace,
    }
  } else {
    trace.push(`결과: 대기 - 후보 ${firstCandidate} 확정 버튼 대기`)
    return {
      decision: 'pending',
      candidate: firstCandidate,
      reason: `후보 ${firstCandidate} - 확정 버튼 대기`,
      trace,
    }
  }
}
