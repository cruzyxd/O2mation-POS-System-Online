import os
os.environ['ENCRYPTION_KEY'] = 'dev-encryption-key-change-in-production-32bytes'

import sqlite3
from app.encryption import decrypt_password
from app import create_app

app = create_app()

with app.app_context():
    from app.db import get_db
    db = get_db()
    
    print("Testing password decryption in Flask app context:")
    print("=" * 60)
    
    # Get users from database
    users = db.execute("SELECT id, username, password_encrypted FROM users").fetchall()
    
    for user in users:
        print(f"\nUser: {user['username']} (ID: {user['id']})")
        enc = user['password_encrypted']
        if enc:
            print(f"  Encrypted (first 40): {enc[:40]}")
            try:
                decrypted = decrypt_password(enc)
                print(f"  Decrypted: {decrypted}")
            except Exception as e:
                print(f"  DECRYPTION FAILED: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"  password_encrypted is NULL")
    
    print("\n" + "=" * 60)
    print("Now testing the actual list_users function:")
    
    # Import and test the actual function
    from app.users_routes import list_users
    from flask import g
    
    # Mock auth
    g.auth_claims = {"uid": 1, "role": "owner_admin"}
    
    try:
        result = list_users()
        data = result.get_json()
        print(f"Success! Retrieved {len(data['users'])} users")
        for u in data['users']:
            print(f"  - {u['username']}: password={u['password']}")
    except Exception as e:
        print(f"Error calling list_users: {e}")
        import traceback
        traceback.print_exc()
