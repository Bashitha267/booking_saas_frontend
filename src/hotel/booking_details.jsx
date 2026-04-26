import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const dummyBookings = [
  { 
    id: 1, 
    guestName: 'Mark Stevens', 
    guestEmail: 'mark.s@example.com',
    guestPhone: '+1 234 567 890',
    roomNumber: '402', 
    roomType: 'Deluxe',
    guestCount: 2,
    startDate: '2026-04-01', 
    endDate: '2026-04-04', 
    basePrice: 450,
    status: 'pending',
    paymentStatus: 'pending',
    expenses: [
      { id: 101, description: 'Mini Bar', amount: 25, date: '2026-04-02' },
      { id: 102, description: 'Laundry', amount: 15, date: '2026-04-03' },
    ],
    payments: [
      { id: 1, amount: 100, reason: 'Advance Payment', date: '2026-03-25' }
    ]
  },
  { 
    id: 2, 
    guestName: 'Sarah Jenkins', 
    guestEmail: 'sarah.j@example.com',
    guestPhone: '+1 987 654 321',
    roomNumber: '101', 
    roomType: 'Deluxe',
    guestCount: 1,
    startDate: '2026-04-05', 
    endDate: '2026-04-12', 
    basePrice: 1200,
    status: 'confirmed',
    paymentStatus: 'paid',
    expenses: [],
    payments: [{ id: 1, amount: 1200, reason: 'Full Payment', date: '2026-04-05' }]
  },
];

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const bookingData = useMemo(() => dummyBookings.find(b => b.id === Number(id)) || dummyBookings[0], [id]);
  
  const [booking, setBooking] = useState(bookingData);
  const [expenses, setExpenses] = useState(booking?.expenses || []);
  const [payments, setPayments] = useState(booking?.payments || []);
  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });
  const [newPayment, setNewPayment] = useState({ reason: '', amount: '' });

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalPaid = payments.reduce((sum, pay) => sum + pay.amount, 0);
  const grandTotal = totalExpenses; // Grand total is now just the sum of added expenses
  const balanceDue = grandTotal - totalPaid;

  const currentPaymentStatus = useMemo(() => {
    if (totalPaid === 0 && grandTotal === 0) return 'not paid';
    if (totalPaid === 0) return 'not paid';
    if (balanceDue <= 0) return 'paid';
    return 'pending';
  }, [totalPaid, balanceDue, grandTotal]);

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;
    const expense = {
      id: Date.now(),
      description: newExpense.description,
      amount: parseFloat(newExpense.amount),
      date: new Date().toISOString().split('T')[0]
    };
    setExpenses([...expenses, expense]);
    setNewExpense({ description: '', amount: '' });
  };

  const handleAddPayment = (e) => {
    e.preventDefault();
    if (!newPayment.reason || !newPayment.amount) return;
    const payment = {
      id: Date.now(),
      reason: newPayment.reason,
      amount: parseFloat(newPayment.amount),
      date: new Date().toISOString().split('T')[0]
    };
    setPayments([...payments, payment]);
    setNewPayment({ reason: '', amount: '' });
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-full max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-400 hover:text-slate-800 transition-colors font-bold text-[10px] uppercase tracking-widest mb-2">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            Back
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight leading-none">Booking #00{booking.id}</h1>
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
              booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
              booking.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {booking.status}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={booking.status}
            onChange={(e) => setBooking({...booking, status: e.target.value})}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-700 outline-none shadow-sm"
          >
            <option value="pending">Mark as Pending</option>
            <option value="confirmed">Mark as Confirmed</option>
            <option value="checked-in">Check In</option>
            <option value="checkout">Check Out</option>
            <option value="cancelled">Cancel Booking</option>
          </select>
          <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg hover:bg-blue-600 transition-all">
            Download PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Guest & Stay Details */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Info Card */}
          <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">Guest Profile</p>
                <h3 className="text-xl font-black text-slate-800">{booking.guestName}</h3>
                
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Contact No.</p>
                      <p className="text-xs font-bold text-slate-700">{booking.guestPhone}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">NIC / Passport</p>
                      <p className="text-xs font-bold text-slate-700">{booking.nicPassport || 'N/A'}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Country</p>
                      <p className="text-xs font-bold text-slate-700">{booking.country || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Email</p>
                      <p className="text-xs font-bold text-slate-700">{booking.guestEmail}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Home Address</p>
                    <p className="text-xs font-bold text-slate-500 leading-relaxed">{booking.address || 'Not provided'}</p>
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Adults:</span>
                    <span className="text-sm font-black text-slate-700">{booking.adults || booking.guestCount}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Children:</span>
                    <span className="text-sm font-black text-slate-700">{booking.children || 0}</span>
                  </div>
                </div>
              </div>

              <div className="md:border-l md:pl-8 border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">Stay & Room Details</p>
                <div className="grid grid-cols-2 gap-y-6">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Room No.</p>
                    <p className="text-sm font-black text-slate-800">{booking.roomNumber}</p>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-tighter">{booking.roomType}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Check-in Date</p>
                    <p className="text-sm font-black text-slate-700">{booking.startDate}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Check-out Date</p>
                    <p className="text-sm font-black text-slate-700">{booking.endDate}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expenses Card */}
          <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Additional Records</h3>
              <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2 py-1 rounded-md">{expenses.length} Entries</span>
            </div>
            
            <div className="space-y-3 mb-8">
              {expenses.map(exp => (
                <div key={exp.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 border border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    </div>
                    <div>
                      <p className="text-xs font-black text-slate-700">{exp.description}</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{exp.date}</p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-slate-800">Rs. {exp.amount.toFixed(2)}</p>
                </div>
              ))}
              {expenses.length === 0 && <p className="text-center py-6 text-xs text-slate-400 font-bold italic">No extra charges recorded.</p>}
            </div>

            <form onSubmit={handleAddExpense} className="flex gap-3 mt-6">
              <input 
                type="text" 
                placeholder="Description" 
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                value={newExpense.description}
                onChange={e => setNewExpense({...newExpense, description: e.target.value})}
              />
              <input 
                type="number" 
                placeholder="Amount" 
                className="w-24 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                value={newExpense.amount}
                onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
              />
              <button className="bg-slate-100 text-slate-600 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-slate-200 transition-colors">
                Add
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Billing & Payments */}
        <div className="lg:col-span-4 space-y-6">
          {/* Payment History Card */}
          <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100 flex flex-col">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-6">Payment Records</h3>
            
            <div className="space-y-3 flex-1 mb-6">
              {payments.map(pay => (
                <div key={pay.id} className="p-3 rounded-xl bg-emerald-50/30 border border-emerald-50 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-emerald-700 leading-tight">{pay.reason}</p>
                    <p className="text-[8px] text-emerald-600/70 font-black uppercase tracking-tighter mt-0.5">{pay.date}</p>
                  </div>
                  <p className="text-xs font-black text-emerald-700 tracking-tighter">+Rs. {pay.amount.toFixed(2)}</p>
                </div>
              ))}
              {payments.length === 0 && <p className="text-center py-4 text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">No payments yet</p>}
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3 pt-6 border-t border-slate-50">
              <input 
                type="text" 
                placeholder="Payment Reason" 
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none"
                value={newPayment.reason}
                onChange={e => setNewPayment({...newPayment, reason: e.target.value})}
              />
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="Amount" 
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none"
                  value={newPayment.amount}
                  onChange={e => setNewPayment({...newPayment, amount: e.target.value})}
                />
                <button className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-100">
                  Post
                </button>
              </div>
            </form>
          </div>

          {/* Billing Summary Card */}
          <div className="bg-slate-900 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] text-white shadow-2xl shadow-blue-900/20">
            <h3 className="text-[9px] font-black text-blue-300/50 uppercase tracking-[0.2em] mb-8">Financial Overview</h3>
            <div className="flex-1 space-y-6">
            <div className="flex justify-between items-center text-slate-500 font-bold">
              <span>Total Records Amount</span>
              <span>Rs. {totalExpenses.toFixed(2)}</span>
            </div>
            <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm font-black text-white">Grand Total</span>
                <span className="text-2xl font-black text-white tracking-tighter">Rs. {grandTotal.toFixed(2)}</span>
              </div>
              
              <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex justify-between text-[10px] uppercase tracking-widest">
                  <span className="text-blue-300 font-black">Paid to date</span>
                  <span className="text-emerald-400 font-black">Rs. {totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-[0.1em] text-white">Balance Due</span>
                  <span className={`text-xl font-black ${balanceDue <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    Rs. {Math.max(0, balanceDue).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-2">
               <span className={`text-center py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] border ${
                currentPaymentStatus === 'paid' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                currentPaymentStatus === 'pending' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                'bg-red-500/10 border-red-500/30 text-red-400'
              }`}>
                {currentPaymentStatus}
              </span>
              <button className="w-full bg-white text-slate-900 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all mt-4">
                Generate Invoice PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
