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
    ROUTE = [
        "begrippen/dagtekening-aanslagbiljet",
        "begrippen/zes-weken",
        "begrippen/zes-weken-na-dagtekening-aanslagbiljet",
        "regels/AR-9-1",
        "begrippen/invorderbaarheid",
    ]

    def __init__(self, gexf_path: str):
        self.tree = ET.parse(gexf_path)
        self.root = self.tree.getroot()

    def get_node_attrs(self, node_id: str) -> dict:
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

    def get_route_nodes(self) -> list:
        result = []
        for node_id in self.ROUTE:
            raw = self.get_node_attrs(node_id)
            node_el = self.root.find(f".//g:node[@id='{node_id}']", self.NS)
            result.append({
                "id":               node_id,
                "label":            node_el.get("label") if node_el is not None else node_id,
                "node_type":        raw.get("0", ""),
                "jas_klasse":       raw.get("1", ""),
                "begripsnaam":      raw.get("8", ""),
                "markering":        raw.get("9", ""),
                "bron":             raw.get("10", ""),
                "bronnen":          raw.get("11", ""),
                "interpretatie":    raw.get("12", ""),
                "toelichting":      raw.get("13", ""),
                "definitie":        raw.get("14", ""),
                "soort":            raw.get("15", ""),
                "herkomst":         raw.get("16", ""),
                "afleidingsregels": raw.get("23", ""),
                "regel_id":         raw.get("24", ""),
                "naam":             raw.get("25", ""),
                "operators":        raw.get("26", ""),
            })
        return result

    def get_full_justification(self, node_id: str) -> dict:
        attrs = self.get_node_attrs(node_id)
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

    def check_invorderbaarheid(self, dagtekening: datetime, peildatum: datetime, 
                               aanslagtype: str = "definitief", 
                               afwijkend_boekjaar: bool = False,
                               vaststellingsjaar: bool = True) -> dict:
        
        # Basis logica voor Art 9 lid 1
        details = self.get_full_justification("begrippen/zes-weken")
        basis_dagen = details["termijn_dagen"]
        
        if aanslagtype.startswith("voorlopig") and vaststellingsjaar:
            # Art 9 lid 5: Meerdere termijnen
            maand = dagtekening.month
            resterende_maanden = 12 - maand
            
            if resterende_maanden > 1:
                # Meerdere termijnen berekenen
                termijnen = []
                # Check of dagtekening de laatste dag van de maand is
                import calendar
                _, last_day_month = calendar.monthrange(dagtekening.year, dagtekening.month)
                is_laatste_dag = dagtekening.day == last_day_month
                
                for i in range(1, resterende_maanden + 1):
                    doel_maand = dagtekening.month + i
                    doel_jaar = dagtekening.year
                    if doel_maand > 12:
                        doel_maand -= 12
                        doel_jaar += 1
                    
                    _, last_day_doel = calendar.monthrange(doel_jaar, doel_maand)
                    dag = last_day_doel if is_laatste_dag else min(dagtekening.day, last_day_doel)
                    termijnen.append(datetime(doel_jaar, doel_maand, dag))
                
                # LI 9.1 Correctie op LAATSTE termijn
                if afwijkend_boekjaar:
                    _, last_day = calendar.monthrange(termijnen[-1].year, termijnen[-1].month)
                    termijnen[-1] = termijnen[-1].replace(day=last_day)
                elif dagtekening.month <= 11:
                    einde_jaar = datetime(dagtekening.year, 12, 31)
                    if termijnen[-1] < einde_jaar:
                        termijnen[-1] = einde_jaar
                
                return {
                    "invorderbaar": peildatum >= termijnen[0],
                    "deadline": termijnen[0],
                    "termijnen": termijnen,
                    "details": details,
                    "bron": "Art. 9 lid 5 IW 1990" + (" (Corr. § 9.1 LI 2008)" if afwijkend_boekjaar or dagtekening.month <= 11 else "")
                }
            # Fallback naar lid 1 als resterende_maanden <= 1
            # (wordt hieronder afgehandeld door de standaard 6 weken + LI 9.1 correctie)

        # Standaard 6 weken (Art 9 lid 1) of Fallback van Lid 5
        deadline = dagtekening + timedelta(days=basis_dagen)
        bron = details["wetsartikel"]
        
        # LI 9.1 Correctie voor enige/laatste termijn
        if aanslagtype.startswith("voorlopig"):
            if afwijkend_boekjaar:
                import calendar
                _, last_day = calendar.monthrange(deadline.year, deadline.month)
                deadline = deadline.replace(day=last_day)
                bron = "§ 9.1 LI 2008 (Afwijkend boekjaar)"
            elif dagtekening.month <= 11:
                einde_jaar = datetime(dagtekening.year, 12, 31)
                if deadline < einde_jaar:
                    deadline = einde_jaar
                    bron = "§ 9.1 LI 2008 (31 december regel)"

        return {
            "invorderbaar": peildatum >= deadline,
            "deadline":     deadline,
            "details":      details,
            "bron":         bron
        }
