from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from ..db import get_db
from ..services.customer_auth import customer_for_session
from .http import Abort, fail, json_body, session_id

DB = Annotated[Session, Depends(get_db)]
Body = Annotated[dict, Depends(json_body)]


def current_customer(db: Session, request: Request, session: str | None = None):
    """The logged-in customer for this request's `session-id` header, or an
    Abort carrying the same 401 every customer endpoint answered with."""
    customer = customer_for_session(db, session if session is not None else session_id(request))
    if customer is None:
        raise Abort(fail(401, "Not logged in", "UNAUTHORIZED"))
    return customer
