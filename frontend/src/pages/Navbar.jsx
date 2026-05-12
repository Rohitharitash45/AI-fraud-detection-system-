import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'


const TOOLS = [
  { path: '/',            icon: '🔍', label: 'Single Scan' },
  { path: '/multi-scan',  icon: '📋', label: 'Multi Scan'  },
  { path: '/voice-scan',  icon: '🎙️', label: 'Voice Scan'  },
  { path: '/ocr-scan',    icon: '🖼️', label: 'OCR Scan'    },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const { pathname }     = useLocation()

  return (
  <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">

    <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">

      {/* Left Section */}
      <div className="flex items-center gap-6">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-gray-800">
          <span>🛡️</span>
          <span>
            PhishGuard <span className="text-blue-600">AI</span>
          </span>
        </Link>

        {/* Tools */}
        <div className="hidden md:flex items-center gap-4">
          {TOOLS.map((t) => (
            <Link
              key={t.path}
              to={t.path}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                pathname === t.path
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t.icon} {t.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">

        {user ? (
          <>
            <Link
              to="/Dashboard"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                pathname === '/Dashboard'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              📊 Dashboard
            </Link>

            <Link
              to="/Profile"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                pathname === '/Profile'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              👤 Profile
            </Link>

            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-1.5 rounded-lg text-sm"
            >
              Logout
            </button>
          </>
        ) : (
          <>
            <Link
              to="/Login"
              className="text-gray-600 hover:text-black text-sm"
            >
              Login
            </Link>

            <Link
              to="/Register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm"
            >
              Sign Up
            </Link>
          </>
        )}

      </div>

    </div>
  </nav>
)
}