import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  ClipboardList,
  Truck,
  CheckCircle2,
  XCircle,
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  Star,
  Gift,
  Settings,
  CreditCard,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Banknote,
  BadgeCheck,
} from 'lucide-react'
import { Button, Card, Badge, Stagger, Item, MapView, money } from '../components/ui'
import { TopBar, BottomNav, NotifBell } from '../components/nav'
import { customerStats, recentMoves, ratingTags, tipOptions, customerNotifications } from '../lib/data'
import { clearRole } from '../lib/auth'

const statIcons = { clipboard: ClipboardList, truck: Truck, check: CheckCircle2, x: XCircle }

/* ===================== Customer Dashboard ===================== */
export function CustomerDashboard() {
  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between px-5 pb-2 pt-10">
        <div>
          <p className="text-xs text-slate-400">Welcome back</p>
          <h1 className="text-xl font-extrabold text-ink">Good morning, Amna 👋</h1>
        </div>
        <NotifBell count={2} to="/customer/alerts" />
      </div>

      <Stagger className="flex-1 space-y-5 px-5 pb-6">
        {/* hero */}
        <Item>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-[var(--shadow-float)]">
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
            <div className="relative max-w-[62%]">
              <h2 className="text-lg font-extrabold">Ready to Move?</h2>
              <p className="mt-1 text-xs text-brand-100">Book your next seamless shift today.</p>
              <Link to="/customer/book">
                <Button variant="ghost" className="mt-4 w-auto px-5 text-brand-700">
                  Book Now <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <Truck className="animate-float absolute bottom-3 right-3 h-20 w-20 text-white/90" strokeWidth={1.2} />
          </div>
        </Item>

        {/* stats grid */}
        <Item className="grid grid-cols-2 gap-3">
          {customerStats.map((s) => {
            const Icon = statIcons[s.icon]
            return (
              <Card key={s.label} className="flex items-center justify-between p-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{s.label}</p>
                  <p className="mt-1 text-2xl font-extrabold text-ink">{s.value}</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </span>
              </Card>
            )
          })}
        </Item>

        {/* recent moves */}
        <Item className="flex items-center justify-between">
          <h3 className="text-base font-bold text-ink">Recent Moves</h3>
          <Link to="/customer/moves" className="text-sm font-bold text-brand-600">
            View All
          </Link>
        </Item>

        {recentMoves.map((m) => (
          <Item key={m.id}>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">Move ID: #{m.id}</p>
                  <p className="text-xs text-slate-400">{m.when}</p>
                </div>
                <Badge tone={m.tone}>{m.status}</Badge>
              </div>
              <div className="my-3 space-y-2">
                <Route pickup={m.pickup} drop={m.drop} />
              </div>
              {m.tone === 'progress' ? (
                <Link to="/customer/track">
                  <Button>
                    <Navigation className="h-4 w-4" /> Track Move
                  </Button>
                </Link>
              ) : (
                <Button variant="ghost">View Details</Button>
              )}
            </Card>
          </Item>
        ))}
      </Stagger>
      <BottomNav role="customer" />
    </div>
  )
}

function Route({ pickup, drop }) {
  return (
    <div className="relative pl-5">
      <span className="absolute left-1 top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500" />
      <span className="absolute left-[7px] top-3.5 h-6 w-px bg-slate-200" />
      <span className="absolute bottom-1 left-1 h-2.5 w-2.5 rounded-full bg-rose-500" />
      <p className="text-[11px] font-semibold text-slate-400">Pickup</p>
      <p className="mb-2 text-sm text-ink">{pickup}</p>
      <p className="text-[11px] font-semibold text-slate-400">Drop-off</p>
      <p className="text-sm text-ink">{drop}</p>
    </div>
  )
}

