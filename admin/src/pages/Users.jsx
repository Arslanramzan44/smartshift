import { useState, useEffect } from 'react'
import {
  Users,
  Search,
  User,
  Truck,
  Warehouse,
  Shield,
  Eye,
  RefreshCw,
} from 'lucide-react'
import { UserModal } from '../components/UserModal'
import { fetchAllUsers, subscribeToRealtimeUpdates } from '../lib/adminData'

export function UsersPage() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadData = async () => {
    setError('')
    try {
      const res = await fetchAllUsers()
      setUsers(res)
    } catch (err) {
      setError(err.message || 'Could not load users from Supabase')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const unsubscribe = subscribeToRealtimeUpdates({
      onProfilesChange: () => loadData(),
      onBookingsChange: () => loadData(),
      onStorageChange: () => loadData(),
    })
    return () => unsubscribe()
  }, [])

  const filtered = users.filter((u) => {
    const matchesRole = roleFilter === 'all' || u.role === roleFilter
    const query = search.toLowerCase()
    const matchesQuery =
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.phone?.includes(query)
    return matchesRole && matchesQuery
  })

  const roleBadge = (role) => {
    if (role === 'mover') return { cls: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30', icon: Truck, label: 'Driver' }
    if (role === 'warehouse') return { cls: 'bg-purple-500/20 text-purple-300 border-purple-500/30', icon: Warehouse, label: 'Warehouse' }
    if (role === 'admin') return { cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: Shield, label: 'Admin' }
    return { cls: 'bg-brand-500/20 text-brand-300 border-brand-500/30', icon: User, label: 'Customer' }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Users className="h-7 w-7 text-brand-400" />
            Customers & Account Directory ({users.length})
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            All SmartShift customers, drivers, warehouse partners, and administrators
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email, phone..."
              className="w-full rounded-xl bg-slate-900 border border-slate-800 pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-500"
            />
          </div>
          <button
            onClick={loadData}
            className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Role Filter Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: 'all', label: `All Roles (${users.length})` },
          { id: 'customer', label: `Customers (${users.filter((u) => u.role === 'customer').length})` },
          { id: 'mover', label: `Drivers (${users.filter((u) => u.role === 'mover').length})` },
          { id: 'warehouse', label: `Warehouses (${users.filter((u) => u.role === 'warehouse').length})` },
          { id: 'admin', label: `Admins (${users.filter((u) => u.role === 'admin').length})` },
        ].map((r) => (
          <button
            key={r.id}
            onClick={() => setRoleFilter(r.id)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition border ${
              roleFilter === r.id
                ? 'bg-brand-600 text-white border-brand-500'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-xs text-rose-300">{error}</div>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-extrabold tracking-wider border-b border-slate-800">
              <tr>
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Contact</th>
                <th className="p-4">Activity & Volume</th>
                <th className="p-4">Account Status</th>
                <th className="p-4">Joined</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">Loading users from Supabase...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-slate-400">No users match this filter.</td>
                </tr>
              ) : (
                filtered.map((user) => {
                  const rb = roleBadge(user.role)
                  const RoleIcon = rb.icon
                  return (
                    <tr key={user.id} className="hover:bg-slate-900/40 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
                            className="h-10 w-10 rounded-xl object-cover ring-1 ring-white/10 shrink-0"
                            alt=""
                          />
                          <div>
                            <p className="font-extrabold text-white text-xs">{user.full_name || 'Unnamed User'}</p>
                            <p className="text-[10px] text-slate-400">ID: #{String(user.id).slice(0, 8)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase border ${rb.cls}`}>
                          <RoleIcon className="h-3 w-3" /> {rb.label}
                        </span>
                      </td>

                      <td className="p-4">
                        <p className="text-white font-medium">{user.phone || '—'}</p>
                        <p className="text-[11px] text-slate-400 truncate max-w-[180px]">{user.email || '—'}</p>
                      </td>

                      <td className="p-4">
                        <p className="font-bold text-white">
                          {user.total_moves} moves · {user.storage_bookings_count} storage
                        </p>
                        <p className="text-[11px] text-emerald-400 font-semibold">
                          Rs. {Number(user.total_spent || 0).toLocaleString()}
                        </p>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold ${
                            user.is_banned
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          {user.is_banned ? 'Banned' : 'Active'}
                        </span>
                      </td>

                      <td className="p-4 text-slate-400">
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      </td>

                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-white transition inline-flex items-center gap-1.5"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <UserModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdated={(updated) => setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))}
        />
      )}
    </div>
  )
}
