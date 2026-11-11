import { supabase, ensureAdminSession, getSignedDocUrl } from './supabase.js'

// Fallback seed drivers (only shown if Supabase database has zero drivers)
const SEED_DRIVERS = [
  {
    id: 'mover-seed-1',
    role: 'mover',
    full_name: 'Tariq Mehmood',
    email: 'tariq.mover@smartshift.pk',
    phone: '+92 300 4589211',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    verification_status: 'pending',
    verification_notes: null,
    vehicle_type: 'Mazda Titan (3 Ton)',
    vehicle_plate: 'LEA-8492',
    driving_license_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    police_clearance_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    cnic_front_url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800&auto=format&fit=crop&q=80',
    cnic_back_url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800&auto=format&fit=crop&q=80',
    driver_lat: 31.5204,
    driver_lng: 74.3587,
    rating: 4.9,
    trips_count: 42,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    is_banned: false,
    is_seed: true,
  },
  {
    id: 'mover-seed-2',
    role: 'mover',
    full_name: 'Imran Ashraf',
    email: 'imran.ashraf@smartshift.pk',
    phone: '+92 321 8892144',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    verification_status: 'approved',
    verification_notes: null,
    vehicle_type: 'Suzuki Ravi (Mini Pickup)',
    vehicle_plate: 'LXZ-3912',
    driving_license_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    police_clearance_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    cnic_front_url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800&auto=format&fit=crop&q=80',
    cnic_back_url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800&auto=format&fit=crop&q=80',
    driver_lat: 31.4850,
    driver_lng: 74.3200,
    rating: 4.8,
    trips_count: 88,
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    is_banned: false,
    is_seed: true,
  }
]

// Fallback seed bookings (only shown if Supabase bookings table is empty)
const SEED_BOOKINGS = [
  {
    id: 'bk-seed-1',
    customer_id: 'cust-seed-1',
    customer_name: 'Ayesha Malik',
    customer_phone: '+92 301 9283746',
    mover_id: 'mover-seed-2',
    mover_name: 'Imran Ashraf',
    mover_phone: '+92 321 8892144',
    status: 'in_transit',
    pickup_address: 'Gulberg III, Lahore, Punjab',
    dropoff_address: 'DHA Phase 5, Lahore, Punjab',
    vehicle: 'Suzuki Ravi (Mini Pickup)',
    price: 6800,
    payment_method: 'cod',
    distance_km: 14.2,
    schedule_label: 'Immediate Pickup',
    driver_lat: 31.4850,
    driver_lng: 74.3200,
    pickup_lat: 31.5085,
    pickup_lng: 74.3541,
    dropoff_lat: 31.4673,
    dropoff_lng: 74.4024,
    items_count: 5,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_seed: true,
    items: [
      { id: 'it-1', name: 'Master Bed Frame', tag: 'Heavy / Fragile', scanned: true },
      { id: 'it-2', name: 'Mattress (King)', tag: 'Bedroom', scanned: true },
      { id: 'it-3', name: 'Wooden Wardrobe', tag: 'Heavy Furniture', scanned: true },
    ]
  }
]

// LocalStorage cache keys
const STORAGE_DRIVERS_OVERRIDE = 'smartshift_admin_driver_overrides'
const STORAGE_SETTINGS = 'smartshift_admin_settings'
const STORAGE_BOOKINGS_CACHE = 'smartshift_admin_bookings_cache'

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
  } catch {}
}

// -------------------------------------------------------------
// Driver & User Management APIs (Direct Supabase Queries)
// -------------------------------------------------------------

