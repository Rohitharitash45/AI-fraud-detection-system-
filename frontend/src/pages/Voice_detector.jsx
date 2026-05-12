import { useState, useRef } from 'react'
import { voiceScan } from '../api'
import {
  Mic, Upload, CheckCircle2, AlertTriangle,
  Loader2, RotateCcw, X, Waves, ShieldCheck
} from 'lucide-react'

export default function VoiceScan() {
  const [file,    setFile]    = useState(null)
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [drag,    setDrag]    = useState(false)
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    if (!f.type.startsWith('audio/')) { setError('Please upload an audio file (MP3, WAV, OGG, M4A).'); return }
    if (f.size > 20 * 1024 * 1024)   { setError('File too large — max 20MB.'); return }
    setFile(f); setError(''); setResult(null)
  }

  const onDrop = (e) => {
    e.preventDefault(); setDrag(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const onReset = () => { setFile(null); setResult(null); setError('') }

  const handleScan = async () => {
    if (!file) { setError('Upload an audio file first.'); return }
    setLoading(true); setError(''); setResult(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await voiceScan(fd)
      setResult(r.data)
    } catch (e) {
      setError(e.response?.data?.error || 'Analysis failed. Please try again.')
    } finally { setLoading(false) }
  }

  const isFake = result?.label === 'FAKE'
  const risk   = result?.risk_score ?? 0

  return (
    <div className="max-w-[780px] space-y-5">

      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/4 translate-x-1/4 pointer-events-none" />
        <div className="flex items-center gap-2 mb-1">
          <Mic size={18} className="text-blue-200" />
          <h2 className="font-display font-bold text-xl text-white">Voice Deepfake Detector</h2>
        </div>
        <p className="text-blue-200 text-[13px]">Upload a voice recording to detect AI-generated or scam audio using ML analysis.</p>
      </div>

      {/* Upload card */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={onDrop}
          onClick={() => !file && inputRef.current.click()}
          className={`relative border-2 border-dashed rounded-xl transition-all
            ${file
              ? 'border-emerald-300 bg-emerald-50 cursor-default p-5'
              : drag
              ? 'border-brand-600 bg-brand-50 cursor-copy py-12 px-6'
              : 'border-gray-200 hover:border-brand-400 hover:bg-brand-50/30 cursor-pointer py-12 px-6'
            }`}
        >
          <input
            ref={inputRef} type="file" accept="audio/*"
            onChange={e => handleFile(e.target.files?.[0])}
            className="hidden"
          />

          {file ? (
            <div className="space-y-3">
              {/* File info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Waves size={16} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-800">{file.name}</p>
                    <p className="text-[11px] text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={e => { e.stopPropagation(); onReset() }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Audio player */}
              <audio
                controls
                src={URL.createObjectURL(file)}
                className="w-full rounded-lg"
                style={{ height: '36px' }}
              />
            </div>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <Upload size={20} className="text-gray-400" />
              </div>
              <p className="text-[14px] text-gray-600">
                <span className="font-semibold text-brand-600">Click to upload</span> or drag & drop
              </p>
              <p className="text-[12px] text-gray-400 mt-1">MP3, WAV, OGG, M4A — max 20MB</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-600 text-[13px] animate-shake">
            <AlertTriangle size={14} className="flex-shrink-0" /> {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {file && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
            >
              <RotateCcw size={13} /> Reset
            </button>
          )}
          <button
            onClick={handleScan}
            disabled={loading || !file}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white text-[14px] font-semibold rounded-xl transition shadow-brand"
          >
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Analysing audio…</>
              : <><Mic size={15} /> Analyse voice</>
            }
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center animate-fade-up">
          <div className="w-12 h-12 border-4 border-brand-100 border-t-brand-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="font-semibold text-gray-700">Analysing audio with ML model...</p>
          <p className="text-[12px] text-gray-400 mt-1">Checking for AI-generated voice patterns</p>
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 animate-fade-up space-y-4">

          {/* Status header */}
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
              ${isFake ? 'bg-red-50' : 'bg-emerald-50'}`}>
              {isFake
                ? <AlertTriangle size={22} className="text-red-500" />
                : <ShieldCheck size={22} className="text-emerald-500" />
              }
            </div>
            <div>
              <h3 className={`font-display font-bold text-[16px] ${isFake ? 'text-red-600' : 'text-emerald-600'}`}>
                {isFake ? 'Deepfake / AI voice detected' : 'Likely authentic voice'}
              </h3>
              <p className="text-[12px] text-gray-400">
                {isFake
                  ? 'This audio shows signs of AI generation or manipulation.'
                  : 'No significant signs of AI manipulation detected.'
                }
              </p>
            </div>
          </div>

          {/* Risk score */}
          <div>
            <div className="flex justify-between text-[12px] mb-1.5">
              <span className="text-gray-500 font-medium">Risk score</span>
              <span className={`font-bold ${risk >= 70 ? 'text-red-600' : risk >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {risk} / 100
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full score-fill ${risk >= 70 ? 'bg-red-500' : risk >= 40 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                style={{ width: `${risk}%` }}
              />
            </div>
          </div>

          {/* Detected patterns */}
          {result.detected_patterns?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">Detected patterns</p>
              <div className="space-y-1.5">
                {result.detected_patterns.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-[13px] text-gray-700">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    {p}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reset */}
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
            >
              <RotateCcw size={13} /> Analyse another file
            </button>
          </div>
        </div>
      )}

      {/* Info cards */}
      {!result && !loading && (
        <div className="bg-white border border-gray-100 rounded-2xl p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-3">What we detect</p>
          <div className="grid grid-cols-2 gap-2">
            {['AI-synthesised speech','Voice cloning attacks','Deepfake audio','Unusual frequency patterns','Unnatural speech cadence','Digital audio artifacts'].map(t => (
              <div key={t} className="flex items-center gap-2 text-[12px] text-gray-600">
                <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                {t}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}