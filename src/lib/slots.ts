export const SLOTS = ['오전', '오후-1', '오후-2']

export const NEED: Record<string, number> = {
  '서울': 1,
  '내부': 1,
  '경기': 2,
  '지방': 3,
}

export function requiredSlots(kind: string, wanted: string[]): string[] {
  const need = NEED[kind] || 1

  if (need === 1) {
    return wanted
  }

  if (need === 2) {
    const result = new Set<string>()
    wanted.forEach(slot => {
      result.add(slot)
      if (slot === '오전') {
        result.add('오후-1')
      } else if (slot === '오후-1') {
        result.add('오후-2')
      } else if (slot === '오후-2') {
        result.add('오후-1')
      }
    })
    return Array.from(result).sort((a, b) => SLOTS.indexOf(a) - SLOTS.indexOf(b))
  }

  return SLOTS
}

export function occupied(
  date: string,
  bookings: Array<{ date: string; decision: string; slot_assigned?: string }>
): Set<string> {
  const result = new Set<string>()
  bookings.forEach(b => {
    if (
      b.date === date &&
      (b.decision === 'confirmed_auto' || b.decision === 'confirmed_human') &&
      b.slot_assigned
    ) {
      b.slot_assigned.split(',').forEach(slot => result.add(slot.trim()))
    }
  })
  return result
}
