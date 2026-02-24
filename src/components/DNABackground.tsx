'use client';

import { useEffect, useRef } from 'react';

// --- CONFIG & TYPES ---
const COLORS = [
    '#0ea5e9', // Electric Cyan
    '#38bdf8', // Sky Blue
    '#818cf8', // Neon Indigo
    '#c084fc', // Bright Purple
    '#2dd4bf', // Neon Teal
    '#f472b6', // Hot Pink
];

interface Particle {
    angle: number;
    strandIdx: number;
    speed: number;
    radius: number;
    color: string;
    glowCanvas: HTMLCanvasElement; // Pre-rendered glow
}

interface Helix {
    xOffset: number;
    z: number;
    rotationSpeed: number;
    particles: Particle[];
    phase: number;
    colorBase: string;
}

interface Atom {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    radius: number;
    color: string;
}

interface Pulse {
    x: number;
    y: number;
    radius: number;
    maxRadius: number;
    power: number;
}

// --- OPTIMIZATION: Pre-render glows to offscreen canvases ---
// createRadialGradient per-particle per-frame is extremely expensive.
const createGlowCanvas = (color: string, radius: number): HTMLCanvasElement => {
    const canvas = document.createElement('canvas');
    const size = radius * 6; // enough space for the glow (r * 3 radius)
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        const cx = size / 2;
        const cy = size / 2;
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 3);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        // Core dot
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
    }
    return canvas;
};

// Cache for glow canvases to reuse identical color/radius combinations
const glowCache: Record<string, HTMLCanvasElement> = {};
const getCachedGlow = (color: string, radius: number) => {
    const key = `${color}-${radius.toFixed(1)}`;
    if (!glowCache[key]) {
        glowCache[key] = createGlowCanvas(color, radius);
    }
    return glowCache[key];
};

