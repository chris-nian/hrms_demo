from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from models import Offer, Candidate, Position
from schemas import OfferCreate, OfferUpdate, OfferOut, OfferStatusUpdate
from services.hiring_service import validate_offer_creation, validate_offer_status_transition

router = APIRouter(prefix="/api/offers", tags=["offers"])


def _to_out(offer: Offer, db: Session) -> OfferOut:
    pos = db.query(Position).filter(Position.id == offer.position_id).first()
    return OfferOut(
        id=offer.id,
        candidate_id=offer.candidate_id,
        position_id=offer.position_id,
        position_title=pos.title if pos else "",
        base_salary=offer.base_salary,
        bonus=offer.bonus,
        proposed_start_date=offer.proposed_start_date,
        employment_type=offer.employment_type,
        work_location=offer.work_location,
        status=offer.status,
        sent_at=offer.sent_at,
        responded_at=offer.responded_at,
        notes=offer.notes,
        created_at=offer.created_at,
        updated_at=offer.updated_at,
    )


@router.get("/candidate/{candidate_id}", response_model=dict)
def list_offers(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    offers = db.query(Offer).filter(Offer.candidate_id == candidate_id).order_by(Offer.created_at.desc()).all()
    return {"total": len(offers), "items": [_to_out(o, db) for o in offers]}


@router.post("/candidate/{candidate_id}", response_model=OfferOut)
def create_offer(candidate_id: int, data: OfferCreate, db: Session = Depends(get_db)):
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    validate_offer_creation(candidate)
    if data.position_id:
        pos = db.query(Position).filter(Position.id == data.position_id).first()
        if not pos:
            raise HTTPException(400, "Position not found")
    offer = Offer(
        candidate_id=candidate_id,
        position_id=data.position_id,
        base_salary=data.base_salary,
        bonus=data.bonus,
        proposed_start_date=data.proposed_start_date,
        employment_type=data.employment_type,
        work_location=data.work_location,
        status="draft",
        notes=data.notes,
    )
    db.add(offer)
    db.commit()
    db.refresh(offer)
    return _to_out(offer, db)


@router.put("/{offer_id}", response_model=OfferOut)
def update_offer(offer_id: int, data: OfferUpdate, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(404, "Offer not found")
    if data.position_id is not None:
        pos = db.query(Position).filter(Position.id == data.position_id).first()
        if not pos:
            raise HTTPException(400, "Position not found")
    for key, value in data.model_dump().items():
        if value is not None:
            setattr(offer, key, value)
    db.commit()
    db.refresh(offer)
    return _to_out(offer, db)


@router.put("/{offer_id}/status", response_model=OfferOut)
def update_offer_status(offer_id: int, data: OfferStatusUpdate, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(404, "Offer not found")
    validate_offer_status_transition(offer, data.status)

    old_status = offer.status
    offer.status = data.status

    if data.status == "sent":
        offer.sent_at = datetime.utcnow()
    elif data.status in ("accepted", "rejected"):
        offer.responded_at = datetime.utcnow()

    # Auto-update candidate stage
    candidate = db.query(Candidate).filter(Candidate.id == offer.candidate_id).first()
    if candidate:
        if data.status == "accepted":
            candidate.stage = "offer_accepted"
            candidate.current_stage_entered_at = datetime.utcnow()
        elif data.status == "rejected":
            candidate.stage = "rejected"
            candidate.rejection_reason = data.reason or "Offer rejected"
            candidate.current_stage_entered_at = datetime.utcnow()

    db.commit()
    db.refresh(offer)
    return _to_out(offer, db)


@router.delete("/{offer_id}")
def delete_offer(offer_id: int, db: Session = Depends(get_db)):
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise HTTPException(404, "Offer not found")
    db.delete(offer)
    db.commit()
    return {"ok": True}
