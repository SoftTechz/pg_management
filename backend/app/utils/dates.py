from datetime import date, datetime, timezone

from app.core.constants import RENT_DUE_DAY


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def month_key(value: date | None = None) -> str:
    today = value or date.today()
    return f"{today.year:04d}-{today.month:02d}"


def month_label(key: str) -> str:
    parsed = datetime.strptime(key, "%Y-%m")
    return parsed.strftime("%B %Y")


def due_date_for_month(key: str) -> date:
    parsed = datetime.strptime(key, "%Y-%m")
    return date(parsed.year, parsed.month, RENT_DUE_DAY)


def is_due_or_overdue(key: str, today: date | None = None) -> bool:
    return (today or date.today()) >= due_date_for_month(key)
