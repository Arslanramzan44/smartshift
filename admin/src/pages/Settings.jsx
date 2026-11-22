import { useState } from 'react'
import {
  Settings,
  DollarSign,
  ShieldCheck,
  Radio,
  Save,
  CheckCircle2,
  AlertTriangle,
  Megaphone,
  Truck,
  Wrench,
} from 'lucide-react'
import { getSystemSettings, saveSystemSettings } from '../lib/adminData'

export function SettingsPage() {
  const [settings, setSettings] = useState(getSystemSettings)
  const [saved, setSaved] = useState(false)

  const handleChange = (key, val) => {
    setSettings((prev) => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  const handleSave = (e) => {
    e.preventDefault()
    saveSystemSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Settings className="h-7 w-7 text-brand-400" />
            Pricing & Operations Controls
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Global system fare formulas, driver verification rules, and dispatch constraints
          </p>
        </div>

        {saved && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 px-3.5 py-1.5 text-xs font-bold text-emerald-400">
            <CheckCircle2 className="h-4 w-4" /> Changes Applied
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Compliance & Driver Verification Rule */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-white">Driver Verification Enforcement</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Block drivers from accepting customer requests until driving license, CNIC, and police certification are verified by admin.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireDriverVerification}
                onChange={(e) => handleChange('requireDriverVerification', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          <div className="flex items-start justify-between border-t border-slate-800 pt-4">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-white">Warehouse Partner Verification Enforcement</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Require admin approval of trade license, property deed, fire safety clearance, and owner CNIC before a warehouse appears to customers.
                </p>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireWarehouseVerification ?? true}
                onChange={(e) => handleChange('requireWarehouseVerification', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>
        </div>

        {/* Fare Rules */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-emerald-400" />
            Fare Structure & Rates (PKR)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400">Suzuki Ravi / Mini Pickup Base</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Rs.</span>
                <input
                  type="number"
                  value={settings.baseFarePickup}
                  onChange={(e) => handleChange('baseFarePickup', Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Standard Cargo Van Base</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Rs.</span>
                <input
                  type="number"
                  value={settings.baseFareVan}
                  onChange={(e) => handleChange('baseFareVan', Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Mazda Titan / 3 Ton Base</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Rs.</span>
                <input
                  type="number"
                  value={settings.baseFareTruck}
                  onChange={(e) => handleChange('baseFareTruck', Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Distance Rate Per Kilometer</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Rs.</span>
                <input
                  type="number"
                  value={settings.perKmRate}
                  onChange={(e) => handleChange('perKmRate', Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-400">Helper / Labor Charge Per Mover</label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">Rs.</span>
                <input
                  type="number"
                  value={settings.laborRatePerMover}
                  onChange={(e) => handleChange('laborRatePerMover', Number(e.target.value))}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 pl-10 pr-3 py-2 text-xs text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Global Broadcast Announcement */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl space-y-4">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-brand-400" />
            System Broadcast Announcement
          </h3>
          <p className="text-xs text-slate-400">
            Send an alert notification banner to all drivers and customers currently active on the mobile app.
          </p>
          <input
            type="text"
            value={settings.broadcastMessage}
            onChange={(e) => handleChange('broadcastMessage', e.target.value)}
            placeholder="e.g. Heavy rain alert in Lahore. Expect slight delays in transit."
            className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 px-6 py-2.5 text-xs font-extrabold text-white shadow-lg shadow-brand-600/30 transition"
          >
            <Save className="h-4 w-4" /> Save System Configuration
          </button>
        </div>
      </form>
    </div>
  )
}
