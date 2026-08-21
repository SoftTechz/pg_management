from contextvars import ContextVar

DEFAULT_PG_ID = "brindavan-elite-gents-old"

_current_pg_id: ContextVar[str] = ContextVar("current_pg_id", default=DEFAULT_PG_ID)


def get_current_pg_id() -> str:
    return _current_pg_id.get()


def set_current_pg_id(pg_id: str) -> None:
    _current_pg_id.set(pg_id)
