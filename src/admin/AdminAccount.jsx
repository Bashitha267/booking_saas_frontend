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
    <div className="admin-card">
      <h2 className="text-lg font-semibold">Add Admin</h2>
      <p className="mt-2 text-sm text-slate-600">Create new admin access for the platform.</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3 md:grid-cols-2">
        <input className="admin-input" value={form.firstName} onChange={handleChange('firstName')} placeholder="First name" required />
        <input className="admin-input" value={form.lastName} onChange={handleChange('lastName')} placeholder="Last name" required />
        <input className="admin-input" value={form.username} onChange={handleChange('username')} placeholder="Username" required />
        <input className="admin-input" value={form.nicNumber} onChange={handleChange('nicNumber')} placeholder="NIC number" />
        <input className="admin-input" value={form.contact} onChange={handleChange('contact')} placeholder="Contact" required />
        <input className="admin-input" value={form.whatsapp} onChange={handleChange('whatsapp')} placeholder="WhatsApp" required />
        <input className="admin-input md:col-span-2" value={form.address} onChange={handleChange('address')} placeholder="Address" required />
        <input
          className="admin-input"
          value={form.password}
          onChange={handleChange('password')}
          placeholder="Password"
          type="password"
          required
        />
        <button className="admin-button-primary md:col-span-2" type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create admin'}
        </button>
      </form>

      {message && <p className="mt-3 text-sm text-emerald-600">{message}</p>}
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </div>
  )
}
