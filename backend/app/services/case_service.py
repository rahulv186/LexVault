from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.models import Case, CaseMember, User, Evidence, CustodyEvent
from app.services.custody_service import custody_service
from app.core.config import settings
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import uuid

class CaseService:
    def create_case(self, db: Session, title: str, description: str, created_by: User) -> Case:
        # Generate a human-readable case number
        # Simplified for prototype: CASE-YYYY-XXXX
        year = datetime.now().year
        case_number = f"CASE-{year}-{uuid.uuid4().hex[:6].upper()}"

        new_case = Case(
            case_number=case_number,
            title=title,
            description=description,
            created_by=created_by.id,
            status="OPEN"
        )

        db.add(new_case)
        db.commit()
        db.refresh(new_case)

        # Add creator as Lead member
        self.add_member(db, new_case, created_by, role="Lead")

        # Create custody event
        custody_service.create_event(
            db,
            evidence=None,
            case_id=new_case.id,
            event_type="CASE_CREATED",
            actor=created_by.username,
            description=f"Case {case_number} created by {created_by.username}"
        )

        return new_case

    def get_cases(self, db: Session, user_id: int) -> List[Case]:
        """Returns cases the user is a member of."""
        return db.query(Case).join(CaseMember).filter(CaseMember.user_id == user_id).all()

    def get_case_by_id(self, db: Session, case_id: uuid.UUID) -> Optional[Case]:
        return db.query(Case).filter(Case.id == case_id).first()

    def update_case(self, db: Session, case_id: uuid.UUID, updates: Dict[str, Any], actor: User) -> Case:
        case = self.get_case_by_id(db, case_id)
        if not case:
            raise ValueError("Case not found")

        # Check if actor is a Lead member
        member = db.query(CaseMember).filter(
            CaseMember.case_id == case_id,
            CaseMember.user_id == actor.id
        ).first()

        if not member or member.role != "Lead":
            raise PermissionError("Only a Lead investigator can modify case details")

        for key, value in updates.items():
            setattr(case, key, value)

        if "status" in updates:
            custody_service.create_event(
                db,
                evidence=None,
                case_id=case.id,
                event_type="CASE_STATUS_UPDATED",
                actor=actor.username,
                description=f"Case status updated to {updates['status']}"
            )

        db.commit()
        db.refresh(case)
        return case

    def add_member(self, db: Session, case: Case, user: User, role: str = "Member") -> CaseMember:
        member = CaseMember(
            case_id=case.id,
            user_id=user.id,
            role=role
        )
        db.add(member)
        db.commit()
        db.refresh(member)

        custody_service.create_event(
            db,
            evidence=None,
            case_id=case.id,
            event_type="CASE_MEMBER_ASSIGNED",
            actor="System",
            description=f"User {user.username} assigned to case {case.case_number} as {role}"
        )

        return member

    def remove_member(self, db: Session, case_id: uuid.UUID, user_id: int, actor: User):
        member = db.query(CaseMember).filter(
            CaseMember.case_id == case_id,
            CaseMember.user_id == user_id
        ).first()

        if not member:
            raise ValueError("Member not found in case")

        # Prevent removing self if Lead (simplified)
        if member.user_id == actor.id and member.role == "Lead":
            raise ValueError("Lead investigator cannot be removed without assigning a new lead")

        db.delete(member)
        db.commit()

        custody_service.create_event(
            db,
            evidence=None,
            case_id=case_id,
            event_type="CASE_MEMBER_REMOVED",
            actor=actor.username,
            description=f"User {user_id} removed from case"
        )

    def update_multisig(self, db: Session, case_id: uuid.UUID, address: str, threshold: int) -> Case:
        case = self.get_case_by_id(db, case_id)
        if not case:
            raise ValueError("Case not found")

        case.multisig_address = address
        case.multisig_threshold = threshold

        db.commit()
        db.refresh(case)

        # Log the configuration change in custody events
        custody_service.create_event(
            db,
            evidence=None,
            case_id=case.id,
            event_type="CASE_MULTISIG_CONFIGURED",
            actor="System",
            description=f"Multisig configured: Address {address}, Threshold {threshold}"
        )

        return case

case_service = CaseService()
