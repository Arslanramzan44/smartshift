import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  ShieldCheck,
  Truck,
  Users,
  Package,
  Navigation,
  Settings,
  Bell,
  Search,
  ExternalLink,
  ChevronRight,
  LogOut,
  Radio,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { fetchAllDrivers, fetchAllBookings } from '../lib/adminData'

export function AdminLayout({ children }) {
  const location = useLocation()
  const [pendingCount, setPendingCount] = useState(0)
  const [activeRidesCount, setActiveRidesCount] = useState(0)

  const basePath = location.pathname.startsWith('/admin') ? '/admin' : ''

  useEffect(() => {
    async function loadBadges() {
      const drivers = await fetchAllDrivers()
      const pending = drivers.filter((d) => d.verification_status === 'pending')
      setPendingCount(pending.length)

      const bookings = await fetchAllBookings()
      const active = bookings.filter((b) => ['accepted', 'en_route', 'loading', 'in_transit', 'at_dropoff'].includes(b.status))
      setActiveRidesCount(active.length)
    }
    loadBadges()
    const timer = setInterval(loadBadges, 8000)
    return () => clearInterval(timer)
  }, [])

  const navItems = [
    { label: 'Executive Overview', path: `${basePath}/`, icon: LayoutDashboard },
    {
      label: 'Driver Approvals',
      path: `${basePath}/approvals`,
      icon: ShieldCheck,
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    { label: 'Fleet & Drivers', path: `${basePath}/drivers`, icon: Truck },
    { label: 'Customers & Users', path: `${basePath}/users`, icon: Users },
    {
      label: 'Rides & Bookings',
      path: `${basePath}/rides`,
      icon: Package,
      badge: activeRidesCount > 0 ? activeRidesCount : null,
      badgeColor: 'bg-brand-500 text-white',
    },
    {
      label: 'Live Tracking Radar',
      path: `${basePath}/live-map`,
      icon: Navigation,
      pulse: activeRidesCount > 0,
    },
    { label: 'Pricing & Controls', path: `${basePath}/settings`, icon: Settings },
  ]

  return (
    <div className="flex min-h-screen bg-[#090d16] text-slate-100">
      {/* Sidebar */}
      <aside className="sticky top-0 h-screen w-64 flex flex-col border-r border-slate-800/80 bg-slate-950/80 backdrop-blur-xl shrink-0 z-40">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
          <Link to={`${basePath}/`} className="flex items-center gap-3 group">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-lg shadow-brand-600/30">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white group-hover:text-brand-400 transition">SmartShift</span>
                <span className="rounded-md bg-brand-500/20 px-1.5 py-0.5 text-[10px] font-extrabold text-brand-400 border border-brand-500/30">
                  ADMIN
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Operations Center</p>
            </div>
          </Link>
        </div>

        {/* Live Status Pill */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-800/80 px-3 py-2 text-xs">
            <span className="flex items-center gap-2 font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Dispatch Active
            </span>
            <span className="text-[11px] font-mono text-slate-400">{activeRidesCount} in transit</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto pt-2">
          {navItems.map((item) => {
            const active = location.pathname === item.path || (item.path.endsWith('/') && location.pathname === basePath)
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`relative flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition group ${
                  active
                    ? 'bg-gradient-to-r from-brand-600/90 to-brand-700/80 text-white shadow-md shadow-brand-600/25 border border-brand-500/40'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.pulse && (
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  )}
                  {item.badge !== null && item.badge !== undefined && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-sm ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* User / App Switcher */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/40">
          <a
            href="http://localhost:5173"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5 text-brand-400" />
              Open Customer/Driver App
            </span>
            <ChevronRight className="h-3 w-3 text-slate-500" />
          </a>

          <div className="mt-3 flex items-center gap-3 pt-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 font-bold text-white text-xs ring-1 ring-white/10">
              AD
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Super Administrator</p>
              <p className="text-[10px] text-slate-400 truncate">admin@smartshift.pk</p>
            </div>
            <button
              onClick={() => alert('Logged in as Master Administrator')}
              className="text-slate-500 hover:text-slate-300 p-1"
              title="Admin Info"
            >
              <ShieldCheck className="h-4 w-4 text-brand-400" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl flex items-center justify-between px-6 z-30">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search drivers, rides, license plate, customer..."
                className="w-full rounded-xl bg-slate-900/90 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-3 py-1.5 text-xs text-slate-300">
              <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span className="font-semibold">Lahore Metro Radar</span>
            </div>

            <Link
              to={`${basePath}/approvals`}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                pendingCount > 0
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{pendingCount} Verifications Pending</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