/* ===================== Live Tracking ===================== */
export function CustomerTrack() {
  const steps = [
    { label: 'Item Picked Up', sub: '11:30 AM', state: 'done' },
    { label: 'In Transit', sub: 'Current Location', state: 'active' },
    { label: 'Arriving Soon', sub: 'Estimated 12:45 PM', state: 'pending' },
  ]
  return (
    <div className="flex min-h-screen flex-col bg-slate-900">
      <div className="absolute inset-x-0 top-0 z-40">
        <TopBar title="Track My Move" back kebab dark />
      </div>
      <div className="relative flex-1">
        <MapView dark className="h-[360px] w-full" />
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2">
          <span className="pulse-ring absolute inset-0 rounded-full bg-brand-400" />
          <span className="relative grid h-5 w-5 place-items-center rounded-full bg-brand-600 ring-4 ring-white" />
        </div>
      </div>
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative -mt-6 rounded-t-3xl bg-white px-5 pb-8 pt-3"
      >
        <div className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-slate-200" />
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-extrabold text-ink">12:45 PM</p>
            <p className="text-sm text-brand-600">15 mins away</p>
          </div>
          <Badge tone="brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> Live
          </Badge>
        </div>

        <Card className="my-4 flex items-center gap-3 p-3 ring-1 ring-slate-100">
          <img src="https://i.pravatar.cc/80?img=12" className="h-11 w-11 rounded-full object-cover" alt="" />
          <div className="flex-1">
            <p className="text-sm font-bold text-ink">Ahmed Khan</p>
            <p className="flex items-center gap-1 text-xs text-slate-500">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> 4.9 · Mini Truck (LED-1234)
            </p>
          </div>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-slate-100 text-slate-600">
            <MessageSquare className="h-4 w-4" />
          </button>
          <button className="grid h-9 w-9 place-items-center rounded-full bg-brand-600 text-white">
            <Phone className="h-4 w-4" />
          </button>
        </Card>

        <h3 className="mb-3 text-sm font-bold text-ink">Tracking Details</h3>
        <Timeline steps={steps} />
      </motion.div>
    </div>
  )
}

function Timeline({ steps }) {
  return (
    <div className="space-y-0">
      {steps.map((s, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              className={`grid h-5 w-5 place-items-center rounded-full border-2 ${
                s.state === 'done'
                  ? 'border-brand-600 bg-brand-600'
                  : s.state === 'active'
                  ? 'border-brand-600 bg-white'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {s.state === 'done' && <CheckCircle2 className="h-3 w-3 text-white" />}
              {s.state === 'active' && <span className="h-2 w-2 rounded-full bg-brand-600" />}
            </span>
            {i < steps.length - 1 && <span className="my-1 w-px flex-1 bg-slate-200" />}
          </div>
          <div className={`pb-5 ${s.state === 'pending' ? 'opacity-50' : ''}`}>
            <p className={`text-sm font-bold ${s.state === 'active' ? 'text-brand-600' : 'text-ink'}`}>{s.label}</p>
            <p className="text-xs text-slate-400">{s.sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ===================== Rating & Review ===================== */
export function CustomerRating() {
  const [stars, setStars] = useState(0)
  const [tags, setTags] = useState([])
  const [tip, setTip] = useState(null)
  const nav = useNavigate()
  const toggle = (t) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]))
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="SmartShift" back kebab brand />
      <Stagger className="flex-1 space-y-4 px-5 pb-8">
        <Item className="text-center">
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100"
          >
            <CheckCircle2 className="h-9 w-9 text-emerald-500" />
          </motion.span>
          <h1 className="mt-3 text-2xl font-extrabold text-ink">Move Completed!</h1>
          <p className="mt-1 text-sm text-slate-500">Your items have reached their destination.</p>
        </Item>

        <Item>
          <Card className="flex items-center gap-3 p-4">
            <img src="https://i.pravatar.cc/80?img=12" className="h-11 w-11 rounded-full object-cover" alt="" />
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">Ahmed Khan</p>
              <p className="flex items-center gap-1 text-xs text-slate-500">
                <Truck className="h-3 w-3" /> Mini Truck
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400">Job #</p>
              <p className="text-sm font-bold text-ink">8492-AX</p>
            </div>
          </Card>
        </Item>

        <Item>
          <Card className="p-5 text-center">
            <h3 className="text-lg font-bold text-ink">Rate Your Experience</h3>
            <div className="mt-3 flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <motion.button key={n} whileTap={{ scale: 1.3 }} onClick={() => setStars(n)}>
                  <Star
                    className={`h-9 w-9 transition ${
                      n <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                    }`}
                  />
                </motion.button>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {ratingTags.map((t) => (
                <button
                  key={t}
                  onClick={() => toggle(t)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    tags.includes(t)
                      ? 'border-brand-600 bg-brand-50 text-brand-700'
                      : 'border-slate-200 text-slate-500'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Card>
        </Item>

        <Item>
          <p className="mb-1.5 text-xs font-semibold text-slate-500">Write a review (optional)</p>
          <textarea
            rows={3}
            placeholder="Tell us about your experience..."
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
          />
        </Item>

        <Item>
          <div className="mb-2 flex items-center gap-2">
            <Gift className="h-4 w-4 text-brand-600" />
            <p className="text-sm font-bold text-ink">Add a tip for Ahmed?</p>
          </div>
          <div className="flex gap-2">
            {tipOptions.map((t) => (
              <button
                key={t}
                onClick={() => setTip(t)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-bold transition ${
                  tip === t ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-600'
                }`}
              >
                {money(t).replace('PKR ', 'PKR ')}
              </button>
            ))}
            <button className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600">
              Custom
            </button>
          </div>
        </Item>

        <Item>
          <Button onClick={() => nav('/customer')}>Submit Review</Button>
        </Item>
      </Stagger>
    </div>
  )
}

