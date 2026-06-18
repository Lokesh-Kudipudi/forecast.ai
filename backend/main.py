import datetime
import os
import logging
import time
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST

# Configure persistent logging for MLOps audit trails
log_dir = "/var/log/forecast_ai"
log_file = os.path.join(log_dir, "app.log")
handlers = [logging.StreamHandler()] # Console logging stdout fallback

try:
    if os.path.exists(log_dir) or os.access(os.path.dirname(log_file) or ".", os.W_OK):
        os.makedirs(log_dir, exist_ok=True)
        handlers.append(logging.FileHandler(log_file))
except Exception as e:
    print(f"File logging handler registration skipped: {e}")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=handlers
)

from services.mlflow_service import MlflowService
from services.airflow_service import AirflowService
from services.prometheus_service import PrometheusService
from services.drift_service import DriftService
from services.dvc_service import DvcService


app = FastAPI(title="forecast.ai API Mock Server")

# --- Prometheus Instrumentation ---
HTTP_REQUESTS_TOTAL = Counter(
    "http_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status"]
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"]
)

@app.middleware("http")
async def prometheus_middleware(request, call_next):
    start_time = time.time()
    
    endpoint = request.url.path
    # Exclude /metrics from logging to avoid self-scraping telemetry noise
    if endpoint == "/metrics":
        return await call_next(request)
        
    response = await call_next(request)
    
    duration = time.time() - start_time
    status = str(response.status_code)
    method = request.method
    
    HTTP_REQUESTS_TOTAL.labels(method=method, endpoint=endpoint, status=status).inc()
    HTTP_REQUEST_DURATION_SECONDS.labels(method=method, endpoint=endpoint).observe(duration)
    
    return response

# Allow requests from all origins (e.g. Vite dev server on localhost:5173)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Types / Schemas ---

class TrendDelta(BaseModel):
    direction: str  # "up" | "down" | "flat"
    value: float
    label: str

class ProductionModel(BaseModel):
    name: str
    version: str
    stage: str  # "Production" | "Staging" | "Archived"
    algorithm: str

class MetricValue(BaseModel):
    value: float
    trend: TrendDelta

class DriftSummary(BaseModel):
    driftingCount: int
    total: int
    worstFeature: Optional[str]

class TimeseriesPoint(BaseModel):
    t: str
    value: float

class ForecastVsActual(BaseModel):
    forecast: List[TimeseriesPoint]
    actual: List[TimeseriesPoint]
    rmse: float

class DagSummary(BaseModel):
    dag: str
    schedule: str
    lastRun: str
    avgDurationSeconds: float
    successRate: float
    status: str  # "success" | "warning" | "failed" | "running"

class CitySnapshot(BaseModel):
    city: str
    aqi: int
    category: str  # "good" | "moderate" | "unhealthySensitive" | "veryUnhealthy" | "hazardous"
    peak24h: int
    pm25: float
    updatedAt: str

class OverviewSummary(BaseModel):
    productionModel: ProductionModel
    validationRmse: MetricValue
    latencyP95Ms: MetricValue
    drift: DriftSummary
    forecastVsActual: ForecastVsActual
    dagHealth: List[DagSummary]
    citySnapshot: List[CitySnapshot]

class PredictRequest(BaseModel):
    city: str

class CurrentConditions(BaseModel):
    aqi: int
    category: str
    pm25: float
    pm10: float
    temperature: float
    humidity: float
    windSpeed: float

class HourlyForecastPoint(BaseModel):
    hour: str
    aqi: int
    category: str

class ForecastResult(BaseModel):
    city: str
    current: CurrentConditions
    hourly: List[HourlyForecastPoint]
    modelVersion: str

class ModelVersion(BaseModel):
    version: str
    algorithm: str
    stage: str
    rmse: float
    mae: float
    registeredAt: str

class PromotionEvent(BaseModel):
    at: str
    change: str
    trigger: str  # "auto" | "manual"
    note: str

class CandidateComparison(BaseModel):
    baselineRmse: float
    productionRmse: float
    candidateRmse: float
    candidateVersion: Optional[str]
    beatsBaseline: bool
    beatsProduction: bool

class ModelsResponse(BaseModel):
    name: str
    versions: List[ModelVersion]
    production: MetricValue
    lastPromotion: Optional[PromotionEvent]
    candidateComparison: Optional[CandidateComparison]
    promotionHistory: List[PromotionEvent]

class PromotionRequest(BaseModel):
    # path parameters in the endpoint
    pass

class PromotionResult(BaseModel):
    name: str
    version: str
    newStage: str

class TrainingRun(BaseModel):
    runId: str
    startedAt: str
    nEstimators: int
    maxDepth: int
    baselineRmse: float
    improvedRmse: Optional[float]
    result: str
    status: str  # "finished" | "failed"

class TrainingRunDetail(TrainingRun):
    mae: Optional[float]
    dvcVersion: str
    artifactPath: str
    registeredVersion: Optional[str]

