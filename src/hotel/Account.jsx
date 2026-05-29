import React, { useEffect, useMemo, useState } from 'react';
import api from '../api';
import { useToast } from '../components/Toast';

export default function Account() {
  const [hotelInfo, setHotelInfo] = useState({
    id: null,
    name: '',
    contact: '',
    email: '',
    address: '',
    city: '',
    country: '',
  });

  const [properties, setProperties] = useState([]);
  const [quickExpensesList, setQuickExpensesList] = useState([]);
  const [newQuickExpense, setNewQuickExpense] = useState({ name: '', amount: '' });
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });

  const [staffList, setStaffList] = useState([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [staffStatus, setStaffStatus] = useState({ type: '', message: '' });
  const { showToast, ToastComponent } = useToast();

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

  // Load properties, staff, and bind initial states
  useEffect(() => {
    let isMounted = true;
    const loadProperties = async () => {
      setIsLoadingProperties(true);
      try {
        const res = await api.get('/properties');
        const items = res.data?.data || [];
        if (isMounted) {
          setProperties(items);
          if (items.length > 0) {
            const prop = items[0]; // default to first property
            setHotelInfo({
              id: prop.id,
              name: prop.name || '',
              contact: prop.phone || '',
              email: prop.email || '',
              address: prop.address || '',
              city: prop.city || '',
              country: prop.country || '',
            });
            try {
              setQuickExpensesList(JSON.parse(prop.quickExpenses || '[]'));
            } catch (err) {
              setQuickExpensesList([]);
            }
          }
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

    const loadStaff = async () => {
      try {
        const res = await api.get('/staff');
        if (isMounted) {
          const list = res.data?.data || [];
          setStaffList(
            list.map((s) => ({
              id: s.id,
              name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.username,
              contact: s.contact || '',
              username: s.username,
              role: s.role === 'staff' ? 'Staff' : s.role,
              disabled: s.status === 'blocked',
            }))
          );
        }
      } catch (err) {
        console.error('Failed to load staff list:', err);
      }
    };

    loadProperties();
    loadStaff();
    return () => {
      isMounted = false;
    };
  }, [newStaff.propertyId]);

  const propertyOptions = useMemo(() => properties.map((p) => ({ id: p.id, name: p.name })), [properties]);

  // Handle Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!hotelInfo.id) {
      showToast('No property active to save settings.', 'error');
      return;
    }
    try {
      await api.put(`/properties/${hotelInfo.id}`, {
        name: hotelInfo.name,
        address: hotelInfo.address,
        city: hotelInfo.city,
        country: hotelInfo.country,
        phone: hotelInfo.contact,
        email: hotelInfo.email,
        quickExpenses: JSON.stringify(quickExpensesList),
      });
      showToast('Profile and quick expenses saved successfully!', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save settings.', 'error');
    }
  };

  const updateQuickExpensesDb = async (newList) => {
    if (!hotelInfo.id) return;
    try {
      await api.put(`/properties/${hotelInfo.id}`, {
        name: hotelInfo.name,
        address: hotelInfo.address,
        city: hotelInfo.city,
        country: hotelInfo.country,
        phone: hotelInfo.contact,
        email: hotelInfo.email,
        quickExpenses: JSON.stringify(newList),
      });
      showToast('Quick expenses updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to sync quick expenses', 'error');
    }
  };

  // Add Quick Expense Shortcut
  const handleAddQuickExpense = async (e) => {
    e.preventDefault();
    if (!newQuickExpense.name || !newQuickExpense.amount) return;
    const amountVal = parseFloat(newQuickExpense.amount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    // Check if name already exists
    if (quickExpensesList.some((qe) => qe.name.toLowerCase() === newQuickExpense.name.toLowerCase())) {
      showToast(`Charge "${newQuickExpense.name}" already exists.`, 'error');
      return;
    }

    const newList = [
      ...quickExpensesList,
      {
        id: Date.now().toString(),
        name: newQuickExpense.name.trim(),
        amount: amountVal,
      },
    ];
    
    setQuickExpensesList(newList);
    setNewQuickExpense({ name: '', amount: '' });
    await updateQuickExpensesDb(newList);
  };

  // Remove Quick Expense Shortcut
  const handleRemoveQuickExpense = async (id) => {
    const newList = quickExpensesList.filter((qe) => String(qe.id) !== String(id));
    setQuickExpensesList(newList);
    await updateQuickExpensesDb(newList);
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();

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

      await api.post('/staff/register', payload);
      showToast('Staff member created successfully!', 'success');
      
      // Auto switch back and refresh
      setShowAddStaff(false);
      const res = await api.get('/staff');
      const list = res.data?.data || [];
      setStaffList(
        list.map((s) => ({
          id: s.id,
          name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.username,
          contact: s.contact || '',
          username: s.username,
          role: s.role === 'staff' ? 'Staff' : s.role,
          disabled: s.status === 'blocked',
        }))
      );

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
    } catch (error) {
      showToast(error?.response?.data?.message || 'Failed to create staff member.', 'error');
    }
  };

  const handleEditStaff = (e) => {
    e.preventDefault();
    setStaffList(staffList.map(s => s.id === editingStaff.id ? editingStaff : s));
    setShowEditStaff(false);
    setEditingStaff(null);
  };

  return (
    <div className="p-4 md:p-8 bg-slate-50 min-h-full max-w-6xl mx-auto space-y-8">
      <ToastComponent />
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tight">Account & Settings</h1>
        <p className="text-[10px] md:text-xs font-black text-slate-400 mt-2 uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
          Configure hotel profile, quick charge buttons, and staff access
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Section: Roster and Settings Forms (span 2) */}
        <div className="lg:col-span-2 space-y-8">
          {/* General Profile Settings Form */}
          <form onSubmit={handleSaveProfile} className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                Hotel Settings
              </h2>
              {saveStatus.message && (
                <span className={`text-[10px] font-black uppercase tracking-wider ${saveStatus.type === 'success' ? 'text-emerald-600' : saveStatus.type === 'loading' ? 'text-blue-500 animate-pulse' : 'text-rose-500'}`}>
                  {saveStatus.message}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hotel Name</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  value={hotelInfo.name}
                  onChange={e => setHotelInfo({...hotelInfo, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  value={hotelInfo.contact}
                  onChange={e => setHotelInfo({...hotelInfo, contact: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Email</label>
                <input 
                  type="email" 
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  value={hotelInfo.email}
                  onChange={e => setHotelInfo({...hotelInfo, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location Address</label>
                <input 
                  type="text" 
                  required
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                  value={hotelInfo.address}
                  onChange={e => setHotelInfo({...hotelInfo, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4 md:col-span-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">City</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    value={hotelInfo.city}
                    onChange={e => setHotelInfo({...hotelInfo, city: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Country</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    value={hotelInfo.country}
                    onChange={e => setHotelInfo({...hotelInfo, country: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50">
              <button 
                type="submit" 
                className="bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-lg active:scale-95"
              >
                Save Settings & Charges
              </button>
            </div>
          </form>

          {/* Staff Management Card */}
          <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-50 pb-4">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                <div className="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                Staff Access
              </h2>
              <button 
                onClick={() => {
                  setStaffStatus({ type: '', message: '' });
                  setShowAddStaff(true);
                }}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all shadow active:scale-95"
              >
                + Register Staff
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Name</th>
                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Username</th>
                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="pb-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {staffList.map(staff => (
                    <tr key={staff.id} className="group">
                      <td className="py-4">
                        <p className="text-xs font-black text-slate-800">{staff.name}</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{staff.role}</p>
                      </td>
                      <td className="py-4">
                        <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded-lg text-slate-500">@{staff.username}</span>
                      </td>
                      <td className="py-4">
                        <p className="text-xs font-bold text-slate-500">{staff.contact}</p>
                      </td>
                      <td className="py-4 text-center">
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
                          {!staff.disabled ? 'Active' : 'Blocked'}
                        </button>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingStaff(staff);
                              setShowEditStaff(true);
                            }}
                            className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all active:scale-90"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button 
                            onClick={() => setStaffList(staffList.filter(s => s.id !== staff.id))}
                            className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all active:scale-90"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!staffList.length && (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                        No Staff Registered
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Section: Quick Expenses Setup (span 1) */}
        <div className="lg:col-span-1 space-y-8">
          {/* Quick Expense Buttons Setup */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-6">
            <div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                <div className="w-1.5 h-6 bg-violet-600 rounded-full"></div>
                Quick Charges
              </h2>
              <p className="text-slate-400 text-xs mt-1">Configure shortcut buttons for billing guest details page.</p>
            </div>

            {/* List of shortcuts */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {quickExpensesList.map((qe) => (
                <div key={qe.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{qe.name}</p>
                    <p className="text-[10px] font-bold text-violet-600">Rs. {qe.amount.toFixed(2)}</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => handleRemoveQuickExpense(qe.id)}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
              {quickExpensesList.length === 0 && (
                <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400 font-medium">No quick charges setup.</p>
                </div>
              )}
            </div>

            {/* Add charge form */}
            <div className="pt-4 border-t border-slate-50 space-y-3">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Custom Charge Button</p>
              
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Charge Name (e.g. Laundry)"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                  value={newQuickExpense.name}
                  onChange={(e) => setNewQuickExpense({ ...newQuickExpense, name: e.target.value })}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="Price (LKR)"
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                  value={newQuickExpense.amount}
                  onChange={(e) => setNewQuickExpense({ ...newQuickExpense, amount: e.target.value })}
                />
              </div>

              <button
                type="button"
                onClick={handleAddQuickExpense}
                disabled={!newQuickExpense.name || !newQuickExpense.amount}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + Add Quick Charge
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddStaff && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Onboard New Staff</h3>
              <button onClick={() => setShowAddStaff(false)} className="p-2 bg-slate-100 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleAddStaff} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Name</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                    value={newStaff.firstName}
                    onChange={e => setNewStaff({ ...newStaff, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Last Name</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                    value={newStaff.lastName}
                    onChange={e => setNewStaff({ ...newStaff, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                  value={newStaff.contact}
                  onChange={e => setNewStaff({ ...newStaff, contact: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp Number</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                  value={newStaff.whatsapp}
                  onChange={e => setNewStaff({ ...newStaff, whatsapp: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Address</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                  value={newStaff.address}
                  onChange={e => setNewStaff({ ...newStaff, address: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">NIC (optional)</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                    value={newStaff.nicNumber}
                    onChange={e => setNewStaff({ ...newStaff, nicNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Property</label>
                  <select
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
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
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                    value={newStaff.username}
                    onChange={e => setNewStaff({ ...newStaff, username: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
                  <input 
                    required
                    type="password" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
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

              <button type="submit" className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest mt-4 shadow hover:bg-emerald-600 transition-all">
                Create Staff Account
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {showEditStaff && editingStaff && (
        <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-lg font-black text-slate-800 tracking-tight">Edit Staff Member</h3>
              <button onClick={() => setShowEditStaff(false)} className="p-2 bg-slate-100 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <form onSubmit={handleEditStaff} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                  value={editingStaff.name}
                  onChange={e => setEditingStaff({...editingStaff, name: e.target.value})}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                <input 
                  required
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                  value={editingStaff.contact}
                  onChange={e => setEditingStaff({...editingStaff, contact: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Username</label>
                  <input 
                    required
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none opacity-50"
                    value={editingStaff.username}
                    readOnly
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Password</label>
                  <input 
                    type="password" 
                    placeholder="Leave blank to keep same"
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-bold outline-none"
                    value={editingStaff.password || ''}
                    onChange={e => setEditingStaff({...editingStaff, password: e.target.value})}
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-black text-[9px] uppercase tracking-widest mt-4 shadow hover:bg-blue-600 transition-all">
                Update Staff Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
