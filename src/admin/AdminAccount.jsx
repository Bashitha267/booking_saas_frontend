import React, { useState, useEffect } from 'react'
import api from '../api'

export default function AdminAccount({ showCreateModal, setShowCreateModal }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    nicNumber: '',
    contact: '',
    whatsapp: '',
    address: '',
    password: '',
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [admins, setAdmins] = useState([])
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    api.get('/admin/admins').then(res => setAdmins(res.data.data || []))
  }, [refresh])

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setError('')
    try {
      await api.post('/admin/create', form)
      setMessage('Admin registered successfully!')
      setRefresh(prev => prev + 1)
      setForm({
        firstName: '',
        lastName: '',
        username: '',
        nicNumber: '',
        contact: '',
        whatsapp: '',
        address: '',
        password: '',
      })
      // Auto-close modal after success
      setTimeout(() => {
        setShowCreateModal(false)
        setMessage('')
      }, 1200)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to register admin')
    } finally {
      setLoading(false)
    }
  }

  // Format WhatsApp Link
  const getWhatsAppLink = (number) => {
    const cleanNum = number.replace(/[^\d]/g, '')
    return `https://wa.me/${cleanNum}`
  }

  return (
    <div className="space-y-6">
      {/* Admins Directory Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Administrative Team</h2>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
            System managers with backend access
          </p>
        </div>
        <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-bold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/10 shadow-sm">
          {admins.length} {admins.length === 1 ? 'Admin' : 'Admins'}
        </span>
      </div>

      {/* Directory Grid */}
      <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2">
        {admins.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <svg className="w-12 h-12 mx-auto text-slate-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">No Other Administrators</p>
            <p className="text-xs text-slate-400 mt-1">Use the "Create New Admin" button to register one.</p>
          </div>
        ) : (
          admins.map((admin) => (
            <div
              key={admin.id}
              className="group relative bg-white border border-slate-100 rounded-2xl p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-slate-200 hover:-translate-y-1"
            >
              {/* Header Info */}
              <div className="flex items-start gap-4 mb-4">
                <div className="relative flex-shrink-0">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-sm font-black text-white shadow-md shadow-blue-100">
                    {admin.firstName?.[0]}{admin.lastName?.[0]}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 block h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                    {admin.firstName} {admin.lastName}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
                    @{admin.username}
                  </p>
                </div>
              </div>

              {/* Contact & Meta Info */}
              <div className="space-y-2.5 pt-2 border-t border-slate-50 text-[13px]">
                {/* NIC Number */}
                <div className="flex items-center gap-3 text-slate-500">
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                  </svg>
                  <span className="font-medium">NIC:</span>
                  <span className="font-bold text-slate-700">{admin.nicNumber || 'N/A'}</span>
                </div>

                {/* Call Link */}
                <a
                  href={`tel:${admin.contact}`}
                  className="flex items-center gap-3 text-slate-500 hover:text-blue-600 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="font-medium">Phone:</span>
                  <span className="font-bold underline decoration-dotted decoration-slate-300 group-hover:decoration-blue-400">{admin.contact}</span>
                </a>

                {/* WhatsApp Link */}
                <a
                  href={getWhatsAppLink(admin.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-slate-500 hover:text-emerald-600 transition-colors"
                >
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="font-medium">WhatsApp:</span>
                  <span className="font-bold underline decoration-dotted decoration-slate-300 group-hover:decoration-emerald-400">{admin.whatsapp}</span>
                </a>

                {/* Physical Address */}
                <div className="flex items-start gap-3 text-slate-500">
                  <svg className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div className="min-w-0">
                    <span className="font-medium">Address: </span>
                    <span className="font-semibold text-slate-600">{admin.address}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Register Admin Modal Popup */}
      {showCreateModal && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal max-w-xl !p-0 overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Register New Admin</h3>
                <p className="text-[13px] font-medium text-slate-500">Create a new administrator credential</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setMessage('')
                  setError('')
                }}
                className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm transition-all flex items-center justify-center text-slate-400 hover:text-slate-900"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">First Name</label>
                  <input
                    className="admin-input"
                    value={form.firstName}
                    onChange={handleChange('firstName')}
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Last Name</label>
                  <input
                    className="admin-input"
                    value={form.lastName}
                    onChange={handleChange('lastName')}
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Username</label>
                  <input
                    className="admin-input"
                    value={form.username}
                    onChange={handleChange('username')}
                    placeholder="johndoe"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">NIC Number</label>
                  <input
                    className="admin-input"
                    value={form.nicNumber}
                    onChange={handleChange('nicNumber')}
                    placeholder="199XXXXXXXXX"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Contact Number</label>
                  <input
                    className="admin-input"
                    value={form.contact}
                    onChange={handleChange('contact')}
                    placeholder="+94 7X XXX XXXX"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">WhatsApp Number</label>
                  <input
                    className="admin-input"
                    value={form.whatsapp}
                    onChange={handleChange('whatsapp')}
                    placeholder="+94 7X XXX XXXX"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Physical Address</label>
                <input
                  className="admin-input"
                  value={form.address}
                  onChange={handleChange('address')}
                  placeholder="123, Main Street, Colombo"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Security Password</label>
                <input
                  className="admin-input"
                  value={form.password}
                  onChange={handleChange('password')}
                  placeholder="••••••••"
                  type="password"
                  required
                />
              </div>

              {/* Actions & Alerts */}
              <div className="space-y-4 pt-2">
                {message && (
                  <div className="p-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center bg-emerald-50 text-emerald-700">
                    {message}
                  </div>
                )}
                {error && (
                  <div className="p-3 rounded-xl text-xs font-bold uppercase tracking-wider text-center bg-rose-50 text-rose-700">
                    {error}
                  </div>
                )}

                <button
                  className="admin-button-primary w-full !h-12 uppercase tracking-widest text-[11px] font-black shadow-lg shadow-blue-200 hover:shadow-blue-300"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : 'Register Administrator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
