from pydantic import BaseModel, Field


class AllocationCreate(BaseModel):
    customer_id: str
    room_id: str
    bed_number: int = Field(gt=0)
    start_date: str | None = None


class Allocation(BaseModel):
    id: str
    customer_id: str
    customer_name: str | None = None
    room_id: str
    room_number: str | None = None
    bed_number: int
    status: str
    start_date: str | None = None
    end_date: str | None = None
    created_at: str
    updated_at: str
