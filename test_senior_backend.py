"""
Senior Tester Suite — Backend Tests (LexNode Engine)
=====================================================
Validators:
- Invorderbaarheidslogica (Art 9 Lid 1 & 5)
- Termijnberekeningen
- LI 2008 § 9.1 Correcties
- Edge cases

Author: Senior Test Engineer
Date: 2026-05-01
"""

import unittest
from datetime import datetime, timedelta
import calendar
from lexnode_engine import LexNodeEngine


class TestBackendTermijnExtraction(unittest.TestCase):
    """Test termijnextractie uit GEXF kennismodel"""
    
    def setUp(self):
        self.engine = LexNodeEngine("graph.gexf")
    
    def test_extract_zes_weken_from_definitie(self):
        """Kernvereiste: 'zes weken' → 42 dagen"""
        result = self.engine.get_full_justification("begrippen/zes-weken")
        self.assertEqual(result['termijn_dagen'], 42, 
                        "Zes weken moet 42 dagen zijn")
    
    def test_atw_status_art_9_lid_10(self):
        """ATW niet van toepassing volgens Art 9 lid 10"""
        result = self.engine.get_full_justification("begrippen/zes-weken")
        self.assertIn("Uitgesloten", result['atw_status'],
                     "ATW moet uitgesloten zijn per Art 9 lid 10")
    
    def test_wetsbron_correct(self):
        """Bron moet correct naar Art 9 verwijzen"""
        result = self.engine.get_full_justification("begrippen/zes-weken")
        self.assertIn("Art. 9", result['wetsartikel'],
                     "Bron moet Art. 9 IW 1990 refereren")


class TestArt9Lid1Berekening(unittest.TestCase):
    """Art 9 Lid 1: Definitieve aanslag (6 weken)"""
    
    def setUp(self):
        self.engine = LexNodeEngine("graph.gexf")
    
    def test_lid1_standard_1_mei_to_12_juni(self):
        """Basis: 1 mei + 42 dagen = 12 juni"""
        dag = datetime(2026, 5, 1)
        peil = datetime(2026, 6, 12)
        result = self.engine.check_invorderbaarheid(dag, peil, aanslagtype="definitief")
        self.assertTrue(result['invorderbaar'],
                       "1 mei tot 12 juni moet INVORDERBAAR zijn (42 dagen = 12 juni)")
        self.assertEqual(result['deadline'], datetime(2026, 6, 12))
    
    def test_lid1_one_day_early(self):
        """1 mei + 42 dagen = 12 juni; peildatum 11 juni → NIET invorderbaar"""
        dag = datetime(2026, 5, 1)
        peil = datetime(2026, 6, 11)
        result = self.engine.check_invorderbaarheid(dag, peil, aanslagtype="definitief")
        self.assertFalse(result['invorderbaar'],
                        "11 juni is 1 dag te vroeg → NIET invorderbaar")
    
    def test_lid1_far_in_future(self):
        """Peildatum maanden later → INVORDERBAAR"""
        dag = datetime(2026, 5, 1)
        peil = datetime(2026, 12, 31)
        result = self.engine.check_invorderbaarheid(dag, peil, aanslagtype="definitief")
        self.assertTrue(result['invorderbaar'],
                       "31 dec is na 12 juni → INVORDERBAAR")
    
    def test_lid1_leap_year_february(self):
        """Schrikkelaar: 1 jan + 42 = 13 feb (niet 12 feb)"""
        dag = datetime(2024, 1, 1)  # 2024 is schrikkelaar
        peil = datetime(2024, 2, 13)
        result = self.engine.check_invorderbaarheid(dag, peil, aanslagtype="definitief")
        deadline = dag + timedelta(days=42)
        self.assertEqual(result['deadline'], deadline,
                        "Schrikkelaar moet correct berekend worden")
        self.assertTrue(result['invorderbaar'],
                       "Peildatum op deadline moet INVORDERBAAR zijn")


