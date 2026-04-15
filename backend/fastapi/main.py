"""
AgriUrbanAI FastAPI Backend
Environmental Prediction Microservice

This is the main entry point for the FastAPI application.
"""
import os
import sys
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AgriUrbanAI")

# Concurrency Control
MAX_CONCURRENT_PREDICTIONS = 10
prediction_semaphore = asyncio.Semaphore(MAX_CONCURRENT_PREDICTIONS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    from app.core.scheduler_engine import start_scheduler_engine
    start_scheduler_engine()
    logger.info("Starting AgriUrbanAI Microservice...")
    yield
    # Shutdown
    logger.info("Shutting down AgriUrbanAI Microservice...")

app = FastAPI(
    title="AgriUrbanAI Prediction Service",
    description="AI Microservice for Flood, Drought, Heatwave, and Weather Predictions",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health Check
@app.get("/health")
async def health_check():
    """
    Health check endpoint for readiness probes.
    Returns status and list of currently loaded models.
    """
    from app.core.model_loader import model_loader
    return {
        "status": "ok",
        "loaded_models": list(model_loader.loaded_models.keys()),
        "service": "AgriUrbanAI"
    }

# Import Routers
from app.routers import weather, flood, drought, heatwave, comprehensive, users

app.include_router(weather.router, prefix="/predict/weather", tags=["Weather"])
app.include_router(flood.router, prefix="/predict/flood", tags=["Flood"])
app.include_router(drought.router, prefix="/predict/drought", tags=["Drought"])
app.include_router(heatwave.router, prefix="/predict/heatwave", tags=["Heatwave"])
app.include_router(comprehensive.router, prefix="/predict/comprehensive", tags=["Comprehensive"])
app.include_router(users.router, prefix="/users", tags=["Users"])
from app.routers import fertilizer
app.include_router(fertilizer.router, prefix="/predict/fertilizer", tags=["Fertilizer"])
from app.routers import alert
app.include_router(alert.router, prefix="/alert", tags=["Alerts"])

# Raw AI predictions endpoint (bypasses schema validation)
from app.routers import weather_raw
app.include_router(weather_raw.router, prefix="/predict/weather", tags=["Weather Raw"])

# Integrated Flood Prediction (New)
from app.routers import flood_new
app.include_router(flood_new.router, prefix="/predict/flood", tags=["Flood Integrated"])

# Integrated Heatwave Prediction (New)
from app.routers import heatwave_new
app.include_router(heatwave_new.router, prefix="/predict/heatwave", tags=["Heatwave Integrated"])

# Integrated Drought Prediction (New)
from app.routers import drought_new
app.include_router(drought_new.router, prefix="/predict/drought", tags=["Drought Integrated"])

@app.get("/")
async def root():
    return {"message": "AgriUrbanAI Prediction Service is Running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
