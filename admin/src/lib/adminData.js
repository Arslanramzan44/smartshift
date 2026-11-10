import { supabase } from './supabase'

// Default seed drivers with documents for testing & instant functionality
const DEFAULT_DRIVERS = [
  {
    id: 'mover-demo-1',
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
  },
  {
    id: 'mover-demo-2',
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
  },
  {
    id: 'mover-demo-3',
    role: 'mover',
    full_name: 'Bilal Farooq',
    email: 'bilal.farooq@gmail.com',
    phone: '+92 333 7123900',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&auto=format&fit=crop&q=80',
    verification_status: 'pending',
    verification_notes: null,
    vehicle_type: 'Shehzore Pickup (1.5 Ton)',
    vehicle_plate: 'LEB-7721',
    driving_license_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    police_clearance_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    cnic_front_url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800&auto=format&fit=crop&q=80',
    cnic_back_url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800&auto=format&fit=crop&q=80',
    driver_lat: 31.4700,
    driver_lng: 74.4100,
    rating: 5.0,
    trips_count: 5,
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    is_banned: false,
  },
  {
    id: 'mover-demo-4',
    role: 'mover',
    full_name: 'Zahid Khan',
    email: 'zahid.khan@gmail.com',
    phone: '+92 312 9012345',
    avatar_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&auto=format&fit=crop&q=80',
    verification_status: 'rejected',
    verification_notes: 'Police clearance certificate copy is expired (issued > 6 months ago). Please upload a current police certificate.',
    vehicle_type: 'Cargo Van',
    vehicle_plate: 'LHR-5110',
    driving_license_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    police_clearance_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=800&auto=format&fit=crop&q=80',
    cnic_front_url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800&auto=format&fit=crop&q=80',
    cnic_back_url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=800&auto=format&fit=crop&q=80',
    driver_lat: 31.5400,
    driver_lng: 74.3100,
    rating: 4.5,
    trips_count: 14,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    is_banned: false,
  }
]

// Default seed customers
const DEFAULT_CUSTOMERS = [
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
  },
  {
    id: 'cust-demo-2',
    role: 'customer',
    full_name: 'Usman Ghani',
    email: 'usman.ghani@gmail.com',
    phone: '+92 334 1122334',
    avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&auto=format&fit=crop&q=80',
    verification_status: 'approved',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    is_banned: false,
    total_spent: 12400,
    total_moves: 2,
  },
  {
    id: 'cust-demo-3',
    role: 'customer',
    full_name: 'Sara Siddiqui',
    email: 'sara.siddiqui@gmail.com',
    phone: '+92 322 7788990',
    avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&auto=format&fit=crop&q=80',
    verification_status: 'approved',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    is_banned: false,
    total_spent: 8500,
    total_moves: 1,
  }
]

// Default seed bookings
const DEFAULT_BOOKINGS = [
  {
    id: 'bk-901',
    customer_id: 'cust-demo-1',
    customer_name: 'Ayesha Malik',
    customer_phone: '+92 301 9283746',
    mover_id: 'mover-demo-2',
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
    items: [
      { id: 'it-1', name: 'Master Bed Frame', tag: 'Heavy / Fragile', scanned: true },
      { id: 'it-2', name: 'Mattress (King)', tag: 'Bedroom', scanned: true },
      { id: 'it-3', name: 'Wooden Wardrobe', tag: 'Heavy Furniture', scanned: true },
      { id: 'it-4', name: 'Living Room Sofa (3 Seater)', tag: 'Living', scanned: true },
      { id: 'it-5', name: 'Glass Coffee Table', tag: 'Fragile Handle With Care', scanned: true }
    ]
  },
  {
    id: 'bk-902',
    customer_id: 'cust-demo-2',
    customer_name: 'Usman Ghani',
    customer_phone: '+92 334 1122334',
    mover_id: null,
    status: 'pending',
    pickup_address: 'Model Town Block C, Lahore',
    dropoff_address: 'Johar Town Block G, Lahore',
    vehicle: 'Shehzore Pickup (1.5 Ton)',
    price: 4900,
    payment_method: 'card',
    distance_km: 8.5,
    schedule_label: 'Today, 4:00 PM',
    driver_lat: null,
    driver_lng: null,
    pickup_lat: 31.4820,
    pickup_lng: 74.3180,
    dropoff_lat: 31.4690,
    dropoff_lng: 74.2720,
    items_count: 3,
    created_at: new Date(Date.now() - 1800000).toISOString(),
    items: [
      { id: 'it-6', name: 'Refrigerator (Double Door)', tag: 'Electronics', scanned: false },
      { id: 'it-7', name: 'Washing Machine', tag: 'Appliances', scanned: false },
      { id: 'it-8', name: 'Dining Table & 4 Chairs', tag: 'Dining Room', scanned: false }
    ]
  },
  {
    id: 'bk-903',
    customer_id: 'cust-demo-3',
    customer_name: 'Sara Siddiqui',
    customer_phone: '+92 322 7788990',
    mover_id: 'mover-demo-2',
    mover_name: 'Imran Ashraf',
    mover_phone: '+92 321 8892144',
    status: 'delivered',
    pickup_address: 'WAPDA Town Phase 1, Lahore',
    dropoff_address: 'Bahria Town Sector C, Lahore',
    vehicle: 'Suzuki Ravi (Mini Pickup)',
    price: 8500,
    payment_method: 'cod',
    distance_km: 18.0,
    schedule_label: 'Yesterday, 11:00 AM',
    driver_lat: 31.3650,
    driver_lng: 74.1800,
    pickup_lat: 31.4350,
    pickup_lng: 74.2620,
    dropoff_lat: 31.3680,
    dropoff_lng: 74.1790,
    items_count: 4,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    items: [
      { id: 'it-9', name: 'Office Desk & Executive Chair', tag: 'Office', scanned: true },
      { id: 'it-10', name: 'Bookshelves (x2)', tag: 'Office', scanned: true },
      { id: 'it-11', name: 'Archive Document Boxes (x5)', tag: 'Documents', scanned: true },
      { id: 'it-12', name: 'Water Dispenser', tag: 'Appliance', scanned: true }
    ]
  }
]

