import { supabase, ensureAdminSession } from './supabase.js'

const STORAGE_SETTINGS = 'smartshift_admin_settings'

function getLocal(k, fallback) {
  try {
    const raw = localStorage.getItem(k)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function setLocal(k, v) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    // ignore storage errors
  }
}

// -------------------------------------------------------------
// Driver & User Management APIs (100% Live Supabase Queries)
// -------------------------------------------------------------

export async function fetchAllDrivers() {
  await ensureAdminSession()

  const [{ data: dbDrivers, error }, { data: bData }, { data: rData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'mover')
      .order('created_at', { ascending: false }),
    supabase.from('bookings').select('mover_id, status, price'),
    supabase.from('reviews').select('mover_id, rating'),
  ])

  if (error) {
    console.error('Supabase fetchAllDrivers error:', error.message)
    throw error
  }

  const tripStats = {}
  ;(bData || []).forEach((b) => {
    if (!b.mover_id) return
    if (!tripStats[b.mover_id]) {
      tripStats[b.mover_id] = { total: 0, completed: 0, active: 0, earnings: 0 }
    }
    tripStats[b.mover_id].total += 1
    if (b.status === 'delivered') {
      tripStats[b.mover_id].completed += 1
      tripStats[b.mover_id].earnings += Number(b.price || 0)
    } else if (!['cancelled', 'pending'].includes(b.status)) {
      tripStats[b.mover_id].active += 1
    }
  })

  const ratingStats = {}
  ;(rData || []).forEach((r) => {
    if (!r.mover_id) return
    if (!ratingStats[r.mover_id]) ratingStats[r.mover_id] = { sum: 0, count: 0 }
    ratingStats[r.mover_id].sum += Number(r.rating || 0)
    ratingStats[r.mover_id].count += 1
  })

  return (dbDrivers || []).map((d) => {
    const t = tripStats[d.id] || { total: 0, completed: 0, active: 0, earnings: 0 }
    const rt = ratingStats[d.id]
    return {
      ...d,
      verification_status: d.verification_status || 'pending',
      vehicle_type: d.vehicle_type || 'Standard Van',
      vehicle_plate: d.vehicle_plate || 'Not Set',
      trips_count: t.completed,
      total_assigned_jobs: t.total,
      active_jobs_count: t.active,
      total_earnings: t.earnings,
      rating: rt && rt.count > 0 ? Number((rt.sum / rt.count).toFixed(1)) : null,
      reviews_count: rt?.count || 0,
      is_banned: Boolean(d.is_banned),
    }
  })
}

export async function fetchAllUsers() {
  await ensureAdminSession()

  const [{ data: dbUsers, error }, { data: bookings }, { data: storageList }, { data: warehouses }] =
    await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('bookings').select('customer_id, mover_id, price, status'),
      supabase.from('storage_bookings').select('customer_id, warehouse_owner_id, price, status, tracking_stage'),
      supabase.from('warehouses').select('id, owner_id, name, verification_status'),
    ])

  if (error) {
    console.error('Supabase fetchAllUsers error:', error.message)
    throw error
  }

  const moveStats = {}
  ;(bookings || []).forEach((b) => {
    if (b.customer_id) {
      if (!moveStats[b.customer_id]) moveStats[b.customer_id] = { moves: 0, spent: 0 }
      moveStats[b.customer_id].moves += 1
      if (b.status !== 'cancelled') moveStats[b.customer_id].spent += Number(b.price || 0)
    }
    if (b.mover_id) {
      if (!moveStats[b.mover_id]) moveStats[b.mover_id] = { moves: 0, spent: 0 }
      moveStats[b.mover_id].moves += 1
      if (b.status === 'delivered') moveStats[b.mover_id].spent += Number(b.price || 0)
    }
  })

  const storageStats = {}
  ;(storageList || []).forEach((s) => {
    if (s.customer_id) {
      if (!storageStats[s.customer_id]) storageStats[s.customer_id] = { count: 0, spent: 0 }
      storageStats[s.customer_id].count += 1
      if ((s.tracking_stage || s.status) !== 'cancelled') {
        storageStats[s.customer_id].spent += Number(s.price || 0)
      }
    }
  })

  const whByOwner = {}
  ;(warehouses || []).forEach((w) => {
    if (!whByOwner[w.owner_id]) whByOwner[w.owner_id] = []
    whByOwner[w.owner_id].push(w)
  })

  return (dbUsers || []).map((u) => {
    const ms = moveStats[u.id] || { moves: 0, spent: 0 }
    const ss = storageStats[u.id] || { count: 0, spent: 0 }
    const ownedWh = whByOwner[u.id] || []
    return {
      ...u,
      verification_status: u.verification_status || (u.role === 'customer' || u.role === 'admin' ? 'approved' : 'pending'),
      is_banned: Boolean(u.is_banned),
      total_moves: ms.moves,
      storage_bookings_count: ss.count,
      total_spent: ms.spent + ss.spent,
      warehouses_count: ownedWh.length,
      primary_warehouse: ownedWh[0] || null,
    }
  })
}