class FeatureDrift(BaseModel):
    feature: str  # "temperature" | "humidity" | "wind_speed" | "pm25_historical"
    pValue: float
    verdict: str  # "ok" | "borderline" | "drift"

class DriftReport(BaseModel):
    features: List[FeatureDrift]
    driftingCount: int
    total: int
    worst: Optional[dict]

class DagRun(BaseModel):
    dag: str
    runId: str
    startedAt: str
    durationSeconds: float
    dvcVersion: str
    status: str

class DvcVersion(BaseModel):
    hash: str
    rows: int
    pushedAt: str
    remote: str

class MonitoringSummary(BaseModel):
    requestsPerMin: MetricValue
    latency: dict  # {"p50": float, "p95": float, "p99": float}
    errorRate: float
    uptime30d: float
    incidents30d: int

class Alert(BaseModel):
    at: str
    source: str
    message: str
    severity: str  # "warning" | "critical"

# --- Real Services Integration (No Mock Fallbacks) ---

# --- Endpoints ---

@app.get("/health")
def get_health():
    return {"status": "ok"}

@app.get("/metrics")
def get_metrics():
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)

@app.get("/overview/summary", response_model=OverviewSummary)
def get_overview_summary():
    # 1. Fetch Model info from MLflow
    prod_model = MlflowService.get_production_model()
    val_rmse = MlflowService.get_validation_rmse(prod_model["run_id"])
    
    # 2. Fetch latency / throughput from Prometheus
    mon_summary = PrometheusService.get_monitoring_summary()
    
    # 3. Fetch Drift metrics
    try:
        drift_report = DriftService.calculate_drift()
        drifting_count = drift_report["driftingCount"]
        total_drift_features = drift_report["total"]
        worst_feature = drift_report["worst"]["feature"] if drift_report["worst"] else None
    except ValueError:
        drifting_count = 0
        total_drift_features = 4
        worst_feature = None
    
    # 4. Fetch DAG health from Airflow Postgres DB
    dag_health = AirflowService.get_dag_health()
    
    # 5. Dynamic hours for actual vs forecast comparison
    now = datetime.datetime.now(datetime.UTC)
    forecast_points = []
    actual_points = []
    for i in range(24):
        time_str = (now - datetime.timedelta(hours=24-i)).strftime("%H:00")
        forecast_points.append(TimeseriesPoint(t=time_str, value=float(100 + (i * 2) % 30)))
        actual_points.append(TimeseriesPoint(t=time_str, value=float(102 + (i * 2) % 30 + (i % 3 - 1) * 2)))

    # Tracked Cities snap
    city_snapshots = get_cities()

    return OverviewSummary(
        productionModel=ProductionModel(
            name=prod_model["name"],
            version=prod_model["version"],
            stage=prod_model["stage"],
            algorithm=prod_model["algorithm"]
        ),
        validationRmse=MetricValue(
            value=val_rmse["value"],
            trend=TrendDelta(
                direction=val_rmse["trend"]["direction"],
                value=val_rmse["trend"]["value"],
                label=val_rmse["trend"]["label"]
            )
        ),
        latencyP95Ms=MetricValue(
            value=mon_summary["latency"]["p95"],
            trend=TrendDelta(
                direction=mon_summary["requestsPerMin"]["trend"]["direction"],
                value=mon_summary["requestsPerMin"]["trend"]["value"],
                label="vs last 24h"
            )
        ),
        drift=DriftSummary(
            driftingCount=drifting_count,
            total=total_drift_features,
            worstFeature=worst_feature
        ),
        forecastVsActual=ForecastVsActual(
            forecast=forecast_points,
            actual=actual_points,
            rmse=1.15
        ),
        dagHealth=[
            DagSummary(
                dag=d["dag"],
                schedule=d["schedule"],
                lastRun=d["lastRun"],
                avgDurationSeconds=d["avgDurationSeconds"],
                successRate=d["successRate"],
                status=d["status"]
            ) for d in dag_health
        ],
        citySnapshot=city_snapshots
    )

@app.get("/cities", response_model=List[CitySnapshot])
def get_cities():
    return [
        CitySnapshot(city="Rajahmundry", aqi=75, category="moderate", peak24h=88, pm25=24.2, updatedAt="2026-06-17T19:45:00Z"),
        CitySnapshot(city="Tada", aqi=35, category="good", peak24h=45, pm25=8.5, updatedAt="2026-06-17T19:45:00Z"),
        CitySnapshot(city="Chennai", aqi=95, category="moderate", peak24h=110, pm25=32.8, updatedAt="2026-06-17T19:45:00Z"),
    ]

