import os
import datetime
import requests
import pandas as pd
import numpy as np

# Coordinates for default cities
CITY_COORDINATES = {
    "Delhi": {"lat": 28.6139, "lon": 77.2090},
    "Beijing": {"lat": 39.9042, "lon": 116.4074},
    "London": {"lat": 51.5074, "lon": -0.1278},
    "New York": {"lat": 40.7128, "lon": -74.0060},
    "Rajahmundry": {"lat": 17.0005, "lon": 81.8040},
    "Tada": {"lat": 13.5937, "lon": 80.0268},
    "Chennai": {"lat": 13.0827, "lon": 80.2707},
    "Sri City": {"lat": 13.5300, "lon": 80.0300}
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
        temp_base = {"Delhi": 35.0, "Beijing": 22.0, "London": 15.0, "New York": 20.0,
                     "Rajahmundry": 32.0, "Tada": 30.0, "Chennai": 33.0, "Sri City": 30.0}
        pm25_base = {"Delhi": 110.0, "Beijing": 45.0, "London": 15.0, "New York": 12.0,
                     "Rajahmundry": 25.0, "Tada": 8.0, "Chennai": 30.0, "Sri City": 11.0}
        
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

def append_to_dataset(new_records, data_path="data/historical_aqi.csv"):
    """
    Appends the fetched data to historical_aqi.csv.
    """
    new_df = pd.DataFrame(new_records)
    
    if os.path.exists(data_path):
        try:
            old_df = pd.read_csv(data_path)
            # Combine and maintain schema ordering
            combined_df = pd.concat([old_df, new_df], ignore_index=True)
            combined_df.to_csv(data_path, index=False)
            print(f"Successfully appended {len(new_records)} records to {data_path}")
            return
        except Exception as e:
            print(f"Failed to read existing historical file: {e}")
            
    # Write new file if it doesn't exist or is corrupted
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    new_df.to_csv(data_path, index=False)
    print(f"Created new historical file at {data_path} with {len(new_records)} records.")

if __name__ == "__main__":
    print("Starting OpenWeatherMap data ingestion pipeline task...")
    api_key = os.getenv("OPENWEATHER_API_KEY")
    data_path = os.getenv("HISTORICAL_DATA_PATH", "data/historical_aqi.csv")
    
    records = []
    for city, coords in CITY_COORDINATES.items():
        record = fetch_weather_and_pollution(city, coords["lat"], coords["lon"], api_key)
        records.append(record)
        
    append_to_dataset(records, data_path)
    print("Ingestion pipeline task completed.")
