import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="forecast.ai API Mock Server")

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

# --- Mock Data ---

mock_models = [
    ModelVersion(version="8", algorithm="XGBoost", stage="Staging", rmse=10.12, mae=7.45, registeredAt="2026-06-16T10:00:00Z"),
    ModelVersion(version="5", algorithm="RandomForest", stage="Production", rmse=12.34, mae=8.90, registeredAt="2026-06-10T14:30:00Z"),
    ModelVersion(version="1", algorithm="LinearRegression", stage="Archived", rmse=15.67, mae=11.20, registeredAt="2026-05-20T08:00:00Z")
]

mock_promotion_history = [
    PromotionEvent(at="2026-06-10T14:35:00Z", change="v5 -> Production", trigger="manual", note="Promoted manually by operator after weekly training verified improvement."),
    PromotionEvent(at="2026-05-20T08:05:00Z", change="v1 -> Production", trigger="auto", note="Initial baseline model deployment.")
]

mock_training_runs = [
    TrainingRunDetail(
        runId="run_20260616_01", startedAt="2026-06-16T09:45:00Z", nEstimators=120, maxDepth=6,
        baselineRmse=15.67, improvedRmse=10.12, result="Promoted to Staging", status="finished",
        mae=7.45, dvcVersion="a3bf72c", artifactPath="s3://mlflow-artifacts/1/run_20260616_01/artifacts/model",
        registeredVersion="8"
    ),
    TrainingRunDetail(
        runId="run_20260610_01", startedAt="2026-06-10T14:00:00Z", nEstimators=100, maxDepth=5,
        baselineRmse=15.67, improvedRmse=12.34, result="Promoted to Production", status="finished",
        mae=8.90, dvcVersion="ef91b2c", artifactPath="s3://mlflow-artifacts/1/run_20260610_01/artifacts/model",
        registeredVersion="5"
    ),
    TrainingRunDetail(
        runId="run_20260603_01", startedAt="2026-06-03T14:00:00Z", nEstimators=80, maxDepth=4,
        baselineRmse=15.67, improvedRmse=16.10, result="Failed validation (RMSE > baseline)", status="finished",
        mae=12.11, dvcVersion="9c21b5a", artifactPath="s3://mlflow-artifacts/1/run_20260603_01/artifacts/model",
        registeredVersion=None
    ),
    TrainingRunDetail(
        runId="run_20260527_01", startedAt="2026-06-17T08:00:00Z", nEstimators=100, maxDepth=5,
        baselineRmse=15.67, improvedRmse=None, result="Ingestion failed", status="failed",
        mae=None, dvcVersion="None", artifactPath="None", registeredVersion=None
    )
]

# --- Endpoints ---

@app.get("/health")
def get_health():
    return {"status": "ok"}

