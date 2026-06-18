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
    "dvc_push",
    default_args=default_args,
    description="Push latest dataset version to DagsHub remote storage",
    schedule="0 1 * * *",  # Run daily at 1:00 AM
    start_date=datetime(2026, 6, 17),
    catchup=False,
    tags=["forecast_ai", "dvc"],
) as dag:

    push_to_dagshub = BashOperator(
        task_id="dvc_push_to_remote",
        bash_command=(
            "cd /opt/airflow/project && "
            "dvc remote modify myremote --local user \"$DAGSHUB_USERNAME\" && "
            "dvc remote modify myremote --local password \"$DAGSHUB_TOKEN\" && "
            "dvc push && "
            "git config user.name \"forecast_airflow\" && "
            "git config user.email \"airflow@forecast.ai\" && "
            "git add backend/data/historical_aqi.csv.dvc backend/data/.gitignore && "
            "git commit -m \"chore: auto-update dataset pointers [skip ci]\" && "
            "git push https://\"$DAGSHUB_USERNAME\":\"$DAGSHUB_TOKEN\"@dagshub.com/\"$DAGSHUB_USERNAME\"/forecast.ai.git main"
        ),
    )

    push_to_dagshub
