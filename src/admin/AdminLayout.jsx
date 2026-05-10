import React from 'react'
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
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="currentColor" d="M4 3h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm0 11h7a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1zm11-11h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm0 11h5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1z" />
        </svg>
      )
    case 'users':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="currentColor" d="M16 11a4 4 0 1 0-3.999-4A4 4 0 0 0 16 11zm-8 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3zm0 2c-2.67 0-8 1.34-8 4v3h10.5a6.45 6.45 0 0 1-.5-2.5 6.47 6.47 0 0 1 2.1-4.78A13.2 13.2 0 0 0 8 13zm8 0a5 5 0 0 1 5 5v3h-7.5a4.97 4.97 0 0 1-.5-2.2 4.99 4.99 0 0 1 3-4.6z" />
        </svg>
      )
    case 'wallet':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="currentColor" d="M3 6a3 3 0 0 1 3-3h10a1 1 0 0 1 0 2H6a1 1 0 0 0 0 2h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zm13 5a2 2 0 1 0 2 2 2 2 0 0 0-2-2z" />
        </svg>
      )
    case 'chart':
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="currentColor" d="M4 20a1 1 0 0 1-1-1V5a1 1 0 0 1 2 0v14h15a1 1 0 1 1 0 2zm4-3a1 1 0 0 1-1-1v-4a1 1 0 0 1 2 0v4a1 1 0 0 1-1 1zm5 0a1 1 0 0 1-1-1V8a1 1 0 0 1 2 0v8a1 1 0 0 1-1 1zm5 0a1 1 0 0 1-1-1v-6a1 1 0 0 1 2 0v6a1 1 0 0 1-1 1z" />
        </svg>
      )
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
          <path fill="currentColor" d="M5 10a2 2 0 1 0 2-2 2 2 0 0 0-2 2zm5 0a2 2 0 1 0 2-2 2 2 0 0 0-2 2zm5 0a2 2 0 1 0 2-2 2 2 0 0 0-2 2z" />
        </svg>
      )
  }
}

export default function AdminLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="admin-shell min-h-screen text-slate-900">
      <div className="admin-bg" aria-hidden="true" />
      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden md:flex md:w-64 md:flex-col md:gap-6 md:border-r md:border-slate-200 md:bg-white/80 md:px-6 md:py-8">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/30" />
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Villax</p>
              <p className="text-lg font-semibold text-slate-900">Admin Console</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/admin'}
                className={({ isActive }) =>
                  `group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-300/40'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
          <button
            onClick={handleLogout}
            className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            Logout
          </button>
        </aside>

        <main className="flex-1">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white/80 px-5 py-4 md:hidden">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Villax</p>
              <p className="text-base font-semibold text-slate-900">Admin Console</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Signed in</p>
              <p className="text-sm font-semibold text-slate-900">{user?.username || 'Admin'}</p>
            </div>
          </header>
          <div className="px-4 pb-28 pt-6 md:px-8 md:pb-10">
            <div key={location.pathname} className="admin-fade">
              <Outlet />
            </div>
          </div>
        </main>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200 bg-white/90 px-4 py-2 backdrop-blur md:hidden">
        <div className="flex items-center justify-between">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold ${
                  isActive ? 'text-slate-900' : 'text-slate-500'
                }`
              }
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
