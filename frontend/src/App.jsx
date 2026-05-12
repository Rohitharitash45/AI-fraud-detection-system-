import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layout
import Layout from './layout/Layout';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Home from './pages/Home'; // This is your URL Scanner
import MultiScan from './pages/multipleScan';
import OcrScan from './pages/Ocrscan';
import VoiceScan from './pages/Voice_detector';
import Profile from './pages/Profile';
//import PhoneNumberChecker from './pages/PhoneScanner';
import SmsScan from './pages/sms-detector'; // Ensure this matches the exported name in your file
import PhoneScanner from './pages/PhoneScanner';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafd]">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="scan" element={<Home />} />
            <Route path="sms-scan" element={<SmsScan />} />
            <Route path="multi-scan" element={<MultiScan />} />
            <Route path="ocr-scan" element={<OcrScan />} />
            <Route path="voice-scan" element={<VoiceScan />} />
            <Route path="phone-scan" element={<PhoneScanner/>} />
            <Route path="profile" element={<Profile />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}