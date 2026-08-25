import json
import os
import subprocess
import sys
import traceback

from http.server import (
    ThreadingHTTPServer,
    SimpleHTTPRequestHandler
)

# ============================================================
# SERVER SETTINGS
# ============================================================

HOST = "0.0.0.0"
PORT = 8080

# ============================================================
# RUNTIME PATHS
# ============================================================

RUNTIME_FOLDER = "runtime"

RUNTIME_PROJECT = os.path.join(
    RUNTIME_FOLDER,
    "project.json"
)

RUNTIME_HTML = os.path.join(
    RUNTIME_FOLDER,
    "index.html"
)

# ============================================================
# RUNTIME PROCESS
# ============================================================

runtime_process = None

# ============================================================
# BUILDER REQUEST HANDLER
# ============================================================

class BuilderHandler(SimpleHTTPRequestHandler):

    # ========================================================
    # JSON RESPONSE
    # ========================================================

    def send_json(self, data, status=200):

        body = json.dumps(
            data
        ).encode("utf-8")

        self.send_response(status)

        self.send_header(
            "Content-Type",
            "application/json"
        )

        self.send_header(
            "Content-Length",
            str(len(body))
        )

        self.end_headers()

        self.wfile.write(body)

    # ========================================================
    # POST REQUESTS
    # ========================================================

    def do_POST(self):

        global runtime_process

        print("")
        print("POST received:")
        print(self.path)


        content_length = int(
            self.headers.get(
                "Content-Length",
                0
            )
        )

        raw_body = self.rfile.read(
            content_length
        )

        # ====================================================
        # SAVE RUNTIME
        # ====================================================

        if self.path == "/api/save-runtime":

            try:

                request_data = json.loads(
                    raw_body.decode("utf-8")
                )

                project = request_data["project"]

                runtime_html = request_data[
                    "runtimeHTML"
                ]

                os.makedirs(
                    RUNTIME_FOLDER,
                    exist_ok=True
                )

                # --------------------------------------------
                # SAVE project.json
                # --------------------------------------------

                with open(
                    RUNTIME_PROJECT,
                    "w",
                    encoding="utf-8"
                ) as file:

                    json.dump(
                        project,
                        file,
                        indent=2
                    )

                # --------------------------------------------
                # SAVE runtime/index.html
                # --------------------------------------------

                with open(
                    RUNTIME_HTML,
                    "w",
                    encoding="utf-8"
                ) as file:

                    file.write(
                        runtime_html
                    )

                print(
                    "Runtime project saved."
                )

                print(
                    "Runtime index.html generated."
                )

                self.send_json(
                    {
                        "success": True
                    }
                )

            except Exception as error:

                print("")
                print("SAVE ERROR:")
                print(error)

                traceback.print_exc()

                self.send_json(
                    {
                        "success": False,
                        "error": str(error)
                    },
                    500
                )

            return

        # ====================================================
        # START RUNTIME
        # ====================================================

        if self.path == "/api/start-runtime":

            try:

                print(
                    "Start runtime request received."
                )

                # --------------------------------------------
                # READ PASSWORD SENT FROM THE BUILDER
                # --------------------------------------------

                request_data = {}

                if raw_body:

                    request_data = json.loads(
                        raw_body.decode("utf-8")
                    )

                opc_password = request_data.get(
                    "password",
                    ""
                )

                # Create environment for runtime_server.py
                runtime_env = os.environ.copy()

                runtime_env[
                    "HMI_OPC_PASSWORD"
                ] = opc_password

                # --------------------------------------------
                # START RUNTIME PROCESS
                # --------------------------------------------

                if (
                    runtime_process is None
                    or runtime_process.poll() is not None
                ):

                    print(
                        "Starting runtime_server.py..."
                    )

                    runtime_process = subprocess.Popen(
                        [
                            sys.executable,
                            "runtime_server.py"
                        ],
                        env=runtime_env
                    )

                    print(
                        f"Runtime started with PID: "
                        f"{runtime_process.pid}"
                    )

                else:

                    print(
                        "Runtime is already running."
                    )

                self.send_json(
                    {
                        "success": True
                    }
                )

            except Exception as error:

                print("")
                print("START RUNTIME ERROR:")
                print(error)

                traceback.print_exc()

                self.send_json(
                    {
                        "success": False,
                        "error": str(error)
                    },
                    500
                )

            return

        # ====================================================
        # STOP RUNTIME
        # ====================================================

        if self.path == "/api/stop-runtime":

            try:

                print(
                    "Stop runtime request received."
                )

                if (
                    runtime_process is not None
                    and runtime_process.poll() is None
                ):

                    print(
                        "Stopping HMI runtime..."
                    )

                    runtime_process.terminate()

                    runtime_process.wait(
                        timeout=5
                    )

                runtime_process = None

                self.send_json(
                    {
                        "success": True
                    }
                )

            except subprocess.TimeoutExpired:

                print(
                    "Runtime did not stop normally. Killing process..."
                )

                if runtime_process is not None:

                    runtime_process.kill()

                    runtime_process = None

                self.send_json(
                    {
                        "success": True
                    }
                )

            except Exception as error:

                print("")
                print("STOP RUNTIME ERROR:")
                print(error)

                traceback.print_exc()

                self.send_json(
                    {
                        "success": False,
                        "error": str(error)
                    },
                    500
                )

            return

        # ====================================================
        # UNKNOWN API ENDPOINT
        # ====================================================

        self.send_json(
            {
                "success": False,
                "error": "Unknown endpoint"
            },
            404
        )

# ============================================================
# START BUILDER SERVER
# ============================================================

def start_server():

    server = ThreadingHTTPServer(
        (HOST, PORT),
        BuilderHandler
    )

    print("")
    print("======================================")
    print("VIRTUAL HMI BUILDER")
    print("======================================")
    print("")
    print(f"http://localhost:{PORT}")
    print("")


    server.serve_forever()

# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":

    start_server()