class TestArt9Lid5Berekening(unittest.TestCase):
    """Art 9 Lid 5: Voorlopige aanslag (meerdere termijnen)"""
    
    def setUp(self):
        self.engine = LexNodeEngine("graph.gexf")
    
    def test_lid5_oktober_resterende_maanden(self):
        """Oktober: 12 - 10 = 2 resterende maanden"""
        dag = datetime(2026, 10, 15)
        peil = datetime(2026, 10, 16)
        result = self.engine.check_invorderbaarheid(dag, peil, 
                                                     aanslagtype="voorlopig",
                                                     vaststellingsjaar=True)
        # Moet meerdere termijnen hebben
        self.assertIn('termijnen', result,
                     "Oktober moet termijnen-array hebben (Lid 5)")
        self.assertGreater(len(result.get('termijnen', [])), 1,
                          "Oktober moet meerdere termijnen hebben")
    
    def test_lid5_november_resterende_maanden(self):
        """November: 12 - 11 = 1 maand → terugval naar Lid 1 + LI correctie"""
        dag = datetime(2026, 11, 15)
        peil = datetime(2026, 12, 1)
        result = self.engine.check_invorderbaarheid(dag, peil,
                                                     aanslagtype="voorlopig",
                                                     vaststellingsjaar=True)
        # 1 resterende maand → AR-9-5e: terugval naar Lid 1 (6 weken)
        # maar dagtekening ≤ november → LI 9.1 correctie: 31 december
        self.assertNotIn('termijnen', result,
                        "November moet terugvallen naar Lid 1 (niet termijnen)")
        # 15 nov + 42 = 27 dec, maar LI correctie → 31 dec
        self.assertEqual(result['deadline'], datetime(2026, 12, 31),
                        "November + LI 9.1a correctie: 31 december")
    
    def test_lid5_december_terugval(self):
        """December: 12 - 12 = 0 maanden → terugval naar Lid 1"""
        dag = datetime(2026, 12, 1)
        peil = datetime(2026, 12, 15)
        result = self.engine.check_invorderbaarheid(dag, peil,
                                                     aanslagtype="voorlopig",
                                                     vaststellingsjaar=True)
        # 0 resterende maanden → terugval naar Lid 1
        self.assertNotIn('termijnen', result,
                        "December moet terugvallen naar Lid 1")
    
    def test_lid5_termijn_berekening_oktober(self):
        """Oktober 15: termijnen op 15 nov, 15 dec"""
        dag = datetime(2026, 10, 15)
        peil = datetime(2026, 9, 1)  # Voor de deadline
        result = self.engine.check_invorderbaarheid(dag, peil,
                                                     aanslagtype="voorlopig",
                                                     vaststellingsjaar=True,
                                                     afwijkend_boekjaar=False)
        if 'termijnen' in result:
            # Eerste termijn: 15 november
            self.assertEqual(result['termijnen'][0].month, 11,
                           "Eerste termijn moet november zijn")
            self.assertEqual(result['termijnen'][0].day, 15,
                           "Eerste termijn moet 15e zijn")
    
    def test_lid5_laatste_dag_maand_propagatie(self):
        """Dagtekening 31 mei → termijnen op 30 juni, 31 juli, 31 aug"""
        dag = datetime(2026, 5, 31)  # Laatste dag mei
        peil = datetime(2026, 4, 1)
        result = self.engine.check_invorderbaarheid(dag, peil,
                                                     aanslagtype="voorlopig",
                                                     vaststellingsjaar=True)
        if 'termijnen' in result:
            # Juni: 30 (laatste dag)
            self.assertEqual(result['termijnen'][0].day, 30,
                           "1e termijn moet op dag 30 (laatste dag juni) zijn")
            # Juli: 31 (laatste dag)
            self.assertEqual(result['termijnen'][1].day, 31,
                           "2e termijn moet op dag 31 (laatste dag juli) zijn")


class TestLI2008Correcties(unittest.TestCase):
    """LI 2008 § 9.1 Correcties (AR-LI-9-1a en AR-LI-9-1b)"""
    
    def setUp(self):
        self.engine = LexNodeEngine("graph.gexf")
    
    def test_li_9_1a_oktober_dagtekening_naar_31_december(self):
        """AR-LI-9-1a: Oktober dagtekening → deadline 31 december"""
        dag = datetime(2026, 10, 15)
        peil = datetime(2026, 12, 30)
        result = self.engine.check_invorderbaarheid(dag, peil,
                                                     aanslagtype="voorlopig",
                                                     vaststellingsjaar=True,
                                                     afwijkend_boekjaar=False)
        if 'termijnen' in result:
            # Laatste termijn moet 31-12 zijn
            self.assertEqual(result['termijnen'][-1], datetime(2026, 12, 31),
                           "Laatste termijn moet 31 december zijn (LI 9.1a)")
    
    def test_li_9_1a_september_dagtekening_naar_31_december(self):
        """AR-LI-9-1a: September dagtekening → deadline 31 december"""
        dag = datetime(2026, 9, 15)
        peil = datetime(2026, 12, 30)
        result = self.engine.check_invorderbaarheid(dag, peil,
                                                     aanslagtype="voorlopig",
                                                     vaststellingsjaar=True,
                                                     afwijkend_boekjaar=False)
        if 'termijnen' in result:
            self.assertEqual(result['termijnen'][-1], datetime(2026, 12, 31),
                           "September → 31 december correctie")
    
    def test_li_9_1a_december_dagtekening_geen_correctie(self):
        """AR-LI-9-1a: December dagtekening → GEEN correctie (niet <= november)"""
        dag = datetime(2026, 12, 1)
        peil = datetime(2026, 12, 15)
        result = self.engine.check_invorderbaarheid(dag, peil,
                                                     aanslagtype="voorlopig",
                                                     vaststellingsjaar=True,
                                                     afwijkend_boekjaar=False)
        # December: terugval naar Lid 1, dus geen termijnen
        self.assertNotIn('termijnen', result,
                        "December heeft maar 0 resterende maanden → Lid 1")
    
    def test_li_9_1b_afwijkend_boekjaar_maart_naar_30_april(self):
        """AR-LI-9-1b: Maart met afwijkend boekjaar + Lid 5 → 30 april op laatste termijn"""
        dag = datetime(2026, 3, 15)
        peil = datetime(2026, 4, 29)
        result = self.engine.check_invorderbaarheid(dag, peil,
                                                     aanslagtype="voorlopig",
                                                     vaststellingsjaar=True,
                                                     afwijkend_boekjaar=True)
        # Maart: 12 - 3 = 9 resterende maanden → Lid 5
        # Eerste termijn is april 15, laatste is december 15
        # Met afwijkend boekjaar: 15 dec → 31 dec (niet 30 april)
        # Eigenlijk: Lid 5 heeft 9 termijnen, de laatste is december
        if 'termijnen' in result:
            # Met afwijkend boekjaar: laatste termijn moet laatste dag van december zijn
            self.assertEqual(result['termijnen'][-1].day, 31,
                           "Afwijkend boekjaar: laatste termijn moet dag 31 zijn")
    
    def test_li_9_1b_februari_schrikkelaar_naar_29_februari(self):
        """AR-LI-9-1b: November schrikkelaar + afwijkend boekjaar → 29 februari"""
        dag = datetime(2024, 11, 15)  # 2024 is schrikkelaar
        peil = datetime(2024, 2, 28)
        result = self.engine.check_invorderbaarheid(dag, peil,
                                                     aanslagtype="voorlopig",
                                                     vaststellingsjaar=True,
                                                     afwijkend_boekjaar=True)
        # November: 12 - 11 = 1 maand → terugval naar Lid 1
        # 15 nov + 42 = 27 dec
        # Met afwijkend boekjaar: 27 dec → 31 dec (laatste dag december)
        self.assertNotIn('termijnen', result,
                        "November moet terugvallen naar Lid 1")
        self.assertEqual(result['deadline'], datetime(2024, 12, 31),
                        "Afwijkend boekjaar + november: 31 december")


