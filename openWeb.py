import os
import socket
import subprocess
import sys
import time
import webbrowser
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


HOST = "127.0.0.1"
PORT = 8000
PROJECT_DIR = Path(__file__).resolve().parent
APP_URL = f"http://localhost:{PORT}/website/"


def port_is_open():
    try:
        with socket.create_connection((HOST, PORT), timeout=0.5):
            return True
    except OSError:
        return False


def serves_daily_ritual(url):
    try:
        with urlopen(url, timeout=1) as response:
            return b"Daily Ritual" in response.read(65536)
    except (OSError, URLError):
        return False


def start_server():
    options = {
        "cwd": PROJECT_DIR,
        "stdin": subprocess.DEVNULL,
        "stdout": subprocess.DEVNULL,
        "stderr": subprocess.DEVNULL,
        "close_fds": True,
    }
    if os.name == "nt":
        options["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS
    else:
        options["start_new_session"] = True

    process = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT), "--bind", HOST],
        **options,
    )

    deadline = time.monotonic() + 10
    while time.monotonic() < deadline:
        if process.poll() is not None:
            raise RuntimeError("The local web server exited before it became ready.")
        if serves_daily_ritual(APP_URL):
            return
        time.sleep(0.1)
    raise RuntimeError("The local web server did not respond within 10 seconds.")


def main():
    if port_is_open():
        if not serves_daily_ritual(APP_URL):
            raise RuntimeError(
                f"Port {PORT} is already being used by another service that does not serve Daily Ritual at {APP_URL}."
            )
    else:
        start_server()

    webbrowser.open(APP_URL, new=2)
    print(f"Daily Ritual is open at {APP_URL}")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as error:
        print(error, file=sys.stderr)
        raise SystemExit(1)
