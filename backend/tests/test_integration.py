import pytest
import io
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import engine, Base


@pytest_asyncio.fixture(autouse=True)
async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.mark.asyncio
async def test_full_phase_1_and_2_integration():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Register User
        reg_payload = {
            "email": "sarv@example.com",
            "username": "sarvace",
            "password": "strongpassword123",
            "full_name": "Sarv Ace",
            "base_currency": "USD",
            "target_survival_months": 6
        }
        res_reg = await ac.post("/api/v1/auth/register", json=reg_payload)
        assert res_reg.status_code == 201, res_reg.text
        user_data = res_reg.json()
        assert user_data["username"] == "sarvace"

        # 2. Login to acquire JWT Token
        login_payload = {
            "username": "sarvace",
            "password": "strongpassword123"
        }
        res_login = await ac.post("/api/v1/auth/login", data=login_payload)
        assert res_login.status_code == 200, res_login.text
        token = res_login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Create Multi-Tier Assets
        asset_1 = {
            "name": "Checking Account Cash",
            "tier": "CASH",
            "amount": 5000.0,
            "annual_yield_pct": 1.0,
            "liquidity_days": 0,
            "penalty_pct": 0.0,
            "tax_haircut_pct": 0.0,
            "liquidation_order": 1
        }
        res_a1 = await ac.post("/api/v1/assets/", json=asset_1, headers=headers)
        assert res_a1.status_code == 201

        asset_2 = {
            "name": "High-Yield Reserve",
            "tier": "HIGH_YIELD",
            "amount": 15000.0,
            "annual_yield_pct": 5.0,
            "liquidity_days": 1,
            "penalty_pct": 0.0,
            "tax_haircut_pct": 0.0,
            "liquidation_order": 2
        }
        res_a2 = await ac.post("/api/v1/assets/", json=asset_2, headers=headers)
        assert res_a2.status_code == 201

        # 4. Upload Bank CSV Statement
        csv_content = """Date,Description,Amount
2026-01-05,Monthly Apartment Rent,1500.00
2026-01-10,Whole Foods Supermarket Groceries,350.00
2026-01-15,Electric Utility Power,120.00
2026-01-18,Starbucks Coffee,45.00
2026-01-22,Netflix Subscription,20.00
2026-01-25,Emergency Hospital Treatment,4200.00
2026-02-05,Monthly Apartment Rent,1500.00
2026-02-10,Kroger Supermarket Groceries,320.00
2026-02-18,Dinner at Fancy Steakhouse,180.00
"""
        files = {"file": ("statement.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
        res_upload = await ac.post("/api/v1/transactions/upload-csv", files=files, headers=headers)
        assert res_upload.status_code == 200, res_upload.text
        upload_summary = res_upload.json()
        assert upload_summary["inserted"] == 9
        assert upload_summary["anomalies_detected"] >= 1  # 4200 hospital bill flagged as statistical shock

        # 5. Query Rigidity Analysis (Phase 2)
        res_rigidity = await ac.get("/api/v1/analytics/rigidity", headers=headers)
        assert res_rigidity.status_code == 200
        rigidity_data = res_rigidity.json()
        assert "rigidity_score" in rigidity_data
        assert rigidity_data["rigidity_score"] > 0

        # 6. Query Anomaly Review (Phase 2)
        res_anomalies = await ac.get("/api/v1/analytics/anomalies", headers=headers)
        assert res_anomalies.status_code == 200

        # 7. Query Forecast (Phase 2)
        res_forecast = await ac.get("/api/v1/analytics/forecast?horizon_months=6&inflation_rate=3.5", headers=headers)
        assert res_forecast.status_code == 200
        forecast_data = res_forecast.json()
        assert len(forecast_data["projected_curve"]) == 6
        assert forecast_data["model_used"] in ["WEIGHTED_MOVING_AVERAGE", "HOLT_LINEAR_EXPONENTIAL_SMOOTHING", "SEASONAL_TREND_DECOMPOSITION_AUTOREGRESSIVE"]

        # 8. Run Vectorized Monte Carlo Simulation (Phase 3 Integration)
        sim_payload = {
            "crisis_duration_months": 6,
            "income_retention_pct": 0.0,
            "inflation_rate_pct": 4.5,
            "investment_yield_pct": 4.0,
            "target_survival_months": 12,
            "num_simulations": 1000,
            "max_deflation_pct": 80.0,
            "panic_runway_threshold_months": 3.0
        }
        res_sim = await ac.post("/api/v1/simulation/run", json=sim_payload, headers=headers)
        assert res_sim.status_code == 200, res_sim.text
        sim_data = res_sim.json()
        assert "prob_surviving_target" in sim_data
        assert "timelines" in sim_data
        assert len(sim_data["timelines"]["p50_median"]) == 13
        assert sim_data["user_baseline"]["total_liquid_assets"] == 20000.0  # 5000 + 15000

        # 9. Test Multi-Tier Liquidation Cascade (Phase 3 Integration)
        cascade_payload = {
            "cash_needed": 8000.0
        }
        res_cascade = await ac.post("/api/v1/simulation/liquidation-cascade", json=cascade_payload, headers=headers)
        assert res_cascade.status_code == 200, res_cascade.text
        cascade_data = res_cascade.json()
        assert cascade_data["deficit_remaining"] == 0.0
        assert cascade_data["is_exhausted"] is False
        assert len(cascade_data["liquidations"]) >= 1
        assert cascade_data["total_liquid_remaining"] == 12000.0  # 20000 - 8000

        # 10. Test Stress Test Gallery Listing & Execution (Phase 4 Integration)
        res_scenarios = await ac.get("/api/v1/advisor/scenarios")
        assert res_scenarios.status_code == 200
        scenarios_list = res_scenarios.json()
        assert len(scenarios_list) >= 4

        scenario_run_payload = {
            "scenario_id": "tech_layoff",
            "target_survival_months": 12
        }
        res_run_scenario = await ac.post("/api/v1/advisor/scenarios/run", json=scenario_run_payload, headers=headers)
        assert res_run_scenario.status_code == 200, res_run_scenario.text
        scenario_run_data = res_run_scenario.json()
        assert scenario_run_data["scenario"]["id"] == "tech_layoff"
        assert "prob_surviving_target" in scenario_run_data

        # 11. Test AI Advisor Chat / Guidance Synthesis (Phase 4 Integration)
        advice_payload = {
            "user_question": "What happens if I face an 8-month layoff?"
        }
        res_advice = await ac.post("/api/v1/advisor/chat", json=advice_payload, headers=headers)
        assert res_advice.status_code == 200, res_advice.text
        advice_data = res_advice.json()
        assert advice_data["verdict"] == "ANALYSIS_COMPLETE"
        assert len(advice_data["summary"]) > 50
        assert "key_metrics" in advice_data


