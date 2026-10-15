import re
from pydantic import BaseModel, EmailStr, Field, UUID4, field_validator
from typing import Optional, List
from datetime import datetime
from decimal import Decimal


# ─── Password strength validator ─────────────────────────────────────────────

def validate_password_strength(password: str) -> str:
    """
    Enforce strong password rules:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character (!@#$%^&*()_+-=[]{}|;':\",./<>?)
    """
    errors = []
    if len(password) < 8:
        errors.append("at least 8 characters")
    if not re.search(r"[A-Z]", password):
        errors.append("at least one uppercase letter (A-Z)")
    if not re.search(r"[a-z]", password):
        errors.append("at least one lowercase letter (a-z)")
    if not re.search(r"\d", password):
        errors.append("at least one digit (0-9)")
    if not re.search(r"[!@#$%^&*()\-_=+\[\]{}|;':\",./<>?]", password):
        errors.append("at least one special character (!@#$%^&*...)")
    if errors:
        raise ValueError("Password must contain: " + ", ".join(errors))
    return password


# ─── Auth / User Schemas ─────────────────────────────────────────────────────

class UserCreate(BaseModel):
    firstname: str      = Field(..., min_length=2, max_length=100, example="Jean")
    lastname:  str      = Field(..., min_length=2, max_length=100, example="Dupont")
    phone:     str      = Field(..., min_length=8, max_length=20,  example="+250788000000")
    email:     EmailStr = Field(..., example="jean@example.com")
    role:      str      = Field(
        ...,
        example="member",
        description=(
            "Role to register as. One of: member, president, vice_president, secretary, accountant. "
            "President accounts are auto-approved. All other roles require president approval."
        ),
    )
    password:  str      = Field(
        ...,
        min_length=8,
        example="MyP@ssw0rd!",
        description="Strong password: min 8 chars, uppercase, lowercase, digit, special character.",
    )

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        valid = {"member", "president", "vice_president", "secretary", "accountant"}
        if v.lower() not in valid:
            raise ValueError(f"role must be one of: {', '.join(sorted(valid))}")
        return v.lower()

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return validate_password_strength(v)


class UserResponse(BaseModel):
    id:          UUID4
    firstname:   str
    lastname:    str
    phone:       str
    email:       str
    role:        str
    is_active:   bool
    is_approved: bool
    created_at:  datetime

    model_config = {"from_attributes": True}


class UserSummary(BaseModel):
    """Lightweight user info used inside other responses."""
    id:        UUID4
    firstname: str
    lastname:  str
    role:      str

    model_config = {"from_attributes": True}


class LoginRequest(BaseModel):
    email:    EmailStr = Field(..., example="jean@example.com", description="Registered email address")
    password: str      = Field(..., example="MyP@ssw0rd!")


class Token(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserResponse


# ─── Savings Schemas ──────────────────────────────────────────────────────────

class SavingsAccountResponse(BaseModel):
    id:         UUID4
    user_id:    UUID4
    balance:    Decimal
    created_at: datetime

    model_config = {"from_attributes": True}


class DepositRequest(BaseModel):
    amount:      Decimal = Field(..., gt=0, example=5000.00)
    description: Optional[str] = Field(None, example="Monthly savings deposit")


class WithdrawalRequest(BaseModel):
    amount:      Decimal = Field(..., gt=0, example=2000.00)
    description: Optional[str] = Field(None, example="Emergency withdrawal")


class TransactionResponse(BaseModel):
    id:               UUID4
    account_id:       UUID4
    amount:           Decimal
    transaction_type: str
    description:      Optional[str]
    created_at:       datetime

    model_config = {"from_attributes": True}


# ─── Loan Schemas ─────────────────────────────────────────────────────────────

class LoanRequest(BaseModel):
    amount:                  Decimal = Field(..., gt=0, example=100000.00)
    purpose:                 Optional[str] = Field(None, example="Business capital")
    repayment_period_months: Optional[str] = Field(None, example="12")


class LoanApprovalResponse(BaseModel):
    id:                  UUID4
    loan_id:             UUID4
    committee_member_id: UUID4
    role:                str
    vote:                str
    comment:             Optional[str]
    voted_at:            datetime
    committee_member:    Optional[UserSummary] = None

    model_config = {"from_attributes": True}


class LoanResponse(BaseModel):
    id:                      UUID4
    user_id:                 UUID4
    amount:                  Decimal
    purpose:                 Optional[str]
    status:                  str
    interest_rate:           Decimal
    repayment_period_months: Optional[str]
    created_at:              datetime
    approvals:               List[LoanApprovalResponse] = []

    model_config = {"from_attributes": True}


# ─── Committee Schemas ────────────────────────────────────────────────────────

class LoanVoteRequest(BaseModel):
    vote:    str = Field(
        ...,
        example="approved",
        description="Must be 'approved' or 'rejected'"
    )
    comment: Optional[str] = Field(None, example="Member has good savings history")

    @field_validator("vote")
    @classmethod
    def validate_vote(cls, v: str) -> str:
        if v.lower() not in ("approved", "rejected"):
            raise ValueError("vote must be 'approved' or 'rejected'")
        return v.lower()


class AssignRoleRequest(BaseModel):
    user_id: UUID4 = Field(..., example="uuid-of-the-user")
    role:    str   = Field(
        ...,
        example="secretary",
        description="One of: member, president, vice_president, secretary, accountant"
    )

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        valid = {"member", "president", "vice_president", "secretary", "accountant"}
        if v.lower() not in valid:
            raise ValueError(f"role must be one of: {', '.join(valid)}")
        return v.lower()


class ApproveUserRequest(BaseModel):
    user_id: UUID4 = Field(..., example="uuid-of-the-pending-user")


# ─── Generic ──────────────────────────────────────────────────────────────────

class MessageResponse(BaseModel):
    message: str
