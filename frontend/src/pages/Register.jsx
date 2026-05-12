import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { registerUser } from '../api'
import { ShieldCheck, User, Mail, Lock, ArrowRight, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

export default function Register() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onChange = (e) => setForm(f => ({ ...f, [e.target.name]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    try {
      const r = await registerUser(form)
      login({ access_token: r.data.access_token, refresh_token: r.data.refresh_token }, r.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const pwStrength = form.password.length === 0 ? null
    : form.password.length < 8 ? 'weak'
    : form.password.length < 12 ? 'good'
    : 'strong'

  const strengthColor = { weak: 'bg-red-400', good: 'bg-amber-400', strong: 'bg-emerald-500' }
  const strengthWidth = { weak: 'w-1/3', good: 'w-2/3', strong: 'w-full' }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 relative overflow-hidden">
      <div className="absolute top-[-15%] right-[-10%] w-[45%] h-[45%] bg-purple-100/50 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-15%] left-[-10%] w-[40%] h-[40%] bg-blue-100/60 rounded-full blur-[80px] pointer-events-none" />

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
            <h2 className="font-display font-bold text-2xl text-gray-900">Create account</h2>
            <p className="text-gray-400 text-sm mt-1">Start protecting your digital life today</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Full name</label>
              <div className="relative">
                <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  name="name" type="text" required
                  placeholder="John Doe"
                  value={form.name} onChange={onChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition font-body"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Email address</label>
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
              <label className="block text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  name="password" type="password" required
                  placeholder="Min. 8 characters"
                  value={form.password} onChange={onChange}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-[14px] text-gray-900 placeholder:text-gray-300 focus:outline-none focus:bg-white focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10 transition font-body"
                />
              </div>
              {/* Strength bar */}
              {pwStrength && (
                <div className="mt-2">
                  <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${strengthColor[pwStrength]} ${strengthWidth[pwStrength]}`} />
                  </div>
                  <p className={`text-[11px] mt-1 font-medium capitalize
                    ${pwStrength === 'weak' ? 'text-red-500' : pwStrength === 'good' ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {pwStrength === 'weak' ? `${8 - form.password.length} more characters needed` : `${pwStrength} password`}
                  </p>
                </div>
              )}
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
                : <>Create free account <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" /></>
              }
            </button>
          </form>

          {/* Trust line */}
          <div className="flex items-center justify-center gap-5 mt-5">
            {['No credit card', 'AI protected', 'Free forever'].map(t => (
              <div key={t} className="flex items-center gap-1 text-[11px] text-gray-400">
                <CheckCircle2 size={12} className="text-emerald-500" />
                {t}
              </div>
            ))}
          </div>

          <p className="text-center text-[13px] text-gray-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-600 font-semibold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}