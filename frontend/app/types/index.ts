// IncidentMind — TypeScript Types

export interface IncidentInput {
  incident_id?: string;
  service: string;
  error_message: string;
  error_rate: string;
  description: string;
  recent_change: string;
}

export interface Team {
  name: string;
  confidence: number;
  reason: string;
  primary: boolean;
}

export interface InvestigationStep {
  id: string;
  title: string;
  description: string;
  team: string;
  priority: "IMMEDIATE" | "HIGH" | "MEDIUM" | "LOW";
  estimated_minutes: number;
  from_memory?: boolean;
  status?: "pending" | "in_progress" | "done" | "skipped";
}

export interface RootCause {
  cause: string;
  confidence: number;
  rationale: string;
}

export interface TriageResult {
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  severity_reason: string;
  summary: string;
  affected_service: string;
  likely_root_causes: RootCause[];
  teams: Team[];
  investigation_steps: InvestigationStep[];
  recommended_action: string;
  escalation_required: boolean;
  memory_influenced: boolean;
  memory_influence_summary: string;
}

export interface MemoryMatch {
  incident_id: string;
  service: string;
  similarity_pct: number;
  root_cause: string;
  resolution: string;
  successful_steps: string[];
  teams_involved: string[];
  severity?: string;
  duration_minutes?: number;
  backend?: "hindsight" | "local_fallback" | string;
  hindsight_fact?: string;
}

export interface TriageResponse {
  incident_id: string;
  triage: TriageResult;
  memory_matches: MemoryMatch[];
  memory_searched: boolean;
  similar_count: number;
  memory_backend?: string;
  memory_backend_name?: string;
  is_hindsight?: boolean;
}

export interface ResolutionInput {
  incident_id: string;
  service: string;
  error_message: string;
  error_rate: string;
  description: string;
  recent_change: string;
  severity: string;
  root_cause: string;
  resolution: string;
  successful_steps: string[];
  failed_steps: string[];
  teams_involved: string[];
  lessons_learned: string[];
}

export interface ResolutionResponse {
  status: string;
  incident_id: string;
  memory_stored: boolean;
  memory_backend: "hindsight" | "local_fallback" | string;
  memory_backend_name?: string;
  is_hindsight?: boolean;
  hindsight_bank?: string;
  learned: {
    incident_pattern: boolean;
    root_cause: boolean;
    investigation_path: boolean;
    resolution: boolean;
    teams: boolean;
  };
}

export interface HealthResponse {
  status: string;
  ai_mode: "gemini" | "mock";
  memory_mode: "hindsight" | "local_fallback" | "local" | string;
  memory_backend_name?: string;
  is_hindsight?: boolean;
  hindsight_bank?: string;
  hindsight_api_url?: string;
  demo_mode: boolean;
}

// App state
export type AppPhase =
  | "idle"
  | "triaging"
  | "investigating"
  | "resolving"
  | "resolved"
  | "learning";

export type PipelineStage =
  | "incident"
  | "triage"
  | "teams"
  | "investigation"
  | "memory"
  | "root_cause"
  | "resolution";
