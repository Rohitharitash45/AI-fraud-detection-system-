import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getHistory, getMyStats } from '../api'
import {
  Search, AlertTriangle, ShieldCheck, Users,
  TrendingUp, TrendingDown, ArrowRight, Clock,
  ChevronDown, MessageSquare, FileImage, Mic, 
  Database, Zap, ShieldAlert, Globe, Phone, FileText, Layers
} from 'lucide-react'

// --- Helper: Get scan details for the Ledger ---
const getScanInfo = (scan) => {
  const type = scan.type || 'url';
  // Fallback chain to find whatever content was scanned
  const content = scan.content || scan.url || scan.text || scan.number || scan.filename || "Direct API Analysis";
  
  const config = {
    url:   { icon: <Globe size={16} />, color: 'text-blue-600', bg: 'bg-blue-50', label: 'URL' },
    sms:   { icon: <MessageSquare size={16} />, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'SMS' },
    phone: { icon: <Phone size={16} />, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'PHONE' },
    ocr:   { icon: <FileText size={16} />, color: 'text-amber-600', bg: 'bg-amber-50', label: 'IMAGE' },
    voice: { icon: <Mic size={16} />, color: 'text-red-600', bg: 'bg-red-50', label: 'VOICE' },
    multi: { icon: <Layers size={16} />, color: 'text-purple-600', bg: 'bg-purple-50', label: 'BULK' },
  };

  return { ...(config[type] || config.url), content };
};

// --- Sub-components ---

