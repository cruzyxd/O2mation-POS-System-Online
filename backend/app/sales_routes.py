from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from uuid import uuid4

from flask import Blueprint, g, jsonify, request

from .auth_middleware import require_auth
from .db import get_db
from .pagination import PaginationValidationError, build_pagination_meta, parse_pagination_args


sales_bp = Blueprint("sales", __name__)
LOW_STOCK_MAX = 50
CENTS = Decimal("0.01")


def _iso_now() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _current_user_id() -> int | None:
    raw_user_id = g.auth_claims.get("uid")
    try:
        return int(raw_user_id)
    except (TypeError, ValueError):
        return None


def _compute_status(stock_quantity: int) -> str:
    if stock_quantity <= 0:
        return "Out of Stock"
    if stock_quantity <= LOW_STOCK_MAX:
        return "Low Stock"
    return "In Stock"


def _money(value: object) -> Decimal:
    try:
        return Decimal(str(value)).quantize(CENTS, rounding=ROUND_HALF_UP)
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError("invalid monetary value")


def _next_receipt_number() -> str:
    # Short readable identifier suitable for cashier search and receipts.
    stamp = datetime.now(UTC).strftime("%Y%m%d%H%M%S")
    return f"R-{stamp}-{uuid4().hex[:6].upper()}"


def _session_row_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "cashierUserId": int(row["cashier_user_id"]),
        "openedAt": row["opened_at"],
        "closedAt": row["closed_at"],
        "openingCash": float(row["opening_cash"]),
        "closingCash": float(row["closing_cash"]) if row["closing_cash"] is not None else None,
        "expectedCash": float(row["expected_cash"]),
        "variance": float(row["variance"]) if row["variance"] is not None else None,
        "status": row["status"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
    }


def _sale_row_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "receiptNumber": row["receipt_number"],
        "registerSessionId": row["register_session_id"],
        "cashierUserId": int(row["cashier_user_id"]),
        "subtotal": float(row["subtotal"]),
        "taxTotal": float(row["tax_total"]),
        "discountTotal": float(row["discount_total"]),
        "grandTotal": float(row["grand_total"]),
        "paymentStatus": row["payment_status"],
        "saleStatus": row["sale_status"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "voidedAt": row["voided_at"],
    }


def _payment_row_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "saleId": row["sale_id"],
        "method": row["method"],
        "tenderedAmount": float(row["tendered_amount"]),
        "paidAmount": float(row["paid_amount"]),
        "changeAmount": float(row["change_amount"]),
        "createdAt": row["created_at"],
    }


def _sale_item_row_to_dict(row) -> dict:
    return {
        "id": row["id"],
        "saleId": row["sale_id"],
        "inventoryItemId": row["inventory_item_id"],
        "skuSnapshot": row["sku_snapshot"],
        "nameSnapshot": row["name_snapshot"],
        "quantity": int(row["quantity"]),
        "unitPrice": float(row["unit_price"]),
        "taxPercentage": float(row["tax_percentage"]),
        "lineTax": float(row["line_tax"]),
        "lineTotal": float(row["line_total"]),
        "createdAt": row["created_at"],
    }


def _normalize_checkout_items(raw_items) -> tuple[dict[str, int] | None, str | None]:
    if not isinstance(raw_items, list) or len(raw_items) == 0:
        return None, "items must be a non-empty array"

    aggregated: dict[str, int] = defaultdict(int)
    for raw_item in raw_items:
        if not isinstance(raw_item, dict):
            return None, "items must contain objects"

        inventory_item_id = str(raw_item.get("inventoryItemId", "")).strip()
        if not inventory_item_id:
            return None, "inventoryItemId is required"

        quantity_raw = raw_item.get("quantity")
        try:
            quantity = int(quantity_raw)
        except (TypeError, ValueError):
            return None, "quantity must be a positive integer"

        if quantity <= 0:
            return None, "quantity must be a positive integer"

        aggregated[inventory_item_id] += quantity

    return dict(aggregated), None


@sales_bp.route("/<path:_path>", methods=["OPTIONS"])
def preflight(_path: str):
    return ("", 204)


