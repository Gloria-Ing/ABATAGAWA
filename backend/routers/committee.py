from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from dependencies import get_current_user, require_president, require_committee
from models import User, UserRole
from schemas import UserResponse, AssignRoleRequest, ApproveUserRequest, MessageResponse

router = APIRouter(prefix="/committee", tags=["Committee"])


@router.get(
    "/pending-members",
    response_model=List[UserResponse],
    summary="List pending member approvals (President only)",
    description=(
        "Returns all registered users who are waiting for account approval. "
        "Only the **President** can view and approve them."
    ),
)
def get_pending_members(
    president: User = Depends(require_president),
    db: Session = Depends(get_db),
):
    pending = (
        db.query(User)
        .filter(User.is_approved == False)
        .order_by(User.created_at.asc())
        .all()
    )
    return pending


@router.post(
    "/approve-member",
    response_model=UserResponse,
    summary="Approve a member account (President only)",
    description=(
        "The **President** approves a pending member. "
        "Once approved, the member can log in and use the platform."
    ),
)
def approve_member(
    body: ApproveUserRequest,
    president: User = Depends(require_president),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == str(body.user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This user is already approved.",
        )

    user.is_approved = True
    user.is_active   = True
    db.commit()
    db.refresh(user)
    return user


@router.post(
    "/reject-member",
    response_model=MessageResponse,
    summary="Reject / deactivate a member (President only)",
    description=(
        "The **President** rejects a pending member or deactivates an existing one."
    ),
)
def reject_member(
    body: ApproveUserRequest,
    president: User = Depends(require_president),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == str(body.user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.id == president.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account.",
        )

    user.is_approved = False
    user.is_active   = False
    db.commit()
    return MessageResponse(message=f"User '{user.username}' has been deactivated.")


@router.post(
    "/assign-role",
    response_model=UserResponse,
    summary="Assign a role to a member (President only)",
    description=(
        "The **President** assigns a committee role to a member.\n\n"
        "Available roles: `member`, `president`, `vice_president`, `secretary`, `accountant`\n\n"
        "Note: there should be only one person per committee role. "
        "The system does not enforce uniqueness — the President is responsible."
    ),
)
def assign_role(
    body: AssignRoleRequest,
    president: User = Depends(require_president),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == str(body.user_id)).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot assign a role to an inactive/unapproved user.",
        )

    user.role = UserRole(body.role)
    db.commit()
    db.refresh(user)
    return user


@router.get(
    "/members",
    response_model=List[UserResponse],
    summary="List all members (committee only)",
    description="Returns all registered and approved members. Accessible by any committee member.",
)
def list_all_members(
    current_user: User = Depends(require_committee),
    db: Session = Depends(get_db),
):
    members = db.query(User).order_by(User.created_at.asc()).all()
    return members


@router.get(
    "/committee-members",
    response_model=List[UserResponse],
    summary="List committee members",
    description="Returns all users who hold a committee role.",
)
def list_committee_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    committee_roles = [
        UserRole.PRESIDENT,
        UserRole.VICE_PRESIDENT,
        UserRole.SECRETARY,
        UserRole.ACCOUNTANT,
    ]
    members = (
        db.query(User)
        .filter(User.role.in_(committee_roles), User.is_active == True)
        .all()
    )
    return members
