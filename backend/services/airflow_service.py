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
        Raises exception if the database is unreachable.
        """
        dags = ["hourly_ingestion", "weekly_retraining", "dvc_push"]
        schedules = {
            "hourly_ingestion": "0 * * * *",
            "weekly_retraining": "0 0 * * 0",
            "dvc_push": "0 1 * * *"
        }
        
        try:
            conn = psycopg2.connect(settings.airflow_db_url, connect_timeout=3)
            cursor = conn.cursor()
            
            # Query latest runs and statistics
            placeholders = ", ".join(["%s"] * len(dags))
            query = f"""
                SELECT 
                    dag_id,
                    MAX(execution_date) as last_run,
                    COUNT(CASE WHEN state = 'success' THEN 1 END)::float / 
                        NULLIF(COUNT(CASE WHEN state IN ('success', 'failed') THEN 1 END), 0) as success_rate,
                    AVG(EXTRACT(EPOCH FROM (end_date - start_date))) as avg_duration
                FROM dag_run
                WHERE dag_id IN ({placeholders})
                GROUP BY dag_id;
            """
            cursor.execute(query, tuple(dags))
            rows = cursor.fetchall()
            
            # Query last state for status indicator
            status_query = f"""
                SELECT DISTINCT ON (dag_id) dag_id, state, execution_date
                FROM dag_run
                WHERE dag_id IN ({placeholders})
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
            logger.error(f"Failed to query Airflow Postgres database for DAG health: {e}")
            raise

    @staticmethod
    def get_dag_runs(limit=10):
        """
        Directly queries the Airflow Postgres database to retrieve recent DAG runs history.
        Raises exception if DB connection fails.
        """
        dags = ["hourly_ingestion", "weekly_retraining", "dvc_push"]
        
        try:
            conn = psycopg2.connect(settings.airflow_db_url, connect_timeout=3)
            cursor = conn.cursor()
            
            # Query recent runs
            placeholders = ", ".join(["%s"] * len(dags))
            query = f"""
                SELECT 
                    dag_id,
                    run_id,
                    start_date,
                    end_date,
                    state
                FROM dag_run
                WHERE dag_id IN ({placeholders})
                ORDER BY start_date DESC
                LIMIT %s;
            """
            cursor.execute(query, tuple(dags) + (limit,))
            rows = cursor.fetchall()
            
            cursor.close()
            conn.close()
            
            runs = []
            for row in rows:
                dag_id, run_id, start_date, end_date, state = row
                
                # Calculate duration in seconds
                duration = 0.0
                if start_date and end_date:
                    duration = round((end_date - start_date).total_seconds(), 1)
                elif start_date:
                    from datetime import datetime, timezone
                    duration = round((datetime.now(timezone.utc) - start_date).total_seconds(), 1)
                
                # Get the active DVC version hash
                dvc_ver = "—"
                try:
                    from services.dvc_service import DvcService
                    versions = DvcService.get_versions()
                    if versions:
                        dvc_ver = versions[0]["hash"]
                except Exception:
                    pass
                
                runs.append({
                    "dag": dag_id,
                    "runId": run_id,
                    "startedAt": start_date.isoformat() if start_date else "—",
                    "durationSeconds": duration,
                    "dvcVersion": dvc_ver,
                    "status": STATE_MAP.get(state, "success")
                })
                
            return runs
        except Exception as e:
            logger.error(f"Failed to query Airflow Postgres database for runs: {e}")
            raise
