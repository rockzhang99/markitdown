"""
MarkItDown Desktop - Entry Point
Starts the FastAPI server and opens the browser.
"""
import os
import sys
import threading
import time
import webbrowser

import uvicorn

HOST = os.environ.get("MARKITDOWN_HOST", "127.0.0.1")
PORT = int(os.environ.get("MARKITDOWN_PORT", "8877"))


def open_browser():
    """Wait for server to start, then open browser."""
    time.sleep(1.5)
    webbrowser.open(f"http://127.0.0.1:{PORT}")


def main():
    print("=" * 50)
    print("  MarkItDown Desktop")
    print(f"  http://{HOST}:{PORT}")
    print("  Press Ctrl+C to quit")
    print("=" * 50)

    if HOST in ("127.0.0.1", "localhost"):
        threading.Thread(target=open_browser, daemon=True).start()

    try:
        uvicorn.run("server:app", host=HOST, port=PORT, log_level="info")
    except KeyboardInterrupt:
        print("\nShutting down...")
        sys.exit(0)


if __name__ == "__main__":
    main()
