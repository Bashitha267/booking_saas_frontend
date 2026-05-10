import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import AdminAccount from './AdminAccount'

export default function AdminMore() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="space-y-6">
      <div className="admin-hero-card">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">More</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">Account & Access</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Manage admin access and sign out securely.
          </p>
        </div>
      </div>

      <AdminAccount />

      <div className="admin-card">
        <h2 className="text-lg font-semibold">Logout</h2>
        <p className="mt-2 text-sm text-slate-600">End this admin session on the current device.</p>
        <button className="admin-button-secondary mt-4" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </div>
  )
}
