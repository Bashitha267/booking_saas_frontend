import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Register from './Register'
import Dashboard from './pages/Dashboard'
import { useAuth } from './auth/useAuth'

import HotelLayout from './hotel/HotelLayout'
import HotelDashboard from './hotel/Dashboard'
import BookingHistory from './hotel/BookingHistory'
import PaymentHistory from './hotel/PaymentHistory'
import FinanceReport from './hotel/FinanceReport'
import BookingDetails from './hotel/booking_details'
import PropertyManagement from './hotel/Property_managment'
import Account from './hotel/Account'

function RequireAuth({ children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireRole({ allowed, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!allowed.includes(user.role)) return <Navigate to="/hotel" replace />
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Hotel Routes */}
      <Route path="/hotel" element={<RequireAuth><HotelLayout /></RequireAuth>}>
        <Route index element={<RequireRole allowed={['owner', 'admin', 'staff']}><HotelDashboard /></RequireRole>} />
        <Route path="bookings" element={<RequireRole allowed={['owner', 'admin', 'staff']}><BookingHistory /></RequireRole>} />
        <Route path="bookings/:id" element={<RequireRole allowed={['owner', 'admin', 'staff']}><BookingDetails /></RequireRole>} />
        <Route path="payments" element={<RequireRole allowed={['owner', 'admin', 'staff']}><PaymentHistory /></RequireRole>} />
        <Route path="finance" element={<RequireRole allowed={['owner', 'admin']}><FinanceReport /></RequireRole>} />
        <Route path="property" element={<RequireRole allowed={['owner', 'admin']}><PropertyManagement /></RequireRole>} />
        <Route path="account" element={<RequireRole allowed={['owner', 'admin']}><Account /></RequireRole>} />
      </Route>

      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/" element={<Navigate to="/hotel" replace />} />
    </Routes>
  )
}
