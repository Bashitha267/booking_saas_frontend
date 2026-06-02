import React, { useEffect, useMemo, useRef, useState } from 'react'
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatMoney(value) {
  const number = Number(value || 0)
  return 'LKR ' + number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatMoneyRaw(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function AdminReports() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [selectedMonth, setSelectedMonth] = useState('') // "" means all months
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const printRef = useRef(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    api.get('/admin/reports/revenue', { params: { year } })
      .then((res) => {
        if (!active) return
        setReport(res.data)
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
    return () => { active = false }
  }, [year])

  const months = report?.months || []
  const totals = report?.totals || {}
  const ownerBreakdown = report?.ownerBreakdown || []
  const globalFee = report?.globalFee || 0

  // Derived month-filtered stats
  const activeMonthIdx = selectedMonth !== '' ? Number(selectedMonth) : null
  
  const displayRevenue = activeMonthIdx !== null
    ? (months[activeMonthIdx]?.revenue || 0)
    : (totals.totalRevenue || 0)
    
  const displayExpected = activeMonthIdx !== null
    ? (months[activeMonthIdx]?.expectedDue || 0)
    : (totals.totalExpected || 0)
    
  const displayPromotions = activeMonthIdx !== null
    ? (months[activeMonthIdx]?.promotionCount || 0)
    : (totals.totalPromotions || 0)
    
  const displayPromotionValue = activeMonthIdx !== null
    ? (months[activeMonthIdx]?.promotionValue || 0)
    : (totals.totalPromotionValue || 0)
    
  const displayOutstanding = Math.max(0, displayExpected - displayRevenue - displayPromotionValue)

  const chartData = {
    labels: MONTH_SHORT,
    datasets: [
      {
        label: 'Revenue Collected',
        data: months.map(m => m.revenue),
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124, 58, 237, 0.08)',
        fill: true,
        tension: 0.4,
        pointRadius: months.map((_, idx) => idx === activeMonthIdx ? 7 : 4),
        pointBackgroundColor: months.map((_, idx) => idx === activeMonthIdx ? '#7c3aed' : '#ffffff'),
        pointBorderWidth: months.map((_, idx) => idx === activeMonthIdx ? 3 : 1),
        pointHoverRadius: 6,
        yAxisID: 'y',
      },
      {
        label: 'Expected Revenue',
        data: months.map(m => m.expectedDue),
        borderColor: '#2563eb',
        backgroundColor: 'transparent',
        borderDash: [6, 3],
        tension: 0.4,
        pointRadius: months.map((_, idx) => idx === activeMonthIdx ? 6 : 3),
        pointBackgroundColor: months.map((_, idx) => idx === activeMonthIdx ? '#2563eb' : '#ffffff'),
        pointBorderWidth: months.map((_, idx) => idx === activeMonthIdx ? 3 : 1),
        pointHoverRadius: 5,
        yAxisID: 'y',
      },
      {
        label: 'New Owners',
        data: months.map(m => m.newOwners),
        borderColor: '#f43f5e',
        backgroundColor: 'transparent',
        borderDash: [4, 4],
        tension: 0.4,
        pointRadius: months.map((_, idx) => idx === activeMonthIdx ? 6 : 3),
        pointBackgroundColor: months.map((_, idx) => idx === activeMonthIdx ? '#f43f5e' : '#ffffff'),
        pointBorderWidth: months.map((_, idx) => idx === activeMonthIdx ? 3 : 1),
        pointHoverRadius: 5,
        yAxisID: 'y1',
      }
    ]
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        padding: 12,
        cornerRadius: 12,
        callbacks: {
          label: (context) => {
            if (context.dataset.label === 'New Owners') return ` New Owners: ${context.raw}`
            return ` ${context.dataset.label}: LKR ${Number(context.raw).toLocaleString()}`
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
          callback: (value) => value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value
        }
      },
      y1: {
        beginAtZero: true,
        position: 'right',
        grid: { display: false },
        ticks: { font: { size: 9, weight: 'bold' }, color: '#f43f5e', stepSize: 1 }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 9, weight: 'bold' }, color: '#64748b', padding: 10 }
      }
    }
  }

  // ── Download Report (no graphs, professional table) ─────────────────────────
  const handleDownload = () => {
    const now = new Date()
    const generatedAt = now.toLocaleString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

    const titleText = activeMonthIdx !== null
      ? `📊 Platform Revenue Report — ${MONTH_NAMES[activeMonthIdx]} ${year}`
      : `📊 Platform Revenue Report — ${year}`;

    const reportFileName = activeMonthIdx !== null
      ? `revenue-report-${MONTH_NAMES[activeMonthIdx].toLowerCase()}-${year}.html`
      : `revenue-report-${year}.html`;

    const rows = months.map((m, i) => {
      const outstanding = Math.max(0, m.expectedDue - m.revenue - m.promotionValue)
      const isSelected = i === activeMonthIdx
      const rowStyle = isSelected ? `background-color:#faf5ff;border-left:4px solid #7c3aed;font-weight:700;` : `border-bottom:1px solid #e2e8f0;`
      return `
        <tr style="${rowStyle}">
          <td style="padding:10px 14px;font-weight:700;color:#1e293b">${MONTH_NAMES[i]}${isSelected ? ' (Selected)' : ''}</td>
          <td style="padding:10px 14px;text-align:right;color:#475569">${m.ownerCount}</td>
          <td style="padding:10px 14px;text-align:right;font-weight:600;color:#2563eb">LKR ${formatMoneyRaw(m.expectedDue)}</td>
          <td style="padding:10px 14px;text-align:right;font-weight:700;color:#16a34a">LKR ${formatMoneyRaw(m.revenue)}</td>
          <td style="padding:10px 14px;text-align:right;font-weight:700;color:#7c3aed">${m.promotionCount > 0 ? `${m.promotionCount} (LKR ${formatMoneyRaw(m.promotionValue)})` : '—'}</td>
          <td style="padding:10px 14px;text-align:right;font-weight:700;color:${outstanding > 0 ? '#dc2626' : '#94a3b8'}">${outstanding > 0 ? 'LKR ' + formatMoneyRaw(outstanding) : '✓ Settled'}</td>
          <td style="padding:10px 14px;text-align:right;color:#475569">${m.newOwners > 0 ? '+' + m.newOwners : '—'}</td>
        </tr>`
    }).join('')

    const ownerRows = ownerBreakdown.map(o => {
      const isPromoThisMonth = activeMonthIdx !== null && o.monthlyData?.[activeMonthIdx]?.isPromotion;
      const promoValThisMonth = activeMonthIdx !== null ? (o.monthlyData?.[activeMonthIdx]?.promoValue || 0) : 0;
      
      const displayTotalPaid = activeMonthIdx !== null
        ? (o.monthlyData?.[activeMonthIdx]?.paid || 0)
        : o.totalPaid;

      const promoText = activeMonthIdx !== null
        ? (isPromoThisMonth ? `Promo (LKR ${formatMoneyRaw(promoValThisMonth)})` : '—')
        : (o.promotionCount > 0
            ? o.promotionMonths.map(p => {
                const d = new Date(p.start)
                return `${MONTH_NAMES[d.getMonth()]} (LKR ${formatMoneyRaw(p.value)})`
              }).join(', ')
            : '—');

      return `
        <tr style="border-bottom:1px solid #f1f5f9; ${activeMonthIdx !== null && isPromoThisMonth ? 'background-color:#faf5ff;' : ''}">
          <td style="padding:10px 14px;font-weight:700;color:#1e293b">${o.name}</td>
          <td style="padding:10px 14px;color:#475569">@${o.username}</td>
          <td style="padding:10px 14px;text-align:right;color:#2563eb">LKR ${formatMoneyRaw(o.monthlyPrice)}</td>
          <td style="padding:10px 14px;text-align:right;font-weight:700;color:#16a34a">LKR ${formatMoneyRaw(displayTotalPaid)}</td>
          <td style="padding:10px 14px;color:#7c3aed">${promoText}</td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Revenue Report — ${activeMonthIdx !== null ? MONTH_NAMES[activeMonthIdx] + ' ' : ''}${year}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; background: #fff; padding: 40px; }
    .header { border-bottom: 3px solid #7c3aed; padding-bottom: 24px; margin-bottom: 32px; }
    .header h1 { font-size: 28px; font-weight: 900; color: #7c3aed; letter-spacing: -0.5px; }
    .header p { font-size: 12px; color: #64748b; margin-top: 6px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 36px; }
    .metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; }
    .metric .label { font-size: 10px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 8px; }
    .metric .value { font-size: 20px; font-weight: 900; color: #1e293b; }
    .metric.violet { border-color: #e9d5ff; background: #faf5ff; }
    .metric.violet .value { color: #7c3aed; }
    .metric.green .value { color: #16a34a; }
    .metric.rose .value { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 36px; }
    thead { background: #f1f5f9; }
    thead th { padding: 12px 14px; text-align: left; font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1px; }
    thead th:not(:first-child) { text-align: right; }
    tfoot { background: #1e293b; color: #fff; }
    tfoot td { padding: 12px 14px; font-weight: 800; text-align: right; font-size: 13px; }
    tfoot td:first-child { text-align: left; }
    .section-title { font-size: 13px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px; margin-top: 40px; border-left: 4px solid #7c3aed; padding-left: 12px; }
    .legend { display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #475569; }
    .legend-dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; }
    .footer { margin-top: 48px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; font-weight: 600; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${titleText}</h1>
    <p>Generated on ${generatedAt} &nbsp;·&nbsp; BookingSaaS Admin Console</p>
  </div>

  <div class="summary">
    <div class="metric green">
      <div class="label">Total Revenue Collected</div>
      <div class="value">LKR ${formatMoneyRaw(displayRevenue)}</div>
    </div>
    <div class="metric">
      <div class="label">Total Expected Revenue</div>
      <div class="value">LKR ${formatMoneyRaw(displayExpected)}</div>
    </div>
    <div class="metric rose">
      <div class="label">Outstanding</div>
      <div class="value">LKR ${formatMoneyRaw(displayOutstanding)}</div>
    </div>
    <div class="metric violet">
      <div class="label">Promotions Given</div>
      <div class="value">${displayPromotions || 0} (LKR ${formatMoneyRaw(displayPromotionValue)})</div>
    </div>
  </div>

  <p class="section-title">Legend</p>
  <div class="legend">
    <div class="legend-item"><div class="legend-dot" style="background:#2563eb"></div> Expected Revenue: Total fees due based on each owner's custom or default monthly price</div>
    <div class="legend-item"><div class="legend-dot" style="background:#16a34a"></div> Revenue Collected: Actual payments approved by admin</div>
    <div class="legend-item"><div class="legend-dot" style="background:#7c3aed"></div> Promotions: Months waived as free trials (not counted as revenue)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#dc2626"></div> Outstanding: Expected − Collected − Promotions (unpaid)</div>
    <div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div> Yearly payments are distributed evenly across all 12 months (÷12)</div>
  </div>

  <p class="section-title">Monthly Revenue Breakdown — ${year}</p>
  <table>
    <thead>
      <tr>
        <th>Month</th>
        <th style="text-align:right">Active Owners</th>
        <th style="text-align:right">Expected Revenue</th>
        <th style="text-align:right">Collected</th>
        <th style="text-align:right">Promotions</th>
        <th style="text-align:right">Outstanding</th>
        <th style="text-align:right">New Owners</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td>TOTAL</td>
        <td>—</td>
        <td>LKR ${formatMoneyRaw(totals.totalExpected)}</td>
        <td>LKR ${formatMoneyRaw(totals.totalRevenue)}</td>
        <td>${totals.totalPromotions || 0} (LKR ${formatMoneyRaw(totals.totalPromotionValue)})</td>
        <td>LKR ${formatMoneyRaw(totals.outstanding)}</td>
        <td>—</td>
      </tr>
    </tfoot>
  </table>

  <p class="section-title">Owner-Level Breakdown</p>
  <table>
    <thead>
      <tr>
        <th>Owner Name</th>
        <th>Username</th>
        <th style="text-align:right">Monthly Fee</th>
        <th style="text-align:right">${activeMonthIdx !== null ? 'Paid (' + MONTH_SHORT[activeMonthIdx] + ' ' + year + ')' : 'Total Paid (' + year + ')'}</th>
        <th>${activeMonthIdx !== null ? 'Promotion (' + MONTH_SHORT[activeMonthIdx] + ')' : 'Promotions Received'}</th>
      </tr>
    </thead>
    <tbody>${ownerRows}</tbody>
  </table>

  <div class="footer">
    BookingSaaS Platform &nbsp;·&nbsp; Confidential Financial Report &nbsp;·&nbsp; ${activeMonthIdx !== null ? MONTH_NAMES[activeMonthIdx] + ' ' : ''}${year} ${activeMonthIdx !== null ? 'Monthly' : 'Annual'} Overview
  </div>
</body>
</html>`

    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = reportFileName
    a.click()
    URL.revokeObjectURL(url)
  }

  const currentMonthIdx = new Date().getMonth()

  return (
    <div className="space-y-8 admin-fade">
      {/* Header */}
      <div className="admin-hero-card">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-violet-600">Performance</p>
            <h1 className="mt-3 text-3xl font-extrabold text-slate-900 tracking-tight">Revenue Reports</h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Legend chips */}
            <div className="hidden md:flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-100 flex-wrap">
              {[
                { color: '#7c3aed', label: 'Collected' },
                { color: '#2563eb', label: 'Expected' },
                { color: '#f43f5e', label: 'Owners' },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white shadow-sm">
                  <div className="h-2 w-2 rounded-full" style={{ background: l.color }} />
                  <span className="text-[12px] font-bold text-slate-600 uppercase">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Filter bar */}
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
          <div className="admin-filter-group w-48">
            <label className="admin-filter-label">Report Month</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="admin-filter-input font-bold"
            >
              <option value="">All Months (Annual)</option>
              {MONTH_NAMES.map((m, idx) => (
                <option key={idx} value={String(idx)}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 pb-0.5">
            <button
              onClick={handleDownload}
              disabled={loading || !report}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
              style={{ background: '#7c3aed', color: '#fff' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Report
            </button>
          </div>
        </div>
      </div>

      {error && <div className="admin-alert">{error}</div>}

      {/* Summary metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="admin-metric group">
          <p>Total Revenue</p>
          <h3 className="text-emerald-600">{formatMoney(displayRevenue)}</h3>
          <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 w-full" />
          </div>
        </div>
        <div className="admin-metric">
          <p>Expected Revenue</p>
          <h3 className="text-blue-600">{formatMoney(displayExpected)}</h3>
        </div>
        <div className="admin-metric">
          <p>Outstanding</p>
          <h3 className="text-rose-600">{formatMoney(displayOutstanding)}</h3>
        </div>
        <div className="admin-metric group border-violet-100 bg-violet-50/30">
          <p className="text-violet-600">Promotions Given</p>
          <h3 className="text-violet-600">{displayPromotions || 0}</h3>
          <p className="text-xs font-bold text-violet-400 mt-1">{formatMoney(displayPromotionValue)} waived</p>
        </div>
      </div>

      {/* Chart */}
      <div className="admin-card overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-lg font-bold text-slate-900">Revenue Pulse — {year}</h2>
        </div>
        <div className="relative h-[300px] md:h-[380px] w-full">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-[2px] z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
                <p className="text-[13px] font-bold text-slate-400 uppercase tracking-widest">Processing Data...</p>
              </div>
            </div>
          ) : null}
          {!loading && <Line data={chartData} options={chartOptions} />}
        </div>
      </div>

      {/* Monthly breakdown table */}
      <div className="admin-card overflow-hidden !p-0">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">
            Monthly Breakdown — {selectedMonth !== '' ? MONTH_NAMES[activeMonthIdx] + ' ' : ''}{year}
          </h2>
          {selectedMonth !== '' && (
            <button
              onClick={() => setSelectedMonth('')}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 font-bold uppercase tracking-wider transition-colors"
            >
              Clear Month Filter
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Owners</th>
                <th>Expected</th>
                <th>Collected</th>
                <th>Promotions</th>
                <th>Outstanding</th>
                <th>New</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="py-8 text-center text-slate-400 font-medium">Loading...</td></tr>
              ) : months.map((m, i) => {
                const outstanding = Math.max(0, m.expectedDue - m.revenue - m.promotionValue)
                const isCurrentMonth = i === currentMonthIdx && Number(year) === new Date().getFullYear()
                const isSelected = i === activeMonthIdx
                return (
                  <tr
                    key={i}
                    onClick={() => setSelectedMonth(prev => prev === String(i) ? '' : String(i))}
                    className={`admin-table-row cursor-pointer transition-all ${
                      isSelected ? 'bg-violet-100/70 font-black border-l-4 border-l-violet-600' :
                      isCurrentMonth ? 'bg-violet-50/30' : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="font-bold text-slate-900">
                      {MONTH_SHORT[i]}
                      {isCurrentMonth && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-black uppercase tracking-wide"
                          style={{ background: '#ede9fe', color: '#7c3aed' }}>Now</span>
                      )}
                    </td>
                    <td className="text-slate-500">{m.ownerCount}</td>
                    <td className="font-bold text-blue-600">{formatMoney(m.expectedDue)}</td>
                    <td className="font-bold text-emerald-600">{formatMoney(m.revenue)}</td>
                    <td>
                      {m.promotionCount > 0 ? (
                        <span className="flex items-center gap-1 text-violet-600 font-bold">
                          <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded-full"
                            style={{ background: '#ede9fe' }}>
                            {m.promotionCount}
                          </span>
                          <span className="text-xs">{formatMoney(m.promotionValue)}</span>
                        </span>
                      ) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className={`font-bold ${outstanding > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                      {outstanding > 0 ? formatMoney(outstanding) : '✓'}
                    </td>
                    <td className="text-slate-500">
                      {m.newOwners > 0 ? (
                        <span className="text-emerald-600 font-bold font-black">+{m.newOwners}</span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
              {/* Totals row */}
              {!loading && (
                <tr className="bg-slate-900 text-white">
                  <td className="font-black py-4 !text-white">TOTAL</td>
                  <td className="font-bold !text-slate-400">—</td>
                  <td className="font-black !text-blue-300">{formatMoney(totals.totalExpected)}</td>
                  <td className="font-black !text-emerald-300">{formatMoney(totals.totalRevenue)}</td>
                  <td className="font-black !text-violet-300">
                    {totals.totalPromotions || 0} ({formatMoney(totals.totalPromotionValue)})
                  </td>
                  <td className="font-black !text-rose-300">{formatMoney(totals.outstanding)}</td>
                  <td className="font-bold !text-slate-400">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Owner breakdown */}
      <div className="admin-card overflow-hidden !p-0">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest">Owner Revenue Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Monthly Fee</th>
                <th>{activeMonthIdx !== null ? `Paid (${MONTH_SHORT[activeMonthIdx]} ${year})` : `Total Paid (${year})`}</th>
                <th>{activeMonthIdx !== null ? `Promotion (${MONTH_SHORT[activeMonthIdx]})` : 'Promotions'}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4" className="py-8 text-center text-slate-400">Loading...</td></tr>
              ) : ownerBreakdown.length === 0 ? (
                <tr><td colSpan="4" className="py-8 text-center text-slate-400">No owners found</td></tr>
              ) : ownerBreakdown.map(o => {
                const isPromoActive = activeMonthIdx !== null && o.monthlyData?.[activeMonthIdx]?.isPromotion;
                const promoValue = activeMonthIdx !== null ? (o.monthlyData?.[activeMonthIdx]?.promoValue || 0) : 0;
                const paidAmount = activeMonthIdx !== null ? (o.monthlyData?.[activeMonthIdx]?.paid || 0) : o.totalPaid;
                
                return (
                  <tr key={o.id} className="admin-table-row">
                    <td>
                      <div className="font-bold text-slate-900">{o.name}</div>
                      <div className="text-[12px] text-slate-400">@{o.username}</div>
                    </td>
                    <td className="font-bold text-blue-600">{formatMoney(o.monthlyPrice)}</td>
                    <td className="font-bold text-emerald-600">{formatMoney(paidAmount)}</td>
                    <td>
                      {activeMonthIdx !== null ? (
                        isPromoActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase"
                            style={{ background: '#ede9fe', color: '#7c3aed' }}>
                            Active ({formatMoney(promoValue)})
                          </span>
                        ) : <span className="text-slate-300 text-sm">—</span>
                      ) : (
                        o.promotionCount > 0 ? (
                          <div className="space-y-1">
                            {o.promotionMonths.map((p, pi) => {
                              const d = new Date(p.start)
                              return (
                                <span key={pi} className="inline-flex items-center gap-1 mr-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase"
                                  style={{ background: '#ede9fe', color: '#7c3aed' }}>
                                  {MONTH_SHORT[d.getMonth()]} · {formatMoney(p.value)}
                                </span>
                              )
                            })}
                          </div>
                        ) : <span className="text-slate-300 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
