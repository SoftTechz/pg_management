from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class InventoryItemCreate(BaseModel):
    name: str = Field(..., min_length=1)
    date: str
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    gstPercent: float = Field(default=0, ge=0)


class InventoryItemEntryCreate(BaseModel):
    date: str
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    gstPercent: float = Field(default=0, ge=0)


class InventoryItemQuantityAdjustmentCreate(BaseModel):
    date: str
    adjustmentType: str = Field(..., pattern="^(add|reduce)$")
    quantity: float = Field(..., gt=0)
    price: float = Field(..., gt=0)
    gstPercent: float = Field(default=0, ge=0)
    reason: str
    # remark: Optional[str] = None


class InventoryItemNameUpdate(BaseModel):
    name: str = Field(..., min_length=1)


class InventoryItemTemplateCreate(BaseModel):
    templateName: str = Field(..., min_length=1)
    medicines: list[dict] = Field(default_factory=list)


class InventoryItemTemplate(BaseModel):
    id: str
    templateName: str
    medicines: list[dict] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None


class InventoryItem(BaseModel):
    id: str
    name: str
    addedOn: Optional[str] = None
    lastAddedDate: Optional[str] = None
    presentQuantity: float = 0
    latestPrice: float = 0
    totalBill: float = 0
    history: list[dict]
    created_at: datetime
    updated_at: Optional[datetime] = None
