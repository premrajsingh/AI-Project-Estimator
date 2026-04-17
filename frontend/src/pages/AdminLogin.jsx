import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, AlertTriangle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE}/auth/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/dashboard');
      } else {
        setError(data.detail || 'Failed to authenticate admin');
      }
    } catch (err) {
      setError('Network error. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b1120] px-4 sm:px-6 lg:px-8 font-sans">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-900/10 blur-[100px] rounded-full pointer-events-none"></div>
      
      <div className="max-w-md w-full space-y-8 p-10 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-red-900/50 shadow-2xl relative z-10">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center justify-center gap-2 mb-4 cursor-pointer">
            <div className="bg-gradient-to-br from-red-600 to-orange-500 p-3 rounded-xl shadow-[0_0_20px_rgba(220,38,38,0.3)]">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </Link>
          <h2 className="text-3xl font-bold text-white tracking-tight uppercase">Admin Area</h2>
          <p className="mt-2 text-sm text-red-500 flex justify-center items-center gap-1 font-medium tracking-widest">
            <AlertTriangle className="h-4 w-4" /> RESTRICTED ACCESS
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleAdminLogin}>
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 p-3 rounded-lg flex items-center gap-3 text-red-500 text-sm animate-pulse">
               <AlertTriangle className="h-5 w-5 flex-shrink-0" />
               <p className="font-semibold">{error}</p>
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Admin Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email" required
                  className="block w-full pl-10 bg-black/50 border border-slate-700/50 rounded-lg py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                  placeholder="admin@estimator.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Verification Code / Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password" required
                  className="block w-full pl-10 bg-black/50 border border-slate-700/50 rounded-lg py-3 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent transition-all"
                  placeholder="••••••••••"
                  value={password} onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full flex justify-center py-3.5 px-4 rounded-lg text-sm font-bold tracking-wide text-white bg-gradient-to-r from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(220,38,38,0.4)]"
          >
            {loading ? 'AUTHENTICATING...' : 'SECURE LOGIN'}
          </button>
          <div className="text-center pt-4 border-t border-slate-800">
             <Link to="/login" className="text-slate-500 text-sm hover:text-slate-300 transition-colors">
                Return to Public User Login
             </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
