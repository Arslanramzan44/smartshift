import { motion } from 'framer-motion'

export function StatCard({ title, value, subtext, icon: Icon, tone = 'brand', trend }) {
  const tones = {
    brand: {
      border: 'border-brand-500/20',
      bg: 'from-brand-950/40 to-slate-900/60',
      iconBg: 'bg-brand-500/15 text-brand-400',
      glow: 'shadow-brand-500/5',
    },
    emerald: {
      border: 'border-emerald-500/20',
      bg: 'from-emerald-950/30 to-slate-900/60',
      iconBg: 'bg-emerald-500/15 text-emerald-400',
      glow: 'shadow-emerald-500/5',
    },
    amber: {
      border: 'border-amber-500/20',
      bg: 'from-amber-950/30 to-slate-900/60',
      iconBg: 'bg-amber-500/15 text-amber-400',
      glow: 'shadow-amber-500/5',
    },
    purple: {
      border: 'border-purple-500/20',
      bg: 'from-purple-950/30 to-slate-900/60',
      iconBg: 'bg-purple-500/15 text-purple-400',
      glow: 'shadow-purple-500/5',
    },
  }

  const currentTone = tones[tone] || tones.brand

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className={`relative overflow-hidden rounded-2xl border ${currentTone.border} bg-gradient-to-br ${currentTone.bg} p-5 backdrop-blur-md shadow-lg ${currentTone.glow}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-white">{value}</p>
          {subtext && <p className="mt-1 text-xs text-slate-400">{subtext}</p>}
        </div>

        <span className={`grid h-11 w-11 place-items-center rounded-2xl ${currentTone.iconBg} ring-1 ring-white/10`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>

      {trend && (
        <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold">
          <span className="text-emerald-400">{trend}</span>
          <span className="text-slate-500">vs last period</span>
        </div>
      )}
    </motion.div>
  )
}
