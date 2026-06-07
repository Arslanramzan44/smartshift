import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Menu,
  MoreVertical,
  Bell,
  Home,
  Truck,
  ClipboardList,
  User,
  LayoutGrid,
  MapPin,
} from 'lucide-react'
import { Logo } from './ui'

/* ---------- Top bar ---------- */
export function TopBar({ title, back, brand = false, menu = false, kebab = false, left, right, dark = false }) {
  const nav = useNavigate()
  return (
    <div className={`sticky top-0 z-40 flex items-center gap-2 px-4 pb-3 pt-9 ${dark ? 'bg-slate-50' : 'bg-slate-50/90 backdrop-blur'}`}>
      {left}
      {back && (
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => nav(-1)}
          className="grid h-9 w-9 place-items-center rounded-full bg-white text-ink shadow-sm ring-1 ring-slate-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </motion.button>
      )}
      {menu && (
        <button className="grid h-9 w-9 place-items-center rounded-full text-slate-600">
          <Menu className="h-5 w-5" />
        </button>
      )}
      <div className="flex flex-1 items-center justify-center">
        {brand ? <Logo size="sm" /> : <h1 className="text-base font-bold text-ink">{title}</h1>}
      </div>
      {right}
      {kebab && (
        <button className="grid h-9 w-9 place-items-center rounded-full text-slate-500">
          <MoreVertical className="h-5 w-5" />
        </button>
      )}
      {!right && !kebab && (back || menu || left) && <div className="h-9 w-9" />}
    </div>
  )
}

export function NotifBell({ count = 0, to }) {
  return (
    <Link to={to} className="relative grid h-9 w-9 place-items-center rounded-full bg-white text-slate-600 shadow-sm ring-1 ring-slate-100">
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
          {count}
        </span>
      )}
    </Link>
  )
}

/* ---------- Bottom nav ---------- */
const customerTabs = [
  { to: '/customer', icon: Home, label: 'Home', end: true },
  { to: '/customer/book', icon: Truck, label: 'Book' },
  { to: '/customer/moves', icon: MapPin, label: 'Moves' },
  { to: '/customer/alerts', icon: Bell, label: 'Alerts' },
  { to: '/customer/profile', icon: User, label: 'Profile' },
]

const moverTabs = [
  { to: '/mover', icon: LayoutGrid, label: 'Home', end: true },
  { to: '/mover/available', icon: Truck, label: 'Available' },
  { to: '/mover/jobs', icon: ClipboardList, label: 'My Jobs' },
  { to: '/mover/notifications', icon: Bell, label: 'Alerts' },
  { to: '/mover/profile', icon: User, label: 'Profile' },
]

export function BottomNav({ role = 'customer' }) {
  const tabs = role === 'mover' ? moverTabs : customerTabs
  const { pathname } = useLocation()
  return (
    <>
      {/* spacer reserves space so fixed bar never overlaps content */}
      <div className="h-20" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto max-w-md border-t border-slate-100 bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur sm:max-w-lg">
          <div className="flex items-center justify-around">
            {tabs.map((t) => {
              const active = t.end ? pathname === t.to : pathname.startsWith(t.to)
              const Icon = t.icon
              return (
                <Link key={t.to} to={t.to} className="relative flex flex-1 flex-col items-center gap-1 py-1">
                  <span
                    className={`grid h-9 w-12 place-items-center rounded-xl transition ${
                      active ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30' : 'text-slate-400'
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  </span>
                  <span className={`text-[10px] font-semibold ${active ? 'text-brand-700' : 'text-slate-400'}`}>
                    {t.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
