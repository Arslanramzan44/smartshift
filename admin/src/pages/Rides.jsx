import { useState, useEffect } from 'react'
import {
  Package,
  Search,
  MapPin,
  Flag,
  Truck,
  User,
  Phone,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
} from 'lucide-react'
import { RideModal } from '../components/RideModal'
import { fetchAllBookings, fetchAllDrivers } from '../lib/adminData'

export function RidesPage() {
  const [bookings, setBookings] = useState([])
  const [drivers, setDrivers] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedRide, setSelectedRide] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchAllBookings(), fetchAllDrivers()]).then(([b, d]) => {
      setBookings(b)
      setDrivers(d)
      setLoading(false)
    })
  }, [])

  const filtered = bookings.filter((b) => {
    const matchesStatus = statusFilter === 'all' || b.status === statusFilter
    const query = search.toLowerCase()
    const matchesQuery =
      b.customer_name?.toLowerCase().includes(query) ||
      b.mover_name?.toLowerCase().includes(query) ||
      b.pickup_address?.toLowerCase().includes(query) ||
      b.dropoff_address?.toLowerCase().includes(query) ||
      String(b.id).includes(query)
    return matchesStatus && matchesQuery
  })

  const statusTones = {
    delivered: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    pending: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    in_transit: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
    accepted: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    en_route: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    loading: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    at_dropoff: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Package className="h-7 w-7 text-brand-400" />
            Rides & Bookings Dispatch
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete booking ledger, route monitoring, and administrative status override
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search booking, address, driver..."
            className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: 'all', label: 'All Moves' },
          { id: 'pending', label: 'Pending' },
          { id: 'in_transit', label: 'In Transit' },
          { id: 'delivered', label: 'Delivered' },
          { id: 'cancelled', label: 'Cancelled' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold capitalize transition border ${
              statusFilter === tab.id
                ? 'bg-brand-600 text-white border-brand-500 shadow-md'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bookings Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">Move ID</th>
                <th className="p-4">Customer</th>
                <th className="p-4">Route (Pickup → Drop-off)</th>
                <th className="p-4">Driver</th>
                <th className="p-4">Fare & Payment</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map((ride) => (
                <tr key={ride.id} className="hover:bg-slate-900/40 transition">
                  <td className="p-4 font-mono font-bold text-brand-400">
                    #{String(ride.id).slice(0, 8)}
                  </td>

                  <td className="p-4">
                    <p className="font-extrabold text-white">{ride.customer_name || 'Customer'}</p>
                    <p className="text-[11px] text-slate-400">{ride.customer_phone || '—'}</p>
                  </td>

                  <td className="p-4 max-w-xs">
                    <div className="space-y-1">
                      <p className="flex items-center gap-1.5 text-slate-300 truncate">
                        <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                        <span className="truncate">{ride.pickup_address}</span>
                      </p>
                      <p className="flex items-center gap-1.5 text-slate-400 truncate">
                        <Flag className="h-3 w-3 text-rose-400 shrink-0" />
                        <span className="truncate">{ride.dropoff_address}</span>
                      </p>
                    </div>
                  </td>

                  <td className="p-4">
                    {ride.mover_name ? (
                      <div>
                        <p className="font-bold text-white flex items-center gap-1">
                          <Truck className="h-3 w-3 text-brand-400" />
                          {ride.mover_name}
                        </p>
                        <p className="text-[10px] text-slate-400">{ride.vehicle}</p>
                      </div>
                    ) : (
                      <span className="rounded-md bg-amber-500/10 text-amber-400 px-2 py-0.5 text-[10px] font-bold border border-amber-500/20">
                        Unassigned Pool
                      </span>
                    )}
                  </td>

                  <td className="p-4">
                    <p className="font-black text-white">Rs. {Number(ride.price).toLocaleString()}</p>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">
                      {ride.payment_method || 'COD'}
                    </span>
                  </td>

                  <td className="p-4">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-extrabold capitalize border ${
                        statusTones[ride.status] || 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {ride.status}
                    </span>
                  </td>

                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedRide(ride)}
                      className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-white transition inline-flex items-center gap-1.5"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRide && (
        <RideModal
          ride={selectedRide}
          allDrivers={drivers}
          onClose={() => setSelectedRide(null)}
          onUpdated={(updated) => {
            setBookings((prev) => prev.map((b) => (b.id === updated.id ? updated : b)))
          }}
        />
      )}
    </div>
  )
}
