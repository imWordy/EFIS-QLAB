# EFIS 2.0: Emergency Fund Intelligence System
Next-generation stochastic financial resilience and emergency fund stress-testing platform.

## Architecture Highlights
- **Backend:** FastAPI (Asynchronous Python 3.11+, Pydantic v2, SQLAlchemy 2.0 Async, SQLite/PostgreSQL)
- **Security:** OAuth2 password bearer flow with JWT authentication and Argon2 / BCrypt password hashing
- **Multi-Tier Liquidity Cascade:** Models liquid cash, high-yield accounts, fixed deposits (with break penalties), liquid mutual funds (with capital gains haircuts), and credit lines
- **Data Ingestion:** Resilient bank statement parsing with automatic column normalization and statistical shock detection
- **Simulation & ML (Phases 2 & 3):** Vectorized Monte Carlo engine, dynamic lifestyle deflation (Panic Mode), and adaptive time-series forecasting

---

## Getting Started (Backend)

### Prerequisites
- Python 3.10+
- (Optional) Docker

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the FastAPI Development Server
```bash
uvicorn app.main:app --reload --port 8000
```
Visit the interactive Swagger UI at: [http://localhost:8000/docs](http://localhost:8000/docs)
