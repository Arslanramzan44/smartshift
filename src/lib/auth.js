// Lightweight role/session store backed by localStorage.
// Keeps customer, mover, warehouse, and admin experiences cleanly routed.

const ROLE_KEY = 'smartshift.role'

export const ROLES = ['customer', 'mover', 'warehouse', 'admin']

export function setRole(role) {
  if (!ROLES.includes(role)) return
  localStorage.setItem(ROLE_KEY, role)
}

export function getRole() {
  const r = localStorage.getItem(ROLE_KEY)
  return ROLES.includes(r) ? r : null
}

export function clearRole() {
  localStorage.removeItem(ROLE_KEY)
}

// Home path for a given (or current) role.
export function homeFor(role = getRole()) {
  if (role === 'mover') return '/mover'
  if (role === 'warehouse') return '/warehouse'
  if (role === 'admin') return '/admin'
  return '/customer'
}
