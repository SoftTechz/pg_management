from pydantic import BaseModel, Field


class PGBase(BaseModel):
    pg_name: str = Field(min_length=1)
    pg_type: str = Field(pattern=r"^(GENTS|LADIES)$")
    address: str = ""
    is_active: bool = True


class PGCreate(PGBase):
    pass


class PG(PGBase):
    pg_id: str
    created_at: str
