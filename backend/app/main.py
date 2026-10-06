from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from .config import settings
from .routers import auth, collaboration, dashboard, projects, tasks, users

app = FastAPI(title="TaskFlow API", version="1.0.0", description="Projects, tasks, reviews and team collaboration.")
app.add_middleware(CORSMiddleware, allow_origins=list(settings.origins), allow_credentials=True,
                   allow_methods=["GET", "POST", "PUT", "DELETE"], allow_headers=["Authorization", "Content-Type"])


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "same-origin"
    response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Do not echo input values: validation failures may involve passwords.
    errors = [{"field": ".".join(map(str, e["loc"][1:])), "message": e["msg"]} for e in exc.errors()]
    return JSONResponse(status_code=422, content={"detail": "Please check the highlighted fields", "errors": errors})


@app.exception_handler(IntegrityError)
async def integrity_error(request, exc):
    return JSONResponse(status_code=409, content={"detail": "This change conflicts with existing data"})


@app.get("/api/health", tags=["System"])
def health():
    return {"status": "ok"}


for router in (auth.router, users.router, projects.router, tasks.router, collaboration.router, dashboard.router):
    app.include_router(router, prefix="/api")
