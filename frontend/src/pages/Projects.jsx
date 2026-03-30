import React, { useState, useEffect } from 'react';
import { FolderOpen, Search, Plus, ExternalLink, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { getAllProjects, deleteProject, deleteAllProjects } from '../services/api';

const statusBadge = (status) => {
  const map = {
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return `text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${map[status] || map.processing}`;
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = () => {
    setLoading(true);
    getAllProjects()
      .then(data => setProjects(data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to remove project: ${name}?`)) {
      try {
        await deleteProject(id);
        fetchProjects();
      } catch (err) {
        alert("Failed to delete project");
      }
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to clear ALL project history? This cannot be undone.")) {
      try {
        await deleteAllProjects();
        fetchProjects();
      } catch (err) {
        alert("Failed to clear history");
      }
    }
  };

  const filtered = projects.filter(p => {
    const name = p.github_url || p._id || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="animate-fade-in pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Projects Portfolio</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">All your analyzed projects and their health statuses.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleClearAll}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700">
            <Trash2 className="h-4 w-4" /> Clear History
          </button>
          <button onClick={() => navigate('/dashboard')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 border border-indigo-500">
            <Plus className="h-4 w-4" /> New Analysis
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex gap-4 bg-slate-50 dark:bg-[#0f172a]/50">
          <div className="relative w-full sm:w-72">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by repository name..."
              className="w-full bg-slate-100 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500" />
          </div>
          <span className="text-xs text-slate-500 self-center ml-auto">{filtered.length} project{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-sm">Loading projects...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-slate-300 dark:border-slate-700/50">
              <FolderOpen className="h-8 w-8 text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
              {search ? 'No projects match your search' : 'No Projects Yet'}
            </h3>
            <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
              {search ? 'Try a different search term.' : 'Go to the Dashboard and run your first AI analysis.'}
            </p>
            {!search && (
              <button onClick={() => navigate('/dashboard')} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-300 text-sm font-medium">
                Start an Analysis →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filtered.map((p) => {
              const name = p.github_url
                ? p.github_url.replace('https://github.com/', '').replace('.git', '')
                : `Upload · ${p._id?.slice(-8)}`;
              const health = p.metrics
                ? Math.max(40, 100 - (p.metrics.avg_complexity || 0) * 2 - (p.metrics.duplication_percentage || 0))
                : null;
              const date = p.created_at ? new Date(p.created_at).toLocaleDateString() : '—';
              const criticalRisks = (p.risks || []).filter(r => r.score >= 8).length;

              return (
                <div key={p._id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="h-5 w-5 text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white text-sm truncate">{name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-slate-500 flex items-center gap-1"><Clock className="h-3 w-3" />{date}</span>
                      {health && <span className="text-xs text-slate-500">Health: <span className={health >= 70 ? 'text-emerald-400' : health >= 50 ? 'text-amber-400' : 'text-red-400'}>{Math.round(health)}%</span></span>}
                      {criticalRisks > 0 && <span className="text-xs text-red-400 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{criticalRisks} critical</span>}
                    </div>
                  </div>
                  <span className={statusBadge(p.status)}>{p.status}</span>
                  {p.status === 'completed' && (
                    <Link to={`/project/${p._id}`} className="text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 text-xs font-medium ml-2">
                      Report <ExternalLink className="h-3 w-3" />
                    </Link>
                  )}
                  {p.status === 'processing' && (
                    <span className="text-blue-400 text-xs font-mono animate-pulse ml-2">Processing...</span>
                  )}
                  <button onClick={() => handleDelete(p._id, name)} 
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all ml-2"
                    title="Delete project">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;
