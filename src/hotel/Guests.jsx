import React, { useEffect, useState, useCallback } from 'react';
import api from '../api';

const statusColors = {
  confirmed: 'bg-blue-50 text-blue-600',
  'checked-in': 'bg-emerald-50 text-emerald-600',
  'checked-out': 'bg-slate-100 text-slate-500',
  cancelled: 'bg-rose-50 text-rose-600',
  pending: 'bg-amber-50 text-amber-600',
};

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function calcNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  const diff = new Date(checkOut) - new Date(checkIn);
  return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export default function Guests() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selected, setSelected] = useState(null);

  const fetchGuests = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (q) params.q = q;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.get('/owner/guests', { params });
      setGuests(res.data.data || []);
    } catch (err) {
      console.error('Failed to load guests', err);
    } finally {
      setLoading(false);
    }
  }, [q, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => fetchGuests(), 300);
    return () => clearTimeout(timer);
  }, [fetchGuests]);

  const clearFilters = () => {
    setQ('');
    setStartDate('');
    setEndDate('');
  };

  const stats = {
    total: guests.length,
    checkedIn: guests.filter(g => g.status === 'checked-in').length,
    upcoming: guests.filter(g => g.status === 'confirmed' || g.status === 'pending').length,
    checkedOut: guests.filter(g => g.status === 'checked-out').length,
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-full">
      {/* Header */}
      <div className="mb-8">
        <p className="text-xs font-black text-blue-600 uppercase tracking-[0.2em] mb-2">Guest Directory</p>
        <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">All Guests</h1>
        <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">
          Complete guest history across all properties
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Guests', value: stats.total, color: 'text-slate-900', bg: 'bg-white' },
          { label: 'Checked In', value: stats.checkedIn, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Upcoming', value: stats.upcoming, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Checked Out', value: stats.checkedOut, color: 'text-slate-500', bg: 'bg-slate-100' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl border border-slate-100 p-5 shadow-sm`}>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Search */}
          <div className="flex-1 min-w-[220px]">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Search Guest</label>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
                placeholder="Name, contact, or NIC..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
          </div>

          {/* Check-in from */}
          <div className="min-w-[150px]">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Stay From</label>
            <input
              type="date"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Check-out to */}
          <div className="min-w-[150px]">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Stay To</label>
            <input
              type="date"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          {(q || startDate || endDate) && (
            <button onClick={clearFilters} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 text-sm font-bold transition-all self-end">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear
            </button>
          )}
        </div>
        {(startDate || endDate) && (
          <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest mt-3 ml-1">
            Showing guests whose stay overlaps with selected date range
          </p>
        )}
      </div>

      {/* Guest Table — Desktop */}
      <div className="hidden lg:block bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-6">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/60 border-b border-slate-100">
              <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Guest</th>
              <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
              <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Property / Room</th>
              <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Check-In</th>
              <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Check-Out</th>
              <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Nights</th>
              <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Guests</th>
              <th className="px-5 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              <tr>
                <td colSpan="8" className="py-16 text-center">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </td>
              </tr>
            ) : guests.length === 0 ? (
              <tr>
                <td colSpan="8" className="py-20 text-center">
                  <p className="text-xs font-black text-slate-300 uppercase tracking-[0.2em]">No guests found</p>
                </td>
              </tr>
            ) : (
              guests.map((g) => (
                <tr
                  key={g.id}
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                  onClick={() => setSelected(g)}
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center font-black text-blue-600 text-sm">
                        {g.guestName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">{g.guestName}</p>
                        {g.guestNic && <p className="text-[11px] font-bold text-slate-400 uppercase">{g.guestNic}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-600">{g.guestContact}</td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-slate-800">{g.propertyName}</p>
                    <p className="text-[11px] font-bold text-slate-400 uppercase">Room {g.roomNumber} · {g.roomType}</p>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-700 whitespace-nowrap">{formatDate(g.checkInDate)}</td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-700 whitespace-nowrap">{formatDate(g.checkOutDate)}</td>
                  <td className="px-5 py-4">
                    <span className="text-sm font-black text-slate-900">{calcNights(g.checkInDate, g.checkOutDate)}</span>
                    <span className="text-[11px] font-bold text-slate-400 ml-1">nights</span>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-slate-600">
                    {g.adults}A {g.children > 0 ? `${g.children}C` : ''}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${statusColors[g.status] || 'bg-slate-100 text-slate-500'}`}>
                      {g.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Guest Cards — Mobile */}
      <div className="lg:hidden space-y-3 mb-6">
        {loading ? (
          <div className="py-12 text-center text-slate-400 font-medium">Loading guests...</div>
        ) : guests.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-medium">No guests found</div>
        ) : (
          guests.map((g) => (
            <div
              key={g.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => setSelected(g)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center font-black text-blue-600">
                    {g.guestName?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{g.guestName}</p>
                    <p className="text-xs font-bold text-slate-400">{g.guestContact}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColors[g.status] || 'bg-slate-100 text-slate-500'}`}>
                  {g.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-50">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Check-In</p>
                  <p className="text-xs font-bold text-slate-700">{formatDate(g.checkInDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Check-Out</p>
                  <p className="text-xs font-bold text-slate-700">{formatDate(g.checkOutDate)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-0.5">Room</p>
                  <p className="text-xs font-bold text-slate-700">{g.roomNumber}</p>
                </div>
              </div>
              <p className="text-[11px] font-bold text-slate-400 mt-2">{g.propertyName} · {calcNights(g.checkInDate, g.checkOutDate)} nights</p>
            </div>
          ))
        )}
      </div>

      {guests.length > 0 && (
        <p className="text-center text-[11px] font-black text-slate-300 uppercase tracking-widest">{guests.length} record{guests.length !== 1 ? 's' : ''} found</p>
      )}

      {/* Guest Detail Modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300 max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 pt-8 pb-10 relative flex-shrink-0">
              <button onClick={() => setSelected(null)} className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-white/20 flex items-center justify-center text-white font-black text-2xl">
                  {selected.guestName?.[0]?.toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-white">{selected.guestName}</h3>
                  <p className="text-blue-200 text-sm font-bold">{selected.guestContact}</p>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="-mt-6 mx-4 bg-white rounded-2xl shadow-sm border border-slate-100 p-4 grid grid-cols-3 gap-3 relative z-10">
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Check-In</p>
                  <p className="text-xs font-black text-slate-900 mt-0.5">{formatDate(selected.checkInDate)}</p>
                </div>
                <div className="text-center border-x border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Nights</p>
                  <p className="text-lg font-black text-blue-600 mt-0.5">{calcNights(selected.checkInDate, selected.checkOutDate)}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Check-Out</p>
                  <p className="text-xs font-black text-slate-900 mt-0.5">{formatDate(selected.checkOutDate)}</p>
                </div>
              </div>
              <div className="p-6 pt-4 space-y-3">
                {[
                  { label: 'Property', value: selected.propertyName },
                  { label: 'Room', value: `${selected.roomNumber} — ${selected.roomType}${selected.floor ? ` (Floor ${selected.floor})` : ''}` },
                  { label: 'Guests', value: `${selected.adults} Adult${selected.adults !== 1 ? 's' : ''}${selected.children > 0 ? `, ${selected.children} Child${selected.children !== 1 ? 'ren' : ''}` : ''}` },
                  selected.guestNic ? { label: 'NIC', value: selected.guestNic } : null,
                  { label: 'Status', value: selected.status, isStatus: true },
                  selected.notes ? { label: 'Notes', value: selected.notes } : null,
                ].filter(Boolean).map(({ label, value, isStatus }) => (
                  <div key={label} className="flex items-start justify-between gap-3">
                    <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider flex-shrink-0 w-20">{label}</span>
                    {isStatus ? (
                      <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${statusColors[value] || 'bg-slate-100 text-slate-500'}`}>{value}</span>
                    ) : (
                      <span className="text-sm font-bold text-slate-800 text-right">{value}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="px-6 pb-6 pt-2 flex-shrink-0 bg-white border-t border-slate-50">
              <button onClick={() => setSelected(null)} className="w-full py-3 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-all">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
