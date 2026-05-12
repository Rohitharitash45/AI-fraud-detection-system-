import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { loginUser } from '../api'
import { ShieldCheck, Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await loginUser(form)
      login({ access_token: r.data.access_token, refresh_token: r.data.refresh_token }, r.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-15%] left-[-10%] w-[45%] h-[45%] bg-blue-100/60 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[40%] h-[40%] bg-emerald-100/60 rounded-full blur-[80px] pointer-events-none" />

      <div className="w-full max-w-[400px] relative animate-fade-up">
        <div className="bg-white border border-gray-200 rounded-3xl p-9 shadow-card">

          {/* Brand */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2.5 mb-5 group">
              <div className="w-10 h-10 bg-brand-600 rounded-xl flex items-center justify-center shadow-brand group-hover:scale-105 transition-transform">
                <ShieldCheck size={20} className="text-white" strokeWidth={2.2} />
              </div>
              <span className="font-display font-extrabold text-[18px] text-gray-900">
                PhishGuard <span className="text-brand-600">AI</span>
              </span>
            </Link>
            <h2 className="font-display font-bold text-2xl text-gray-900">Welcome back</h2>
            <p className="text-gray-400 text-sm mt-1">Access your security dashboard</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  name="email" type="email" required
                  placeholder="name@company.com"
                  value={form.email} onChange={onChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition font-body"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  Password
                </label>
                <Link to="/forgot-password" className="text-[11px] text-brand-600 font-semibold hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  name="password" type="password" required
                  placeholder="••••••••"
                  value={form.password} onChange={onChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition font-body"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3.5 bg-red-50 text-red-600 rounded-xl border border-red-100 animate-shake">
                <AlertCircle size={15} className="flex-shrink-0" />
                <p className="text-xs font-semibold">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="w-full mt-2 py-3.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-[14px] shadow-brand hover:shadow-lg transition-all flex items-center justify-center gap-2 group"
            >
              {loading
                ? <Loader2 size={18} className="animate-spin" />
                : <>Sign in <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" /></>
              }
            </button>
          </form>

          <p className="text-center text-[13px] text-gray-400 mt-7">
            Don't have an account?{' '}
            <Link to="/register" className="text-brand-600 font-semibold hover:underline">
              Sign up free
            </Link>
          </p>
        </div>

        <p className="text-center text-[10px] text-gray-300 font-semibold uppercase tracking-[.25em] mt-6">
          PhishGuard Security Protocol
        </p>
      </div>
    </div>
  )
}