import os
from pydantic import field_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Airflow Postgres DB URI (e.g. postgresql://postgres:postgres@localhost:5432/airflow)
    airflow_db_url: str = os.getenv(
        "AIRFLOW_DB_URL", 
        "postgresql://airflow:airflow@localhost:5432/airflow"
    )
    
    # MLflow tracking server URI
    mlflow_tracking_uri: str = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
    
    # Prometheus server API URL
    prometheus_url: str = os.getenv("PROMETHEUS_URL", "http://localhost:9090")
    
    # Path to baseline/historical dataset
    historical_data_path: str = os.getenv("HISTORICAL_DATA_PATH", "data/historical_aqi.csv")
    
    @field_validator("mlflow_tracking_uri", "prometheus_url", mode="after")
    @classmethod
    def strip_trailing_slash(cls, v: str) -> str:
        return v.rstrip("/")
    
    class Config:
        env_prefix = "FORECAST_AI_"
        case_sensitive = False

settings = Settings()
