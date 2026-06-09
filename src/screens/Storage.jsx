import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Warehouse,
  Boxes,
  Calendar,
  MapPin,
  ShieldCheck,
  Check,
  Loader2,
  AlertCircle,
  Clock,
  PackageOpen,
} from 'lucide-react'
import { Button, Card, Field, Badge, Stagger, Item, money } from '../components/ui'
import { TopBar, BottomNav } from '../components/nav'
import { useAuth } from '../lib/AuthContext'
import {
  STORAGE_UNITS,
  STORAGE_DURATIONS,
  WAREHOUSES,
  storagePrice,
  createStorageBooking,
  listStorageBookings,
} from '../lib/storage'

export function WarehouseStorage() {
  const { user, profile } = useAuth()
  const [unit, setUnit] = useState('medium')
  const [duration, setDuration] = useState('m1')
  const [warehouse, setWarehouse] = useState(WAREHOUSES[0])
  const [startDate, setStartDate] = useState('')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)

  const load = () => {
    if (!user) return
    listStorageBookings(user.id)
      .then(setList)
      .catch(() => {})
      .finally(() => setLoading(false))
  }
  useEffect(load, [user?.id])

  const durObj = STORAGE_DURATIONS.find((d) => d.id === duration)
  const unitObj = STORAGE_UNITS.find((u) => u.id === unit)
  const price = storagePrice(unit, durObj.days)

  async function reserve() {
    setErr('')
    if (!startDate) return setErr('Pick a start date.')
    setBusy(true)
    try {
      await createStorageBooking({
        customer_id: user.id,
        unit_size: unitObj.name,
        warehouse,
        duration_label: durObj.label,
        days: durObj.days,
        start_date: startDate,
        price,
        status: 'reserved',
      })
      setDone(true)
      setStartDate('')
      load()
      setTimeout(() => setDone(false), 2500)
    } catch (e) {
      setErr(e.message || 'Could not reserve. Make sure the storage table exists.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="Warehouse Storage" back />
      <Stagger className="flex-1 space-y-5 px-5 pb-6">
        {/* hero */}
        <Item>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-[var(--shadow-float)]">
            <p className="flex items-center gap-2 text-sm font-bold"><Warehouse className="h-5 w-5" /> Secure Storage</p>
            <p className="mt-1 max-w-[80%] text-xs text-brand-100">
              Reserve a climate-controlled warehouse unit for as long as you need. 24/7 monitored, fully insured.
            </p>
            <PackageOpen className="absolute bottom-2 right-3 h-16 w-16 text-white/20" />
          </div>
        </Item>

        {/* unit size */}
        <Item>
          <p className="mb-2 text-base font-bold text-ink">Choose Unit Size</p>
          <div className="space-y-3">
            {STORAGE_UNITS.map((u) => {
              const active = unit === u.id
              return (
                <button
                  key={u.id}
                  onClick={() => setUnit(u.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 bg-white p-4 text-left transition ${
                    active ? 'border-brand-600 shadow-[var(--shadow-card)]' : 'border-slate-100'
                  }`}
                >
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${active ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-500'}`}>
                    <Boxes className="h-6 w-6" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-sm font-bold text-ink">{u.name}</span>
                    <span className="block text-[11px] text-slate-400">{u.cap}</span>
                  </span>
                  <span className="text-right">
                    <span className="block text-sm font-extrabold text-brand-700">{money(u.rate)}</span>
                    <span className="block text-[10px] text-slate-400">/ day</span>
                  </span>
                </button>
              )
            })}
          </div>
        </Item>

        {/* duration */}
        <Item>
          <p className="mb-2 text-base font-bold text-ink">Duration</p>
          <div className="flex flex-wrap gap-2">
            {STORAGE_DURATIONS.map((d) => (
              <button
                key={d.id}
                onClick={() => setDuration(d.id)}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  duration === d.id ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                <Clock className="h-4 w-4" /> {d.label}
              </button>
            ))}
          </div>
        </Item>

        {/* warehouse + start date */}
        <Item>
          <Card className="space-y-3 p-4">
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <MapPin className="h-3.5 w-3.5 text-brand-500" /> Warehouse Location
              </span>
              <div className="flex flex-wrap gap-2">
                {WAREHOUSES.map((w) => (
                  <button
                    key={w}
                    onClick={() => setWarehouse(w)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                      warehouse === w ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                <Calendar className="h-3.5 w-3.5 text-brand-500" /> Start Date
              </span>
              <Field type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
          </Card>
        </Item>

        {/* summary */}
        <Item>
          <Card className="space-y-2 bg-brand-50/60 p-4 ring-1 ring-brand-100">
            <div className="flex justify-between text-sm text-slate-600">
              <span>{unitObj.name} · {durObj.label}</span>
              <span>{money(unitObj.rate)} × {durObj.days}d</span>
            </div>
            <div className="flex justify-between border-t border-brand-100 pt-2 text-base font-extrabold">
              <span className="text-ink">Total</span>
              <span className="text-brand-700">{money(price)}</span>
            </div>
            <p className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
              <ShieldCheck className="h-3.5 w-3.5" /> Insured & climate controlled
            </p>
          </Card>
        </Item>

        {err && (
          <Item>
            <div className="flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {err}
            </div>
          </Item>
        )}
        {done && (
          <Item>
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-600">
              <Check className="h-4 w-4" /> Storage unit reserved.
            </div>
          </Item>
        )}

        <Item>
          <Button onClick={reserve} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : `Reserve · ${money(price)}`}
          </Button>
        </Item>

        {/* existing reservations */}
        <Item>
          <h3 className="mb-2 text-base font-bold text-ink">Your Reservations</h3>
        </Item>
        {loading ? (
          <Item className="grid place-items-center py-6 text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </Item>
        ) : list.length === 0 ? (
          <Item>
            <Card className="flex flex-col items-center gap-2 p-6 text-center text-slate-400">
              <Boxes className="h-7 w-7" />
              <p className="text-sm font-semibold">No storage reserved yet</p>
            </Card>
          </Item>
        ) : (
          list.map((s) => (
            <Item key={s.id}>
              <Card className="flex items-center gap-3 p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Warehouse className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">{s.unit_size}</p>
                  <p className="text-[11px] text-slate-400">{s.warehouse} · {s.duration_label}</p>
                  {s.start_date && <p className="text-[11px] text-slate-400">From {s.start_date}</p>}
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-brand-700">{money(Number(s.price))}</p>
                  <Badge tone="green">{s.status || 'reserved'}</Badge>
                </div>
              </Card>
            </Item>
          ))
        )}
      </Stagger>
      <BottomNav role="customer" />
    </div>
  )
}
