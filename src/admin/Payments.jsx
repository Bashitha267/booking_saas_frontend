import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'

function formatMoney(value) {
  const number = Number(value || 0)
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const statusOptions = ['all', 'pending', 'partial', 'paid', 'overdue']

const PAGE_SIZE = 10

function getCurrentMonthFilters() {
  const now = new Date()
  return {
    q: '',
    status: 'all',
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, '0'),
    day: '',
    startDate: '',
    endDate: '',
  }
}

function formatPeriodLabel(filters) {
  if (filters.startDate || filters.endDate) {
    return `${filters.startDate || 'Start'} -> ${filters.endDate || 'End'}`
  }
  if (filters.year && filters.month) {
    const year = Number(filters.year)
    const month = Number(filters.month)
    if (!Number.isNaN(year) && !Number.isNaN(month)) {
      const lastDay = new Date(year, month, 0).getDate()
      const monthLabel = String(month).padStart(2, '0')
      return `${year}-${monthLabel}-01 -> ${year}-${monthLabel}-${String(lastDay).padStart(2, '0')}`
    }
  }
  return 'Current period'
}

export default function AdminPayments() {
  const [tab, setTab] = useState('history')
  const [filters, setFilters] = useState(() => getCurrentMonthFilters())
  const [billing, setBilling] = useState([])
  const [owners, setOwners] = useState([])
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)
  const [ownersLoading, setOwnersLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedBilling, setSelectedBilling] = useState(null)
  const [manualForm, setManualForm] = useState({ amount: '', method: 'bank', note: '', paidAt: '' })
  const [historyOwner, setHistoryOwner] = useState(null)
  const [historyItems, setHistoryItems] = useState([])
  const [approvalItems, setApprovalItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [page, setPage] = useState(1)

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
    setOwnersLoading(true)
    api
      .get('/admin/owners', { params: { q: filters.q || undefined } })
      .then((res) => {
        if (!active) return
        setOwners(res.data.data || [])
      })
      .catch((err) => {
        if (!active) return
        setError(err.response?.data?.message || 'Failed to load owners')
      })
      .finally(() => {
        if (!active) return
        setOwnersLoading(false)
      })
    return () => {
      active = false
    }
  }, [filters.q, refreshKey])

  useEffect(() => {
    setPage(1)
  }, [filters])

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
    setFilters(getCurrentMonthFilters())
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
        billingId: selectedBilling.billingId || selectedBilling.id || undefined,
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
  const periodLabel = formatPeriodLabel(filters)

  const ownerRows = useMemo(() => {
    const billingMap = new Map()
    billing.forEach((record) => {
      if (!billingMap.has(record.ownerId)) {
        billingMap.set(record.ownerId, record)
      }
    })

    return owners.map((owner) => {
      const record = billingMap.get(owner.id)
      if (record) return { ...record, ownerName: `${owner.firstName} ${owner.lastName}` }
      return {
        ownerId: owner.id,
        firstName: owner.firstName,
        lastName: owner.lastName,
        contact: owner.contact,
        status: 'pending',
        amountDue: 0,
        amountPaid: 0,
        periodStart: '',
        periodEnd: '',
      }
    })
  }, [owners, billing])

  const totalPages = Math.max(1, Math.ceil(ownerRows.length / PAGE_SIZE))
  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return ownerRows.slice(start, start + PAGE_SIZE)
  }, [ownerRows, page])

  return (
    <div className="space-y-8">
      <div className="admin-hero-card">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Financials</p>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">Owner Billing</h1>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setTab('history')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Billing History
            </button>
            <button
              onClick={() => setTab('approval')}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                tab === 'approval' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Pending Approvals
            </button>
          </div>
        </div>
      </div>

      {error && <div className="admin-alert">{error}</div>}

      {tab === 'history' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="admin-metric group">
              <p>Total Revenue (Paid)</p>
              <h3 className="text-emerald-600">{formatMoney(summary?.totalPaid)}</h3>
              <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-full" />
              </div>
            </div>
            <div className="admin-metric">
              <p>Outstanding Debt</p>
              <h3 className="text-rose-600">{formatMoney(summary?.totalDue)}</h3>
              <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 w-[40%]" />
              </div>
            </div>
            <div className="admin-metric">
              <p>Settled Owners</p>
              <h3>{paidCount}</h3>
            </div>
            <div className="admin-metric">
              <p>Unpaid Owners</p>
              <h3>{unpaidCount}</h3>
            </div>
          </div>

          <div className="admin-filter-bar">
            <div className="flex flex-wrap items-end gap-3">
              <div className="admin-filter-group flex-1 min-w-[180px]">
                <label className="admin-filter-label">Search</label>
                <div className="relative">
                  <input
                    className="admin-filter-input w-full pl-9"
                    placeholder="ID, Owner or Contact..."
                    value={filters.q}
                    onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
                  />
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              <div className="admin-filter-group w-32">
                <label className="admin-filter-label">From Date</label>
                <input
                  type="date"
                  className="admin-filter-input"
                  value={filters.startDate}
                  onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
                />
              </div>

              <div className="admin-filter-group w-32">
                <label className="admin-filter-label">To Date</label>
                <input
                  type="date"
                  className="admin-filter-input"
                  value={filters.endDate}
                  onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
                />
              </div>

              <div className="admin-filter-group w-20">
                <label className="admin-filter-label">Month</label>
                <input
                  className="admin-filter-input text-center"
                  placeholder="MM"
                  value={filters.month}
                  onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))}
                />
              </div>

              <div className="admin-filter-group w-24">
                <label className="admin-filter-label">Year</label>
                <input
                  className="admin-filter-input text-center"
                  placeholder="YYYY"
                  value={filters.year}
                  onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))}
                />
              </div>

              <div className="admin-filter-group w-36">
                <label className="admin-filter-label">Status</label>
                <select
                  className="admin-filter-input"
                  value={filters.status}
                  onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status === 'all' ? 'All Statuses' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pb-0.5">
                <button className="admin-filter-btn-reset" onClick={resetFilters} title="Reset Filters">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
             {/* Mobile View: Cards */}
             <div className="grid gap-4 lg:hidden">
                {loading || ownersLoading ? (
                  <div className="py-12 text-center text-slate-400 font-medium">Loading payments...</div>
                ) : pagedRows.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 font-medium">No records found</div>
                ) : (
                  pagedRows.map((row) => {
                    const left = Number(row.amountDue || 0) - Number(row.amountPaid || 0)
                    const hasBilling = Boolean(row.id)
                    const periodText = hasBilling && row.periodStart ? `${row.periodStart} → ${row.periodEnd}` : periodLabel
                    return (
                      <div key={row.id || row.ownerId} className="admin-card !p-5">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-bold text-slate-900">{row.firstName} {row.lastName}</h3>
                            <p className="text-xs font-medium text-slate-400">{row.contact}</p>
                          </div>
                          <span className={`admin-pill ${row.status}`}>{row.status}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-4 mb-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Billing Period</p>
                          <p className="text-sm font-bold text-slate-700">{periodText}</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                           <div className="text-center">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Due</p>
                              <p className="text-xs font-bold text-slate-900">{formatMoney(row.amountDue)}</p>
                           </div>
                           <div className="text-center border-x border-slate-200 px-1">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Paid</p>
                              <p className="text-xs font-bold text-emerald-600">{formatMoney(row.amountPaid)}</p>
                           </div>
                           <div className="text-center">
                              <p className="text-[9px] font-bold text-slate-400 uppercase">Left</p>
                              <p className="text-xs font-bold text-rose-600">{formatMoney(left)}</p>
                           </div>
                        </div>
                        <div className="flex gap-2 pt-4 border-t border-slate-100">
                          <button
                            className="flex-1 admin-button-primary !py-2"
                            onClick={() => openManualPayment({ ownerId: row.ownerId, billingId: row.id || null, ownerName: `${row.firstName} ${row.lastName}` })}
                          >
                            Add Payment
                          </button>
                          <button className="admin-button-secondary !py-2" onClick={() => openHistory(row.ownerId)}>
                            History
                          </button>
                        </div>
                      </div>
                    )
                  })
                )}
             </div>

              <div className="hidden lg:block overflow-hidden bg-white rounded-xl border border-slate-100 shadow-sm">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Owner</th>
                      <th>Billing Period</th>
                      <th>Status</th>
                      <th>Due</th>
                      <th>Paid</th>
                      <th>Remaining</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading || ownersLoading ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-slate-400 font-medium">Loading...</td>
                      </tr>
                    ) : pagedRows.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="py-8 text-center text-slate-400 font-medium">No owners found</td>
                      </tr>
                    ) : (
                      pagedRows.map((row) => {
                        const left = Number(row.amountDue || 0) - Number(row.amountPaid || 0)
                        const hasBilling = Boolean(row.id)
                        const periodText = hasBilling && row.periodStart ? `${row.periodStart} → ${row.periodEnd}` : periodLabel
                        return (
                          <tr key={row.id || row.ownerId} className="admin-table-row">
                            <td className="font-bold text-slate-900">
                              <div>{row.firstName} {row.lastName}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{row.contact}</div>
                            </td>
                            <td className="text-slate-600">{periodText}</td>
                            <td>
                              <span className={`admin-pill ${row.status}`}>{row.status}</span>
                            </td>
                            <td className="font-bold text-slate-900">{formatMoney(row.amountDue)}</td>
                            <td className="font-bold text-emerald-600">{formatMoney(row.amountPaid)}</td>
                            <td className="font-bold text-rose-600">{formatMoney(left)}</td>
                            <td>
                              <div className="flex items-center gap-2">
                                <button
                                  className="admin-button-primary !px-3 !py-1"
                                  onClick={() => openManualPayment({ ownerId: row.ownerId, billingId: row.id || null, ownerName: `${row.firstName} ${row.lastName}` })}
                                >
                                  Pay
                                </button>
                                <button className="admin-button-secondary !px-3 !py-1" onClick={() => openHistory(row.ownerId)}>
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

             <div className="flex items-center justify-between gap-4 py-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Page <span className="text-slate-900">{page}</span> of {totalPages}
                </p>
                <div className="flex gap-2">
                  <button
                    className="admin-button-secondary !py-2 !px-4"
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  <button
                    className="admin-button-secondary !py-2 !px-4"
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </button>
                </div>
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
          <div className="admin-modal max-w-md !p-0 overflow-hidden">
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Payment</h3>
                <p className="text-[10px] font-medium text-slate-500">For {selectedBilling.ownerName}</p>
              </div>
              <button onClick={() => setSelectedBilling(null)} className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm transition-all flex items-center justify-center text-slate-400 hover:text-slate-900">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <form onSubmit={submitManualPayment} className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'bank', label: 'Bank Transfer', icon: 'M3 10h18M7 15h1m4 0h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
                    { id: 'cash', label: 'Cash Payment', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                    { id: 'card', label: 'Credit Card', icon: 'M3 10h18M7 15h1m4 0h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' }
                  ].map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setManualForm(prev => ({ ...prev, method: method.id }))}
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all ${
                        manualForm.method === method.id 
                          ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-500/20' 
                          : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-white hover:border-slate-200'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={method.icon} /></svg>
                      <span className="text-[10px] font-bold uppercase">{method.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rs.</span>
                    <input
                      className="admin-input !pl-10 !h-11 !rounded-xl font-bold text-slate-900"
                      value={manualForm.amount}
                      onChange={(e) => setManualForm((prev) => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      type="number"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Date</label>
                  <input
                    className="admin-input !h-11 !rounded-xl"
                    value={manualForm.paidAt}
                    onChange={(e) => setManualForm((prev) => ({ ...prev, paidAt: e.target.value }))}
                    type="date"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 ml-1">Note / Reference</label>
                <textarea
                  className="admin-input !h-20 !py-3 !rounded-xl resize-none"
                  value={manualForm.note}
                  onChange={(e) => setManualForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Enter transaction details..."
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setSelectedBilling(null)}
                  className="flex-1 admin-button-secondary !h-11 !rounded-xl"
                >
                  Cancel
                </button>
                <button 
                  className="flex-[2] admin-button-primary !h-11 !rounded-xl" 
                  type="submit" 
                  disabled={saving}
                >
                  {saving ? 'Processing...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {historyOwner && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal max-w-lg !p-0 overflow-hidden">
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Payment History</h3>
                <p className="text-[10px] font-medium text-slate-500">Transaction logs for this owner</p>
              </div>
              <button onClick={() => setHistoryOwner(null)} className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm transition-all flex items-center justify-center text-slate-400 hover:text-slate-900">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-0">
              {historyItems.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 text-slate-300 mb-3">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No transactions found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyItems.map((item) => (
                        <tr key={item.id} className="admin-table-row">
                          <td className="whitespace-nowrap font-bold text-slate-900">
                            {item.paidAt ? new Date(item.paidAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="font-bold text-blue-600">
                            {formatMoney(item.amount)}
                          </td>
                          <td>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase text-slate-400">{item.method || 'Bank'}</span>
                            </div>
                          </td>
                          <td>
                            <span className={`admin-pill ${item.status || 'approved'}`}>
                              {item.status || 'approved'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 flex justify-end">
              <button 
                onClick={() => setHistoryOwner(null)}
                className="admin-button-secondary !py-1.5 !px-4"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
