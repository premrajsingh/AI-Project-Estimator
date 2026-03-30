import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Info, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAllProjects } from '../services/api';

const RiskAnalysis = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllProjects()
      .then(data => setProjects((data || []).filter(p => p.status === 'completed')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Aggregate all risks across completed projects
  const allRisks = projects.flatMap(p =>
    (p.risks || []).map(r => ({
      ...r,
      projectId: p._id,
      projectName: p.github_url
        ? p.github_url.replace('https://github.com/', '').replace('.git', '')
        : `Upload·${p._id?.slice(-6)}`,
    }))
  );

  const critical = allRisks.filter(r => r.score >= 8);
  const moderate = allRisks.filter(r => r.score >= 5 && r.score < 8);
  const low = allRisks.filter(r => r.score < 5);

  return (
    <div className="animate-fade-in pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Global Risk Analysis
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Aggregated risks across all {projects.length} analyzed project{projects.length !== 1 ? 's' : ''}.
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-[#111827] border border-red-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-red-500/10 p-2 rounded-lg"><AlertTriangle className="h-5 w-5 text-red-400" /></div>
            <h3 className="text-slate-900 dark:text-white font-medium">Critical Vulnerabilities</h3>
          </div>
          <div className="text-4xl font-black text-red-400">{loading ? '—' : critical.length}</div>
          <p className="text-xs text-slate-500 mt-2">Score 8–10 · Requires immediate attention</p>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-amber-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-amber-500/10 p-2 rounded-lg"><Info className="h-5 w-5 text-amber-400" /></div>
            <h3 className="text-slate-900 dark:text-white font-medium">Moderate Risks</h3>
          </div>
          <div className="text-4xl font-black text-amber-400">{loading ? '—' : moderate.length}</div>
          <p className="text-xs text-slate-500 mt-2">Score 5–7 · Monitor and plan remediation</p>
        </div>
        <div className="bg-white dark:bg-[#111827] border border-emerald-500/20 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-emerald-500/10 p-2 rounded-lg"><CheckCircle className="h-5 w-5 text-emerald-400" /></div>
            <h3 className="text-slate-900 dark:text-white font-medium">Low / Stable</h3>
          </div>
          <div className="text-4xl font-black text-emerald-400">{loading ? '—' : low.length}</div>
          <p className="text-xs text-slate-500 mt-2">Score 1–4 · Acceptable risk levels</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading risk data...</div>
      ) : allRisks.length === 0 ? (
        <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
          <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
            <ShieldAlert className="h-10 w-10 text-amber-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">No Risks Detected Yet</h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Run a code analysis from the Dashboard to start detecting risks across your repositories.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">All Detected Risks</h2>
          {[...critical, ...moderate, ...low].map((r, i) => (
            <div key={i} className={`bg-white dark:bg-[#111827] border rounded-xl p-5 flex items-start gap-4 ${r.score >= 8 ? 'border-red-500/30' : r.score >= 5 ? 'border-amber-500/30' : 'border-emerald-500/30'}`}>
              <div className={`p-2 rounded-lg flex-shrink-0 ${r.score >= 8 ? 'bg-red-500/10' : r.score >= 5 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                {r.score >= 8
                  ? <AlertTriangle className="h-5 w-5 text-red-400" />
                  : r.score >= 5
                  ? <Info className="h-5 w-5 text-amber-400" />
                  : <CheckCircle className="h-5 w-5 text-emerald-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${r.score >= 8 ? 'bg-red-500/10 text-red-400 border-red-500/20' : r.score >= 5 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                    {r.score >= 8 ? 'Critical' : r.score >= 5 ? 'Moderate' : 'Low'} · Score {r.score}/10
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                    {r.type}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-sm">{r.reason}</p>
                <p className="text-slate-500 text-xs mt-1">Project: {r.projectName}</p>
              </div>
              <Link to={`/project/${r.projectId}`} className="text-indigo-400 hover:text-indigo-300 text-xs font-medium flex items-center gap-1 flex-shrink-0">
                View <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RiskAnalysis;
