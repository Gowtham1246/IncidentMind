"use client";

import { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle,
  ChevronRight,
  Clock,
  Database,
  Shield,
  Terminal,
  Users,
  Zap,
  XCircle,
  RotateCcw,
  Play,
  BookOpen,
  Server,
  Activity,
  ArrowDown,
  Loader2,
  Wifi,
  WifiOff,
  Plus,
} from "lucide-react";
import { api } from "./lib/api";
import type {
  IncidentInput,
  TriageResponse,
  ResolutionInput,
  ResolutionResponse,
  AppPhase,
  PipelineStage,
  InvestigationStep,
  HealthResponse,
} from "./types";

// ─────────────────────────────────────────────
// Severity Config
// ─────────────────────────────────────────────
const SEVERITY_CONFIG = {
  CRITICAL: { color: "text-red-400", bg: "bg-red-900/30", border: "border-red-700", badge: "bg-red-800 text-red-200" },
  HIGH: { color: "text-orange-400", bg: "bg-orange-900/30", border: "border-orange-700", badge: "bg-orange-800 text-orange-200" },
  MEDIUM: { color: "text-yellow-400", bg: "bg-yellow-900/30", border: "border-yellow-700", badge: "bg-yellow-800 text-yellow-200" },
  LOW: { color: "text-green-400", bg: "bg-green-900/30", border: "border-green-700", badge: "bg-green-800 text-green-200" },
};

const PRIORITY_CONFIG = {
  IMMEDIATE: { color: "text-red-400", badge: "bg-red-900/40 border border-red-700 text-red-300" },
  HIGH: { color: "text-orange-400", badge: "bg-orange-900/40 border border-orange-700 text-orange-300" },
  MEDIUM: { color: "text-yellow-400", badge: "bg-yellow-900/40 border border-yellow-700 text-yellow-300" },
  LOW: { color: "text-blue-400", badge: "bg-blue-900/40 border border-blue-700 text-blue-300" },
};

const TEAM_COLORS: Record<string, string> = {
  Backend: "bg-blue-900/40 text-blue-300 border-blue-700",
  Database: "bg-purple-900/40 text-purple-300 border-purple-700",
  Platform: "bg-green-900/40 text-green-300 border-green-700",
  Security: "bg-red-900/40 text-red-300 border-red-700",
  Data: "bg-yellow-900/40 text-yellow-300 border-yellow-700",
  Frontend: "bg-pink-900/40 text-pink-300 border-pink-700",
  Network: "bg-cyan-900/40 text-cyan-300 border-cyan-700",
};

const getTeamColor = (team: string) =>
  TEAM_COLORS[team] || "bg-gray-700 text-gray-300 border-gray-600";

// ─────────────────────────────────────────────
// Pipeline stages
// ─────────────────────────────────────────────
const PIPELINE_STAGES: { id: PipelineStage; label: string; icon: React.ReactNode }[] = [
  { id: "incident", label: "INCIDENT", icon: <AlertTriangle className="w-4 h-4" /> },
  { id: "triage", label: "AI TRIAGE", icon: <Zap className="w-4 h-4" /> },
  { id: "teams", label: "TEAM ID", icon: <Users className="w-4 h-4" /> },
  { id: "investigation", label: "INVESTIGATE", icon: <Terminal className="w-4 h-4" /> },
  { id: "memory", label: "MEMORY", icon: <Brain className="w-4 h-4" /> },
  { id: "root_cause", label: "ROOT CAUSE", icon: <Database className="w-4 h-4" /> },
  { id: "resolution", label: "RESOLUTION", icon: <CheckCircle className="w-4 h-4" /> },
];

