from fastapi import APIRouter, status

from ..schemas import ReportCreate, ReportRead
from ..storage import create_report as storage_create_report
from ..storage import list_reports as storage_list_reports


router = APIRouter()


@router.get("/", response_model=list[ReportRead])
def list_reports():
  return storage_list_reports()


@router.post("/", response_model=ReportRead, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreate):
  report = storage_create_report(payload.dict())
  return report


