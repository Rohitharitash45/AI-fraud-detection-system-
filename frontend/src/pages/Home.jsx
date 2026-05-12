import { useState, useEffect } from 'react';
import { scanUrl, scanSms } from '../api';
import { 
  ShieldCheck, AlertTriangle, CheckCircle2, Loader2, 
  Lightbulb, Info, Link as LinkIcon, MessageSquare 
} from 'lucide-react';

// Pass 'url' or 'sms' as a prop to reuse the same design for both pages
export default function ScannerPage({ mode = 'url' }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [input, setInput] = useState('');

  // Auto-reset when the component mounts/unmounts
  useEffect(() => {
    setResult(null);
    setInput('');
  }, [mode]);

  const config = {
    url: {
      title: 'URL Scanner',
      placeholder: 'https://example.com...',
      icon: LinkIcon,
      gradient: 'from-blue-600 to-blue-700',
    },
    sms: {
      title: 'SMS Detector',
      placeholder: 'Paste the SMS text here...',
      icon: MessageSquare,
      gradient: 'from-indigo-600 to-indigo-700',
    }
  };

  const active = config[mode];

  const handleScan = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const r = mode === 'url' ? await scanUrl(input) : await scanSms(input);
      setResult(r.data);
    } catch (err) {
      console.error("Scan failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-[1000px] mx-auto space-y-8 animate-in fade-in duration-500">
      {/* 1. Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{active.title}</h1>
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
          <ShieldCheck size={14} />
          <span className="text-[10px] font-black uppercase tracking-wider">AI Guard Active</span>
        </div>
      </div>

      {/* 2. Main Scanner Box */}
      <div className={`bg-gradient-to-br ${active.gradient} rounded-3xl p-10 shadow-xl relative overflow-hidden transition-all duration-500`}>
        <div className="relative z-10">
          <h2 className="text-white text-xl font-bold mb-2">Analyze {mode.toUpperCase()} instantly</h2>
          <p className="text-white/70 text-sm mb-8">Powered by AI — detects phishing, malware & social engineering.</p>
          
          <form onSubmit={handleScan} className="flex gap-3">
            <div className="relative flex-1">
              <active.icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={active.placeholder}
                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-2xl text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/40 backdrop-blur-md transition"
              />
            </div>
            <button 
              disabled={loading || !input} 
              className="px-10 bg-white text-gray-900 font-bold rounded-2xl hover:bg-gray-100 disabled:opacity-50 transition shadow-lg flex items-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : 'Scan now'}
            </button>
          </form>
        </div>

        {/* Decorative Background */}
        <div className="absolute -right-10 -top-10 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* 3. Replacement Content: Insights (Hidden when result is shown) */}
      {!result && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-amber-50 border border-amber-100 p-6 rounded-2xl flex gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-xl h-fit">
              <Lightbulb size={20} />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 text-sm">Security Tip</h4>
              <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                Check for "Urgency". Scammers often use threats like "Your account will be suspended" to make you act without thinking.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex gap-4">
            <div className="p-3 bg-slate-200 text-slate-600 rounded-xl h-fit">
              <Info size={20} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">How it works</h4>
              <p className="text-slate-600 text-xs mt-1 leading-relaxed">
                Our model analyzes intent, sender reputation, and URL redirects to calculate a risk score in seconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4. Result UI */}
      {result && (
        <ResultCard 
          result={result} 
          input={input} 
          onReset={() => {setResult(null); setInput('')}} 
        />
      )}
    </div>
  );
}

function ResultCard({ result, input, onReset }) {
  const score = result.score || 0;
  const isScam = result.status === 'SCAM';
  
  const getBarColor = () => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 40) return 'bg-amber-400';
    return 'bg-emerald-500';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-3xl p-8 animate-in zoom-in-95 duration-300">
      <div className="flex justify-between items-start mb-6">
        <div className="flex gap-4">
          <div className={`p-4 rounded-2xl ${isScam ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {isScam ? <AlertTriangle size={28} /> : <CheckCircle2 size={28} />}
          </div>
          <div>
            <h3 className={`text-xl font-bold ${isScam ? 'text-red-600' : 'text-emerald-600'}`}>
              {isScam ? 'Scam Detected' : 'Content is Safe'}
            </h3>
            <p className="text-gray-400 text-xs mt-1">Analysis for: <span className="italic">"{input}"</span></p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Risk Score</p>
          <p className={`text-3xl font-black ${score >= 70 ? 'text-red-600' : 'text-emerald-600'}`}>{score}%</p>
        </div>
      </div>

      <div className="h-2 bg-gray-100 rounded-full mb-8 overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 rounded-full ${getBarColor()}`}
          style={{ width: `${score}%` }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Detection Flags</p>
          <div className="flex flex-wrap gap-2">
            {result.reasons?.map((reason, i) => (
              <div key={i} className="px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-lg flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isScam ? 'bg-red-400' : 'bg-emerald-400'}`} />
                <span className="text-[11px] text-gray-600 font-bold uppercase">{reason}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-end justify-end">
          <button onClick={onReset} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition">
            Perform New Analysis
          </button>
        </div>
      </div>
    </div>
  );
}