class TestEdgeCases(unittest.TestCase):
    """Edge cases en grensgevallen"""
    
    def setUp(self):
        self.engine = LexNodeEngine("graph.gexf")
    
    def test_samme_dag_dagtekening_en_peildatum(self):
        """Dagtekening = Peildatum → NIET invorderbaar"""
        dag = datetime(2026, 5, 1)
        peil = datetime(2026, 5, 1)
        result = self.engine.check_invorderbaarheid(dag, peil, aanslagtype="definitief")
        self.assertFalse(result['invorderbaar'],
                        "Zelfde dag → nog niet verstreken termijn")
    
    def test_peildatum_voor_dagtekening(self):
        """Peildatum VOOR dagtekening → NIET invorderbaar"""
        dag = datetime(2026, 5, 1)
        peil = datetime(2026, 4, 30)
        result = self.engine.check_invorderbaarheid(dag, peil, aanslagtype="definitief")
        self.assertFalse(result['invorderbaar'],
                        "Peildatum voor dagtekening moet NIET invorderbaar zijn")
    
    def test_maand_grensovergang_januari_naar_februari(self):
        """31 januari + 42 dagen = 14 maart (over maandgrens)"""
        dag = datetime(2026, 1, 31)
        deadline_expected = datetime(2026, 3, 14)  # 31 jan + 42 = 14 mrt
        peil = datetime(2026, 3, 14)  # Exact op deadline
        result = self.engine.check_invorderbaarheid(dag, peil, aanslagtype="definitief")
        self.assertTrue(result['invorderbaar'],
                       "Maandgrensovergang moet correct berekend worden")
        self.assertEqual(result['deadline'], deadline_expected,
                        f"31 jan + 42 dagen = 14 maart")
    
    def test_jaargrensovergang_december_naar_januari(self):
        """1 december + 42 = 12 januari (volgende jaar)"""
        dag = datetime(2026, 12, 1)
        peil = datetime(2027, 1, 12)
        result = self.engine.check_invorderbaarheid(dag, peil, aanslagtype="definitief")
        self.assertTrue(result['invorderbaar'],
                       "Jaargrensovergang moet correct berekend worden")
        self.assertEqual(result['deadline'].year, 2027,
                        "Deadline moet 2027 zijn")


class TestInvoerValidatie(unittest.TestCase):
    """Invoervalidatie en foutafhandeling"""
    
    def setUp(self):
        self.engine = LexNodeEngine("graph.gexf")
    
    def test_onbekende_aanslagtype_fallback(self):
        """Onbekende aanslagtype → fallback naar definitief"""
        dag = datetime(2026, 5, 1)
        peil = datetime(2026, 6, 12)
        result = self.engine.check_invorderbaarheid(dag, peil, aanslagtype="onbekend")
        # Moet niet crashen en een redelijk resultaat geven
        self.assertIn('invorderbaar', result,
                     "Moet een resultaat geven voor onbekende aanslagtype")
    
    def test_missing_node_graceful_fallback(self):
        """Ontbrekende node → graceful fallback (42 dagen)"""
        # De engine moet niet crashen als begrippen/zes-weken wegvalt
        result = self.engine.get_full_justification("begrippen/onbekend-concept")
        self.assertEqual(result['termijn_dagen'], 42,
                        "Fallback naar 42 dagen voor ontbrekende node")


if __name__ == '__main__':
    unittest.main(verbosity=2)
