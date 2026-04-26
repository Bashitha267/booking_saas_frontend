import React from 'react'
import { useAuth } from '../auth/useAuth'
import { Navigate } from 'react-router-dom'

export default function Dashboard(){
  const { user } = useAuth()
  if(!user) return <Navigate to="/login" replace />

  if (user.role === 'admin') {
    // Redirect to admin portal when implemented, for now hotel
    return <Navigate to="/hotel" replace />
  }

  if (user.role === 'owner' || user.role === 'staff') {
    return <Navigate to="/hotel" replace />
  }

  return <div className="p-10 text-center">Unauthorized role. Please contact support.</div>
}
