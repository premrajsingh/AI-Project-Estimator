import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Lightbulb, Users, Calendar, UploadCloud, ArrowRight, BrainCircuit,
  ShieldAlert, CheckCircle, Activity, ChevronRight, File,
  Image as ImageIcon, Clock, IndianRupee, Bell, Code2, AlertTriangle, AlertCircle,
  Info, TrendingUp, BarChart2, Database
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { estimatePlanning, getPlanningDetails } from '../services/api';
import ERDiagram from '../components/ERDiagram';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MIN_DESCRIPTION_LENGTH = 100;

const HOURLY_RATES = { min: 1000, max: 2500 };

const formatCost = (amount) => {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(1)}Cr`;
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${Math.round(amount / 1000)}k`;
  return `₹${Math.round(amount)}`;
};

/** Compute viability 0–100 based on AI output + form inputs */
const computeViability = (result, formData) => {
  let score = 75;
  const estimated = parseInt(result.estimated_days) || 30;
  const expected = parseInt(formData.expectedDays) || 30;
  const ratio = estimated / expected;

  // Time alignment bonus/penalty
  if (ratio <= 1.1) score += 12;
  else if (ratio <= 1.3) score += 5;
  else if (ratio <= 1.6) score -= 8;
  else score -= 18;

  // Experience bonus - Now based on AI suggested tier if available
  const tier = result?.suggested_developer_tier || 'Senior';
  const expBonus = { Specialist: 8, Senior: 5, Intermediate: 2, Junior: -3 };
  score += expBonus[tier] || 0;

  // Risk penalty
  const riskCount = result.risks?.length || 0;
  score -= Math.min(20, riskCount * 3);

  return Math.min(98, Math.max(35, Math.round(score)));
};

/** Compute confidence 0–100 */
const computeConfidence = (result, formData) => {
  const tier = result?.suggested_developer_tier || 'Senior';
  let base = { Specialist: 92, Senior: 87, Intermediate: 82, Junior: 75 }[tier] || 82;
  if (formData.description?.length > 200) base += 3;
  if (formData.description?.length > 500) base += 2;
  const riskCount = result.risks?.length || 0;
  base -= Math.min(10, riskCount * 2);
  return Math.min(97, Math.max(60, base));
};

