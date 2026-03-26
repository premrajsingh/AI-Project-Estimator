import React from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Info } from 'lucide-react';

const RiskAnalysis = () => {
  return (
    <div className="animate-fade-in pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Global Risk Analysis
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Overview of security, performance, and operational risks across all analyzed projects.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg p-12 text-center">
        <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
          <ShieldAlert className="h-10 w-10 text-amber-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Risk Assessment Hub</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-8">
          This module aggregates and categorizes risks from all your analyzed repositories. Currently, no active projects have flagged global-level critical risks.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
          <div className="bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <h3 className="text-slate-900 dark:text-white font-medium">Critical Vulnerabilities</h3>
            </div>
            <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">0</div>
            <p className="text-xs text-slate-500 mt-2">Requires immediate attention</p>
          </div>

          <div className="bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Info className="h-5 w-5 text-amber-400" />
              <h3 className="text-slate-900 dark:text-white font-medium">Moderate Risks</h3>
            </div>
            <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">0</div>
            <p className="text-xs text-slate-500 mt-2">Monitor and plan remediation</p>
          </div>

          <div className="bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
              <h3 className="text-slate-900 dark:text-white font-medium">Resolved Issues</h3>
            </div>
            <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">0</div>
            <p className="text-xs text-slate-500 mt-2">Mitigated in the last 30 days</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskAnalysis;
