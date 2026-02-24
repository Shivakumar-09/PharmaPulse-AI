'use client';

import { useState, useMemo, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import { RefreshCw, Zap, Activity, TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface DigitalTwinProps {
    data: any[];
}

// Drug-specific PK parameters (literature-based approximations)
// D = dose (mg), F = bioavailability, Vd = vol of distribution (L), ka = absorption rate constant (/h)
// ke base (Normal Metabolizer), toxicity threshold (mg/L), efficacy floor (mg/L)
const DRUG_PK_PARAMS: Record<string, {
    D: number; F: number; Vd: number; ka: number; ke_normal: number;
    toxicity: number; efficacy: number; unit: string; halfLifeHr: number;
}> = {
    CODEINE: { D: 30, F: 0.9, Vd: 200, ka: 1.5, ke_normal: 0.35, toxicity: 0.25, efficacy: 0.05, unit: 'µg/L', halfLifeHr: 3 },
    WARFARIN: { D: 5, F: 0.9, Vd: 10, ka: 0.6, ke_normal: 0.04, toxicity: 3.0, efficacy: 0.8, unit: 'mg/L', halfLifeHr: 36 },
    CLOPIDOGREL: { D: 75, F: 0.5, Vd: 400, ka: 1.2, ke_normal: 0.6, toxicity: 0.6, efficacy: 0.1, unit: 'µg/L', halfLifeHr: 6 },
    SIMVASTATIN: { D: 40, F: 0.05, Vd: 580, ka: 1.0, ke_normal: 1.5, toxicity: 0.12, efficacy: 0.02, unit: 'µg/L', halfLifeHr: 2 },
    AZATHIOPRINE: { D: 100, F: 0.8, Vd: 45, ka: 1.3, ke_normal: 0.35, toxicity: 8.0, efficacy: 2.0, unit: 'mg/L', halfLifeHr: 5 },
    FLUOROURACIL: { D: 500, F: 1.0, Vd: 22, ka: 2.0, ke_normal: 0.9, toxicity: 300, efficacy: 80, unit: 'µg/L', halfLifeHr: 0.5 },
    AMIODARONE: { D: 200, F: 0.5, Vd: 5000, ka: 0.3, ke_normal: 0.003, toxicity: 3.5, efficacy: 1.0, unit: 'mg/L', halfLifeHr: 40 },
    CITALOPRAM: { D: 20, F: 0.8, Vd: 400, ka: 0.5, ke_normal: 0.04, toxicity: 0.5, efficacy: 0.05, unit: 'mg/L', halfLifeHr: 35 },
    OMEPRAZOLE: { D: 20, F: 0.65, Vd: 35, ka: 0.8, ke_normal: 0.7, toxicity: 2.5, efficacy: 0.3, unit: 'mg/L', halfLifeHr: 1.5 },
    PHENYTOIN: { D: 300, F: 0.9, Vd: 45, ka: 0.4, ke_normal: 0.03, toxicity: 25, efficacy: 10, unit: 'mg/L', halfLifeHr: 22 },
};

// Determine the ke modifier based on phenotype and whether the drug is a prodrug
// Prodrugs: lower ke means LESS activation, higher ke means over-activation
const getKeModifier = (phenotype: string, isProdrug: boolean): number => {
    const p = phenotype.toLowerCase();
    if (isProdrug) {
        // For prodrugss, ke represents activation rate
        if (p.includes('poor') || p.includes('no function')) return 0.15; // Much less activation
        if (p.includes('intermediate') || p.includes('decreased')) return 0.55; // Reduced activation
        if (p.includes('ultrarapid') || p.includes('ultra')) return 2.2; // Excessive activation
        if (p.includes('rapid')) return 1.5;
        return 1.0; // Normal
    } else {
        // Standard clearance drugs: ke represents how fast the drug is eliminated
        if (p.includes('poor') || p.includes('no function')) return 0.2; // Much slower clearance → accumulation
        if (p.includes('intermediate') || p.includes('decreased')) return 0.5; // Slower clearance
        if (p.includes('ultrarapid') || p.includes('ultra')) return 2.0; // Rapid clearance → sub-therapeutic
        if (p.includes('rapid')) return 1.5;
        return 1.0; // Normal
    }
};

// Drugs that are prodrugss (activation-based, not clearance-based)
const PRODRUG_SET = new Set(['CODEINE', 'CLOPIDOGREL']);

const generatePKData = (drug: string, phenotype: string, timeWindow: number = 24) => {
    const params = DRUG_PK_PARAMS[drug] ?? {
        D: 100, F: 0.8, Vd: 50, ka: 1.2, ke_normal: 0.25,
        toxicity: 8.0, efficacy: 2.0, unit: 'mg/L', halfLifeHr: 6
    };

    const { D, F, Vd, ka, ke_normal, toxicity, efficacy } = params;
    const isProdrug = PRODRUG_SET.has(drug);
    const keModifier = getKeModifier(phenotype, isProdrug);
    const ke = ke_normal * keModifier;

    // For prodrugs the "metabolite" concentration is proportional to the ke (activation rate)
    // We model the parent drug concentration (declines) and an active metabolite curve

    const step = timeWindow / 48; // 48 data points
    const result = [];

    for (let t = 0; t <= timeWindow; t += step) {
        // One-compartment oral model:
        // C(t) = (D·F / Vd) · (ka / (ka - ke)) · (e^(-ke·t) - e^(-ka·t))
        let concentration = 0;
        if (Math.abs(ka - ke) > 0.001) {
            concentration = (D * F / Vd) * (ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t));
        }
        concentration = Math.max(0, concentration);

        // For prodrugss: also compute the "active metabolite" concentration (simplified)
        let metabolite: number | null = null;
        if (isProdrug) {
            // Active metabolite rises as prodrug is activated, then clears
            const kmet = ke * 0.4;
            metabolite = concentration * (1 - Math.exp(-kmet * t)) * keModifier * 0.3;
            metabolite = Math.max(0, metabolite);
        }

        result.push({
            time: parseFloat(t.toFixed(2)),
            concentration: parseFloat(concentration.toFixed(4)),
            ...(isProdrug ? { metabolite: parseFloat((metabolite ?? 0).toFixed(4)) } : {}),
            toxicity,
            efficacy
        });
    }

    return result;
};

const formatTooltipValue = (value: number, name: string, drug: string) => {
    const unit = DRUG_PK_PARAMS[drug]?.unit ?? 'mg/L';
    return [`${value.toFixed(3)} ${unit}`, name];
};

const getPhenotypeIcon = (phenotype: string) => {
    const p = phenotype.toLowerCase();
    if (p.includes('poor') || p.includes('no function')) return { Icon: TrendingDown, color: 'text-danger', label: 'Low Clearance' };
    if (p.includes('ultrarapid') || p.includes('ultra')) return { Icon: TrendingUp, color: 'text-warning', label: 'High Clearance' };
    if (p.includes('intermediate') || p.includes('decreased')) return { Icon: Activity, color: 'text-warning', label: 'Reduced Clearance' };
    return { Icon: Minus, color: 'text-success', label: 'Normal Clearance' };
};

const getTimeWindow = (drug: string): number => {
    const halfLife = DRUG_PK_PARAMS[drug]?.halfLifeHr ?? 6;
    // Show ~5 half-lives for clearance, rounded to readable window
    const fiveHL = halfLife * 5;
    if (fiveHL < 12) return 12;
    if (fiveHL < 24) return 24;
    if (fiveHL < 72) return 72;
    return 120; // e.g. amiodarone with 40h half-life
};

const CustomTooltip = ({ active, payload, label, drug }: any) => {
    if (!active || !payload?.length) return null;
    const unit = DRUG_PK_PARAMS[drug]?.unit ?? 'mg/L';
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
            <p className="text-slate-500 font-semibold mb-1">t = {label}h</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} style={{ color: p.color }} className="font-mono">
                    {p.name}: {parseFloat(p.value).toFixed(3)} {unit}
                </p>
            ))}
        </div>
    );
};

