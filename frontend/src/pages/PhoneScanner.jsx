import { useState } from 'react';
import { checkNumber } from '../api';
import { Phone, ShieldCheck, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function PhoneScanner() {
  const [number, setNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleScan = async (e) => {
    e.preventDefault();
    if (!number) return;
    setLoading(true);
    try {
      const res = await checkNumber(number);
      setResult(res.data);
    } catch (err) {
      console.error("Scan failed", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <Link to="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-blue-600 transition-colors text-sm font-bold uppercase tracking-widest">
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
          <Phone size={32} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Phone Intelligence</h1>
        <p className="text-gray-500 text-sm">Identify fraudulent numbers and spam callers using PhishGuard AI.</p>
      </div>

      <form onSubmit={handleScan} className="bg-white p-2 rounded-3xl border border-gray-200 shadow-xl flex items-center gap-2 focus-within:ring-2 ring-blue-100 transition-all">
        <input 
          type="text" 
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          placeholder="Enter phone number (e.g. +91 98765 43210)"
          className="flex-1 bg-transparent px-6 py-4 text-gray-900 font-medium focus:outline-none"
        />
        <button 
          disabled={loading}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-100 disabled:opacity-50"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : 'Verify'}
        </button>
      </form>

      {result && (
        <div className={`p-8 rounded-3xl border-2 transition-all ${result.status === 'SCAM' ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${result.status === 'SCAM' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
                {result.status === 'SCAM' ? <AlertTriangle size={24} /> : <ShieldCheck size={24} />}
              </div>
              <div>
                <h3 className="font-black text-gray-900 uppercase tracking-tight text-xl">{result.status || 'SAFE'}</h3>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Analysis Result</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-gray-900">{result.score || 0}%</p>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Risk Level</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 font-medium leading-relaxed">{result.message || 'No threats detected for this number.'}</p>
        </div>
      )}
    </div>
  );
}