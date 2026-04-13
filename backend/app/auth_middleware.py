from functools import wraps

import jwt
from flask import g, jsonify, request

from .tokens import parse_access_token


def _extract_bearer_token() -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise ValueError("missing bearer token")
    return auth_header.replace("Bearer ", "", 1).strip()


def require_auth(route_handler):
    @wraps(route_handler)
    def wrapped(*args, **kwargs):
        try:
            token = _extract_bearer_token()
            claims = parse_access_token(token)
        except (ValueError, jwt.InvalidTokenError, jwt.ExpiredSignatureError) as error:
            return jsonify({"error": str(error)}), 401

        g.auth_claims = claims
        return route_handler(*args, **kwargs)

    return wrapped
