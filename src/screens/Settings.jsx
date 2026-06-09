import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  User,
  KeyRound,
  Bell,
  Moon,
  Globe,
  LifeBuoy,
  FileText,
  LogOut,
  ChevronRight,
  ExternalLink,
  Pencil,
  BadgeCheck,
  Leaf,
} from 'lucide-react'
import { Card, Badge, Stagger, Item } from '../components/ui'
import { TopBar } from '../components/nav'
import { useAuth } from '../lib/AuthContext'

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

function Row({ icon: Icon, label, sub, right, onClick, danger = false }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 p-4 text-left">
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
          danger ? 'bg-rose-50 text-rose-500' : 'bg-brand-50 text-brand-600'
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex-1">
        <span className={`block text-sm font-semibold ${danger ? 'text-rose-500' : 'text-ink'}`}>{label}</span>
        {sub && <span className="block text-[11px] text-slate-400">{sub}</span>}
      </span>
      {right ?? <ChevronRight className="h-4 w-4 text-slate-300" />}
    </button>
  )
}

function Section({ title, children }) {
  return (
    <Item>
      <p className="mb-2 px-1 text-base font-bold text-ink">{title}</p>
      <Card className="divide-y divide-slate-100">{children}</Card>
    </Item>
  )
}

const Avatar = ({ url }) => (
  <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-slate-200 text-slate-500">
    {url ? <img src={url} className="h-full w-full object-cover" alt="" /> : <User className="h-5 w-5" />}
  </span>
)

export function SettingsScreen() {
  const nav = useNavigate()
  const { profile, signOut } = useAuth()
  const [push, setPush] = useState(true)
  const [dark, setDark] = useState(false)
  return (
    <div className="flex min-h-screen flex-col">
      <TopBar brandLeft avatar={<Avatar url={profile?.avatar_url} />} />
      <Stagger className="flex-1 space-y-5 px-5 pb-8 pt-1">
        {/* profile card */}
        <Item>
          <Card className="flex items-center gap-3 p-4">
            <img src={profile?.avatar_url || 'https://i.pravatar.cc/80?img=15'} className="h-14 w-14 rounded-full object-cover" alt="" />
            <div className="flex-1">
              <p className="text-base font-extrabold text-ink">{profile?.full_name || 'Alex Thompson'}</p>
              <p className="text-xs text-slate-500">{profile?.email || 'alex.t@smartshift.com'}</p>
              <div className="mt-1.5 flex gap-1.5">
                <Badge tone="green">Verified Pro</Badge>
                <Badge tone="brand">Premium Plan</Badge>
              </div>
            </div>
            <button onClick={() => nav('/profile/edit')} className="grid h-8 w-8 place-items-center rounded-full bg-brand-50 text-brand-600">
              <Pencil className="h-4 w-4" />
            </button>
          </Card>
        </Item>

        {/* rewards */}
        <Item>
          <div className="rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 text-white shadow-[var(--shadow-float)]">
            <p className="flex items-center gap-2 text-sm font-bold"><Leaf className="h-4 w-4" /> SmartShift Rewards</p>
            <p className="mt-1 text-xs text-brand-100">You've saved 12.4kg of CO2 this month!</p>
            <button className="mt-3 w-full rounded-xl bg-white py-2.5 text-sm font-bold text-brand-700">View Impact</button>
          </div>
        </Item>

        <Section title="Account Settings">
          <Row icon={User} label="Personal Information" sub="Manage your name, email, and phone" onClick={() => nav('/profile/edit')} />
          <Row icon={KeyRound} label="Security & Password" sub="Update password and 2FA" />
        </Section>

        <Section title="Preferences">
          <Row icon={Bell} label="Push Notifications" sub="Alerts for move updates and offers" right={<Toggle on={push} onClick={() => setPush(!push)} />} />
          <Row icon={Moon} label="Dark Mode" sub="Switch between light and dark themes" right={<Toggle on={dark} onClick={() => setDark(!dark)} />} />
          <Row icon={Globe} label="Language" sub="English (United States)" />
        </Section>

        <Section title="Support & Legal">
          <Row icon={LifeBuoy} label="Help Center" sub="FAQs, Guides, and Support Tickets" right={<ExternalLink className="h-4 w-4 text-slate-300" />} />
          <Row icon={FileText} label="Terms of Service" sub="Last updated August 2023" />
        </Section>

        <Item>
          <button
            onClick={async () => { await signOut(); nav('/') }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white py-3.5 text-sm font-bold text-rose-500 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" /> Log Out
          </button>
          <p className="mt-3 text-center text-xs text-slate-400">App Version 2.4.1</p>
        </Item>
      </Stagger>
    </div>
  )
}
