import sqlite3
from datetime import UTC, datetime
from uuid import uuid4

from flask import Blueprint, g, jsonify, request

from .auth_middleware import require_auth
from .db import get_db
from .pagination import PaginationValidationError, build_pagination_meta, parse_pagination_args


inventory_bp = Blueprint("inventory", __name__)
LOW_STOCK_MAX = 50
ALLOWED_INVENTORY_MUTATION_ROLES = {"owner_admin", "manager"}


def _iso_now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _compute_status(stock_quantity: int) -> str:
    if stock_quantity <= 0:
        return "Out of Stock"
    if stock_quantity <= LOW_STOCK_MAX:
        return "Low Stock"
    return "In Stock"


def _row_to_item(row: sqlite3.Row) -> dict:
    selling_price = float(row["selling_price"])
    cost_price = float(row["cost_price"])
    return {
        "id": row["id"],
        "name": row["name"],
        "sku": row["sku"],
        "barcode": row["barcode"],
        "batch": row["batch"],
        "categoryId": row["category_id"],
        "stockQuantity": int(row["stock_quantity"]),
        "unit": row["unit"],
        "status": row["status"],
        "sellingPrice": selling_price,
        "costPrice": cost_price,
        "taxEnabled": bool(row["tax_enabled"]),
        "taxPercentage": float(row["tax_percentage"]),
        "vendorId": row["vendor_id"] if "vendor_id" in row.keys() else None,
        "price": selling_price,
        "cost": cost_price,
    }


def _inventory_mutation_guard_error():
    role = str(g.auth_claims.get("role", ""))
    if role not in ALLOWED_INVENTORY_MUTATION_ROLES:
        return jsonify({"error": "forbidden"}), 403
    return None


def _current_user_id() -> int | None:
    raw_user_id = g.auth_claims.get("uid")
    try:
        return int(raw_user_id)
    except (TypeError, ValueError):
        return None


def _parse_int_field(value: object, field_name: str):
    try:
        return int(value), None
    except (TypeError, ValueError):
        return None, (jsonify({"error": f"{field_name} must be a valid integer"}), 400)


def _parse_float_field(value: object, field_name: str):
    try:
        return float(value), None
    except (TypeError, ValueError):
        return None, (jsonify({"error": f"{field_name} must be a valid number"}), 400)


