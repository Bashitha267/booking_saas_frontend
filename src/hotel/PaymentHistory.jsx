import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const VIEW_MODES = [
  { key: 'list',    label: 'Payment List' },
  { key: 'booking', label: 'Booking Wise' },
];

function StatusBadge({ status }) {
  const map = {
    refunded: 'bg-red-50 border-red-200 text-red-700',
    paid: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    partial: 'bg-amber-50 border-amber-200 text-amber-700',
    pending: 'bg-slate-50 border-slate-200 text-slate-500',
  };
  const cls = map[status] || map.paid;
  return (
    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
      {status}
    </span>
  );
}

function MethodBadge({ method }) {
  const m = (method || 'CASH').toUpperCase();
  const map = {
    CASH:   'bg-emerald-50 text-emerald-600 border-emerald-100',
    CARD:   'bg-blue-50 text-blue-600 border-blue-100',
    BANK:   'bg-amber-50 text-amber-600 border-amber-100',
  };
  return (
    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${map[m] || map.CASH}`}>
      {m}
    </span>
  );
}

export default function PaymentHistory() {
  const navigate = useNavigate();

  /* ─── view mode ─── */
  const [viewMode, setViewMode] = useState('list');

  /* ─── shared data ─── */
  const [searchTerm, setSearchTerm]   = useState('');
  const [fromDate, setFromDate]       = useState('');
  const [toDate, setToDate]           = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [payments, setPayments]       = useState([]);
  const [bookings, setBookings]       = useState([]);
  const [bookingsById, setBookingsById] = useState({});
  const [isLoading, setIsLoading]     = useState(true);
  const [loadError, setLoadError]     = useState('');
  const itemsPerPage = 8;

  /* ─── booking-wise history popup ─── */
  const [historyPopup, setHistoryPopup] = useState(null); // booking object with .payments

  /* ─── load ─── */
  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const [paymentsRes, bookingsRes] = await Promise.allSettled([
          api.get('/payments'),
          api.get('/bookings'),
        ]);

        if (paymentsRes.status === 'fulfilled' && isMounted) {
          setPayments(paymentsRes.value.data?.data || []);
        } else if (isMounted) {
          setLoadError(paymentsRes.reason?.response?.data?.message || 'Failed to load payments.');
          setPayments([]);
        }

        if (bookingsRes.status === 'fulfilled' && isMounted) {
          const rows = bookingsRes.value.data?.data || [];
          setBookings(rows);
          setBookingsById(rows.reduce((acc, b) => { acc[b.id] = b; return acc; }, {}));
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    load();
    return () => { isMounted = false; };
  }, []);

  const handleReset = () => {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  /* ═══════════════════════════════════════════
     PAYMENT LIST (existing view) helpers
  ═══════════════════════════════════════════ */
  const normalizedPayments = useMemo(() => payments.map(pay => {
    const booking = bookingsById[pay.bookingId] || {};
    const paidDate = pay.paidAt || pay.createdAt || '';
    const parsedDate = paidDate ? new Date(paidDate) : null;
    const dateValue = parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null;
    return {
      id: pay.id,
      bookingId: pay.bookingId,
      guestName: pay.guestName || booking.guestName || 'Guest',
      contact: booking.guestContact || '-',
      amount: Number(pay.amount || 0),
      dateValue,
      dateLabel: dateValue ? dateValue.toISOString().slice(0, 10) : '',
      reason: pay.note || 'General Payment',
      status: pay.status || 'paid',
      method: pay.method ? pay.method.toUpperCase() : 'CASH',
    };
  }), [payments, bookingsById]);

  const filteredPayments = useMemo(() => normalizedPayments.filter(pay => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = pay.guestName.toLowerCase().includes(q) ||
      pay.reason.toLowerCase().includes(q) ||
      pay.status.toLowerCase().includes(q) ||
      String(pay.bookingId || '').includes(q);
    const payDate = pay.dateValue ? new Date(pay.dateValue) : null;
    const start = fromDate ? new Date(fromDate) : null;
    const end   = toDate   ? new Date(toDate)   : null;
    if (start) start.setHours(0,0,0,0);
    if (end)   end.setHours(23,59,59,999);
    if (payDate) payDate.setHours(12,0,0,0);
    const matchesDate = (!start || (payDate && payDate >= start)) && (!end || (payDate && payDate <= end));
    return matchesSearch && matchesDate;
  }), [normalizedPayments, searchTerm, fromDate, toDate]);

  const totalAmount   = useMemo(() => filteredPayments.filter(p => p.status !== 'refunded').reduce((s, p) => s + p.amount, 0), [filteredPayments]);
  const totalRefunded = useMemo(() => filteredPayments.filter(p => p.status === 'refunded').reduce((s, p) => s + p.amount, 0), [filteredPayments]);
  const totalPages      = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  /* ═══════════════════════════════════════════
     BOOKING WISE helpers
  ═══════════════════════════════════════════ */
  const bookingWiseRows = useMemo(() => {
    // Group payments by bookingId
    const grouped = {};
    payments.forEach(pay => {
      const bid = pay.bookingId;
      if (!bid) return;
      if (!grouped[bid]) grouped[bid] = [];
      grouped[bid].push(pay);
    });

    return bookings.map(b => {
      const bPayments = grouped[b.id] || [];
      const totalPaid = bPayments
        .filter(p => (p.status || 'paid') !== 'refunded')
        .reduce((s, p) => s + Number(p.amount || 0), 0);
      const totalPrice = Number(b.roomPrice || 0);
      const remaining  = Math.max(0, totalPrice - totalPaid);
      return {
        booking: b,
        payments: bPayments,
        totalPaid,
        totalPrice,
        remaining,
        paymentCount: bPayments.length,
      };
    }).filter(row => {
      // apply search
      const q = searchTerm.toLowerCase();
      if (!q) return true;
      return (
        (row.booking.guestName || '').toLowerCase().includes(q) ||
        String(row.booking.id || '').includes(q) ||
        (row.booking.guestContact || '').includes(q)
      );
    });
  }, [bookings, payments, searchTerm]);

  const bwTotalPages      = Math.ceil(bookingWiseRows.length / itemsPerPage);
  const bwPaginatedRows   = bookingWiseRows.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-full">

      {/* Header */}
      <div className="mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight leading-none">Payment Ledger</h1>
          <p className="text-[10px] md:text-xs font-black text-slate-400 mt-2 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Real-time Financial Records
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          {/* View mode toggle */}
          <div className="bg-white border border-slate-100 rounded-2xl p-1 flex shadow-sm">
            {VIEW_MODES.map(m => (
              <button
                key={m.key}
                onClick={() => { setViewMode(m.key); setCurrentPage(1); }}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                  viewMode === m.key
                    ? 'bg-slate-900 text-white shadow-md'
                    : 'text-slate-600 font-bold hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {viewMode === 'list' && (
            <>
              <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100 text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Received</p>
                <p className="text-2xl font-black text-blue-600 tracking-tighter">Rs. {totalAmount.toFixed(2)}</p>
              </div>
              {totalRefunded > 0 && (
                <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100 text-right">
                  <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Total Refunded</p>
                  <p className="text-2xl font-black text-red-600 tracking-tighter">Rs. {totalRefunded.toFixed(2)}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">
              {viewMode === 'booking' ? 'Search Guest / Booking ID' : 'Quick Search'}
            </label>
            <input
              type="text"
              placeholder={viewMode === 'booking' ? 'Guest name or booking ID…' : 'Guest, ID or Reason...'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            />
          </div>
          {viewMode === 'list' && (
            <>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">From Date</label>
                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none" value={fromDate} onChange={e => { setFromDate(e.target.value); setCurrentPage(1); }} />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Till Date</label>
                <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none" value={toDate} onChange={e => { setToDate(e.target.value); setCurrentPage(1); }} />
              </div>
            </>
          )}
          <div className="flex items-end">
            <button
              onClick={handleReset}
              className="w-full bg-slate-900 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
            >
              Reset Filters
            </button>
          </div>
        </div>
      </div>

      {/* ── PAYMENT LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date &amp; Time</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest &amp; Contact</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Booking ID</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Description</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                  <th className="p-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading && (
                  <tr><td colSpan="8" className="p-10 text-center text-slate-400 text-xs font-bold">Loading payments...</td></tr>
                )}
                {!isLoading && loadError && (
                  <tr><td colSpan="8" className="p-10 text-center text-rose-500 text-xs font-bold">{loadError}</td></tr>
                )}
                {paginatedPayments.map(pay => (
                  <tr key={pay.id} onClick={() => navigate(`/hotel/bookings/${pay.bookingId}`, { state: { from: 'payments' } })} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                    <td className="p-5">
                      <p className="text-xs font-black text-slate-700">{pay.dateValue ? pay.dateValue.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">{pay.dateValue ? pay.dateValue.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit', hour12: true }) : '--'}</p>
                    </td>
                    <td className="p-5">
                      <p className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition-colors">{pay.guestName}</p>
                      <p className="text-[10px] font-bold text-slate-400">{pay.contact}</p>
                    </td>
                    <td className="p-5 text-xs font-black text-slate-500">#{pay.bookingId}</td>
                    <td className="p-5">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                        pay.reason === 'Advance Payment' ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : pay.reason === 'Full Payment' ? 'bg-slate-50 text-slate-700 border-slate-200'
                        : 'bg-slate-50 text-slate-400 border-slate-200 italic'
                      }`}>{pay.reason}</span>
                    </td>
                    <td className="p-5"><MethodBadge method={pay.method} /></td>
                    <td className="p-5"><StatusBadge status={pay.status} /></td>
                    <td className="p-5 text-right tracking-tighter">
                      {pay.status === 'refunded' ? (
                        <div>
                          <span className="text-sm font-black text-red-600 line-through">Rs. {pay.amount.toFixed(2)}</span>
                          <span className="block text-[9px] font-bold text-red-500 uppercase mt-0.5">Refunded</span>
                        </div>
                      ) : (
                        <span className="text-sm font-black text-slate-800">Rs. {pay.amount.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="p-5 text-right">
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/hotel/bookings/${pay.bookingId}`, { state: { from: 'payments' } }); }} className="p-2 text-slate-300 hover:text-blue-500 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {!isLoading && !loadError && filteredPayments.length === 0 && (
                  <tr><td colSpan="8" className="p-20 text-center"><p className="text-slate-300 font-black uppercase tracking-[0.2em] italic">No records match your criteria</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={totalPages} setCurrentPage={setCurrentPage} total={filteredPayments.length} itemsPerPage={itemsPerPage} />
        </div>
      )}

      {/* ── BOOKING WISE VIEW ── */}
      {viewMode === 'booking' && (
        <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Booking</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Check-in → Out</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Paid</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Remaining</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Payments</th>
                  <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading && (
                  <tr><td colSpan="8" className="p-10 text-center text-slate-400 text-xs font-bold">Loading...</td></tr>
                )}
                {!isLoading && loadError && (
                  <tr><td colSpan="8" className="p-10 text-center text-rose-500 text-xs font-bold">{loadError}</td></tr>
                )}
                {bwPaginatedRows.map(row => {
                  const b = row.booking;
                  const checkIn  = b.checkInDate  ? new Date(b.checkInDate).toLocaleDateString('default', { day: 'numeric', month: 'short' }) : '-';
                  const checkOut = b.checkOutDate ? new Date(b.checkOutDate).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' }) : '-';
                  const isPaid      = row.remaining <= 0;
                  const isPartial   = row.totalPaid > 0 && !isPaid;
                  return (
                    <tr key={b.id} onClick={() => navigate(`/hotel/bookings/${b.id}`, { state: { from: 'payments' } })} className="hover:bg-blue-50/40 transition-colors group cursor-pointer">
                      <td className="p-5">
                        <span className="text-xs font-black text-slate-500">#{b.id}</span>
                        <span className={`ml-2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                          b.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : b.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100'
                          : b.status === 'cancelled' ? 'bg-red-50 text-red-600 border-red-100'
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}>{b.status}</span>
                      </td>
                      <td className="p-5">
                        <p className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition-colors">{b.guestName || '-'}</p>
                        <p className="text-[10px] font-bold text-slate-400">{b.guestContact || '-'}</p>
                      </td>
                      <td className="p-5 text-xs font-bold text-slate-500">
                        {checkIn} <span className="text-slate-300 mx-1">→</span> {checkOut}
                      </td>
                      <td className="p-5 text-right">
                        <span className="text-sm font-black text-slate-700">Rs. {row.totalPrice.toFixed(2)}</span>
                      </td>
                      <td className="p-5 text-right">
                        <span className="text-sm font-black text-emerald-600">Rs. {row.totalPaid.toFixed(2)}</span>
                      </td>
                      <td className="p-5 text-right">
                        {isPaid ? (
                          <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">Fully Paid</span>
                        ) : (
                          <span className={`text-sm font-black ${isPartial ? 'text-amber-600' : 'text-rose-600'}`}>
                            Rs. {row.remaining.toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="p-5 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-[11px] font-black border border-blue-100">
                          {row.paymentCount}
                        </span>
                      </td>
                      <td className="p-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); setHistoryPopup(row); }}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 transition-all"
                            title="View payment history"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); navigate(`/hotel/bookings/${b.id}`, { state: { from: 'payments' } }); }}
                            className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 transition-all"
                            title="Go to booking"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!isLoading && !loadError && bookingWiseRows.length === 0 && (
                  <tr><td colSpan="8" className="p-20 text-center"><p className="text-slate-300 font-black uppercase tracking-[0.2em] italic">No bookings found</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={currentPage} totalPages={bwTotalPages} setCurrentPage={setCurrentPage} total={bookingWiseRows.length} itemsPerPage={itemsPerPage} />
        </div>
      )}

      {/* ── PAYMENT HISTORY POPUP (Booking Wise) ── */}
      {historyPopup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 md:p-6">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Popup header */}
            <div className="px-6 md:px-8 py-5 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
              <div>
                <h2 className="text-base md:text-lg font-black text-slate-800">Payment History</h2>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  Booking <span className="text-slate-600">#{historyPopup.booking.id}</span>
                  &nbsp;·&nbsp;
                  {historyPopup.booking.guestName || '-'}
                </p>
              </div>
              <button
                onClick={() => setHistoryPopup(null)}
                className="text-slate-300 hover:text-slate-600 transition-colors mt-0.5 shrink-0"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Summary bar */}
            <div className="px-6 md:px-8 py-4 bg-slate-50/60 border-b border-slate-100 grid grid-cols-3 gap-4 shrink-0">
              <div className="text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total</p>
                <p className="text-sm font-black text-slate-700">Rs. {historyPopup.totalPrice.toFixed(2)}</p>
              </div>
              <div className="text-center border-x border-slate-200">
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Paid</p>
                <p className="text-sm font-black text-emerald-600">Rs. {historyPopup.totalPaid.toFixed(2)}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Remaining</p>
                <p className={`text-sm font-black ${historyPopup.remaining <= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {historyPopup.remaining <= 0 ? 'Paid' : `Rs. ${historyPopup.remaining.toFixed(2)}`}
                </p>
              </div>
            </div>

            {/* Payments list */}
            <div className="overflow-y-auto flex-1 px-6 md:px-8 py-4">
              {historyPopup.payments.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="text-slate-300 font-black uppercase tracking-widest text-xs">No payments recorded</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {historyPopup.payments.map((pay, idx) => {
                    const d = pay.paidAt || pay.createdAt;
                    const date = d ? new Date(d) : null;
                    return (
                      <div key={pay.id || idx} className="flex items-center justify-between p-4 bg-slate-50/70 rounded-2xl border border-slate-100 hover:border-blue-100 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-xs font-black text-slate-400">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-700">{pay.note || 'General Payment'}</p>
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                              {date ? date.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                              {date ? ` · ${date.toLocaleTimeString('default', { hour: '2-digit', minute: '2-digit', hour12: true })}` : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <MethodBadge method={pay.method} />
                          <StatusBadge status={pay.status || 'paid'} />
                          <span className="text-sm font-black text-slate-800 min-w-[90px] text-right">
                            Rs. {Number(pay.amount || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 md:px-8 py-4 border-t border-slate-100 flex justify-end gap-3 shrink-0">
              <button
                onClick={() => navigate(`/hotel/bookings/${historyPopup.booking.id}`, { state: { from: 'payments' } })}
                className="px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-black uppercase tracking-wider transition-all"
              >
                View Booking
              </button>
              <button
                onClick={() => setHistoryPopup(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── shared Pagination component ── */
function Pagination({ currentPage, totalPages, setCurrentPage, total, itemsPerPage }) {
  if (totalPages <= 1) return null;
  return (
    <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between">
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
        Showing <span className="text-slate-800">{(currentPage-1)*itemsPerPage + 1}–{Math.min(currentPage*itemsPerPage, total)}</span> of {total}
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => p - 1)}
          className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center gap-1">
          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i+1}
              onClick={() => setCurrentPage(i+1)}
              className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${currentPage === i+1 ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-100'}`}
            >
              {i+1}
            </button>
          ))}
        </div>
        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(p => p + 1)}
          className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  );
}
