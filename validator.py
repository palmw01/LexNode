import xml.etree.ElementTree as ET
import ast

class LexNodeValidator:
    def __init__(self, gexf_path):
        self.tree = ET.parse(gexf_path)
        self.root = self.tree.getroot()
        self.ns = {'g': 'http://www.gexf.net/1.2draft'}
        self.nodes = {n.get('id'): n for n in self.root.findall(".//g:node", self.ns)}

    def validate(self):
        errors = []
        warnings = []
        
        for node_id, node in self.nodes.items():
            attvalues = node.find("g:attvalues", self.ns)
            if attvalues is None: continue
            
            # Extract attributes
            attrs = {a.get('for'): a.get('value') for a in attvalues.findall("g:attvalue", self.ns)}
            
            # 1. Check 'leidt_tot' (Attr 22)
            leidt_tot_str = attrs.get('22', '[]')
            try:
                leidt_tot = ast.literal_eval(leidt_tot_str)
                for target in leidt_tot:
                    target_id = target.replace('[[', '').replace(']]', '')
                    if target_id not in self.nodes:
                        errors.append(f"ERR: Node '{node_id}' verwijst via leidt_tot naar niet-bestaande node '{target_id}'")
            except:
                errors.append(f"ERR: Corrupte data in leidt_tot van node '{node_id}'")

            # 2. Check 'afleidingsregels' (Attr 23)
            # Consistentie-check: als een begrip leidt tot een ander begrip, moet er vaak een regel zijn.
            regels_str = attrs.get('23', '[]')
            regels = ast.literal_eval(regels_str)
            
            if len(leidt_tot) > 0 and len(regels) == 0:
                warnings.append(f"WARN: Node '{node_id}' heeft een gevolg (leidt_tot) maar geen expliciete afleidingsregel.")

        return errors, warnings

if __name__ == "__main__":
    validator = LexNodeValidator("graph.gexf")
    errs, warns = validator.validate()
    
    print(f"--- Validatie Rapport ---")
    print(f"Gevonden fouten: {len(errs)}")
    for e in errs: print(f"  {e}")
    print(f"Gevonden waarschuwingen: {len(warns)}")
    for w in warns: print(f"  {w}")
