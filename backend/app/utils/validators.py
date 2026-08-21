import re


PIN_RE = re.compile(r"^\d{4}$")
PHONE_RE = re.compile(r"^[6-9]\d{9}$")
AADHAAR_RE = re.compile(r"^\d{12}$")


def validate_pin(pin: str) -> bool:
    return bool(PIN_RE.fullmatch(pin or ""))


def validate_indian_phone(value: str | None) -> bool:
    if not value:
        return True
    digits = re.sub(r"\D", "", value)
    if len(digits) > 10 and digits.startswith("91"):
        digits = digits[-10:]
    return bool(PHONE_RE.fullmatch(digits))


def validate_aadhaar(value: str | None) -> bool:
    if not value:
        return True
    return bool(AADHAAR_RE.fullmatch(re.sub(r"\s", "", value)))
