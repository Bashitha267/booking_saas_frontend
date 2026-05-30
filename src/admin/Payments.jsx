import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'
import { useToast } from '../components/Toast'

function formatMoney(value) {
  const number = Number(value || 0)
  return 'LKR ' + number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPeriodDate(value) {
  if (!value) return ''
  return value.split('T')[0]
}

const statusOptions = ['all', 'pending', 'partial', 'paid', 'promotions', 'overdue']
const PAGE_SIZE = 10
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getCurrentMonthFilters() {
  const now = new Date()
  return {
    q: '',
    status: 'all',
    year: String(now.getFullYear()),
    month: '', // Empty means all months
    day: '',
    startDate: '',
    endDate: '',
  }
}

function formatPeriodLabel(filters) {
  if (filters.startDate || filters.endDate) {
    return `${filters.startDate || 'Start'} → ${filters.endDate || 'End'}`
  }
  if (filters.year && filters.month) {
    const year = Number(filters.year)
    const month = Number(filters.month)
    if (!Number.isNaN(year) && !Number.isNaN(month)) {
      const lastDay = new Date(year, month, 0).getDate()
      const monthLabel = String(month).padStart(2, '0')
      return `${year}-${monthLabel}-01 → ${year}-${monthLabel}-${String(lastDay).padStart(2, '0')}`
    }
  }
  return 'Current period'
}

const defaultPayForm = {
  amount: '',
  method: 'bank',
  note: '',
  paidAt: new Date().toISOString().split('T')[0],
  isPromotion: false,
  billingCycle: 'monthly',
  periodStart: new Date().toISOString().slice(0, 7),
  periodEnd: '',
  discount: '',
}

function getMonthsCovered(form) {
  if (form.billingCycle === 'yearly') return 12;
  if (!form.periodStart) return 1;
  if (!form.periodEnd) return 1;
  
  const [sy, sm] = form.periodStart.split('-').map(Number);
  const [ey, em] = form.periodEnd.split('-').map(Number);
  
  if (!sy || !sm || !ey || !em) return 1;
  
  const diff = (ey - sy) * 12 + (em - sm);
  return diff >= 0 ? diff + 1 : 1;
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
  const [manualForm, setManualForm] = useState(defaultPayForm)
  const [historyOwner, setHistoryOwner] = useState(null)
  const [historyItems, setHistoryItems] = useState([])
  const [approvalItems, setApprovalItems] = useState([])
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [page, setPage] = useState(1)
  const [allPayments, setAllPayments] = useState([])
  const [globalFee, setGlobalFee] = useState(0)
  const { showToast, ToastComponent } = useToast()

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
      api.get('/admin/owner-payments', { params: { ...queryParams, status: 'approved' } }),
      api.get('/admin/settings'),
    ])
      .then(([billingRes, summaryRes, paymentsRes, settingsRes]) => {
        if (!active) return
        setBilling(billingRes.data.data || [])
        setSummary(summaryRes.data.data || null)
        setAllPayments(paymentsRes.data.data || [])
        const fee = settingsRes.data.data?.global_billing_amount
        setGlobalFee(fee ? Number(fee) : 0)
        setError('')
      })
      .catch((err) => {
        if (!active) return
        showToast(err.response?.data?.message || 'Failed to load billing data', 'error')
        setError(err.response?.data?.message || 'Failed to load billing data')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => { active = false }
  }, [queryParams, refreshKey])

  useEffect(() => {
    let active = true
    setOwnersLoading(true)
    api.get('/admin/owners', { params: { q: filters.q || undefined } })
      .then((res) => {
        if (!active) return
        setOwners(res.data.data || [])
      })
      .catch((err) => {
        if (!active) return
        showToast(err.response?.data?.message || 'Failed to load owners', 'error')
      })
      .finally(() => {
        if (!active) return
        setOwnersLoading(false)
      })
    return () => { active = false }
  }, [filters.q, refreshKey])

  useEffect(() => { setPage(1) }, [filters])

  useEffect(() => {
    let active = true
    if (tab !== 'approval') return undefined
    api.get('/admin/owner-payments', { params: { status: 'pending' } })
      .then((res) => {
        if (!active) return
        setApprovalItems(res.data.data || [])
      })
      .catch(() => {
        if (!active) return
        setApprovalItems([])
      })
    return () => { active = false }
  }, [tab])

  const resetFilters = () => setFilters(getCurrentMonthFilters())

  const openManualPayment = (row) => {
    setSelectedBilling(row)
    setModalError('')
    setManualForm({
      ...defaultPayForm,
      paidAt: new Date().toISOString().split('T')[0],
      periodStart: new Date().toISOString().slice(0, 7),
      periodEnd: '',
    })
  }

  // Calculate payment breakdown for preview
  const paymentBreakdown = useMemo(() => {
    if (!selectedBilling) return null
    const months = getMonthsCovered(manualForm)
    const basePrice = selectedBilling.ownerPackagePrice ?? globalFee
    const discount = Number(manualForm.discount || 0)
    if (manualForm.isPromotion) {
      return {
        type: 'promotion',
        months,
        waived: basePrice * months,
        label: `${months} month${months > 1 ? 's' : ''} FREE`,
      }
    }
    const total = basePrice * months - discount
    const perMonth = total / months
    return {
      type: 'payment',
      months,
      basePrice,
      discount,
      total,
      perMonth,
      cycle: manualForm.billingCycle,
    }
  }, [manualForm, selectedBilling, globalFee])

  const submitManualPayment = async (e) => {
    e.preventDefault()
    if (!selectedBilling) return

    const months = getMonthsCovered(manualForm)
    const basePrice = selectedBilling.ownerPackagePrice ?? globalFee
    const discount = Number(manualForm.discount || 0)
    const totalAmount = manualForm.isPromotion
      ? basePrice * months
      : basePrice * months - discount

    // Overpayment guard — skip check for promotions
    if (!manualForm.isPromotion) {
      const remaining = Number(selectedBilling.amountDue ?? 0) - Number(selectedBilling.amountPaid ?? 0)
      if (remaining > 0 && totalAmount > remaining + 0.005) {
        setModalError(
          `Payment of ${formatMoney(totalAmount)} exceeds the remaining balance of ${formatMoney(remaining)}. Please reduce the amount or discount.`
        )
        return
      }
      setModalError('')
    }

    // For promotions: compute periodEnd = last day of the selected start month.
    // CRITICAL: the server checks (isPromotion && periodStart && periodEnd) to enter
    // the promotion code path. Without periodEnd the server treats it as a normal payment.
    let periodEndValue = undefined
    if (manualForm.isPromotion && manualForm.periodStart) {
      const [py, pm] = manualForm.periodStart.split('-').map(Number)
      const lastDay = new Date(py, pm, 0).getDate() // day 0 of next month = last day of this month
      periodEndValue = `${manualForm.periodStart}-${String(lastDay).padStart(2, '0')}`
    }

    setSaving(true)
    try {
      await api.post('/admin/owner-payments', {
        ownerId: selectedBilling.ownerId,
        billingId: manualForm.isPromotion ? undefined : (selectedBilling.billingId || selectedBilling.id || undefined),
        amount: totalAmount,
        method: manualForm.method,
        note: manualForm.note || undefined,
        paidAt: manualForm.paidAt || undefined,
        status: 'approved',
        isPromotion: manualForm.isPromotion,
        billingCycle: manualForm.billingCycle,
        monthsCovered: months,
        discount: manualForm.isPromotion ? 0 : discount,
        periodStart: `${manualForm.periodStart}-01`,
        periodEnd: periodEndValue,
      })
      setRefreshKey(k => k + 1)
      setSelectedBilling(null)
      setManualForm(defaultPayForm)
      showToast(manualForm.isPromotion ? 'Promotion applied successfully' : 'Payment recorded successfully', 'success')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to record payment'
      setModalError(msg)
      showToast(msg, 'error')
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
      const msg = err.response?.data?.message || 'Failed to load history'
      setError(msg)
      showToast(msg, 'error')
    }
  }

  const deletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment record? This action cannot be undone.')) return
    
    try {
      await api.delete(`/admin/owner-payments/${paymentId}`)
      // Remove from UI history list
      setHistoryItems(prev => prev.filter(item => item.id !== paymentId))
      setRefreshKey(prev => prev + 1) // Refresh main tables to update "amountPaid"
      showToast('Payment deleted successfully', 'success')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete payment', 'error')
    }
  }

  const updateApprovalStatus = async (paymentId, status) => {
    try {
      await api.patch(`/admin/owner-payments/${paymentId}/status`, { status })
      setApprovalItems((prev) => prev.map(p => p.id === paymentId ? { ...p, status } : p))
      setRefreshKey(k => k + 1)
      showToast('Payment status updated', 'success')
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to update payment status', 'error')
    }
  }

  const periodLabel = formatPeriodLabel(filters)

  const ownerRows = useMemo(() => {
    const billingMap = new Map()
    billing.forEach((record) => {
      if (!billingMap.has(record.ownerId)) billingMap.set(record.ownerId, record)
    })
    const paymentsMap = new Map()
    allPayments.forEach((p) => {
      const current = paymentsMap.get(p.ownerId) || 0
      paymentsMap.set(p.ownerId, current + Number(p.amount))
    })
    return owners.map((owner) => {
      const record = billingMap.get(owner.id)
      const realPaid = paymentsMap.get(owner.id) || 0
      // Use the owner's real packagePrice from the owners endpoint (now returned by API)
      const ownerPrice = owner.packagePrice != null ? Number(owner.packagePrice) : globalFee
      if (record) {
        const isPromo = record.isPromotion === 1
        return {
          ...record,
          ownerName: `${owner.firstName} ${owner.lastName}`,
          amountPaid: Number(record.amountPaid || 0),
          status: isPromo ? 'promotion' : record.status,
          ownerPackagePrice: ownerPrice,
        }
      }
      const isPaid = realPaid >= ownerPrice && ownerPrice > 0
      return {
        ownerId: owner.id,
        firstName: owner.firstName,
        lastName: owner.lastName,
        contact: owner.contact,
        status: isPaid ? 'paid' : (realPaid > 0 ? 'partial' : 'pending'),
        amountDue: ownerPrice,
        amountPaid: realPaid,
        periodStart: '',
        periodEnd: '',
        ownerPackagePrice: ownerPrice,
      }
    })
  }, [owners, billing, allPayments, globalFee])

  const totalPages = Math.max(1, Math.ceil(ownerRows.length / PAGE_SIZE))
  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return ownerRows.slice(start, start + PAGE_SIZE)
  }, [ownerRows, page])

  const realTotalPaid = useMemo(() => ownerRows.reduce((acc, r) => acc + Number(r.amountPaid || 0), 0), [ownerRows])
  const realTotalDue = useMemo(() => ownerRows.reduce((acc, r) => acc + Math.max(0, Number(r.amountDue || 0) - Number(r.amountPaid || 0)), 0), [ownerRows])
  const realPaidCount = useMemo(() => ownerRows.filter(r => r.status === 'paid').length, [ownerRows])
  const realUnpaidCount = useMemo(() => ownerRows.filter(r => r.status !== 'paid').length, [ownerRows])

  const promoCount = Number(summary?.promotionCount || 0)
  const promoValue = Number(summary?.promotionValue || 0)

  return (
    <div className="space-y-8">
      <ToastComponent />
      <div className="admin-hero-card">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Financials</p>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">Owner Billing</h1>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            <button
              onClick={() => setTab('history')}
              className={`px-6 py-2.5 rounded-xl text-base font-bold transition-all ${tab === 'history' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Billing History
            </button>
            <button
              onClick={() => setTab('approval')}
              className={`px-6 py-2.5 rounded-xl text-base font-bold transition-all ${tab === 'approval' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Pending Approvals
            </button>
          </div>
        </div>
      </div>

      {error && <div className="admin-alert">{error}</div>}

      {tab === 'history' && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="admin-metric group">
              <p>Total Revenue</p>
              <h3 className="text-emerald-600">{formatMoney(realTotalPaid)}</h3>
              <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-full" />
              </div>
            </div>
            <div className="admin-metric">
              <p>Outstanding</p>
              <h3 className="text-rose-600">{formatMoney(realTotalDue)}</h3>
              <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-rose-500 w-[40%]" />
              </div>
            </div>
            <div className="admin-metric">
              <p>Settled Owners</p>
              <h3>{realPaidCount}</h3>
            </div>
            <div className="admin-metric">
              <p>Unpaid Owners</p>
              <h3>{realUnpaidCount}</h3>
            </div>
            <div className="admin-metric group border-violet-100 bg-violet-50/30">
              <p className="text-violet-600">Promotions Given</p>
              <h3 className="text-violet-600">{promoCount}</h3>
              <p className="text-xs font-bold text-violet-400 mt-1">{formatMoney(promoValue)} waived</p>
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
                <input type="date" className="admin-filter-input" value={filters.startDate} onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))} />
              </div>
              <div className="admin-filter-group w-32">
                <label className="admin-filter-label">To Date</label>
                <input type="date" className="admin-filter-input" value={filters.endDate} onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))} />
              </div>
              <div className="admin-filter-group w-32">
                <label className="admin-filter-label">Month</label>
                <select className="admin-filter-input" value={filters.month} onChange={(e) => setFilters((prev) => ({ ...prev, month: e.target.value }))}>
                  <option value="">All Months</option>
                  {MONTHS.map((m, i) => (
                    <option key={m} value={String(i + 1).padStart(2, '0')}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="admin-filter-group w-24">
                <label className="admin-filter-label">Year</label>
                <input className="admin-filter-input text-center" placeholder="YYYY" value={filters.year} onChange={(e) => setFilters((prev) => ({ ...prev, year: e.target.value }))} />
              </div>
              <div className="admin-filter-group w-36">
                <label className="admin-filter-label">Status</label>
                <select className="admin-filter-input" value={filters.status} onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}>
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}</option>
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
            {/* Mobile View */}
            <div className="grid gap-4 lg:hidden">
              {loading || ownersLoading ? (
                <div className="py-12 text-center text-slate-400 font-medium">Loading payments...</div>
              ) : pagedRows.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-medium">No records found</div>
              ) : (
                  pagedRows.map((row) => {
                  const left = Number(row.amountDue || 0) - Number(row.amountPaid || 0)
                  const hasBilling = Boolean(row.id)
                  const periodText = hasBilling && row.periodStart ? `${formatPeriodDate(row.periodStart)} → ${formatPeriodDate(row.periodEnd)}` : periodLabel
                  const isPromo = row.isPromotion === 1
                  return (
                    <div
                      key={row.id || row.ownerId}
                      className={`admin-card !p-5 border-l-4 transition-all ${
                        isPromo ? 'bg-violet-50/30 border-l-violet-400' :
                        row.status === 'paid' ? 'bg-emerald-50/30 border-l-emerald-500' :
                        row.status === 'partial' ? 'bg-amber-50/30 border-l-amber-500' :
                        'bg-rose-50/20 border-l-rose-500'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold text-slate-900">{row.firstName} {row.lastName}</h3>
                          <p className="text-sm font-medium text-slate-400">{row.contact}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isPromo && <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">Promotion</span>}
                          {row.billingCycle === 'yearly' && <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-600">Yearly</span>}
                          {!isPromo && <span className={`admin-pill ${row.status}`}>{row.status}</span>}
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-4 mb-4">
                        <p className="text-[13px] font-bold text-slate-400 uppercase mb-2">Billing Period</p>
                        <p className="text-base font-bold text-slate-700">{periodText}</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mb-4">
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-400 uppercase">Due</p>
                          <p className="text-sm font-bold text-slate-900">{formatMoney(row.amountDue)}</p>
                        </div>
                        <div className="text-center border-x border-slate-200 px-1">
                          <p className="text-xs font-bold text-slate-400 uppercase">Paid</p>
                          <p className="text-sm font-bold text-emerald-600">{formatMoney(row.amountPaid)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-400 uppercase">Left</p>
                          <p className="text-sm font-bold text-rose-600">{formatMoney(left)}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-4 border-t border-slate-100">
                        <button className="flex-1 admin-button-primary !py-2" onClick={() => openManualPayment({ ownerId: row.ownerId, billingId: row.id || null, ownerName: `${row.firstName} ${row.lastName}`, ownerPackagePrice: row.ownerPackagePrice })}>
                          + Payment
                        </button>
                        <button className="admin-button-secondary !py-2" onClick={() => openHistory(row.ownerId)}>History</button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block overflow-hidden bg-white rounded-xl border border-slate-100 shadow-sm">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Owner</th>
                    <th>Billing Period</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Due</th>
                    <th>Paid</th>
                    <th>Remaining</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading || ownersLoading ? (
                    <tr><td colSpan="8" className="py-8 text-center text-slate-400 font-medium">Loading...</td></tr>
                  ) : pagedRows.length === 0 ? (
                    <tr><td colSpan="8" className="py-8 text-center text-slate-400 font-medium">No owners found</td></tr>
                  ) : (
                    pagedRows.map((row) => {
                      const left = Number(row.amountDue || 0) - Number(row.amountPaid || 0)
                      const hasBilling = Boolean(row.id)
                      const periodText = hasBilling && row.periodStart ? `${formatPeriodDate(row.periodStart)} → ${formatPeriodDate(row.periodEnd)}` : periodLabel
                      const isPromo = row.isPromotion === 1
                      return (
                        <tr
                          key={row.id || row.ownerId}
                          className={`admin-table-row transition-colors ${
                            isPromo ? 'bg-violet-50/30 hover:bg-violet-50' :
                            row.status === 'paid' ? 'bg-emerald-50/50 hover:bg-emerald-50' :
                            row.status === 'partial' ? 'bg-amber-50/50 hover:bg-amber-50' :
                            'bg-rose-50/30 hover:bg-rose-50/50'
                          }`}
                        >
                          <td className="font-bold text-slate-900">
                            <div>{row.firstName} {row.lastName}</div>
                            <div className="text-[13px] text-slate-400 font-medium">{row.contact}</div>
                          </td>
                          <td className="text-slate-600">{periodText}</td>
                          <td>
                            {isPromo
                              ? <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-violet-100 text-violet-600">Promo</span>
                              : <span className="text-[11px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{row.billingCycle || 'Monthly'}</span>
                            }
                          </td>
                          <td>
                            {isPromo
                              ? <span className="admin-pill" style={{background:'#ede9fe',color:'#7c3aed'}}>Promotion</span>
                              : <span className={`admin-pill ${row.status}`}>{row.status}</span>
                            }
                          </td>
                          <td className="font-bold text-slate-900">{isPromo ? <span className="line-through text-slate-400">{formatMoney(row.amountDue)}</span> : formatMoney(row.amountDue)}</td>
                          <td className="font-bold text-emerald-600">{isPromo ? <span className="text-violet-600">Waived</span> : formatMoney(row.amountPaid)}</td>
                          <td className={`font-bold ${!isPromo && left > 0 ? 'text-rose-600' : 'text-slate-400'}`}>{isPromo ? '—' : formatMoney(left)}</td>
                          <td>
                            <div className="flex items-center gap-2">
                              <button className="admin-button-primary !px-3 !py-1" onClick={() => openManualPayment({ ownerId: row.ownerId, billingId: row.id || null, ownerName: `${row.firstName} ${row.lastName}`, ownerPackagePrice: row.ownerPackagePrice })}>
                                {isPromo ? 'Extend' : 'Pay'}
                              </button>
                              <button className="admin-button-secondary !px-3 !py-1" onClick={() => openHistory(row.ownerId)}>History</button>
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
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                Page <span className="text-slate-900">{page}</span> of {totalPages}
              </p>
              <div className="flex gap-2">
                <button className="admin-button-secondary !py-2 !px-4" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={page === 1}>Previous</button>
                <button className="admin-button-secondary !py-2 !px-4" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={page === totalPages}>Next</button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'approval' && (
        <div className="admin-card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Pending Approvals</h2>
            <span className="text-base text-slate-400">{approvalItems.length} pending</span>
          </div>
          <div className="mt-4 space-y-3">
            {approvalItems.length === 0 ? (
              <p className="text-base text-slate-400">No pending payments.</p>
            ) : (
              approvalItems.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{item.firstName} {item.lastName}</p>
                      <p className="text-sm text-slate-500">{item.contact}</p>
                    </div>
                    <div className="text-base text-slate-700">{formatMoney(item.amount)}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                    <span>{item.method}</span>
                    {item.proofUrl && (<a href={item.proofUrl} className="underline" target="_blank" rel="noreferrer">View proof</a>)}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className="admin-button-primary" onClick={() => updateApprovalStatus(item.id, 'approved')}>Approve</button>
                    <button className="admin-button-secondary" onClick={() => updateApprovalStatus(item.id, 'rejected')}>Reject</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {selectedBilling && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal max-w-lg !p-0 overflow-hidden">
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Record Payment</h3>
                <p className="text-[13px] font-medium text-slate-500">For {selectedBilling.ownerName}</p>
              </div>
              <button onClick={() => setSelectedBilling(null)} className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm transition-all flex items-center justify-center text-slate-400 hover:text-slate-900">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={submitManualPayment} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

              {/* Promotion Toggle */}
              <div className="flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer select-none"
                style={{ borderColor: manualForm.isPromotion ? '#7c3aed' : '#e2e8f0', background: manualForm.isPromotion ? '#f5f3ff' : '#f8fafc' }}
                onClick={() => setManualForm(prev => ({ ...prev, isPromotion: !prev.isPromotion }))}
              >
                <div>
                  <p className="text-sm font-bold text-slate-900">Free Trial / Promotion</p>
                  <p className="text-xs font-medium text-slate-400 mt-0.5">Mark this period as waived — counts as promotion, not revenue</p>
                </div>
                <div className={`w-11 h-6 rounded-full transition-all flex items-center px-0.5 ${manualForm.isPromotion ? 'bg-violet-500' : 'bg-slate-200'}`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow transition-all ${manualForm.isPromotion ? 'translate-x-5' : 'translate-x-0'}`} />
                </div>
              </div>

              {/* Billing Cycle (hidden for promo) */}
              {!manualForm.isPromotion && (
                <div className="space-y-2">
                  <label className="text-[13px] font-bold uppercase tracking-wider text-slate-400 ml-1">Billing Cycle</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['monthly', 'yearly'].map((cycle) => (
                      <button
                        key={cycle}
                        type="button"
                        onClick={() => setManualForm(prev => ({ ...prev, billingCycle: cycle }))}
                        className={`py-2.5 rounded-xl border font-bold text-sm transition-all ${manualForm.billingCycle === cycle ? 'border-blue-500 bg-blue-50 text-blue-600 ring-1 ring-blue-500/20' : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-white'}`}
                      >
                        {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Start Month + End Month */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[13px] font-bold uppercase tracking-wider text-slate-400 ml-1">Start Month</label>
                  <input
                    type="month"
                    className="admin-input !h-11 !rounded-xl"
                    value={manualForm.periodStart || ''}
                    onChange={(e) => setManualForm(prev => ({ ...prev, periodStart: e.target.value }))}
                    required
                  />
                </div>
                {manualForm.billingCycle === 'monthly' && (
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold uppercase tracking-wider text-slate-400 ml-1">End Month (Optional)</label>
                    <input
                      type="month"
                      className="admin-input !h-11 !rounded-xl"
                      value={manualForm.periodEnd || ''}
                      onChange={(e) => setManualForm(prev => ({ ...prev, periodEnd: e.target.value }))}
                      min={manualForm.periodStart}
                    />
                  </div>
                )}
                {manualForm.billingCycle === 'yearly' && (
                  <div className="space-y-2 flex items-end">
                    <div className="w-full h-11 flex items-center justify-center bg-blue-50 border border-blue-200 text-blue-600 rounded-xl font-bold text-sm">
                      12 Months (Full Year)
                    </div>
                  </div>
                )}
              </div>

              {/* Method + Date (hidden for promo) */}
              {!manualForm.isPromotion && (
                <>
                  <div className="space-y-2">
                    <label className="text-[13px] font-bold uppercase tracking-wider text-slate-400 ml-1">Payment Method</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'bank', label: 'Bank', icon: 'M3 10h18M7 15h1m4 0h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
                        { id: 'cash', label: 'Cash', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                        { id: 'card', label: 'Card', icon: 'M3 10h18M7 15h1m4 0h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
                      ].map((m) => (
                        <button key={m.id} type="button" onClick={() => setManualForm(prev => ({ ...prev, method: m.id }))}
                          className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all ${manualForm.method === m.id ? 'border-blue-500 bg-blue-50 text-blue-600 ring-1 ring-blue-500/20' : 'border-slate-100 bg-slate-50 text-slate-400 hover:bg-white'}`}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={m.icon} /></svg>
                          <span className="text-[12px] font-bold uppercase">{m.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[13px] font-bold uppercase tracking-wider text-slate-400 ml-1">Discount (LKR)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="admin-input !h-11 !rounded-xl"
                        value={manualForm.discount}
                        onChange={(e) => setManualForm(prev => ({ ...prev, discount: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[13px] font-bold uppercase tracking-wider text-slate-400 ml-1">Payment Date</label>
                      <input
                        type="date"
                        className="admin-input !h-11 !rounded-xl"
                        value={manualForm.paidAt}
                        onChange={(e) => setManualForm(prev => ({ ...prev, paidAt: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Note */}
              <div className="space-y-2">
                <label className="text-[13px] font-bold uppercase tracking-wider text-slate-400 ml-1">Note / Reference</label>
                <textarea className="admin-input !h-16 !py-3 !rounded-xl resize-none" value={manualForm.note} onChange={(e) => setManualForm(prev => ({ ...prev, note: e.target.value }))} placeholder="Transaction reference, reason..." />
              </div>

              {/* Payment Breakdown Preview */}
              {paymentBreakdown && (
                <div className={`rounded-2xl p-4 border ${paymentBreakdown.type === 'promotion' ? 'bg-violet-50 border-violet-200' : 'bg-blue-50 border-blue-200'}`}>
                  <p className={`text-[11px] font-black uppercase tracking-widest mb-3 ${paymentBreakdown.type === 'promotion' ? 'text-violet-500' : 'text-blue-500'}`}>
                    {paymentBreakdown.type === 'promotion' ? 'Promotion Summary' : 'Payment Breakdown'}
                  </p>
                  {paymentBreakdown.type === 'promotion' ? (
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm font-bold">
                        <span className="text-slate-600">{paymentBreakdown.months} month{paymentBreakdown.months > 1 ? 's' : ''} waived</span>
                        <span className="text-violet-600">{formatMoney(paymentBreakdown.waived)}</span>
                      </div>
                      <p className="text-xs text-violet-400 font-medium">This will NOT count toward revenue</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Base ({paymentBreakdown.months} × {formatMoney(paymentBreakdown.basePrice)})</span>
                        <span className="font-bold text-slate-700">{formatMoney(paymentBreakdown.basePrice * paymentBreakdown.months)}</span>
                      </div>
                      {paymentBreakdown.discount > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-emerald-600">Discount</span>
                          <span className="font-bold text-emerald-600">- {formatMoney(paymentBreakdown.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-black border-t border-blue-200 pt-2 mt-2">
                        <span className="text-slate-800">Total</span>
                        <span className="text-blue-600">{formatMoney(paymentBreakdown.total)}</span>
                      </div>
                      {paymentBreakdown.months > 1 && (
                        <p className="text-xs text-blue-400 font-medium">{paymentBreakdown.months} billing records will be created ({formatMoney(paymentBreakdown.perMonth)}/month)</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Overpayment / error warning */}
              {modalError && (
                <div className="flex items-start gap-3 bg-rose-50 border border-rose-200 rounded-2xl px-4 py-3">
                  <svg className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-[12px] font-black text-rose-600 uppercase tracking-wide leading-snug">{modalError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setSelectedBilling(null); setModalError('') }} className="flex-1 admin-button-secondary !h-11 !rounded-xl">Cancel</button>
                <button
                  className={`flex-[2] !h-11 !rounded-xl ${manualForm.isPromotion ? 'bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all' : 'admin-button-primary'} disabled:opacity-50 disabled:cursor-not-allowed`}
                  type="submit"
                  disabled={saving || !!modalError}
                >
                  {saving ? 'Processing...' : (manualForm.isPromotion ? 'Apply Promotion' : 'Confirm Payment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyOwner && (
        <div className="admin-modal-backdrop" role="dialog" aria-modal="true">
          <div className="admin-modal max-w-lg !p-0 overflow-hidden">
            <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Payment History</h3>
                <p className="text-[13px] font-medium text-slate-500">Transaction logs for this owner</p>
              </div>
              <button onClick={() => setHistoryOwner(null)} className="h-8 w-8 rounded-full hover:bg-white hover:shadow-sm transition-all flex items-center justify-center text-slate-400 hover:text-slate-900">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-0">
              {historyItems.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No transactions found</p>
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
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyItems.map((item) => (
                        <tr key={item.id} className="admin-table-row">
                          <td className="whitespace-nowrap font-bold text-slate-900">
                            {item.paidAt ? new Date(item.paidAt).toLocaleDateString() : '-'}
                          </td>
                          <td className="font-bold text-blue-600">{formatMoney(item.amount)}</td>
                          <td><span className="text-[13px] font-bold uppercase text-slate-400">{item.method || 'Bank'}</span></td>
                          <td><span className={`admin-pill ${item.status || 'approved'}`}>{item.status || 'approved'}</span></td>
                          <td>
                            <button onClick={() => deletePayment(item.id)} className="text-rose-500 hover:text-rose-700 font-bold text-[13px] uppercase px-2 py-1 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors">
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 flex justify-end">
              <button onClick={() => setHistoryOwner(null)} className="admin-button-secondary !py-1.5 !px-4">Close History</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