export default function DNABackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const timeRef = useRef<number>(0);
    const frameRef = useRef<number>(0);

    const mouse = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
    const pulses = useRef<Pulse[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false }); // alpha: false optimization
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = window.innerHeight;
        let diagonal = Math.sqrt(width * width + height * height);

        // --- DATA INITIALIZATION ---
        const initHelices = (count: number): Helix[] => {
            const helices: Helix[] = [];
            for (let i = 0; i < count; i++) {
                const z = Math.random();
                const xOffset = (Math.random() - 0.5) * diagonal * 1.2;

                const particles: Particle[] = [];
                // Reduce particle count slightly for performance, compensate with larger size
                const numParticles = 45 + Math.floor(Math.random() * 20);
                const helixColor = COLORS[Math.floor(Math.random() * COLORS.length)];

                for (let j = 0; j < numParticles; j++) {
                    const strand = j % 2;
                    const c = Math.random() > 0.8 ? COLORS[Math.floor(Math.random() * COLORS.length)] : helixColor;
                    const r = 1.5 + Math.random() * 2.5;
                    particles.push({
                        angle: (j / numParticles) * Math.PI * 10, // 5 turns
                        strandIdx: strand,
                        speed: 0.005 + Math.random() * 0.005,
                        radius: r,
                        color: c,
                        glowCanvas: getCachedGlow(c, r)
                    });
                }
                for (let j = 0; j < numParticles; j += 4) {
                    particles.push({
                        angle: (j / numParticles) * Math.PI * 10,
                        strandIdx: 2,
                        speed: 0.005,
                        radius: 1.0,
                        color: helixColor,
                        glowCanvas: getCachedGlow(helixColor, 1.0)
                    });
                }

                helices.push({
                    xOffset,
                    z,
                    rotationSpeed: (0.005 + Math.random() * 0.005) * (Math.random() > 0.5 ? 1 : -1),
                    particles,
                    phase: Math.random() * Math.PI * 2,
                    colorBase: helixColor
                });
            }
            return helices.sort((a, b) => a.z - b.z);
        };

        const initAtoms = (count: number): Atom[] => {
            const atoms: Atom[] = [];
            for (let i = 0; i < count; i++) {
                atoms.push({
                    x: (Math.random() - 0.5) * diagonal * 1.5,
                    y: (Math.random() - 0.5) * diagonal * 1.5,
                    z: Math.random(),
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    radius: 1.0 + Math.random() * 3.0,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                });
            }
            return atoms;
        };

        // Screen optimizations
        const isMobile = width < 768;
        let helices = initHelices(isMobile ? 3 : 5); // fewer helices to reduce draw calls
        let atoms = initAtoms(isMobile ? 60 : 150);

        const resize = () => {
            width = canvas.width = window.innerWidth;
            height = canvas.height = window.innerHeight;
            diagonal = Math.sqrt(width * width + height * height);
            const mobile = width < 768;
            helices = initHelices(mobile ? 3 : 5);
            atoms = initAtoms(mobile ? 60 : 150);
        };
        window.addEventListener('resize', resize);

        // --- INTERACTIVITY ---
        const onMouseMove = (e: MouseEvent) => {
            mouse.current.targetX = (e.clientX / width) * 2 - 1;
            mouse.current.targetY = (e.clientY / height) * 2 - 1;
        };
        const onClick = (e: MouseEvent) => {
            const cx = e.clientX - width / 2;
            const cy = e.clientY - height / 2;
            const theta = Math.PI / 4;
            const rx = cx * Math.cos(-theta) - cy * Math.sin(-theta);
            const ry = cx * Math.sin(-theta) + cy * Math.cos(-theta);

            pulses.current.push({
                x: rx,
                y: ry,
                radius: 0,
                maxRadius: 300 + Math.random() * 200,
                power: 1.0
            });
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('click', onClick);

        // --- RENDER LOOP ---
        const draw = () => {
            timeRef.current += 1;
            const tOffset = timeRef.current;

            mouse.current.x += (mouse.current.targetX - mouse.current.x) * 0.05;
            mouse.current.y += (mouse.current.targetY - mouse.current.y) * 0.05;

            // Clear with deep medical blue
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, width, height);

            ctx.save();
            ctx.translate(width / 2, height / 2);
            ctx.rotate(Math.PI / 4);

            for (let i = pulses.current.length - 1; i >= 0; i--) {
                const p = pulses.current[i];
                p.radius += 12;
                p.power *= 0.94;
                if (p.power < 0.05 || p.radius > p.maxRadius) {
                    pulses.current.splice(i, 1);
                }
            }

            // Atoms
            ctx.globalCompositeOperation = 'lighter';
            atoms.forEach(atom => {
                atom.x += atom.vx;
                atom.y += atom.vy;

                const halfDiag = diagonal * 0.75;
                if (atom.x > halfDiag) atom.x = -halfDiag;
                if (atom.x < -halfDiag) atom.x = halfDiag;
                if (atom.y > halfDiag) atom.y = -halfDiag;
                if (atom.y < -halfDiag) atom.y = halfDiag;

                const px = atom.x + mouse.current.x * 100 * atom.z;
                const py = atom.y + mouse.current.y * 100 * atom.z;

                let pulseEffect = 0;
                pulses.current.forEach(pulse => {
                    const dist = Math.hypot(px - pulse.x, py - pulse.y);
                    if (Math.abs(dist - pulse.radius) < 50) {
                        pulseEffect += pulse.power * (1 - Math.abs(dist - pulse.radius) / 50);
                    }
                });

                const scale = 0.5 + atom.z * 1.5 + pulseEffect;
                const alpha = (0.3 + atom.z * 0.7) + (pulseEffect * 0.5);

                ctx.beginPath();
                ctx.arc(px, py, atom.radius * scale, 0, Math.PI * 2);
                ctx.fillStyle = atom.color;
                ctx.globalAlpha = Math.min(1, alpha);
                ctx.fill();
            });
            ctx.globalCompositeOperation = 'source-over';

            // Helices
            helices.forEach(helix => {
                const prlxX = -mouse.current.x * 120 * helix.z;
                const prlxY = -mouse.current.y * 120 * helix.z;
                const baseX = helix.xOffset + prlxX;
                const helixWidth = 15 + helix.z * 25;

                // OMIT filter: blur(). It creates massive lag on low-end machines.
                // Instead we simulate depth entirely via opacity and scale.
                const baseAlpha = 0.1 + helix.z * 0.7;
                const scaleMulti = 0.4 + helix.z * 0.8;

                const particlePositions: { x: number, y: number }[] = [];

                helix.particles.forEach(p => {
                    p.angle += p.speed;
                    const theta = p.angle + helix.phase + tOffset * helix.rotationSpeed;
                    const yBase = ((p.angle % (Math.PI * 10)) / (Math.PI * 10)) * diagonal * 1.5 - (diagonal * 0.75) + prlxY;

                    const helixDepth = Math.sin(theta);
                    const helixScale = 0.8 + helixDepth * 0.4;
                    let px: number, py = yBase;

                    if (p.strandIdx === 0) px = baseX + Math.cos(theta) * helixWidth;
                    else if (p.strandIdx === 1) px = baseX + Math.cos(theta + Math.PI) * helixWidth;
                    else px = baseX;

                    let pEffect = 0;
                    pulses.current.forEach(pulse => {
                        const dist = Math.hypot(px - pulse.x, py - pulse.y);
                        if (Math.abs(dist - pulse.radius) < 60) {
                            pEffect += pulse.power * (1 - Math.abs(dist - pulse.radius) / 60);
                        }
                    });

                    if (pEffect > 0) py += Math.sin(theta) * pEffect * 20;

                    const finalScale = scaleMulti * helixScale * (1 + pEffect * 0.5);
                    const finalAlpha = Math.min(1, baseAlpha * (0.5 + helixDepth * 0.5) + pEffect);

                    if (p.strandIdx !== 2) {
                        // Store limited points for network rendering (skip many to avoid N^2 explosion)
                        // Downsample from >80% to just >92%
                        if (Math.random() > 0.92) {
                            particlePositions.push({ x: px, y: py });
                        }

                        // Use pre-rendered canvas glow (MASSIVE optimization over createRadialGradient)
                        const glowSize = p.glowCanvas.width * finalScale;
                        ctx.globalAlpha = finalAlpha;
                        ctx.drawImage(p.glowCanvas, px - glowSize / 2, py - glowSize / 2, glowSize, glowSize);

                    } else {
                        const xA = baseX + Math.cos(theta) * helixWidth;
                        const xB = baseX + Math.cos(theta + Math.PI) * helixWidth;
                        ctx.globalAlpha = finalAlpha * 0.3;
                        ctx.beginPath();
                        ctx.moveTo(xA, py);
                        ctx.lineTo(xB, py);
                        ctx.strokeStyle = p.color;
                        ctx.lineWidth = 1.5 * finalScale;
                        ctx.stroke();
                    }
                });

                // Network Connections - optimized O(N^2) on a much smaller N
                ctx.globalAlpha = baseAlpha * 0.15;
                ctx.lineWidth = 1 * scaleMulti;
                ctx.strokeStyle = helix.colorBase;
                ctx.beginPath();
                const len = particlePositions.length;
                for (let i = 0; i < len; i++) {
                    const p1 = particlePositions[i];
                    for (let j = i + 1; j < len; j++) {
                        const p2 = particlePositions[j];
                        // Fast dist check before hypot
                        const dx = p1.x - p2.x;
                        if (Math.abs(dx) > 60) continue;
                        const dy = p1.y - p2.y;
                        if (Math.abs(dy) > 60) continue;

                        if (dx * dx + dy * dy < 3600) {
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                        }
                    }
                }
                ctx.stroke();
            });

            ctx.restore();
            frameRef.current = requestAnimationFrame(draw);
        };

        draw();

        return () => {
            window.removeEventListener('resize', resize);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('click', onClick);
            cancelAnimationFrame(frameRef.current);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 0 }}
        />
    );
}
