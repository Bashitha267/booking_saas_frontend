import React, { useState } from 'react';
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
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const financeData = {
  summary: {
    totalRevenue: 1254000.00,
    pendingPayments: 85200.00,
    occupancyRate: 78,
    netProfit: 985000.00
  },
  methodBreakdown: [
    { method: 'Cash', amount: 450000.00, percentage: 36, color: 'bg-emerald-500' },
    { method: 'Card', amount: 620000.00, percentage: 49, color: 'bg-blue-500' },
    { method: 'Transfer', amount: 184000.00, percentage: 15, color: 'bg-amber-500' }
  ],
  roomTypePopularity: [
    { type: 'Deluxe Rooms', count: 45, percentage: 55, color: 'bg-blue-600' },
    { type: 'Luxury Suites', count: 22, percentage: 27, color: 'bg-indigo-600' },
    { type: 'Standard Rooms', count: 15, percentage: 18, color: 'bg-slate-400' }
  ],
  categoryBreakdown: [
    { name: 'Room Charges', amount: 850000.00, color: 'text-blue-600' },
    { name: 'Food & Beverage', amount: 245000.00, color: 'text-emerald-600' },
    { name: 'Laundry', amount: 45000.00, color: 'text-amber-600' },
    { name: 'Mini Bar', amount: 114000.00, color: 'text-rose-600' }
  ],
  monthlyPerformance: [
    { month: 'Jan', revenue: 850000, bookings: 42 },
    { month: 'Feb', revenue: 920000, bookings: 48 },
    { month: 'Mar', revenue: 1100000, bookings: 56 },
    { month: 'Apr', revenue: 1254000, bookings: 64 },
    { month: 'May', revenue: 1150000, bookings: 59 },
    { month: 'Jun', revenue: 1380000, bookings: 72 }
  ],
  expenses: [
    { id: 1, category: 'Electricity Bill', amount: 85000.00, date: '2024-04-15', status: 'Paid', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
    { id: 2, category: 'Water Bill', amount: 12400.00, date: '2024-04-12', status: 'Paid', icon: 'M19 14l-7 7m0 0l-7-7m7 7V3' },
    { id: 3, category: 'Staff Salaries', amount: 450000.00, date: '2024-04-01', status: 'Paid', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 4, category: 'Maintenance', amount: 35000.00, date: '2024-04-20', status: 'Pending', icon: 'M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 011-1h1a2 2 0 100-4H7a1 1 0 01-1-1V7a1 1 0 011-1h3a1 1 0 001-1V4z' }
  ]
};

export default function FinanceReport() {
  const [reportPeriod, setReportPeriod] = useState('This Month');

  const totalExpenses = financeData.expenses.reduce((acc, exp) => acc + exp.amount, 0);

  const chartData = {
    labels: financeData.monthlyPerformance.map(d => d.month),
    datasets: [
      {
        label: 'Revenue',
        data: financeData.monthlyPerformance.map(d => d.revenue),
        fill: true,
        borderColor: '#3b82f6',
        borderWidth: 2,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
          return gradient;
        },
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 12,
        titleFont: { size: 10, weight: 'bold', family: 'Inter' },
        bodyFont: { size: 12, weight: '900', family: 'Inter' },
        cornerRadius: 16,
        displayColors: false,
        callbacks: {
          label: (context) => {
            const index = context.dataIndex;
            const revenue = context.raw;
            const bookings = financeData.monthlyPerformance[index].bookings;
            return [
              `Rs. ${revenue.toLocaleString()}`,
              `${bookings} Bookings`
            ];
          }
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { 
          color: '#94a3b8', 
          font: { size: 9, weight: 'bold', family: 'Inter' },
          padding: 10
        }
      },
      y: {
        display: false,
        grid: { display: false }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index',
    }
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight">Business Overview</h1>
          <p className="text-xs md:text-sm font-bold text-slate-400 mt-2 uppercase tracking-[0.2em] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Operational Performance for {reportPeriod}
          </p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
          {['This Week', 'This Month', 'This Year'].map((period) => (
            <button
              key={period}
              onClick={() => setReportPeriod(period)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                reportPeriod === period ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Gross Revenue', value: financeData.summary.totalRevenue, trend: '+12.5%', color: 'text-blue-600' },
          { label: 'Total Expenses', value: totalExpenses, trend: '+4.2%', color: 'text-rose-600' },
          { label: 'Current Occupancy', value: `${financeData.summary.occupancyRate}%`, trend: '+8%', color: 'text-emerald-600' },
          { label: 'Net Profit', value: financeData.summary.totalRevenue - totalExpenses, trend: '+15.1%', color: 'text-indigo-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-slate-200/50 transition-all">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <h3 className={`text-2xl font-black tracking-tighter ${stat.color}`}>
                {typeof stat.value === 'number' ? `Rs. ${stat.value.toLocaleString()}` : stat.value}
              </h3>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${stat.trend.startsWith('+') && stat.label !== 'Total Expenses' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {stat.trend}
              </span>
            </div>
            <div className="mt-4 h-1 w-full bg-slate-50 rounded-full overflow-hidden">
               <div className={`h-full ${stat.label === 'Total Expenses' ? 'bg-rose-400' : 'bg-emerald-400'} animate-pulse`} style={{ width: '60%' }}></div>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-8">
        {/* Premium Chart.js Line Chart */}
        <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Performance Flow</h3>
              <p className="text-lg font-black text-slate-800 tracking-tight">Revenue Dynamics</p>
            </div>
          </div>
          
          <div className="h-72 w-full">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Expenses & Popularity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Expenditure Ledger */}
          <div className="lg:col-span-8 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Expenditure Ledger</h3>
                <p className="text-lg font-black text-slate-800 tracking-tight">Monthly Operational Costs</p>
              </div>
              <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95">
                Add Expense
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="pb-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                    <th className="pb-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                    <th className="pb-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                    <th className="pb-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {financeData.expenses.map((exp) => (
                    <tr key={exp.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center group-hover:bg-white group-hover:shadow-sm transition-all">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={exp.icon} /></svg>
                          </div>
                          <p className="text-xs font-black text-slate-700">{exp.category}</p>
                        </div>
                      </td>
                      <td className="py-4">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </td>
                      <td className="py-4">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                          exp.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <p className="text-xs font-black text-slate-800 tracking-tight">Rs. {exp.amount.toLocaleString()}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Booking Popularity</h3>
              <div className="space-y-6">
                {financeData.roomTypePopularity.map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black text-slate-700">{item.type}</span>
                      <span className="text-[10px] font-black text-slate-800">{item.count} Bookings</span>
                    </div>
                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Payment Methods</h3>
              <div className="space-y-6">
                {financeData.methodBreakdown.map((item, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black text-slate-700">{item.method}</span>
                      <span className="text-[10px] font-black text-slate-800">{item.percentage}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.percentage}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
