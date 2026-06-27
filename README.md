# 🌿 MindEase — Exam Wellness Companion

> A GenAI-powered mental wellness companion for Indian students under high-stakes exam pressure.
> Built for **PromptWars 2026** · Kolkata · Powered by **Google Gemini AI**

---

## 🎯 The Problem

Over **2.5 million students** appear for JEE, NEET, and UPSC every year in India. Most face severe stress, burnout, and self-doubt — but standard mood trackers only capture a number. They miss the *why*.

MindEase uses Gemini AI to analyse open-ended daily journal entries and surface **hidden stress triggers and emotional patterns** that a mood rating alone can never reveal.

---

## ✨ What It Does

| Feature | Description |
|---------|-------------|
| **AI Journal Analysis** | Student writes freely → Gemini surfaces hidden triggers, emotional patterns, personalised coping strategy |
| **Mood + Sleep Tracking** | Daily mood (1–5) and sleep hours tracked over time |
| **Trends Dashboard** | Mood trend chart, top recurring triggers (AI-detected), streak counter |
| **Safety Layer** | Deterministic crisis keyword detector (runs *before* the AI call, works offline) + real Indian helplines |
| **Exam-Aware** | Personalised for JEE, NEET, CUET, CAT, GATE, UPSC, Board exams |

---

## 🧠 GenAI Services Used

**Model:** Google Gemini 2.0 Flash (`gemini-2.0-flash`)

**Where Gemini is used:**
1. **Journal text analysis** — Gemini reads the student's free-text entry and returns structured JSON with:
   - `reflection` — empathetic understanding of their day
   - `detected_triggers[]` — hidden stressors the student may not have consciously named
   - `emotional_patterns[]` — broader recurring emotional themes
   - `coping_strategy` — one personalised, evidence-based technique
   - `mindfulness_exercise` — one short exercise they can do immediately
   - `encouragement` — warm, contextual motivation
   - `concern_level` — `low / medium / high` (used to trigger the safety panel)

**Anti-hallucination measures:**
- System instruction explicitly forbids diagnosing, prescribing medication, or inventing statistics
- Only well-established techniques (breathing, grounding, Pomodoro, sleep hygiene, cognitive reframing) are permitted
- `temperature: 0.4` for consistent, grounded responses
- `responseMimeType: 'application/json'` for structured output
- Defensive JSON parsing with graceful fallback on the client

---

## 🏗️ Architecture

```
Browser (Static HTML/CSS/JS)
        │
        │ POST /api/analyze
        ▼
Vercel Serverless Function (api/analyze.js)
        │
        │  GEMINI_API_KEY (env var, never in code)
        │
        ▼
Google Gemini API (gemini-2.0-flash)
```

**Security design:**
- The Gemini API key is stored **only** in Vercel environment variables — never in code or the Git repo
- All user/AI text rendered via `textContent` (never `innerHTML`) — XSS-safe
- All inputs validated and length-limited on both client and server
- `Content-Security-Policy` meta tag added
- Security response headers via `vercel.json`

---

## 🛡️ Safety Design

The crisis safety system has **two independent layers**:

1. **Deterministic keyword check** (synchronous, no API call, works offline) — scans for crisis signals in journal text before submission. If triggered, immediately shows a warm panel with real Indian helplines.
2. **AI-reported concern level** — if Gemini returns `concern_level: "high"`, the safety panel is also triggered.

**Real Indian helplines displayed:**
- 🇮🇳 **Tele-MANAS: 14416** (Govt of India, free, 24/7, available in 20 languages)
- 🇮🇳 **KIRAN: 1800-599-0019** (Ministry of Social Justice, free, 24/7)

The app **never performs risk assessment** and **never positions itself as a crisis service**.

---

## 🚀 Local Development

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/mindease.git
cd mindease

# 2. Add your Gemini API key (get it free at aistudio.google.com)
cp .env.example .env.local
# Edit .env.local and add: GEMINI_API_KEY=your_key_here

# 3. Install Vercel CLI and run locally
npm install -g vercel
vercel dev
# Open http://localhost:3000
```

---

## 🧪 Running Tests

```bash
node tests.js
```

Tests cover: crisis keyword detector, Gemini JSON parser, input validation, XSS escape function, mood aggregation, trigger aggregation.

---

## 📦 Deployment (Vercel)

1. Push this repo to GitHub (public)
2. Go to [vercel.com](https://vercel.com) → Import from GitHub
3. Add environment variable: `GEMINI_API_KEY` = your key
4. Deploy → get your live URL

---

## 📁 File Structure

```
mindease/
├── index.html              # Single-page app entry point
├── public/
│   ├── css/style.css       # All styles
│   └── js/
│       ├── app.js          # Journal form, API call, results rendering
│       ├── crisis.js       # Deterministic crisis detection (no API needed)
│       ├── storage.js      # localStorage abstraction
│       ├── chart.js        # Canvas mood trend chart (zero dependencies)
│       └── dashboard.js    # Trends dashboard rendering
├── api/
│   └── analyze.js          # Vercel serverless function (Gemini proxy)
├── tests.js                # Test suite (run with: node tests.js)
├── vercel.json             # Vercel routing + security headers
├── package.json
├── .gitignore              # Never commits .env files
├── .env.example            # Safe template — no real secrets
└── README.md
```

---

## 🔒 Privacy

All journal entries are stored **only in the user's browser** (`localStorage`). Nothing is stored on any server. The only data sent to the server is the journal text + mood + exam type for the AI analysis call.

---

*MindEase is a supportive wellness tool, not a medical device or substitute for professional help.*
*In distress? Call Tele-MANAS 14416 (free, 24/7).*
