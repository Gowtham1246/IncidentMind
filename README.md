# 🧠 IncidentMind
## An AI Incident Commander that learns from every incident using Hindsight Memory

> **"Incident happens → AI finds the right teams → creates investigation pipeline → remembers a previous incident via Hindsight → uses that memory → resolves incident → learns → becomes faster next time."**

---

## ⚡ Quick Start (Under 3 Minutes)

### Step 1: Start the FastAPI Backend

Open PowerShell or Command Prompt:

```powershell
cd "c:\Users\Gowtham Mishra\OneDrive\Desktop\hackhyd\backend"
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

You should see:
```text
[Startup] Seeding historical incidents...
[Startup] Seeded 8 historical incidents into memory
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Step 2: Start the Next.js Frontend

Open a **second** terminal window:

```powershell
cd "c:\Users\Gowtham Mishra\OneDrive\Desktop\hackhyd\frontend"
npm run dev
```

You should see:
```text
✓ Ready in ~1.5s — http://localhost:3000
```

### Step 3: Open the Main Dashboard

Open your web browser and navigate to:
**http://localhost:3000**

*Note: The app works out of the box with realistic demo data even before you enter any external API keys!*

---

## 🎯 Hackathon Demo Script (60 Seconds for Judges)

This demonstration shows the **hero feature**: **Hindsight Memory-Based Learning**.

### Scene 1: First Incident (No Memory Exists Yet)
1. In the top bar or left sidebar, click **"📋 Load Demo Incident #1"** (Payment API, 31% HTTP 500 errors).
2. Click **"🚨 TRIAGE INCIDENT"**.
3. Watch the visual pipeline execute:
   `INCIDENT → AI TRIAGE → TEAM IDENTIFICATION → INVESTIGATION → MEMORY CORRELATION`
4. Notice the **🧠 Hindsight Memory** panel on the right says:
   `"No Relevant Memory Found. IncidentMind will learn from this incident."`
5. Click **"🧠 Learn From Incident"** (or **"Mark Resolved"**).
6. The Incident Resolution modal appears:
   - Root Cause: `Database connection pool exhaustion`
   - Resolution: `Increased database connection pool size from 10 to 50`
   - Investigation steps that worked are confirmed.
7. Click **"🧠 Learn From Incident"**:
   - The UI displays: **MEMORY CREATED**
   - ✓ Incident pattern stored
   - ✓ Root cause stored
   - ✓ Investigation path stored
   - ✓ Resolution stored
   - ✓ Lessons learned stored

### Scene 2: Second Incident (Hindsight Memory Recall — The Hero Feature)
1. Click **"🧠 Load Demo Incident #2"** (Order API, 27% HTTP 500 errors, database connection errors).
2. Click **"🚨 TRIAGE INCIDENT"**.
3. Before generating the investigation plan, the AI searches Hindsight memory.
4. The right column instantly highlights:
   **🧠 Hindsight Memory Found**
   - **Similar Incident:** `INC-1001 (Payment API)`
   - **Relevance:** `91% match`
   - **Previous Root Cause:** `Database connection pool exhaustion`
   - **Previous Resolution:** `Increased connection pool size from 10 to 50`
   - **Previous Successful Steps:** Verified investigation steps
5. **Notice the AI Learning callout:**
   > *"Because this incident is similar to INC-1001, I recommend checking database connection pool exhaustion first."*
6. In the center **Investigation Steps**, the top priority task is now:
   **🧠 [Hindsight Memory] Apply INC-1001 Verified Checks**
   - The AI moved directly to the verified fix instead of guessing!

---

## 🧠 Hindsight Memory Configuration

IncidentMind natively integrates with **Hindsight** (`hindsight-client`), the agent semantic memory system.

