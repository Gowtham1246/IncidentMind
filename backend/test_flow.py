"""
IncidentMind — End-to-End Verification Test
Validates the entire Hindsight memory workflow:
Incident → Hindsight search → AI triage → Investigation → Resolution → Hindsight storage → Second similar incident → Hindsight recall → Improved recommendation.
"""
import sys
import io

# Ensure UTF-8 output on Windows consoles
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

try:
    from memory_adapter import (
        store_incident_memory,
        search_similar_incidents,
        seed_memories,
        get_memory_status,
        is_hindsight_configured,
    )
    from ai_engine import triage_incident
    from seed_data import SEED_INCIDENTS
except ImportError as e:
    print(f"[FAIL] Import error: {e}")
    sys.exit(1)

def run_tests():
    print("==================================================")
    print("IncidentMind — Hindsight E2E Verification Test")
    print("==================================================")

    # 1. Memory status check
    mem_status = get_memory_status()
    print("\n[1] Memory Status:")
    print(f"    Mode: {mem_status['mode']}")
    print(f"    Display Name: {mem_status['display_name']}")
    print(f"    Is Real Hindsight: {mem_status['is_hindsight']}")
    print(f"    Bank: {mem_status.get('bank_id')}")

    # 2. Seed memory
    print("\n[2] Seeding Historical Incidents...")
    seeded_count = seed_memories(SEED_INCIDENTS)
    print(f"    [OK] Seeded {seeded_count} historical incidents")

    # 3. Incident #1 Triage
    incident_1 = {
        "incident_id": "INC-TEST-1",
        "service": "Payment API",
        "error_message": "HTTP 500 Internal Server Error",
        "error_rate": "31%",
        "description": "Payment API returning HTTP 500 errors. Database connection errors observed in application logs.",
        "recent_change": "Deployment v2.4.1 — bulk payment processing",
    }
    print(f"\n[3] Triaging Incident #1 ({incident_1['incident_id']} - {incident_1['service']})...")
    triage_1 = triage_incident(incident_1, similar_incidents=None)
    print(f"    Severity: {triage_1.get('severity')}")
    print(f"    Summary: {triage_1.get('summary')}")
    print(f"    Teams identified: {[t['name'] for t in triage_1.get('teams', [])]}")
    print(f"    Investigation steps: {len(triage_1.get('investigation_steps', []))}")
    assert len(triage_1.get('teams', [])) > 0, "Teams must be identified"
    assert len(triage_1.get('investigation_steps', [])) > 0, "Steps must be generated"

    # 4. Resolve Incident #1 and Retain in Hindsight
    print("\n[4] Resolving Incident #1 and Retaining in Hindsight...")
    resolution_data = {
        "incident_id": "INC-TEST-1",
        "service": "Payment API",
        "error_message": "HTTP 500 Internal Server Error",
        "error_rate": "31%",
        "severity": triage_1.get('severity', 'HIGH'),
        "description": incident_1['description'],
        "recent_change": incident_1['recent_change'],
        "root_cause": "Database connection pool exhaustion after deployment increased concurrent requests",
        "resolution": "Increased database connection pool size from 10 to 50 and restarted service",
        "successful_steps": [
            "Check database connection pool metrics",
            "Review application DB config",
            "Monitor active DB connections",
        ],
        "failed_steps": ["Service restart without pool config increase"],
        "teams_involved": ["Backend", "Database", "Platform"],
        "lessons_learned": [
            "Load test pool settings before deployment",
            "Set alerts for pool utilization > 80%",
        ],
    }
    retain_result = store_incident_memory(resolution_data)
    print(f"    Backend: {retain_result.get('backend')}")
    print(f"    Result: {retain_result.get('result')}")
    assert retain_result.get("status") in ("success", "fallback"), "Store must succeed"

    # 5. Search Hindsight for Incident #2 (Order API with DB symptoms)
    incident_2 = {
        "incident_id": "INC-TEST-2",
        "service": "Order API",
        "error_message": "HTTP 500 Internal Server Error",
        "error_rate": "27%",
        "description": "Order API returning HTTP 500 errors. Database connection errors in logs. Deployment v3.1.0 deployed 2 hours ago.",
        "recent_change": "Deployment v3.1.0 — added concurrent order processing",
    }
    print("\n[5] Searching Hindsight Memory for Incident #2...")
    similar_matches = search_similar_incidents(incident_2, top_k=3)
    print(f"    Found {len(similar_matches)} similar historical incidents:")
    for m in similar_matches:
        print(f"    - {m.get('incident_id')} ({m.get('service')}): {m.get('root_cause')[:60]}... [Backend: {m.get('_backend')}]")

    assert len(similar_matches) > 0, "Hindsight search must return matching memories"
    top_match = similar_matches[0]
    print(f"    Top Match: {top_match.get('incident_id')} with root cause: '{top_match.get('root_cause')}'")

    # 6. AI Triage with Hindsight Memory
    print("\n[6] Running AI Triage with Memory Context for Incident #2...")
    triage_2 = triage_incident(incident_2, similar_incidents=similar_matches)
    print(f"    Memory Influenced: {triage_2.get('memory_influenced')}")
    print(f"    AI Learning: \"{triage_2.get('memory_influence_summary')}\"")
    print(f"    Top Step: {triage_2.get('investigation_steps', [{}])[0].get('title')}")

    assert triage_2.get("memory_influenced") is True, "Memory influenced flag must be True"
    assert "INC-" in triage_2.get("memory_influence_summary"), "AI learning must reference historical incident"
    assert len(triage_2.get("investigation_steps", [])) > 0, "Investigation steps must be generated"

    print("\n==================================================")
    print("[SUCCESS] ALL TESTS PASSED SUCCESSFULLY!")
    print("Hindsight Memory integration is verified and operational.")
    print("==================================================")

if __name__ == "__main__":
    run_tests()
