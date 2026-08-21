from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.customer import Address, CustomerUpdate
from app.schemas.registration import RegistrationCreate
from app.services.customer_service import CustomerService
from app.services.storage_service import StorageService

router = APIRouter()


@router.post("", status_code=201)
def submit_registration(
    profile_photo: UploadFile | None = File(default=None),
    name: str = Form(...),
    mobile_number: str = Form(...),
    monthly_rent: float = Form(...),
    date_of_birth: str | None = Form(default=None),
    phone_number: str | None = Form(default=None),
    father_name: str | None = Form(default=None),
    father_occupation: str | None = Form(default=None),
    aadhaar_number: str | None = Form(default=None),
    room_number: str | None = Form(default=None),
    admission_date: str | None = Form(default=None),
    advance: float = Form(default=0),
    education: str | None = Form(default=None),
    qualification: str | None = Form(default=None),
    working_details: str | None = Form(default=None),
    company_organization: str | None = Form(default=None),
    work_address: str | None = Form(default=None),
    address: str = Form(default=""),
    city: str = Form(default=""),
    state: str = Form(default=""),
    pincode: str = Form(default=""),
) -> dict:
    service = CustomerService()
    customer = service.create_customer(
        RegistrationCreate(
            name=name,
            mobile_number=mobile_number,
            monthly_rent=monthly_rent,
            date_of_birth=date_of_birth,
            phone_number=phone_number,
            father_name=father_name,
            father_occupation=father_occupation,
            aadhaar_number=aadhaar_number,
            room_number=room_number,
            admission_date=admission_date,
            advance=advance,
            status="Active",
            education=education,
            qualification=qualification,
            working_details=working_details,
            company_organization=company_organization,
            work_address=work_address,
            permanent_address=Address(address=address, city=city, state=state, pincode=pincode),
        )
    )
    if profile_photo:
        try:
            url = StorageService().upload_customer_photo(customer["id"], profile_photo)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        customer = service.update_customer(customer["id"], CustomerUpdate(profile_photo_url=url))
    return {"message": "Registration submitted successfully", "customer": customer}
