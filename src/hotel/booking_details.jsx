import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../components/Toast';

export default function BookingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [quickCharges, setQuickCharges] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const { showToast, ToastComponent } = useToast();
  
  // Custom expense forms
  const [newExpense, setNewExpense] = useState({ description: '', amount: '' });
  const [expenseError, setExpenseError] = useState('');

  // Quick Add Popup states
  const [selectedQuickCharge, setSelectedQuickCharge] = useState(null);
  const [quickChargeAmount, setQuickChargeAmount] = useState('');

  // Payment states
  const [newPayment, setNewPayment] = useState({ method: 'cash', status: 'paid', amount: '' });
  const [paymentError, setPaymentError] = useState('');
  const [isRemovingPayment, setIsRemovingPayment] = useState(false);

  // Edit details states
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
  const grandTotal = totalExpenses;
  const balanceDue = grandTotal - totalPaid;

  const currentPaymentStatus = useMemo(() => {
    if (totalPaid === 0 && grandTotal === 0) return 'not paid';
    if (totalPaid === 0) return 'not paid';
    if (balanceDue <= 0) return 'paid';
    return 'pending';
  }, [totalPaid, balanceDue, grandTotal]);

  useEffect(() => {
    let isMounted = true;
    const loadBookingAndProperties = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const [bookingRes, paymentsRes, propertiesRes] = await Promise.all([
          api.get(`/bookings/${id}`),
          api.get('/payments'),
          api.get('/properties'),
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
          propertyId: bookingData.propertyId,
        };

        // Parse booking expenses from DB column
        let parsedExpenses = [];
        try {
          if (bookingData.expenses) {
            parsedExpenses = JSON.parse(bookingData.expenses);
          }
        } catch (e) {
          console.error('Failed to parse expenses:', e);
        }

        // Get quick charge shortcuts for this property
        let propertyQuickCharges = [];
        const propertiesList = propertiesRes.data?.data || [];
        const matchingProp = propertiesList.find((p) => Number(p.id) === Number(bookingData.propertyId)) || propertiesList[0];
        if (matchingProp) {
          try {
            propertyQuickCharges = JSON.parse(matchingProp.quickExpenses || '[]');
          } catch (e) {
            console.error('Failed to parse property quick expenses:', e);
          }
        }

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
          setExpenses(parsedExpenses);
          setQuickCharges(propertyQuickCharges);
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
        }
      } catch (error) {
        if (isMounted) {
          setLoadError('Failed to load booking details.');
          showToast('Failed to load booking details.', 'error');
          setBooking(null);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    if (id) {
      loadBookingAndProperties();
    }
    return () => {
      isMounted = false;
    };
  }, [id]);

  // Save expenses list helper
  const saveExpensesToDb = async (updatedExpenses) => {
    try {
      await api.put(`/bookings/${booking.id}`, {
        expenses: JSON.stringify(updatedExpenses),
      });
      setExpenses(updatedExpenses);
      setExpenseError('');
      showToast('Expenses updated', 'success');
    } catch (err) {
      setExpenseError('Failed to update expenses in the database.');
      showToast('Failed to update expenses in the database.', 'error');
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.description || !newExpense.amount) return;
    const amountVal = parseFloat(newExpense.amount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    const expense = {
      id: Date.now(),
      description: newExpense.description.trim(),
      amount: amountVal,
      date: new Date().toISOString().split('T')[0]
    };

    const updated = [...expenses, expense];
    await saveExpensesToDb(updated);
    setNewExpense({ description: '', amount: '' });
  };

  // Add selected quick charge shortcut
  const handleConfirmQuickCharge = async () => {
    if (!selectedQuickCharge || !quickChargeAmount) return;
    const amountVal = parseFloat(quickChargeAmount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    const expense = {
      id: Date.now(),
      description: selectedQuickCharge.name,
      amount: amountVal,
      date: new Date().toISOString().split('T')[0],
      isQuickCharge: true
    };

    const updated = [...expenses, expense];
    await saveExpensesToDb(updated);
    setSelectedQuickCharge(null);
    setQuickChargeAmount('');
  };

  const handleStartEditExpense = (expense) => {
    setEditingExpenseId(expense.id);
    setExpenseDraft({ description: expense.description, amount: String(expense.amount) });
  };

  const handleCancelEditExpense = () => {
    setEditingExpenseId(null);
    setExpenseDraft({ description: '', amount: '' });
  };

  const handleSaveExpense = async (expenseId) => {
    if (!expenseDraft.description || !expenseDraft.amount) return;
    const amountVal = parseFloat(expenseDraft.amount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    const updated = expenses.map((exp) => (
      exp.id === expenseId
        ? { ...exp, description: expenseDraft.description, amount: amountVal }
        : exp
    ));

    await saveExpensesToDb(updated);
    setEditingExpenseId(null);
    setExpenseDraft({ description: '', amount: '' });
  };

  const handleRemoveExpense = async (expenseId) => {
    const updated = expenses.filter((exp) => exp.id !== expenseId);
    await saveExpensesToDb(updated);
    if (editingExpenseId === expenseId) {
      setEditingExpenseId(null);
      setExpenseDraft({ description: '', amount: '' });
    }
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    if (!newPayment.amount) return;

    const entered = Number(newPayment.amount);

    if (grandTotal > 0 && entered > balanceDue + 0.005) {
      setPaymentError(
        `⚠ Amount exceeds balance due. Max payable: Rs. ${Math.max(0, balanceDue).toFixed(2)}`
      );
      return;
    }
    setPaymentError('');

    try {
      await api.post('/payments', {
        bookingId: booking.id,
        amount: entered,
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
      showToast('Payment added successfully', 'success');
    } catch (err) {
      setPaymentError(err.response?.data?.message || 'Failed to add payment.');
      showToast(err.response?.data?.message || 'Failed to add payment.', 'error');
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
      showToast('Payment removed', 'success');
    } catch (error) {
      setIsRemovingPayment(false);
      setPaymentError(error.response?.data?.message || 'Failed to remove payment');
      showToast(error.response?.data?.message || 'Failed to remove payment', 'error');
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

      setDetailsMessage({ type: 'success', message: 'Booking updated successfully.' });
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
      <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
        Loading booking details...
      </div>
    );
  }

  if (!booking || loadError) {
    return (
      <div className="p-8 text-center text-rose-500 text-xs font-bold uppercase tracking-widest bg-rose-50 rounded-2xl max-w-md mx-auto mt-12 border border-rose-100">
        {loadError || 'Booking not found.'}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-screen text-slate-800 font-sans pb-24">
      <ToastComponent />
      
      {/* Back Button & Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-slate-200/60">
        <div>
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 transition-colors font-bold text-[10px] uppercase tracking-widest mb-3"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Bookings
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-none">Booking #00{booking.id}</h1>
            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
              booking.status === 'confirmed' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10' :
              booking.status === 'pending' ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/10' : 
              booking.status === 'checked-in' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/10' : 
              booking.status === 'checked-out' ? 'bg-slate-100 text-slate-700 ring-1 ring-slate-600/10' : 
              'bg-rose-50 text-rose-700 ring-1 ring-rose-600/10'
            }`}>
              {booking.status}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <select 
            value={isEditingDetails ? editForm.status : booking.status}
            onChange={(e) => {
              if (isEditingDetails) {
                setEditForm((prev) => ({ ...prev, status: e.target.value }));
              } else {
                handleStatusChange(e.target.value);
              }
            }}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-black text-slate-700 outline-none shadow-sm focus:border-blue-500"
          >
            <option value="pending">Mark as Pending</option>
            <option value="confirmed">Mark as Confirmed</option>
            <option value="checked-in">Check In Guest</option>
            <option value="checked-out">Check Out Guest</option>
            <option value="cancelled">Cancel Reservation</option>
          </select>
          {isEditingDetails ? (
            <>
              <button
                onClick={handleSaveDetails}
                className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-lg hover:bg-emerald-700 transition-all active:scale-95"
              >
                Save Details
              </button>
              <button
                onClick={handleCancelEditDetails}
                className="bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl text-xs font-black hover:bg-slate-300 transition-all active:scale-95"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={startEditDetails}
              className="bg-white text-slate-700 px-5 py-2.5 rounded-xl text-xs font-black border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
            >
              Edit Booking
            </button>
          )}
          
          {detailsMessage.message && (
            <span className={`text-[10px] font-black uppercase tracking-widest ${detailsMessage.type === 'error' ? 'text-rose-500' : 'text-emerald-600'}`}>
              {detailsMessage.message}
            </span>
          )}
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Profile & Stay details & Additional Charges */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Guest Profile and Stay Layout */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Guest metadata */}
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
                  <h3 className="text-lg font-black text-slate-800">{booking.guestName}</h3>
                )}
                
                <div className="mt-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Contact Number</p>
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
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">NIC / Passport</p>
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
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Origin Country</p>
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
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Email Reference</p>
                      <p className="text-xs font-bold text-slate-700">{booking.guestEmail}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Home Address</p>
                    {isEditingDetails ? (
                      <textarea
                        rows="2"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none"
                        value={editForm.address}
                        onChange={handleEditChange('address')}
                      />
                    ) : (
                      <p className="text-xs font-semibold text-slate-500 leading-relaxed">{booking.address || 'Not specified'}</p>
                    )}
                  </div>
                </div>

                {/* Occupancy counts */}
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Adults:</span>
                    {isEditingDetails ? (
                      <input
                        type="number"
                        min="1"
                        className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-black text-slate-700 outline-none"
                        value={editForm.adults}
                        onChange={handleEditChange('adults')}
                      />
                    ) : (
                      <span className="text-xs font-black text-slate-700">{booking.adults || booking.guestCount}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Children:</span>
                    {isEditingDetails ? (
                      <input
                        type="number"
                        min="0"
                        className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-xs font-black text-slate-700 outline-none"
                        value={editForm.children}
                        onChange={handleEditChange('children')}
                      />
                    ) : (
                      <span className="text-xs font-black text-slate-700">{booking.children || 0}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Room details */}
              <div className="md:border-l md:pl-8 border-slate-100">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] mb-4">Reservation Details</p>
                <div className="grid grid-cols-2 gap-y-6">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Assigned Room</p>
                    <p className="text-base font-black text-slate-800">Room {booking.roomNumber}</p>
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest mt-0.5">{booking.roomType}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Check-in Date</p>
                    {isEditingDetails ? (
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none"
                        value={editForm.checkInDate}
                        onChange={handleEditChange('checkInDate')}
                      />
                    ) : (
                      <p className="text-sm font-black text-slate-700">{booking.startDate?.split('T')[0]}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Check-out Date</p>
                    {isEditingDetails ? (
                      <input
                        type="date"
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-black text-slate-700 outline-none"
                        value={editForm.checkOutDate}
                        onChange={handleEditChange('checkOutDate')}
                      />
                    ) : (
                      <p className="text-sm font-black text-slate-700">{booking.endDate?.split('T')[0]}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Expense Buttons & Roster Section */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Extra Charges & Expenses</h3>
                <p className="text-xs text-slate-400 mt-0.5 font-medium">Record room service, amenities, and extra activities.</p>
              </div>
              <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                {expenses.length} Added
              </span>
            </div>

            {/* Configured Quick Charge Buttons */}
            {quickCharges.length > 0 && (
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider ml-1">Quick Charge Shortcuts</p>
                <div className="flex flex-wrap gap-2.5">
                  {quickCharges.map((qc) => (
                    <button
                      key={qc.id}
                      type="button"
                      onClick={() => {
                        setSelectedQuickCharge(qc);
                        setQuickChargeAmount(String(qc.amount));
                      }}
                      className="group flex items-center justify-between gap-3 bg-violet-50/50 hover:bg-violet-50 border border-violet-100 hover:border-violet-200 px-4 py-2 rounded-2xl text-left transition-all active:scale-95 shadow-sm"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800 group-hover:text-violet-700 transition-colors">{qc.name}</p>
                        <p className="text-[9px] font-bold text-violet-500">Rs. {qc.amount}</p>
                      </div>
                      <div className="h-6 w-6 rounded-lg bg-violet-600 text-white flex items-center justify-center font-bold text-xs shadow shadow-violet-100">
                        +
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* List of active expenses */}
            <div className="space-y-3">
              {expenses.map((exp) => (
                <div key={exp.id} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-50 flex flex-col gap-3 group transition-all hover:border-slate-100">
                  {editingExpenseId === exp.id ? (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                          value={expenseDraft.description}
                          onChange={(e) => setExpenseDraft((prev) => ({ ...prev, description: e.target.value }))}
                        />
                        <input
                          type="number"
                          step="0.01"
                          className="w-28 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                          value={expenseDraft.amount}
                          onChange={(e) => setExpenseDraft((prev) => ({ ...prev, amount: e.target.value }))}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveExpense(exp.id)}
                          className="bg-slate-950 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEditExpense}
                          className="bg-white text-slate-500 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border border-slate-200"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${exp.isQuickCharge ? 'bg-violet-50 text-violet-600' : 'bg-blue-50 text-blue-600'}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-700">{exp.description}</p>
                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{exp.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="text-sm font-black text-slate-800">Rs. {exp.amount.toFixed(2)}</p>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleStartEditExpense(exp)}
                            className="text-[9px] font-bold uppercase tracking-widest text-slate-400 hover:text-blue-600"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveExpense(exp.id)}
                            className="text-[9px] font-bold uppercase tracking-widest text-rose-400 hover:text-rose-600"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {expenses.length === 0 && (
                <p className="text-center py-10 text-xs text-slate-400 font-bold uppercase tracking-wider border border-dashed border-slate-100 rounded-2xl bg-slate-50/20">
                  No extra charges added.
                </p>
              )}
            </div>

            {/* Custom Expense Form */}
            <form onSubmit={handleAddExpense} className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-50">
              <input 
                type="text" 
                required
                placeholder="Custom Charge Description (e.g. Spa Treatment)" 
                className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:bg-white focus:border-blue-500"
                value={newExpense.description}
                onChange={e => setNewExpense({...newExpense, description: e.target.value})}
              />
              <input 
                type="number" 
                required
                step="0.01"
                placeholder="Amount (Rs.)" 
                className="w-full sm:w-32 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:bg-white focus:border-blue-500"
                value={newExpense.amount}
                onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
              />
              <button className="bg-slate-900 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-blue-600 transition-colors">
                Add Charge
              </button>
            </form>
            
            {expenseError && (
              <p className="text-xs text-rose-600 font-bold">{expenseError}</p>
            )}
          </div>
        </div>

        {/* Right Column: Billing Statistics & Payments */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Payment Roster Card */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-3">Payment Ledger</h3>
            
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {payments.map(pay => (
                <div key={pay.id} className="relative p-3 rounded-2xl bg-emerald-50/20 border border-emerald-50/60 flex items-center justify-between group">
                  <button
                    type="button"
                    onClick={() => handleRemovePayment(pay.id)}
                    disabled={isRemovingPayment}
                    className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full border border-emerald-100 bg-white text-emerald-500 shadow flex items-center justify-center hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                  >
                    ×
                  </button>
                  <div>
                    <p className="text-[10px] font-black text-emerald-700 leading-tight uppercase tracking-wider">
                      {pay.method} · {pay.status}
                    </p>
                    <p className="text-[8px] text-emerald-600/70 font-black uppercase tracking-tight mt-0.5">{pay.date}</p>
                  </div>
                  <p className="text-xs font-black text-emerald-700 tracking-tighter">+Rs. {pay.amount.toFixed(2)}</p>
                </div>
              ))}
              {payments.length === 0 && (
                <p className="text-center py-6 text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">
                  No Payments Posted
                </p>
              )}
            </div>

            {/* Post payment form */}
            <form onSubmit={handleAddPayment} className="space-y-4 pt-4 border-t border-slate-50">
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500"
                  value={newPayment.method}
                  onChange={e => setNewPayment({ ...newPayment, method: e.target.value })}
                >
                  <option value="cash">Cash Payment</option>
                  <option value="card">Card Payment</option>
                  <option value="bank">Bank Transfer</option>
                  <option value="online">Online Link</option>
                </select>
                <select
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-[10px] font-bold outline-none focus:border-blue-500"
                  value={newPayment.status}
                  onChange={e => setNewPayment({ ...newPayment, status: e.target.value })}
                >
                  <option value="paid">Paid</option>
                  <option value="pending">Pending</option>
                </select>
              </div>

              {/* Outstanding Hint */}
              {grandTotal > 0 && (
                <div className="bg-slate-50 p-3 rounded-2xl flex items-center justify-between text-[10px] uppercase tracking-wider font-bold">
                  <span className="text-slate-400">Balance Outstanding:</span>
                  <span className={balanceDue <= 0 ? 'text-emerald-600' : 'text-amber-600'}>
                    Rs. {Math.max(0, balanceDue).toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Amount"
                  min="0.01"
                  step="0.01"
                  max={grandTotal > 0 ? Math.max(0, balanceDue) : undefined}
                  className={`flex-1 bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:bg-white ${
                    paymentError ? 'border-rose-300 bg-rose-50' : 'border-slate-100 focus:border-emerald-500'
                  }`}
                  value={newPayment.amount}
                  onChange={e => {
                    setPaymentError('');
                    setNewPayment({ ...newPayment, amount: e.target.value });
                  }}
                />
                <button
                  type="submit"
                  disabled={grandTotal > 0 && balanceDue <= 0}
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Post Pay
                </button>
              </div>

              {/* Overpayment Warning banner */}
              {paymentError && (
                <div className="flex items-start gap-2 bg-rose-50 border border-rose-100 rounded-2xl p-3">
                  <span className="text-rose-600 text-xs">⚠</span>
                  <p className="text-[10px] font-black text-rose-600 uppercase tracking-wide leading-tight">{paymentError}</p>
                </div>
              )}
            </form>
          </div>

          {/* Financial Overview card */}
          <div className="bg-slate-900 p-6 md:p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10 space-y-6">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Financial Summary</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center text-slate-400 font-bold text-xs uppercase tracking-wider">
                <span>Extra Charges Total</span>
                <span>Rs. {totalExpenses.toFixed(2)}</span>
              </div>
              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider text-slate-300">Grand Total</span>
                <span className="text-xl font-black tracking-tight">Rs. {grandTotal.toFixed(2)}</span>
              </div>
              
              <div className="mt-4 p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3">
                <div className="flex justify-between items-center text-[10px] uppercase tracking-wider">
                  <span className="text-slate-400">Total Payments:</span>
                  <span className="text-emerald-400 font-black">Rs. {totalPaid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <span className="text-xs font-black uppercase tracking-widest text-slate-200">Balance Due:</span>
                  <span className={`text-lg font-black ${balanceDue <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                    Rs. {Math.max(0, balanceDue).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-2">
              <span className={`text-center py-2.5 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border ${
                currentPaymentStatus === 'paid' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' :
                currentPaymentStatus === 'pending' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                {currentPaymentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Add Custom Modal popup */}
      {selectedQuickCharge && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-base font-black text-slate-800 mb-1">Add Quick Charge</h3>
            <p className="text-slate-400 text-[11px] mb-4">Confirm or adjust the amount for <strong className="text-slate-600">"{selectedQuickCharge.name}"</strong></p>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Charge Amount (Rs.)</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold outline-none focus:border-blue-500 focus:bg-white"
                  value={quickChargeAmount}
                  onChange={(e) => setQuickChargeAmount(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleConfirmQuickCharge}
                  disabled={!quickChargeAmount || parseFloat(quickChargeAmount) <= 0}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-40"
                >
                  Post Charge
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedQuickCharge(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
