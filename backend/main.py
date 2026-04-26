import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from database import engine, Base, upgrade_sqlite_schema
from routers import departments, positions, employees, attendance, salary, approvals, dashboard
from seed import seed

app = FastAPI(title="HRMS API", version="1.0.0")

# Create tables and seed data
Base.metadata.create_all(bind=engine)
upgrade_sqlite_schema()
seed()

# API routers
app.include_router(departments.router)
app.include_router(positions.router)
app.include_router(employees.router)
app.include_router(attendance.router)
app.include_router(salary.router)
app.include_router(approvals.router)
app.include_router(dashboard.router)

# Serve React static files
frontend_dist = os.environ.get(
    "HRMS_FRONTEND_DIST",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist"),
)
if os.path.isdir(frontend_dist):
    app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(frontend_dist, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(frontend_dist, "index.html"))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