function StatCard({ icon: Icon, iconBg, iconColor, label, value, trend, trendUp }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 ${iconBg} rounded-xl flex items-center justify-center`}>
          <Icon size={17} className={iconColor} strokeWidth={2} />
        </div>
        <span className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full
          ${trendUp ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
          {trendUp ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {trend}
        </span>
      </div>
      <p className="font-bold text-2xl text-gray-900 leading-tight tracking-tight">{value}</p>
      <p className="text-[12px] text-gray-400 mt-1 font-medium">{label}</p>
    </div>
  )
}

const TOOLS = [
  { title: 'URL Scanner', path: '/scan', icon: Search, color: 'blue', hoverBg: 'bg-blue-600', features: ['Phishing Links', 'Malware Check', 'Domain Safety'] },
  { title: 'SMS Detector', path: '/sms-scan', icon: MessageSquare, color: 'indigo', hoverBg: 'bg-indigo-600', features: ['Smishing Detection', 'OTP Fraud', 'Scam Messages'] },
  { title: 'OCR Scanner', path: '/ocr-scan', icon: FileImage, color: 'amber', hoverBg: 'bg-amber-500', features: ['Image Analysis', 'Hidden Links', 'Screenshot Scans'] },
  { title: 'Voice Detector', path: '/voice-scan', icon: Mic, color: 'red', hoverBg: 'bg-red-600', features: ['Deepfake Audio', 'AI Voice Check', 'Social Engineering'] },
];

export default function Dashboard() {
  const [stats, setStats] = useState({ total_scans: 0, scams_detected: 0, community_reports: 0 })
  const [history, setHistory] = useState([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [sRes, hRes] = await Promise.all([getMyStats(), getHistory()]);
        setStats(sRes.data);
        setHistory(hRes.data || []);
      } catch (err) {
        console.error("Dashboard initialization failed", err);
      } finally {
        setLoading(false)
      }
    };
    loadData();
  }, [])

  const visibleHistory = isExpanded ? history : history.slice(0, 6)

  return (
    <div className="space-y-6 max-w-[1100px] mx-auto pb-12 animate-in fade-in duration-500">
      
      {/* 1. Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-2xl text-gray-900 tracking-tight">Command Center</h2>
          <p className="text-[13px] text-gray-400 mt-0.5">Real-time threat monitoring and ML dataset collection.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl border border-blue-100">
          <Zap size={14} className="fill-blue-600" />
          <span className="text-[10px] font-black uppercase tracking-widest">AI Protection Active</span>
        </div>
      </div>

      {/* 2. Tool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {TOOLS.map((tool) => (
          <Link key={tool.title} to={tool.path} className="group relative h-40 bg-white border border-gray-200 rounded-2xl p-5 overflow-hidden transition-all duration-300 hover:shadow-xl">
            <div className="group-hover:opacity-0 transition-all duration-300">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-slate-50 text-slate-600`}>
                <tool.icon size={20} />
              </div>
              <h3 className="font-bold text-gray-900 text-sm">{tool.title}</h3>
              <p className="text-[10px] text-gray-400 mt-1 uppercase font-black">Launch Tool</p>
            </div>
            <div className={`absolute inset-0 ${tool.hoverBg} p-5 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex flex-col justify-center text-white`}>
              {tool.features.map(f => <div key={f} className="text-[10px] font-bold uppercase mb-1 flex items-center gap-2"><div className="w-1 h-1 bg-white rounded-full" /> {f}</div>)}
              <div className="mt-4 pt-3 border-t border-white/20 text-center text-xs font-black uppercase">Scan Now <ArrowRight size={14} className="inline ml-1" /></div>
            </div>
          </Link>
        ))}
      </div>

      {/* 3. Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Search} iconBg="bg-blue-50" iconColor="text-blue-600" label="Total scans" value={stats.total_scans.toLocaleString()} trend="+12%" trendUp />
        <StatCard icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-500" label="Scams blocked" value={stats.scams_detected.toLocaleString()} trend="-5%" trendUp={false} />
        <StatCard icon={ShieldCheck} iconBg="bg-emerald-50" iconColor="text-emerald-600" label="Accuracy rate" value="98.2%" trend="+3%" trendUp />
        <StatCard icon={Users} iconBg="bg-amber-50" iconColor="text-amber-600" label="Reports" value={stats.community_reports.toLocaleString()} trend="+8%" trendUp />
      </div>

      {/* 4. Audit Ledger */}
      <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-gray-900 text-sm">Security Audit Ledger</h3>
            <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-md">{history.length} SAMPLES</span>
          </div>
          <button onClick={() => setIsExpanded(!isExpanded)} className="text-[11px] font-black uppercase text-blue-600 flex items-center gap-1">
            {isExpanded ? 'Minimize' : 'See Full Log'} <ChevronDown size={14} className={isExpanded ? 'rotate-180' : ''} />
          </button>
        </div>

        <div className="divide-y divide-gray-50 px-2 max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="py-20 text-center text-gray-400 text-xs italic font-medium">Synchronizing security history dataset...</div>
          ) : history.length > 0 ? (
            visibleHistory.map((scan, i) => {
              const { icon, color, bg, label, content } = getScanInfo(scan);
              const isCritical = scan.result?.score >= 75 || scan.result?.status === 'SCAM';

              return (
                <div key={i} className={`flex items-center gap-4 py-4 px-4 transition-colors rounded-2xl mb-1 ${isCritical ? 'bg-red-50/40 hover:bg-red-50/60' : 'hover:bg-gray-50'}`}>
                  <div className={`p-2.5 rounded-xl ${isCritical ? 'bg-red-100 text-red-600' : `${bg} ${color}`}`}>
                    {isCritical ? <ShieldAlert size={16} /> : icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[13px] font-bold text-gray-900 truncate">{content}</p>
                      <span className="text-[9px] font-black bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">{label}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-black tracking-tighter uppercase">{new Date(scan.timestamp).toLocaleString()}</p>
                  </div>
                  <div className="text-right flex items-center gap-6">
                    <div className="hidden sm:block">
                      <p className="text-[9px] font-black text-gray-300 uppercase tracking-tighter text-right">Score</p>
                      <p className={`text-sm font-black ${isCritical ? 'text-red-600' : 'text-emerald-600'}`}>{scan.result?.score || (isCritical ? 98 : 0)}%</p>
                    </div>
                    <div className={`min-w-[85px] text-center px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${isCritical ? 'bg-red-600 text-white' : 'bg-emerald-50 text-emerald-600'}`}>
                      {scan.result?.status || 'SAFE'}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-20 text-center text-gray-400 text-xs">No scan history recorded.</div>
          )}
        </div>
      </div>
    </div>
  )
}