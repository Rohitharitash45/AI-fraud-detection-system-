import { Outlet, useLocation } from 'react-router-dom'
import { Bell, Search } from 'lucide-react'
import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

const PAGE_TITLES = {
  '/':           'Dashboard',
  '/scan':       'URL Scanner',
  '/multi-scan': 'Multi Scan',
  '/ocr-scan':   'OCR Scan',
  '/voice-scan': 'Voice Scanner',
  '/profile':    'Profile',
  '/PhoneScanner': 'Phone Number Checker',
}

export default function Layout() {
  const location = useLocation()
  const { user } = useAuth()
  const title = PAGE_TITLES[location.pathname] || 'PhishGuard'

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 bg-white border-b border-gray-100 flex items-center px-5 gap-4 flex-shrink-0">
          <h1 className="font-display font-bold text-[16px] text-gray-900 flex-1">
            {title}
          </h1>

          {/* Search */}
          <div className="relative hidden md:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              placeholder="Search scans..."
              className="pl-8 pr-4 py-1.5 text-[13px] bg-gray-100 border border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-gray-300 transition w-56 font-body"
            />
          </div>

          {/* Bell */}
          <button className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition relative">
            <Bell size={15} />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-red-500 rounded-full" />
          </button>

          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold cursor-pointer">
            {initials}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5">
          <div className="animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}