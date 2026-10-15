from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from dependencies import get_current_user
from models import User, SavingsAccount, Transaction
from schemas import (
    SavingsAccountResponse,
    DepositRequest,
    WithdrawalRequest,
    TransactionResponse,
    MessageResponse,
)

router = APIRouter(prefix="/savings", tags=["Savings"])


@router.get(
    "/",
    response_model=SavingsAccountResponse,
    summary="Get my savings account",
    description="Returns the authenticated user's savings account balance and details.",
)
def get_savings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    account = db.query(SavingsAccount).filter(SavingsAccount.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings account not found")
    return account


@router.post(
    "/deposit",
    response_model=SavingsAccountResponse,
    summary="Deposit money",
    description="Add funds to your savings account.",
)
def deposit(
    body: DepositRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = db.query(SavingsAccount).filter(SavingsAccount.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings account not found")

    account.balance += body.amount

    txn = Transaction(
        account_id=account.id,
        amount=body.amount,
        transaction_type="deposit",
        description=body.description,
    )
    db.add(txn)
    db.commit()
    db.refresh(account)
    return account


@router.post(
    "/withdraw",
    response_model=SavingsAccountResponse,
    summary="Withdraw money",
    description="Withdraw funds from your savings account. Balance cannot go below zero.",
)
def withdraw(
    body: WithdrawalRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = db.query(SavingsAccount).filter(SavingsAccount.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings account not found")

    if account.balance < body.amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance. Available: {account.balance}",
        )

    account.balance -= body.amount

    txn = Transaction(
        account_id=account.id,
        amount=body.amount,
        transaction_type="withdrawal",
        description=body.description,
    )
    db.add(txn)
    db.commit()
    db.refresh(account)
    return account


@router.get(
    "/transactions",
    response_model=List[TransactionResponse],
    summary="Transaction history",
    description="Get all transactions for the authenticated user's savings account.",
)
def get_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    account = db.query(SavingsAccount).filter(SavingsAccount.user_id == current_user.id).first()
    if not account:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Savings account not found")

    transactions = (
        db.query(Transaction)
        .filter(Transaction.account_id == account.id)
        .order_by(Transaction.created_at.desc())
        .all()
    )
    return transactions