def _insert_movement(
    db: sqlite3.Connection,
    *,
    inventory_item_id: str,
    movement_type: str,
    quantity_delta: int,
    prior_quantity: int,
    new_quantity: int,
    purchase_price: float,
    reason: str,
    actor_user_id: int,
    created_at: str,
) -> str:
    movement_id = str(uuid4())
    db.execute(
        """
        INSERT INTO inventory_movements (
            id,
            inventory_item_id,
            movement_type,
            quantity_delta,
            prior_quantity,
            new_quantity,
            purchase_price,
            reason,
            actor_user_id,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            movement_id,
            inventory_item_id,
            movement_type,
            quantity_delta,
            prior_quantity,
            new_quantity,
            purchase_price,
            reason,
            actor_user_id,
            created_at,
        ),
    )
    return movement_id


def _movement_row_to_dict(row: sqlite3.Row) -> dict:
    return {
        "id": row["id"],
        "itemId": row["inventory_item_id"],
        "movementType": row["movement_type"],
        "quantityDelta": int(row["quantity_delta"]),
        "priorQuantity": int(row["prior_quantity"]),
        "newQuantity": int(row["new_quantity"]),
        "purchasePrice": float(row["purchase_price"]),
        "reason": row["reason"],
        "actorUserId": int(row["actor_user_id"]),
        "actorUsername": row["actor_username"] if "actor_username" in row.keys() else None,
        "createdAt": row["created_at"],
    }


def _item_has_movements(db: sqlite3.Connection, item_id: str) -> bool:
    row = db.execute(
        "SELECT 1 FROM inventory_movements WHERE inventory_item_id = ? LIMIT 1",
        (item_id,),
    ).fetchone()
    return row is not None


def _item_is_referenced_by_sales(db: sqlite3.Connection, item_id: str) -> bool:
    row = db.execute(
        "SELECT 1 FROM sale_items WHERE inventory_item_id = ? LIMIT 1",
        (item_id,),
    ).fetchone()
    return row is not None


@inventory_bp.route("/<path:_path>", methods=["OPTIONS"])
def preflight(_path: str):
    return ("", 204)


@inventory_bp.get("/items")
@require_auth
def list_items():
    category_id = request.args.get("categoryId", "").strip()
    status = request.args.get("status", "").strip()
    query_text = request.args.get("q", "").strip().lower()

    try:
        pagination = parse_pagination_args(request.args)
    except PaginationValidationError as error:
        return jsonify({"error": str(error)}), 400

    where_sql = """
        WHERE i.is_archived = 0
          AND c.status = 'Active'
    """
    where_params: list[str] = []

    if category_id:
        where_sql += " AND i.category_id = ?"
        where_params.append(category_id)
    if status:
        where_sql += " AND i.status = ?"
        where_params.append(status)
    if query_text:
        where_sql += " AND (LOWER(i.name) LIKE ? OR LOWER(i.sku) LIKE ? OR LOWER(COALESCE(i.barcode, '')) LIKE ? OR LOWER(c.name) LIKE ?)"
        query_value = f"%{query_text}%"
        where_params.extend([query_value, query_value, query_value, query_value])

    metadata_sql = f"""
        SELECT
            COUNT(*) AS total,
            COALESCE(SUM(i.stock_quantity * i.cost_price), 0) AS total_value,
            COALESCE(SUM(CASE WHEN i.status = 'Low Stock' THEN 1 ELSE 0 END), 0) AS low_stock_count,
            COALESCE(SUM(CASE WHEN i.status = 'Out of Stock' THEN 1 ELSE 0 END), 0) AS out_of_stock_count
        FROM inventory_items i
        JOIN categories c ON c.id = i.category_id
        {where_sql}
    """

    data_sql = f"""
        SELECT
            i.id,
            i.name,
            i.sku,
            i.barcode,
            i.batch,
            i.category_id,
            i.stock_quantity,
            i.unit,
            i.status,
            i.cost_price,
            i.selling_price,
            i.tax_enabled,
            i.tax_percentage,
            i.vendor_id
        FROM inventory_items i
        JOIN categories c ON c.id = i.category_id
        {where_sql}
        ORDER BY i.created_at DESC
        LIMIT ? OFFSET ?
    """

    db = get_db()
    metadata_row = db.execute(metadata_sql, where_params).fetchone()
    total = int(metadata_row["total"])

    rows = db.execute(
        data_sql,
        [*where_params, pagination.page_size, pagination.offset],
    ).fetchall()

    return jsonify(
        {
            "items": [_row_to_item(row) for row in rows],
            **build_pagination_meta(total, pagination),
            "summary": {
                "totalValue": float(metadata_row["total_value"]),
                "lowStockCount": int(metadata_row["low_stock_count"]),
                "outOfStockCount": int(metadata_row["out_of_stock_count"]),
            },
        }
    )


@inventory_bp.get("/items/lookup")
@require_auth
def lookup_item():
    barcode = str(request.args.get("barcode", "")).strip()
    sku = str(request.args.get("sku", "")).strip()

    if not barcode and not sku:
        return jsonify({"error": "barcode or sku is required"}), 400

    db = get_db()
    base_select_sql = """
        SELECT
            i.id,
            i.name,
            i.sku,
            i.barcode,
            i.batch,
            i.category_id,
            i.stock_quantity,
            i.unit,
            i.status,
            i.cost_price,
            i.selling_price,
            i.tax_enabled,
            i.tax_percentage,
            i.vendor_id
        FROM inventory_items i
        JOIN categories c ON c.id = i.category_id
        WHERE i.is_archived = 0
          AND c.status = 'Active'
          AND {condition}
        LIMIT 1
    """

    if barcode:
        row = db.execute(
            base_select_sql.format(condition="i.barcode = ?"),
            (barcode,),
        ).fetchone()
        if row is not None:
            return jsonify({"item": _row_to_item(row)})

    sku_lookup = sku or barcode
    row = db.execute(
        base_select_sql.format(condition="LOWER(i.sku) = LOWER(?)"),
        (sku_lookup,),
    ).fetchone()
    if row is not None:
        return jsonify({"item": _row_to_item(row)})

    return jsonify({"error": "item not found"}), 404


@inventory_bp.post("/items")
@require_auth
def create_item():
    role_error = _inventory_mutation_guard_error()
    if role_error:
        return role_error

    payload = request.get_json(silent=True) or {}

    name = str(payload.get("name", "")).strip()
    sku = str(payload.get("sku", "")).strip()
    barcode = str(payload.get("barcode", "")).strip() or None
    batch = str(payload.get("batch", "")).strip() or None
    category_id = str(payload.get("categoryId", "")).strip()
    vendor_id = str(payload.get("vendorId", "")).strip() or None
    unit = str(payload.get("unit", "")).strip().upper()

    if not name or not category_id or not unit:
        return jsonify({"error": "name, categoryId, and unit are required"}), 400

    if unit not in {"UNITS", "LBS", "KGS", "LITERS"}:
        return jsonify({"error": "invalid unit"}), 400

    stock_quantity, parse_error = _parse_int_field(
        payload.get("startingAmount", payload.get("stockQuantity", 0)) or 0,
        "startingAmount",
    )
    if parse_error:
        return parse_error

    cost_price, parse_error = _parse_float_field(
        payload.get("costPrice", payload.get("cost", 0)) or 0,
        "costPrice",
    )
    if parse_error:
        return parse_error

    selling_price, parse_error = _parse_float_field(
        payload.get("sellingPrice", payload.get("price", 0)) or 0,
        "sellingPrice",
    )
    if parse_error:
        return parse_error

    tax_enabled = 1 if bool(payload.get("taxEnabled", False)) else 0
    tax_percentage, parse_error = _parse_float_field(
        payload.get("taxPercentage", 0) or 0,
        "taxPercentage",
    )
    if parse_error:
        return parse_error

    if stock_quantity < 0 or cost_price < 0 or selling_price < 0:
        return jsonify({"error": "stock and prices must be non-negative"}), 400
    if tax_percentage < 0 or tax_percentage > 100:
        return jsonify({"error": "taxPercentage must be between 0 and 100"}), 400

    db = get_db()
    category = db.execute(
        """
        SELECT id, status,
               (SELECT COUNT(*) FROM categories sub WHERE sub.parent_id = categories.id AND sub.status = 'Active') AS subcategory_count
        FROM categories WHERE id = ?
        """,
        (category_id,),
    ).fetchone()
    if category is None:
        return jsonify({"error": "category not found"}), 404
    if category["status"] != "Active":
        return jsonify({"error": "cannot add item to archived category"}), 400
    if category["subcategory_count"] > 0:
        return jsonify({"error": "Cannot assign products to a category with subcategories"}), 400

    item_id = str(uuid4())
    final_sku = sku or f"SKU-{str(uuid4())[:8].upper()}"
    now = _iso_now()
    final_status = _compute_status(stock_quantity)

    actor_user_id = _current_user_id()
    if actor_user_id is None:
        return jsonify({"error": "invalid auth claims"}), 401

    try:
        db.execute("BEGIN")
        db.execute(
            """
            INSERT INTO inventory_items (
                id,
                name,
                sku,
                barcode,
                batch,
                category_id,
                stock_quantity,
                unit,
                status,
                cost_price,
                selling_price,
                tax_enabled,
                tax_percentage,
                vendor_id,
                is_archived,
                archived_set_id,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL, ?, ?)
            """,
            (
                item_id,
                name,
                final_sku,
                barcode,
                batch,
                category_id,
                stock_quantity,
                unit,
                final_status,
                cost_price,
                selling_price,
                tax_enabled,
                tax_percentage,
                vendor_id,
                now,
                now,
            ),
        )

        if stock_quantity > 0:
            _insert_movement(
                db,
                inventory_item_id=item_id,
                movement_type="STOCK_ADD",
                quantity_delta=stock_quantity,
                prior_quantity=0,
                new_quantity=stock_quantity,
                purchase_price=cost_price,
                reason="Initial stock",
                actor_user_id=actor_user_id,
                created_at=now,
            )

        db.commit()
    except sqlite3.IntegrityError as error:
        db.rollback()
        message = str(error).lower()
        if "inventory_items.sku" in message:
            return jsonify({"error": "sku already exists"}), 409
        return jsonify({"error": "failed to create item"}), 400

    row = db.execute(
        """
        SELECT
            id,
            name,
            sku,
            barcode,
            batch,
            category_id,
            stock_quantity,
            unit,
            status,
            cost_price,
            selling_price,
            tax_enabled,
            tax_percentage,
            vendor_id
        FROM inventory_items
        WHERE id = ?
        """,
        (item_id,),
    ).fetchone()

    return jsonify({"item": _row_to_item(row)}), 201


@inventory_bp.put("/items/<item_id>")
@require_auth
def update_item(item_id: str):
    role_error = _inventory_mutation_guard_error()
    if role_error:
        return role_error

    payload = request.get_json(silent=True) or {}
    db = get_db()
    actor_user_id = _current_user_id()
    if actor_user_id is None:
        return jsonify({"error": "invalid auth claims"}), 401

    current = db.execute(
        """
        SELECT
            id,
            name,
            sku,
            barcode,
            batch,
            category_id,
            stock_quantity,
            unit,
            status,
            cost_price,
            selling_price,
            tax_enabled,
            tax_percentage,
            vendor_id
        FROM inventory_items
        WHERE id = ?
        """,
        (item_id,),
    ).fetchone()
    if current is None:
        return jsonify({"error": "item not found"}), 404

    next_name = str(payload.get("name", current["name"])) .strip()
    next_sku = str(payload.get("sku", current["sku"])) .strip()
    next_barcode = str(payload.get("barcode", current["barcode"] or "")).strip() or None
    next_batch = str(payload.get("batch", current["batch"] or "")).strip() or None
    next_category_id = str(payload.get("categoryId", current["category_id"])) .strip()
    next_vendor_id = payload.get("vendorId")
    if next_vendor_id is not None:
        next_vendor_id = str(next_vendor_id).strip() or None
    else:
        next_vendor_id = current["vendor_id"] if "vendor_id" in current.keys() else None
        
    next_unit = str(payload.get("unit", current["unit"])) .strip().upper()
    next_stock, parse_error = _parse_int_field(
        payload.get("stockQuantity", current["stock_quantity"]) or 0,
        "stockQuantity",
    )
    if parse_error:
        return parse_error

    next_cost, parse_error = _parse_float_field(
        payload.get("costPrice", current["cost_price"]) or 0,
        "costPrice",
    )
    if parse_error:
        return parse_error

    next_selling, parse_error = _parse_float_field(
        payload.get("sellingPrice", current["selling_price"]) or 0,
        "sellingPrice",
    )
    if parse_error:
        return parse_error

    next_tax_enabled = 1 if bool(payload.get("taxEnabled", bool(current["tax_enabled"]))) else 0
    next_tax_percentage, parse_error = _parse_float_field(
        payload.get("taxPercentage", current["tax_percentage"]) or 0,
        "taxPercentage",
    )
    if parse_error:
        return parse_error

    if not next_name or not next_sku or not next_category_id or not next_unit:
        return jsonify({"error": "name, sku, categoryId, and unit are required"}), 400
    if next_unit not in {"UNITS", "LBS", "KGS", "LITERS"}:
        return jsonify({"error": "invalid unit"}), 400
    if next_stock < 0 or next_cost < 0 or next_selling < 0:
        return jsonify({"error": "stock and prices must be non-negative"}), 400
    if next_tax_percentage < 0 or next_tax_percentage > 100:
        return jsonify({"error": "taxPercentage must be between 0 and 100"}), 400

    category = db.execute(
        """
        SELECT id, status,
               (SELECT COUNT(*) FROM categories sub WHERE sub.parent_id = categories.id AND sub.status = 'Active') AS subcategory_count
        FROM categories WHERE id = ?
        """,
        (next_category_id,),
    ).fetchone()
    if category is None:
        return jsonify({"error": "category not found"}), 404
    if category["status"] != "Active":
        return jsonify({"error": "cannot assign item to archived category"}), 400
    if category["subcategory_count"] > 0:
        return jsonify({"error": "Cannot assign products to a category with subcategories"}), 400

    next_status = _compute_status(next_stock)
    quantity_delta = next_stock - int(current["stock_quantity"])
    stock_reason = str(payload.get("stockReason", "Manual stock adjustment")).strip() or "Manual stock adjustment"

    try:
        db.execute("BEGIN")
        db.execute(
            """
            UPDATE inventory_items
            SET
                name = ?,
                sku = ?,
                barcode = ?,
                batch = ?,
                category_id = ?,
                stock_quantity = ?,
                unit = ?,
                status = ?,
                cost_price = ?,
                selling_price = ?,
                tax_enabled = ?,
                tax_percentage = ?,
                vendor_id = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (
                next_name,
                next_sku,
                next_barcode,
                next_batch,
                next_category_id,
                next_stock,
                next_unit,
                next_status,
                next_cost,
                next_selling,
                next_tax_enabled,
                next_tax_percentage,
                next_vendor_id,
                _iso_now(),
                item_id,
            ),
        )

        if quantity_delta != 0:
            movement_type = "STOCK_ADD" if quantity_delta > 0 else "STOCK_REMOVE"
            movement_price = next_cost if quantity_delta > 0 else float(current["cost_price"])
            _insert_movement(
                db,
                inventory_item_id=item_id,
                movement_type=movement_type,
                quantity_delta=quantity_delta,
                prior_quantity=int(current["stock_quantity"]),
                new_quantity=next_stock,
                purchase_price=movement_price,
                reason=stock_reason,
                actor_user_id=actor_user_id,
                created_at=_iso_now(),
            )

        db.commit()
    except sqlite3.IntegrityError as error:
        db.rollback()
        message = str(error).lower()
        if "inventory_items.sku" in message:
            return jsonify({"error": "sku already exists"}), 409
        return jsonify({"error": "failed to update item"}), 400

    row = db.execute(
        """
        SELECT
            id,
            name,
            sku,
            barcode,
            batch,
            category_id,
            stock_quantity,
            unit,
            status,
            cost_price,
            selling_price,
            tax_enabled,
            tax_percentage,
            vendor_id
        FROM inventory_items
        WHERE id = ?
        """,
        (item_id,),
    ).fetchone()

    return jsonify({"item": _row_to_item(row)})


