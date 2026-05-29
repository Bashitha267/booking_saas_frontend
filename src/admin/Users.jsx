import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'

function formatMoney(value) {
  const number = Number(value || 0)
  return 'LKR ' + number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const TABS = ['Overview', 'Properties', 'Staff', 'Settings', 'Payment']

export default function AdminUsers() {
  const [owners, setOwners] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [details, setDetails] = useState(null)
  const [activeTab, setActiveTab] = useState('Overview')
  const [editForm, setEditForm] = useState({ username: '', password: '', email: '', status: '', packagePrice: '', yearlyPrice: '', yearlyDiscount: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [showAddProperty, setShowAddProperty] = useState(false)
  const [propertyForm, setPropertyForm] = useState({ name: '', address: '', city: '', country: '', phone: '', email: '' })
  const [selectedStaff, setSelectedStaff] = useState(null)
  const [staffEditForm, setStaffEditForm] = useState({ username: '', password: '', status: '' })
  const [globalFee, setGlobalFee] = useState(0)

  useEffect(() => {
    api.get('/admin/settings').then(res => {
      const fee = res.data.data?.global_billing_amount
      if (fee) setGlobalFee(Number(fee))
    })
  }, [])

  useEffect(() => {
    let active = true
    setLoading(true)
    api.get('/admin/owners', { params: { q: search || undefined, status: statusFilter || undefined } })
      .then((res) => { if (!active) return; setOwners(res.data.data || []); setError('') })
      .catch((err) => { if (!active) return; setError(err.response?.data?.message || 'Failed to load owners') })
      .finally(() => { if (!active) return; setLoading(false) })
    return () => { active = false }
  }, [search, statusFilter, refreshKey])

  const selectedOwnerSummary = useMemo(() =>
    owners.find((owner) => owner.id === selectedOwner) || null,
    [owners, selectedOwner]
  )

  const openOwner = async (ownerId) => {
    setSelectedOwner(ownerId)
    setDetails(null)
    setDetailsLoading(true)
    setShowAddProperty(false)
    setSelectedStaff(null)
    setActiveTab('Overview')
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const startDate = `${year}-${month}-01`
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate()
      const endDate = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
      const [detailsRes, paymentsRes] = await Promise.all([
        api.get(`/admin/owners/${ownerId}`),
        api.get('/admin/owner-payments', { params: { ownerId, startDate, endDate, status: 'approved' } })
      ])
      const realPaid = (paymentsRes.data.data || []).reduce((sum, p) => sum + Number(p.amount), 0)
      setDetails({ ...detailsRes.data, realPaid, currentMonth: now.toLocaleString('en-US', { month: 'long', year: 'numeric' }) })
      setEditForm({
        username: detailsRes.data.owner.username || '',
        password: '',
        email: detailsRes.data.owner.email || '',
        status: detailsRes.data.owner.status || 'active',
        packagePrice: detailsRes.data.owner.packagePrice != null ? String(detailsRes.data.owner.packagePrice) : '',
        yearlyPrice: detailsRes.data.owner.yearlyPrice != null ? String(detailsRes.data.owner.yearlyPrice) : '',
        yearlyDiscount: detailsRes.data.owner.yearlyDiscount != null ? String(detailsRes.data.owner.yearlyDiscount) : '',
      })
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load owner details')
    } finally {
      setDetailsLoading(false)
    }
  }

  const closeOwner = () => {
    setSelectedOwner(null)
    setDetails(null)
    setEditForm({ username: '', password: '', email: '', status: '', packagePrice: '', yearlyPrice: '', yearlyDiscount: '' })
    setShowAddProperty(false)
    setSelectedStaff(null)
  }

  const updateOwner = async (e) => {
    e.preventDefault()
    if (!selectedOwner) return
    const nextStatus = editForm.status || undefined
    if (nextStatus === 'blocked' && selectedOwnerSummary?.status !== 'blocked') {
      if (!window.confirm('Block this owner? They will lose access to their dashboard.')) return
    }
    setSaving(true)
    try {
      await api.patch(`/admin/users/${selectedOwner}`, {
        username: editForm.username || undefined,
        password: editForm.password || undefined,
        email: editForm.email || undefined,
        status: nextStatus,
        packagePrice: editForm.packagePrice !== '' ? editForm.packagePrice : undefined,
        yearlyPrice: editForm.yearlyPrice !== '' ? editForm.yearlyPrice : undefined,
        yearlyDiscount: editForm.yearlyDiscount !== '' ? editForm.yearlyDiscount : undefined,
      })
      await openOwner(selectedOwner)
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const openStaffEdit = (staff) => {
    setSelectedStaff(staff.id)
    setStaffEditForm({ username: staff.username, password: '', status: staff.status || 'active' })
  }

  const updateStaff = async (e) => {
    e.preventDefault()
    if (!selectedStaff) return
    if (staffEditForm.status === 'blocked') {
      if (!window.confirm('Block this staff member?')) return
    }
    setSaving(true)
    try {
      await api.patch(`/admin/users/${selectedStaff}`, {
        username: staffEditForm.username || undefined,
        password: staffEditForm.password || undefined,
        status: staffEditForm.status || undefined,
      })
      if (selectedOwner) await openOwner(selectedOwner)
      setSelectedStaff(null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update staff')
    } finally {
      setSaving(false)
    }
  }

  const createProperty = async (e) => {
    e.preventDefault()
    if (!selectedOwner) return
    setSaving(true)
    try {
      await api.post('/properties', { ...propertyForm, ownerId: selectedOwner })
      await openOwner(selectedOwner)
      setShowAddProperty(false)
      setPropertyForm({ name: '', address: '', city: '', country: '', phone: '', email: '' })
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create property')
    } finally {
      setSaving(false)
    }
  }

  const togglePropertyStatus = async (propertyId, nextStatus) => {
    if (!window.confirm(`${nextStatus === 'blocked' ? 'Block' : 'Unblock'} this property?`)) return
    try {
      await api.patch(`/admin/properties/${propertyId}/status`, { status: nextStatus })
      if (selectedOwner) await openOwner(selectedOwner)
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update property status')
    }
  }

  const ownerPrice = details?.owner?.packagePrice != null ? Number(details.owner.packagePrice) : globalFee
  const isPaid = details ? details.realPaid >= ownerPrice : false
  const isPartial = details ? details.realPaid > 0 && !isPaid : false

  return (
    <>
      <div className="space-y-6 admin-fade">
        {/* Header */}
        <div className="admin-hero-card">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Directory</p>
              <h1 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">Owner Management</h1>
            </div>
            <span className="flex h-10 items-center rounded-xl bg-slate-100 px-5 text-sm font-bold text-slate-500 self-start md:self-auto">
              {owners.length} Owners
            </span>
          </div>

          <div className="admin-filter-bar mt-8">
            <div className="flex flex-wrap items-end gap-4">
              <div className="admin-filter-group flex-1 min-w-[240px]">
                <label className="admin-filter-label">Search</label>
                <div className="relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, Property or Contact..." className="admin-filter-input w-full pl-11" />
                </div>
              </div>
              <div className="admin-filter-group w-56">
                <label className="admin-filter-label">Account Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="admin-filter-input">
                  <option value="">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="admin-alert">{error}</div>}

        {/* Owner Table */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-x-auto">
          <table className="admin-table w-full whitespace-nowrap min-w-[800px]">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Contact</th>
                <th>Properties</th>
                <th>Staff</th>
                <th>Billing Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">Loading...</td>
                </tr>
              ) : owners.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-sm">No owners found</td>
                </tr>
              ) : (
                owners.map((owner) => (
                  <tr key={owner.id} className="admin-table-row hover:bg-blue-50/30 transition-colors group">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-black text-white text-xs shadow-sm">
                          {owner.firstName?.[0]}{owner.lastName?.[0]}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-black text-slate-900 text-sm">{owner.firstName} {owner.lastName}</p>
                            <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${owner.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          </div>
                          <p className="text-xs font-bold text-slate-400">@{owner.username}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <p className="text-sm font-bold text-slate-700">{owner.contact}</p>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-black">{owner.propertyCount || 0}</span>
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-black">{owner.staffCount || 0}</span>
                    </td>
                    <td className="py-3">
                      <span className={`admin-pill ${owner.currentBillingStatus || 'pending'} text-[10px]`}>
                        {owner.currentBillingStatus || 'pending'}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => openOwner(owner.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all text-xs font-black uppercase tracking-wider"
                      >
                        View Profile
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Owner Profile Popup Modal ── */}
      {selectedOwner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-6">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={closeOwner} />

          {/* Panel */}
          <div className="relative w-full sm:max-w-4xl bg-white h-full sm:h-[90vh] sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden" style={{ animation: 'scaleIn 0.25s ease-out' }}>

            {/* Panel Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-slate-900 to-blue-950 text-white">
              <div className="flex items-start justify-between p-6 pb-0">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center font-black text-xl">
                    {selectedOwnerSummary?.firstName?.[0]}{selectedOwnerSummary?.lastName?.[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-blue-300 uppercase tracking-[0.2em] mb-1">Owner Profile</p>
                    <h2 className="text-xl font-black text-white leading-tight">{selectedOwnerSummary?.firstName} {selectedOwnerSummary?.lastName}</h2>
                    <p className="text-blue-300 text-sm font-bold mt-0.5">{selectedOwnerSummary?.contact}</p>
                  </div>
                </div>
                <button onClick={closeOwner} className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all text-white mt-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Tabs */}
              <div className="flex overflow-x-auto no-scrollbar gap-0 mt-4 px-2">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-3 text-sm font-bold transition-all rounded-t-xl whitespace-nowrap flex-shrink-0 ${
                      activeTab === tab
                        ? 'bg-white text-slate-900'
                        : 'text-blue-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Panel Body */}
            <div className="flex-1 overflow-y-auto bg-slate-50">
              {detailsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                    <p className="mt-4 text-xs font-black text-slate-400 uppercase tracking-widest">Loading Records...</p>
                  </div>
                </div>
              ) : details ? (
                <div className="p-6 space-y-5">

                  {/* ── OVERVIEW TAB ── */}
                  {activeTab === 'Overview' && (
                    <div className="space-y-4">
                      {/* Financial Summary Card */}
                      <div className="bg-gradient-to-br from-slate-800 to-blue-950 rounded-2xl p-5 text-white shadow-xl">
                        <div className="flex items-start justify-between mb-5">
                          <div>
                            <p className="text-xs font-black text-blue-300 uppercase tracking-[0.2em]">Platform Settlement</p>
                            <p className="text-lg font-black text-white mt-0.5">{details.currentMonth}</p>
                          </div>
                          <span className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                            isPaid ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' :
                            isPartial ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' :
                            'bg-rose-500/20 text-rose-400 ring-1 ring-rose-500/30'
                          }`}>
                            {isPaid ? '✓ Fully Paid' : isPartial ? '◑ Partial' : '✗ Unpaid'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="bg-white/8 rounded-xl p-3 border border-white/10">
                            <p className="text-[11px] font-black text-blue-300 uppercase tracking-wider mb-1">
                              {details.owner?.packagePrice != null ? 'Custom Price' : 'Usage Fee'}
                            </p>
                            <p className="text-xl font-black">{formatMoney(ownerPrice)}</p>
                          </div>
                          <div className="bg-white/8 rounded-xl p-3 border border-white/10">
                            <p className="text-[11px] font-black text-emerald-400 uppercase tracking-wider mb-1">Collected</p>
                            <p className="text-xl font-black text-emerald-400">{formatMoney(details.realPaid)}</p>
                          </div>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${isPaid ? 'bg-emerald-500' : isPartial ? 'bg-amber-400' : 'bg-rose-500'}`}
                            style={{ width: `${Math.min(ownerPrice > 0 ? (details.realPaid / ownerPrice) * 100 : 0, 100)}%` }}
                          />
                        </div>
                        {!isPaid && (
                          <p className="text-xs font-bold text-rose-300">Balance due: {formatMoney(Math.max(0, ownerPrice - details.realPaid))}</p>
                        )}
                      </div>

                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Properties', value: details.properties.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                          { label: 'Staff', value: details.staff.length, color: 'text-violet-600', bg: 'bg-violet-50' },
                          { label: 'Status', value: details.owner?.status || 'active', color: details.owner?.status === 'blocked' ? 'text-rose-600' : 'text-emerald-600', bg: details.owner?.status === 'blocked' ? 'bg-rose-50' : 'bg-emerald-50' },
                        ].map(({ label, value, color, bg }) => (
                          <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                            <p className={`text-base font-black ${color} capitalize`}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Owner Info */}
                      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Account Details</p>
                        {[
                          { label: 'Username', value: `@${details.owner?.username}` },
                          { label: 'Email', value: details.owner?.email || '—' },
                          { label: 'Contact', value: details.owner?.contact },
                          { label: 'Address', value: details.owner?.address },
                          { label: 'Member Since', value: details.owner?.createdAt ? new Date(details.owner.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex items-start justify-between gap-4">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider w-24 flex-shrink-0">{label}</span>
                            <span className="text-sm font-bold text-slate-800 text-right">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── PROPERTIES TAB ── */}
                  {activeTab === 'Properties' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-black text-slate-700">{details.properties.length} Propert{details.properties.length !== 1 ? 'ies' : 'y'}</p>
                        <button
                          onClick={() => setShowAddProperty(!showAddProperty)}
                          className={`text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all ${
                            showAddProperty ? 'bg-slate-100 text-slate-600' : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                        >
                          {showAddProperty ? '✕ Cancel' : '+ Add Property'}
                        </button>
                      </div>

                      {showAddProperty && (
                        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
                          <p className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">New Property</p>
                          <form onSubmit={createProperty} className="grid gap-3 sm:grid-cols-2">
                            <input required placeholder="Property Name *" className="admin-input sm:col-span-2" value={propertyForm.name} onChange={(e) => setPropertyForm(p => ({ ...p, name: e.target.value }))} />
                            <input required placeholder="Address *" className="admin-input sm:col-span-2" value={propertyForm.address} onChange={(e) => setPropertyForm(p => ({ ...p, address: e.target.value }))} />
                            <input placeholder="City" className="admin-input" value={propertyForm.city} onChange={(e) => setPropertyForm(p => ({ ...p, city: e.target.value }))} />
                            <input placeholder="Country" className="admin-input" value={propertyForm.country} onChange={(e) => setPropertyForm(p => ({ ...p, country: e.target.value }))} />
                            <input placeholder="Phone" className="admin-input" value={propertyForm.phone} onChange={(e) => setPropertyForm(p => ({ ...p, phone: e.target.value }))} />
                            <input type="email" placeholder="Email" className="admin-input" value={propertyForm.email} onChange={(e) => setPropertyForm(p => ({ ...p, email: e.target.value }))} />
                            <button type="submit" disabled={saving} className="admin-button-primary sm:col-span-2 !h-11 mt-1">
                              {saving ? 'Creating...' : 'Create Property'}
                            </button>
                          </form>
                        </div>
                      )}

                      {details.properties.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                          <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" /></svg>
                          <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No properties yet</p>
                        </div>
                      ) : (
                        details.properties.map((property) => (
                          <div key={property.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                            {/* Property Header */}
                            <div className="p-4 border-b border-slate-50">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" /></svg>
                                  </div>
                                  <div>
                                    <p className="font-black text-slate-900">{property.name}</p>
                                    <p className="text-xs font-bold text-slate-400 mt-0.5">{property.address}{property.city ? `, ${property.city}` : ''}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  <span className={`admin-pill ${property.status}`}>{property.status}</span>
                                  <button
                                    onClick={() => togglePropertyStatus(property.id, property.status === 'active' ? 'blocked' : 'active')}
                                    className={`text-xs font-bold uppercase px-3 py-1.5 rounded-xl transition-all ${
                                      property.status === 'active'
                                        ? 'text-rose-600 bg-rose-50 hover:bg-rose-100 ring-1 ring-rose-200'
                                        : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 ring-1 ring-emerald-200'
                                    }`}
                                  >
                                    {property.status === 'active' ? 'Block' : 'Unblock'}
                                  </button>
                                </div>
                              </div>
                              {property.phone && <p className="text-xs font-bold text-slate-400 mt-2 ml-13">{property.phone}</p>}
                            </div>

                            {/* Rooms */}
                            <div className="p-4 bg-slate-50/50">
                              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">
                                Rooms & Inventory ({property.rooms?.length || 0})
                              </p>
                              {property.rooms?.length === 0 ? (
                                <p className="text-xs italic text-slate-300">No rooms initialized.</p>
                              ) : (
                                <div className="grid gap-2">
                                  {property.rooms?.map(room => (
                                    <div key={room.id} className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-slate-100">
                                      <div className="flex items-center gap-2.5">
                                        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${room.status === 'available' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                        <div>
                                          <p className="text-sm font-black text-slate-900">{room.roomNumber}</p>
                                          <p className="text-[10px] font-bold text-slate-400 uppercase">{room.roomType}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-black text-blue-600">{formatMoney(room.price)}</p>
                                        <p className="text-[10px] font-bold text-slate-400">per night</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* ── STAFF TAB ── */}
                  {activeTab === 'Staff' && (
                    <div className="space-y-4">
                      <p className="text-sm font-black text-slate-700">{details.staff.length} Staff Member{details.staff.length !== 1 ? 's' : ''}</p>

                      {selectedStaff && (
                        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-5">
                          <div className="flex items-center justify-between mb-4">
                            <p className="text-xs font-black text-blue-600 uppercase tracking-widest">Edit Staff Member</p>
                            <button onClick={() => setSelectedStaff(null)} className="text-xs font-black text-slate-400 hover:text-slate-700 uppercase tracking-widest">✕ Cancel</button>
                          </div>
                          <form onSubmit={updateStaff} className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                              <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Username</label>
                              <input value={staffEditForm.username} onChange={(e) => setStaffEditForm(p => ({ ...p, username: e.target.value }))} className="admin-input" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[11px] font-black text-slate-500 uppercase ml-1">New Password</label>
                              <input type="password" placeholder="••••••••" value={staffEditForm.password} onChange={(e) => setStaffEditForm(p => ({ ...p, password: e.target.value }))} className="admin-input" />
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                              <label className="text-[11px] font-black text-slate-500 uppercase ml-1">Status</label>
                              <select value={staffEditForm.status} onChange={(e) => setStaffEditForm(p => ({ ...p, status: e.target.value }))} className="admin-input">
                                <option value="active">Active — Full Access</option>
                                <option value="blocked">Blocked — No Access</option>
                              </select>
                            </div>
                            <button type="submit" disabled={saving} className="admin-button-primary sm:col-span-2 !h-10">{saving ? 'Updating...' : 'Update Staff'}</button>
                          </form>
                        </div>
                      )}

                      {details.staff.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-slate-200 py-12 text-center">
                          <svg className="w-10 h-10 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No staff assigned</p>
                        </div>
                      ) : (
                        details.staff.map((staff) => (
                          <div key={staff.id} className="bg-white rounded-2xl border border-slate-100 p-4 flex items-center gap-4 group hover:border-blue-100 transition-all">
                            <div className="h-11 w-11 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-500 flex-shrink-0">
                              {staff.firstName?.[0]}{staff.lastName?.[0]}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-slate-900">{staff.firstName} {staff.lastName}</p>
                                <span className={`h-1.5 w-1.5 rounded-full ${staff.status === 'blocked' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                              </div>
                              <p className="text-xs font-bold text-slate-400 mt-0.5">@{staff.username} · {staff.contact || 'No Contact'}</p>
                            </div>
                            <button
                              onClick={() => openStaffEdit(staff)}
                              className="text-xs font-black text-slate-400 uppercase tracking-widest hover:text-blue-600 transition-colors bg-slate-50 hover:bg-blue-50 px-3 py-1.5 rounded-xl border border-slate-100 opacity-0 group-hover:opacity-100"
                            >
                              Edit
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* ── SETTINGS TAB ── */}
                  {activeTab === 'Settings' && (
                    <div className="space-y-4">
                      <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5">Account & Access Control</p>
                        <form onSubmit={updateOwner} className="space-y-4">
                          {/* Username */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Username</label>
                            <input value={editForm.username} onChange={(e) => setEditForm(p => ({ ...p, username: e.target.value }))} className="admin-input" placeholder="Username" />
                          </div>

                          {/* Email */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                            <input type="email" value={editForm.email} onChange={(e) => setEditForm(p => ({ ...p, email: e.target.value }))} className="admin-input" placeholder="email@example.com" />
                          </div>

                          {/* Password */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Reset Password</label>
                            <input type="password" value={editForm.password} onChange={(e) => setEditForm(p => ({ ...p, password: e.target.value }))} className="admin-input" placeholder="Leave blank to keep current" />
                          </div>

                          {/* Status */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Account Status</label>
                            <div className="grid grid-cols-2 gap-2">
                              {['active', 'blocked'].map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => setEditForm(p => ({ ...p, status: s }))}
                                  className={`py-2.5 rounded-xl border font-bold text-sm transition-all capitalize ${
                                    editForm.status === s
                                      ? s === 'active'
                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20'
                                        : 'border-rose-500 bg-rose-50 text-rose-700 ring-1 ring-rose-500/20'
                                      : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-white'
                                  }`}
                                >
                                  {s === 'active' ? '✓ Active' : '⊘ Blocked'}
                                </button>
                              ))}
                            </div>
                          </div>

                          <button type="submit" disabled={saving} className="admin-button-primary w-full !h-12 !rounded-2xl text-sm font-black uppercase tracking-wider mt-2">
                            {saving ? 'Saving...' : 'Save Changes'}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* ── PAYMENT TAB ── */}
                  {activeTab === 'Payment' && (
                    <div className="space-y-4">
                      <div className="bg-white rounded-2xl border border-slate-100 p-5">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5">Subscription Pricing Details</p>
                        <form onSubmit={updateOwner} className="space-y-4">
                          
                          {/* Monthly Package Price */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Monthly Package Price</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">LKR</span>
                              <input
                                type="number" min="0" step="0.01"
                                value={editForm.packagePrice}
                                onChange={(e) => setEditForm(p => ({ ...p, packagePrice: e.target.value }))}
                                className="admin-input !pl-12"
                                placeholder={globalFee ? String(globalFee) : '0.00'}
                              />
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 ml-1">
                              Leave empty to use global price ({formatMoney(globalFee)})
                            </p>
                          </div>

                          {/* Yearly Package Price */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Yearly Package Price</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">LKR</span>
                              <input
                                type="number" min="0" step="0.01"
                                value={editForm.yearlyPrice}
                                onChange={(e) => setEditForm(p => ({ ...p, yearlyPrice: e.target.value }))}
                                className="admin-input !pl-12"
                                placeholder={globalFee ? String(globalFee * 12) : '0.00'}
                              />
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 ml-1">
                              The base yearly cost (before any special discount)
                            </p>
                          </div>

                          {/* Yearly Discount */}
                          <div className="space-y-1.5">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-wider ml-1">Yearly Discount</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400">LKR</span>
                              <input
                                type="number" min="0" step="0.01"
                                value={editForm.yearlyDiscount}
                                onChange={(e) => setEditForm(p => ({ ...p, yearlyDiscount: e.target.value }))}
                                className="admin-input !pl-12"
                                placeholder="0.00"
                              />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button 
                                type="button" 
                                onClick={() => setEditForm(p => ({ ...p, yearlyDiscount: String((Number(p.yearlyPrice) || (Number(p.packagePrice) || globalFee) * 12) * 0.05) }))} 
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors border border-emerald-100"
                              >
                                5% OFF
                              </button>
                              <button 
                                type="button" 
                                onClick={() => setEditForm(p => ({ ...p, yearlyDiscount: String((Number(p.yearlyPrice) || (Number(p.packagePrice) || globalFee) * 12) * 0.10) }))} 
                                className="px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-emerald-100 transition-colors border border-emerald-100"
                              >
                                10% OFF
                              </button>
                            </div>
                            <p className="text-[11px] font-bold text-slate-400 ml-1">
                              This discount will automatically be applied when they pay yearly
                            </p>
                          </div>

                          <button type="submit" disabled={saving} className="admin-button-primary w-full !h-12 !rounded-2xl text-sm font-black uppercase tracking-wider mt-4">
                            {saving ? 'Saving...' : 'Save Payment Config'}
                          </button>
                        </form>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm font-bold uppercase tracking-widest">
                  No details available
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  )
}
