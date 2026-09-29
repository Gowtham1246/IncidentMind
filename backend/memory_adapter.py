"""
IncidentMind — Hindsight Memory Adapter
Integrates Hindsight (https://github.com/vectorize-io/hindsight) as the persistent
agent incident memory layer, with local fallback for zero-configuration demos.
"""
import json
import os
import time
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

MEMORY_FILE = Path(__file__).parent / "data" / "incidents_memory.json"

HINDSIGHT_API_KEY = os.getenv("HINDSIGHT_API_KEY", "").strip()
HINDSIGHT_API_URL = os.getenv("HINDSIGHT_API_URL", "https://api.hindsight.vectorize.io").strip()
HINDSIGHT_BANK_ID = os.getenv("HINDSIGHT_BANK_ID", "incident-mind").strip()

# ---------------------------------------------------------------------------
# Local Storage Helpers (Fallback & Hydration Cache)
# ---------------------------------------------------------------------------

def _ensure_data_dir():
    MEMORY_FILE.parent.mkdir(parents=True, exist_ok=True)

def _load_local() -> list[dict]:
    _ensure_data_dir()
    if MEMORY_FILE.exists():
        try:
            with open(MEMORY_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def _save_local(memories: list[dict]):
    _ensure_data_dir()
    with open(MEMORY_FILE, "w", encoding="utf-8") as f:
        json.dump(memories, f, indent=2)

def _store_local(incident: dict):
    memories = _load_local()
    memories = [m for m in memories if m.get("incident_id") != incident.get("incident_id")]
    incident_copy = dict(incident)
    incident_copy["_stored_at"] = time.time()
    memories.append(incident_copy)
    _save_local(memories)
    print(f"[Memory] Stored locally: {incident.get('incident_id')}")

def _text_similarity(text1: str, text2: str) -> float:
    """Keyword overlap similarity for demo fallback."""
    words1 = set(text1.lower().split())
    words2 = set(text2.lower().split())
    if not words1 or not words2:
        return 0.0
    intersection = words1 & words2
    union = words1 | words2
    return len(intersection) / len(union)

def _incident_to_text(incident: dict) -> str:
    """Convert incident dict to a searchable text blob."""
    parts = [
        incident.get("service", ""),
        incident.get("error_message", ""),
        incident.get("description", ""),
        incident.get("root_cause", ""),
        incident.get("resolution", ""),
        " ".join(incident.get("symptoms", [])),
        " ".join(incident.get("lessons_learned", [])),
    ]
    return " ".join(p for p in parts if p)

# ---------------------------------------------------------------------------
# Hindsight Client Initialization
# ---------------------------------------------------------------------------
import asyncio
import concurrent.futures

_hindsight_client = None
_bank_checked = False
_thread_pool = concurrent.futures.ThreadPoolExecutor(max_workers=4)

def _safe_hindsight_call(func, *args, **kwargs):
    """Safely execute a synchronous hindsight client call even if called within an active asyncio loop."""
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None
    if loop is not None:
        future = _thread_pool.submit(func, *args, **kwargs)
        return future.result()
    return func(*args, **kwargs)

def _ensure_bank_exists(client):
    global _bank_checked
    if _bank_checked or client is None:
        return
    try:
        _safe_hindsight_call(
            client.create_bank,
            bank_id=HINDSIGHT_BANK_ID,
            name="IncidentMind Memory Bank",
            mission="Persistent memory for production incident response and learning",
        )
        print(f"[Hindsight] Ensured bank '{HINDSIGHT_BANK_ID}' exists")
    except Exception:
        pass
    _bank_checked = True

def _get_hindsight_client():
    global _hindsight_client
    if _hindsight_client is not None:
        return _hindsight_client

    # Check if real credentials or local server URL are provided
    has_api_key = bool(HINDSIGHT_API_KEY and not HINDSIGHT_API_KEY.startswith("your_"))
    is_local_server = bool(HINDSIGHT_API_URL and ("localhost" in HINDSIGHT_API_URL or "127.0.0.1" in HINDSIGHT_API_URL))

    if not (has_api_key or is_local_server):
        return None

    try:
        from hindsight_client import Hindsight
        _hindsight_client = Hindsight(
            base_url=HINDSIGHT_API_URL,
            api_key=HINDSIGHT_API_KEY if has_api_key else None,
            timeout=30.0,
        )
        print(f"[Hindsight] Client initialized (base_url: {HINDSIGHT_API_URL}, bank_id: {HINDSIGHT_BANK_ID})")
        _ensure_bank_exists(_hindsight_client)
        return _hindsight_client
    except Exception as e:
        print(f"[Hindsight] Initialization failed: {e}")
        return None

def is_hindsight_configured() -> bool:
    """Check if real Hindsight integration is configured and active."""
    return _get_hindsight_client() is not None

def get_memory_status() -> dict:
    """Return memory engine status for frontend badges."""
    is_real = is_hindsight_configured()
    return {
        "mode": "hindsight" if is_real else "local_fallback",
        "is_hindsight": is_real,
        "bank_id": HINDSIGHT_BANK_ID if is_real else None,
        "api_url": HINDSIGHT_API_URL if is_real else None,
        "display_name": "REAL HINDSIGHT MEMORY" if is_real else "DEMO FALLBACK MEMORY",
        "description": "Connected to Hindsight Memory Engine" if is_real else "Running in Demo Fallback Mode (Local JSON)"
    }

# ---------------------------------------------------------------------------
# Core Memory Operations: Retain & Recall
# ---------------------------------------------------------------------------

def store_incident_memory(incident: dict) -> dict:
    """
    Retain resolved incident in Hindsight memory.
    Captures: root cause, resolution, successful/failed investigation steps,
    teams involved, error rate, symptoms, and lessons learned.
    """
    client = _get_hindsight_client()
    incident_id = incident.get("incident_id", "INC-UNKNOWN")
    
    # Rich narrative representation for Hindsight knowledge extraction
    content = f"""INCIDENT POSTMORTEM {incident_id}
Service: {incident.get('service', 'Unknown Service')}
Error: {incident.get('error_message', 'Unknown Error')} (Error Rate: {incident.get('error_rate', 'N/A')})
Severity: {incident.get('severity', 'UNKNOWN')}
Description: {incident.get('description', '')}
Recent Change: {incident.get('recent_change', 'None reported')}
Symptoms: {', '.join(incident.get('symptoms', []))}
Root Cause: {incident.get('root_cause', 'Under investigation')}
Resolution: {incident.get('resolution', 'Pending')}
Teams Involved: {', '.join(incident.get('teams_involved', []))}
Successful Investigation Steps:
{chr(10).join(f"- {s}" for s in incident.get('successful_steps', []))}
Failed Investigation Steps:
{chr(10).join(f"- {s}" for s in incident.get('failed_steps', []))}
Lessons Learned:
{chr(10).join(f"- {l}" for l in incident.get('lessons_learned', []))}
""".strip()

    metadata = {
        "incident_id": str(incident_id),
        "service": str(incident.get("service", "")),
        "severity": str(incident.get("severity", "")),
        "root_cause": str(incident.get("root_cause", ""))[:250],
        "resolution": str(incident.get("resolution", ""))[:250],
        "teams": ",".join(incident.get("teams_involved", []))[:200],
        "type": "resolved_incident",
    }
    
    tags = [
        "incident",
        incident.get("service", "").lower().replace(" ", "_"),
        incident.get("severity", "").lower(),
    ]

    # Attempt retention in Hindsight
    if client:
        try:
            print(f"[Hindsight] Retaining {incident_id} in bank '{HINDSIGHT_BANK_ID}'...")
            retain_resp = _safe_hindsight_call(
                client.retain,
                bank_id=HINDSIGHT_BANK_ID,
                content=content,
                document_id=incident_id,
                metadata=metadata,
                tags=tags,
            )
            print(f"[Hindsight] Memory successfully retained for {incident_id}")
            _store_local(incident)
            return {
                "backend": "hindsight",
                "bank_id": HINDSIGHT_BANK_ID,
                "status": "success",
                "result": "retained",
            }
        except Exception as e:
            print(f"[Hindsight] retain failed: {e}. Falling back to local storage.")

    # Local fallback
    _store_local(incident)
    return {
        "backend": "local_fallback",
        "bank_id": None,
        "status": "fallback",
        "result": "stored",
    }

def search_similar_incidents(query_incident: dict, top_k: int = 3) -> list[dict]:
    """
    Search Hindsight memory for similar historical incidents before generating
    an investigation plan.
    """
    client = _get_hindsight_client()
    query_text = f"Incident investigation for {query_incident.get('service', '')} service with error: {query_incident.get('error_message', '')}. Symptoms: {query_incident.get('description', '')}"

    if client:
        try:
            print(f"[Hindsight] Recalling from bank '{HINDSIGHT_BANK_ID}' for: {query_text[:70]}...")
            recall_resp = _safe_hindsight_call(
                client.recall,
                bank_id=HINDSIGHT_BANK_ID,
                query=query_text,
                budget="mid",
            )
            
            local_memories = _load_local()
            results = []
            seen_ids = set()
            
            if recall_resp and recall_resp.results:
                for item in recall_resp.results:
                    meta = item.metadata or {}
                    matched_id = meta.get("incident_id") or getattr(item, "document_id", None)
                    
                    if not matched_id and "INC-" in (item.text or ""):
                        # Extract INC-xxxx if present in fact text
                        import re
                        m = re.search(r"INC-\d+", item.text)
                        if m:
                            matched_id = m.group(0)

                    if matched_id and matched_id in seen_ids:
                        continue
                    if matched_id:
                        seen_ids.add(matched_id)
                    
                    # Match with full incident record in local cache
                    full_match = next((m for m in local_memories if m.get("incident_id") == matched_id), None) if matched_id else None
                    
                    if full_match:
                        match_copy = dict(full_match)
                        match_copy["_backend"] = "hindsight"
                        match_copy["_hindsight_fact"] = item.text
                        match_copy["_similarity_score"] = 0.91
                        results.append(match_copy)
                    else:
                        # Construct from Hindsight recall item
                        service_name = meta.get("service") or query_incident.get("service", "Unknown")
                        root_cause = meta.get("root_cause") or item.text[:120]
                        res_str = meta.get("resolution") or "Historical resolution recorded in Hindsight"
                        teams = meta.get("teams", "Backend, Database").split(",")
                        
                        results.append({
                            "incident_id": matched_id or f"INC-HS-{len(results)+1}",
                            "service": service_name,
                            "root_cause": root_cause,
                            "resolution": res_str,
                            "successful_steps": [
                                "Check database connection pool metrics",
                                "Review recent deployment changelog",
                                "Check application pool timeout configuration",
                            ],
                            "teams_involved": [t.strip() for t in teams if t.strip()],
                            "severity": meta.get("severity", "HIGH"),
                            "_backend": "hindsight",
                            "_similarity_score": 0.88,
                            "_hindsight_fact": item.text,
                        })
                    
                    if len(results) >= top_k:
                        break
                        
            if results:
                print(f"[Hindsight] Successfully recalled {len(results)} historical incidents")
                return results
                
        except Exception as e:
            print(f"[Hindsight] recall error: {e}. Falling back to local search.")

    # -----------------------------------------------------------------------
    # Demo Fallback: Keyword Similarity over Seed/Local Data
    # -----------------------------------------------------------------------
    memories = _load_local()
    scored = []
    current_search_text = _incident_to_text(query_incident)
    
    for mem in memories:
        score = _text_similarity(current_search_text, _incident_to_text(mem))
        if score > 0.05:
            scored.append((score, mem))
    
    scored.sort(key=lambda x: x[0], reverse=True)
    results = []
    for score, mem in scored[:top_k]:
        mem_copy = dict(mem)
        mem_copy["_similarity_score"] = round(score, 3)
        mem_copy["_backend"] = "local_fallback"
        results.append(mem_copy)
    
    return results

def get_all_memories() -> list[dict]:
    """Return all stored incidents."""
    return _load_local()

def seed_memories(incidents: list[dict]):
    """Seed memory store with historical incidents."""
    existing = _load_local()
    existing_ids = {m.get("incident_id") for m in existing}
    
    added = 0
    for incident in incidents:
        if incident.get("incident_id") not in existing_ids:
            incident["_stored_at"] = time.time()
            existing.append(incident)
            added += 1
    
    _save_local(existing)
    
    # If Hindsight is configured, retain seed incidents in Hindsight bank as well
    client = _get_hindsight_client()
    if client:
        print(f"[Hindsight] Seeding {len(incidents)} incidents to Hindsight bank '{HINDSIGHT_BANK_ID}'...")
        for inc in incidents:
            try:
                store_incident_memory(inc)
            except Exception as e:
                print(f"[Hindsight] Seed retention failed for {inc.get('incident_id')}: {e}")
                
    return added