export async function updateDriverVerification(driverId, status, notes = null) {
  await ensureAdminSession()
  const patch = {
    verification_status: status,
    verification_notes: notes,
    verified_at: status === 'approved' ? new Date().toISOString() : null,
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', driverId)
    .select()
    .single()

  if (error) throw error
  const all = await fetchAllDrivers()
  return all.find((d) => d.id === driverId) || data
}

export async function toggleUserBan(userId, ban) {
  await ensureAdminSession()
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_banned: Boolean(ban) })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw error
  return data
}

// -------------------------------------------------------------
// Rides & Move Bookings APIs (100% Live Supabase Queries)
// -------------------------------------------------------------

export async function fetchAllBookings() {
  await ensureAdminSession()

  const [{ data: dbBookings, error }, { data: profs }, { data: whs }] = await Promise.all([
    supabase
      .from('bookings')
      .select('*, booking_items(*)')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, phone, email, vehicle_type, vehicle_plate, driver_lat, driver_lng, is_online, last_active_at'),
    supabase.from('warehouses').select('id, name, city, address'),
  ])

  if (error) {
    console.error('Supabase fetchAllBookings error:', error.message)
    throw error
  }

  const profilesMap = {}
  ;(profs || []).forEach((p) => {
    profilesMap[p.id] = p
  })
  const whMap = {}
  ;(whs || []).forEach((w) => {
    whMap[w.id] = w
  })

  return (dbBookings || []).map((b) => {
    const custProfile = profilesMap[b.customer_id] || {}
    const moverProfile = b.mover_id ? profilesMap[b.mover_id] || {} : null
    const targetWh = b.warehouse_id ? whMap[b.warehouse_id] || null : null
    const items = b.booking_items || []

    return {
      ...b,
      customer_name: b.customer_name || custProfile.full_name || custProfile.email || 'Customer',
      customer_phone: b.customer_phone || custProfile.phone || null,
      customer_email: custProfile.email || null,
      mover_name: b.mover_id ? (b.mover_name || moverProfile?.full_name || 'Assigned Mover') : null,
      mover_phone: b.mover_id ? (b.mover_phone || moverProfile?.phone || null) : null,
      mover_plate: moverProfile?.vehicle_plate || null,
      mover_online: moverProfile?.is_online || false,
      warehouse_name: targetWh?.name || null,
      warehouse_city: targetWh?.city || null,
      driver_lat: b.driver_lat ?? moverProfile?.driver_lat ?? null,
      driver_lng: b.driver_lng ?? moverProfile?.driver_lng ?? null,
      last_location_at: b.last_location_at || moverProfile?.last_active_at || null,
      items,
      items_count: items.length,
      scanned_count: items.filter((i) => i.scanned).length,
      vehicle: b.vehicle || moverProfile?.vehicle_type || 'Standard Van',
      schedule_label: b.schedule_label || 'Scheduled Move',
    }
  })
}

