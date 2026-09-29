// IncidentMind — API Client
import type {
  IncidentInput,
  TriageResponse,
  ResolutionInput,
  ResolutionResponse,
  HealthResponse,
} from "../types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchJSON<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API Error ${response.status}: ${text}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  health: (): Promise<HealthResponse> =>
    fetchJSON<HealthResponse>("/health"),

  triage: (incident: IncidentInput): Promise<TriageResponse> =>
    fetchJSON<TriageResponse>("/api/triage", {
      method: "POST",
      body: JSON.stringify(incident),
    }),

  resolve: (resolution: ResolutionInput): Promise<ResolutionResponse> =>
    fetchJSON<ResolutionResponse>("/api/resolve", {
      method: "POST",
      body: JSON.stringify(resolution),
    }),

  getDemoIncidents: (): Promise<{
    incident1: IncidentInput;
    incident2: IncidentInput;
  }> => fetchJSON("/api/demo/incidents"),

  seed: (): Promise<{ seeded: number; total: number }> =>
    fetchJSON("/api/seed", { method: "POST", body: JSON.stringify({ force: false }) }),

  getMemories: (): Promise<{ count: number; memories: Record<string, unknown>[] }> =>
    fetchJSON("/api/memory"),
};
