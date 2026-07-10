import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { AlertTriangle, Info, CheckCircle, ShieldAlert, Code, Check } from 'lucide-react';
import ScoreWheel from './ScoreWheel';

const IssueIcon = ({ type }) => {
  if (type === 'SecretLeak') return <ShieldAlert className="w-5 h-5 text-red-500" />;
  if (type === 'MissingAuth') return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
  if (type === 'DeadCode') return <Code className="w-5 h-5 text-blue-500" />;
  return <Info className="w-5 h-5 text-slate-400" />;
};

export default function Dashboard({ data }) {
  const { metrics, issues, timestamp } = data;
  const [activeIssueIndex, setActiveIssueIndex] = useState(issues.length > 0 ? 0 : null);
  const [copied, setCopied] = useState(false);

  const activeIssue = activeIssueIndex !== null ? issues[activeIssueIndex] : null;

  const handleCopy = () => {
    if (activeIssue?.ai?.patchedCode) {
      navigator.clipboard.writeText(activeIssue.ai.patchedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-200 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              CodeVitals
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Production Readiness Report • {new Date(timestamp).toLocaleString()}
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-4 text-sm font-medium">
            <div className="bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800 flex flex-col items-center">
              <span className="text-red-400 text-xl font-bold">{metrics.exposedSecrets}</span>
              <span className="text-slate-500 text-xs uppercase">Secrets</span>
            </div>
            <div className="bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800 flex flex-col items-center">
              <span className="text-yellow-400 text-xl font-bold">{metrics.missingAuth}</span>
              <span className="text-slate-500 text-xs uppercase">Auth Bugs</span>
            </div>
            <div className="bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800 flex flex-col items-center">
              <span className="text-blue-400 text-xl font-bold">{metrics.deadCode}</span>
              <span className="text-slate-500 text-xs uppercase">Dead Code</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Score and Issue List */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-800/20 backdrop-blur-md rounded-3xl border border-slate-700/50 p-6 flex flex-col items-center shadow-xl">
              <h2 className="text-lg font-semibold text-white mb-4">Overall Health</h2>
              <ScoreWheel score={metrics.finalScore} />
              {metrics.finalScore >= 80 ? (
                <p className="mt-4 text-green-400 text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Looks good for production!
                </p>
              ) : (
                <p className="mt-4 text-red-400 text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Requires attention
                </p>
              )}
            </div>

            <div className="bg-slate-800/20 rounded-3xl border border-slate-700/50 p-4 shadow-xl max-h-[600px] overflow-y-auto custom-scrollbar">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-4 px-2">
                Detected Issues ({issues.length})
              </h3>
              
              {issues.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">No issues found. Excellent work!</div>
              ) : (
                <ul className="space-y-2">
                  {issues.map((issue, idx) => (
                    <li key={idx}>
                      <button
                        onClick={() => setActiveIssueIndex(idx)}
                        className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-start gap-3 ${
                          activeIssueIndex === idx 
                            ? 'bg-indigo-500/10 border-indigo-500/50 shadow-inner' 
                            : 'bg-transparent border-transparent hover:bg-slate-800/40'
                        }`}
                      >
                        <div className="mt-0.5"><IssueIcon type={issue.type} /></div>
                        <div className="overflow-hidden">
                          <p className="text-sm font-semibold text-slate-200 truncate">{issue.type}</p>
                          <p className="text-xs text-slate-400 truncate">{issue.file}:{issue.line}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Right Column: AI Analysis & Code Diff */}
          <div className="lg:col-span-8 flex flex-col h-full space-y-6">
            {activeIssue ? (
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIssueIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="bg-slate-900 rounded-3xl border border-slate-700/50 overflow-hidden shadow-2xl flex-1 flex flex-col"
                >
                  <div className="p-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur">
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                          <IssueIcon type={activeIssue.type} />
                          {activeIssue.ai ? activeIssue.ai.issueSummary : 'Issue Analysis'}
                        </h2>
                        <p className="text-slate-400 text-sm max-w-2xl">
                          {activeIssue.ai ? activeIssue.ai.explanation : 'No AI explanation available.'}
                        </p>
                      </div>
                      
                      {activeIssue.ai?.patchedCode && (
                        <button 
                          onClick={handleCopy}
                          className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium rounded-lg transition-colors"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Code className="w-4 h-4" />}
                          {copied ? 'Copied!' : 'Copy Fix'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 bg-[#1e1e1e] overflow-auto">
                    {activeIssue.ai && activeIssue.ai.patchedCode ? (
                      <ReactDiffViewer
                        oldValue={activeIssue.ai.originalCode || activeIssue.originalCode}
                        newValue={activeIssue.ai.patchedCode}
                        splitView={true}
                        compareMethod={DiffMethod.WORDS}
                        useDarkTheme={true}
                        hideLineNumbers={false}
                        leftTitle="Original Source"
                        rightTitle="AI Secured Patch"
                        styles={{
                          variables: {
                            dark: {
                              diffViewerBackground: '#1e1e1e',
                              diffViewerColor: '#d4d4d4',
                              addedBackground: 'rgba(34, 197, 94, 0.2)', // Tailwind green-500
                              addedColor: '#4ade80',
                              removedBackground: 'rgba(239, 68, 68, 0.2)', // Tailwind red-500
                              removedColor: '#f87171',
                              wordAddedBackground: 'rgba(34, 197, 94, 0.4)',
                              wordRemovedBackground: 'rgba(239, 68, 68, 0.4)',
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="p-8 text-slate-400 font-mono text-sm whitespace-pre-wrap">
                        {activeIssue.originalCode}
                        <br/><br/>
                        <span className="text-yellow-500">// AI patching failed or is unavailable for this snippet.</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            ) : (
              <div className="h-full bg-slate-900 rounded-3xl border border-slate-700/50 flex flex-col items-center justify-center p-12 text-center shadow-inner">
                <ShieldAlert className="w-16 h-16 text-slate-700 mb-4" />
                <h2 className="text-xl font-bold text-slate-500">No Issue Selected</h2>
                <p className="text-slate-600 mt-2 max-w-sm">Select an issue from the left panel to view the secure AI patch and detailed explanation.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
