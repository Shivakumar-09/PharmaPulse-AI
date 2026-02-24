'use client';

import { Shield, Info } from 'lucide-react';

interface GCIBadgeProps {
    score: number;
}

export default function GCIBadge({ score }: GCIBadgeProps) {
    let color = 'text-success';
    let bg = 'bg-success/20';
    let border = 'border-success/30';
    let label = 'High Confidence';

    if (score < 50) {
        color = 'text-danger';
        bg = 'bg-danger/20';
        border = 'border-danger/30';
        label = 'Low Confidence';
    } else if (score < 80) {
        color = 'text-warning';
        bg = 'bg-warning/20';
        border = 'border-warning/30';
        label = 'Medium Confidence';
    }

    return (
        <div className={`inline-flex flex-col items-center p-3 rounded-xl border ${bg} ${border} backdrop-blur-sm transition-all hover:scale-105 group relative`}>
            <div className="flex items-center gap-2">
                <Shield className={`w-6 h-6 ${color}`} />
                <div className="flex flex-col">
                    <span className={`text-xl font-black leading-none ${color}`}>{score}</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">GCI Score</span>
                </div>
            </div>

            {/* Tooltip */}
            <div className="absolute top-full mt-2 w-48 p-3 bg-gray-900 border border-white/10 rounded-lg text-xs text-gray-300 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <strong className="block text-white mb-1">{label}</strong>
                Genomic Confidence Index measures variant completeness, sequence quality, and guideline strength.
            </div>
        </div>
    );
}
