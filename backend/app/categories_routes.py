import json
import sqlite3
from datetime import UTC, datetime
from uuid import uuid4

from flask import Blueprint, g, jsonify, request

from .auth_middleware import require_auth
from .db import get_db
from .pagination import PaginationValidationError, build_pagination_meta, parse_pagination_args


categories_bp = Blueprint("categories", __name__)
ALLOWED_CATEGORY_MUTATION_ROLES = {"owner_admin", "manager"}


def _category_mutation_guard_error():
    role = str(g.auth_claims.get("role", ""))
    if role not in ALLOWED_CATEGORY_MUTATION_ROLES:
        return jsonify({"error": "forbidden"}), 403
    return None


def _iso_now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _row_to_category(row: sqlite3.Row) -> dict:
    keys = row.keys()
    return {
        "id": row["id"],
        "name": row["name"],
        "code": row["code"],
        "parentId": row["parent_id"],
        "icon": row["icon"] if "icon" in keys else None,
        "color": row["color"] if "color" in keys else None,
        "status": row["status"],
        "productCount": int(row["product_count"] or 0),
        "subcategoryCount": int(row["subcategory_count"] or 0) if "subcategory_count" in keys else 0,
        "isLeaf": int(row["subcategory_count"] or 0) == 0 if "subcategory_count" in keys else True,
        "totalItems": int(row["total_items"] or 0) if "total_items" in keys else int(row["product_count"] or 0),
        "updatedAt": row["updated_at"],
        "archivedAt": row["archived_at"],
        "archivedProductSetId": row["archived_product_set_id"],
    }


def _validate_parent(parent_id: str, current_category_id: str | None = None) -> tuple[bool, str | None]:
    if not parent_id:
        return True, None

    if current_category_id and parent_id == current_category_id:
        return False, "category cannot be its own parent"

    db = get_db()
    parent = db.execute(
        """
        SELECT c.id, c.parent_id, c.status,
               (SELECT COUNT(*) FROM inventory_items i WHERE i.category_id = c.id AND i.is_archived = 0) AS product_count
        FROM categories c WHERE c.id = ?
        """,
        (parent_id,),
    ).fetchone()
    if parent is None:
        return False, "parent category not found"
    if parent["status"] != "Active":
        return False, "parent category must be active"
    if parent["parent_id"] is not None:
        return False, "only one category level is allowed"
    if parent["product_count"] > 0:
        return False, "Cannot add subcategories to a category that contains products."

    return True, None


@categories_bp.route("/<path:_path>", methods=["OPTIONS"])
def preflight(_path: str):
    return ("", 204)


@categories_bp.get("/categories")
@require_auth
def list_categories():
    status = request.args.get("status", "").strip()
    query_text = request.args.get("q", "").strip().lower()
    if status and status not in {"Active", "Archived"}:
        return jsonify({"error": "status must be Active or Archived"}), 400

    try:
        pagination = parse_pagination_args(request.args)
    except PaginationValidationError as error:
        return jsonify({"error": str(error)}), 400

    db = get_db()
    
    base_where_sql = "WHERE c.status = ?" if status else "WHERE 1=1"
    base_params: list[str] = [status] if status else []

    if query_text:
        query_value = f"%{query_text}%"
        matching_parents_sql = f"""
            SELECT DISTINCT IFNULL(c.parent_id, c.id) AS p_id
            FROM categories c
            {base_where_sql} AND (LOWER(c.name) LIKE ? OR LOWER(c.code) LIKE ?)
        """
        matching_parents_params = base_params + [query_value, query_value]
    else:
        matching_parents_sql = f"""
            SELECT c.id AS p_id
            FROM categories c
            {base_where_sql} AND c.parent_id IS NULL
        """
        matching_parents_params = base_params

    count_sql = f"""
        SELECT COUNT(*) AS total
        FROM ({matching_parents_sql})
    """
    total = int(db.execute(count_sql, matching_parents_params).fetchone()["total"])

    paged_parents_query = f"""
        WITH MatchingParents AS (
            {matching_parents_sql}
        ),
        PagedParents AS (
            SELECT p_id
            FROM MatchingParents mp
            ORDER BY (mp.p_id = 'system-unassigned') DESC, 
                     (SELECT name FROM categories WHERE id = mp.p_id) ASC
            LIMIT ? OFFSET ?
        )
        SELECT
            c.id, c.name, c.code, c.parent_id, c.icon, c.color, c.status, c.archived_at, c.archived_product_set_id, c.updated_at,
            COALESCE(pc.product_count, 0) AS product_count,
            (
                SELECT COUNT(*)
                FROM categories sub
                WHERE sub.parent_id = c.id AND sub.status = 'Active'
            ) AS subcategory_count,
            (
                COALESCE(pc.product_count, 0) +
                COALESCE((
                    SELECT SUM(sub_pc.cnt)
                    FROM (
                        SELECT COUNT(*) AS cnt
                        FROM inventory_items ii
                        JOIN categories sub ON sub.id = ii.category_id
                        WHERE sub.parent_id = c.id AND ii.is_archived = 0
                        GROUP BY sub.id
                    ) sub_pc
                ), 0)
            ) AS total_items
        FROM categories c
        JOIN PagedParents pp ON (c.id = pp.p_id OR c.parent_id = pp.p_id)
        LEFT JOIN (
            SELECT category_id, COUNT(*) AS product_count
            FROM inventory_items
            WHERE is_archived = 0
            GROUP BY category_id
        ) pc ON pc.category_id = c.id
        ORDER BY (pp.p_id = 'system-unassigned') DESC,
                 (SELECT name FROM categories WHERE id = pp.p_id) ASC,
                 (c.parent_id IS NOT NULL) ASC,
                 c.name ASC
    """
    
    rows = db.execute(
        paged_parents_query,
        [*matching_parents_params, pagination.page_size, pagination.offset]
    ).fetchall()

    return jsonify(
        {
            "categories": [_row_to_category(row) for row in rows],
            **build_pagination_meta(total, pagination),
        }
    )


