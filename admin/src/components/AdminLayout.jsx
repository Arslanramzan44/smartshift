import { useState, useEffect, useMemo } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  ShieldCheck,
  Truck,
  Users,
  Package,
  Navigation,
  Settings,
  Search,
  ExternalLink,
  ChevronRight,
  Radio,
  AlertTriangle,
  Database,
  X,
  Warehouse,
} from 'lucide-react'
import {
  fetchAllDrivers,
  fetchAllBookings,
  fetchAllWarehouses,
  fetchAllUsers,
  fetchAllStorageBookings,
  subscribeToRealtimeUpdates,
} from '../lib/adminData'
import { checkDatabaseSchema } from '../lib/supabase'

export function AdminLayout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [counts, setCounts] = useState({
    pendingDrivers: 0,
    pendingWarehouses: 0,
    activeRides: 0,
    activeStorage: 0,
    warehousesTotal: 0,
  })
  const [dbStatus, setDbStatus] = useState({ isConnected: true, hasVerificationColumn: true, hasWarehousesTable: true })
  const [dismissBanner, setDismissBanner] = useState(false)

  // Working Global Search state
  const [globalQuery, setGlobalQuery] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [searchIndex, setSearchIndex] = useState({ users: [], bookings: [], warehouses: [], storage: [] })

  const basePath = location.pathname.startsWith('/admin') ? '/admin' : ''

  async function loadSummary() {
    try {
      const [drivers, bookings, warehouses, users, storage] = await Promise.all([
        fetchAllDrivers().catch(() => []),
        fetchAllBookings().catch(() => []),
        fetchAllWarehouses().catch(() => []),
        fetchAllUsers().catch(() => []),
        fetchAllStorageBookings().catch(() => []),
      ])

      const pendingDrivers = drivers.filter((d) => d.verification_status === 'pending').length
      const pendingWarehouses = warehouses.filter((w) => w.verification_status === 'pending').length
      const activeRides = bookings.filter((b) =>
        ['accepted', 'en_route', 'loading', 'in_transit', 'at_dropoff'].includes(b.status)
      ).length
      const activeStorage = storage.filter((s) =>
        ['reserved', 'confirmed', 'checked_in', 'in_storage', 'release_requested'].includes(s.tracking_stage || s.status)
      ).length

      setCounts({
        pendingDrivers,
        pendingWarehouses,
        activeRides,
        activeStorage,
        warehousesTotal: warehouses.length,
      })
      setSearchIndex({ users, bookings, warehouses, storage })
    } catch (err) {
      console.warn('Error loading admin layout summary:', err)
    }
  }

  useEffect(() => {
    loadSummary()
    checkDatabaseSchema().then(setDbStatus)

    const unsubscribe = subscribeToRealtimeUpdates({
      onProfilesChange: () => loadSummary(),
      onBookingsChange: () => loadSummary(),
      onWarehousesChange: () => loadSummary(),
      onStorageChange: () => loadSummary(),
    })

    const timer = setInterval(loadSummary, 20000)
    return () => {
      clearInterval(timer)
      unsubscribe()
    }
  }, [])

  const searchResults = useMemo(() => {
    const q = globalQuery.trim().toLowerCase()
    if (!q) return []
    const hits = []
    searchIndex.warehouses
      .filter((w) => w.name?.toLowerCase().includes(q) || w.city?.toLowerCase().includes(q) || w.address?.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((w) =>
        hits.push({
          type: 'Warehouse',
          title: w.name,
          sub: `${w.city} · ${w.verification_status}`,
          to: `${basePath}/warehouses`,
        })
      )
    searchIndex.users
      .filter((u) => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.phone?.includes(q) || u.vehicle_plate?.toLowerCase().includes(q))
      .slice(0, 4)
      .forEach((u) =>
        hits.push({
          type: u.role === 'mover' ? 'Driver' : u.role === 'warehouse' ? 'Partner' : 'Customer',
          title: u.full_name || u.email,
          sub: `${u.email || ''} ${u.phone ? '· ' + u.phone : ''}`,
          to: u.role === 'mover' ? `${basePath}/drivers` : `${basePath}/users`,
        })
      )
    searchIndex.bookings
      .filter((b) => String(b.id).includes(q) || b.customer_name?.toLowerCase().includes(q) || b.pickup_address?.toLowerCase().includes(q) || b.dropoff_address?.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((b) =>
        hits.push({
          type: 'Move',
          title: `#${String(b.id).slice(0, 8)} · ${b.customer_name}`,
          sub: `${b.pickup_address} → ${b.dropoff_address}`,
          to: `${basePath}/rides`,
        })
      )
    searchIndex.storage
      .filter((s) => String(s.id).includes(q) || s.customer_name?.toLowerCase().includes(q) || s.warehouse_name?.toLowerCase().includes(q) || s.unit_code?.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((s) =>
        hits.push({
          type: 'Storage',
          title: `#${String(s.id).slice(0, 8)} · ${s.customer_name}`,
          sub: `${s.warehouse_name} · ${s.unit_size}`,
          to: `${basePath}/rides`,
        })
      )
    return hits
  }, [globalQuery, searchIndex, basePath])

  const totalPendingApprovals = counts.pendingDrivers + counts.pendingWarehouses

  const navItems = [
    { label: 'Executive Overview', path: `${basePath}/`, icon: LayoutDashboard },
    {
      label: 'Approvals Desk',
      path: `${basePath}/approvals`,
      icon: ShieldCheck,
      badge: totalPendingApprovals > 0 ? totalPendingApprovals : null,
      badgeColor: 'bg-amber-500 text-slate-950',
    },
    { label: 'Fleet & Drivers', path: `${basePath}/drivers`, icon: Truck },
    {
      label: 'Warehouses',
      path: `${basePath}/warehouses`,
      icon: Warehouse,
      badge: counts.warehousesTotal > 0 ? counts.warehousesTotal : null,
      badgeColor: 'bg-purple-500/80 text-white',
    },
    { label: 'Customers & Users', path: `${basePath}/users`, icon: Users },
    {
      label: 'Moves & Storage',
      path: `${basePath}/rides`,
      icon: Package,
      badge: counts.activeRides + counts.activeStorage > 0 ? counts.activeRides + counts.activeStorage : null,
      badgeColor: 'bg-brand-500 text-white',
    },
    {
      label: 'Live Tracking Radar',
      path: `${basePath}/live-map`,
      icon: Navigation,
      pulse: counts.activeRides > 0 || counts.activeStorage > 0,
    },
    { label: 'Pricing & Controls', path: `${basePath}/settings`, icon: Settings },
  ]

  return (
    <div className="flex min-h-screen bg-[#090d16] text-slate-100">
      {/* Sidebar */}
      <aside className="sticky top-0 h-screen w-64 flex flex-col border-r border-slate-800/80 bg-slate-950/80 backdrop-blur-xl shrink-0 z-40">
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

        {/* Live DB Telemetry Card */}
        <div className="px-4 py-3">
          <div className="rounded-xl bg-slate-900/90 border border-slate-800/80 px-3 py-2.5 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className={`flex items-center gap-2 font-semibold ${dbStatus.isConnected ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className={`h-2 w-2 rounded-full animate-pulse ${dbStatus.isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                Supabase Live DB
              </span>
              <span className={`rounded px-1.5 py-0.5 text-[9px] font-mono ${dbStatus.isConnected ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                {dbStatus.isConnected ? 'SYNCED' : 'OFFLINE'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Live Moves:</span>
              <span className="font-mono text-slate-200">{counts.activeRides} active</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Warehouse Units:</span>
              <span className="font-mono text-purple-300">{counts.activeStorage} tracked</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 space-y-1.5 overflow-y-auto pt-2">
          {navItems.map((item) => {
            const active =
              location.pathname === item.path ||
              (item.path === `${basePath}/` && (location.pathname === basePath || location.pathname === `${basePath}/`))
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
                  {item.pulse && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />}
                  {item.badge !== null && item.badge !== undefined && (
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-sm ${item.badgeColor}`}>
                      {item.badge}
                    </span>
                  )}
                </div>
              </Link>
            )
          })}
        </nav>

        {/* App Switcher & Admin Footer */}
        <div className="p-4 border-t border-slate-800/60 bg-slate-950/40">
          {basePath === '/admin' ? (
            <Link
              to="/"
              className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-brand-400" />
                Back to SmartShift App
              </span>
              <ChevronRight className="h-3 w-3 text-slate-500" />
            </Link>
          ) : (
            <a
              href="http://localhost:5173"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-slate-800 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 transition"
            >
              <span className="flex items-center gap-2">
                <ExternalLink className="h-3.5 w-3.5 text-brand-400" />
                Open Mobile App
              </span>
              <ChevronRight className="h-3 w-3 text-slate-500" />
            </a>
          )}

          <div className="mt-3 flex items-center gap-3 pt-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 font-bold text-white text-xs ring-1 ring-white/10">
              AD
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-white truncate">Super Administrator</p>
              <p className="text-[10px] text-slate-400 truncate">admin@smartshift.pk</p>
            </div>
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" title="Admin Session Verified" />
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {!dismissBanner && (!dbStatus.hasVerificationColumn || !dbStatus.hasWarehousesTable) && (
          <div className="border-b border-amber-500/30 bg-amber-950/40 px-6 py-2.5 text-xs text-amber-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Database className="h-4 w-4 text-amber-400 shrink-0" />
              <span>{dbStatus.message}</span>
            </div>
            <button onClick={() => setDismissBanner(true)} className="text-slate-400 hover:text-white p-1">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Top Header */}
        <header className="sticky top-0 h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl flex items-center justify-between px-6 z-30 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={globalQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 180)}
              onChange={(e) => setGlobalQuery(e.target.value)}
              placeholder="Search drivers, warehouses, customers, bookings..."
              className="w-full rounded-xl bg-slate-900/90 border border-slate-800 pl-10 pr-8 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition"
            />
            {globalQuery && (
              <button
                onClick={() => setGlobalQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {searchFocused && globalQuery.trim() && (
              <div className="absolute left-0 right-0 top-11 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden z-50">
                {searchResults.length === 0 ? (
                  <p className="p-4 text-xs text-slate-400 text-center">No matching records found.</p>
                ) : (
                  <div className="divide-y divide-slate-800 max-h-80 overflow-y-auto">
                    {searchResults.map((hit, idx) => (
                      <button
                        key={idx}
                        onMouseDown={() => {
                          navigate(hit.to)
                          setGlobalQuery('')
                        }}
                        className="w-full px-4 py-2.5 text-left hover:bg-slate-800 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{hit.title}</p>
                          <p className="text-[10px] text-slate-400 truncate">{hit.sub}</p>
                        </div>
                        <span className="shrink-0 rounded-md bg-brand-500/20 px-2 py-0.5 text-[10px] font-bold text-brand-300">
                          {hit.type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={`${basePath}/live-map`}
              className="hidden sm:flex items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 px-3 py-1.5 text-xs text-slate-300 transition"
            >
              <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              <span className="font-semibold">Live Radar</span>
            </Link>

            <Link
              to={`${basePath}/approvals`}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-bold transition border ${
                totalPendingApprovals > 0
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>
                {totalPendingApprovals} Pending ({counts.pendingDrivers}D · {counts.pendingWarehouses}W)
              </span>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
