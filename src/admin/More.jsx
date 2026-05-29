import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'
import api from '../api'
import AdminAccount from './AdminAccount'

export default function AdminMore() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [settings, setSettings] = useState({ global_billing_amount: '0.00' })
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  useEffect(() => {
    api.get('/admin/settings').then(res => {
      if (res.data.data) {
        setSettings(prev => ({ ...prev, ...res.data.data }))
      }
    })
  }, [])

  const handleUpdateSetting = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      await api.post('/admin/settings', { 
        key: 'global_billing_amount', 
        value: settings.global_billing_amount 
      })
      setMessage('Global billing amount updated successfully')
    } catch (err) {
      setMessage('Failed to update setting')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="space-y-8 admin-fade">
      {/* Header / Hero Section */}
      <div className="admin-hero-card !p-8 bg-gradient-to-r from-slate-900 to-slate-800 border-none relative overflow-hidden shadow-xl rounded-3xl">
        {/* Decorative background grid/gradients */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"></div>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">System Control Panel</p>
            <h1 className="mt-2 text-3xl font-black text-white tracking-tight">Preferences & Security</h1>
            <p className="text-slate-400 text-sm mt-1">Configure global flat-rates and manage administrator credentials.</p>
          </div>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex-shrink-0 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3.5 text-xs font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 hover:-translate-y-0.5 active:translate-y-0 hover:shadow-blue-500/30 uppercase tracking-widest"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Create New Admin
          </button>
        </div>
      </div>

      {/* Main Grid: Left is Configuration, Right is Directory */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: System parameters & Preferences (span 1) */}
        <div className="space-y-8 lg:col-span-1">
          {/* Platform standard fee configuration */}
          <div className="admin-card !p-6 border-blue-50 bg-white relative overflow-hidden group">
            {/* Hover top border gradient */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="flex items-center gap-4 mb-6">
              <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Platform Billing</h2>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Fixed Monthly Pricing</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              This sets the default monthly subscription fee for all hotel owners. Individual owners can be overrides in their specific profile settings.
            </p>

            <form onSubmit={handleUpdateSetting} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Standard Flat Fee</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-400">LKR</span>
                  <input
                    type="number"
                    step="0.01"
                    className="admin-input !h-12 !pl-14 text-lg font-extrabold text-slate-800 tracking-tight"
                    value={settings.global_billing_amount}
                    onChange={(e) => setSettings(prev => ({ ...prev, global_billing_amount: e.target.value }))}
                  />
                </div>
              </div>
              <button 
                type="submit" 
                disabled={saving}
                className="admin-button-primary w-full !h-11 uppercase tracking-widest text-[11px] font-bold"
              >
                {saving ? 'Saving changes...' : 'Save New Rate'}
              </button>
            </form>

            {message && (
              <div className={`mt-4 p-3 rounded-2xl text-xs font-bold uppercase tracking-wider text-center ${message.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                {message}
              </div>
            )}
          </div>

          {/* Secure Logout Section */}
          <div className="admin-card !p-6 border-slate-100 bg-white relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

            <div className="flex items-center gap-4 mb-4">
              <div className="h-11 w-11 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-10V9" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Session Manager</h3>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Secure Termination</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-500 leading-relaxed mb-5">
              Instantly destroy administrative access cookies and log out of the system.
            </p>
            
            <button 
              className="admin-button-secondary !bg-rose-50/50 !border-rose-100 !text-rose-600 hover:!bg-rose-100/70 hover:!border-rose-200 w-full !h-11 !text-[11px] uppercase tracking-widest font-black" 
              onClick={handleLogout}
            >
              Sign Out Securely
            </button>
          </div>
        </div>

        {/* Right Column: Admin List & Modals (span 2) */}
        <div className="lg:col-span-2">
          <div className="admin-card !p-6 bg-white shadow-sm border border-slate-100">
            <AdminAccount showCreateModal={showCreateModal} setShowCreateModal={setShowCreateModal} />
          </div>
        </div>
      </div>
    </div>
  )
}
