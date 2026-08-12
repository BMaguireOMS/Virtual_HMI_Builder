import asyncio
import json
import os
import socket
import threading

from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

from asyncua import Client, ua
from asyncua.crypto.security_policies import SecurityPolicyBasic256Sha256
from asyncua.crypto.cert_gen import setup_self_signed_certificate
from cryptography.x509.oid import ExtendedKeyUsageOID


# ============================================================
# WEB SERVER SETTINGS
# ============================================================

HOST = "0.0.0.0"
PORT = 8000

PROJECT_FILE = "runtime/project.json"


# ============================================================
# LOAD PROJECT
# ============================================================

with open(PROJECT_FILE, "r", encoding="utf-8") as file:
    project = json.load(file)


# ============================================================
# OPC UA SETTINGS
# ============================================================

PLC_ENDPOINT = project["opc"]["endpoint"]
OPC_USERNAME = project["opc"].get("username", "")

# Password is stored in a Windows environment variable instead
# of project.json.
OPC_PASSWORD = os.getenv("HMI_OPC_PASSWORD", "")


# ============================================================
# SHARED DATA
# ============================================================

tag_cache = {}

opc_loop = None
opc_client = None

node_cache = {}


# ============================================================
# FIND ALL USED OPC UA NODE IDS
# ============================================================

def get_all_node_ids():

    nodes = set()

    for screen in project["screens"]:

        for obj in screen["objects"]:

            node_id = obj.get("node", "")

            if node_id:
                nodes.add(node_id)

    return sorted(nodes)


# ============================================================
# WRITE PLC TAG
# ============================================================

async def write_tag(node_id, value, data_type):

    global opc_client

    node = node_cache.get(node_id)

    if node is None:

        node = opc_client.get_node(node_id)

        node_cache[node_id] = node

    variant_types = {
        "BOOL": ua.VariantType.Boolean,
        "DINT": ua.VariantType.Int32,
        "REAL": ua.VariantType.Float,
        "LREAL": ua.VariantType.Double,
        "STRING": ua.VariantType.String
    }

    variant_type = variant_types[data_type]

    await node.write_value(
        ua.Variant(
            value,
            variant_type
        )
    )


# ============================================================
# OPC UA CONNECTION
# ============================================================

async def opcua_task():

    global opc_loop
    global opc_client

    opc_loop = asyncio.get_running_loop()

    # --------------------------------------------------------
    # CERTIFICATE FOLDER
    # --------------------------------------------------------

    cert_folder = Path("certs")

    cert_folder.mkdir(exist_ok=True)

    cert_file = cert_folder / "virtual_hmi_client.der"
    key_file = cert_folder / "virtual_hmi_client_key.pem"

    hostname = socket.gethostname()

    application_uri = f"urn:{hostname}:VirtualHMI"


    # --------------------------------------------------------
    # CREATE / LOAD CLIENT CERTIFICATE
    # --------------------------------------------------------

    await setup_self_signed_certificate(
        key_file,
        cert_file,
        application_uri,
        hostname,
        [ExtendedKeyUsageOID.CLIENT_AUTH],
        {
            "countryName": "US",
            "organizationName": "Virtual HMI",
            "commonName": "Virtual HMI OPC UA Client"
        }
    )


    # --------------------------------------------------------
    # CREATE OPC UA CLIENT
    # --------------------------------------------------------

    opc_client = Client(url=PLC_ENDPOINT)

    opc_client.application_uri = application_uri


    # --------------------------------------------------------
    # USERNAME / PASSWORD
    # --------------------------------------------------------

    if OPC_USERNAME:

        opc_client.set_user(OPC_USERNAME)

        opc_client.set_password(OPC_PASSWORD)


    # --------------------------------------------------------
    # OPC UA SECURITY
    # --------------------------------------------------------

    await opc_client.set_security(
        SecurityPolicyBasic256Sha256,
        certificate=str(cert_file),
        private_key=str(key_file),
        mode=ua.MessageSecurityMode.SignAndEncrypt
    )


    # --------------------------------------------------------
    # CONNECTION / RECONNECTION LOOP
    # --------------------------------------------------------

    while True:

        try:

            print("")
            print("Connecting to OPC UA server...")
            print(PLC_ENDPOINT)

            await opc_client.connect()

            print("")
            print("======================================")
            print("OPC UA CONNECTED")
            print("======================================")
            print("")


            # ------------------------------------------------
            # CREATE OPC UA NODE OBJECTS
            # ------------------------------------------------

            node_ids = get_all_node_ids()

            print(f"Configured OPC UA tags: {len(node_ids)}")

            for node_id in node_ids:

                print(f"  {node_id}")

                node_cache[node_id] = opc_client.get_node(node_id)


            # ------------------------------------------------
            # READ LOOP
            # ------------------------------------------------

            while True:

                for node_id, node in list(node_cache.items()):

                    try:

                        value = await node.read_value()

                        tag_cache[node_id] = value

                    except Exception as error:

                        print(
                            f"Read error for {node_id}: {error}"
                        )

                await asyncio.sleep(0.25)


        except Exception as error:

            print("")
            print("OPC UA CONNECTION ERROR:")
            print(error)
            print("")

            try:
                await opc_client.disconnect()

            except Exception:
                pass

            print("Retrying connection in 3 seconds...")

            await asyncio.sleep(3)


