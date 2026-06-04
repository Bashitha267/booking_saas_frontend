import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Register from './Register'
import ForgotPassword from './ForgotPassword'
import ResetPassword from './ResetPassword'
import Dashboard from './pages/Dashboard'
import {
  AdminLayout,
  AdminDashboard,
  AdminUsers,
  AdminPayments,
  AdminReports,
  AdminMore,
  AdminAccount,
} from './admin/AdminIndex'
import { useAuth } from './auth/useAuth'

import HotelLayout from './hotel/HotelLayout'
import HotelDashboard from './hotel/Dashboard'
import BookingHistory from './hotel/BookingHistory'
import PaymentHistory from './hotel/PaymentHistory'
import FinanceReport from './hotel/FinanceReport'
import BookingDetails from './hotel/booking_details'
import PropertyManagement from './hotel/Property_managment'
import Account from './hotel/Account'
import SystemBilling from './hotel/SystemBilling'
import Guests from './hotel/Guests'
import BookingInvoice from './hotel/BookingInvoice'


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
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Hotel Routes */}
      <Route path="/hotel/bookings/:id/invoice" element={<RequireAuth><RequireRole allowed={['owner', 'admin', 'staff']}><BookingInvoice /></RequireRole></RequireAuth>} />
      <Route path="/hotel" element={<RequireAuth><HotelLayout /></RequireAuth>}>
        <Route index element={<RequireRole allowed={['owner', 'admin', 'staff']}><HotelDashboard /></RequireRole>} />
        <Route path="bookings" element={<RequireRole allowed={['owner', 'admin', 'staff']}><BookingHistory /></RequireRole>} />
        <Route path="bookings/:id" element={<RequireRole allowed={['owner', 'admin', 'staff']}><BookingDetails /></RequireRole>} />
        <Route path="payments" element={<RequireRole allowed={['owner', 'admin', 'staff']}><PaymentHistory /></RequireRole>} />
        <Route path="finance" element={<RequireRole allowed={['owner', 'admin']}><FinanceReport /></RequireRole>} />
        <Route path="property" element={<RequireRole allowed={['owner', 'admin']}><PropertyManagement /></RequireRole>} />
        <Route path="account" element={<RequireRole allowed={['owner', 'admin']}><Account /></RequireRole>} />
        <Route path="system-billing" element={<RequireRole allowed={['owner', 'admin']}><SystemBilling /></RequireRole>} />
        <Route path="guests" element={<RequireRole allowed={['owner', 'admin']}><Guests /></RequireRole>} />
      </Route>

      <Route path="/admin" element={<RequireRole allowed={['admin']}><AdminLayout /></RequireRole>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="more" element={<AdminMore />} />
        <Route path="account" element={<AdminAccount />} />
      </Route>
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/" element={<Navigate to="/hotel" replace />} />
    </Routes>
  )
}
