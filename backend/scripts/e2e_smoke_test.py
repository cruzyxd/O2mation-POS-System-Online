import json
import os
import sys
from typing import Any
from urllib import error, request
from uuid import uuid4


class SmokeTestError(RuntimeError):
    pass


def _api_call(
    base_url: str,
    method: str,
    path: str,
    token: str | None = None,
    payload: dict[str, Any] | None = None,
) -> tuple[int, Any]:
    body_bytes = None
    headers = {"Accept": "application/json"}

    if payload is not None:
        body_bytes = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = request.Request(
        url=f"{base_url}{path}",
        method=method,
        data=body_bytes,
        headers=headers,
    )

    try:
        with request.urlopen(req, timeout=20) as response:
            raw = response.read().decode("utf-8")
            data = json.loads(raw) if raw else {}
            return response.status, data
    except error.HTTPError as http_error:
        raw = http_error.read().decode("utf-8")
        try:
            data = json.loads(raw) if raw else {}
        except json.JSONDecodeError:
            data = {"error": raw}
        return http_error.code, data


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise SmokeTestError(message)


def _find_category(categories: list[dict[str, Any]], category_id: str) -> dict[str, Any] | None:
    for category in categories:
        if category.get("id") == category_id:
            return category
    return None


def _find_vendor(vendors: list[dict[str, Any]], vendor_id: str) -> dict[str, Any] | None:
    for vendor in vendors:
        if vendor.get("id") == vendor_id:
            return vendor
    return None


def _find_sale(sales: list[dict[str, Any]], sale_id: str) -> dict[str, Any] | None:
    for sale in sales:
        if sale.get("id") == sale_id:
            return sale
    return None


def _assert_pagination(body: dict[str, Any], page: int, page_size: int) -> None:
    _require(body.get("page") == page, f"Expected page={page}, got {body.get('page')}")
    _require(body.get("pageSize") == page_size, f"Expected pageSize={page_size}, got {body.get('pageSize')}")
    _require(isinstance(body.get("total"), int), "Expected integer total in paginated response")
    _require(isinstance(body.get("hasMore"), bool), "Expected boolean hasMore in paginated response")


