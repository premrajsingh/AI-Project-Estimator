import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getProjectDetails } from '../services/api';
import ReactMarkdown from 'react-markdown';
import {
  CloudUpload, Share2, Download, CheckCircle, Clock, Heart,
  Code2, AlertCircle, AlertTriangle, ShieldAlert, Cpu, ChevronRight, Activity,
  DollarSign, Bell
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

const ReportView = () => {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let interval;
    const fetchProject = async () => {
      // In local dev without DB, we might hit errors, so we handle it gracefully
      try {
        const data = await getProjectDetails(id);
        setProject(data);
        if (data.status === 'completed' || data.status === 'failed') {
          setLoading(false);
          clearInterval(interval);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to fetch project details from the server.');
        setLoading(false);
        clearInterval(interval);
      }
    };

    fetchProject();
    interval = setInterval(() => { if (loading) fetchProject(); }, 3000);
    return () => clearInterval(interval);
  }, [id, loading]);

  if (error || (project && project.status === 'failed')) {
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

  if (loading || !project || project.status === 'processing') {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center animate-pulse">
        <Cpu className="h-16 w-16 text-indigo-500 animate-bounce mb-6" />
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-widest uppercase">Synthesizing Neural Report</h2>
      </div>
    );
  }

  const projectName = project.github_url.split('/').pop().toUpperCase() || "ALPHA RELEASE V2.0";
  const healthScore = Math.max(40, 100 - (project.metrics?.avg_complexity * 2) - (project.metrics?.duplication_percentage));
  const isDelayed = project.risks?.some(r => r.type.toLowerCase().includes('schedule') || r.type.toLowerCase().includes('velocity'));

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
            <span className="text-cyan-400">{projectName.replace(/_/g, ' ')}</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center">
            Project Analysis Report
          </h1>
          <p className="text-slate-500 text-sm mt-1 font-mono">Generated on Oct 24, 2023 • AI Confidence: 94%</p>
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
            ? (project.final_report.match(/Project Omega.*?(?=\n\n|$)/s)?.[0] || project.final_report.split('\n\n')[0] || 'Project is on track.')
            : 'Project is largely on track but showing early signs of technical debt in the payment gateway module.'}
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
          The estimated timeline has slipped by <strong className="text-amber-400">4 days</strong> due to unforeseen complexity in the legacy authentication service integration. However, frontend velocity is 15% higher than anticipated.
        </p>
        <p className="text-cyan-400 text-xs font-bold mt-3 font-mono">
          → Refactor auth-service dependencies before Sprint 4 to avoid critical blocking issues during the beta release.
        </p>
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
              <div className="absolute top-0 right-0 p-4 opacity-10"><Clock className="w-16 h-16" /></div>
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
              <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-16 h-16" /></div>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Projected Cost</span>
                  <div className="text-4xl font-black text-slate-900 dark:text-white mt-1">${Math.round(project.estimations?.predicted_cost_dollars / 1000)}k</div>
                </div>
                <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400 font-bold">$</div>
              </div>
              <div className="flex items-center gap-3 mt-auto">
                <span className="bg-red-500/10 text-red-400 px-2 py-0.5 rounded text-xs font-bold border border-red-500/20">+5% MoM</span>
                <span className="text-xs font-mono text-slate-500 uppercase">Trending Up</span>
                {/* Mini sparkline */}
                <svg className="w-10 h-4 ml-auto" viewBox="0 0 40 16"><path d="M0,12 L10,8 L20,14 L40,2" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
            </div>

            <div className={`bg-white dark:bg-[#111827] border rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between ${isDelayed ? 'border-amber-900/50 shadow-[inset_0_0_20px_rgba(245,158,11,0.03)]' : 'border-slate-200 dark:border-slate-800'}`}>
              <div className="flex justify-between items-start mb-4">
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
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest hover:text-cyan-300 cursor-pointer transition-colors border-b border-cyan-400/30 pb-0.5">Details</span>
            </div>

            {/* "Today" Marker Line */}
            <div className="absolute top-[80px] bottom-12 left-[60%] border-l-2 border-dashed border-cyan-500/30 z-0">
              <span className="absolute -top-6 -translate-x-1/2 bg-slate-50 dark:bg-[#0f172a] border border-cyan-500/50 text-cyan-400 text-[9px] font-black uppercase px-2 py-1 rounded shadow-[0_0_10px_rgba(34,211,238,0.2)]">Today</span>
              {/* Marker dots on tracks */}
              <div className="absolute top-[35px] -left-[5px] w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_5px_#22d3ee]"></div>
              <div className="absolute top-[123px] -left-[4px] w-1.5 h-1.5 rounded-full bg-cyan-400/50"></div>
              <div className="absolute top-[211px] -left-[4px] w-1.5 h-1.5 rounded-full bg-cyan-400/50"></div>
            </div>

            {/* Track 1 */}
            <div className="relative z-10 mb-8">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Backend API <span className="text-slate-500 text-xs ml-2 font-mono italic">refactor phase</span></span>
                <span className="text-blue-400 font-mono font-bold">75%</span>
              </div>
              <div className="w-full bg-slate-50 dark:bg-[#0f172a] rounded-full h-4 border border-slate-200 dark:border-slate-800 p-0.5">
                <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-full h-full relative" style={{ width: '75%' }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-blue-500 shadow-[0_0_15px_#3b82f6]"></div>
                </div>
              </div>
            </div>

            {/* Track 2 */}
            <div className="relative z-10 mb-8">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-slate-700 dark:text-slate-300 font-medium">Frontend UI <span className="text-slate-500 text-xs ml-2 font-mono italic">dashboard merge</span></span>
                <span className="text-pink-400 font-mono font-bold">45%</span>
              </div>
              <div className="w-full bg-slate-50 dark:bg-[#0f172a] rounded-full h-4 border border-slate-200 dark:border-slate-800 p-0.5">
                <div className="bg-gradient-to-r from-pink-600 to-fuchsia-400 rounded-full h-full relative" style={{ width: '45%' }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-fuchsia-500 shadow-[0_0_15px_#d946ef]"></div>
                </div>
              </div>
            </div>

            {/* Track 3 */}
            <div className="relative z-10">
              <div className="flex justify-between text-sm mb-3">
                <span className="text-slate-700 dark:text-slate-300 font-medium">QA & Testing <span className="text-slate-500 text-xs ml-2 font-mono italic">integration loop</span></span>
                <span className="text-amber-500 font-mono font-bold">10%</span>
              </div>
              <div className="w-full bg-slate-50 dark:bg-[#0f172a] rounded-full h-4 border border-slate-200 dark:border-slate-800 p-0.5 flex">
                <div className="bg-gradient-to-r from-amber-500 to-amber-300 rounded-full h-full relative" style={{ width: '10%' }}>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-amber-500 shadow-[0_0_10px_#f59e0b]"></div>
                </div>
                {/* Dashed projected timeline box */}
                <div className="ml-8 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-full h-full w-1/3"></div>
              </div>
            </div>

            {/* Timeline axis labels */}
            <div className="flex justify-between text-[10px] font-black uppercase text-slate-600 tracking-widest mt-8 px-2">
              <span>Week 1</span>
              <span>Week 4</span>
              <span>Week 8</span>
              <span>Week 12</span>
            </div>
          </div>
        </div>

        {/* 3. Right Column: Custom Visualizations */}
        <div className="flex gap-4 h-full">
          {/* Mini Vertical Chart Area */}
          <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl flex-1 p-4 relative flex flex-col items-center overflow-hidden">
            <div className="text-center mb-8 mt-2 w-full">
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                <h3 className="text-slate-900 dark:text-white font-bold leading-tight">Code<br />Complexity</h3>
              </div>
            </div>

            <div className="relative flex-1 w-full flex justify-center pb-12 pt-4">
              {/* Vertical Dotted lines */}
              <div className="absolute top-0 bottom-16 border-l border-dashed border-slate-300 dark:border-slate-700/50 h-full w-px"></div>
              <div className="absolute top-0 bottom-16 left-1/4 border-l border-dashed border-slate-300 dark:border-slate-700/50 h-[80%] w-px"></div>
              <div className="absolute top-0 bottom-16 right-1/4 border-l border-dashed border-slate-300 dark:border-slate-700/50 h-[60%] w-px"></div>

              {/* Abstract vertical curve representation */}
              <svg viewBox="0 0 40 200" className="w-[80%] h-full preserve-3d" preserveAspectRatio="none">
                {/* Gradient fill under curve */}
                <path d="M0,200 L40,200 L40,160 Q20,150 0,160 Z" fill="url(#blueGrad)" opacity="0.2"></path>
                <path d="M0,160 Q20,150 40,160" fill="none" stroke="#22d3ee" strokeWidth="2" className="drop-shadow-[0_0_8px_#22d3ee]"></path>

                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="1" x2="0" y2="0">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div className="absolute bottom-6 flex gap-1 text-[8px] font-mono font-bold text-slate-500 uppercase tracking-widest text-center px-2">
              <span>JUN 01</span><span>JUN 15</span><span>JUL 01</span><span>JUL 15</span><span>AUG 01</span>
            </div>
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

            <div className="space-y-6 flex-1 w-full px-4 items-center flex flex-col">
              {/* Vertical Progress Markers */}
              <div className="w-full h-16 bg-slate-50 dark:bg-[#0f172a] rounded-full p-0.5 border border-slate-200 dark:border-slate-800 shadow-inner group">
                <div className="w-full bg-pink-500 h-[60%] rounded-full shadow-[0_0_5px_#ec4899]"></div>
              </div>

              <div className="w-full h-16 bg-slate-50 dark:bg-[#0f172a] rounded-full p-0.5 border border-slate-200 dark:border-slate-800 shadow-inner group">
                <div className="w-full bg-blue-500 h-[80%] rounded-full shadow-[0_0_5px_#3b82f6]"></div>
              </div>

              <div className="w-full h-16 bg-slate-50 dark:bg-[#0f172a] rounded-full p-0.5 border border-slate-200 dark:border-slate-800 shadow-inner group">
                <div className="w-full bg-amber-500 h-[30%] rounded-full shadow-[0_0_5px_#f59e0b]"></div>
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
                <p className="text-slate-800 dark:text-slate-200 font-medium text-sm">{o.type}</p>
                <p className="text-slate-500 text-xs">{o.action}</p>
              </div>
              <button className="text-cyan-400 hover:text-cyan-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                View Fix <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Terminal Row (From previous design, integrated into this layout) */}
      <div className="mt-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col relative group">
        <div className="bg-slate-50 dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex space-x-2">
              <div className="w-3 h-3 rounded-full bg-rose-500"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            </div>
            <span className="text-slate-500 font-mono text-xs uppercase tracking-wider font-bold">Analysis Engine Log</span>
          </div>
        </div>
        <div className="p-8 font-mono text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          <div className="flex flex-col gap-2 mb-6 text-emerald-400 uppercase tracking-widest text-[10px] sm:text-xs font-bold font-mono">
            <div className="flex items-center"><ChevronRight className="w-4 h-4 mr-1" /> Initiating Neural Code Scan... [SUCCESS]</div>
            <div className="flex items-center"><ChevronRight className="w-4 h-4 mr-1" /> Validating Dependency Metrics... [SUCCESS]</div>
          </div>

          <div className="mb-4 text-emerald-300 font-bold border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">techcorp@alpha:~$</span> print_executive_summary()
          </div>

          <div className="pl-4 border-l-2 border-slate-300 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 prose prose-invert prose-p:my-2 max-w-none prose-strong:text-slate-900 dark:text-white pb-6">
            {project.final_report ? (
              <ReactMarkdown>
                {project.final_report}
              </ReactMarkdown>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 italic">No summary generated.</p>
            )}
          </div>

          <div className="flex items-center">
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">techcorp@alpha:~$</span>
            <span className="ml-2 w-2.5 h-4 bg-slate-400 animate-pulse inline-block"></span>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ReportView;
