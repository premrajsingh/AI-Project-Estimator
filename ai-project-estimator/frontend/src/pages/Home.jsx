import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bot, BarChart2, Shield, Zap, ArrowRight, CloudUpload, Link as LinkIcon, Activity, AlertTriangle } from 'lucide-react';
import { analyzeProject } from '../services/api';

const Home = () => {
  const [showInjector, setShowInjector] = useState(false);
  const [url, setUrl] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleGuestEstimation = async (e) => {
    if (e) e.preventDefault();
    if (!url && !file) return;

    // Check free estimation count
    const freeEstimations = parseInt(localStorage.getItem('freeEstimations') || '0', 10);
    if (freeEstimations >= 2) {
      navigate('/register');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await analyzeProject(url, file);
      if (data && data.project_id) {
        // Increment and save count
        localStorage.setItem('freeEstimations', (freeEstimations + 1).toString());
        navigate(`/project/${data.project_id}`);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "System overload: Target unreachable.");
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 selection:bg-indigo-500/30 font-sans">
      {/* Navbar */}
      <nav className="fixed w-full z-50 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-indigo-500 to-cyan-400 p-1.5 rounded">
               <Bot className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">AI Project Estimator</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors hidden sm:block">
              Log in
            </Link>
            <Link to="/register" className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 sm:pt-40 sm:pb-24 overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 blur-[120px] rounded-full point-events-none"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 blur-[100px] rounded-full point-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium mb-8">
            <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
            Supercharge your project planning
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-extrabold text-white tracking-tight mb-8 leading-tight">
            Estimate AI Projects <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
              with pinpoint precision.
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-slate-400 mb-10 leading-relaxed">
            Stop guessing deadlines. Use our advanced AI models to analyze your repositories, predict risks, and generate highly accurate development workflows and timelines in seconds.
          </p>

          {!showInjector ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button 
                onClick={() => setShowInjector(true)}
                className="h-14 px-8 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] hover:-translate-y-1 w-full sm:w-auto justify-center"
              >
                Start Estimating Free <ArrowRight className="h-5 w-5" />
              </button>
              <Link to="/login" className="h-14 px-8 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-semibold flex items-center justify-center transition-all w-full sm:w-auto border border-slate-700 hover:border-slate-600">
                Sign In
              </Link>
            </div>
          ) : (
            <div className="bg-white/5 dark:bg-[#111827]/80 backdrop-blur-xl border border-white/10 dark:border-slate-700/50 rounded-2xl p-8 max-w-3xl mx-auto shadow-2xl relative overflow-hidden group text-left animate-fade-in mt-12">
              <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -z-10 group-hover:bg-cyan-500/20 transition-colors"></div>

              <h2 className="text-xl font-black text-cyan-400 tracking-widest uppercase mb-1">Neural Injection Point</h2>
              <div className="flex justify-between items-center mb-6">
                 <p className="text-slate-300 dark:text-slate-400 text-sm font-mono">2 Free Analyses Remaining.</p>
                 <button onClick={() => setShowInjector(false)} className="text-slate-400 hover:text-white text-sm font-bold tracking-wider uppercase">Cancel</button>
              </div>

              <div className="flex flex-col md:flex-row gap-6 items-center border-t border-white/10 pt-6">
                <div className="relative flex-shrink-0">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".zip"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFile(e.target.files[0]);
                        setUrl(''); // Clear URL if file is selected
                      }
                    }}
                  />
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className={`w-32 h-32 rounded-full border-2 border-dashed ${file ? 'border-indigo-500 bg-indigo-500/10' : 'border-cyan-500/40 bg-slate-900/50 hover:border-cyan-400/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.2)]'} flex flex-col items-center justify-center transition-all cursor-pointer group/archive`}
                  >
                    <CloudUpload className={`h-8 w-8 mb-2 ${file ? 'text-indigo-400' : 'text-cyan-400 group-hover/archive:text-cyan-300'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300 text-center px-2 truncate w-full">
                      {file ? file.name : "ZIP Drop"}
                    </span>
                  </div>
                </div>

                <div className="flex-1 w-full flex flex-col justify-center">
                  <span className="text-xs font-mono text-cyan-400/80 mb-3 block text-center md:text-left">OR CONNECT REPOSITORY URL</span>
                  <form onSubmit={handleGuestEstimation} className="relative group/input">
                    <div className="flex items-center bg-slate-900/50 border border-slate-700 rounded-lg overflow-hidden focus-within:border-cyan-500/50 focus-within:shadow-[0_0_15px_rgba(34,211,238,0.15)] transition-all">
                      <span className="pl-3 text-slate-500 group-focus-within/input:text-cyan-400"><LinkIcon className="h-4 w-4" /></span>
                      <input
                        type="url"
                        className="w-full bg-transparent border-none py-3 px-3 text-white text-sm focus:outline-none focus:ring-0 placeholder-slate-500 font-mono disabled:opacity-50"
                        placeholder="https://github.com/username/project"
                        value={url}
                        onChange={(e) => {
                          setUrl(e.target.value);
                          if (e.target.value) setFile(null); // Clear file if URL is entered
                        }}
                        disabled={loading || file}
                      />
                      <button type="submit" disabled={(!url && !file) || loading} className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 font-bold py-3 px-5 rounded-r-lg text-xs uppercase tracking-wider transition-all active:scale-95">
                        Initiate →
                      </button>
                    </div>
                  </form>

                  {loading && (
                    <div className="mt-4 flex items-center gap-3 text-cyan-400 font-mono text-xs tracking-widest uppercase">
                      <Activity className="h-4 w-4 animate-pulse" /> neural agents analyzing framework...
                    </div>
                  )}

                  {error && (
                    <div className="mt-4 text-red-400 text-sm flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> {error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-24 bg-slate-900/50 border-t border-slate-800 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
             <h2 className="text-3xl font-bold text-white mb-4">Everything you need to ship AI products</h2>
             <p className="text-slate-400 max-w-2xl mx-auto">Our platform combines codebase analysis with machine learning metrics to give you the most accurate software delivery estimates possible.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-indigo-500/50 transition-colors group">
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart2 className="h-6 w-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Resource Estimation</h3>
              <p className="text-slate-400 leading-relaxed">Intelligently calculate required team sizes, compute resources, and budget forecasts for complex AI architectures.</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-cyan-500/50 transition-colors group">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="h-6 w-6 text-cyan-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Risk Assessment</h3>
              <p className="text-slate-400 leading-relaxed">Automatically flag potential bottlenecks, dependency hell, and common AI integration pitfalls before writing code.</p>
            </div>

            <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/50 transition-colors group">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap className="h-6 w-6 text-emerald-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">Automated Workflows</h3>
              <p className="text-slate-400 leading-relaxed">Generate actionable GitOps CI/CD templates and MLOps deployment strategies tailored to your specific repository.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Simple Footer */}
      <footer className="border-t border-slate-800 py-12 text-center text-slate-500 text-sm">
        <p>© 2026 AI Project Analyst. Built for the modern engineering team.</p>
      </footer>
    </div>
  );
};

export default Home;
