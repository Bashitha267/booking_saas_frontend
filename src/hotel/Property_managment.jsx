import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';

export default function PropertyManagement() {
  const [rooms, setRooms] = useState([]);
  const [properties, setProperties] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
  const [roomForm, setRoomForm] = useState({
    propertyId: '',
    roomType: '',
    count: 1,
    maxAdults: 2,
    maxChildren: 0,
    basePrice: '',
  });
  const [roomNumbers, setRoomNumbers] = useState(['']);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const [roomsRes, propertiesRes] = await Promise.all([
          api.get('/rooms'),
          api.get('/properties'),
        ]);
        if (isMounted) {
          setRooms(roomsRes.data?.data || []);
          setProperties(propertiesRes.data?.data || []);
        }
      } catch (error) {
        if (isMounted) {
          setRooms([]);
          setProperties([]);
          setLoadError('Failed to load property data.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const roomTypes = useMemo(() => {
    const grouped = new Map();
    rooms.forEach((room) => {
      const key = room.roomType || 'Unspecified';
      const current = grouped.get(key) || {
        id: key,
        name: key,
        maxAdults: 0,
        maxChildren: 0,
        basePrice: Number(room.price || 0),
        rooms: [],
      };
      current.maxAdults = Math.max(current.maxAdults, Number(room.capacityAdults || 0));
      current.maxChildren = Math.max(current.maxChildren, Number(room.capacityChildren || 0));
      current.basePrice = Math.max(current.basePrice, Number(room.price || 0));
      current.rooms.push(room);
      grouped.set(key, current);
    });
    return Array.from(grouped.values());
  }, [rooms]);

  const totalRooms = roomTypes.reduce((acc, rt) => acc + rt.rooms.length, 0);
  const propertyCount = properties.length;

  const handleRoomFormChange = (field) => (event) => {
    const value = event.target.value;
    setRoomForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCountChange = (event) => {
    const nextCount = Math.max(1, Number(event.target.value) || 1);
    setRoomForm((prev) => ({ ...prev, count: nextCount }));
    setRoomNumbers((prev) => {
      const next = [...prev];
      while (next.length < nextCount) next.push('');
      while (next.length > nextCount) next.pop();
      return next;
    });
  };

  const handleRoomNumberChange = (index) => (event) => {
    const value = event.target.value;
    setRoomNumbers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleCreateRooms = async () => {
    setSubmitStatus({ type: '', message: '' });
    const count = Number(roomForm.count) || 0;
    const numbers = roomNumbers.map((value) => value.trim()).filter((value) => value.length > 0);

    if (!roomForm.propertyId || !roomForm.roomType || !roomForm.basePrice) {
      setSubmitStatus({ type: 'error', message: 'Property, room type, and base price are required.' });
      return;
    }

    if (count <= 0 || numbers.length !== count) {
      setSubmitStatus({
        type: 'error',
        message: 'Room count must match the number inputs.',
      });
      return;
    }

    try {
      setSubmitStatus({ type: 'loading', message: 'Creating rooms...' });
      const payloads = numbers.map((roomNumber) => ({
        propertyId: Number(roomForm.propertyId),
        roomNumber,
        roomType: roomForm.roomType,
        capacityAdults: Number(roomForm.maxAdults) || 1,
        capacityChildren: Number(roomForm.maxChildren) || 0,
        price: Number(roomForm.basePrice) || 0,
        status: 'available',
      }));

      for (const payload of payloads) {
        await api.post('/rooms', payload);
      }

      const roomsRes = await api.get('/rooms');
      setRooms(roomsRes.data?.data || []);
      setSubmitStatus({ type: 'success', message: 'Rooms created.' });
      setIsAdding(false);
      setRoomForm({
        propertyId: '',
        roomType: '',
        count: 1,
        maxAdults: 2,
        maxChildren: 0,
        basePrice: '',
      });
      setRoomNumbers(['']);
    } catch (error) {
      setSubmitStatus({ type: 'error', message: 'Failed to create rooms.' });
    }
  };

  return (
    <div className="p-4 md:p-6 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-3xl font-black text-slate-800 tracking-tight">Property Management</h1>
            <p className="text-[10px] md:text-slate-500 font-medium">Manage your rooms and occupancy.</p>
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-slate-900 hover:bg-blue-600 text-white px-6 md:px-8 py-3 md:py-3.5 rounded-2xl font-black text-[10px] md:text-sm transition-all shadow-xl active:scale-95 flex items-center gap-2"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
            </svg>
            Add Room Type
          </button>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-10">
          <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100">
            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Categories</p>
            <p className="text-lg md:text-2xl font-black text-slate-800">{roomTypes.length}</p>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100">
            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Properties</p>
            <p className="text-lg md:text-2xl font-black text-slate-800">{propertyCount}</p>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100">
            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Inventory</p>
            <p className="text-lg md:text-2xl font-black text-slate-800">{totalRooms}</p>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border border-slate-100 col-span-2 md:col-span-1">
            <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
            <div className="text-[10px] md:text-sm font-black text-emerald-600 flex items-center gap-2">
              <span className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {isLoading ? 'Loading' : 'Live'}
            </div>
          </div>
        </div>

        {/* Room Types Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
          {isLoading && (
            <div className="col-span-full text-center text-slate-400 text-xs font-bold">Loading rooms...</div>
          )}
          {!isLoading && loadError && (
            <div className="col-span-full text-center text-rose-500 text-xs font-bold">{loadError}</div>
          )}
          {!isLoading && !loadError && roomTypes.map((type) => (
            <div key={type.id} className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col group transition-all hover:shadow-2xl">
              {/* Card Header */}
              <div className="p-5 md:p-8 pb-0">
                <div className="flex items-center justify-between mb-2 md:mb-4">
                  <div className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[8px] md:text-[10px] font-black uppercase tracking-widest">
                    {type.rooms.length} Units
                  </div>
                  <button className="text-slate-300 hover:text-slate-600 transition-colors">
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                </div>
                <h3 className="text-lg md:text-2xl font-black text-slate-800 mb-1 md:mb-2">{type.name}</h3>
                <p className="text-[10px] md:text-sm font-bold text-slate-400 mb-4 md:mb-6 flex items-center gap-2">
                  From <span className="text-blue-600 font-black">Rs. {type.basePrice}</span>
                </p>

                {/* Capacity */}
                <div className="flex gap-2 md:gap-4 p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-slate-100 mb-5 md:mb-8">
                  <div className="flex-1">
                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase mb-1">Adults</p>
                    <div className="flex items-center gap-1.5 font-black text-slate-700 text-xs md:text-base">
                      <svg className="w-3 h-3 md:w-4 md:h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      {type.maxAdults}
                    </div>
                  </div>
                  <div className="w-px bg-slate-200"></div>
                  <div className="flex-1 text-right">
                    <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase mb-1">Children</p>
                    <div className="flex items-center justify-end gap-1.5 font-black text-slate-700 text-xs md:text-base">
                      {type.maxChildren}
                      <svg className="w-3 h-3 md:w-3.5 md:h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" /></svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Room Numbers List */}
              <div className="flex-1 px-5 md:px-8 pb-5 md:pb-8">
                <p className="text-[8px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 md:mb-4">Room Inventory & Configuration</p>
                <div className="flex flex-col gap-1.5 md:gap-2 max-h-40 md:max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                  {type.rooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-2.5 md:p-3 bg-white border border-slate-100 rounded-lg md:rounded-xl group/row hover:border-blue-100 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center font-black text-[10px] text-slate-400 group-hover/row:bg-blue-50 group-hover/row:text-blue-600 transition-colors">
                          {room.roomNumber}
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-700">Room Unit</p>
                          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            {room.status || 'available'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${room.status === 'maintenance' ? 'bg-amber-50 text-amber-600' : room.status === 'blocked' ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                          {room.status || 'available'}
                        </span>
                      </div>
                    </div>
                  ))}
                  <button className="mt-1 py-3 border-2 border-dashed border-slate-100 rounded-lg md:rounded-xl text-[10px] font-black text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                    Assign New Room
                  </button>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-5 md:p-8 pt-3 md:pt-4 mt-auto bg-slate-50/50 border-t border-slate-100 text-center">
                <button className="w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-all">
                  Edit Settings
                </button>
              </div>
            </div>
          ))}

          {/* Add Placeholder Card */}
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200 p-8 flex flex-col items-center justify-center text-slate-300 hover:text-blue-400 hover:border-blue-200 hover:bg-blue-50 transition-all group min-h-[500px]"
          >
            <div className="w-20 h-20 rounded-full bg-white shadow-lg flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-lg font-black tracking-tight">Add Room Category</p>
            <p className="text-sm font-bold opacity-60">Expand your property inventory</p>
          </button>
        </div>
      </div>

      {/* Add Modal Placeholder */}
      {isAdding && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 shadow-2xl relative">
            <button onClick={() => setIsAdding(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-2">New Room Type</h2>
            <p className="text-[11px] text-slate-400 font-bold mb-8">Configure your new room category settings.</p>
            
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Property</label>
                <select
                  value={roomForm.propertyId}
                  onChange={handleRoomFormChange('propertyId')}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Room Type Name</label>
                <input
                  type="text"
                  placeholder="e.g. Deluxe"
                  value={roomForm.roomType}
                  onChange={handleRoomFormChange('roomType')}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Room Count</label>
                <input
                  type="number"
                  min="1"
                  value={roomForm.count}
                  onChange={handleCountChange}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Room Numbers</label>
                <div className="grid grid-cols-2 gap-3">
                  {roomNumbers.map((value, index) => (
                    <input
                      key={`${index}`}
                      type="text"
                      placeholder={`Room ${index + 1}`}
                      value={value}
                      onChange={handleRoomNumberChange(index)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Max Adults</label>
                  <input
                    type="number"
                    min="1"
                    value={roomForm.maxAdults}
                    onChange={handleRoomFormChange('maxAdults')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Max Children</label>
                  <input
                    type="number"
                    min="0"
                    value={roomForm.maxChildren}
                    onChange={handleRoomFormChange('maxChildren')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Base Price (Rs.)</label>
                <input
                  type="number"
                  placeholder="0.00"
                  value={roomForm.basePrice}
                  onChange={handleRoomFormChange('basePrice')}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <button
                onClick={handleCreateRooms}
                className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-black tracking-tight text-sm shadow-xl shadow-slate-200 mt-4 hover:bg-blue-600 transition-all active:scale-95"
              >
                {submitStatus.type === 'loading' ? 'Creating Rooms...' : 'Create Room Category'}
              </button>
              {submitStatus.message && (
                <p className={`text-[10px] font-black uppercase tracking-widest ${submitStatus.type === 'error' ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {submitStatus.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
