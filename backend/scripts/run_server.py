"""Run the Flask development server with HTTP or self-signed HTTPS."""

import os
import sys
import ssl

# Ensure backend directory is in python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app

app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    use_https = os.getenv("USE_HTTPS", "false").lower() in ("true", "1", "yes") or "--https" in sys.argv

    ssl_context = None
    if use_https:
        basedir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
        cert_path = os.getenv("SSL_CERT_PATH", os.path.join(basedir, "scripts", "certs", "cert.pem"))
        key_path = os.getenv("SSL_KEY_PATH", os.path.join(basedir, "scripts", "certs", "key.pem"))

        if os.path.exists(cert_path) and os.path.exists(key_path):
            ssl_context = (cert_path, key_path)
            print(f"Starting Healthcare Interop API over HTTPS on https://localhost:{port}")
        else:
            print("SSL cert/key not found; falling back to HTTP. Run scripts/generate_certs.py to generate certificates.")

    if not ssl_context:
        print(f"Starting Healthcare Interop API over HTTP on http://localhost:{port}")

    app.run(host="0.0.0.0", port=port, ssl_context=ssl_context, debug=False)
