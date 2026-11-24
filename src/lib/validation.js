// Shared validation rules for SmartShift authentication screens.
// Each validator returns an error message string, or '' when the value is valid.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const NAME_RE = /^[A-Za-z][A-Za-z .'-]*$/
// Pakistani mobile: +92 3XX XXXXXXX (12 digits after +) or 03XX XXXXXXX (11 digits).
const PK_PHONE_RE = /^(?:\+92|0)3\d{9}$/
// Pakistani plates, e.g. LEA-8492, ABC-123, LE-19-1234, ICT 4521.
const PLATE_RE = /^[A-Z]{2,4}[- ]?(?:\d{2}[- ]?)?\d{1,4}$/i

export const MAX_FILE_MB = 5
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const PDF_TYPE = 'application/pdf'

/** Strip spaces, dashes and brackets so "+92 300-123 4567" can be validated. */
export function cleanPhone(raw = '') {
  return String(raw).replace(/[\s\-()]/g, '')
}

/** Normalise a valid PK number to +923XXXXXXXXX for storage. */
export function normalizePhone(raw = '') {
  const p = cleanPhone(raw)
  if (p.startsWith('0')) return `+92${p.slice(1)}`
  return p
}

export function validateName(v = '') {
  const s = v.trim()
  if (!s) return 'Full name is required.'
  if (s.length < 3) return 'Full name must be at least 3 characters.'
  if (s.length > 50) return 'Full name must be 50 characters or fewer.'
  if (!NAME_RE.test(s)) return 'Full name can contain letters, spaces, dots, apostrophes and hyphens only.'
  return ''
}

export function validateEmail(v = '') {
  const s = v.trim()
  if (!s) return 'Email is required.'
  if (s.length > 254 || !EMAIL_RE.test(s)) return 'Enter a valid email address (e.g. name@example.com).'
  return ''
}

export function validatePhone(v = '') {
  const p = cleanPhone(v)
  if (!p) return 'Phone number is required.'
  if (!PK_PHONE_RE.test(p)) return 'Enter a valid Pakistani mobile number: +92XXXXXXXXXX or 03XXXXXXXXX.'
  return ''
}

export function validatePassword(v = '') {
  if (!v) return 'Password is required.'
  if (v.length < 8) return 'Password must be at least 8 characters.'
  if (v.length > 72) return 'Password must be 72 characters or fewer.'
  if (/\s/.test(v)) return 'Password cannot contain spaces.'
  if (!/[A-Za-z]/.test(v) || !/\d/.test(v)) return 'Password must include at least one letter and one number.'
  return ''
}

export function validateConfirm(password, confirm) {
  if (!confirm) return 'Please confirm your password.'
  if (password !== confirm) return 'Passwords do not match.'
  return ''
}

export function validatePlate(v = '') {
  const s = v.trim()
  if (!s) return 'License plate is required.'
  if (!PLATE_RE.test(s)) return 'Enter a valid plate number (e.g. LEA-8492).'
  return ''
}

/**
 * Validate an uploaded file.
 * @param {File|null} file
 * @param {string} label   human label for messages
 * @param {string} accept  same string passed to <input accept>, e.g. 'image/*,application/pdf'
 */
export function validateFile(file, label, accept = 'image/*') {
  if (!file) return `${label} is required.`
  const allowPdf = accept.includes(PDF_TYPE)
  const type = (file.type || '').toLowerCase()
  const isImage = IMAGE_TYPES.includes(type) || (type.startsWith('image/') && type !== 'image/svg+xml')
  const ok = isImage || (allowPdf && type === PDF_TYPE)
  if (!ok) return `${label} must be ${allowPdf ? 'an image (JPG/PNG) or PDF' : 'an image (JPG/PNG)'}.`
  if (file.size > MAX_FILE_MB * 1024 * 1024) return `${label} must be smaller than ${MAX_FILE_MB} MB.`
  return ''
}

/** Non-negative whole number check for warehouse unit counts. */
export function validateCount(v, label) {
  const s = String(v ?? '').trim()
  if (s === '') return `${label} is required.`
  const n = Number(s)
  if (!Number.isInteger(n) || n < 0) return `${label} must be a whole number of 0 or more.`
  if (n > 10000) return `${label} looks too large.`
  return ''
}

/** Positive number check for areas and rates. */
export function validatePositive(v, label, max = 10_000_000) {
  const s = String(v ?? '').trim()
  if (s === '') return `${label} is required.`
  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) return `${label} must be greater than 0.`
  if (n > max) return `${label} looks too large.`
  return ''
}

/** Map Supabase auth errors to friendly messages. */
export function friendlyAuthError(err, fallback = 'Something went wrong.') {
  const m = (err?.message || '').toLowerCase()
  if (m.includes('already registered') || m.includes('already exists') || m.includes('duplicate'))
    return 'An account with this email already exists. Please log in instead.'
  if (m.includes('invalid login credentials')) return 'Incorrect email or password.'
  if (m.includes('email not confirmed')) return 'Please confirm your email address before logging in.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Please wait a minute and try again.'
  if (m.includes('password should be')) return err.message
  return err?.message || fallback
}
