import React from 'react';
import {
  FolderOpen,
  MoreVertical,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Projects = () => {
  return (
    <div className="animate-fade-in pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Projects Portfolio
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Manage and view all your analyzed projects and their associated statuses.</p>
        </div>
        <button className="bg-indigo-600 hover:bg-indigo-500 text-slate-900 dark:text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 border border-indigo-500">
          <Plus className="h-4 w-4" /> Create Project
        </button>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-[#0f172a]/50">
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search projects by name..."
              className="w-full bg-slate-100 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-800/50">
          {/* Empty State when no real projects exist */}
          <div className="py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-slate-300 dark:border-slate-700/50">
              <FolderOpen className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Projects Found</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              You haven't categorized any repositories into projects yet. Create your first project to start organizing your analyses.
            </p>
            <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-300 text-sm font-medium">
              Learn about Projects &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Projects;
