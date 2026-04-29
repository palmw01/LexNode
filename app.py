import http.server
import socketserver
import json
import traceback
from datetime import datetime
from lexnode_engine import LexNodeEngine
from io import BytesIO

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False

PORT = 8080
engine = LexNodeEngine("graph.gexf")


class LexNodeHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        try:
            if self.path in ('/', '/index.html'):
                self._serve_file('index.html', 'text/html')
                return
            if 'graph-data' in self.path:
                self._json(engine.get_graph_data())
                return
            if 'node-details/' in self.path:
                node_id = self.path.split('/')[-1]
                self._json(engine._get_attrs(node_id))
                return
            super().do_GET()
        except Exception:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": traceback.format_exc()}).encode())

    def do_POST(self):
        try:
            body = self.rfile.read(int(self.headers['Content-Length']))
            params = json.loads(body)
            dagtekening = datetime.strptime(params['dagtekening'], '%Y-%m-%d')
            peildatum   = datetime.strptime(params['peildatum'],   '%Y-%m-%d')
            result      = engine.check_invorderbaarheid(dagtekening, peildatum)

            if 'export-pdf' in self.path:
                self._handle_export_pdf(result)
            elif 'export' in self.path:
                self._handle_export(result)
            else:
                self._handle_calculate(result)
        except Exception:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(traceback.format_exc().encode())

    def _handle_calculate(self, result: dict):
        self._json({
            "invorderbaar":    result["invorderbaar"],
            "deadline":        result["deadline"].strftime('%d-%m-%Y'),
            "dagen":           result["details"]["termijn_dagen"],
            "atw_uitgesloten": "Uitgesloten" in result["details"]["atw_status"],
            "bron":            result["details"]["wetsartikel"],
        })

    def _handle_export(self, result: dict):
        self._json(result)

    def _handle_export_pdf(self, result: dict):
        if not HAS_REPORTLAB:
            self.send_response(501)
            self.end_headers()
            self.wfile.write(b"reportlab niet geinstalleerd")
            return
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        p.drawString(100, 750, "LexNode Bewijs")
        p.drawString(100, 730, f"Invorderbaar: {result['invorderbaar']}")
        p.drawString(100, 710, f"Deadline: {result['deadline'].strftime('%d-%m-%Y')}")
        p.showPage()
        p.save()
        self.send_response(200)
        self.send_header('Content-type', 'application/pdf')
        self.end_headers()
        self.wfile.write(buffer.getvalue())

    def _serve_file(self, path: str, content_type: str):
        self.send_response(200)
        self.send_header('Content-type', content_type)
        self.end_headers()
        with open(path, 'rb') as f:
            self.wfile.write(f.read())

    def _json(self, data):
        payload = json.dumps(data, indent=None, default=str).encode()
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(payload)


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("0.0.0.0", PORT), LexNodeHandler) as httpd:
    print(f"LexNode server draait op http://localhost:{PORT}")
    httpd.serve_forever()
