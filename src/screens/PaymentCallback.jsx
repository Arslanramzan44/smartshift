import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  RefreshCw,
  CreditCard,
  Truck,
  Warehouse,
  Lock,
  Receipt,
} from 'lucide-react'
import { Button, Card, Badge, money } from '../components/ui'
import { TopBar } from '../components/nav'
import { useAuth } from '../lib/AuthContext'
import { createBooking } from '../lib/bookings'
import { createStorageBooking } from '../lib/storage'
import {
  ADVANCE_PERCENT,
  computePaymentSplit,
  formatSafepayNotes,
  getPendingCheckout,
  updatePendingCheckout,
  createSafepayCheckoutSession,
  verifySafepayPayment,
} from '../lib/safepay'

export function PaymentCallback() {
  const nav = useNavigate()
  const [params] = useSearchParams()
  const { user } = useAuth()

  const rawOrderRef = params.get('order_id') || params.get('order_ref') || ''
  const orderRefParam = rawOrderRef.split('?')[0]
  const trackerParam = params.get('tracker') || params.get('beacon') || ''
  const sigParam = params.get('sig') || null
  const cancelledParam = params.get('cancelled') === '1' || params.get('status') === 'cancelled'

  const [status, setStatus] = useState(cancelledParam ? 'cancelled' : 'verifying') // verifying | success | unpaid | cancelled | error
  const [draft, setDraft] = useState(() => getPendingCheckout(orderRefParam))
  const [verification, setVerification] = useState(null)
  const [finalized, setFinalized] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')
  const [retrying, setRetrying] = useState(false)

  const finalizingRef = useRef(false)

  const finalizeDraftIntoSupabase = useCallback(async (currentDraft, verifyResult) => {
    // Idempotency guard: if already saved in Supabase, reuse existing IDs
    if (currentDraft?.finalized?.bookingId || currentDraft?.finalized?.storageBookingId) {
      setFinalized(currentDraft.finalized)
      setStatus('success')
      return
    }
    if (finalizingRef.current) return
    finalizingRef.current = true

    try {
      const tracker = verifyResult.tracker || currentDraft.tracker
      const reference = verifyResult.reference || tracker
      const balanceMethod = currentDraft.balanceMethod || 'cod'

      let createdMove = null
      let createdStorage = null

      if (currentDraft.kind === 'warehouse') {
        const storagePrice = Number(currentDraft.storagePayload?.price || 0)
        const storageSplit = computePaymentSplit(storagePrice)
        const storageNotes = formatSafepayNotes({
          baseNotes: currentDraft.storagePayload?.notes || '',
          tracker,
          reference,
          advanceAmount: storageSplit.advanceAmount,
          remainingAmount: storageSplit.remainingAmount,
          totalAmount: storageSplit.total,
          balanceMethod,
        })

        createdStorage = await createStorageBooking({
          ...currentDraft.storagePayload,
          customer_id: currentDraft.storagePayload?.customer_id || user?.id,
          payment_method: 'card',
          notes: storageNotes,
        })

        if (currentDraft.movePayload) {
          const movePrice = Number(currentDraft.movePayload.price || 0)
          const moveSplit = computePaymentSplit(movePrice)
          const baseMoveNote = (currentDraft.movePayload.notes || '').replace(
            '__STORAGE_REF__',
            `#${String(createdStorage.id).slice(0, 8)}`
          )
          const moveNotes = formatSafepayNotes({
            baseNotes: baseMoveNote,
            tracker,
            reference,
            advanceAmount: moveSplit.advanceAmount,
            remainingAmount: moveSplit.remainingAmount,
            totalAmount: moveSplit.total,
            balanceMethod,
          })

          createdMove = await createBooking(
            {
              ...currentDraft.movePayload,
              customer_id: currentDraft.movePayload.customer_id || user?.id,
              payment_method: 'card',
              notes: moveNotes,
            },
            currentDraft.items || []
          )
        }
      } else {
        // Default: standard Move Wizard booking (plus optional Warehouse Storage add-on)
        const movePrice = Number(currentDraft.movePayload?.price || currentDraft.totalAmount || 0)
        const moveSplit = computePaymentSplit(movePrice)
        const moveNotes = formatSafepayNotes({
          baseNotes: currentDraft.movePayload?.notes || '',
          tracker,
          reference,
          advanceAmount: moveSplit.advanceAmount,
          remainingAmount: moveSplit.remainingAmount,
          totalAmount: moveSplit.total,
          balanceMethod,
        })

        createdMove = await createBooking(
          {
            ...currentDraft.movePayload,
            customer_id: currentDraft.movePayload?.customer_id || user?.id,
            payment_method: 'card',
            notes: moveNotes,
          },
          currentDraft.items || []
        )

        if (currentDraft.storagePayload) {
          try {
            const storageSplit = computePaymentSplit(currentDraft.storagePayload.price)
            const storageNotes = formatSafepayNotes({
              baseNotes: currentDraft.storagePayload.notes || '',
              tracker,
              reference,
              advanceAmount: storageSplit.advanceAmount,
              remainingAmount: storageSplit.remainingAmount,
              totalAmount: storageSplit.total,
              balanceMethod,
            })
            createdStorage = await createStorageBooking({
              ...currentDraft.storagePayload,
              customer_id: currentDraft.storagePayload.customer_id || user?.id,
              payment_method: 'card',
              notes: storageNotes,
            })
          } catch {
            // Move booking already persisted; storage add-on failure is non-fatal
          }
        }
      }

      const result = {
        bookingId: createdMove?.id || null,
        storageBookingId: createdStorage?.id || null,
        tracker,
        reference,
        paidAmountPkr: verifyResult.paidAmountPkr || currentDraft.advanceAmount,
        verifiedAt: new Date().toISOString(),
      }

      updatePendingCheckout(currentDraft.orderRef, { finalized: result })
      setDraft((prev) => (prev ? { ...prev, finalized: result } : prev))
      setFinalized(result)
      setStatus('success')
    } catch (err) {
      setErrorMsg(err?.message || 'Payment verified, but saving your booking failed. Tap Retry to finish.')
      setStatus('error')
    } finally {
      finalizingRef.current = false
    }
  }, [user?.id])

  const runVerification = useCallback(async () => {
    const activeDraft = getPendingCheckout(orderRefParam)
    setDraft(activeDraft)

    if (!activeDraft) {
      setErrorMsg('No pending booking draft was found for this checkout session.')
      setStatus('error')
      return
    }

    if (activeDraft.finalized?.bookingId || activeDraft.finalized?.storageBookingId) {
      setFinalized(activeDraft.finalized)
      setStatus('success')
      return
    }

    const tracker = trackerParam || activeDraft.tracker
    if (!tracker) {
      setErrorMsg('Missing Safepay payment tracker ID. Please restart checkout.')
      setStatus('error')
      return
    }

    setStatus('verifying')
    setErrorMsg('')
    try {
      const res = await verifySafepayPayment({
        tracker,
        sig: sigParam,
        expectedAmountPkr: activeDraft.advanceAmount,
      })
      setVerification(res)

      if (!res.verified) {
        setStatus('unpaid')
        return
      }

      await finalizeDraftIntoSupabase(activeDraft, res)
    } catch (err) {
      setErrorMsg(err?.message || 'Could not reach Safepay verification service.')
      setStatus('error')
    }
  }, [orderRefParam, trackerParam, sigParam, finalizeDraftIntoSupabase])

  useEffect(() => {
    if (cancelledParam) {
      const activeDraft = getPendingCheckout(orderRefParam)
      setDraft(activeDraft)
      setStatus('cancelled')
      return
    }
    runVerification()
  }, [cancelledParam, orderRefParam, runVerification])

  async function retrySafepayCheckout() {
    if (!draft) return nav('/customer/book')
    setRetrying(true)
    setErrorMsg('')
    try {
      const origin = window.location.origin
      // Keep redirectUrl free of query params because Safepay /embedded appends ?order_id=...&tracker=...
      const redirectUrl = `${origin}/payment/callback`
      const cancelUrl = `${origin}/payment/callback?order_ref=${encodeURIComponent(draft.orderRef)}&cancelled=1`

      const session = await createSafepayCheckoutSession({
        amountPkr: draft.advanceAmount,
        orderId: draft.orderRef,
        redirectUrl,
        cancelUrl,
      })

      updatePendingCheckout(draft.orderRef, {
        tracker: session.tracker,
        checkoutUrl: session.checkoutUrl,
      })

      window.location.assign(session.checkoutUrl)
    } catch (err) {
      setErrorMsg(err?.message || 'Could not restart Safepay checkout.')
      setRetrying(false)
    }
  }

  const returnPath = draft?.returnPath || (draft?.kind === 'warehouse' ? '/customer/storage' : '/customer/book')

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <TopBar title="Safepay Checkout" back />

      <div className="flex-1 px-5 py-6 space-y-5">
        {status === 'verifying' && (
          <Card className="flex flex-col items-center gap-3 p-8 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <Loader2 className="h-7 w-7 animate-spin" />
            </span>
            <h1 className="text-lg font-extrabold text-ink">Verifying 30% Advance Payment</h1>
            <p className="text-xs text-slate-500 max-w-xs">
              Confirming your Safepay transaction with the payment gateway before placing your SmartShift booking...
            </p>
          </Card>
        )}

        {status === 'success' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center space-y-3">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/30">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <div>
                <Badge tone="green">Safepay {ADVANCE_PERCENT}% Advance Verified</Badge>
                <h1 className="mt-2 text-2xl font-extrabold text-ink">Booking Confirmed!</h1>
                <p className="mt-1 text-xs text-slate-500">
                  {draft?.kind === 'warehouse'
                    ? finalized?.bookingId
                      ? 'Your warehouse unit is reserved and a shifting request has been dispatched to verified drivers.'
                      : 'Your verified warehouse storage unit is officially reserved.'
                    : 'Your relocation request is live and dispatched to nearby verified SmartShift drivers.'}
                </p>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wide text-slate-500">
                  <Receipt className="h-4 w-4 text-brand-600" /> Safepay Payment Receipt
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  <ShieldCheck className="h-3 w-3" /> Paid via Safepay
                </span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>Total Booking Amount</span>
                  <span className="font-bold text-ink">{money(draft?.totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>30% Advance Paid Now</span>
                  <span>{money(finalized?.paidAmountPkr || draft?.advanceAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>
                    Remaining 70% Balance ({draft?.balanceMethod === 'card' ? 'Card on Handover' : 'Cash on Delivery'})
                  </span>
                  <span className="font-bold text-ink">{money(draft?.remainingAmount || 0)}</span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500 space-y-1 font-mono">
                <p className="truncate">
                  <span className="font-sans font-semibold text-slate-400">Order Ref: </span>
                  {draft?.orderRef}
                </p>
                <p className="truncate">
                  <span className="font-sans font-semibold text-slate-400">Safepay Tracker: </span>
                  {finalized?.tracker || verification?.tracker}
                </p>
              </div>
            </Card>

            <div className="space-y-2.5">
              {finalized?.bookingId && (
                <Button onClick={() => nav('/customer/track', { state: { bookingId: finalized.bookingId } })}>
                  <Truck className="h-4 w-4" /> Track Live Driver Shifting <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {finalized?.storageBookingId && (
                <Button
                  variant={finalized?.bookingId ? 'ghost' : 'primary'}
                  onClick={() => nav('/customer/storage')}
                >
                  <Warehouse className="h-4 w-4" /> View Warehouse Storage & QR Pass <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {!finalized?.bookingId && !finalized?.storageBookingId && (
                <Button onClick={() => nav('/customer')}>
                  Back to Dashboard <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          </motion.div>
        )}

        {status === 'cancelled' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="border-2 border-amber-200 bg-amber-50/70 p-6 text-center space-y-3">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-amber-500 text-white">
                <XCircle className="h-8 w-8" />
              </div>
              <h1 className="text-xl font-extrabold text-ink">Payment Cancelled</h1>
              <p className="text-xs text-slate-600">
                Your booking was <strong>not placed</strong> because the mandatory {ADVANCE_PERCENT}% advance payment via Safepay was cancelled.
              </p>
            </Card>

            {draft && (
              <Card className="p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Total Estimate</span>
                  <span className="font-bold text-ink">{money(draft.totalAmount)}</span>
                </div>
                <div className="flex justify-between text-brand-700 font-extrabold text-sm">
                  <span>30% Advance Required</span>
                  <span>{money(draft.advanceAmount)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Remaining 70% on Delivery</span>
                  <span>{money(draft.remainingAmount)}</span>
                </div>
              </Card>
            )}

            {errorMsg && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {errorMsg}
              </div>
            )}

            <div className="space-y-2.5">
              <Button onClick={retrySafepayCheckout} disabled={retrying}>
                {retrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="h-4 w-4" /> Retry Safepay Checkout ({money(draft?.advanceAmount || 0)})
                  </>
                )}
              </Button>
              <Button variant="ghost" onClick={() => nav(returnPath)}>
                Return to Booking Form
              </Button>
            </div>
          </motion.div>
        )}

        {status === 'unpaid' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="border-2 border-rose-200 bg-rose-50/70 p-6 text-center space-y-3">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-600 text-white">
                <CreditCard className="h-7 w-7" />
              </div>
              <h1 className="text-xl font-extrabold text-ink">30% Advance Not Completed</h1>
              <p className="text-xs text-slate-600">
                Safepay reports this payment has not been completed yet (status:{' '}
                <span className="font-mono font-bold text-rose-700">{verification?.state || 'UNPAID'}</span>).
                SmartShift requires a verified {ADVANCE_PERCENT}% advance payment before creating your booking.
              </p>
            </Card>

            <div className="space-y-2.5">
              <Button onClick={retrySafepayCheckout} disabled={retrying}>
                {retrying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Lock className="h-4 w-4" /> Complete 30% Payment ({money(draft?.advanceAmount || 0)})
                  </>
                )}
              </Button>
              <Button variant="soft" onClick={runVerification}>
                <RefreshCw className="h-4 w-4" /> Re-check Safepay Status
              </Button>
              <Button variant="ghost" onClick={() => nav(returnPath)}>
                Back to Booking
              </Button>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <Card className="border border-rose-200 bg-rose-50 p-6 text-center space-y-3">
              <AlertCircle className="mx-auto h-10 w-10 text-rose-600" />
              <h1 className="text-lg font-extrabold text-ink">Checkout Verification Issue</h1>
              <p className="text-xs text-rose-700">{errorMsg || 'Something went wrong while verifying your Safepay payment.'}</p>
            </Card>
            <div className="space-y-2.5">
              {draft && (
                <Button onClick={runVerification}>
                  <RefreshCw className="h-4 w-4" /> Retry Verification
                </Button>
              )}
              <Button variant="ghost" onClick={() => nav(returnPath)}>
                Back to Booking
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