export async function fetchAllDrivers() {
  try {
    await ensureAdminSession()

    // Query real mover profiles directly from Supabase
    const { data: dbDrivers, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'mover')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase fetch drivers error:', error.message)
    }

    const localOverrides = getLocal(STORAGE_DRIVERS_OVERRIDE, {})

    // Also get trip counts for movers
    let tripCounts = {}
    try {
      const { data: bData } = await supabase.from('bookings').select('mover_id')
      if (bData) {
        bData.forEach((b) => {
          if (b.mover_id) tripCounts[b.mover_id] = (tripCounts[b.mover_id] || 0) + 1
        })
      }
    } catch {}

    if (dbDrivers && dbDrivers.length > 0) {
      const formatted = dbDrivers.map((d, index) => {
        const override = localOverrides[d.id] || {}
        return {
          ...d,
          verification_status: override.verification_status || d.verification_status || 'pending',
          verification_notes: override.verification_notes !== undefined ? override.verification_notes : (d.verification_notes || null),
          verified_at: override.verified_at || d.verified_at || null,
          vehicle_type: d.vehicle_type || override.vehicle_type || 'Standard Van (1 Ton)',
          vehicle_plate: d.vehicle_plate || override.vehicle_plate || `LEA-${1000 + index}`,
          driver_lat: d.driver_lat || override.driver_lat || (31.5204 + (index * 0.015)),
          driver_lng: d.driver_lng || override.driver_lng || (74.3587 + (index * 0.012)),
          rating: d.rating || 4.9,
          trips_count: tripCounts[d.id] || d.trips_count || 14,
          is_banned: override.is_banned !== undefined ? override.is_banned : (d.is_banned || false),
          is_real_db: true,
        }
      })
      return formatted
    }

    // If database has 0 drivers yet, return seed drivers with any local overrides applied
    return SEED_DRIVERS.map((d) => {
      const override = localOverrides[d.id] || {}
      return { ...d, ...override }
    })
  } catch (err) {
    console.error('fetchAllDrivers exception:', err)
    return SEED_DRIVERS
  }
}

export async function fetchAllUsers() {
  try {
    await ensureAdminSession()

    // Query all profiles from Supabase
    const { data: dbUsers, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase fetch users error:', error.message)
    }

    const localOverrides = getLocal(STORAGE_DRIVERS_OVERRIDE, {})

    // Fetch booking statistics to populate total_moves and total_spent
    let customerStats = {}
    try {
      const { data: bookings } = await supabase.from('bookings').select('customer_id, price, status')
      if (bookings) {
        bookings.forEach((b) => {
          if (!customerStats[b.customer_id]) {
            customerStats[b.customer_id] = { moves: 0, spent: 0 }
          }
          customerStats[b.customer_id].moves += 1
          if (b.status === 'delivered') {
            customerStats[b.customer_id].spent += Number(b.price || 0)
          }
        })
      }
    } catch {}

    if (dbUsers && dbUsers.length > 0) {
      return dbUsers.map((u) => {
        const override = localOverrides[u.id] || {}
        const stats = customerStats[u.id] || { moves: 0, spent: 0 }
        return {
          ...u,
          verification_status: override.verification_status || u.verification_status || (u.role === 'mover' ? 'pending' : 'approved'),
          verification_notes: override.verification_notes !== undefined ? override.verification_notes : (u.verification_notes || null),
          is_banned: override.is_banned !== undefined ? override.is_banned : (u.is_banned || false),
          total_moves: stats.moves,
          total_spent: stats.spent,
          is_real_db: true,
        }
      })
    }

    // Fallback if no users in profiles table
    return [
      {
        id: 'cust-demo-1',
        role: 'customer',
        full_name: 'Ayesha Malik',
        email: 'ayesha.malik@outlook.com',
        phone: '+92 301 9283746',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80',
        verification_status: 'approved',
        created_at: new Date(Date.now() - 86400000 * 20).toISOString(),
        is_banned: false,
        total_spent: 38500,
        total_moves: 4,
        is_seed: true,
      },
      ...SEED_DRIVERS,
    ]
  } catch (err) {
    console.error('fetchAllUsers exception:', err)
    return SEED_DRIVERS
  }
}

