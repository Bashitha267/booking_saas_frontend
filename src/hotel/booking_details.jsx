import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });
  const [newPayment, setNewPayment] = useState({ method: 'cash', status: 'paid', amount: '' });
  const [isRemovingPayment, setIsRemovingPayment] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsMessage, setDetailsMessage] = useState({ type: '', message: '' });
  const [editForm, setEditForm] = useState({
    guestName: '',
    guestContact: '',
    guestNic: '',
    country: '',
    address: '',
    checkInDate: '',
    checkOutDate: '',
    adults: 1,
    children: 0,
    status: 'pending',
  });
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [expenseDraft, setExpenseDraft] = useState({ description: '', amount: '' });

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

  useEffect(() => {
    let isMounted = true;
    const loadBooking = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const [bookingRes, paymentsRes] = await Promise.all([
          api.get(`/bookings/${id}`),
          api.get('/payments'),
        ]);

        const bookingData = bookingRes.data?.data;
        if (!bookingData) throw new Error('Booking not found');

        const notesParts = (bookingData.notes || '').split(' | ');
        const country = notesParts[0] || '';
        const address = notesParts[1] || '';

        const mappedBooking = {
          id: bookingData.id,
          guestName: bookingData.guestName,
          guestEmail: 'N/A',
          guestPhone: bookingData.guestContact,
          roomNumber: bookingData.roomNumber || 'N/A',
          roomType: bookingData.roomType || 'Unknown',
          guestCount: (Number(bookingData.adults || 0) + Number(bookingData.children || 0)) || 1,
          startDate: bookingData.checkInDate,
          endDate: bookingData.checkOutDate,
          status: bookingData.status,
          nicPassport: bookingData.guestNic || 'N/A',
          country,
          address,
          adults: bookingData.adults,
          children: bookingData.children,
        };

        const paymentRows = paymentsRes.data?.data || [];
        const bookingPayments = paymentRows
          .filter((pay) => pay.bookingId === bookingData.id)
          .map((pay) => ({
            id: pay.id,
            amount: Number(pay.amount || 0),
            method: pay.method || 'cash',
            status: pay.status || 'paid',
            date: (pay.paidAt || pay.createdAt || '').toString().slice(0, 10),
          }));

        if (isMounted) {
          setBooking(mappedBooking);
          setEditForm({
            guestName: bookingData.guestName || '',
            guestContact: bookingData.guestContact || '',
            guestNic: bookingData.guestNic || '',
            country,
            address,
            checkInDate: bookingData.checkInDate || '',
            checkOutDate: bookingData.checkOutDate || '',
            adults: Number(bookingData.adults || 0),
            children: Number(bookingData.children || 0),
            status: bookingData.status || 'pending',
          });
          setPayments(bookingPayments);
          setExpenses([]);
        }
      } catch (error) {
        if (isMounted) {
          setLoadError('Failed to load booking.');
          setBooking(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (id) {
      loadBooking();
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

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

  const handleStartEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setExpenseDraft({ description: expense.description, amount: String(expense.amount) });
  };

  const handleCancelEditExpense = () => {
    setEditingExpenseId(null);
    setExpenseDraft({ description: '', amount: '' });
  };

  const handleSaveExpense = (expenseId) => {
    if (!expenseDraft.description || !expenseDraft.amount) return;
    setExpenses((prev) => prev.map((exp) => (
      exp.id === expenseId
        ? { ...exp, description: expenseDraft.description, amount: parseFloat(expenseDraft.amount) }
        : exp
    )));
    setEditingExpenseId(null);
    setExpenseDraft({ description: '', amount: '' });
  };

  const handleRemoveExpense = (expenseId) => {
    setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId));
    if (editingExpenseId === expenseId) {
      setEditingExpenseId(null);
      setExpenseDraft({ description: '', amount: '' });
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!newPayment.amount) return;
    try {
      await api.post('/payments', {
        bookingId: booking.id,
        amount: Number(newPayment.amount),
        method: newPayment.method,
        status: newPayment.status,
      });

      const paymentsRes = await api.get('/payments');
      const paymentRows = paymentsRes.data?.data || [];
      const bookingPayments = paymentRows
        .filter((pay) => pay.bookingId === booking.id)
        .map((pay) => ({
          id: pay.id,
          amount: Number(pay.amount || 0),
          method: pay.method || 'cash',
          status: pay.status || 'paid',
          date: (pay.paidAt || pay.createdAt || '').toString().slice(0, 10),
        }));

      setPayments(bookingPayments);
      setNewPayment({ method: 'cash', status: 'paid', amount: '' });
    } catch (error) {
      // keep existing UI state on failure
    }
  };

  const refreshPayments = async (bookingId) => {
    const paymentsRes = await api.get('/payments');
    const paymentRows = paymentsRes.data?.data || [];
    const bookingPayments = paymentRows
      .filter((pay) => pay.bookingId === bookingId)
      .map((pay) => ({
        id: pay.id,
        amount: Number(pay.amount || 0),
        method: pay.method || 'cash',
        status: pay.status || 'paid',
        date: (pay.paidAt || pay.createdAt || '').toString().slice(0, 10),
      }));
    setPayments(bookingPayments);
  };

  const handleRemovePayment = async (paymentId) => {
    if (!booking || isRemovingPayment) return;
    try {
      setIsRemovingPayment(true);
      await api.delete(`/payments/${paymentId}`);
      await refreshPayments(booking.id);
    } catch (error) {
      // keep existing UI state on failure
    } finally {
      setIsRemovingPayment(false);
    }
  };

  const handleEditChange = (field) => (event) => {
    setEditForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const startEditDetails = () => {
    if (!booking) return;
    setEditForm({
      guestName: booking.guestName || '',
      guestContact: booking.guestPhone || '',
      guestNic: booking.nicPassport === 'N/A' ? '' : booking.nicPassport || '',
      country: booking.country || '',
      address: booking.address || '',
      checkInDate: booking.startDate || '',
      checkOutDate: booking.endDate || '',
      adults: Number(booking.adults || 0),
      children: Number(booking.children || 0),
      status: booking.status || 'pending',
    });
    setDetailsMessage({ type: '', message: '' });
    setIsEditingDetails(true);
  };

  const handleCancelEditDetails = () => {
    setDetailsMessage({ type: '', message: '' });
    setIsEditingDetails(false);
  };

  const handleSaveDetails = async () => {
    if (!booking) return;

    if (!editForm.guestName || !editForm.guestContact) {
      setDetailsMessage({ type: 'error', message: 'Guest name and contact are required.' });
      return;
    }

    const start = new Date(editForm.checkInDate);
    const end = new Date(editForm.checkOutDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      setDetailsMessage({ type: 'error', message: 'Check-out must be after check-in.' });
      return;
    }

    const notesValue = [editForm.country?.trim(), editForm.address?.trim()].filter(Boolean).join(' | ');

    try {
      await api.put(`/bookings/${booking.id}`, {
        guestName: editForm.guestName,
        guestContact: editForm.guestContact,
        guestNic: editForm.guestNic || null,
        checkInDate: editForm.checkInDate,
        checkOutDate: editForm.checkOutDate,
        adults: Number(editForm.adults || 0),
        children: Number(editForm.children || 0),
        status: editForm.status,
        notes: notesValue || null,
      });

      const updatedAdults = Number(editForm.adults || 0);
      const updatedChildren = Number(editForm.children || 0);

      setBooking((prev) => ({
        ...prev,
        guestName: editForm.guestName,
        guestPhone: editForm.guestContact,
        nicPassport: editForm.guestNic || 'N/A',
        country: editForm.country,
        address: editForm.address,
        startDate: editForm.checkInDate,
        endDate: editForm.checkOutDate,
        adults: updatedAdults,
        children: updatedChildren,
        guestCount: updatedAdults + updatedChildren || 1,
        status: editForm.status,
      }));

      setDetailsMessage({ type: 'success', message: 'Booking updated.' });
      setIsEditingDetails(false);
    } catch (error) {
      setDetailsMessage({ type: 'error', message: 'Failed to update booking.' });
    }
  };

  const handleStatusChange = async (nextStatus) => {
    if (!booking) return;
    const previousStatus = booking.status;
    setBooking((prev) => ({ ...prev, status: nextStatus }));
    try {
      await api.put(`/bookings/${booking.id}`, { status: nextStatus });
    } catch (error) {
      setBooking((prev) => ({ ...prev, status: previousStatus }));
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400 text-xs font-bold">
        Loading booking...
      </div>
    );
  }

  if (!booking || loadError) {
    return (
      <div className="p-8 text-center text-rose-500 text-xs font-bold">
        {loadError || 'Booking not found.'}
      </div>
    );
  }

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
            value={isEditingDetails ? editForm.status : booking.status}
            onChange={(e) => {
              if (isEditingDetails) {
                setEditForm((prev) => ({ ...prev, status: e.target.value }));
              } else {
                handleStatusChange(e.target.value);
              }
            }}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black text-slate-700 outline-none shadow-sm"
          >
            <option value="pending">Mark as Pending</option>
            <option value="confirmed">Mark as Confirmed</option>
            <option value="checked-in">Check In</option>
            <option value="checked-out">Check Out</option>
            <option value="cancelled">Cancel Booking</option>
          </select>
          {isEditingDetails ? (
            <>
              <button
                onClick={handleSaveDetails}
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg hover:bg-emerald-700 transition-all"
              >
                Save Changes
              </button>
              <button
                onClick={handleCancelEditDetails}
                className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-black hover:bg-slate-200 transition-all"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={startEditDetails}
              className="bg-white text-slate-700 px-5 py-2.5 rounded-xl text-xs font-black border border-slate-200 hover:border-slate-300 transition-all"
            >
              Edit Details
            </button>
          )}
          <button className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg hover:bg-blue-600 transition-all">
            Download PDF
          </button>
        </div>
        {detailsMessage.message && (
          <p className={`text-[10px] font-black uppercase tracking-widest ${detailsMessage.type === 'error' ? 'text-rose-500' : 'text-emerald-600'}`}>
            {detailsMessage.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Guest & Stay Details */}
        <div className="lg:col-span-8 space-y-6">
          {/* Main Info Card */}
          <div className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-sm border border-slate-100">
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">Guest Profile</p>
                {isEditingDetails ? (
                  <input
                    type="text"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-sm font-black text-slate-800 outline-none"
                    value={editForm.guestName}
                    onChange={handleEditChange('guestName')}
                  />
                ) : (
                  <h3 className="text-xl font-black text-slate-800">{booking.guestName}</h3>
                )}
                
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Contact No.</p>
                      {isEditingDetails ? (
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                          value={editForm.guestContact}
                          onChange={handleEditChange('guestContact')}
                        />
                      ) : (
                        <p className="text-xs font-bold text-slate-700">{booking.guestPhone}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">NIC / Passport</p>
                      {isEditingDetails ? (
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                          value={editForm.guestNic}
                          onChange={handleEditChange('guestNic')}
                        />
                      ) : (
                        <p className="text-xs font-bold text-slate-700">{booking.nicPassport || 'N/A'}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Country</p>
                      {isEditingDetails ? (
                        <input
                          type="text"
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                          value={editForm.country}
                          onChange={handleEditChange('country')}
                        />
                      ) : (
                        <p className="text-xs font-bold text-slate-700">{booking.country || 'N/A'}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">Email</p>
                      <p className="text-xs font-bold text-slate-700">{booking.guestEmail}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Home Address</p>
                    {isEditingDetails ? (
                      <textarea
                        rows="2"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                        value={editForm.address}
                        onChange={handleEditChange('address')}
                      />
                    ) : (
                      <p className="text-xs font-bold text-slate-500 leading-relaxed">{booking.address || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Adults:</span>
                    {isEditingDetails ? (
                      <input
                        type="number"
                        min="0"
                        className="w-16 bg-white border border-slate-100 rounded-lg px-2 py-1 text-sm font-black text-slate-700 outline-none"
                        value={editForm.adults}
                        onChange={handleEditChange('adults')}
                      />
                    ) : (
                      <span className="text-sm font-black text-slate-700">{booking.adults || booking.guestCount}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Children:</span>
                    {isEditingDetails ? (
                      <input
                        type="number"
                        min="0"
                        className="w-16 bg-white border border-slate-100 rounded-lg px-2 py-1 text-sm font-black text-slate-700 outline-none"
                        value={editForm.children}
                        onChange={handleEditChange('children')}
                      />
                    ) : (
                      <span className="text-sm font-black text-slate-700">{booking.children || 0}</span>
                    )}
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
                    {isEditingDetails ? (
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm font-black text-slate-700 outline-none"
                        value={editForm.checkInDate}
                        onChange={handleEditChange('checkInDate')}
                      />
                    ) : (
                      <p className="text-sm font-black text-slate-700">{booking.startDate}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Check-out Date</p>
                    {isEditingDetails ? (
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm font-black text-slate-700 outline-none"
                        value={editForm.checkOutDate}
                        onChange={handleEditChange('checkOutDate')}
                      />
                    ) : (
                      <p className="text-sm font-black text-slate-700">{booking.endDate}</p>
                    )}
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
                <div key={exp.id} className="p-3 rounded-xl bg-slate-50/50 border border-slate-50">
                  {editingExpenseId === exp.id ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          className="flex-1 bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                          value={expenseDraft.description}
                          onChange={(e) => setExpenseDraft((prev) => ({ ...prev, description: e.target.value }))}
                        />
                        <input
                          type="number"
                          className="w-24 bg-white border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                          value={expenseDraft.amount}
                          onChange={(e) => setExpenseDraft((prev) => ({ ...prev, amount: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveExpense(exp.id)}
                          className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditExpense}
                          className="bg-white text-slate-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase border border-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-700">{exp.description}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">{exp.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-sm font-black text-slate-800">Rs. {exp.amount.toFixed(2)}</p>
                        <button
                          type="button"
                          onClick={() => handleStartEditExpense(exp)}
                          className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExpense(exp.id)}
                          className="text-[9px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  )}
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
                <div key={pay.id} className="relative p-3 rounded-xl bg-emerald-50/30 border border-emerald-50 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleRemovePayment(pay.id)}
                    disabled={isRemovingPayment}
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full border border-emerald-100 bg-white text-emerald-500 shadow-sm flex items-center justify-center hover:border-rose-200 hover:text-rose-600 hover:shadow-md disabled:opacity-60"
                    aria-label="Remove payment"
                    title="Remove payment"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div>
                    <p className="text-[10px] font-black text-emerald-700 leading-tight">
                      {pay.method.toUpperCase()} · {pay.status}
                    </p>
                    <p className="text-[8px] text-emerald-600/70 font-black uppercase tracking-tighter mt-0.5">{pay.date}</p>
                  </div>
                  <p className="text-xs font-black text-emerald-700 tracking-tighter">+Rs. {pay.amount.toFixed(2)}</p>
                </div>
              ))}
              {payments.length === 0 && <p className="text-center py-4 text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">No payments yet</p>}
            </div>

            <form onSubmit={handleAddPayment} className="space-y-3 pt-6 border-t border-slate-50">
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none"
                  value={newPayment.method}
                  onChange={e => setNewPayment({ ...newPayment, method: e.target.value })}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank">Bank</option>
                  <option value="online">Online</option>
                </select>
                <select
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none"
                  value={newPayment.status}
                  onChange={e => setNewPayment({ ...newPayment, status: e.target.value })}
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>
              <div className="flex gap-2">
                <input 
                  type="number" 
                  placeholder="Amount" 
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-[10px] font-bold outline-none"
                  value={newPayment.amount}
                  onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
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
