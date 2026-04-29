import xml.etree.ElementTree as ET
import re
from datetime import datetime, timedelta

class LexNodeEngine:
    NS = {'g': 'http://www.gexf.net/1.2draft'}
    ATTR = {
        'node_type':   '0',
        'color':       '2',
        'bron':        '10',
        'toelichting': '13',
        'definitie':   '14',
    }

    def __init__(self, gexf_path: str):
        self.tree = ET.parse(gexf_path)
        self.root = self.tree.getroot()

    def _get_attrs(self, node_id: str) -> dict:
        node = self.root.find(f".//g:node[@id='{node_id}']", self.NS)
        if node is None:
            return {}
        return {a.get('for'): a.get('value') for a in node.findall(".//g:attvalue", self.NS)}

    def get_graph_data(self) -> dict:
        nodes, edges = [], []
        for node in self.root.findall(".//g:node", self.NS):
            attrs = {a.get('for'): a.get('value') for a in node.findall(".//g:attvalue", self.NS)}
            nodes.append({
                "id":        node.get('id'),
                "label":     node.get('label'),
                "color":     attrs.get(self.ATTR['color'], "#97C2FC"),
                "title":     attrs.get(self.ATTR['definitie'], ""),
                "node_type": attrs.get(self.ATTR['node_type'], "onbekend"),
            })
        for edge in self.root.findall(".//g:edge", self.NS):
            edges.append({"from": edge.get('source'), "to": edge.get('target'), "arrows": "to"})
        return {"nodes": nodes, "edges": edges}

    def get_full_justification(self, node_id: str) -> dict:
        attrs = self._get_attrs(node_id)
        definitie  = attrs.get(self.ATTR['definitie'], "")
        toelichting = attrs.get(self.ATTR['toelichting'], "")

        pattern = r'(?P<waarde>zes|6|(\d+))\s+(?:\w+\s+)?(?P<eenheid>weken|dagen)'
        match = re.search(pattern, definitie.lower())
        dagen = 42
        if match:
            w = match.group('waarde')
            n = 6 if w == 'zes' else int(w)
            dagen = n * 7 if match.group('eenheid') == 'weken' else n

        atw_uitgesloten = "algemene termijnenwet niet van toepassing" in toelichting.lower()
        return {
            "termijn_dagen": dagen,
            "definitie":     definitie,
            "interpretatie": toelichting,
            "wetsartikel":   attrs.get(self.ATTR['bron'], "Art. 9 IW 1990"),
            "atw_status":    "Uitgesloten (Art. 9 lid 10 IW 1990)" if atw_uitgesloten else "Toepasbaar",
        }

    def check_invorderbaarheid(self, dagtekening: datetime, peildatum: datetime) -> dict:
        details  = self.get_full_justification("zes-weken")
        deadline = dagtekening + timedelta(days=details["termijn_dagen"])
        return {
            "invorderbaar": peildatum >= deadline,
            "deadline":     deadline,
            "details":      details,
        }
