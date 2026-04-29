import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

export default function BookingHistory() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [paymentsByBooking, setPaymentsByBooking] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const [bookingsRes, paymentsRes] = await Promise.allSettled([
          api.get('/bookings'),
          api.get('/payments'),
        ]);

        if (bookingsRes.status !== 'fulfilled') {
          throw bookingsRes.reason;
        }

        const bookingRows = bookingsRes.value.data?.data || [];
        const paymentRows =
          paymentsRes.status === 'fulfilled' ? paymentsRes.value.data?.data || [] : [];

        const paymentsMap = paymentRows.reduce((acc, pay) => {
          const bookingId = pay.bookingId;
          if (!bookingId) return acc;
          const prev = acc[bookingId] || { total: 0, count: 0 };
          acc[bookingId] = {
            total: prev.total + Number(pay.amount || 0),
            count: prev.count + 1,
          };
          return acc;
        }, {});

        if (isMounted) {
          setBookings(bookingRows);
          setPaymentsByBooking(paymentsMap);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError('Failed to load bookings.');
          setBookings([]);
          setPaymentsByBooking({});
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

  const normalizedBookings = useMemo(() => {
    return bookings.map((b) => {
      const paymentInfo = paymentsByBooking[b.id];
      const paymentStatus = paymentInfo && paymentInfo.total > 0 ? 'paid' : 'pending';
      return {
        id: b.id,
        guestName: b.guestName,
        guestPhone: b.guestContact || '- ',
        roomNumber: b.roomNumber || 'N/A',
        roomType: b.roomType || 'Unknown',
        guestCount: (Number(b.adults || 0) + Number(b.children || 0)) || 1,
        startDate: b.checkInDate,
        endDate: b.checkOutDate,
        status: b.status,
        paymentStatus,
      };
    });
  }, [bookings, paymentsByBooking]);

  const filteredBookings = useMemo(() => {
    return normalizedBookings.filter(b => {
      const matchesSearch = b.guestName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           b.roomNumber.includes(searchTerm) ||
                           b.guestPhone.includes(searchTerm);
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchesPayment = paymentFilter === 'all' || b.paymentStatus === paymentFilter;
      
      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [normalizedBookings, searchTerm, statusFilter, paymentFilter]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-100 text-emerald-700';
      case 'pending': return 'bg-amber-100 text-amber-700';
      case 'checked-in': return 'bg-blue-100 text-blue-700';
      case 'checkout': return 'bg-slate-100 text-slate-700';
      case 'checked-out': return 'bg-slate-100 text-slate-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getPaymentColor = (status) => {
    switch (status) {
      case 'paid': return 'text-emerald-600 font-black';
      case 'pending': return 'text-amber-600 font-black';
      case 'not paid': return 'text-red-600 font-black';
      default: return 'text-slate-600';
    }
  };

  return (
    <div className="p-6 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">Booking History</h1>
            <p className="text-[10px] md:text-slate-500 font-medium">Manage and track guest reservations.</p>
          </div>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 md:px-6 py-2.5 md:py-3 rounded-2xl font-black text-[10px] md:text-sm transition-all shadow-lg active:scale-95">
            + New Reservation
          </button>
        </div>

        {/* Filters Section */}
        <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl border border-slate-100 mb-6 md:mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Search */}
            <div className="lg:col-span-2 relative">
              <input 
                type="text" 
                placeholder="Search..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl px-10 md:px-12 py-2.5 md:py-3.5 text-[10px] md:text-sm font-bold outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Status Filter */}
            <select 
              className="bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl px-4 md:px-6 py-2.5 md:py-3.5 text-[10px] md:text-sm font-bold outline-none appearance-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="checked-in">Checked In</option>
              <option value="checked-out">Checked Out</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {/* Payment Filter */}
            <select 
              className="bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl px-4 md:px-6 py-2.5 md:py-3.5 text-[10px] md:text-sm font-bold outline-none appearance-none cursor-pointer"
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
            >
              <option value="all">All Payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="not paid">Not Paid</option>
            </select>
          </div>
        </div>

        {/* Bookings Table */}
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Room</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Guest & Contact</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Count</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Stay Dates</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Payment</th>
                <th className="px-4 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan="7" className="px-8 py-12 text-center text-slate-400 text-xs font-bold">
                      Loading bookings...
                    </td>
                  </tr>
                )}
                {!isLoading && loadError && (
                  <tr>
                    <td colSpan="7" className="px-8 py-12 text-center text-rose-500 text-xs font-bold">
                      {loadError}
                    </td>
                  </tr>
                )}
                {filteredBookings.map((booking) => (
                  <tr 
                    key={booking.id} 
                    onClick={() => navigate(`/hotel/bookings/${booking.id}`)}
                    className="group border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4">
                      <p className="text-xs font-black text-slate-800 tracking-tight">{booking.roomNumber}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase">{booking.roomType}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-[80px]">
                          <p className="text-[11px] font-black text-slate-800 leading-none group-hover:text-blue-600 transition-colors truncate">{booking.guestName}</p>
                        </div>
                        <div className="w-px h-3 bg-slate-100"></div>
                        <div className="flex-1">
                          <p className="text-[9px] font-bold text-slate-400 tracking-tighter tabular-nums whitespace-nowrap">{booking.guestPhone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center text-xs font-black text-slate-600">
                      {booking.guestCount}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-black text-slate-700 flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-emerald-500"></div> {booking.startDate}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-red-500"></div> {booking.endDate}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${getStatusColor(booking.status)}`}>
                        {booking.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 uppercase text-[9px] tracking-widest">
                      <span className={getPaymentColor(booking.paymentStatus)}>{booking.paymentStatus}</span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button className="p-1.5 hover:bg-white rounded-xl transition-colors text-slate-300 hover:text-blue-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && !loadError && filteredBookings.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-8 py-20 text-center">
                      <div className="flex flex-col items-center">
                        <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <p className="text-slate-500 font-bold tracking-tight">No bookings match your current search/filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
