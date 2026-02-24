import { VCFVariant } from './vcfParser';

export type RiskCategory = 'Safe' | 'Adjust Dosage' | 'Toxic';

export interface DrugRiskAssessment {
    drug: string;
    risk: RiskCategory;
    gene: string;
    diplotype: string;
    phenotype: string;
    activityScore?: number;
    recommendation: string;
    evidenceStrength: string;
    mechanism: 'Prodrug Activation' | 'Active Clearance' | 'Transporter' | 'Unknown';
}

export interface PatientProfile {
    genes: Record<string, { diplotype: string; phenotype: string; activityScore?: number }>;
    gciScore: number; // Genomic Confidence Index 0-100
}

// ---------------------------------------------------------
// STRICT GENE TO VARIANT MAPPING
// ---------------------------------------------------------

const TARGET_VARIANTS: Record<string, string[]> = {
    CYP2D6: ['rs3892097', 'rs1065852', 'rs16947', 'rs1135840'],
    CYP2C9: ['rs1799853', 'rs1057910'],
    CYP2C19: ['rs4244285', 'rs4986893'],
    SLCO1B1: ['rs4149056', 'rs2306283'],
    TPMT: ['rs1142345', 'rs1800460', 'rs1800462'],
    DPYD: ['rs3918290', 'rs67376798']
};

function getGenotype(variant: VCFVariant | undefined): string | null {
    if (!variant || !variant.sampleData || variant.sampleData.length === 0) return null;
    const gt = variant.sampleData[0];
    if (gt === '0/0' || gt === '0/1' || gt === '1/1') return gt;
    return null; // Invalid or missing
}

export function generatePharmacogenomicProfile(variants: VCFVariant[]): PatientProfile {
    const genes: Record<string, { diplotype: string; phenotype: string; activityScore?: number }> = {};
    let totalTargetedVariants = 0;
    let successfullyParsedVariants = 0;

    const variantMap = new Map<string, VCFVariant>();
    for (const v of variants) {
        if (v.id) {
            variantMap.set(v.id, v);
        }
    }

    for (const [gene, rsids] of Object.entries(TARGET_VARIANTS)) {
        totalTargetedVariants += rsids.length;

        let alteredAlleles = 0;
        let missingOrInvalid = false;

        for (const rsid of rsids) {
            const v = variantMap.get(rsid);
            const gt = getGenotype(v);

            if (!gt) {
                missingOrInvalid = true;
            } else {
                successfullyParsedVariants++;
                if (gt === '0/1') alteredAlleles += 1;
                if (gt === '1/1') alteredAlleles += 2;
            }
        }

        if (missingOrInvalid) {
            genes[gene] = { diplotype: 'Unknown', phenotype: 'Indeterminate', activityScore: -1 };
        } else {
            let phenotype = 'Normal Metabolizer';
            if (gene === 'SLCO1B1') phenotype = 'Normal Function';

            let diplotype = '*1/*1';

            if (alteredAlleles === 1) {
                phenotype = gene === 'SLCO1B1' ? 'Decreased Function' : 'Intermediate Metabolizer';
                diplotype = 'Variant/*1'; // Generic placeholder for exactly one varied allele
            } else if (alteredAlleles >= 2) {
                phenotype = gene === 'SLCO1B1' ? 'Poor Function' : 'Poor Metabolizer';
                diplotype = 'Variant/Variant';
            }

            // Approximate Activity Score for twin analysis scaling
            let activityScore = 2.0;
            if (alteredAlleles === 1) activityScore = 1.0;
            if (alteredAlleles >= 2) activityScore = 0.0;

            genes[gene] = { diplotype, phenotype, activityScore };
        }
    }

    // Calculate dynamic GCI Score based strictly on coverage of requested targeted variants
    let gciScore = 0;
    if (totalTargetedVariants > 0) {
        gciScore = Math.round((successfullyParsedVariants / totalTargetedVariants) * 100);
    }

    return { genes, gciScore };
}

/**
 * Clinical Decision Support (CDS) Rules Engine
 * Enforces strictly Safe / Adjust Dosage / Toxic risk categories.
 */
