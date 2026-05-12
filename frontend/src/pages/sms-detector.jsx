import { useState } from 'react'
import { scanSms, reportScam } from '../api' // Assuming scanSms exists in your api.js
import {
  MessageSquare, Shield, AlertTriangle, CheckCircle2,
  Loader2, Flag, RotateCcw, MessageCircle
} from 'lucide-react'

function ResultCard({ result, content, onReset }) {
  const isScam = result.status === 'SCAM'
  const isSafe = result.status === 'SAFE'
  const score = result.score || 0

  const barColor = score >= 70 ? 'bg-red-500'
    : score >= 40 ? 'bg-amber-400'
    : 'bg-emerald-500'

  const [reported, setReported] = useState(false)
  
  const onReport = async () => {
    try { 
      // Using a generic report function or a specific sms one
      await reportScam(content); 
      setReported(true) 
    } catch (err) {
      console.error("Report failed", err)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
          ${isScam ? 'bg-red-50' : 'bg-emerald-50'}`}>
          {isScam
            ? <AlertTriangle size={20} className="text-red-500" />
            : <CheckCircle2 size={20} className="text-emerald-500" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full
              ${isScam ? 'bg-red-50 text-red-600' : isSafe ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
              {isScam ? 'Fraudulent Message' : isSafe ? 'Likely Safe' : 'Suspicious Content'}
            </span>
          </div>
          <p className="text-[12px] text-gray-400 mt-1 line-clamp-1 italic">"{content}"</p>
        </div>
      </div>

      {/* Score bar */}
      <div className="mb-5">
        <div className="flex justify-between text-[12px] mb-2">
          <span className="text-gray-500 font-medium">Threat Level</span>
          <span className={`font-bold ${score >= 70 ? 'text-red-600' : score >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {score} / 100
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full score-fill ${barColor}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Reasons */}
      {result.reasons?.length > 0 && (
        <div className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Analysis Findings</p>
          <div className="flex flex-wrap gap-2">
            {result.reasons.map(r => (
              <span key={r} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-medium rounded-full">
                {r}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t border-gray-100">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
        >
          <RotateCcw size={13} /> Clear & New Scan
        </button>
        {isScam && (
          <button
            onClick={onReport} disabled={reported}
            className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-xl transition
              ${reported ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
          >
            <Flag size={13} />
            {reported ? 'Reported to Database' : 'Report Message'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function SmsScanner() {
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const onScan = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setError('')
    setLoading(true)
    setResult(null)
    try {
      // Logic mirrors your URL scanner
      const r = await scanSms(text.trim())
      setResult(r.data)
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  const onReset = () => { setResult(null); setText(''); setError('') }

  return (
    <div className="max-w-[780px] space-y-5">
      {/* Hero scan area */}
      <div className="bg-gradient-to-br from-indigo-600 to-brand-700 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        
        <h2 className="font-display font-bold text-xl text-white mb-1">SMS & Message Detector</h2>
        <p className="text-blue-200 text-[13px] mb-4">Paste suspicious texts, WhatsApp messages, or emails to detect fraud.</p>

        <form onSubmit={onScan} className="space-y-3">
          <div className="relative">
            <MessageSquare size={14} className="absolute left-3.5 top-4 text-white/50 pointer-events-none" />
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Paste the message content here..."
              rows={4}
              className="w-full pl-9 pr-4 py-3 bg-white/15 border border-white/25 hover:border-white/40 focus:border-white/70 rounded-xl text-[14px] text-white placeholder:text-white/50 focus:outline-none focus:bg-white/20 transition backdrop-blur-sm font-body resize-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit" disabled={loading || !text.trim()}
              className="px-6 py-3 bg-white text-brand-600 font-bold text-[14px] rounded-xl hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><Shield size={14} /> Analyze Message</>}
            </button>
          </div>
        </form>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[13px] animate-shake">
          <AlertTriangle size={15} className="flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Scanning State */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center animate-fade-up">
          <div className="relative w-14 h-14 mx-auto mb-4">
            <div className="w-14 h-14 rounded-full border-4 border-indigo-100 animate-spin border-t-indigo-600" />
          </div>
          <p className="font-semibold text-gray-700 text-[14px]">Analyzing Message Patterns...</p>
          <p className="text-[12px] text-gray-400 mt-1">Checking for NLP fraud markers & known scam templates</p>
        </div>
      )}

      {/* Result Display */}
      {result && !loading && (
        <ResultCard result={result} content={text} onReset={onReset} />
      )}

      {/* Static Info Tips */}
      {!result && !loading && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">Detection Capabilities</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              'Urgency & Fear tactics',
              'Fake lottery/prize wins',
              'Impersonation (Bank, Govt)',
              'Suspicious payment links',
              'OTP/Credential baiting',
              'Unknown sender verification'
            ].map(t => (
              <div key={t} className="flex items-center gap-2 text-[12px] text-gray-600">
                <CheckCircle2 size={13} className="text-indigo-500 flex-shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}