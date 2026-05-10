import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'

function formatMoney(value) {
  const number = Number(value || 0)
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const statusOptions = ['all', 'pending', 'partial', 'paid', 'overdue']

export default function AdminPayments() {
  const [tab, setTab] = useState('history')
  const [filters, setFilters] = useState({
    q: '',
    status: 'all',
    year: '',
    month: '',
    day: '',
    startDate: '',
    endDate: '',
  })
  const [billing, setBilling] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedBilling, setSelectedBilling] = useState(null)
  const [manualForm, setManualForm] = useState({ amount: '', method: 'bank', note: '', paidAt: '' })
  const [historyOwner, setHistoryOwner] = useState(null)
  const [historyItems, setHistoryItems] = useState([])
  const [approvalItems, setApprovalItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const queryParams = useMemo(() => {
    const params = {}
    if (filters.q) params.q = filters.q
    if (filters.status && filters.status !== 'all') params.status = filters.status
    if (filters.year) params.year = filters.year
    if (filters.month) params.month = filters.month
    if (filters.day) params.day = filters.day
    if (filters.startDate) params.startDate = filters.startDate
    if (filters.endDate) params.endDate = filters.endDate
    return params
  }, [filters])

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      api.get('/admin/billing', { params: queryParams }),
      api.get('/admin/billing/summary', { params: queryParams }),
    ])
      .then(([billingRes, summaryRes]) => {
        if (!active) return
        setBilling(billingRes.data.data || [])
        setSummary(summaryRes.data.data || null)
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setError(err.response?.data?.message || 'Failed to load billing data')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [queryParams, refreshKey])

  useEffect(() => {
    let active = true
    if (tab !== 'approval') return undefined
    api
      .get('/admin/owner-payments', { params: { status: 'pending' } })
      .then((res) => {
        if (!active) return
        setApprovalItems(res.data.data || [])
      })
      .catch(() => {
        if (!active) return
        setApprovalItems([])
      })
    return () => {
      active = false
    }
  }, [tab])

  const resetFilters = () => {
    setFilters({ q: '', status: 'all', year: '', month: '', day: '', startDate: '', endDate: '' })
  }

  const openManualPayment = (row) => {
    setSelectedBilling(row)
    setManualForm({ amount: '', method: 'bank', note: '', paidAt: '' })
  }

  const submitManualPayment = async (e) => {
    e.preventDefault()
    if (!selectedBilling) return
    setSaving(true)
    try {
      await api.post('/admin/owner-payments', {
        ownerId: selectedBilling.ownerId,
        billingId: selectedBilling.id,
        amount: manualForm.amount,
        method: manualForm.method,
        note: manualForm.note || undefined,
        paidAt: manualForm.paidAt || undefined,
        status: 'approved',
      })
      setSelectedBilling(null)
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add payment')
    } finally {
      setSaving(false)
    }
  }

  const openHistory = async (ownerId) => {
    setHistoryOwner(ownerId)
    try {
      const res = await api.get(`/admin/owners/${ownerId}/payments`)
      setHistoryItems(res.data.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load history')
    }
  }

  const updateApprovalStatus = async (paymentId, status) => {
    try {
      await api.patch(`/admin/owner-payments/${paymentId}/status`, { status })
      setApprovalItems((prev) => prev.filter((item) => item.id !== paymentId))
      setRefreshKey((prev) => prev + 1)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update payment')
    }
  }

  const paidCount = summary?.paidCount || 0
  const unpaidCount = summary?.unpaidCount || 0

  return (
    <div className="space-y-6">
      <div className="admin-hero-card">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Payments</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">Owner Billing</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Track payments due, add manual payments, and approve pending proofs.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setTab('history')}
            className={`admin-tab ${tab === 'history' ? 'active' : ''}`}
          >
            Payment History
          </button>
          <button
            onClick={() => setTab('approval')}
            className={`admin-tab ${tab === 'approval' ? 'active' : ''}`}
          >
            Payment Approval
          </button>
        </div>
      </div>

      {error && <div className="admin-alert">{error}</div>}

      {tab === 'history' && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="admin-metric">
              <p>Total paid</p>
              <h3>{formatMoney(summary?.totalPaid)}</h3>
            </div>
            <div className="admin-metric">
              <p>Total due</p>
              <h3>{formatMoney(summary?.totalDue)}</h3>
            </div>
            <div className="admin-metric">
              <p>Paid owners</p>
              <h3>{paidCount}</h3>
            </div>
            <div className="admin-metric">
              <p>Unpaid owners</p>
              <h3>{unpaidCount}</h3>
            </div>
          </div>

          <div className="admin-card">
            <div className="grid gap-3 md:grid-cols-3">
              <input
                className="admin-input"
                placeholder="Search owner name or contact"
                value={filters.q}
                onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
              />
              <select
                className="admin-input"
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All statuses' : status}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-3 gap-2">
                <input
                  className="admin-input"
                  placeholder="Year"
                  value={filters.year}
                  onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}
                />
                <input
                  className="admin-input"
                  placeholder="Month"
                  value={filters.month}
                  onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))}
                />
                <input
                  className="admin-input"
                  placeholder="Day"
                  value={filters.day}
                  onChange={(e) => setFilters((prev) => ({ ...prev, day: e.target.value }))}
                />
              </div>
              <input
                type="date"
                className="admin-input"
                value={filters.startDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
              />
              <input
                type="date"
                className="admin-input"
                value={filters.endDate}
                onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
              />
              <button className="admin-button-secondary" onClick={resetFilters}>
                Reset filters
              </button>
            </div>
          </div>

          <div className="admin-card">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Owner Payments</h2>
              <span className="text-sm text-slate-400">{billing.length} records</span>
            </div>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase tracking-widest text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3">Paid</th>
                    <th className="px-4 py-3">Left</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/80">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                        Loading billing...
                      </td>
                    </tr>
                  ) : billing.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-4 py-8 text-center text-slate-400">
                        No billing records
                      </td>
                    </tr>
                  ) : (
                    billing.map((row) => {
                      const left = Number(row.amountDue || 0) - Number(row.amountPaid || 0)
                      return (
                        <tr key={row.id}>
                          <td className="px-4 py-4">
                            <div className="font-semibold text-slate-900">
                              {row.firstName} {row.lastName}
                            </div>
                            <div className="text-xs text-slate-500">{row.contact}</div>
                          </td>
                          <td className="px-4 py-4 text-slate-600">
                            {row.periodStart} → {row.periodEnd}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`admin-pill ${row.status}`}>{row.status}</span>
                          </td>
                          <td className="px-4 py-4 text-slate-600">{formatMoney(row.amountDue)}</td>
                          <td className="px-4 py-4 text-slate-600">{formatMoney(row.amountPaid)}</td>
                          <td className="px-4 py-4 text-slate-600">{formatMoney(left)}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <button className="admin-button-secondary" onClick={() => openManualPayment(row)}>
                                Add payment
                              </button>
                              <button className="admin-button-ghost" onClick={() => openHistory(row.ownerId)}>
                                History
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'approval' && (
        <div className="admin-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pending Approvals</h2>
            <span className="text-sm text-slate-400">{approvalItems.length} pending</span>
          </div>
          <div className="mt-4 space-y-3">
            {approvalItems.length === 0 ? (
              <p className="text-sm text-slate-400">No pending payments.</p>
            ) : (
              approvalItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.firstName} {item.lastName}
                      </p>
                      <p className="text-xs text-slate-500">{item.contact}</p>
                    </div>
                    <div className="text-sm text-slate-700">{formatMoney(item.amount)}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>{item.method}</span>
                    {item.proofUrl && (
                      <a href={item.proofUrl} className="underline" target="_blank" rel="noreferrer">
                        View proof
                      </a>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="admin-button-primary"
                      onClick={() => updateApprovalStatus(item.id, 'approved')}
                    >
                      Approve
                    </button>
                    <button
                      className="admin-button-secondary"
                      onClick={() => updateApprovalStatus(item.id, 'rejected')}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {selectedBilling && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add Manual Payment</h3>
              <button onClick={() => setSelectedBilling(null)} className="text-sm text-slate-400 hover:text-white">
                Close
              </button>
            </div>
            <form onSubmit={submitManualPayment} className="mt-4 space-y-3">
              <input
                className="admin-input"
                value={manualForm.amount}
                onChange={(e) => setManualForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="Amount"
                type="number"
                step="0.01"
                required
              />
              <select
                className="admin-input"
                value={manualForm.method}
                onChange={(e) => setManualForm((prev) => ({ ...prev, method: e.target.value }))}
              >
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
              </select>
              <input
                className="admin-input"
                value={manualForm.paidAt}
                onChange={(e) => setManualForm((prev) => ({ ...prev, paidAt: e.target.value }))}
                type="date"
              />
              <input
                className="admin-input"
                value={manualForm.note}
                onChange={(e) => setManualForm((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Note"
              />
              <button className="admin-button-primary" type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Add Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {historyOwner && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Payment History</h3>
              <button onClick={() => setHistoryOwner(null)} className="text-sm text-slate-400 hover:text-white">
                Close
              </button>
            </div>
            <div className="mt-4 space-y-3">
              {historyItems.length === 0 ? (
                <p className="text-sm text-slate-400">No payments yet.</p>
              ) : (
                historyItems.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-800/60 bg-slate-950/70 p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span>{formatMoney(item.amount)}</span>
                      <span className={`admin-pill ${item.status}`}>{item.status}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">Paid at: {item.paidAt || '—'}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
