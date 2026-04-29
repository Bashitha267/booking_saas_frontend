import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';

export default function Account() {
  const [hotelInfo, setHotelInfo] = useState({
    name: 'Villax Premium Resort',
    contact: '+94 77 123 4567',
    email: 'admin@villax.com',
    address: '123 Beach Road, Galle, Sri Lanka'
  });

  const [staffList, setStaffList] = useState([]);
  const [properties, setProperties] = useState([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [staffStatus, setStaffStatus] = useState({ type: '', message: '' });

  const [showAddStaff, setShowAddStaff] = useState(false);
  const [showEditStaff, setShowEditStaff] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [newStaff, setNewStaff] = useState({
    firstName: '',
    lastName: '',
    nicNumber: '',
    contact: '',
    whatsapp: '',
    address: '',
    username: '',
    password: '',
    propertyId: '',
  });

  useEffect(() => {
    let isMounted = true;
    const loadProperties = async () => {
      setIsLoadingProperties(true);
      try {
        const res = await api.get('/properties');
        if (isMounted) {
          const items = res.data?.data || [];
          setProperties(items);
          if (!newStaff.propertyId && items.length) {
            setNewStaff((prev) => ({ ...prev, propertyId: String(items[0].id) }));
          }
        }
      } catch (error) {
        if (isMounted) setProperties([]);
      } finally {
        if (isMounted) setIsLoadingProperties(false);
      }
    };

    loadProperties();
    return () => {
      isMounted = false;
    };
  }, [newStaff.propertyId]);

  const propertyOptions = useMemo(() => properties.map((p) => ({ id: p.id, name: p.name })), [properties]);

  const handleAddStaff = async (e) => {
    e.preventDefault();
    setStaffStatus({ type: '', message: '' });

    try {
      const payload = {
        firstName: newStaff.firstName.trim(),
        lastName: newStaff.lastName.trim(),
        nicNumber: newStaff.nicNumber.trim() || null,
        contact: newStaff.contact.trim(),
        whatsapp: newStaff.whatsapp.trim(),
        address: newStaff.address.trim(),
        username: newStaff.username.trim(),
        password: newStaff.password,
        propertyId: Number(newStaff.propertyId),
      };

      const res = await api.post('/staff/register', payload);
      const created = res.data?.staff;
      const fullName = `${payload.firstName} ${payload.lastName}`.trim();

      if (created) {
        setStaffList((prev) => ([
          ...prev,
          {
            id: created.id,
            name: fullName || created.username,
            contact: payload.contact,
            username: created.username,
            role: 'Staff',
            disabled: false,
          },
        ]));
      }

      setNewStaff({
        firstName: '',
        lastName: '',
        nicNumber: '',
        contact: '',
        whatsapp: '',
        address: '',
        username: '',
        password: '',
        propertyId: newStaff.propertyId || '',
      });
      setStaffStatus({ type: 'success', message: 'Staff account created.' });
      setShowAddStaff(false);
    } catch (error) {
      const message = error?.response?.data?.message || 'Failed to create staff.';
      setStaffStatus({ type: 'error', message });
    }
  };

  const handleEditStaff = (e) => {
    e.preventDefault();
    setStaffList(staffList.map(s => s.id === editingStaff.id ? editingStaff : s));
    setShowEditStaff(false);
    setEditingStaff(null);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight">Account & Security</h1>
        <p className="text-[10px] md:text-xs font-black text-slate-400 mt-2 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Manage Hotel Profile and Staff Access
        </p>
      </div>

      <div className="space-y-8">
        {/* General Settings */}
        <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
            General Profile
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hotel Name</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                value={hotelInfo.name}
                onChange={e => setHotelInfo({...hotelInfo, name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                value={hotelInfo.contact}
                onChange={e => setHotelInfo({...hotelInfo, contact: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Email</label>
              <input 
                type="email" 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                value={hotelInfo.email}
                onChange={e => setHotelInfo({...hotelInfo, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location Address</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                value={hotelInfo.address}
                onChange={e => setHotelInfo({...hotelInfo, address: e.target.value})}
              />
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-50">
            <button className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl active:scale-95">
              Save Profile Changes
            </button>
          </div>
        </div>

        {/* Staff Management */}
        <div className="bg-white p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
              Staff Management
            </h2>
            <button 
              onClick={() => {
                setStaffStatus({ type: '', message: '' });
                setShowAddStaff(true);
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
            >
              + New Staff Member
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                  <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Username</th>
                  <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                  <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Access</th>
                  <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {staffList.map(staff => (
                  <tr key={staff.id} className="group">
                    <td className="py-5">
                      <p className="text-xs font-black text-slate-800">{staff.name}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{staff.role}</p>
                    </td>
                    <td className="py-5">
                      <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-lg text-slate-500 tracking-tight">@{staff.username}</span>
                    </td>
                    <td className="py-5">
                      <p className="text-xs font-bold text-slate-500">{staff.contact}</p>
                    </td>
                    <td className="py-5 text-center">
                      <button 
                        onClick={() => {
                          setStaffList(staffList.map(s => s.id === staff.id ? {...s, disabled: !s.disabled} : s));
                        }}
                        className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-all ${
                          !staff.disabled 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                            : 'bg-rose-50 text-rose-600 border-rose-100'
                        }`}
                      >
                        {!staff.disabled ? 'Enabled' : 'Disabled'}
                      </button>
                    </td>
                    <td className="py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingStaff(staff);
                            setShowEditStaff(true);
                          }}
                          title="Edit Staff"
                          className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-lg shadow-blue-200 active:scale-90"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button 
                          onClick={() => setStaffList(staffList.filter(s => s.id !== staff.id))}
                          title="Remove Staff"
                          className="p-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-all shadow-lg shadow-rose-200 active:scale-90"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!staffList.length && (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                      No staff added yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Onboard New Staff</h3>
              <button onClick={() => setShowAddStaff(false)} className="p-2 bg-slate-100 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                    value={newStaff.firstName}
                    onChange={e => setNewStaff({ ...newStaff, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                    value={newStaff.lastName}
                    onChange={e => setNewStaff({ ...newStaff, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                  value={newStaff.contact}
                  onChange={e => setNewStaff({ ...newStaff, contact: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp Number</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                  value={newStaff.whatsapp}
                  onChange={e => setNewStaff({ ...newStaff, whatsapp: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                  value={newStaff.address}
                  onChange={e => setNewStaff({ ...newStaff, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NIC (optional)</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                    value={newStaff.nicNumber}
                    onChange={e => setNewStaff({ ...newStaff, nicNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Property</label>
                  <select
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                    value={newStaff.propertyId}
                    onChange={e => setNewStaff({ ...newStaff, propertyId: e.target.value })}
                  >
                    {!propertyOptions.length && (
                      <option value="">No properties found</option>
                    )}
                    {propertyOptions.map((property) => (
                      <option key={property.id} value={property.id}>{property.name}</option>
                    ))}
                  </select>
                  {isLoadingProperties && (
                    <p className="text-[9px] font-bold text-slate-400">Loading properties...</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                    value={newStaff.username}
                    onChange={e => setNewStaff({ ...newStaff, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <input 
                    required
                    type="password" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                    value={newStaff.password}
                    onChange={e => setNewStaff({ ...newStaff, password: e.target.value })}
                  />
                </div>
              </div>

              {staffStatus.message && (
                <p className={`text-[9px] font-black uppercase tracking-widest ${staffStatus.type === 'error' ? 'text-rose-500' : 'text-emerald-600'}`}>
                  {staffStatus.message}
                </p>
              )}

              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] mt-6 shadow-xl hover:bg-emerald-600 transition-all">
                Create Staff Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditStaff && editingStaff && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-[2.5rem] md:rounded-[3rem] p-8 md:p-12 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-10">
              <h3 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">Edit Staff Member</h3>
              <button onClick={() => setShowEditStaff(false)} className="p-2 bg-slate-100 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleEditStaff} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                  value={editingStaff.name}
                  onChange={e => setEditingStaff({...editingStaff, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                  value={editingStaff.contact}
                  onChange={e => setEditingStaff({...editingStaff, contact: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none opacity-50"
                    value={editingStaff.username}
                    readOnly
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                  <input 
                    type="password" 
                    placeholder="Leave blank to keep same"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold outline-none"
                    value={editingStaff.password || ''}
                    onChange={e => setEditingStaff({...editingStaff, password: e.target.value})}
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] mt-6 shadow-xl hover:bg-blue-600 transition-all">
                Update Staff Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
