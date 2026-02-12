from fastapi import APIRouter, HTTPException, status

from ..schemas import UserCreate, UserRead
from ..security import hash_password, verify_password
from ..storage import create_user as storage_create_user
from ..storage import find_user_by_email as storage_find_user_by_email


router = APIRouter()


@router.post("/register", response_model=UserRead)
def register(payload: UserCreate):
    hashed = hash_password(payload.password)
    try:
        return storage_create_user(
            email=payload.email,
            hashed_password=hashed,
            full_name=payload.full_name,
        )
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email exists")


@router.post("/login", response_model=UserRead)
def login(payload: UserCreate):
    user = storage_find_user_by_email(payload.email)
    if not user or not verify_password(payload.password, user.get("hashed_password") or ""):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    return user  # Auth working correctly - returns user data


