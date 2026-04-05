import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { analyzeProject, getAllProjects } from '../services/api';
import {
  CloudUpload, Link as LinkIcon, Activity, HeartPulse, Clock,
  IndianRupee, AlertTriangle, Plus, BarChart2, FileText, ExternalLink,
  Github, XCircle, Users, BrainCircuit
} from 'lucide-react';

const statusBadge = (status) => {
  const map = {
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return `text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${map[status] || map.processing}`;
};

const isValidGitHubUrl = (url) => {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === 'github.com' || parsed.hostname === 'www.github.com') &&
      parsed.pathname.split('/').filter(Boolean).length >= 2
    );
  } catch {
    return false;
  }
};

const formatCost = (amount) => {
  if (!amount) return '₹0';
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000)    return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1000)       return `₹${Math.round(amount / 1000)}k`;
  return `₹${Math.round(amount)}`;
};

const Dashboard = () => {
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [urlError, setUrlError] = useState(null);
  const [hourlyRate, setHourlyRate] = useState(1000);
  const [dailyRate, setDailyRate] = useState(8000);
  const [numDevelopers, setNumDevelopers] = useState(1);
  const [seniority, setSeniority] = useState('Intermediate');
  const [showInjector, setShowInjector] = useState(true);
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const data = await getAllProjects();
        setProjects(data || []);
      } catch (e) {
        console.error('Failed to load projects', e);
      } finally {
        setProjectsLoading(false);
      }
    };
    loadProjects();
  }, []);

  const completedProjects = (projects || []).filter(p => p && p.status === 'completed');
  const totalEffort = completedProjects.reduce((sum, p) => sum + (p?.estimations?.predicted_effort_hours || 0), 0);
  const totalCost = completedProjects.reduce((sum, p) => sum + (p?.estimations?.predicted_cost_inr || (p?.estimations?.predicted_cost_dollars || 0) * 83 || 0), 0);
  const avgHealth = completedProjects.length
    ? Math.round(completedProjects.reduce((sum, p) => {
        const h = Math.max(40, 100 - (p?.metrics?.avg_complexity || 0) * 2 - (p?.metrics?.duplication_percentage || 0));
        return sum + h;
      }, 0) / completedProjects.length)
    : null;
  const criticalRisks = completedProjects.filter(p => Array.isArray(p?.risks) && p.risks.some(r => r && r.score >= 8)).length;

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    if (val) setFile(null);
    if (val && val.length > 15) {
      if (!isValidGitHubUrl(val)) {
        setUrlError('Only GitHub repository URLs are supported. Example: https://github.com/username/repository');
      } else {
        setUrlError(null);
      }
    } else {
      setUrlError(null);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!url && !file) return;

    if (url && !isValidGitHubUrl(url)) {
      setUrlError('Only GitHub repository URLs are supported. Example: https://github.com/username/repository');
      return;
    }

    setLoading(true);
    setError(null);
    setUrlError(null);
    try {
      const data = await analyzeProject(url || null, file, 0, 0, seniority);
      if (data && data.project_id) {
        navigate(`/project/${data.project_id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Analysis failed. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Dashboard Overview
          </h1>
        </div>
        <button onClick={() => setShowInjector(!showInjector)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 border border-indigo-500">
          <Plus className="h-4 w-4" /> New AI Analysis
        </button>
      </div>

      {showInjector && (
        <div className="bg-white dark:bg-[#111827] border border-slate-300 dark:border-slate-700/50 rounded-2xl p-8 mb-8 relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -z-10"></div>
          <h2 className="text-xl font-black text-cyan-400 tracking-widest uppercase mb-1">Repository Injection</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm font-mono">Upload a .ZIP archive or connect a GitHub repository to initiate neural analysis.</p>
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="flex-1 flex flex-col md:flex-row gap-6 items-center">
              <div className="relative flex-shrink-0">
                <input type="file" ref={fileInputRef} className="hidden" accept=".zip"
                  onChange={(e) => { if (e.target.files?.[0]) { setFile(e.target.files[0]); setUrl(''); setUrlError(null); } }} />
                <div onClick={() => fileInputRef.current.click()}
                  className={`w-48 h-48 rounded-full border-2 border-dashed ${file ? 'border-indigo-500 bg-indigo-500/10' : 'border-cyan-500/40 bg-slate-50 dark:bg-[#0B1120]/80 hover:border-cyan-400/60'} flex flex-col items-center justify-center transition-all cursor-pointer`}>
                  <CloudUpload className={`h-10 w-10 mb-2 ${file ? 'text-indigo-400' : 'text-cyan-400'}`} />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 text-center px-4 w-full truncate">
                    {file ? file.name : 'Drop Archive'}
                  </span>
                  {!file && <span className="text-[10px] text-slate-500 mt-1 font-mono">.ZIP only</span>}
                </div>
              </div>
              <div className="flex-1 w-full max-w-md">
                <div className="flex items-center gap-2 mb-3">
                  <Github className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-mono text-cyan-400/80">OR CONNECT GITHUB URL</span>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className={`flex items-center bg-slate-50 dark:bg-[#0B1120] border rounded-lg overflow-hidden transition-all ${urlError ? 'border-red-500/60' : 'border-slate-300 dark:border-slate-700 focus-within:border-cyan-500/50'}`}>
                    <span className="pl-3 text-slate-500"><LinkIcon className="h-4 w-4" /></span>
                    <input
                      type="url"
                      className="w-full bg-transparent border-none py-3 px-3 text-slate-800 dark:text-slate-200 text-sm focus:outline-none font-mono disabled:opacity-50"
                      placeholder="https://github.com/username/repository"
                      value={url}
                      onChange={handleUrlChange}
                      disabled={loading || !!file}
                    />
                    <button type="submit" disabled={(!url && !file) || loading || !!urlError}
                      className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-2 px-5 rounded-r-lg text-xs uppercase tracking-wider transition-all">
                      Analyze →
                    </button>
                  </div>
                  
                  <div className="mt-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">TARGET SENIORITY</span>
                    <div className="flex gap-2">
                      {['Student', 'Beginner', 'Intermediate', 'Expert'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSeniority(s)}
                          className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
                            seniority === s
                              ? 'bg-cyan-500 border-cyan-400 text-slate-900 shadow-lg shadow-cyan-500/20'
                              : 'bg-slate-50 dark:bg-[#0B1120] border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          {s === 'Beginner' ? 'Junior' : s === 'Intermediate' ? 'Senior' : s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-4">
                      <p className="text-xs text-slate-500 italic flex items-center gap-2">
                        <BrainCircuit className="w-3.5 h-3.5 text-cyan-400" /> 
                        AI will scale market value based on {seniority} level.
                      </p>
                    </div>
                  </div>
                </form>

                {urlError && (
                  <div className="mt-3 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-red-400 text-xs font-bold mb-0.5">Invalid URL</p>
                      <p className="text-red-300/80 text-xs">{urlError}</p>
                    </div>
                  </div>
                )}

                {loading && <div className="mt-4 flex items-center gap-3 text-cyan-400 font-mono text-xs uppercase"><Activity className="h-4 w-4 animate-pulse" /> Neural agents analyzing...</div>}
                {error && (
                  <div className="mt-4 flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">
                    <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-red-400 text-xs">{error}</p>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 mt-3">ⓘ Only public GitHub repositories are supported for URL analysis.</p>
              </div>
            </div>
            <div className="w-full lg:w-64 flex flex-col gap-3 p-4 bg-slate-50 dark:bg-[#0B1120]/50 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Analysis Pipeline</span>
              {[
                { icon: <BarChart2 className="h-4 w-4" />, label: 'Metrics: Extracting data' },
                { icon: <Clock className="h-4 w-4" />, label: 'Effort: Estimating time' },
                { icon: <AlertTriangle className="h-4 w-4" />, label: 'Risks: Analyzing threats' },
                { icon: <FileText className="h-4 w-4" />, label: 'Report: Generating insights' },
              ].map((s, i) => (
                <div key={i} className={`flex items-center gap-2 ${i > 0 ? 'opacity-60' : ''}`}>
                  <div className="w-8 h-8 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">{s.icon}</div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">Key Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <HeartPulse className="h-5 w-5 text-blue-400" />, bg: 'bg-blue-500/10', label: 'Avg Health Score', value: avgHealth != null ? `${avgHealth}%` : '--%', tag: completedProjects.length ? `${completedProjects.length} analyzed` : '--' },
            { icon: <Clock className="h-5 w-5 text-indigo-400" />, bg: 'bg-indigo-500/10', label: 'Total Effort', value: totalEffort ? `${totalEffort.toLocaleString()} hrs` : '0 hrs', tag: totalEffort ? 'accumulated' : '--' },
            { icon: <IndianRupee className="h-5 w-5 text-emerald-400" />, bg: 'bg-emerald-500/10', label: 'Projected Cost', value: formatCost(totalCost), tag: totalCost ? 'estimated' : '--' },
            { icon: <AlertTriangle className="h-5 w-5 text-amber-400" />, bg: 'bg-amber-500/10', label: 'Critical Risks', value: criticalRisks || '0', tag: criticalRisks > 0 ? 'needs attention' : 'all clear' },
          ].map((m) => (
            <div key={m.label} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-5 transition-colors">
              <div className="flex justify-between items-start mb-4">
                <div className={`${m.bg} p-2 rounded-lg`}>{m.icon}</div>
                <span className="bg-slate-500/10 text-slate-500 dark:text-slate-400 text-xs font-bold px-2 py-0.5 rounded">{m.tag}</span>
              </div>
              <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{m.label}</h3>
              <div className="text-2xl font-black text-slate-900 dark:text-white">{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg">
            <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Recent Analyses</h2>
              <Link to="/projects" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View all →</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-bold tracking-widest text-slate-500 uppercase bg-slate-50 dark:bg-[#0f172a]/50">
                    <th className="px-6 py-4">Project</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Effort</th>
                    <th className="px-6 py-4">Cost</th>
                    <th className="px-6 py-4 text-right">Report</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-200 dark:divide-slate-800">
                  {projectsLoading ? (
                    <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">Loading...</td></tr>
                  ) : projects.length === 0 ? (
                    <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-500">No analyses yet. Click "New AI Analysis" to begin.</td></tr>
                  ) : projects.slice(0, 8).map((p) => {
                    const name = p.github_url
                      ? p.github_url.replace('https://github.com/', '').replace('https://www.github.com/', '')
                      : (p._id ? `Upload-${p._id.slice(-6)}` : 'Unnamed');
                    return (
                      <tr key={p._id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white truncate max-w-[180px]">{name}</td>
                        <td className="px-6 py-4"><span className={statusBadge(p.status)}>{p.status}</span></td>
                        <td className="px-6 py-4 text-slate-500">{p.estimations?.predicted_effort_hours ? `${p.estimations.predicted_effort_hours.toLocaleString()} hrs` : '—'}</td>
                        <td className="px-6 py-4 text-slate-500">{p.estimations?.predicted_cost_inr ? formatCost(p.estimations.predicted_cost_inr) : (p.estimations?.predicted_cost_dollars ? formatCost(p.estimations.predicted_cost_dollars * 83) : '—')}</td>
                        <td className="px-6 py-4 text-right">
                          <Link to={`/project/${p._id}`} className="text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-1 text-xs font-medium">
                            View <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Risk Alerts</h2>
            <span className="bg-slate-500/10 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
              {criticalRisks} Critical
            </span>
          </div>
          {completedProjects.filter(p => p.risks?.length > 0).length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="h-5 w-5 text-slate-600" />
              </div>
              No alerts yet. Run an analysis to see risks.
            </div>
          ) : (
            <div className="space-y-3">
              {completedProjects.flatMap(p =>
                (p.risks || []).filter(r => r.score >= 5).map(r => ({ ...r, project: p }))
              ).slice(0, 5).map((r, i) => (
                <div key={i} className={`rounded-lg p-3 flex gap-3 ${r.score >= 8 ? 'bg-red-500/5 border border-red-500/20' : 'bg-amber-500/5 border border-amber-500/20'}`}>
                  <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${r.score >= 8 ? 'text-red-400' : 'text-amber-400'}`} />
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{r.type}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{r.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
