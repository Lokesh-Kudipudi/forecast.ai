import os
import logging
import pandas as pd
import numpy as np
from scipy.stats import ks_2samp
from core.config import settings

logger = logging.getLogger("forecast_ai.drift_service")

# Thread-safe in-memory cache for live request features to evaluate drift dynamically
# In a production app, these would be logged to a serving database or file
_LIVE_REQUESTS_LOG = []
MAX_LIVE_LOG_SIZE = 100

class DriftService:
    @staticmethod
    def log_request(features: dict):
        """
        Logs a set of features from incoming request to the in-memory window.
        """
        global _LIVE_REQUESTS_LOG
        _LIVE_REQUESTS_LOG.append(features)
        if len(_LIVE_REQUESTS_LOG) > MAX_LIVE_LOG_SIZE:
            _LIVE_REQUESTS_LOG.pop(0)

    @classmethod
    def load_historical_data(cls) -> pd.DataFrame:
        """
        Loads baseline training data. Raises FileNotFoundError if missing.
        """
        path = settings.historical_data_path
        if not os.path.exists(path):
            raise FileNotFoundError(f"Baseline training dataset not found at {path}. Please bootstrap or pull data from DVC.")
        try:
            return pd.read_csv(path)
        except Exception as e:
            logger.error(f"Failed to read historical dataset at {path}: {e}")
            raise

    @classmethod
    def calculate_drift(cls):
        """
        Calculates Kolmogorov-Smirnov statistical drift check.
        Raises ValueError if logged requests are too few (< 10).
        """
        features_keys = ["temperature", "humidity", "wind_speed", "pm25_historical"]
        
        # Load baseline historical data
        baseline_df = cls.load_historical_data()
        
        # Check if we have enough live requests to run a statistical test
        global _LIVE_REQUESTS_LOG
        if len(_LIVE_REQUESTS_LOG) < 10:
            raise ValueError(f"Insufficient live request logs ({len(_LIVE_REQUESTS_LOG)}/10) to run KS-test. Please make predictions first.")
            
        live_df = pd.DataFrame(_LIVE_REQUESTS_LOG)
            
        results = []
        drifting_count = 0
        
        for key in features_keys:
            baseline_series = baseline_df[key].dropna()
            live_series = live_df[key].dropna()
            
            p_val = 0.5
            if len(baseline_series) > 0 and len(live_series) > 0:
                try:
                    _, p_val = ks_2samp(baseline_series, live_series)
                except Exception as e:
                    logger.error(f"KS-test failed for feature '{key}': {e}")
                    
            if p_val < 0.05:
                verdict = "drift"
                drifting_count += 1
            elif p_val < 0.10:
                verdict = "borderline"
            else:
                verdict = "ok"
                
            results.append({
                "feature": key,
                "pValue": round(p_val, 3),
                "verdict": verdict
            })
            
        # Extract training vs live distribution data for the worst feature (lowest p-value)
        worst_feature = min(results, key=lambda x: x["pValue"])
        worst_key = worst_feature["feature"]
        
        # Bin the distributions for display on area chart
        hist_b, bins = np.histogram(baseline_df[worst_key], bins=20, density=True)
        hist_l, _ = np.histogram(live_df[worst_key], bins=bins, density=True)
        
        training_points = []
        live_points = []
        for i in range(len(hist_b)):
            bin_center = float((bins[i] + bins[i+1]) / 2)
            training_points.append({"t": f"{bin_center:.1f}", "value": float(hist_b[i])})
            live_points.append({"t": f"{bin_center:.1f}", "value": float(hist_l[i])})
            
        worst_data = {
            "feature": worst_key,
            "training": training_points,
            "live": live_points
        }
            
        return {
            "features": results,
            "driftingCount": drifting_count,
            "total": len(features_keys),
            "worst": worst_data
        }
