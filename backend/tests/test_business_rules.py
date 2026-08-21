import pytest

from app.schemas.allocation import AllocationCreate
from app.schemas.customer import CustomerCreate, CustomerUpdate
from app.schemas.payment import PaymentCreate
from app.schemas.room import RoomCreate
from app.services.allocation_service import AllocationService
from app.services.auth_service import AuthService
from app.services.customer_service import CustomerService
from app.services.dashboard_service import DashboardService
from app.services.excel_service import ExcelService
from app.services.payment_service import PaymentService, calculate_payment_status
from app.services.repository import MemoryRepository
from app.services.room_service import RoomService


def customer_payload(name="Rahul Sharma", rent=8000):
    return CustomerCreate(name=name, mobile_number="9876543210", monthly_rent=rent, status="Active")


@pytest.fixture()
def repo():
    return MemoryRepository()


def test_owner_pin_validation(repo):
    auth = AuthService(repo)
    assert auth.validate_pin("1234")
    auth.update_pin("4321")
    assert auth.validate_pin("4321")
    assert not auth.validate_pin("1234")


def test_firebase_login_pin_collection(repo):
    auth = AuthService(repo)
    repo.set("Login-auth-pin-1234", "owner", {"pin": "2468"})
    assert auth.validate_pin("2468")
    assert not auth.validate_pin("1234")


def test_customer_creation_retrieval_and_update(repo):
    service = CustomerService(repo)
    created = service.create_customer(customer_payload())
    assert created["id"]
    assert service.get_customer(created["id"])["name"] == "Rahul Sharma"
    updated = service.update_customer(created["id"], CustomerUpdate(status="Notice Period"))
    assert updated["status"] == "Notice Period"


def test_room_creation_and_allocation(repo):
    customers = CustomerService(repo)
    rooms = RoomService(repo)
    allocation_service = AllocationService(repo)

    customer = customers.create_customer(customer_payload())
    room = rooms.create_room(RoomCreate(room_number="101", floor="1", total_beds=1))
    allocation = allocation_service.allocate(AllocationCreate(customer_id=customer["id"], room_id=room["id"], bed_number=1))

    assert allocation["room_number"] == "101"
    refreshed_room = rooms.get_room(room["id"])
    assert refreshed_room["occupied_beds"] == 1
    assert refreshed_room["available_beds"] == 0
    assert customers.get_customer(customer["id"])["room_number"] == "101"


def test_prevent_over_allocation(repo):
    customers = CustomerService(repo)
    rooms = RoomService(repo)
    allocation_service = AllocationService(repo)

    room = rooms.create_room(RoomCreate(room_number="101", floor="1", total_beds=1))
    first = customers.create_customer(customer_payload("Rahul Sharma", 8000))
    second = customers.create_customer(customer_payload("Amit Kumar", 7500))

    allocation_service.allocate(AllocationCreate(customer_id=first["id"], room_id=room["id"], bed_number=1))
    with pytest.raises(Exception):
        allocation_service.allocate(AllocationCreate(customer_id=second["id"], room_id=room["id"], bed_number=1))


def test_payment_status_calculation():
    assert calculate_payment_status(8000, 8000) == (0, "Paid")
    assert calculate_payment_status(8000, 3000) == (5000, "Partially Paid")
    assert calculate_payment_status(8000, 0) == (8000, "Unpaid")
    with pytest.raises(ValueError):
        calculate_payment_status(8000, 9000)


def test_payment_creation_and_dashboard_outstanding(repo):
    customer_service = CustomerService(repo)
    payment_service = PaymentService(repo)
    dashboard_service = DashboardService(repo)

    customer = customer_service.create_customer(customer_payload())
    payment = payment_service.create_payment(
        PaymentCreate(
            customer_id=customer["id"],
            month="2026-08",
            monthly_rent=8000,
            amount_paid=3000,
            payment_method="Cash",
        )
    )

    assert payment["remaining_amount"] == 5000
    assert payment["payment_status"] == "Partially Paid"

    summary = dashboard_service.summary(month="2026-08")
    assert summary["expected_monthly_rent"] == 8000
    assert summary["collected_monthly_rent"] == 3000
    assert summary["pending_monthly_rent"] == 5000
    assert summary["partial_customers"] == 1


def test_outstanding_rent_for_missing_payment(repo):
    customer_service = CustomerService(repo)
    dashboard_service = DashboardService(repo)

    customer_service.create_customer(customer_payload())
    summary = dashboard_service.summary(month="2026-08")

    assert summary["unpaid_customers"] == 1
    assert summary["pending_monthly_rent"] == 8000


def test_excel_report_generation():
    content = ExcelService().build_workbook(
        "Customers",
        [{"name": "Rahul Sharma", "monthly_rent": 8000}],
        [("Name", "name"), ("Rent", "monthly_rent")],
    )
    assert content.startswith(b"PK")
    assert len(content) > 1000
