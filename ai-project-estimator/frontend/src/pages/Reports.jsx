import React from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter
} from 'lucide-react';

const Reports = () => {
  return (
    <div className="animate-fade-in pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Generated Reports
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Access, download, and manage your historical analysis reports.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-[#0f172a]/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Calendar className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <select className="bg-slate-100 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-8 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500 appearance-none">
                <option>Last 30 Days</option>
                <option>Last 3 Months</option>
                <option>All Time</option>
              </select>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-800/50">
          <div className="py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-slate-300 dark:border-slate-700/50">
              <FileText className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Reports Generated</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              You haven't run any AI analysis yet. Go to the dashboard and analyze a repository to generate your first report.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
