import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  UserCog,
  KeyRound,
  Bell,
  Moon,
  Globe,
  LifeBuoy,
  FileText,
  ShieldCheck,
  LogOut,
  ChevronRight,
  HelpCircle,
  Truck,
  MapPin,
  MessageSquare,
  Settings as SettingsIcon,
} from 'lucide-react'
import { Card, Stagger, Item } from '../components/ui'
import { TopBar } from '../components/nav'

function Toggle({ on, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`relative h-7 w-12 rounded-full transition ${on ? 'bg-brand-600' : 'bg-slate-200'}`}
    >
      <motion.span
        layout
        className="absolute top-1 h-5 w-5 rounded-full bg-white shadow"
        animate={{ left: on ? 26 : 4 }}
      />
    </button>
  )
}

function Row({ icon: Icon, label, right, onClick, danger = false }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 p-4 text-left"
    >
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl ${
          danger ? 'bg-rose-50 text-rose-500' : 'bg-brand-50 text-brand-600'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className={`flex-1 text-sm font-semibold ${danger ? 'text-rose-500' : 'text-ink'}`}>{label}</span>
      {right ?? <ChevronRight className="h-4 w-4 text-slate-300" />}
    </button>
  )
}

function Section({ title, children }) {
  return (
    <Item>
      <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{title}</p>
      <Card className="divide-y divide-slate-100">{children}</Card>
    </Item>
  )
}

const settingsTabs = [
  { to: '/customer/moves', icon: Truck, label: 'Moves' },
  { to: '/customer/track', icon: MapPin, label: 'Tracking' },
  { to: '/customer/track', icon: MessageSquare, label: 'Chat' },
  { to: '/settings', icon: SettingsIcon, label: 'Settings' },
]

function SettingsNav() {
  const { pathname } = useLocation()
  return (
    <>
      <div className="h-20" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-40">
        <div className="mx-auto max-w-md border-t border-slate-100 bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur sm:max-w-lg">
          <div className="flex items-center justify-around">
            {settingsTabs.map((t, i) => {
              const active = t.label === 'Settings' ? pathname === '/settings' : false
              const Icon = t.icon
              return (
                <Link key={i} to={t.to} className="relative flex flex-1 flex-col items-center gap-1 py-1">
                  <span
                    className={`grid h-9 w-12 place-items-center rounded-xl transition ${
                      active ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30' : 'text-slate-400'
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  </span>
                  <span className={`text-[10px] font-semibold ${active ? 'text-brand-700' : 'text-slate-400'}`}>
                    {t.label}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

export function SettingsScreen() {
  const nav = useNavigate()
  const [push, setPush] = useState(true)
  const [dark, setDark] = useState(false)
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        title="Settings"
        back
        right={
          <button className="grid h-9 w-9 place-items-center rounded-full text-brand-600">
            <HelpCircle className="h-5 w-5" />
          </button>
        }
      />
      <Stagger className="flex-1 space-y-5 px-5 pb-6 pt-2">
        {/* profile card */}
        <Item>
          <Card className="flex items-center gap-3 p-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <UserCog className="h-6 w-6" />
            </span>
            <div className="flex-1">
              <p className="text-base font-extrabold text-ink">Alex Johnson</p>
              <p className="text-xs text-slate-500">alex.j@example.com</p>
            </div>
            <button className="text-sm font-bold text-brand-600">Edit</button>
          </Card>
        </Item>

        <Section title="Account">
          <Row icon={UserCog} label="Profile details" />
          <Row icon={KeyRound} label="Change Password" />
        </Section>

        <Section title="Preferences">
          <Row icon={Bell} label="Push Notifications" right={<Toggle on={push} onClick={() => setPush(!push)} />} />
          <Row icon={Moon} label="Dark Mode" right={<Toggle on={dark} onClick={() => setDark(!dark)} />} />
          <Row
            icon={Globe}
            label="Language"
            right={
              <span className="flex items-center gap-1 text-sm font-semibold text-slate-500">
                English <ChevronRight className="h-4 w-4 text-slate-300" />
              </span>
            }
          />
        </Section>

        <Section title="Support">
          <Row icon={LifeBuoy} label="Help Center" />
          <Row icon={FileText} label="Terms of Service" />
          <Row icon={ShieldCheck} label="Privacy Policy" />
        </Section>

        <Item>
          <button
            onClick={() => nav('/')}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white py-3.5 text-sm font-bold text-rose-500 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">App Version 2.4.1</p>
        </Item>
      </Stagger>
      <SettingsNav />
    </div>
  )
}
