from datetime import datetime, timedelta
from airflow import DAG
from airflow.operators.bash import BashOperator

default_args = {
    "owner": "airflow",
    "depends_on_past": False,
    "email_on_failure": False,
    "email_on_retry": False,
    "retries": 1,
    "retry_delay": timedelta(minutes=5),
}

with DAG(
    "weekly_retraining",
    default_args=default_args,
    description="Retrain ML models (Random Forest/XGBoost) on latest DVC dataset, compare with baseline, and promote to MLflow registry",
    schedule_interval="0 0 * * 0",  # Run weekly at Sunday midnight
    start_date=datetime(2026, 6, 17),
    catchup=False,
    tags=["forecast_ai", "training", "mlflow"],
) as dag:

    # Task to trigger the scikit-learn training and validation run script
    retrain_and_validate = BashOperator(
        task_id="retrain_and_validate_model",
        bash_command="cd /opt/airflow && python scripts/validate_model.py",
    )

    retrain_and_validate
