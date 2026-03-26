import React from 'react';
import {
  GitBranch,
  Github,
  Search,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

const Repositories = () => {
  return (
    <div className="animate-fade-in pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Connected Repositories
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your connected version control systems and mapped repositories.</p>
        </div>
        <button className="bg-[#24292F] hover:bg-[#24292F]/80 text-slate-900 dark:text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 border border-slate-300 dark:border-slate-700">
          <Github className="h-4 w-4" /> Connect GitHub
        </button>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-[#0f172a]/50">
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search repositories..."
              className="w-full bg-slate-100 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-800/50">
          <div className="py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-slate-300 dark:border-slate-700/50">
              <GitBranch className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Repositories Connected</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              Connect your GitHub or GitLab account to automatically sync and analyze your codebases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Repositories;
