import React, { useEffect, useState } from 'react'
import api from '../api'

function formatMoney(value) {
	const number = Number(value || 0)
	return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AdminDashboard() {
  const [owners, setOwners] = useState([])
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    Promise.all([api.get('/admin/owners'), api.get('/admin/billing/summary')])
      .then(([ownersRes, summaryRes]) => {
        if (!active) return
        setOwners(ownersRes.data.data || [])
        setSummary(summaryRes.data.data || null)
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

  const propertyTotal = owners.reduce((sum, owner) => sum + Number(owner.propertyCount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-600">Overview</p>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin Console</h1>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-100 p-1 rounded-xl shadow-sm">
          <div className="px-3 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-r border-slate-100">Live Status</div>
          <div className="flex items-center gap-1.5 px-2 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-600 uppercase">Operational</span>
          </div>
        </div>
      </div>

      {error && <div className="admin-alert">{error}</div>}

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Platform Owners', value: owners.length, icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197', color: 'blue' },
          { label: 'Active Properties', value: propertyTotal, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', color: 'indigo' },
          { label: 'Total Revenue', value: formatMoney(summary?.totalPaid), icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', color: 'emerald' },
          { label: 'Outstanding', value: formatMoney((summary?.totalDue || 0) - (summary?.totalPaid || 0)), icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color: 'rose' }
        ].map((metric) => (
          <div key={metric.label} className="group admin-card !p-4 hover:border-blue-200 transition-all">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg bg-${metric.color}-50 text-${metric.color}-600`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={metric.icon} /></svg>
              </div>
              <svg className="w-3 h-3 text-slate-300 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{metric.label}</p>
            <h3 className="text-lg font-black text-slate-900 tracking-tight mt-1">{metric.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Owners Section */}
        <div className="admin-card !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Recent Activity</h2>
            <button className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-widest transition-colors">View Directory</button>
          </div>
          <div className="p-4 space-y-1.5">
            {owners.length === 0 ? (
               <div className="py-8 text-center text-slate-400 font-medium text-xs">No activity records.</div>
            ) : (
              owners.slice(0, 6).map((owner) => (
                <div key={owner.id} className="flex items-center justify-between rounded-xl p-2 transition-all hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center font-bold text-slate-400 text-[10px] shadow-sm">
                      {owner.firstName?.[0]}{owner.lastName?.[0]}
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-900 leading-tight">{owner.firstName} {owner.lastName}</p>
                      <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tighter">@{owner.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] font-bold text-slate-900 leading-tight">{owner.propertyCount || 0} Prop.</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase">Portfolio</p>
                    </div>
                    <span className={`admin-pill ${owner.currentBillingStatus || 'pending'}`}>
                      {owner.currentBillingStatus || 'pending'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Payment Distribution Section */}
        <div className="admin-card !p-0 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
            <h2 className="text-[11px] font-bold text-slate-900 uppercase tracking-widest">Financial Health</h2>
            <div className="h-2 w-2 rounded-full bg-blue-500 shadow-sm shadow-blue-200" />
          </div>
          <div className="p-6 space-y-8">
            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Settled Accounts</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">{summary?.paidCount || 0}</p>
                </div>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  {Math.round((summary?.paidCount / (summary?.paidCount + summary?.unpaidCount || 1)) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 rounded-full transition-all duration-1000" 
                  style={{ width: `${(summary?.paidCount / (summary?.paidCount + summary?.unpaidCount || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pending Settlements</p>
                  <p className="text-xl font-black text-slate-900 tracking-tight">{summary?.unpaidCount || 0}</p>
                </div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                  {Math.round((summary?.unpaidCount / (summary?.paidCount + summary?.unpaidCount || 1)) * 100)}%
                </span>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-400 rounded-full transition-all duration-1000" 
                  style={{ width: `${(summary?.unpaidCount / (summary?.paidCount + summary?.unpaidCount || 1)) * 100}%` }}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-blue-900 p-5 shadow-lg shadow-blue-900/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                 <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold text-blue-300 uppercase tracking-[0.2em] mb-2">Automated Insights</p>
                <p className="text-xs font-medium text-white leading-relaxed">
                  Revenue is trending <span className="text-emerald-400 font-bold">upwards</span> this month. Focus on converting pending settlements to maximize liquidity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
