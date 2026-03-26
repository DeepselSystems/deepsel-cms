"""Client process manager - controls the Astro Node.js process lifecycle."""

import logging
import os
import signal
import subprocess  # nosec B404
import threading

from platformdirs import user_data_dir

logger = logging.getLogger(__name__)

NO_CLIENT = os.getenv("NO_CLIENT", "").lower() in ("true", "1", "yes")


class ClientProcessManager:
    """Thread-safe singleton that manages the Astro standalone Node.js process."""

    _instance = None
    _cls_lock = threading.Lock()

    def __new__(cls):
        with cls._cls_lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._process: subprocess.Popen | None = None
        self._process_lock = threading.Lock()
        self._shutting_down = False
        self._initialized = True

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def start(self):
        """Start the Astro client if not already running."""
        with self._process_lock:
            if self._shutting_down:
                logger.info("Shutdown in progress, not starting client")
                return
            if self._process is not None and self._process.poll() is None:
                logger.info("Client already running (PID %d)", self._process.pid)
                return
            self._start_process()

    def stop(self, timeout: float = 5.0):
        """Stop the client gracefully: SIGTERM → wait → SIGKILL."""
        with self._process_lock:
            self._stop_process(timeout)

    def restart(self, timeout: float = 5.0):
        """Atomic stop-then-start under a single lock acquisition."""
        with self._process_lock:
            if self._shutting_down:
                logger.info("Shutdown in progress, not restarting client")
                return
            self._stop_process(timeout)
            self._start_process()

    def shutdown(self, timeout: float = 5.0):
        """Mark as shutting down and stop. Prevents further starts."""
        with self._process_lock:
            self._shutting_down = True
            self._stop_process(timeout)

    @property
    def is_running(self) -> bool:
        with self._process_lock:
            return self._process is not None and self._process.poll() is None

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _start_process(self):
        """Launch the Node process. Caller must hold _process_lock."""
        data_dir = user_data_dir("deepsel-cms", "deepsel")
        entry_path = os.path.join(data_dir, "client", "dist", "server", "entry.mjs")

        if not os.path.exists(entry_path):
            logger.warning("Client entry not found at %s, skipping start", entry_path)
            return

        host = os.environ.get("CLIENT_HOST", "0.0.0.0")  # nosec B104
        port = os.environ.get("CLIENT_PORT", "4321")

        env = os.environ.copy()
        env["HOST"] = host
        env["PORT"] = port

        logger.info("Starting Astro client on %s:%s ...", host, port)

        self._process = subprocess.Popen(  # nosec B603 B607
            ["node", entry_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            env=env,
            preexec_fn=os.setsid if os.name != "nt" else None,
        )

        # Daemon threads stream child output into Python logging
        for pipe, name in [
            (self._process.stdout, "client.stdout"),
            (self._process.stderr, "client.stderr"),
        ]:
            t = threading.Thread(
                target=self._stream_output, args=(pipe, name), daemon=True
            )
            t.start()

        logger.info("Astro client started (PID %d)", self._process.pid)

    def _stop_process(self, timeout: float = 5.0):
        """Stop the running process. Caller must hold _process_lock."""
        if self._process is None:
            return

        if self._process.poll() is not None:
            logger.info(
                "Client process already exited (code %d)", self._process.returncode
            )
            self._process = None
            return

        pid = self._process.pid
        logger.info("Stopping Astro client (PID %d) ...", pid)

        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except (ProcessLookupError, PermissionError):
            self._process = None
            return

        try:
            self._process.wait(timeout=timeout)
            logger.info("Client process stopped gracefully")
        except subprocess.TimeoutExpired:
            logger.warning("Client did not stop within %ss, sending SIGKILL", timeout)
            try:
                os.killpg(os.getpgid(pid), signal.SIGKILL)
                self._process.wait(timeout=2)
            except (ProcessLookupError, PermissionError, subprocess.TimeoutExpired):
                pass
            logger.info("Client process killed")

        self._process = None

    @staticmethod
    def _stream_output(pipe, logger_name: str):
        """Read lines from a pipe and log them. Runs in a daemon thread."""
        log = logging.getLogger(logger_name)
        try:
            for line in iter(pipe.readline, b""):
                text = line.decode("utf-8", errors="replace").rstrip()
                if text:
                    log.info(text)
        except (ValueError, OSError):
            pass  # Pipe closed during shutdown
        finally:
            try:
                pipe.close()
            except Exception:  # nosec B110
                pass


def get_client_manager() -> ClientProcessManager | None:
    """Get the singleton, or None if client management is disabled."""
    if NO_CLIENT:
        return None
    return ClientProcessManager()
