import { supabase } from './supabase'

// Ordered lifecycle the mover drives a job through.
export const STATUS_FLOW = ['accepted', 'en_route', 'loading', 'in_transit', 'at_dropoff', 'delivered']

export const STATUS_LABEL = {
  pending: 'Pending',
  accepted: 'Accepted',
  en_route: 'En Route to Pickup',
  loading: 'Loading Items',
  in_transit: 'In Transit',
  at_dropoff: 'At Drop-off',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

// CTA text for advancing FROM the current status to the next one.
export const NEXT_ACTION = {
  accepted: 'Start — Head to Pickup',
  en_route: 'Arrived — Start Loading',
  loading: 'Loaded — Start Transit',
  in_transit: 'Arrived at Drop-off',
  at_dropoff: 'Complete Delivery',
}

export function nextStatus(status) {
  const i = STATUS_FLOW.indexOf(status)
  if (i === -1 || i === STATUS_FLOW.length - 1) return null
  return STATUS_FLOW[i + 1]
}

// ---------- proof-of-delivery handshake ----------
// Customer shows this QR at drop-off; mover scans it to confirm delivery.
// The booking id is the shared secret carried over the physical scan.
export const DELIVERY_PREFIX = 'SMARTSHIFT:DELIVERY:'
export const deliveryPayload = (id) => `${DELIVERY_PREFIX}${id}`
export function matchesDelivery(text, id) {
  const t = (text || '').trim()
  return t === deliveryPayload(id) || t === String(id)
}

export function statusTone(status) {
  if (status === 'delivered') return 'green'
  if (status === 'pending') return 'pending'
  if (status === 'cancelled') return 'red'
  return 'progress'
}

// ---------- create (customer) ----------
export async function createBooking(booking, items) {
  const { data, error } = await supabase.from('bookings').insert(booking).select().single()
  if (error) throw error
  if (items?.length) {
    const rows = items.map((it, i) => ({
      booking_id: data.id,
      name: it.name,
      tag: it.tag || null,
      qr_code: `SS-${String(data.id).slice(0, 4).toUpperCase()}-${String(i + 1).padStart(2, '0')}`,
    }))
    const { error: e2 } = await supabase.from('booking_items').insert(rows)
    if (e2) throw e2
  }
  return data
}

// ---------- reads ----------
export async function listAvailableJobs() {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('status', 'pending')
    .is('mover_id', null)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listMoverJobs(moverId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('mover_id', moverId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function listCustomerBookings(customerId) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getBooking(id) {
  const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function getBookingItems(bookingId) {
  const { data, error } = await supabase
    .from('booking_items')
    .select('*')
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

// ---------- mover actions ----------
// Atomically claim an unassigned pending job. Returns the row, or null if taken.
export async function acceptJob(bookingId, moverId) {
  const { data, error } = await supabase
    .from('bookings')
    .update({ mover_id: moverId, status: 'accepted', accepted_at: new Date().toISOString() })
    .eq('id', bookingId)
    .eq('status', 'pending')
    .is('mover_id', null)
    .select()
  if (error) throw error
  return data?.[0] ?? null
}

export async function setStatus(bookingId, status) {
  const patch = { status }
  if (status === 'delivered') patch.completed_at = new Date().toISOString()
  const { data, error } = await supabase
    .from('bookings')
    .update(patch)
    .eq('id', bookingId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function scanItem(itemId) {
  const { data, error } = await supabase
    .from('booking_items')
    .update({ scanned: true })
    .eq('id', itemId)
    .select()
    .single()
  if (error) throw error
  return data
}
