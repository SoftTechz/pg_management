from pydantic import BaseModel, Field, field_validator

from app.core.constants import CUSTOMER_STATUSES
from app.utils.validators import validate_aadhaar, validate_indian_phone


class Address(BaseModel):
    address: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""


class CustomerBase(BaseModel):
    name: str = Field(min_length=1)
    date_of_birth: str | None = None
    mobile_number: str = Field(min_length=10)
    phone_number: str | None = None
    father_name: str | None = None
    father_occupation: str | None = None
    aadhaar_number: str | None = None
    room_number: str | None = None
    admission_date: str | None = None
    advance: float = Field(default=0, ge=0)
    monthly_rent: float = Field(default=0, ge=0)
    status: str = "Active"
    education: str | None = None
    qualification: str | None = None
    working_details: str | None = None
    company_organization: str | None = None
    work_address: str | None = None
    permanent_address: Address = Field(default_factory=Address)
    profile_photo_url: str | None = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, value: str) -> str:
        if value not in CUSTOMER_STATUSES:
            raise ValueError("Invalid customer status")
        return value

    @field_validator("mobile_number", "phone_number")
    @classmethod
    def valid_phone(cls, value: str | None) -> str | None:
        if not validate_indian_phone(value):
            raise ValueError("Enter a valid 10 digit Indian phone number")
        return value

    @field_validator("aadhaar_number")
    @classmethod
    def valid_aadhaar(cls, value: str | None) -> str | None:
        if not validate_aadhaar(value):
            raise ValueError("Aadhaar must be 12 digits")
        return value


class CustomerCreate(CustomerBase):
    pass


class CustomerUpdate(BaseModel):
    name: str | None = None
    date_of_birth: str | None = None
    mobile_number: str | None = None
    phone_number: str | None = None
    father_name: str | None = None
    father_occupation: str | None = None
    aadhaar_number: str | None = None
    room_number: str | None = None
    admission_date: str | None = None
    advance: float | None = Field(default=None, ge=0)
    monthly_rent: float | None = Field(default=None, ge=0)
    status: str | None = None
    education: str | None = None
    qualification: str | None = None
    working_details: str | None = None
    company_organization: str | None = None
    work_address: str | None = None
    permanent_address: Address | None = None
    profile_photo_url: str | None = None


class Customer(CustomerBase):
    id: str
    created_at: str
    updated_at: str
