import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'

function formatMoney(value) {
  const number = Number(value || 0)
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AdminUsers() {
  const [owners, setOwners] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedOwner, setSelectedOwner] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [details, setDetails] = useState(null)
  const [editForm, setEditForm] = useState({ username: '', password: '', email: '', status: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [showAddProperty, setShowAddProperty] = useState(false)
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: ''
  })

  useEffect(() => {
    let active = true
    setLoading(true)
    api
      .get('/admin/owners', { params: { q: search || undefined, status: statusFilter || undefined } })
      .then((res) => {
        if (!active) return
        setOwners(res.data.data || [])
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setError(err.response?.data?.message || 'Failed to load owners')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [search, statusFilter, refreshKey])

  const selectedOwnerSummary = useMemo(() => {
    if (!selectedOwner) return null
    return owners.find((owner) => owner.id === selectedOwner) || null
  }, [owners, selectedOwner])

  const openOwner = async (ownerId) => {
    setSelectedOwner(ownerId)
    setDetails(null)
    setDetailsLoading(true)
    setShowAddProperty(false)
    try {
      const res = await api.get(`/admin/owners/${ownerId}`)
      setDetails(res.data)
      setEditForm({
        username: res.data.owner.username || '',
        password: '',
        email: res.data.owner.email || '',
        status: res.data.owner.status || 'active',
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
    setEditForm({ username: '', password: '', email: '', status: '' })
    setShowAddProperty(false)
  }

  const updateOwner = async (e) => {
    e.preventDefault()
    if (!selectedOwner) return
    setSaving(true)
    try {
      await api.patch(`/admin/users/${selectedOwner}`, {
        username: editForm.username || undefined,
        password: editForm.password || undefined,
        email: editForm.email || undefined,
        status: editForm.status || undefined,
      })
      await openOwner(selectedOwner)
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user')
    } finally {
      setSaving(false)
    }
  }

  const createProperty = async (e) => {
    e.preventDefault()
    if (!selectedOwner) return
    setSaving(true)
    try {
      await api.post('/properties', {
        ...propertyForm,
        ownerId: selectedOwner
      })
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
    try {
      await api.patch(`/admin/properties/${propertyId}/status`, { status: nextStatus })
      if (selectedOwner) await openOwner(selectedOwner)
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update property status')
    }
  }

  return (
    <div className="space-y-8">
      <div className="admin-hero-card">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Directory</p>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">Owner Management</h1>
          </div>
          <div className="flex items-center gap-3">
             <span className="flex h-10 items-center rounded-xl bg-slate-100 px-4 text-xs font-bold text-slate-500">
               {owners.length} Total Owners
             </span>
          </div>
        </div>
        
        <div className="admin-filter-bar mt-8">
          <div className="flex flex-wrap items-end gap-4">
            <div className="admin-filter-group flex-1 min-w-[240px]">
              <label className="admin-filter-label">Search</label>
              <div className="relative group">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ID, Name, Property or Contact..."
                  className="admin-filter-input w-full pl-11"
                />
              </div>
            </div>
            <div className="admin-filter-group w-56">
              <label className="admin-filter-label">Account Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="admin-filter-input"
              >
                <option value="">All Account Statuses</option>
                <option value="active">Active Accounts</option>
                <option value="blocked">Blocked Accounts</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="admin-alert">{error}</div>}

      <div className="space-y-4">
        {/* Mobile View: Cards */}
        <div className="grid gap-4 lg:hidden">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-medium">Loading owners...</div>
          ) : owners.length === 0 ? (
            <div className="py-12 text-center text-slate-400 font-medium">No owners found</div>
          ) : (
            owners.map((owner) => (
              <div
                key={owner.id}
                className="admin-card !p-4 active:scale-[0.99] transition-transform"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-400 text-xs shadow-sm">
                      {owner.firstName?.[0]}{owner.lastName?.[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900 text-sm">{owner.firstName} {owner.lastName}</h3>
                        <span className={`h-1.5 w-1.5 rounded-full ${owner.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">@{owner.username}</p>
                    </div>
                  </div>
                  <span className={`admin-pill ${owner.currentBillingStatus || 'pending'}`}>
                    {owner.currentBillingStatus || 'pending'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Portfolio</p>
                    <p className="text-sm font-black text-slate-900">{owner.propertyCount || 0} Units</p>
                  </div>
                  <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Team Size</p>
                    <p className="text-sm font-black text-slate-900">{owner.staffCount || 0} Staff</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{owner.contact}</p>
                  <button 
                    onClick={() => openOwner(owner.id)}
                    className="admin-button-primary !py-1.5 !px-5 !rounded-lg text-[10px] uppercase tracking-widest"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Table */}
        <div className="hidden lg:block overflow-hidden bg-white rounded-xl border border-slate-100 shadow-sm">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Owner Name</th>
                <th>Username</th>
                <th>Contact Info</th>
                <th>Portfolio</th>
                <th>Staff</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 font-medium">Loading owners...</td>
                </tr>
              ) : owners.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400 font-medium">No owners found</td>
                </tr>
              ) : (
                owners.map((owner) => (
                  <tr key={owner.id} className="admin-table-row group">
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center font-bold text-slate-400 text-[10px] group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                          {owner.firstName?.[0]}{owner.lastName?.[0]}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 leading-tight">{owner.firstName} {owner.lastName}</span>
                          <span className={`h-1.5 w-1.5 rounded-full ${owner.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} title={owner.status} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                        @{owner.username}
                      </span>
                    </td>
                    <td className="text-slate-600 font-medium">{owner.contact}</td>
                    <td>
                      <div className="flex items-center gap-2">
                         <span className="inline-flex h-6 items-center px-2 rounded-lg bg-blue-50 text-[10px] font-bold text-blue-600">
                           {owner.propertyCount || 0}
                         </span>
                         <span className="text-[9px] font-bold text-slate-400 uppercase">Units</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                         <span className="inline-flex h-6 items-center px-2 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-600">
                           {owner.staffCount || 0}
                         </span>
                         <span className="text-[9px] font-bold text-slate-400 uppercase">Team</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <button 
                        onClick={() => openOwner(owner.id)}
                        className="admin-button-primary !py-1 !px-4 !rounded-lg text-[10px] uppercase tracking-widest inline-flex"
                      >
                        View Profile
                      </button>
                    </td>
                  </tr>
                ) )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOwner && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Owner Profile</p>
                <h3 className="mt-2 text-xl font-semibold">
                  {selectedOwnerSummary?.firstName} {selectedOwnerSummary?.lastName}
                </h3>
                <p className="text-sm text-slate-500">{selectedOwnerSummary?.contact}</p>
              </div>
              <button onClick={closeOwner} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>

            {detailsLoading ? (
              <div className="py-20 text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Records...</p>
              </div>
            ) : details ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
                <div className="space-y-6">
                  {/* Portfolio Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between ml-1">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Properties & Units</h4>
                      <button 
                        onClick={() => setShowAddProperty(!showAddProperty)}
                        className="text-[9px] font-bold text-blue-600 uppercase tracking-widest hover:underline"
                      >
                        {showAddProperty ? 'Cancel' : '+ Add Property'}
                      </button>
                    </div>

                    {showAddProperty && (
                      <div className="admin-card !bg-blue-50/30 border-blue-100 !p-5 admin-fade">
                        <h5 className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4 text-center">New Property Details</h5>
                        <form onSubmit={createProperty} className="grid gap-3 sm:grid-cols-2">
                          <input
                            required
                            placeholder="Property Name"
                            className="admin-input sm:col-span-2"
                            value={propertyForm.name}
                            onChange={(e) => setPropertyForm(prev => ({ ...prev, name: e.target.value }))}
                          />
                          <input
                            required
                            placeholder="Address"
                            className="admin-input sm:col-span-2"
                            value={propertyForm.address}
                            onChange={(e) => setPropertyForm(prev => ({ ...prev, address: e.target.value }))}
                          />
                          <input
                            placeholder="City"
                            className="admin-input"
                            value={propertyForm.city}
                            onChange={(e) => setPropertyForm(prev => ({ ...prev, city: e.target.value }))}
                          />
                          <input
                            placeholder="Country"
                            className="admin-input"
                            value={propertyForm.country}
                            onChange={(e) => setPropertyForm(prev => ({ ...prev, country: e.target.value }))}
                          />
                          <input
                            placeholder="Phone"
                            className="admin-input"
                            value={propertyForm.phone}
                            onChange={(e) => setPropertyForm(prev => ({ ...prev, phone: e.target.value }))}
                          />
                          <input
                            type="email"
                            placeholder="Email"
                            className="admin-input"
                            value={propertyForm.email}
                            onChange={(e) => setPropertyForm(prev => ({ ...prev, email: e.target.value }))}
                          />
                          <button 
                            type="submit" 
                            disabled={saving}
                            className="admin-button-primary sm:col-span-2 !h-10 mt-2"
                          >
                            {saving ? 'Creating...' : 'Initialize Property'}
                          </button>
                        </form>
                      </div>
                    )}

                    <div className="grid gap-4">
                      {details.properties.length === 0 ? (
                        <div className="admin-card !bg-slate-50/50 border-dashed py-8 text-center text-xs text-slate-400">No properties found.</div>
                      ) : (
                        details.properties.map((property) => (
                          <div key={property.id} className="admin-card !p-0 group hover:border-blue-200 overflow-hidden">
                            <div className="p-4 bg-slate-50/50 border-b border-slate-50">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                  </div>
                                  <div>
                                    <p className="text-sm font-black text-slate-900 leading-tight">{property.name}</p>
                                    <p className="text-[10px] font-medium text-slate-400">{property.address}, {property.city}</p>
                                  </div>
                                </div>
                                <span className={`admin-pill ${property.status}`}>{property.status}</span>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">{property.phone || 'No Contact'}</p>
                                <button
                                  onClick={() => togglePropertyStatus(property.id, property.status === 'active' ? 'blocked' : 'active')}
                                  className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg transition-all ${
                                    property.status === 'active' 
                                      ? 'text-rose-600 bg-rose-50 hover:bg-rose-100' 
                                      : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'
                                  }`}
                                >
                                  {property.status === 'active' ? 'Block' : 'Unblock'}
                                </button>
                              </div>
                            </div>

                            {/* Rooms List */}
                            <div className="p-4 bg-white">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                Rooms & Inventory ({property.rooms?.length || 0})
                              </p>
                              <div className="grid gap-2">
                                {property.rooms?.length === 0 ? (
                                  <p className="text-[10px] italic text-slate-400">No rooms initialized for this property.</p>
                                ) : (
                                  property.rooms.map(room => (
                                    <div key={room.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50/50 border border-slate-100">
                                      <div className="flex items-center gap-2">
                                        <div className={`h-1.5 w-1.5 rounded-full ${room.status === 'available' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                        <div>
                                          <p className="text-[11px] font-bold text-slate-900 leading-none">{room.name}</p>
                                          <p className="text-[9px] font-medium text-slate-400 uppercase mt-0.5">{room.type}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[10px] font-black text-blue-600">{formatMoney(room.price)}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase">per night</p>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Staff Section */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assigned Team</h4>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {details.staff.length === 0 ? (
                        <div className="col-span-full admin-card !bg-slate-50/50 border-dashed py-6 text-center text-xs text-slate-400">No staff members assigned.</div>
                      ) : (
                        details.staff.map((staff) => (
                          <div key={staff.id} className="admin-card !p-3 bg-slate-50/30">
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-full bg-white border border-slate-100 flex items-center justify-center text-[9px] font-bold text-slate-400">
                                {staff.firstName?.[0]}{staff.lastName?.[0]}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold text-slate-900 truncate">{staff.firstName} {staff.lastName}</p>
                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">@{staff.username}</p>
                              </div>
                              <span className={`h-1.5 w-1.5 rounded-full ${staff.status === 'blocked' ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* Financial Status Summary */}
                  <div className="admin-card !p-4 bg-slate-900 text-white shadow-xl shadow-blue-900/10">
                    <p className="text-[9px] font-bold text-blue-300 uppercase tracking-[0.2em] mb-4">Financial Status</p>
                    {details.currentBilling ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">Current Month</span>
                           <span className={`admin-pill ${details.currentBilling.status} !bg-white/10 !text-white !ring-white/20`}>{details.currentBilling.status}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-bold text-blue-300 uppercase mb-1">Total Due</p>
                            <p className="text-base font-black tracking-tight">{formatMoney(details.currentBilling.amountDue)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-blue-300 uppercase mb-1">Collected</p>
                            <p className="text-base font-black tracking-tight text-emerald-400">{formatMoney(details.currentBilling.amountPaid)}</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="py-4 text-center border border-white/10 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No active billings</p>
                      </div>
                    )}
                  </div>

                  {/* Access Control Form */}
                  <div className="admin-card !p-5">
                    <h4 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest mb-4">Access Control</h4>
                    <form onSubmit={updateOwner} className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Username</label>
                        <input
                          value={editForm.username}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
                          className="admin-input"
                          placeholder="Username"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Email Address</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                          className="admin-input"
                          placeholder="Email"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Reset Password</label>
                        <input
                          type="password"
                          value={editForm.password}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                          className="admin-input"
                          placeholder="New password"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Account Status</label>
                        <select
                          value={editForm.status}
                          onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                          className="admin-input"
                        >
                          <option value="active">Active</option>
                          <option value="blocked">Blocked</option>
                        </select>
                      </div>
                      <button type="submit" disabled={saving} className="admin-button-primary w-full mt-2">
                        {saving ? 'Updating...' : 'Save Changes'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-20 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">No details available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
