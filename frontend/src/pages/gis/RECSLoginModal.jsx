import React, { useState } from 'react';
import { X, HelpCircle, Settings as SettingsIcon, Globe, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RECSLoginModal({ isOpen, onClose, onLoginSuccess, currentUser }) {
  const [username, setUsername] = useState(currentUser?.username || 'hwgo go1');
  const [password, setPassword] = useState('******');
  const [showSettings, setShowSettings] = useState(false);
  const [showLanguage, setShowLanguage] = useState(false);
  const [selectedLang, setSelectedLang] = useState('English');
  const [crsSetting, setCrsSetting] = useState('EPSG:20137 - Adindan / UTM zone 37N');
  const [dbHost, setDbHost] = useState('localhost:5432 / crprs_spatial');

  if (!isOpen) return null;

  const handleLogin = (e) => {
    e.preventDefault();
    if (!username.trim()) {
      toast.error('Please enter username');
      return;
    }
    toast.success(`RECS v1.0.4 Authenticated: ${username}`);
    onLoginSuccess({
      username: username.trim(),
      role: 'GO',
      crs: crsSetting,
      language: selectedLang
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      {/* Exact replica of RECS Login Window (Screenshot 1: media_1791102699986.png) */}
      <div className="w-[520px] bg-[#f0f0f0] border-2 border-[#1e3a5f] shadow-2xl rounded-xs overflow-hidden font-sans text-slate-800 select-none">
        {/* Title bar */}
        <div className="bg-white border-b border-slate-300 px-2 py-1 flex items-center justify-between text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-1.5">
            {/* Blue diamond icon */}
            <span className="text-[#0066cc] font-bold text-sm">◆</span>
            <span>Login</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={() => toast('RECS v1.0.4 Help: Enter credentials to access Cadastre GIS tools', { icon: 'ℹ️' })}
              className="text-slate-500 hover:text-slate-800"
              title="Help"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="text-slate-500 hover:text-red-600 font-bold"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Menu bar (Dark navy/slate) */}
        <div className="bg-[#1b365d] text-white px-3 py-1 flex items-center gap-4 text-xs font-medium border-b border-[#0f2442] relative">
          <div className="relative">
            <button 
              type="button" 
              onClick={() => { setShowSettings(!showSettings); setShowLanguage(false); }}
              className="hover:text-blue-200 transition px-1 py-0.5"
            >
              Setting
            </button>
            {showSettings && (
              <div className="absolute left-0 top-full mt-1 w-64 bg-white text-slate-800 shadow-xl border border-slate-300 rounded p-3 z-50 text-xs">
                <div className="font-bold text-[#1b365d] border-b pb-1 mb-2">RECS System Settings</div>
                <div className="mb-2">
                  <label className="block text-[11px] text-slate-500 mb-0.5">Coordinate System (CRS):</label>
                  <select 
                    value={crsSetting} 
                    onChange={e => setCrsSetting(e.target.value)} 
                    className="w-full border border-slate-300 rounded p-1 text-xs"
                  >
                    <option value="EPSG:20137 - Adindan / UTM zone 37N">EPSG:20137 - Adindan / UTM zone 37N</option>
                    <option value="EPSG:20138 - Adindan / UTM zone 38N">EPSG:20138 - Adindan / UTM zone 38N</option>
                    <option value="EPSG:4326 - WGS 84 Geographic">EPSG:4326 - WGS 84 Geographic</option>
                  </select>
                </div>
                <div className="mb-2">
                  <label className="block text-[11px] text-slate-500 mb-0.5">PostGIS Server Host:</label>
                  <input 
                    type="text" 
                    value={dbHost} 
                    onChange={e => setDbHost(e.target.value)} 
                    className="w-full border border-slate-300 rounded p-1 text-xs"
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => { setShowSettings(false); toast.success('Settings saved'); }}
                  className="w-full bg-[#0078d7] text-white py-1 rounded text-xs hover:bg-[#005a9e]"
                >
                  Apply & Close
                </button>
              </div>
            )}
          </div>

          <div className="relative">
            <button 
              type="button" 
              onClick={() => { setShowLanguage(!showLanguage); setShowSettings(false); }}
              className="hover:text-blue-200 transition px-1 py-0.5"
            >
              Language
            </button>
            {showLanguage && (
              <div className="absolute left-0 top-full mt-1 w-44 bg-white text-slate-800 shadow-xl border border-slate-300 rounded py-1 z-50 text-xs">
                {['English', 'አማርኛ (Amharic)', 'Afaan Oromoo', 'ትግርኛ (Tigrinya)'].map(lang => (
                  <button 
                    key={lang} 
                    type="button"
                    onClick={() => { setSelectedLang(lang); setShowLanguage(false); toast.success(`Language set to ${lang}`); }}
                    className={`w-full text-left px-3 py-1.5 hover:bg-blue-50 flex items-center justify-between ${selectedLang === lang ? 'font-bold text-blue-700 bg-blue-50/50' : ''}`}
                  >
                    <span>{lang}</span>
                    {selectedLang === lang && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-6 bg-white min-h-[190px] flex">
          {/* Left: Bold blue NCRPRS logo */}
          <div className="w-1/3 flex items-center justify-center pr-4 border-r border-slate-200">
            <h1 className="text-3xl font-extrabold tracking-tight text-[#0066cc]">
              NCRPRS
            </h1>
          </div>

          {/* Right: Form inputs */}
          <div className="w-2/3 pl-6 flex flex-col justify-center">
            <h2 className="text-sm font-medium text-[#2d72b5] mb-4">
              Please Enter Username and Password
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <label className="w-20 text-slate-700 font-medium shrink-0">User Name</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex-1 border border-[#0078d7] outline-none px-2 py-1 text-xs rounded-none bg-white focus:ring-1 focus:ring-[#0078d7]"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2">
                <label className="w-20 text-slate-700 font-medium shrink-0">Password</label>
                <input 
                  type="password" 
                  value={password}
                  placeholder="Password"
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex-1 border border-slate-300 outline-none px-2 py-1 text-xs rounded-none bg-white focus:border-[#0078d7] focus:ring-1 focus:ring-[#0078d7]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-start gap-3 pt-3 pl-20">
                <button
                  type="submit"
                  className="bg-[#0078d7] hover:bg-[#0063b1] text-white text-xs font-medium px-5 py-1.5 rounded-none shadow-sm transition active:scale-95"
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="bg-[#e1e1e1] hover:bg-[#d0d0d0] text-slate-800 border border-slate-300 text-xs font-medium px-5 py-1.5 rounded-none shadow-sm transition active:scale-95"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>

        {/* Footer: INSA 2018 */}
        <div className="bg-[#f0f0f0] border-t border-slate-300 px-4 py-2 flex justify-end items-center text-[11px] text-slate-600">
          <span>Information Network Security Agency &copy; 2018</span>
        </div>
      </div>
    </div>
  );
}
