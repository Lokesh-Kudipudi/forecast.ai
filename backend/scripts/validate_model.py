import os
import subprocess
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error
import mlflow
from mlflow.tracking import MlflowClient

# Path configuration
DATA_PATH = "data/historical_aqi.csv"
MLFLOW_URI = os.getenv("FORECAST_AI_MLFLOW_TRACKING_URI", "http://localhost:5000")

def pull_data_from_dvc():
    """
    Attempts to pull the latest dataset using DVC.
    """
    print("Pulling latest weather dataset from DVC...")
    try:
        subprocess.run(["dvc", "pull", DATA_PATH], check=True)
        print("DVC pull completed successfully.")
    except Exception as e:
        print(f"DVC pull warning: {e}. Attempting to use local file directly.")

def get_or_generate_data():
    """
    Ensures dataset exists, generating baseline synthetic data if not found.
    """
    if os.path.exists(DATA_PATH):
        df = pd.read_csv(DATA_PATH)
        if len(df) >= 10:
            print(f"Dataset loaded: {len(df)} records.")
            return df
            
    print("Dataset not found or empty. Generating baseline synthetic distribution...")
    os.makedirs(os.path.dirname(DATA_PATH), exist_ok=True)
    np.random.seed(42)
    n_samples = 1000
    
    temperature = np.random.normal(25.0, 5.0, n_samples)
    humidity = np.random.normal(60.0, 10.0, n_samples)
    wind_speed = np.random.exponential(3.0, n_samples)
    pm25_historical = np.random.normal(50.0, 15.0, n_samples)
    
    # Non-linear target AQI representation
    target_aqi = (
        15.0 
        + 1.5 * pm25_historical 
        + 0.5 * temperature**1.2 
        - 0.2 * humidity 
        - 1.0 * wind_speed
        + np.random.normal(0, 5.0, n_samples)
    )
    
    df = pd.DataFrame({
        "temperature": temperature,
        "humidity": humidity,
        "wind_speed": wind_speed,
        "pm25_historical": pm25_historical,
        "target_aqi": target_aqi
    })
    df.to_csv(DATA_PATH, index=False)
    print("Seeded data/historical_aqi.csv.")
    return df

def run_retraining_pipeline():
    # 1. Pull and load data
    pull_data_from_dvc()
    df = get_or_generate_data()
    
    X = df[["temperature", "humidity", "wind_speed", "pm25_historical"]]
    y = df["target_aqi"]
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # 2. Configure MLflow
    mlflow.set_tracking_uri(MLFLOW_URI)
    mlflow.set_experiment("aqi_forecaster")
    
    # 3. Train models
    # Baseline Model (Linear Regression)
    baseline_model = LinearRegression()
    baseline_model.fit(X_train, y_train)
    baseline_preds = baseline_model.predict(X_val)
    baseline_rmse = np.sqrt(mean_squared_error(y_val, baseline_preds))
    
    # Candidate Model (Random Forest)
    n_estimators = 120
    max_depth = 6
    improved_model = RandomForestRegressor(n_estimators=n_estimators, max_depth=max_depth, random_state=42)
    improved_model.fit(X_train, y_train)
    improved_preds = improved_model.predict(X_val)
    improved_rmse = np.sqrt(mean_squared_error(y_val, improved_preds))
    improved_mae = mean_absolute_error(y_val, improved_preds)
    
    # 4. Fetch current active Production model RMSE
    client = MlflowClient()
    prod_rmse = 15.67  # Default fallback if registry empty
    has_production_model = False
    try:
        latest_versions = client.get_latest_versions("aqi_forecaster_prod")
        prod_ver = next((v for v in latest_versions if v.current_stage == "Production"), None)
        if prod_ver:
            prod_run = client.get_run(prod_ver.run_id)
            prod_rmse = prod_run.data.metrics.get("improved_rmse", prod_run.data.metrics.get("rmse", 15.67))
            has_production_model = True
            print(f"Current active Production model version: v{prod_ver.version} (RMSE: {prod_rmse:.4f})")
    except Exception as e:
        print(f"No active Production version found in MLflow registry: {e}")
        
    # 5. Evaluate targets
    # Point A Target: >= 15% error reduction vs baseline Linear Regression
    improvement_vs_baseline = ((baseline_rmse - improved_rmse) / baseline_rmse) * 100
    meets_baseline_target = improvement_vs_baseline >= 15.0
    beats_production = improved_rmse < prod_rmse
    
    dvc_ver = "—"
    try:
        # Fetch current dataset hash via DVC
        res = subprocess.run(["dvc", "hash", DATA_PATH], capture_output=True, text=True, check=True)
        dvc_ver = res.stdout.strip()[:7]
    except Exception:
        pass

    # Log to MLflow run
    with mlflow.start_run() as run:
        run_id = run.info.run_id
        
        # Log parameters
        mlflow.log_param("algorithm", "RandomForest")
        mlflow.log_param("n_estimators", n_estimators)
        mlflow.log_param("max_depth", max_depth)
        
        # Log metrics
        mlflow.log_metric("baseline_rmse", baseline_rmse)
        mlflow.log_metric("improved_rmse", improved_rmse)
        mlflow.log_metric("mae", improved_mae)
        
        # Log tags
        mlflow.set_tag("dvc.version", dvc_ver)
        
        # Log model artifact
        mlflow.sklearn.log_model(improved_model, "model")
        
        # Promotion decision
        if (meets_baseline_target and beats_production) or not has_production_model:
            result_notes = f"Promoted automatically to Production (RMSE: {improved_rmse:.2f} vs Prod: {prod_rmse:.2f}, Baseline improvement: {improvement_vs_baseline:.2f}%)."
            print(result_notes)
            
            # Register version via direct MlflowClient calls to bypass fluent API validation errors
            model_uri = f"runs:/{run_id}/model"
            try:
                client.create_registered_model("aqi_forecaster_prod")
            except Exception:
                pass
            mv = client.create_model_version(name="aqi_forecaster_prod", source=model_uri, run_id=run_id)
            
            # Promote to Production (archives previous)
            client.transition_model_version_stage(
                name="aqi_forecaster_prod",
                version=mv.version,
                stage="Production",
                archive_existing_versions=True
            )
            
            # Tag run details
            client.set_tag(run_id, "result", result_notes)
            client.set_tag(run_id, "registered_version", mv.version)
        else:
            result_notes = f"Registered to Staging. RMSE: {improved_rmse:.2f} (vs baseline: {baseline_rmse:.2f})."
            print(result_notes)
            
            # Register version via direct MlflowClient calls to bypass fluent API validation errors
            model_uri = f"runs:/{run_id}/model"
            try:
                client.create_registered_model("aqi_forecaster_prod")
            except Exception:
                pass
            mv = client.create_model_version(name="aqi_forecaster_prod", source=model_uri, run_id=run_id)
            
            # Transition to Staging
            client.transition_model_version_stage(
                name="aqi_forecaster_prod",
                version=mv.version,
                stage="Staging"
            )
            
            # Tag run details
            client.set_tag(run_id, "result", result_notes)
            client.set_tag(run_id, "registered_version", mv.version)

if __name__ == "__main__":
    print("Starting Weekly Retraining & Validation Script...")
    run_retraining_pipeline()
    print("Validation run finished.")