@inventory_bp.post("/items/<item_id>/add-stock")
@require_auth
def add_stock(item_id: str):
    role_error = _inventory_mutation_guard_error()
    if role_error:
        return role_error

    payload = request.get_json(silent=True) or {}
    quantity_added, parse_error = _parse_int_field(
        payload.get("quantityAdded") or 0,
        "quantityAdded",
    )
    if parse_error:
        return parse_error

    purchase_price, parse_error = _parse_float_field(
        payload.get("purchasePrice") or 0,
        "purchasePrice",
    )
    if parse_error:
        return parse_error

    reason = str(payload.get("reason", "Stock received")).strip() or "Stock received"

    if quantity_added <= 0:
        return jsonify({"error": "quantityAdded must be greater than 0"}), 400
    if purchase_price < 0:
        return jsonify({"error": "purchasePrice must be non-negative"}), 400

    actor_user_id = _current_user_id()
    if actor_user_id is None:
        return jsonify({"error": "invalid auth claims"}), 401

    db = get_db()
    item_row = db.execute(
        """
        SELECT
            id,
            name,
            sku,
            barcode,
            batch,
            category_id,
            stock_quantity,
            unit,
            status,
            cost_price,
            selling_price,
            tax_enabled,
            tax_percentage,
            vendor_id,
            is_archived
        FROM inventory_items
        WHERE id = ?
        """,
        (item_id,),
    ).fetchone()

    if item_row is None or int(item_row["is_archived"]) == 1:
        return jsonify({"error": "item not found"}), 404

    prior_quantity = int(item_row["stock_quantity"])
    next_quantity = prior_quantity + quantity_added
    next_status = _compute_status(next_quantity)
    now = _iso_now()

    try:
        db.execute("BEGIN")
        movement_id = _insert_movement(
            db,
            inventory_item_id=item_id,
            movement_type="STOCK_ADD",
            quantity_delta=quantity_added,
            prior_quantity=prior_quantity,
            new_quantity=next_quantity,
            purchase_price=purchase_price,
            reason=reason,
            actor_user_id=actor_user_id,
            created_at=now,
        )

        db.execute(
            """
            UPDATE inventory_items
            SET
                stock_quantity = ?,
                status = ?,
                cost_price = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (next_quantity, next_status, purchase_price, now, item_id),
        )
        db.commit()
    except sqlite3.IntegrityError:
        db.rollback()
        return jsonify({"error": "failed to add stock"}), 400

    updated_item = db.execute(
        """
        SELECT
            id,
            name,
            sku,
            barcode,
            batch,
            category_id,
            stock_quantity,
            unit,
            status,
            cost_price,
            selling_price,
            tax_enabled,
            tax_percentage,
            vendor_id
        FROM inventory_items
        WHERE id = ?
        """,
        (item_id,),
    ).fetchone()
    movement_row = db.execute(
        """
        SELECT
            m.id,
            m.inventory_item_id,
            m.movement_type,
            m.quantity_delta,
            m.prior_quantity,
            m.new_quantity,
            m.purchase_price,
            m.reason,
            m.actor_user_id,
            u.username AS actor_username,
            m.created_at
        FROM inventory_movements m
        LEFT JOIN users u ON u.id = m.actor_user_id
        WHERE m.id = ?
        """,
        (movement_id,),
    ).fetchone()

    return jsonify({"item": _row_to_item(updated_item), "movement": _movement_row_to_dict(movement_row)}), 201


@inventory_bp.post("/items/<item_id>/remove-stock")
@require_auth
def remove_stock(item_id: str):
    role_error = _inventory_mutation_guard_error()
    if role_error:
        return role_error

    payload = request.get_json(silent=True) or {}
    quantity_removed, parse_error = _parse_int_field(
        payload.get("quantityRemoved") or 0,
        "quantityRemoved",
    )
    if parse_error:
        return parse_error

    reason = str(payload.get("reason", "Stock removed")).strip() or "Stock removed"

    if quantity_removed <= 0:
        return jsonify({"error": "quantityRemoved must be greater than 0"}), 400

    actor_user_id = _current_user_id()
    if actor_user_id is None:
        return jsonify({"error": "invalid auth claims"}), 401

    db = get_db()
    item_row = db.execute(
        """
        SELECT
            id,
            name,
            sku,
            barcode,
            batch,
            category_id,
            stock_quantity,
            unit,
            status,
            cost_price,
            selling_price,
            tax_enabled,
            tax_percentage,
            vendor_id,
            is_archived
        FROM inventory_items
        WHERE id = ?
        """,
        (item_id,),
    ).fetchone()

    if item_row is None or int(item_row["is_archived"]) == 1:
        return jsonify({"error": "item not found"}), 404

    prior_quantity = int(item_row["stock_quantity"])
    if quantity_removed > prior_quantity:
        return jsonify({"error": "quantityRemoved exceeds stock quantity"}), 400

    next_quantity = prior_quantity - quantity_removed
    next_status = _compute_status(next_quantity)
    now = _iso_now()

    try:
        db.execute("BEGIN")
        movement_id = _insert_movement(
            db,
            inventory_item_id=item_id,
            movement_type="STOCK_REMOVE",
            quantity_delta=-quantity_removed,
            prior_quantity=prior_quantity,
            new_quantity=next_quantity,
            purchase_price=float(item_row["cost_price"]),
            reason=reason,
            actor_user_id=actor_user_id,
            created_at=now,
        )

        db.execute(
            """
            UPDATE inventory_items
            SET
                stock_quantity = ?,
                status = ?,
                updated_at = ?
            WHERE id = ?
            """,
            (next_quantity, next_status, now, item_id),
        )
        db.commit()
    except sqlite3.IntegrityError:
        db.rollback()
        return jsonify({"error": "failed to remove stock"}), 400

    updated_item = db.execute(
        """
        SELECT
            id,
            name,
            sku,
            barcode,
            batch,
            category_id,
            stock_quantity,
            unit,
            status,
            cost_price,
            selling_price,
            tax_enabled,
            tax_percentage,
            vendor_id
        FROM inventory_items
        WHERE id = ?
        """,
        (item_id,),
    ).fetchone()
    movement_row = db.execute(
        """
        SELECT
            m.id,
            m.inventory_item_id,
            m.movement_type,
            m.quantity_delta,
            m.prior_quantity,
            m.new_quantity,
            m.purchase_price,
            m.reason,
            m.actor_user_id,
            u.username AS actor_username,
            m.created_at
        FROM inventory_movements m
        LEFT JOIN users u ON u.id = m.actor_user_id
        WHERE m.id = ?
        """,
        (movement_id,),
    ).fetchone()

    return jsonify({"item": _row_to_item(updated_item), "movement": _movement_row_to_dict(movement_row)}), 201


@inventory_bp.get("/items/<item_id>/movements")
@require_auth
def list_item_movements(item_id: str):
    try:
        pagination = parse_pagination_args(request.args)
    except PaginationValidationError as error:
        return jsonify({"error": str(error)}), 400

    db = get_db()
    item_exists = db.execute(
        "SELECT 1 FROM inventory_items WHERE id = ?",
        (item_id,),
    ).fetchone()
    if item_exists is None:
        return jsonify({"error": "item not found"}), 404

    total_row = db.execute(
        "SELECT COUNT(*) AS total FROM inventory_movements WHERE inventory_item_id = ?",
        (item_id,),
    ).fetchone()
    total = int(total_row["total"])

    rows = db.execute(
        """
        SELECT
            m.id,
            m.inventory_item_id,
            m.movement_type,
            m.quantity_delta,
            m.prior_quantity,
            m.new_quantity,
            m.purchase_price,
            m.reason,
            m.actor_user_id,
            u.username AS actor_username,
            m.created_at
        FROM inventory_movements m
        LEFT JOIN users u ON u.id = m.actor_user_id
        WHERE m.inventory_item_id = ?
        ORDER BY m.created_at DESC
        LIMIT ? OFFSET ?
        """,
        (item_id, pagination.page_size, pagination.offset),
    ).fetchall()

    return jsonify(
        {
            "movements": [_movement_row_to_dict(row) for row in rows],
            **build_pagination_meta(total, pagination),
        }
    )


@inventory_bp.delete("/items/<item_id>")
@require_auth
def delete_item(item_id: str):
    role_error = _inventory_mutation_guard_error()
    if role_error:
        return role_error

    db = get_db()
    try:
        db.execute("BEGIN")
        existing = db.execute(
            "SELECT id, is_archived FROM inventory_items WHERE id = ?",
            (item_id,),
        ).fetchone()
        if existing is None or int(existing["is_archived"]) == 1:
            db.rollback()
            return jsonify({"error": "item not found"}), 404

        if _item_is_referenced_by_sales(db, item_id):
            db.rollback()
            return jsonify({"error": "item cannot be deleted because it is referenced by sales"}), 409

        if _item_has_movements(db, item_id):
            archive_result = db.execute(
                "UPDATE inventory_items SET is_archived = 1, updated_at = ? WHERE id = ? AND is_archived = 0",
                (_iso_now(), item_id),
            )
            db.commit()
            if archive_result.rowcount == 0:
                return jsonify({"error": "item not found"}), 404
            return jsonify({"success": True, "archived": True})

        result = db.execute("DELETE FROM inventory_items WHERE id = ?", (item_id,))
        db.commit()
    except sqlite3.IntegrityError:
        db.rollback()
        return jsonify({"error": "item cannot be deleted because it is referenced by sales"}), 409

    if result.rowcount == 0:
        return jsonify({"error": "item not found"}), 404
    return jsonify({"success": True})


@inventory_bp.post("/items/bulk-delete")
@require_auth
def bulk_delete_items():
    role_error = _inventory_mutation_guard_error()
    if role_error:
        return role_error

    payload = request.get_json(silent=True) or {}
    ids = payload.get("ids")
    if not isinstance(ids, list) or len(ids) == 0:
        return jsonify({"error": "ids must be a non-empty array"}), 400

    normalized_ids = [str(item_id).strip() for item_id in ids if str(item_id).strip()]
    if not normalized_ids:
        return jsonify({"error": "ids must be a non-empty array"}), 400

    placeholders = ",".join("?" for _ in normalized_ids)
    db = get_db()

    try:
        db.execute("BEGIN")
        active_rows = db.execute(
            f"SELECT id FROM inventory_items WHERE id IN ({placeholders}) AND is_archived = 0",
            normalized_ids,
        ).fetchall()
        active_ids = [str(row["id"]) for row in active_rows]

        if len(active_ids) == 0:
            db.commit()
            return jsonify({"success": True, "deletedCount": 0, "archivedCount": 0})

        active_placeholders = ",".join("?" for _ in active_ids)
        movement_rows = db.execute(
            f"SELECT DISTINCT inventory_item_id FROM inventory_movements WHERE inventory_item_id IN ({active_placeholders})",
            active_ids,
        ).fetchall()
        movement_item_ids = {str(row["inventory_item_id"]) for row in movement_rows}

        sale_rows = db.execute(
            f"SELECT DISTINCT inventory_item_id FROM sale_items WHERE inventory_item_id IN ({active_placeholders})",
            active_ids,
        ).fetchall()
        sale_item_ids = {str(row["inventory_item_id"]) for row in sale_rows}
        if sale_item_ids:
            db.rollback()
            return jsonify({"error": "one or more items cannot be deleted because they are referenced by sales"}), 409

        archive_ids = [item_id for item_id in active_ids if item_id in movement_item_ids]
        delete_ids = [item_id for item_id in active_ids if item_id not in movement_item_ids]

        archived_count = 0
        deleted_count = 0

        if archive_ids:
            archive_placeholders = ",".join("?" for _ in archive_ids)
            archive_result = db.execute(
                f"UPDATE inventory_items SET is_archived = 1, updated_at = ? WHERE id IN ({archive_placeholders}) AND is_archived = 0",
                [_iso_now(), *archive_ids],
            )
            archived_count = int(archive_result.rowcount)

        if delete_ids:
            delete_placeholders = ",".join("?" for _ in delete_ids)
            delete_result = db.execute(
                f"DELETE FROM inventory_items WHERE id IN ({delete_placeholders}) AND is_archived = 0",
                delete_ids,
            )
            deleted_count = int(delete_result.rowcount)

        db.commit()
    except sqlite3.IntegrityError:
        db.rollback()
        return jsonify({"error": "one or more items cannot be deleted because they are referenced by sales"}), 409
    except Exception:
        db.rollback()
        return jsonify({"error": "failed to delete items"}), 500

    return jsonify({"success": True, "deletedCount": deleted_count + archived_count, "archivedCount": archived_count})
