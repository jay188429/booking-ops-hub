import { supabase } from './supabase'

const SLOT_START_TIMES: Record<string, string> = {
  오전: '10:00',
  '오후-1': '13:00',
  '오후-2': '15:00',
  morning: '10:00',
  afternoon1: '13:00',
  afternoon2: '15:00',
}

export async function notifyConfirmedCalendar(booking: {
  customer: string
  service?: string
  date: string
  time?: string
  slot_assigned?: string | null
  address?: string | null
  decision: string | null
}) {
  if (!['confirmed_auto', 'confirmed_human'].includes(booking.decision || '')) {
    return
  }
  const assignedSlot = booking.slot_assigned?.split(',')[0]?.trim()
  const timeFromLabel = booking.time?.includes('오전')
    ? '10:00'
    : booking.time?.includes('오후-1')
      ? '13:00'
      : booking.time?.includes('오후-2')
        ? '15:00'
        : undefined
  const time = booking.time?.match(/\b\d{2}:\d{2}\b/)?.[0]
    || SLOT_START_TIMES[assignedSlot || '']
    || timeFromLabel
  if (!time) return

  const { error } = await supabase.functions.invoke('add-to-google-calendar', {
    body: {
      customer: booking.customer,
      service: booking.service || '예약',
      date: booking.date,
      time,
      address: booking.address || '',
    },
  })

  if (error) throw error
}
