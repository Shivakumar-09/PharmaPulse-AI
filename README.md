# 🧬 PharmaPulse-AI: Quantum Pharmacogenomics & Clinical Modeling

**PharmaPulse-AI** is a high-performance clinical intelligence platform designed to revolutionize personalized medicine. By integrating raw genomic VCF data with advanced Pharmacokinetic (PK) modeling and LLM-driven clinical reasoning, PharmaPulse-AI provides real-time insights into drug efficacy, toxicity risks, and patient-specific metabolic pathways.

![XenoFlux Header](file:///C:/Users/shiva/.gemini/antigravity/brain/2ec46fb3-224f-4ca4-8d3a-6d49f29c0ea7/xenoflux_header.webp)

## ✨ Key Features

- **🛡️ Clinical VCF Orchestration:** Drop raw variant data and instantly map pharmacogenomic markers (CYP2D6, CYP2C19, etc.).
- **📊 Pharmacological Digital Twin:** Interactive HUD displaying one-compartment PK simulations, including CMAX, TMAX, and active metabolite tracking.
- **⚡ Cyber-Clinical Aesthetic:** A premium, dark-mode 'HUD' interface built with Next.js, Tailwind CSS, and Framer Motion.
- **🤖 Quantum Reasoning:** Leverages Groq-accelerated LLMs to provide real-time clinical rationale for complex genomic findings.
- **🔒 Privacy-First Architecture:** All processing is handled at the edge with zero data retention for sensitive genomic packets.

## 🚀 Technical Stack

- **Frontend:** Next.js 16 (App Router), React 19, Tailwind CSS 4
- **Visuals:** Canvas (DNA Background), Lucide Icons, Recharts (HUD Simulation)
- **AI/LLM:** Groq SDK (Llama-3 integration)
- **Deployment:** Vercel

## 📦 Getting Started

### 1. Cloning the Repository
```bash
git clone https://github.com/Shivakumar-09/PharmaPulse-AI.git
cd PharmaPulse-AI
```

### 2. Environment Setup
Create a `.env.local` file in the root directory:
```env
GROQ_API_KEY=your_api_key_here
```

### 3. Installation
```bash
npm install
```

### 4. Running Locally
```bash
npm run dev
```

## 🛠️ Deployment

This project is optimized for **Vercel**. Deploy instantly by linking your GitHub repository:

1. Push code to GitHub.
2. Import project into Vercel.
3. Add `GROQ_API_KEY` to Vercel Environment Variables.
4. Deploy!

---

Developed for **BuildwithAI Hackathon**. 🧪