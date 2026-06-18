import os
import datetime
import requests
import pandas as pd
import numpy as np
import warnings
import logging

warnings.filterwarnings("ignore")
logging.getLogger("mlflow").setLevel(logging.ERROR)

# Coordinates for default cities
CITY_COORDINATES = {
    "Rajahmundry": {"lat": 17.0005, "lon": 81.8040},
    "Tada": {"lat": 13.5937, "lon": 80.0268},
    "Chennai": {"lat": 13.0827, "lon": 80.2707}
}

def fetch_weather_and_pollution(city, lat, lon, api_key):
    """
    Fetches real-time weather and pollution metrics from OpenWeatherMap.
    Falls back to simulated metrics if the API key is invalid or not provided.
    """
    if not api_key or api_key == "YOUR_OPENWEATHER_API_KEY":
        # Simulate local weather/pollution metrics
        print(f"[{city}] No valid OpenWeatherMap API key. Simulating metrics...")
        np.random.seed(None)
        
        # Approximate baseline for cities
        temp_base = {"Rajahmundry": 32.0, "Tada": 30.0, "Chennai": 33.0}
        pm25_base = {"Rajahmundry": 25.0, "Tada": 8.0, "Chennai": 30.0}
        
        t = temp_base.get(city, 25.0) + np.random.normal(0, 2.0)
        h = max(20, min(100, 60.0 + np.random.normal(0, 10.0)))
        w = max(0.5, 3.0 + np.random.exponential(1.5))
        pm25 = max(2.0, pm25_base.get(city, 25.0) + np.random.normal(0, 5.0))
        
        # Calculate target AQI (approximation scale)
        target_aqi = 15.0 + 1.5 * pm25 + 0.5 * (t - 25.0)
        return {
            "city": city,
            "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
            "temperature": round(t, 2),
            "humidity": round(h, 1),
            "wind_speed": round(w, 2),
            "pm25_historical": round(pm25, 2),
            "target_aqi": round(max(0, target_aqi), 1)
        }
        
    try:
        # Fetch Current Weather (temperature, humidity, wind speed)
        weather_url = f"https://api.openweathermap.org/data/2.5/weather"
        weather_res = requests.get(weather_url, params={
            "lat": lat,
            "lon": lon,
            "appid": api_key,
            "units": "metric"
        }, timeout=5.0)
        
        # Fetch Air Pollution (PM2.5)
        pollution_url = f"https://api.openweathermap.org/data/2.5/air_pollution"
        pollution_res = requests.get(pollution_url, params={
            "lat": lat,
            "lon": lon,
            "appid": api_key
        }, timeout=5.0)
        
        if weather_res.status_code == 200 and pollution_res.status_code == 200:
            w_data = weather_res.json()
            p_data = pollution_res.json()
            
            t = w_data.get("main", {}).get("temp", 25.0)
            h = w_data.get("main", {}).get("humidity", 60.0)
            w = w_data.get("wind", {}).get("speed", 3.0)
            
            components = p_data.get("list", [{}])[0].get("components", {})
            pm25 = components.get("pm2_5", 25.0)
            
            # Simple AQI mapping formula derived from PM2.5 concentration
            # EPA Standard approximation
            target_aqi = 15.0 + 1.5 * pm25
            
            return {
                "city": city,
                "timestamp": datetime.datetime.now(datetime.UTC).isoformat(),
                "temperature": float(t),
                "humidity": float(h),
                "wind_speed": float(w),
                "pm25_historical": float(pm25),
                "target_aqi": float(target_aqi)
            }
        else:
            print(f"[{city}] API call failed (weather status: {weather_res.status_code}, pollution status: {pollution_res.status_code}). Simulating...")
    except Exception as e:
        print(f"[{city}] Ingestion error: {e}. Simulating...")
        
    return fetch_weather_and_pollution(city, lat, lon, None)

