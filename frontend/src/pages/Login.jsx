import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Shield, Lock, User, Compass, ArrowRight } from 'lucide-react';

const roleHomePages = {
  ADMIN: '/dashboard',
  FDO: '/applications',
  DO: '/do',
  RO: '/ro',
  SRO: '/sro',
  GO: '/recs',
  SGO: '/recs',
  PUBLIC: '/portal',
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { user } = await login(username, password);
      toast.success('Authentication successful! Welcome to CRPRS');
      navigate(roleHomePages[user.role] || '/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-[#123f32] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#d8ae47]/20 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#2d5046]/30 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full bg-[#0d2f2a]/90 border border-[#2d5046] backdrop-blur-xl rounded-2xl shadow-2xl p-8 z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-[#123f32] border border-[#d8ae47]/70 rounded-2xl text-[#f3d77b] mb-1">
            <Compass className="w-8 h-8 animate-spin-slow" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">LOGIN TO NCRPRS</h1>
          <p className="text-xs text-[#cfe0d5]">National Cadastre & Real Property Registration System</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#dfece6] mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-[#9ab9a5] absolute left-3 top-3" />
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full pl-9 pr-3 py-2.5 bg-[#123f32] border border-[#2d5046] rounded-lg text-white text-xs focus:outline-none focus:border-[#d8ae47] focus:ring-1 focus:ring-[#d8ae47] transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#dfece6] mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#9ab9a5] absolute left-3 top-3" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-3 py-2.5 bg-[#123f32] border border-[#2d5046] rounded-lg text-white text-xs focus:outline-none focus:border-[#d8ae47] focus:ring-1 focus:ring-[#d8ae47] transition"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#d8ae47] hover:bg-[#f3d77b] text-[#123f32] font-bold rounded-lg text-xs shadow-lg flex justify-center items-center gap-2 transition"
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-4 border-t border-[#2d5046]/80 space-y-2">
          <div className="text-[10px] text-[#cfe0d5] font-semibold uppercase text-center tracking-wider">Quick Demo Logins</div>
          <div className="grid grid-cols-4 gap-1.5 text-[10px]">
            <button onClick={() => handleQuickLogin('fdo', 'fdo123')} className="p-1.5 bg-[#123f32] hover:bg-[#1f5b47] text-[#f3d77b] rounded text-center font-bold">FDO</button>
            <button onClick={() => handleQuickLogin('do', 'do123')} className="p-1.5 bg-[#123f32] hover:bg-[#1f5b47] text-[#d8ae47] rounded text-center font-bold">DO</button>
            <button onClick={() => handleQuickLogin('ro', 'ro123')} className="p-1.5 bg-[#123f32] hover:bg-[#1f5b47] text-[#cfe0d5] rounded text-center font-bold">RO</button>
            <button onClick={() => handleQuickLogin('sro', 'sro123')} className="p-1.5 bg-[#123f32] hover:bg-[#1f5b47] text-[#f3d77b] rounded text-center font-bold">SRO</button>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10px]">
            <button onClick={() => handleQuickLogin('admin', 'admin123')} className="p-1.5 bg-[#123f32] hover:bg-[#1f5b47] text-[#f3d77b] rounded text-center font-bold">Admin</button>
            <button onClick={() => handleQuickLogin('go', 'go123')} className="p-1.5 bg-[#123f32] hover:bg-[#1f5b47] text-[#dfece6] rounded text-center font-bold">GIS (GO)</button>
          </div>
        </div>
      </div>
    </div>
  );
}