export function evaluateDrugRisk(targetDrug: string, profile: PatientProfile): DrugRiskAssessment {
    const drug = targetDrug.toUpperCase();

    switch (drug) {
        case 'CODEINE': {
            const p = profile.genes['CYP2D6'] || { phenotype: 'Indeterminate' };
            const mechanism = 'CYP2D6_activation';
            if (p.phenotype === 'Poor Metabolizer') return { drug, risk: 'Toxic', gene: 'CYP2D6', mechanism: 'Prodrug Activation', ...p, recommendation: 'Avoid codeine explicitly due to lack of efficacy (failure to activate to morphine). Prescribe alternative non-CYP2D6 dependent analgesics.', evidenceStrength: 'CPIC Level A' };
            if (p.phenotype === 'Intermediate Metabolizer') return { drug, risk: 'Adjust Dosage', gene: 'CYP2D6', mechanism: 'Prodrug Activation', ...p, recommendation: 'Reduced prodrug activation results in lower morphine formation and potential reduced analgesic response. Consider alternative opioid not dependent on CYP2D6. Avoid dose escalation without specialist review.', evidenceStrength: 'CPIC Level A' };
            if (p.phenotype === 'Ultrarapid Metabolizer') return { drug, risk: 'Toxic', gene: 'CYP2D6', mechanism: 'Prodrug Activation', ...p, recommendation: 'Avoid codeine due to potential for life-threatening respiratory depression from rapid morphine accumulation.', evidenceStrength: 'CPIC Level A' };
            // Fallback for Indeterminate or Normal
            if (p.phenotype === 'Indeterminate') return { drug, risk: 'Adjust Dosage', gene: 'CYP2D6', mechanism: 'Prodrug Activation', ...p, recommendation: 'Genomic profile indeterminate. Use clinical caution.', evidenceStrength: 'Standard of Care' };
            return { drug, risk: 'Safe', gene: 'CYP2D6', mechanism: 'Prodrug Activation', ...p, recommendation: 'Safe to use standard dosing.', evidenceStrength: 'CPIC Level A' };
        }
        case 'WARFARIN': {
            const p = profile.genes['CYP2C9'] || { phenotype: 'Indeterminate' };
            const mechanism = 'Active Clearance';
            if (p.phenotype === 'Poor Metabolizer') return { drug, risk: 'Toxic', gene: 'CYP2C9', mechanism, ...p, recommendation: 'Reduce dose 50-75%. High risk of severe bleeding.', evidenceStrength: 'CPIC Level A' };
            if (p.phenotype === 'Intermediate Metabolizer') return { drug, risk: 'Adjust Dosage', gene: 'CYP2C9', mechanism, ...p, recommendation: 'Moderate reduction. Monitor INR closely.', evidenceStrength: 'CPIC Level A' };
            if (p.phenotype === 'Indeterminate') return { drug, risk: 'Adjust Dosage', gene: 'CYP2C9', mechanism, ...p, recommendation: 'Genomic profile indeterminate. Use standard clinical INR protocols.', evidenceStrength: 'Standard of Care' };
            return { drug, risk: 'Safe', gene: 'CYP2C9', mechanism, ...p, recommendation: 'Standard dosing protocol.', evidenceStrength: 'CPIC Level A' };
        }
        case 'CLOPIDOGREL': {
            const p = profile.genes['CYP2C19'] || { phenotype: 'Indeterminate' };
            const mechanism = 'Prodrug Activation';
            if (p.phenotype === 'Poor Metabolizer') return { drug, risk: 'Toxic', gene: 'CYP2C19', mechanism, ...p, recommendation: 'Avoid clopidogrel (cannot activate prodrug to active thiol metabolite). Prescribe alternative antiplatelet.', evidenceStrength: 'CPIC Level A' };
            if (p.phenotype === 'Intermediate Metabolizer') return { drug, risk: 'Adjust Dosage', gene: 'CYP2C19', mechanism, ...p, recommendation: 'Consider alternative antiplatelet therapy. CYP2C19 activation to active thiol metabolite is significantly reduced.', evidenceStrength: 'CPIC Level A' };
            if (p.phenotype === 'Indeterminate') return { drug, risk: 'Adjust Dosage', gene: 'CYP2C19', mechanism, ...p, recommendation: 'Profile indeterminate. Proceed with clinical standard of care.', evidenceStrength: 'Standard of Care' };
            return { drug, risk: 'Safe', gene: 'CYP2C19', mechanism, ...p, recommendation: 'Standard dosing.', evidenceStrength: 'CPIC Level A' };
        }
        case 'SIMVASTATIN': {
            const p = profile.genes['SLCO1B1'] || { phenotype: 'Indeterminate' };
            const mechanism = 'Transporter';
            if (p.phenotype === 'Poor Function' || p.phenotype === 'Decreased Function') return { drug, risk: 'Adjust Dosage', gene: 'SLCO1B1', mechanism, ...p, recommendation: 'Dose cap at 20mg daily or prescribe alternative statin (e.g., rosuvastatin) due to myopathy risk.', evidenceStrength: 'CPIC Level A' };
            if (p.phenotype === 'Indeterminate') return { drug, risk: 'Adjust Dosage', gene: 'SLCO1B1', mechanism, ...p, recommendation: 'Profile indeterminate. Monitor standard statin limits.', evidenceStrength: 'Standard of Care' };
            return { drug, risk: 'Safe', gene: 'SLCO1B1', mechanism, ...p, recommendation: 'Standard dosing.', evidenceStrength: 'CPIC Level A' };
        }
        case 'AZATHIOPRINE': {
            const p = profile.genes['TPMT'] || { phenotype: 'Indeterminate' };
            const mechanism = 'Active Clearance';
            if (p.phenotype === 'Poor Metabolizer') return { drug, risk: 'Toxic', gene: 'TPMT', mechanism, ...p, recommendation: 'Start at 10% standard dose 3x weekly. High risk of myelosuppression.', evidenceStrength: 'CPIC Level A' };
            if (p.phenotype === 'Intermediate Metabolizer') return { drug, risk: 'Adjust Dosage', gene: 'TPMT', mechanism, ...p, recommendation: '30-80% dose reduction based on clinical judgment.', evidenceStrength: 'CPIC Level A' };
            if (p.phenotype === 'Indeterminate') return { drug, risk: 'Adjust Dosage', gene: 'TPMT', mechanism, ...p, recommendation: 'Test enzymatically if proceeding. Profile indeterminate.', evidenceStrength: 'Standard of Care' };
            return { drug, risk: 'Safe', gene: 'TPMT', mechanism, ...p, recommendation: 'Standard dosing.', evidenceStrength: 'CPIC Level A' };
        }
        case 'FLUOROURACIL': {
            const p = profile.genes['DPYD'] || { phenotype: 'Indeterminate' };
            const mechanism = 'Active Clearance';
            if (p.phenotype === 'Poor Metabolizer') return { drug, risk: 'Toxic', gene: 'DPYD', mechanism, ...p, recommendation: 'Avoid completely due to severe, fatal toxicity risk.', evidenceStrength: 'CPIC Level A' };
            if (p.phenotype === 'Intermediate Metabolizer') return { drug, risk: 'Adjust Dosage', gene: 'DPYD', mechanism, ...p, recommendation: '50% dose reduction. Monitor carefully.', evidenceStrength: 'CPIC Level A' };
            if (p.phenotype === 'Indeterminate') return { drug, risk: 'Adjust Dosage', gene: 'DPYD', mechanism, ...p, recommendation: 'Profile indeterminate.', evidenceStrength: 'Standard of Care' };
            return { drug, risk: 'Safe', gene: 'DPYD', mechanism, ...p, recommendation: 'Standard dosing.', evidenceStrength: 'CPIC Level A' };
        }
        case 'PHENYTOIN': {
            const p = profile.genes['CYP2C9'] || { phenotype: 'Indeterminate' };
            const mechanism = 'Active Clearance';
            if (p.phenotype === 'Poor Metabolizer') return { drug, risk: 'Toxic', gene: 'CYP2C9', mechanism, ...p, recommendation: 'Reduce 50-75% of maintenance dose. TDM required.', evidenceStrength: 'CPIC Level A' };
            if (p.phenotype === 'Intermediate Metabolizer') return { drug, risk: 'Adjust Dosage', gene: 'CYP2C9', mechanism, ...p, recommendation: 'Reduce 25-50% of maintenance dose. TDM recommended.', evidenceStrength: 'CPIC Level A' };
            if (p.phenotype === 'Indeterminate') return { drug, risk: 'Adjust Dosage', gene: 'CYP2C9', mechanism, ...p, recommendation: 'Profile indeterminate. TDM required.', evidenceStrength: 'Standard of Care' };
            return { drug, risk: 'Safe', gene: 'CYP2C9', mechanism, ...p, recommendation: 'Standard dosing.', evidenceStrength: 'CPIC Level A' };
        }
        // Retaining Amiodarone, Citalopram, Omeprazole just to cover the full target list cleanly
        case 'AMIODARONE': {
            const p = profile.genes['CYP2C9'] || { phenotype: 'Indeterminate' };
            const mechanism = 'Active Clearance';
            if (p.phenotype === 'Poor Metabolizer') return { drug, risk: 'Toxic', gene: 'CYP2C9', mechanism, ...p, recommendation: 'High risk of amiodarone toxicity. Heavily reduce dosing.', evidenceStrength: 'No CPIC Level A guideline currently available; interpretation based on pharmacokinetic evidence.' };
            if (p.phenotype === 'Intermediate Metabolizer') return { drug, risk: 'Adjust Dosage', gene: 'CYP2C9', mechanism, ...p, recommendation: 'Consider lower maintenance dose.', evidenceStrength: 'No CPIC Level A guideline currently available; interpretation based on pharmacokinetic evidence.' };
            if (p.phenotype === 'Indeterminate') return { drug, risk: 'Adjust Dosage', gene: 'CYP2C9', mechanism, ...p, recommendation: 'Profile indeterminate.', evidenceStrength: 'No CPIC Level A guideline currently available; interpretation based on pharmacokinetic evidence.' };
            return { drug, risk: 'Safe', gene: 'CYP2C9', mechanism, ...p, recommendation: 'Standard dosing.', evidenceStrength: 'No CPIC Level A guideline currently available; interpretation based on pharmacokinetic evidence.' };
        }
        case 'CITALOPRAM': {
            const p = profile.genes['CYP2C19'] || { phenotype: 'Indeterminate' };
            const mechanism = 'Active Clearance';
            if (p.phenotype === 'Poor Metabolizer') return { drug, risk: 'Toxic', gene: 'CYP2C19', mechanism, ...p, recommendation: 'Maximum dose 20mg/day to prevent QTc prolongation.', evidenceStrength: 'No CPIC Level A guideline currently available; interpretation based on pharmacokinetic evidence.' };
            if (p.phenotype === 'Ultrarapid Metabolizer') return { drug, risk: 'Adjust Dosage', gene: 'CYP2C19', mechanism, ...p, recommendation: 'Consider alternative SSRI due to rapid clearance.', evidenceStrength: 'No CPIC Level A guideline currently available; interpretation based on pharmacokinetic evidence.' };
            if (p.phenotype === 'Indeterminate') return { drug, risk: 'Adjust Dosage', gene: 'CYP2C19', mechanism, ...p, recommendation: 'Profile indeterminate.', evidenceStrength: 'No CPIC Level A guideline currently available; interpretation based on pharmacokinetic evidence.' };
            return { drug, risk: 'Safe', gene: 'CYP2C19', mechanism, ...p, recommendation: 'Standard dosing.', evidenceStrength: 'No CPIC Level A guideline currently available; interpretation based on pharmacokinetic evidence.' };
        }
        case 'OMEPRAZOLE': {
            const p = profile.genes['CYP2C19'] || { phenotype: 'Indeterminate' };
            const mechanism = 'Active Clearance';
            if (p.phenotype === 'Poor Metabolizer') return { drug, risk: 'Adjust Dosage', gene: 'CYP2C19', mechanism, ...p, recommendation: 'Consider lowering dose if treating long-term.', evidenceStrength: 'No CPIC Level A guideline currently available; interpretation based on pharmacokinetic evidence.' };
            if (p.phenotype === 'Ultrarapid Metabolizer') return { drug, risk: 'Adjust Dosage', gene: 'CYP2C19', mechanism, ...p, recommendation: 'Increase dose by 100-200% or split dose.', evidenceStrength: 'No CPIC Level A guideline currently available; interpretation based on pharmacokinetic evidence.' };
            if (p.phenotype === 'Indeterminate') return { drug, risk: 'Adjust Dosage', gene: 'CYP2C19', mechanism, ...p, recommendation: 'Profile indeterminate.', evidenceStrength: 'No CPIC Level A guideline currently available; interpretation based on pharmacokinetic evidence.' };
            return { drug, risk: 'Safe', gene: 'CYP2C19', mechanism, ...p, recommendation: 'Standard dosing.', evidenceStrength: 'No CPIC Level A guideline currently available; interpretation based on pharmacokinetic evidence.' };
        }
        default:
            return {
                drug: targetDrug,
                risk: 'Adjust Dosage',
                gene: 'N/A',
                mechanism: 'Unknown',
                diplotype: 'Unknown',
                phenotype: 'Indeterminate',
                recommendation: 'Drug not analyzed by deterministic engine.',
                evidenceStrength: 'None'
            };
    }
}
