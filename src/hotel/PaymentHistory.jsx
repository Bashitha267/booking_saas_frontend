import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const dummyPayments = [
  { id: 1, bookingId: 101, guestName: 'Mark Stevens', contact: '+1 234 567 890', amount: 150.00, date: '2026-04-26', reason: 'Advance Payment', method: 'Cash' },
  { id: 2, bookingId: 102, guestName: 'Sarah Jenkins', contact: '+1 987 654 321', amount: 450.00, date: '2026-04-26', reason: 'Full Settlement', method: 'Card' },
  { id: 3, bookingId: 103, guestName: 'Alan Turing', contact: '+44 20 7946', amount: 75.00, date: '2026-04-25', reason: 'Mini-bar Charges', method: 'Cash' },
  { id: 4, bookingId: 104, guestName: 'Emma Watson', contact: '+44 7700 900', amount: 200.00, date: '2026-04-25', reason: 'Partial Payment', method: 'Transfer' },
  { id: 5, bookingId: 105, guestName: 'John Snow', contact: '+1 555 010', amount: 120.00, date: '2026-04-24', reason: 'Room Service', method: 'Card' },
  { id: 6, bookingId: 106, guestName: 'Arya Stark', contact: '+1 234 999', amount: 500.00, date: '2026-04-20', reason: 'Full Settlement', method: 'Cash' },
  { id: 7, bookingId: 107, guestName: 'Tyrion Lannister', contact: '+1 555 123', amount: 350.00, date: '2026-04-18', reason: 'Advance', method: 'Card' },
  { id: 8, bookingId: 108, guestName: 'Sansa Stark', contact: '+1 555 456', amount: 150.00, date: '2026-04-15', reason: 'Late Checkout', method: 'Cash' },
  { id: 9, bookingId: 109, guestName: 'Jaime Lannister', contact: '+1 555 789', amount: 800.00, date: '2026-04-12', reason: 'Full Stay', method: 'Transfer' },
  { id: 10, bookingId: 110, guestName: 'Robert Baratheon', contact: '+1 555 000', amount: 50.00, date: '2026-04-10', reason: 'Laundry', method: 'Cash' },
];

export default function PaymentHistory() {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];

  const [searchTerm, setSearchTerm] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleReset = () => {
    setSearchTerm('');
    setFromDate('');
    setToDate('');
    setCurrentPage(1);
  };

  const filteredPayments = useMemo(() => {
    return dummyPayments.filter(pay => {
      const matchesSearch = pay.guestName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            pay.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            pay.bookingId.toString().includes(searchTerm);
      
      const payDate = new Date(pay.date);
      const start = fromDate ? new Date(fromDate) : null;
      const end = toDate ? new Date(toDate) : null;

      if (start) start.setHours(0,0,0,0);
      if (end) end.setHours(23,59,59,999);
      payDate.setHours(12,0,0,0);

      const matchesDate = (!start || payDate >= start) && (!end || payDate <= end);
      return matchesSearch && matchesDate;
    });
  }, [searchTerm, fromDate, toDate]);

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
  
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        
        <div className="flex items-center gap-4">
          <div className="bg-white px-6 py-4 rounded-2xl shadow-sm border border-slate-100 text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Received</p>
            <p className="text-2xl font-black text-blue-600 tracking-tighter">Rs. {totalAmount.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2.5rem] shadow-sm border border-slate-100 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Quick Search</label>
            <input 
              type="text" 
              placeholder="Guest, ID or Reason..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              value={searchTerm}
              onChange={e => {setSearchTerm(e.target.value); setCurrentPage(1);}}
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">From Date</label>
            <input 
              type="date" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
              value={fromDate}
              onChange={e => {setFromDate(e.target.value); setCurrentPage(1);}}
            />
          </div>
          <div>
            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 block ml-1">Till Date</label>
            <input 
              type="date" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
              value={toDate}
              onChange={e => {setToDate(e.target.value); setCurrentPage(1);}}
            />
          </div>
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

      {/* Payment Table */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest & Contact</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Booking ID</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Reason / Description</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Amount</th>
                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedPayments.map(pay => (
                <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="p-5">
                    <p className="text-xs font-black text-slate-700">{new Date(pay.date).toLocaleDateString('default', { day: 'numeric', month: 'short' })}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(pay.date).getFullYear()}</p>
                  </td>
                  <td className="p-5">
                    <p className="text-xs font-black text-slate-800 group-hover:text-blue-600 transition-colors">{pay.guestName}</p>
                    <p className="text-[10px] font-bold text-slate-400">{pay.contact}</p>
                  </td>
                  <td className="p-5 text-xs font-black text-slate-500">#{pay.bookingId}</td>
                  <td className="p-5">
                    <p className="text-xs font-bold text-slate-600 italic">"{pay.reason}"</p>
                  </td>
                  <td className="p-5">
                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                      pay.method === 'Cash' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
                      pay.method === 'Card' ? 'bg-blue-50 text-blue-600 border-blue-100' : 
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {pay.method}
                    </span>
                  </td>
                  <td className="p-5 text-right text-sm font-black text-slate-800 tracking-tighter">
                    Rs. {pay.amount.toFixed(2)}
                  </td>
                  <td className="p-5 text-right">
                    <button 
                      onClick={() => navigate(`/hotel/bookings/${pay.bookingId}`)}
                      className="p-2 text-slate-300 hover:text-blue-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan="7" className="p-20 text-center">
                    <p className="text-slate-300 font-black uppercase tracking-[0.2em] italic">No records match your criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-6 bg-slate-50/30 border-t border-slate-50 flex items-center justify-between">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              Showing <span className="text-slate-800">{(currentPage-1)*itemsPerPage + 1}-{Math.min(currentPage*itemsPerPage, filteredPayments.length)}</span> of {filteredPayments.length}
            </p>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
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
                onClick={() => setCurrentPage(prev => prev + 1)}
                className="p-2 rounded-xl border border-slate-200 bg-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-50 transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
