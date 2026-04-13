import os

from flask import Flask, request

from .auth_routes import auth_bp
from .categories_routes import categories_bp
from .db import close_db, ensure_seed_data, init_db
from .inventory_routes import inventory_bp
from .sales_routes import sales_bp
from .vendors_routes import vendors_bp
from .users_routes import users_bp


def create_app() -> Flask:
    secret_key = os.getenv("POS_SECRET_KEY")
    if not secret_key:
        raise RuntimeError("POS_SECRET_KEY environment variable is required")

    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        DATABASE=app.instance_path + "\\pos_auth.sqlite3",
        SECRET_KEY=secret_key,
        ACCESS_TOKEN_MINUTES=15,
        REFRESH_TOKEN_DAYS=7,
    )

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(categories_bp, url_prefix="/api")
    app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
    app.register_blueprint(sales_bp, url_prefix="/api/sales")
    app.register_blueprint(vendors_bp, url_prefix="/api")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.teardown_appcontext(close_db)

    allowed_origins = {
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4173",
    }

    @app.after_request
    def add_cors_headers(response):
        origin = request.headers.get("Origin", "")
        if origin in allowed_origins:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Vary"] = "Origin"
            response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
            response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
        return response

    with app.app_context():
        init_db()
        ensure_seed_data()

    @app.get("/api/health")
    def health() -> dict[str, str]:
        return {"status": "ok"}

    return app

