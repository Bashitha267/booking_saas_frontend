import React, { useEffect, useMemo, useState } from 'react';
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
import api from '../api';

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

const methodColors = {
  cash: 'bg-emerald-500',
  card: 'bg-blue-500',
  bank: 'bg-amber-500',
  online: 'bg-indigo-500',
};

const typePalette = ['bg-blue-600', 'bg-indigo-600', 'bg-emerald-600', 'bg-amber-500', 'bg-slate-400'];

export default function FinanceReport() {
  const [reportPeriod, setReportPeriod] = useState('This Month');
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const [bookingsRes, paymentsRes, roomsRes] = await Promise.allSettled([
          api.get('/bookings'),
          api.get('/payments'),
          api.get('/rooms'),
        ]);

        if (isMounted) {
          if (bookingsRes.status === 'fulfilled') {
            setBookings(bookingsRes.value.data?.data || []);
          }
          if (paymentsRes.status === 'fulfilled') {
            setPayments(paymentsRes.value.data?.data || []);
          }
          if (roomsRes.status === 'fulfilled') {
            setRooms(roomsRes.value.data?.data || []);
          }

          const failed = [
            bookingsRes.status !== 'fulfilled' ? 'bookings' : null,
            paymentsRes.status !== 'fulfilled' ? 'payments' : null,
            roomsRes.status !== 'fulfilled' ? 'rooms' : null,
          ].filter(Boolean);

          if (failed.length) {
            setLoadError(`Failed to load ${failed.join(', ')} data.`);
          }
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const reportRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    if (reportPeriod === 'This Week') {
      start.setDate(now.getDate() - 6);
    } else if (reportPeriod === 'This Month') {
      start.setDate(1);
    } else {
      start.setMonth(0, 1);
    }
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }, [reportPeriod]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const refDate = payment.paidAt || payment.createdAt;
      if (!refDate) return false;
      const date = new Date(refDate);
      return date >= reportRange.start && date <= reportRange.end;
    });
  }, [payments, reportRange]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (!booking.checkInDate) return false;
      const date = new Date(booking.checkInDate);
      return date >= reportRange.start && date <= reportRange.end;
    });
  }, [bookings, reportRange]);

  const totalRevenue = useMemo(() => (
    filteredPayments
      .filter((pay) => pay.status !== 'refunded')
      .reduce((acc, pay) => acc + Number(pay.amount || 0), 0)
  ), [filteredPayments]);

  const pendingPayments = useMemo(() => (
    filteredPayments
      .filter((pay) => pay.status === 'pending')
      .reduce((acc, pay) => acc + Number(pay.amount || 0), 0)
  ), [filteredPayments]);

  const occupancyRate = useMemo(() => {
    if (!rooms.length) return 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const bookedRooms = new Set();
    bookings.forEach((booking) => {
      if (booking.status === 'cancelled') return;
      const start = new Date(booking.checkInDate);
      const end = new Date(booking.checkOutDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      if (today >= start && today <= end) {
        bookedRooms.add(booking.roomId);
      }
    });
    return Math.round((bookedRooms.size / rooms.length) * 100);
  }, [rooms, bookings]);

  const roomById = useMemo(() => {
    const map = new Map();
    rooms.forEach((room) => map.set(room.id, room));
    return map;
  }, [rooms]);

  const roomTypePopularity = useMemo(() => {
    const counts = new Map();
    filteredBookings.forEach((booking) => {
      const room = roomById.get(booking.roomId);
      const type = room?.roomType || 'Unspecified';
      counts.set(type, (counts.get(type) || 0) + 1);
    });
    const total = Array.from(counts.values()).reduce((acc, value) => acc + value, 0) || 1;
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([type, count], index) => ({
        type,
        count,
        percentage: Math.round((count / total) * 100),
        color: typePalette[index % typePalette.length],
      }));
  }, [filteredBookings, roomById]);

  const methodBreakdown = useMemo(() => {
    const totals = new Map();
    filteredPayments.forEach((payment) => {
      const method = (payment.method || 'cash').toLowerCase();
      totals.set(method, (totals.get(method) || 0) + Number(payment.amount || 0));
    });
    const total = Array.from(totals.values()).reduce((acc, value) => acc + value, 0) || 1;
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([method, amount]) => ({
        method: method.charAt(0).toUpperCase() + method.slice(1),
        amount,
        percentage: Math.round((amount / total) * 100),
        color: methodColors[method] || 'bg-slate-400',
      }));
  }, [filteredPayments]);

  const monthBuckets = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleString('default', { month: 'short' }),
      };
    });
  }, []);

  const monthlyPerformance = useMemo(() => {
    const revenueByMonth = new Map();
    const bookingsByMonth = new Map();
    filteredPayments.forEach((payment) => {
      const refDate = payment.paidAt || payment.createdAt;
      if (!refDate) return;
      const date = new Date(refDate);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      revenueByMonth.set(key, (revenueByMonth.get(key) || 0) + Number(payment.amount || 0));
    });
    filteredBookings.forEach((booking) => {
      if (!booking.checkInDate) return;
      const date = new Date(booking.checkInDate);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      bookingsByMonth.set(key, (bookingsByMonth.get(key) || 0) + 1);
    });
    return monthBuckets.map((bucket) => ({
      month: bucket.label,
      revenue: revenueByMonth.get(bucket.key) || 0,
      bookings: bookingsByMonth.get(bucket.key) || 0,
    }));
  }, [filteredPayments, filteredBookings, monthBuckets]);

  const expenses = [];
  const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const netProfit = totalRevenue - totalExpenses;

  const chartData = {
    labels: monthlyPerformance.map(d => d.month),
    datasets: [
      {
        label: 'Revenue',
        data: monthlyPerformance.map(d => d.revenue),
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
            const bookings = monthlyPerformance[index]?.bookings || 0;
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

      {(isLoading || loadError) && (
        <div className="mb-6 flex flex-wrap items-center gap-3 text-[9px] font-black uppercase tracking-widest">
          {isLoading && (
            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full">Loading data...</span>
          )}
          {loadError && (
            <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full">{loadError}</span>
          )}
        </div>
      )}

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Gross Revenue', value: totalRevenue, trend: '--', color: 'text-blue-600' },
          { label: 'Pending Payments', value: pendingPayments, trend: '--', color: 'text-amber-600' },
          { label: 'Current Occupancy', value: `${occupancyRate}%`, trend: '--', color: 'text-emerald-600' },
          { label: 'Net Profit', value: netProfit, trend: '--', color: 'text-indigo-600' }
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 group hover:shadow-xl hover:shadow-slate-200/50 transition-all">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{stat.label}</p>
            <div className="flex items-baseline gap-2">
              <h3 className={`text-2xl font-black tracking-tighter ${stat.color}`}>
                {typeof stat.value === 'number' ? `Rs. ${stat.value.toLocaleString()}` : stat.value}
              </h3>
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md ${stat.trend === '--' ? 'bg-slate-100 text-slate-500' : stat.trend.startsWith('+') && stat.label !== 'Total Expenses' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
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
                  {expenses.map((exp) => (
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
                  {!expenses.length && (
                    <tr>
                      <td colSpan="4" className="py-6 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        No expenses recorded yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Booking Popularity</h3>
              <div className="space-y-6">
                {roomTypePopularity.map((item, i) => (
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
                {!roomTypePopularity.length && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No bookings yet</p>
                )}
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Payment Methods</h3>
              <div className="space-y-6">
                {methodBreakdown.map((item, i) => (
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
                {!methodBreakdown.length && (
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No payments yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
