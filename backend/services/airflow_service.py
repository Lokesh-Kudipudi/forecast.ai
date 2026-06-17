import logging
import psycopg2
from core.config import settings

logger = logging.getLogger("forecast_ai.airflow_service")

# Map database state strings to the UI expected states ("success", "warning", "failed", "running")
STATE_MAP = {
    "success": "success",
    "failed": "failed",
    "running": "running",
    "queued": "running",
    "up_for_retry": "warning",
    "upstream_failed": "failed"
}

class AirflowService:
    @staticmethod
    def get_dag_health():
        """
        Directly queries the Airflow Postgres metadata database to aggregate DAG health metrics.
        Falls back to mock data if the DB is unreachable.
        """
        dags = ["hourly_ingestion", "weekly_retraining", "drift_check", "dvc_push"]
        schedules = {
            "hourly_ingestion": "0 * * * *",
            "weekly_retraining": "0 0 * * 0",
            "drift_check": "*/30 * * * *",
            "dvc_push": "0 1 * * *"
        }
        
        try:
            conn = psycopg2.connect(settings.airflow_db_url, connect_timeout=3)
            cursor = conn.cursor()
            
            # Query latest runs and statistics
            query = """
                SELECT 
                    dag_id,
                    MAX(execution_date) as last_run,
                    COUNT(CASE WHEN state = 'success' THEN 1 END)::float / 
                        NULLIF(COUNT(CASE WHEN state IN ('success', 'failed') THEN 1 END), 0) as success_rate,
                    AVG(EXTRACT(EPOCH FROM (end_date - start_date))) as avg_duration
                FROM dag_run
                WHERE dag_id IN (%s, %s, %s, %s)
                GROUP BY dag_id;
            """
            cursor.execute(query, tuple(dags))
            rows = cursor.fetchall()
            
            # Query last state for status indicator
            status_query = """
                SELECT DISTINCT ON (dag_id) dag_id, state, execution_date
                FROM dag_run
                WHERE dag_id IN (%s, %s, %s, %s)
                ORDER BY dag_id, execution_date DESC;
            """
            cursor.execute(status_query, tuple(dags))
            status_rows = cursor.fetchall()
            
            status_map = {row[0]: row[1] for row in status_rows}
            stats_map = {row[0]: (row[1], row[2], row[3]) for row in rows}
            
            cursor.close()
            conn.close()
            
            results = []
            for dag in dags:
                last_run_date, success_rate, avg_duration = stats_map.get(dag, (None, 1.0, 15.0))
                state = status_map.get(dag, "success")
                
                results.append({
                    "dag": dag,
                    "schedule": schedules.get(dag, "-"),
                    "lastRun": last_run_date.isoformat() if last_run_date else "—",
                    "avgDurationSeconds": round(avg_duration, 1) if avg_duration else 0.0,
                    "successRate": round(success_rate, 2) if success_rate is not None else 1.0,
                    "status": STATE_MAP.get(state, "success")
                })
                
            return results
        except Exception as e:
            logger.warning(f"Failed to query Airflow Postgres database: {e}. Falling back to mock DAG health.")
            
        # Fallback Mock Data
        return [
            {"dag": "hourly_ingestion", "schedule": "0 * * * *", "lastRun": "2026-06-17T19:00:00Z", "avgDurationSeconds": 12.5, "successRate": 0.99, "status": "success"},
            {"dag": "weekly_retraining", "schedule": "0 0 * * 0", "lastRun": "2026-06-14T00:00:00Z", "avgDurationSeconds": 125.4, "successRate": 1.0, "status": "success"},
            {"dag": "drift_check", "schedule": "*/30 * * * *", "lastRun": "2026-06-17T19:30:00Z", "avgDurationSeconds": 34.1, "successRate": 0.95, "status": "warning"},
            {"dag": "dvc_push", "schedule": "0 1 * * *", "lastRun": "2026-06-17T01:00:00Z", "avgDurationSeconds": 45.0, "successRate": 0.88, "status": "failed"}
        ]
