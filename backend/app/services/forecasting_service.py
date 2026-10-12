from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from datetime import datetime


class AdaptiveForecastingService:
    """
    Adaptive Multi-Model Expense Forecaster.
    Automatically chooses the best mathematical formulation based on sample history length,
    preventing SARIMAX convergence crashes on sparse retail statement data.
    """

    @classmethod
    def generate_expense_forecast(
        cls,
        monthly_series: List[float],
        forecast_horizon_months: int = 12,
        annual_inflation_rate_pct: float = 4.0
    ) -> Dict[str, Any]:
        """
        Takes monthly essential expense totals and projects future monthly burn rate curve.
        """
        n = len(monthly_series)
        monthly_inflation_mult = (1.0 + (annual_inflation_rate_pct / 100.0)) ** (1.0 / 12.0)

        # 1. Very short history (< 3 months) -> Prudent Moving Average + Inflation
        if n < 3:
            baseline = np.mean(monthly_series) if n > 0 else 2500.0
            projected = [
                round(float(baseline * (monthly_inflation_mult ** m)), 2)
                for m in range(1, forecast_horizon_months + 1)
            ]
            return {
                "model_used": "WEIGHTED_MOVING_AVERAGE",
                "sample_points": n,
                "projected_curve": projected,
                "mean_projected_burn": round(float(np.mean(projected)), 2),
                "confidence_interval": "WIDER (Limited historical data < 3 months)"
            }

        # 2. Medium history (3 - 12 months) -> Holt-Linear Exponential Smoothing
        elif n < 12:
            alpha = 0.4  # Level smoothing
            beta = 0.2   # Trend smoothing

            level = monthly_series[0]
            trend = monthly_series[1] - monthly_series[0] if n > 1 else 0.0

            for val in monthly_series[1:]:
                last_level = level
                level = alpha * val + (1 - alpha) * (level + trend)
                trend = beta * (level - last_level) + (1 - beta) * trend

            projected = []
            for m in range(1, forecast_horizon_months + 1):
                # Dampen trend projection to prevent runaway extrapolation
                damped_trend = trend * (0.9 ** m)
                raw_pred = max(level + (m * damped_trend), 0.5 * np.mean(monthly_series))
                inflation_adjusted = raw_pred * (monthly_inflation_mult ** m)
                projected.append(round(float(inflation_adjusted), 2))

            return {
                "model_used": "HOLT_LINEAR_EXPONENTIAL_SMOOTHING",
                "sample_points": n,
                "projected_curve": projected,
                "mean_projected_burn": round(float(np.mean(projected)), 2),
                "confidence_interval": "MODERATE (3-12 months historical data)"
            }

        # 3. Rich history (>= 12 months) -> Seasonal Decomposition & Trend Auto-Regressive
        else:
            # Detect 12-month seasonality
            series = np.array(monthly_series)
            seasonal_pattern = np.zeros(12)
            for m_idx in range(12):
                month_samples = [series[i] for i in range(m_idx, len(series), 12)]
                seasonal_pattern[m_idx] = np.mean(month_samples) if month_samples else np.mean(series)

            base_mean = np.mean(series)
            seasonal_factors = (seasonal_pattern / base_mean) if base_mean > 0 else np.ones(12)

            # Trend line via linear regression
            x = np.arange(len(series))
            slope, intercept = np.polyfit(x, series, 1)

            projected = []
            for m in range(1, forecast_horizon_months + 1):
                future_idx = len(series) + m - 1
                season_mult = seasonal_factors[future_idx % 12]
                raw_forecast = (intercept + slope * future_idx) * season_mult
                raw_forecast = max(raw_forecast, 0.4 * base_mean) # Safeguard floor
                inflation_adjusted = raw_forecast * (monthly_inflation_mult ** m)
                projected.append(round(float(inflation_adjusted), 2))

            return {
                "model_used": "SEASONAL_TREND_DECOMPOSITION_AUTOREGRESSIVE",
                "sample_points": n,
                "projected_curve": projected,
                "mean_projected_burn": round(float(np.mean(projected)), 2),
                "confidence_interval": "HIGH (Full 12+ month seasonal cycle captured)"
            }
