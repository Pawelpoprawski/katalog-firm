# POWIĄZANIA
# Cel: lista i tworzenie kategorii.
# Przy zmianie: KONSUMENT ZEWNĘTRZNY: portal web/src/lib/katalog.ts (GET /categories/).
# AUTO używany przez: backend/main.py, backend/routers/__init__.py
# AUTO wywoływany z: [web] src/lib/katalog.ts, backend/main.py, frontend/src/app/admin/components/AdminCategories.tsx, frontend/src/app/admin/page.tsx, frontend/src/app/categories/[slug]/page.tsx, frontend/src/app/dodaj/page.tsx, frontend/src/app/edycja/[token]/page.tsx, frontend/src/app/firma/[slug]/CompanyPageClient.tsx (+5, pełna lista: POWIAZANIA.md)
# AUTO endpoint: GET /categories/, POST /categories/
# /POWIĄZANIA
from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..schemas import CategoryCreate, CategoryRead
from ..storage import create_category as storage_create_category
from ..storage import list_categories as storage_list_categories
from ..security_middleware import limiter


router = APIRouter()


@router.get("/", response_model=list[CategoryRead])
def list_categories():
    return storage_list_categories()


@router.post("/", response_model=CategoryRead, status_code=status.HTTP_201_CREATED)
@limiter.limit("10/hour")
def create_category(request: Request, payload: CategoryCreate):
    try:
        return storage_create_category(payload.dict())
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Slug exists")


