import logging
import datetime
import os
import requests as raw_requests
import numpy as np
from core.config import settings

class AuthenticatedRequests:
    @staticmethod
    def get(url, **kwargs):
        username = os.getenv("DAGSHUB_USERNAME")
        token = os.getenv("DAGSHUB_TOKEN")
        if username and token and "auth" not in kwargs:
            kwargs["auth"] = (username, token)
        return raw_requests.get(url, **kwargs)

    @staticmethod
    def post(url, **kwargs):
        username = os.getenv("DAGSHUB_USERNAME")
        token = os.getenv("DAGSHUB_TOKEN")
        if username and token and "auth" not in kwargs:
            kwargs["auth"] = (username, token)
        return raw_requests.post(url, **kwargs)

requests = AuthenticatedRequests()

logger = logging.getLogger("forecast_ai.mlflow_service")

class MlflowService:
    @staticmethod
    def get_production_model():
        """
        Queries MLflow to get the current production model version and metadata.
        Raises an exception if MLflow is unreachable or no production version is registered.
        """
        url = f"{settings.mlflow_tracking_uri}/api/2.0/mlflow/model-versions/search"
        response = requests.get(url, params={"filter": "name='aqi_forecaster_prod'"}, timeout=3.0)
        if response.status_code != 200:
            raise Exception(f"MLflow service error: search model versions returned {response.status_code}")
        
        data = response.json()
        versions = data.get("model_versions", [])
        for v in versions:
            aliases = v.get("aliases", [])
            if "champion" in aliases:
                # Fetch run info to find the algorithm
                run_id = v.get("run_id")
                algorithm = "RandomForest"  # default
                if run_id:
                    try:
                        run_url = f"{settings.mlflow_tracking_uri}/api/2.0/mlflow/runs/get"
                        run_resp = requests.get(run_url, params={"run_id": run_id}, timeout=2.0)
                        if run_resp.status_code == 200:
                            params_list = run_resp.json().get("run", {}).get("data", {}).get("params", [])
                            for p in params_list:
                                if p.get("key") == "algorithm":
                                    algorithm = p.get("value")
                                    break
                    except Exception as e:
                        logger.warning(f"Failed to fetch run details for production algorithm name: {e}")
                
                return {
                    "name": "aqi_forecaster_prod",
                    "version": v.get("version"),
                    "stage": "Production",
                    "algorithm": algorithm,
                    "run_id": run_id
                }
        
        raise Exception("No model currently registered in 'Production' stage inside MLflow registry.")

    @staticmethod
    def get_validation_rmse(run_id: str):
        """
        Queries MLflow for a run's RMSE metric.
        Raises an exception on failure.
        """
        url = f"{settings.mlflow_tracking_uri}/api/2.0/mlflow/runs/get"
        response = requests.get(url, params={"run_id": run_id}, timeout=3.0)
        if response.status_code != 200:
            raise Exception(f"MLflow service error: get run details returned status {response.status_code}")
        
        run_data = response.json().get("run", {})
        metrics = run_data.get("data", {}).get("metrics", [])
        rmse_val = None
        for m in metrics:
            if m.get("key") == "improved_rmse":
                rmse_val = float(m.get("value"))
                break
        
        if rmse_val is None:
            # Fallback to general validation rmse if improved_rmse is not logged
            for m in metrics:
                if m.get("key") == "rmse" or m.get("key") == "val_rmse":
                    rmse_val = float(m.get("value"))
                    break
        
        if rmse_val is None:
            raise Exception(f"No metric 'improved_rmse' or 'rmse' found on MLflow run '{run_id}'.")
            
        baseline_rmse = 15.67
        improvement = baseline_rmse - rmse_val
        
        return {
            "value": rmse_val,
            "trend": {
                "direction": "down" if improvement >= 0 else "up",
                "value": round(abs(improvement), 2),
                "label": "vs baseline"
            }
        }

    @staticmethod
    def predict_aqi(city: str, features: list):
        """
        Loads the active production model from MLflow to run AQI forecasts.
        Raises an exception if the model cannot be loaded or inference fails.
        """
        import mlflow
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        prod_info = MlflowService.get_production_model()
        version = prod_info["version"]
        model_uri = f"models:/aqi_forecaster_prod/{version}"
        model = mlflow.pyfunc.load_model(model_uri)
        
        hourly_preds = []
        base_features = np.array(features)
        for i in range(24):
            # Simulate diurnal cycle variation (temperature peaks midday, humidity peaks morning)
            hour_features = base_features.copy()
            hour_features[0] += float(np.sin(i * np.pi / 12) * 5.0)  # Temperature variation
            hour_features[1] -= float(np.sin(i * np.pi / 12) * 10.0) # Humidity variation
            
            # Predict
            pred = model.predict(hour_features)
            hourly_preds.append(float(pred[0]))
        return hourly_preds

    @staticmethod
    def get_models_registry_summary(model_name: str = "aqi_forecaster_prod"):
        """
        Fetches all versions of the registered model from MLflow, queries their run metrics,
        and compiles the model registry summary.
        Raises an exception on failure.
        """
        url = f"{settings.mlflow_tracking_uri}/api/2.0/mlflow/model-versions/search"
        response = requests.get(url, params={"filter": f"name='{model_name}'"}, timeout=4.0)
        if response.status_code != 200:
            raise Exception(f"MLflow service error: search model versions returned status {response.status_code}")
            
        data = response.json()
        versions_data = data.get("model_versions", [])
        
        # Sort versions descending by version number
        try:
            versions_data = sorted(versions_data, key=lambda x: int(x.get("version", 0)), reverse=True)
        except Exception:
            versions_data = sorted(versions_data, key=lambda x: x.get("creation_timestamp", 0), reverse=True)
        
        versions = []
        production_ver = None
        staging_ver = None
        
        for v in versions_data:
            version_num = v.get("version")
            aliases = v.get("aliases", [])
            if "champion" in aliases:
                stage = "Production"
            elif "challenger" in aliases:
                stage = "Staging"
            else:
                stage = "None"
            run_id = v.get("run_id")
            creation_time_ms = int(v.get("creation_timestamp", 0))
            registered_at = datetime.datetime.fromtimestamp(creation_time_ms / 1000.0, datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
            
            # Fetch run details to get metrics (RMSE, MAE) and params (algorithm)
            rmse_val = 15.67  # default
            mae_val = 11.20
            algorithm = "LinearRegression"
            
            if run_id:
                run_url = f"{settings.mlflow_tracking_uri}/api/2.0/mlflow/runs/get"
                run_resp = requests.get(run_url, params={"run_id": run_id}, timeout=3.0)
                if run_resp.status_code == 200:
                    r_data = run_resp.json().get("run", {})
                    metrics_list = r_data.get("data", {}).get("metrics", [])
                    params_list = r_data.get("data", {}).get("params", [])
                    
                    for m in metrics_list:
                        if m.get("key") == "improved_rmse" or m.get("key") == "rmse":
                            rmse_val = float(m.get("value"))
                        elif m.get("key") == "mae":
                            mae_val = float(m.get("value"))
                            
                    for p in params_list:
                        if p.get("key") == "algorithm":
                            algorithm = p.get("value")
                            break
                    
                    if algorithm == "LinearRegression" and run_id != "run_baseline":
                        has_n_est = any(p.get("key") == "n_estimators" for p in params_list)
                        if has_n_est:
                            algorithm = "RandomForest"
            
            model_ver = {
                "version": version_num,
                "algorithm": algorithm,
                "stage": stage,
                "rmse": rmse_val,
                "mae": mae_val,
                "registeredAt": registered_at
            }
            versions.append(model_ver)
            
            if stage == "Production":
                production_ver = model_ver
            elif stage == "Staging":
                staging_ver = model_ver
        
        prod_rmse = production_ver["rmse"] if production_ver else 12.34
        baseline_rmse = 15.67
        
        baseline_model = next((v for v in versions if v["version"] == "1"), None)
        if baseline_model:
            baseline_rmse = baseline_model["rmse"]
        
        improvement = baseline_rmse - prod_rmse
        
        production_metric = {
            "value": prod_rmse,
            "trend": {
                "direction": "down" if improvement >= 0 else "up",
                "value": round(abs(improvement), 2),
                "label": "vs baseline"
            }
        }
        
        candidate_comparison = None
        if staging_ver:
            cand_rmse = staging_ver["rmse"]
            candidate_comparison = {
                "baselineRmse": baseline_rmse,
                "productionRmse": prod_rmse,
                "candidateRmse": cand_rmse,
                "candidateVersion": staging_ver["version"],
                "beatsBaseline": cand_rmse <= baseline_rmse,
                "beatsProduction": cand_rmse <= prod_rmse
            }
        
        # Query promotion history from events tags
        promotion_events = []
        try:
            exp_url = f"{settings.mlflow_tracking_uri}/api/2.0/mlflow/experiments/get-by-name"
            exp_resp = requests.get(exp_url, params={"experiment_name": "aqi_forecaster"}, timeout=2.0)
            if exp_resp.status_code == 200:
                exp_id = exp_resp.json().get("experiment", {}).get("experiment_id")
                if exp_id:
                    search_url = f"{settings.mlflow_tracking_uri}/api/2.0/mlflow/runs/search"
                    search_resp = requests.post(search_url, json={
                        "experiment_ids": [exp_id],
                        "order_by": ["attribute.start_time DESC"]
                    }, timeout=3.0)
                    if search_resp.status_code == 200:
                        runs_list = search_resp.json().get("runs", [])
                        for r in runs_list:
                            run_info = r.get("info", {})
                            run_tags = r.get("data", {}).get("tags", [])
                            
                            result_tag = None
                            reg_ver_tag = None
                            for t in run_tags:
                                if t.get("key") == "result":
                                    result_tag = t.get("value")
                                elif t.get("key") == "registered_version":
                                    reg_ver_tag = t.get("value")
                                    
                            if result_tag and ("Promoted" in result_tag or "Staging" in result_tag):
                                at_time = datetime.datetime.fromtimestamp(int(run_info.get("start_time", 0)) / 1000.0, datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
                                ver_str = f"v{reg_ver_tag}" if reg_ver_tag else "model"
                                trigger = "manual" if "manually" in result_tag.lower() else "auto"
                                change_desc = f"{ver_str} -> Production" if "Production" in result_tag else f"{ver_str} -> Staging"
                                
                                promotion_events.append({
                                    "at": at_time,
                                    "change": change_desc,
                                    "trigger": trigger,
                                    "note": result_tag
                                })
        except Exception as err:
            logger.warning(f"Failed to compile promotion history from MLflow: {err}")
            
        return {
            "name": model_name,
            "versions": versions,
            "production": production_metric,
            "lastPromotion": promotion_events[0] if promotion_events else None,
            "candidateComparison": candidate_comparison,
            "promotionHistory": promotion_events
        }

    @staticmethod
    def transition_model_stage(model_name: str, version: str, stage: str = "Production"):
        """
        Assigns the alias (champion or challenger) to the model version in MLflow.
        Raises an exception on failure.
        """
        alias = "champion" if stage == "Production" else "challenger"
        alias_url = f"{settings.mlflow_tracking_uri}/api/2.0/mlflow/registered-models/alias"
        alias_payload = {
            "name": model_name,
            "alias": alias,
            "version": version
        }
        response = requests.post(alias_url, json=alias_payload, timeout=4.0)
        if response.status_code != 200:
            raise Exception(f"MLflow service error: failed to set model alias '{alias}' (status {response.status_code})")
            
        try:
            ver_url = f"{settings.mlflow_tracking_uri}/api/2.0/mlflow/model-versions/get"
            ver_resp = requests.get(ver_url, params={"name": model_name, "version": version}, timeout=2.0)
            if ver_resp.status_code == 200:
                run_id = ver_resp.json().get("model_version", {}).get("run_id")
                if run_id:
                    tag_url = f"{settings.mlflow_tracking_uri}/api/2.0/mlflow/runs/set-tag"
                    requests.post(tag_url, json={
                        "run_id": run_id,
                        "key": "result",
                        "value": f"Promoted manually by operator to {stage}."
                    }, timeout=2.0)
                    requests.post(tag_url, json={
                        "run_id": run_id,
                        "key": "registered_version",
                        "value": version
                    }, timeout=2.0)
        except Exception as tag_err:
            logger.warning(f"Failed to tag promoted run: {tag_err}")
            
        return {
            "name": model_name,
            "version": version,
            "newStage": stage
        }

    @staticmethod
    def get_runs(status: str = None):
        """
        Queries MLflow runs and returns list of TrainingRun objects.
        Raises an exception on failure.
        """
        exp_url = f"{settings.mlflow_tracking_uri}/api/2.0/mlflow/experiments/get-by-name"
        exp_resp = requests.get(exp_url, params={"experiment_name": "aqi_forecaster"}, timeout=3.0)
        if exp_resp.status_code != 200:
            raise Exception(f"MLflow service error: failed to fetch experiment 'aqi_forecaster' ({exp_resp.status_code})")
        
        exp_id = exp_resp.json().get("experiment", {}).get("experiment_id")
        if not exp_id:
            raise Exception("Experiment 'aqi_forecaster' not found in MLflow registry.")
            
        search_url = f"{settings.mlflow_tracking_uri}/api/2.0/mlflow/runs/search"
        payload = {
            "experiment_ids": [exp_id],
            "order_by": ["attribute.start_time DESC"]
        }
        
        if status == "finished":
            payload["filter"] = "attribute.status = 'FINISHED'"
        elif status == "failed":
            payload["filter"] = "attribute.status = 'FAILED'"
            
        search_resp = requests.post(search_url, json=payload, timeout=4.0)
        if search_resp.status_code != 200:
            raise Exception(f"MLflow service error: failed to search runs ({search_resp.status_code})")
            
        runs_data = search_resp.json().get("runs", [])
        runs_list = []
        
        for r in runs_data:
            info = r.get("info", {})
            run_id = info.get("run_id")
            start_time_ms = int(info.get("start_time", 0))
            started_at = datetime.datetime.fromtimestamp(start_time_ms / 1000.0, datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
            
            run_status = "finished" if info.get("status") == "FINISHED" else "failed"
            
            data_sec = r.get("data", {})
            metrics = data_sec.get("metrics", [])
            params = data_sec.get("params", [])
            tags = data_sec.get("tags", [])
            
            baseline_rmse = 15.67
            improved_rmse = None
            n_estimators = 100
            max_depth = 5
            
            for m in metrics:
                if m.get("key") == "baseline_rmse":
                    baseline_rmse = float(m.get("value"))
                elif m.get("key") == "improved_rmse" or m.get("key") == "rmse":
                    improved_rmse = float(m.get("value"))
                    
            for p in params:
                if p.get("key") == "n_estimators":
                    n_estimators = int(p.get("value"))
                elif p.get("key") == "max_depth":
                    max_depth = int(p.get("value"))
            
            result = "Finished training"
            for t in tags:
                if t.get("key") == "result":
                    result = t.get("value")
                    break
                    
            runs_list.append({
                "runId": run_id,
                "startedAt": started_at,
                "nEstimators": n_estimators,
                "maxDepth": max_depth,
                "baselineRmse": baseline_rmse,
                "improvedRmse": improved_rmse,
                "result": result,
                "status": run_status
            })
            
        return runs_list

    @staticmethod
    def get_run_detail(run_id: str):
        """
        Queries MLflow for detail view of a specific run.
        Raises an exception on failure.
        """
        url = f"{settings.mlflow_tracking_uri}/api/2.0/mlflow/runs/get"
        response = requests.get(url, params={"run_id": run_id}, timeout=3.0)
        if response.status_code != 200:
            raise Exception(f"MLflow service error: run '{run_id}' not found ({response.status_code})")
            
        run_data = response.json().get("run", {})
        info = run_data.get("info", {})
        data_sec = run_data.get("data", {})
        
        start_time_ms = int(info.get("start_time", 0))
        started_at = datetime.datetime.fromtimestamp(start_time_ms / 1000.0, datetime.UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
        run_status = "finished" if info.get("status") == "FINISHED" else "failed"
        
        metrics = data_sec.get("metrics", [])
        params = data_sec.get("params", [])
        tags = data_sec.get("tags", [])
        
        baseline_rmse = 15.67
        improved_rmse = None
        mae = None
        n_estimators = 100
        max_depth = 5
        dvc_version = "—"
        registered_version = None
        
        for m in metrics:
            if m.get("key") == "baseline_rmse":
                baseline_rmse = float(m.get("value"))
            elif m.get("key") == "improved_rmse" or m.get("key") == "rmse":
                improved_rmse = float(m.get("value"))
            elif m.get("key") == "mae":
                mae = float(m.get("value"))
                
        for p in params:
            if p.get("key") == "n_estimators":
                n_estimators = int(p.get("value"))
            elif p.get("key") == "max_depth":
                max_depth = int(p.get("value"))
                
        for t in tags:
            if t.get("key") == "dvc_version" or t.get("key") == "dvc.version":
                dvc_version = t.get("value")
            elif t.get("key") == "registered_version":
                registered_version = t.get("value")
            
        result = "Finished training"
        for t in tags:
            if t.get("key") == "result":
                result = t.get("value")
                break
                
        return {
            "runId": run_id,
            "startedAt": started_at,
            "nEstimators": n_estimators,
            "maxDepth": max_depth,
            "baselineRmse": baseline_rmse,
            "improvedRmse": improved_rmse,
            "result": result,
            "status": run_status,
            "mae": mae,
            "dvcVersion": dvc_version,
            "artifactPath": info.get("artifact_uri", "—"),
            "registeredVersion": registered_version
        }
