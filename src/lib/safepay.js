// Safepay 30% Advance Payment Engine (Client Wrapper)
// Secret keys stay strictly server-side (Vite middleware /api/safepay/* or Supabase Edge Function).

export const ADVANCE_PERCENT = 30
const PENDING_KEY = 'smartshift.pending_safepay_checkout'

export function computePaymentSplit(totalAmount) {
  const total = Math.max(0, Math.round(Number(totalAmount || 0)))
  const advanceAmount = Math.round((total * ADVANCE_PERCENT) / 100)
  const remainingAmount = Math.max(0, total - advanceAmount)
  return {
    total,
    advanceAmount,
    remainingAmount,
    percent: ADVANCE_PERCENT,
  }
}

export function generateOrderRef(prefix = 'SS') {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
}

// Structured metadata stored in notes so Customer, Driver, Warehouse, and Admin all see exact Safepay split
export function formatSafepayNotes({
  baseNotes = '',
  tracker = '',
  reference = '',
  advanceAmount = 0,
  remainingAmount = 0,
  totalAmount = 0,
  balanceMethod = 'cod',
}) {
  const tag = `[SAFEPAY 30% ADVANCE PAID: PKR ${Number(advanceAmount).toLocaleString()} | Remaining 70%: PKR ${Number(remainingAmount).toLocaleString()} (${balanceMethod === 'card' ? 'Card' : 'COD'}) | Total: PKR ${Number(totalAmount).toLocaleString()} | Tracker: ${tracker}${reference && reference !== tracker ? ` | Ref: ${reference}` : ''}]`
  return baseNotes ? `${baseNotes}\n${tag}` : tag
}

export function parseSafepayNotes(notes = '', fallbackTotal = 0) {
  const text = String(notes || '')
  const match = text.match(/\[SAFEPAY 30% ADVANCE PAID:\s*PKR\s*([\d,]+)\s*\|\s*Remaining 70%:\s*PKR\s*([\d,]+)\s*\(([^)]+)\)(?:\s*\|\s*Total:\s*PKR\s*([\d,]+))?(?:\s*\|\s*Tracker:\s*([^\|\]]+))?/i)
  if (!match) return null
  const num = (s) => Number(String(s || '0').replace(/,/g, '')) || 0
  return {
    isSafepay: true,
    advancePaid: num(match[1]),
    remainingDue: num(match[2]),
    balanceMethod: match[3]?.trim() || 'COD',
    total: match[4] ? num(match[4]) : Number(fallbackTotal || 0),
    tracker: match[5]?.trim() || null,
  }
}

// Local draft persistence across Safepay hosted checkout redirect
export function savePendingCheckout(draft) {
  try {
    const all = getAllPendingCheckouts()
    all[draft.orderRef] = { ...draft, savedAt: Date.now() }
    localStorage.setItem(PENDING_KEY, JSON.stringify(all))
  } catch {
    // ignore storage quota
  }
}

export function getAllPendingCheckouts() {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function getPendingCheckout(orderRef) {
  const all = getAllPendingCheckouts()
  if (orderRef && all[orderRef]) return all[orderRef]
  // Fallback to most recent pending checkout if order_ref wasn't echoed
  const list = Object.values(all).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
  return list[0] || null
}

export function updatePendingCheckout(orderRef, patch) {
  try {
    const all = getAllPendingCheckouts()
    if (!all[orderRef]) return
    all[orderRef] = { ...all[orderRef], ...patch }
    localStorage.setItem(PENDING_KEY, JSON.stringify(all))
  } catch {
    // ignore
  }
}

export function clearPendingCheckout(orderRef) {
  try {
    const all = getAllPendingCheckouts()
    if (orderRef) delete all[orderRef]
    localStorage.setItem(PENDING_KEY, JSON.stringify(all))
  } catch {
    // ignore
  }
}

async function callSafepayBackend(endpoint, action, payload) {
  // 1. Primary: Same-origin Vite server / backend API (/api/safepay/*)
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const contentType = res.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Safepay API error (${res.status})`)
      return data
    }
  } catch (err) {
    // Only fall back to Supabase Edge Function if same-origin route wasn't found / network error
    const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL
    const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY
    if (!supabaseUrl || !anonKey) throw err

    const fnRes = await fetch(`${supabaseUrl}/functions/v1/safepay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      body: JSON.stringify({ action, ...payload }),
    })
    const fnJson = await fnRes.json().catch(() => ({}))
    if (!fnRes.ok) {
      throw new Error(fnJson.error || err.message || 'Safepay payment service unavailable.')
    }
    return fnJson
  }

  throw new Error('Safepay backend endpoint did not return JSON.')
}

export async function createSafepayCheckoutSession({ amountPkr, orderId, redirectUrl, cancelUrl }) {
  return callSafepayBackend('/api/safepay/create-session', 'create-session', {
    amountPkr,
    orderId,
    redirectUrl,
    cancelUrl,
  })
}

export async function verifySafepayPayment({ tracker, sig = null, expectedAmountPkr = null }) {
  return callSafepayBackend('/api/safepay/verify', 'verify', {
    tracker,
    sig,
    expectedAmountPkr,
  })
}