export async function updateBookingStatus(bookingId, status) {
  await ensureAdminSession()
  const patch = { status }
  if (status === 'delivered') patch.completed_at = new Date().toISOString()
  if (!['en_route', 'in_transit'].includes(status)) patch.driver_speed_kmh = 0

  const { error } = await supabase.from('bookings').update(patch).eq('id', bookingId)
  if (error) throw error

  const all = await fetchAllBookings()
  return all.find((b) => b.id === bookingId)
}

export async function reassignBookingDriver(bookingId, moverId, moverName = null, moverPhone = null) {
  await ensureAdminSession()
  const patch = moverId
    ? {
        mover_id: moverId,
        mover_name: moverName,
        mover_phone: moverPhone,
        status: 'accepted',
        accepted_at: new Date().toISOString(),
      }
    : {
        mover_id: null,
        mover_name: null,
        mover_phone: null,
        status: 'pending',
        accepted_at: null,
      }

  const { error } = await supabase.from('bookings').update(patch).eq('id', bookingId)
  if (error) throw error

  const all = await fetchAllBookings()
  return all.find((b) => b.id === bookingId)
}

export async function cancelBookingAdmin(bookingId, reason = 'Cancelled by administrator') {
  await ensureAdminSession()
  const { error } = await supabase
    .from('bookings')
    .update({ status: 'cancelled', cancellation_reason: reason, notes: reason, driver_speed_kmh: 0 })
    .eq('id', bookingId)

  if (error) throw error

  const all = await fetchAllBookings()
  return all.find((b) => b.id === bookingId)
}

export async function updateBookingDriverCoordinates(bookingId, lat, lng, { moverId = null, speed = null, heading = null } = {}) {
  await ensureAdminSession()
  const now = new Date().toISOString()
  const patch = { driver_lat: lat, driver_lng: lng, last_location_at: now }
  if (speed != null) patch.driver_speed_kmh = speed
  if (heading != null) patch.driver_heading = heading

  await supabase.from('bookings').update(patch).eq('id', bookingId)
  if (moverId) {
    await supabase
      .from('profiles')
      .update({ driver_lat: lat, driver_lng: lng, last_active_at: now, is_online: true })
      .eq('id', moverId)
  }
}

// -------------------------------------------------------------
// Warehouse Registry, Approvals & Tracking APIs (100% Live DB)
// -------------------------------------------------------------

export async function fetchAllWarehouses() {
  await ensureAdminSession()

  const [{ data: whs, error }, { data: profs }, { data: storageList }, { data: logs }] = await Promise.all([
    supabase.from('warehouses').select('*').order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, email, phone, avatar_url, role, verification_status, is_banned'),
    supabase.from('storage_bookings').select('id, warehouse_id, status, tracking_stage, price, unit_size, unit_code, customer_name'),
    supabase.from('warehouse_tracking_logs').select('*').order('created_at', { ascending: false }).limit(100),
  ])

  if (error) {
    console.error('Supabase fetchAllWarehouses error:', error.message)
    throw error
  }

  const profMap = {}
  ;(profs || []).forEach((p) => {
    profMap[p.id] = p
  })

  const bookingStats = {}
  ;(storageList || []).forEach((sb) => {
    if (!sb.warehouse_id) return
    if (!bookingStats[sb.warehouse_id]) {
      bookingStats[sb.warehouse_id] = { total: 0, pending: 0, active: 0, revenue: 0 }
    }
    const st = sb.tracking_stage || sb.status
    bookingStats[sb.warehouse_id].total += 1
    if (st === 'reserved') bookingStats[sb.warehouse_id].pending += 1
    if (['confirmed', 'checked_in', 'in_storage', 'release_requested'].includes(st)) {
      bookingStats[sb.warehouse_id].active += 1
    }
    if (st !== 'cancelled') {
      bookingStats[sb.warehouse_id].revenue += Number(sb.price || 0)
    }
  })

  const logsByWh = {}
  ;(logs || []).forEach((l) => {
    if (!l.warehouse_id) return
    if (!logsByWh[l.warehouse_id]) logsByWh[l.warehouse_id] = []
    logsByWh[l.warehouse_id].push(l)
  })

  return (whs || []).map((w) => {
    const owner = profMap[w.owner_id] || {}
    const stats = bookingStats[w.id] || { total: 0, pending: 0, active: 0, revenue: 0 }
    const totalUnits =
      Number(w.small_units_total || 0) + Number(w.medium_units_total || 0) + Number(w.large_units_total || 0)
    const availUnits =
      Number(w.small_units_available || 0) + Number(w.medium_units_available || 0) + Number(w.large_units_available || 0)
    const occupancyPct = w.total_capacity_sqm
      ? Math.min(100, Math.round((Number(w.occupied_capacity_sqm || 0) / Number(w.total_capacity_sqm)) * 100))
      : 0

    return {
      ...w,
      owner_name: owner.full_name || (owner.role === 'admin' ? 'SmartShift Official Hub' : 'Warehouse Partner'),
      owner_email: owner.email || w.contact_email || null,
      owner_phone: owner.phone || w.contact_phone || null,
      owner_avatar: owner.avatar_url || null,
      owner_role: owner.role || 'warehouse',
      total_units: totalUnits,
      available_units: availUnits,
      occupancy_pct: occupancyPct,
      total_bookings: stats.total,
      pending_bookings: stats.pending,
      active_bookings: stats.active,
      total_revenue: stats.revenue,
      recent_logs: (logsByWh[w.id] || []).slice(0, 15),
    }
  })
}

