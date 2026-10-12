# EFIS 2.0: Emergency Fund Intelligence System

Next-generation stochastic financial resilience, risk modeling, and liquidity stress testing platform.

---

## What's New in EFIS 2.0 vs 1.0

| Feature | EFIS 1.0 | EFIS 2.0 |
| :--- | :--- | :--- |
| **Backend Core** | Monolithic Flask app | **FastAPI (Asynchronous, Pydantic v2, Python 3.11+)** |
| **Simulation Engine** | Basic loop simulations | **Vectorized NumPy Monte Carlo (10,000+ paths in < 150ms)** |
| **Liquidity Modeling** | Single asset bucket | **Multi-Tier Cascade (Cash → High-Yield → FDs → Credit Line with penalty/tax friction)** |
| **Behavioral Dynamics** | Hardcoded step drop | **Continuous Sigmoid Lifestyle Deflation (Adaptive Panic Curve)** |
| **Anomaly Handling** | Outliers dropped silently | **Modified Z-Score / IQR + Human-in-the-Loop Audit Review Desk** |
| **Forecasting** | SARIMAX alone (prone to crashing) | **Adaptive Hierarchical Forecaster (Weighted MA / Holt-Linear / Seasonal AR)** |
| **AI Advisor** | Standalone RAG script | **Local Ollama Agent + Deterministic Fallback Rules Engine** |
| **Frontend** | Server-rendered Jinja2 templates | **Modern Next.js 15 SPA (React 19, TypeScript, Tailwind CSS)** |
| **Deployment** | Manual local execution | **Docker Multi-stage Builds, Docker Compose, GitHub Actions CI/CD** |

---

## One-Command Deployment (Docker Compose)

Spin up the entire platform (FastAPI backend, Next.js 15 frontend, PostgreSQL, and Redis):

```bash
docker compose up --build
```

- **Frontend Application:** [http://localhost:3000](http://localhost:3000)
- **Interactive Backend Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend API Base:** [http://localhost:8000/api/v1](http://localhost:8000/api/v1)

---

## Local Development Setup

### 1. Backend (FastAPI)
```bash
cd backend
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Run test suite:
```bash
cd backend
python -m pytest tests/
```

### 2. Frontend (Next.js 15)
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Architecture Overview

```
                      +------------------------------------------+
                      |         Next.js 15 Single-Page App       |
                      |  - Interactive Monte Carlo Probability   |
                      |  - Multi-Tier Liquidation Waterfall      |
                      |  - Real-time Stress-Test Gallery Desk    |
                      |  - Local AI Co-Pilot Advisor             |
                      +--------------------+---------------------+
                                           | HTTP / REST
                                           v
                      +--------------------+---------------------+
                      |         FastAPI Core Async Backend       |
                      |  - /api/v1/auth (OAuth2 JWT)             |
                      |  - /api/v1/assets (Multi-Tier Liquidity) |
                      |  - /api/v1/transactions (Ingestion)      |
                      |  - /api/v1/analytics (Rigidity/Forecast) |
                      |  - /api/v1/simulation (Monte Carlo)      |
                      |  - /api/v1/advisor (AI & Stress Gallery) |
                      +---------+----------+----------+----------+
                                |          |          |
            +-------------------+          |          +-------------------+
            v                              v                              v
     +--------------+               +--------------+               +--------------+
     |  PostgreSQL  |               |  Redis 7.2   |               | Local Ollama |
     | (asyncpg)    |               | Cache/Queues |               | / Fallback   |
     +--------------+               +--------------+               +--------------+
```