@categories_bp.get("/categories/lookup")
@require_auth
def list_category_lookup():
    status = request.args.get("status", "Active").strip() or "Active"
    query_text = request.args.get("q", "").strip().lower()

    if status not in {"Active", "Archived"}:
        return jsonify({"error": "status must be Active or Archived"}), 400

    where_sql = "WHERE c.status = ?"
    params: list[str] = [status]

    if query_text:
        where_sql += " AND (LOWER(c.name) LIKE ? OR LOWER(c.code) LIKE ?)"
        query_value = f"%{query_text}%"
        params.extend([query_value, query_value])

    db = get_db()
    rows = db.execute(
        f"""
        SELECT
            c.id,
            c.name,
            c.code,
            c.parent_id,
            c.status,
            c.archived_at,
            c.archived_product_set_id,
            c.updated_at,
            0 AS product_count
        FROM categories c
        {where_sql}
        ORDER BY (c.id = 'system-unassigned') DESC, c.name ASC
        """,
        params,
    ).fetchall()

    return jsonify({"categories": [_row_to_category(row) for row in rows]})


@categories_bp.get("/archived-sets")
@require_auth
def list_archived_sets():
    try:
        pagination = parse_pagination_args(request.args)
    except PaginationValidationError as error:
        return jsonify({"error": str(error)}), 400

    db = get_db()
    total = int(
        db.execute("SELECT COUNT(*) AS total FROM archived_product_sets").fetchone()["total"]
    )

    rows = db.execute(
        """
        SELECT id, category_id, product_ids_json, archived_at
        FROM archived_product_sets
        ORDER BY archived_at DESC
        LIMIT ? OFFSET ?
        """
        ,
        (pagination.page_size, pagination.offset),
    ).fetchall()

    sets = []
    for row in rows:
        sets.append(
            {
                "id": row["id"],
                "categoryId": row["category_id"],
                "productIds": json.loads(row["product_ids_json"]),
                "archivedAt": row["archived_at"],
            }
        )

    return jsonify(
        {
            "archivedSets": sets,
            **build_pagination_meta(total, pagination),
        }
    )


