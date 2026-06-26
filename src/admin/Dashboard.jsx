import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'

function formatMoney(value) {
	const number = Number(value || 0)
	return 'LKR ' + number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatTime(dateStr) {
  if (!dateStr) return 'Never'
  const date = new Date(dateStr)
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatDate(dateStr) {
  if (!dateStr) return 'Unknown'
  const date = new Date(dateStr)
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminDashboard() {
  const [timeframe, setTimeframe] = useState('month') // 'month' or 'year'
  const [owners, setOwners] = useState([])
  const [summary, setSummary] = useState(null)
  const [monthlySummary, setMonthlySummary] = useState(null)
  const [yearlySummary, setYearlySummary] = useState(null)
  const [billing, setBilling] = useState([])
  const [allPayments, setAllPayments] = useState([])
  const [globalFee, setGlobalFee] = useState(0)
  const [recentLogged, setRecentLogged] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [error, setError] = useState('')

  const [showDirectoryModal, setShowDirectoryModal] = useState(false)
  const [properties, setProperties] = useState([])
  const [propertiesLoading, setPropertiesLoading] = useState(false)

  const fetchProperties = () => {
    setPropertiesLoading(true)
    api.get('/properties')
      .then(res => {
        setProperties(res.data.data || [])
      })
      .catch(err => console.error(err))
      .finally(() => setPropertiesLoading(false))
  }

  const handleViewDirectory = () => {
    setShowDirectoryModal(true)
    fetchProperties()
  }

  const recentProperties = useMemo(() => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return properties.filter(p => p.createdAt && new Date(p.createdAt) >= cutoff)
  }, [properties])

  const currentDate = new Date()
  const currentMonthLabel = currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth() + 1

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/admin/owners'),
      api.get('/admin/billing/summary'),
      api.get('/admin/billing/summary', { params: { year: currentYear, month: currentMonth } }),
      api.get('/admin/billing/summary', { params: { year: currentYear } }),
      api.get('/admin/users/recent-logged'),
      api.get('/admin/users/online')
    ])
      .then(([ownersRes, summaryRes, monthlySummaryRes, yearlySummaryRes, recentLoggedRes, onlineUsersRes]) => {
        if (!active) return
        setOwners(ownersRes.data.data || [])
        setSummary(summaryRes.data.data || null)
        setMonthlySummary(monthlySummaryRes.data.data || null)
        setYearlySummary(yearlySummaryRes.data.data || null)
        setRecentLogged(recentLoggedRes.data.data || [])
        setOnlineUsers(onlineUsersRes.data.data || [])
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setError(err.response?.data?.message || 'Failed to load dashboard data')
      })
    return () => {
      active = false
    }
  }, [])

  const billingQueryParams = useMemo(() => {
    if (timeframe === 'year') {
      return { year: currentYear }
    }
    return { year: currentYear, month: String(currentMonth).padStart(2, '0') }
  }, [timeframe, currentYear, currentMonth])

  useEffect(() => {
    let active = true
    Promise.all([
      api.get('/admin/billing', { params: billingQueryParams }),
      api.get('/admin/owner-payments', { params: { ...billingQueryParams, status: 'approved' } }),
      api.get('/admin/settings')
    ])
      .then(([billingRes, paymentsRes, settingsRes]) => {
        if (!active) return
        setBilling(billingRes.data.data || [])
        setAllPayments(paymentsRes.data.data || [])
        const fee = settingsRes.data.data?.global_billing_amount
        setGlobalFee(fee ? Number(fee) : 0)
      })
      .catch((err) => {
        if (!active) return
        setError(err.response?.data?.message || 'Failed to load billing data')
      })
    return () => {
      active = false
    }
  }, [billingQueryParams])

  const propertyTotal = owners.reduce((sum, owner) => sum + Number(owner.propertyCount || 0), 0)
  const activeSummary = timeframe === 'month' ? monthlySummary : yearlySummary

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
      const ownerPrice = owner.packagePrice != null ? Number(owner.packagePrice) : globalFee
      if (record) {
        const isPromo = record.isPromotion === 1
        const due = Number(record.amountDue || 0)
        const paid = Number(record.amountPaid || 0)
        const computedStatus = isPromo ? 'promotion' : (due === 0 || paid >= due ? 'paid' : (paid > 0 ? 'partial' : 'pending'))
        return {
          ...record,
          amountPaid: paid,
          status: computedStatus,
          ownerPackagePrice: ownerPrice,
        }
      }
      const due = ownerPrice
      const paid = realPaid
      const computedStatus = due === 0 || paid >= due ? 'paid' : (paid > 0 ? 'partial' : 'pending')
      return {
        ownerId: owner.id,
        status: computedStatus,
        amountDue: due,
        amountPaid: paid,
        ownerPackagePrice: ownerPrice,
      }
    })
  }, [owners, billing, allPayments, globalFee])

  const realTotalPaid = useMemo(() => ownerRows.reduce((acc, r) => acc + Number(r.amountPaid || 0), 0), [ownerRows])
  const realTotalDue = useMemo(() => ownerRows.reduce((acc, r) => acc + Math.max(0, Number(r.amountDue || 0) - Number(r.amountPaid || 0)), 0), [ownerRows])
  const realPaidCount = useMemo(() => ownerRows.filter(r => r.status === 'paid').length, [ownerRows])
  const realUnpaidCount = useMemo(() => ownerRows.filter(r => r.status !== 'paid').length, [ownerRows])
  const promoCount = useMemo(() => billing.filter(b => b.isPromotion === 1).length, [billing])

  const recentRegistrations = useMemo(() => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return owners.filter(owner => owner.createdAt && new Date(owner.createdAt) >= cutoff)
  }, [owners])

  const recentLogins = useMemo(() => {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return recentLogged.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) >= cutoff)
  }, [recentLogged])

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-lg md:text-[13px] font-bold uppercase text-blue-600">Dashboard</p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">Admin Console</h1>
        </div>
        <div className="flex items-center gap-4">
          {/* Timeframe Toggle Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl shadow-sm border border-slate-200/40">
            <button
              onClick={() => setTimeframe('month')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeframe === 'month' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-950'}`}
            >
              This Month
            </button>
            <button
              onClick={() => setTimeframe('year')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${timeframe === 'year' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-950'}`}
            >
              This Year
            </button>
          </div>
        </div>
      </div>

      {error && <div className="admin-alert">{error}</div>}

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Platform Owners', value: owners.length, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197', color: 'blue' },
          { label: 'Active Properties', value: propertyTotal, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', color: 'indigo' },
          { label: 'Total Revenue', value: formatMoney(realTotalPaid), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'emerald' },
          { label: 'Outstanding', value: formatMoney(realTotalDue), icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'rose' },
        ].map((metric) => (
          <div key={metric.label} className="group admin-card !p-4 hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg bg-${metric.color}-50 text-${metric.color}-600`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={metric.icon} /></svg>
              </div>
              <svg className="w-3 h-3 text-slate-300 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            </div>
            <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">{metric.label}</p>
            <h3 className="text-lg font-black text-slate-900 tracking-tight mt-1">{metric.value}</h3>
          </div>
        ))}
        {/* Promotions Given — special violet card */}
        <div className="group admin-card !p-4 hover:border-violet-200 transition-all border-violet-100 bg-violet-50/40">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 rounded-lg bg-violet-100 text-violet-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.364 1.118l1.519 4.674c.3.921-.755 1.688-1.54 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.784.57-1.838-.197-1.54-1.118l1.52-4.674a1 1 0 00-.365-1.118L2.98 10.101c-.783-.57-.38-1.81.588-1.81h4.915a1 1 0 00.951-.69l1.515-4.674z" />
              </svg>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-violet-400">
              {timeframe === 'month' ? 'This Month' : 'This Year'}
            </span>
          </div>
          <p className="text-[13px] font-bold text-violet-500 uppercase tracking-widest">Promotions Given</p>
          <h3 className="text-lg font-black tracking-tight mt-1" style={{ color: '#7c3aed' }}>
            {promoCount}
          </h3>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Owners Section */}
        <div className="admin-card !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Recent Registrations</h2>
            <button onClick={handleViewDirectory} className="text-[13px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors">View Directory</button>
          </div>
          <div className="p-4 space-y-1.5 overflow-y-auto max-h-72">
            {recentRegistrations.length === 0 ? (
               <div className="py-8 text-center text-slate-400 font-medium text-sm">No registrations in the last 24 hours.</div>
            ) : (
              recentRegistrations.map((owner) => (
                <div key={owner.id} className="flex items-center justify-between rounded-xl p-2 transition-all hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center font-bold text-slate-400 text-[13px] shadow-sm">
                      {owner.firstName?.[0]}{owner.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">{owner.firstName} {owner.lastName}</p>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-tighter">@{owner.username}</p>
                      <p className="text-[11px] font-semibold text-slate-400">Registered {formatDate(owner.createdAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-[13px] font-bold text-slate-900 leading-tight">{owner.propertyCount || 0} Prop.</p>
                      <p className="text-[11px] font-bold text-slate-400 uppercase">Portfolio</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Distribution Section */}
        <div className="admin-card !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
              Financial Statistics for {timeframe === 'month' ? currentMonthLabel : currentYear}
            </h2>
            <div className="h-2 w-2 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
          </div>
          <div className="p-6 space-y-8">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-1">Settled Accounts for </p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">{realPaidCount}</p>
                </div>
                <span className="text-[13px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {Math.round((realPaidCount / (realPaidCount + realUnpaidCount || 1)) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                  style={{ width: `${(realPaidCount / (realPaidCount + realUnpaidCount || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Settlements</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">{realUnpaidCount}</p>
                </div>
                <span className="text-[13px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  {Math.round((realUnpaidCount / (realPaidCount + realUnpaidCount || 1)) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-400 rounded-full transition-all duration-1000" 
                  style={{ width: `${(realUnpaidCount / (realPaidCount + realUnpaidCount || 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Logged & Currently Online Users Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Logins Card */}
        <div className="admin-card !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Recent Logins</h2>
            <div className="h-2 w-2 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
          </div>
          <div className="p-4 space-y-1.5 overflow-y-auto max-h-72">
            {recentLogins.length === 0 ? (
               <div className="py-8 text-center text-slate-400 font-medium text-sm">No login records in the last 24 hours.</div>
            ) : (
              recentLogins.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-xl p-2 transition-all hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center font-bold text-slate-400 text-[13px] shadow-sm">
                      {u.firstName?.[0] || 'U'}{u.lastName?.[0] || ''}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">{u.firstName} {u.lastName}</p>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-tighter">@{u.username} • {u.role}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium text-slate-500">{formatTime(u.lastLoginAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Currently Online Users Card */}
        <div className="admin-card !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Online Now</h2>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-600 uppercase">{onlineUsers.length} Online</span>
            </div>
          </div>
          <div className="p-4 space-y-1.5">
            {onlineUsers.length === 0 ? (
               <div className="py-8 text-center text-slate-400 font-medium text-sm">No users currently online.</div>
            ) : (
              onlineUsers.slice(0, 6).map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-xl p-2 transition-all hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center font-bold text-slate-400 text-[13px] shadow-sm">
                      {u.firstName?.[0] || 'U'}{u.lastName?.[0] || ''}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 leading-tight">{u.firstName} {u.lastName}</p>
                      <p className="text-xs font-medium text-slate-400 uppercase tracking-tighter">@{u.username} • {u.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase">Active</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showDirectoryModal && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
          onClick={() => setShowDirectoryModal(false)}
        >
          <div 
            className="relative bg-white rounded-3xl p-6 shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">Property Directory</h3>
                <p className="text-xs font-bold text-slate-400 mt-1">Properties registered in the last 24 hours</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowDirectoryModal(false)}
                className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-auto max-h-[60vh] space-y-3 pr-1">
              {propertiesLoading ? (
                <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Loading directory...</div>
              ) : recentProperties.length === 0 ? (
                <div className="py-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No properties registered in the last 24 hours.</div>
              ) : (
                recentProperties.map((prop) => (
                  <div key={prop.id} className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-slate-100 p-4 gap-4 transition-all hover:bg-slate-50/50">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-black text-slate-900 text-sm">{prop.name}</h4>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${prop.status === 'blocked' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                          {prop.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-500">{prop.address}, {prop.city}, {prop.country}</p>
                      <p className="text-[11px] font-bold text-slate-400 mt-2">
                        Owner: <span className="text-slate-700">@{prop.ownerUsername || 'unknown'}</span> ({prop.ownerFirstName || ''} {prop.ownerLastName || ''})
                      </p>
                    </div>
                    <div className="text-left sm:text-right text-[11px] font-bold text-slate-400 flex flex-col justify-between h-full">
                      <div>
                        <p>Email: <span className="text-slate-600">{prop.email || '—'}</span></p>
                        <p>Phone: <span className="text-slate-600">{prop.phone || '—'}</span></p>
                      </div>
                      <p className="mt-2 text-slate-400">Registered {new Date(prop.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                    </div>
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
