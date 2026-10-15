from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from dependencies import get_current_user, require_committee, REQUIRED_APPROVER_ROLES
from models import User, Loan, LoanStatus, LoanApproval, ApprovalVote, UserRole
from schemas import LoanRequest, LoanResponse, LoanVoteRequest, MessageResponse

router = APIRouter(prefix="/loans", tags=["Loans"])


@router.post(
    "/request",
    response_model=LoanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Request a loan",
    description=(
        "Submit a loan request. It starts as **pending** and requires approval from "
        "all 4 committee members: President, Vice President, Secretary, and Accountant."
    ),
)
def request_loan(
    body: LoanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    loan = Loan(
        user_id                 = current_user.id,
        amount                  = body.amount,
        purpose                 = body.purpose,
        repayment_period_months = body.repayment_period_months,
        status                  = LoanStatus.PENDING,
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return loan


@router.get(
    "/",
    response_model=List[LoanResponse],
    summary="My loans",
    description="Get all loan requests made by the authenticated user.",
)
def get_my_loans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    loans = (
        db.query(Loan)
        .filter(Loan.user_id == current_user.id)
        .order_by(Loan.created_at.desc())
        .all()
    )
    return loans


@router.get(
    "/pending",
    response_model=List[LoanResponse],
    summary="All pending loans (committee only)",
    description=(
        "Returns all loans currently pending a vote. "
        "Accessible only by committee members."
    ),
)
def get_pending_loans(
    current_user: User = Depends(require_committee),
    db: Session = Depends(get_db),
):
    loans = (
        db.query(Loan)
        .filter(Loan.status == LoanStatus.PENDING)
        .order_by(Loan.created_at.asc())
        .all()
    )
    return loans


@router.get(
    "/all",
    response_model=List[LoanResponse],
    summary="All loans (committee only)",
    description="Returns every loan in the system. Committee members only.",
)
def get_all_loans(
    current_user: User = Depends(require_committee),
    db: Session = Depends(get_db),
):
    loans = (
        db.query(Loan)
        .order_by(Loan.created_at.desc())
        .all()
    )
    return loans


@router.post(
    "/{loan_id}/vote",
    response_model=LoanResponse,
    summary="Vote on a loan (committee only)",
    description=(
        "A committee member casts their vote (**approved** or **rejected**) on a loan.\n\n"
        "Rules:\n"
        "- Each committee member can only vote **once** per loan\n"
        "- A single **rejected** vote immediately sets the loan to **rejected**\n"
        "- The loan is **approved** only when all 4 roles have voted approved:\n"
        "  President, Vice President, Secretary, Accountant"
    ),
)
def vote_on_loan(
    loan_id: str,
    body: LoanVoteRequest,
    current_user: User = Depends(require_committee),
    db: Session = Depends(get_db),
):
    # Fetch loan
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found")

    if loan.status != LoanStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Loan is already '{loan.status}' and cannot be voted on.",
        )

    # Prevent a member from voting on their own loan
    if loan.user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot vote on your own loan request.",
        )

    # Check if this committee member has already voted
    existing_vote = (
        db.query(LoanApproval)
        .filter(
            LoanApproval.loan_id == loan.id,
            LoanApproval.committee_member_id == current_user.id,
        )
        .first()
    )
    if existing_vote:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"You have already voted '{existing_vote.vote}' on this loan.",
        )

    # Record the vote
    approval = LoanApproval(
        loan_id             = loan.id,
        committee_member_id = current_user.id,
        role                = current_user.role,
        vote                = ApprovalVote.APPROVED if body.vote == "approved" else ApprovalVote.REJECTED,
        comment             = body.comment,
    )
    db.add(approval)
    db.flush()

    # ── Determine new loan status ──────────────────────────────────────────
    # If this vote is REJECTED → immediately reject the loan
    if body.vote == "rejected":
        loan.status = LoanStatus.REJECTED
    else:
        # Check if all 4 required roles have now voted APPROVED
        approved_votes = (
            db.query(LoanApproval)
            .filter(
                LoanApproval.loan_id == loan.id,
                LoanApproval.vote    == ApprovalVote.APPROVED,
            )
            .all()
        )
        roles_approved = {v.role for v in approved_votes}
        required_roles = set(REQUIRED_APPROVER_ROLES)

        if required_roles.issubset(roles_approved):
            loan.status = LoanStatus.APPROVED

    db.commit()
    db.refresh(loan)
    return loan


@router.get(
    "/{loan_id}",
    response_model=LoanResponse,
    summary="Get loan details",
    description=(
        "Get details of a specific loan including all committee votes. "
        "Members can only view their own loans; committee can view any."
    ),
)
def get_loan(
    loan_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Loan not found")

    # Members can only view their own loans
    from dependencies import COMMITTEE_ROLES
    if current_user.role not in COMMITTEE_ROLES and loan.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return loan
