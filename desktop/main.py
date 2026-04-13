import os
import re
import shutil
import subprocess
import sys
import time
from collections import deque
from pathlib import Path
from typing import TextIO

import requests
import webview


ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT / "backend"
FRONTEND_DIR = ROOT / "frontend"
BACKEND_HOST = "127.0.0.1"
BACKEND_PORT = int(os.getenv("O2_BACKEND_PORT", "5001"))
FRONTEND_HOST = "127.0.0.1"
FRONTEND_PORT = int(os.getenv("O2_FRONTEND_PORT", "5173"))
FRONTEND_STARTUP_TIMEOUT = int(os.getenv("O2_FRONTEND_STARTUP_TIMEOUT", "30"))
BACKEND_URL = f"http://{BACKEND_HOST}:{BACKEND_PORT}"
BACKEND_LOG_PATH = ROOT / "backend.log"
FRONTEND_LOG_PATH = ROOT / "frontend.log"
ROOT_LOCKFILE = ROOT / "package-lock.json"
ROOT_NODE_MODULES = ROOT / "node_modules"

ANSI_ESCAPE_PATTERN = re.compile(r"\x1B\[[0-?]*[ -/]*[@-~]")
LOCAL_URL_PATTERN = re.compile(r"Local:\s*(https?://[^\s]+)")


def _tail_log_file(log_path: Path, max_lines: int = 40) -> str:
    if not log_path.exists():
        return "(log file not found)"

    with log_path.open("r", encoding="utf-8", errors="replace") as log_file:
        lines = deque((line.rstrip() for line in log_file if line.strip()), maxlen=max_lines)

    if not lines:
        return "(no output captured)"
    return "\n".join(lines)


def _strip_ansi_sequences(raw_text: str) -> str:
    return ANSI_ESCAPE_PATTERN.sub("", raw_text).replace("\x00", "")


def _detect_frontend_url_from_log(log_path: Path) -> str | None:
    if not log_path.exists():
        return None

    with log_path.open("r", encoding="utf-8", errors="replace") as log_file:
        content = _strip_ansi_sequences(log_file.read())

    matches = LOCAL_URL_PATTERN.findall(content)
    if not matches:
        return None
    return matches[-1].rstrip()


def _dependency_mismatch_reasons() -> list[str]:
    reasons: list[str] = []
    frontend_lockfile = FRONTEND_DIR / "package-lock.json"
    frontend_modules = FRONTEND_DIR / "node_modules"
    installed_lockfile = ROOT_NODE_MODULES / ".package-lock.json"

    if frontend_lockfile.exists():
        reasons.append("frontend/package-lock.json exists; workspace must use only root lockfile")

    if not ROOT_LOCKFILE.exists():
        reasons.append("root package-lock.json is missing")

    if not ROOT_NODE_MODULES.exists():
        reasons.append("root node_modules directory is missing")

    vite_chunks_dir = ROOT_NODE_MODULES / "vite" / "dist" / "node" / "chunks"
    if not vite_chunks_dir.exists():
        reasons.append("root vite chunk directory is missing")

    if not (ROOT_NODE_MODULES / "react").exists() or not (ROOT_NODE_MODULES / "react-dom").exists():
        reasons.append("root React dependencies are missing")

    if ROOT_LOCKFILE.exists() and installed_lockfile.exists():
        if ROOT_LOCKFILE.stat().st_mtime > installed_lockfile.stat().st_mtime:
            reasons.append("root lockfile is newer than installed dependency snapshot")

    if frontend_modules.exists():
        stale_markers = ["@chakra-ui", "@emotion", "@pandacss", "@ark-ui"]
        found_markers = [marker for marker in stale_markers if (frontend_modules / marker).exists()]
        if found_markers:
            reasons.append(
                "frontend-local stale dependencies detected: " + ", ".join(sorted(found_markers))
            )

    return reasons


def _run_install_command(command: list[str]) -> None:
    result = subprocess.run(
        command,
        cwd=str(ROOT),
        text=True,
        capture_output=True,
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0,
    )
    if result.returncode == 0:
        return

    stdout = result.stdout.strip() or "(no stdout)"
    stderr = result.stderr.strip() or "(no stderr)"
    raise RuntimeError(
        f"Command {' '.join(command)} failed with exit code {result.returncode}.\n"
        f"stdout:\n{stdout}\n\n"
        f"stderr:\n{stderr}"
    )


def _remove_tree_if_exists(path: Path) -> None:
    if not path.exists():
        return

    shutil.rmtree(path, ignore_errors=False)


def _repair_workspace_dependencies() -> None:
    frontend_modules = FRONTEND_DIR / "node_modules"
    frontend_dist = FRONTEND_DIR / "dist"
    stale_markers = ["@chakra-ui", "@emotion", "@pandacss", "@ark-ui"]

    if frontend_modules.exists():
        for marker in stale_markers:
            _remove_tree_if_exists(frontend_modules / marker)

        _remove_tree_if_exists(frontend_modules / ".vite")
        _remove_tree_if_exists(frontend_modules / ".vite-temp")

        local_vite = frontend_modules / "vite"
        local_chunks = local_vite / "dist" / "node" / "chunks"
        if local_vite.exists() and not local_chunks.exists():
            _remove_tree_if_exists(local_vite)

    _remove_tree_if_exists(frontend_dist)

    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    if ROOT_LOCKFILE.exists():
        try:
            _run_install_command([npm_cmd, "ci"])
        except RuntimeError:
            _run_install_command([npm_cmd, "install"])
    else:
        _run_install_command([npm_cmd, "install"])


