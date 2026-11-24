// Parses structured Safepay 30% advance payment tags embedded in booking/storage notes
export function parseSafepayInfo(notes = '', fallbackTotal = 0) {
  const text = String(notes || '')
  const match = text.match(
    /\[SAFEPAY 30% ADVANCE PAID:\s*PKR\s*([\d,]+)\s*\|\s*Remaining 70%:\s*PKR\s*([\d,]+)\s*\(([^)]+)\)(?:\s*\|\s*Total:\s*PKR\s*([\d,]+))?(?:\s*\|\s*Tracker:\s*([^\|\]]+))?/i
  )
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
