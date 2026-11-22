import { Routes, Route, Navigate } from 'react-router-dom'
import { AdminLayout } from './components/AdminLayout'
import { Dashboard } from './pages/Dashboard'
import { DriverApprovals } from './pages/DriverApprovals'
import { Drivers } from './pages/Drivers'
import { WarehousesPage } from './pages/Warehouses'
import { UsersPage } from './pages/Users'
import { RidesPage } from './pages/Rides'
import { LiveTrackingPage } from './pages/LiveTracking'
import { SettingsPage } from './pages/Settings'

export default function App() {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/approvals" element={<DriverApprovals />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/warehouses" element={<WarehousesPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/rides" element={<RidesPage />} />
        <Route path="/live-map" element={<LiveTrackingPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AdminLayout>
  )
}
