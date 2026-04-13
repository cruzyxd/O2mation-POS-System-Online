# O2mation Supermarket System

O2 Supermarket System is a point-of-sale and inventory management application with a Flask backend, a React frontend, and an optional desktop launcher built with pywebview.

## Repository Components

- `backend`: Flask API, auth, business logic, SQLite schema, and test scripts.
- `frontend`: React + TypeScript + Vite web client.
- `desktop`: Python launcher that starts backend and frontend, then opens a desktop window.

## Core Features

- Authentication with access tokens, refresh tokens, logout, and role checks.
- Role-based access control for owner_admin, manager, and cashier users.
- User administration for manager and owner_admin roles (create, update, activate/deactivate, delete with password confirmation).
- Category management with one-level hierarchy, active/archived states, and archive/restore workflows.
- Vendor management with duplicate-resistant name normalization and archive/restore workflows.
- Inventory management with item CRUD, stock add/remove operations, movement audit trail, barcode or SKU lookup, summary metrics, and bulk delete behavior.
- Sales checkout with register session open/close flow, stock validation, tax calculation, receipt numbers, payment recording, and change calculation.
- Settings for language, color mode, font size, checkout completion key, and manual tendered-amount mode.
- Localization support for English and Arabic.

## Architecture Overview

### Backend

- Framework: Flask
- Database: SQLite (`backend/instance/pos_auth.sqlite3`)
- Modules by domain:
  - `app/auth_routes.py`
  - `app/users_routes.py`
  - `app/categories_routes.py`
  - `app/vendors_routes.py`
  - `app/inventory_routes.py`
  - `app/sales_routes.py`
- Shared middleware and helpers:
  - `app/auth_middleware.py`
  - `app/tokens.py`
  - `app/pagination.py`
  - `app/db.py`

### Frontend

- Framework: React 19 + TypeScript + Vite
- State and data:
  - React Query for server state
  - Context-based stores for auth, cart, locale, and preferences
- Service layer pattern:
  - API calls are encapsulated under `frontend/src/services`
- Route surface:
  - Login
  - Inventory
  - Checkout
  - Categories
  - Vendors
  - Settings (Preferences, Manage Users)

### Desktop Launcher

- Entry point: `desktop/main.py`
- Starts backend and frontend processes, validates readiness, then opens a native webview.
- Performs dependency preflight checks and can repair stale workspace installs.

## Tech Stack

- Backend: Flask, Werkzeug, PyJWT, cryptography
- Frontend: React, React Router, TypeScript, Vite, Tailwind CSS, TanStack Query, i18next
- Desktop: pywebview, requests

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+
- npm 9+

### 1) Install Dependencies

Install Python dependencies:

```bash
pip install -r backend/requirements.txt
pip install -r desktop/requirements.txt
```

Install JavaScript dependencies from the repository root:

```bash
npm install
```

### 2) Initialize Database

```bash
python init_pos_db.py
```

This creates schema objects and ensures default seed users and the system Unassigned category exist.

### 3) Optional: Seed Large Mock Dataset

```bash
python seed_mock_data.py
```

## Run Options

### Option A: Desktop Launcher

```bash
python desktop/main.py
```

Behavior:

- Starts backend and frontend automatically.
- Verifies backend health at `/api/health`.
- Opens the frontend in a desktop window.

### Option B: Manual Backend + Frontend

Start backend:

```bash
python backend/run.py
```

Start frontend:

```bash
npm run dev --workspace frontend
```

If backend is not on the default URL, set `VITE_API_BASE` before starting frontend.

## Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `POS_SECRET_KEY` | Flask/JWT secret key | `change-me-in-production` |
| `ENCRYPTION_KEY` | Key used by password encryption utilities | none (required when encryption utilities are used) |
| `POS_BACKEND_PORT` | Port for `backend/run.py` | `5000` |
| `VITE_API_BASE` | Frontend API base URL | `http://127.0.0.1:5000` |
| `O2_BACKEND_PORT` | Backend port used by desktop launcher | `5001` |
| `O2_FRONTEND_PORT` | Frontend port used by desktop launcher | `5173` |
| `O2_BACKEND_STARTUP_TIMEOUT` | Desktop launcher backend startup timeout (seconds) | `20` |
| `O2_FRONTEND_STARTUP_TIMEOUT` | Desktop launcher frontend startup timeout (seconds) | `30` |
| `POS_SMOKE_BASE` | Base URL for smoke test script | `http://127.0.0.1:5000` |

For stricter startup validation, `backend/run_with_env.py` requires `POS_SECRET_KEY` to be explicitly set.

## Default Development Accounts

Created by seed initialization:

- owner / owner123 (owner_admin)
- manager1 / manager123 (manager)
- cashier1 / cashier123 (cashier)

Use these only for local development.

## API Overview

### Auth

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/role-check`

### Users

- `GET /api/users/`
- `POST /api/users/`
- `PATCH /api/users/<user_id>`
- `PATCH /api/users/<user_id>/activate`
- `DELETE /api/users/<user_id>`

### Categories

- `GET /api/categories`
- `GET /api/categories/lookup`
- `GET /api/archived-sets`
- `POST /api/categories`
- `PUT /api/categories/<category_id>`
- `POST /api/categories/<category_id>/archive`
- `POST /api/categories/<category_id>/restore`

### Vendors

- `GET /api/vendors`
- `GET /api/vendors/lookup`
- `POST /api/vendors`
- `PUT /api/vendors/<vendor_id>`
- `POST /api/vendors/<vendor_id>/archive`
- `POST /api/vendors/<vendor_id>/restore`

### Inventory

- `GET /api/inventory/items`
- `GET /api/inventory/items/lookup`
- `POST /api/inventory/items`
- `PUT /api/inventory/items/<item_id>`
- `POST /api/inventory/items/<item_id>/add-stock`
- `POST /api/inventory/items/<item_id>/remove-stock`
- `GET /api/inventory/items/<item_id>/movements`
- `DELETE /api/inventory/items/<item_id>`
- `POST /api/inventory/items/bulk-delete`

### Sales

- `POST /api/sales/register/open`
- `POST /api/sales/register/close`
- `POST /api/sales/checkout`
- `GET /api/sales`
- `GET /api/sales/<sale_id>`

### Health

- `GET /api/health`

## Testing

Run API smoke tests (backend must be running):

```bash
python backend/scripts/e2e_smoke_test.py
```

Additional scripts in `backend`:

- `test_api.py`
- `test_db.py`
- `test_flask_context.py`

These scripts interact with the local database and are intended for development validation.

## Known Functional Constraints

- Category hierarchy is limited to one nested level.
- Products cannot be assigned to categories that have active subcategories.
- Category archive supports two options: move products to Unassigned, or archive category with products.
- Inventory delete behavior:
  - If item is referenced by sales: blocked with conflict.
  - If item has movement history but no sale references: archived instead of hard-deleted.
- Payment method is currently cash only.
- `discount_total` is currently fixed at `0.00` in checkout flow.
- A cashier can have only one open register session at a time.
- Sales list search is based on receipt number.

## Project Structure

```text
.
|- backend/
|  |- app/
|  |- scripts/
|  |- run.py
|  |- run_with_env.py
|- frontend/
|  |- src/
|  |- package.json
|- desktop/
|  |- main.py
|- init_pos_db.py
|- seed_mock_data.py
```