@categories_bp.post("/categories")
@require_auth
def create_category():
    role_error = _category_mutation_guard_error()
    if role_error:
        return role_error

    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name", "")).strip()
    code = str(payload.get("code", "")).strip().upper()
    parent_id_value = payload.get("parentId")
    parent_id = str(parent_id_value).strip() if isinstance(parent_id_value, str) else None
    icon_value = payload.get("icon")
    icon = str(icon_value).strip() if isinstance(icon_value, str) and icon_value else None
    color_value = payload.get("color")
    color = str(color_value).strip() if isinstance(color_value, str) and color_value else None

    if not name or not code:
        return jsonify({"error": "name and code are required"}), 400

    is_valid_parent, parent_error = _validate_parent(parent_id or "")
    if not is_valid_parent:
        return jsonify({"error": parent_error}), 400

    category_id = str(uuid4())
    now = _iso_now()

    db = get_db()
    try:
        db.execute(
            """
            INSERT INTO categories (
                id,
                name,
                code,
                parent_id,
                icon,
                color,
                status,
                archived_at,
                archived_product_set_id,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'Active', NULL, NULL, ?, ?)
            """,
            (category_id, name, code, parent_id, icon, color, now, now),
        )
        db.commit()
    except sqlite3.IntegrityError as error:
        message = str(error).lower()
        if "categories.name" in message:
            return jsonify({"error": "category name already exists"}), 409
        if "categories.code" in message:
            return jsonify({"error": "category code already exists"}), 409
        return jsonify({"error": "failed to create category"}), 400

    row = db.execute(
        """
        SELECT
            c.id,
            c.name,
            c.code,
            c.parent_id,
            c.icon,
            c.color,
            c.status,
            c.archived_at,
            c.archived_product_set_id,
            c.updated_at,
            0 AS product_count,
            0 AS subcategory_count,
            0 AS total_items
        FROM categories c
        WHERE c.id = ?
        """,
        (category_id,),
    ).fetchone()

    return jsonify({"category": _row_to_category(row)}), 201


@categories_bp.put("/categories/<category_id>")
@require_auth
def update_category(category_id: str):
    role_error = _category_mutation_guard_error()
    if role_error:
        return role_error

    payload = request.get_json(silent=True) or {}

    db = get_db()
    current = db.execute(
        "SELECT id, name, code, parent_id, icon, color, status FROM categories WHERE id = ?",
        (category_id,),
    ).fetchone()
    if current is None:
        return jsonify({"error": "category not found"}), 404

    is_system_unassigned = category_id == "system-unassigned"

    next_name = str(payload.get("name", current["name"])).strip()
    next_code = str(payload.get("code", current["code"])).strip().upper()
    next_parent = payload.get("parentId", current["parent_id"])
    next_parent_id = str(next_parent).strip() if isinstance(next_parent, str) else None
    
    # Force system unassigned properties to remain unchanged
    if is_system_unassigned:
        next_name = current["name"]
        next_code = current["code"]
        next_parent_id = None

    icon_in = payload.get("icon", current["icon"])
    next_icon = str(icon_in).strip() if isinstance(icon_in, str) and icon_in else None
    color_in = payload.get("color", current["color"])
    next_color = str(color_in).strip() if isinstance(color_in, str) and color_in else None

    if not next_name or not next_code:
        return jsonify({"error": "name and code are required"}), 400

    is_valid_parent, parent_error = _validate_parent(next_parent_id or "", category_id)
    if not is_valid_parent:
        return jsonify({"error": parent_error}), 400

    try:
        db.execute(
            """
            UPDATE categories
            SET name = ?, code = ?, parent_id = ?, icon = ?, color = ?, updated_at = ?
            WHERE id = ?
            """,
            (next_name, next_code, next_parent_id, next_icon, next_color, _iso_now(), category_id),
        )
        db.commit()
    except sqlite3.IntegrityError as error:
        message = str(error).lower()
        if "categories.name" in message:
            return jsonify({"error": "category name already exists"}), 409
        if "categories.code" in message:
            return jsonify({"error": "category code already exists"}), 409
        return jsonify({"error": "failed to update category"}), 400

    row = db.execute(
        """
        SELECT
            c.id,
            c.name,
            c.code,
            c.parent_id,
            c.icon,
            c.color,
            c.status,
            c.archived_at,
            c.archived_product_set_id,
            c.updated_at,
            (
                SELECT COUNT(*)
                FROM inventory_items i
                WHERE i.category_id = c.id AND i.is_archived = 0
            ) AS product_count,
            (
                SELECT COUNT(*)
                FROM categories sub
                WHERE sub.parent_id = c.id AND sub.status = 'Active'
            ) AS subcategory_count,
            (
                (SELECT COUNT(*) FROM inventory_items i WHERE i.category_id = c.id AND i.is_archived = 0)
                +
                COALESCE((
                    SELECT SUM(sub_pc.cnt)
                    FROM (
                        SELECT COUNT(*) AS cnt
                        FROM inventory_items ii
                        JOIN categories sub ON sub.id = ii.category_id
                        WHERE sub.parent_id = c.id AND ii.is_archived = 0
                        GROUP BY sub.id
                    ) sub_pc
                ), 0)
            ) AS total_items
        FROM categories c
        WHERE c.id = ?
        """,
        (category_id,),
    ).fetchone()

    return jsonify({"category": _row_to_category(row)})


