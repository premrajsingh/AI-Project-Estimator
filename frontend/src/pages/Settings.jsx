import React, { useState, useRef } from 'react';
import { Settings as SettingsIcon, User, Bell, Shield, Database, Clock, Download, Trash2, Key, Smartphone, UploadCloud } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || '{}'));
  const [name, setName] = useState(user.name || '');
  const [title, setTitle] = useState(user.title || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const fileInputRef = useRef(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const authHeaders = () => ({
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  });

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ text: 'Image must be smaller than 2MB', type: 'error' });
      return;
    }
    setAvatarLoading(true);
    setMessage({ text: '', type: '' });
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await fetch(`${API_BASE}/user/profile/avatar`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        const updatedUser = { ...user, avatar_url: data.avatar_url };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setMessage({ text: 'Avatar updated! Refresh to see changes in the sidebar.', type: 'success' });
      } else {
        const errData = await response.json();
        setMessage({ text: errData.detail || 'Failed to upload avatar.', type: 'error' });
      }
    } catch {
      setMessage({ text: 'Network error. Could not upload image.', type: 'error' });
    } finally {
      setAvatarLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleUpdatePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword !== confirmPassword) { setPasswordError('New passwords do not match'); return; }
    if (newPassword.length < 6) { setPasswordError('New password must be at least 6 characters'); return; }
    setIsPasswordLoading(true);
    try {
      const response = await fetch(`${API_BASE}/auth/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (response.ok) {
        setPasswordSuccess('Password updated successfully!');
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        setTimeout(() => { setIsUpdatingPassword(false); setPasswordSuccess(''); }, 3000);
      } else {
        const data = await response.json();
        setPasswordError(data.detail || 'Failed to update password');
      }
    } catch { setPasswordError('Network error. Could not connect to API.'); }
    finally { setIsPasswordLoading(false); }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setMessage({ text: '', type: '' });
    try {
      const response = await fetch(`${API_BASE}/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ name, title }),
      });
      if (response.ok) {
        const data = await response.json();
        // Preserve avatar_url from current user since API may not return it
        const updatedUser = { ...user, ...data };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setMessage({ text: 'Profile updated successfully!', type: 'success' });
        window.location.reload();
      } else {
        setMessage({ text: 'Failed to update profile.', type: 'error' });
      }
    } catch { setMessage({ text: 'Network error. Could not connect to API.', type: 'error' }); }
    finally { setLoading(false); }
  };

  const navBtn = (tab, icon, label) => (
    <button onClick={() => setActiveTab(tab)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-sm transition-colors text-left ${activeTab === tab ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
      {icon} {label}
    </button>
  );

  return (
    <div className="animate-fade-in pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Configuration Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your preferences, API connections, and notification settings.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 border-r border-slate-200 dark:border-slate-800 pr-4 space-y-1">
          {navBtn('profile', <User className="h-4 w-4" />, 'Profile Details')}
          {navBtn('preferences', <SettingsIcon className="h-4 w-4" />, 'Preferences')}
          {navBtn('notifications', <Bell className="h-4 w-4" />, 'Notifications')}
          {navBtn('security', <Shield className="h-4 w-4" />, 'Security')}
          {navBtn('data', <Database className="h-4 w-4" />, 'Data Management')}
        </div>

        <div className="lg:col-span-3 space-y-8 animate-fade-in">

          {activeTab === 'profile' && (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Profile Details</h2>
              {message.text && (
                <div className={`mb-6 p-4 rounded-lg text-sm ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20'}`}>
                  {message.text}
                </div>
              )}
              <div className="space-y-6">
                <div className="flex gap-6 items-center border-b border-slate-200 dark:border-slate-800 pb-6 group">
                  <div className="relative w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0 overflow-hidden border-2 border-slate-200 dark:border-slate-700 group-hover:border-indigo-500 transition-colors">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                    )}
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => fileInputRef.current?.click()}>
                      <UploadCloud className="w-6 h-6 text-white mb-1" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">Upload</span>
                    </div>
                  </div>
                  <div>
                    <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/png, image/jpeg, image/gif" />
                    <button onClick={() => fileInputRef.current?.click()} disabled={avatarLoading}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                      {avatarLoading ? 'Uploading...' : 'Change Avatar'}
                    </button>
                    <p className="text-xs text-slate-500 mt-2">JPG, GIF or PNG. Max size of 2MB</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Full Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Email (Read-Only)</label>
                    <input type="email" value={user.email || ''} disabled
                      className="w-full bg-slate-100 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-400 dark:text-slate-500 cursor-not-allowed" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Role / Title</label>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. VP of Engineering"
                      className="w-full bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
                  </div>
                </div>
                <div className="pt-4">
                  <button onClick={handleSaveProfile} disabled={loading}
                    className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'preferences' && (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Application Preferences</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
                  <div>
                    <h3 className="text-slate-800 dark:text-slate-200 font-medium">Dark Mode</h3>
                    <p className="text-slate-500 text-sm">Force dark theme across the application</p>
                  </div>
                  <div className="w-12 h-6 bg-indigo-500 rounded-full relative cursor-pointer">
                    <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                  </div>
                </div>
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
                  <div>
                    <h3 className="text-slate-800 dark:text-slate-200 font-medium">Default Analysis View</h3>
                    <p className="text-slate-500 text-sm">Choose the default tab when opening a report</p>
                  </div>
                  <select className="bg-slate-50 dark:bg-[#0f172a] border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 focus:outline-none">
                    <option>Executive Summary</option>
                    <option>Technical Details</option>
                    <option>Risk Assessment</option>
                  </select>
                </div>
                <div className="pt-4">
                  <button className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors">
                    Save Preferences
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Notification Settings</h2>
              <div className="space-y-6">
                {[
                  { title: 'Analysis Completed Alert', desc: 'Receive email when AI finishes processing a large repo' },
                  { title: 'Critical Risk Detection', desc: 'Immediate notification for high severity vulnerabilities' },
                  { title: 'Weekly Summary Report', desc: 'Get a weekly digest of all project health statuses' },
                ].map((item) => (
                  <div key={item.title} className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6">
                    <div>
                      <h3 className="text-slate-800 dark:text-slate-200 font-medium">{item.title}</h3>
                      <p className="text-slate-500 text-sm">{item.desc}</p>
                    </div>
                    <div className="w-12 h-6 bg-indigo-500 rounded-full relative cursor-pointer">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Security Settings</h2>
              {passwordError && <div className="mb-6 p-4 rounded-lg text-sm bg-red-500/10 text-red-500 border border-red-500/20">{passwordError}</div>}
              {passwordSuccess && <div className="mb-6 p-4 rounded-lg text-sm bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">{passwordSuccess}</div>}
              <div className="space-y-6">
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-slate-50 dark:bg-[#0f172a]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-lg"><Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
                      <div>
                        <h3 className="text-slate-800 dark:text-slate-200 font-medium">Account Password</h3>
                        <p className="text-slate-500 text-sm">Manage your login credentials</p>
                      </div>
                    </div>
                    <button onClick={() => setIsUpdatingPassword(!isUpdatingPassword)}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                      {isUpdatingPassword ? 'Cancel' : 'Update'}
                    </button>
                  </div>
                  {isUpdatingPassword && (
                    <div className="mt-6 space-y-4 border-t border-slate-200 dark:border-slate-700 pt-6 animate-fade-in">
                      {[
                        { label: 'Current Password', val: currentPassword, set: setCurrentPassword },
                        { label: 'New Password', val: newPassword, set: setNewPassword },
                        { label: 'Confirm New Password', val: confirmPassword, set: setConfirmPassword },
                      ].map(({ label, val, set }) => (
                        <div key={label} className="space-y-2">
                          <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">{label}</label>
                          <input type="password" value={val} onChange={(e) => set(e.target.value)}
                            className="w-full max-w-md bg-white dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500" />
                        </div>
                      ))}
                      <button onClick={handleUpdatePassword}
                        disabled={isPasswordLoading || !currentPassword || !newPassword || !confirmPassword}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                        {isPasswordLoading ? 'Saving...' : 'Save New Password'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex items-center justify-between bg-slate-50 dark:bg-[#0f172a]">
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-lg"><Smartphone className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
                    <div>
                      <h3 className="text-slate-800 dark:text-slate-200 font-medium">Two-Factor Authentication</h3>
                      <p className="text-slate-500 text-sm">Currently disabled</p>
                    </div>
                  </div>
                  <button className="px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">Enable 2FA</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-8">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Data Management</h2>
              <div className="space-y-8">
                <div>
                  <h3 className="text-slate-800 dark:text-slate-200 font-medium mb-2">Export Data</h3>
                  <p className="text-slate-500 text-sm mb-4">Download all your project analysis reports in JSON format.</p>
                  <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 transition-colors">
                    <Download className="w-4 h-4" /> Export All Data
                  </button>
                </div>
                <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
                  <h3 className="text-red-400 font-medium mb-2">Danger Zone</h3>
                  <p className="text-slate-500 text-sm mb-4">Permanently delete your account and all associated project data. This action cannot be undone.</p>
                  <button className="flex items-center gap-2 px-4 py-2 border border-red-500/50 hover:bg-red-500/10 text-red-500 rounded-lg text-sm transition-colors">
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
