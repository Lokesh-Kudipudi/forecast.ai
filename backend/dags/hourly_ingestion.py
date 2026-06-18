from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=1),
}

with DAG(
    "hourly_ingestion",
    default_args=default_args,
    description="Fetch live weather & air pollution variables from OpenWeatherMap API and append to data/historical_aqi.csv",
    schedule_interval="0 * * * *",  # Run hourly
    start_date=datetime(2026, 6, 17),
    catchup=False,
    tags=["forecast_ai", "ingestion", "dvc"],
) as dag:

    # Task to fetch live weather details and append to dataset
    fetch_metrics = BashOperator(
        task_id="fetch_weather_metrics",
        bash_command="cd /opt/airflow && python scripts/ingest_weather.py",
    )

    # Task to commit the new historical CSV to DVC tracking
    # (Typically triggers 'dvc add' and 'dvc push' or pushes git pointer updates)
    dvc_update = BashOperator(
        task_id="dvc_version_dataset",
        bash_command="cd /opt/airflow && dvc add data/historical_aqi.csv",
    )

    fetch_metrics >> dvc_update
