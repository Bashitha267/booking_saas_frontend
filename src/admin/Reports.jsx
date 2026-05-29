import React, { useEffect, useMemo, useState } from 'react'
import api from '../api'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

function formatMoney(value) {
  const number = Number(value || 0)
  return 'LKR ' + number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function monthLabel(monthIndex) {
  return new Date(2024, monthIndex, 1).toLocaleString(undefined, { month: 'short' })
}

export default function AdminReports() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [billing, setBilling] = useState([])
  const [owners, setOwners] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [payments, setPayments] = useState([])
  const [globalFee, setGlobalFee] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      api.get('/admin/billing', { params: { year } }),
      api.get('/admin/owners'),
      api.get('/admin/owner-payments', { params: { startDate: `${year}-01-01`, endDate: `${year}-12-31`, status: 'approved' } }),
      api.get('/admin/settings')
    ])
      .then(([billingRes, ownersRes, paymentsRes, settingsRes]) => {
        if (!active) return
        setBilling(billingRes.data.data || [])
        setOwners(ownersRes.data.data || [])
        setPayments(paymentsRes.data.data || [])
        const fee = settingsRes.data.data?.global_billing_amount
        setGlobalFee(fee ? Number(fee) : 0)
        setError('')
      })
      .catch((err) => {
        if (!active) return
        setError(err.response?.data?.message || 'Failed to load report data')
      })
      .finally(() => {
        if (!active) return
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [year])

  const grouped = useMemo(() => {
    const months = Array.from({ length: 12 }, () => ({ count: 0, paid: 0, due: 0, newOwners: 0, ownerCountAtMonth: 0 }))
    
    // Calculate owner counts per month
    owners.forEach((owner) => {
      const date = new Date(owner.createdAt)
      const ownerYear = date.getFullYear()
      const ownerMonth = date.getMonth()

      if (ownerYear <= Number(year)) {
        const startIdx = ownerYear < Number(year) ? 0 : ownerMonth
        if (ownerYear === Number(year)) {
          months[ownerMonth].newOwners += 1
        }
        for (let i = startIdx; i < 12; i++) {
          months[i].ownerCountAtMonth += 1
        }
      }
    })

    // Real Paid Revenue from transactions
    payments.forEach((p) => {
      const date = new Date(p.paidAt || p.createdAt)
      if (date.getFullYear() === Number(year)) {
        const index = date.getMonth()
        months[index].paid += Number(p.amount || 0)
        months[index].count += 1
      }
    })

    // Real Potential Due (OwnerCount * globalFee)
    months.forEach((m) => {
      m.due = m.ownerCountAtMonth * globalFee
    })

    return months
  }, [payments, owners, year, globalFee])

  const chartData = {
    labels: Array.from({ length: 12 }, (_, i) => monthLabel(i)),
    datasets: [
      {
        label: 'Monthly Revenue',
        data: grouped.map(m => m.paid),
        borderColor: '#2563eb', // blue-600
        backgroundColor: 'rgba(37, 99, 235, 0.05)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y',
      },
      {
        label: 'New Owners',
        data: grouped.map(m => m.newOwners),
        borderColor: '#f43f5e', // rose-500
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y1',
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        padding: 12,
        cornerRadius: 12,
        displayColors: true,
        callbacks: {
          label: (context) => {
            if (context.dataset.label === 'Monthly Revenue') {
              return ` Revenue: ${formatMoney(context.raw)}`
            }
            return ` New Owners: ${context.raw}`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { size: 9, weight: 'bold' },
          color: '#64748b',
          callback: (value) => value >= 1000 ? (value / 1000) + 'k' : value
        }
      },
      y1: {
        beginAtZero: true,
        position: 'right',
        grid: { display: false },
        ticks: {
          font: { size: 9, weight: 'bold' },
          color: '#f43f5e',
          stepSize: 1
        }
      },
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 9, weight: 'bold' },
          color: '#64748b',
          padding: 10
        }
      }
    }
  }

  return (
    <div className="space-y-8 admin-fade">
      <div className="admin-hero-card">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">Performance</p>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">Growth Analytics</h1>
          </div>
          <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white shadow-sm">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                <span className="text-[13px] font-bold text-slate-600 uppercase">Revenue</span>
             </div>
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg">
                <div className="h-2 w-2 rounded-full bg-rose-500" />
                <span className="text-[13px] font-bold text-slate-400 uppercase">Owners</span>
             </div>
          </div>
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

      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold text-slate-900">Growth vs Revenue Pulse</h2>
        </div>
        
        <div className="relative h-[300px] md:h-[400px] w-full">
           {loading ? (
             <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[2px] z-10">
               <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                  <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Processing Data...</p>
               </div>
             </div>
           ) : null}
           <Line data={chartData} options={chartOptions} />
        </div>
      </div>

    </div>
  )
}