const CircularProgress = ({ value, label }) => {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const color = value >= 75 ? 'text-emerald-400' : value >= 55 ? 'text-amber-400' : 'text-red-400';
  const glow = value >= 75
    ? 'drop-shadow-[0_0_8px_rgba(52,211,153,0.8)]'
    : value >= 55
      ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
      : 'drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]';

  return (
    <div className="relative flex items-center justify-center p-6">
      <svg className="transform -rotate-90 w-48 h-48">
        <circle cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent" className="text-slate-200 dark:text-slate-800" />
        <circle
          cx="96" cy="96" r={radius} stroke="currentColor" strokeWidth="12" fill="transparent"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className={`${color} ${glow} transition-all duration-1000 ease-out`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-black text-slate-900 dark:text-white">{value}<span className="text-2xl ml-1">%</span></span>
        <span className={`text-[10px] font-bold tracking-widest uppercase mt-2 ${color} bg-current/10 border border-current/20 px-2 py-0.5 rounded`} style={{ backgroundColor: 'transparent' }}>{label}</span>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────

const ProjectPlanning = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    description: '',
    expectedDays: '30',
    seniority: 'Student', // Added seniority
  });
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [planningId, setPlanningId] = useState(null);
  const [result, setResult] = useState(null);
  const [timer, setTimer] = useState(0);
  const [descError, setDescError] = useState(null);
  const fileInputRef = useRef(null);

  // Load past planning if ID is in URL
  useEffect(() => {
    if (id) {
      const loadPastPlanning = async () => {
        setLoading(true);
        try {
          const data = await getPlanningDetails(id);
          if (data && data.estimation) {
            setResult(data.estimation);
            setFormData({
              description: data.description || '',
              expectedDays: data.expected_days || '30',
              seniority: data.experience || 'Student',
            });
            setPlanningId(id);
            setStep(4); // Go straight to results
          } else {
            setError("Could not find the requested report.");
          }
        } catch (err) {
          setError("Failed to load historical report.");
        } finally {
          setLoading(false);
        }
      };
      loadPastPlanning();
    } else {
      // RESET everything if we go back to /planning (no ID)
      setResult(null);
      setStep(1);
      setPlanningId(null);
      setError(null);
    }
  }, [id]);

  const handleNext = () => setStep(s => s + 1);
  const handleBack = () => setStep(s => s - 1);

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) setFile(e.target.files[0]);
  };

  const validateDescription = (val) => {
    if (!val || val.trim().length === 0) {
      return 'Please describe your project requirements.';
    }
    if (val.trim().length < MIN_DESCRIPTION_LENGTH) {
      return `Please provide a more detailed description (at least ${MIN_DESCRIPTION_LENGTH} characters). Describe the features, purpose, and scope of the project.`;
    }
    return null;
  };

  const handleDescChange = (e) => {
    const val = e.target.value;
    setFormData({ ...formData, description: val });
    if (val.length > 10) setDescError(validateDescription(val));
    else setDescError(null);
  };

  const handleSubmit = async () => {
    const descValidation = validateDescription(formData.description);
    if (descValidation) {
      setDescError(descValidation);
      return;
    }

    setLoading(true);
    setError(null);
    setStep(3); // Analyzing step

    try {
      const data = new FormData();
      data.append('team_size', '0');
      data.append('experience', formData.seniority);
      data.append('description', formData.description.trim());
      data.append('expected_days', formData.expectedDays);
      data.append('daily_rate', '0');
      if (file) data.append('file', file);

      const res = await estimatePlanning(data);
      if (res?.planning_id) {
        setPlanningId(res.planning_id);
        setTimer(0);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to initiate planning analysis.');
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (planningId && !result && loading) {
      const fetchResult = async () => {
        try {
          setTimer(t => t + 1);
          const data = await getPlanningDetails(planningId);
          if (data?.status === 'completed' && data.estimation) {
            setResult(data.estimation);
            setLoading(false);
            clearInterval(interval);
          } else if (data?.status === 'failed') {
            setError(data.error_message || 'Analysis failed.');
            setLoading(false);
            clearInterval(interval);
          } else if (data?.status === 'design_error') {
            const errs = data.design_result?.errors?.map(e => e.message).join(' ') || 'Your project description needs more detail.';
            setError(`Design validation failed: ${errs}`);
            setLoading(false);
            clearInterval(interval);
          }
        } catch (err) {
          console.error('Polling error', err);
        }
      };
      fetchResult();
      interval = setInterval(fetchResult, 3000);
    }
    return () => clearInterval(interval);
  }, [planningId, result, loading]);

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const estimatedDays = result ? Math.max(1, parseInt(result.estimated_days) || 1) : 0;
  const teamSize = result?.suggested_team?.size || 2;
  const effortHours = result?.effort_hours || (estimatedDays * 8 * teamSize);
  const costMin = result?.cost_breakdown?.min || 8000;
  const costMax = result?.cost_breakdown?.premium || 15000;
  const viability = result ? computeViability(result, formData) : 0;
  const confidence = result ? computeConfidence(result, formData) : 0;
  const riskLevel = result?.risks?.length > 5 ? 'High' : result?.risks?.length > 2 ? 'Moderate' : 'Low';
  const riskColor = riskLevel === 'High' ? 'text-red-500' : riskLevel === 'Moderate' ? 'text-amber-500' : 'text-emerald-400';
  const viabilityLabel = viability >= 75 ? 'High' : viability >= 55 ? 'Moderate' : 'Low';
  const viabilityClass = viability >= 75 ? 'text-emerald-400' : viability >= 55 ? 'text-amber-400' : 'text-red-400';
  const descLen = formData.description.trim().length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in pb-12 text-slate-800 dark:text-slate-200">
      <div className="mb-8 border-b border-slate-200 dark:border-slate-800 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
          <Lightbulb className="h-8 w-8 text-amber-500" /> Idea Estimator
        </h1>
        <p className="text-slate-500 mt-2">Provide your project requirements or design specs and get an AI-powered development estimate before writing a single line of code.</p>
      </div>

      <div className="max-w-[1400px] mx-auto">

        {/* Step Indicator */}
        {step < 4 && result == null && (
          <div className="max-w-4xl mx-auto flex justify-between items-center mb-10 px-4 relative">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex flex-col items-center relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${step >= s ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                  {s}
                </div>
                <span className={`text-[10px] uppercase font-bold mt-2 tracking-widest ${step >= s ? 'text-indigo-500' : 'text-slate-400'}`}>
                  {s === 1 ? 'Requirements' : s === 2 ? 'Docs' : 'Analyze'}
                </span>
              </div>
            ))}
            <div className="absolute left-1/2 -translate-x-1/2 top-4 w-[500px] h-0.5 bg-slate-200 dark:bg-slate-800 -z-10">
              <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((step - 1) / 2) * 100}%` }}></div>
            </div>
          </div>
        )}

        {/* Input Phase */}
        {result == null && (
          <div className="max-w-4xl mx-auto bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden min-h-[400px] flex flex-col relative p-8">


            {/* Step 1 – Requirements */}
            {step === 1 && (
              <div className="flex-1 animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Describe your project requirements</h2>
                <p className="text-slate-500 text-sm mb-6">The estimator works best with detailed requirements. Describe the features, purpose, target users, and key functionality.</p>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" /> Project Requirements
                      <span className={`ml-auto text-xs font-mono ${descLen >= MIN_DESCRIPTION_LENGTH ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {descLen}/{MIN_DESCRIPTION_LENGTH} min chars
                      </span>
                    </label>
                    <textarea
                      rows="6"
                      placeholder="Example: Build a B2B SaaS project management tool with user authentication, kanban boards, sprint planning, team collaboration, file uploads, and reporting dashboards. The app should support real-time updates and role-based access control..."
                      value={formData.description}
                      onChange={handleDescChange}
                      className={`w-full bg-slate-50 dark:bg-[#0B1120] border rounded-lg py-3 px-4 text-slate-900 dark:text-white focus:outline-none focus:ring-1 transition-colors resize-none ${descError ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300 dark:border-slate-700 focus:border-indigo-500 focus:ring-indigo-500'}`}
                    />

                    {/* Quality Indicator */}
                    <div className="mt-3">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest mb-1.5">
                        <span className="text-slate-500">Requirements Quality</span>
                        <span className={descLen < 50 ? 'text-red-400' : descLen < 150 ? 'text-amber-400' : 'text-emerald-400'}>
                          {descLen < 50 ? 'Too Short' : descLen < 150 ? 'Improving' : 'Excellent'}
                        </span>
                      </div>
                      <div className="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${descLen < 50 ? 'bg-red-500' : descLen < 150 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(100, (descLen / 300) * 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {descError && (
                      <div className="mt-2 flex items-start gap-2 text-red-400 text-xs">
                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>{descError}</span>
                      </div>
                    )}
                    <div className="mt-2 flex items-start gap-2 bg-blue-500/5 border border-blue-500/20 rounded-lg px-3 py-2">
                      <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-slate-500">The more detail you provide, the more accurate the estimate. Include features, tech preferences, integrations, and constraints.</p>
                    </div>
                  </div>
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Seniority / Experience Level
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { id: 'Student', label: 'Student', desc: 'College Project', color: 'border-emerald-500/30' },
                        { id: 'Beginner', label: 'Junior', desc: '1-2y Exp', color: 'border-indigo-500/30' },
                        { id: 'Intermediate', label: 'Senior', desc: '3-5y Exp', color: 'border-cyan-500/30' },
                        { id: 'Expert', label: 'Expert', desc: '5y+ Spec', color: 'border-purple-500/30' }
                      ].map((lvl) => (
                        <div
                          key={lvl.id}
                          onClick={() => setFormData({ ...formData, seniority: lvl.id })}
                          className={`cursor-pointer group relative p-4 border rounded-xl transition-all ${
                            formData.seniority === lvl.id
                              ? `bg-slate-900 dark:bg-white text-white dark:text-slate-900 ${lvl.color} shadow-lg scale-[1.02]`
                              : 'bg-white dark:bg-[#0B1120] border-slate-200 dark:border-slate-800 text-slate-500 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className={`text-xs font-black uppercase tracking-tighter mb-1 ${formData.seniority === lvl.id ? '' : 'text-slate-400 group-hover:text-slate-300'}`}>
                            {lvl.label}
                          </div>
                          <div className="text-[10px] font-mono opacity-60">
                            {lvl.desc}
                          </div>
                          {formData.seniority === lvl.id && (
                            <div className="absolute top-2 right-2">
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 mt-4 italic">
                      * Costs will be calculated based on the selected experience level (e.g., student rates vs. professional rates).
                    </p>
                  </div>
                </div>

                <div className="mt-10 flex justify-end">
                    <button
                      onClick={handleNext}
                      disabled={!formData.description || descLen < MIN_DESCRIPTION_LENGTH}
                      className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2">
                      Next Step <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
              </div>
            )}

            {/* Step 2 – Docs Upload */}
            {step === 2 && (
              <div className="flex-1 animate-fade-in">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Upload Design or Specification</h2>
                <p className="text-slate-500 mb-6 text-sm">Upload a PDF requirements document or a Figma/wireframe image to give the AI deeper context. <span className="text-slate-400 italic">Optional but recommended.</span></p>
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
                      <span className="text-slate-700 dark:text-slate-300 font-bold">Click to browse</span>
                      <span className="text-slate-500 text-sm mt-1">PDF specification, PNG/JPG wireframe or Figma export</span>
                    </>
                  )}
                </div>
                <div className="mt-10 flex justify-between">
                  <button onClick={handleBack} className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-2.5 rounded-lg font-medium transition-all">Back</button>
                  <button onClick={handleSubmit} className="bg-cyan-500 hover:bg-cyan-400 text-slate-900 px-8 py-2.5 rounded-lg font-black tracking-widest uppercase shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all flex items-center gap-2 border border-cyan-400">
                    Generate Estimate <BrainCircuit className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3 – Loading */}
            {step === 3 && result == null && !error && (
              <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-700">
                <div className="relative mb-8">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-3xl animate-pulse rounded-full" />
                  <svg className="w-16 h-16 text-indigo-500 animate-pulse relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight uppercase">Analyzing Requirements</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md text-center text-sm leading-relaxed mb-6">
                  AI agents are processing your requirements and generating a comprehensive development estimate...
                </p>
                {timer > 120 && (
                  <div className="animate-in slide-in-from-bottom-4 duration-500 flex flex-col items-center">
                    <p className="text-amber-600 dark:text-amber-400 text-xs font-medium mb-4 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-800">
                      This is taking longer than usual. The AI might be busy.
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold hover:scale-105 transition-all shadow-lg active:scale-95"
                    >
                      Try Again
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Step 3 – Error */}
            {error && step === 3 && (
              <div className="flex-1 animate-fade-in flex flex-col items-center justify-center py-10 text-center">
                <ShieldAlert className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Analysis Failed</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <button onClick={() => { setStep(1); setError(null); }} className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white px-6 py-2 rounded-lg font-medium">Try Again</button>
              </div>
            )}
          </div>
        )}

        {/* ── Results Phase ── */}
        {result && (
          <div className="space-y-8 animate-fade-in">

            {/* Header */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/5 rounded-full blur-[60px]"></div>
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">AI-Generated Analysis</h3>
                <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Project Development Estimate</h2>
                <p className="text-slate-500 text-sm mt-1 font-mono">
                  Generated {new Date().toLocaleDateString()} • AI Confidence: {confidence}% • Based on {formData.seniority} level
                </p>
                {formData.seniority === 'Student' && (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">
                      Student Market Research: ₹15k - ₹25k Stipend Baseline Applied
                    </p>
                  </div>
                )}
              </div>
              <button
                onClick={() => { navigate('/planning'); setStep(1); setResult(null); setFormData({ teamSize: '1', experience: 'Intermediate', description: '', expectedDays: '30' }); setFile(null); setPlanningId(null); }}
                className="inline-flex items-center bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-lg font-medium shadow-lg shadow-indigo-500/20 border border-indigo-500 transition-all text-sm">
                <Activity className="h-4 w-4 mr-2" /> New Estimate
              </button>
            </div>

            {/* Executive Summary */}
            <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Executive Summary</h3>
              <div className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed mb-4 prose prose-sm dark:prose-invert max-w-none prose-strong:text-slate-900 dark:prose-strong:text-white">
                <ReactMarkdown>{result.summary}</ReactMarkdown>
              </div>
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold font-mono">
                <ArrowRight className="w-3 h-3" /> All critical paths identified. Ready for development scoping.
              </div>
            </div>

            {/* Detailed Feature Analysis (Step 6 Thinking) */}
            {result.feature_analysis && (
              <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-indigo-500/5 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                    <Activity className="w-4 h-4 text-indigo-400" /> Feature-wise Complexity Breakdown
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-[#0f172a] text-slate-500 uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-3 font-black">Feature Name</th>
                        <th className="px-6 py-3 font-black">Module</th>
                        <th className="px-6 py-3 font-black text-center">Complexity</th>
                        <th className="px-6 py-3 font-black text-right">Effort (Days)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {result.feature_analysis.map((f, i) => (
                        <tr key={i} className="hover:bg-indigo-500/5 transition-colors group">
                          <td className="px-6 py-4 text-slate-900 dark:text-white font-bold">{f.feature}</td>
                          <td className="px-6 py-4 text-slate-500 italic">{f.module}</td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${f.complexity === 'Simple' ? 'bg-emerald-500/10 text-emerald-400' : f.complexity === 'Medium' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'}`}>
                              {f.complexity === 'Simple' ? '🟢 Simple' : f.complexity === 'Medium' ? '🟡 Medium' : '🔴 Complex'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-indigo-400">{f.effort_days}d</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Data Flow Schematic (Step 4 Thinking) */}
            {result.data_flow && (
              <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Data Flow Analysis</h3>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-4 text-xs font-mono">
                  <div className="flex-1 p-4 bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl text-center shadow-sm relative z-10 w-full md:w-auto">
                    <span className="text-indigo-400 font-bold">PRO ARCHITECTURE</span>
                    <p className="text-slate-500 mt-2 leading-relaxed italic">"{result.data_flow}"</p>
                  </div>
                </div>
              </div>
            )}

            {/* Visual Database Architecture (New Section) */}
            {result.er_diagram_mermaid && (
              <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-indigo-500/5 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                    <Database className="w-4 h-4 text-indigo-400" /> Visual Database Architecture
                  </h3>
                </div>
                <div className="p-6">
                  <ERDiagram chart={result.er_diagram_mermaid} />
                  <p className="mt-4 text-[10px] text-slate-500 font-mono italic text-center">
                    * This diagram represents the core entities and relationships identified in Step 5 of the analysis.
                  </p>
                </div>
              </div>
            )}

            {/* Main Metrics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

              {/* Viability Gauge */}
              <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex flex-col items-center text-center shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                <CircularProgress value={viability} label="VIABILITY" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mt-4 mb-2">Project Viability</h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-6 font-mono">
                  AI Prediction:<br />{viabilityLabel} success potential based on scope and team capacity.
                </p>
                <div className="mt-auto w-full flex justify-between items-end border-t border-slate-200 dark:border-slate-800 pt-6">
                  <div className="text-left">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">CONFIDENCE:</span>
                    <div className="text-xl font-bold text-slate-700 dark:text-slate-300">{confidence}%</div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className={`font-bold text-lg mb-0.5 ${viabilityClass}`}>{viabilityLabel}</span>
                    <span className={`bg-current/10 border border-current/20 px-2 flex items-center py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${viabilityClass}`} style={{ backgroundColor: 'transparent' }}>
                      <TrendingUp className="w-3 h-3 mr-1" /> {viabilityLabel === 'High' ? 'Stable' : viabilityLabel === 'Moderate' ? 'Review' : 'At Risk'}
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
                      <div className="text-4xl font-black text-slate-900 dark:text-white mt-1">
                        {effortHours.toLocaleString()} <span className="text-xl text-slate-500 font-medium">hrs</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-xs font-bold border border-blue-500/20">{estimatedDays} Days</span>
                      <span className="text-xs text-slate-500 font-mono">{teamSize} dev{teamSize > 1 ? 's' : ''}</span>
                      <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                        <div className="w-3/4 h-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></div>
                      </div>
                    </div>
                  </div>

                  {/* Cost Card */}
                  <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><span className="text-7xl font-black text-slate-100 dark:text-slate-800/40 select-none">₹</span></div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Projected Cost</span>
                      <div className="text-2xl font-black text-slate-900 dark:text-white mt-1 leading-tight">
                        {formatCost(costMin)}<span className="text-slate-500 font-medium text-base"> – </span>{formatCost(costMax)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-xs font-bold border border-emerald-500/20">AI Estimated Value</span>
                      <span className="text-xs font-mono text-slate-500">Fixed Fee Analysis</span>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-2 font-mono italic">Complexity-based quote</p>
                  </div>

                  {/* Risk Card */}
                  <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 relative overflow-hidden flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Risk Level</span>
                        <div className={`text-3xl font-black mt-1 ${riskColor}`}>{riskLevel}</div>
                      </div>
                      <div className={`${riskLevel === 'High' ? 'bg-red-500/10 border-red-500/30' : riskLevel === 'Moderate' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-emerald-500/10 border-emerald-500/30'} p-2 rounded-lg border`}>
                        {riskLevel !== 'Low'
                          ? <AlertTriangle className={`w-5 h-5 ${riskColor}`} />
                          : <CheckCircle className="w-5 h-5 text-emerald-500" />}
                      </div>
                    </div>
                    <div className="mt-4">
                      <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 mb-2">
                        <div className="bg-emerald-500 h-full" style={{ width: `${Math.max(10, 100 - (result.risks?.length || 0) * 12)}%` }}></div>
                        <div className="bg-amber-500 h-full" style={{ width: `${Math.min(50, (result.risks?.length || 0) * 8)}%` }}></div>
                        <div className="bg-red-500 h-full opacity-50" style={{ width: `${Math.min(40, (result.risks?.length || 0) * 4)}%` }}></div>
                      </div>
                      <div className="flex justify-between text-[8px] font-black uppercase text-slate-500 tracking-widest">
                        <span>Safe</span><span>Critical</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 flex-1 relative min-h-[300px]">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-6 mb-8">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-6 h-6 text-pink-500" />
                      <h3 className="text-slate-900 dark:text-white font-bold text-lg">Development Timeline</h3>
                    </div>
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest border-b border-cyan-400/30 pb-0.5">{estimatedDays} Days Total</span>
                  </div>
                  <div className="space-y-8">
                    {[
                      { label: 'Foundation & Setup', sub: 'env, auth, infrastructure', pct: 100, color: 'from-blue-600 to-blue-400', textColor: 'text-blue-400', days: Math.round(estimatedDays * 0.15) },
                      { label: 'Core Development', sub: 'main features & logic', pct: 60, color: 'from-pink-600 to-fuchsia-400', textColor: 'text-pink-400', days: Math.round(estimatedDays * 0.55), indicator: true },
                      { label: 'QA, Polish & Launch', sub: 'testing, optimization', pct: 0, color: '', textColor: 'text-amber-500', days: Math.round(estimatedDays * 0.30), dashed: true },
                    ].map((track, i) => (
                      <div key={i} className="relative z-10">
                        <div className="flex justify-between text-sm mb-3">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{track.label} <span className="text-slate-500 text-xs ml-2 font-mono italic">{track.sub}</span></span>
                          <span className={`${track.textColor} font-mono font-bold text-xs`}>~{track.days}d</span>
                        </div>
                        {track.dashed ? (
                          <div className="w-full bg-slate-50 dark:bg-[#0f172a] rounded-full h-4 border border-slate-200 dark:border-slate-800 p-0.5 flex">
                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-full h-full w-2/3 ml-auto"></div>
                          </div>
                        ) : (
                          <div className="w-full bg-slate-50 dark:bg-[#0f172a] rounded-full h-4 border border-slate-200 dark:border-slate-800 p-0.5">
                            <div className={`bg-gradient-to-r ${track.color} rounded-full h-full relative`} style={{ width: `${track.pct}%` }}>
                              {track.indicator && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 border-fuchsia-500 shadow-[0_0_15px_#d946ef]"></div>}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] font-black uppercase text-slate-600 tracking-widest mt-8 px-2">
                    <span>Day 1</span>
                    <span>Day {Math.round(estimatedDays / 2)}</span>
                    <span>Day {estimatedDays}</span>
                  </div>
                </div>
              </div>

              {/* Right Strips */}
              <div className="flex gap-4 h-full">
                <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl flex-1 p-4 flex flex-col items-center overflow-hidden">
                  <div className="text-center mb-8 mt-2 w-full">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Activity className="w-5 h-5 text-emerald-400" />
                      <h3 className="text-slate-900 dark:text-white font-bold leading-tight">Complexity<br />Index</h3>
                    </div>
                    <span className="text-xs text-slate-500 font-mono">{formData.experience}</span>
                  </div>
                  <div className="relative flex-1 w-full flex justify-center pb-12 pt-4">
                    <div className="absolute top-0 bottom-16 border-l border-dashed border-slate-300 dark:border-slate-700/50 h-full w-px"></div>
                    <svg viewBox="0 0 40 200" className="w-[80%] h-full" preserveAspectRatio="none">
                      <path d="M0,200 L40,200 L40,160 Q20,150 0,160 Z" fill="url(#cyanGrad2)" opacity="0.2"></path>
                      <path d="M0,160 Q20,150 40,160" fill="none" stroke="#22d3ee" strokeWidth="2"></path>
                      <defs>
                        <linearGradient id="cyanGrad2" x1="0" y1="1" x2="0" y2="0">
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
                    <div className="w-full h-16 bg-slate-50 dark:bg-[#0f172a] rounded-full p-0.5 border border-slate-200 dark:border-slate-800 shadow-inner">
                      <div className="w-full bg-pink-500 h-[60%] rounded-full shadow-[0_0_5px_#ec4899]"></div>
                    </div>
                    <div className="w-full h-16 bg-slate-50 dark:bg-[#0f172a] rounded-full p-0.5 border border-slate-200 dark:border-slate-800 shadow-inner">
                      <div className="w-full bg-blue-500 h-[80%] rounded-full shadow-[0_0_5px_#3b82f6]"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk & Challenges */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" /> Planning Risk Assessment
                </h3>
                {result.risks?.length > 0 ? result.risks.map((risk, i) => (
                  <div key={i} className={`rounded-xl p-4 border ${risk.severity === 'high' ? 'bg-red-500/5 border-red-500/30' : risk.severity === 'medium' ? 'bg-amber-500/5 border-amber-500/30' : 'bg-emerald-500/5 border-emerald-500/30'} flex gap-3`}>
                    <AlertCircle className={`w-5 h-5 ${risk.severity === 'high' ? 'text-red-400' : risk.severity === 'medium' ? 'text-amber-400' : 'text-emerald-400'} mt-0.5 flex-shrink-0`} />
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${risk.severity === 'high' ? 'bg-red-500/20 text-red-400' : risk.severity === 'medium' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>{risk.type || 'Risk'}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{risk.severity} severity</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-sm leading-snug">{risk.mitigation}</p>
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl p-4 border bg-emerald-500/5 border-emerald-500/30 flex gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <p className="text-slate-700 dark:text-slate-300 text-sm">No major risks identified for this scope.</p>
                  </div>
                )}
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4 text-cyan-400" /> Technical Challenges
                </h3>
                {result.challenges?.length > 0 ? result.challenges.map((challenge, i) => (
                  <div key={i} className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4 hover:border-cyan-500/20 transition-colors group">
                    <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
                      <Code2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-800 dark:text-slate-200 font-medium text-sm">Challenge {i + 1}</p>
                      <p className="text-slate-500 text-xs">{challenge}</p>
                    </div>
                  </div>
                )) : (
                  <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-4">
                    <CheckCircle className="w-5 h-5 text-emerald-500" />
                    <p className="text-slate-500 text-sm">No major technical challenges flagged.</p>
                  </div>
                )}
              </div>
            </div>

            {/* AI Suggestions & Roadmap */}
            {result.ai_suggestions && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <div className="bg-gradient-to-br from-indigo-600/10 to-transparent border border-indigo-500/20 rounded-2xl p-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-4 flex items-center gap-2">
                    <BrainCircuit className="w-4 h-4" /> Recommended Stack
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {result.ai_suggestions.better_stack?.map((tech, i) => (
                      <span key={i} className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-medium">{tech}</span>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-cyan-600/10 to-transparent border border-cyan-500/20 rounded-2xl p-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-cyan-400 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> MVP Scoping Strategy
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm italic leading-relaxed">"{result.ai_suggestions.mvp_scope}"</p>
                </div>
                <div className="bg-gradient-to-br from-emerald-600/10 to-transparent border border-emerald-500/20 rounded-2xl p-6">
                  <h3 className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> Cost Optimization
                  </h3>
                  <ul className="space-y-2">
                    {result.ai_suggestions.cost_reduction_tips?.map((tip, i) => (
                      <li key={i} className="text-slate-600 dark:text-slate-400 text-xs flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Cost & Time Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {/* Cost by Module */}
              <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden self-start">
                <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-indigo-400" /> Module-wise Cost Breakdown
                  </h3>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-[#0f172a] text-slate-500 uppercase tracking-widest">
                    <tr>
                      <th className="px-6 py-3 font-bold">Module</th>
                      <th className="px-6 py-3 font-bold text-right">Cost (Est)</th>
                      <th className="px-6 py-3 font-bold text-right">Allocation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {result.cost_breakdown?.by_module?.map((m, i) => (
                      <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-3 font-medium text-slate-700 dark:text-slate-300">{m.module}</td>
                        <td className="px-6 py-3 text-right font-mono font-bold text-indigo-400">{formatCost(m.cost)}</td>
                        <td className="px-6 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500" style={{ width: `${m.percentage}%` }}></div>
                            </div>
                            <span className="text-slate-500 font-mono w-8 text-right">{m.percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Time Estimates */}
              <div className="bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 h-full flex flex-col">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-pink-400" /> Comparative Time Projections
                </h3>
                <div className="space-y-6 flex-1 flex flex-col justify-center">
                  {[
                    { label: 'Optimistic', days: result.time_estimate?.optimistic_days || Math.round(estimatedDays * 0.8), color: 'bg-emerald-500', icon: <TrendingUp className="w-3 h-3" />, desc: 'Best case scenario' },
                    { label: 'Realistic', days: result.time_estimate?.realistic_days || estimatedDays, color: 'bg-indigo-500', icon: <Activity className="w-3 h-3" />, desc: 'Most likely outcome' },
                    { label: 'Worst Case', days: result.time_estimate?.worst_case_days || Math.round(estimatedDays * 1.5), color: 'bg-rose-500', icon: <AlertTriangle className="w-3 h-3" />, desc: 'Buffer for roadblocks' }
                  ].map((t, i) => (
                    <div key={i} className="relative group">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                            {t.icon} {t.label}
                          </span>
                          <span className="text-[10px] text-slate-500 italic ml-4.5">{t.desc}</span>
                        </div>
                        <span className="text-sm font-black text-slate-900 dark:text-white font-mono">{t.days} Days</span>
                      </div>
                      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                        <div
                          className={`h-full ${t.color} rounded-full transition-all duration-1000 shadow-sm`}
                          style={{ width: `${(t.days / (result.time_estimate?.worst_case_days || estimatedDays * 1.5)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                  <p className="text-[10px] text-slate-500 font-mono text-center">
                    PRO TIP: Start with the <span className="text-indigo-400 font-bold">Realistic</span> timeline for planning, but keep the <span className="text-rose-400 font-bold">Worst Case</span> budget in mind.
                  </p>
                </div>
              </div>
            </div>

            {/* Estimation Log Terminal */}
            <div className="mt-8 bg-white dark:bg-[#111827] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col relative">
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
                  <div className="flex items-center"><ChevronRight className="w-4 h-4 mr-1" /> Analyzing requirements... [SUCCESS]</div>
                  <div className="flex items-center"><ChevronRight className="w-4 h-4 mr-1" /> Synthesizing development model... [SUCCESS]</div>
                  <div className="flex items-center"><ChevronRight className="w-4 h-4 mr-1" /> Computing effort & cost projections... [SUCCESS]</div>
                </div>
                <div className="mb-4 text-emerald-300 font-bold border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">planning@agent:~$</span> print_estimation_log()
                </div>
                <div className="pl-4 border-l-2 border-slate-300 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 prose prose-invert prose-p:my-2 max-w-none dark:text-slate-300 pb-6">
                  <ReactMarkdown>{result.summary}</ReactMarkdown>
                </div>
                <div className="flex items-center">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">planning@agent:~$</span>
                  <span className="ml-2 w-2.5 h-4 bg-slate-400 animate-pulse inline-block"></span>
                </div>
              </div>
            </div>

            {/* Blueprint — Beautiful Card Layout */}
            {result.blueprint && (() => {
              // Parse the blueprint markdown into named sections
              const sections = [];
              const lines = result.blueprint.split('\n');
              let current = null;
              for (const line of lines) {
                if (line.startsWith('## ')) {
                  if (current) sections.push(current);
                  current = { heading: line.replace('## ', '').trim(), body: [] };
                } else if (current) {
                  current.body.push(line);
                }
              }
              if (current) sections.push(current);

              const sectionMeta = {
                '🗺️': { gradient: 'from-indigo-500/10 to-transparent', border: 'border-indigo-500/20', accent: 'text-indigo-400', badge: 'bg-indigo-500/10 border-indigo-500/20' },
                '🗄️': { gradient: 'from-cyan-500/10 to-transparent', border: 'border-cyan-500/20', accent: 'text-cyan-400', badge: 'bg-cyan-500/10 border-cyan-500/20' },
                '🛠': { gradient: 'from-violet-500/10 to-transparent', border: 'border-violet-500/20', accent: 'text-violet-400', badge: 'bg-violet-500/10 border-violet-500/20' },
                '⚠️': { gradient: 'from-amber-500/10 to-transparent', border: 'border-amber-500/20', accent: 'text-amber-400', badge: 'bg-amber-500/10 border-amber-500/20' },
                '🚨': { gradient: 'from-red-500/10 to-transparent', border: 'border-red-500/20', accent: 'text-red-400', badge: 'bg-red-500/10 border-red-500/20' },
                '🧠': { gradient: 'from-fuchsia-500/10 to-transparent', border: 'border-fuchsia-500/20', accent: 'text-fuchsia-400', badge: 'bg-fuchsia-500/10 border-fuchsia-500/20' },
                '💰': { gradient: 'from-emerald-500/10 to-transparent', border: 'border-emerald-500/20', accent: 'text-emerald-400', badge: 'bg-emerald-500/10 border-emerald-500/20' },
                '🧱': { gradient: 'from-blue-500/10 to-transparent', border: 'border-blue-500/20', accent: 'text-blue-400', badge: 'bg-blue-500/10 border-blue-500/20' },
              };

              const getStyle = (heading) => {
                for (const emoji of Object.keys(sectionMeta)) {
                  if (heading.startsWith(emoji)) return sectionMeta[emoji];
                }
                return { gradient: 'from-slate-500/10 to-transparent', border: 'border-slate-500/20', accent: 'text-slate-400', badge: 'bg-slate-500/10 border-slate-500/20' };
              };

              return (
                <div className="mt-8">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20">
                      <BrainCircuit className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">AI Project Blueprint</h2>
                      <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">Architecture, Stack & Feature Roadmap</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {sections.map((sec, idx) => {
                      const style = getStyle(sec.heading);
                      const bodyText = sec.body.join('\n').trim();
                      const bullets = bodyText.split('\n').filter(l => l.trim());
                      return (
                        <div
                          key={idx}
                          className={`bg-gradient-to-br ${style.gradient} border ${style.border} rounded-2xl p-5 flex flex-col gap-3 shadow-sm`}
                        >
                          <h3 className={`text-sm font-black uppercase tracking-wider ${style.accent} flex items-center gap-2`}>
                            {sec.heading}
                          </h3>
                          <div className="space-y-2">
                            {bullets.map((line, li) => {
                              const clean = line.replace(/^[-*•]\s*/, '').replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1').trim();
                              if (!clean) return null;
                              const isNumbered = /^\d+\./.test(line.trim());
                              const isBullet = /^[-*•]/.test(line.trim());
                              const isPlain = !isNumbered && !isBullet;
                              if (isPlain && !line.trim().startsWith('-') && !line.trim().startsWith('*')) {
                                return (
                                  <p key={li} className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">{clean}</p>
                                );
                              }
                              return (
                                <div key={li} className={`flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300`}>
                                  <span className={`mt-0.5 flex-shrink-0 w-4 h-4 rounded flex items-center justify-center text-[10px] font-black border ${style.badge} ${style.accent}`}>
                                    {isNumbered ? (li + 1) : '›'}
                                  </span>
                                  <span className="leading-relaxed">{clean}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-6 bg-slate-50 dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-xl px-6 py-3 text-center">
                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em]">AI Generated Development Estimate • For planning purposes only</p>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectPlanning;