def ensure_workspace_dependencies() -> None:
    mismatch_reasons = _dependency_mismatch_reasons()
    if not mismatch_reasons:
        return

    _repair_workspace_dependencies()
    remaining_reasons = _dependency_mismatch_reasons()
    if remaining_reasons:
        raise RuntimeError(
            "Dependency preflight repair could not resolve workspace mismatch.\n"
            f"Initial reasons: {mismatch_reasons}\n"
            f"Remaining reasons: {remaining_reasons}"
        )


def wait_for_backend(
    backend_proc: subprocess.Popen[str],
    backend_log_path: Path,
    timeout_seconds: int = 20,
) -> None:
    deadline = time.time() + timeout_seconds
    last_failure = "no response received yet"

    while time.time() < deadline:
        exit_code = backend_proc.poll()
        if exit_code is not None:
            formatted_output = _tail_log_file(backend_log_path)
            raise RuntimeError(
                f"Backend process exited with code {exit_code} before becoming ready on {BACKEND_URL}.\n"
                f"Last backend output:\n{formatted_output}"
            )

        try:
            response = requests.get(f"{BACKEND_URL}/api/health", timeout=1.5)
            if response.status_code != 200:
                last_failure = f"health endpoint returned HTTP {response.status_code}"
            else:
                try:
                    payload = response.json()
                except ValueError:
                    payload = None
                if isinstance(payload, dict) and payload.get("status") == "ok":
                    return
                last_failure = f"health endpoint returned unexpected payload: {payload!r}"
        except requests.RequestException as error:
            last_failure = f"health check request failed: {error}"
        time.sleep(0.5)

    raise RuntimeError(
        f"Backend did not become ready on {BACKEND_URL} within {timeout_seconds}s. "
        f"Last check detail: {last_failure}. "
        "Check whether another process is occupying the configured port."
    )


def wait_for_frontend_url(
    frontend_proc: subprocess.Popen[str],
    frontend_log_path: Path,
    timeout_seconds: int,
) -> str:
    deadline = time.time() + timeout_seconds
    last_failure = "frontend dev server not ready yet"

    while time.time() < deadline:
        exit_code = frontend_proc.poll()
        if exit_code is not None:
            formatted_output = _tail_log_file(frontend_log_path)
            raise RuntimeError(
                f"Frontend process exited with code {exit_code} before becoming ready.\n"
                f"Last frontend output:\n{formatted_output}"
            )

        frontend_url = _detect_frontend_url_from_log(frontend_log_path)
        if frontend_url:
            try:
                response = requests.get(frontend_url, timeout=1.5)
                if response.ok:
                    return frontend_url
                last_failure = f"frontend URL {frontend_url} returned HTTP {response.status_code}"
            except requests.RequestException as error:
                last_failure = f"frontend URL check failed: {error}"
        time.sleep(0.5)

    raise RuntimeError(
        f"Frontend did not become ready within {timeout_seconds}s. Last check detail: {last_failure}. "
        "Check frontend.log for startup diagnostics."
    )


def spawn_backend(log_file: TextIO) -> subprocess.Popen[str]:
    env = os.environ.copy()
    env["POS_BACKEND_PORT"] = str(BACKEND_PORT)
    return subprocess.Popen(
        [sys.executable, "run.py"],
        cwd=str(BACKEND_DIR),
        env=env,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        text=True,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )


def spawn_frontend(log_file: TextIO) -> subprocess.Popen[str]:
    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    frontend_env = os.environ.copy()
    frontend_env["VITE_API_BASE"] = BACKEND_URL
    return subprocess.Popen(
        [
            npm_cmd,
            "run",
            "dev",
            "--",
            "--host",
            FRONTEND_HOST,
            "--port",
            str(FRONTEND_PORT),
        ],
        cwd=str(FRONTEND_DIR),
        env=frontend_env,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        text=True,
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0,
    )


def terminate_process_tree(proc: subprocess.Popen[str]) -> None:
    if proc.poll() is not None:
        return

    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(proc.pid), "/T", "/F"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            text=True,
            check=False,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
        return

    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()


def run() -> None:
    backend_timeout_seconds = int(os.getenv("O2_BACKEND_STARTUP_TIMEOUT", "20"))
    ensure_workspace_dependencies()

    # Truncate both logs at the beginning of every run.
    with BACKEND_LOG_PATH.open("w", encoding="utf-8") as backend_log, FRONTEND_LOG_PATH.open(
        "w", encoding="utf-8"
    ) as frontend_log:
        backend_proc = spawn_backend(backend_log)
        frontend_proc = spawn_frontend(frontend_log)
        try:
            wait_for_backend(
                backend_proc,
                backend_log_path=BACKEND_LOG_PATH,
                timeout_seconds=backend_timeout_seconds,
            )
            frontend_url = wait_for_frontend_url(
                frontend_proc,
                frontend_log_path=FRONTEND_LOG_PATH,
                timeout_seconds=FRONTEND_STARTUP_TIMEOUT,
            )
            webview.create_window(
                "O2mation · Market",
                frontend_url,
                width=1280,
                height=800,
                min_size=(1024, 700),
            )
            webview.start(debug=True, private_mode=False)
        finally:
            terminate_process_tree(frontend_proc)
            terminate_process_tree(backend_proc)


if __name__ == "__main__":
    run()