/* ===================== Moves list ===================== */
export function CustomerMoves() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="My Moves" />
      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        {recentMoves.concat(recentMoves.map((m) => ({ ...m, id: m.id + '-2', status: 'Completed', tone: 'green' }))).map((m) => (
          <Item key={m.id}>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-ink">Move ID: #{m.id}</p>
                  <p className="text-xs text-slate-400">{m.when}</p>
                </div>
                <Badge tone={m.tone}>{m.status}</Badge>
              </div>
              <div className="my-3">
                <Route pickup={m.pickup} drop={m.drop} />
              </div>
              <Button variant="ghost">View Details</Button>
            </Card>
          </Item>
        ))}
      </Stagger>
      <BottomNav role="customer" />
    </div>
  )
}

/* ===================== Alerts (customer) ===================== */
const notifIcons = { truck: Truck, cash: Banknote, verified: BadgeCheck, star: Star }
const notifTone = {
  brand: 'bg-brand-50 text-brand-600',
  green: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
}

export function CustomerAlerts() {
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="SmartShift" back brand />
      <Stagger className="flex-1 space-y-5 px-5 pb-6">
        <Item>
          <h1 className="text-xl font-extrabold text-ink">Notifications</h1>
        </Item>
        {customerNotifications.map((grp) => (
          <Item key={grp.group} className="space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{grp.group}</p>
            {grp.items.map((n, i) => {
              const Icon = notifIcons[n.icon]
              return (
                <Card key={i} className="p-4">
                  <div className="flex gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${notifTone[n.tone]}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-bold ${n.accent ? 'text-brand-600' : 'text-ink'}`}>{n.title}</p>
                        {n.accent && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">{n.text}</p>
                      {n.cta && (
                        <Link to="/customer/track">
                          <Button className="mt-3">{n.cta}</Button>
                        </Link>
                      )}
                      {n.when && <p className="mt-1 text-[11px] text-slate-400">{n.when}</p>}
                    </div>
                  </div>
                </Card>
              )
            })}
          </Item>
        ))}
      </Stagger>
      <BottomNav role="customer" />
    </div>
  )
}

/* ===================== Profile (customer) ===================== */
export function CustomerProfile() {
  const nav = useNavigate()
  const rows = [
    { icon: CreditCard, label: 'Payment Methods' },
    { icon: MapPin, label: 'Saved Addresses' },
    { icon: ShieldCheck, label: 'Privacy & Security' },
    { icon: Settings, label: 'Settings' },
  ]
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="SmartShift" brand kebab />
      <Stagger className="flex-1 space-y-4 px-5 pb-6">
        <Item className="flex flex-col items-center pt-2">
          <img src="https://i.pravatar.cc/120?img=47" className="h-20 w-20 rounded-full object-cover ring-4 ring-white shadow" alt="" />
          <h2 className="mt-3 text-xl font-extrabold text-ink">Amna Sheikh</h2>
          <Badge tone="brand" className="mt-1">
            <Star className="h-3 w-3" /> Premium Member
          </Badge>
        </Item>
        <Item>
          <Card className="grid grid-cols-3 divide-x divide-slate-100 p-4 text-center">
            {[
              ['12', 'Moves'],
              ['4.9', 'Rating'],
              ['2 yr', 'Member'],
            ].map(([v, l]) => (
              <div key={l}>
                <p className="text-lg font-extrabold text-ink">{v}</p>
                <p className="text-[11px] text-slate-400">{l}</p>
              </div>
            ))}
          </Card>
        </Item>
        <Item>
          <Card className="divide-y divide-slate-100">
            {rows.map((r) => (
              <button
                key={r.label}
                onClick={() => r.label === 'Settings' && nav('/settings')}
                className="flex w-full items-center gap-3 p-4 text-left"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <r.icon className="h-4 w-4" />
                </span>
                <span className="flex-1 text-sm font-semibold text-ink">{r.label}</span>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            ))}
            <button onClick={() => { clearRole(); nav('/') }} className="flex w-full items-center gap-3 p-4 text-left text-rose-500">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-rose-50">
                <LogOut className="h-4 w-4" />
              </span>
              <span className="flex-1 text-sm font-bold">Logout</span>
            </button>
          </Card>
        </Item>
      </Stagger>
      <BottomNav role="customer" />
    </div>
  )
}