@app.get("/overview/summary", response_model=OverviewSummary)
def get_overview_summary():
    # Dynamic hours for actual vs forecast
    now = datetime.datetime.now(datetime.UTC)
    forecast_points = []
    actual_points = []
    for i in range(24):
        time_str = (now - datetime.timedelta(hours=24-i)).strftime("%H:00")
        forecast_points.append(TimeseriesPoint(t=time_str, value=float(100 + (i * 2) % 30)))
        actual_points.append(TimeseriesPoint(t=time_str, value=float(102 + (i * 2) % 30 + (i % 3 - 1) * 2)))

    return OverviewSummary(
        productionModel=ProductionModel(
            name="aqi_forecaster_prod",
            version="5",
            stage="Production",
            algorithm="RandomForest"
        ),
        validationRmse=MetricValue(
            value=12.34,
            trend=TrendDelta(direction="down", value=1.25, label="vs prev model")
        ),
        latencyP95Ms=MetricValue(
            value=45.2,
            trend=TrendDelta(direction="down", value=2.1, label="vs last 24h")
        ),
        drift=DriftSummary(
            driftingCount=1,
            total=4,
            worstFeature="pm25_historical"
        ),
        forecastVsActual=ForecastVsActual(
            forecast=forecast_points,
            actual=actual_points,
            rmse=1.15
        ),
        dagHealth=[
            DagSummary(dag="hourly_ingestion", schedule="0 * * * *", lastRun="2026-06-17T19:00:00Z", avgDurationSeconds=12.5, successRate=0.99, status="success"),
            DagSummary(dag="weekly_retraining", schedule="0 0 * * 0", lastRun="2026-06-14T00:00:00Z", avgDurationSeconds=125.4, successRate=1.0, status="success"),
            DagSummary(dag="drift_check", schedule="*/30 * * * *", lastRun="2026-06-17T19:30:00Z", avgDurationSeconds=34.1, successRate=0.95, status="warning"),
            DagSummary(dag="dvc_push", schedule="0 1 * * *", lastRun="2026-06-17T01:00:00Z", avgDurationSeconds=45.0, successRate=0.88, status="failed")
        ],
        citySnapshot=[
            CitySnapshot(city="Delhi", aqi=185, category="veryUnhealthy", peak24h=210, pm25=120.5, updatedAt="2026-06-17T19:45:00Z"),
            CitySnapshot(city="Beijing", aqi=115, category="unhealthySensitive", peak24h=130, pm25=41.2, updatedAt="2026-06-17T19:40:00Z"),
            CitySnapshot(city="London", aqi=65, category="moderate", peak24h=72, pm25=18.5, updatedAt="2026-06-17T19:35:00Z"),
            CitySnapshot(city="New York", aqi=42, category="good", peak24h=48, pm25=10.1, updatedAt="2026-06-17T19:30:00Z")
        ]
    )

@app.get("/cities", response_model=List[CitySnapshot])
def get_cities():
    return [
        CitySnapshot(city="Delhi", aqi=185, category="veryUnhealthy", peak24h=210, pm25=120.5, updatedAt="2026-06-17T19:45:00Z"),
        CitySnapshot(city="Beijing", aqi=115, category="unhealthySensitive", peak24h=130, pm25=41.2, updatedAt="2026-06-17T19:40:00Z"),
        CitySnapshot(city="London", aqi=65, category="moderate", peak24h=72, pm25=18.5, updatedAt="2026-06-17T19:35:00Z"),
        CitySnapshot(city="New York", aqi=42, category="good", peak24h=48, pm25=10.1, updatedAt="2026-06-17T19:30:00Z")
    ]

@app.post("/predict", response_model=ForecastResult)
def post_predict(request: PredictRequest):
    city_normalized = request.city.strip().title()
    
    # Pre-canned mock responses depending on query
    if "del" in city_normalized.lower():
        current = CurrentConditions(aqi=185, category="veryUnhealthy", pm25=120.5, pm10=185.2, temperature=38.5, humidity=65.0, windSpeed=3.2)
    elif "bej" in city_normalized.lower() or "pei" in city_normalized.lower():
        current = CurrentConditions(aqi=115, category="unhealthySensitive", pm25=41.2, pm10=78.5, temperature=24.0, humidity=50.0, windSpeed=4.5)
    elif "lon" in city_normalized.lower():
        current = CurrentConditions(aqi=65, category="moderate", pm25=18.5, pm10=30.2, temperature=18.0, humidity=80.0, windSpeed=5.8)
    elif "new" in city_normalized.lower() or "york" in city_normalized.lower():
        current = CurrentConditions(aqi=42, category="good", pm25=10.1, pm10=15.0, temperature=21.0, humidity=55.0, windSpeed=6.2)
    else:
        # Default fallback for arbitrary city
        current = CurrentConditions(aqi=85, category="moderate", pm25=28.1, pm10=45.0, temperature=22.0, humidity=60.0, windSpeed=4.0)
    
    # 24 hours of hourly predictions
    hourly = []
    base_aqi = current.aqi
    categories = ["good", "moderate", "unhealthySensitive", "veryUnhealthy", "hazardous"]
    
    for i in range(24):
        hour_val = (i + 1) % 24
        hour_str = f"{hour_val:02d}:00"
        
        # Add some variation to AQI
        aqi_val = max(10, base_aqi + int((i % 6 - 3) * 8))
        
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
            
        hourly.append(HourlyForecastPoint(hour=hour_str, aqi=aqi_val, category=cat))
        
    return ForecastResult(
        city=city_normalized,
        current=current,
        hourly=hourly,
        modelVersion="5"
    )