# ============================================================
# HTTP SERVER
# ============================================================

class HMIRequestHandler(SimpleHTTPRequestHandler):

    def send_json(self, data, status=200):

        body = json.dumps(data).encode("utf-8")

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
    # GET REQUESTS
    # ========================================================

    def do_GET(self):

        if self.path == "/api/tags":

            self.send_json(tag_cache)

            return

        super().do_GET()


    # ========================================================
    # POST REQUESTS
    # ========================================================

    def do_POST(self):

        if self.path != "/api/write":

            self.send_json(
                {
                    "error": "Unknown endpoint"
                },
                404
            )

            return


        # ----------------------------------------------------
        # READ JSON BODY
        # ----------------------------------------------------

        content_length = int(
            self.headers.get(
                "Content-Length",
                0
            )
        )

        raw_body = self.rfile.read(content_length)


        try:

            request = json.loads(
                raw_body.decode("utf-8")
            )

            node_id = request["node"]
            value = request["value"]
            data_type = request["dataType"]

        except Exception as error:

            self.send_json(
                {
                    "success": False,
                    "error": str(error)
                },
                400
            )

            return


        # ----------------------------------------------------
        # MAKE SURE OPC UA CLIENT IS RUNNING
        # ----------------------------------------------------

        if opc_loop is None:

            self.send_json(
                {
                    "success": False,
                    "error": "OPC UA client not ready"
                },
                503
            )

            return


        # ----------------------------------------------------
        # SEND WRITE TO OPC UA EVENT LOOP
        # ----------------------------------------------------

        future = asyncio.run_coroutine_threadsafe(
            write_tag(
                node_id,
                value,
                data_type
            ),
            opc_loop
        )


        try:

            future.result(timeout=3)

            self.send_json(
                {
                    "success": True
                }
            )

        except Exception as error:

            self.send_json(
                {
                    "success": False,
                    "error": str(error)
                },
                500
            )


# ============================================================
# START WEB SERVER
# ============================================================

def start_web_server():

    from functools import partial

    handler = partial(
        HMIRequestHandler,
        directory="runtime"
    )

    server = ThreadingHTTPServer(
        (HOST, PORT),
        handler
    )

    print("")
    print("======================================")
    print("VIRTUAL HMI RUNTIME")
    print("======================================")
    print("")
    print(f"Local HMI:")
    print(f"http://localhost:{PORT}")
    print("")

    server.serve_forever()


# ============================================================
# MAIN
# ============================================================

async def main():

    web_thread = threading.Thread(
        target=start_web_server,
        daemon=True
    )

    web_thread.start()

    await opcua_task()


if __name__ == "__main__":

    asyncio.run(main())