import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import crypto from 'node:crypto'

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (chunk) => {
      raw += chunk
      if (raw.length > 1_000_000) reject(new Error('Payload too large'))
    })
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

function sendJson(res, status, data) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

function safepayApiPlugin(envVars) {
  const safepayEnv = (envVars.SAFEPAY_ENV || 'sandbox').toLowerCase() === 'production' ? 'production' : 'sandbox'
  const publicKey = envVars.SAFEPAY_PUBLIC_KEY || ''
  const secretKey = envVars.SAFEPAY_SECRET_KEY || ''
  const webhookSecret = envVars.SAFEPAY_WEBHOOK_SECRET || ''
  const apiBase =
    safepayEnv === 'production'
      ? 'https://api.getsafepay.com'
      : 'https://sandbox.api.getsafepay.com'

  const verifiedWebhookTrackers = new Set()

  const timingSafeEqualHex = (expected, provided) => {
    if (!expected || !provided) return false
    const a = Buffer.from(String(expected).toLowerCase())
    const b = Buffer.from(String(provided).toLowerCase())
    return a.length === b.length && crypto.timingSafeEqual(a, b)
  }

  const PAID_STATES = new Set([
    'TRACKER_ENDED',
    'TRACKER_AUTHORIZED',
    'TRACKER_CAPTURED',
    'TRACKER_CONFIRMED',
    'PAID',
    'COMPLETED',
  ])

  const handler = async (req, res, next) => {
    const pathname = (req.url || '').split('?')[0]
    if (!pathname.startsWith('/api/safepay/')) return next()

    if (!publicKey || !secretKey) {
      return sendJson(res, 500, {
        error: 'Safepay server keys (SAFEPAY_PUBLIC_KEY / SAFEPAY_SECRET_KEY) are not configured in .env.',
      })
    }

    if (req.method === 'POST' && pathname === '/api/safepay/create-session') {
      try {
        const body = await readJsonBody(req)
        const amountPkr = Math.round(Number(body.amountPkr || 0))
        if (!Number.isFinite(amountPkr) || amountPkr < 1) {
          return sendJson(res, 400, { error: 'Invalid advance payment amount (PKR).' })
        }

        const amountSubunits = amountPkr * 100 // Safepay v3 expects minor units (paisas)
        const orderId = String(body.orderId || `SS-${Date.now()}`)
        const redirectUrl = String(body.redirectUrl || '')
        const cancelUrl = String(body.cancelUrl || redirectUrl)

        // 1. Create Safepay v3 payment session tracker
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
          const msg = orderJson?.status?.errors?.join(', ') || 'Failed to initialize Safepay payment session.'
          return sendJson(res, 502, { error: msg, raw: orderJson })
        }

        // 2. Generate short-lived Passport TBT (Time-Based Token)
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
          return sendJson(res, 502, { error: 'Failed to generate Safepay checkout token.' })
        }

        // 3. Build Safepay v3 Hosted Checkout URL (/embedded requires `environment` + `tracker` + `tbt` + `source=hosted`)
        const params = new URLSearchParams({
          environment: safepayEnv,
          tracker,
          tbt,
          source: 'hosted',
          order_id: orderId,
        })
        if (redirectUrl) params.set('redirect_url', redirectUrl)
        if (cancelUrl) params.set('cancel_url', cancelUrl)

        const checkoutUrl = `${apiBase}/embedded?${params.toString()}`

        return sendJson(res, 200, {
          tracker,
          checkoutUrl,
          env: safepayEnv,
          amountPkr,
          amountSubunits,
          orderId,
        })
      } catch (err) {
        return sendJson(res, 500, { error: err?.message || 'Safepay session initialization error.' })
      }
    }

    if (req.method === 'POST' && pathname === '/api/safepay/webhook') {
      try {
        const body = await readJsonBody(req)
        const signatureHeader =
          req.headers['x-sfpy-signature'] || req.headers['X-SFPY-SIGNATURE'] || ''
        if (!webhookSecret) {
          return sendJson(res, 500, { error: 'SAFEPAY_WEBHOOK_SECRET is not configured.' })
        }

        const payloadToSign = JSON.stringify(body?.data ?? body)
        const computedSha512 = crypto
          .createHmac('sha512', webhookSecret)
          .update(payloadToSign)
          .digest('hex')
        const rawSha512 = crypto
          .createHmac('sha512', webhookSecret)
          .update(JSON.stringify(body))
          .digest('hex')

        const valid =
          timingSafeEqualHex(computedSha512, signatureHeader) ||
          timingSafeEqualHex(rawSha512, signatureHeader)

        if (!valid) {
          return sendJson(res, 401, { ok: false, error: 'Invalid Safepay webhook signature.' })
        }

        const eventType = String(body?.type || body?.data?.type || '').toLowerCase()
        const tracker =
          body?.data?.notification?.tracker ||
          body?.data?.tracker ||
          body?.tracker ||
          ''
        const state = String(
          body?.data?.notification?.state || body?.data?.state || ''
        ).toUpperCase()

        if (
          tracker &&
          (eventType.includes('succeed') ||
            eventType.includes('paid') ||
            PAID_STATES.has(state))
        ) {
          verifiedWebhookTrackers.add(tracker)
        }

        return sendJson(res, 200, { ok: true, received: true, tracker: tracker || null })
      } catch (err) {
        return sendJson(res, 400, { ok: false, error: err?.message || 'Webhook processing error.' })
      }
    }

    if (req.method === 'POST' && pathname === '/api/safepay/verify') {
      try {
        const body = await readJsonBody(req)
        const tracker = String(body.tracker || '').trim()
        const sig = body.sig ? String(body.sig).trim() : null

        if (!tracker || !tracker.startsWith('track_')) {
          return sendJson(res, 400, { verified: false, error: 'Missing or invalid Safepay tracker ID.' })
        }

        // 1. Optional cryptographic signature check if Safepay appended `sig` on redirect
        let signatureValid = null
        if (sig) {
          const keysToTry = [webhookSecret, secretKey].filter(Boolean)
          signatureValid = keysToTry.some((k) => {
            const computed256 = crypto.createHmac('sha256', k).update(tracker).digest('hex')
            const computed512 = crypto.createHmac('sha512', k).update(tracker).digest('hex')
            return timingSafeEqualHex(computed256, sig) || timingSafeEqualHex(computed512, sig)
          })
        }

        // 2. Authoritative server-to-server status verification via Safepay Reporter API
        const repRes = await fetch(`${apiBase}/reporter/api/v1/payments/${encodeURIComponent(tracker)}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-SFPY-MERCHANT-SECRET': secretKey,
          },
        })
        const repJson = await repRes.json()
        if (!repRes.ok || !repJson?.data) {
          return sendJson(res, 502, {
            verified: false,
            error: 'Could not verify tracker status with Safepay.',
          })
        }

        const data = repJson.data
        const state = String(data.state || '').toUpperCase()
        const quoteSubunits = Number(
          data.purchase_totals?.quote_amount?.amount ??
            data.purchase_totals?.base_amount?.amount ??
            0
        )
        const paidAmountPkr = quoteSubunits ? Math.round(quoteSubunits / 100) : null
        const expectedAmountPkr = body.expectedAmountPkr ? Math.round(Number(body.expectedAmountPkr)) : null
        const reference = data.reference || data.token || tracker

        const amountOk =
          !expectedAmountPkr ||
          paidAmountPkr == null ||
          paidAmountPkr >= Math.max(1, expectedAmountPkr - 2)
        const webhookConfirmed = verifiedWebhookTrackers.has(tracker)
        const isPaid =
          (PAID_STATES.has(state) || signatureValid === true || webhookConfirmed) && amountOk

        return sendJson(res, 200, {
          verified: isPaid,
          state,
          tracker,
          reference,
          paidAmountPkr,
          signatureValid,
          webhookConfirmed,
          amountOk,
          message: isPaid
            ? '30% advance payment verified by Safepay.'
            : !amountOk
            ? `Paid amount (PKR ${paidAmountPkr}) is less than required 30% advance (PKR ${expectedAmountPkr}).`
            : `Payment is not completed yet (Safepay state: ${state || 'UNKNOWN'}).`,
        })
      } catch (err) {
        return sendJson(res, 500, { verified: false, error: err?.message || 'Safepay verification error.' })
      }
    }

    return sendJson(res, 404, { error: 'Unknown Safepay endpoint' })
  }

  return {
    name: 'smartshift-safepay-api',
    configureServer(server) {
      server.middlewares.use(handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler)
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react(), tailwindcss(), safepayApiPlugin(env)],
  }
})
