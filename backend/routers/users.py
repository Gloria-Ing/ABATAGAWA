from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from dependencies import get_current_user
from models import User
from schemas import UserResponse

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get my profile",
    description="Returns the profile information of the currently authenticated user.",
)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
