import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { analyzeProject } from '../services/api';
import {
  CloudUpload,
  Link as LinkIcon,
  Activity,
  HeartPulse,
  Clock,
  DollarSign,
  AlertTriangle,
  MoreHorizontal,
  Plus,
  BarChart2,
  FileText
} from 'lucide-react';

const Dashboard = () => {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showInjector, setShowInjector] = useState(false);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!url && !file) return;

    setLoading(true);
    setError(null);
    try {
      const data = await analyzeProject(url, file);
      if (data && data.project_id) {
        navigate(`/project/${data.project_id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "System overload: Target unreachable.");
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in pb-12">

      {/* Header Area */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Dashboard Overview
            <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/20 px-2 py-0.5 rounded text-xs font-mono font-bold uppercase tracking-widest mt-1">Q3 2024</span>
          </h1>
        </div>

        <button
          onClick={() => setShowInjector(!showInjector)}
          className="bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 border border-indigo-500"
        >
          <Plus className="h-4 w-4" /> New AI Analysis
        </button>
      </div>

      {/* Repository Injection UI (CYBERCORE style) */}
      {showInjector && (
        <div className="bg-white dark:bg-[#111827] border border-slate-300 dark:border-slate-700/50 rounded-2xl p-8 mb-8 relative overflow-hidden group shadow-2xl shadow-cyan-500/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -z-10 group-hover:bg-cyan-500/20 transition-colors"></div>

          <h2 className="text-xl font-black text-cyan-400 tracking-widest uppercase mb-1">Repository Injection</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm font-mono">Upload source code or connect a repository to initiate the neural analysis sequence.</p>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* DROP ARCHIVE zone - CYBERCORE style */}
            <div className="flex-1 flex flex-col md:flex-row gap-6 items-center">
              <div className="relative flex-shrink-0">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept=".zip,.pdf"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                      setUrl(''); // Clear URL if file is selected
                    }
                  }}
                />
                <div 
                  onClick={() => fileInputRef.current.click()}
                  className={`w-48 h-48 rounded-full border-2 border-dashed ${file ? 'border-indigo-500 bg-indigo-500/10' : 'border-cyan-500/40 bg-slate-50 dark:bg-[#0B1120]/80 hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]'} flex flex-col items-center justify-center transition-all cursor-pointer group/archive`}
                >
                  <CloudUpload className={`h-10 w-10 mb-2 ${file ? 'text-indigo-400' : 'text-cyan-400 group-hover/archive:text-cyan-300'}`} />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 text-center px-4 w-full truncate">
                     {file ? file.name : "Drop Archive"}
                  </span>
                  {!file && <span className="text-[10px] text-slate-500 mt-1 font-mono">.ZIP or .PDF Document</span>}
                </div>
                {!file && <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>}
              </div>

              <div className="flex-1 w-full max-w-md flex flex-col justify-center">
                <span className="text-xs font-mono text-cyan-400/80 mb-3 block text-center md:text-left">OR CONNECT URL</span>
                <form onSubmit={handleSubmit} className="relative group/input">
                  <div className="flex items-center bg-slate-50 dark:bg-[#0B1120] border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden focus-within:border-cyan-500/50 focus-within:shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all">
                    <span className="pl-3 text-slate-500 group-focus-within/input:text-cyan-400"><LinkIcon className="h-4 w-4" /></span>
                    <input
                      type="url"
                      className="w-full bg-transparent border-none py-3 px-3 text-slate-800 dark:text-slate-200 text-sm focus:outline-none focus:ring-0 placeholder-slate-400 dark:placeholder-slate-600 font-mono disabled:opacity-50"
                      placeholder="https://github.com/username/project"
                      value={url}
                      onChange={(e) => {
                          setUrl(e.target.value);
                          if (e.target.value) setFile(null);
                      }}
                      disabled={loading || file}
                    />
                    <button type="submit" disabled={(!url && !file) || loading} className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-2 px-5 rounded-r-lg text-xs uppercase tracking-wider transition-all active:scale-95">
                      Analyze →
                    </button>
                  </div>
                </form>

                {loading && (
                  <div className="mt-4 flex items-center gap-3 text-cyan-400 font-mono text-xs tracking-widest uppercase">
                    <Activity className="h-4 w-4 animate-pulse" /> neural agents analyzing...
                  </div>
                )}

                {error && (
                  <div className="mt-4 text-red-400 text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> {error}
                  </div>
                )}
              </div>
            </div>

            {/* Analysis Pipeline stages */}
            <div className="w-full lg:w-64 flex flex-col gap-3 p-4 bg-slate-50 dark:bg-[#0B1120]/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analysis Pipeline</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  <BarChart2 className="h-4 w-4" />
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400">Metrics: Extracting data</span>
              </div>
              <div className="flex items-center gap-2 opacity-60">
                <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                  <Clock className="h-4 w-4" />
                </div>
                <span className="text-xs text-slate-500">Effort: Estimating time</span>
              </div>
              <div className="flex items-center gap-2 opacity-60">
                <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                <span className="text-xs text-slate-500">Risks: Analyzing threats</span>
              </div>
              <div className="flex items-center gap-2 opacity-60">
                <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600">
                  <FileText className="h-4 w-4" />
                </div>
                <span className="text-xs text-slate-500">Report: Generating insights</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Key Metrics</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:border-slate-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-blue-500/10 p-2 rounded-lg">
                <HeartPulse className="h-5 w-5 text-blue-400" />
              </div>
              <span className="bg-slate-500/10 text-slate-500 dark:text-slate-400 text-xs font-bold px-2 py-0.5 rounded">--</span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">System Health</h3>
            <div className="text-3xl font-black text-slate-900 dark:text-white">--%</div>
          </div>

          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:border-slate-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-indigo-50 dark:bg-indigo-500/10 p-2 rounded-lg">
                <Clock className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="bg-slate-500/10 text-slate-500 dark:text-slate-400 text-xs font-bold px-2 py-0.5 rounded">--</span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Total Effort</h3>
            <div className="text-3xl font-black text-slate-900 dark:text-white">0<span className="text-xl text-slate-500 ml-1">hrs</span></div>
          </div>

          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:border-slate-700 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-emerald-500/10 p-2 rounded-lg">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <span className="bg-slate-500/10 text-slate-500 dark:text-slate-400 text-xs font-bold px-2 py-0.5 rounded">--</span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Projected Cost</h3>
            <div className="text-3xl font-black text-slate-900 dark:text-white">$0<span className="text-xl text-slate-500 ml-1">k</span></div>
          </div>

          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:border-slate-700 transition-colors shadow-[inset_0_0_20px_rgba(245,158,11,0.02)]">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-slate-500/10 p-2 rounded-lg border border-slate-500/20">
                <AlertTriangle className="h-5 w-5 text-slate-500" />
              </div>
              <span className="bg-slate-500/10 text-slate-500 text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider">N/A</span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">Risk Level</h3>
            <div className="text-2xl font-black text-slate-500 dark:text-slate-400">N/A</div>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Active Projects Table (Takes 2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active Projects</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold tracking-widest text-slate-500 uppercase bg-slate-50 dark:bg-[#0f172a]/50">
                    <th className="px-6 py-4 font-semibold">Project Name</th>
                    <th className="px-6 py-4 font-semibold">Owner</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Completion</th>
                    <th className="px-6 py-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-800/50">
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500 text-sm">
                      No active projects. Click "New AI Analysis" to begin.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Chart Placeholder */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-lg h-64 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-slate-900 dark:text-white font-bold">Code Complexity Trend</h3>
                <p className="text-slate-500 text-xs">Tracking cyclomatic complexity over time</p>
              </div>
              <div className="flex bg-slate-50 dark:bg-[#0f172a] rounded-lg p-1 border border-slate-200 dark:border-slate-800">
                <button className="px-3 py-1 bg-slate-700 text-slate-900 dark:text-white text-xs font-medium rounded-md shadow">1M</button>
                <button className="px-3 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 text-xs font-medium rounded-md">3M</button>
                <button className="px-3 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:text-slate-200 text-xs font-medium rounded-md">6M</button>
              </div>
            </div>
            <div className="flex-1 relative flex items-end">
              {/* Simple CSS Wave curve representation */}
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent"></div>
              <svg viewBox="0 0 100 20" className="w-full h-full preserve-3d" preserveAspectRatio="none">
                <path d="M0,15 Q10,20 20,15 T40,15 T60,25 T80,10 T100,15 L100,30 L0,30 Z" fill="transparent" stroke="#6366f1" strokeWidth="0.5" className="drop-shadow-[0_2px_4px_rgba(99,102,241,0.5)]"></path>
              </svg>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Recent Alerts */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Alerts</h2>
            <span className="bg-slate-500/10 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">0 New</span>
          </div>

          <div className="text-center py-8 text-slate-500 text-sm">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="h-5 w-5 text-slate-600" />
            </div>
            No new alerts. Your projects are healthy.
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
