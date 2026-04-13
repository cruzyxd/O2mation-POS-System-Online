import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path

from flask import current_app, g
from werkzeug.security import generate_password_hash


SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('owner_admin', 'manager', 'cashier')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    revoked_at TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    code TEXT NOT NULL UNIQUE,
    parent_id TEXT,
    icon TEXT,
    color TEXT,
    status TEXT NOT NULL CHECK(status IN ('Active', 'Archived')) DEFAULT 'Active',
    archived_at TEXT,
    archived_product_set_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(parent_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS archived_product_sets (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    product_ids_json TEXT NOT NULL,
    archived_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    normalized_name TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK(status IN ('Active', 'Archived')) DEFAULT 'Active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    barcode TEXT,
    batch TEXT,
    category_id TEXT NOT NULL,
    vendor_id TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    unit TEXT NOT NULL CHECK(unit IN ('UNITS', 'LBS', 'KGS', 'LITERS')),
    status TEXT NOT NULL CHECK(status IN ('In Stock', 'Low Stock', 'Out of Stock')),
    cost_price REAL NOT NULL DEFAULT 0,
    selling_price REAL NOT NULL DEFAULT 0,
    tax_enabled INTEGER NOT NULL DEFAULT 0,
    tax_percentage REAL NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    archived_set_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(category_id) REFERENCES categories(id),
    FOREIGN KEY(vendor_id) REFERENCES vendors(id),
    FOREIGN KEY(archived_set_id) REFERENCES archived_product_sets(id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id TEXT PRIMARY KEY,
    inventory_item_id TEXT NOT NULL,
    movement_type TEXT NOT NULL CHECK(movement_type IN ('STOCK_ADD', 'STOCK_REMOVE')),
    quantity_delta INTEGER NOT NULL,
    prior_quantity INTEGER NOT NULL,
    new_quantity INTEGER NOT NULL,
    purchase_price REAL NOT NULL DEFAULT 0,
    reason TEXT NOT NULL DEFAULT '',
    actor_user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(inventory_item_id) REFERENCES inventory_items(id),
    FOREIGN KEY(actor_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS register_sessions (
    id TEXT PRIMARY KEY,
    cashier_user_id INTEGER NOT NULL,
    opened_at TEXT NOT NULL,
    closed_at TEXT,
    opening_cash REAL NOT NULL DEFAULT 0,
    closing_cash REAL,
    expected_cash REAL NOT NULL DEFAULT 0,
    variance REAL,
    status TEXT NOT NULL CHECK(status IN ('OPEN', 'CLOSED')) DEFAULT 'OPEN',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(cashier_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    receipt_number TEXT NOT NULL UNIQUE,
    register_session_id TEXT NOT NULL,
    cashier_user_id INTEGER NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    tax_total REAL NOT NULL DEFAULT 0,
    discount_total REAL NOT NULL DEFAULT 0,
    grand_total REAL NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL CHECK(payment_status IN ('PAID', 'UNPAID', 'VOIDED')) DEFAULT 'PAID',
    sale_status TEXT NOT NULL CHECK(sale_status IN ('COMPLETED', 'VOIDED')) DEFAULT 'COMPLETED',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    voided_at TEXT,
    FOREIGN KEY(register_session_id) REFERENCES register_sessions(id),
    FOREIGN KEY(cashier_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    inventory_item_id TEXT NOT NULL,
    sku_snapshot TEXT NOT NULL,
    name_snapshot TEXT NOT NULL,
    quantity INTEGER NOT NULL CHECK(quantity > 0),
    unit_price REAL NOT NULL,
    tax_percentage REAL NOT NULL DEFAULT 0,
    line_tax REAL NOT NULL DEFAULT 0,
    line_total REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(sale_id) REFERENCES sales(id),
    FOREIGN KEY(inventory_item_id) REFERENCES inventory_items(id)
);

CREATE TABLE IF NOT EXISTS sale_payments (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    method TEXT NOT NULL CHECK(method IN ('CASH')),
    tendered_amount REAL NOT NULL,
    paid_amount REAL NOT NULL,
    change_amount REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(sale_id) REFERENCES sales(id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_is_archived ON inventory_items(is_archived);
CREATE INDEX IF NOT EXISTS idx_inventory_items_created_at ON inventory_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_items_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_vendor ON inventory_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_created_at ON inventory_movements(inventory_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_type ON inventory_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_vendors_status ON vendors(status);
CREATE INDEX IF NOT EXISTS idx_vendors_name ON vendors(name);
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_archived_product_sets_archived_at ON archived_product_sets(archived_at DESC);
CREATE INDEX IF NOT EXISTS idx_register_sessions_cashier_status ON register_sessions(cashier_user_id, status);
CREATE INDEX IF NOT EXISTS idx_register_sessions_opened_at ON register_sessions(opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_cashier ON sales(cashier_user_id);
CREATE INDEX IF NOT EXISTS idx_sales_register_session ON sales(register_session_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_id);
"""


def _table_exists(db: sqlite3.Connection, table_name: str) -> bool:
    row = db.execute(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def _column_exists(db: sqlite3.Connection, table_name: str, column_name: str) -> bool:
    rows = db.execute(f"PRAGMA table_info({table_name})").fetchall()
    return any(row["name"] == column_name for row in rows)


def _ensure_legacy_schema(db: sqlite3.Connection) -> None:
    if _table_exists(db, "inventory_items") and not _column_exists(
        db, "inventory_items", "vendor_id"
    ):
        db.execute("ALTER TABLE inventory_items ADD COLUMN vendor_id TEXT")

    db.execute(
        "CREATE INDEX IF NOT EXISTS idx_inventory_items_vendor ON inventory_items(vendor_id)"
    )

    if _table_exists(db, "categories") and not _column_exists(db, "categories", "icon"):
        db.execute("ALTER TABLE categories ADD COLUMN icon TEXT")

    if _table_exists(db, "categories") and not _column_exists(db, "categories", "color"):
        db.execute("ALTER TABLE categories ADD COLUMN color TEXT")

    if _table_exists(db, "users") and not _column_exists(db, "users", "password_encrypted"):
        db.execute("ALTER TABLE users ADD COLUMN password_encrypted TEXT")


def get_db() -> sqlite3.Connection:
    if "db" not in g:
        db_path = Path(current_app.config["DATABASE"])
        db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        g.db = conn
    return g.db


def close_db(_error=None) -> None:
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db() -> None:
    db = get_db()
    db.executescript(SCHEMA_SQL)
    _ensure_legacy_schema(db)
    db.commit()


def ensure_seed_data() -> None:
    db = get_db()
    user_existing = db.execute("SELECT COUNT(*) AS c FROM users").fetchone()
    if user_existing["c"] == 0:
        users = [
            ("owner", generate_password_hash("owner123"), "owner_admin"),
            ("manager1", generate_password_hash("manager123"), "manager"),
            ("cashier1", generate_password_hash("cashier123"), "cashier"),
        ]
        db.executemany(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", users
        )

    unassigned_id = "system-unassigned"
    unassigned = db.execute(
        "SELECT id FROM categories WHERE id = ?",
        (unassigned_id,),
    ).fetchone()
    if unassigned is None:
        db.execute(
            """
            INSERT INTO categories (id, name, code, parent_id, status, archived_at, archived_product_set_id)
            VALUES (?, ?, ?, NULL, 'Active', NULL, NULL)
            """,
            (unassigned_id, "Unassigned", "UNASSIGNED"),
        )

    db.commit()
