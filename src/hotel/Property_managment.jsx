import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';

export default function PropertyManagement() {
  const [rooms, setRooms] = useState([]);
  const [properties, setProperties] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });
  const [propertySubmitStatus, setPropertySubmitStatus] = useState({ type: '', message: '' });
  const [roomForm, setRoomForm] = useState({
    propertyId: '',
    roomType: '',
    count: 1,
    maxAdults: 2,
    maxChildren: 0,
    basePrice: '',
  });
  const [propertyForm, setPropertyForm] = useState({
    name: '',
    address: '',
    city: '',
    country: '',
    phone: '',
    email: '',
  });
  const [roomNumbers, setRoomNumbers] = useState(['']);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);
  const [assignRoomForm, setAssignRoomForm] = useState({
    propertyId: '',
    roomType: '',
    roomNumber: '',
    floor: '',
    capacityAdults: 1,
    capacityChildren: 0,
    price: '',
    status: 'available',
  });
  const [assignStatus, setAssignStatus] = useState({ type: '', message: '' });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editTypeForm, setEditTypeForm] = useState({
    roomType: '',
    capacityAdults: 1,
    capacityChildren: 0,
    price: '',
    status: '',
    propertyId: '',
  });
  const [editStatus, setEditStatus] = useState({ type: '', message: '' });

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
  const editPropertyOptions = useMemo(() => {
    if (!editTarget) return [];
    const ids = new Set(editTarget.rooms.map((room) => String(room.propertyId)));
    return properties.filter((property) => ids.has(String(property.id)));
  }, [editTarget, properties]);

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

  const handlePropertyFormChange = (field) => (event) => {
    const value = event.target.value;
    setPropertyForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateProperty = async () => {
    setPropertySubmitStatus({ type: '', message: '' });

    if (!propertyForm.name.trim() || !propertyForm.address.trim()) {
      setPropertySubmitStatus({ type: 'error', message: 'Name and address are required.' });
      return;
    }

    try {
      setPropertySubmitStatus({ type: 'loading', message: 'Creating property...' });
      const payload = {
        name: propertyForm.name.trim(),
        address: propertyForm.address.trim(),
        city: propertyForm.city.trim(),
        country: propertyForm.country.trim(),
        phone: propertyForm.phone.trim(),
        email: propertyForm.email.trim(),
      };

      const res = await api.post('/properties', payload);
      const propertiesRes = await api.get('/properties');
      const nextProperties = propertiesRes.data?.data || [];
      setProperties(nextProperties);

      if (res.data?.id) {
        setRoomForm((prev) => ({ ...prev, propertyId: String(res.data.id) }));
      }

      setPropertyForm({ name: '', address: '', city: '', country: '', phone: '', email: '' });
      setIsPropertyModalOpen(false);
      setPropertySubmitStatus({ type: 'success', message: 'Property created.' });
    } catch (error) {
      setPropertySubmitStatus({ type: 'error', message: 'Failed to create property.' });
    }
  };

  const openPropertyModal = () => {
    setPropertySubmitStatus({ type: '', message: '' });
    setIsPropertyModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAdding(false);
    setIsPropertyModalOpen(false);
    setPropertySubmitStatus({ type: '', message: '' });
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

  const refreshRooms = async () => {
    const roomsRes = await api.get('/rooms');
    setRooms(roomsRes.data?.data || []);
  };

  const openAssignModal = (type) => {
    const firstRoom = type.rooms[0];
    const propertyId = firstRoom?.propertyId ? String(firstRoom.propertyId) : '';
    setAssignTarget(type);
    setAssignRoomForm({
      propertyId,
      roomType: type.name,
      roomNumber: '',
      floor: firstRoom?.floor || '',
      capacityAdults: type.maxAdults || 1,
      capacityChildren: type.maxChildren || 0,
      price: type.basePrice || '',
      status: 'available',
    });
    setAssignStatus({ type: '', message: '' });
    setIsAssignModalOpen(true);
  };

  const openEditModal = (type) => {
    setEditTarget(type);
    setEditTypeForm({
      roomType: type.name,
      capacityAdults: type.maxAdults || 1,
      capacityChildren: type.maxChildren || 0,
      price: type.basePrice || '',
      status: '',
      propertyId: '',
    });
    setEditStatus({ type: '', message: '' });
    setIsEditModalOpen(true);
  };

  const handleAssignRoomChange = (field) => (event) => {
    const value = event.target.value;
    setAssignRoomForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditTypeChange = (field) => (event) => {
    const value = event.target.value;
    setEditTypeForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAssignRoom = async () => {
    setAssignStatus({ type: '', message: '' });
    if (!assignRoomForm.propertyId || !assignRoomForm.roomType || !assignRoomForm.roomNumber) {
      setAssignStatus({ type: 'error', message: 'Property, room type, and room number are required.' });
      return;
    }

    try {
      setAssignStatus({ type: 'loading', message: 'Assigning room...' });
      const payload = {
        propertyId: Number(assignRoomForm.propertyId),
        roomNumber: assignRoomForm.roomNumber.trim(),
        roomType: assignRoomForm.roomType.trim(),
        floor: assignRoomForm.floor ? Number(assignRoomForm.floor) : null,
        capacityAdults: Number(assignRoomForm.capacityAdults) || 1,
        capacityChildren: Number(assignRoomForm.capacityChildren) || 0,
        price: Number(assignRoomForm.price) || 0,
        status: assignRoomForm.status || 'available',
      };

      await api.post('/rooms', payload);
      await refreshRooms();
      setAssignStatus({ type: 'success', message: 'Room assigned.' });
      setIsAssignModalOpen(false);
      setAssignTarget(null);
    } catch (error) {
      setAssignStatus({ type: 'error', message: 'Failed to assign room.' });
    }
  };

  const handleUpdateRoomType = async () => {
    if (!editTarget) return;
    setEditStatus({ type: '', message: '' });

    if (!editTypeForm.roomType.trim()) {
      setEditStatus({ type: 'error', message: 'Room type name is required.' });
      return;
    }

    const roomsToUpdate = editTarget.rooms.filter((room) => (
      !editTypeForm.propertyId || String(room.propertyId) === String(editTypeForm.propertyId)
    ));

    if (!roomsToUpdate.length) {
      setEditStatus({ type: 'error', message: 'No rooms found for the selected property.' });
      return;
    }

    try {
      setEditStatus({ type: 'loading', message: 'Updating rooms...' });
      const payload = {
        roomType: editTypeForm.roomType.trim(),
        capacityAdults: Number(editTypeForm.capacityAdults) || 1,
        capacityChildren: Number(editTypeForm.capacityChildren) || 0,
        price: Number(editTypeForm.price) || 0,
      };
      if (editTypeForm.status) {
        payload.status = editTypeForm.status;
      }

      await Promise.all(
        roomsToUpdate.map((room) => api.put(`/rooms/${room.id}`, payload))
      );

      await refreshRooms();
      setEditStatus({ type: 'success', message: 'Room settings updated.' });
      setIsEditModalOpen(false);
      setEditTarget(null);
    } catch (error) {
      setEditStatus({ type: 'error', message: 'Failed to update room settings.' });
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
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={openPropertyModal}
              className="bg-white text-slate-700 border border-slate-200 hover:border-blue-200 hover:text-blue-700 px-5 md:px-6 py-2.5 md:py-3 rounded-2xl font-black text-[10px] md:text-sm transition-all shadow-sm active:scale-95"
            >
              + Add Property
            </button>
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
                  <button
                    onClick={() => openAssignModal(type)}
                    className="mt-1 py-3 border-2 border-dashed border-slate-100 rounded-lg md:rounded-xl text-[10px] font-black text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                  >
                    Assign New Room
                  </button>
                </div>
              </div>

              {/* Card Footer */}
              <div className="p-5 md:p-8 pt-3 md:pt-4 mt-auto bg-slate-50/50 border-t border-slate-100 text-center">
                <button
                  onClick={() => openEditModal(type)}
                  className="w-full py-3 md:py-4 rounded-xl md:rounded-2xl font-black text-[10px] uppercase tracking-widest text-slate-600 hover:text-blue-600 transition-all"
                >
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
            <button onClick={handleCloseModal} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 transition-colors">
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
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-[9px] font-bold text-slate-400">Can't find your property?</p>
                  <button
                    type="button"
                    onClick={openPropertyModal}
                    className="text-[9px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-700"
                  >
                    Add new property
                  </button>
                </div>
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

      {isPropertyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 shadow-2xl relative">
            <button onClick={handleCloseModal} className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 transition-colors">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-2">New Property</h2>
            <p className="text-[11px] text-slate-400 font-bold mb-8">Register a new property for your portfolio.</p>

            <div className="space-y-5">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Property Name</label>
                <input
                  type="text"
                  placeholder="e.g. Villa Test"
                  value={propertyForm.name}
                  onChange={handlePropertyFormChange('name')}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Address</label>
                <input
                  type="text"
                  placeholder="Street, City"
                  value={propertyForm.address}
                  onChange={handlePropertyFormChange('address')}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">City</label>
                  <input
                    type="text"
                    placeholder="City"
                    value={propertyForm.city}
                    onChange={handlePropertyFormChange('city')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Country</label>
                  <input
                    type="text"
                    placeholder="Country"
                    value={propertyForm.country}
                    onChange={handlePropertyFormChange('country')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Phone</label>
                  <input
                    type="text"
                    placeholder="+94"
                    value={propertyForm.phone}
                    onChange={handlePropertyFormChange('phone')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Email</label>
                  <input
                    type="email"
                    placeholder="name@email.com"
                    value={propertyForm.email}
                    onChange={handlePropertyFormChange('email')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateProperty}
                className="w-full bg-blue-600 text-white py-4 rounded-[1.5rem] font-black tracking-tight text-sm shadow-xl shadow-slate-200 hover:bg-blue-700 transition-all active:scale-95"
              >
                {propertySubmitStatus.type === 'loading' ? 'Creating Property...' : 'Create Property'}
              </button>
              {propertySubmitStatus.message && (
                <p className={`text-[10px] font-black uppercase tracking-widest ${propertySubmitStatus.type === 'error' ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {propertySubmitStatus.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 shadow-2xl relative">
            <button
              onClick={() => setIsAssignModalOpen(false)}
              className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-2">Assign New Room</h2>
            <p className="text-[11px] text-slate-400 font-bold mb-8">Add a room to {assignTarget?.name || 'this category'}.</p>

            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Property</label>
                <select
                  value={assignRoomForm.propertyId}
                  onChange={handleAssignRoomChange('propertyId')}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Room Type</label>
                <input
                  type="text"
                  value={assignRoomForm.roomType}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none"
                  readOnly
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Room Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 101"
                    value={assignRoomForm.roomNumber}
                    onChange={handleAssignRoomChange('roomNumber')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Floor (optional)</label>
                  <input
                    type="number"
                    value={assignRoomForm.floor}
                    onChange={handleAssignRoomChange('floor')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Max Adults</label>
                  <input
                    type="number"
                    min="1"
                    value={assignRoomForm.capacityAdults}
                    onChange={handleAssignRoomChange('capacityAdults')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Max Children</label>
                  <input
                    type="number"
                    min="0"
                    value={assignRoomForm.capacityChildren}
                    onChange={handleAssignRoomChange('capacityChildren')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Base Price (Rs.)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={assignRoomForm.price}
                    onChange={handleAssignRoomChange('price')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Status</label>
                  <select
                    value={assignRoomForm.status}
                    onChange={handleAssignRoomChange('status')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="available">Available</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleAssignRoom}
                className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-black tracking-tight text-sm shadow-xl shadow-slate-200 mt-2 hover:bg-blue-600 transition-all active:scale-95"
              >
                {assignStatus.type === 'loading' ? 'Assigning Room...' : 'Assign Room'}
              </button>
              {assignStatus.message && (
                <p className={`text-[10px] font-black uppercase tracking-widest ${assignStatus.type === 'error' ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {assignStatus.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-6">
          <div className="bg-white rounded-[2.5rem] w-full max-w-xl p-8 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-8 right-8 text-slate-300 hover:text-slate-600 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 className="text-xl md:text-2xl font-black text-slate-800 mb-2">Edit Room Type</h2>
            <p className="text-[11px] text-slate-400 font-bold mb-8">Update settings for {editTarget?.name || 'this category'}.</p>

            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Apply To</label>
                <select
                  value={editTypeForm.propertyId}
                  onChange={handleEditTypeChange('propertyId')}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="">All properties</option>
                  {editPropertyOptions.map((property) => (
                    <option key={property.id} value={property.id}>{property.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Room Type Name</label>
                <input
                  type="text"
                  value={editTypeForm.roomType}
                  onChange={handleEditTypeChange('roomType')}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Max Adults</label>
                  <input
                    type="number"
                    min="1"
                    value={editTypeForm.capacityAdults}
                    onChange={handleEditTypeChange('capacityAdults')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Max Children</label>
                  <input
                    type="number"
                    min="0"
                    value={editTypeForm.capacityChildren}
                    onChange={handleEditTypeChange('capacityChildren')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Base Price (Rs.)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={editTypeForm.price}
                    onChange={handleEditTypeChange('price')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Status</label>
                  <select
                    value={editTypeForm.status}
                    onChange={handleEditTypeChange('status')}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3 text-[11px] font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  >
                    <option value="">Keep current</option>
                    <option value="available">Available</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>
              </div>
              <button
                onClick={handleUpdateRoomType}
                className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-black tracking-tight text-sm shadow-xl shadow-slate-200 mt-2 hover:bg-blue-600 transition-all active:scale-95"
              >
                {editStatus.type === 'loading' ? 'Updating Rooms...' : 'Update Settings'}
              </button>
              {editStatus.message && (
                <p className={`text-[10px] font-black uppercase tracking-widest ${editStatus.type === 'error' ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {editStatus.message}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
