import { supabase } from './supabase'

// Warehouse storage reservations. Backed by the `storage_bookings` table
// (see SUPABASE_SETUP.md for the schema + RLS policy).

export const STORAGE_UNITS = [
  { id: 'small', name: 'Small Unit', cap: '5 m³ · ~1 room', rate: 200 },
  { id: 'medium', name: 'Medium Unit', cap: '15 m³ · ~2–3 rooms', rate: 450 },
  { id: 'large', name: 'Large Unit', cap: '40 m³ · house / office', rate: 900 },
]

export const STORAGE_DURATIONS = [
  { id: 'w1', label: '1 Week', days: 7 },
  { id: 'w2', label: '2 Weeks', days: 14 },
  { id: 'm1', label: '1 Month', days: 30 },
  { id: 'm3', label: '3 Months', days: 90 },
]

export const WAREHOUSES = [
  'Lahore · Gulberg Hub',
  'Karachi · Korangi Hub',
  'Islamabad · I-9 Hub',
]

export function storagePrice(unitId, days) {
  const u = STORAGE_UNITS.find((x) => x.id === unitId)
  return u ? u.rate * days : 0
}

export async function createStorageBooking(row) {
  const { data, error } = await supabase.from('storage_bookings').insert(row).select().single()
  if (error) throw error
  return data
}

export async function listStorageBookings(customerId) {
  const { data, error } = await supabase
    .from('storage_bookings')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}
