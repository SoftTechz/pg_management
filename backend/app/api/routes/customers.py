from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.customer import Address, Customer, CustomerCreate, CustomerUpdate
from app.services.customer_service import CustomerService
from app.services.storage_service import StorageService

router = APIRouter()


@router.get("", response_model=list[Customer])
def list_customers(search: str | None = None, status: str | None = None) -> list[dict]:
    return CustomerService().list_customers(search=search, status=status)


@router.get("/{customer_id}", response_model=Customer)
def get_customer(customer_id: str) -> dict:
    return CustomerService().get_customer(customer_id)


@router.post("", response_model=Customer, status_code=201)
def create_customer(payload: CustomerCreate) -> dict:
    return CustomerService().create_customer(payload)


@router.post("/with-photo", response_model=Customer, status_code=201)
def create_customer_with_photo(
    profile_photo: UploadFile | None = File(default=None),
    name: str = Form(...),
    mobile_number: str = Form(...),
    monthly_rent: float = Form(default=0),
    date_of_birth: str | None = Form(default=None),
    phone_number: str | None = Form(default=None),
    father_name: str | None = Form(default=None),
    father_occupation: str | None = Form(default=None),
    aadhaar_number: str | None = Form(default=None),
    room_number: str | None = Form(default=None),
    admission_date: str | None = Form(default=None),
    advance: float = Form(default=0),
    status: str = Form(default="Active"),
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
        CustomerCreate(
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
            status=status,
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
    return customer


@router.put("/{customer_id}", response_model=Customer)
def update_customer(customer_id: str, payload: CustomerUpdate) -> dict:
    return CustomerService().update_customer(customer_id, payload)


@router.delete("/{customer_id}", status_code=204)
def delete_customer(customer_id: str) -> None:
    CustomerService().delete_customer(customer_id)
