// Supabase Edge Function — Safepay Payments v3 + Server-Side Verification & Webhook Handler
// Deploy with:
//   supabase secrets set SAFEPAY_ENV=sandbox SAFEPAY_PUBLIC_KEY=... SAFEPAY_SECRET_KEY=... SAFEPAY_WEBHOOK_SECRET=...
//   supabase functions deploy safepay

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sfpy-signature',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PAID_STATES = new Set([
  'TRACKER_ENDED',
  'TRACKER_AUTHORIZED',
  'TRACKER_CAPTURED',
  'TRACKER_CONFIRMED',
  'PAID',
  'COMPLETED',
])

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function hmacHex(secret: string, value: string, hash: 'SHA-256' | 'SHA-512' = 'SHA-256') {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash },
    false,
    ['sign']
  )
  const sigBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const safepayEnv = (Deno.env.get('SAFEPAY_ENV') || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox'
  const publicKey = Deno.env.get('SAFEPAY_PUBLIC_KEY') || ''
  const secretKey = Deno.env.get('SAFEPAY_SECRET_KEY') || ''
  const webhookSecret = Deno.env.get('SAFEPAY_WEBHOOK_SECRET') || ''
  const apiBase =
    safepayEnv === 'production'
      ? 'https://api.getsafepay.com'
      : 'https://sandbox.api.getsafepay.com'

  if (!publicKey || !secretKey) {
    return json({ error: 'Safepay secrets not configured on Edge Function.' }, 500)
  }

  try {
    const body = await req.json()
    const action = body.action

    if (action === 'create-session') {
      const amountPkr = Math.round(Number(body.amountPkr || 0))
      if (!Number.isFinite(amountPkr) || amountPkr < 1) {
        return json({ error: 'Invalid advance payment amount (PKR).' }, 400)
      }

      const amountSubunits = amountPkr * 100
      const orderId = String(body.orderId || `SS-${Date.now()}`)

      const orderRes = await fetch(`${apiBase}/order/payments/v3/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SFPY-MERCHANT-SECRET': secretKey,
        },
        body: JSON.stringify({
          merchant_api_key: publicKey,
          intent: 'CYBERSOURCE',
          mode: 'payment',
          currency: 'PKR',
          amount: amountSubunits,
        }),
      })
      const orderJson = await orderRes.json()
      const tracker = orderJson?.data?.tracker?.token
      if (!orderRes.ok || !tracker) {
        return json({ error: orderJson?.status?.errors?.join(', ') || 'Safepay init failed' }, 502)
      }

      const passportRes = await fetch(`${apiBase}/client/passport/v1/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-SFPY-MERCHANT-SECRET': secretKey,
        },
      })
      const passportJson = await passportRes.json()
      const tbt = passportJson?.data
      if (!passportRes.ok || !tbt) {
        return json({ error: 'Safepay passport token generation failed' }, 502)
      }

      const params = new URLSearchParams({
        environment: safepayEnv,
        tracker,
        tbt,
        source: 'hosted',
        order_id: orderId,
      })
      if (body.redirectUrl) params.set('redirect_url', String(body.redirectUrl))
      if (body.cancelUrl) params.set('cancel_url', String(body.cancelUrl))

      return json({
        tracker,
        checkoutUrl: `${apiBase}/embedded?${params.toString()}`,
        env: safepayEnv,
        amountPkr,
        amountSubunits,
        orderId,
      })
    }

    // Direct Safepay webhook verification (X-SFPY-SIGNATURE HMAC-SHA512)
    const webhookHeader = req.headers.get('x-sfpy-signature')
    if (action === 'webhook' || webhookHeader) {
      if (!webhookSecret) return json({ error: 'SAFEPAY_WEBHOOK_SECRET not configured.' }, 500)
      const dataSig = await hmacHex(webhookSecret, JSON.stringify(body?.data ?? body), 'SHA-512')
      const rawSig = await hmacHex(webhookSecret, JSON.stringify(body), 'SHA-512')
      const provided = String(webhookHeader || '').toLowerCase()
      if (provided !== dataSig.toLowerCase() && provided !== rawSig.toLowerCase()) {
        return json({ ok: false, error: 'Invalid webhook signature' }, 401)
      }
      return json({ ok: true, received: true })
    }

    if (action === 'verify') {
      const tracker = String(body.tracker || '').trim()
      const sig = body.sig ? String(body.sig).trim() : null
      if (!tracker || !tracker.startsWith('track_')) {
        return json({ verified: false, error: 'Invalid tracker ID.' }, 400)
      }

      let signatureValid: boolean | null = null
      if (sig) {
        const keysToTry = [webhookSecret, secretKey].filter(Boolean)
        let matched = false
        for (const k of keysToTry) {
          const c256 = await hmacHex(k, tracker, 'SHA-256')
          const c512 = await hmacHex(k, tracker, 'SHA-512')
          if (c256.toLowerCase() === sig.toLowerCase() || c512.toLowerCase() === sig.toLowerCase()) {
            matched = true
            break
          }
        }
        signatureValid = matched
      }

      const repRes = await fetch(`${apiBase}/reporter/api/v1/payments/${encodeURIComponent(tracker)}`, {
        headers: { 'X-SFPY-MERCHANT-SECRET': secretKey },
      })
      const repJson = await repRes.json()
      if (!repRes.ok || !repJson?.data) {
        return json({ verified: false, error: 'Unable to fetch Safepay tracker status.' }, 502)
      }

      const data = repJson.data
      const state = String(data.state || '').toUpperCase()
      const quoteSubunits = Number(
        data.purchase_totals?.quote_amount?.amount ?? data.purchase_totals?.base_amount?.amount ?? 0
      )
      const paidAmountPkr = quoteSubunits ? Math.round(quoteSubunits / 100) : null
      const expectedAmountPkr = body.expectedAmountPkr ? Math.round(Number(body.expectedAmountPkr)) : null
      const amountOk =
        !expectedAmountPkr ||
        paidAmountPkr == null ||
        paidAmountPkr >= Math.max(1, expectedAmountPkr - 2)
      const isPaid = (PAID_STATES.has(state) || signatureValid === true) && amountOk

      return json({
        verified: isPaid,
        state,
        tracker,
        reference: data.reference || tracker,
        paidAmountPkr,
        signatureValid,
        amountOk,
        message: isPaid
          ? '30% advance payment verified by Safepay.'
          : !amountOk
          ? `Paid amount (PKR ${paidAmountPkr}) is less than required 30% advance (PKR ${expectedAmountPkr}).`
          : `Payment not completed (state: ${state}).`,
      })
    }

    return json({ error: 'Invalid action' }, 400)
  } catch (err) {
    return json({ error: (err as Error)?.message || 'Internal error' }, 500)
  }
})
