import { useState } from 'react'
import {
  CheckCircle2, AlertTriangle, AlertCircle,
  Info, HelpCircle, Flag,
  Lock, Globe, Calendar, BarChart2, Link2
} from 'lucide-react'

// ── Status config ────────────────────────────────────────────
const STATUS = {
  SAFE:    { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', bar: 'bg-emerald-500', icon: CheckCircle2,  label: 'Safe' },
  SCAM:    { color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-100',     bar: 'bg-red-500',     icon: AlertTriangle, label: 'Scam detected' },
  WARNING: { color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100',   bar: 'bg-amber-400',   icon: AlertCircle,   label: 'Suspicious' },
  INFO:    { color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100',    bar: 'bg-blue-400',    icon: Info,          label: 'Info' },
  UNKNOWN: { color: 'text-gray-500',    bg: 'bg-gray-100',   border: 'border-gray-200',    bar: 'bg-gray-400',    icon: HelpCircle,    label: 'Unknown' },
}

// ── Detail cell ──────────────────────────────────────────────
function DetailCell({ icon: Icon, label, value, good }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={12} className="text-gray-400" />
        <p className="text-[11px] text-gray-400 font-medium">{label}</p>
      </div>
      <p className={`text-[13px] font-semibold ${
        good === true  ? 'text-emerald-600' :
        good === false ? 'text-red-600'     : 'text-gray-800'
      }`}>
        {value}
      </p>
    </div>
  )
}

// ── Main component ───────────────────────────────────────────
export default function ResultCard({ result, onReport }) {
  const [reported, setReported] = useState(false)
  if (!result) return null

  const confidence = parseFloat(result?.confidence) || 0
  const score = parseFloat(result?.score) || 0

  let derivedStatus = "SAFE"

  // 🔥 Strong ML signal → immediate scam
  if (confidence >= 85) {
    derivedStatus = "SCAM"
  }
  // ⚠️ Medium ML OR high risk score → warning
  else if (confidence >= 60 || score >= 65) {
    derivedStatus = "WARNING"
  }
  // 🟢 Only when BOTH are low → safe
  else if (confidence < 40 && score < 40) {
    derivedStatus = "SAFE"
  }
  // fallback safety
  else {
    derivedStatus = "WARNING"
  }

  const cfg  = STATUS[derivedStatus] || STATUS.UNKNOWN
  const Icon = cfg.icon

  // ✅ safe items
  const items = Array.isArray(result?.reasons)
    ? result.reasons
    : Array.isArray(result?.detections)
    ? result.detections
    : []

  const handleReport = () => {
    onReport?.()
    setReported(true)
  }

  const getScoreColor = (score) => {
  if (score >= 75) return 'bg-red-500'
  if (score >= 50) return 'bg-amber-400'
  return 'bg-emerald-500'
}

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4 animate-fade-up">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 ${cfg.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon size={20} className={cfg.color} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
              {cfg.label}
            </span>
            {derivedStatus === 'INFO' && result?.message && (
              <span className="text-[12px] text-gray-500 truncate">{result.message}</span>
            )}
          </div>

          {/* Confidence */}
          {result?.confidence !== undefined && derivedStatus !== 'SAFE' && (
            <p className="text-[11px] text-gray-400 mt-1">
            ML confidence: <span className="font-semibold text-gray-600">{confidence}%</span>
          </p>
          )}
        </div>
      </div>

      {/* ── Risk score bar ── */}
      {score !== null && derivedStatus !== 'INFO' && (
        <div>
          <div className="flex justify-between text-[12px] mb-1.5">
            <span className="text-gray-500 font-medium">Risk score</span>
            <span className={`font-bold ${cfg.color}`}>{score} / 100</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full score-fill ${getScoreColor(score)}`}
              style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Reasons / Detections ── */}
      {items.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
            Detection flags
          </p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((item, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-medium rounded-full"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Detail grid ── */}
      {result?.details && (
        <div className="grid grid-cols-2 gap-2">
          {result.details.age_days !== undefined && (
            <DetailCell
              icon={Calendar} label="Domain age"
              value={`${result.details.age_days} days`}
              good={result.details.age_days > 365}
            />
          )}
          {result.details.entropy !== undefined && (
            <DetailCell
              icon={BarChart2} label="Entropy"
              value={result.details.entropy}
            />
          )}
          {result.details.is_secure !== undefined && (
            <DetailCell
              icon={Lock} label="HTTPS"
              value={result.details.is_secure ? 'Secured' : 'Not secured'}
              good={result.details.is_secure}
            />
          )}
          {result.details.is_typosquat !== undefined && (
            <DetailCell
              icon={Globe} label="Typosquat"
              value={result.details.is_typosquat ? 'Detected' : 'Not detected'}
              good={!result.details.is_typosquat}
            />
          )}
        </div>
      )}

      {/* ── Semantic / Endee match ── */}
      {result?.endee_match && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
          <Link2 size={13} className="text-blue-400 flex-shrink-0" />
          <p className="text-[12px] text-blue-700">
            Semantic match{' '}
            <span className="font-bold">{result.endee_match.similarity}%</span>
            {' '}—{' '}
            <span className="italic text-blue-600">{result.endee_match.matched_pattern}</span>
          </p>
        </div>
      )}

      {/* ── Report button */}
      {derivedStatus === 'SCAM' && onReport && (
        <div className="pt-2 border-t border-gray-100">
          <button
            onClick={handleReport}
            disabled={reported}
            className={`flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold rounded-xl transition
              ${reported
                ? 'bg-emerald-50 text-emerald-600 cursor-default'
                : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
          >
            {reported
              ? <><CheckCircle2 size={14} /> Reported to community</>
              : <><Flag size={14} /> Report to community</>
            }
          </button>
        </div>
      )}
    </div>
  )
}