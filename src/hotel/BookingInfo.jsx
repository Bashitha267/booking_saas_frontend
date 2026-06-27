import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useToast } from '../components/Toast';

// ─── Configs ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = [
  { value: 'pending',     label: 'Pending',     active: 'bg-amber-500 text-white border-amber-500',   idle: 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50',   badge: 'bg-amber-50 border-amber-200 text-amber-700',   dot: 'bg-amber-400' },
  { value: 'confirmed',   label: 'Confirmed',   active: 'bg-blue-600 text-white border-blue-600',     idle: 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50',     badge: 'bg-blue-50 border-blue-200 text-blue-700',     dot: 'bg-blue-500'  },
  { value: 'checked-in',  label: 'Checked In',  active: 'bg-emerald-600 text-white border-emerald-600', idle: 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
  { value: 'checked-out', label: 'Checked Out', active: 'bg-slate-700 text-white border-slate-700',   idle: 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50',   badge: 'bg-slate-100 border-slate-300 text-slate-700', dot: 'bg-slate-400'  },
  { value: 'cancelled',   label: 'Cancelled',   active: 'bg-red-600 text-white border-red-600',       idle: 'bg-white text-red-600 border-red-200 hover:bg-red-50',       badge: 'bg-red-50 border-red-200 text-red-700',       dot: 'bg-red-400'   },
];

const ID_OPTIONS = [
  { value: 'not_required',       label: 'Not Required',       desc: 'No ID needed',              cls: 'bg-slate-700 text-white border-slate-700'    },
  { value: 'pending_collection', label: 'Pending Collection',  desc: 'Not yet collected',         cls: 'bg-amber-500 text-white border-amber-500'    },
  { value: 'collected',          label: 'Collected ✓',         desc: 'Received & verified',       cls: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'returned',           label: 'Returned',            desc: 'Returned to guest',         cls: 'bg-blue-600 text-white border-blue-600'      },
];

export default function BookingInfo() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const { showToast, ToastComponent } = useToast();

  const [booking,   setBooking]   = useState(null);
  const [expenses,  setExpenses]  = useState([]);
  const [payments,  setPayments]  = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // booking status
  const [isChangingStatus,  setIsChangingStatus]  = useState(false);
  const [confirmingCancel,  setConfirmingCancel]   = useState(false);

  // ID doc — auto-save
  const [idStatus,    setIdStatus]    = useState('not_required');
  const [idNote,      setIdNote]      = useState('');
  const [idSaveState, setIdSaveState] = useState('idle'); // idle | saving | saved
  const idDebounce = useRef(null);

  // Edit details
  const [isEditing,   setIsEditing]   = useState(false);
  const [editForm,    setEditForm]    = useState({ guestName:'', guestContact:'', guestNic:'', country:'', address:'', adults:1, children:0 });
  const [editErrors,  setEditErrors]  = useState({});
  const [isSavingEdit,setIsSavingEdit]= useState(false);

  // Extend stay
  const [showExtend,    setShowExtend]    = useState(false);
  const [extendDate,    setExtendDate]    = useState('');
  const [extendError,   setExtendError]   = useState('');
  const [isSavingExtend,setIsSavingExtend]= useState(false);

  // ── Financials ──────────────────────────────────────────────────────────────
  const roomPrice = booking ? Number(booking.roomPrice || 0) : 0;

  const nights = useMemo(() => {
    if (!booking?.startDate || !booking?.endDate) return 1;
    const diff = new Date(booking.endDate) - new Date(booking.startDate);
    return Math.max(1, Math.round(diff / 86400000));
  }, [booking?.startDate, booking?.endDate]);

  const extendNights = useMemo(() => {
    if (!extendDate || !booking?.endDate) return 0;
    const diff = new Date(extendDate) - new Date(booking.endDate);
    return Math.max(0, Math.round(diff / 86400000));
  }, [extendDate, booking?.endDate]);

  const roomTotal       = roomPrice * nights;
  const totalExpenses   = expenses.reduce((s, e) => s + e.amount, 0);
  const appliedDiscount = Number(booking?.discount || 0);
  const grandTotal      = roomTotal + totalExpenses - appliedDiscount;
  const totalPaid       = payments.filter(p => p.status !== 'refunded').reduce((s, p) => s + p.amount, 0);
  const balanceDue      = grandTotal - totalPaid;
  const paymentStatus   = totalPaid <= 0 ? 'unpaid' : balanceDue <= 0.005 ? 'paid' : 'advance';

  // ── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setIsLoading(true); setLoadError('');
      try {
        const [bRes, pRes] = await Promise.all([api.get(`/bookings/${id}`), api.get('/payments')]);
        const d = bRes.data?.data;
        if (!d) throw new Error('Not found');

        const notes = (d.notes || '').split(' | ');
        const mapped = {
          id: d.id, guestName: d.guestName, guestContact: d.guestContact,
          guestNic: d.guestNic || '', roomNumber: d.roomNumber || 'N/A',
          roomType: d.roomType || 'Unknown', startDate: d.checkInDate,
          checkInTime: d.checkInTime || '14:00:00',
          endDate: d.checkOutDate,
          checkOutTime: d.checkOutTime || '11:00:00',
          status: d.status,
          adults: Number(d.adults || 0), children: Number(d.children || 0),
          roomPrice: Number(d.roomPrice || 0), discount: Number(d.discount || 0),
          country: notes[0] || '', address: notes[1] || '',
          idStatus: d.idStatus || 'not_required', idNote: d.idNote || '',
        };

        let parsedExp = [];
        try { if (d.expenses) parsedExp = JSON.parse(d.expenses); } catch (_) {}

        const pays = (pRes.data?.data || [])
          .filter(p => p.bookingId === d.id)
          .map(p => ({ id: p.id, amount: Number(p.amount || 0), method: p.method || 'cash', status: p.status || 'paid', note: p.note || '', date: (p.paidAt || p.createdAt || '').toString().slice(0, 10) }));

        if (mounted) {
          setBooking(mapped); setExpenses(parsedExp); setPayments(pays);
          setIdStatus(mapped.idStatus); setIdNote(mapped.idNote);
          setEditForm({ guestName: mapped.guestName, guestContact: mapped.guestContact, guestNic: mapped.guestNic, country: mapped.country, address: mapped.address, adults: mapped.adults, children: mapped.children });
        }
      } catch {
        if (mounted) { setLoadError('Failed to load booking.'); showToast('Failed to load booking.', 'error'); }
      } finally { if (mounted) setIsLoading(false); }
    };
    if (id) load();
    return () => { mounted = false; };
  }, [id]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleStatusChange = async (next) => {
    if (!booking || isChangingStatus || next === booking.status) return;
    if (next === 'cancelled' && !confirmingCancel) { setConfirmingCancel(true); return; }
    setIsChangingStatus(true); setConfirmingCancel(false);
    const prev = booking.status;
    setBooking(b => ({ ...b, status: next }));
    try { await api.put(`/bookings/${booking.id}`, { status: next }); showToast(`Status → ${STATUS_CONFIG.find(s => s.value === next)?.label}`, 'success'); }
    catch { setBooking(b => ({ ...b, status: prev })); showToast('Failed to update status.', 'error'); }
    finally { setIsChangingStatus(false); }
  };

  const autoSaveId = async (newStatus, newNote) => {
    if (!booking) return;
    setIdSaveState('saving');
    try {
      await api.put(`/bookings/${booking.id}`, { idStatus: newStatus, idNote: newNote });
      setBooking(b => ({ ...b, idStatus: newStatus, idNote: newNote }));
      setIdSaveState('saved');
      setTimeout(() => setIdSaveState('idle'), 2000);
    } catch { showToast('Failed to save ID status.', 'error'); setIdSaveState('idle'); }
  };

  const handleIdClick = (val) => { setIdStatus(val); autoSaveId(val, idNote); };
  const handleNoteChange = (v) => {
    setIdNote(v);
    if (idDebounce.current) clearTimeout(idDebounce.current);
    idDebounce.current = setTimeout(() => autoSaveId(idStatus, v), 1500);
  };
  const handleNoteBlur = (v) => {
    if (idDebounce.current) clearTimeout(idDebounce.current);
    autoSaveId(idStatus, v);
  };

  const handleSaveEdit = async () => {
    const errs = {};
    if (!editForm.guestName.trim())    errs.guestName    = 'Required';
    if (!editForm.guestContact.trim()) errs.guestContact = 'Required';
    if (Number(editForm.adults) < 1)   errs.adults       = 'Min 1';
    setEditErrors(errs);
    if (Object.keys(errs).length) return;
    setIsSavingEdit(true);
    try {
      const notesVal = [editForm.country?.trim(), editForm.address?.trim()].filter(Boolean).join(' | ');
      await api.put(`/bookings/${booking.id}`, { guestName: editForm.guestName.trim(), guestContact: editForm.guestContact.trim(), guestNic: editForm.guestNic.trim() || null, adults: Number(editForm.adults), children: Number(editForm.children), notes: notesVal || null });
      setBooking(b => ({ ...b, guestName: editForm.guestName.trim(), guestContact: editForm.guestContact.trim(), guestNic: editForm.guestNic.trim(), country: editForm.country.trim(), address: editForm.address.trim(), adults: Number(editForm.adults), children: Number(editForm.children) }));
      setIsEditing(false); showToast('Details updated.', 'success');
    } catch { showToast('Failed to save.', 'error'); }
    finally { setIsSavingEdit(false); }
  };

  const handleExtend = async () => {
    setExtendError('');
    if (!extendDate) { setExtendError('Select a new check-out date.'); return; }
    if (new Date(extendDate) <= new Date(booking.endDate)) { setExtendError('Must be after current check-out.'); return; }
    setIsSavingExtend(true);
    try {
      await api.put(`/bookings/${booking.id}`, { checkOutDate: extendDate });
      setBooking(b => ({ ...b, endDate: extendDate }));
      setShowExtend(false); setExtendDate('');
      showToast(`Stay extended to ${extendDate}`, 'success');
    } catch { showToast('Failed to extend.', 'error'); }
    finally { setIsSavingExtend(false); }
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const statusCfg = STATUS_CONFIG.find(s => s.value === booking?.status) || STATUS_CONFIG[0];
  const idCfg     = ID_OPTIONS.find(o => o.value === idStatus) || ID_OPTIONS[0];
  const fmtMoney  = (n) => `Rs. ${Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  const fmtTime   = (t) => {
    if (!t) return '';
    const [hStr, mStr] = t.split(':');
    const h = parseInt(hStr, 10);
    const m = mStr ? mStr.slice(0, 2) : '00';
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12  = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${m} ${ampm}`;
  };

  if (isLoading) return (
    <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
      Loading booking info...
    </div>
  );
  if (!booking || loadError) return (
    <div className="p-8 text-center text-rose-500 text-xs font-bold uppercase tracking-widest bg-rose-50 rounded-2xl max-w-md mx-auto mt-12 border border-rose-100">
      {loadError || 'Booking not found.'}
    </div>
  );

  return (
    <div className="p-4 md:p-8 bg-white min-h-screen text-slate-800 font-sans pb-24 relative">
      <ToastComponent />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-300 mb-8">
        <div>
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors font-bold text-[10px] uppercase tracking-widest mb-3">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Bookings
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-none">
              Booking #{String(booking.id).padStart(5, '0')}
            </h1>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusCfg.badge}`}>
              {statusCfg.label}
            </span>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
              paymentStatus === 'paid'    ? 'bg-emerald-50 border-emerald-200 text-emerald-700' :
              paymentStatus === 'advance' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                           'bg-red-50 border-red-200 text-red-700'
            }`}>
              {paymentStatus === 'paid' ? 'Fully Paid' : paymentStatus === 'advance' ? 'Advance Paid' : 'Unpaid'}
            </span>
          </div>
        </div>
        {/* Full details link */}
        <button onClick={() => navigate(`/hotel/bookings/${booking.id}`)}
          className="flex items-center gap-1.5 border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-4 py-1.5 rounded text-xs font-bold transition-all active:scale-95">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Full Booking Details
        </button>
      </div>

      <div className="space-y-6 max-w-5xl mx-auto">

        {/* ── Fieldset 1: Guest Information ─────────────────────────────────── */}
        <fieldset className="border border-slate-300 p-4 md:p-6 rounded-md bg-white min-w-0">
          <legend className="px-2 text-sm font-bold text-blue-600 uppercase tracking-wide">Guest Information</legend>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {/* Left — Guest Profile */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">Guest Profile</h3>

              {isEditing ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Guest Name *</label>
                      <input type="text" value={editForm.guestName}
                        onChange={e => setEditForm(f => ({ ...f, guestName: e.target.value }))}
                        className={`w-full border rounded px-3 py-1.5 text-sm outline-none focus:border-blue-600 ${editErrors.guestName ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} />
                      {editErrors.guestName && <p className="text-[10px] text-red-600 mt-0.5">{editErrors.guestName}</p>}
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contact *</label>
                      <input type="text" value={editForm.guestContact}
                        onChange={e => setEditForm(f => ({ ...f, guestContact: e.target.value }))}
                        className={`w-full border rounded px-3 py-1.5 text-sm outline-none focus:border-blue-600 ${editErrors.guestContact ? 'border-red-400 bg-red-50' : 'border-slate-300'}`} />
                      {editErrors.guestContact && <p className="text-[10px] text-red-600 mt-0.5">{editErrors.guestContact}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">NIC / Passport</label>
                      <input type="text" value={editForm.guestNic}
                        onChange={e => setEditForm(f => ({ ...f, guestNic: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-600" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Country</label>
                      <input type="text" value={editForm.country}
                        onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))}
                        className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-600" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Address</label>
                    <textarea rows={2} value={editForm.address}
                      onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))}
                      className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm outline-none focus:border-blue-600 resize-none" />
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Adults *</label>
                      <input type="number" min="1" value={editForm.adults}
                        onChange={e => setEditForm(f => ({ ...f, adults: e.target.value }))}
                        className={`w-20 border rounded px-3 py-1 text-sm outline-none focus:border-blue-600 ${editErrors.adults ? 'border-red-400' : 'border-slate-300'}`} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Children</label>
                      <input type="number" min="0" value={editForm.children}
                        onChange={e => setEditForm(f => ({ ...f, children: e.target.value }))}
                        className="w-20 border border-slate-300 rounded px-3 py-1 text-sm outline-none focus:border-blue-600" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSaveEdit} disabled={isSavingEdit}
                      className="border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-xs font-bold transition-all active:scale-95 disabled:opacity-50">
                      {isSavingEdit ? 'Saving…' : 'Save Details'}
                    </button>
                    <button onClick={() => { setIsEditing(false); setEditErrors({}); }}
                      className="border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 px-4 py-1.5 rounded text-xs font-bold transition-all active:scale-95">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Guest Name</label>
                      <p className="text-sm font-bold text-slate-800">{booking.guestName}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Contact Number</label>
                      <p className="text-sm font-semibold text-slate-700">{booking.guestContact}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">NIC / Passport</label>
                      <p className="text-sm font-semibold text-slate-700">{booking.guestNic || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Country</label>
                      <p className="text-sm font-semibold text-slate-700">{booking.country || 'N/A'}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Address</label>
                    <p className="text-sm text-slate-600 leading-relaxed">{booking.address || 'Not specified'}</p>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Adults</label>
                      <p className="text-sm font-semibold text-slate-700">{booking.adults}</p>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Children</label>
                      <p className="text-sm font-semibold text-slate-700">{booking.children}</p>
                    </div>
                  </div>
                  <button onClick={() => { setEditForm({ guestName: booking.guestName, guestContact: booking.guestContact, guestNic: booking.guestNic, country: booking.country, address: booking.address, adults: booking.adults, children: booking.children }); setEditErrors({}); setIsEditing(true); }}
                    className="border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 px-4 py-1.5 rounded text-xs font-bold transition-all active:scale-95">
                    Edit Guest Details
                  </button>
                </>
              )}
            </div>

            {/* Right — Reservation Details */}
            <div className="space-y-4 md:border-l md:pl-6 border-slate-200">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">Reservation Details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Assigned Room</label>
                  <p className="text-sm font-bold text-slate-800">Room {booking.roomNumber}</p>
                  <span className="text-[10px] font-bold text-blue-600 uppercase">{booking.roomType}</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Duration</label>
                  <p className="text-sm font-bold text-slate-800">{nights} {nights === 1 ? 'night' : 'nights'}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Check-In</label>
                  <p className="text-sm font-semibold text-slate-700">{booking.startDate?.split('T')[0] || '—'}</p>
                  <p className="text-xs text-blue-600 font-bold mt-0.5">{fmtTime(booking.checkInTime)}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Check-Out</label>
                  <p className="text-sm font-semibold text-slate-700">{booking.endDate?.split('T')[0] || '—'}</p>
                  <p className="text-xs text-amber-600 font-bold mt-0.5">{fmtTime(booking.checkOutTime)}</p>
                </div>
              </div>

              {/* Extend Stay — clearly visible standalone button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => { setExtendDate(''); setExtendError(''); setShowExtend(true); }}
                  disabled={booking.status === 'cancelled' || booking.status === 'checked-out'}
                  className="flex items-center gap-2 border border-indigo-400 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded text-xs font-bold uppercase tracking-wide transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto justify-center sm:justify-start"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Extend Stay
                  <svg className="w-3 h-3 ml-auto sm:ml-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </fieldset>

        {/* ── Fieldset 2: Booking Status ─────────────────────────────────────── */}
        <fieldset className="border border-slate-300 p-4 md:p-6 rounded-md bg-white min-w-0">
          <legend className="px-2 text-sm font-bold text-blue-600 uppercase tracking-wide">Booking Status</legend>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current:</span>
            <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${statusCfg.badge}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}></span>
              {statusCfg.label}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {STATUS_CONFIG.map(cfg => {
              const isActive = booking.status === cfg.value;
              return (
                <button key={cfg.value} type="button"
                  disabled={isChangingStatus}
                  onClick={() => handleStatusChange(cfg.value)}
                  className={`relative py-2 px-3 rounded text-xs font-bold border transition-all active:scale-95 ${isActive ? cfg.active : cfg.idle} ${isChangingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-current rounded-full flex items-center justify-center">
                      <span className="w-1 h-1 rounded-full bg-current"></span>
                    </span>
                  )}
                  {cfg.label}
                </button>
              );
            })}
          </div>

          {confirmingCancel && (
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 bg-red-50 border border-red-200 rounded p-3">
              <p className="text-xs text-red-700 font-bold flex-1">
                Are you sure you want to <strong>cancel this booking</strong>? This cannot be automatically undone.
              </p>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => handleStatusChange('cancelled')}
                  className="border border-red-600 bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-all">
                  Yes, Cancel
                </button>
                <button onClick={() => setConfirmingCancel(false)}
                  className="border border-slate-300 bg-white text-slate-700 text-xs font-bold px-3 py-1.5 rounded transition-all">
                  No
                </button>
              </div>
            </div>
          )}
        </fieldset>

        {/* ── Fieldset 3: ID / Passport Document ────────────────────────────── */}
        <fieldset className="border border-slate-300 p-4 md:p-6 rounded-md bg-white min-w-0">
          <legend className="px-2 text-sm font-bold text-blue-600 uppercase tracking-wide">ID / Passport Document</legend>

          <div className="space-y-4">
            {/* Current status row */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status:</span>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${idCfg.cls}`}>
                {idCfg.label}
              </span>
              {idSaveState === 'saving' && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                  <svg className="w-3 h-3 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving…
                </span>
              )}
              {idSaveState === 'saved' && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  Saved
                </span>
              )}
            </div>

            {booking.guestNic ? (
              <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded px-3 py-2">
                <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                </svg>
                <span className="text-slate-500 font-bold uppercase tracking-wider">ID on Record:</span>
                <span className="font-black text-slate-800">{booking.guestNic}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded px-3 py-2 text-amber-700 font-bold">
                <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                No NIC / Passport number recorded for this guest.
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ID_OPTIONS.map(opt => {
                const sel = idStatus === opt.value;
                return (
                  <button key={opt.value} type="button"
                    disabled={idSaveState === 'saving'}
                    onClick={() => handleIdClick(opt.value)}
                    className={`relative flex flex-col gap-1 p-3 rounded border-2 text-left transition-all active:scale-95 ${sel ? opt.cls : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'} ${idSaveState === 'saving' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {sel && (
                      <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-white/30 rounded-full flex items-center justify-center">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                    <span className="text-xs font-black leading-none pr-3">{opt.label}</span>
                    <span className={`text-[10px] leading-tight ${sel ? 'opacity-70' : 'text-slate-400'}`}>{opt.desc}</span>
                  </button>
                );
              })}
            </div>

            <textarea rows={2}
              placeholder="Add a note about this document (e.g. passport kept at reception)…"
              className="w-full border-0 border-t border-dashed border-slate-200 pt-3 text-xs text-slate-500 placeholder-slate-300 bg-transparent outline-none resize-none focus:text-slate-700 transition-colors"
              value={idNote}
              onChange={e => handleNoteChange(e.target.value)}
              onBlur={e => handleNoteBlur(e.target.value)}
            />
          </div>
        </fieldset>

        {/* ── Fieldset 4: Payment Status ─────────────────────────────────────── */}
        <fieldset className="border border-slate-300 p-4 md:p-6 rounded-md bg-white min-w-0">
          <legend className="px-2 text-sm font-bold text-blue-600 uppercase tracking-wide">Payment Status</legend>

          <div className="space-y-3">
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded border ${
              paymentStatus === 'paid'    ? 'bg-emerald-50 border-emerald-200' :
              paymentStatus === 'advance' ? 'bg-blue-50 border-blue-200' :
                                           'bg-red-50 border-red-200'
            }`}>
              <div>
                <p className={`text-sm font-black ${paymentStatus === 'paid' ? 'text-emerald-700' : paymentStatus === 'advance' ? 'text-blue-700' : 'text-red-700'}`}>
                  {paymentStatus === 'paid' ? 'Fully Paid' : paymentStatus === 'advance' ? 'Advance Payment Received' : 'Payment Pending'}
                </p>
                <p className={`text-[10px] font-bold mt-0.5 ${paymentStatus === 'paid' ? 'text-emerald-600' : paymentStatus === 'advance' ? 'text-blue-600' : 'text-red-500'}`}>
                  {paymentStatus === 'paid'
                    ? `${fmtMoney(totalPaid)} collected — balance cleared`
                    : paymentStatus === 'advance'
                    ? `${fmtMoney(totalPaid)} paid — ${fmtMoney(Math.max(0, balanceDue))} remaining`
                    : `${fmtMoney(grandTotal)} outstanding`}
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Grand Total</p>
                <p className="text-lg font-black text-slate-900">{fmtMoney(grandTotal)}</p>
              </div>
            </div>

            {payments.length > 0 ? (
              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-2 font-bold text-slate-500 uppercase">Method</th>
                      <th className="p-2 font-bold text-slate-500 uppercase">Type</th>
                      <th className="p-2 font-bold text-slate-500 uppercase">Date</th>
                      <th className="p-2 font-bold text-slate-500 text-right uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map(pay => (
                      <tr key={pay.id} className="border-b border-slate-100 last:border-0">
                        <td className="p-2 font-bold text-slate-800 uppercase">{pay.method}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            pay.note === 'Advance Payment' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            pay.note === 'Full Payment'    ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                            'bg-slate-50 text-slate-400 border-slate-100'
                          }`}>{pay.note || 'General'}</span>
                        </td>
                        <td className="p-2 text-slate-500">{pay.date}</td>
                        <td className={`p-2 text-right font-black ${pay.status === 'refunded' ? 'text-red-500 line-through' : 'text-emerald-700'}`}>
                          {pay.status === 'refunded' ? '−' : '+'}Rs. {pay.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-center text-slate-400 text-xs font-bold py-4 border border-dashed border-slate-200 rounded">
                No payments recorded yet.
              </p>
            )}
          </div>
        </fieldset>

        {/* ── Manage Payments bottom button ──────────────────────────────────── */}
        <button onClick={() => navigate(`/hotel/bookings/${booking.id}`)}
          className="w-full flex items-center justify-between border border-slate-900 bg-slate-900 hover:bg-slate-800 text-white rounded-md px-5 py-4 transition-all group">
          <div className="flex items-center gap-3">
            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div className="text-left">
              <p className="text-xs font-black uppercase tracking-wider">Manage Payments</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Add payments, discounts &amp; view full ledger — Booking #{String(booking.id).padStart(5, '0')}</p>
            </div>
          </div>
          <svg className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition-all shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
          </svg>
        </button>

      </div>

      {/* ── Extend Stay Modal ────────────────────────────────────────────────── */}
      {showExtend && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white rounded-md shadow-xl border border-slate-300">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Extend Stay</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Room {booking.roomNumber}</p>
              </div>
              <button onClick={() => setShowExtend(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded p-3">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Current Check-In</p>
                  <p className="font-black text-slate-800">{booking.startDate?.split('T')[0]}</p>
                  <p className="text-[10px] font-bold text-blue-600 mt-0.5">{fmtTime(booking.checkInTime)}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded p-3">
                  <p className="text-[10px] text-amber-500 font-bold uppercase tracking-wider mb-1">Current Check-Out</p>
                  <p className="font-black text-amber-700">{booking.endDate?.split('T')[0]}</p>
                  <p className="text-[10px] font-bold text-amber-600 mt-0.5">{fmtTime(booking.checkOutTime)}</p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">New Check-Out Date</label>
                <input type="date"
                  min={(() => { const d = new Date(booking.endDate); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                  value={extendDate}
                  onChange={e => { setExtendDate(e.target.value); setExtendError(''); }}
                  className={`w-full border rounded px-3 h-[38px] text-sm outline-none focus:border-blue-600 ${extendError ? 'border-red-300 bg-red-50' : 'border-slate-300'}`} />
                {extendError && <p className="text-xs text-red-600 font-bold mt-1">{extendError}</p>}
              </div>

              {extendDate && extendNights > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Additional nights</span>
                    <span className="font-black text-slate-800">+{extendNights} night{extendNights !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Additional charge (est.)</span>
                    <span className="font-black text-slate-800">Rs. {(roomPrice * extendNights).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between">
                    <span className="text-slate-600 font-bold">Total stay</span>
                    <span className="font-black text-slate-900">{nights + extendNights} nights</span>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => setShowExtend(false)}
                  className="flex-1 border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800 py-2 rounded font-bold text-xs uppercase tracking-wider transition-all">
                  Cancel
                </button>
                <button onClick={handleExtend} disabled={isSavingExtend || !extendDate}
                  className="flex-1 border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  {isSavingExtend ? 'Saving…' : 'Confirm Extension'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
