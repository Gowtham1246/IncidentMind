"""
IncidentMind — AI Engine
Handles AI-powered incident triage using Gemini, with full mock fallback.
"""
import os
import json
import random
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEMO_MODE = os.getenv("DEMO_MODE", "false").lower() == "true"

_gemini_model = None

def _get_gemini():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    if not GEMINI_API_KEY or GEMINI_API_KEY == "your_gemini_api_key_here":
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        _gemini_model = genai.GenerativeModel("gemini-2.0-flash")
        return _gemini_model
    except Exception as e:
        print(f"[AI] Gemini init failed: {e}")
        return None

# ---------------------------------------------------------------------------
# Structured triage prompt
# ---------------------------------------------------------------------------

TRIAGE_SYSTEM_PROMPT = """You are IncidentMind, an expert AI Incident Commander for production systems.

Your job is to analyze production incidents and produce a structured triage plan.

You MUST respond with ONLY valid JSON — no markdown, no explanation, just JSON.

Given an incident, analyze it and return this exact JSON structure:
{
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "severity_reason": "brief explanation",
  "summary": "1-2 sentence incident summary",
  "affected_service": "service name",
  "likely_root_causes": [
    {"cause": "description", "confidence": 0.0-1.0, "rationale": "why"}
  ],
  "teams": [
    {"name": "Team Name", "confidence": 0.0-1.0, "reason": "why this team", "primary": true/false}
  ],
  "investigation_steps": [
    {"id": "step-1", "title": "Step title", "description": "What to do", "team": "Team Name", "priority": "IMMEDIATE|HIGH|MEDIUM|LOW", "estimated_minutes": 5}
  ],
  "recommended_action": "immediate recommended action",
  "escalation_required": true/false,
  "memory_influenced": false,
  "memory_influence_summary": ""
}

Rules:
- severity CRITICAL = full outage, revenue impact, data loss
- severity HIGH = significant degradation, partial outage
- severity MEDIUM = partial degradation, workaround available
- severity LOW = minor issue, no user impact
- Include 3-6 investigation steps, ordered by priority
- Teams: Backend, Database, Platform, Security, Data, Frontend, Network
- Be specific and actionable
"""

TRIAGE_WITH_MEMORY_PROMPT = """You are IncidentMind, an expert AI Incident Commander.

A SIMILAR HISTORICAL INCIDENT has been found in memory. Use this historical knowledge to improve your investigation plan.

HISTORICAL INCIDENT(S) FOUND:
{historical_context}

CURRENT INCIDENT:
{incident_details}

IMPORTANT: Because you have historical context, you MUST:
1. Set "memory_influenced": true
2. Prioritize investigation steps that worked in the historical incident
3. Note in "memory_influence_summary" exactly how the history changed your plan
4. If root causes match, give higher confidence to that root cause

Respond with ONLY valid JSON using this exact structure:
{
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "severity_reason": "brief explanation",
  "summary": "1-2 sentence incident summary",
  "affected_service": "service name",
  "likely_root_causes": [
    {"cause": "description", "confidence": 0.0-1.0, "rationale": "why"}
  ],
  "teams": [
    {"name": "Team Name", "confidence": 0.0-1.0, "reason": "why this team", "primary": true/false}
  ],
  "investigation_steps": [
    {"id": "step-1", "title": "Step title", "description": "What to do", "team": "Team Name", "priority": "IMMEDIATE|HIGH|MEDIUM|LOW", "estimated_minutes": 5}
  ],
  "recommended_action": "immediate recommended action",
  "escalation_required": true/false,
  "memory_influenced": true,
  "memory_influence_summary": "Explain specifically how historical memory changed this plan"
}
"""

# ---------------------------------------------------------------------------
# Mock responses for demo mode / API failure
# ---------------------------------------------------------------------------

