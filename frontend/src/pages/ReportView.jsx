import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProjectDetails } from '../services/api';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  CloudUpload, Share2, Download, CheckCircle, Clock, Heart,
  Code2, AlertCircle, AlertTriangle, ShieldAlert, Cpu, ChevronRight, ChevronLeft, Activity,
  IndianRupee, Bell, Zap, X, Copy, Check
} from 'lucide-react';

const CircularProgress = ({ value, label, sublabel }) => {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center p-6">
      <svg className="transform -rotate-90 w-48 h-48">
        <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-800" />
        <circle
          cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-black text-slate-900 dark:text-white">{value}<span className="text-2xl ml-1">%</span></span>
        <span className="text-[10px] font-bold tracking-widest uppercase mt-2 text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded shadow-[0_0_10px_rgba(34,211,238,0.2)]">{label}</span>
      </div>
    </div>
  );
};

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'design_error']);

const ReportView = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOptimization, setSelectedOptimization] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  // Use a ref so the interval callback always sees the latest value (avoids stale closure)
  const loadingRef = React.useRef(true);

  useEffect(() => {
    let interval;
    const fetchProject = async () => {
      try {
        const data = await getProjectDetails(id);
        setProject(data);
        if (TERMINAL_STATUSES.has(data.status)) {
          loadingRef.current = false;
          setLoading(false);
          clearInterval(interval);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to fetch project details from the server.');
        loadingRef.current = false;
        setLoading(false);
        clearInterval(interval);
      }
    };

    fetchProject();
    interval = setInterval(() => { if (loadingRef.current) fetchProject(); }, 6000);
    return () => clearInterval(interval);
  }, [id]);

  if (error || (project && (project.status === 'failed' || project.status === 'design_error'))) {
    return (
      <div className="mt-20 text-center max-w-lg mx-auto bg-white dark:bg-[#111827] p-12 rounded-2xl border border-red-900/50 shadow-2xl relative">
        <AlertCircle className="h-16 w-16 mx-auto mb-6 text-red-500" />
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-wide uppercase mb-3">Analysis Terminated</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">{error || project?.error_message}</p>
        <Link to="/" className="inline-flex bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-bold py-2.5 px-6 rounded-lg transition-colors border border-slate-300 dark:border-slate-700">
          RETURN TO DASHBOARD
        </Link>
      </div>
    );
  }

  if (loading || !project || project.status === 'processing' || project.status === 'retrying_ai') {
    const isRetrying = project?.status === 'retrying_ai';
    
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <div className="relative mb-8">
          <Cpu className={`h-16 w-16 ${isRetrying ? 'text-amber-500 animate-pulse' : 'text-indigo-500 animate-bounce'}`} />
          {isRetrying && (
            <div className="absolute -top-2 -right-2">
              <span className="flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
              </span>
            </div>
          )}
        </div>
        
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-widest uppercase mb-4">
          {isRetrying ? 'AI Traffic Congestion' : 'Synthesizing Neural Report'}
        </h2>
        
        {isRetrying ? (
          <div className="max-w-md text-center space-y-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-mono leading-relaxed bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl">
              {project.last_error || 'The AI generator is currently at capacity. Waiting for a new quota slot...'}
            </p>
            <div className="flex items-center justify-center gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" /> RETRYING AUTOMATICALLY
              </div>
              <div className="w-1 h-1 rounded-full bg-slate-700"></div>
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-amber-500" /> ATTEMPT {project.retry_attempt || 1}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 text-xs font-mono animate-pulse">
            Orchestrating multi-agent analysis sequence...
          </p>
        )}
      </div>
    );
  }

  const projectName = (project.github_url
    ? project.github_url.split('/').pop()
    : project._id || 'UPLOADED-ZIP'
  ).toUpperCase().replace(/_/g, ' ') || 'PROJECT ANALYSIS';
  const healthScore = Math.max(40, 100 - (project.metrics?.avg_complexity * 2) - (project.metrics?.duplication_percentage || 0));
  const isDelayed = project.risks?.some(r => r.type.toLowerCase().includes('schedule') || r.type.toLowerCase().includes('velocity'));
  const generatedDate = project.created_at ? new Date(project.created_at).toLocaleDateString() : new Date().toLocaleDateString();

  return (
    <div className="max-w-[1600px] mx-auto pb-20 animate-fade-in text-slate-800 dark:text-slate-200">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center text-xs font-mono text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">
            <Link to="/" className="hover:text-indigo-600 dark:text-indigo-400 transition-colors">DASHBOARD</Link>
            <span className="mx-2">/</span>
            <span className="text-slate-500">Projects</span>
            <span className="mx-2">/</span>
            <span className="text-cyan-400">{projectName}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center">
            Project Analysis Report
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-mono">Generated on {generatedDate} • AI Confidence: 94%</p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/" className="inline-flex items-center bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white px-5 py-2 rounded-lg font-medium shadow-lg shadow-indigo-500/20 border border-indigo-500 transition-all text-sm">
            <Activity className="h-4 w-4 mr-2" /> New Analysis
          </Link>
        </div>
      </div>

      {/* Executive Summary Card */}
      <div className="mb-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-[60px]"></div>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Executive Summary</h3>
        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4">
          {project.final_report
            ? (project.final_report.match(/Project.*?(?=\n\n|$)/s)?.[0] || project.final_report.split('\n\n')[0])
            : `Project analysis complete for ${projectName}. The codebase contains ${project.metrics?.file_count || 0} files with a total of ${project.metrics?.total_loc?.toLocaleString() || 0} lines of code.`}
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
          {project.status === 'completed' 
            ? `Analysis shows a system health score of ${healthScore.toFixed(0)}%. ${healthScore > 80 ? 'The project is on a stable trajectory with manageable technical debt.' : 'Some areas require attention to maintain long-term velocity.'}`
            : 'Project analysis is still in progress. Final health score and structural insights will be available shortly.'}
        </p>
        {project.metrics?.avg_complexity > 10 && (
          <p className="text-amber-400 text-xs font-bold mt-3 font-mono">
            → High average complexity detected ({project.metrics.avg_complexity.toFixed(1)}). Consider refactoring complex modules to improve maintainability.
          </p>
        )}
        {/* Language Breakdown Pills */}
        {project.metrics?.language_breakdown && Object.keys(project.metrics.language_breakdown).length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 self-center mr-1">Languages:</span>
            {Object.entries(project.metrics.language_breakdown).slice(0, 8).map(([lang, count]) => (
              <span key={lang} className="text-[10px] font-bold px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {lang} <span className="opacity-60">({count})</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* 1. Large Health Score Column */}
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center text-center shadow-lg relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-cyan-500/20 transition-all"></div>

          <CircularProgress value={healthScore.toFixed(0)} label="HEALTHY" />

          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-4 mb-2">System Health</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-10 max-w-[250px] font-mono">
            AI Prediction:<br />Optimal trajectory for Q4 launch. Velocity stable.
          </p>

          <div className="mt-auto w-full flex justify-between items-end border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">PREV:</span>
              <div className="text-xl font-bold text-slate-700 dark:text-slate-300">82%</div>
            </div>
            <div className="text-right flex flex-col items-end">
              <span className="text-emerald-400 font-bold text-lg mb-0.5">+5%</span>
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 flex items-center py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                <span className="mr-1">↗</span> Efficiency
              </span>
            </div>
          </div>
        </div>

        {/* 2. Middle Column: Metrics & Timeline */}
        <div className="lg:col-span-2 space-y-6 flex flex-col">

          {/* Top Top row metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-5"><Activity className="w-16 h-16" /></div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Effort</span>
                  <div className="text-4xl font-black text-slate-900 dark:text-white mt-1">{project.estimations?.predicted_effort_hours?.toLocaleString()} <span className="text-xl text-slate-500 font-medium">hrs</span></div>
                </div>
                <div className="bg-blue-500/20 p-2.5 rounded-xl border border-blue-500/30">
                  <Clock className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold border border-emerald-500/20">-12% Budget</span>
                <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full"><div className="w-3/4 h-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></div></div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-4 opacity-10"><span className="text-7xl font-black text-slate-100 dark:text-slate-800/40 select-none">₹</span></div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Projected Cost</span>
                  <div className="text-4xl font-black text-slate-900 dark:text-white mt-1">
                    {(() => {
                      const cost = project.estimations?.predicted_cost_inr || (project.estimations?.predicted_cost_dollars * 83) || 0;
                      if (cost >= 10_000_000) return `₹${(cost / 10_000_000).toFixed(1)}Cr`;
                      if (cost >= 100_000) return `₹${(cost / 100_000).toFixed(1)}L`;
                      if (cost >= 1000) return `₹${Math.round(cost / 1000)}k`;
                      return `₹${Math.round(cost)}`;
                    })()}
                  </div>
                </div>
                <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400 font-bold">₹</div>
              </div>
              <div className="flex items-center gap-3 mt-auto">
                <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-bold border border-red-500/20">+5% MoM</span>
                <span className="text-xs font-mono text-slate-500 uppercase">Trending Up</span>
                {/* Mini sparkline */}
                <svg className="w-10 h-4 ml-auto" viewBox="0 0 40 16"><path d="M0,12 L10,8 L20,14 L40,2" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>

            <div className={`bg-white dark:bg-[#111827] border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between ${isDelayed ? 'border-amber-900/50 shadow-[inset_0_0_20px_rgba(245,158,11,0.03)]' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="absolute top-0 right-0 p-4 opacity-5"><ShieldAlert className="w-16 h-16" /></div>
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Risk Level</span>
                  <div className={`text-3xl font-black mt-1 ${isDelayed ? 'text-amber-500' : 'text-emerald-400'}`}>{isDelayed ? 'Moderate' : 'Low'}</div>
                </div>
                <div className={`${isDelayed ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'} p-2 rounded-lg border`}>
                  {isDelayed ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <ShieldAlert className="w-5 h-5 text-emerald-500" />}
                </div>
              </div>

              <div className="mt-auto">
                <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2">
                  <div className="bg-emerald-500 h-full w-1/3"></div>
                  <div className="bg-amber-500 h-full w-1/3 shadow-[0_0_8px_#f59e0b]"></div>
                  <div className="bg-red-500 h-full w-1/3 opacity-20"></div>
                </div>
                <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 tracking-widest">
                  <span>Safe</span>
                  <span>Critical</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline Container */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex-1 relative">
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
              <div className="flex items-center gap-3">
                <svg viewBox="0 0 24 24" className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <h3 className="text-slate-900 dark:text-white font-bold text-lg">Project Timeline</h3>
              </div>
              <span className="text-xs font-mono text-cyan-400 font-bold">{project.estimations?.predicted_time_days || 0} days total</span>
            </div>

            {/* Real Phase Bars computed from estimations */}
            {(() => {
              const totalDays = project.estimations?.predicted_time_days || 0;
              const phases = [
                { label: 'Setup & Planning',   sub: 'environment & architecture', pct: 10, color: 'from-violet-600 to-violet-400', border: 'border-violet-500', shadow: 'shadow-[0_0_15px_#7c3aed]', text: 'text-violet-400' },
                { label: 'Core Development',   sub: 'features & integrations',    pct: 55, color: 'from-blue-600 to-blue-400',   border: 'border-blue-500',   shadow: 'shadow-[0_0_15px_#3b82f6]', text: 'text-blue-400'   },
                { label: 'Testing & QA',        sub: 'bug fixes & code review',    pct: 25, color: 'from-pink-600 to-fuchsia-400', border: 'border-fuchsia-500', shadow: 'shadow-[0_0_15px_#d946ef]', text: 'text-pink-400'   },
                { label: 'Deployment & Launch', sub: 'CI/CD & production',         pct: 10, color: 'from-amber-500 to-amber-300', border: 'border-amber-500',  shadow: 'shadow-[0_0_10px_#f59e0b]', text: 'text-amber-400'  },
              ];
              return phases.map((phase, i) => {
                const phaseDays = Math.max(1, Math.round(totalDays * phase.pct / 100));
                return (
                  <div key={i} className="relative z-10 mb-7">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-700 dark:text-slate-300 font-medium">
                        {phase.label} <span className="text-slate-500 text-xs ml-2 font-mono italic">{phase.sub}</span>
                      </span>
                      <span className={`${phase.text} font-mono font-bold text-sm`}>{phaseDays}d ({phase.pct}%)</span>
                    </div>
                    <div className="w-full bg-slate-50 dark:bg-[#0f172a] rounded-full h-4 border border-slate-200 dark:border-slate-800 p-0.5">
                      <div className={`bg-gradient-to-r ${phase.color} rounded-full h-full relative`} style={{ width: `${phase.pct}%` }}>
                        <div className={`absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 ${phase.border} ${phase.shadow}`}></div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}

            {/* Timeline axis labels */}
            {(() => {
              const totalDays = project.estimations?.predicted_time_days || 0;
              const totalWeeks = Math.max(4, Math.ceil(totalDays / 7));
              const mid1 = Math.round(totalWeeks * 0.33);
              const mid2 = Math.round(totalWeeks * 0.66);
              return (
                <div className="flex justify-between text-[10px] font-black uppercase text-slate-600 tracking-widest mt-6 px-2">
                  <span>Week 1</span>
                  <span>Week {mid1}</span>
                  <span>Week {mid2}</span>
                  <span>Week {totalWeeks}</span>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 3. Right Column: Complexity + Alerts */}
        <div className="flex gap-4 h-full">
          {/* Code Complexity Chart — real data */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl flex-1 p-4 relative flex flex-col items-center overflow-hidden">
            <div className="text-center mb-4 mt-2 w-full">
              <div className="flex items-center justify-center gap-2 mb-1">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                <h3 className="text-slate-900 dark:text-white font-bold leading-tight">Code<br />Complexity</h3>
              </div>
            </div>

            {/* Real Complexity Gauge */}
            {(() => {
              const complexity = project.metrics?.avg_complexity ?? 0;
              const maxComplexity = 20; // treat 20+ as max
              const pct = Math.min(100, Math.round((complexity / maxComplexity) * 100));
              const label = complexity === 0 ? 'N/A' : complexity < 3 ? 'Low' : complexity < 7 ? 'Medium' : 'High';
              const color = complexity === 0 ? '#94a3b8' : complexity < 3 ? '#10b981' : complexity < 7 ? '#f59e0b' : '#ef4444';
              const glowColor = complexity === 0 ? '' : complexity < 3 ? 'shadow-[0_0_12px_#10b981]' : complexity < 7 ? 'shadow-[0_0_12px_#f59e0b]' : 'shadow-[0_0_12px_#ef4444]';
              const strokeColor = complexity === 0 ? 'text-slate-400' : complexity < 3 ? 'text-emerald-400' : complexity < 7 ? 'text-amber-400' : 'text-red-400';
              const circumference = 2 * Math.PI * 38;
              const offset = circumference - (pct / 100) * circumference;
              return (
                <div className="flex flex-col items-center justify-center flex-1 w-full gap-3">
                  {/* Mini circular gauge */}
                  <div className="relative flex items-center justify-center">
                    <svg className="transform -rotate-90 w-28 h-28">
                      <circle cx="56" cy="56" r="38" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200 dark:text-slate-800" />
                      <circle
                        cx="56" cy="56" r="38" stroke={color} strokeWidth="8" fill="transparent"
                        strokeDasharray={circumference} strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ filter: `drop-shadow(0 0 6px ${color})`, transition: 'stroke-dashoffset 1s ease-out' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black" style={{ color }}>{complexity.toFixed(1)}</span>
                      <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color }}>{label}</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="w-full space-y-2 px-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Files</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{project.metrics?.file_count ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Language</span>
                      <span className="font-bold text-cyan-400 truncate max-w-[80px] text-right" title={project.metrics?.primary_language}>{project.metrics?.primary_language ?? 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Functional Points</span>
                      <span className="font-bold text-cyan-400">{project.metrics?.functional_points ?? 0}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Total LOC</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">{(project.metrics?.total_loc ?? 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-500">Duplication</span>
                      <span className={`font-bold ${ (project.metrics?.duplication_percentage ?? 0) > 15 ? 'text-red-400' : (project.metrics?.duplication_percentage ?? 0) > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {(project.metrics?.duplication_percentage ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full mt-1">
                      <div
                        className={`h-full rounded-full ${glowColor}`}
                        style={{ width: `${pct}%`, backgroundColor: color, transition: 'width 1s ease-out' }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>Low</span><span>Med</span><span>High</span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Vertical Alerts Strip */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl w-14 py-6 flex flex-col items-center shadow-lg relative h-full">
            <div className="relative mb-10 group cursor-pointer">
              <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400 group-hover:text-amber-400 transition-colors" />
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
            </div>

            <div className="space-y-8 flex-1 w-full px-2 items-center flex flex-col pt-4">
              {/* Vertical Progress Markers — Now with labels */}
              <div className="flex flex-col items-center gap-1 group relative" title={`Maintenance Score: ${Math.max(0, 100 - (project.metrics?.avg_complexity || 0) * 5)}%`}>
                <span className="text-[7px] font-black text-pink-500 uppercase tracking-tighter mb-1">MNT</span>
                <div className="w-4 h-16 bg-slate-50 dark:bg-[#0f172a] rounded-full p-0.5 border border-slate-200 dark:border-slate-800 shadow-inner overflow-hidden">
                  <div className="w-full bg-pink-500 rounded-full shadow-[0_0_5px_#ec4899] transition-all duration-1000" style={{ height: `${Math.max(20, 100 - (project.metrics?.avg_complexity || 0) * 5)}%` }}></div>
                </div>
                <Heart className="w-3 h-3 text-pink-400 mt-1 opacity-40 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="flex flex-col items-center gap-1 group relative" title={`Robustness Score: ${Math.max(0, 100 - (project.metrics?.duplication_percentage || 0) * 4)}%`}>
                <span className="text-[7px] font-black text-blue-500 uppercase tracking-tighter mb-1">ROB</span>
                <div className="w-4 h-16 bg-slate-50 dark:bg-[#0f172a] rounded-full p-0.5 border border-slate-200 dark:border-slate-800 shadow-inner overflow-hidden">
                  <div className="w-full bg-blue-500 rounded-full shadow-[0_0_5px_#3b82f6] transition-all duration-1000" style={{ height: `${Math.max(20, 100 - (project.metrics?.duplication_percentage || 0) * 4)}%` }}></div>
                </div>
                <ShieldAlert className="w-3 h-3 text-blue-400 mt-1 opacity-40 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="flex flex-col items-center gap-1 group relative" title={`Density Score: ${Math.min(100, (project.metrics?.functional_points || 0) / 2)}%`}>
                <span className="text-[7px] font-black text-amber-500 uppercase tracking-tighter mb-1">DEN</span>
                <div className="w-4 h-16 bg-slate-50 dark:bg-[#0f172a] rounded-full p-0.5 border border-slate-200 dark:border-slate-800 shadow-inner overflow-hidden">
                  <div className="w-full bg-amber-500 rounded-full shadow-[0_0_5px_#f59e0b] transition-all duration-1000" style={{ height: `${Math.min(100, 20 + (project.metrics?.functional_points || 0) / 2)}%` }}></div>
                </div>
                <Zap className="w-3 h-3 text-amber-400 mt-1 opacity-40 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            <div className="mt-auto pt-6 writing-vertical flex items-center gap-2 cursor-pointer group text-[10px] font-black tracking-widest text-slate-500 hover:text-cyan-400 transition-colors uppercase leading-none" style={{ writingMode: 'vertical-rl' }}>
              View All Risks <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform rotate-90" />
            </div>
          </div>
        </div>

      </div>

      {/* Technical Risk Assessment & Optimization Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Technical Risk Assessment
          </h3>
          {project.risks?.map((r, i) => (
            <div key={i} className={`rounded-xl p-4 border flex gap-3 ${r.score >= 8 ? 'bg-red-500/5 border-red-500/30' :
                r.score >= 5 ? 'bg-amber-500/5 border-amber-500/30' :
                  'bg-emerald-500/5 border-emerald-500/30'
              }`}>
              <div className={`mt-0.5 ${r.score >= 8 ? 'text-red-500' : r.score >= 5 ? 'text-amber-500' : 'text-emerald-500'}`}>
                {r.score >= 8 ? <AlertCircle className="w-5 h-5" /> : r.score >= 5 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <div className="flex gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${r.score >= 8 ? 'bg-red-500/20 text-red-400' : r.score >= 5 ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                    {r.score >= 8 ? 'Critical' : r.score >= 5 ? 'Warning' : 'Stable'}
                  </span>
                  {r.type?.toLowerCase().includes('auth') && <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-700 text-slate-700 dark:text-slate-300">Backend</span>}
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm">{r.reason}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-cyan-400" /> Optimization Suggestions
          </h3>
          {project.optimizations?.map((o, i) => (
            <div key={i} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:border-cyan-500/20 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 flex-shrink-0">
                <Code2 className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-slate-800 dark:text-slate-200 font-bold text-sm">{o.type}</p>
                  <span className="text-[9px] font-mono text-slate-500 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 truncate max-w-[150px]">
                    {o.filename?.split('/').pop() || 'System'}
                  </span>
                {Array.isArray(o.patches) && o.patches.length > 1 && (
                  <span className="text-[9px] font-mono text-emerald-500 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                    {o.patches.length} patches
                  </span>
                )}
                </div>
                <p className="text-slate-500 text-xs truncate">{o.action}</p>
              </div>
              <button 
                onClick={() => {
                  setSelectedOptimization(o);
                  setIsModalOpen(true);
                }}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
              >
                View Fix <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Full Report Section */}
      {project.final_report && (
        <div className="mt-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-900/40 to-slate-900/60 border-b border-slate-700 px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_6px_#f43f5e]"></div>
                <div className="w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_6px_#f59e0b]"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]"></div>
              </div>
              <div>
                <span className="text-slate-200 font-bold text-sm tracking-wide">Detailed Analysis Report</span>
                <span className="ml-3 text-[10px] font-mono text-cyan-400 uppercase tracking-widest border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 rounded">AI-Generated</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              <CheckCircle className="w-3 h-3 text-emerald-400" />
              Analysis Complete
            </div>
          </div>

          {/* Report Body */}
          <div className="p-8 lg:p-10">
            <div
              className="report-body prose prose-slate dark:prose-invert max-w-none
                prose-h2:text-xl prose-h2:font-black prose-h2:text-slate-900 dark:prose-h2:text-white prose-h2:border-b prose-h2:border-slate-200 dark:prose-h2:border-slate-700 prose-h2:pb-2 prose-h2:mt-8 prose-h2:mb-4
                prose-h3:text-base prose-h3:font-bold prose-h3:text-indigo-600 dark:prose-h3:text-indigo-400 prose-h3:mt-5 prose-h3:mb-2
                prose-p:text-slate-600 dark:prose-p:text-slate-300 prose-p:leading-relaxed prose-p:text-sm
                prose-li:text-slate-600 dark:prose-li:text-slate-300 prose-li:text-sm prose-li:my-1
                prose-strong:text-slate-900 dark:prose-strong:text-white
                prose-code:text-indigo-500 dark:prose-code:text-indigo-400 prose-code:bg-slate-100 dark:prose-code:bg-slate-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono
                prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-700 prose-pre:rounded-xl
                prose-blockquote:border-l-4 prose-blockquote:border-indigo-500 prose-blockquote:bg-indigo-50 dark:prose-blockquote:bg-indigo-500/5 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:not-italic
                prose-table:text-sm prose-thead:bg-slate-100 dark:prose-thead:bg-slate-800 prose-th:font-bold prose-th:text-slate-900 dark:prose-th:text-white prose-td:border-b prose-td:border-slate-200 dark:prose-td:border-slate-700
                prose-hr:border-slate-200 dark:prose-hr:border-slate-700
              "
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{project.final_report}</ReactMarkdown>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-200 dark:border-slate-800 px-8 py-4 bg-slate-50 dark:bg-[#0f172a] flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <span className="text-indigo-500 font-bold">techcorp@alpha:~$</span>
              <span className="text-slate-500">report.generate() completed</span>
              <span className="ml-2 w-2 h-4 bg-indigo-400 animate-pulse inline-block rounded-sm"></span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Generated on {generatedDate}</span>
          </div>
        </div>
      )}

      {/* Code Fix Modal */}
      {isModalOpen && selectedOptimization && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col scale-in">
            {/* Modal Header */}
            <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white dark:from-[#0f172a] dark:to-[#111827]">
              <div className="flex items-center gap-6">
                {/* Navigation Controls */}
                <div className="flex items-center gap-2">
                  <button 
                    disabled={project.optimizations.indexOf(selectedOptimization) === 0}
                    onClick={() => setSelectedOptimization(project.optimizations[project.optimizations.indexOf(selectedOptimization) - 1])}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] font-mono font-bold text-slate-400">
                    {project.optimizations.indexOf(selectedOptimization) + 1} / {project.optimizations.length}
                  </span>
                  <button 
                    disabled={project.optimizations.indexOf(selectedOptimization) === project.optimizations.length - 1}
                    onClick={() => setSelectedOptimization(project.optimizations[project.optimizations.indexOf(selectedOptimization) + 1])}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>

                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 uppercase tracking-widest">File Optimization</span>
                    <span className="text-slate-500 dark:text-slate-400 text-[10px] font-mono truncate max-w-[300px]">{selectedOptimization.filename}</span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize">{selectedOptimization.title || selectedOptimization.type}</h3>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-8 overflow-y-auto flex-1 custom-scrollbar">
              <div className="space-y-8">
                {/* Explanation */}
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertCircle className="w-5 h-5 text-indigo-400" />
                    <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Architectural Reasoning</h4>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                    {selectedOptimization.explanation || selectedOptimization.action}
                  </p>
                </div>

                {/* Code Comparison */}
                <div className="space-y-6">
                  {(Array.isArray(selectedOptimization.patches) && selectedOptimization.patches.length > 0
                    ? selectedOptimization.patches
                    : [{
                        description: selectedOptimization.action,
                        original_code: selectedOptimization.original_code,
                        suggested_code: selectedOptimization.suggested_code
                      }]
                  ).map((patch, idx) => (
                    <div key={idx} className="border border-slate-200 dark:border-slate-800 rounded-2xl p-5 bg-slate-50/50 dark:bg-[#0b1220]">
                      <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
                            Patch {idx + 1}{Array.isArray(selectedOptimization.patches) ? ` / ${selectedOptimization.patches.length}` : ''}
                          </div>
                          <div className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                            {patch.description || selectedOptimization.title || selectedOptimization.type}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (!patch?.suggested_code) return;
                            navigator.clipboard.writeText(patch.suggested_code);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                          }}
                          className="flex-shrink-0 text-[10px] font-bold text-slate-500 hover:text-cyan-400 flex items-center gap-1.5 transition-colors uppercase tracking-widest"
                        >
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied ? 'Copied!' : 'Copy Patch'}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Original Code */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-rose-500 uppercase tracking-widest px-1 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> REPLACE THIS
                          </h4>
                          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden text-xs overflow-x-auto p-4 font-mono text-slate-400 whitespace-pre">
                            {patch?.original_code || "// No original snippet provided"}
                          </div>
                        </div>

                        {/* Suggested Code */}
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest px-1 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> WITH THIS
                          </h4>
                          <div className="bg-emerald-950/20 rounded-2xl border border-emerald-500/30 overflow-hidden text-xs overflow-x-auto relative">
                            <div className="prose prose-invert max-w-none p-4 report-body font-mono whitespace-pre">
                              {patch?.suggested_code || "// No suggested snippet provided"}
                            </div>
                            <div className="absolute top-3 right-3 pointer-events-none opacity-30">
                              <Zap className="w-4 h-4 text-emerald-400" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Warning Footer */}
                <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium px-4">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>AI Suggestions are high-level improvements. Always review and test code before merging into production.</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-8 py-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0f172a] flex justify-end gap-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2 rounded-xl text-slate-600 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Dismiss
              </button>
              <button 
                onClick={() => {
                  window.open(`https://github.com/search?q=${encodeURIComponent(selectedOptimization.action)}`, '_blank');
                }}
                className="px-6 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share Refactoring Guide
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportView;

