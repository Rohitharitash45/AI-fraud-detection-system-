import { useState, useRef } from 'react'
import axios from 'axios'
import {
  FileImage, Upload, CheckCircle2, AlertTriangle,
  AlertCircle, Loader2, RotateCcw, X, Info, ChevronDown, ChevronUp
} from 'lucide-react'

// ── Direct axios call with correct field name ──────────────────────────────
const BASE_URL = 'http://localhost:5000'

async function callOcrScan(file) {
  const formData = new FormData()
  // ✅ field name MUST match request.files.get('image') in Flask
  formData.append('image', file, file.name)

  const token = localStorage.getItem('access_token')
  return axios.post(`${BASE_URL}/analyze-image`, formData, {
    headers: {
      // ✅ NEVER manually set Content-Type for FormData
      // axios sets multipart/form-data + boundary automatically
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    timeout: 60000,      // 60s — OCR + analysis takes time
    withCredentials: true,
  })
}

// ── Result card ────────────────────────────────────────────────────────────
function ResultSection({ result }) {
  const [showLines, setShowLines] = useState(false)

  const isScam = result.status === 'SCAM'
  const isSafe = result.status === 'SAFE'
  const score  = result.score || 0

  const barColor = score >= 55 ? 'bg-red-500' : score >= 30 ? 'bg-amber-400' : 'bg-emerald-500'

  // ✅ backend returns extracted_text — support both keys for safety
  const extractedText = result.extracted_text || result.text || ''

  const allReasons = [
    ...(result.reasons || []),
    ...(result.lines || []).flatMap(l => l.reasons || []),
  ]
  const uniqueReasons = [...new Set(allReasons)].filter(Boolean)

  const flaggedLines = (result.lines || []).filter(l => l.status === 'SCAM' || l.status === 'WARNING')

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 animate-fade-up space-y-5">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
          ${isScam ? 'bg-red-50' : isSafe ? 'bg-emerald-50' : 'bg-amber-50'}`}>
          {isScam
            ? <AlertTriangle size={22} className="text-red-500" />
            : isSafe
            ? <CheckCircle2 size={22} className="text-emerald-500" />
            : <AlertCircle size={22} className="text-amber-500" />
          }
        </div>
        <div>
          <span className={`text-[12px] font-bold px-2.5 py-1 rounded-full
            ${isScam ? 'bg-red-50 text-red-600' : isSafe ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
            {isScam ? 'Scam content detected' : isSafe ? 'No threats found' : 'Suspicious content'}
          </span>
          {result.message && (
            <p className="text-[12px] text-gray-400 mt-1">{result.message}</p>
          )}
        </div>
      </div>

      {/* Score bar */}
      <div>
        <div className="flex justify-between text-[12px] mb-1.5">
          <span className="text-gray-500 font-medium">Risk score</span>
          <span className={`font-bold ${score >= 55 ? 'text-red-600' : score >= 30 ? 'text-amber-600' : 'text-emerald-600'}`}>
            {score} / 100
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full score-fill ${barColor}`} style={{ width: `${score}%` }} />
        </div>
      </div>

      {/* Detection flags */}
      {uniqueReasons.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Detection flags</p>
          <div className="flex flex-wrap gap-1.5">
            {uniqueReasons.map((r, i) => (
              <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] font-medium rounded-full">{r}</span>
            ))}
          </div>
        </div>
      )}

      {/* Flagged lines */}
      {flaggedLines.length > 0 && (
        <div>
          <button
            onClick={() => setShowLines(v => !v)}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-brand-600 hover:underline"
          >
            {showLines ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {flaggedLines.length} suspicious line{flaggedLines.length > 1 ? 's' : ''} found
          </button>
          {showLines && (
            <div className="mt-2 space-y-2">
              {flaggedLines.map((line, i) => (
                <div key={i} className="bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                  <p className="text-[12px] text-red-700 font-mono leading-relaxed">{line.content}</p>
                  {line.reasons?.length > 0 && (
                    <p className="text-[10px] text-red-400 mt-1">{line.reasons.join(' · ')}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Extracted text */}
      {extractedText ? (
        <div className="border-t border-gray-100 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Extracted text</p>
          <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto">
            <p className="text-[12px] text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">{extractedText}</p>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-100 pt-4 text-[12px] text-gray-400 italic">
          No text could be extracted from this image.
        </div>
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export default function OcrScan() {
  const [file,    setFile]    = useState(null)
  const [preview, setPreview] = useState(null)
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [drag,    setDrag]    = useState(false)
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(f.type)) { setError('Please use JPG, PNG, or WEBP.'); return }
    if (f.size > 5 * 1024 * 1024) { setError('File too large (max 5MB).'); return }
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setError('')
    setResult(null)
  }

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const onReset = () => {
    setFile(null); setPreview(null); setResult(null); setError('')
  }

  const handleScan = async () => {
    if (!file) { setError('Upload an image first.'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const r = await callOcrScan(file)
      setResult(r.data)
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Scan failed. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-[780px] space-y-5">

      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="flex items-center gap-2 mb-1">
          <FileImage size={18} className="text-blue-200" />
          <h2 className="font-display font-bold text-xl text-white">OCR Scam Scanner</h2>
        </div>
        <p className="text-blue-200 text-[13px]">
          Upload a screenshot of any suspicious message, email, or ad. We'll extract and analyse the text.
        </p>
      </div>

      {/* Notice */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-[13px] text-amber-700">
        <Info size={15} className="flex-shrink-0" />
        OCR scan may take 10–30 seconds. Please wait after clicking scan.
      </div>

      {/* Upload */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => !file && inputRef.current.click()}
          className={`relative border-2 border-dashed rounded-xl transition-all
            ${file ? 'border-emerald-300 bg-emerald-50 cursor-default'
              : drag ? 'border-brand-600 bg-brand-50 cursor-copy'
              : 'border-gray-200 hover:border-brand-400 hover:bg-brand-50/30 cursor-pointer'}`}
        >
          <input
            ref={inputRef} type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={e => handleFile(e.target.files?.[0])}
            className="hidden"
          />
          {file ? (
            <div className="p-5">
              {preview && (
                <img src={preview} alt="Preview"
                  className="w-full max-h-56 object-contain rounded-xl border border-gray-200 mb-3" />
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[13px] text-emerald-600 font-medium">
                  <CheckCircle2 size={15} />
                  {file.name}
                  <span className="text-gray-400 font-normal">({(file.size / 1024).toFixed(0)} KB)</span>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onReset() }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 px-6 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Upload size={20} className="text-gray-400" />
              </div>
              <p className="text-[14px] text-gray-600">
                <span className="font-semibold text-brand-600">Click to upload</span> or drag & drop
              </p>
              <p className="text-[12px] text-gray-400 mt-1">JPG, PNG, WEBP — max 5MB</p>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[13px] animate-shake">
            <AlertTriangle size={14} className="flex-shrink-0" /> {error}
          </div>
        )}

        <div className="flex gap-2">
          {file && (
            <button onClick={onReset}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition">
              <RotateCcw size={13} /> Reset
            </button>
          )}
          <button
            onClick={handleScan}
            disabled={loading || !file}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white text-[14px] font-semibold rounded-xl transition shadow-brand"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Analysing image…</>
              : <><FileImage size={15} /> Scan image</>
            }
          </button>
        </div>
      </div>

      {loading && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center animate-fade-up">
          <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-semibold text-gray-700">Extracting & analysing text...</p>
          <p className="text-[12px] text-gray-400 mt-1">Running OCR — please wait up to 30 seconds</p>
        </div>
      )}

      {result && !loading && <ResultSection result={result} />}
    </div>
  )
}