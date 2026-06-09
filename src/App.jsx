import { useState, useEffect } from 'react'
import { Routes, Route, useLocation, Link, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Capacitor } from '@capacitor/core'
import { LayoutGrid, X } from 'lucide-react'
import { Onboarding, Register, RoleSelect, Login, ForgotPassword, ResetPassword } from './screens/Auth'
import EditProfile from './screens/EditProfile'
import { useAuth } from './lib/AuthContext'
import {
  CustomerDashboard,
  CustomerTrack,
  CustomerRating,
  CustomerMoves,
  CustomerProfile,
  CustomerAlerts,
} from './screens/Customer'
import { getRole, homeFor } from './lib/auth'
import { BookWizard } from './screens/Book'
import { SettingsScreen } from './screens/Settings'
import {
  MoverDashboard,
  MoverAvailable,
  MoverJobs,
  MoverJobDetail,
  MoverScan,
  MoverConfirmDelivery,
  MoverProfile,
  MoverEarnings,
  MoverDocuments,
  MoverNotifications,
} from './screens/Mover'

const SCREENS = [
  ['Onboarding', '/'],
  ['Register', '/register'],
  ['Role Select', '/role'],
  ['Login', '/login'],
  ['Forgot Password', '/forgot'],
  ['Reset Password', '/reset'],
  ['Edit Profile', '/profile/edit'],
  ['Customer · Home', '/customer'],
  ['Customer · Book', '/customer/book'],
  ['Customer · Moves', '/customer/moves'],
  ['Customer · Track', '/customer/track'],
  ['Customer · Rating', '/customer/rating'],
  ['Customer · Profile', '/customer/profile'],
  ['Settings', '/settings'],
  ['Customer · Alerts', '/customer/alerts'],
  ['Mover · Home', '/mover'],
  ['Mover · Available', '/mover/available'],
  ['Mover · My Jobs', '/mover/jobs'],
  ['Mover · Profile', '/mover/profile'],
  ['Mover · Earnings', '/mover/earnings'],
  ['Mover · Documents', '/mover/documents'],
  ['Mover · Alerts', '/mover/notifications'],
]

function Page({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="min-h-screen"
    >
      {children}
    </motion.div>
  )
}

// Gate role-specific screens. Requires an authenticated session and the
// matching role, so a customer never lands on mover data and vice-versa.
function RoleGuard({ role, children }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  const current = profile?.role || getRole()
  if (!current) return <Navigate to="/role" replace />
  if (current !== role) return <Navigate to={current === 'mover' ? '/mover' : '/customer'} replace />
  return children
}

// Any authenticated user (role-agnostic), e.g. edit profile.
function AuthGuard({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  return children
}

// Root route. A logged-in user skips onboarding and goes straight to their
// home; only logged-out users see the onboarding carousel.
function RootGate() {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (user) {
    const role = profile?.role || getRole() || 'customer'
    return <Navigate to={homeFor(role)} replace />
  }
  return <Page><Onboarding /></Page>
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<RootGate />} />
        <Route path="/register" element={<Page><Register /></Page>} />
        <Route path="/role" element={<Page><RoleSelect /></Page>} />
        <Route path="/login" element={<Page><Login /></Page>} />
        <Route path="/forgot" element={<Page><ForgotPassword /></Page>} />
        <Route path="/reset" element={<Page><ResetPassword /></Page>} />
        <Route path="/profile/edit" element={<AuthGuard><Page><EditProfile /></Page></AuthGuard>} />

        <Route path="/customer" element={<RoleGuard role="customer"><Page><CustomerDashboard /></Page></RoleGuard>} />
        <Route path="/customer/book" element={<RoleGuard role="customer"><Page><BookWizard /></Page></RoleGuard>} />
        <Route path="/customer/moves" element={<RoleGuard role="customer"><Page><CustomerMoves /></Page></RoleGuard>} />
        <Route path="/customer/track" element={<RoleGuard role="customer"><Page><CustomerTrack /></Page></RoleGuard>} />
        <Route path="/customer/rating" element={<RoleGuard role="customer"><Page><CustomerRating /></Page></RoleGuard>} />
        <Route path="/customer/profile" element={<RoleGuard role="customer"><Page><CustomerProfile /></Page></RoleGuard>} />
        <Route path="/settings" element={<Page><SettingsScreen /></Page>} />
        <Route path="/customer/alerts" element={<RoleGuard role="customer"><Page><CustomerAlerts /></Page></RoleGuard>} />

        <Route path="/mover" element={<RoleGuard role="mover"><Page><MoverDashboard /></Page></RoleGuard>} />
        <Route path="/mover/available" element={<RoleGuard role="mover"><Page><MoverAvailable /></Page></RoleGuard>} />
        <Route path="/mover/jobs" element={<RoleGuard role="mover"><Page><MoverJobs /></Page></RoleGuard>} />
        <Route path="/mover/job/:id" element={<RoleGuard role="mover"><Page><MoverJobDetail /></Page></RoleGuard>} />
        <Route path="/mover/scan/:id" element={<RoleGuard role="mover"><Page><MoverScan /></Page></RoleGuard>} />
        <Route path="/mover/confirm/:id" element={<RoleGuard role="mover"><Page><MoverConfirmDelivery /></Page></RoleGuard>} />
        <Route path="/mover/profile" element={<RoleGuard role="mover"><Page><MoverProfile /></Page></RoleGuard>} />
        <Route path="/mover/earnings" element={<RoleGuard role="mover"><Page><MoverEarnings /></Page></RoleGuard>} />
        <Route path="/mover/documents" element={<RoleGuard role="mover"><Page><MoverDocuments /></Page></RoleGuard>} />
        <Route path="/mover/notifications" element={<RoleGuard role="mover"><Page><MoverNotifications /></Page></RoleGuard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  )
}

function ScreenLauncher() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 grid h-12 w-12 place-items-center rounded-2xl bg-slate-900 text-white shadow-xl transition hover:scale-105 active:scale-95"
        title="All screens"
      >
        <LayoutGrid className="h-5 w-5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ x: 320 }}
              animate={{ x: 0 }}
              exit={{ x: 320 }}
              transition={{ type: 'spring', stiffness: 280, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="h-full w-72 overflow-y-auto bg-white p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-ink">All Screens</h2>
                <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full bg-slate-100">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-1">
                {SCREENS.map(([label, to]) => (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setOpen(false)}
                    className={`block rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      pathname === to ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function App() {
  // Android hardware back button: navigate back, or exit at the root.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    let handle
    import('@capacitor/app').then(({ App: CapApp }) => {
      CapApp.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) window.history.back()
        else CapApp.exitApp()
      }).then((h) => (handle = h))
    })
    return () => handle?.remove()
  }, [])

  return (
    <div className="mx-auto min-h-screen w-full max-w-md bg-slate-50 shadow-sm sm:max-w-lg">
      <AnimatedRoutes />
      <ScreenLauncher />
    </div>
  )
}
