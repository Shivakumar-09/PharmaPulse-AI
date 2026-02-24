export interface VCFVariant {
    chrom: string;
    pos: number;
    id: string; // rsID if available
    ref: string;
    alt: string;
    qual: string;
    filter: string;
    info: Record<string, string>;
    format: string;
    sampleData: string[];
}

/**
 * Parses a VCF file string into an array of variants.
 * Edge compatible (no fs/node dependencies).
 * Only extracts lines that are not comments.
 */
export function parseVCF(vcfString: string): VCFVariant[] {
    const lines = vcfString.split('\n');
    const variants: VCFVariant[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue;

        const fields = line.split('\t');
        if (fields.length < 8) continue;

        const [chrom, posStr, id, ref, alt, qual, filter, infoStr, format, ...sampleData] = fields;

        // Parse INFO field
        const infoPieces = infoStr.split(';');
        const info: Record<string, string> = {};
        for (const piece of infoPieces) {
            if (piece.includes('=')) {
                const [key, val] = piece.split('=');
                info[key] = val;
            } else {
                info[piece] = 'true';
            }
        }

        // Extract ONLY the genotype (e.g. 0/0, 0/1, 1/1)
        let exactGenotype = 'Unknown';
        if (sampleData && sampleData.length > 0) {
            const raw = sampleData[0];
            const gt = raw.split(':')[0];
            // Normalize separators to strictly use '/'
            if (gt === '0/0' || gt === '0|0') exactGenotype = '0/0';
            else if (gt === '0/1' || gt === '0|1' || gt === '1/0' || gt === '1|0') exactGenotype = '0/1';
            else if (gt === '1/1' || gt === '1|1') exactGenotype = '1/1';
            // Anything else (missing or multiallelic not supported) is Unknown
        }

        variants.push({
            chrom,
            pos: parseInt(posStr, 10),
            id: id === '.' ? `chr${chrom}:${posStr}` : id,
            ref,
            alt,
            qual,
            filter,
            info,
            format: format || '',
            sampleData: [exactGenotype] // OVERRIDE RAW WITH STRICT STRING
        });
    }

    return variants;
}
