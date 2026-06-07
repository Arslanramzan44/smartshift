import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, ArrowLeft, Eye, EyeOff, Mail, Lock, Home, Truck, Package, Check } from 'lucide-react'
import { Button, Field, Logo, Card, Stagger, Item } from '../components/ui'
import { TopBar } from '../components/nav'

/* ===================== Onboarding ===================== */
const slides = [
  {
    title: 'Book Your Move',
    text: 'Schedule house or office shifting in minutes.',
    art: 'move',
  },
  {
    title: 'Track in Real Time',
    text: 'Follow your mover live and scan every item with QR codes.',
    art: 'track',
  },
  {
    title: 'Pay Securely',
    text: 'Transparent pricing with SSL-encrypted checkout.',
    art: 'pay',
  },
]

function OnboardArt({ kind }) {
  return (
    <motion.div
      key={kind}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      className="relative mx-auto grid h-64 w-64 place-items-center"
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-brand-100 to-brand-50" />
      <div className="absolute inset-6 rounded-full border-2 border-dashed border-brand-200" />
      <motion.div className="animate-float relative grid h-32 w-32 place-items-center rounded-3xl bg-white shadow-xl shadow-brand-600/10">
        {kind === 'move' && <Package className="h-16 w-16 text-brand-600" strokeWidth={1.6} />}
        {kind === 'track' && <Truck className="h-16 w-16 text-brand-600" strokeWidth={1.6} />}
        {kind === 'pay' && <Check className="h-16 w-16 text-emerald-500" strokeWidth={2} />}
      </motion.div>
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-3 w-3 rounded-full bg-brand-400"
          style={{ top: `${20 + i * 30}%`, left: i % 2 ? '12%' : '82%' }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 2 + i, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </motion.div>
  )
}

export function Onboarding() {
  const [i, setI] = useState(0)
  const nav = useNavigate()
  const last = i === slides.length - 1
  const next = () => (last ? nav('/role') : setI(i + 1))
  return (
    <div className="flex min-h-screen flex-col px-5 pb-8 pt-14">
      <div className="flex justify-end">
        <button onClick={() => nav('/role')} className="text-sm font-semibold text-slate-500">
          Skip
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <OnboardArt kind={slides[i].art} />
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            className="mt-10"
          >
            <h1 className="text-3xl font-extrabold text-ink">{slides[i].title}</h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-slate-500">{slides[i].text}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {slides.map((_, k) => (
            <motion.span
              key={k}
              animate={{ width: k === i ? 28 : 8, backgroundColor: k === i ? '#2546e6' : '#cbd5e1' }}
              className="h-2 rounded-full"
            />
          ))}
        </div>
        <Button onClick={next} className="w-auto px-7">
          {last ? 'Get Started' : 'Next'} <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

/* ===================== Register ===================== */
export function Register() {
  const nav = useNavigate()
  const [show, setShow] = useState(false)
  return (
    <div className="min-h-screen">
      <TopBar title="Create Account" back />
      <Stagger className="space-y-4 px-5 pb-8">
        <Item>
          <Card className="p-5">
            <h2 className="text-center text-xl font-extrabold text-brand-700">Join SmartShift</h2>
            <p className="mb-5 mt-1 text-center text-sm text-slate-500">Streamline your moving experience today.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                nav('/role')
              }}
              className="space-y-3.5"
            >
              <Field label="Full Name" placeholder="John Doe" />
              <Field label="Email Address" type="email" placeholder="john@example.com" />
              <Field label="Phone Number" placeholder="+1 (555) 000-0000" />
              <Field
                label="Password"
                type={show ? 'text' : 'password'}
                placeholder="••••••••"
                trailing={
                  <button type="button" onClick={() => setShow(!show)}>
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />
              <Field label="Confirm Password" type="password" placeholder="••••••••" />
              <Button type="submit" className="mt-2">
                Create Account
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-brand-600">
                Login
              </Link>
            </p>
          </Card>
        </Item>
      </Stagger>
    </div>
  )
}

/* ===================== Role selection ===================== */
const roles = [
  { id: 'customer', icon: Home, title: 'Customer', sub: 'I want to move', to: '/customer' },
  { id: 'mover', icon: Truck, title: 'Mover', sub: 'I provide moving services', to: '/mover' },
]

export function RoleSelect() {
  const [sel, setSel] = useState('customer')
  const nav = useNavigate()
  const target = roles.find((r) => r.id === sel).to
  return (
    <div className="flex min-h-screen flex-col px-5 pb-8 pt-14">
      <div className="text-center">
        <h1 className="text-3xl font-extrabold text-ink">Join as</h1>
        <p className="mt-2 text-sm text-slate-500">Select your role to get started with SmartShift.</p>
      </div>
      <div className="mt-8 flex-1 space-y-4">
        {roles.map((r) => {
          const active = sel === r.id
          const Icon = r.icon
          return (
            <motion.button
              key={r.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSel(r.id)}
              className={`relative flex w-full flex-col items-center gap-2 rounded-2xl border-2 bg-white p-6 text-center transition ${
                active ? 'border-brand-600 shadow-[var(--shadow-card)]' : 'border-slate-100'
              }`}
            >
              <span
                className={`grid h-12 w-12 place-items-center rounded-2xl transition ${
                  active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-400'
                }`}
              >
                <Icon className="h-6 w-6" />
              </span>
              <span className="text-lg font-bold text-ink">{r.title}</span>
              <span className="text-xs text-slate-500">{r.sub}</span>
              {active && (
                <motion.span
                  layoutId="rolecheck"
                  className="absolute right-4 top-4 grid h-6 w-6 place-items-center rounded-full bg-brand-600 text-white"
                >
                  <Check className="h-4 w-4" />
                </motion.span>
              )}
            </motion.button>
          )
        })}
      </div>
      <Button onClick={() => nav(target)}>Continue</Button>
    </div>
  )
}

/* ===================== Login ===================== */
export function Login() {
  const nav = useNavigate()
  const [show, setShow] = useState(false)
  return (
    <div className="flex min-h-screen flex-col px-5 pb-8 pt-14">
      <Stagger className="flex flex-1 flex-col">
        <Item className="flex flex-col items-center">
          <Logo size="lg" />
          <h1 className="mt-6 text-3xl font-extrabold text-ink">Welcome Back</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to continue your moving journey</p>
        </Item>
        <Item className="mt-8 space-y-4">
          <Field label="Email Address" icon={Mail} type="email" placeholder="name@example.com" />
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Password</span>
              <button className="text-xs font-bold text-brand-600">Forgot Password?</button>
            </div>
            <Field
              icon={Lock}
              type={show ? 'text' : 'password'}
              placeholder="••••••••"
              trailing={
                <button type="button" onClick={() => setShow(!show)}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
          </div>
          <Button onClick={() => nav('/role')} className="mt-2">
            Login <ArrowRight className="h-4 w-4" />
          </Button>
        </Item>
        <Item className="mt-auto pt-8 text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-brand-600">
            Register
          </Link>
        </Item>
      </Stagger>
    </div>
  )
}
