import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../auth/useAuth';
import api from '../api';
import { useToast } from '../components/Toast';

function formatMoney(value) {
  const number = Number(value || 0)
  return 'LKR ' + number.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatLocalDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthsCovered(form) {
  if (form.billingCycle === 'yearly') return 12;
  if (!form.periodStart) return 1;
  if (!form.periodEnd) return 1;
  const [sy, sm] = form.periodStart.split('-').map(Number);
  const [ey, em] = form.periodEnd.split('-').map(Number);
  if (!sy || !sm || !ey || !em) return 1;
  const diff = (ey - sy) * 12 + (em - sm);
  return diff >= 0 ? diff + 1 : 1;
}

const statMeta = [
  { label: 'Total Bookings', color: 'text-blue-600', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'Revenue', color: 'text-emerald-600', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Active Guests', color: 'text-indigo-600', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { label: 'Pending', color: 'text-amber-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { showToast, ToastComponent } = useToast();
  const [viewDate, setViewDate] = useState(new Date());
  const [viewType, setViewType] = useState('calendar'); // 'calendar' or 'timeline'
  const [showQuickAvailability, setShowQuickAvailability] = useState(false);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [checkInDate, setCheckInDate] = useState('');
  const [rooms, setRooms] = useState([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [properties, setProperties] = useState([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [activePropertyId, setActivePropertyId] = useState('all');
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
  const [bookingForm, setBookingForm] = useState({
    guestName: '',
    guestContact: '',
    guestNic: '',
    country: '',
    address: '',
    checkInTime: '14:00',
    checkOutDate: '',
    checkOutTime: '11:00',
    adults: 1,
    children: 0,
    roomType: '',
    roomIds: [],
    paymentStatus: 'none',
    paymentMethod: 'cash',
    paymentAmount: '',
    propertyId: '',
  });
  const [modalRooms, setModalRooms] = useState([]);
  const [modalBookings, setModalBookings] = useState([]);
  const [isLoadingModalData, setIsLoadingModalData] = useState(false);
  const [systemStatus, setSystemStatus] = useState({ globalFee: 0, latestBilling: null });
  const [systemPayments, setSystemPayments] = useState([]);
  const [showSystemPayment, setShowSystemPayment] = useState(false);
  const [systemPaymentForm, setSystemPaymentForm] = useState({ 
    billingCycle: 'monthly', 
    periodStart: new Date().toISOString().slice(0, 7),
    periodEnd: '',
    amount: '', 
    method: 'bank', 
    note: '', 
    proofUrl: '',
    proofFileName: ''
  });
  const [isSubmittingSystemPayment, setIsSubmittingSystemPayment] = useState(false);

  const today = new Date();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const selectedProperty = properties.find((property) => property.id === Number(activePropertyId));
  const isOwner = user?.role === 'owner';
  const isStaff = user?.role === 'staff';

  const currentMonthBookings = bookings.filter(b => {
    const d = new Date(b.checkInDate);
    return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
  });

  const revenueTotal = payments.filter(p => {
    const d = new Date(p.createdAt);
    return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
  }).reduce((sum, pay) => sum + Number(pay.amount || 0), 0);

  const totalBookings = currentMonthBookings.length;

  const activeGuests = bookings.filter((b) => {
    const start = new Date(b.checkInDate);
    const end = new Date(b.checkOutDate);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return todayDate >= start && todayDate <= end && b.status !== 'cancelled';
  }).length;

  const pendingCount = currentMonthBookings.filter((b) => b.status === 'pending').length;

  const stats = useMemo(() => ([
    { ...statMeta[0], value: totalBookings.toString() },
    { ...statMeta[1], value: formatMoney(revenueTotal) },
    { ...statMeta[2], value: activeGuests.toString() },
    { ...statMeta[3], value: pendingCount.toString() },
  ]), [totalBookings, revenueTotal, activeGuests, pendingCount]);

  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const year = viewDate.getFullYear();

  const navigateMonth = (direction) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + direction, 1));
  };

  const openBookingModal = (date) => {
    const nextDate = date || new Date();
    setSelectedDate(nextDate);
    setCheckInDate(formatLocalDate(nextDate));
    
    const nextDay = new Date(nextDate);
    nextDay.setDate(nextDay.getDate() + 1);
    const formattedCheckOut = formatLocalDate(nextDay);

    const defaultPropId = activePropertyId === 'all'
      ? (properties[0]?.id || '')
      : Number(activePropertyId);

    setBookingForm({
      guestName: '',
      guestContact: '',
      guestNic: '',
      country: '',
      address: '',
      checkInTime: '14:00',
      checkOutDate: formattedCheckOut,
      checkOutTime: '11:00',
      adults: 1,
      children: 0,
      roomType: '',
      roomIds: [],
      paymentStatus: 'none',
      paymentMethod: 'cash',
      paymentAmount: '',
      propertyId: defaultPropId,
    });

    if (activePropertyId === 'all') {
      const filteredRooms = rooms.filter(r => r.propertyId === Number(defaultPropId));
      const filteredBookings = bookings.filter(b => b.propertyId === Number(defaultPropId));
      setModalRooms(filteredRooms);
      setModalBookings(filteredBookings);
    } else {
      setModalRooms(rooms);
      setModalBookings(bookings);
    }

    setShowAddBooking(true);
    setSubmitStatus({ type: '', message: '' });
  };

  const calendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startOffset = firstDay.getDay() - 1;
    if (startOffset === -1) startOffset = 6;
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevTail = Array.from({ length: startOffset }, (_, i) => ({
      day: prevMonthLastDay - startOffset + i + 1,
      date: new Date(year, month - 1, prevMonthLastDay - startOffset + i + 1),
      isOtherMonth: true
    }));
    const currentDays = Array.from({ length: lastDay.getDate() }, (_, i) => ({
      day: i + 1,
      date: new Date(year, month, i + 1),
      isOtherMonth: false,
      isToday: today.getDate() === i + 1 && today.getMonth() === month && today.getFullYear() === year
    }));
    const totalSlots = 42;
    const nextHeadLength = totalSlots - (prevTail.length + currentDays.length);
    const nextHead = Array.from({ length: nextHeadLength }, (_, i) => ({
      day: i + 1,
      date: new Date(year, month + 1, i + 1),
      isOtherMonth: true
    }));
    return [...prevTail, ...currentDays, ...nextHead];
  }, [viewDate]);

  const timelineDays = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: lastDay }, (_, i) => ({
      day: i + 1,
      date: new Date(year, month, i + 1)
    }));
  }, [viewDate]);

  const getBookingsForRoomAndDate = (roomId, date) => {
    return bookings.filter(b => {
      const start = new Date(b.checkInDate);
      const end = new Date(b.checkOutDate);
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return b.roomId === roomId && d >= start && d <= end;
    });
  };

  const getBookingsForDate = (date) => {
    return bookings.filter(b => {
      const start = new Date(b.checkInDate);
      const end = new Date(b.checkOutDate);
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      return d >= start && d <= end;
    });
  };

  useEffect(() => {
    let isMounted = true;
    const fetchProperties = async () => {
      setIsLoadingProperties(true);
      try {
        const res = await api.get('/properties');
        if (isMounted) {
          const items = res.data?.data || [];
          setProperties(items);
          if (!activePropertyId && items.length) {
            const nextId = items[0].id;
            setActivePropertyId(nextId);
          }
        }
      } catch (error) {
        console.error('Failed to fetch properties:', error);
        if (isMounted) {
          setProperties([]);
        }
      } finally {
        if (isMounted) setIsLoadingProperties(false);
      }
    };
    const fetchRooms = async () => {
      setIsLoadingRooms(true);
      try {
        const params = activePropertyId && activePropertyId !== 'all' ? { propertyId: activePropertyId } : {};
        const res = await api.get('/rooms', { params });
        if (isMounted) {
          setRooms((res.data?.data || []).filter(r => r.status !== 'blocked' && r.status !== 'maintenance'));
        }
      } catch (error) {
        console.error('Failed to fetch rooms:', error);
        if (isMounted) {
          setRooms([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingRooms(false);
        }
      }
    };
    fetchProperties();
    fetchRooms();
    return () => {
      isMounted = false;
    };
  }, [activePropertyId]);

  const fetchBookingData = useCallback(async () => {
    try {
      const params = activePropertyId && activePropertyId !== 'all' ? { propertyId: activePropertyId } : {};
      const [bookingsRes, paymentsRes] = await Promise.all([
        api.get('/bookings', { params }),
        api.get('/payments', { params }),
      ]);
      setBookings(bookingsRes.data?.data || []);
      setPayments(paymentsRes.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch booking data:', error);
      setBookings([]);
      setPayments([]);
    }
  }, [activePropertyId]);

  const fetchSystemStatus = useCallback(async () => {
    if (isOwner) {
      try {
        const [statusRes, paymentsRes] = await Promise.all([
          api.get('/owner/status'),
          api.get('/owner/payments')
        ]);
        setSystemStatus(statusRes.data || { globalFee: 0, latestBilling: null });
        setSystemPayments(paymentsRes.data?.data || []);
      } catch (error) {
        console.error('Failed to fetch system status', error);
      }
    }
  }, [isOwner]);

  useEffect(() => {
    fetchBookingData();
    fetchSystemStatus();
  }, [fetchBookingData, fetchSystemStatus]);

  useEffect(() => {
    if (!showAddBooking || !bookingForm.propertyId) {
      setModalRooms([]);
      setModalBookings([]);
      return;
    }

    if (activePropertyId === Number(bookingForm.propertyId)) {
      setModalRooms(rooms);
      setModalBookings(bookings);
      return;
    }

    if (activePropertyId === 'all') {
      const filteredRooms = rooms.filter(r => r.propertyId === Number(bookingForm.propertyId));
      const filteredBookings = bookings.filter(b => b.propertyId === Number(bookingForm.propertyId));
      setModalRooms(filteredRooms);
      setModalBookings(filteredBookings);
      return;
    }

    let isMounted = true;
    const fetchModalData = async () => {
      setIsLoadingModalData(true);
      try {
        const params = { propertyId: bookingForm.propertyId };
        const [roomsRes, bookingsRes] = await Promise.all([
          api.get('/rooms', { params }),
          api.get('/bookings', { params })
        ]);
        if (isMounted) {
          setModalRooms((roomsRes.data?.data || []).filter(r => r.status !== 'blocked' && r.status !== 'maintenance'));
          setModalBookings(bookingsRes.data?.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch modal property data:', error);
      } finally {
        if (isMounted) setIsLoadingModalData(false);
      }
    };

    fetchModalData();

    return () => {
      isMounted = false;
    };
  }, [showAddBooking, bookingForm.propertyId, activePropertyId, rooms, bookings]);

  const handlePropertyChange = async (event) => {
    const nextId = event.target.value;
    setActivePropertyId(nextId);
    if (isOwner) {
      try {
        await api.patch('/auth/current-property', { propertyId: Number(nextId) });
        updateUser({ currentPropertyId: Number(nextId) });
      } catch (error) {
        console.error('Failed to switch current property:', error);
        // keep local selection for UI
      }
    }
  };

  const roomTypes = useMemo(() => {
    const sourceRooms = showAddBooking ? modalRooms : rooms;
    const types = sourceRooms.map((room) => room.roomType).filter(Boolean);
    return Array.from(new Set(types));
  }, [rooms, modalRooms, showAddBooking]);

  const isRoomAvailable = useCallback((roomId, startDate, startTime, endDate, endTime) => {
    if (!startDate || !endDate) return true;
    // Build full datetime strings for overlap comparison
    const reqStart = new Date(`${startDate}T${startTime || '14:00'}`);
    const reqEnd   = new Date(`${endDate}T${endTime || '11:00'}`);
    const sourceBookings = showAddBooking ? modalBookings : bookings;
    return !sourceBookings.some((booking) => {
      if (booking.roomId !== roomId) return false;
      if (booking.status === 'cancelled') return false;
      const bookStart = new Date(
        `${booking.checkInDate?.split('T')[0] || booking.checkInDate}T${booking.checkInTime || '14:00'}`
      );
      const bookEnd = new Date(
        `${booking.checkOutDate?.split('T')[0] || booking.checkOutDate}T${booking.checkOutTime || '11:00'}`
      );
      // Overlap: existing booking overlaps if bookStart < reqEnd AND bookEnd > reqStart
      return bookStart < reqEnd && bookEnd > reqStart;
    });
  }, [bookings, modalBookings, showAddBooking]);

  const availableRooms = useMemo(() => {
    const sourceRooms = showAddBooking ? modalRooms : rooms;
    const filtered = bookingForm.roomType
      ? sourceRooms.filter((room) => room.roomType === bookingForm.roomType)
      : sourceRooms;
    return filtered.filter((room) =>
      isRoomAvailable(
        room.id,
        checkInDate,
        bookingForm.checkInTime,
        bookingForm.checkOutDate,
        bookingForm.checkOutTime
      )
    );
  }, [rooms, modalRooms, bookingForm.roomType, bookingForm.checkOutDate, bookingForm.checkOutTime, checkInDate, bookingForm.checkInTime, isRoomAvailable, showAddBooking]);

  useEffect(() => {
    const availableIds = new Set(availableRooms.map((room) => room.id));
    setBookingForm((prev) => ({
      ...prev,
      roomIds: (prev.roomIds || []).filter((id) => availableIds.has(id)),
    }));
  }, [availableRooms]);

  const freeRooms = useMemo(() => {
    const todayDate = new Date();
    const bookedRooms = new Set(
      bookings
        .filter((b) => {
          const start = new Date(b.checkInDate);
          const end = new Date(b.checkOutDate);
          todayDate.setHours(0, 0, 0, 0);
          start.setHours(0, 0, 0, 0);
          end.setHours(0, 0, 0, 0);
          return todayDate >= start && todayDate <= end;
        })
        .map((b) => b.roomId)
    );

    const grouped = new Map();
    rooms.forEach((room) => {
      if (bookedRooms.has(room.id)) return;
      const key = room.roomType || 'Unspecified';
      const current = grouped.get(key) || {
        type: key,
        capacity: `${room.capacityAdults || 1}A, ${room.capacityChildren || 0}C`,
        price: room.price || 0,
        rooms: [],
      };
      current.rooms.push({ roomNumber: room.roomNumber, hasAc: room.hasAc });
      grouped.set(key, current);
    });

    return Array.from(grouped.values());
  }, [rooms, bookings]);

  const roomMap = useMemo(() => {
    const map = {};
    rooms.forEach((r) => {
      map[r.id] = r.roomNumber;
    });
    return map;
  }, [rooms]);

  const bookingRowMap = useMemo(() => {
    const sorted = [...bookings]
      .filter((b) => b.status !== 'cancelled')
      .sort((a, b) => new Date(a.checkInDate) - new Date(b.checkInDate));
    const rows = [];
    const map = {};
    sorted.forEach((b) => {
      const start = new Date(b.checkInDate);
      start.setHours(0, 0, 0, 0);
      let assignedRow = -1;
      for (let i = 0; i < rows.length; i++) {
        const rowEnd = new Date(rows[i]);
        rowEnd.setHours(0, 0, 0, 0);
        if (start > rowEnd) {
          assignedRow = i;
          rows[i] = new Date(b.checkOutDate);
          break;
        }
      }
      if (assignedRow === -1) {
        assignedRow = rows.length;
        rows.push(new Date(b.checkOutDate));
      }
      map[b.id] = assignedRow;
    });
    return map;
  }, [bookings]);

  const handleBookingChange = (field) => (event) => {
    const value = event.target.value;
    setBookingForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleRoomSelection = (roomId) => {
    setBookingForm((prev) => {
      const exists = prev.roomIds.includes(roomId);
      return {
        ...prev,
        roomIds: exists ? prev.roomIds.filter((id) => id !== roomId) : [...prev.roomIds, roomId],
      };
    });
  };

  const handleCreateBooking = async () => {
    if (!bookingForm.guestName || !bookingForm.guestContact || !checkInDate || !bookingForm.checkOutDate || bookingForm.roomIds.length === 0) {
      setSubmitStatus({ type: 'error', message: 'Please fill guest info, dates, and rooms.' });
      return;
    }

    const start = new Date(checkInDate);
    const end = new Date(bookingForm.checkOutDate);
    if (end <= start) {
      setSubmitStatus({ type: 'error', message: 'Check-out date must be after Check-in date.' });
      return;
    }

    const paymentEnabled = bookingForm.paymentStatus !== 'none';
    const paymentAmountValue = Number(bookingForm.paymentAmount || 0);
    if (paymentEnabled && paymentAmountValue <= 0) {
      setSubmitStatus({ type: 'error', message: 'Enter a valid payment amount.' });
      return;
    }

    try {
      setSubmitStatus({ type: 'loading', message: 'Saving booking...' });
      const payloadBase = {
        guestName: bookingForm.guestName,
        guestContact: bookingForm.guestContact,
        guestNic: bookingForm.guestNic || null,
        checkInDate,
        checkInTime: bookingForm.checkInTime || '14:00',
        checkOutDate: bookingForm.checkOutDate,
        checkOutTime: bookingForm.checkOutTime || '11:00',
        adults: Number(bookingForm.adults) || 1,
        children: Number(bookingForm.children) || 0,
        status: 'confirmed',
        notes: [bookingForm.country, bookingForm.address].filter(Boolean).join(' | ') || null,
      };

      const bookingResponses = await Promise.all(
        bookingForm.roomIds.map((roomId) =>
          api.post('/bookings', { ...payloadBase, roomId })
        )
      );

      const createdBookingIds = bookingResponses
        .map((res) => res.data?.id)
        .filter(Boolean);

      if (paymentEnabled && createdBookingIds.length) {
        await api.post('/payments', {
          bookingId: createdBookingIds[0],
          amount: paymentAmountValue,
          method: bookingForm.paymentMethod,
          status: bookingForm.paymentStatus,
          note: 'Advance Payment',
        });
      }

      setSubmitStatus({ type: 'success', message: 'Reservation created successfully!' });
      showToast('Reservation created successfully!', 'success');
      setTimeout(() => setShowAddBooking(false), 500);
      setBookingForm({
        guestName: '',
        guestContact: '',
        guestNic: '',
        country: '',
        address: '',
        checkInTime: '14:00',
        checkOutDate: '',
        checkOutTime: '11:00',
        adults: 1,
        children: 0,
        roomType: '',
        roomIds: [],
        paymentStatus: 'none',
        paymentMethod: 'cash',
        paymentAmount: '',
        propertyId: '',
      });
      await fetchBookingData();
    } catch (error) {
      console.error('Error creating booking:', error);
      setSubmitStatus({ type: 'error', message: error.response?.data?.message || 'Failed to create booking.' });
    }
  };

  const monthlyPrice = Number(systemStatus.ownerPackagePrice != null ? systemStatus.ownerPackagePrice : systemStatus.globalFee);
  const baseYearlyPrice = Number(systemStatus.yearlyPrice != null ? systemStatus.yearlyPrice : monthlyPrice * 12);
  const yearlyDiscount = Number(systemStatus.yearlyDiscount || 0);
  const yearlyPrice = Math.max(0, baseYearlyPrice - yearlyDiscount);
  
  const handleSystemBillingCycleChange = (e) => {
    const cycle = e.target.value;
    setSystemPaymentForm(prev => {
      const updated = { ...prev, billingCycle: cycle };
      if (cycle === 'yearly') {
        updated.amount = String(yearlyPrice);
      } else {
        const months = getMonthsCovered(updated);
        updated.amount = String(months * monthlyPrice);
      }
      return updated;
    });
  };

  const handleSystemDateChange = (field, value) => {
    setSystemPaymentForm(prev => {
      const updated = { ...prev, [field]: value };
      const months = getMonthsCovered(updated);
      updated.amount = String(months * monthlyPrice);
      return updated;
    });
  };

  const systemPaymentBreakdown = useMemo(() => {
    if (systemPaymentForm.billingCycle === 'yearly') {
      return {
        months: 12,
        basePrice: baseYearlyPrice,
        discount: yearlyDiscount,
        total: yearlyPrice
      };
    }
    const months = getMonthsCovered(systemPaymentForm);
    return {
      months,
      basePrice: monthlyPrice,
      discount: 0,
      total: months * monthlyPrice
    };
  }, [systemPaymentForm, baseYearlyPrice, yearlyDiscount, yearlyPrice, monthlyPrice]);

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-screen pb-20 relative">
      <ToastComponent />
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">Hotel Dashboard</h1>
          <p className="text-xs md:text-slate-500 font-medium">Monitoring {rooms.length} rooms and current occupancy.</p>
          {selectedProperty && (
            <p className="text-[10px] md:text-xs font-black text-slate-500 mt-1 uppercase tracking-widest">
              {selectedProperty.name} · {selectedProperty.address}
            </p>
          )}

          {isOwner && (
            <div className="mt-2">
              <button 
                onClick={() => {
                  setSystemPaymentForm(prev => ({
                    ...prev,
                    billingCycle: 'monthly',
                    amount: String(systemStatus.remaining > 0 ? systemStatus.remaining : monthlyPrice)
                  }));
                  setShowSystemPayment(true);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-white text-[8px] font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 transition-all"
              >
                <div className={`h-1.5 w-1.5 rounded-full ${
                  systemStatus.status === 'unpaid' ? 'bg-rose-550 animate-pulse' :
                  systemStatus.status === 'partial' ? 'bg-amber-500' :
                  'bg-emerald-500'
                }`} />
                {systemStatus.status === 'unpaid' ? (
                  <>
                    <span>{systemStatus.monthName || ''} Unpaid:&nbsp;</span>
                    <span className="text-rose-600">{formatMoney(systemStatus.remaining)}</span>
                  </>
                ) : systemStatus.status === 'partial' ? (
                  <>
                    <span>{systemStatus.monthName || ''} Due:&nbsp;</span>
                    <span className="text-amber-600">{formatMoney(systemStatus.remaining)}</span>
                  </>
                ) : (
                  <span className="text-emerald-600">{systemStatus.monthName || ''} Fees Paid</span>
                )}
              </button>
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {isOwner && properties.length > 1 && (
            <select
              value={activePropertyId}
              onChange={handlePropertyChange}
              className="bg-white border border-slate-200 rounded-xl px-3 md:px-4 py-2 text-[10px] md:text-xs font-black text-slate-600"
            >
              <option value="all">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>{property.name}</option>
              ))}
            </select>
          )}
          {isStaff && selectedProperty && (
            <span className="bg-slate-100 text-slate-500 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">
              {selectedProperty.name}
            </span>
          )}
          <div className="bg-slate-200/50 p-1 rounded-2xl flex border border-slate-200">
            <button
              onClick={() => setViewType('calendar')}
              className={`px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-black rounded-xl transition-all ${viewType === 'calendar' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Calendar
            </button>
            <button
              onClick={() => setViewType('timeline')}
              className={`px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-black rounded-xl transition-all ${viewType === 'timeline' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Timeline
            </button>
          </div>
          <button
            onClick={() => setShowQuickAvailability(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-black text-[10px] md:text-sm transition-all shadow-lg shadow-amber-100 active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Availability
          </button>
          <button
            onClick={() => openBookingModal(new Date())}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-black text-[10px] md:text-sm transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Booking
          </button>
          <button
            onClick={handleLogout}
            className="p-2.5 md:p-3 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 hover:bg-rose-100 transition-all flex items-center gap-2"
            title="System Logout"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {/* Add Booking Modal */}
      {showAddBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 md:p-8">
          <div className="bg-white w-full max-w-lg md:max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh] md:max-h-[85vh]">
            <div className="p-6 md:p-8 bg-blue-600 text-white flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl md:text-3xl font-black tracking-tight">New Reservation</h2>
            <p className="text-[10px] md:text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Check-in pre-set for {checkInDate || 'Selected date'} at {bookingForm.checkInTime || '14:00'}</p>
              </div>
              <button onClick={() => setShowAddBooking(false)} className="p-2 hover:bg-blue-500 rounded-xl transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto flex-1 custom-scrollbar">
              {properties.length > 1 && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Property</label>
                  <select
                    value={bookingForm.propertyId}
                    onChange={(e) => {
                      const newPropId = Number(e.target.value);
                      setBookingForm((prev) => ({
                        ...prev,
                        propertyId: newPropId,
                        roomType: '',
                        roomIds: [],
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                  >
                    {properties.map((property) => (
                      <option key={property.id} value={property.id}>{property.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Guest Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={bookingForm.guestName}
                    onChange={handleBookingChange('guestName')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                  <input
                    type="text"
                    placeholder="+1 234..."
                    value={bookingForm.guestContact}
                    onChange={handleBookingChange('guestContact')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NIC / Passport Number</label>
                  <input
                    type="text"
                    placeholder="ID Number"
                    value={bookingForm.guestNic}
                    onChange={handleBookingChange('guestNic')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Country</label>
                  <input
                    type="text"
                    placeholder="e.g. Sri Lanka"
                    value={bookingForm.country}
                    onChange={handleBookingChange('country')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Home Address</label>
                  <input
                    type="text"
                    placeholder="Street, City, State..."
                    value={bookingForm.address}
                    onChange={handleBookingChange('address')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Status</label>
                  <select
                    value={bookingForm.paymentStatus}
                    onChange={handleBookingChange('paymentStatus')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                  >
                    <option value="none">No payment now</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Payment Method</label>
                  <select
                    value={bookingForm.paymentMethod}
                    onChange={handleBookingChange('paymentMethod')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                    disabled={bookingForm.paymentStatus === 'none'}
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="bank">Bank</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount (per room)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={bookingForm.paymentAmount}
                    onChange={handleBookingChange('paymentAmount')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                    disabled={bookingForm.paymentStatus === 'none'}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Check-in Date</label>
                  <input
                    type="date"
                    value={checkInDate}
                    onChange={(e) => {
                      const newCheckIn = e.target.value;
                      setCheckInDate(newCheckIn);
                      setSelectedDate(newCheckIn ? new Date(`${newCheckIn}T00:00:00`) : null);
                      if (newCheckIn) {
                        const inDate = new Date(newCheckIn);
                        const outDate = bookingForm.checkOutDate ? new Date(bookingForm.checkOutDate) : null;
                        if (!outDate || outDate <= inDate) {
                          const nextDay = new Date(inDate);
                          nextDay.setDate(nextDay.getDate() + 1);
                          setBookingForm(prev => ({
                            ...prev,
                            checkOutDate: formatLocalDate(nextDay)
                          }));
                        }
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-[46px] text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Check-in Time</label>
                  <input
                    type="time"
                    value={bookingForm.checkInTime}
                    onChange={handleBookingChange('checkInTime')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-[46px] text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Check-out Date</label>
                  <input
                    type="date"
                    value={bookingForm.checkOutDate}
                    onChange={handleBookingChange('checkOutDate')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-[46px] text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Check-out Time</label>
                  <input
                    type="time"
                    value={bookingForm.checkOutTime}
                    onChange={handleBookingChange('checkOutTime')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-[46px] text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adults</label>
                  <input
                    type="number"
                    min="1"
                    value={bookingForm.adults}
                    onChange={handleBookingChange('adults')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-[46px] text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Children</label>
                  <input
                    type="number"
                    min="0"
                    value={bookingForm.children}
                    onChange={handleBookingChange('children')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 h-[46px] text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Type</label>
                  <select
                    value={bookingForm.roomType}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setBookingForm((prev) => ({
                        ...prev,
                        roomType: nextType,
                        roomIds: [],
                      }));
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                  >
                    <option value="">Select type</option>
                    {roomTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Available Rooms</label>
                  <div className="min-h-[54px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                    {(isLoadingRooms || isLoadingModalData) && (
                      <p className="text-[10px] font-bold text-slate-400">Loading...</p>
                    )}
                    {!isLoadingRooms && !isLoadingModalData && availableRooms.length === 0 && (
                      <p className="text-[10px] font-bold text-slate-400">No rooms available for selected dates.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {!isLoadingRooms && !isLoadingModalData && availableRooms.map((room) => (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => toggleRoomSelection(room.id)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${bookingForm.roomIds.includes(room.id)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-slate-600 border-slate-200'
                            }`}
                        >
                          {room.roomNumber}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Selected: {bookingForm.roomIds.length}
                  </p>
                </div>
              </div>

              {/* Selected Rooms Price Preview & Breakdown */}
              {bookingForm.roomIds.length > 0 && (
                <div className="bg-slate-55 border border-slate-200 rounded-3xl p-6 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Selected Rooms & Price Breakdown</h4>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto pr-1">
                    {bookingForm.roomIds.map((roomId) => {
                      const r = (showAddBooking ? modalRooms : rooms).find((room) => room.id === roomId);
                      if (!r) return null;
                      const stayNights = (() => {
                        if (!checkInDate || !bookingForm.checkOutDate) return 0;
                        const start = new Date(checkInDate);
                        const end = new Date(bookingForm.checkOutDate);
                        const diff = end - start;
                        return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
                      })();
                      const roomTotal = Number(r.price || 0) * stayNights;
                      return (
                        <div key={roomId} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-800">Room {r.roomNumber} · <span className="text-[10px] text-slate-400 uppercase">{r.roomType}</span></p>
                            <p className="text-[10px] text-slate-450 mt-0.5">
                              Rate: Rs. {Number(r.price || 0).toLocaleString()} × {stayNights} {stayNights === 1 ? 'night' : 'nights'}
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-slate-900">Rs. {roomTotal.toLocaleString()}</span>
                            <button
                              type="button"
                              onClick={() => toggleRoomSelection(roomId)}
                              className="text-rose-500 hover:text-rose-700 p-1 rounded-full hover:bg-rose-50 transition-colors"
                              title="Remove room"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                    <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Total Stay Charge</span>
                    <span className="text-sm font-black text-blue-600">
                      Rs. {bookingForm.roomIds.reduce((sum, id) => {
                        const r = (showAddBooking ? modalRooms : rooms).find(room => room.id === id);
                        const stayNights = (() => {
                          if (!checkInDate || !bookingForm.checkOutDate) return 0;
                          const start = new Date(checkInDate);
                          const end = new Date(bookingForm.checkOutDate);
                          const diff = end - start;
                          return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
                        })();
                        return sum + (Number(r?.price || 0) * stayNights);
                      }, 0).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              <div className="pt-6">
                <button
                  onClick={handleCreateBooking}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs md:text-sm shadow-2xl hover:bg-blue-600 active:scale-[0.98] transition-all uppercase tracking-[0.3em]"
                >
                  {submitStatus.type === 'loading' ? 'Saving Reservation...' : 'Confirm & Complete Reservation'}
                </button>
                {submitStatus.message && (
                  <p className={`mt-3 text-[10px] font-black uppercase tracking-widest ${submitStatus.type === 'error' ? 'text-rose-500' : 'text-emerald-600'}`}>
                    {submitStatus.message}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}


      {/* System Payment Modal */}
      {showSystemPayment && isOwner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[1.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black tracking-tight">System Settlement</h3>
                <p className="text-[9px] font-bold opacity-60 uppercase tracking-widest mt-0.5">Platform usage fees & billing</p>
              </div>
              <button onClick={() => setShowSystemPayment(false)} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {systemStatus.latestBilling ? (
                systemStatus.latestBilling.isPromotion === 1 ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                    <div className="h-10 w-10 bg-slate-200 rounded-xl flex items-center justify-center text-xl">🎁</div>
                    <div>
                      <p className="text-sm font-black text-slate-850">You got a Free Trial!</p>
                      <p className="text-[10px] font-bold text-slate-450 mt-0.5">For period {systemStatus.latestBilling.periodStart} to {systemStatus.latestBilling.periodEnd}</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Due</p>
                      <p className="text-sm font-black text-slate-950">{formatMoney(systemStatus.latestBilling.amountDue || monthlyPrice)}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <p className="text-[8px] font-black text-slate-450 uppercase tracking-widest mb-1">Paid Amount</p>
                      <p className="text-sm font-black text-slate-950">{formatMoney((systemStatus.approvedPaid || 0) + (systemStatus.pendingPaid || 0))}</p>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Remaining</p>
                      <p className="text-sm font-black text-rose-600">{formatMoney(systemStatus.remaining)}</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                  <p className="text-[9px] font-bold text-slate-450 uppercase tracking-widest mb-1">Current Monthly Fee Due</p>
                  <p className="text-xl font-black text-rose-600 tracking-tight">{formatMoney(monthlyPrice)}</p>
                </div>
              )}

              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                  Make a Payment
                </h4>
                
                <div className="mb-4">
                  <label className="text-[9px] font-bold text-slate-450 uppercase tracking-widest ml-1 mb-1.5 block">Billing Cycle</label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`cursor-pointer border-2 rounded-lg p-2.5 flex flex-col items-center gap-1 transition-all ${
                      systemPaymentForm.billingCycle === 'monthly' ? 'border-slate-900 bg-slate-50 text-slate-900 font-bold' : 'border-slate-200 text-slate-400 hover:border-slate-300 bg-white'
                    }`}>
                      <input type="radio" name="dashCycle" value="monthly" checked={systemPaymentForm.billingCycle === 'monthly'} onChange={handleSystemBillingCycleChange} className="hidden" />
                      <span className="text-xs uppercase tracking-wider">Monthly</span>
                      <span className="text-[10px] font-bold opacity-70">{formatMoney(monthlyPrice)}</span>
                    </label>
                    <label className={`cursor-pointer border-2 rounded-lg p-2.5 flex flex-col items-center gap-1 transition-all ${
                      systemPaymentForm.billingCycle === 'yearly' ? 'border-slate-900 bg-slate-50 text-slate-900 font-bold' : 'border-slate-200 text-slate-400 hover:border-slate-300 bg-white'
                    }`}>
                      <input type="radio" name="dashCycle" value="yearly" checked={systemPaymentForm.billingCycle === 'yearly'} onChange={handleSystemBillingCycleChange} className="hidden" />
                      <div className="flex items-center gap-1">
                        <span className="text-xs uppercase tracking-wider">Yearly</span>
                        {yearlyDiscount > 0 && <span className="bg-slate-900 text-white text-[8px] px-1 py-0.2 rounded font-black">SAVE {formatMoney(yearlyDiscount)}</span>}
                      </div>
                      <span className="text-[10px] font-bold opacity-70">{formatMoney(yearlyPrice)}</span>
                    </label>
                  </div>
                </div>

                {/* Start Month + End Month */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-450 uppercase tracking-widest ml-1">Start Month</label>
                    <input
                      type="month"
                      className="admin-input !py-2 !text-xs"
                      value={systemPaymentForm.periodStart || ''}
                      onChange={(e) => handleSystemDateChange('periodStart', e.target.value)}
                      required
                    />
                  </div>
                  {systemPaymentForm.billingCycle === 'monthly' && (
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-bold text-slate-455 uppercase tracking-widest ml-1">End Month (Optional)</label>
                      <input
                        type="month"
                        className="admin-input !py-2 !text-xs"
                        value={systemPaymentForm.periodEnd || ''}
                        onChange={(e) => handleSystemDateChange('periodEnd', e.target.value)}
                        min={systemPaymentForm.periodStart}
                      />
                    </div>
                  )}
                  {systemPaymentForm.billingCycle === 'yearly' && (
                    <div className="space-y-1.5 flex items-end">
                      <div className="w-full h-9 flex items-center justify-center bg-slate-100 border border-slate-200 text-slate-700 rounded-xl font-bold text-[9px] uppercase tracking-widest">
                        12 Months
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-455 uppercase tracking-widest ml-1">Payment Method</label>
                    <select
                      className="admin-input !py-2 !text-xs"
                      value={systemPaymentForm.method}
                      onChange={(e) => setSystemPaymentForm(prev => ({ ...prev, method: e.target.value }))}
                    >
                      <option value="bank">Bank Transfer</option>
                      <option value="online">Online Payment</option>
                      <option value="cash">Direct Cash</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-455 uppercase tracking-widest ml-1">Amount to Pay</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400">LKR</span>
                      <input
                        type="number"
                        className="admin-input !pl-12 !py-2 !text-xs"
                        placeholder="0.00"
                        value={systemPaymentForm.amount}
                        onChange={(e) => setSystemPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-455 uppercase tracking-widest ml-1">Payment Note / Reference</label>
                    <input
                      type="text"
                      className="admin-input !py-2 !text-xs"
                      placeholder="Transaction ID or Bank Reference"
                      value={systemPaymentForm.note}
                      onChange={(e) => setSystemPaymentForm(prev => ({ ...prev, note: e.target.value }))}
                    />
                  </div>
                  <div className="md:col-span-2 space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-455 uppercase tracking-widest ml-1">Payment Proof (Image or PDF)</label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-300 rounded-xl py-2 px-4 bg-white cursor-pointer hover:bg-slate-55 transition-colors">
                        <div className="flex items-center gap-2 text-slate-500">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                          <span className="text-xs font-bold truncate max-w-[200px]">
                            {systemPaymentForm.proofFileName || 'Select file (Image or PDF)'}
                          </span>
                        </div>
                        <input
                          type="file"
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setSystemPaymentForm(prev => ({
                                  ...prev,
                                  proofUrl: reader.result,
                                  proofFileName: file.name
                                }));
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {systemPaymentForm.proofUrl && (
                        <button
                          type="button"
                          onClick={() => setSystemPaymentForm(prev => ({ ...prev, proofUrl: '', proofFileName: '' }))}
                          className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-4">
                  {/* Payment Breakdown Preview */}
                  <div className="rounded-xl p-3 bg-white border border-slate-200">
                    <p className="text-[9px] font-black uppercase tracking-widest mb-2 text-slate-500">
                      Payment Breakdown
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Base ({systemPaymentBreakdown.months} × {formatMoney(systemPaymentBreakdown.basePrice / (systemPaymentForm.billingCycle === 'yearly' ? 12 : 1))})</span>
                        <span className="font-bold text-slate-700">{formatMoney(systemPaymentBreakdown.basePrice)}</span>
                      </div>
                      {systemPaymentBreakdown.discount > 0 && (
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 font-bold">Discount</span>
                          <span className="font-bold text-slate-700">- {formatMoney(systemPaymentBreakdown.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-1.5 mt-1.5">
                        <span className="text-slate-800">Total</span>
                        <span className="text-slate-900">{formatMoney(systemPaymentBreakdown.total)}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    disabled={isSubmittingSystemPayment || !systemPaymentForm.amount}
                    onClick={async () => {
                      setIsSubmittingSystemPayment(true);
                      try {
                        const months = getMonthsCovered(systemPaymentForm);
                        let notePrefix = systemPaymentForm.billingCycle === 'yearly' ? '[Yearly] ' : `[Monthly (${months}m)] `;
                        if (systemPaymentForm.billingCycle === 'monthly') {
                          notePrefix += `(${systemPaymentForm.periodStart} to ${systemPaymentForm.periodEnd || systemPaymentForm.periodStart}) `;
                        }
                        
                        await api.post('/owner/payments', {
                          amount: Number(systemPaymentForm.amount),
                          method: systemPaymentForm.method,
                          note: (notePrefix + systemPaymentForm.note).trim(),
                          proofUrl: systemPaymentForm.proofUrl,
                          billingId: systemStatus.latestBilling?.id
                        });
                        setSystemPaymentForm({ 
                          billingCycle: 'monthly', 
                          periodStart: new Date().toISOString().slice(0, 7),
                          periodEnd: '',
                          amount: '', 
                          method: 'bank', 
                          note: '', 
                          proofUrl: '',
                          proofFileName: ''
                        });
                        await fetchSystemStatus();
                        showToast('Payment submitted for verification', 'success');
                        setShowSystemPayment(false);
                      } catch (error) {
                        console.error('Failed to initialize dashboard:', error);
                        showToast(error.response?.data?.message || 'Failed to submit payment', 'error');
                      } finally {
                        setIsSubmittingSystemPayment(false);
                      }
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl font-bold uppercase tracking-widest text-[10px] shadow-sm transition-all disabled:opacity-50"
                  >
                    {isSubmittingSystemPayment ? 'Submitting...' : 'Submit Payment'}
                  </button>
                </div>

              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  Recent Settlements
                </h4>
                <div className="space-y-3">
                  {systemPayments.length === 0 && (
                    <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-3xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No payment history found</p>
                    </div>
                  )}
                  {systemPayments.map(pay => (
                    <div key={pay.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-900 uppercase tracking-tight">{pay.method} Settlement</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(pay.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-slate-900">{formatMoney(pay.amount)}</p>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${
                          pay.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                          pay.status === 'rejected' ? 'bg-rose-50 text-rose-700 border border-rose-100' : 
                          'bg-amber-50 text-amber-700 border border-amber-100'
                        }`}>
                          {pay.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Availability Panel */}
      {showQuickAvailability && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] z-[100] flex items-center justify-end">
          <div className="h-full w-full max-w-sm bg-white shadow-2xl flex flex-col animate-slide-in-right">
            <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-amber-500 text-white">
              <div>
                <h3 className="text-xl md:text-2xl font-black">Live Availability</h3>
                <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Free for Today</p>
              </div>
              <button onClick={() => setShowQuickAvailability(false)} className="p-2 hover:bg-amber-400 rounded-xl transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              {freeRooms.map((category) => (
                <div key={category.type}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-black text-slate-800 text-sm md:text-lg leading-tight truncate">{category.type}</h4>
                      <span className="text-[9px] md:text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        ({category.capacity})
                      </span>
                      <span className="text-[9px] md:text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                        {formatMoney(category.price)}
                      </span>
                    </div>
                    <span className="text-[9px] md:text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md shrink-0">{category.rooms.length} FREE</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {category.rooms.map(roomObj => {
                      const isAC = roomObj.hasAc === 1;
                      return (
                        <div key={roomObj.roomNumber} className="group/room relative bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-sm font-black text-slate-600 hover:border-blue-300 hover:text-blue-600 cursor-pointer transition-all flex flex-col items-center min-w-[70px]">
                          <span className="mb-0.5">{roomObj.roomNumber}</span>
                          <span className={`text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md ${isAC ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-200 text-slate-500'}`}>
                            {isAC ? 'AC' : 'Non-AC'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-8 bg-slate-50 border-t border-slate-100">
              <button onClick={() => setShowQuickAvailability(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 flex items-center gap-3 md:gap-5 transition-transform hover:-translate-y-1 duration-300">
            <div className={`w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-center ${stat.color}`}>
              <svg className="w-5 h-5 md:w-7 md:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon} />
              </svg>
            </div>
            <div>
              <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-lg md:text-2xl font-black text-slate-800">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
        <div className="p-4 md:p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{viewType === 'timeline' ? 'Room Timeline' : 'Schedule'}</h2>
            <p className="text-[10px] md:text-sm text-slate-400 font-bold uppercase tracking-widest">{monthName} {year}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-8">
            {/* Status Legend - Wrap on small mobile */}
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
              <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-emerald-500"></div><span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-tighter">Confirmed</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-amber-500"></div><span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-tighter">Pending</span></div>
              <div className="flex items-center gap-1.5"><div className="w-2 md:w-3 h-2 md:h-3 rounded-full bg-blue-500"></div><span className="text-[8px] md:text-[10px] font-black text-slate-500 uppercase tracking-tighter">Checked-in</span></div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <button
                onClick={() => navigateMonth(-1)}
                className="flex-1 sm:flex-none h-10 md:h-12 px-4 md:px-5 rounded-xl md:rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button
                onClick={() => navigateMonth(1)}
                className="flex-1 sm:flex-none h-10 md:h-12 px-4 md:px-5 rounded-xl md:rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all"
              >
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>

        {viewType === 'calendar' ? (
          <div className="grid grid-cols-7 border-collapse [--booking-row-height:24px] sm:[--booking-row-height:32px] [--booking-width-offset:8px] sm:[--booking-width-offset:16px]">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
              <div key={d} className="py-4 text-center text-[10px] font-black text-slate-400 tracking-[0.2em] bg-slate-50/30 border-b border-slate-200">{d}</div>
            ))}
            {calendarData.map((cell, idx) => {
              const bookings = getBookingsForDate(cell.date);
              return (
                <div
                  key={idx}
                  onClick={() => {
                    openBookingModal(cell.date);
                  }}
                  className={`h-28 sm:h-40 border-r border-b border-slate-200 p-1.5 sm:p-4 relative group hover:bg-slate-50/40 cursor-pointer ${cell.isOtherMonth ? 'bg-slate-50/20' : 'bg-white'}`}
                >
                  <div className={`text-xs sm:text-sm font-black ${cell.isOtherMonth ? 'text-slate-200' : 'text-slate-400'} ${cell.isToday ? 'text-blue-600' : ''}`}>{cell.day}</div>
                  {cell.isToday && (
                    <div className="absolute inset-0 border-2 border-blue-600 z-10 pointer-events-none rounded-sm">
                      <div className="absolute top-2 right-2"><span className="text-[8px] font-black text-blue-600 tracking-widest uppercase bg-blue-50 px-1.5 py-0.5 rounded-md">Today</span></div>
                    </div>
                  )}
                  <div className="mt-1 sm:mt-2 relative">
                    {bookings.map(b => {
                      const start = new Date(b.checkInDate);
                      const end = new Date(b.checkOutDate);
                      start.setHours(0, 0, 0, 0);
                      end.setHours(0, 0, 0, 0);
                      const current = new Date(cell.date);
                      current.setHours(0, 0, 0, 0);

                      const isStart = start.getTime() === current.getTime();
                      const isMonday = idx % 7 === 0;
                      const isContinuing = current > start && current <= end;

                      if (isStart || (isMonday && isContinuing)) {
                        const rowIndex = bookingRowMap[b.id] || 0;
                        if (rowIndex >= 2) return null;
                        const roomNumber = roomMap[b.roomId] || '';
                        const remainingDays = Math.round((end - current) / 86400000) + 1;
                        return (
                          <div
                            key={b.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/hotel/bookings/${b.id}`);
                            }}
                            className={`absolute left-1 sm:left-2 h-5 sm:h-7 rounded-md sm:rounded-lg px-1.5 sm:px-3 flex items-center text-[8px] sm:text-[9px] font-black z-20 shadow-md cursor-pointer whitespace-nowrap overflow-hidden transition-transform hover:scale-[1.02] ${b.status === 'confirmed' ? 'bg-emerald-500 text-white' : b.status === 'pending' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`}
                            style={{
                              width: `calc(${Math.min(7 - (idx % 7), remainingDays)} * 100% - var(--booking-width-offset, 16px))`,
                              top: `calc(${rowIndex} * var(--booking-row-height, 32px))`
                            }}
                          >
                            <span className="truncate">
                              {b.guestName} {roomNumber && `· Rm ${roomNumber}`}
                              {activePropertyId === 'all' && ` · ${properties.find(p => p.id === b.propertyId)?.name || '...'}`}
                            </span>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                  {(() => {
                    const hiddenCount = bookings.filter(b => {
                      const start = new Date(b.checkInDate);
                      const end = new Date(b.checkOutDate);
                      start.setHours(0, 0, 0, 0);
                      end.setHours(0, 0, 0, 0);
                      const current = new Date(cell.date);
                      current.setHours(0, 0, 0, 0);

                      const isStart = start.getTime() === current.getTime();
                      const isMonday = idx % 7 === 0;
                      const isContinuing = current > start && current <= end;

                      const isSegmentStart = isStart || (isMonday && isContinuing);
                      const rowIndex = bookingRowMap[b.id] || 0;
                      return isSegmentStart && rowIndex >= 2;
                    }).length;
                    
                    if (hiddenCount > 0) {
                      return (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewType('timeline');
                          }}
                          className="absolute bottom-1 sm:bottom-3 left-1 sm:left-4 right-1 sm:right-4 bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 hover:text-slate-800 text-[8px] sm:text-[10px] font-black uppercase sm:tracking-widest py-0.5 sm:py-2 rounded-md sm:rounded-xl text-center transition-all shadow-sm z-30 active:scale-95"
                        >
                          <span className="hidden sm:inline">View More (+{hiddenCount})</span>
                          <span className="inline sm:hidden">+{hiddenCount}</span>
                        </button>
                      );
                    }
                    return null;
                  })()}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <div className="min-w-[800px] md:min-w-full">
              {/* Timeline Dates Header */}
              <div className="flex bg-slate-50/50 border-b border-slate-200">
                <div className="w-24 md:w-32 flex-shrink-0 p-3 border-r border-slate-200 font-black text-[9px] text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-[30]">Rooms</div>
                <div className="flex flex-1">
                  {timelineDays.map(d => {
                    const isToday = today.getDate() === d.day && today.getMonth() === viewDate.getMonth() && today.getFullYear() === viewDate.getFullYear();
                    return (
                      <div key={d.day} className={`flex-1 min-w-[30px] text-center py-3 border-r border-slate-200 font-black text-[9px] last:border-0 ${isToday ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500'}`}>
                        {d.day}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Timeline Body */}
              <div className="max-h-[600px] overflow-y-auto">
                {rooms.map(room => (
                  <div key={room.id} className="flex border-b border-slate-200 hover:bg-slate-50/30 transition-colors group">
                    <div className="w-24 md:w-32 flex-shrink-0 p-3 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 z-[25] transition-colors shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center justify-between">
                        <div className="truncate flex-1">
                          {activePropertyId === 'all' && (
                            <p className="text-[7px] font-black text-blue-500 uppercase tracking-tighter mb-0.5">
                              {properties.find(p => p.id === room.propertyId)?.name}
                            </p>
                          )}
                          <p className="font-black text-slate-700 text-[10px] md:text-[11px] leading-tight">Rm {room.roomNumber}</p>
                        </div>
                        <span className={`text-[6px] font-black uppercase px-1 rounded-sm ml-1 shrink-0 ${room.hasAc === 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          {room.hasAc === 1 ? 'AC' : 'NAC'}
                        </span>
                      </div>
                      <p className="text-[8px] font-black text-slate-400 uppercase truncate mt-0.5">{room.roomType}</p>
                    </div>
                    <div className="flex flex-1 relative h-14">
                      {timelineDays.map(d => {
                        const isToday = today.getDate() === d.day && today.getMonth() === viewDate.getMonth() && today.getFullYear() === viewDate.getFullYear();
                        return (
                          <div key={d.day} className={`flex-1 min-w-[30px] border-r border-slate-200 last:border-0 relative ${isToday ? 'bg-blue-50/20' : ''}`}>
                            {getBookingsForRoomAndDate(room.id, d.date).map(b => (
                              new Date(b.checkInDate).toDateString() === d.date.toDateString() && (
                                <div
                                  key={b.id}
                                  onClick={() => navigate(`/hotel/bookings/${b.id}`)}
                                  className={`absolute left-0.5 h-10 rounded-lg flex items-center text-[8px] font-black text-white z-10 cursor-pointer whitespace-nowrap overflow-hidden transition-all hover:scale-[1.02] border-l-2 border-black/10 ${b.status === 'confirmed' ? 'bg-emerald-600' :
                                    b.status === 'pending' ? 'bg-amber-600' :
                                      'bg-blue-700'
                                    }`}
                                  style={{ width: `calc(${(new Date(b.checkOutDate) - new Date(b.checkInDate)) / 86400000 + 1} * 100% - 4px)` }}
                                >
                                  <span className="px-1 truncate">{b.guestName}</span>
                                </div>
                              )
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
