import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { name: 'Dashboard', path: '/hotel', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { name: 'Bookings', path: '/hotel/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { name: 'Payments', path: '/hotel/payments', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
  { name: 'Finance', path: '/hotel/finance', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

export default function HotelLayout() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar - Visible on Desktop, Hidden on Mobile */}
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
            title={isOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/hotel'}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 text-sm font-medium transition-all group ${
                  isActive 
                    ? 'bg-blue-700 text-white border-l-4 border-blue-300 shadow-inner' 
                    : 'text-blue-100 hover:bg-blue-700/50 hover:text-white'
                }`
              }
            >
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
              </svg>
              {isOpen && <span className="ml-4 truncate">{item.name}</span>}
              {!isOpen && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                  {item.name}
                </div>
              )}
            </NavLink>
          ))}
        </div>

        <div className="p-4 border-t border-blue-700 flex-shrink-0">
          <div className={`flex items-center ${!isOpen && 'justify-center'}`}>
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-lg shadow-lg border border-blue-500">H</div>
            {isOpen && (
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-bold truncate">Hotel Admin</p>
                <p className="text-xs text-blue-300 truncate">Premium Plan</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 flex-shrink-0">
          <div className="h-8 w-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold mr-3">V</div>
          <span className="font-bold text-lg text-slate-800">Villax Platform</span>
        </header>

        {/* Content Section */}
        <div className="flex-1 overflow-y-auto p-0 pb-20 md:pb-0">
          <Outlet />
        </div>
      </div>

      {/* Mobile Bottom Bar - App Style */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 h-16 flex items-center justify-around px-2 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            end={item.path === '/hotel'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full transition-all ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`
            }
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={item.icon} />
            </svg>
            <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">{item.name.slice(0, 5)}</span>
          </NavLink>
        ))}
        <button className="flex flex-col items-center justify-center w-full h-full text-slate-400">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
          <span className="text-[10px] font-bold mt-1 uppercase tracking-tighter">More</span>
        </button>
      </div>
    </div>
  );
}
