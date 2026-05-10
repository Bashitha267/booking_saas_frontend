import React, { useState } from 'react'
import api from '../api'

export default function AdminAccount() {
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
      setMessage('Admin created successfully')
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
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create admin')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="admin-card !p-6">
      <div className="mb-6">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">Add Administrator</h2>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">First Name</label>
          <input className="admin-input" value={form.firstName} onChange={handleChange('firstName')} placeholder="John" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Last Name</label>
          <input className="admin-input" value={form.lastName} onChange={handleChange('lastName')} placeholder="Doe" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Username</label>
          <input className="admin-input" value={form.username} onChange={handleChange('username')} placeholder="johndoe" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">NIC Number</label>
          <input className="admin-input" value={form.nicNumber} onChange={handleChange('nicNumber')} placeholder="199XXXXXXXXX" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Contact Number</label>
          <input className="admin-input" value={form.contact} onChange={handleChange('contact')} placeholder="+94 7X XXX XXXX" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">WhatsApp</label>
          <input className="admin-input" value={form.whatsapp} onChange={handleChange('whatsapp')} placeholder="+94 7X XXX XXXX" required />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Physical Address</label>
          <input className="admin-input" value={form.address} onChange={handleChange('address')} placeholder="123, Main Street, Colombo" required />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Security Password</label>
          <input
            className="admin-input"
            value={form.password}
            onChange={handleChange('password')}
            placeholder="••••••••"
            type="password"
            required
          />
        </div>
        <button className="admin-button-primary md:col-span-2 mt-4" type="submit" disabled={loading}>
          {loading ? 'Processing...' : 'Register Administrator'}
        </button>
      </form>

      {(message || error) && (
        <div className={`mt-6 p-4 rounded-xl text-sm font-bold ${message ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
          {message || error}
        </div>
      )}
    </div>
  )
}
