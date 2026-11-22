import { useState } from 'react'
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Truck,
  Warehouse,
  Package,
  CheckCircle,
  Ban,
} from 'lucide-react'
import { toggleUserBan } from '../lib/adminData'

export function UserModal({ user, onClose, onUpdated }) {
  const [isBanned, setIsBanned] = useState(user?.is_banned || false)
  const [busy, setBusy] = useState(false)

  if (!user) return null

  async function handleToggleBan() {
    const nextBan = !isBanned
    const action = nextBan ? 'BAN' : 'UNBAN'
    if (!confirm(`Are you sure you want to ${action} user ${user.full_name || user.email}?`)) return

    setBusy(true)
    try {
      await toggleUserBan(user.id, nextBan)
      setIsBanned(nextBan)
      if (onUpdated) onUpdated({ ...user, is_banned: nextBan })
    } catch (err) {
      alert('Error updating user ban state: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-500/20 text-brand-400 border border-brand-500/30">
              <User className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white">User Profile Dossier</h2>
              <p className="text-xs text-slate-400">Account activity and administrative controls</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-xl bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <img
              src={user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}
              className="h-16 w-16 rounded-2xl object-cover ring-2 ring-brand-500/30"
              alt=""
            />
            <div>
              <h3 className="font-extrabold text-lg text-white">{user.full_name || 'SmartShift User'}</h3>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="rounded-md bg-brand-500/20 px-2 py-0.5 text-xs font-bold text-brand-400 uppercase">
                  {user.role}
                </span>
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    isBanned
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {isBanned ? 'Account Banned' : 'Account Active'}
                </span>
              </div>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[10px] uppercase font-bold text-slate-500">Moves</p>
              <p className="text-base font-black text-white mt-0.5">{user.total_moves || 0}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[10px] uppercase font-bold text-slate-500">Storage Units</p>
              <p className="text-base font-black text-purple-300 mt-0.5">{user.storage_bookings_count || 0}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
              <p className="text-[10px] uppercase font-bold text-slate-500">Volume</p>
              <p className="text-sm font-black text-emerald-400 mt-0.5">
                Rs. {Number(user.total_spent || 0).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4 space-y-2.5 text-xs text-slate-300">
            <p className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-2"><Mail className="h-4 w-4" /> Email:</span>
              <span className="font-semibold text-white">{user.email || '—'}</span>
            </p>
            <p className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-2"><Phone className="h-4 w-4" /> Phone:</span>
              <span className="font-semibold text-white">{user.phone || '—'}</span>
            </p>
            <p className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-2"><Calendar className="h-4 w-4" /> Joined:</span>
              <span className="font-semibold text-white">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
              </span>
            </p>
            {(user.role === 'mover' || user.role === 'warehouse') && (
              <p className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-2">
                  {user.role === 'warehouse' ? <Warehouse className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                  Verification:
                </span>
                <span className="font-semibold text-amber-400 uppercase">{user.verification_status || 'Pending'}</span>
              </p>
            )}
            {user.primary_warehouse && (
              <p className="flex items-center justify-between">
                <span className="text-slate-500 flex items-center gap-2"><Package className="h-4 w-4" /> Warehouse:</span>
                <span className="font-semibold text-purple-300">{user.primary_warehouse.name}</span>
              </p>
            )}
          </div>

          {user.role !== 'admin' && (
            <button
              onClick={handleToggleBan}
              disabled={busy}
              className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-extrabold transition shadow-lg ${
                isBanned
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-rose-600 hover:bg-rose-500 text-white'
              }`}
            >
              {isBanned ? (
                <>
                  <CheckCircle className="h-4 w-4" /> Re-activate & Unban Account
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4" /> Ban User from SmartShift Platform
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
