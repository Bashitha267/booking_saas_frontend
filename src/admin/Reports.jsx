import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'

function formatMoney(value) {
  const number = Number(value || 0)
  return number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function monthLabel(monthIndex) {
  return new Date(2024, monthIndex, 1).toLocaleString(undefined, { month: 'short' })
}

export default function AdminReports() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [billing, setBilling] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    api
      .get('/admin/billing', { params: { year } })
      .then((res) => {
        if (!active) return
        setBilling(res.data.data || [])
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setError(err.response?.data?.message || 'Failed to load report data')
      })
    return () => {
      active = false
    }
  }, [year])

  const grouped = useMemo(() => {
    const months = Array.from({ length: 12 }, () => ({ count: 0, paid: 0, due: 0 }))
    billing.forEach((row) => {
      const date = new Date(row.periodStart)
      const index = date.getMonth()
      months[index].count += 1
      months[index].paid += Number(row.amountPaid || 0)
      months[index].due += Number(row.amountDue || 0)
    })
    return months
  }, [billing])

  const maxPaid = Math.max(...grouped.map((m) => m.paid), 1)

  return (
    <div className="space-y-8">
      <div className="admin-hero-card">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">Performance</p>
          <h1 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">Growth Analytics</h1>
        </div>
      </div>

      <div className="admin-filter-bar">
        <div className="flex flex-wrap items-end gap-3">
          <div className="admin-filter-group w-32">
            <label className="admin-filter-label">Report Year</label>
            <input
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="admin-filter-input text-center font-bold"
              placeholder="YYYY"
            />
          </div>
        </div>
      </div>

      {error && <div className="admin-alert">{error}</div>}

      <div className="admin-card">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold text-slate-900">Monthly Revenue Pulse</h2>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                <span className="text-[10px] font-bold text-slate-400 uppercase">Paid Settlements</span>
             </div>
          </div>
        </div>
        
        <div className="mt-6 flex items-end gap-2 sm:gap-4 h-48">
          {grouped.map((month, index) => {
            const height = Math.max((month.paid / maxPaid) * 100, 4)
            return (
              <div key={monthLabel(index)} className="flex-1 flex flex-col items-center gap-3 h-full">
                <div className="flex-1 w-full flex items-end">
                   <div
                     className="w-full rounded-t-lg bg-blue-600/10 hover:bg-blue-600 transition-all duration-300 relative group cursor-help"
                     style={{ height: `${height}%` }}
                   >
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-2 py-1 rounded text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl">
                        {formatMoney(month.paid)}
                      </div>
                   </div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{monthLabel(index)}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {grouped.filter(m => m.count > 0 || m.paid > 0).map((month, index) => (
          <div key={index} className="admin-card !p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{monthLabel(index)} Summary</p>
            <h3 className="text-xl font-bold text-slate-900 mb-2">{formatMoney(month.paid)}</h3>
            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
               <span className="text-xs font-medium text-slate-500">{month.count} Billings</span>
               <span className="text-[10px] font-bold text-blue-600">Details</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
