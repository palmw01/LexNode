import http.server
import socketserver
import json
import traceback
from datetime import datetime
from lexnode_engine import LexNodeEngine
from io import BytesIO

try:
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
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
            result["dagtekening"] = dagtekening.strftime('%d-%m-%Y')
            result["peildatum"]   = peildatum.strftime('%d-%m-%Y')

            if 'export-pdf' in self.path:
                self._handle_export_pdf(result)
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

    def _handle_export_pdf(self, result: dict):
        if not HAS_REPORTLAB:
            self.send_response(501)
            self.end_headers()
            self.wfile.write(b"reportlab niet geinstalleerd")
            return

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer, pagesize=A4,
            leftMargin=2*cm, rightMargin=2*cm,
            topMargin=2*cm, bottomMargin=2*cm,
        )

        styles = getSampleStyleSheet()
        s_titel   = ParagraphStyle("Titel",   parent=styles["Title"],   fontSize=18, spaceAfter=4)
        s_subtitel = ParagraphStyle("Sub",    parent=styles["Normal"],  fontSize=9,  textColor=colors.grey, spaceAfter=2)
        s_h2      = ParagraphStyle("H2",      parent=styles["Heading2"], fontSize=12, spaceBefore=14, spaceAfter=4)
        s_body    = ParagraphStyle("Body",    parent=styles["Normal"],  fontSize=9,  leading=14, spaceAfter=6)
        s_label   = ParagraphStyle("Label",   parent=styles["Normal"],  fontSize=8,  textColor=colors.HexColor("#555555"))
        s_markeer = ParagraphStyle("Mark",    parent=styles["Normal"],  fontSize=9,  fontName="Helvetica-Oblique", textColor=colors.HexColor("#333333"))
        s_klein   = ParagraphStyle("Klein",   parent=styles["Normal"],  fontSize=7.5, textColor=colors.grey, leading=11)

        invorderbaar = result["invorderbaar"]
        deadline     = result["deadline"]
        details      = result["details"]
        route_nodes  = engine.get_route_nodes()

        # Wettelijke bronnen verzamelen (uniek, volgorde bewaren)
        import ast
        bronnen_set, bronnen_lijst = set(), []
        for n in route_nodes:
            for veld in (n["bron"], n["bronnen"]):
                if not veld:
                    continue
                try:
                    items = ast.literal_eval(veld) if veld.startswith("[") else [veld]
                except Exception:
                    items = [veld]
                for b in items:
                    b = b.strip()
                    if b and b not in bronnen_set:
                        bronnen_set.add(b)
                        bronnen_lijst.append(b)

        story = []

        # ── Header ──────────────────────────────────────────────────────────
        story.append(Paragraph("LexNode — Juridisch Besluit", s_titel))
        story.append(Paragraph(
            f"Gegenereerd op {datetime.now().strftime('%d-%m-%Y om %H:%M')} &nbsp;|&nbsp; "
            f"Kennisgraaf peildatum 2026-01-01 &nbsp;|&nbsp; Status: concept",
            s_subtitel,
        ))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CCCCCC"), spaceAfter=10))

        # ── 1. Besluit ──────────────────────────────────────────────────────
        story.append(Paragraph("1. Besluit", s_h2))
        kleur_bg = colors.HexColor("#70AD47") if invorderbaar else colors.HexColor("#FF4C4C")
        kleur_fg = colors.white
        uitslag  = "INVORDERBAAR" if invorderbaar else "NIET INVORDERBAAR"

        besluit_data = [
            [Paragraph(f'<font color="white"><b>{uitslag}</b></font>', ParagraphStyle("U", parent=s_body, fontSize=13, leading=16))],
            [Paragraph(
                f"Dagtekening: <b>{result.get('dagtekening', '—')}</b> &nbsp;|&nbsp; "
                f"Peildatum: <b>{result.get('peildatum', '—')}</b> &nbsp;|&nbsp; "
                f"Deadline: <b>{deadline.strftime('%d-%m-%Y')}</b> &nbsp;|&nbsp; "
                f"Termijn: <b>{details['termijn_dagen']} dagen</b> &nbsp;|&nbsp; "
                f"ATW: <b>{details['atw_status']}</b>",
                ParagraphStyle("BInfo", parent=s_body, fontSize=8, textColor=colors.white, leading=12),
            )],
        ]
        besluit_tbl = Table(besluit_data, colWidths=["100%"])
        besluit_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), kleur_bg),
            ("TOPPADDING",    (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING",   (0, 0), (-1, -1), 12),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 12),
            ("ROUNDEDCORNERS", [6]),
        ]))
        story.append(besluit_tbl)

        # ── 2. Redeneerroute ────────────────────────────────────────────────
        story.append(Paragraph("2. Redeneerroute", s_h2))
        story.append(Paragraph(
            "De beslissing volgt uit de onderstaande redeneerroute zoals gemodelleerd in de kennisgraaf.",
            s_body,
        ))

        for i, node in enumerate(route_nodes, 1):
            story.append(Spacer(1, 6))
            label_tekst = f"Stap {i}: {node['label']}"
            if node["jas_klasse"]:
                label_tekst += f" <font color='#777777'>({node['jas_klasse']})</font>"
            story.append(Paragraph(label_tekst, ParagraphStyle("StapH", parent=s_body, fontName="Helvetica-Bold", fontSize=9)))
            if node["markering"]:
                story.append(Paragraph(f"Wettekst: <i>{node['markering']}</i>", s_markeer))
            if node["definitie"]:
                story.append(Paragraph(node["definitie"], s_body))
            if node["bron"]:
                story.append(Paragraph(f"Bron: {node['bron']}", s_label))

        # ── 3. Juridische toelichting ────────────────────────────────────────
        story.append(Paragraph("3. Juridische toelichting", s_h2))
        for node in route_nodes:
            if not node["toelichting"]:
                continue
            story.append(Paragraph(
                f"<b>{node['label']}</b>"
                + (f" — Interpretatiemethode: {node['interpretatie']}" if node["interpretatie"] else ""),
                ParagraphStyle("TH", parent=s_body, fontName="Helvetica-Bold", fontSize=9, spaceAfter=2),
            ))
            story.append(Paragraph(node["toelichting"], s_body))

        # ── 4. Afleidingsregel AR-9-1 ────────────────────────────────────────
        story.append(Paragraph("4. Afleidingsregel AR-9-1", s_h2))
        ar = next((n for n in route_nodes if n["id"] == "AR-9-1"), None)
        if ar:
            story.append(Paragraph(f"<b>{ar['naam']}</b> (regel_id: {ar['regel_id']})", s_body))
            if ar["operators"]:
                try:
                    ops = ast.literal_eval(ar["operators"])
                    story.append(Paragraph(f"Operators: {', '.join(ops)}", s_body))
                except Exception:
                    story.append(Paragraph(f"Operators: {ar['operators']}", s_body))
            story.append(Paragraph(
                f"Formule: <i>peildatum ≥ dagtekening + {details['termijn_dagen']} dagen</i>",
                s_markeer,
            ))

        # ── 5. Wettelijke grondslagen ────────────────────────────────────────
        story.append(Paragraph("5. Wettelijke grondslagen", s_h2))
        for b in bronnen_lijst:
            story.append(Paragraph(f"• {b}", s_body))

        # ── Footer ───────────────────────────────────────────────────────────
        story.append(Spacer(1, 16))
        story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CCCCCC"), spaceAfter=4))
        story.append(Paragraph(
            "LexNode prototype — Rules as Code — Belastingdienst | "
            "Gegenereerd op basis van Art. 9 Invorderingswet 1990 kennisgraaf (GEXF). "
            "Dit document heeft geen juridische status.",
            s_klein,
        ))

        doc.build(story)
        self.send_response(200)
        self.send_header('Content-type', 'application/pdf')
        self.send_header('Content-Disposition', 'attachment; filename="lexnode-besluit.pdf"')
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