@sales_bp.post("/register/open")
@require_auth
def open_register_session():
    payload = request.get_json(silent=True) or {}
    cashier_user_id = _current_user_id()
    if cashier_user_id is None:
        return jsonify({"error": "invalid auth claims"}), 401

    try:
        opening_cash = _money(payload.get("openingCash", 0))
    except ValueError:
        return jsonify({"error": "openingCash must be a valid number"}), 400

    if opening_cash < 0:
        return jsonify({"error": "openingCash must be non-negative"}), 400

    db = get_db()
    active_row = db.execute(
        """
        SELECT *
        FROM register_sessions
        WHERE cashier_user_id = ? AND status = 'OPEN'
        ORDER BY created_at DESC
        LIMIT 1
        """,
        (cashier_user_id,),
    ).fetchone()

    if active_row is not None:
        return jsonify({"session": _session_row_to_dict(active_row)}), 409

    now = _iso_now()
    session_id = str(uuid4())
    db.execute(
        """
        INSERT INTO register_sessions (
            id,
            cashier_user_id,
            opened_at,
            opening_cash,
            expected_cash,
            status,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'OPEN', ?, ?)
        """,
        (
            session_id,
            cashier_user_id,
            now,
            float(opening_cash),
            float(opening_cash),
            now,
            now,
        ),
    )
    db.commit()

    row = db.execute("SELECT * FROM register_sessions WHERE id = ?", (session_id,)).fetchone()
    return jsonify({"session": _session_row_to_dict(row)}), 201


@sales_bp.post("/register/close")
@require_auth
def close_register_session():
    payload = request.get_json(silent=True) or {}
    cashier_user_id = _current_user_id()
    if cashier_user_id is None:
        return jsonify({"error": "invalid auth claims"}), 401

    session_id = str(payload.get("sessionId", "")).strip()
    if not session_id:
        return jsonify({"error": "sessionId is required"}), 400

    try:
        counted_cash = _money(payload.get("countedCash"))
    except ValueError:
        return jsonify({"error": "countedCash must be a valid number"}), 400

    if counted_cash < 0:
        return jsonify({"error": "countedCash must be non-negative"}), 400

    db = get_db()
    session = db.execute(
        "SELECT * FROM register_sessions WHERE id = ?",
        (session_id,),
    ).fetchone()

    if session is None:
        return jsonify({"error": "register session not found"}), 404
    if int(session["cashier_user_id"]) != cashier_user_id:
        return jsonify({"error": "forbidden"}), 403
    if session["status"] != "OPEN":
        return jsonify({"error": "register session is not open"}), 400

    expected_cash = _money(session["expected_cash"])
    variance = (counted_cash - expected_cash).quantize(CENTS, rounding=ROUND_HALF_UP)
    now = _iso_now()

    db.execute(
        """
        UPDATE register_sessions
        SET closed_at = ?,
            closing_cash = ?,
            variance = ?,
            status = 'CLOSED',
            updated_at = ?
        WHERE id = ?
        """,
        (now, float(counted_cash), float(variance), now, session_id),
    )
    db.commit()

    row = db.execute("SELECT * FROM register_sessions WHERE id = ?", (session_id,)).fetchone()
    return jsonify({"session": _session_row_to_dict(row)})


