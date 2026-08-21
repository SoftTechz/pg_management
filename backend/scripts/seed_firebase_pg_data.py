from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from app.schemas.allocation import AllocationCreate
from app.schemas.customer import Address, CustomerCreate, CustomerUpdate
from app.schemas.room import RoomCreate, RoomUpdate
from app.services.allocation_service import AllocationService
from app.services.auth_service import FIREBASE_PIN_COLLECTION, AuthService
from app.services.customer_service import CustomerService
from app.services.repository import FirestoreRepository
from app.services.room_service import RoomService
from app.utils.dates import utc_now_iso


PIN = "1234"

ROOMS = [
    {"room_number": "501", "floor": "5", "total_beds": 3},
    {"room_number": "502", "floor": "5", "total_beds": 3},
    {"room_number": "503", "floor": "5", "total_beds": 2},
    {"room_number": "504", "floor": "5", "total_beds": 3},
    {"room_number": "505", "floor": "5", "total_beds": 3},
]

CUSTOMERS = [
    ("Arjun Reddy", "9876500001", 8500),
    ("Karthik Nair", "9876500002", 8500),
    ("Vikram Rao", "9876500003", 8500),
    ("Nikhil Kumar", "9876500004", 8200),
    ("Rohan Sharma", "9876500005", 8200),
    ("Sandeep Gowda", "9876500006", 8200),
    ("Manoj Patel", "9876500007", 9000),
    ("Akash Verma", "9876500008", 9000),
    ("Pranav Menon", "9876500009", 8300),
    ("Aditya Singh", "9876500010", 8300),
    ("Rahul Joshi", "9876500011", 8300),
    ("Siddharth Jain", "9876500012", 8400),
    ("Deepak Iyer", "9876500013", 8400),
    ("Harish Bhat", "9876500014", 8400),
    ("Mohan Das", "9876500015", 8000),
]

ALLOCATIONS = [
    ("9876500001", "501", 1),
    ("9876500002", "501", 2),
    ("9876500003", "501", 3),
    ("9876500004", "502", 1),
    ("9876500005", "502", 2),
    ("9876500006", "502", 3),
    ("9876500007", "503", 1),
    ("9876500008", "503", 2),
    ("9876500009", "504", 1),
    ("9876500010", "504", 2),
    ("9876500011", "504", 3),
    ("9876500012", "505", 1),
    ("9876500013", "505", 2),
    ("9876500014", "505", 3),
]


def find_one(repo: FirestoreRepository, collection: str, field: str, value: str) -> dict | None:
    return next((item for item in repo.list(collection) if item.get(field) == value), None)


def upsert_rooms(repo: FirestoreRepository) -> dict[str, dict]:
    service = RoomService(repo)
    rooms_by_number: dict[str, dict] = {}
    for room_data in ROOMS:
        existing = find_one(repo, "rooms", "room_number", room_data["room_number"])
        if existing:
            room = service.update_room(
                existing["id"],
                RoomUpdate(
                    floor=room_data["floor"],
                    total_beds=room_data["total_beds"],
                    status="Available",
                ),
            )
        else:
            room = service.create_room(RoomCreate(**room_data))
        rooms_by_number[room["room_number"]] = room
    return rooms_by_number


def upsert_customers(repo: FirestoreRepository) -> dict[str, dict]:
    service = CustomerService(repo)
    customers_by_mobile: dict[str, dict] = {}
    for index, (name, mobile, rent) in enumerate(CUSTOMERS, start=1):
        payload = {
            "name": name,
            "mobile_number": mobile,
            "father_name": f"{name.split()[0]} Father",
            "admission_date": "2026-08-19",
            "advance": 5000,
            "monthly_rent": rent,
            "status": "Active",
            "education": "Graduate",
            "qualification": "Bachelors",
            "working_details": "Private employee",
            "company_organization": f"Company {index}",
            "work_address": "Bengaluru",
            "permanent_address": Address(
                address=f"House {index}, Main Road",
                city="Bengaluru",
                state="Karnataka",
                pincode="560001",
            ),
        }
        existing = find_one(repo, "customers", "mobile_number", mobile)
        if existing:
            customer = service.update_customer(existing["id"], CustomerUpdate(**payload))
        else:
            customer = service.create_customer(CustomerCreate(**payload))
        customers_by_mobile[mobile] = customer
    return customers_by_mobile


def ensure_allocations(
    repo: FirestoreRepository,
    customers_by_mobile: dict[str, dict],
    rooms_by_number: dict[str, dict],
) -> list[dict]:
    service = AllocationService(repo)
    allocations: list[dict] = []
    active_allocations = [
        allocation
        for allocation in repo.list("allocations")
        if allocation.get("status") == "Active"
    ]
    for mobile, room_number, bed_number in ALLOCATIONS:
        customer = customers_by_mobile[mobile]
        room = rooms_by_number[room_number]
        existing = next(
            (
                allocation
                for allocation in active_allocations
                if allocation.get("customer_id") == customer["id"]
            ),
            None,
        )
        if existing:
            allocations.append(existing)
            continue
        allocation = service.allocate(
            AllocationCreate(
                customer_id=customer["id"],
                room_id=room["id"],
                bed_number=bed_number,
                start_date="2026-08-19",
            )
        )
        active_allocations.append(allocation)
        allocations.append(allocation)
    return allocations


def main() -> None:
    repo = FirestoreRepository()
    now = utc_now_iso()

    repo.set(FIREBASE_PIN_COLLECTION, "owner", {"pin": PIN, "updated_at": now})
    repo.set("settings", "owner", {"pin": PIN, "updated_at": now})

    rooms_by_number = upsert_rooms(repo)
    customers_by_mobile = upsert_customers(repo)
    allocations = ensure_allocations(repo, customers_by_mobile, rooms_by_number)

    for room_id in [room["id"] for room in rooms_by_number.values()]:
        RoomService(repo).refresh_room_occupancy(room_id)

    if not AuthService(repo).validate_pin(PIN):
        raise RuntimeError("PIN validation failed after seeding Firebase")

    print("Firebase seed completed.")
    print(f"PIN collection: {FIREBASE_PIN_COLLECTION}/owner = {PIN}")
    print(f"Rooms upserted: {len(rooms_by_number)}")
    print(f"Customers upserted: {len(customers_by_mobile)}")
    print(f"Customers allocated: {len(allocations)}")
    print("Unallocated customer: Mohan Das (room capacity is 14 beds)")


if __name__ == "__main__":
    main()
