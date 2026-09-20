from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.database import get_db
from app.db.models import Case, CaseMember, User
from app.services.case_service import case_service
from app.api.dependencies import get_current_user, require_permission
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import datetime

# Schemas
class CaseCreate(BaseModel):
    title: str
    description: Optional[str] = None

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None

class CaseMemberCreate(BaseModel):
    user_id: int
    role: str = "Member"

class CaseResponse(BaseModel):
    id: UUID
    case_number: str
    title: str
    description: Optional[str]
    status: str
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime]
    multisig_address: Optional[str] = None
    multisig_threshold: Optional[int] = None

    class Config:
        from_attributes = True

class MultisigConfig(BaseModel):
    address: str
    threshold: int

router = APIRouter(prefix="/api/cases", tags=["cases"])

@router.post("/", response_model=CaseResponse, status_code=status.HTTP_201_CREATED)
def create_case(
    payload: CaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("cases:create"))
):
    return case_service.create_case(db, payload.title, payload.description, current_user)

@router.get("/", response_model=List[CaseResponse])
def list_cases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return case_service.get_cases(db, current_user.id)

@router.get("/{case_id}/", response_model=CaseResponse)
def get_case(
    case_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Access Control: User must be a member of the case
    member = db.query(CaseMember).filter(
        CaseMember.case_id == case_id,
        CaseMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Access denied: Not a member of this case")

    case = case_service.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.patch("/{case_id}/", response_model=CaseResponse)
def update_case(
    case_id: UUID,
    payload: CaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        return case_service.update_case(db, case_id, payload.model_dump(exclude_unset=True), current_user)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{case_id}/members/", status_code=status.HTTP_201_CREATED)
def add_member(
    case_id: UUID,
    payload: CaseMemberCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Access Control: Only Lead members can add others
    member = db.query(CaseMember).filter(
        CaseMember.case_id == case_id,
        CaseMember.user_id == current_user.id
    ).first()
    if not member or member.role != "Lead":
        raise HTTPException(status_code=403, detail="Only a lead investigator can manage members")

    case = case_service.get_case_by_id(db, case_id)
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    # Corrected: Need to find the User object for the member being added
    user_to_add = db.query(User).filter(User.id == payload.user_id).first()
    if not user_to_add:
        raise HTTPException(status_code=404, detail="User not found")

    return case_service.add_member(db, case, user_to_add, payload.role)

@router.get("/{case_id}/members/")
def list_members(
    case_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Access Control: Must be a member
    member = db.query(CaseMember).filter(
        CaseMember.case_id == case_id,
        CaseMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Access denied")

    return db.query(CaseMember).filter(CaseMember.case_id == case_id).all()

@router.delete("/{case_id}/members/{user_id}")
def remove_member(
    case_id: UUID,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        case_service.remove_member(db, case_id, user_id, current_user)
        return {"detail": "Member removed successfully"}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{case_id}/multisig/", status_code=status.HTTP_200_OK)
def configure_multisig(
    case_id: UUID,
    payload: MultisigConfig,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Access Control: Only Lead members can configure multisig
    member = db.query(CaseMember).filter(
        CaseMember.case_id == case_id,
        CaseMember.user_id == current_user.id
    ).first()
    if not member or member.role != "Lead":
        raise HTTPException(status_code=403, detail="Only a lead investigator can configure multisig")

    try:
        case = case_service.update_multisig(db, case_id, payload.address, payload.threshold)
        return case
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