def run() -> None:
    base_url = os.getenv("POS_SMOKE_BASE", "http://127.0.0.1:5000").rstrip("/")
    smoke_category_id: str | None = None

    print(f"[smoke] Base URL: {base_url}")

    status, body = _api_call(base_url, "GET", "/api/health")
    _require(status == 200, f"Health check failed with status {status}: {body}")
    _require(body.get("status") == "ok", f"Unexpected health response: {body}")
    print("[smoke] Health check passed")

    status, body = _api_call(
        base_url,
        "POST",
        "/api/auth/login",
        payload={"username": "owner", "password": "owner123"},
    )
    _require(status == 200, f"Login failed with status {status}: {body}")
    access_token = body.get("access_token")
    _require(isinstance(access_token, str) and access_token, "Missing access_token in login response")

    status, body = _api_call(
        base_url,
        "POST",
        "/api/auth/login",
        payload={"username": "cashier1", "password": "cashier123"},
    )
    _require(status == 200, f"Cashier login failed with status {status}: {body}")
    cashier_token = body.get("access_token")
    _require(isinstance(cashier_token, str) and cashier_token, "Missing cashier access_token in login response")

    print("[smoke] Auth login passed")

    status, body = _api_call(base_url, "GET", "/api/categories?page=1&pageSize=25", token=access_token)
    _require(status == 200, f"Category listing failed with status {status}: {body}")
    _assert_pagination(body, page=1, page_size=25)
    all_categories = body.get("categories") or []
    _require(isinstance(all_categories, list) and len(all_categories) > 0, "No categories returned")

    cashier_forbidden_category_suffix = uuid4().hex[:6].upper()
    status, body = _api_call(
        base_url,
        "POST",
        "/api/categories",
        token=cashier_token,
        payload={
            "name": f"Cashier Forbidden Category {cashier_forbidden_category_suffix}",
            "code": f"CFB{cashier_forbidden_category_suffix[:3]}",
        },
    )
    _require(
        status == 403,
        f"Expected cashier category create to be forbidden, got {status}: {body}",
    )

    category_suffix = uuid4().hex[:6].upper()
    create_category_status, create_category_body = _api_call(
        base_url,
        "POST",
        "/api/categories",
        token=access_token,
        payload={
            "name": f"Smoke Category {category_suffix}",
            "code": f"SMK{category_suffix[:4]}",
        },
    )
    _require(
        create_category_status == 201,
        f"Create smoke category failed: {create_category_status} {create_category_body}",
    )
    created_category = create_category_body.get("category") or {}
    smoke_category_id = created_category.get("id")
    _require(isinstance(smoke_category_id, str) and smoke_category_id, "Smoke category missing id")

    cashier_forbidden_suffix = uuid4().hex[:8].upper()
    status, body = _api_call(
        base_url,
        "POST",
        "/api/inventory/items",
        token=cashier_token,
        payload={
            "name": f"Cashier Forbidden Item {cashier_forbidden_suffix}",
            "sku": f"CASHIER-{cashier_forbidden_suffix}",
            "categoryId": smoke_category_id,
            "startingAmount": 1,
            "unit": "UNITS",
            "costPrice": 1,
            "sellingPrice": 2,
            "taxEnabled": False,
            "taxPercentage": 0,
        },
    )
    _require(status == 403, f"Expected cashier inventory create to be forbidden, got {status}: {body}")

    status, body = _api_call(base_url, "GET", "/api/inventory/items?page=1&pageSize=50", token=access_token)
    _require(status == 200, f"Inventory listing failed with status {status}: {body}")
    _assert_pagination(body, page=1, page_size=50)
    items = body.get("items") or []
    _require(isinstance(items, list), "Inventory listing payload is invalid")
    summary = body.get("summary") or {}
    _require(isinstance(summary.get("totalValue"), (int, float)), "Inventory summary missing totalValue")
    _require(isinstance(summary.get("lowStockCount"), int), "Inventory summary missing lowStockCount")
    _require(isinstance(summary.get("outOfStockCount"), int), "Inventory summary missing outOfStockCount")

    malformed_create_suffix = uuid4().hex[:8].upper()
    status, body = _api_call(
        base_url,
        "POST",
        "/api/inventory/items",
        token=access_token,
        payload={
            "name": f"Malformed Create {malformed_create_suffix}",
            "sku": f"MAL-{malformed_create_suffix}",
            "categoryId": smoke_category_id,
            "startingAmount": "not-a-number",
            "unit": "UNITS",
            "costPrice": 1,
            "sellingPrice": 2,
            "taxEnabled": False,
            "taxPercentage": 0,
        },
    )
    _require(
        status == 400,
        f"Expected malformed inventory create payload to return 400, got {status}: {body}",
    )
    print("[smoke] Category and inventory listing passed")

    vendor_suffix = uuid4().hex[:8]
    vendor_name = f"Smoke Vendor {vendor_suffix}"
    vendor_id: str | None = None

    status, body = _api_call(base_url, "GET", "/api/vendors?page=1&pageSize=25", token=access_token)
    _require(status == 200, f"Vendor listing failed with status {status}: {body}")
    _assert_pagination(body, page=1, page_size=25)
    vendors = body.get("vendors") or []
    _require(isinstance(vendors, list), "Vendor listing payload is invalid")

    status, body = _api_call(
        base_url,
        "POST",
        "/api/vendors",
        token=cashier_token,
        payload={
            "name": f"Cashier Forbidden Vendor {uuid4().hex[:8]}",
            "phone": "000-000-0000",
            "notes": "should fail",
        },
    )
    _require(
        status == 403,
        f"Expected cashier vendor create to be forbidden, got {status}: {body}",
    )

    try:
        status, body = _api_call(
            base_url,
            "POST",
            "/api/vendors",
            token=access_token,
            payload={
                "name": vendor_name,
                "phone": "000-000-0000",
                "notes": "smoke test",
            },
        )
        _require(status == 201, f"Create vendor failed with status {status}: {body}")
        created_vendor = body.get("vendor") or {}
        vendor_id = created_vendor.get("id")
        _require(isinstance(vendor_id, str) and vendor_id, "Created vendor missing id")

        status, body = _api_call(
            base_url,
            "PUT",
            f"/api/vendors/{vendor_id}",
            token=access_token,
            payload={"notes": "updated by smoke"},
        )
        _require(status == 200, f"Update vendor failed with status {status}: {body}")

        status, body = _api_call(
            base_url,
            "POST",
            f"/api/vendors/{vendor_id}/archive",
            token=access_token,
        )
        _require(status == 200 and body.get("success") is True, f"Archive vendor failed: {status} {body}")

        status, body = _api_call(
            base_url,
            "POST",
            f"/api/vendors/{vendor_id}/restore",
            token=access_token,
        )
        _require(status == 200 and body.get("success") is True, f"Restore vendor failed: {status} {body}")

        status, body = _api_call(base_url, "GET", "/api/vendors?status=Active&page=1&pageSize=25", token=access_token)
        _require(status == 200, f"Filtered vendor listing failed with status {status}: {body}")
        _assert_pagination(body, page=1, page_size=25)
        active_vendors = body.get("vendors") or []
        _require(_find_vendor(active_vendors, vendor_id) is not None, "Restored vendor not listed as active")

        print("[smoke] Vendor create/update/archive/restore cycle passed")

    finally:
        if vendor_id:
            _api_call(
                base_url,
                "POST",
                f"/api/vendors/{vendor_id}/archive",
                token=access_token,
            )

    temp_suffix = uuid4().hex[:8].upper()
    temp_sku = f"SMOKE-{temp_suffix}"
    temp_barcode = f"BC-{temp_suffix}"
    temp_item_id: str | None = None
    register_session_id: str | None = None
    opening_cash = 50.0
    expected_cash_for_close = opening_cash

    try:
        status, body = _api_call(
            base_url,
            "POST",
            "/api/inventory/items",
            token=access_token,
            payload={
                "name": f"Smoke Temp Item {temp_suffix}",
                "sku": temp_sku,
                "barcode": temp_barcode,
                "categoryId": smoke_category_id,
                "startingAmount": 11,
                "unit": "UNITS",
                "costPrice": 1.25,
                "sellingPrice": 2.75,
                "taxEnabled": False,
                "taxPercentage": 0,
            },
        )
        _require(status == 201, f"Create inventory item failed with status {status}: {body}")
        temp_item = body.get("item") or {}
        temp_item_id = temp_item.get("id")
        _require(isinstance(temp_item_id, str) and temp_item_id, "Created inventory item missing id")

        status, body = _api_call(
            base_url,
            "PUT",
            f"/api/inventory/items/{temp_item_id}",
            token=access_token,
            payload={"taxPercentage": "not-a-number"},
        )
        _require(
            status == 400,
            f"Expected malformed taxPercentage update payload to return 400, got {status}: {body}",
        )

        status, body = _api_call(
            base_url,
            "POST",
            f"/api/inventory/items/{temp_item_id}/add-stock",
            token=access_token,
            payload={"quantityAdded": "not-a-number", "purchasePrice": 1.5},
        )
        _require(
            status == 400,
            f"Expected malformed add-stock payload to return 400, got {status}: {body}",
        )

        status, body = _api_call(
            base_url,
            "POST",
            f"/api/inventory/items/{temp_item_id}/remove-stock",
            token=access_token,
            payload={"quantityRemoved": "not-a-number"},
        )
        _require(
            status == 400,
            f"Expected malformed remove-stock payload to return 400, got {status}: {body}",
        )

        status, body = _api_call(
            base_url,
            "GET",
            f"/api/inventory/items/lookup?barcode={temp_barcode}",
            token=access_token,
        )
        _require(status == 200, f"Inventory lookup by barcode failed with status {status}: {body}")
        _require(
            (body.get("item") or {}).get("id") == temp_item_id,
            f"Inventory lookup by barcode returned wrong item: {body}",
        )

        status, body = _api_call(
            base_url,
            "GET",
            f"/api/inventory/items/lookup?sku={temp_sku}",
            token=access_token,
        )
        _require(status == 200, f"Inventory lookup by sku failed with status {status}: {body}")
        _require(
            (body.get("item") or {}).get("id") == temp_item_id,
            f"Inventory lookup by sku returned wrong item: {body}",
        )

        status, body = _api_call(
            base_url,
            "PUT",
            f"/api/inventory/items/{temp_item_id}",
            token=access_token,
            payload={"stockQuantity": 72, "sellingPrice": 2.95},
        )
        _require(status == 200, f"Update inventory item failed with status {status}: {body}")

        status, body = _api_call(
            base_url,
            "POST",
            "/api/sales/register/open",
            token=access_token,
            payload={"openingCash": opening_cash},
        )

        if status == 409 and isinstance(body, dict) and isinstance(body.get("session"), dict):
            active_session = body["session"]
            active_session_id = active_session.get("id")
            active_expected_cash = active_session.get("expectedCash")
            _require(
                isinstance(active_session_id, str) and active_session_id,
                f"Unexpected open-session conflict payload: {body}",
            )
            _require(
                isinstance(active_expected_cash, (int, float)),
                f"Unexpected expectedCash in conflict payload: {body}",
            )

            close_status, close_body = _api_call(
                base_url,
                "POST",
                "/api/sales/register/close",
                token=access_token,
                payload={"sessionId": active_session_id, "countedCash": float(active_expected_cash)},
            )
            _require(
                close_status == 200,
                f"Failed to close existing open register before smoke checkout: {close_status} {close_body}",
            )

            status, body = _api_call(
                base_url,
                "POST",
                "/api/sales/register/open",
                token=access_token,
                payload={"openingCash": opening_cash},
            )

        _require(status == 201, f"Open register session failed with status {status}: {body}")
        session = body.get("session") or {}
        register_session_id = session.get("id")
        _require(
            isinstance(register_session_id, str) and register_session_id,
            "Open register response missing session id",
        )

        status, body = _api_call(base_url, "GET", "/api/sales?page=1&pageSize=25", token=access_token)
        _require(status == 200, f"Sales list before checkout failed with status {status}: {body}")
        _assert_pagination(body, page=1, page_size=25)
        sales_total_before = body.get("total")
        _require(isinstance(sales_total_before, int), "Sales list missing total before checkout")

        status, body = _api_call(
            base_url,
            "POST",
            "/api/sales/checkout",
            token=access_token,
            payload={
                "sessionId": register_session_id,
                "items": [{"inventoryItemId": temp_item_id, "quantity": 2}],
                "tenderedAmount": 10,
            },
        )
        _require(status == 201, f"Checkout failed with status {status}: {body}")

        sale = body.get("sale") or {}
        payment = body.get("payment") or {}
        sale_id = sale.get("id")
        grand_total = sale.get("grandTotal")
        _require(isinstance(sale_id, str) and sale_id, "Checkout response missing sale id")
        _require(isinstance(grand_total, (int, float)), "Checkout response missing grandTotal")
        _require(
            abs(float(payment.get("changeAmount", -1)) - round(10 - float(grand_total), 2)) < 1e-6,
            f"Unexpected change amount in checkout payment payload: {payment}",
        )
        expected_cash_for_close = round(opening_cash + float(grand_total), 2)

        status, body = _api_call(
            base_url,
            "POST",
            "/api/sales/checkout",
            token=access_token,
            payload={
                "sessionId": register_session_id,
                "items": [{"inventoryItemId": temp_item_id, "quantity": 999999}],
                "tenderedAmount": 999999,
            },
        )
        _require(status == 400, f"Expected insufficient stock checkout failure, got {status}: {body}")

        status, body = _api_call(base_url, "GET", "/api/sales?page=1&pageSize=25", token=access_token)
        _require(status == 200, f"Sales list after checkout failed with status {status}: {body}")
        _assert_pagination(body, page=1, page_size=25)
        sales_after = body.get("sales") or []
        _require(isinstance(sales_after, list), "Sales list payload is invalid after checkout")
        _require(
            body.get("total") == sales_total_before + 1,
            f"Expected sales total to increase by 1, got before={sales_total_before} after={body.get('total')}",
        )
        _require(_find_sale(sales_after, sale_id) is not None, "Completed sale missing from sales list")

        receipt_number = str(sale.get("receiptNumber", "")).strip()
        _require(receipt_number, f"Checkout response missing receipt number: {sale}")

        status, body = _api_call(
            base_url,
            "GET",
            f"/api/sales?page=1&pageSize=25&search={receipt_number.lower()}",
            token=access_token,
        )
        _require(status == 200, f"Sales search failed with status {status}: {body}")
        search_sales = body.get("sales") or []
        _require(isinstance(search_sales, list), "Sales search payload is invalid")
        _require(
            _find_sale(search_sales, sale_id) is not None,
            f"Sales search by receipt did not return the created sale: {body}",
        )

        status, body = _api_call(base_url, "GET", f"/api/sales/{sale_id}", token=access_token)
        _require(status == 200, f"Sales detail failed with status {status}: {body}")
        sale_items = body.get("items") or []
        _require(isinstance(sale_items, list) and len(sale_items) == 1, "Sales detail should contain one line item")
        _require(
            sale_items[0].get("inventoryItemId") == temp_item_id,
            f"Unexpected inventory item in sale detail: {sale_items}",
        )

        status, body = _api_call(
            base_url,
            "GET",
            f"/api/inventory/items?page=1&pageSize=25&q={temp_sku}",
            token=access_token,
        )
        _require(status == 200, f"Inventory verification after checkout failed with status {status}: {body}")
        inventory_after_sale = body.get("items") or []
        _require(isinstance(inventory_after_sale, list), "Inventory verification payload is invalid")

        matched_item = None
        for item in inventory_after_sale:
            if item.get("id") == temp_item_id:
                matched_item = item
                break

        _require(matched_item is not None, "Could not find temporary item after checkout")
        _require(
            matched_item.get("stockQuantity") == 70,
            f"Expected stockQuantity=70 after checkout, got {matched_item.get('stockQuantity')}",
        )

        status, body = _api_call(
            base_url,
            "POST",
            "/api/sales/register/close",
            token=access_token,
            payload={"sessionId": register_session_id, "countedCash": expected_cash_for_close},
        )
        _require(status == 200, f"Close register session failed with status {status}: {body}")
        closed_session = body.get("session") or {}
        _require(
            abs(float(closed_session.get("variance", 9999)) - 0.0) < 1e-6,
            f"Expected zero variance after close, got session payload: {closed_session}",
        )
        register_session_id = None

        print("[smoke] Register open/checkout/rollback/close cycle passed")

        status, body = _api_call(
            base_url,
            "DELETE",
            f"/api/inventory/items/{temp_item_id}",
            token=access_token,
        )
        _require(
            status == 409,
            f"Expected sold inventory item delete to be blocked with 409, got {status}: {body}",
        )

        delete_only_suffix = uuid4().hex[:8].upper()
        delete_only_sku = f"SMOKE-DEL-{delete_only_suffix}"
        delete_only_item_id: str | None = None

        create_delete_only_status, create_delete_only_body = _api_call(
            base_url,
            "POST",
            "/api/inventory/items",
            token=access_token,
            payload={
                "name": f"Smoke Delete Item {delete_only_suffix}",
                "sku": delete_only_sku,
                "categoryId": smoke_category_id,
                "startingAmount": 5,
                "unit": "UNITS",
                "costPrice": 1.0,
                "sellingPrice": 1.5,
                "taxEnabled": False,
                "taxPercentage": 0,
            },
        )
        _require(
            create_delete_only_status == 201,
            f"Create delete-only inventory item failed: {create_delete_only_status} {create_delete_only_body}",
        )
        delete_only_item = create_delete_only_body.get("item") or {}
        delete_only_item_id = delete_only_item.get("id")
        _require(
            isinstance(delete_only_item_id, str) and delete_only_item_id,
            "Delete-only inventory item missing id",
        )

        status, body = _api_call(
            base_url,
            "DELETE",
            f"/api/inventory/items/{delete_only_item_id}",
            token=access_token,
        )
        _require(
            status == 200 and body.get("success") is True,
            f"Delete unreferenced inventory item failed: {status} {body}",
        )
        temp_item_id = None
        print("[smoke] Create/update/delete inventory cycle passed")

    finally:
        if register_session_id:
            _api_call(
                base_url,
                "POST",
                "/api/sales/register/close",
                token=access_token,
                payload={"sessionId": register_session_id, "countedCash": expected_cash_for_close},
            )

        if temp_item_id:
            _api_call(
                base_url,
                "DELETE",
                f"/api/inventory/items/{temp_item_id}",
                token=access_token,
            )

    status, body = _api_call(
        base_url,
        "POST",
        f"/api/categories/{smoke_category_id}/archive",
        token=access_token,
        payload={"option": "ARCHIVE_WITH_PRODUCTS"},
    )
    _require(status == 200 and body.get("success") is True, f"Archive category failed: {status} {body}")

    status, body = _api_call(
        base_url,
        "POST",
        f"/api/categories/{smoke_category_id}/restore",
        token=access_token,
    )
    _require(status == 200 and body.get("success") is True, f"Restore category failed: {status} {body}")
    print("[smoke] Archive/restore category cycle passed")

    status, body = _api_call(base_url, "GET", "/api/categories/lookup?status=Active", token=access_token)
    _require(status == 200, f"Final category verification failed with status {status}: {body}")
    active_categories = body.get("categories") or []
    _require(
        _find_category(active_categories, smoke_category_id or "") is not None,
        "Smoke category is not active after restore",
    )

    status, body = _api_call(base_url, "GET", "/api/inventory/items?page=0&pageSize=10", token=access_token)
    _require(status == 400, f"Expected invalid page to return 400, got {status}: {body}")

    status, body = _api_call(base_url, "GET", "/api/categories?page=1&pageSize=1000", token=access_token)
    _require(status == 200, f"Category pagination cap check failed with status {status}: {body}")
    _require(body.get("pageSize") == 200, f"Expected capped pageSize=200, got {body.get('pageSize')}")

    print("[smoke] PASS: e2e API smoke test completed")


if __name__ == "__main__":
    try:
        run()
    except SmokeTestError as error_message:
        print(f"[smoke] FAIL: {error_message}")
        sys.exit(1)
    except Exception as unexpected_error:  # pragma: no cover
        print(f"[smoke] FAIL: unexpected error: {unexpected_error}")
        sys.exit(1)