### Option 1: Managed Hindsight Cloud (Recommended)
1. Sign up for Hindsight at: [https://hindsight.vectorize.io](https://hindsight.vectorize.io) or [https://usehindsight.com](https://usehindsight.com)
2. Obtain your API key (typically starts with `hs_...`).
3. Open `backend/.env` and update:
   ```env
   HINDSIGHT_API_KEY=hs_your_api_key_here
   HINDSIGHT_API_URL=https://api.hindsight.vectorize.io
   HINDSIGHT_BANK_ID=incident-mind
   ```
4. Restart the backend: `python -m uvicorn main:app --port 8000 --reload`
5. The UI header will display: **🟢 REAL HINDSIGHT MEMORY**.

### Option 2: Self-Hosted Hindsight (Docker)
1. Run Hindsight locally in Docker:
   ```bash
   docker run -d -p 8888:8888 vectorize/hindsight
   ```
2. Update `backend/.env`:
   ```env
   HINDSIGHT_API_URL=http://localhost:8888
   HINDSIGHT_API_KEY=
   HINDSIGHT_BANK_ID=incident-mind
   ```
3. Restart the backend.

### Option 3: Zero-Config Demo Fallback Mode
- If `HINDSIGHT_API_KEY` is left blank, IncidentMind operates in **DEMO FALLBACK MEMORY** mode.
- It stores memories locally in `backend/data/incidents_memory.json` using semantic and keyword matching.
- The UI transparently indicates **🟡 DEMO FALLBACK MEMORY** so judges and users know exactly what backend is active.

---

## 🤖 Optional: Google Gemini AI Configuration

By default, IncidentMind uses a deterministic smart mock AI engine that reproduces production SRE behavior without needing external API credits.

To enable live Gemini inference:
1. Get a free Google Gemini API key at: [https://aistudio.google.com/](https://aistudio.google.com/)
2. Edit `backend/.env`:
   ```env
   GEMINI_API_KEY=AIzaSy...
   ```
3. Restart the backend.

---

## 🏛️ System Architecture

```text
               User Browser (Next.js Dashboard)
                           │
                 HTTP REST │ (port 3000)
                           ▼
               FastAPI Backend (port 8000)
             ┌─────────────┴─────────────┐
             ▼                           ▼
      AI Triage Engine          Hindsight Memory Layer
   (Gemini 2.0 Flash / Mock)   (vectorize-io / Hindsight)
             │                           │
             │                           ├── Retain (postmortems)
             │                           ├── Recall (historical context)
             │                           └── Reflect (reasoning synthesis)
             │                                   │
             └───────────────◄───────────────────┘
               (Memory feeds into Investigation Plan)
```

### Memory Lifecycle
1. **Retain**: When an incident is resolved, IncidentMind formats the postmortem (symptoms, root cause, resolution, successful runbook steps, lessons learned) and calls `client.retain()` into bank `incident-mind`.
2. **Recall**: When a new incident occurs, `client.recall()` queries the memory bank with the incident's symptoms and description.
3. **Plan Improvement**: The AI incorporates the recalled memory to prioritize proven remediation steps and flag high-probability root causes.

---

## 📁 Repository Structure

```text
hackhyd/
├── backend/
│   ├── main.py                 # FastAPI endpoints (triage, resolve, memory status)
│   ├── memory_adapter.py       # Official Hindsight client integration + local fallback
│   ├── ai_engine.py            # AI triage engine with memory contextualization
│   ├── seed_data.py            # 8 realistic production historical incidents
│   ├── requirements.txt        # Backend dependencies (fastapi, hindsight-client, etc.)
│   ├── .env                    # Active configuration file
│   └── data/
│       └── incidents_memory.json # Local fallback persistence
│
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Main IncidentMind SRE Dashboard
│   │   ├── types/index.ts      # TypeScript interfaces
│   │   └── lib/api.ts          # Backend API client
│   ├── package.json
│   └── tailwind.config.ts
│
└── README.md
```

---

## ⚙️ Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Default | Purpose |
|:---|:---|:---|
| `HINDSIGHT_API_KEY` | *(empty)* | API key for managed Hindsight Cloud. |
| `HINDSIGHT_API_URL` | `https://api.hindsight.vectorize.io` | Hindsight endpoint (`http://localhost:8888` for self-hosted). |
| `HINDSIGHT_BANK_ID` | `incident-mind` | Hindsight memory bank namespace. |
| `GEMINI_API_KEY` | *(empty)* | Google Gemini API key. Blank = Smart Mock. |
| `DEMO_MODE` | `false` | When true, forces deterministic demo responses. |
| `BACKEND_PORT` | `8000` | Port for backend server. |

### Frontend (`frontend/.env.local`)

| Variable | Default | Purpose |
|:---|:---|:---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API URL. |

---

## 🧪 End-to-End Verification Test

To verify the complete flow programmatically or manually:

1. **Check Backend Status**:
   ```bash
   curl http://localhost:8000/health
   ```
   Returns `{"status": "ok", "memory_mode": "local_fallback" | "hindsight", ...}`

2. **Trigger Triage**:
   ```bash
   curl -X POST http://localhost:8000/api/triage \
     -H "Content-Type: application/json" \
     -d '{"service":"Order API","error_message":"HTTP 500","error_rate":"27%","description":"Database connection errors"}'
   ```
   Returns triage result and memory matches for INC-1001 with 91% relevance.

3. **Resolve Incident**:
   ```bash
   curl -X POST http://localhost:8000/api/resolve \
     -H "Content-Type: application/json" \
     -d '{"incident_id":"INC-2002","service":"Order API","error_message":"HTTP 500","error_rate":"27%","description":"Database connection errors","root_cause":"Connection pool exhaustion","resolution":"Increased pool size to 50","successful_steps":["Check connection pool"]}'
   ```
   Returns `{"status": "resolved", "memory_stored": true}`.