// LocalStorage cache keys for instantaneous responsive actions
const STORAGE_DRIVERS = 'smartshift_admin_drivers'
const STORAGE_BOOKINGS = 'smartshift_admin_bookings'
const STORAGE_USERS = 'smartshift_admin_users'
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
  } catch {}
}

// -------------------------------------------------------------
// Driver & User Management APIs
// -------------------------------------------------------------
export async function fetchAllDrivers() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'mover')
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return getLocal(STORAGE_DRIVERS, DEFAULT_DRIVERS)
    }

    // Merge remote data with local verification updates
    const localDrivers = getLocal(STORAGE_DRIVERS, DEFAULT_DRIVERS)
    const merged = data.map((d) => {
      const match = localDrivers.find((ld) => ld.id === d.id)
      return {
        ...d,
        verification_status: d.verification_status || match?.verification_status || 'pending',
        verification_notes: d.verification_notes || match?.verification_notes || null,
        vehicle_type: d.vehicle_type || match?.vehicle_type || 'Standard Move Vehicle',
        vehicle_plate: d.vehicle_plate || match?.vehicle_plate || 'LEA-0000',
        rating: match?.rating || 4.8,
        trips_count: match?.trips_count || 12,
      }
    })

    // Also include demo drivers if DB has very few
    localDrivers.forEach((ld) => {
      if (!merged.some((m) => m.id === ld.id)) merged.push(ld)
    })

    setLocal(STORAGE_DRIVERS, merged)
    return merged
  } catch {
    return getLocal(STORAGE_DRIVERS, DEFAULT_DRIVERS)
  }
}

export async function fetchAllUsers() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      const allLocal = [...getLocal(STORAGE_USERS, DEFAULT_CUSTOMERS), ...getLocal(STORAGE_DRIVERS, DEFAULT_DRIVERS)]
      return allLocal
    }

    const localDrivers = getLocal(STORAGE_DRIVERS, DEFAULT_DRIVERS)
    const localCustomers = getLocal(STORAGE_USERS, DEFAULT_CUSTOMERS)

    const all = data.map((u) => {
      const matchD = localDrivers.find((ld) => ld.id === u.id)
      const matchC = localCustomers.find((lc) => lc.id === u.id)
      return {
        ...u,
        verification_status: u.verification_status || (u.role === 'mover' ? (matchD?.verification_status || 'pending') : 'approved'),
        verification_notes: u.verification_notes || matchD?.verification_notes || null,
        is_banned: u.is_banned || false,
      }
    })

    // Ensure demo customers & drivers are available for demo evaluation
    localCustomers.forEach((lc) => {
      if (!all.some((a) => a.id === lc.id)) all.push(lc)
    })

    return all
  } catch {
    return [...getLocal(STORAGE_USERS, DEFAULT_CUSTOMERS), ...getLocal(STORAGE_DRIVERS, DEFAULT_DRIVERS)]
  }
}

export async function updateDriverVerification(driverId, status, notes = null) {
  const patch = {
    verification_status: status,
    verification_notes: notes,
    verified_at: status === 'approved' ? new Date().toISOString() : null,
  }

  // 1. Update Supabase
  try {
    await supabase.from('profiles').update(patch).eq('id', driverId)
  } catch (err) {
    console.warn('Could not update remote Supabase profile verification:', err)
  }

  // 2. Update local state
  const drivers = getLocal(STORAGE_DRIVERS, DEFAULT_DRIVERS).map((d) => {
    if (d.id === driverId) {
      return { ...d, ...patch }
    }
    return d
  })
  setLocal(STORAGE_DRIVERS, drivers)
  return drivers.find((d) => d.id === driverId)
}

