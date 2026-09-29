"""
IncidentMind — Seed Data
Historical incidents for demo mode. Run `python seed.py` to populate memory.
"""
SEED_INCIDENTS = [
    {
        "incident_id": "INC-1001",
        "service": "Payment API",
        "error_message": "HTTP 500 Internal Server Error",
        "error_rate": "31%",
        "severity": "HIGH",
        "description": "Payment API returning HTTP 500 errors. Database connection errors observed in logs.",
        "symptoms": ["HTTP 500 errors", "database connection errors", "increased latency", "connection pool exhaustion"],
        "recent_change": "Deployment v2.4.1",
        "teams_involved": ["Backend", "Database", "Platform"],
        "root_cause": "Database connection pool exhaustion after deployment increased concurrent requests beyond pool limits",
        "resolution": "Increased database connection pool size from 10 to 50. Restarted affected services. Added connection pool monitoring.",
        "successful_steps": [
            "Check database connection pool metrics",
            "Review recent deployment changelog v2.4.1",
            "Check application DB connection config",
            "Monitor active connections in real-time",
            "Increase pool size and restart service"
        ],
        "failed_steps": [
            "Restarting application without fixing pool size (did not resolve)",
            "Checking CDN/network layer (not relevant)"
        ],
        "lessons_learned": [
            "Always load-test connection pool settings before deployment",
            "Add connection pool exhaustion alert",
            "Review pool config as part of deployment checklist"
        ],
        "resolved": True,
        "duration_minutes": 47,
    },
    {
        "incident_id": "INC-1002",
        "service": "Order API",
        "error_message": "HTTP 503 Service Unavailable",
        "error_rate": "12%",
        "severity": "MEDIUM",
        "description": "Order API returning 503 errors after deployment of v3.0.0. Memory usage spiked.",
        "symptoms": ["HTTP 503 errors", "memory spike", "OOM kills", "pod restarts"],
        "recent_change": "Deployment v3.0.0 — added in-memory caching",
        "teams_involved": ["Backend", "Platform"],
        "root_cause": "In-memory cache introduced in v3.0.0 caused unbounded memory growth, triggering OOM kills",
        "resolution": "Added cache eviction policy (LRU). Set memory limits on pods. Rolled back cache TTL to 5 minutes.",
        "successful_steps": [
            "Check pod memory usage and OOM events",
            "Review v3.0.0 diff for memory changes",
            "Profile cache growth rate",
            "Implement LRU eviction policy"
        ],
        "failed_steps": [
            "Increasing pod memory limits alone (temporary fix only)",
        ],
        "lessons_learned": [
            "Always add eviction policies to in-memory caches",
            "Add memory usage alerting for all services",
            "Code review must flag unbounded caches"
        ],
        "resolved": True,
        "duration_minutes": 35,
    },
    {
        "incident_id": "INC-1003",
        "service": "Authentication API",
        "error_message": "TLS handshake failed / Certificate expired",
        "error_rate": "100%",
        "severity": "CRITICAL",
        "description": "All authentication requests failing with TLS certificate expiration error.",
        "symptoms": ["TLS errors", "certificate expired", "all auth requests failing", "login unavailable"],
        "recent_change": "No recent deployment — certificate expiry was not monitored",
        "teams_involved": ["Platform", "Security"],
        "root_cause": "SSL/TLS certificate expired. Certificate renewal was manual and was missed.",
        "resolution": "Renewed TLS certificate immediately. Implemented automated certificate renewal with cert-manager.",
        "successful_steps": [
            "Check certificate expiry dates",
            "Verify TLS handshake errors in logs",
            "Renew certificate immediately",
            "Deploy cert-manager for automated renewal"
        ],
        "failed_steps": [],
        "lessons_learned": [
            "Automate certificate renewal (use cert-manager or Let's Encrypt)",
            "Add certificate expiry monitoring with 30-day and 7-day alerts",
            "Add certificate expiry to deployment runbook"
        ],
        "resolved": True,
        "duration_minutes": 18,
    },
    {
        "incident_id": "INC-1004",
        "service": "Notification Service",
        "error_message": "Message queue backlog — consumer lag critical",
        "error_rate": "0% (delayed, not failed)",
        "severity": "HIGH",
        "description": "Notification service processing delayed by 4+ hours. Queue backlog grew to 2M messages.",
        "symptoms": ["queue backlog", "consumer lag", "delayed notifications", "message processing slowdown"],
        "recent_change": "Kafka consumer group rebalance after adding new consumer instances",
        "teams_involved": ["Backend", "Platform", "Data"],
        "root_cause": "Kafka consumer group rebalance triggered a stop-the-world pause. New consumers had misconfigured partition assignment.",
        "resolution": "Fixed consumer partition assignment. Increased consumer instances. Cleared stale offsets.",
        "successful_steps": [
            "Check Kafka consumer group lag",
            "Inspect consumer group assignment",
            "Review rebalance logs",
            "Fix partition assignment strategy",
            "Scale consumer instances"
        ],
        "failed_steps": [
            "Restarting consumers without fixing partition assignment",
        ],
        "lessons_learned": [
            "Test consumer group rebalance in staging before adding consumers",
            "Add consumer lag alerting with thresholds",
            "Document Kafka rebalance runbook"
        ],
        "resolved": True,
        "duration_minutes": 120,
    },
    {
        "incident_id": "INC-1005",
        "service": "User Service",
        "error_message": "Query timeout / Database latency spike",
        "error_rate": "8%",
        "severity": "MEDIUM",
        "description": "User service experiencing database query timeouts. P99 latency increased from 50ms to 8000ms.",
        "symptoms": ["database latency", "query timeout", "slow queries", "index missing", "full table scan"],
        "recent_change": "Database schema migration v1.8 — added new user_preferences table",
        "teams_involved": ["Backend", "Database"],
        "root_cause": "Schema migration added a new table with a query that lacks an index, causing full table scans at scale",
        "resolution": "Added missing index on user_preferences.user_id. Ran ANALYZE to update query planner statistics.",
        "successful_steps": [
            "Check slow query log",
            "Run EXPLAIN on slow queries",
            "Identify missing index",
            "Add index without downtime (CREATE INDEX CONCURRENTLY)",
            "Monitor query latency recovery"
        ],
        "failed_steps": [
            "Increasing query timeout limit (workaround, not fix)",
        ],
        "lessons_learned": [
            "Always add indexes for foreign keys and common query patterns",
            "Review migration PRs for missing indexes",
            "Add slow query alerting"
        ],
        "resolved": True,
        "duration_minutes": 55,
    },
    {
        "incident_id": "INC-1006",
        "service": "Payment API",
        "error_message": "HTTP 500 — database connection refused",
        "error_rate": "22%",
        "severity": "HIGH",
        "description": "Payment API returning HTTP 500 errors. Investigation found database connection pool exhausted during Black Friday traffic spike.",
        "symptoms": ["HTTP 500 errors", "connection refused", "database connection pool exhausted", "high traffic", "connection timeout"],
        "recent_change": "No code change — traffic spike from marketing campaign",
        "teams_involved": ["Backend", "Database", "Platform"],
        "root_cause": "Database connection pool exhausted due to unexpected traffic spike. Connection pool size was not scaled for campaign traffic.",
        "resolution": "Emergency connection pool increase. Added read replica to distribute load. Implemented connection pooling via PgBouncer.",
        "successful_steps": [
            "Check active database connections",
            "Verify connection pool configuration",
            "Check traffic metrics for spike",
            "Increase connection pool size",
            "Add PgBouncer connection pooler",
            "Enable read replica for read traffic"
        ],
        "failed_steps": [
            "Service restart alone did not resolve",
        ],
        "lessons_learned": [
            "Capacity plan for marketing campaigns",
            "Implement connection pooling proxy (PgBouncer)",
            "Add connection pool utilization alert at 80%"
        ],
        "resolved": True,
        "duration_minutes": 38,
    },
    {
        "incident_id": "INC-1007",
        "service": "Inventory Service",
        "error_message": "HTTP 500 — database pool exhausted",
        "error_rate": "18%",
        "severity": "HIGH",
        "description": "Inventory service returning HTTP 500 errors after deployment. Logs show database connection pool is exhausted.",
        "symptoms": ["HTTP 500 errors", "database connection pool exhausted", "connection refused", "timeout errors"],
        "recent_change": "Deployment v4.2.0 — added real-time inventory sync feature",
        "teams_involved": ["Backend", "Database"],
        "root_cause": "New real-time sync feature opens a persistent connection per sync job, exhausting the connection pool",
        "resolution": "Refactored sync feature to use connection pool properly. Added connection timeout and retry logic.",
        "successful_steps": [
            "Check database connection pool metrics",
            "Review v4.2.0 diff for connection management",
            "Identify connection leak in sync feature",
            "Refactor to use pooled connections",
            "Deploy fix and monitor"
        ],
        "failed_steps": [],
        "lessons_learned": [
            "Code review must check connection pool usage for new features",
            "Add connection pool monitoring to deployment gate",
        ],
        "resolved": True,
        "duration_minutes": 42,
    },
    {
        "incident_id": "INC-1008",
        "service": "Search Service",
        "error_message": "HTTP 504 Gateway Timeout",
        "error_rate": "15%",
        "severity": "MEDIUM",
        "description": "Search service returning gateway timeouts. Elasticsearch cluster showing high CPU and slow queries.",
        "symptoms": ["HTTP 504 timeout", "elasticsearch slow queries", "high CPU", "search degraded"],
        "recent_change": "Added new search filters in v2.1.0",
        "teams_involved": ["Backend", "Data", "Platform"],
        "root_cause": "New search filters introduced unbounded aggregation queries, causing Elasticsearch CPU spike and timeouts",
        "resolution": "Added query circuit breaker. Limited aggregation bucket size. Optimized filter queries.",
        "successful_steps": [
            "Check Elasticsearch slow query log",
            "Profile expensive aggregation queries",
            "Review v2.1.0 filter implementation",
            "Add circuit breaker on slow queries",
            "Optimize aggregations"
        ],
        "failed_steps": [],
        "lessons_learned": [
            "Always benchmark Elasticsearch queries before production",
            "Add query circuit breakers",
            "Limit aggregation bucket size by default"
        ],
        "resolved": True,
        "duration_minutes": 67,
    },
]
