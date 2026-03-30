import React, { useState, useRef, useEffect } from 'react';
import { 
  Lightbulb, Users, Calendar, UploadCloud, ArrowRight, BrainCircuit, 
  ShieldAlert, CheckCircle, Activity, ChevronRight, File, 
  Image as ImageIcon, Clock, DollarSign, Bell, Code2, AlertTriangle, AlertCircle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { estimatePlanning, getPlanningDetails } from '../services/api';

const CircularProgress = ({ value, label }) => {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center p-6">
      <svg className="transform -rotate-90 w-48 h-48">
        <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-200 dark:text-slate-800" />
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

const ProjectPlanning = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    teamSize: '1',
    experience: 'Intermediate',
    description: '',
    expectedDays: '30'
  });
  const [file, setFile] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [planningId, setPlanningId] = useState(null);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setStep(4); // Moving to Analyzing Step
    
    try {
      const data = new FormData();
      data.append('team_size', formData.teamSize);
      data.append('experience', formData.experience);
      data.append('description', formData.description || 'Not provided');
      data.append('expected_days', formData.expectedDays);
      if (file) {
        data.append('file', file);
      }
      
      const res = await estimatePlanning(data);
      if (res && res.planning_id) {
        setPlanningId(res.planning_id);
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to initiate planning analysis.");
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (planningId && !result && loading) {
      const fetchResult = async () => {
        try {
          const data = await getPlanningDetails(planningId);
          if (data && data.status === 'completed' && data.estimation) {
            setResult(data.estimation);
            setLoading(false);
            clearInterval(interval);
          } else if (data && data.status === 'failed') {
             setError(data.error_message || "Analysis failed.");
             setLoading(false);
             clearInterval(interval);
          }
        } catch (err) {
          console.error("Error polling", err);
        }
      };
      fetchResult();
      interval = setInterval(fetchResult, 3000);
    }
    return () => clearInterval(interval);
  }, [planningId, result, loading]);

  const effortHours = result ? (parseInt(result.estimated_days) * 8 * parseInt(formData.teamSize)) : 0;
  const projectCost = result ? (effortHours * 50) : 0; // Mock cost calculation

  return (
    <div className="animate-fade-in pb-12 text-slate-800 dark:text-slate-200">
      <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <Lightbulb className="h-8 w-8 text-amber-500" /> Idea Estimator
        </h1>
        <p className="text-slate-500 mt-2">Blueprint your next big project and predict development efforts before writing a single line of code.</p>
      </div>

      <div className="max-w-[1400px] mx-auto">
        
        {/* Step Indicator */}
        {step < 5 && result == null && (
          <div className="max-w-4xl mx-auto flex justify-between items-center mb-10 px-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex flex-col items-center relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                  {s}
                </div>
                <span className={`text-[10px] uppercase font-bold mt-2 tracking-widest ${step >= s ? 'text-indigo-500' : 'text-slate-400'}`}>
                  {s === 1 ? 'Team' : s === 2 ? 'Idea' : s === 3 ? 'Specs' : 'Analyze'}
                </span>
              </div>
            ))}
            {/* Progress line */}
            <div className="absolute left-1/2 -translate-x-1/2 top-4 w-[700px] h-0.5 bg-slate-200 dark:bg-slate-800 -z-10">
               <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
            </div>
          </div>
        )}

        {/* Input Phase Container */}
        {result == null && (
          <div className="max-w-4xl mx-auto bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[400px] flex flex-col relative group p-8">
            {step === 1 && (
               <div className="flex-1 animate-fade-in">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">Who is building this?</h2>
                  <div className="space-y-6">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><Users className="w-4 h-4"/> Team Size</label>
                          <input type="number" min="1" max="100" value={formData.teamSize} onChange={e => setFormData({...formData, teamSize: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1120] border border-slate-300 dark:border-slate-700 rounded-lg py-3 px-4 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><BrainCircuit className="w-4 h-4"/> Average Experience Level</label>
                          <select value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1120] border border-slate-300 dark:border-slate-700 rounded-lg py-3 px-4 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors">
                              <option>Beginner</option>
                              <option>Intermediate</option>
                              <option>Advanced</option>
                              <option>Expert</option>
                          </select>
                      </div>
                  </div>
                  <div className="mt-10 flex justify-end">
                      <button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">Next Step <ArrowRight className="w-4 h-4"/></button>
                  </div>
               </div>
            )}

            {step === 2 && (
               <div className="flex-1 animate-fade-in">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">What are you building?</h2>
                  <div className="space-y-6">
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4"/> Project Description</label>
                          <textarea rows="4" placeholder="Describe the app you want to build (e.g., 'A social media platform for pet owners...')" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1120] border border-slate-300 dark:border-slate-700 rounded-lg py-3 px-4 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2"><Calendar className="w-4 h-4"/> Expected Completion (Days)</label>
                          <input type="number" min="1" value={formData.expectedDays} onChange={e => setFormData({...formData, expectedDays: e.target.value})} className="w-full bg-slate-50 dark:bg-[#0B1120] border border-slate-300 dark:border-slate-700 rounded-lg py-3 px-4 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors" />
                      </div>
                  </div>
                  <div className="mt-10 flex justify-between">
                      <button onClick={handleBack} className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-lg font-medium transition-all">Back</button>
                      <button onClick={handleNext} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2" disabled={!formData.description}>Next Step <ArrowRight className="w-4 h-4"/></button>
                  </div>
               </div>
            )}

            {step === 3 && (
              <div className="flex-1 animate-fade-in">
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Upload Requirements</h2>
                  <p className="text-slate-500 mb-6 text-sm">Upload a PDF specification document or an image of your Figma design to give the AI more context (Optional).</p>
                  <div className="border-2 border-dashed border-indigo-500/30 rounded-xl p-10 flex flex-col items-center justify-center bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors cursor-pointer group" onClick={() => fileInputRef.current.click()}>
                      <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,image/png,image/jpeg,image/webp" onChange={handleFileChange} />
                      {file ? (
                          <>
                              {file.type.includes('pdf') ? <File className="w-16 h-16 text-indigo-400 mb-4" /> : <ImageIcon className="w-16 h-16 text-indigo-400 mb-4" />}
                              <span className="text-slate-900 dark:text-white font-bold">{file.name}</span>
                              <span className="text-slate-500 text-sm mt-1">Click to change file</span>
                          </>
                      ) : (
                          <>
                              <UploadCloud className="w-16 h-16 text-slate-400 group-hover:text-indigo-400 transition-colors mb-4" />
                              <span className="text-slate-700 dark:text-slate-300 font-bold">Click to browse formats</span>
                              <span className="text-slate-500 text-sm mt-1">PDF, PNG, JPG supported.</span>
                          </>
                      )}
                  </div>
                  <div className="mt-10 flex justify-between">
                      <button onClick={handleBack} className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-lg font-medium transition-all">Back</button>
                      <button onClick={handleSubmit} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 px-8 py-2.5 rounded-lg font-black tracking-widest uppercase shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all flex items-center gap-2 border border-cyan-400">Generate Blueprint <BrainCircuit className="w-5 h-5"/></button>
                  </div>
              </div>
            )}

            {step === 4 && result == null && !error && (
              <div className="flex-1 animate-fade-in flex flex-col items-center justify-center py-10">
                  <Activity className="h-16 w-16 text-cyan-400 animate-pulse mb-6" />
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-widest uppercase mb-2">Analyzing Architecture</h2>
                  <p className="text-slate-500 font-mono text-sm max-w-sm text-center">Neural agents are currently tearing down requirements and synthesizing development models...</p>
              </div>
            )}

            {error && step === 4 && (
               <div className="flex-1 animate-fade-in flex flex-col items-center justify-center py-10 text-center">
                   <ShieldAlert className="h-16 w-16 text-red-500 mb-4"/>
                   <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Analysis Failed</h2>
                   <p className="text-slate-500 mb-6">{error}</p>
                   <button onClick={() => setStep(1)} className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white px-6 py-2 rounded-lg font-medium">Try Again</button>
               </div>
            )}
          </div>
        )}

        {/* Results Phase - Dashboard Style */}
        {result && (
          <div className="space-y-8 animate-fade-in">
            {/* Header / Summary Card */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-[60px]"></div>
                <div>
                   <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Generated Analysis</h3>
                   <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Project Planning Blueprint</h2>
                   <p className="text-slate-500 text-sm mt-1 font-mono">Generated on {new Date().toLocaleDateString()} • AI Confidence: 96%</p>
                </div>
                <div className="flex items-center gap-3">
                   <button onClick={() => { setStep(1); setResult(null); setFormData({...formData, description: ''}); setFile(null); }} className="inline-flex items-center bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-medium shadow-lg shadow-indigo-500/20 border border-indigo-500 transition-all text-sm">
                      <Activity className="h-4 w-4 mr-2" /> New Analysis
                   </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 mb-8 relative overflow-hidden">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Executive Summary</h3>
                <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4">
                    {result.summary}
                </p>
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold font-mono">
                    <ArrowRight className="w-3 h-3" /> Ready for development initiation. All critical paths identified.
                </div>
            </div>

            {/* Main Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
               
               {/* Health Score Component */}
               <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                  <CircularProgress value={88} label="VIABILITY" />
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-4 mb-2">Project Viability</h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 font-mono">
                    AI Prediction:<br />High success potential. Resources aligned with scope.
                  </p>
                  <div className="mt-auto w-full flex justify-between items-end border-t border-slate-200 dark:border-slate-800 pt-6">
                    <div className="text-left">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">CONFIDENCE:</span>
                      <div className="text-xl font-bold text-slate-700 dark:text-slate-300">92%</div>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="text-emerald-400 font-bold text-lg mb-0.5">High</span>
                      <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 flex items-center py-0.5 rounded text-[10px] font-black uppercase tracking-wider shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                        <span className="mr-1">↗</span> Stable
                      </span>
                    </div>
                  </div>
               </div>

               {/* Metric Cards Column */}
               <div className="lg:col-span-2 space-y-6 flex flex-col">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Effort Card */}
                    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><Clock className="w-16 h-16" /></div>
                      <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Effort</span>
                          <div className="text-4xl font-black text-slate-900 dark:text-white mt-1">{effortHours} <span className="text-xl text-slate-500 font-medium">hrs</span></div>
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs font-bold border border-blue-500/20">{result.estimated_days} Days</span>
                        <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full"><div className="w-3/4 h-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></div></div>
                      </div>
                    </div>

                    {/* Cost Card */}
                    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                      <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-16 h-16" /></div>
                      <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Projected Cost</span>
                          <div className="text-4xl font-black text-slate-900 dark:text-white mt-1">${Math.round(projectCost / 1000)}k</div>
                      </div>
                      <div className="flex items-center gap-3 mt-4">
                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold border border-emerald-500/20">Optimal</span>
                        <span className="text-xs font-mono text-slate-500 uppercase">Estimated</span>
                        <svg className="w-10 h-4 ml-auto" viewBox="0 0 40 16"><path d="M0,12 L10,8 L20,14 L40,2" fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                      </div>
                    </div>

                    {/* Risk Card */}
                    <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Risk Level</span>
                          <div className={`text-3xl font-black mt-1 ${result.risks?.length > 3 ? 'text-amber-500' : 'text-emerald-400'}`}>{result.risks?.length > 3 ? 'Moderate' : 'Low'}</div>
                        </div>
                        <div className={`${result.risks?.length > 3 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'} p-2 rounded-lg border`}>
                          {result.risks?.length > 3 ? <AlertTriangle className="w-5 h-5 text-amber-500" /> : <ShieldAlert className="w-5 h-5 text-emerald-500" />}
                        </div>
                      </div>
                      <div className="mt-4">
                        <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2">
                          <div className="bg-emerald-500 h-full w-1/2"></div>
                          <div className="bg-amber-500 h-full w-1/4"></div>
                          <div className="bg-red-500 h-full w-1/4 opacity-20"></div>
                        </div>
                        <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 tracking-widest">
                          <span>Safe</span>
                          <span>Critical</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Container */}
                  <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex-1 relative min-h-[300px]">
                    <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-pink-500" />
                        <h3 className="text-slate-900 dark:text-white font-bold text-lg">Project Timeline</h3>
                      </div>
                      <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest border-b border-cyan-400/30 pb-0.5">Details</span>
                    </div>

                    <div className="space-y-8">
                        {/* Track 1 */}
                        <div className="relative z-10">
                          <div className="flex justify-between text-sm mb-3">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Foundation <span className="text-slate-500 text-xs ml-2 font-mono italic">env setup</span></span>
                            <span className="text-blue-400 font-mono font-bold">100%</span>
                          </div>
                          <div className="w-full bg-slate-50 dark:bg-[#0f172a] rounded-full h-4 border border-slate-200 dark:border-slate-800 p-0.5">
                            <div className="bg-gradient-to-r from-blue-600 to-blue-400 rounded-full h-full relative" style={{ width: '100%' }}></div>
                          </div>
                        </div>

                        {/* Track 2 */}
                        <div className="relative z-10">
                          <div className="flex justify-between text-sm mb-3">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Core Logic <span className="text-slate-500 text-xs ml-2 font-mono italic">main features</span></span>
                            <span className="text-pink-400 font-mono font-bold">Projected</span>
                          </div>
                          <div className="w-full bg-slate-50 dark:bg-[#0f172a] rounded-full h-4 border border-slate-200 dark:border-slate-800 p-0.5">
                            <div className="bg-gradient-to-r from-pink-600 to-fuchsia-400 rounded-full h-full relative" style={{ width: '60%' }}>
                              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-fuchsia-500 shadow-[0_0_15px_#d946ef]"></div>
                            </div>
                          </div>
                        </div>

                        {/* Track 3 */}
                        <div className="relative z-10">
                          <div className="flex justify-between text-sm mb-3">
                            <span className="text-slate-700 dark:text-slate-300 font-medium">Polish & Launch</span>
                            <span className="text-amber-500 font-mono font-bold">Final Phase</span>
                          </div>
                          <div className="w-full bg-slate-50 dark:bg-[#0f172a] rounded-full h-4 border border-slate-200 dark:border-slate-800 p-0.5 flex">
                             <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-full h-full w-2/3 ml-auto"></div>
                          </div>
                        </div>
                    </div>

                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-600 tracking-widest mt-8 px-2">
                       <span>Day 1</span>
                       <span>Midpoint</span>
                       <span>Launch: Day {result.estimated_days}</span>
                    </div>
                  </div>
               </div>

               {/* Right Strips Column */}
               <div className="flex gap-4 h-full">
                  <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl flex-1 p-4 flex flex-col items-center overflow-hidden">
                    <div className="text-center mb-8 mt-2 w-full">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Activity className="w-5 h-5 text-emerald-400" />
                        <h3 className="text-slate-900 dark:text-white font-bold leading-tight">Complexity<br />Index</h3>
                      </div>
                    </div>
                    <div className="relative flex-1 w-full flex justify-center pb-12 pt-4">
                      <div className="absolute top-0 bottom-16 border-l border-dashed border-slate-300 dark:border-slate-700/50 h-full w-px"></div>
                      <svg viewBox="0 0 40 200" className="w-[80%] h-full" preserveAspectRatio="none">
                        <path d="M0,200 L40,200 L40,160 Q20,150 0,160 Z" fill="url(#cyanGrad)" opacity="0.2"></path>
                        <path d="M0,160 Q20,150 40,160" fill="none" stroke="#22d3ee" strokeWidth="2"></path>
                        <defs>
                          <linearGradient id="cyanGrad" x1="0" y1="1" x2="0" y2="0">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="1" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl w-14 py-6 flex flex-col items-center shadow-lg relative h-full">
                    <Bell className="w-5 h-5 text-slate-500 mb-10" />
                    <div className="space-y-6 flex-1 w-full px-4 items-center flex flex-col">
                       <div className="w-full h-16 bg-slate-50 dark:bg-[#0f172a] rounded-full p-0.5 border border-slate-200 dark:border-slate-800 shadow-inner group">
                         <div className="w-full bg-pink-500 h-[60%] rounded-full shadow-[0_0_5px_#ec4899]"></div>
                       </div>
                       <div className="w-full h-16 bg-slate-50 dark:bg-[#0f172a] rounded-full p-0.5 border border-slate-200 dark:border-slate-800 shadow-inner group">
                         <div className="w-full bg-blue-500 h-[80%] rounded-full shadow-[0_0_5px_#3b82f6]"></div>
                       </div>
                    </div>
                  </div>
               </div>
            </div>

            {/* Assessment & Optimization Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
               <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" /> Planning Risk Assessment
                  </h3>
                  {result.risks?.map((risk, i) => (
                    <div key={i} className="rounded-xl p-4 border bg-amber-500/5 border-amber-500/30 flex gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div className="flex-1">
                         <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-amber-500/20 text-amber-400 mb-1 inline-block">Warning</span>
                         <p className="text-slate-700 dark:text-slate-300 text-sm">{risk}</p>
                      </div>
                    </div>
                  ))}
               </div>
               <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4 text-cyan-400" /> Strategic Directions
                  </h3>
                  {result.challenges?.map((challenge, i) => (
                    <div key={i} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:border-cyan-500/20 transition-colors group">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
                        <Code2 className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-800 dark:text-slate-200 font-medium text-sm">Technical Challenge</p>
                        <p className="text-slate-500 text-xs">{challenge}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>

            {/* Analysis Engine Log (Terminal Style) */}
            <div className="mt-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col relative group">
              <div className="bg-slate-50 dark:bg-[#0f172a] border-b border-slate-200 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex space-x-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  </div>
                  <span className="text-slate-500 font-mono text-xs uppercase tracking-wider font-bold">Estimation Engine Log</span>
                </div>
              </div>
              <div className="p-8 font-mono text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                <div className="flex flex-col gap-2 mb-6 text-emerald-400 uppercase tracking-widest text-[10px] sm:text-xs font-bold font-mono">
                  <div className="flex items-center"><ChevronRight className="w-4 h-4 mr-1" /> Analyzing Description... [SUCCESS]</div>
                  <div className="flex items-center"><ChevronRight className="w-4 h-4 mr-1" /> synthesizing Development Model... [SUCCESS]</div>
                </div>
                <div className="mb-4 text-emerald-300 font-bold border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">planning@agent:~$</span> print_estimation_log()
                </div>
                <div className="pl-4 border-l-2 border-slate-300 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 prose prose-invert prose-p:my-2 max-w-none prose-strong:text-slate-900 dark:text-white pb-6">
                   <ReactMarkdown>{result.summary}</ReactMarkdown>
                </div>
                <div className="flex items-center">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">planning@agent:~$</span>
                  <span className="ml-2 w-2.5 h-4 bg-slate-400 animate-pulse inline-block"></span>
                </div>
              </div>
            </div>

            {/* AI Generated Blueprint Section - NEW */}
            <div className="mt-8 bg-white dark:bg-[#0B1120] border border-indigo-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px]"></div>
                <div className="bg-indigo-600/10 border-b border-indigo-500/20 px-8 py-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-indigo-500/20 p-2 rounded-lg border border-indigo-500/30">
                            <BrainCircuit className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-indigo-400 tracking-tight uppercase">Neural Project Blueprint</h2>
                            <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">Architectural Specifications & Roadmap</p>
                        </div>
                    </div>
                    <button className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-all border border-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.3)]">
                        Save Blueprint
                    </button>
                </div>
                
                <div className="p-10 prose prose-slate dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 
                                prose-headings:text-slate-900 dark:prose-headings:text-white 
                                prose-h2:text-indigo-400 prose-h2:border-b prose-h2:border-slate-800/50 prose-h2:pb-2 prose-h2:mb-6
                                prose-strong:text-cyan-400 prose-ul:list-disc prose-li:my-1">
                    {result.blueprint ? (
                        <ReactMarkdown>{result.blueprint}</ReactMarkdown>
                    ) : (
                        <div className="text-center py-10 text-slate-500 italic">No detailed blueprint generated.</div>
                    )}
                </div>
                
                <div className="bg-slate-50 dark:bg-[#0f172a] border-t border-slate-200 dark:border-slate-800 px-8 py-4 text-center">
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">End of AI Generated Neural Specification • V2.4.0</p>
                </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default ProjectPlanning;

