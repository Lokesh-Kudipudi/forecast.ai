import logging
import requests
import datetime
import time
from core.config import settings

logger = logging.getLogger("forecast_ai.prometheus_service")

class PrometheusService:
    @staticmethod
    def get_metric_value(query: str, default: float = 0.0) -> float:
        """
        Queries Prometheus HTTP API for a single instant metric.
        Returns the default value if no data is available yet (e.g. during startup).
        Raises exception only if the Prometheus server is unreachable.
        """
        url = f"{settings.prometheus_url}/api/v1/query"
        response = requests.get(url, params={"query": query}, timeout=2.0)
        if response.status_code == 200:
            data = response.json()
            results = data.get("data", {}).get("result", [])
            if results:
                value_str = results[0].get("value", [None, None])[1]
                if value_str:
                    val = float(value_str)
                    # rate() can produce NaN when there's insufficient data
                    if val != val:  # NaN check
                        return default
                    return val
            logger.debug(f"No metric results yet for query: {query}, returning default {default}")
            return default
        else:
            raise RuntimeError(f"Prometheus returned status code {response.status_code}: {response.text}")

    @classmethod
    def get_monitoring_summary(cls):
        """
        Aggregates operational metrics for the monitoring section.
        Raises exception if Prometheus connection fails.
        """
        req_query = "sum(rate(http_requests_total[5m])) * 60"
        p50_query = "histogram_quantile(0.50, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) * 1000"
        p95_query = "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) * 1000"
        p99_query = "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) * 1000"
        
        requests_val = cls.get_metric_value(req_query, default=0.0)
        p50_val = cls.get_metric_value(p50_query, default=0.0)
        p95_val = cls.get_metric_value(p95_query, default=0.0)
        p99_val = cls.get_metric_value(p99_query, default=0.0)
        
        # Query error rate: errors/total
        error_rate_query = 'sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))'
        try:
            error_rate_val = cls.get_metric_value(error_rate_query)
        except Exception:
            error_rate_val = 0.0
            
        return {
            "requestsPerMin": {
                "value": round(requests_val, 1),
                "trend": {
                    "direction": "up",
                    "value": 0.0,
                    "label": "vs last hour"
                }
            },
            "latency": {
                "p50": round(p50_val, 1),
                "p95": round(p95_val, 1),
                "p99": round(p99_val, 1)
            },
            "errorRate": round(error_rate_val, 4),
            "uptime30d": 1.0,
            "incidents30d": 0
        }

    @classmethod
    def get_metric_history(cls, metric_name: str) -> list:
        """
        Queries Prometheus range API for a historical 24h timeseries.
        """
        if metric_name == "latency_p95":
            query = "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) * 1000"
        else: # throughput
            query = "sum(rate(http_requests_total[5m])) * 60"
            
        end_time = int(time.time())
        start_time = end_time - 24 * 3600
        step = "1h"
        
        url = f"{settings.prometheus_url}/api/v1/query_range"
        params = {
            "query": query,
            "start": start_time,
            "end": end_time,
            "step": step
        }
        
        response = requests.get(url, params=params, timeout=3.0)
        if response.status_code == 200:
            data = response.json()
            results = data.get("data", {}).get("result", [])
            points = []
            if results:
                values = results[0].get("values", [])
                for val in values:
                    ts = val[0]
                    val_str = val[1]
                    dt = datetime.datetime.fromtimestamp(ts, datetime.UTC)
                    time_str = dt.strftime("%H:00")
                    points.append({
                        "t": time_str,
                        "value": round(float(val_str), 2) if val_str else 0.0
                    })
            return points
        else:
            raise RuntimeError(f"Prometheus range query returned {response.status_code}: {response.text}")

    @classmethod
    def get_alerts(cls) -> list:
        """
        Queries Prometheus API for active alerts.
        """
        url = f"{settings.prometheus_url}/api/v1/alerts"
        response = requests.get(url, timeout=2.0)
        if response.status_code == 200:
            data = response.json()
            alerts_data = data.get("data", {}).get("alerts", [])
            alerts = []
            for alert in alerts_data:
                labels = alert.get("labels", {})
                annotations = alert.get("annotations", {})
                
                # Convert activeAt string or float to ISO format
                active_at_raw = alert.get("activeAt", "")
                
                alerts.append({
                    "at": active_at_raw,
                    "source": labels.get("alertname", "PrometheusAlert"),
                    "message": annotations.get("description", annotations.get("summary", "Alert triggered")),
                    "severity": labels.get("severity", "warning")
                })
            return alerts
        else:
            raise RuntimeError(f"Prometheus alerts query returned {response.status_code}: {response.text}")
