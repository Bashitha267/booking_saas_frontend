import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../auth/useAuth';

const stats = [
  { label: 'Total Bookings', value: '128', color: 'text-blue-600', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { label: 'Revenue', value: '$12,450', color: 'text-emerald-600', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { label: 'Active Guests', value: '45', color: 'text-indigo-600', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { label: 'Pending', value: '12', color: 'text-amber-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
];

const dummyRooms = [
  { id: 1, name: 'Room 101', type: 'Deluxe' },
  { id: 2, name: 'Room 102', type: 'Deluxe' },
  { id: 3, name: 'Room 103', type: 'Suite' },
  { id: 4, name: 'Room 104', type: 'Suite' },
  { id: 5, name: 'Room 201', type: 'Standard' },
  { id: 6, name: 'Room 202', type: 'Standard' },
  { id: 7, name: 'Room 203', type: 'Standard' },
  { id: 8, name: 'Room 301', type: 'Premium' },
  { id: 9, name: 'Room 302', type: 'Premium' },
  { id: 10, name: 'Room 303', type: 'Executive' },
  { id: 11, name: 'Room 401', type: 'Penthouse' },
  { id: 12, name: 'Room 402', type: 'Deluxe' },
];

const dummyBookings = [
  { id: 1, roomId: 12, guestName: 'Mark Stevens', startDate: '2026-04-01', endDate: '2026-04-04', type: 'pending' },
  { id: 2, roomId: 1, guestName: 'Sarah Jenkins', startDate: '2026-04-05', endDate: '2026-04-12', type: 'confirmed' },
  { id: 3, roomId: 3, guestName: 'Dr. Alan Turing', startDate: '2026-04-13', endDate: '2026-04-18', type: 'checked-in' },
  { id: 4, roomId: 5, guestName: 'Emma Watson', startDate: '2026-04-18', endDate: '2026-04-22', type: 'confirmed' },
  { id: 5, roomId: 10, guestName: 'Business Group', startDate: '2026-04-25', endDate: '2026-04-28', type: 'pending' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [viewDate, setViewDate] = useState(new Date());
  const [viewType, setViewType] = useState('calendar'); // 'calendar' or 'timeline'
  const [showQuickAvailability, setShowQuickAvailability] = useState(false);
  const [showAddBooking, setShowAddBooking] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const today = new Date();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Quick lookup data
  const freeRooms = [
    { type: 'Deluxe', capacity: '2A, 1C', price: 150, rooms: ['102', '402', '405'] },
    { type: 'Suite', capacity: '2A, 2C', price: 350, rooms: ['302'] },
    { type: 'Standard', capacity: '1A, 0C', price: 85, rooms: ['201', '203', '504', '505'] },
  ];

  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const year = viewDate.getFullYear();

  const navigateMonth = (direction) => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + direction, 1));
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
    return dummyBookings.filter(b => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      const d = new Date(date);
      d.setHours(0,0,0,0);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      return b.roomId === roomId && d >= start && d <= end;
    });
  };

  const getBookingsForDate = (date) => {
    return dummyBookings.filter(b => {
      const start = new Date(b.startDate);
      const end = new Date(b.endDate);
      const d = new Date(date);
      d.setHours(0,0,0,0);
      start.setHours(0,0,0,0);
      end.setHours(0,0,0,0);
      return d >= start && d <= end;
    });
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-full relative">
      <div className="mb-6 md:mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">Hotel Dashboard</h1>
          <p className="text-xs md:text-slate-500 font-medium">Monitoring {dummyRooms.length} rooms and current occupancy.</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">API: {import.meta.env.VITE_API_URL}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 md:gap-3">
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
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-2xl font-black text-[10px] md:text-sm transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center gap-2">
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
          <div className="bg-white w-full max-w-lg md:max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 md:p-8 bg-blue-600 text-white flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-3xl font-black tracking-tight">New Reservation</h2>
                <p className="text-[10px] md:text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Check-in pre-set for {selectedDate?.toLocaleDateString()}</p>
              </div>
              <button onClick={() => setShowAddBooking(false)} className="p-2 hover:bg-blue-500 rounded-xl transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 md:p-10 space-y-6 md:space-y-8 overflow-y-auto md:overflow-visible max-h-[85vh] md:max-h-none custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Guest Full Name</label>
                  <input type="text" placeholder="e.g. John Doe" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                  <input type="text" placeholder="+1 234..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NIC / Passport Number</label>
                  <input type="text" placeholder="ID Number" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Country</label>
                  <input type="text" placeholder="e.g. Sri Lanka" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Home Address</label>
                  <input type="text" placeholder="Street, City, State..." className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Check-in</label>
                  <input type="date" defaultValue={selectedDate?.toISOString().split('T')[0]} className="w-full bg-slate-100/50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-black text-slate-400 cursor-not-allowed outline-none" disabled />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Check-out</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Adults</label>
                  <input type="number" defaultValue="1" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Children</label>
                  <input type="number" defaultValue="0" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Room Type</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                    <option>Deluxe</option>
                    <option>Suite</option>
                    <option>Standard</option>
                    <option>Executive</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Available Room No.</label>
                  <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none">
                    <option>Room 102</option>
                    <option>Room 405</option>
                    <option>Room 201</option>
                  </select>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={() => setShowAddBooking(false)}
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs md:text-sm shadow-2xl hover:bg-blue-600 active:scale-[0.98] transition-all uppercase tracking-[0.3em]"
                >
                  Confirm & Complete Reservation
                </button>
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
                        ${category.price}
                      </span>
                    </div>
                    <span className="text-[9px] md:text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-md shrink-0">{category.rooms.length} FREE</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {category.rooms.map(num => {
                      const isAC = parseInt(num) % 2 === 0; // Dummy logic for alternating AC status
                      return (
                        <div key={num} className="group/room relative bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-sm font-black text-slate-600 hover:border-blue-300 hover:text-blue-600 cursor-pointer transition-all flex flex-col items-center min-w-[70px]">
                          <span className="mb-0.5">{num}</span>
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
          <div className="grid grid-cols-7 border-collapse">
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
              <div key={d} className="py-4 text-center text-[10px] font-black text-slate-400 tracking-[0.2em] bg-slate-50/30 border-b border-slate-200">{d}</div>
            ))}
            {calendarData.map((cell, idx) => {
              const bookings = getBookingsForDate(cell.date);
              return (
                <div 
                  key={idx} 
                  onClick={() => {
                    setSelectedDate(cell.date);
                    setShowAddBooking(true);
                  }}
                  className={`h-40 border-r border-b border-slate-200 p-4 relative group hover:bg-slate-50/40 cursor-pointer ${cell.isOtherMonth ? 'bg-slate-50/20' : 'bg-white'}`}
                >
                  <div className={`text-sm font-black ${cell.isOtherMonth ? 'text-slate-200' : 'text-slate-400'} ${cell.isToday ? 'text-blue-600' : ''}`}>{cell.day}</div>
                  {cell.isToday && (
                    <div className="absolute inset-0 border-2 border-blue-600 z-10 pointer-events-none rounded-sm">
                      <div className="absolute top-2 right-2"><span className="text-[8px] font-black text-blue-600 tracking-widest uppercase bg-blue-50 px-1.5 py-0.5 rounded-md">Today</span></div>
                    </div>
                  )}
                  <div className="mt-2 space-y-1">
                    {bookings.map(b => {
                      const isStart = new Date(b.startDate).toDateString() === cell.date.toDateString();
                      if (isStart) {
                        return (
                          <div 
                            key={b.id} 
                            onClick={() => navigate(`/hotel/bookings/${b.id}`)} 
                            className={`absolute left-2 h-7 rounded-lg px-3 flex items-center text-[9px] font-black z-20 shadow-md cursor-pointer whitespace-nowrap overflow-hidden ${b.type === 'confirmed' ? 'bg-emerald-500 text-white' : b.type === 'pending' ? 'bg-amber-500 text-white' : 'bg-blue-600 text-white'}`} 
                            style={{ width: `calc(${Math.min(7 - (idx % 7), (new Date(b.endDate) - new Date(b.startDate)) / 86400000 + 1)} * 100% - 16px)` }}
                          >
                            {b.guestName}
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
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
                {dummyRooms.map(room => (
                  <div key={room.id} className="flex border-b border-slate-200 hover:bg-slate-50/30 transition-colors group">
                    <div className="w-24 md:w-32 flex-shrink-0 p-3 border-r border-slate-200 sticky left-0 bg-white group-hover:bg-slate-50 z-[25] transition-colors shadow-[4px_0_10px_-5px_rgba(0,0,0,0.1)]">
                      <div className="flex items-center justify-between">
                        <p className="font-black text-slate-700 text-[10px] md:text-[11px] truncate">{room.name}</p>
                        <span className={`text-[6px] font-black uppercase px-1 rounded-sm ${parseInt(room.name.split(' ')[1]) % 2 === 0 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-400'}`}>
                          {parseInt(room.name.split(' ')[1]) % 2 === 0 ? 'AC' : 'NAC'}
                        </span>
                      </div>
                      <p className="text-[8px] font-black text-slate-400 uppercase truncate">{room.type}</p>
                    </div>
                    <div className="flex flex-1 relative h-14">
                      {timelineDays.map(d => {
                        const isToday = today.getDate() === d.day && today.getMonth() === viewDate.getMonth() && today.getFullYear() === viewDate.getFullYear();
                        return (
                          <div key={d.day} className={`flex-1 min-w-[30px] border-r border-slate-200 last:border-0 relative ${isToday ? 'bg-blue-50/20' : ''}`}>
                            {getBookingsForRoomAndDate(room.id, d.date).map(b => (
                              new Date(b.startDate).toDateString() === d.date.toDateString() && (
                                <div 
                                  key={b.id}
                                  onClick={() => navigate(`/hotel/bookings/${b.id}`)}
                                  className={`absolute left-0.5 h-10 rounded-lg flex items-center text-[8px] font-black text-white z-10 cursor-pointer whitespace-nowrap overflow-hidden transition-all hover:scale-[1.02] border-l-2 border-black/10 ${
                                    b.type === 'confirmed' ? 'bg-emerald-600' : 
                                    b.type === 'pending' ? 'bg-amber-600' : 
                                    'bg-blue-700'
                                  }`}
                                  style={{ width: `calc(${(new Date(b.endDate) - new Date(b.startDate)) / 86400000 + 1} * 100% - 4px)` }}
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
