import uuid
from sqlalchemy import Column, String, DateTime, Numeric, Boolean, Text, ForeignKey, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum

from database import Base


# ─── Enums ────────────────────────────────────────────────────────────────────

class UserRole(str, enum.Enum):
    MEMBER         = "member"
    PRESIDENT      = "president"
    VICE_PRESIDENT = "vice_president"
    SECRETARY      = "secretary"
    ACCOUNTANT     = "accountant"


class LoanStatus(str, enum.Enum):
    PENDING  = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REPAID   = "repaid"


class ApprovalVote(str, enum.Enum):
    APPROVED = "approved"
    REJECTED = "rejected"


# ─── Models ───────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    firstname       = Column(String(100), nullable=False)
    lastname        = Column(String(100), nullable=False)
    phone           = Column(String(20),  unique=True, nullable=False, index=True)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(SAEnum(UserRole, values_callable=lambda x: [e.value for e in x]), default=UserRole.MEMBER, nullable=False)
    # is_active: set to True by president approval; new accounts start False
    is_active       = Column(Boolean, default=False)
    is_approved     = Column(Boolean, default=False)  # president approval flag
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    savings         = relationship("SavingsAccount", back_populates="owner", uselist=False)
    loans           = relationship("Loan", back_populates="borrower")
    loan_approvals  = relationship("LoanApproval", back_populates="committee_member")


class SavingsAccount(Base):
    __tablename__ = "savings_accounts"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    balance    = Column(Numeric(15, 2), default=0.00, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner        = relationship("User", back_populates="savings")
    transactions = relationship("Transaction", back_populates="account")


class Transaction(Base):
    __tablename__ = "transactions"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    account_id       = Column(UUID(as_uuid=True), ForeignKey("savings_accounts.id"), nullable=False)
    amount           = Column(Numeric(15, 2), nullable=False)
    transaction_type = Column(String(20), nullable=False)  # deposit, withdrawal
    description      = Column(Text, nullable=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    account = relationship("SavingsAccount", back_populates="transactions")


class Loan(Base):
    __tablename__ = "loans"

    id                      = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id                 = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    amount                  = Column(Numeric(15, 2), nullable=False)
    purpose                 = Column(Text, nullable=True)
    status                  = Column(SAEnum(LoanStatus, values_callable=lambda x: [e.value for e in x]), default=LoanStatus.PENDING, nullable=False)
    interest_rate           = Column(Numeric(5, 2), default=5.00)
    repayment_period_months = Column(String(10), nullable=True)
    created_at              = Column(DateTime(timezone=True), server_default=func.now())
    updated_at              = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    borrower  = relationship("User", back_populates="loans")
    approvals = relationship("LoanApproval", back_populates="loan", cascade="all, delete-orphan")


class LoanApproval(Base):
    """Tracks each committee member's vote on a loan request.
    
    A loan is fully APPROVED when all 4 required roles have voted APPROVED.
    A single REJECTED vote immediately sets the loan to REJECTED.
    Required roles: president, vice_president, secretary, accountant
    """
    __tablename__ = "loan_approvals"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    loan_id             = Column(UUID(as_uuid=True), ForeignKey("loans.id"), nullable=False)
    committee_member_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    role                = Column(SAEnum(UserRole, values_callable=lambda x: [e.value for e in x]), nullable=False)
    vote                = Column(SAEnum(ApprovalVote, values_callable=lambda x: [e.value for e in x]), nullable=False)
    comment             = Column(Text, nullable=True)
    voted_at            = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    loan             = relationship("Loan", back_populates="approvals")
    committee_member = relationship("User", back_populates="loan_approvals")
