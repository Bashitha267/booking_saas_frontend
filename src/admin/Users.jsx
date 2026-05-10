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
    <div className="space-y-6">
      <div className="admin-hero-card">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Owners</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">Owner Directory</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Search across owners, properties, and staff. Click any row to view properties, staff, and billing status.
          </p>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search owner, property, staff, or contact"
            className="admin-input"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="admin-input"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="blocked">Blocked</option>
          </select>
        </div>
      </div>

      {error && <div className="admin-alert">{error}</div>}

      <div className="admin-card">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Owners</h2>
          <span className="text-sm text-slate-400">{owners.length} total</span>
        </div>
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">Owner</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Properties</th>
                <th className="px-4 py-3">Staff</th>
                <th className="px-4 py-3">Billing</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/80">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-slate-400">
                    Loading owners...
                  </td>
                </tr>
              ) : owners.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-slate-400">
                    No owners found
                  </td>
                </tr>
              ) : (
                owners.map((owner) => (
                  <tr
                    key={owner.id}
                    onClick={() => openOwner(owner.id)}
                    className="cursor-pointer transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">
                        {owner.firstName} {owner.lastName}
                      </div>
                      <div className="text-xs text-slate-500">@{owner.username}</div>
                    </td>
                    <td className="px-4 py-4 text-slate-600">{owner.contact}</td>
                    <td className="px-4 py-4 text-slate-600">{owner.propertyCount || 0}</td>
                    <td className="px-4 py-4 text-slate-600">{owner.staffCount || 0}</td>
                    <td className="px-4 py-4">
                      <span className={`admin-pill ${owner.currentBillingStatus || 'pending'}`}>
                        {owner.currentBillingStatus || 'pending'}
                      </span>
                      <div className="text-xs text-slate-500">Due {formatMoney(owner.currentAmountDue)}</div>
                    </td>
                  </tr>
                ))
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
              <div className="py-10 text-center text-slate-400">Loading details...</div>
            ) : details ? (
              <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  <div className="admin-card">
                    <h4 className="text-sm font-semibold text-slate-200">Properties</h4>
                    <div className="mt-3 space-y-3">
                      {details.properties.length === 0 ? (
                        <p className="text-sm text-slate-500">No properties yet.</p>
                      ) : (
                        details.properties.map((property) => (
                          <div
                            key={property.id}
                            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{property.name}</p>
                                <p className="text-xs text-slate-500">{property.address}</p>
                              </div>
                              <span className={`admin-pill ${property.status}`}>{property.status}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-slate-500">
                              <span>{property.phone || 'No phone'}</span>
                              <button
                                onClick={() =>
                                  togglePropertyStatus(property.id, property.status === 'active' ? 'blocked' : 'active')
                                }
                                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:border-slate-300"
                              >
                                {property.status === 'active' ? 'Block access' : 'Unblock'}
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="admin-card">
                    <h4 className="text-sm font-semibold text-slate-200">Staff</h4>
                    <div className="mt-3 space-y-3">
                      {details.staff.length === 0 ? (
                        <p className="text-sm text-slate-500">No staff assigned.</p>
                      ) : (
                        details.staff.map((staff) => (
                          <div key={staff.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {staff.firstName} {staff.lastName}
                                </p>
                                <p className="text-xs text-slate-500">@{staff.username}</p>
                              </div>
                              <span className={`admin-pill ${staff.status || 'active'}`}>{staff.status || 'active'}</span>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">{staff.contact}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="admin-card">
                    <h4 className="text-sm font-semibold text-slate-200">Current Month Billing</h4>
                    {details.currentBilling ? (
                      <div className="mt-4 space-y-2 text-sm text-slate-600">
                        <div className="flex justify-between">
                          <span>Status</span>
                          <span className={`admin-pill ${details.currentBilling.status}`}>{details.currentBilling.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Amount due</span>
                          <span>{formatMoney(details.currentBilling.amountDue)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Amount paid</span>
                          <span>{formatMoney(details.currentBilling.amountPaid)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-slate-500">No billing record for this month.</p>
                    )}
                  </div>

                  <div className="admin-card">
                    <h4 className="text-sm font-semibold text-slate-200">Edit Owner Access</h4>
                    <form onSubmit={updateOwner} className="mt-4 space-y-3">
                      <input
                        value={editForm.username}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
                        className="admin-input"
                        placeholder="Username"
                      />
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="admin-input"
                        placeholder="Email"
                      />
                      <input
                        type="password"
                        value={editForm.password}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                        className="admin-input"
                        placeholder="New password"
                      />
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                        className="admin-input"
                      >
                        <option value="active">Active</option>
                        <option value="blocked">Blocked</option>
                      </select>
                      <button type="submit" disabled={saving} className="admin-button-primary">
                        {saving ? 'Saving...' : 'Update Owner'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400">No details available.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