def _mock_triage(incident: dict) -> dict:
    """Realistic mock triage response when AI is unavailable."""
    service = incident.get("service", "Unknown Service")
    error_msg = incident.get("error_message", "").lower()
    description = incident.get("description", "").lower()
    error_rate = incident.get("error_rate", "0%")
    
    # Smart severity detection
    rate_num = 0
    try:
        rate_num = float(str(error_rate).replace("%","").strip())
    except:
        pass
    
    if rate_num > 50 or "100%" in str(error_rate):
        severity = "CRITICAL"
    elif rate_num > 20 or "certificate" in error_msg:
        severity = "HIGH"
    elif rate_num > 10:
        severity = "MEDIUM"
    else:
        severity = "LOW"
    
    # Detect likely issue type
    is_db = any(w in description + error_msg for w in ["database", "db", "connection pool", "connection", "sql", "postgres", "mysql"])
    is_memory = any(w in description + error_msg for w in ["memory", "oom", "heap", "cache"])
    is_cert = any(w in description + error_msg for w in ["certificate", "tls", "ssl", "handshake"])
    is_queue = any(w in description + error_msg for w in ["queue", "kafka", "rabbitmq", "backlog", "consumer"])
    
    if is_db:
        teams = [
            {"name": "Backend", "confidence": 0.89, "reason": "Database connection handling in application code", "primary": True},
            {"name": "Database", "confidence": 0.84, "reason": "Database server metrics and configuration", "primary": False},
            {"name": "Platform", "confidence": 0.62, "reason": "Infrastructure and deployment environment", "primary": False},
        ]
        root_causes = [
            {"cause": "Database connection pool exhaustion", "confidence": 0.82, "rationale": "HTTP 500 errors with DB connection errors strongly suggests pool exhaustion"},
            {"cause": "Database server overload", "confidence": 0.61, "rationale": "High error rate may indicate DB server is overwhelmed"},
            {"cause": "Recent deployment changed connection settings", "confidence": 0.55, "rationale": "Recent deployment may have altered connection pool configuration"},
        ]
        steps = [
            {"id": "step-1", "title": "Check Database Connection Pool", "description": "Inspect current connection pool utilization. Check max_connections vs active connections.", "team": "Database", "priority": "IMMEDIATE", "estimated_minutes": 5},
            {"id": "step-2", "title": "Review Application DB Config", "description": "Check application connection pool settings (pool size, timeout, retry logic).", "team": "Backend", "priority": "IMMEDIATE", "estimated_minutes": 5},
            {"id": "step-3", "title": "Analyze Recent Deployment", "description": f"Review changes in {incident.get('recent_change', 'recent deployment')} for connection handling.", "team": "Backend", "priority": "HIGH", "estimated_minutes": 10},
            {"id": "step-4", "title": "Monitor Active DB Connections", "description": "Run real-time monitoring of active database connections and identify top consumers.", "team": "Database", "priority": "HIGH", "estimated_minutes": 5},
            {"id": "step-5", "title": "Check Infrastructure Metrics", "description": "Verify pod health, memory, CPU. Look for OOM kills or pod restarts.", "team": "Platform", "priority": "MEDIUM", "estimated_minutes": 10},
        ]
        action = "Immediately increase database connection pool size and restart affected services"
    elif is_cert:
        teams = [
            {"name": "Platform", "confidence": 0.95, "reason": "Certificate management is platform responsibility", "primary": True},
            {"name": "Security", "confidence": 0.87, "reason": "TLS/SSL certificate security and compliance", "primary": False},
        ]
        root_causes = [
            {"cause": "TLS/SSL certificate expired", "confidence": 0.95, "rationale": "Handshake failures strongly indicate certificate expiry"},
        ]
        steps = [
            {"id": "step-1", "title": "Check Certificate Expiry", "description": "Run: openssl s_client -connect service:443 | openssl x509 -noout -dates", "team": "Platform", "priority": "IMMEDIATE", "estimated_minutes": 2},
            {"id": "step-2", "title": "Renew Certificate", "description": "Renew the expired certificate immediately via cert-manager or CA.", "team": "Platform", "priority": "IMMEDIATE", "estimated_minutes": 15},
            {"id": "step-3", "title": "Audit Other Certificates", "description": "Check all service certificates for upcoming expiry.", "team": "Security", "priority": "HIGH", "estimated_minutes": 20},
        ]
        action = "Immediately renew the expired TLS certificate"
    elif is_queue:
        teams = [
            {"name": "Backend", "confidence": 0.85, "reason": "Consumer application code", "primary": True},
            {"name": "Platform", "confidence": 0.78, "reason": "Queue infrastructure and scaling", "primary": False},
            {"name": "Data", "confidence": 0.65, "reason": "Message schema and data pipeline", "primary": False},
        ]
        root_causes = [
            {"cause": "Queue consumer lag / backlog", "confidence": 0.88, "rationale": "Queue backlog symptoms point to consumer issues"},
        ]
        steps = [
            {"id": "step-1", "title": "Check Consumer Lag", "description": "Monitor queue consumer lag and offset commits.", "team": "Platform", "priority": "IMMEDIATE", "estimated_minutes": 5},
            {"id": "step-2", "title": "Scale Consumer Instances", "description": "Increase consumer instance count to process backlog faster.", "team": "Platform", "priority": "HIGH", "estimated_minutes": 10},
            {"id": "step-3", "title": "Review Consumer Errors", "description": "Check consumer logs for poison pills or processing errors.", "team": "Backend", "priority": "HIGH", "estimated_minutes": 10},
        ]
        action = "Scale up consumer instances to clear the queue backlog"
    else:
        teams = [
            {"name": "Backend", "confidence": 0.88, "reason": f"Service owner and primary responder for {service}", "primary": True},
            {"name": "Platform", "confidence": 0.72, "reason": "Infrastructure, deployment, and scaling issues", "primary": False},
            {"name": "Database", "confidence": 0.58, "reason": "Data layer issues may be contributing", "primary": False},
        ]
        root_causes = [
            {"cause": "Service degradation from recent deployment", "confidence": 0.71, "rationale": "High error rate correlating with recent deployment"},
            {"cause": "Resource exhaustion (memory/CPU/connections)", "confidence": 0.65, "rationale": "500 errors often indicate resource limits hit"},
        ]
        steps = [
            {"id": "step-1", "title": "Check Service Health", "description": "Review service logs, error rates, and pod status.", "team": "Backend", "priority": "IMMEDIATE", "estimated_minutes": 5},
            {"id": "step-2", "title": "Review Recent Deployment", "description": f"Analyze changes in {incident.get('recent_change', 'recent deployment')}.", "team": "Backend", "priority": "IMMEDIATE", "estimated_minutes": 10},
            {"id": "step-3", "title": "Check Infrastructure Metrics", "description": "CPU, memory, pod restarts, network errors.", "team": "Platform", "priority": "HIGH", "estimated_minutes": 10},
            {"id": "step-4", "title": "Database Health Check", "description": "Verify database connectivity, latency, and query performance.", "team": "Database", "priority": "HIGH", "estimated_minutes": 5},
        ]
        action = "Assess service health and consider rollback of recent deployment"

    return {
        "severity": severity,
        "severity_reason": f"Error rate of {error_rate} with {error_msg or 'production errors'} requires immediate attention",
        "summary": f"{service} is experiencing {error_rate} error rate. Investigation suggests {root_causes[0]['cause'].lower()}.",
        "affected_service": service,
        "likely_root_causes": root_causes,
        "teams": teams,
        "investigation_steps": steps,
        "recommended_action": action,
        "escalation_required": severity in ("CRITICAL", "HIGH"),
        "memory_influenced": False,
        "memory_influence_summary": "",
    }

