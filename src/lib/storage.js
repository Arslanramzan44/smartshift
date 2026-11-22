import {
  createCustomerStorageBooking,
  listCustomerStorageBookings,
  listApprovedWarehouses,
} from './warehouse'

// Warehouse storage reservations. Backed by `warehouses`, `storage_bookings`,
// and `warehouse_tracking_logs`.

export const STORAGE_UNITS = [
  { id: 'small', name: 'Small Unit', cap: '5 m³ · ~1 room', rate: 200, rateField: 'small_rate_daily', availField: 'small_units_available' },
  { id: 'medium', name: 'Medium Unit', cap: '15 m³ · ~2–3 rooms', rate: 450, rateField: 'medium_rate_daily', availField: 'medium_units_available' },
  { id: 'large', name: 'Large Unit', cap: '40 m³ · house / office', rate: 900, rateField: 'large_rate_daily', availField: 'large_units_available' },
]

export const STORAGE_DURATIONS = [
  { id: 'w1', label: '1 Week', days: 7 },
  { id: 'w2', label: '2 Weeks', days: 14 },
  { id: 'm1', label: '1 Month', days: 30 },
  { id: 'm3', label: '3 Months', days: 90 },
]

export const WAREHOUSES = [
  'SmartShift Gulberg Climate Hub',
  'SmartShift Johar Town Vault',
  'SmartShift Islamabad I-9 Hub',
]

export function unitRateForWarehouse(unitId, warehouseObj = null) {
  const u = STORAGE_UNITS.find((x) => x.id === unitId)
  if (!u) return 0
  if (warehouseObj && warehouseObj[u.rateField] != null) {
    return Number(warehouseObj[u.rateField])
  }
  return u.rate
}

export function storagePrice(unitId, days, warehouseObj = null) {
  return unitRateForWarehouse(unitId, warehouseObj) * Number(days || 0)
}

export async function createStorageBooking(row) {
  return createCustomerStorageBooking(row)
}

export async function listStorageBookings(customerId) {
  return listCustomerStorageBookings(customerId)
}

export { listApprovedWarehouses }
