import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Github,
  Search,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { getGithubRepos, connectGithubUrl } from '../services/api';

const Repositories = () => {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('connected') === 'true') {
      setConnected(true);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (urlParams.get('error')) {
      setError(urlParams.get('error'));
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    setLoading(true);
    try {
      const data = await getGithubRepos();
      setRepos(data);
      setError(null);
    } catch (err) {
      if (err.response?.status !== 400) { // 400 means not connected, which is a valid state
        setError('Failed to fetch repositories. Please try reconnecting.');
      }
      setRepos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = () => {
    window.location.href = connectGithubUrl();
  };

  const filteredRepos = repos.filter(repo => 
    repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in pb-12">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            Connected Repositories
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Manage your connected version control systems and mapped repositories.</p>
        </div>
        <button 
          onClick={handleConnect}
          className="bg-[#24292F] hover:bg-[#24292F]/80 text-white px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 border border-slate-300 dark:border-slate-700"
        >
          <Github className="h-4 w-4" /> {repos.length > 0 ? 'Reconnect GitHub' : 'Connect GitHub'}
        </button>
      </div>

      {connected && (
        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-5 w-5" />
          <p className="font-medium">Successfully connected to GitHub!</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3 text-rose-600 dark:text-rose-400">
          <AlertCircle className="h-5 w-5" />
          <p className="font-medium">{error}</p>
        </div>
      )}

      <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-[#0f172a]/50">
          <div className="relative w-full sm:w-64">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-[#1e293b] border border-slate-300 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
            />
          </div>
          {repos.length > 0 && (
            <button 
              onClick={fetchRepos}
              disabled={loading}
              className="text-slate-500 hover:text-indigo-500 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Repos
            </button>
          )}
        </div>

        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 className="h-8 w-8 text-indigo-500 animate-spin mx-auto mb-4" />
              <p className="text-slate-500 text-sm">Fetching your repositories...</p>
            </div>
          ) : repos.length > 0 ? (
            filteredRepos.length > 0 ? (
              filteredRepos.map((repo) => (
                <div key={repo.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      <Github className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-500 transition-colors">
                        {repo.name}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-3">
                        <span>{repo.language || 'Unknown'}</span>
                        <span>•</span>
                        <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                      </p>
                    </div>
                  </div>
                  <a 
                    href={repo.html_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="p-2 text-slate-400 hover:text-indigo-500 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-slate-500">
                No repositories found matching "{searchQuery}"
              </div>
            )
          ) : (
            <div className="py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-slate-300 dark:border-slate-700/50">
                <GitBranch className="h-8 w-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">No Repositories Connected</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
                Connect your GitHub account to automatically sync and analyze your codebases.
              </p>
              <button 
                onClick={handleConnect}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all shadow-lg shadow-indigo-500/25"
              >
                Connect GitHub Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Repositories;