@sales_bp.post("/checkout")
@require_auth
def checkout_sale():
    payload = request.get_json(silent=True) or {}

    cashier_user_id = _current_user_id()
    if cashier_user_id is None:
        return jsonify({"error": "invalid auth claims"}), 401

    session_id = str(payload.get("sessionId", "")).strip()
    if not session_id:
        return jsonify({"error": "sessionId is required"}), 400

    normalized_items, items_error = _normalize_checkout_items(payload.get("items"))
    if items_error:
        return jsonify({"error": items_error}), 400

    try:
        tendered_amount = _money(payload.get("tenderedAmount"))
    except ValueError:
        return jsonify({"error": "tenderedAmount must be a valid number"}), 400

    if tendered_amount < 0:
        return jsonify({"error": "tenderedAmount must be non-negative"}), 400

    db = get_db()

    session = db.execute(
        "SELECT * FROM register_sessions WHERE id = ?",
        (session_id,),
    ).fetchone()
    if session is None:
        return jsonify({"error": "register session not found"}), 404
    if int(session["cashier_user_id"]) != cashier_user_id:
        return jsonify({"error": "forbidden"}), 403
    if session["status"] != "OPEN":
        return jsonify({"error": "register session is not open"}), 400

    item_ids = list(normalized_items.keys())
    placeholders = ",".join(["?"] * len(item_ids))
    rows = db.execute(
        f"""
        SELECT
            i.id,
            i.name,
            i.sku,
            i.stock_quantity,
            i.status,
            i.selling_price,
            i.tax_enabled,
            i.tax_percentage,
            i.is_archived,
            c.status AS category_status
        FROM inventory_items i
        JOIN categories c ON c.id = i.category_id
        WHERE i.id IN ({placeholders})
        """,
        item_ids,
    ).fetchall()

    row_by_id = {row["id"]: row for row in rows}
    for item_id in item_ids:
        if item_id not in row_by_id:
            return jsonify({"error": f"inventory item not found: {item_id}"}), 404

    subtotal = Decimal("0.00")
    tax_total = Decimal("0.00")
    sale_lines: list[dict] = []

    for item_id, quantity in normalized_items.items():
        row = row_by_id[item_id]
        if int(row["is_archived"]) == 1 or row["category_status"] != "Active":
            return jsonify({"error": f"item is not available for sale: {item_id}"}), 400

        available_quantity = int(row["stock_quantity"])
        if quantity > available_quantity:
            return jsonify({"error": f"insufficient stock for item {row['sku']}"}), 400

        unit_price = _money(row["selling_price"])
        tax_percentage = _money(row["tax_percentage"] if int(row["tax_enabled"]) == 1 else 0)
        line_subtotal = (unit_price * Decimal(quantity)).quantize(CENTS, rounding=ROUND_HALF_UP)
        line_tax = (line_subtotal * (tax_percentage / Decimal("100"))).quantize(CENTS, rounding=ROUND_HALF_UP)
        line_total = (line_subtotal + line_tax).quantize(CENTS, rounding=ROUND_HALF_UP)

        subtotal += line_subtotal
        tax_total += line_tax

        sale_lines.append(
            {
                "inventoryItemId": item_id,
                "skuSnapshot": row["sku"],
                "nameSnapshot": row["name"],
                "quantity": quantity,
                "unitPrice": unit_price,
                "taxPercentage": tax_percentage,
                "lineTax": line_tax,
                "lineTotal": line_total,
                "remainingQuantity": available_quantity - quantity,
            }
        )

    subtotal = subtotal.quantize(CENTS, rounding=ROUND_HALF_UP)
    tax_total = tax_total.quantize(CENTS, rounding=ROUND_HALF_UP)
    discount_total = Decimal("0.00")
    grand_total = (subtotal + tax_total - discount_total).quantize(CENTS, rounding=ROUND_HALF_UP)

    if tendered_amount < grand_total:
        return jsonify({"error": "tenderedAmount is less than grandTotal"}), 400

    paid_amount = grand_total
    change_amount = (tendered_amount - paid_amount).quantize(CENTS, rounding=ROUND_HALF_UP)

    now = _iso_now()
    sale_id = str(uuid4())
    payment_id = str(uuid4())
    receipt_number = _next_receipt_number()

    try:
        db.execute("BEGIN")

        db.execute(
            """
            INSERT INTO sales (
                id,
                receipt_number,
                register_session_id,
                cashier_user_id,
                subtotal,
                tax_total,
                discount_total,
                grand_total,
                payment_status,
                sale_status,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PAID', 'COMPLETED', ?, ?)
            """,
            (
                sale_id,
                receipt_number,
                session_id,
                cashier_user_id,
                float(subtotal),
                float(tax_total),
                float(discount_total),
                float(grand_total),
                now,
                now,
            ),
        )

        for line in sale_lines:
            db.execute(
                """
                INSERT INTO sale_items (
                    id,
                    sale_id,
                    inventory_item_id,
                    sku_snapshot,
                    name_snapshot,
                    quantity,
                    unit_price,
                    tax_percentage,
                    line_tax,
                    line_total,
                    created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    str(uuid4()),
                    sale_id,
                    line["inventoryItemId"],
                    line["skuSnapshot"],
                    line["nameSnapshot"],
                    line["quantity"],
                    float(line["unitPrice"]),
                    float(line["taxPercentage"]),
                    float(line["lineTax"]),
                    float(line["lineTotal"]),
                    now,
                ),
            )

            next_quantity = int(line["remainingQuantity"])
            next_status = _compute_status(next_quantity)
            db.execute(
                """
                UPDATE inventory_items
                SET stock_quantity = ?, status = ?, updated_at = ?
                WHERE id = ?
                """,
                (next_quantity, next_status, now, line["inventoryItemId"]),
            )

        db.execute(
            """
            INSERT INTO sale_payments (
                id,
                sale_id,
                method,
                tendered_amount,
                paid_amount,
                change_amount,
                created_at
            )
            VALUES (?, ?, 'CASH', ?, ?, ?, ?)
            """,
            (
                payment_id,
                sale_id,
                float(tendered_amount),
                float(paid_amount),
                float(change_amount),
                now,
            ),
        )

        expected_cash = _money(session["expected_cash"])
        next_expected_cash = (expected_cash + paid_amount).quantize(CENTS, rounding=ROUND_HALF_UP)
        db.execute(
            """
            UPDATE register_sessions
            SET expected_cash = ?, updated_at = ?
            WHERE id = ?
            """,
            (float(next_expected_cash), now, session_id),
        )

        db.commit()
    except Exception:
        db.rollback()
        raise

    sale_row = db.execute("SELECT * FROM sales WHERE id = ?", (sale_id,)).fetchone()
    payment_row = db.execute("SELECT * FROM sale_payments WHERE id = ?", (payment_id,)).fetchone()

    return jsonify({"sale": _sale_row_to_dict(sale_row), "payment": _payment_row_to_dict(payment_row)}), 201


@sales_bp.get("")
@require_auth
def list_sales():
    search = str(request.args.get("search", "")).strip().lower()

    try:
        pagination = parse_pagination_args(request.args)
    except PaginationValidationError as error:
        return jsonify({"error": str(error)}), 400

    where_sql = ""
    params: list[str] = []
    if search:
        where_sql = "WHERE LOWER(s.receipt_number) LIKE ?"
        params.append(f"%{search}%")

    db = get_db()
    count_sql = f"SELECT COUNT(*) AS total FROM sales s {where_sql}"
    total = int(db.execute(count_sql, params).fetchone()["total"])

    rows = db.execute(
        f"""
        SELECT
            s.id,
            s.receipt_number,
            s.register_session_id,
            s.cashier_user_id,
            s.subtotal,
            s.tax_total,
            s.discount_total,
            s.grand_total,
            s.payment_status,
            s.sale_status,
            s.created_at,
            s.updated_at,
            s.voided_at
        FROM sales s
        {where_sql}
        ORDER BY s.created_at DESC
        LIMIT ? OFFSET ?
        """,
        [*params, pagination.page_size, pagination.offset],
    ).fetchall()

    return jsonify({"sales": [_sale_row_to_dict(row) for row in rows], **build_pagination_meta(total, pagination)})


@sales_bp.get("/<sale_id>")
@require_auth
def get_sale_detail(sale_id: str):
    db = get_db()

    sale_row = db.execute(
        """
        SELECT
            id,
            receipt_number,
            register_session_id,
            cashier_user_id,
            subtotal,
            tax_total,
            discount_total,
            grand_total,
            payment_status,
            sale_status,
            created_at,
            updated_at,
            voided_at
        FROM sales
        WHERE id = ?
        """,
        (sale_id,),
    ).fetchone()

    if sale_row is None:
        return jsonify({"error": "sale not found"}), 404

    item_rows = db.execute(
        """
        SELECT
            id,
            sale_id,
            inventory_item_id,
            sku_snapshot,
            name_snapshot,
            quantity,
            unit_price,
            tax_percentage,
            line_tax,
            line_total,
            created_at
        FROM sale_items
        WHERE sale_id = ?
        ORDER BY created_at ASC
        """,
        (sale_id,),
    ).fetchall()

    payment_rows = db.execute(
        """
        SELECT
            id,
            sale_id,
            method,
            tendered_amount,
            paid_amount,
            change_amount,
            created_at
        FROM sale_payments
        WHERE sale_id = ?
        ORDER BY created_at ASC
        """,
        (sale_id,),
    ).fetchall()

    return jsonify(
        {
            "sale": _sale_row_to_dict(sale_row),
            "items": [_sale_item_row_to_dict(row) for row in item_rows],
            "payments": [_payment_row_to_dict(row) for row in payment_rows],
        }
    )