export async function toggleUserBan(userId, ban) {
  try {
    await supabase.from('profiles').update({ is_banned: ban }).eq('id', userId)
  } catch (err) {
    console.warn('Could not update user ban in DB:', err)
  }

  const drivers = getLocal(STORAGE_DRIVERS, DEFAULT_DRIVERS).map((d) => {
    if (d.id === userId) return { ...d, is_banned: ban }
    return d
  })
  setLocal(STORAGE_DRIVERS, drivers)

  const users = getLocal(STORAGE_USERS, DEFAULT_CUSTOMERS).map((u) => {
    if (u.id === userId) return { ...u, is_banned: ban }
    return u
  })
  setLocal(STORAGE_USERS, users)
}

// -------------------------------------------------------------
// Rides & Bookings Management APIs
// -------------------------------------------------------------
export async function fetchAllBookings() {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, booking_items(*)')
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return getLocal(STORAGE_BOOKINGS, DEFAULT_BOOKINGS)
    }

    const localBookings = getLocal(STORAGE_BOOKINGS, DEFAULT_BOOKINGS)
    const merged = data.map((b) => {
      const match = localBookings.find((lb) => lb.id === b.id)
      return {
        ...b,
        items: b.booking_items || match?.items || [],
        driver_lat: b.driver_lat || match?.driver_lat || 31.5204,
        driver_lng: b.driver_lng || match?.driver_lng || 74.3587,
        pickup_lat: b.pickup_lat || match?.pickup_lat || 31.5085,
        pickup_lng: b.pickup_lng || match?.pickup_lng || 74.3541,
        dropoff_lat: b.dropoff_lat || match?.dropoff_lat || 31.4673,
        dropoff_lng: b.dropoff_lng || match?.dropoff_lng || 74.4024,
      }
    })

    localBookings.forEach((lb) => {
      if (!merged.some((m) => m.id === lb.id)) merged.push(lb)
    })

    setLocal(STORAGE_BOOKINGS, merged)
    return merged
  } catch {
    return getLocal(STORAGE_BOOKINGS, DEFAULT_BOOKINGS)
  }
}

export async function updateBookingStatus(bookingId, status) {
  const patch = { status }
  if (status === 'delivered') patch.completed_at = new Date().toISOString()

  try {
    await supabase.from('bookings').update(patch).eq('id', bookingId)
  } catch (err) {
    console.warn('Could not update status in DB:', err)
  }

  const bookings = getLocal(STORAGE_BOOKINGS, DEFAULT_BOOKINGS).map((b) => {
    if (b.id === bookingId) return { ...b, ...patch }
    return b
  })
  setLocal(STORAGE_BOOKINGS, bookings)
  return bookings.find((b) => b.id === bookingId)
}

export async function reassignBookingDriver(bookingId, moverId, moverName = null, moverPhone = null) {
  const patch = {
    mover_id: moverId,
    status: 'accepted',
    accepted_at: new Date().toISOString(),
  }

  try {
    await supabase.from('bookings').update(patch).eq('id', bookingId)
  } catch (err) {
    console.warn('Could not reassign mover in DB:', err)
  }

  const bookings = getLocal(STORAGE_BOOKINGS, DEFAULT_BOOKINGS).map((b) => {
    if (b.id === bookingId) {
      return {
        ...b,
        mover_id: moverId,
        mover_name: moverName || b.mover_name || 'Assigned Driver',
        mover_phone: moverPhone || b.mover_phone || '+92 300 0000000',
        status: 'accepted',
      }
    }
    return b
  })
  setLocal(STORAGE_BOOKINGS, bookings)
}

export async function cancelBookingAdmin(bookingId, reason = 'Cancelled by administrator') {
  const patch = { status: 'cancelled', cancellation_reason: reason }
  try {
    await supabase.from('bookings').update(patch).eq('id', bookingId)
  } catch {}

  const bookings = getLocal(STORAGE_BOOKINGS, DEFAULT_BOOKINGS).map((b) => {
    if (b.id === bookingId) return { ...b, ...patch }
    return b
  })
  setLocal(STORAGE_BOOKINGS, bookings)
}

export async function updateBookingDriverCoordinates(bookingId, lat, lng) {
  try {
    await supabase.from('bookings').update({ driver_lat: lat, driver_lng: lng }).eq('id', bookingId)
  } catch {}

  const bookings = getLocal(STORAGE_BOOKINGS, DEFAULT_BOOKINGS).map((b) => {
    if (b.id === bookingId) return { ...b, driver_lat: lat, driver_lng: lng }
    return b
  })
  setLocal(STORAGE_BOOKINGS, bookings)
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
