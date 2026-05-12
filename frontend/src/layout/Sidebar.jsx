import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Search, MessageSquare, Layers,
  FileImage, Mic, User, ShieldCheck, LogOut, ChevronRight,
  PhoneCall
} from 'lucide-react'

const NAV = [
  {
    section: 'Main',
    items: [
      { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/scan',       icon: Search,          label: 'URL Scan',  badge: 'New' },
      { to: '/sms-scan',   icon: MessageSquare,   label: 'SMS Scan' }, // Unique path
    ],
  },
  {
    section: 'Tools',
    items: [
      { to: '/multi-scan', icon: Layers,    label: 'Multi Scan' },
      { to: '/ocr-scan',   icon: FileImage, label: 'OCR Scan' },   // Unique path
      { to: '/voice-scan', icon: Mic,       label: 'Voice Scan' }, // Unique path
      { to: '/phone-scan', icon: PhoneCall, label:'Phone Scanner'}
    ],
  },
  // ... rest of your NAV

  {
    section: 'Account',
    items: [
      { to: '/profile', icon: User, label: 'Profile' },
    ],
  },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  return (
    <aside className="flex flex-col w-[220px] min-h-screen bg-white border-r border-gray-100 flex-shrink-0">

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-100">
        <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={17} className="text-white" strokeWidth={2.2} />
        </div>
        <span className="font-display font-800 text-[15px] text-gray-900 leading-none">
          Phish<span className="text-brand-600">Guard</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map(({ section, items }) => (
          <div key={section} className="mb-1">
            <p className="px-2 py-2 text-[10px] font-semibold tracking-widest uppercase text-gray-400">
              {section}
            </p>
            {items.map(({ to, icon: Icon, label, badge }) => (
              <NavLink
                key={label}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium mb-0.5 transition-all duration-150 group
                  ${isActive
                    ? 'bg-brand-50 text-brand-600 font-semibold'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={15}
                      strokeWidth={isActive ? 2.2 : 1.8}
                      className={isActive ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'}
                    />
                    <span className="flex-1">{label}</span>
                    {badge && (
                      <span className="text-[9px] font-bold bg-brand-600 text-white px-1.5 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="border-t border-gray-100 p-3">
        <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-gray-50 cursor-pointer transition group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 truncate">{user?.name || 'User'}</p>
            <p className="text-[11px] text-gray-400 truncate">{user?.role || 'user'}</p>
          </div>
          <button
            onClick={logout}
            className="opacity-0 group-hover:opacity-100 transition p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500"
            title="Sign out"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}