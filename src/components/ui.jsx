import { motion } from 'framer-motion'
import { Truck } from 'lucide-react'

/* ---------- Brand logo ---------- */
export function Logo({ size = 'md', light = false }) {
  const dims = size === 'lg' ? 'h-14 w-14' : size === 'sm' ? 'h-7 w-7' : 'h-9 w-9'
  const text = size === 'lg' ? 'text-xl' : 'text-base'
  return (
    <div className="flex items-center gap-2">
      <div
        className={`grid ${dims} place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-lg shadow-brand-600/30`}
      >
        <Truck className="h-1/2 w-1/2" strokeWidth={2.4} />
      </div>
      <span className={`font-extrabold tracking-tight ${text} ${light ? 'text-white' : 'text-brand-700'}`}>
        SmartShift
      </span>
    </div>
  )
}

/* ---------- Button ---------- */
export function Button({ children, variant = 'primary', className = '', ...rest }) {
  const base =
    'inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100'
  const styles = {
    primary: 'bg-gradient-to-b from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-600/30 hover:from-brand-600 hover:to-brand-700',
    ghost: 'bg-white text-ink ring-1 ring-slate-200 hover:bg-slate-50',
    soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
    dark: 'bg-slate-900 text-white hover:bg-slate-800',
  }
  return (
    <motion.button whileTap={{ scale: 0.97 }} className={`${base} ${styles[variant]} ${className}`} {...rest}>
      {children}
    </motion.button>
  )
}

/* ---------- Field ---------- */
export function Field({ label, icon: Icon, trailing, ...rest }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-xs font-semibold text-slate-500">{label}</span>}
      <div className="relative flex items-center">
        {Icon && <Icon className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />}
        <input
          className={`w-full rounded-xl border border-slate-200 bg-white py-3 text-sm text-ink placeholder:text-slate-400 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${trailing ? 'pr-10' : 'pr-3.5'}`}
          {...rest}
        />
        {trailing && <div className="absolute right-3 text-slate-400">{trailing}</div>}
      </div>
    </label>
  )
}

/* ---------- Card ---------- */
export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`rounded-2xl bg-white shadow-[var(--shadow-card)] ${className}`} {...rest}>
      {children}
    </div>
  )
}

/* ---------- Badge ---------- */
export function Badge({ children, tone = 'brand', className = '' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    progress: 'bg-fuchsia-100 text-fuchsia-700',
    pending: 'bg-amber-100 text-amber-700',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-rose-100 text-rose-600',
    slate: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-100 text-amber-700',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}

/* ---------- Animated section wrapper ---------- */
export function Stagger({ children, className = '' }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } } }}
    >
      {children}
    </motion.div>
  )
}

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 24 } },
}

export function Item({ children, className = '' }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  )
}

/* ---------- Faux animated map ---------- */
export function MapView({ className = '', dark = false }) {
  return (
    <div className={`relative overflow-hidden ${dark ? 'bg-slate-800' : 'bg-[#e8eef7]'} ${className}`}>
      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none">
        {[...Array(8)].map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 22} x2="100%" y2={i * 22} stroke={dark ? '#334155' : '#d3def0'} strokeWidth="1" />
        ))}
        {[...Array(10)].map((_, i) => (
          <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="100%" stroke={dark ? '#334155' : '#d3def0'} strokeWidth="1" />
        ))}
      </svg>
      <svg viewBox="0 0 300 160" className="absolute inset-0 h-full w-full">
        <motion.path
          d="M40 130 C 90 120, 110 60, 160 70 S 250 50, 270 30"
          fill="none"
          stroke="#2546e6"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="8 10"
          initial={{ strokeDashoffset: 400 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
        />
        <circle cx="40" cy="130" r="6" fill="#22c55e" stroke="#fff" strokeWidth="2.5" />
        <circle cx="270" cy="30" r="6" fill="#ef4444" stroke="#fff" strokeWidth="2.5" />
        <motion.circle
          r="5"
          fill="#2546e6"
          stroke="#fff"
          strokeWidth="2.5"
          animate={{ offsetDistance: ['0%', '100%'] }}
          style={{ offsetPath: "path('M40 130 C 90 120, 110 60, 160 70 S 250 50, 270 30')" }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
    </div>
  )
}

/* ---------- Progress bar ---------- */
export function Steps({ total, current }) {
  return (
    <div className="flex gap-1.5">
      {[...Array(total)].map((_, i) => (
        <motion.div
          key={i}
          className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200"
        >
          <motion.div
            className="h-full rounded-full bg-brand-600"
            initial={{ width: 0 }}
            animate={{ width: i < current ? '100%' : '0%' }}
            transition={{ duration: 0.4 }}
          />
        </motion.div>
      ))}
    </div>
  )
}

export const money = (n) => `PKR ${n.toLocaleString()}`
