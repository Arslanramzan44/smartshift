// Lightweight role/session store backed by localStorage.
// Keeps customer and mover experiences isolated so data never mixes.

const ROLE_KEY = 'smartshift.role'

export const ROLES = ['customer', 'mover']

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
  return role === 'mover' ? '/mover' : '/customer'
}
