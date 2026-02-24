'use client';

import { useState } from 'react';
import { ShieldCheck, Lock, EyeOff } from 'lucide-react';

interface ConsentModalProps {
    onAccept: () => void;
}

export default function ConsentModal({ onAccept }: ConsentModalProps) {
    const [acceptedTerms, setAcceptedTerms] = useState({
        hipaa: false,
        ephemeral: false,
        disclaimer: false
    });

    const allAccepted = Object.values(acceptedTerms).every(Boolean);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white max-w-lg w-full p-8 rounded-2xl border border-slate-200 shadow-2xl relative overflow-hidden">

                <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <ShieldCheck className="w-8 h-8 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Privacy & Consent</h2>
                </div>

                <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                    GENO-CLARITY is a clinical-grade demonstration module. Before calculating your pharmacogenomic profile, you must acknowledge our strict data handling policies.
                </p>

                <div className="space-y-4 mb-8">
                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            className="mt-1 w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-white"
                            onChange={(e) => setAcceptedTerms(prev => ({ ...prev, ephemeral: e.target.checked }))}
                        />
                        <div>
                            <p className="text-slate-700 font-medium group-hover:text-slate-900 transition-colors flex items-center gap-2">
                                <EyeOff className="w-4 h-4 text-slate-400" /> Zero File Persistence
                            </p>
                            <p className="text-slate-500 text-xs mt-1">
                                I understand that my genomic data is processed strictly in-memory and is instantly destroyed after analysis. No data is saved to any database.
                            </p>
                        </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            className="mt-1 w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-white"
                            onChange={(e) => setAcceptedTerms(prev => ({ ...prev, hipaa: e.target.checked }))}
                        />
                        <div>
                            <p className="text-slate-700 font-medium group-hover:text-slate-900 transition-colors flex items-center gap-2">
                                <Lock className="w-4 h-4 text-slate-400" /> End-to-End Encryption
                            </p>
                            <p className="text-slate-500 text-xs mt-1">
                                I acknowledge the data is transmitted over secure TLS and parsed on securely isolated Vercel Edge nodes.
                            </p>
                        </div>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                        <input
                            type="checkbox"
                            className="mt-1 w-5 h-5 rounded border-slate-300 text-primary focus:ring-primary focus:ring-offset-white"
                            onChange={(e) => setAcceptedTerms(prev => ({ ...prev, disclaimer: e.target.checked }))}
                        />
                        <div>
                            <p className="text-slate-700 font-medium group-hover:text-slate-900 transition-colors">
                                Clinical Disclaimer
                            </p>
                            <p className="text-slate-500 text-xs mt-1">
                                I understand this tool is for informational visualization and does not substitute professional medical advice.
                            </p>
                        </div>
                    </label>
                </div>

                <button
                    onClick={onAccept}
                    disabled={!allAccepted}
                    className={`w-full py-4 rounded-xl font-bold transition-all ${allAccepted ? 'bg-primary text-white hover:bg-primary/90 shadow-md' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'}`}
                >
                    I Consent & Proceed
                </button>
            </div>
        </div>
    );
}
