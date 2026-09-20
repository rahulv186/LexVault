from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.api import evidence, auth, users, zk, cases
from app.core.config import settings
from app.db.database import get_db, SessionLocal
from app.db.seed import seed_iam

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="LEXVAULT - Privacy-Preserving Digital Evidence Management API",
    version="0.1.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router)
app.include_router(evidence.router)
app.include_router(users.router)
app.include_router(zk.router)
app.include_router(cases.router)

# Auto-seed IAM data on startup
@app.on_event("startup")
def startup_seed():
    try:
        seed_iam()
    except Exception as e:
        print(f"[startup] IAM seed skipped: {e}")

@app.get("/health", tags=["system"])
def health_check():
    return {"status": "ok", "service": "lexvault-api"}

@app.get("/health/db", tags=["system"])
def db_health_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "reachable"}
    except Exception as e:
        return {"status": "error", "database": "unreachable", "detail": str(e)}, 500

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
