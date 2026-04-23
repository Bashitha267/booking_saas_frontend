import React from 'react'
import { useAuth } from '../auth/useAuth'
import AdminDashboard from '../admin/Dashboard'
import HotelDashboard from '../hotel/Dashboard'
import { Navigate } from 'react-router-dom'

export default function Dashboard(){
  const { user } = useAuth()
  if(!user) return <Navigate to="/login" replace />

  if (user.role === 'admin') {
    return <AdminDashboard />
  }

  if (user.role === 'owner' || user.role === 'staff') {
    return <HotelDashboard />
  }

  return <div>Unauthorized role</div>
}
