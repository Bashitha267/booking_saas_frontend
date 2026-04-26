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

function RequireAuth({ children }){
  const { user } = useAuth()
  if(!user) return <Navigate to="/login" replace />
  return children
}

export default function App(){
  return (
    <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Hotel Routes */}
        <Route path="/hotel" element={<RequireAuth><HotelLayout /></RequireAuth>}>
            <Route index element={<HotelDashboard />} />
            <Route path="bookings" element={<BookingHistory />} />
            <Route path="payments" element={<PaymentHistory />} />
            <Route path="finance" element={<FinanceReport />} />
        </Route>

        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/" element={<Navigate to="/hotel" replace />} />
    </Routes>
  )
}