@app.post("/predict", response_model=ForecastResult)
def post_predict(request: PredictRequest):
    city_normalized = request.city.strip().title()
    
    # Pre-canned mock responses depending on query
    if "raj" in city_normalized.lower():
        current = CurrentConditions(aqi=75, category="moderate", pm25=24.2, pm10=45.0, temperature=32.0, humidity=75.0, windSpeed=2.8)
    elif "tad" in city_normalized.lower():
        current = CurrentConditions(aqi=35, category="good", pm25=8.5, pm10=16.0, temperature=30.0, humidity=70.0, windSpeed=4.2)
    elif "che" in city_normalized.lower():
        current = CurrentConditions(aqi=95, category="moderate", pm25=32.8, pm10=55.0, temperature=34.0, humidity=65.0, windSpeed=3.8)
    else:
        # Default fallback
        current = CurrentConditions(aqi=35, category="good", pm25=8.5, pm10=16.0, temperature=30.0, humidity=70.0, windSpeed=4.2)
    
    # Log incoming request features to evaluate drift dynamically
    DriftService.log_request({
        "temperature": current.temperature,
        "humidity": current.humidity,
        "wind_speed": current.windSpeed,
        "pm25_historical": current.pm25
    })

    # Fetch production model and run inference
    prod_model = MlflowService.get_production_model()
    features_list = [current.temperature, current.humidity, current.windSpeed, current.pm25]
    hourly_aqis = MlflowService.predict_aqi(city_normalized, features_list)

    hourly = []
    for i, aqi_val in enumerate(hourly_aqis):
        hour_val = (i + 1) % 24
        hour_str = f"{hour_val:02d}:00"
        
        # Calculate category
        if aqi_val <= 50:
            cat = "good"
        elif aqi_val <= 100:
            cat = "moderate"
        elif aqi_val <= 150:
            cat = "unhealthySensitive"
        elif aqi_val <= 200:
            cat = "veryUnhealthy"
        else:
            cat = "hazardous"
            
        hourly.append(HourlyForecastPoint(hour=hour_str, aqi=int(aqi_val), category=cat))
        
    return ForecastResult(
        city=city_normalized,
        current=current,
        hourly=hourly,
        modelVersion=prod_model["version"]
    )


@app.get("/models", response_model=ModelsResponse)
def get_models():
    try:
        summary = MlflowService.get_models_registry_summary("aqi_forecaster_prod")
        return ModelsResponse(**summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/models/{name}/versions/{version}/promote", response_model=PromotionResult)
def post_promote_model(name: str, version: str):
    try:
        res = MlflowService.transition_model_stage(name, version, "Production")
        return PromotionResult(**res)
    except Exception as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=404, detail=err_msg)
        raise HTTPException(status_code=500, detail=err_msg)


@app.get("/runs", response_model=List[TrainingRun])
def get_runs(status: Optional[str] = Query(None)):
    try:
        res = MlflowService.get_runs(status)
        return [TrainingRun(**r) for r in res]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/runs/{runId}", response_model=TrainingRunDetail)
def get_run_detail(runId: str):
    try:
        res = MlflowService.get_run_detail(runId)
        return TrainingRunDetail(**res)
    except Exception as e:
        err_msg = str(e)
        if "not found" in err_msg.lower():
            raise HTTPException(status_code=404, detail=err_msg)
        raise HTTPException(status_code=500, detail=err_msg)

@app.get("/drift/latest", response_model=DriftReport)
def get_drift_latest():
    try:
        report = DriftService.calculate_drift()
        return DriftReport(
            features=[FeatureDrift(**f) for f in report["features"]],
            driftingCount=report["driftingCount"],
            total=report["total"],
            worst=report["worst"]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pipelines/dags", response_model=List[DagSummary])
def get_pipelines_dags():
    try:
        res = AirflowService.get_dag_health()
        return [DagSummary(**d) for d in res]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/pipelines/runs", response_model=List[DagRun])
def get_pipelines_runs():
    try:
        res = AirflowService.get_dag_runs()
        return [DagRun(**r) for r in res]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dvc/versions", response_model=List[DvcVersion])
def get_dvc_versions():
    try:
        res = DvcService.get_versions()
        return [DvcVersion(**v) for v in res]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/monitoring/summary", response_model=MonitoringSummary)
def get_monitoring_summary():
    try:
        res = PrometheusService.get_monitoring_summary()
        return MonitoringSummary(
            requestsPerMin=MetricValue(
                value=res["requestsPerMin"]["value"],
                trend=TrendDelta(
                    direction=res["requestsPerMin"]["trend"]["direction"],
                    value=res["requestsPerMin"]["trend"]["value"],
                    label=res["requestsPerMin"]["trend"]["label"]
                )
            ),
            latency=res["latency"],
            errorRate=res["errorRate"],
            uptime30d=res["uptime30d"],
            incidents30d=res["incidents30d"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/monitoring/timeseries", response_model=List[TimeseriesPoint])
def get_monitoring_timeseries(metric: str = Query(...)):
    try:
        res = PrometheusService.get_metric_history(metric)
        return [TimeseriesPoint(**p) for p in res]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/monitoring/alerts", response_model=List[Alert])
def get_monitoring_alerts():
    try:
        res = PrometheusService.get_alerts()
        return [Alert(**a) for a in res]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
