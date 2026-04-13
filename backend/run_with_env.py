import os

from app import create_app

if __name__ == '__main__':
    if not os.environ.get("POS_SECRET_KEY"):
        raise RuntimeError("POS_SECRET_KEY environment variable is required")

    app = create_app()
    print("Starting Flask server...")
    app.run(host='127.0.0.1', port=5000, debug=False)
