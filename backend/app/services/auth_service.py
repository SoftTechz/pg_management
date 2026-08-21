from app.services.repository import FirestoreRepository

FIREBASE_PIN_COLLECTION = "Login"
FIREBASE_PIN_DOCUMENT = "auth"


class AuthService:
    def __init__(self, repo=None):
        self.repo = repo or FirestoreRepository()

    def validate_pin(self, pin: str) -> bool:
        return pin in self._configured_pins()

    def update_pin(self, pin: str) -> dict:
        return self.repo.set(
            FIREBASE_PIN_COLLECTION,
            FIREBASE_PIN_DOCUMENT,
            {"pin": pin},
        )

    def _configured_pins(self) -> set[str]:
        pins: set[str] = set()
        auth_doc = self.repo.get(FIREBASE_PIN_COLLECTION, FIREBASE_PIN_DOCUMENT)
        if auth_doc and auth_doc.get("pin"):
            pins.add(str(auth_doc["pin"]))
        return pins