// ─────────────────────────────────────────────
// War Room Modal
// ─────────────────────────────────────────────
function WarRoomModal({
  open,
  onClose,
  teams,
  incidentId,
}: {
  open: boolean;
  onClose: () => void;
  teams: string[];
  incidentId: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl shadow-2xl animate-fade-in">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
            <h2 className="text-xl font-bold text-white">🚨 Incident War Room</h2>
            <span className="text-sm text-gray-400 font-mono">{incidentId}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Participants */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Participants</h3>
            <div className="flex flex-wrap gap-2">
              {["Incident Commander", ...teams].map((p) => (
                <div
                  key={p}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm ${
                    p === "Incident Commander"
                      ? "bg-indigo-900/40 border-indigo-700 text-indigo-300"
                      : getTeamColor(p)
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-green-400"></div>
                  <span>{p} Team</span>
                </div>
              ))}
            </div>
          </div>

          {/* Agenda */}
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">AI-Generated Agenda</h3>
            <div className="space-y-2">
              {[
                "Review incident symptoms and current impact",
                "Backend team: application log analysis",
                "Database team: connection pool and query metrics",
                "Platform team: infrastructure and deployment status",
                "Compare with historical incidents (Hindsight Memory)",
                "Confirm root cause hypothesis",
                "Apply remediation steps",
                "Capture post-mortem for Hindsight learning",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                  <span className="text-xs font-mono text-gray-500 mt-0.5 w-5 shrink-0">{i + 1}.</span>
                  <span className="text-sm text-gray-300">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors"
          >
            Close War Room
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Resolution Modal
// ─────────────────────────────────────────────
function ResolutionModal({
  open,
  onClose,
  onSave,
  incidentId,
  service,
  teams,
  suggestedSteps,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: Partial<ResolutionInput>) => void;
  incidentId: string;
  service: string;
  teams: string[];
  suggestedSteps: string[];
}) {
  const [rootCause, setRootCause] = useState("");
  const [resolution, setResolution] = useState("");
  const [lessons, setLessons] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-800 sticky top-0 bg-gray-900 z-10">
          <div>
            <h2 className="text-xl font-bold text-white">Incident Resolution</h2>
            <p className="text-sm text-gray-400 font-mono">{incidentId} — {service}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Root Cause *</label>
            <textarea
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value)}
              placeholder="What was the actual root cause of this incident?"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Resolution *</label>
            <textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              placeholder="How was this incident resolved?"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Successful Investigation Steps</label>
            <div className="space-y-1 bg-gray-800/50 rounded-lg p-3">
              {suggestedSteps.map((step, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-400">
                  <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Teams Involved</label>
            <div className="flex flex-wrap gap-2">
              {teams.map((t) => (
                <span key={t} className={`px-2 py-1 rounded text-xs border ${getTeamColor(t)}`}>
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Lessons Learned</label>
            <textarea
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
              placeholder="What should the team do differently next time? (one per line)"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        <div className="p-5 border-t border-gray-800 flex gap-3 justify-end sticky bottom-0 bg-gray-900">
          <button onClick={onClose} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors">
            Cancel
          </button>
          <button
            onClick={() => {
              onSave({
                root_cause: rootCause,
                resolution,
                successful_steps: suggestedSteps,
                teams_involved: teams,
                lessons_learned: lessons.split("\n").filter(Boolean),
              });
            }}
            disabled={!rootCause || !resolution}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-900/30"
          >
            <Brain className="w-4 h-4 text-indigo-200" />
            🧠 Learn From Incident
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Memory Saved State Component
// ─────────────────────────────────────────────
function MemorySavedState({ response, incidentId }: { response: ResolutionResponse; incidentId: string }) {
  const isRealHindsight = response.is_hindsight || response.memory_backend === "hindsight";

  return (
    <div className="bg-indigo-950/60 border border-indigo-700 rounded-xl p-6 animate-fade-in shadow-xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-indigo-900/80 rounded-xl flex items-center justify-center shrink-0">
          <Brain className="w-5 h-5 text-indigo-300 animate-pulse" />
        </div>
        <div>
          <h3 className="font-extrabold text-base text-indigo-100 tracking-wide">MEMORY CREATED</h3>
          <p className="text-xs text-indigo-300 font-mono">{incidentId} knowledge stored in Hindsight</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wider ${
              isRealHindsight
                ? "bg-emerald-950/80 border border-emerald-500 text-emerald-300"
                : "bg-amber-950/80 border border-amber-600 text-amber-300"
            }`}
          >
            {isRealHindsight ? "REAL HINDSIGHT MEMORY" : "DEMO FALLBACK MEMORY"}
          </span>
          <CheckCircle className="w-5 h-5 text-green-400" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        <div className="flex items-center gap-2 p-2 rounded-lg text-xs bg-green-950/30 border border-green-800/40 text-green-200">
          <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span>Incident pattern stored</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg text-xs bg-green-950/30 border border-green-800/40 text-green-200">
          <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span>Root cause stored</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg text-xs bg-green-950/30 border border-green-800/40 text-green-200">
          <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span>Investigation path stored</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg text-xs bg-green-950/30 border border-green-800/40 text-green-200">
          <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span>Resolution stored</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg text-xs bg-green-950/30 border border-green-800/40 text-green-200 sm:col-span-2">
          <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0" />
          <span>Lessons learned stored</span>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-gray-900/70 border border-indigo-800/60 text-xs text-indigo-300">
        <p className="flex items-center gap-1.5 font-medium">
          <span className="text-green-400">✓</span>
          {isRealHindsight
            ? `Retained in Hindsight bank "${response.hindsight_bank || 'incident-mind'}". The agent will now recall this resolution on similar incidents.`
            : "Retained in local demo memory store. Set HINDSIGHT_API_KEY in backend/.env for persistent cloud memory across sessions."}
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────
export default function Dashboard() {
  // Backend health
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [backendOnline, setBackendOnline] = useState(false);

  // Form state
  const [form, setForm] = useState<IncidentInput>({
    service: "",
    error_message: "",
    error_rate: "",
    description: "",
    recent_change: "",
  });

  // App state
  const [phase, setPhase] = useState<AppPhase>("idle");
  const [activeStage, setActiveStage] = useState<PipelineStage>("incident");
  const [triageResult, setTriageResult] = useState<TriageResponse | null>(null);
  const [resolutionResult, setResolutionResult] = useState<ResolutionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState("");

  // Modal state
  const [warRoomOpen, setWarRoomOpen] = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);

  // Check backend health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const h = await api.health();
        setHealth(h);
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadDemoIncident = useCallback(async (n: 1 | 2) => {
    try {
      const demos = await api.getDemoIncidents();
      const incident = n === 1 ? demos.incident1 : demos.incident2;
      setForm(incident);
      setTriageResult(null);
      setResolutionResult(null);
      setPhase("idle");
      setActiveStage("incident");
    } catch {
      // Fallback inline demos
      const demos = {
        1: {
          incident_id: "INC-2001",
          service: "Payment API",
          error_message: "HTTP 500 Internal Server Error",
          error_rate: "31%",
          description: "Payment API returning HTTP 500 errors. Database connection errors observed in application logs. Connection pool appears exhausted.",
          recent_change: "Deployment v2.4.1 — added bulk payment processing feature",
        },
        2: {
          incident_id: "INC-2002",
          service: "Order API",
          error_message: "HTTP 500 Internal Server Error",
          error_rate: "27%",
          description: "Order API returning HTTP 500 errors. Database connection errors in logs. Deployment v3.1.0 was deployed 2 hours ago.",
          recent_change: "Deployment v3.1.0 — added concurrent order processing",
        },
      };
      setForm(demos[n]);
      setTriageResult(null);
      setResolutionResult(null);
      setPhase("idle");
      setActiveStage("incident");
    }
  }, []);

  const handleTriage = async () => {
    if (!form.service || !form.error_message || !form.description) {
      setError("Please fill in Service, Error Message, and Description.");
      return;
    }

    setError(null);
    setPhase("triaging");
    setActiveStage("triage");
    setTriageResult(null);
    setResolutionResult(null);

    const steps = [
      { text: "Analyzing incident parameters...", stage: "triage" as PipelineStage, ms: 600 },
      { text: "Identifying responsible teams...", stage: "teams" as PipelineStage, ms: 800 },
      { text: "Building investigation pipeline...", stage: "investigation" as PipelineStage, ms: 600 },
      { text: "🧠 Searching Hindsight memory...", stage: "memory" as PipelineStage, ms: 900 },
    ];

    for (const step of steps) {
      setLoadingText(step.text);
      setActiveStage(step.stage);
      await new Promise((r) => setTimeout(r, step.ms));
    }

    try {
      const result = await api.triage(form);
      setTriageResult(result);
      setActiveStage(result.memory_matches.length > 0 ? "memory" : "root_cause");
      setPhase("investigating");
      setLoadingText("");
    } catch (err) {
      setError(
        backendOnline
          ? "Triage failed. Please try again."
          : "Backend is offline. Start the backend server and try again."
      );
      setPhase("idle");
      setActiveStage("incident");
      setLoadingText("");
    }
  };

  const handleSaveToMemory = async (data: Partial<ResolutionInput>) => {
    if (!triageResult) return;
    setResolutionOpen(false);
    setPhase("learning");

    const payload: ResolutionInput = {
      incident_id: triageResult.incident_id,
      service: form.service,
      error_message: form.error_message,
      error_rate: form.error_rate,
      description: form.description,
      recent_change: form.recent_change,
      severity: triageResult.triage.severity,
      root_cause: data.root_cause || "",
      resolution: data.resolution || "",
      successful_steps: data.successful_steps || [],
      failed_steps: data.failed_steps || [],
      teams_involved: data.teams_involved || triageResult.triage.teams.map((t) => t.name),
      lessons_learned: data.lessons_learned || [],
    };

    try {
      const result = await api.resolve(payload);
      setResolutionResult(result);
      setPhase("resolved");
      setActiveStage("resolution");
    } catch (err) {
      setError("Failed to save to memory. Check backend connection.");
      setPhase("investigating");
    }
  };

  const handleReset = () => {
    setForm({ service: "", error_message: "", error_rate: "", description: "", recent_change: "" });
    setTriageResult(null);
    setResolutionResult(null);
    setPhase("idle");
    setActiveStage("incident");
    setError(null);
  };

  const severity = triageResult?.triage?.severity;
  const sevConfig = severity ? SEVERITY_CONFIG[severity] : null;

  return (
    <div className="min-h-screen bg-gray-950">
      {/* ── TOP BAR ── */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">IncidentMind</h1>
              <p className="text-[10px] text-gray-400 leading-none mt-0.5">AI Incident Commander</p>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-4">
            {/* Demo buttons */}
            <div className="hidden md:flex items-center gap-2">
              <span className="text-xs text-gray-500">Demo:</span>
              <button
                onClick={() => loadDemoIncident(1)}
                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors"
              >
                📋 Incident #1
              </button>
              <button
                onClick={() => loadDemoIncident(2)}
                className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded border border-gray-700 transition-colors"
              >
                📋 Incident #2
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs">
              {/* Backend status */}
              <div className={`flex items-center gap-1.5 ${backendOnline ? "text-green-400" : "text-red-400"}`}>
                {backendOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span>{backendOnline ? "Backend Online" : "Backend Offline"}</span>
              </div>
              {health && (
                <>
                  <div className="w-px h-4 bg-gray-700" />
                  <div className="text-gray-400">
                    AI: <span className="text-blue-400">{health.ai_mode === "gemini" ? "Gemini" : "Smart Mock"}</span>
                  </div>
                  <div className="w-px h-4 bg-gray-700" />
                  <div>
                    {health.is_hindsight ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-500 text-emerald-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        REAL HINDSIGHT MEMORY
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 border border-amber-600 text-amber-300 flex items-center gap-1" title="Configure HINDSIGHT_API_KEY in backend/.env for persistent cloud memory">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        DEMO FALLBACK MEMORY
                      </span>
                    )}
                  </div>
                </>
              )}
              {/* AI Ready indicator */}
              <div className="flex items-center gap-1.5 text-emerald-400">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span>AI Ready</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-5 grid grid-cols-12 gap-4">
        {/* ── LEFT COLUMN: Incident Input ── */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* New Incident Form */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Incident
              </h2>
              {phase !== "idle" && (
                <button onClick={handleReset} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors">
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Incident ID</label>
                <input
                  value={form.incident_id || ""}
                  onChange={(e) => setForm({ ...form, incident_id: e.target.value })}
                  placeholder="INC-2001 (auto-assigned)"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Service *</label>
                <input
                  value={form.service}
                  onChange={(e) => setForm({ ...form, service: e.target.value })}
                  placeholder="Payment API"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Error Message *</label>
                <input
                  value={form.error_message}
                  onChange={(e) => setForm({ ...form, error_message: e.target.value })}
                  placeholder="HTTP 500 Internal Server Error"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Error Rate</label>
                <input
                  value={form.error_rate}
                  onChange={(e) => setForm({ ...form, error_rate: e.target.value })}
                  placeholder="31%"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Description *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe what is happening, symptoms, impact..."
                  rows={4}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1">Recent Change / Deployment</label>
                <input
                  value={form.recent_change}
                  onChange={(e) => setForm({ ...form, recent_change: e.target.value })}
                  placeholder="Deployment v2.4.1"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-2 text-xs text-red-300">
                  {error}
                </div>
              )}

              <button
                onClick={handleTriage}
                disabled={phase === "triaging" || phase === "learning"}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
              >
                {phase === "triaging" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    🚨 TRIAGE INCIDENT
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Demo Mode */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Play className="w-3.5 h-3.5" />
              Demo Mode
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => loadDemoIncident(1)}
                className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs text-left transition-colors border border-gray-700"
              >
                <div className="font-semibold text-gray-200">📋 Load Demo Incident #1</div>
                <div className="text-gray-500 mt-0.5">Payment API — 500 errors, no memory yet</div>
              </button>
              <button
                onClick={() => loadDemoIncident(2)}
                className="w-full px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs text-left transition-colors border border-indigo-900"
              >
                <div className="font-semibold text-indigo-300">🧠 Load Demo Incident #2</div>
                <div className="text-gray-500 mt-0.5">Order API — triggers memory recall</div>
              </button>
            </div>
            <p className="text-[10px] text-gray-600 mt-3">
              Run #1 first, resolve it, then run #2 to see Hindsight learning in action.
            </p>
          </div>
        </div>

        {/* ── CENTER COLUMN: Pipeline + Investigation ── */}
        <div className="col-span-12 lg:col-span-6 space-y-4">
          {/* Investigation Pipeline */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Investigation Pipeline
            </h2>

            {/* Pipeline visual */}
            <div className="flex flex-col items-center gap-0">
              {PIPELINE_STAGES.map((stage, idx) => {
                const isActive = stage.id === activeStage;
                const stageOrder = PIPELINE_STAGES.map((s) => s.id);
                const activeIdx = stageOrder.indexOf(activeStage);
                const isPast = stageOrder.indexOf(stage.id) < activeIdx;
                const isLast = idx === PIPELINE_STAGES.length - 1;

                return (
                  <div key={stage.id} className="flex flex-col items-center w-full">
                    <div
                      className={`flex items-center gap-3 w-full max-w-xs px-4 py-2.5 rounded-lg transition-all duration-300 ${
                        isActive
                          ? "bg-indigo-900/60 border border-indigo-600 shadow-lg shadow-indigo-900/20"
                          : isPast
                          ? "bg-green-900/20 border border-green-800/50"
                          : "bg-gray-800/30 border border-gray-700/30"
                      }`}
                    >
                      <div
                        className={`shrink-0 ${
                          isActive ? "text-indigo-400" : isPast ? "text-green-400" : "text-gray-600"
                        }`}
                      >
                        {isPast ? <CheckCircle className="w-4 h-4" /> : stage.icon}
                      </div>
                      <span
                        className={`text-xs font-semibold tracking-wider ${
                          isActive ? "text-indigo-300" : isPast ? "text-green-400" : "text-gray-600"
                        }`}
                      >
                        {stage.label}
                      </span>
                      {isActive && phase === "triaging" && (
                        <Loader2 className="w-3 h-3 text-indigo-400 animate-spin ml-auto" />
                      )}
                      {isPast && (
                        <span className="ml-auto text-[10px] text-green-500">DONE</span>
                      )}
                    </div>
                    {!isLast && (
                      <div className={`w-0.5 h-4 ${isPast ? "bg-green-700" : "bg-gray-700"}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Loading text */}
            {loadingText && (
              <div className="mt-4 flex items-center gap-2 text-xs text-indigo-400 animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                {loadingText}
              </div>
            )}
          </div>

          {/* AI Triage Results */}
          {triageResult && (
            <div className="space-y-4 animate-fade-in">
              {/* Severity + Summary */}
              {sevConfig && (
                <div className={`bg-gray-900 border rounded-xl p-4 ${sevConfig.border}`}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${sevConfig.badge}`}>
                        ⚡ {severity}
                      </span>
                      <span className="text-sm font-bold text-white">{triageResult.triage.affected_service}</span>
                    </div>
                    {triageResult.triage.escalation_required && (
                      <span className="px-2 py-0.5 bg-red-900/40 border border-red-700 text-red-300 rounded text-xs">
                        ESCALATION REQUIRED
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300">{triageResult.triage.summary}</p>
                  <p className="text-xs text-gray-500 mt-1">{triageResult.triage.severity_reason}</p>
                </div>
              )}

              {/* Teams */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  Team Identification
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {triageResult.triage.teams.map((team) => (
                    <div
                      key={team.name}
                      className={`p-3 rounded-lg border ${getTeamColor(team.name)}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-sm">{team.name}</span>
                        <span className="text-xs font-mono font-bold">
                          {Math.round(team.confidence * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-black/20 rounded-full h-1 mb-1">
                        <div
                          className="h-1 rounded-full bg-current opacity-70"
                          style={{ width: `${Math.round(team.confidence * 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] opacity-70 leading-snug">{team.reason}</p>
                      {team.primary && (
                        <span className="text-[10px] opacity-60 font-semibold">PRIMARY OWNER</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Investigation Steps */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5" />
                  Investigation Steps
                  {triageResult.triage.memory_influenced && (
                    <span className="ml-auto px-2 py-0.5 bg-indigo-900/40 border border-indigo-700 text-indigo-300 rounded text-[10px]">
                      🧠 Memory Influenced
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
                  {triageResult.triage.investigation_steps.map((step, i) => (
                    <div
                      key={step.id}
                      className={`p-3 rounded-lg border transition-all ${
                        step.from_memory
                          ? "bg-indigo-950/40 border-indigo-700"
                          : "bg-gray-800/50 border-gray-700"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-xs text-gray-600 font-mono mt-0.5 shrink-0">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-sm font-semibold ${step.from_memory ? "text-indigo-300" : "text-gray-200"}`}>
                              {step.from_memory ? "🧠 " : ""}{step.title}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${PRIORITY_CONFIG[step.priority]?.badge || ""}`}>
                              {step.priority}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getTeamColor(step.team)}`}>
                              {step.team}
                            </span>
                            <span className="text-[10px] text-gray-600 ml-auto">~{step.estimated_minutes}m</span>
                          </div>
                          <p className="text-xs text-gray-400 leading-snug">{step.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Root Cause Hypotheses */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5" />
                  Root Cause Hypotheses
                </h3>
                <div className="space-y-2">
                  {triageResult.triage.likely_root_causes.map((rc, i) => (
                    <div key={i} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-sm text-gray-200 font-medium">{rc.cause}</span>
                        <span className={`text-xs font-bold font-mono shrink-0 ${
                          rc.confidence > 0.8 ? "text-orange-400" : rc.confidence > 0.6 ? "text-yellow-400" : "text-gray-400"
                        }`}>
                          {Math.round(rc.confidence * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1 mb-1">
                        <div
                          className={`h-1 rounded-full ${rc.confidence > 0.8 ? "bg-orange-500" : rc.confidence > 0.6 ? "bg-yellow-500" : "bg-gray-500"}`}
                          style={{ width: `${Math.round(rc.confidence * 100)}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-500">{rc.rationale}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-blue-950/30 border border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-300">
                    <span className="font-semibold">Recommended Action: </span>
                    {triageResult.triage.recommended_action}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {phase !== "resolved" && phase !== "learning" && (
                <div className="flex gap-2.5 flex-wrap pt-1">
                  <button
                    onClick={() => setWarRoomOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-sm border border-gray-700 transition-colors font-medium"
                  >
                    <Users className="w-4 h-4 text-blue-400" />
                    Create War Room
                  </button>
                  <button
                    onClick={() => setResolutionOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-sm border border-gray-700 transition-colors font-medium"
                  >
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Mark Resolved
                  </button>
                  <button
                    onClick={() => setResolutionOpen(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-all shadow-lg shadow-indigo-900/30"
                  >
                    <Brain className="w-4 h-4 text-indigo-200" />
                    🧠 Learn From Incident
                  </button>
                </div>
              )}

              {/* Resolution saved */}
              {phase === "resolved" && resolutionResult && (
                <MemorySavedState response={resolutionResult} incidentId={triageResult.incident_id} />
              )}

              {phase === "learning" && (
                <div className="bg-indigo-950/30 border border-indigo-700 rounded-xl p-4 flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-indigo-300">Saving to Hindsight Memory...</p>
                    <p className="text-xs text-indigo-500">This incident will help future investigations</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {phase === "idle" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-gray-400 font-semibold mb-1">No Active Incident</h3>
              <p className="text-xs text-gray-600 max-w-xs">
                Fill in incident details on the left and click{" "}
                <span className="text-indigo-400">🚨 TRIAGE INCIDENT</span> to start AI-powered analysis.
              </p>
              <p className="text-xs text-gray-700 mt-3">
                Or use <span className="text-gray-500">Demo Mode</span> to load a preconfigured incident.
              </p>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Hindsight Memory ── */}
        <div className="col-span-12 lg:col-span-3 space-y-4">
          {/* Hindsight Memory Panel */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-indigo-400" />
                <h2 className="text-sm font-semibold text-indigo-300 uppercase tracking-wider">
                  🧠 Hindsight Memory
                </h2>
              </div>
              {health?.is_hindsight ? (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950/80 border border-emerald-500 text-emerald-300">
                  REAL HINDSIGHT
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950/80 border border-amber-600 text-amber-300">
                  DEMO FALLBACK
                </span>
              )}
            </div>

            {/* Explanation banner */}
            <div className="mb-3 p-2 rounded-lg bg-gray-800/40 border border-gray-700/50 text-[11px] text-gray-400">
              {health?.is_hindsight ? (
                <span className="text-emerald-400 font-medium">
                  ✓ Connected to Hindsight Memory Engine ({health.hindsight_bank || "incident-mind"})
                </span>
              ) : (
                <span className="text-amber-400 font-medium">
                  ⚠️ Demo Fallback Memory active. Add HINDSIGHT_API_KEY in backend/.env for persistent cloud memory.
                </span>
              )}
            </div>

            {/* No triage yet */}
            {!triageResult && phase !== "triaging" && (
              <div className="text-center py-6">
                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Brain className="w-6 h-6 text-gray-600" />
                </div>
                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                  Hindsight will search historical incidents when you triage a new incident.
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Memory search occurs automatically before AI investigation planning.
                </p>
              </div>
            )}

            {/* Searching */}
            {phase === "triaging" && (
              <div className="flex items-center gap-3 py-4 animate-pulse">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin shrink-0" />
                <div>
                  <p className="text-sm text-indigo-300 font-semibold">Searching Hindsight Memory...</p>
                  <p className="text-xs text-gray-500">Recalling similar historical incidents & runbooks</p>
                </div>
              </div>
            )}

            {/* Results */}
            {triageResult && (
              <div className="space-y-3 animate-fade-in">
                {triageResult.memory_matches.length === 0 ? (
                  <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-4 h-4 text-gray-500" />
                      <span className="text-sm font-semibold text-gray-300">No Relevant Memory Found</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">
                      No relevant historical incident found in memory.
                    </p>
                    <p className="text-xs text-indigo-400 mt-2 font-medium">
                      IncidentMind will learn from this incident when you resolve it.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="p-2.5 bg-emerald-950/40 border border-emerald-600/70 rounded-lg mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span>🧠 Hindsight Memory Found</span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono font-bold">
                        {triageResult.similar_count} incident{triageResult.similar_count !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {triageResult.memory_matches.map((match) => (
                      <div
                        key={match.incident_id}
                        className="bg-indigo-950/40 border border-indigo-700/80 rounded-xl p-3.5 space-y-2.5 shadow-md"
                      >
                        <div className="flex items-center justify-between border-b border-indigo-800/60 pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white font-mono">{match.incident_id}</span>
                            <span className="text-xs text-gray-400">({match.service})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-900/60 border border-emerald-600 text-emerald-300 font-mono">
                              {match.similarity_pct}% relevance
                            </span>
                          </div>
                        </div>

                        {/* Previous Root Cause */}
                        <div className="p-2.5 bg-orange-950/40 border border-orange-800/60 rounded-lg">
                          <p className="text-[10px] text-orange-400 font-bold uppercase tracking-wider mb-1">
                            Previous Root Cause:
                          </p>
                          <p className="text-xs text-orange-100 font-semibold leading-snug">
                            {match.root_cause}
                          </p>
                        </div>

                        {/* Previous Resolution */}
                        {match.resolution && (
                          <div className="p-2.5 bg-blue-950/30 border border-blue-800/50 rounded-lg">
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider mb-1">
                              Previous Resolution:
                            </p>
                            <p className="text-xs text-blue-100 leading-snug">
                              {match.resolution}
                            </p>
                          </div>
                        )}

                        {/* Successful Investigation Steps */}
                        {match.successful_steps.length > 0 && (
                          <div className="p-2.5 bg-green-950/30 border border-green-800/50 rounded-lg">
                            <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider mb-1.5">
                              Successful Investigation:
                            </p>
                            <ul className="space-y-1">
                              {match.successful_steps.slice(0, 4).map((step, i) => (
                                <li key={i} className="flex items-start gap-1.5 text-xs text-green-200">
                                  <span className="text-green-400 font-bold">✓</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Teams Involved */}
                        {match.teams_involved.length > 0 && (
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Teams Involved:</p>
                            <div className="flex flex-wrap gap-1">
                              {match.teams_involved.map((t) => (
                                <span key={t} className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${getTeamColor(t)}`}>
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* AI Learning note */}
                    {triageResult.triage.memory_influenced && triageResult.triage.memory_influence_summary && (
                      <div className="bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500 rounded-xl p-3.5 mt-2 shadow-lg animate-fade-in">
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <Brain className="w-4 h-4 text-indigo-300" />
                          <p className="text-[11px] text-indigo-300 font-bold uppercase tracking-wider">
                            🧠 AI LEARNING:
                          </p>
                        </div>
                        <p className="text-xs text-indigo-100 font-medium leading-relaxed italic">
                          "{triageResult.triage.memory_influence_summary}"
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Backend System Status */}
          {health && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Server className="w-3.5 h-3.5" />
                System Status
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">AI Engine</span>
                  <span className={health.ai_mode === "gemini" ? "text-blue-400 font-medium" : "text-yellow-400 font-medium"}>
                    {health.ai_mode === "gemini" ? "Gemini 2.0 Flash" : "Smart Mock"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Memory Layer</span>
                  <span className={health.is_hindsight ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                    {health.is_hindsight ? "REAL HINDSIGHT" : "DEMO FALLBACK"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Memory Engine</span>
                  <span className="text-indigo-300 font-mono">
                    Hindsight (vectorize-io)
                  </span>
                </div>
                {health.hindsight_bank && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Memory Bank</span>
                    <span className="text-gray-300 font-mono text-[11px]">
                      {health.hindsight_bank}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Demo Mode</span>
                  <span className={health.demo_mode ? "text-orange-400 font-medium" : "text-gray-500"}>
                    {health.demo_mode ? "Enabled" : "Disabled"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <WarRoomModal
        open={warRoomOpen}
        onClose={() => setWarRoomOpen(false)}
        teams={triageResult?.triage.teams.map((t) => t.name) || []}
        incidentId={triageResult?.incident_id || ""}
      />

      <ResolutionModal
        open={resolutionOpen}
        onClose={() => setResolutionOpen(false)}
        onSave={handleSaveToMemory}
        incidentId={triageResult?.incident_id || ""}
        service={form.service}
        teams={triageResult?.triage.teams.map((t) => t.name) || []}
        suggestedSteps={triageResult?.triage.investigation_steps.map((s) => s.title) || []}
      />
    </div>
  );
}