export async function updateWarehouseVerification(warehouseId, ownerId, status, notes = null) {
  await ensureAdminSession()
  const now = new Date().toISOString()
  const patch = {
    verification_status: status,
    verification_notes: notes,
    verified_at: status === 'approved' ? now : null,
  }

  const { error } = await supabase.from('warehouses').update(patch).eq('id', warehouseId)
  if (error) throw error

  // Sync owner's profile verification status if they are a warehouse partner (not admin)
  if (ownerId) {
    await supabase
      .from('profiles')
      .update(patch)
      .eq('id', ownerId)
      .eq('role', 'warehouse')
  }

  const all = await fetchAllWarehouses()
  return all.find((w) => w.id === warehouseId)
}

export async function updateWarehouseAdmin(warehouseId, patch) {
  await ensureAdminSession()
  const { error } = await supabase.from('warehouses').update(patch).eq('id', warehouseId)
  if (error) throw error

  const all = await fetchAllWarehouses()
  return all.find((w) => w.id === warehouseId)
}

export async function fetchAllStorageBookings() {
  await ensureAdminSession()

  const [{ data: list, error }, { data: profs }] = await Promise.all([
    supabase
      .from('storage_bookings')
      .select('*, warehouses(id, name, city, address, lat, lng, contact_phone, temperature_c, humidity_pct, operational_status, verification_status), warehouse_tracking_logs(*)')
      .order('created_at', { ascending: false }),
    supabase.from('profiles').select('id, full_name, phone, email'),
  ])

  if (error) {
    console.error('Supabase fetchAllStorageBookings error:', error.message)
    throw error
  }

  const profMap = {}
  ;(profs || []).forEach((p) => {
    profMap[p.id] = p
  })

  return (list || []).map((sb) => {
    const cust = profMap[sb.customer_id] || {}
    const logs = (sb.warehouse_tracking_logs || []).sort(
      (a, c) => new Date(c.created_at) - new Date(a.created_at)
    )
    return {
      ...sb,
      customer_name: sb.customer_name || cust.full_name || cust.email || 'Customer',
      customer_phone: sb.customer_phone || cust.phone || null,
      customer_email: cust.email || null,
      tracking_stage: sb.tracking_stage || sb.status || 'reserved',
      warehouse_name: sb.warehouses?.name || sb.warehouse,
      warehouse_city: sb.warehouses?.city || null,
      warehouse_address: sb.warehouses?.address || null,
      warehouse_tracking_logs: logs,
    }
  })
}

