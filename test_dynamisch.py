import xml.etree.ElementTree as ET
import re
from datetime import datetime, timedelta
import unittest

def get_termijn_van_graaf(node_id):
    """Haalt de termijn dynamisch op uit de GEXF-file met regex."""
    file_path = "graph.gexf"
    tree = ET.parse(file_path)
    root = tree.getroot()
    ns = {'g': 'http://www.gexf.net/1.2draft'}
    
    # Zoek de node
    nodes = root.findall(".//g:node", ns)
    target_node = next((n for n in nodes if n.get('id') == node_id), None)
    
    if target_node is None:
        return None
        
    # Haal de definitie op (attribuut id="14")
    attvalues = target_node.find("g:attvalues", ns)
    definitie = ""
    for att in attvalues.findall("g:attvalue", ns):
        if att.get('for') == "14":
            definitie = att.get('value')
            break
            
    # Regex om getallen en tijdseenheden te vinden (bijv. "zes weken")
    # We ondersteunen hier 'zes' als woord of '6' als getal
    woord_naar_getal = {
        'een': 1, 'twee': 2, 'drie': 3, 'vier': 4, 'vijf': 5, 'zes': 6,
        'zeven': 7, 'acht': 8, 'negen': 9, 'tien': 10
    }
    
    # Zoek naar [getal/woord] [weken/dagen]
    pattern = r'(\w+|\d+)\s+(weken|dagen)'
    match = re.search(pattern, definitie.lower())
    
    if match:
        hoeveelheid_str = match.group(1)
        eenheid = match.group(2)
        
        # Converteer woord naar getal indien nodig
        if hoeveelheid_str.isdigit():
            hoeveelheid = int(hoeveelheid_str)
        else:
            hoeveelheid = woord_naar_getal.get(hoeveelheid_str, 0)
            
        if eenheid == 'weken':
            return hoeveelheid * 7
        return hoeveelheid
        
    return 42 # Fallback als regex faalt

def check_invorderbaarheid(dagtekening, huidige_datum):
    termijn_dagen = get_termijn_van_graaf("begrippen/zes-weken")
    deadline = dagtekening + timedelta(days=termijn_dagen)
    return huidige_datum >= deadline

class TestInvorderbaarheidDynamisch(unittest.TestCase):
    def test_op_deadline(self):
        dagtekening = datetime(2026, 1, 1)
        huidige_datum = datetime(2026, 2, 12)
        # De termijn uit de graaf ('zes weken') moet 42 dagen opleveren
        self.assertTrue(check_invorderbaarheid(dagtekening, huidige_datum))

if __name__ == '__main__':
    unittest.main()
