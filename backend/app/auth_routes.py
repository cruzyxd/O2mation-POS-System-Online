from datetime import UTC, datetime

import jwt
from flask import Blueprint, jsonify, request
from werkzeug.security import check_password_hash

from .db import get_db
from .tokens import (
    hash_refresh_token,
    make_access_token,
    make_refresh_token,
    parse_access_token,
    refresh_expiry_iso,
)


auth_bp = Blueprint("auth", __name__)


def _extract_bearer() -> str:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        raise ValueError("Missing bearer token")
    return auth_header.replace("Bearer ", "", 1).strip()


@auth_bp.route("/<path:_path>", methods=["OPTIONS"])
def preflight(_path: str):
    return ("", 204)


@auth_bp.post("/login")
def login():
    payload = request.get_json(silent=True) or {}
    username = str(payload.get("username", "")).strip()
    password = str(payload.get("password", ""))

    if not username or not password:
        return jsonify({"error": "username and password are required"}), 400

    db = get_db()
    user = db.execute(
        "SELECT id, username, password_hash, role, is_active FROM users WHERE username = ?",
        (username,),
    ).fetchone()
    if user is None or not check_password_hash(user["password_hash"], password):
        return jsonify({"error": "invalid credentials"}), 401
    if int(user["is_active"]) != 1:
        return jsonify({"error": "user is inactive"}), 403

    access_token = make_access_token(user["id"], user["role"])
    refresh_token = make_refresh_token()
    token_hash = hash_refresh_token(refresh_token)
    expires_at = refresh_expiry_iso()
    db.execute(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        (user["id"], token_hash, expires_at),
    )
    db.commit()

    return jsonify(
        {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "role": user["role"],
            },
        }
    )


@auth_bp.post("/refresh")
def refresh():
    payload = request.get_json(silent=True) or {}
    raw_token = str(payload.get("refresh_token", "")).strip()
    if not raw_token:
        return jsonify({"error": "refresh_token is required"}), 400

    db = get_db()
    hashed = hash_refresh_token(raw_token)
    now = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    token_row = db.execute(
        """
        SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked_at, u.username, u.role, u.is_active
        FROM refresh_tokens rt
        JOIN users u ON u.id = rt.user_id
        WHERE rt.token_hash = ?
        """,
        (hashed,),
    ).fetchone()
    if token_row is None:
        return jsonify({"error": "invalid refresh token"}), 401
    if token_row["revoked_at"] is not None:
        return jsonify({"error": "refresh token revoked"}), 401
    if token_row["expires_at"] < now:
        return jsonify({"error": "refresh token expired"}), 401
    if int(token_row["is_active"]) != 1:
        return jsonify({"error": "user is inactive"}), 403

    db.execute(
        "UPDATE refresh_tokens SET revoked_at = ? WHERE id = ?",
        (now, token_row["id"]),
    )
    new_refresh = make_refresh_token()
    db.execute(
        "INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        (token_row["user_id"], hash_refresh_token(new_refresh), refresh_expiry_iso()),
    )
    db.commit()

    access_token = make_access_token(token_row["user_id"], token_row["role"])
    return jsonify(
        {
            "access_token": access_token,
            "refresh_token": new_refresh,
            "user": {
                "id": token_row["user_id"],
                "username": token_row["username"],
                "role": token_row["role"],
            },
        }
    )


@auth_bp.post("/logout")
def logout():
    payload = request.get_json(silent=True) or {}
    raw_token = str(payload.get("refresh_token", "")).strip()
    if not raw_token:
        return jsonify({"error": "refresh_token is required"}), 400

    db = get_db()
    now = datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")
    hashed = hash_refresh_token(raw_token)
    result = db.execute(
        "UPDATE refresh_tokens SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
        (now, hashed),
    )
    db.commit()
    if result.rowcount == 0:
        return jsonify({"error": "invalid refresh token"}), 401
    return jsonify({"success": True})


@auth_bp.get("/me")
def me():
    try:
        token = _extract_bearer()
        claims = parse_access_token(token)
    except (ValueError, jwt.InvalidTokenError, jwt.ExpiredSignatureError) as error:
        return jsonify({"error": str(error)}), 401

    db = get_db()
    user = db.execute(
        "SELECT id, username, role, is_active FROM users WHERE id = ?",
        (claims["uid"],),
    ).fetchone()
    if user is None or int(user["is_active"]) != 1:
        return jsonify({"error": "user not available"}), 404

    return jsonify(
        {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
        }
    )


@auth_bp.get("/role-check")
def role_check():
    role = request.args.get("role", "").strip()
    if not role:
        return jsonify({"error": "role query param is required"}), 400
    try:
        token = _extract_bearer()
        claims = parse_access_token(token)
    except (ValueError, jwt.InvalidTokenError, jwt.ExpiredSignatureError) as error:
        return jsonify({"error": str(error)}), 401

    if claims["role"] != role:
        return jsonify({"allowed": False}), 403
    return jsonify({"allowed": True})

