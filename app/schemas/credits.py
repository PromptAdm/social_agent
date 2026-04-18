from datetime import datetime

from pydantic import BaseModel


class CreditBalanceOut(BaseModel):
    balance:         int
    lifetime_earned: int
    updated_at:      datetime | None = None

    model_config = {"from_attributes": True}


class CreditLogOut(BaseModel):
    id:             int
    amount:         int
    operation_type: str
    reference_id:   int | None = None
    reference_type: str | None = None
    description:    str | None = None
    created_at:     datetime

    model_config = {"from_attributes": True}


class CreditLogsPage(BaseModel):
    logs:   list[CreditLogOut]
    total:  int
    offset: int
    limit:  int
