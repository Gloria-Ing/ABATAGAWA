from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from security import decode_access_token
from models import User, UserRole

bearer_scheme = HTTPBearer()

# Committee roles that can vote on loans
COMMITTEE_ROLES = {
    UserRole.PRESIDENT,
    UserRole.VICE_PRESIDENT,
    UserRole.SECRETARY,
    UserRole.ACCOUNTANT,
}

# All four roles required for a loan to be fully approved
REQUIRED_APPROVER_ROLES: List[UserRole] = [
    UserRole.PRESIDENT,
    UserRole.VICE_PRESIDENT,
    UserRole.SECRETARY,
    UserRole.ACCOUNTANT,
]


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate the JWT token, return the authenticated user."""
    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing user identifier",
        )

    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active. Awaiting president approval.",
        )

    return user


def require_role(*roles: UserRole):
    """Dependency factory — restricts endpoint access to specific roles."""
    def _check(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            role_names = ", ".join(r.value for r in roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {role_names}",
            )
        return current_user
    return _check


def require_committee(current_user: User = Depends(get_current_user)) -> User:
    """Restricts access to committee members only (any of the 4 roles)."""
    if current_user.role not in COMMITTEE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Committee members only.",
        )
    return current_user


def require_president(current_user: User = Depends(get_current_user)) -> User:
    """Restricts access to the president only."""
    if current_user.role != UserRole.PRESIDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. President only.",
        )
    return current_user
