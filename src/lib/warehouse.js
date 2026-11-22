import { supabase } from './supabase'

// Ordered lifecycle for a warehouse storage reservation.
export const STORAGE_FLOW = [
  'reserved',
  'confirmed',
  'checked_in',
  'in_storage',
  'release_requested',
  'checked_out',
]

export const STORAGE_STATUS_LABEL = {
  reserved: 'Reserved (Awaiting Confirmation)',
  confirmed: 'Confirmed by Warehouse',
  checked_in: 'Items Checked In',
  in_storage: 'Active in Storage',
  release_requested: 'Release Requested',
  checked_out: 'Checked Out / Released',
  cancelled: 'Cancelled',
}

export const STORAGE_NEXT_ACTION = {
  reserved: 'Confirm Reservation',
  confirmed: 'Check In & Assign Unit',
  checked_in: 'Move to Active Storage',
  in_storage: 'Prepare for Release',
  release_requested: 'Confirm Release & Check Out',
}

export function nextStorageStage(stage) {
  const i = STORAGE_FLOW.indexOf(stage)
  if (i === -1 || i === STORAGE_FLOW.length - 1) return null
  return STORAGE_FLOW[i + 1]
}

export function storageStatusTone(status) {
  if (status === 'checked_out' || status === 'in_storage') return 'green'
  if (status === 'reserved' || status === 'release_requested') return 'pending'
  if (status === 'cancelled') return 'red'
  return 'brand'
}

// ---------- QR Check-in / Check-out Handshake ----------
export const STORAGE_QR_PREFIX = 'SMARTSHIFT:STORAGE:'
export const storageQrPayload = (id) => `${STORAGE_QR_PREFIX}${id}`
export function matchesStorageQr(text, id) {
  const t = (text || '').trim()
  return t === storageQrPayload(id) || t === String(id)
}

export const CITY_COORDS = {
  Lahore: { lat: 31.5204, lng: 74.3587 },
  Karachi: { lat: 24.8607, lng: 67.0011 },
  Islamabad: { lat: 33.6844, lng: 73.0479 },
  Rawalpindi: { lat: 33.5651, lng: 73.0169 },
  Faisalabad: { lat: 31.4504, lng: 73.135 },
  Multan: { lat: 30.1575, lng: 71.5249 },
}

// ---------- Warehouses CRUD ----------
export async function listApprovedWarehouses() {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('verification_status', 'approved')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getWarehouse(id) {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function getMyWarehouse(ownerId) {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createWarehouse(payload) {
  const { data, error } = await supabase
    .from('warehouses')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWarehouse(id, patch) {
  const { data, error } = await supabase
    .from('warehouses')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

// ---------- Storage Bookings & Tracking ----------
export async function createCustomerStorageBooking(row) {
  const startDate = row.start_date || new Date().toISOString().slice(0, 10)
  const endDateObj = new Date(startDate)
  endDateObj.setDate(endDateObj.getDate() + Number(row.days || 7))
  const endDate = endDateObj.toISOString().slice(0, 10)

  const insertRow = {
    ...row,
    start_date: startDate,
    end_date: row.end_date || endDate,
    status: row.status || 'reserved',
    tracking_stage: row.tracking_stage || 'reserved',
  }

  const { data, error } = await supabase
    .from('storage_bookings')
    .insert(insertRow)
    .select()
    .single()
  if (error) throw error

  // Attach deterministic QR code
  const qr = storageQrPayload(data.id)
  const { data: updated } = await supabase
    .from('storage_bookings')
    .update({ qr_code: qr })
    .eq('id', data.id)
    .select()
    .single()

  // Initial tracking log
  try {
    await supabase.from('warehouse_tracking_logs').insert({
      storage_booking_id: data.id,
      warehouse_id: data.warehouse_id || null,
      actor_id: data.customer_id,
      actor_role: 'customer',
      event_type: 'reserved',
      title: 'Storage Unit Reserved',
      details: `${data.unit_size} reserved for ${data.duration_label} at ${data.warehouse}.`,
    })
  } catch (logErr) {
    console.warn('Could not insert initial warehouse tracking log:', logErr)
  }

  return updated || { ...data, qr_code: qr }
}

export async function listCustomerStorageBookings(customerId) {
  const { data, error } = await supabase
    .from('storage_bookings')
    .select('*, warehouses(id, name, city, address, contact_phone, temperature_c, humidity_pct, operational_status, image_url, lat, lng), warehouse_tracking_logs(*)')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data || []).map((b) => ({
    ...b,
    warehouse_tracking_logs: (b.warehouse_tracking_logs || []).sort(
      (a, c) => new Date(c.created_at) - new Date(a.created_at)
    ),
  }))
}

export async function listWarehouseBookings(warehouseId, ownerId) {
  let query = supabase
    .from('storage_bookings')
    .select('*, warehouse_tracking_logs(*)')
    .order('created_at', { ascending: false })

  if (warehouseId && ownerId) {
    query = query.or(`warehouse_id.eq.${warehouseId},warehouse_owner_id.eq.${ownerId}`)
  } else if (warehouseId) {
    query = query.eq('warehouse_id', warehouseId)
  } else if (ownerId) {
    query = query.eq('warehouse_owner_id', ownerId)
  }

  const { data, error } = await query
  if (error) throw error
  return (data || []).map((b) => ({
    ...b,
    warehouse_tracking_logs: (b.warehouse_tracking_logs || []).sort(
      (a, c) => new Date(c.created_at) - new Date(a.created_at)
    ),
  }))
}

export async function getStorageBookingDetail(id) {
  const { data, error } = await supabase
    .from('storage_bookings')
    .select('*, warehouses(*), warehouse_tracking_logs(*)')
    .eq('id', id)
    .single()
  if (error) throw error
  return {
    ...data,
    warehouse_tracking_logs: (data.warehouse_tracking_logs || []).sort(
      (a, c) => new Date(c.created_at) - new Date(a.created_at)
    ),
  }
}

export async function listWarehouseTrackingLogs(warehouseId, limit = 40) {
  const { data, error } = await supabase
    .from('warehouse_tracking_logs')
    .select('*, storage_bookings(id, customer_name, unit_size, unit_code, tracking_stage)')
    .eq('warehouse_id', warehouseId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

function unitColumnForSize(unitSize = '') {
  const lower = String(unitSize).toLowerCase()
  if (lower.includes('small')) return { col: 'small_units_available', sqm: 12 }
  if (lower.includes('large')) return { col: 'large_units_available', sqm: 40 }
  return { col: 'medium_units_available', sqm: 22 }
}

export async function advanceStorageBooking(booking, nextStage, options = {}) {
  const {
    warehouse = null,
    unitCode = booking.unit_code,
    locationBay = null,
    details = null,
    actorId = null,
    actorRole = 'warehouse',
  } = options

  // Enforce admin approval before warehouse partner can confirm/manage customer reservations
  if (actorRole === 'warehouse' && warehouse && warehouse.verification_status !== 'approved') {
    throw new Error(
      'Admin Approval Required: Your warehouse license, property documents, and fire safety certificate must be approved by SmartShift Admin before accepting customer storage requests.'
    )
  }

  const now = new Date().toISOString()
  const patch = {
    status: nextStage,
    tracking_stage: nextStage,
  }
  if (unitCode) patch.unit_code = unitCode
  if (nextStage === 'checked_in') patch.checked_in_at = now
  if (nextStage === 'checked_out') patch.checked_out_at = now

  const { data, error } = await supabase
    .from('storage_bookings')
    .update(patch)
    .eq('id', booking.id)
    .select()
    .single()
  if (error) throw error

  // Adjust available units & occupancy on check-in / check-out
  if (warehouse && (nextStage === 'checked_in' || nextStage === 'checked_out')) {
    const { col, sqm } = unitColumnForSize(booking.unit_size)
    const currAvail = Number(warehouse[col] ?? 0)
    const currOcc = Number(warehouse.occupied_capacity_sqm ?? 0)
    const totalSqm = Number(warehouse.total_capacity_sqm ?? 500)
    const delta = nextStage === 'checked_in' ? -1 : 1
    const nextAvail = Math.max(0, currAvail + delta)
    const nextOcc =
      nextStage === 'checked_in'
        ? Math.min(totalSqm, currOcc + sqm)
        : Math.max(0, currOcc - sqm)

    try {
      await supabase
        .from('warehouses')
        .update({ [col]: nextAvail, occupied_capacity_sqm: nextOcc })
        .eq('id', warehouse.id)
    } catch (capErr) {
      console.warn('Could not update warehouse unit count:', capErr)
    }
  }

  // Record audit & tracking event
  const defaultTitles = {
    confirmed: 'Reservation Confirmed by Warehouse',
    checked_in: `Items Checked In${unitCode ? ` · Unit ${unitCode}` : ''}`,
    in_storage: `Secured in Storage${unitCode ? ` · Bay ${unitCode}` : ''}`,
    release_requested: 'Customer Requested Item Release',
    checked_out: 'Items Released & Checked Out',
    cancelled: 'Storage Reservation Cancelled',
  }

  await supabase.from('warehouse_tracking_logs').insert({
    storage_booking_id: booking.id,
    warehouse_id: booking.warehouse_id || warehouse?.id || null,
    actor_id: actorId,
    actor_role: actorRole,
    event_type: nextStage,
    title: defaultTitles[nextStage] || `Status Updated: ${nextStage}`,
    details: details || `Stage transitioned from ${booking.tracking_stage || booking.status} to ${nextStage}.`,
    location_bay: locationBay || unitCode || booking.unit_code || null,
    temperature_c: warehouse?.temperature_c ?? null,
    humidity_pct: warehouse?.humidity_pct ?? null,
  })

  return data
}

export async function addWarehouseTrackingLog({
  storageBookingId,
  warehouseId,
  actorId,
  actorRole = 'warehouse',
  eventType = 'inspection_ok',
  title,
  details,
  locationBay = null,
  temperatureC = null,
  humidityPct = null,
}) {
  const { data, error } = await supabase
    .from('warehouse_tracking_logs')
    .insert({
      storage_booking_id: storageBookingId,
      warehouse_id: warehouseId || null,
      actor_id: actorId || null,
      actor_role: actorRole,
      event_type: eventType,
      title,
      details,
      location_bay: locationBay,
      temperature_c: temperatureC,
      humidity_pct: humidityPct,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function requestStorageRelease(booking, customerId) {
  return advanceStorageBooking(booking, 'release_requested', {
    actorId: customerId,
    actorRole: 'customer',
    details: 'Customer requested release & pickup scheduling from storage.',
  })
}

export async function cancelStorageBooking(booking, actorId, actorRole = 'customer', reason = '') {
  return advanceStorageBooking(booking, 'cancelled', {
    actorId,
    actorRole,
    details: reason || `Reservation cancelled by ${actorRole}.`,
  })
}
