import React, { useEffect, useState } from 'react';
import LZString from 'lz-string';
import { BrowserRouter, Routes, Route, useSearchParams } from 'react-router-dom';
import Dashboard from './components/Dashboard';

function ReportLoader() {
  const [searchParams] = useSearchParams();
  const [reportData, setReportData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      const compressed = searchParams.get('data');
      if (compressed) {
        const jsonString = LZString.decompressFromEncodedURIComponent(compressed);
        if (jsonString) {
          setReportData(JSON.parse(jsonString));
        } else {
          setError('Failed to decompress data payload.');
        }
      } else {
        setError('No data found in the URL. Please run `npx codevitals` locally.');
      }
    } catch (e) {
      setError('Error parsing the report data.');
      console.error(e);
    }
  }, [searchParams]);

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-md rounded-2xl border border-red-500/20 p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Oops! Something went wrong</h2>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-indigo-400 font-medium tracking-widest uppercase text-sm">Loading Report...</p>
        </div>
      </div>
    );
  }

  return <Dashboard data={reportData} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ReportLoader />} />
        <Route path="/report" element={<ReportLoader />} />
      </Routes>
    </BrowserRouter>
  );
}
