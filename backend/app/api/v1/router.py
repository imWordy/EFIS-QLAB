from fastapi import APIRouter
from app.api.v1 import auth, assets, transactions, analytics

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(assets.router)
api_router.include_router(transactions.router)
api_router.include_router(analytics.router)

