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
    <div className="space-y-8">
      <div className="admin-hero-card">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Preferences</p>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">Account & Access</h1>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900 tracking-tight">Account & Access</h1>
        </div>
      </div>

      <AdminAccount />

      <div className="admin-card p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add Administrator</h2>
          </div>
          <button 
            className="admin-button-secondary !border-rose-100 !text-rose-600 hover:!bg-rose-50 hover:!border-rose-200" 
            onClick={handleLogout}
          >
            Sign Out Securely
          </button>
        </div>
      </div>
    </div>
  )
}
