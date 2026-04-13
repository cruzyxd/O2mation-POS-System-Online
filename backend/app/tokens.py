import hashlib
import secrets
from datetime import UTC, datetime, timedelta

import jwt
from flask import current_app


def make_access_token(user_id: int, role: str) -> str:
    expires_minutes = current_app.config["ACCESS_TOKEN_MINUTES"]
    exp = datetime.now(UTC) + timedelta(minutes=expires_minutes)
    payload = {"uid": user_id, "role": role, "exp": exp}
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


def parse_access_token(token: str) -> dict:
    return jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])


def make_refresh_token() -> str:
    return secrets.token_urlsafe(48)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def refresh_expiry_iso() -> str:
    days = current_app.config["REFRESH_TOKEN_DAYS"]
    return (datetime.now(UTC) + timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")

