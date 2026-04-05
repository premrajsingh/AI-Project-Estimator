import React, { useState, useEffect } from 'react';
import { FileText, ExternalLink, Calendar, Clock, IndianRupee, Lightbulb, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getAllProjects, getAllPlannings, deleteProject, deletePlanning, deleteAllProjects, deleteAllPlannings } from '../services/api';

const Reports = () => {
  const [projects, setProjects] = useState([]);
  const [plannings, setPlannings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchReports = () => {
    setLoading(true);
    Promise.all([getAllProjects(), getAllPlannings()])
      .then(([p, pl]) => { setProjects(p || []); setPlannings(pl || []); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDelete = async (type, id) => {
    if (!window.confirm('Are you sure you want to delete this report?')) return;
    try {
      if (type === 'code') await deleteProject(id);
      else await deletePlanning(id);
      fetchReports();
    } catch (err) {
      alert('Failed to delete report.');
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('CRITICAL: This will permanently delete ALL historical reports. Proceed?')) return;
    try {
      await Promise.all([deleteAllProjects(), deleteAllPlannings()]);
      fetchReports();
    } catch (err) {
      alert('Failed to clear history.');
    }
  };

  const completedProjects = projects.filter(p => p.status === 'completed');
  const completedPlannings = plannings.filter(p => p.status === 'completed');

  const allReports = [
    ...completedProjects.map(p => ({
      id: p._id,
      type: 'code',
      name: p.github_url
        ? p.github_url.replace('https://github.com/', '').replace('.git', '')
        : `Code Upload · ${p._id?.slice(-6)}`,
      date: p.created_at,
      effort: p.estimations?.predicted_effort_hours,
      cost: p.estimations?.predicted_cost_dollars,
      link: `/project/${p._id}`,
    })),
    ...completedPlannings.map(p => ({
      id: p._id,
      type: 'planning',
      name: (p.description || 'Idea Estimate').slice(0, 60),
      date: p.created_at,
      days: p.estimation?.estimated_days,
      link: `/planning/${p._id}`,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filtered = filter === 'all' ? allReports
    : allReports.filter(r => r.type === filter);

  return (
    <div className="animate-fade-in pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Generated Reports</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Access and review all your historical analysis reports.</p>
        </div>
        <button 
          onClick={handleClearAll}
          className="text-xs font-bold text-red-500 hover:text-red-400 flex items-center gap-1.5 transition-colors uppercase tracking-widest px-3 py-2 border border-red-500/20 rounded-lg hover:bg-red-500/5"
        >
          <Trash2 className="w-3.5 h-3.5" /> Clear All History
        </button>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center bg-slate-50 dark:bg-[#0f172a]/50">
          <div className="flex gap-2">
            {[
              { val: 'all', label: 'All Reports' },
              { val: 'code', label: 'Code Analysis' },
              { val: 'planning', label: 'Idea Estimates' },
            ].map(({ val, label }) => (
              <button key={val} onClick={() => setFilter(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${filter === val ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                {label}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 ml-auto">{filtered.length} report{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading reports...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-slate-300 dark:border-slate-700/50">
              <FileText className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Reports Yet</h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Run a code analysis from the Dashboard or use the Idea Estimator to generate your first report.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((r) => (
              <div key={r.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${r.type === 'code' ? 'bg-indigo-500/10' : 'bg-amber-500/10'}`}>
                  {r.type === 'code'
                    ? <FileText className="h-5 w-5 text-indigo-400" />
                    : <Lightbulb className="h-5 w-5 text-amber-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{r.name}</p>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {r.date ? new Date(r.date).toLocaleDateString() : '—'}
                    </span>
                    {r.effort && <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="h-3 w-3" />{r.effort} hrs</span>}
                    {r.cost && <span className="text-xs text-slate-500 flex items-center gap-1"><IndianRupee className="h-3 w-3" />₹{Math.round(r.cost / 1000)}k</span>}
                    {r.days && <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="h-3 w-3" />{r.days} days est.</span>}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${r.type === 'code' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                  {r.type === 'code' ? 'Code Report' : 'Idea Estimate'}
                </span>
                <div className="flex items-center gap-2 ml-auto">
                  {r.link && (
                    <Link to={r.link} className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 text-xs font-medium px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg">
                      View <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  <button 
                    onClick={() => handleDelete(r.type, r.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-500/10"
                    title="Delete Report"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
