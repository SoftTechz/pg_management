from fastapi import APIRouter, Response

from app.services.excel_service import ExcelService
from app.services.report_service import ReportService
from app.utils.dates import month_key

router = APIRouter()


@router.get("/customers")
def customer_report(status: str | None = None) -> list[dict]:
    return ReportService().customers(status=status)


@router.get("/payments")
def payment_report(month: str | None = None, status: str | None = None) -> list[dict]:
    return ReportService().monthly_rent(month or month_key(), status=status)


@router.get("/outstanding")
def outstanding_report(month: str | None = None) -> list[dict]:
    return ReportService().outstanding(month or month_key())


@router.get("/occupancy")
def occupancy_report() -> list[dict]:
    return ReportService().occupancy()


@router.get("/payment-history")
def payment_history(customer_id: str | None = None) -> list[dict]:
    return ReportService().payment_history(customer_id=customer_id)


@router.get("/customers/export")
def export_customers(status: str | None = None) -> Response:
    rows = ReportService().customers(status=status)
    return _excel_response(
        "customer-report.xlsx",
        "Customers",
        rows,
        [
            ("Name", "name"),
            ("Mobile", "mobile_number"),
            ("Room", "room_number"),
            ("Admission Date", "admission_date"),
            ("Status", "status"),
            ("Monthly Rent", "monthly_rent"),
            ("Advance", "advance"),
        ],
    )


@router.get("/payments/export")
def export_payments(month: str | None = None, status: str | None = None) -> Response:
    rows = ReportService().monthly_rent(month or month_key(), status=status)
    return _excel_response(
        "monthly-rent-report.xlsx",
        "Monthly Rent",
        rows,
        [
            ("Month", "month"),
            ("Customer", "customer_name"),
            ("Room", "room_number"),
            ("Rent", "monthly_rent"),
            ("Paid", "amount_paid"),
            ("Remaining", "remaining_amount"),
            ("Status", "payment_status"),
        ],
    )


@router.get("/outstanding/export")
def export_outstanding(month: str | None = None) -> Response:
    rows = ReportService().outstanding(month or month_key())
    return _excel_response(
        "outstanding-rent-report.xlsx",
        "Outstanding",
        rows,
        [
            ("Month", "month"),
            ("Customer", "customer_name"),
            ("Room", "room_number"),
            ("Rent", "monthly_rent"),
            ("Paid", "amount_paid"),
            ("Remaining", "remaining_amount"),
            ("Status", "payment_status"),
        ],
    )


@router.get("/occupancy/export")
def export_occupancy() -> Response:
    rows = ReportService().occupancy()
    return _excel_response(
        "room-occupancy-report.xlsx",
        "Occupancy",
        rows,
        [
            ("Room", "room_number"),
            ("Floor", "floor"),
            ("Total Beds", "total_beds"),
            ("Occupied", "occupied_beds"),
            ("Available", "available_beds"),
            ("Status", "status"),
        ],
    )


@router.get("/payment-history/export")
def export_payment_history(customer_id: str | None = None) -> Response:
    rows = ReportService().payment_history(customer_id=customer_id)
    return _excel_response(
        "customer-payment-history.xlsx",
        "Payment History",
        rows,
        [
            ("Month", "month"),
            ("Customer", "customer_name"),
            ("Room", "room_number"),
            ("Rent", "monthly_rent"),
            ("Paid", "amount_paid"),
            ("Remaining", "remaining_amount"),
            ("Status", "payment_status"),
            ("Date", "payment_date"),
        ],
    )


def _excel_response(
    filename: str, sheet: str, rows: list[dict], columns: list[tuple[str, str]]
) -> Response:
    content = ExcelService().build_workbook(sheet, rows, columns)
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
