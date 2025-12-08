import os
import sys
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging

# Add parent directory to path to import existing AI modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("AgriUrbanAI")

# Concurrency Control
# Limit concurrent heavy predictions to avoid server crash
MAX_CONCURRENT_PREDICTIONS = 2
prediction_semaphore = asyncio.Semaphore(MAX_CONCURRENT_PREDICTIONS)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AgriUrbanAI Microservice...")
    # We don't load models here to ensure fast startup (Lazy Loading)
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
    from models.model_loader import model_loader
    return {
        "status": "ok",
        "loaded_models": list(model_loader.loaded_models.keys()),
        "service": "AgriUrbanAI"
    }

# Import Routers (Lazy import to avoid circular dependencies)
from routers import weather, flood, drought, heatwave, comprehensive

app.include_router(weather.router, prefix="/predict/weather", tags=["Weather"])
app.include_router(flood.router, prefix="/predict/flood", tags=["Flood"])
app.include_router(drought.router, prefix="/predict/drought", tags=["Drought"])
app.include_router(heatwave.router, prefix="/predict/heatwave", tags=["Heatwave"])
app.include_router(comprehensive.router, prefix="/predict/comprehensive", tags=["Comprehensive"])

@app.get("/")
async def root():
    return {"message": "AgriUrbanAI Prediction Service is Running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
