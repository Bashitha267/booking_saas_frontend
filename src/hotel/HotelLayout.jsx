import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import useAuth from '../auth/useAuth';

const navItems = [
  { name: 'Dashboard', path: '/hotel', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'Bookings', path: '/hotel/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { name: 'Payments', path: '/hotel/payments', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { name: 'Overview', path: '/hotel/finance', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { name: 'Property', path: '/hotel/property', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
  { name: 'Account', path: '/hotel/account', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
];

export default function HotelLayout() {
  const [isOpen, setIsOpen] = useState(true);
  const [showMoreMobile, setShowMoreMobile] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Sidebar - Visible on Desktop */}
      <div 
        className={`${
          isOpen ? 'w-64' : 'w-20'
        } hidden md:flex flex-col bg-blue-800 text-white transition-all duration-300 ease-in-out border-r border-blue-900 shadow-2xl z-30`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-blue-700 flex-shrink-0">
          <span className={`font-bold text-xl tracking-tight truncate ${!isOpen && 'hidden'}`}>Villax Hotel</span>
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg bg-blue-700 hover:bg-blue-600 transition-colors focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/hotel'}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium transition-all group ${
                  isActive 
                    ? 'bg-blue-900 text-white border-l-4 border-blue-400' 
                    : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'
                }`
              }
            >
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              {isOpen && <span className="ml-4 truncate">{item.name}</span>}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-blue-700 flex-shrink-0">
          <div className={`flex items-center justify-between ${!isOpen && 'flex-col gap-4'}`}>
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-lg shadow-lg border border-blue-500">H</div>
              {isOpen && (
                <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-black truncate">Hotel Admin</p>
                  <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest truncate">Premium</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={handleLogout}
              className={`p-2.5 rounded-xl transition-all ${
                isOpen 
                  ? 'hover:bg-rose-500/20 text-blue-200 hover:text-rose-400' 
                  : 'bg-blue-700 hover:bg-rose-500 text-white'
              }`}
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 flex-shrink-0 z-50">
          <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold mr-3">V</div>
          <span className="font-bold text-lg text-slate-800">Villax Hotel</span>
        </header>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-0 pb-20 md:pb-0">
          <Outlet />
        </div>
      </div>

      {/* Mobile More Menu Popup */}
      {showMoreMobile && (
        <div className="md:hidden fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-end justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-[2rem] p-6 animate-in slide-in-from-bottom duration-300 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Administrative Options</h3>
              <button onClick={() => setShowMoreMobile(false)} className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:text-slate-600 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="divide-y divide-slate-50">
              <NavLink 
                to="/hotel/account" 
                onClick={() => setShowMoreMobile(false)}
                className="flex items-center gap-4 py-4 group transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-black text-slate-800 tracking-tight">Account & Security</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Manage your profile</p>
                </div>
                <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </NavLink>

              <NavLink 
                to="/hotel/property" 
                onClick={() => setShowMoreMobile(false)}
                className="flex items-center gap-4 py-4 group transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 flex items-center justify-center transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-black text-slate-800 tracking-tight">Property Management</p>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Edit room details</p>
                </div>
                <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </NavLink>

              <button 
                onClick={handleLogout}
                className="w-full flex items-center gap-4 py-4 group transition-all text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-400 group-hover:bg-rose-100 group-hover:text-rose-600 flex items-center justify-center transition-all">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-black text-rose-600 tracking-tight">Logout</p>
                  <p className="text-[9px] font-bold text-rose-300 uppercase tracking-wider">Securely end session</p>
                </div>
              </button>
            </div>
            
            <div className="mt-4 pt-6 border-t border-slate-50 text-center">
              <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.2em]">Villax Property Manager v2.4.0</p>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 h-20 flex items-center justify-around px-4 z-[50] shadow-[0_-8px_30px_rgba(0,0,0,0.08)]">
        {navItems.slice(0, 4).map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/hotel'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center transition-all ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className={`p-2 rounded-xl transition-all ${isActive ? 'bg-blue-100 text-blue-600' : 'text-slate-400'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={item.icon} />
                  </svg>
                </div>
                <span className={`text-[8px] font-black mt-1 uppercase tracking-widest ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>
                  {item.name}
                </span>
              </>
            )}
          </NavLink>
        ))}
        <button 
          onClick={() => setShowMoreMobile(true)}
          className={`flex flex-col items-center justify-center transition-all ${showMoreMobile ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <div className={`p-2 rounded-xl transition-all ${showMoreMobile ? 'bg-blue-100 text-blue-600' : 'text-slate-400'}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </div>
          <span className={`text-[8px] font-black mt-1 uppercase tracking-widest ${showMoreMobile ? 'text-blue-600' : 'text-slate-400'}`}>
            More
          </span>
        </button>
      </div>
    </div>
  );
}
