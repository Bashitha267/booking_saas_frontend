import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Register from './Register'
import Dashboard from './pages/Dashboard'
import { useAuth } from './auth/useAuth'

function RequireAuth({ children }){
  const { user } = useAuth()
  if(!user) return <Navigate to="/login" replace />
  return children
}

export default function App(){
  return (
    <div className="app-container">
      <h1>BookingSaaS</h1>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  )
}
