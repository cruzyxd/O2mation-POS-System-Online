"""
Migration script to populate password_encrypted for existing users.
This should be run once after adding the password_encrypted column.
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.db import get_db, init_db
from app.encryption import encrypt_password
from flask import Flask

DEFAULT_PASSWORDS = {
    "owner": "owner123",
    "manager1": "manager123",
    "cashier1": "cashier123",
}

def migrate_passwords():
    app = Flask(__name__)
    app.config["DATABASE"] = Path(__file__).parent.parent / "instance" / "pos_auth.sqlite3"
    
    # Set encryption key from env or use default for development
    if not os.environ.get("ENCRYPTION_KEY"):
        os.environ["ENCRYPTION_KEY"] = "dev-encryption-key-change-in-production-32bytes"
    
    with app.app_context():
        init_db()
        db = get_db()
        
        users = db.execute("SELECT id, username, password_encrypted FROM users").fetchall()
        
        for user in users:
            if user["password_encrypted"] is None:
                username = user["username"]
                default_password = DEFAULT_PASSWORDS.get(username, "default123")
                
                encrypted = encrypt_password(default_password)
                db.execute(
                    "UPDATE users SET password_encrypted = ? WHERE id = ?",
                    (encrypted, user["id"])
                )
                print(f"✓ Encrypted password for user: {username}")
        
        db.commit()
        print("\n✓ Password encryption migration complete!")

if __name__ == "__main__":
    migrate_passwords()