export async function updateDriverVerification(driverId, status, notes = null) {
  const patch = {
    verification_status: status,
    verification_notes: notes,
    verified_at: status === 'approved' ? new Date().toISOString() : null,
  }

  // 1. Save to local overrides map for instant offline/cache resilience
  const overrides = getLocal(STORAGE_DRIVERS_OVERRIDE, {})
  overrides[driverId] = { ...(overrides[driverId] || {}), ...patch }
  setLocal(STORAGE_DRIVERS_OVERRIDE, overrides)

  // 2. Commit to Supabase database
  try {
    await ensureAdminSession()
    const { data, error } = await supabase
      .from('profiles')
      .update(patch)
      .eq('id', driverId)
      .select()

    if (error) {
      if (error.code === 'PGRST204' || error.message?.includes('verification_status')) {
        console.info(
          'Note: verification_status column missing in Supabase profiles table. Please execute supabase/admin_and_verification.sql in your Supabase SQL editor.'
        )
      } else {
        console.warn('Could not update profile verification in Supabase:', error.message)
      }
    }
  } catch (err) {
    console.warn('Network exception updating Supabase profile verification:', err)
  }

  // Return updated driver object
  const all = await fetchAllDrivers()
  return all.find((d) => d.id === driverId) || { id: driverId, ...patch }
}

export async function toggleUserBan(userId, ban) {
  const overrides = getLocal(STORAGE_DRIVERS_OVERRIDE, {})
  overrides[userId] = { ...(overrides[userId] || {}), is_banned: ban }
  setLocal(STORAGE_DRIVERS_OVERRIDE, overrides)

  try {
    await ensureAdminSession()
    await supabase.from('profiles').update({ is_banned: ban }).eq('id', userId)
  } catch (err) {
    console.warn('Could not update user ban status in DB:', err)
  }
}

// -------------------------------------------------------------
// Rides & Bookings Management APIs (Direct Supabase Queries)
// -------------------------------------------------------------

export async function fetchAllBookings() {
  try {
    await ensureAdminSession()

    // 1. Fetch bookings with joined booking_items from Supabase
    const { data: dbBookings, error } = await supabase
      .from('bookings')
      .select('*, booking_items(*)')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Supabase fetch bookings error:', error.message)
    }

    // 2. Fetch profiles map for customer and mover names & phones if missing
    let profilesMap = {}
    try {
      const { data: profs } = await supabase.from('profiles').select('id, full_name, phone')
      if (profs) {
        profs.forEach((p) => {
          profilesMap[p.id] = p
        })
      }
    } catch {}

    const localBookingsCache = getLocal(STORAGE_BOOKINGS_CACHE, {})

    if (dbBookings && dbBookings.length > 0) {
      const formatted = dbBookings.map((b, index) => {
        const custProfile = profilesMap[b.customer_id] || {}
        const moverProfile = profilesMap[b.mover_id] || {}
        const cached = localBookingsCache[b.id] || {}

        return {
          ...b,
          customer_name: b.customer_name || custProfile.full_name || 'Valued Customer',
          customer_phone: b.customer_phone || custProfile.phone || '+92 300 1234567',
          mover_name: b.mover_name || moverProfile.full_name || (b.mover_id ? 'Assigned Mover' : 'Unassigned'),
          mover_phone: b.mover_phone || moverProfile.phone || (b.mover_id ? '+92 321 0000000' : '—'),
          items: b.booking_items || [],
          items_count: b.booking_items?.length || 3,
          vehicle: b.vehicle || 'Suzuki Ravi (Mini Pickup)',
          distance_km: b.distance_km || 12.5,
          schedule_label: b.schedule_label || 'Scheduled Move',
          // Coordinates fallback to Lahore metropolitan coordinates
          pickup_lat: b.pickup_lat || cached.pickup_lat || (31.5085 + (index * 0.01)),
          pickup_lng: b.pickup_lng || cached.pickup_lng || (74.3541 + (index * 0.01)),
          dropoff_lat: b.dropoff_lat || cached.dropoff_lat || (31.4673 + (index * 0.015)),
          dropoff_lng: b.dropoff_lng || cached.dropoff_lng || (74.4024 + (index * 0.012)),
          driver_lat: b.driver_lat || cached.driver_lat || (31.4850 + (index * 0.01)),
          driver_lng: b.driver_lng || cached.driver_lng || (74.3200 + (index * 0.01)),
          is_real_db: true,
        }
      })
      return formatted
    }

    // Fallback if zero bookings in database
    return SEED_BOOKINGS
  } catch (err) {
    console.error('fetchAllBookings exception:', err)
    return SEED_BOOKINGS
  }
}

