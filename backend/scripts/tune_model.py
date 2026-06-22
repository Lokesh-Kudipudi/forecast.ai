import os
import argparse
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, mean_absolute_error
import mlflow

# Path configurations matching existing scripts
DATA_PATH = os.getenv("FORECAST_AI_HISTORICAL_DATA_PATH")
if not DATA_PATH:
    if os.path.exists("backend/data/historical_aqi.csv"):
        DATA_PATH = "backend/data/historical_aqi.csv"
    else:
        DATA_PATH = "data/historical_aqi.csv"

MLFLOW_URI = os.getenv("FORECAST_AI_MLFLOW_TRACKING_URI", "http://localhost:5000")

def load_data():
    """
    Loads dataset from DATA_PATH.
    """
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(f"Historical AQI dataset not found at {DATA_PATH}. Please make sure to run or configure the data source.")
    
    df = pd.read_csv(DATA_PATH)
    print(f"Loaded existing historical dataset from {DATA_PATH} ({len(df)} records).")
    return df

def run_tuning(args):
    # 1. Load and split data
    df = load_data()
    X = df[["temperature", "humidity", "wind_speed", "pm25_historical"]]
    y = df["target_aqi"]
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Calculate baseline model performance (Linear Regression)
    baseline_model = LinearRegression()
    baseline_model.fit(X_train, y_train)
    baseline_preds = baseline_model.predict(X_val)
    baseline_rmse = np.sqrt(mean_squared_error(y_val, baseline_preds))
    baseline_mae = mean_absolute_error(y_val, baseline_preds)
    print(f"Baseline Model (Linear Regression) RMSE: {baseline_rmse:.4f} | MAE: {baseline_mae:.4f}")
    
    # 2. Configure MLflow
    print(f"Connecting to MLflow Tracking Server at: {MLFLOW_URI}")
    mlflow.set_tracking_uri(MLFLOW_URI)
    mlflow.set_experiment("aqi_forecaster")
    
    # Define hyperparameter grid
    n_estimators_choices = [100, 200, 500, 800]
    max_depth_choices = [8, 10, 14, 20, None]
    min_samples_split_choices = [2, 4, 6, 10]
    min_samples_leaf_choices = [1, 2, 4]
    max_features_choices = [None]
    
    import itertools
    combinations = list(itertools.product(
        n_estimators_choices,
        max_depth_choices,
        min_samples_split_choices,
        min_samples_leaf_choices,
        max_features_choices
    ))
    
    # Select sample trials if randomized search is requested
    np.random.seed(args.seed)
    if args.trials and args.trials < len(combinations):
        print(f"Randomly sampling {args.trials} combinations out of {len(combinations)} total possibilities...")
        indices = np.random.choice(len(combinations), size=args.trials, replace=False)
        sampled_combinations = [combinations[i] for i in indices]
    else:
        print(f"Running full grid search over all {len(combinations)} combinations...")
        sampled_combinations = combinations

    best_rmse = float("inf")
    best_params = None
    
    print("\n--- Starting Hyperparameter Tuning Runs ---")
    for idx, (n_est, depth, split, leaf, feat) in enumerate(sampled_combinations, 1):
        run_name = f"tuning_rf_trial_{idx}"
        
        # Start a nested MLflow run or a single run labeled as a trial
        with mlflow.start_run(run_name=run_name) as run:
            run_id = run.info.run_id
            
            # Train the random forest model
            rf = RandomForestRegressor(
                n_estimators=n_est,
                max_depth=depth,
                min_samples_split=split,
                min_samples_leaf=leaf,
                max_features=feat,
                random_state=args.seed,
                n_jobs=-1
            )
            rf.fit(X_train, y_train)
            
            # Evaluate performance
            preds = rf.predict(X_val)
            rmse = np.sqrt(mean_squared_error(y_val, preds))
            mae = mean_absolute_error(y_val, preds)
            
            # Track best parameters
            is_best = rmse < best_rmse
            if is_best:
                best_rmse = rmse
                best_params = {
                    "n_estimators": n_est,
                    "max_depth": depth,
                    "min_samples_split": split,
                    "min_samples_leaf": leaf,
                    "max_features": feat
                }
            
            # Log params to MLflow
            mlflow.log_param("algorithm", "RandomForest")
            mlflow.log_param("n_estimators", n_est)
            mlflow.log_param("max_depth", depth)
            mlflow.log_param("min_samples_split", split)
            mlflow.log_param("min_samples_leaf", leaf)
            mlflow.log_param("max_features", str(feat))
            
            # Log metrics to MLflow
            mlflow.log_metric("baseline_rmse", baseline_rmse)
            mlflow.log_metric("improved_rmse", rmse)
            mlflow.log_metric("mae", mae)
            
            # Set tags to identify runs on dashboard
            result_tag = f"Tuning trial {idx}/{len(sampled_combinations)}: RMSE = {rmse:.4f}"
            mlflow.set_tag("result", result_tag)
            mlflow.set_tag("run_type", "tuning_trial")
            if is_best:
                mlflow.set_tag("best_so_far", "true")
            
            print(f"Trial {idx:02d}/{len(sampled_combinations):02d} | Params: n_est={n_est}, depth={depth}, split={split}, leaf={leaf} | RMSE: {rmse:.4f} {'*' if is_best else ''}")

    print("\n--- Tuning Finished ---")
    print(f"Best Parameters: {best_params}")
    print(f"Best Validation RMSE: {best_rmse:.6f}")
    
    # 3. Create a final summary/best run in MLflow
    with mlflow.start_run(run_name="tuning_summary_best") as run:
        summary_run_id = run.info.run_id
        
        # Train best model
        best_rf = RandomForestRegressor(
            n_estimators=best_params["n_estimators"],
            max_depth=best_params["max_depth"],
            min_samples_split=best_params["min_samples_split"],
            min_samples_leaf=best_params["min_samples_leaf"],
            max_features=best_params["max_features"],
            random_state=args.seed,
            n_jobs=-1
        )
        best_rf.fit(X_train, y_train)
        best_preds = best_rf.predict(X_val)
        best_mae = mean_absolute_error(y_val, best_preds)
        
        # Log best parameters and metrics
        mlflow.log_param("algorithm", "RandomForest")
        for k, v in best_params.items():
            mlflow.log_param(k, v)
            
        mlflow.log_metric("baseline_rmse", baseline_rmse)
        mlflow.log_metric("improved_rmse", best_rmse)
        mlflow.log_metric("mae", best_mae)
        
        result_desc = f"Best RF tuning run found (RMSE: {best_rmse:.4f} vs baseline: {baseline_rmse:.4f})."
        mlflow.set_tag("result", result_desc)
        mlflow.set_tag("run_type", "tuning_best_summary")
        
        # Log model artifact to MLflow
        model_info = mlflow.sklearn.log_model(best_rf, "model")
        print(f"Successfully logged the best model artifact to MLflow: {model_info.model_uri}")
        
        # Optionally promote to Staging / challenger if requested
        if args.register:
            print("Registering best model version in MLflow Model Registry...")
            try:
                client = mlflow.tracking.MlflowClient()
                try:
                    client.create_registered_model("aqi_forecaster_prod")
                except Exception:
                    pass
                mv = client.create_model_version(name="aqi_forecaster_prod", source=model_info.model_uri, run_id=summary_run_id)
                client.set_registered_model_alias(name="aqi_forecaster_prod", alias="challenger", version=mv.version)
                print(f"Registered model version v{mv.version} and set alias 'challenger'.")
                client.set_tag(summary_run_id, "registered_version", mv.version)
            except Exception as e:
                print(f"Model registration warning: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hyperparameter tuning script for forecast.ai models integrated with MLflow.")
    parser.add_argument("--trials", type=int, default=10, help="Number of tuning combinations to try (randomly sampled). If None or larger than grid size, tries all combinations.")
    parser.add_argument("--register", action="store_true", help="Whether to register the best model to MLflow registry under 'challenger' (Staging) alias.")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for data split and training.")
    
    args = parser.parse_args()
    run_tuning(args)
