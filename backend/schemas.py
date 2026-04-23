from __future__ import annotations

from typing import Optional
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field
from pydantic import ConfigDict


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserRead(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    is_admin: bool
    model_config = ConfigDict(from_attributes=True)


class CategoryCreate(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None


class CategoryRead(CategoryCreate):
    id: int
    model_config = ConfigDict(from_attributes=True)


class CompanyBase(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    slug: Optional[str] = Field(default=None, max_length=250)  # Auto-generated if not provided
    short_description: Optional[str] = Field(default=None, max_length=500)  # Krótki opis dla kart
    description: Optional[str] = Field(default=None, max_length=10000)  # Merged: Firma & Usługi (20-10,000 chars when required)
    offer: Optional[str] = Field(default=None, max_length=10000)  # Legacy separate offer/services field
    phone: Optional[str] = None
    whatsapp: Optional[str] = None  # WhatsApp number
    email: Optional[str] = None
    website: Optional[str] = None
    facebook: Optional[str] = None
    instagram: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    canton: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = "Switzerland"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category_id: Optional[int] = None
    tags: Optional[str] = None
    img: Optional[str] = None
    photos: Optional[list[str]] = None
    is_active: bool = True
    status: str = "draft"  # Changed from "published" to "draft"
    is_promoted: bool = False
    last_confirmed_at: Optional[datetime] = None  # Data utworzenia/ostatniego potwierdzenia
    last_confirmation_request_at: Optional[datetime] = None  # Data ostatniej wysłanej prośby o potwierdzenie


class CompanyCreate(CompanyBase):
    email: EmailStr  # Mandatory for creation, must be valid email


class CompanyUpdate(CompanyBase):
    name: Optional[str] = None  # Override to make optional for partial updates
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None


class CompanyRead(CompanyBase):
    id: int
    slug: str  # Required in read model
    owner_id: int
    is_active: bool
    is_verified: bool
    status: Optional[str] = "published"
    rating: Optional[float] = None  # Computed from reviews
    created_at: Optional[float] = None
    updated_at: Optional[float] = None
    views: int = 0
    clicks: int = 0
    model_config = ConfigDict(from_attributes=True)


class CompanyReadWithToken(CompanyRead):
    edit_token: str


class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    company_id: Optional[int] = None


class ReviewRead(ReviewCreate):
    id: int
    author_id: int
    company_id: int
    model_config = ConfigDict(from_attributes=True)


class ReportCreate(BaseModel):
    review_id: int
    reason: str


class ReportRead(ReportCreate):
    id: int
    created_at: float
    model_config = ConfigDict(from_attributes=True)