@app.get("/models", response_model=ModelsResponse)
def get_models():
    return ModelsResponse(
        name="aqi_forecaster_prod",
        versions=mock_models,
        production=MetricValue(
            value=12.34,
            trend=TrendDelta(direction="down", value=3.33, label="vs baseline")
        ),
        lastPromotion=mock_promotion_history[0] if mock_promotion_history else None,
        candidateComparison=CandidateComparison(
            baselineRmse=15.67,
            productionRmse=12.34,
            candidateRmse=10.12,
            candidateVersion="8",
            beatsBaseline=True,
            beatsProduction=True
        ),
        promotionHistory=mock_promotion_history
    )

@app.post("/models/{name}/versions/{version}/promote", response_model=PromotionResult)
def post_promote_model(name: str, version: str):
    # Check if model exists
    target = None
    for m in mock_models:
        if m.version == version:
            target = m
            break
            
    if not target:
        raise HTTPException(status_code=404, detail=f"Model version {version} not found in MLflow registry")
        
    # Mark old Production model as Archived
    for m in mock_models:
        if m.stage == "Production":
            m.stage = "Archived"
            
    # Mark new model as Production
    target.stage = "Production"
    
    # Record in history
    now_str = datetime.datetime.now(datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    new_event = PromotionEvent(
        at=now_str,
        change=f"v{version} -> Production",
        trigger="manual",
        note=f"Promoted manually by operator via MLOps Console."
    )
    mock_promotion_history.insert(0, new_event)
    
    return PromotionResult(name=name, version=version, newStage="Production")

@app.get("/runs", response_model=List[TrainingRun])
def get_runs(status: Optional[str] = Query(None)):
    if status:
        return [r for r in mock_training_runs if r.status == status]
    return mock_training_runs

@app.get("/runs/{runId}", response_model=TrainingRunDetail)
def get_run_detail(runId: str):
    for r in mock_training_runs:
        if r.runId == runId:
            return r
    raise HTTPException(status_code=404, detail=f"Training run {runId} not found")

@app.get("/drift/latest", response_model=DriftReport)
def get_drift_latest():
    features = [
        FeatureDrift(feature="temperature", pValue=0.48, verdict="ok"),
        FeatureDrift(feature="humidity", pValue=0.22, verdict="ok"),
        FeatureDrift(feature="wind_speed", pValue=0.08, verdict="borderline"),
        FeatureDrift(feature="pm25_historical", pValue=0.015, verdict="drift")
    ]
    
    # Generating mock distribution overlap points
    training_dist = []
    live_dist = []
    for i in range(30):
        val = float(i)
        # Shift live distribution slightly to simulate drift
        training_val = float(10 * (0.8 ** abs(i - 12)))
        live_val = float(10 * (0.8 ** abs(i - 16)))
        training_dist.append(TimeseriesPoint(t=str(val), value=training_val))
        live_dist.append(TimeseriesPoint(t=str(val), value=live_val))
        
    worst_data = {
        "feature": "pm25_historical",
        "training": training_dist,
        "live": live_dist
    }
    
    return DriftReport(
        features=features,
        driftingCount=1,
        total=4,
        worst=worst_data
    )

@app.get("/pipelines/dags", response_model=List[DagSummary])
def get_pipelines_dags():
    return [
        DagSummary(dag="hourly_ingestion", schedule="0 * * * *", lastRun="2026-06-17T19:00:00Z", avgDurationSeconds=12.5, successRate=0.99, status="success"),
        DagSummary(dag="weekly_retraining", schedule="0 0 * * 0", lastRun="2026-06-14T00:00:00Z", avgDurationSeconds=125.4, successRate=1.0, status="success"),
        DagSummary(dag="drift_check", schedule="*/30 * * * *", lastRun="2026-06-17T19:30:00Z", avgDurationSeconds=34.1, successRate=0.95, status="warning"),
        DagSummary(dag="dvc_push", schedule="0 1 * * *", lastRun="2026-06-17T01:00:00Z", avgDurationSeconds=45.0, successRate=0.88, status="failed")
    ]

@app.get("/pipelines/runs", response_model=List[DagRun])
def get_pipelines_runs():
    return [
        DagRun(dag="hourly_ingestion", runId="run_ingest_123", startedAt="2026-06-17T19:00:00Z", durationSeconds=14.2, dvcVersion="ef91b2c", status="success"),
        DagRun(dag="drift_check", runId="run_drift_456", startedAt="2026-06-17T19:30:00Z", durationSeconds=33.1, dvcVersion="ef91b2c", status="success"),
        DagRun(dag="hourly_ingestion", runId="run_ingest_122", startedAt="2026-06-17T18:00:00Z", durationSeconds=11.5, dvcVersion="ef91b2c", status="success"),
        DagRun(dag="dvc_push", runId="run_push_789", startedAt="2026-06-17T01:00:00Z", durationSeconds=45.0, dvcVersion="9c21b5a", status="failed")
    ]

@app.get("/dvc/versions", response_model=List[DvcVersion])
def get_dvc_versions():
    return [
        DvcVersion(hash="ef91b2c", rows=24500, pushedAt="2026-06-17T00:05:00Z", remote="DagsHub"),
        DvcVersion(hash="9c21b5a", rows=24404, pushedAt="2026-06-16T00:05:00Z", remote="DagsHub"),
        DvcVersion(hash="a3bf72c", rows=24308, pushedAt="2026-06-15T00:05:00Z", remote="DagsHub")
    ]

@app.get("/monitoring/summary", response_model=MonitoringSummary)
def get_monitoring_summary():
    return MonitoringSummary(
        requestsPerMin=MetricValue(
            value=342.0,
            trend=TrendDelta(direction="up", value=14.5, label="vs last hour")
        ),
        latency={"p50": 12.4, "p95": 45.2, "p99": 98.1},
        errorRate=0.002,
        uptime30d=0.9995,
        incidents30d=0
    )

@app.get("/monitoring/timeseries", response_model=List[TimeseriesPoint])
def get_monitoring_timeseries(metric: str = Query(...)):
    now = datetime.datetime.now(datetime.UTC)
    points = []
    
    # Latency metric mock
    if metric == "latency_p95":
        base_val = 45.0
        multiplier = 5.0
    else:  # throughput
        base_val = 340.0
        multiplier = 25.0
        
    for i in range(24):
        time_str = (now - datetime.timedelta(hours=24-i)).strftime("%H:00")
        val = float(base_val + (i % 7 - 3) * multiplier * 0.3 + (i % 3) * multiplier * 0.1)
        points.append(TimeseriesPoint(t=time_str, value=val))
        
    return points

@app.get("/monitoring/alerts", response_model=List[Alert])
def get_monitoring_alerts():
    return [
        Alert(at="2026-06-17T19:30:00Z", source="drift_check", message="Significant data drift detected on feature pm25_historical (p-value: 0.015 < 0.05).", severity="warning"),
        Alert(at="2026-06-17T01:00:00Z", source="dvc_push", message="DVC push failed: Connection timeout to remote storage.", severity="critical")
    ]
