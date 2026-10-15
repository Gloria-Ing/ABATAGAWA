from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
from routers import auth, savings, loans, users, committee

# Create / migrate all database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ABATAGAWA API",
    description=(
        "## ABATAGAWA – Savings & Loan Management Platform\n\n"
        "### Roles & Permissions\n\n"
        "| Role | Permissions |\n"
        "|------|-------------|\n"
        "| **member** | Register, save money, request loans, view own data |\n"
        "| **president** | Approve/reject member accounts, assign roles, vote on loans |\n"
        "| **vice_president** | Vote on loans, view all members |\n"
        "| **secretary** | Vote on loans, view all members |\n"
        "| **accountant** | Vote on loans, view all members |\n\n"
        "### Loan Approval Flow\n\n"
        "A loan request is **approved** only when all 4 committee members "
        "(President, Vice President, Secretary, Accountant) vote **approved**. "
        "A single **rejected** vote immediately closes the request as rejected.\n\n"
        "### Account Activation Flow\n\n"
        "New accounts are **inactive** by default. The **President** must approve "
        "them before the member can log in.\n\n"
        "### Authentication\n"
        "Use `/api/v1/auth/login` to get a Bearer token, "
        "then click **Authorize** and enter: `Bearer <your_token>`"
    ),
    version="2.0.0",
    contact={"name": "ABATAGAWA Support", "email": "support@abatagawa.rw"},
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(auth.router,       prefix="/api/v1")
app.include_router(savings.router,    prefix="/api/v1")
app.include_router(loans.router,      prefix="/api/v1")
app.include_router(users.router,      prefix="/api/v1")
app.include_router(committee.router,  prefix="/api/v1")


@app.get("/", tags=["Health"], summary="Health check")
def root():
    return {
        "status": "ok",
        "message": "ABATAGAWA API v2.0 is running",
        "docs": "/docs",
    }
