import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_squared_error, mean_absolute_error
from scipy.stats import ks_2samp

def load_or_create_data(data_path="data/historical_aqi.csv"):
    """
    Loads historical dataset, creating it if it doesn't exist.
    """
    if os.path.exists(data_path):
        df = pd.read_csv(data_path)
        if len(df) >= 10:
            print(f"Loading existing historical dataset from {data_path} ({len(df)} records)...")
            return df
        else:
            print(f"Historical dataset at {data_path} has too few records ({len(df)}). Generating synthetic baseline for training...")
    
    print("Historical dataset not found. Generating baseline training dataset...")
    os.makedirs(os.path.dirname(data_path), exist_ok=True)
    np.random.seed(42)
    n_samples = 1000
    
    # Generate mock features
    temperature = np.random.normal(25.0, 5.0, n_samples)
    humidity = np.random.normal(60.0, 10.0, n_samples)
    wind_speed = np.random.exponential(3.0, n_samples)
    pm25_historical = np.random.normal(50.0, 15.0, n_samples)
    
    # Target AQI depends non-linearly on features for RandomForest to capture better than LinearRegression
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
    df.to_csv(data_path, index=False)
    print(f"Baseline training dataset saved to {data_path}")
    return df

def run_evaluation_comparison(df):
    """
    Runs baseline (Linear Regression) vs. improved (Random Forest) model evaluations.
    """
    X = df[["temperature", "humidity", "wind_speed", "pm25_historical"]]
    y = df["target_aqi"]
    
    X_train, X_val, y_train, y_val = train_test_split(X, y, test_size=0.2, random_state=42)
    
    print("\n--- 1. Evaluating Models (Baseline vs. Improved) ---")
    
    # Baseline Model: Linear Regression
    baseline_model = LinearRegression()
    baseline_model.fit(X_train, y_train)
    baseline_preds = baseline_model.predict(X_val)
    baseline_rmse = np.sqrt(mean_squared_error(y_val, baseline_preds))
    baseline_mae = mean_absolute_error(y_val, baseline_preds)
    
    # Improved Model: Random Forest
    improved_model = RandomForestRegressor(n_estimators=100, max_depth=5, random_state=42)
    improved_model.fit(X_train, y_train)
    improved_preds = improved_model.predict(X_val)
    improved_rmse = np.sqrt(mean_squared_error(y_val, improved_preds))
    improved_mae = mean_absolute_error(y_val, improved_preds)
    
    print(f"Baseline Model (Linear Regression) RMSE: {baseline_rmse:.4f} | MAE: {baseline_mae:.4f}")
    print(f"Improved Model (Random Forest)      RMSE: {improved_rmse:.4f} | MAE: {improved_mae:.4f}")
    improvement = ((baseline_rmse - improved_rmse) / baseline_rmse) * 100
    print(f"Accuracy Improvement: {improvement:.2f}%")
    
    return baseline_rmse, improved_rmse

def simulate_and_detect_drift(df):
    """
    Simulates a live serving features dataset with drift, and runs Kolmogorov-Smirnov statistical tests.
    """
    print("\n--- 2. Simulating & Detecting Data Drift (KS-Test) ---")
    np.random.seed(1337)
    n_samples = 100
    
    # Normal live requests features (no drift)
    normal_live = pd.DataFrame({
        "temperature": np.random.normal(25.2, 4.8, n_samples),
        "humidity": np.random.normal(59.5, 9.8, n_samples),
        "wind_speed": np.random.exponential(3.1, n_samples),
        "pm25_historical": np.random.normal(51.0, 14.5, n_samples)
    })
    
    # Drifted live requests features (severe drift on PM2.5 and temperature)
    drifted_live = pd.DataFrame({
        "temperature": np.random.normal(32.5, 3.5, n_samples), # Heatwave scenario (+7.5°C)
        "humidity": np.random.normal(52.0, 12.0, n_samples),
        "wind_speed": np.random.exponential(2.8, n_samples),
        "pm25_historical": np.random.normal(92.0, 22.0, n_samples) # Heavy smog/pollution (+42 PM2.5)
    })
    
    for label, live_df in [("Normal Serving (No Drift)", normal_live), ("Drifted Serving (Drift Active)", drifted_live)]:
        print(f"\nEvaluating dataset: {label}")
        for feature in ["temperature", "humidity", "wind_speed", "pm25_historical"]:
            baseline_distribution = df[feature].dropna()
            live_distribution = live_df[feature].dropna()
            
            # Run Kolmogorov-Smirnov statistical check
            statistic, p_value = ks_2samp(baseline_distribution, live_distribution)
            
            verdict = "OK"
            if p_value < 0.05:
                verdict = "DRIFT DETECTED (p < 0.05)"
            elif p_value < 0.10:
                verdict = "BORDERLINE WARNING (0.05 <= p < 0.10)"
                
            print(f"  Feature: {feature:15} | KS Stat: {statistic:.4f} | p-value: {p_value:.6f} | Verdict: {verdict}")

if __name__ == "__main__":
    print("====================================================")
    print(" forecast.ai — MLOps Performance & Drift Reproducer ")
    print("====================================================")
    df = load_or_create_data()
    run_evaluation_comparison(df)
    simulate_and_detect_drift(df)
    print("\n====================================================")
