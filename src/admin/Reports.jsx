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
    <div className="space-y-6">
      <div className="admin-hero-card">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Reports</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">Growth Analytics</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Monthly owner and payment growth based on billing records.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <input
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="admin-input"
            placeholder="Year"
          />
        </div>
      </div>

      {error && <div className="admin-alert">{error}</div>}

      <div className="admin-card">
        <h2 className="text-lg font-semibold">Monthly Paid Amount</h2>
        <div className="mt-6 grid grid-cols-12 gap-2 items-end">
          {grouped.map((month, index) => {
            const height = Math.max((month.paid / maxPaid) * 140, 6)
            return (
              <div key={monthLabel(index)} className="flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-full bg-gradient-to-t from-cyan-500 to-blue-600"
                  style={{ height }}
                  title={`${formatMoney(month.paid)}`}
                />
                <span className="text-xs text-slate-500">{monthLabel(index)}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {grouped.map((month, index) => (
          <div key={monthLabel(index)} className="admin-metric">
            <p>{monthLabel(index)}</p>
            <h3>{formatMoney(month.paid)}</h3>
            <span className="text-xs text-slate-500">Owners billed: {month.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
