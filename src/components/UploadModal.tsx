'use client';

import { useState, useRef } from 'react';
import { UploadCloud, CheckCircle2, FileText, Database, FileCode2, AlertTriangle, X, Plus, Zap } from 'lucide-react';

interface UploadModalProps {
    onAnalyze: (file: File, drugs: string) => void;
    isAnalyzing: boolean;
}

const KNOWN_DRUGS = [
    'CODEINE', 'WARFARIN', 'CLOPIDOGREL', 'SIMVASTATIN', 'AZATHIOPRINE', 'FLUOROURACIL',
    'AMIODARONE', 'CITALOPRAM', 'OMEPRAZOLE', 'PHENYTOIN'
];

export default function UploadModal({ onAnalyze, isAnalyzing }: UploadModalProps) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedDrugs, setSelectedDrugs] = useState<string[]>(KNOWN_DRUGS);
    const [customDrugInput, setCustomDrugInput] = useState('');
    const [drugInputError, setDrugInputError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleDrug = (drug: string) => {
        setSelectedDrugs(prev => {
            if (prev.includes(drug)) {
                if (prev.length <= 1) return prev; // must keep at least 1
                return prev.filter(d => d !== drug);
            }
            return [...prev, drug];
        });
    };

    const addCustomDrug = () => {
        const name = customDrugInput.trim().toUpperCase();
        if (!name) {
            setDrugInputError('Please enter a drug name.');
            return;
        }
        if (!/^[A-Z]+$/.test(name)) {
            setDrugInputError('Drug name must contain letters only.');
            return;
        }
        if (selectedDrugs.includes(name)) {
            setDrugInputError(`${name} is already selected.`);
            return;
        }
        setDrugInputError(null);
        setSelectedDrugs(prev => [...prev, name]);
        setCustomDrugInput('');
    };

    const handleDrugKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addCustomDrug();
        }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            validateAndSetFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            validateAndSetFile(e.target.files[0]);
        }
    };

    const validateAndSetFile = (file: File) => {
        setError(null);
        setSelectedFile(null);

        if (!file.name.toLowerCase().endsWith('.vcf')) {
            setError('Invalid file type. Please upload a file with the .vcf extension.');
            return;
        }

        if (file.size === 0) {
            setError('File appears to be empty. Please upload a valid VCF file containing variant data.');
            return;
        }

        if (file.size > 50 * 1024 * 1024) {
            setError('File is too large (>50MB). For edge processing, please upload a smaller VCF.');
            return;
        }

        // Read first 2KB to validate VCF content
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = (e.target?.result as string) || '';

            if (!text.includes('##fileformat=VCF')) {
                setError(
                    'Invalid VCF content: this file does not appear to be a valid VCF. ' +
                    'Expected a "##fileformat=VCF" header at the start of the file. ' +
                    'Please ensure you are uploading a proper Variant Call Format file.'
                );
                return;
            }

            // File is valid
            setSelectedFile(file);
        };
        reader.onerror = () => {
            setError('Could not read the uploaded file. Please try again.');
        };
        // Only read first 2KB for efficiency
        reader.readAsText(file.slice(0, 2048));
    };

    const customDrugs = selectedDrugs.filter(d => !KNOWN_DRUGS.includes(d));

    return (
        <div className="w-full max-w-2xl mx-auto glass-panel p-10 rounded-[2.5rem] relative overflow-hidden transition-all duration-700">
            {/* HUD scanline effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/[0.03] to-transparent h-[200%] w-full pointer-events-none animate-[scanline_8s_linear_infinite]" style={{ backgroundSize: '100% 4px' }} />

            <div className="text-center mb-10 relative z-10">
                <div className="inline-flex items-center justify-center p-5 bg-primary/5 text-primary rounded-3xl mb-6 shadow-[0_0_20px_rgba(14,165,233,0.1)] border border-primary/10 animate-pulse-glow">
                    <Database className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-black mb-3 text-white tracking-tight uppercase text-glow">
                    Clinical VCF <span className="text-primary/70">Analysis</span>
                </h2>
                <div className="flex flex-col items-center space-y-2">
                    <p className="text-slate-400 max-w-md mx-auto leading-relaxed font-medium">
                        Upload raw <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-primary font-mono text-xs font-black italic">.VCF</span> genomic sequences for quantum risk modeling.
                    </p>
                    <div className="flex items-center gap-3 py-1 px-3 rounded-full bg-white/5 border border-white/5 text-[10px] uppercase tracking-widest font-black text-slate-500">
                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-success" /> Edge Encrypted</span>
                        <div className="w-[1px] h-3 bg-white/10" />
                        <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> Zero Data Retention</span>
                    </div>
                </div>
            </div>

            {/* File Drop Zone */}
            <div
                className={`relative z-10 border-2 border-dashed rounded-[2rem] p-12 text-center transition-all duration-500 cursor-pointer overflow-hidden group ${dragActive
                    ? 'border-primary bg-primary/10 scale-[1.02] shadow-[0_0_30px_rgba(14,165,233,0.2)]'
                    : selectedFile ? 'border-success/50 bg-success/5' : 'border-white/10 hover:border-primary/40 hover:bg-white/[0.02]'
                    }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    id="vcf-upload"
                    type="file"
                    className="hidden"
                    accept=".vcf"
                    onChange={handleChange}
                />

                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {selectedFile ? (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500 relative z-10">
                        <div className="w-20 h-20 rounded-2xl bg-success/10 flex items-center justify-center mb-6 border border-success/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                            <FileCode2 className="w-10 h-10 text-success" />
                        </div>
                        <h3 className="text-xl font-black text-white mb-1 tracking-tight">{selectedFile.name}</h3>
                        <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • RAW DATA PACKET</p>
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setError(null); }}
                            className="mt-6 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-danger transition-colors underline decoration-dotted"
                        >
                            Abort Upload
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center relative z-10">
                        <UploadCloud className={`w-16 h-16 mb-6 transition-all duration-500 ${dragActive ? 'text-primary scale-110' : 'text-slate-600 group-hover:text-primary/70 group-hover:scale-110'}`} />
                        <h3 className="text-lg font-black text-white mb-2 uppercase tracking-widest">Initialize Sequence</h3>
                        <p className="text-slate-500 font-medium">Drag & drop or <span className="text-primary hover:underline">browse files</span></p>
                        <p className="text-[10px] text-slate-600 mt-4 font-mono tracking-tighter uppercase flex items-center gap-2">
                            <FileText className="w-3 h-3" /> VCF Format Required (##fileformat=VCF)
                        </p>
                    </div>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <div className="mt-6 p-5 rounded-2xl bg-danger/10 border border-danger/20 text-danger text-sm flex items-start gap-4 relative z-10 animate-in slide-in-from-top-2">
                    <AlertTriangle className="w-6 h-6 shrink-0" />
                    <div>
                        <p className="font-black uppercase tracking-widest text-xs mb-1">Upload Integrity Failure</p>
                        <p className="text-danger/80 font-medium">{error}</p>
                    </div>
                </div>
            )}

            {/* Drug Selection — shown after valid file is picked */}
            {selectedFile && !error && (
                <div className="mt-10 relative z-10 space-y-8 animate-in slide-in-from-bottom-4 duration-700">

                    {/* Drug Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Target Pharmacopeia</h3>
                            <span className="text-[10px] font-mono text-primary/60">{selectedDrugs.length} SELECTION(S)</span>
                        </div>

                        {/* Custom Drug Input */}
                        <div className="flex gap-3 mb-6">
                            <div className="flex-1 relative group">
                                <input
                                    type="text"
                                    value={customDrugInput}
                                    onChange={(e) => { setCustomDrugInput(e.target.value); setDrugInputError(null); }}
                                    onKeyDown={handleDrugKeyDown}
                                    placeholder="Enter drug ID (e.g. METFORMIN)..."
                                    className="w-full px-5 py-3 rounded-xl border border-white/5 bg-black/20 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 placeholder:text-slate-600 transition-all"
                                />
                                <div className="absolute inset-0 rounded-xl bg-primary/5 opacity-0 group-focus-within:opacity-100 pointer-events-none transition-opacity duration-500" />
                            </div>
                            <button
                                onClick={addCustomDrug}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all active:scale-95 shadow-lg"
                            >
                                <Plus className="w-4 h-4" /> Inject
                            </button>
                        </div>

                        {/* Drug Input Error */}
                        {drugInputError && (
                            <p className="text-[10px] text-danger mb-3 font-bold flex items-center gap-2 tracking-wide uppercase italic">
                                <AlertTriangle className="w-3 h-3" /> {drugInputError}
                            </p>
                        )}

                        {/* Known Drug Pills */}
                        <div className="flex flex-wrap gap-2.5">
                            {KNOWN_DRUGS.map(drug => (
                                <button
                                    key={drug}
                                    onClick={() => toggleDrug(drug)}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all duration-300 border ${selectedDrugs.includes(drug)
                                        ? 'bg-primary text-white border-primary shadow-[0_4px_12px_rgba(14,165,233,0.3)] scale-105'
                                        : 'bg-white/5 text-slate-500 border-white/5 hover:text-slate-300 hover:border-white/10'
                                        }`}
                                >
                                    {drug}
                                </button>
                            ))}

                            {/* Custom added drug pills */}
                            {customDrugs.map(drug => (
                                <button
                                    key={drug}
                                    onClick={() => toggleDrug(drug)}
                                    className="px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase bg-accent text-white border border-accent shadow-[0_4px_12px_rgba(129,140,248,0.3)] flex items-center gap-2 group animate-in zoom-in duration-300"
                                >
                                    {drug}
                                    <X className="w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />
                                </button>
                            ))}
                        </div>

                        {selectedDrugs.length === 0 && (
                            <p className="text-[10px] text-danger mt-4 font-bold flex items-center gap-2 uppercase tracking-wide">
                                <AlertTriangle className="w-3 h-3" /> Critical: No target molecules selected for analysis.
                            </p>
                        )}
                    </div>

                    {/* Analyze Button */}
                    <button
                        disabled={!selectedFile || isAnalyzing || selectedDrugs.length === 0}
                        onClick={() => selectedDrugs.length > 0 && onAnalyze(selectedFile, selectedDrugs.join(','))}
                        className={`w-full py-5 rounded-2xl font-black tracking-[0.2em] uppercase text-xs flex items-center justify-center gap-4 transition-all duration-500 shadow-2xl ${!selectedFile || isAnalyzing || selectedDrugs.length === 0
                            ? 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
                            : 'bg-gradient-to-r from-primary to-accent text-white hover:brightness-110 active:scale-[0.98] border border-white/10'
                            }`}
                    >
                        {isAnalyzing ? (
                            <span className="flex items-center justify-center gap-3">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin shadow-[0_0_15px_white]" />
                                Finalizing Quantization...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-3">
                                <Zap className="w-5 h-5 text-glow" />
                                Execute Genomic Analysis
                            </span>
                        )}
                    </button>

                    {isAnalyzing && (
                        <div className="mt-6 flex flex-col items-center gap-2">
                            <div className="w-full h-[2px] bg-white/5 rounded-full overflow-hidden">
                                <div className="h-full bg-primary animate-[upload-progress_2s_easeInOut_infinite]" style={{ width: '40%' }} />
                            </div>
                            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-widest animate-pulse">
                                Parsing Variants • Evaluating Pathologies • Consulting XenoFlux Core
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