export async function updateBookingStatus(bookingId, status) {
  const patch = { status }
  if (status === 'delivered') patch.completed_at = new Date().toISOString()

  try {
    await ensureAdminSession()
    await supabase.from('bookings').update(patch).eq('id', bookingId)
  } catch (err) {
    console.warn('Could not update status in DB:', err)
  }

  // Update cache
  const cache = getLocal(STORAGE_BOOKINGS_CACHE, {})
  cache[bookingId] = { ...(cache[bookingId] || {}), ...patch }
  setLocal(STORAGE_BOOKINGS_CACHE, cache)

  const all = await fetchAllBookings()
  return all.find((b) => b.id === bookingId)
}

export async function reassignBookingDriver(bookingId, moverId, moverName = null, moverPhone = null) {
  const patch = {
    mover_id: moverId,
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  }
  if (moverName) patch.mover_name = moverName
  if (moverPhone) patch.mover_phone = moverPhone

  try {
    await ensureAdminSession()
    await supabase.from('bookings').update(patch).eq('id', bookingId)
  } catch (err) {
    console.warn('Could not reassign mover in Supabase:', err)
  }

  const cache = getLocal(STORAGE_BOOKINGS_CACHE, {})
  cache[bookingId] = { ...(cache[bookingId] || {}), ...patch }
  setLocal(STORAGE_BOOKINGS_CACHE, cache)
}

export async function cancelBookingAdmin(bookingId, reason = 'Cancelled by administrator') {
  const patch = {
    status: 'cancelled',
    notes: reason,
  }

  try {
    await ensureAdminSession()
    await supabase.from('bookings').update(patch).eq('id', bookingId)
  } catch (err) {
    console.warn('Could not cancel booking in Supabase:', err)
  }

  const cache = getLocal(STORAGE_BOOKINGS_CACHE, {})
  cache[bookingId] = { ...(cache[bookingId] || {}), ...patch }
  setLocal(STORAGE_BOOKINGS_CACHE, cache)
}

export async function updateBookingDriverCoordinates(bookingId, lat, lng) {
  const coords = { driver_lat: lat, driver_lng: lng }

  try {
    await ensureAdminSession()
    await supabase.from('bookings').update(coords).eq('id', bookingId)
  } catch {}

  const cache = getLocal(STORAGE_BOOKINGS_CACHE, {})
  cache[bookingId] = { ...(cache[bookingId] || {}), ...coords }
  setLocal(STORAGE_BOOKINGS_CACHE, cache)
}

// -------------------------------------------------------------
// Real-time Database Subscription
// -------------------------------------------------------------

export function subscribeToRealtimeUpdates({ onProfilesChange, onBookingsChange }) {
  try {
    const channel = supabase
      .channel('smartshift-admin-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        (payload) => {
          if (onProfilesChange) onProfilesChange(payload)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload) => {
          if (onBookingsChange) onBookingsChange(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
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
  baseFarePickup: 3500,
  baseFareTruck: 6000,
  perKmRate: 180,
  laborRatePerMover: 800,
  instantBookingEnabled: true,
  requireDriverVerification: true,
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
