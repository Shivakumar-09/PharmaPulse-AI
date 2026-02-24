'use client';

import { useState } from 'react';
import { Download, Copy, ArrowLeft } from 'lucide-react';
import ConsentModal from '@/components/SecurityModals';
import UploadModal from '@/components/UploadModal';
import PatientDashboard from '@/components/PatientDashboard';
import DoctorDashboard from '@/components/DoctorDashboard';
import DigitalTwin from '@/components/DigitalTwin';
import GCIBadge from '@/components/GCIBadge';
import DNABackground from '@/components/DNABackground';

export default function Home() {
  const [hasConsented, setHasConsented] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [viewMode, setViewMode] = useState<'patient' | 'clinical' | 'json'>('patient');

  const handleAnalyze = async (file: File, drugs: string) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('vcf', file);
      formData.append('drugs', drugs);

      const res = await fetch('/api/analyze', {
        method: 'POST',
        body: formData
      });

      const json = await res.json();
      if (json.results) {
        setResults(json.results);
      } else {
        alert(json.error || 'Failed to analyze VCF');
      }
    } catch (err) {
      console.error(err);
      alert('Network error. Check offline fallback mode or console.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDownloadReport = () => {
    if (!results) return;
    const blob = new Blob([JSON.stringify({ results }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `GENO_CLARITY_REPORT_${new Date().getTime()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyClipboard = () => {
    if (!results) return;
    navigator.clipboard.writeText(JSON.stringify({ results }, null, 2));
    alert('JSON Report copied to clipboard');
  };

  const resetAnalysis = () => {
    setResults(null);
  };

  if (!hasConsented) {
    return <ConsentModal onAccept={() => setHasConsented(true)} />;
  }

  return (
    <main className="min-h-screen relative p-4 md:p-8 pb-24 text-slate-100 overflow-x-hidden selection:bg-primary/30 selection:text-white">

      {/* Animated DNA Particle Canvas Background */}
      <DNABackground />

      {/* Ambient glowing orbs for depth */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      {/* Header */}
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 mb-16 relative z-10 px-8 py-6 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-2xl bg-white/5"
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 0 0 1px rgba(255,255,255,0.05)'
        }}
      >
        <div className="flex items-center gap-4 group">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.4)] transition-transform group-hover:scale-110 duration-500">
            <span className="font-black text-white tracking-widest text-2xl drop-shadow-md">X</span>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-[0.15em] text-white text-glow">XENOFLUX <span className="text-primary/80">AI</span></h1>
            <p className="text-[10px] font-mono text-slate-500 tracking-widest uppercase mt-0.5">Quantum Pharmacogenomics</p>
          </div>
        </div>

        {results && (
          <div className="flex flex-col md:flex-row items-center gap-6">
            <GCIBadge score={results[0]?.quality_metrics?.gci_score || 0} />

            <div className="bg-black/20 backdrop-blur-md p-1.5 rounded-2xl flex items-center border border-white/5 shadow-inner">
              <button
                onClick={() => setViewMode('patient')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 ${viewMode === 'patient' ? 'bg-primary text-white shadow-[0_4px_12px_rgba(14,165,233,0.3)]' : 'text-slate-400 hover:text-white'}`}
              >
                Patient
              </button>
              <button
                onClick={() => setViewMode('clinical')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 ${viewMode === 'clinical' ? 'bg-accent text-white shadow-[0_4px_12px_rgba(129,140,248,0.3)]' : 'text-slate-400 hover:text-white'}`}
              >
                Clinical
              </button>
              <button
                onClick={() => setViewMode('json')}
                className={`px-5 py-2.5 rounded-xl text-xs font-black tracking-widest uppercase transition-all duration-300 ${viewMode === 'json' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                JSON
              </button>
            </div>

            <button onClick={resetAnalysis} className="p-3 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-all active:scale-95">
              <ArrowLeft className="w-6 h-6" />
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {!results ? (
          <div className="mt-12 flex flex-col items-center justify-center space-y-12">
            <div className="text-center space-y-4 max-w-2xl px-4">
              <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight text-glow">
                Unlocking the Code of <span className="text-primary italic">Better Recovery.</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed font-medium">
                Upload your genomic data to simulate real-time pharmacological interactions and discover personalized clinical pathways.
              </p>
            </div>

            <div className="w-full max-w-2xl rounded-3xl p-[1px] bg-gradient-to-b from-white/20 to-transparent shadow-2xl relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-[31px] blur opacity-0 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
              <div className="relative glass-panel rounded-3xl overflow-hidden">
                <UploadModal onAnalyze={handleAnalyze} isAnalyzing={isAnalyzing} />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-12 pb-12">

            {viewMode === 'patient' && <PatientDashboard data={results} />}
            {viewMode === 'clinical' && <DoctorDashboard data={results} />}
            {viewMode === 'json' && (
              <div className="glass-panel p-8 rounded-3xl bg-slate-950/10 shadow-2xl border border-white/5">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  GENOMIC_SCHEMA_VALIDATED
                </h3>
                <pre className="bg-black/30 rounded-2xl p-6 overflow-x-auto border border-white/5 text-[11px] text-primary/90 font-mono leading-relaxed shadow-inner">
                  {JSON.stringify(results, null, 2)}
                </pre>
              </div>
            )}

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
              <DigitalTwin data={results} />
            </div>

            {/* Export Actions */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 pt-12 border-t border-white/5">
              <button
                onClick={handleDownloadReport}
                className="flex items-center gap-3 px-8 py-4 bg-primary/10 hover:bg-primary/20 border border-primary/30 rounded-2xl text-primary font-black tracking-widest uppercase text-xs transition-all shadow-[0_4px_20px_rgba(14,165,233,0.1)] active:scale-95"
              >
                <Download className="w-5 h-5" /> Download Report
              </button>
              <button
                onClick={handleCopyClipboard}
                className="flex items-center gap-3 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-slate-300 font-black tracking-widest uppercase text-xs transition-all active:scale-95"
              >
                <Copy className="w-5 h-5" /> Copy JSON
              </button>
            </div>

          </div>
        )}
      </div>

    </main>
  );
}
