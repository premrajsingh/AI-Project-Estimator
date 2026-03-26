import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ReportView from './pages/ReportView';
import RiskAnalysis from './pages/RiskAnalysis';
import SettingsView from './pages/Settings';
import Projects from './pages/Projects';
import Repositories from './pages/Repositories';
import Reports from './pages/Reports';
import ProjectPlanning from './pages/ProjectPlanning';
import {
  BarChart2,
  Bell,
  Settings,
  User,
  Search,
  LayoutDashboard,
  FolderOpen,
  GitBranch,
  ShieldAlert,
  FileText,
  Plus,
  Sun,
  Moon,
  LogOut,
  Lightbulb
} from 'lucide-react';
import { useTheme } from './context/ThemeContext';

// Navigation Sidebar Component
const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;
  
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="w-64 bg-white dark:bg-[#0f172a] border-r border-slate-200 dark:border-slate-800 flex flex-col h-screen sticky top-0 transition-colors">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 dark:border-slate-800">
        <div className="bg-gradient-to-br from-indigo-500 to-cyan-400 p-1.5 rounded mr-3">
          <BarChart2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-slate-900 dark:text-white font-bold leading-none tracking-tight">AI Project Analyst</h1>
          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono uppercase tracking-widest">Project Health AI</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        <Link to="/dashboard" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group ${isActive('/dashboard') ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
          <LayoutDashboard className={`h-5 w-5 mr-3 ${isActive('/dashboard') ? 'text-indigo-600 dark:text-indigo-400' : 'group-hover:text-slate-900 dark:group-hover:text-slate-300'}`} />
          <span className="font-medium text-sm">Dashboard</span>
        </Link>
        <Link to="/planning" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group ${isActive('/planning') ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
          <Lightbulb className={`h-5 w-5 mr-3 ${isActive('/planning') ? 'text-indigo-600 dark:text-indigo-400' : 'group-hover:text-amber-500'}`} />
          <span className="font-medium text-sm">Idea Estimator</span>
        </Link>
        <Link to="/projects" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group ${isActive('/projects') ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
          <FolderOpen className={`h-5 w-5 mr-3 ${isActive('/projects') ? 'text-indigo-600 dark:text-indigo-400' : 'group-hover:text-slate-900 dark:group-hover:text-slate-300'}`} />
          <span className="font-medium text-sm">Projects</span>
        </Link>
        <Link to="/repositories" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group ${isActive('/repositories') ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
          <GitBranch className={`h-5 w-5 mr-3 ${isActive('/repositories') ? 'text-indigo-600 dark:text-indigo-400' : 'group-hover:text-slate-900 dark:group-hover:text-slate-300'}`} />
          <span className="font-medium text-sm">Repositories</span>
        </Link>
        <Link to="/risk-analysis" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group ${isActive('/risk-analysis') ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
          <ShieldAlert className={`h-5 w-5 mr-3 ${isActive('/risk-analysis') ? 'text-indigo-600 dark:text-indigo-400' : 'group-hover:text-slate-900 dark:group-hover:text-slate-300'}`} />
          <span className="font-medium text-sm">Risk Analysis</span>
        </Link>
        <Link to="/reports" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group ${isActive('/reports') ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
          <FileText className={`h-5 w-5 mr-3 ${isActive('/reports') ? 'text-indigo-600 dark:text-indigo-400' : 'group-hover:text-slate-900 dark:group-hover:text-slate-300'}`} />
          <span className="font-medium text-sm">Reports</span>
        </Link>
        <Link to="/settings" className={`flex items-center px-3 py-2.5 rounded-lg transition-colors group ${isActive('/settings') ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50'}`}>
          <Settings className={`h-5 w-5 mr-3 ${isActive('/settings') ? 'text-indigo-600 dark:text-indigo-400' : 'group-hover:text-slate-900 dark:group-hover:text-slate-300'}`} />
          <span className="font-medium text-sm">Settings</span>
        </Link>
      </nav>

      {/* Bottom Action Area */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <Link to="/dashboard" className="w-full flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-medium text-sm transition-colors shadow-lg shadow-indigo-500/20">
          <Plus className="h-4 w-4 mr-2" /> New Project
        </Link>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden mr-3 border border-slate-200 dark:border-slate-600">
            {user.avatar_url ? (
               <img src={user.avatar_url} alt="Profile" className="h-full w-full object-cover" />
            ) : (
               <User className="h-6 w-6 text-slate-400" />
            )}
          </div>
          <div className="overflow-hidden">
            <div className="text-slate-900 dark:text-white text-sm font-bold truncate max-w-[100px]">{user.name || 'User'}</div>
            <div className="text-slate-500 text-xs truncate max-w-[100px]">{user.email || 'Email'}</div>
          </div>
        </div>
        <button 
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

// Top Header Component
const Header = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sticky top-0 z-40 transition-colors">
      <div className="flex-1 max-w-lg hidden md:block">
        <div className="relative group">
          <input
            type="text"
            placeholder="Search projects..."
            className="w-full bg-slate-100 dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-lg py-1.5 pl-10 pr-4 text-sm text-slate-900 dark:text-slate-300 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-400 dark:placeholder-slate-500"
          />
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-6 ml-auto">
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors flex items-center justify-center"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <div className="flex items-center bg-emerald-100 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1 rounded-full text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-emerald-400 mr-2 animate-pulse"></span>
          SYSTEM ONLINE
        </div>
        <button className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-1 -right-1 block h-2.5 w-2.5 rounded-full bg-red-500 border-2 border-white dark:border-[#0f172a]"></span>
        </button>
      </div>
    </header>
  );
};

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const DashboardLayout = ({ children }) => (
  <div className="flex min-h-screen bg-slate-50 dark:bg-[#0b1120] text-slate-900 dark:text-slate-200 font-sans selection:bg-indigo-500/30 relative z-10 transition-colors">
    <Sidebar />
    <div className="flex-1 flex flex-col min-w-0">
      <Header />
      <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  </div>
);

const GuestLayout = ({ children }) => (
  <div className="min-h-screen bg-slate-900 text-slate-200 font-sans selection:bg-indigo-500/30 font-sans">
    <nav className="w-full bg-slate-900/80 backdrop-blur-md border-b border-slate-800 z-50 sticky top-0">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-500 to-cyan-400 p-1.5 rounded">
               <BarChart2 className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">AI Project Estimator</span>
          </Link>
          <div className="flex items-center gap-4">
             <Link to="/register" className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)]">
               Sign Up to Save
             </Link>
          </div>
        </div>
    </nav>
    <main className="flex-1 p-6 lg:p-8 overflow-y-auto w-full">
      {children}
    </main>
  </div>
);

const HybridProjectRoute = () => {
  const token = localStorage.getItem('token');
  if (token) {
    return <DashboardLayout><ReportView /></DashboardLayout>;
  }
  return <GuestLayout><ReportView /></GuestLayout>;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Dashboard Routes */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardLayout><Dashboard /></DashboardLayout></PrivateRoute>} />
        <Route path="/planning" element={<PrivateRoute><DashboardLayout><ProjectPlanning /></DashboardLayout></PrivateRoute>} />
        <Route path="/project/:id" element={<HybridProjectRoute />} />
        <Route path="/projects" element={<PrivateRoute><DashboardLayout><Projects /></DashboardLayout></PrivateRoute>} />
        <Route path="/repositories" element={<PrivateRoute><DashboardLayout><Repositories /></DashboardLayout></PrivateRoute>} />
        <Route path="/risk-analysis" element={<PrivateRoute><DashboardLayout><RiskAnalysis /></DashboardLayout></PrivateRoute>} />
        <Route path="/reports" element={<PrivateRoute><DashboardLayout><Reports /></DashboardLayout></PrivateRoute>} />
        <Route path="/settings" element={<PrivateRoute><DashboardLayout><SettingsView /></DashboardLayout></PrivateRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
