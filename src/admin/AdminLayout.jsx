import React, { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

const navItems = [
  { label: 'Dashboard', path: '/admin', icon: 'grid' },
  { label: 'Users', path: '/admin/users', icon: 'users' },
  { label: 'Payments', path: '/admin/payments', icon: 'wallet' },
  { label: 'Reports', path: '/admin/reports', icon: 'chart' },
  { label: 'More', path: '/admin/more', icon: 'more' },
]

function Icon({ name }) {
  switch (name) {
    case 'grid':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d="M4 3h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm0 11h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zm11-11h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm0 11h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" />
        </svg>
      )
    case 'users':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d="M16 11a4 4 0 1 0-3.999-4A4 4 0 0 0 16 11zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.67 0-8 1.34-8 4v3h10.5a6.45 6.45 0 0 1-.5-2.5 6.47 6.47 0 0 1 2.1-4.78A13.2 13.2 0 0 0 8 13zm8 0a5 5 0 0 1 5 5v3h-7.5a4.97 4.97 0 0 1-.5-2.2 4.99 4.99 0 0 1 3-4.6z" />
        </svg>
      )
    case 'wallet':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d="M3 6a3 3 0 0 1 3-3h10a1 1 0 0 1 0 2H6a1 1 0 0 0 0 2h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zm13 5a2 2 0 1 0 2 2 2 2 0 0 0-2-2z" />
        </svg>
      )
    case 'chart':
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d="M4 20a1 1 0 0 1-1-1V5a1 1 0 0 1 2 0v14h15a1 1 0 1 1 0 2zm4-3a1 1 0 0 1-1-1v-4a1 1 0 0 1 2 0v4a1 1 0 0 1-1 1zm5 0a1 1 0 0 1-1-1V8a1 1 0 0 1 2 0v8a1 1 0 0 1-1 1zm5 0a1 1 0 0 1-1-1v-6a1 1 0 0 1 2 0v6a1 1 0 0 1-1 1z" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d="M5 10a2 2 0 1 0 2-2 2 2 0 0 0-2 2zm5 0a2 2 0 1 0 2-2 2 2 0 0 0-2 2zm5 0a2 2 0 1 0 2-2 2 2 0 0 0-2 2z" />
        </svg>
      )
  }
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login')
    } catch (err) {
      console.error(err)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-['Inter'] antialiased">
      {/* Desktop Sidebar (Blue Theme) */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:h-full lg:flex-shrink-0 lg:border-r lg:border-blue-800 lg:bg-blue-900">
        <div className="flex h-16 items-center px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-lg">
              <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-400">Villax</p>
              <h1 className="text-base font-black text-white">Admin</h1>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-0.5 px-3 py-6">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-700/20'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-blue-800 p-4">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-blue-800 flex items-center justify-center text-blue-200 text-[13px] font-bold ring-2 ring-blue-700">
              {user?.username?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
            <div className="overflow-hidden">
              <p className="truncate text-sm font-bold text-white">{user?.username || 'Admin'}</p>
              <p className="truncate text-xs font-medium text-blue-400">{user?.email || 'admin@villax.com'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-blue-800 bg-blue-800/50 py-1.5 text-[13px] font-bold text-blue-200 transition-all hover:bg-blue-800 hover:text-white disabled:opacity-50"
          >
            {loggingOut ? (
              <svg className="animate-spin h-3.5 w-3.5 text-blue-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            )}
            {loggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pb-20 lg:pb-0">
        {/* Mobile Header (White) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
               <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" strokeLinecap="round" strokeLinejoin="round"/>
               </svg>
            </div>
            <h1 className="text-base font-bold text-slate-900 tracking-tight">Admin Console</h1>
          </div>
          <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-[13px] font-bold text-slate-500">
             {user?.username?.substring(0, 1).toUpperCase() || 'A'}
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-4 lg:px-8 lg:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav (White) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-100 bg-white/90 backdrop-blur-md lg:hidden">
        <div className="grid grid-cols-5 items-center gap-1 px-2 py-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 rounded-lg py-1.5 transition-all ${
                  isActive ? 'text-blue-600' : 'text-slate-400'
                }`
              }
            >
              <Icon name={item.icon} />
              <span className="text-[11px] font-bold uppercase tracking-tight">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
