import re
import sqlite3
from datetime import UTC, datetime
from uuid import uuid4

from flask import Blueprint, g, jsonify, request

from .auth_middleware import require_auth
from .db import get_db
from .pagination import PaginationValidationError, build_pagination_meta, parse_pagination_args

vendors_bp = Blueprint("vendors", __name__)
ALLOWED_VENDOR_MUTATION_ROLES = {"owner_admin", "manager"}


def _vendor_mutation_guard_error():
    role = str(g.auth_claims.get("role", ""))
    if role not in ALLOWED_VENDOR_MUTATION_ROLES:
        return jsonify({"error": "forbidden"}), 403
    return None


def _iso_now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _normalize_name(name: str) -> str:
    # Remove all non-alphanumeric characters and lowercase
    return re.sub(r"[\W_]+", "", name).lower()


def _row_to_vendor(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "name": row["name"],
        "normalizedName": row["normalized_name"],
        "phone": row["phone"],
        "notes": row["notes"],
        "status": row["status"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


@vendors_bp.route("/<path:_path>", methods=["OPTIONS"])
def preflight(_path: str):
    return ("", 204)


@vendors_bp.get("/vendors")
@require_auth
def list_vendors():
    status = request.args.get("status", "").strip()
    query_text = request.args.get("q", "").strip().lower()

    try:
        pagination = parse_pagination_args(request.args)
    except PaginationValidationError as error:
        return jsonify({"error": str(error)}), 400

    if status and status not in {"Active", "Archived"}:
        return jsonify({"error": "status must be Active or Archived"}), 400

    where_sql = """
        WHERE 1=1
    """
    params: list[str] = []

    if status:
        where_sql += " AND status = ?"
        params.append(status)
    if query_text:
        where_sql += " AND (LOWER(name) LIKE ? OR normalized_name LIKE ?)"
        query_value = f"%{query_text}%"
        norm_query_value = f"%{_normalize_name(query_text)}%"
        params.extend([query_value, norm_query_value])

    count_sql = f"""
        SELECT COUNT(*) AS total
        FROM vendors
        {where_sql}
    """

    data_sql = f"""
        SELECT
            id,
            name,
            normalized_name,
            phone,
            notes,
            status,
            created_at,
            updated_at
        FROM vendors
        {where_sql}
        ORDER BY name ASC
        LIMIT ? OFFSET ?
    """

    db = get_db()
    total = int(db.execute(count_sql, params).fetchone()["total"])
    rows = db.execute(data_sql, [*params, pagination.page_size, pagination.offset]).fetchall()

    return jsonify(
        {
            "vendors": [_row_to_vendor(row) for row in rows],
            **build_pagination_meta(total, pagination),
        }
    )


@vendors_bp.get("/vendors/lookup")
@require_auth
def list_vendors_lookup():
    status = request.args.get("status", "Active").strip() or "Active"
    query_text = request.args.get("q", "").strip().lower()

    if status not in {"Active", "Archived"}:
        return jsonify({"error": "status must be Active or Archived"}), 400

    where_sql = "WHERE status = ?"
    params: list[str] = [status]

    if query_text:
        where_sql += " AND (LOWER(name) LIKE ? OR normalized_name LIKE ?)"
        query_value = f"%{query_text}%"
        norm_query_value = f"%{_normalize_name(query_text)}%"
        params.extend([query_value, norm_query_value])

    db = get_db()
    rows = db.execute(
        f"""
        SELECT
            id,
            name,
            normalized_name,
            phone,
            notes,
            status,
            created_at,
            updated_at
        FROM vendors
        {where_sql}
        ORDER BY name ASC
        """,
        params,
    ).fetchall()

    return jsonify({"vendors": [_row_to_vendor(row) for row in rows]})


@vendors_bp.post("/vendors")
@require_auth
def create_vendor():
    role_error = _vendor_mutation_guard_error()
    if role_error:
        return role_error

    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    phone = str(payload.get("phone", "")).strip()
    notes = str(payload.get("notes", "")).strip()

    if not name:
        return jsonify({"error": "name is required"}), 400

    normalized_name = _normalize_name(name)
    if not normalized_name:
        return jsonify({"error": "name must contain alphanumeric characters"}), 400

    vendor_id = str(uuid4())
    now = _iso_now()

    db = get_db()
    try:
        db.execute(
            """
            INSERT INTO vendors (
                id,
                name,
                normalized_name,
                phone,
                notes,
                status,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, 'Active', ?, ?)
            """,
            (vendor_id, name, normalized_name, phone, notes, now, now),
        )
        db.commit()
    except sqlite3.IntegrityError as error:
        message = str(error).lower()
        if "vendors.normalized_name" in message:
            return jsonify({"error": "a vendor with a similar name already exists"}), 409
        return jsonify({"error": "failed to create vendor"}), 400

    row = db.execute(
        "SELECT * FROM vendors WHERE id = ?",
        (vendor_id,),
    ).fetchone()

    return jsonify({"vendor": _row_to_vendor(row)}), 201


@vendors_bp.put("/vendors/<vendor_id>")
@require_auth
def update_vendor(vendor_id: str):
    role_error = _vendor_mutation_guard_error()
    if role_error:
        return role_error

    payload = request.get_json(silent=True) or {}

    db = get_db()
    current = db.execute(
        "SELECT * FROM vendors WHERE id = ?",
        (vendor_id,),
    ).fetchone()

    if current is None:
        return jsonify({"error": "vendor not found"}), 404

    next_name = str(payload.get("name", current["name"])).strip()
    next_phone = str(payload.get("phone", current["phone"] or "")).strip()
    next_notes = str(payload.get("notes", current["notes"] or "")).strip()

    if not next_name:
        return jsonify({"error": "name is required"}), 400

    normalized_name = _normalize_name(next_name)
    if not normalized_name:
        return jsonify({"error": "name must contain alphanumeric characters"}), 400

    now = _iso_now()

    try:
        db.execute(
            """
            UPDATE vendors
            SET name = ?, normalized_name = ?, phone = ?, notes = ?, updated_at = ?
            WHERE id = ?
            """,
            (next_name, normalized_name, next_phone, next_notes, now, vendor_id),
        )
        db.commit()
    except sqlite3.IntegrityError as error:
        message = str(error).lower()
        if "vendors.normalized_name" in message:
            return jsonify({"error": "a vendor with a similar name already exists"}), 409
        return jsonify({"error": "failed to update vendor"}), 400

    row = db.execute(
        "SELECT * FROM vendors WHERE id = ?",
        (vendor_id,),
    ).fetchone()

    return jsonify({"vendor": _row_to_vendor(row)})


@vendors_bp.post("/vendors/<vendor_id>/archive")
@require_auth
def archive_vendor(vendor_id: str):
    role_error = _vendor_mutation_guard_error()
    if role_error:
        return role_error

    db = get_db()
    now = _iso_now()

    vendor = db.execute(
        "SELECT * FROM vendors WHERE id = ?",
        (vendor_id,),
    ).fetchone()

    if vendor is None:
        return jsonify({"error": "vendor not found"}), 404
    if vendor["status"] == "Archived":
        return jsonify({"error": "vendor is already archived"}), 400

    try:
        db.execute(
            "UPDATE vendors SET status = 'Archived', updated_at = ? WHERE id = ?",
            (now, vendor_id),
        )
        db.commit()
    except Exception:
        db.rollback()
        return jsonify({"error": "failed to archive vendor"}), 500

    return jsonify({"success": True})


@vendors_bp.post("/vendors/<vendor_id>/restore")
@require_auth
def restore_vendor(vendor_id: str):
    role_error = _vendor_mutation_guard_error()
    if role_error:
        return role_error

    db = get_db()
    now = _iso_now()

    vendor = db.execute(
        "SELECT * FROM vendors WHERE id = ?",
        (vendor_id,),
    ).fetchone()

    if vendor is None:
        return jsonify({"error": "vendor not found"}), 404
    if vendor["status"] == "Active":
        return jsonify({"error": "vendor is not archived"}), 400

    try:
        db.execute(
            "UPDATE vendors SET status = 'Active', updated_at = ? WHERE id = ?",
            (now, vendor_id),
        )
        db.commit()
    except Exception:
        db.rollback()
        return jsonify({"error": "failed to restore vendor"}), 500

    return jsonify({"success": True})