export async function updateStorageBookingAdmin(bookingId, patch, logEntry = null) {
  await ensureAdminSession()
  const updatePatch = { ...patch }
  if (updatePatch.tracking_stage && !updatePatch.status) {
    updatePatch.status = updatePatch.tracking_stage
  }
  if (updatePatch.tracking_stage === 'checked_in' && !updatePatch.checked_in_at) {
    updatePatch.checked_in_at = new Date().toISOString()
  }
  if (updatePatch.tracking_stage === 'checked_out' && !updatePatch.checked_out_at) {
    updatePatch.checked_out_at = new Date().toISOString()
  }

  const { error } = await supabase.from('storage_bookings').update(updatePatch).eq('id', bookingId)
  if (error) throw error

  if (logEntry) {
    const { data: sessionData } = await supabase.auth.getSession()
    await supabase.from('warehouse_tracking_logs').insert({
      storage_booking_id: bookingId,
      warehouse_id: logEntry.warehouse_id || null,
      actor_id: sessionData?.session?.user?.id || null,
      actor_role: 'admin',
      event_type: logEntry.event_type || updatePatch.tracking_stage || 'admin_override',
      title: logEntry.title || 'Admin Status Override',
      details: logEntry.details || null,
      location_bay: logEntry.location_bay || updatePatch.unit_code || null,
      temperature_c: logEntry.temperature_c ?? null,
      humidity_pct: logEntry.humidity_pct ?? null,
    })
  }

  const all = await fetchAllStorageBookings()
  return all.find((b) => b.id === bookingId)
}

export async function addAdminWarehouseTrackingLog({
  storageBookingId,
  warehouseId,
  title,
  details,
  locationBay = null,
  temperatureC = null,
  humidityPct = null,
}) {
  await ensureAdminSession()
  const { data: sessionData } = await supabase.auth.getSession()
  const { data, error } = await supabase
    .from('warehouse_tracking_logs')
    .insert({
      storage_booking_id: storageBookingId,
      warehouse_id: warehouseId || null,
      actor_id: sessionData?.session?.user?.id || null,
      actor_role: 'admin',
      event_type: 'admin_inspection',
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

// -------------------------------------------------------------
// Real-time Database Subscription (Unique Channel per Subscriber!)
// -------------------------------------------------------------

let channelSeq = 0

export function subscribeToRealtimeUpdates({
  onProfilesChange,
  onBookingsChange,
  onWarehousesChange,
  onStorageChange,
  onWarehouseLogsChange,
}) {
  try {
    channelSeq += 1
    const channelName = `smartshift-admin-rt-${channelSeq}-${Date.now()}`
    let ch = supabase.channel(channelName)

    if (onProfilesChange) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, onProfilesChange)
    }
    if (onBookingsChange) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, onBookingsChange)
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: 'booking_items' }, onBookingsChange)
    }
    if (onWarehousesChange) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: 'warehouses' }, onWarehousesChange)
    }
    if (onStorageChange) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: 'storage_bookings' }, onStorageChange)
    }
    if (onWarehouseLogsChange) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table: 'warehouse_tracking_logs' }, onWarehouseLogsChange)
    }

    ch.subscribe()

    return () => {
      supabase.removeChannel(ch)
    }
  } catch (err) {
    console.warn('Could not subscribe to realtime changes:', err)
    return () => {}
  }
}

// -------------------------------------------------------------
// System Settings API
// -------------------------------------------------------------
const DEFAULT_SETTINGS = {
  baseFareVan: 2500,
  baseFarePickup: 3000,
  baseFareTruck: 7500,
  perKmRate: 20,
  laborRatePerMover: 1500,
  instantBookingEnabled: true,
  requireDriverVerification: true,
  requireWarehouseVerification: true,
  maintenanceMode: false,
  broadcastMessage: '',
}

export function getSystemSettings() {
  return getLocal(STORAGE_SETTINGS, DEFAULT_SETTINGS)
}

export function saveSystemSettings(settings) {
  setLocal(STORAGE_SETTINGS, settings)
  return settings
}