def make_prediction(city, t, h, w, pm25):
    """
    Attempts to load the MLflow model and predict target AQI.
    Falls back to simple baseline regression if MLflow is unreachable.
    """
    try:
        import sys
        script_dir = os.path.dirname(os.path.abspath(__file__))
        backend_dir = os.path.dirname(script_dir)
        if backend_dir not in sys.path:
            sys.path.append(backend_dir)
            
        from core.config import settings
        from services.mlflow_service import MlflowService
        import mlflow
        
        mlflow.set_tracking_uri(settings.mlflow_tracking_uri)
        prod_model = MlflowService.get_production_model()
        version = prod_model["version"]
        model_uri = f"models:/aqi_forecaster_prod/{version}"
        model = mlflow.pyfunc.load_model(model_uri)
        
        import pandas as pd
        df_features = pd.DataFrame([{
            "temperature": t,
            "humidity": h,
            "wind_speed": w,
            "pm25_historical": pm25
        }])
        pred = model.predict(df_features)
        return float(pred[0])
    except Exception as e:
        print(f"[{city}] Failed to fetch prediction from MLflow model: {e}. Falling back to baseline prediction.")
        pred_val = 15.0 + 1.5 * pm25 + 0.5 * (t - 25.0) + np.random.normal(0, 1.0)
        return float(max(0.0, pred_val))

def log_prediction_vs_actual(records, file_path="data/prediction_vs_actual.csv"):
    """
    Logs prediction vs actual entries, keeping only the last 24 hours of data.
    """
    new_records = []
    for r in records:
        pred_val = make_prediction(r["city"], r["temperature"], r["humidity"], r["wind_speed"], r["pm25_historical"])
        new_records.append({
            "timestamp": r["timestamp"],
            "city": r["city"],
            "temperature": r["temperature"],
            "humidity": r["humidity"],
            "wind_speed": r["wind_speed"],
            "pm25_historical": r["pm25_historical"],
            "predicted_aqi": round(pred_val, 2),
            "actual_aqi": round(r["target_aqi"], 2)
        })
        
    new_df = pd.DataFrame(new_records)
    
    if os.path.exists(file_path):
        try:
            old_df = pd.read_csv(file_path)
            combined_df = pd.concat([old_df, new_df], ignore_index=True)
        except Exception as e:
            print(f"Failed to read existing prediction_vs_actual file: {e}")
            combined_df = new_df
    else:
        combined_df = new_df
        
    combined_df = combined_df.drop_duplicates(subset=["timestamp", "city"])
    
    try:
        combined_df["timestamp"] = pd.to_datetime(combined_df["timestamp"], utc=True, format='ISO8601')
        combined_df = combined_df.sort_values(by="timestamp", ascending=True)
        
        limit_time = datetime.datetime.now(datetime.UTC) - datetime.timedelta(hours=24)
        combined_df = combined_df[combined_df["timestamp"] >= pd.to_datetime(limit_time, utc=True)]
        combined_df["timestamp"] = combined_df["timestamp"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    except Exception as e:
        print(f"Error filtering timestamps for last 24 hours: {e}")
        
    combined_df = combined_df.tail(72)
    
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    combined_df.to_csv(file_path, index=False)
    print(f"Successfully updated prediction vs actual logs: {len(combined_df)} records.")

def append_to_dataset(new_records, data_path="data/historical_aqi.csv"):
    """
    Appends the fetched data to historical_aqi.csv.
    """
    new_df = pd.DataFrame(new_records)
    
    if os.path.exists(data_path):
        try:
            old_df = pd.read_csv(data_path)
            combined_df = pd.concat([old_df, new_df], ignore_index=True)
            combined_df.to_csv(data_path, index=False)
            print(f"Successfully appended {len(new_records)} records to {data_path}")
            return
        except Exception as e:
            print(f"Failed to read existing historical file: {e}")
            
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    new_df.to_csv(data_path, index=False)
    print(f"Created new historical file at {data_path} with {len(new_records)} records.")

if __name__ == "__main__":
    print("Starting OpenWeatherMap data ingestion pipeline task...")
    api_key = os.getenv("OPENWEATHER_API_KEY")
    data_path = os.getenv("HISTORICAL_DATA_PATH", "data/historical_aqi.csv")
    
    base_dir = os.path.dirname(data_path) if os.path.dirname(data_path) else "data"
    pred_vs_actual_path = os.path.join(base_dir, "prediction_vs_actual.csv")
    
    records = []
    for city, coords in CITY_COORDINATES.items():
        record = fetch_weather_and_pollution(city, coords["lat"], coords["lon"], api_key)
        records.append(record)
        
    append_to_dataset(records, data_path)
    log_prediction_vs_actual(records, pred_vs_actual_path)
    print("Ingestion pipeline task completed.")