export default function DigitalTwin({ data }: DigitalTwinProps) {
    const [selectedDrug, setSelectedDrug] = useState(data[0]?.drug || '');
    const [animKey, setAnimKey] = useState(0);

    useEffect(() => {
        if (data.length > 0 && !selectedDrug) {
            setSelectedDrug(data[0].drug);
        }
    }, [data]);

    const currentData = data.find(d => d.drug === selectedDrug);

    const timeWindow = useMemo(() => getTimeWindow(selectedDrug), [selectedDrug]);

    const chartData = useMemo(() => {
        if (!currentData) return [];
        return generatePKData(currentData.drug, currentData.pharmacogenomic_profile.phenotype, timeWindow);
    }, [currentData, timeWindow]);

    const isProdrug = PRODRUG_SET.has(selectedDrug);
    const pkParams = DRUG_PK_PARAMS[selectedDrug];
    const phenotype = currentData?.pharmacogenomic_profile.phenotype ?? '';
    const { Icon: PhenoIcon, color: phenoColor, label: phenoLabel } = getPhenotypeIcon(phenotype);

    const cmax = chartData.length ? Math.max(...chartData.map(d => d.concentration)) : 0;
    const tmax = chartData.find(d => d.concentration === cmax)?.time ?? 0;

    const handleDrugChange = (drug: string) => {
        setSelectedDrug(drug);
        setAnimKey(k => k + 1); // Force re-animation
    };

    if (!currentData) return null;

    return (
        <div className="glass-panel p-8 rounded-2xl relative overflow-hidden border border-white/10 shadow-2xl">
            {/* Subtle HUD grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(14,165,233,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.05)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            {/* Header */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 relative z-10">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-2 text-white text-glow tracking-tight">
                        <Zap className="w-6 h-6 text-primary animate-pulse" />
                        PHARMACOLOGICAL DIGITAL TWIN
                    </h2>
                    <p className="text-slate-400 text-xs font-mono mt-1 flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse-glow" />
                        Simulation Active: One-Compartment PK Model
                    </p>
                </div>

                <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                    <select
                        className="bg-slate-900/80 border border-white/10 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary flex-1 md:flex-none cursor-pointer font-bold transition-all hover:bg-slate-800"
                        value={selectedDrug}
                        onChange={(e) => handleDrugChange(e.target.value)}
                    >
                        {data.map(d => (
                            <option key={d.drug} value={d.drug}>{d.drug}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setAnimKey(k => k + 1)}
                        className="p-2 bg-primary/20 text-primary hover:bg-primary hover:text-white transition-all rounded-lg flex items-center justify-center shrink-0 border border-primary/40 shadow-[0_0_10px_rgba(14,165,233,0.2)]"
                        title="Re-run Simulation"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
                {/* Sidebar HUD Stats */}
                <div className="md:col-span-1 space-y-4">
                    <div className="hud-stat">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Target Gene</div>
                        <div className="text-lg font-mono font-black text-white text-glow">{currentData.pharmacogenomic_profile.primary_gene}</div>
                        <div className={`text-[10px] mt-1 font-bold flex items-center gap-1 ${phenoColor}`}>
                            <PhenoIcon className="w-3 h-3" /> {phenoLabel}
                        </div>
                    </div>

                    <div className="hud-stat">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 font-bold">Phenotype</div>
                        <div className={`text-xs font-black uppercase tracking-tight ${currentData.risk_assessment.risk_label === 'Toxic' ? 'text-danger' : currentData.risk_assessment.risk_label === 'Safe' ? 'text-success' : 'text-warning'}`}>
                            {phenotype}
                        </div>
                    </div>

                    <div className="bg-slate-950/10 p-4 rounded-xl border border-white/5">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-bold">HUD PK Metrics</div>
                        <div className="space-y-2 text-[11px] font-mono text-slate-300">
                            <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-slate-500">CMAX:</span> <span className="text-primary font-bold">{cmax.toFixed(3)} <span className="text-[9px]">{pkParams?.unit}</span></span></div>
                            <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-slate-500">TMAX:</span> <span className="text-white">{tmax.toFixed(1)}h</span></div>
                            <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-slate-500">T½ BASE:</span> <span className="text-white">{pkParams?.halfLifeHr}h</span></div>
                            <div className="flex justify-between border-b border-white/5 pb-1"><span className="text-slate-500">WINDOW:</span> <span className="text-white">{timeWindow}h</span></div>
                            {isProdrug && <div className="text-accent text-[9px] pt-1 font-bold">PRODRUG SIGNAL DETECTED</div>}
                        </div>
                    </div>

                    <div className="bg-primary/5 p-4 rounded-xl border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
                        <div className="text-[10px] text-primary uppercase tracking-widest font-black mb-2">System Rationale</div>
                        <div className="text-[11px] text-slate-400 leading-relaxed font-medium">
                            {currentData.llm_generated_explanation?.twin_analysis ||
                                `Awaiting detailed AI twin analysis for ${selectedDrug}...`}
                        </div>
                    </div>
                </div>

                {/* Chart Area */}
                <div className="md:col-span-3 h-[380px] w-full bg-black/10 rounded-xl p-4 border border-white/5 shadow-inner relative">
                    <div className="absolute top-4 right-4 z-20 flex gap-2">
                        <div className="px-2 py-0.5 rounded border border-danger/40 text-danger text-[9px] font-bold bg-danger/5">TOXICITY</div>
                        <div className="px-2 py-0.5 rounded border border-success/40 text-success text-[9px] font-bold bg-success/5">EFFICACY</div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%" key={animKey}>
                        <LineChart data={chartData} margin={{ top: 18, right: 10, left: 0, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis
                                dataKey="time"
                                stroke="#475569"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                label={{ value: 'TIME (HOURS)', position: 'insideBottom', offset: -10, fill: '#475569', fontSize: 10, fontWeight: 'black' }}
                            />
                            <YAxis
                                stroke="#475569"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#64748b', fontSize: 10, fontWeight: 'bold' }}
                                label={{ value: `CONC (${pkParams?.unit})`, angle: -90, position: 'insideLeft', offset: 12, fill: '#475569', fontSize: 10, fontWeight: 'black' }}
                                width={50}
                            />
                            <Tooltip content={<CustomTooltip drug={selectedDrug} />} />

                            {/* Toxicity threshold */}
                            <ReferenceLine
                                y={chartData[0]?.toxicity}
                                stroke="#ef4444"
                                strokeDasharray="4 4"
                                strokeWidth={1}
                            />
                            {/* Efficacy floor */}
                            <ReferenceLine
                                y={chartData[0]?.efficacy}
                                stroke="#10b981"
                                strokeDasharray="4 4"
                                strokeWidth={1}
                            />

                            {/* Main concentration line with NEON GLOW effect via multiple lines or filters */}
                            <Line
                                type="monotone"
                                dataKey="concentration"
                                name="PLASMA CONC"
                                stroke="#0ea5e9"
                                strokeWidth={3}
                                dot={false}
                                activeDot={{ r: 6, fill: '#0ea5e9', stroke: '#fff', strokeWidth: 2 }}
                                isAnimationActive={true}
                                animationDuration={1500}
                                animationEasing="ease-out"
                            />

                            {/* Active metabolite line with NEON GLOW (Indigo/Purple) */}
                            {isProdrug && (
                                <Line
                                    type="monotone"
                                    dataKey="metabolite"
                                    name="METABOLITE"
                                    stroke="#818cf8"
                                    strokeWidth={2}
                                    strokeDasharray="4 2"
                                    dot={false}
                                    activeDot={{ r: 6, fill: '#818cf8', stroke: '#fff', strokeWidth: 2 }}
                                    isAnimationActive={true}
                                    animationDuration={1800}
                                    animationEasing="ease-out"
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}
