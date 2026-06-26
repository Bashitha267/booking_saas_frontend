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
  const [paymentType, setPaymentType] = useState('advance'); // 'advance' or 'full'
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);

  // Discount editor states
  const [discountInput, setDiscountInput] = useState('');
  const [discountError, setDiscountError] = useState('');
  const [isSavingDiscount, setIsSavingDiscount] = useState(false);

  const roomPrice = booking ? Number(booking.roomPrice || 0) : 0;
  const nights = useMemo(() => {
    if (!booking?.startDate || !booking?.endDate) return 1;
    const diff = new Date(booking.endDate) - new Date(booking.startDate);
    return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
  }, [booking?.startDate, booking?.endDate]);

  const roomTotal = roomPrice * nights;
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalPaid = payments.filter(pay => pay.status !== 'refunded').reduce((sum, pay) => sum + pay.amount, 0);
  const totalRefunded = payments.filter(pay => pay.status === 'refunded').reduce((sum, pay) => sum + pay.amount, 0);
  const subTotal = roomTotal + totalExpenses;
  const appliedDiscount = Number(booking?.discount || 0);
  const grandTotal = subTotal - appliedDiscount;
  const balanceDue = grandTotal - totalPaid;

  const handleApplyDiscount = async () => {
    const val = parseFloat(discountInput);
    if (isNaN(val) || val < 0) {
      setDiscountError('Please enter a valid discount amount.');
      return;
    }
    if (val >= subTotal) {
      setDiscountError(`Discount must be less than the total (Rs. ${subTotal.toFixed(2)}).`);
      return;
    }
    setDiscountError('');
    setIsSavingDiscount(true);
    try {
      await api.put(`/bookings/${booking.id}`, { discount: val });
      setBooking((prev) => ({ ...prev, discount: val }));
      setDiscountInput('');
      showToast('Discount applied successfully', 'success');
    } catch (err) {
      console.error('Failed to save discount:', err);
      setDiscountError('Failed to save discount.');
      showToast('Failed to save discount.', 'error');
    } finally {
      setIsSavingDiscount(false);
    }
  };

  const handleRemoveDiscount = async () => {
    setDiscountError('');
    setIsSavingDiscount(true);
    try {
      await api.put(`/bookings/${booking.id}`, { discount: 0 });
      setBooking((prev) => ({ ...prev, discount: 0 }));
      setDiscountInput('');
      showToast('Discount removed', 'success');
    } catch (err) {
      console.error('Failed to remove discount:', err);
      showToast('Failed to remove discount.', 'error');
    } finally {
      setIsSavingDiscount(false);
    }
  };

  const currentPaymentStatus = useMemo(() => {
    if (totalPaid === 0 && grandTotal === 0) return 'not paid';
    if (totalPaid === 0) return 'not paid';
    if (balanceDue <= 0) return 'paid';
    return 'pending';
  }, [totalPaid, balanceDue, grandTotal]);

  // Effect to sync amount when paymentType is set to 'full'
  useEffect(() => {
    if (paymentType === 'full') {
      setNewPayment((prev) => ({ ...prev, amount: String(Math.max(0, balanceDue)) }));
    } else {
      setNewPayment((prev) => ({ ...prev, amount: '' }));
    }
  }, [paymentType, balanceDue]);

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
          roomPrice: Number(bookingData.roomPrice || 0),
          discount: Number(bookingData.discount || 0),
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
            note: pay.note || '',
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
            discount: Number(bookingData.discount || 0),
          });
          setPayments(bookingPayments);
        }
      } catch (error) {
        console.error('Failed to load booking details:', error);
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
      console.error('Failed to update expenses in the database:', err);
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
        note: paymentType === 'advance' ? 'Advance Payment' : 'Full Payment',
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
          note: pay.note || '',
        }));

      setPayments(bookingPayments);
      setNewPayment({ method: 'cash', status: 'paid', amount: '' });
      setShowPaymentModal(false);
      showToast('Payment added successfully', 'success');
    } catch (err) {
      console.error('Failed to add payment:', err);
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
        note: pay.note || '',
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
      console.error('Failed to remove payment:', error);
      setIsRemovingPayment(false);
      setPaymentError(error.response?.data?.message || 'Failed to remove payment');
      showToast(error.response?.data?.message || 'Failed to remove payment', 'error');
    } finally {
      setIsRemovingPayment(false);
    }
  };

  const handleUpdatePaymentStatus = async (paymentId, nextStatus) => {
    try {
      await api.put(`/payments/${paymentId}`, { status: nextStatus });
      await refreshPayments(booking.id);
      showToast(`Payment marked as ${nextStatus}`, 'success');
    } catch (err) {
      console.error('Failed to update payment status:', err);
      showToast(err.response?.data?.message || 'Failed to update payment status', 'error');
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
      discount: Number(booking.discount || 0),
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
        discount: Number(editForm.discount || 0),
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
        discount: Number(editForm.discount || 0),
      }));

      setDetailsMessage({ type: 'success', message: 'Booking updated successfully.' });
      setIsEditingDetails(false);
    } catch (error) {
      console.error('Failed to update booking:', error);
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
      console.error('Failed to update booking status:', error);
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
    <div className="p-4 md:p-8 bg-white min-h-screen text-slate-800 font-sans pb-24 relative overflow-hidden">
      <ToastComponent />
      
      <style>{`
        @media print {
          .no-print, .no-print * {
            display: none !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          fieldset {
            page-break-inside: avoid;
            border-color: #cbd5e1 !important;
          }
        }
      `}</style>

      {/* Background Watermark */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0">
        <span className={`text-[16vw] font-black uppercase tracking-widest opacity-[0.08] -rotate-12 ${
          booking.status === 'cancelled' ? 'text-red-600' :
          currentPaymentStatus === 'paid' ? 'text-emerald-600' :
          currentPaymentStatus === 'pending' ? 'text-blue-600' :
          'text-rose-600'
        }`}>
          {booking.status === 'cancelled' ? 'CANCELLED' :
           currentPaymentStatus === 'paid' ? 'PAID' :
           currentPaymentStatus === 'pending' ? 'PENDING' :
           'UNPAID'}
        </span>
      </div>
      
      {/* Back Button & Main Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b border-slate-300 mb-8 relative z-10">
        <div>
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors font-bold text-[10px] uppercase tracking-widest mb-3 no-print"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Bookings
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">Booking #00{booking.id}</h1>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
              booking.status === 'confirmed' ? 'bg-blue-50 border-blue-200 text-blue-800' :
              booking.status === 'pending' ? 'bg-slate-50 border-slate-300 text-slate-700' : 
              booking.status === 'checked-in' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 
              booking.status === 'checked-out' ? 'bg-slate-100 border-slate-400 text-slate-800' : 
              'bg-red-50 border-red-200 text-red-800'
            }`}>
              {booking.status}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 no-print">
          <select 
            value={isEditingDetails ? editForm.status : booking.status}
            onChange={(e) => {
              if (isEditingDetails) {
                setEditForm((prev) => ({ ...prev, status: e.target.value }));
              } else {
                handleStatusChange(e.target.value);
              }
            }}
            className="bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-600"
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
                className="border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-xs font-bold transition-all active:scale-95"
              >
                Save Details
              </button>
              <button
                onClick={handleCancelEditDetails}
                className="border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-1.5 rounded text-xs font-bold transition-all active:scale-95"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => window.open(`/hotel/bookings/${booking.id}/invoice`, '_blank')}
                className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-4 py-1.5 rounded text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Invoice
              </button>
              <button
                onClick={startEditDetails}
                className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-4 py-1.5 rounded text-xs font-bold transition-all active:scale-95"
              >
                Edit Booking
              </button>
            </>
          )}
          
          {detailsMessage.message && (
            <span className={`text-[10px] font-bold uppercase tracking-widest ${detailsMessage.type === 'error' ? 'text-red-650' : 'text-emerald-700'}`}>
              {detailsMessage.message}
            </span>
          )}
        </div>
      </div>

      <div className="space-y-8 max-w-5xl mx-auto relative z-10">
        
        {/* Fieldset 1: Booking Information */}
        <fieldset className="border border-slate-300 p-6 rounded-md bg-white min-w-0">
          <legend className="px-2 text-sm font-bold text-blue-600 uppercase tracking-wide">Booking Information</legend>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Guest Profile */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">Guest Profile</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Guest Name</label>
                  {isEditingDetails ? (
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-600"
                      value={editForm.guestName}
                      onChange={handleEditChange('guestName')}
                    />
                  ) : (
                    <p className="text-sm font-bold text-slate-800">{booking.guestName}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contact Number</label>
                  {isEditingDetails ? (
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-600"
                      value={editForm.guestContact}
                      onChange={handleEditChange('guestContact')}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-700">{booking.guestPhone}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">NIC / Passport</label>
                  {isEditingDetails ? (
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-600"
                      value={editForm.guestNic}
                      onChange={handleEditChange('guestNic')}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-700">{booking.nicPassport || 'N/A'}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Origin Country</label>
                  {isEditingDetails ? (
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-600"
                      value={editForm.country}
                      onChange={handleEditChange('country')}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-700">{booking.country || 'N/A'}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Home Address</label>
                {isEditingDetails ? (
                  <textarea
                    rows="2"
                    className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-600"
                    value={editForm.address}
                    onChange={handleEditChange('address')}
                  />
                ) : (
                  <p className="text-sm text-slate-600 leading-relaxed">{booking.address || 'Not specified'}</p>
                )}
              </div>

              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Adults</label>
                  {isEditingDetails ? (
                    <input
                      type="number"
                      min="1"
                      className="w-20 border border-slate-300 rounded px-3 py-1 text-sm outline-none focus:border-blue-600"
                      value={editForm.adults}
                      onChange={handleEditChange('adults')}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-700">{booking.adults}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Children</label>
                  {isEditingDetails ? (
                    <input
                      type="number"
                      min="0"
                      className="w-20 border border-slate-300 rounded px-3 py-1 text-sm outline-none focus:border-blue-600"
                      value={editForm.children}
                      onChange={handleEditChange('children')}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-700">{booking.children}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Discount (LKR)</label>
                  {isEditingDetails ? (
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-32 border border-slate-300 rounded px-3 py-1 text-sm outline-none focus:border-blue-600"
                      value={editForm.discount}
                      onChange={handleEditChange('discount')}
                    />
                  ) : (
                    <p className="text-sm font-bold text-rose-650">Rs. {Number(booking.discount || 0).toFixed(2)}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Reservation Details */}
            <div className="space-y-4 md:border-l md:pl-6 border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">Reservation Details</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Assigned Room</label>
                  <p className="text-sm font-bold text-slate-800">Room {booking.roomNumber}</p>
                  <span className="text-[10px] font-bold text-blue-600 uppercase">{booking.roomType}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Email Reference</label>
                  <p className="text-sm text-slate-700">{booking.guestEmail}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Check-in Date</label>
                  {isEditingDetails ? (
                    <input
                      type="date"
                      className="w-full border border-slate-300 rounded px-3 h-[38px] text-sm outline-none focus:border-blue-600"
                      value={editForm.checkInDate}
                      onChange={handleEditChange('checkInDate')}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-700">{booking.startDate?.split('T')[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Check-out Date</label>
                  {isEditingDetails ? (
                    <input
                      type="date"
                      className="w-full border border-slate-300 rounded px-3 h-[38px] text-sm outline-none focus:border-blue-600"
                      value={editForm.checkOutDate}
                      onChange={handleEditChange('checkOutDate')}
                    />
                  ) : (
                    <p className="text-sm font-semibold text-slate-700">{booking.endDate?.split('T')[0]}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </fieldset>

        {/* Fieldset 2: Costs & Extra Charges */}
        <fieldset className="border border-slate-300 p-6 rounded-md bg-white min-w-0">
          <legend className="px-2 text-sm font-bold text-blue-600 uppercase tracking-wide">Costs & Extra Charges</legend>

          {/* Quick Charge Buttons */}
          {quickCharges.length > 0 && (
            <div className="mb-4 no-print">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Quick Charge Shortcuts</h4>
              <div className="flex flex-wrap gap-2">
                {quickCharges.map((qc) => (
                  <button
                    key={qc.id}
                    type="button"
                    onClick={() => {
                      setSelectedQuickCharge(qc);
                      setQuickChargeAmount(String(qc.amount));
                    }}
                    className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-3 py-1.5 rounded transition-all"
                  >
                    + {qc.name} (Rs. {qc.amount})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Charges Table */}
          <div className="mb-4 overflow-x-auto">
            <table className="w-full border-collapse border border-slate-200 text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-3 font-bold text-slate-600 uppercase">Description</th>
                  <th className="p-3 font-bold text-slate-600 uppercase">Date</th>
                  <th className="p-3 font-bold text-slate-600 text-right uppercase">Amount</th>
                  <th className="p-3 font-bold text-slate-600 text-right uppercase no-print">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-slate-200 hover:bg-slate-50/50">
                    <td className="p-3 font-medium text-slate-800">
                      {editingExpenseId === exp.id ? (
                        <input
                          type="text"
                          className="border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-600 w-full"
                          value={expenseDraft.description}
                          onChange={(e) => setExpenseDraft((prev) => ({ ...prev, description: e.target.value }))}
                        />
                      ) : (
                        exp.description
                      )}
                    </td>
                    <td className="p-3 text-slate-500">{exp.date}</td>
                    <td className="p-3 text-right font-bold text-slate-800">
                      {editingExpenseId === exp.id ? (
                        <input
                          type="number"
                          step="0.01"
                          className="border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-blue-600 w-24 text-right"
                          value={expenseDraft.amount}
                          onChange={(e) => setExpenseDraft((prev) => ({ ...prev, amount: e.target.value }))}
                        />
                      ) : (
                        `Rs. ${exp.amount.toFixed(2)}`
                      )}
                    </td>
                    <td className="p-3 text-right no-print">
                      {editingExpenseId === exp.id ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveExpense(exp.id)}
                            className="text-xs text-blue-600 hover:underline font-bold"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEditExpense}
                            className="text-xs text-slate-500 hover:underline"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => handleStartEditExpense(exp)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveExpense(exp.id)}
                            className="text-xs text-red-650 hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-slate-400 font-bold uppercase tracking-wider">
                      No extra charges added.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Custom Add Expense Form */}
          <form onSubmit={handleAddExpense} className="flex flex-col sm:flex-row gap-2 items-center no-print">
            <input 
              type="text" 
              required
              placeholder="Custom Charge Description (e.g. Spa Treatment)" 
              className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-xs outline-none focus:border-blue-600 w-full"
              value={newExpense.description}
              onChange={e => setNewExpense({...newExpense, description: e.target.value})}
            />
            <input 
              type="number" 
              required
              step="0.01"
              placeholder="Amount (Rs.)" 
              className="w-full sm:w-28 border border-slate-300 rounded px-3 py-1.5 text-xs outline-none focus:border-blue-600"
              value={newExpense.amount}
              onChange={e => setNewExpense({...newExpense, amount: e.target.value})}
            />
            <button className="border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 px-4 py-1.5 rounded text-xs font-bold whitespace-nowrap transition-colors w-full sm:w-auto">
              Add Charge
            </button>
          </form>
          {expenseError && (
            <p className="text-xs text-red-650 font-bold mt-2">{expenseError}</p>
          )}
        </fieldset>

        {/* Fieldset 3: Financial Summary & Ledger */}
        <fieldset className="border border-slate-300 p-6 rounded-md bg-white min-w-0">
          <legend className="px-2 text-sm font-bold text-blue-600 uppercase tracking-wide">Financial Summary & Ledger</legend>
          
          <div className="space-y-6">
            
            {/* 1. Cost & Summary Breakdown */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">Cost Breakdown</h3>
              <div className="w-full space-y-2 text-xs font-medium text-slate-700">
                {/* Room Charge Row */}
                <div className="flex justify-between items-start gap-4 py-1">
                  <span>Room Stay Charge (Room {booking.roomNumber} · {nights} {nights === 1 ? 'night' : 'nights'} × Rs. {roomPrice.toFixed(2)})</span>
                  <span className="font-semibold text-slate-900 shrink-0">Rs. {roomTotal.toFixed(2)}</span>
                </div>

                {/* Extra Charges Row */}
                <div className="flex justify-between items-start gap-4 py-1">
                  <span>Extra Charges &amp; Expenses ({expenses.length} configured)</span>
                  <span className="font-semibold text-slate-900 shrink-0">Rs. {totalExpenses.toFixed(2)}</span>
                </div>

                {/* Single line above Grand Total */}
                <div className="border-t border-slate-300 my-2"></div>

                {/* Discount row (shown in brackets before grand total) */}
                {appliedDiscount > 0 && (
                  <div className="flex justify-between items-center gap-4 py-0.5 text-rose-600">
                    <span className="font-semibold">(Discount Applied)</span>
                    <span className="font-bold shrink-0">(- Rs. {appliedDiscount.toFixed(2)})</span>
                  </div>
                )}

                {/* Grand Total Row */}
                <div className="flex justify-between items-center gap-4 py-1 font-bold text-slate-900">
                  <span className="uppercase text-[10px] tracking-wider">Grand Total</span>
                  <span className="text-sm font-black shrink-0">Rs. {grandTotal.toFixed(2)}</span>
                </div>

                {/* Total Paid Row */}
                <div className="flex justify-between items-center gap-4 py-1 text-slate-800 font-bold text-sm">
                  <span>Total Paid (Ledger)</span>
                  <span className="text-emerald-700 text-base font-black shrink-0">Rs. {totalPaid.toFixed(2)}</span>
                </div>

                {/* Total Refunded Row */}
                {totalRefunded > 0 && (
                  <div className="flex justify-between items-center gap-4 py-1 text-red-600 font-bold text-sm">
                    <span>Total Refunded</span>
                    <span className="text-red-600 text-base font-black line-through shrink-0">Rs. {totalRefunded.toFixed(2)}</span>
                  </div>
                )}

                {/* Single line above Balance Due */}
                <div className="border-t border-slate-300 my-2"></div>

                {/* Balance Due Row */}
                <div className={`flex justify-between items-center gap-4 py-1.5 font-bold ${balanceDue > 0 ? 'text-red-900' : 'text-emerald-800'}`}>
                  <span className="uppercase text-[10px] tracking-wider">Balance Due</span>
                  <span className="text-base font-black border-b-[3px] border-double border-current pb-0.5 shrink-0">
                    Rs. {Math.max(0, balanceDue).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Discount Editor Panel */}
            <div className="space-y-3 no-print">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
                <span>Apply Discount</span>
                {appliedDiscount > 0 && (
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                    Active: Rs. {appliedDiscount.toFixed(2)} off
                  </span>
                )}
              </h3>

              {/* Quick % Buttons */}
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider self-center mr-1">Quick:</span>
                {[5, 10].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    disabled={isSavingDiscount || booking.status === 'cancelled'}
                    onClick={() => {
                      const val = (subTotal * pct) / 100;
                      setDiscountInput(val.toFixed(2));
                      setDiscountError('');
                    }}
                    className="border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-3 py-1.5 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {pct}% off (Rs. {((subTotal * pct) / 100).toFixed(2)})
                  </button>
                ))}
              </div>

              {/* Custom Amount Input Row */}
              <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <div className="relative flex-1 w-full">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">Rs.</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder={`Custom amount (max Rs. ${(subTotal - 0.01).toFixed(2)})`}
                    className={`w-full border rounded pl-9 pr-3 py-1.5 text-xs font-bold outline-none ${
                      discountError ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-300 focus:border-blue-600'
                    }`}
                    value={discountInput}
                    onChange={(e) => { setDiscountInput(e.target.value); setDiscountError(''); }}
                    disabled={isSavingDiscount || booking.status === 'cancelled'}
                  />
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleApplyDiscount}
                    disabled={!discountInput || isSavingDiscount || booking.status === 'cancelled'}
                    className="border border-emerald-600 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-1.5 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isSavingDiscount ? 'Saving…' : 'Apply Discount'}
                  </button>
                  {appliedDiscount > 0 && (
                    <button
                      type="button"
                      onClick={handleRemoveDiscount}
                      disabled={isSavingDiscount || booking.status === 'cancelled'}
                      className="border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs px-3 py-1.5 rounded transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
              {discountError && (
                <p className="text-xs text-red-600 font-bold">{discountError}</p>
              )}
            </div>

            {/* 2. Transaction Log / Payments History */}
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">Payment Transactions</h3>
              
              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3 font-bold text-slate-600 uppercase">Payment Method</th>
                      <th className="p-3 font-bold text-slate-600 uppercase">Date</th>
                      <th className="p-3 font-bold text-slate-600 uppercase">Status</th>
                      <th className="p-3 font-bold text-slate-600 text-right uppercase">Amount</th>
                      <th className="p-3 font-bold text-slate-600 text-right uppercase no-print">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((pay) => (
                      <tr key={pay.id} className="border-b border-slate-200 last:border-0 hover:bg-slate-50/50">
                        <td className="p-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-bold text-slate-800 uppercase tracking-wide">{pay.method}</span>
                            <span className={`inline-block w-fit px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                              pay.note === 'Advance Payment' 
                                ? 'bg-blue-50 text-blue-700 border-blue-200' 
                                : pay.note === 'Full Payment'
                                ? 'bg-slate-50 text-slate-700 border-slate-300'
                                : 'bg-slate-50 text-slate-400 border-slate-200 italic'
                            }`}>
                              {pay.note || 'General Payment'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-500">{pay.date}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                            pay.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                            pay.status === 'refunded' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {pay.status}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold">
                          {pay.status === 'refunded' ? (
                            <span className="text-red-600 line-through">Rs. {pay.amount.toFixed(2)}</span>
                          ) : (
                            <span className="text-emerald-700">+Rs. {pay.amount.toFixed(2)}</span>
                          )}
                        </td>
                        <td className="p-3 text-right no-print space-x-3">
                          {booking.status === 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => handleUpdatePaymentStatus(pay.id, pay.status === 'refunded' ? 'paid' : 'refunded')}
                              className={`text-xs font-bold hover:underline ${
                                pay.status === 'refunded' ? 'text-emerald-700' : 'text-amber-700'
                              }`}
                            >
                              {pay.status === 'refunded' ? 'Mark Paid' : 'Refund'}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemovePayment(pay.id)}
                            disabled={isRemovingPayment}
                            className="text-xs text-red-650 hover:underline font-bold disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-6 text-center text-slate-400 font-bold uppercase tracking-wider">
                          No payments posted yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Action Panel: Settlement Badge & Add Payment Button */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-4 no-print">
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-bold uppercase text-slate-500">Settlement Status</span>
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  currentPaymentStatus === 'paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
                  currentPaymentStatus === 'pending' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                  'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {currentPaymentStatus}
                </span>
              </div>

              <div className="flex gap-2">
                {booking.status === 'cancelled' && payments.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowRefundModal(true)}
                    className="border border-red-600 bg-white hover:bg-red-50 text-red-600 font-bold text-xs uppercase px-4 py-2 rounded transition-all flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 15v-6a4 4 0 00-8 0v6m-4 0h16" />
                    </svg>
                    Refund Payments
                  </button>
                )}

                <button
                  type="button"
                  disabled={booking.status === 'cancelled'}
                  onClick={() => {
                    setPaymentError('');
                    setShowPaymentModal(true);
                  }}
                  className="border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase px-4 py-2 rounded transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  Add Payment
                </button>
              </div>
            </div>

          </div>
        </fieldset>
      </div>

      {/* Quick Add Custom Modal popup */}
      {selectedQuickCharge && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white rounded p-6 shadow-xl border border-slate-300">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Add Quick Charge</h3>
            <p className="text-slate-500 text-xs mb-4">Confirm or adjust the amount for <strong className="text-slate-800">"{selectedQuickCharge.name}"</strong></p>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Charge Amount (Rs.)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">Rs.</span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full border border-slate-300 rounded pl-9 pr-3 py-1.5 text-sm font-bold outline-none focus:border-blue-600"
                    value={quickChargeAmount}
                    onChange={(e) => setQuickChargeAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleConfirmQuickCharge}
                  disabled={!quickChargeAmount || parseFloat(quickChargeAmount) <= 0}
                  className="flex-1 border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40"
                >
                  Post Charge
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedQuickCharge(null)}
                  className="flex-1 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal Popup */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white rounded p-6 shadow-xl border border-slate-300 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Payment</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Booking #00{booking.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-4 text-xs flex justify-between items-center">
              <span className="font-bold text-slate-500 uppercase tracking-wide text-[9px]">Remaining to Pay</span>
              <span className="font-black text-slate-900 text-sm">Rs. {Math.max(0, balanceDue).toFixed(2)}</span>
            </div>

            <form onSubmit={handleAddPayment} className="space-y-4">
              {/* Payment Type Selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase text-slate-500">Payment Option</label>
                <div className="flex border border-slate-300 rounded overflow-hidden">
                  {[
                    { value: 'advance', label: 'Advance Payment' },
                    { value: 'full', label: 'Full Payment' }
                  ].map(t => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setPaymentType(t.value)}
                      className={`flex-1 py-1.5 text-xs font-bold text-center transition-all ${
                        paymentType === t.value 
                          ? 'bg-slate-900 text-white' 
                          : 'bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase text-slate-500">Select Method</label>
                <div className="flex gap-2">
                  {[
                    { value: 'cash', label: 'Cash' },
                    { value: 'card', label: 'Card' },
                    { value: 'bank', label: 'Bank Transfer' }
                  ].map(m => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setNewPayment(prev => ({ ...prev, method: m.value }))}
                      className={`border flex-1 py-2 text-xs font-bold rounded text-center transition-all ${
                        newPayment.method === m.value 
                          ? 'border-blue-600 bg-blue-50 text-blue-700' 
                          : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-800'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount to Pay */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold uppercase text-slate-500">Amount to Pay</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold">Rs.</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    className={`w-full border rounded pl-9 pr-3 py-1.5 text-sm font-bold outline-none ${
                      paymentError ? 'border-red-300 bg-red-50 text-red-900' : 'border-slate-300 focus:border-blue-600'
                    }`}
                    value={newPayment.amount}
                    onChange={e => {
                      setPaymentError('');
                      setNewPayment({ ...newPayment, amount: e.target.value });
                    }}
                  />
                </div>
                {paymentError && (
                  <p className="text-xs text-red-650 font-bold mt-1 leading-tight">{paymentError}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={grandTotal > 0 && balanceDue <= 0}
                  className="flex-1 border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Post Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Refund Advance Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md bg-white rounded p-6 shadow-xl border border-slate-300 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-slate-200 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Manage Advance Refund</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Booking #00{booking.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowRefundModal(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                The booking has been cancelled. Below are the payments recorded. You can mark them as refunded to reduce the amount from revenue.
              </p>

              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                {payments.map(pay => (
                    <div key={pay.id} className="py-3 flex items-center justify-between gap-4 text-xs">
                      <div>
                        <p className="font-bold text-slate-800 uppercase">{pay.method} Payment</p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                            pay.note === 'Advance Payment' 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : pay.note === 'Full Payment'
                              ? 'bg-slate-50 text-slate-700 border-slate-300'
                              : 'bg-slate-50 text-slate-400 border-slate-200 italic'
                          }`}>
                            {pay.note || 'General Payment'}
                          </span>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                            pay.status === 'refunded' ? 'bg-red-50 text-red-750 border-red-150' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          }`}>
                            {pay.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-450 mt-1">{pay.date} · Rs. {pay.amount.toFixed(2)}</p>
                      </div>
                      
                      <div className="flex gap-2">
                        {pay.status === 'refunded' ? (
                          <button
                            type="button"
                            onClick={() => handleUpdatePaymentStatus(pay.id, 'paid')}
                            className="border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 px-3 py-1.5 rounded font-bold text-[10px] uppercase transition-all"
                          >
                            Mark Paid
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdatePaymentStatus(pay.id, 'refunded')}
                            className="border border-red-600 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded font-bold text-[10px] uppercase transition-all shadow-sm"
                          >
                            Refund Payment
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                }
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowRefundModal(false)}
                  className="border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-2 rounded font-bold text-xs uppercase tracking-wider transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
