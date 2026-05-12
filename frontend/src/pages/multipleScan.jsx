import { useState } from 'react'
import { multiScan } from '../api'
import {
  Layers, AlertTriangle, CheckCircle2, AlertCircle,
  Loader2, RotateCcw, Search, Info
} from 'lucide-react'

const MAX_URLS = 20

function StatusBadge({ status }) {
  const map = {
    SAFE:    'bg-emerald-50 text-emerald-600',
    SCAM:    'bg-red-50 text-red-600',
    WARNING: 'bg-amber-50 text-amber-600',
    UNKNOWN: 'bg-gray-100 text-gray-500',
  }
  const icons = {
    SAFE:    <CheckCircle2 size={12} />,
    SCAM:    <AlertTriangle size={12} />,
    WARNING: <AlertCircle size={12} />,
    UNKNOWN: <Info size={12} />,
  }
  return (
    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${map[status] || map.UNKNOWN}`}>
      {icons[status] || icons.UNKNOWN}
      {status}
    </span>
  )
}

function ScoreBar({ score }) {
  const color = score >= 70 ? 'bg-red-500' : score >= 40 ? 'bg-amber-400' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full score-fill ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-[11px] font-bold w-6 text-right ${score >= 70 ? 'text-red-600' : score >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
        {score}
      </span>
    </div>
  )
}

export default function MultiScan() {
  const [text,    setText]    = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')

  const urls     = text.split('\n').map(u => u.trim()).filter(Boolean)
  const urlCount = urls.length

  const handleScan = async () => {
    if (!urls.length) { setError('Enter at least one URL.'); return }
    if (urls.length > MAX_URLS) { setError(`Maximum ${MAX_URLS} URLs at once.`); return }
    setLoading(true); setError(''); setResults([])
    try {
      const r = await multiScan(urls)
      setResults(r.data.results || [])
    } catch (e) {
      setError(e.response?.data?.error || 'Scan failed. Please try again.')
    } finally { setLoading(false) }
  }

  const onReset = () => { setText(''); setResults([]); setError('') }

  const safe    = results.filter(r => r.status === 'SAFE').length
  const scam    = results.filter(r => r.status === 'SCAM').length
  const warning = results.filter(r => r.status === 'WARNING').length

  return (
    <div className="max-w-[820px] space-y-5">

      {/* Hero input */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/4 translate-x-1/4 pointer-events-none" />

        <div className="flex items-center gap-2 mb-1">
          <Layers size={18} className="text-blue-200" />
          <h2 className="font-display font-bold text-xl text-white">Multi URL Scanner</h2>
        </div>
        <p className="text-blue-200 text-[13px] mb-4">Paste up to {MAX_URLS} URLs — one per line — and scan them all at once.</p>

        <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl overflow-hidden">
          <textarea
            rows={6}
            placeholder={'https://example.com\nhttps://suspicious-site.tk\nhttps://bank-verify.xyz'}
            value={text}
            onChange={e => setText(e.target.value)}
            className="w-full px-4 py-3 bg-transparent text-white placeholder:text-white/40 font-mono text-[13px] focus:outline-none resize-none leading-relaxed"
          />
          <div className="flex items-center justify-between px-4 py-2 border-t border-white/10">
            <span className={`text-[12px] font-medium ${urlCount > MAX_URLS ? 'text-red-300' : 'text-white/60'}`}>
              {urlCount} / {MAX_URLS} URLs
            </span>
            <div className="flex gap-2">
              {results.length > 0 && (
                <button
                  onClick={onReset}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white/70 hover:text-white transition"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
              <button
                onClick={handleScan}
                disabled={loading || !urlCount}
                className="flex items-center gap-1.5 px-4 py-1.5 bg-white text-brand-600 text-[13px] font-bold rounded-lg hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                {loading
                  ? <><Loader2 size={13} className="animate-spin" /> Scanning…</>
                  : <><Search size={13} /> Scan {urlCount > 0 ? `(${urlCount})` : 'all'}</>
                }
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 mt-3 text-[12px] text-red-200 bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2.5">
            <AlertTriangle size={13} className="flex-shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center animate-fade-up">
          <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-semibold text-gray-700">Scanning {urlCount} URLs...</p>
          <p className="text-[12px] text-gray-400 mt-1">This may take a few seconds</p>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && !loading && (
        <div className="space-y-4 animate-fade-up">

          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Safe',     count: safe,    bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', icon: <CheckCircle2 size={16} /> },
              { label: 'Scam',     count: scam,    bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-100',     icon: <AlertTriangle size={16} /> },
              { label: 'Warning',  count: warning, bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-100',   icon: <AlertCircle size={16} /> },
            ].map(({ label, count, bg, text, border, icon }) => (
              <div key={label} className={`${bg} ${border} border rounded-xl p-4 flex items-center gap-3`}>
                <div className={`${text}`}>{icon}</div>
                <div>
                  <p className={`font-display font-bold text-xl ${text}`}>{count}</p>
                  <p className={`text-[11px] font-medium ${text} opacity-80`}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Result list */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-[14px] text-gray-900">Scan results</h3>
              <span className="text-[12px] text-gray-400">{results.length} URLs analysed</span>
            </div>
            <div className="divide-y divide-gray-50">
              {results.map((r, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-center gap-3 mb-2">
                    <StatusBadge status={r.status} />
                    <p className="text-[12px] text-gray-500 font-mono flex-1 truncate">{r.url}</p>
                  </div>
                  <ScoreBar score={r.score || 0} />
                  {r.reasons?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {r.reasons.map((reason, j) => (
                        <span key={j} className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[11px] rounded-full">
                          {reason}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}