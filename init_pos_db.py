import os
import sys

# Add backend directory to sys.path so we can import 'app'
backend_dir = os.path.join(os.getcwd(), "backend")
sys.path.append(backend_dir)

from app import create_app
from app.db import init_db, ensure_seed_data

app = create_app()
with app.app_context():
    print("Initializing database...")
    init_db()
    print("Adding seed data (users)...")
    ensure_seed_data()
    print("Database initialized successfully.")