def _mock_triage_with_memory(incident: dict, similar_incidents: list[dict]) -> dict:
    """Mock triage that incorporates Hindsight memory (for demo mode)."""
    base = _mock_triage(incident)
    
    if not similar_incidents:
        return base
    
    top = similar_incidents[0]
    base["memory_influenced"] = True
    
    # Formulate precise AI learning insight
    root_cause_phrase = top.get("root_cause", "").lower()
    if "connection pool" in root_cause_phrase or "database" in root_cause_phrase:
        learned_cause = "database connection pool exhaustion"
    else:
        learned_cause = top.get("root_cause", "previous root cause")

    base["memory_influence_summary"] = (
        f"Because this incident is similar to {top.get('incident_id')} ({top.get('service')}), "
        f"I recommend checking {learned_cause} first. "
        f"Investigation plan prioritized steps that previously verified and resolved the issue."
    )
    
    # Boost confidence of matching root cause
    known_root = top.get("root_cause", "").lower()
    for rc in base["likely_root_causes"]:
        if any(word in known_root for word in rc["cause"].lower().split()):
            rc["confidence"] = min(0.97, rc["confidence"] + 0.15)
            rc["rationale"] += f" (validated by historical incident {top.get('incident_id')} via Hindsight memory)"
    
    # Prepend successful historical steps
    historical_steps = top.get("successful_steps", [])
    if historical_steps:
        memory_step = {
            "id": "step-mem",
            "title": f"[Hindsight Memory] Apply {top.get('incident_id')} Verified Checks",
            "description": f"Historical incident {top.get('incident_id')} was resolved by: {top.get('resolution', '')}. Start by inspecting connection pool utilization.",
            "team": base["teams"][0]["name"] if base["teams"] else "Backend",
            "priority": "IMMEDIATE",
            "estimated_minutes": 3,
            "from_memory": True,
        }
        base["investigation_steps"].insert(0, memory_step)
    
    return base