@categories_bp.post("/categories/<category_id>/archive")
@require_auth
def archive_category(category_id: str):
    role_error = _category_mutation_guard_error()
    if role_error:
        return role_error

    payload = request.get_json(silent=True) or {}
    option = str(payload.get("option", "")).strip()
    if option not in {"MOVE_TO_UNASSIGNED", "ARCHIVE_WITH_PRODUCTS"}:
        return jsonify({"error": "invalid archive option"}), 400

    if category_id == "system-unassigned":
        return jsonify({"error": "cannot archive unassigned category"}), 400

    db = get_db()
    now = _iso_now()

    try:
        db.execute("BEGIN")
        category = db.execute(
            "SELECT id, status, archived_product_set_id FROM categories WHERE id = ?",
            (category_id,),
        ).fetchone()
        if category is None:
            db.execute("ROLLBACK")
            return jsonify({"error": "category not found"}), 404
        if category["status"] == "Archived":
            db.execute("ROLLBACK")
            return jsonify({"error": "category already archived"}), 400

        active_subcategory_count = int(
            db.execute(
                """
                SELECT COUNT(*) AS total
                FROM categories
                WHERE parent_id = ? AND status = 'Active'
                """,
                (category_id,),
            ).fetchone()["total"]
        )
        if active_subcategory_count > 0:
            db.execute("ROLLBACK")
            return jsonify({"error": "cannot archive category with active subcategories"}), 409

        archived_set_id = None
        if option == "MOVE_TO_UNASSIGNED":
            db.execute(
                """
                UPDATE inventory_items
                SET category_id = ?, updated_at = ?
                WHERE category_id = ? AND is_archived = 0
                """,
                ("system-unassigned", now, category_id),
            )
        else:
            product_rows = db.execute(
                """
                SELECT id
                FROM inventory_items
                WHERE category_id = ? AND is_archived = 0
                """,
                (category_id,),
            ).fetchall()
            product_ids = [row["id"] for row in product_rows]
            if product_ids:
                archived_set_id = str(uuid4())
                db.execute(
                    """
                    INSERT INTO archived_product_sets (id, category_id, product_ids_json, archived_at, created_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (archived_set_id, category_id, json.dumps(product_ids), now, now),
                )
                db.execute(
                    """
                    UPDATE inventory_items
                    SET is_archived = 1, archived_set_id = ?, updated_at = ?
                    WHERE category_id = ? AND is_archived = 0
                    """,
                    (archived_set_id, now, category_id),
                )

        db.execute(
            """
            UPDATE categories
            SET status = 'Archived', archived_at = ?, archived_product_set_id = ?, updated_at = ?
            WHERE id = ?
            """,
            (now, archived_set_id, now, category_id),
        )
        db.commit()
    except Exception:
        db.rollback()
        return jsonify({"error": "failed to archive category"}), 500

    return jsonify({"success": True})


@categories_bp.post("/categories/<category_id>/restore")
@require_auth
def restore_category(category_id: str):
    role_error = _category_mutation_guard_error()
    if role_error:
        return role_error

    db = get_db()
    now = _iso_now()

    try:
        db.execute("BEGIN")
        category = db.execute(
            "SELECT id, status, archived_product_set_id FROM categories WHERE id = ?",
            (category_id,),
        ).fetchone()
        if category is None:
            db.execute("ROLLBACK")
            return jsonify({"error": "category not found"}), 404
        if category["status"] != "Archived":
            db.execute("ROLLBACK")
            return jsonify({"error": "category is not archived"}), 400

        archived_set_id = category["archived_product_set_id"]
        if archived_set_id:
            db.execute(
                """
                UPDATE inventory_items
                SET is_archived = 0, archived_set_id = NULL, updated_at = ?
                WHERE archived_set_id = ?
                """,
                (now, archived_set_id),
            )
            db.execute("DELETE FROM archived_product_sets WHERE id = ?", (archived_set_id,))

        db.execute(
            """
            UPDATE categories
            SET status = 'Active', archived_at = NULL, archived_product_set_id = NULL, updated_at = ?
            WHERE id = ?
            """,
            (now, category_id),
        )
        db.commit()
    except Exception:
        db.rollback()
        return jsonify({"error": "failed to restore category"}), 500

    return jsonify({"success": True})
