from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models import User, SavingsAccount, UserRole
from schemas import UserCreate, UserResponse, LoginRequest, Token
from security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new account",
    description=(
        "Register an account and choose your role.\n\n"
        "**Role rules:**\n"
        "- `president` — auto-approved, can log in immediately. "
        "Only **one president** can exist at a time.\n"
        "- All other roles (`vice_president`, `secretary`, `accountant`, `member`) — "
        "require **President approval** before logging in.\n\n"
        "**Password requirements:** min 8 chars, uppercase, lowercase, digit, special character."
    ),
)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    requested_role = UserRole(user_data.role)

    # ── Uniqueness checks ──────────────────────────────────────────────────────
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    if db.query(User).filter(User.phone == user_data.phone).first():
        raise HTTPException(status_code=400, detail="Phone number already registered")

    # ── President uniqueness check ─────────────────────────────────────────────
    if requested_role == UserRole.PRESIDENT:
        if db.query(User).filter(User.role == UserRole.PRESIDENT).first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "A president account already exists. "
                    "Only one president is allowed. "
                    "Contact the current president to be assigned a role."
                ),
            )

    # ── Determine approval status ──────────────────────────────────────────────
    is_president  = requested_role == UserRole.PRESIDENT
    auto_approved = is_president

    new_user = User(
        firstname       = user_data.firstname,
        lastname        = user_data.lastname,
        phone           = user_data.phone,
        email           = user_data.email,
        hashed_password = hash_password(user_data.password),
        role            = requested_role,
        is_active       = auto_approved,
        is_approved     = auto_approved,
    )
    db.add(new_user)
    db.flush()

    db.add(SavingsAccount(user_id=new_user.id))
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post(
    "/login",
    response_model=Token,
    summary="Login to your account",
    description=(
        "Authenticate using your **email address** and password. "
        "Returns a JWT Bearer token.\n\n"
        "Note: accounts other than president must be approved before logging in."
    ),
)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval by the President. Please wait.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Please contact the President.",
        )

    access_token = create_access_token(data={"sub": str(user.id)})

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )
