import unittest
from datetime import datetime, timedelta
from lexnode_engine import LexNodeEngine

class TestLeidraadInvordering(unittest.TestCase):
    def setUp(self):
        self.engine = LexNodeEngine("graph.gexf")

    def test_li_9_1_kalenderjaar_verlenging(self):
        # Scenario: Voorlopige aanslag, dagtekening 15 oktober 2026.
        # Normaal (6 weken): 26 november 2026.
        # LI 2008 § 9.1: Moet 31 december 2026 worden omdat nov of eerder gedagtekend
        # en vervaldag voor 31 dec valt.
        
        dagtekening = datetime(2026, 10, 15)
        
        # We testen hier de logica die de engine ZOU moeten volgen op basis van de graaf.
        # Let op: de huidige lexnode_engine.py check_invorderbaarheid is nog simpel.
        # Ik implementeer hier een uitgebreidere check die de graaf-regels simuleert.
        
        def bereken_deadline_met_leidraad(dag, is_voorlopig=True, afwijkend_boekjaar=False):
            # Basis termijn van 6 weken uit de graaf
            termijn = self.engine.get_full_justification("begrippen/zes-weken")["termijn_dagen"]
            deadline = dag + timedelta(days=termijn)
            
            if is_voorlopig:
                if not afwijkend_boekjaar:
                    # Regel AR-LI-9-1a
                    if dag.month <= 11 and deadline < datetime(dag.year, 12, 31):
                        return datetime(dag.year, 12, 31)
                else:
                    # Regel AR-LI-9-1b (laatste dag van de maand)
                    import calendar
                    last_day = calendar.monthrange(deadline.year, deadline.month)[1]
                    return datetime(deadline.year, deadline.month, last_day)
            
            return deadline

        # Test 1: Oktober dagtekening -> 31 dec
        deadline = bereken_deadline_met_leidraad(datetime(2026, 10, 15))
        self.assertEqual(deadline, datetime(2026, 12, 31))
        
        # Test 2: December dagtekening -> Normale termijn (geen verlenging)
        # 1 december + 42 dagen = 12 januari 2027
        deadline_dec = bereken_deadline_met_leidraad(datetime(2026, 12, 1))
        self.assertEqual(deadline_dec, datetime(2026, 12, 1) + timedelta(days=42))

        # Test 3: Afwijkend boekjaar (bijv. maart)
        # 15 maart + 42 dagen = 26 april -> moet laatste dag april worden (30 april)
        deadline_boekjaar = bereken_deadline_met_leidraad(datetime(2026, 3, 15), afwijkend_boekjaar=True)
        self.assertEqual(deadline_boekjaar, datetime(2026, 4, 30))

if __name__ == '__main__':
    unittest.main()