# ---------------------------------------------------------------------------
# Main triage function
# ---------------------------------------------------------------------------

def triage_incident(incident: dict, similar_incidents: Optional[list] = None) -> dict:
    """Run AI triage on an incident, optionally using historical memory."""
    
    model = _get_gemini()
    has_memory = bool(similar_incidents)
    
    incident_text = json.dumps({
        "incident_id": incident.get("incident_id", "NEW"),
        "service": incident.get("service"),
        "error_message": incident.get("error_message"),
        "error_rate": incident.get("error_rate"),
        "description": incident.get("description"),
        "recent_change": incident.get("recent_change"),
    }, indent=2)
    
    if model is None or DEMO_MODE:
        # Use smart mock
        if has_memory:
            return _mock_triage_with_memory(incident, similar_incidents)
        else:
            return _mock_triage(incident)
    
    try:
        if has_memory:
            historical_context = ""
            for sim in similar_incidents[:2]:
                sim_score = sim.get("_similarity_score", 0.9)
                historical_context += f"""
---
Incident {sim.get('incident_id')} ({sim.get('service')}) — Similarity: {round(sim_score * 100)}%
Root cause: {sim.get('root_cause', 'Unknown')}
Resolution: {sim.get('resolution', 'Unknown')}
Successful steps: {'; '.join(sim.get('successful_steps', []))}
Teams: {', '.join(sim.get('teams_involved', []))}
---
"""
            prompt = TRIAGE_WITH_MEMORY_PROMPT.format(
                historical_context=historical_context,
                incident_details=incident_text
            )
        else:
            prompt = f"{TRIAGE_SYSTEM_PROMPT}\n\nINCIDENT:\n{incident_text}"
        
        response = model.generate_content(prompt)
        raw = response.text.strip()
        
        # Clean up markdown code blocks if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        raw = raw.strip()
        
        result = json.loads(raw)
        return result
        
    except Exception as e:
        print(f"[AI] Gemini triage failed: {e}, using mock")
        if has_memory:
            return _mock_triage_with_memory(incident, similar_incidents)
        else:
            return _mock_triage(incident)
