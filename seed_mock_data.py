import os
import sqlite3
import json
import random
from uuid import uuid4
from datetime import UTC, datetime

DB_PATH = r"d:\coding\O2 supermarket system try 2\backend\instance\pos_auth.sqlite3"

CATEGORIES_DATA = [
    ("Beverages", "BEV", "coffee", "#FF5733"),
    ("Dairy & Eggs", "DAI", "cheese", "#33FF57"),
    ("Fruits & Vegetables", "FRU", "apple", "#3357FF"),
    ("Meat & Poultry", "MEA", "drumstick", "#FF33A1"),
    ("Seafood", "SEA", "fish", "#33FFF5"),
    ("Bakery", "BAK", "bread", "#F5FF33"),
    ("Pantry", "PAN", "archive", "#A133FF"),
    ("Snacks", "SNA", "cookie", "#FFA133"),
    ("Frozen Foods", "FRO", "ice-cream", "#33A1FF"),
    ("Breakfast", "BRE", "egg", "#A1FF33"),
    ("Canned Goods", "CAN", "package", "#FF3357"),
    ("Dry Goods & Pasta", "DRY", "wheat", "#5733FF"),
    ("Sauces & Condiments", "SAU", "flame", "#FF8C00"),
    ("Spices & Herbs", "SPI", "leaf", "#228B22"),
    ("Baking", "BKI", "cake", "#DB7093"),
    ("Household", "HOU", "home", "#708090"),
    ("Personal Care", "PER", "user", "#4682B4"),
    ("Baby", "BAB", "baby", "#FFB6C1"),
    ("Pet Care", "PET", "dog", "#8B4513"),
    ("International", "INT", "globe", "#5F9EA0"),
    ("Health & Wellness", "HEA", "heart", "#DC143C"),
    ("Beverage Mixes", "MIX", "glass", "#9932CC"),
    ("Confectionery", "CON", "candy", "#FF69B4"),
    ("Prepared Meals", "PRE", "utensils", "#CD853F"),
    ("Deli", "DEL", "meat", "#BC8F8F"),
    ("Cleaning Supplies", "CLE", "trash", "#778899"),
    ("Paper Products", "PAP", "file-text", "#BDB76B"),
    ("Office Supplies", "OFF", "pen", "#4169E1"),
    ("Outdoor & Garden", "OUT", "tree", "#2E8B57"),
    ("Misc", "MIS", "more-horizontal", "#808080"),
]

UNITS = ["UNITS", "LBS", "KGS", "LITERS"]

def _iso_now():
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")

def _compute_status(q):
    if q <= 0: return "Out of Stock"
    if q <= 50: return "Low Stock"
    return "In Stock"

def seed():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    try:
        cursor.execute("BEGIN")

        # 1. Get a user for movements
        user = cursor.execute("SELECT id FROM users LIMIT 1").fetchone()
        if not user:
            print("No users found in DB. Please run the app first to seed users.")
            return
        user_id = user["id"]

        # 1.5 Cleanup previous seed to avoid duplicates/mess
        # We'll delete items with SKU starting with SKU- (our pattern)
        cursor.execute("DELETE FROM inventory_movements WHERE reason = 'Initial bulk seed'")
        cursor.execute("DELETE FROM inventory_items WHERE sku LIKE 'SKU-%'")
        cursor.execute("DELETE FROM categories WHERE name IN (SELECT name FROM categories WHERE code IN (SELECT code FROM categories WHERE length(code) = 3)) OR parent_id IS NOT NULL")
        cursor.execute("DELETE FROM vendors WHERE normalized_name LIKE 'vendor % corp'")

        # 2. Create Vendors
        vendor_ids = []
        for i in range(1, 11):
            v_id = str(uuid4())
            v_name = f"Vendor {i} Corp"
            cursor.execute("""
                INSERT INTO vendors (id, name, normalized_name, status, created_at, updated_at)
                VALUES (?, ?, ?, 'Active', ?, ?)
            """, (v_id, v_name, v_name.lower(), _iso_now(), _iso_now()))
            vendor_ids.append(v_id)

        # 3. Create Categories and Subcategories
        all_category_ids = []
        leaf_category_ids = []
        for name, code, icon, color in CATEGORIES_DATA:
            p_id = str(uuid4())
            cursor.execute("""
                INSERT INTO categories (id, name, code, icon, color, status, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 'Active', ?, ?)
            """, (p_id, name, code, icon, color, _iso_now(), _iso_now()))
            all_category_ids.append(p_id)
            
            # Create 2-4 subcategories for each
            for j in range(1, random.randint(3, 5)):
                s_id = str(uuid4())
                s_name = f"{name} - Sub {j}"
                s_code = f"{code}{j}"
                cursor.execute("""
                    INSERT INTO categories (id, name, code, parent_id, icon, color, status, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, ?)
                """, (s_id, s_name, s_code, p_id, icon, color, _iso_now(), _iso_now()))
                all_category_ids.append(s_id)
                leaf_category_ids.append(s_id)

        # 4. Create 1000 Items
        print("Generating 1000 items...")
        for i in range(1, 1001):
            item_id = str(uuid4())
            cat_id = random.choice(leaf_category_ids)
            vendor_id = random.choice(vendor_ids)
            
            p_name = f"Product {i:04}"
            p_sku = f"SKU-{i:04}-{str(uuid4())[:4].upper()}"
            p_barcode = f"789{i:09}"
            p_batch = f"BATCH-{random.randint(100, 999)}"
            p_unit = random.choice(UNITS)
            p_stock = random.randint(0, 300)
            p_cost = round(random.uniform(1.0, 50.0), 2)
            p_selling = round(p_cost * random.uniform(1.2, 2.0), 2)
            p_tax_enabled = random.choice([0, 1])
            p_tax_perc = 15.0 if p_tax_enabled else 0.0
            p_status = _compute_status(p_stock)
            now = _iso_now()

            cursor.execute("""
                INSERT INTO inventory_items (
                    id, name, sku, barcode, batch, category_id, vendor_id, 
                    stock_quantity, unit, status, cost_price, selling_price,
                    tax_enabled, tax_percentage, is_archived, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
            """, (
                item_id, p_name, p_sku, p_barcode, p_batch, cat_id, vendor_id,
                p_stock, p_unit, p_status, p_cost, p_selling,
                p_tax_enabled, p_tax_perc, now, now
            ))

            # 5. Create Movements
            if p_stock > 0:
                cursor.execute("""
                    INSERT INTO inventory_movements (
                        id, inventory_item_id, movement_type, quantity_delta,
                        prior_quantity, new_quantity, purchase_price, reason,
                        actor_user_id, created_at
                    )
                    VALUES (?, ?, 'STOCK_ADD', ?, 0, ?, ?, ?, ?, ?)
                """, (
                    str(uuid4()), item_id, p_stock, p_stock, p_cost, 
                    "Initial bulk seed", user_id, now
                ))

        conn.commit()
        print("Seed completed successfully with subcategories!")
        
        # Verify counts
        cat_count = cursor.execute("SELECT COUNT(*) FROM categories").fetchone()[0]
        item_count = cursor.execute("SELECT COUNT(*) FROM inventory_items").fetchone()[0]
        print(f"Total Categories: {cat_count}")
        print(f"Total Items: {item_count}")

    except Exception as e:
        conn.rollback()
        print(f"Error seeding data: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    seed()
