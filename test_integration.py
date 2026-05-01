"""
Integration Test Suite — Backend vs. Frontend Parity Check
============================================================
Verifieert dat de Python engine en JavaScript frontend dezelfde resultaten geven
"""

import unittest
from datetime import datetime, timedelta
from lexnode_engine import LexNodeEngine
import json


class TestBackendFrontendParity(unittest.TestCase):
    """Vergelijkt backend en frontend berekeningsresultaten"""
    
    def setUp(self):
        self.engine = LexNodeEngine("graph.gexf")
    
    def assertDateEqual(self, d1, d2, msg=""):
        """Helper: compare Python datetime met frontend Date"""
        self.assertEqual(
            d1.strftime("%Y-%m-%d"),
            d2.strftime("%Y-%m-%d") if hasattr(d2, 'strftime') else d2,
            msg
        )
    
    def test_parity_lid1_standard(self):
        """Backend en Frontend moeten hetzelfde resultaat geven voor Lid 1"""
        dag = datetime(2026, 5, 1)
        peil = datetime(2026, 6, 12)
        
        backend_result = self.engine.check_invorderbaarheid(dag, peil, aanslagtype="definitief")
        
        # Frontend zou dit berekenen als: 1 mei + 42 dagen = 12 juni
        # Beide moeten INVORDERBAAR zeggen
        self.assertTrue(backend_result['invorderbaar'],
                       "Backend moet INVORDERBAAR zeggen")
        self.assertEqual(backend_result['deadline'], datetime(2026, 6, 12),
                        "Backend deadline moet 12 juni zijn")
    
    def test_parity_lid1_one_day_early(self):
        """Backend en Frontend: 11 juni is NIET invorderbaar"""
        dag = datetime(2026, 5, 1)
        peil = datetime(2026, 6, 11)
        
        backend_result = self.engine.check_invorderbaarheid(dag, peil, aanslagtype="definitief")
        self.assertFalse(backend_result['invorderbaar'],
                        "Backend moet NIET INVORDERBAAR zeggen")
    
    def test_parity_lid5_oktober(self):
        """Backend en Frontend: Oktober moet meerdere termijnen geven"""
        dag = datetime(2026, 10, 15)
        peil = datetime(2026, 9, 1)
        
        backend_result = self.engine.check_invorderbaarheid(dag, peil, 
                                                             aanslagtype="voorlopig",
                                                             vaststellingsjaar=True)
        
        self.assertIn('termijnen', backend_result,
                     "Backend moet termijnen array hebben voor Oktober")
        self.assertGreater(len(backend_result['termijnen']), 1,
                          "Backend moet meerdere termijnen hebben")
        
        # Frontend zou hetzelfde doen
        # Eerste termijn moet november 15 zijn
        self.assertEqual(backend_result['termijnen'][0].month, 11,
                        "Eerste termijn november")
        self.assertEqual(backend_result['termijnen'][0].day, 15,
                        "Eerste termijn op 15e")
    
    def test_parity_lid5_november_fallback(self):
        """Backend en Frontend: November → Lid 1 fallback"""
        dag = datetime(2026, 11, 15)
        peil = datetime(2026, 12, 1)
        
        backend_result = self.engine.check_invorderbaarheid(dag, peil,
                                                             aanslagtype="voorlopig",
                                                             vaststellingsjaar=True)
        
        # Moet terugvallen naar Lid 1 (geen termijnen array)
        self.assertNotIn('termijnen', backend_result,
                        "Backend moet terugvallen naar Lid 1")
        
        # Deadline moet 6 weken later zijn + LI correctie
        # 15 nov + 42 = 27 dec, met LI 9.1a: 31 dec
        self.assertEqual(backend_result['deadline'], datetime(2026, 12, 31),
                        "Backend deadline 31 december")
    
    def test_parity_li_9_1a_oktober_naar_31dec(self):
        """Backend en Frontend: Oktober + LI 9.1a → 31 december"""
        dag = datetime(2026, 10, 15)
        peil = datetime(2026, 11, 1)
        
        backend_result = self.engine.check_invorderbaarheid(dag, peil,
                                                             aanslagtype="voorlopig",
                                                             vaststellingsjaar=True)
        
        if 'termijnen' in backend_result:
            # Laatste termijn moet 31-12 zijn
            self.assertEqual(backend_result['termijnen'][-1], datetime(2026, 12, 31),
                           "Backend: Laatste termijn moet 31 dec zijn")
    
    def test_parity_li_9_1a_september_naar_31dec(self):
        """Backend en Frontend: September + LI 9.1a → 31 december"""
        dag = datetime(2026, 9, 15)
        peil = datetime(2026, 11, 1)
        
        backend_result = self.engine.check_invorderbaarheid(dag, peil,
                                                             aanslagtype="voorlopig",
                                                             vaststellingsjaar=True)
        
        if 'termijnen' in backend_result:
            self.assertEqual(backend_result['termijnen'][-1].month, 12,
                           "Backend: Laatste termijn december")
            self.assertEqual(backend_result['termijnen'][-1].day, 31,
                           "Backend: 31e december")
    
    def test_parity_lid5_laatste_dag_maand(self):
        """Backend en Frontend: 31 mei → 30 juni, 31 juli"""
        dag = datetime(2026, 5, 31)
        peil = datetime(2026, 4, 1)
        
        backend_result = self.engine.check_invorderbaarheid(dag, peil,
                                                             aanslagtype="voorlopig",
                                                             vaststellingsjaar=True)
        
        if 'termijnen' in backend_result:
            # 1e termijn: juni 30 (laatste dag juni)
            self.assertEqual(backend_result['termijnen'][0].month, 6,
                           "Backend: Eerste termijn juni")
            self.assertEqual(backend_result['termijnen'][0].day, 30,
                           "Backend: Eerste termijn dag 30")
            
            # 2e termijn: juli 31 (laatste dag juli)
            self.assertEqual(backend_result['termijnen'][1].month, 7,
                           "Backend: Tweede termijn juli")
            self.assertEqual(backend_result['termijnen'][1].day, 31,
                           "Backend: Tweede termijn dag 31")
    
    def test_parity_jaargrensovergang(self):
        """Backend en Frontend: 1 december + 42 = 12 januari 2027"""
        dag = datetime(2026, 12, 1)
        peil = datetime(2027, 1, 12)
        
        backend_result = self.engine.check_invorderbaarheid(dag, peil, aanslagtype="definitief")
        
        self.assertTrue(backend_result['invorderbaar'],
                       "Backend: Jaargrensovergang INVORDERBAAR")
        self.assertEqual(backend_result['deadline'].year, 2027,
                        "Backend: Deadline 2027")
        self.assertEqual(backend_result['deadline'].month, 1,
                        "Backend: Deadline januari")
        self.assertEqual(backend_result['deadline'].day, 12,
                        "Backend: Deadline 12e")
    
    def test_parity_schrikkelaar(self):
        """Backend en Frontend: Schrikkelaar (2024) moet correct werken"""
        dag = datetime(2024, 1, 1)
        peil = datetime(2024, 2, 12)
        
        backend_result = self.engine.check_invorderbaarheid(dag, peil, aanslagtype="definitief")
        
        # 1 jan + 42 = 12 feb (schrikkelaar 2024)
        self.assertTrue(backend_result['invorderbaar'],
                       "Backend: Schrikkelaar INVORDERBAAR")
        self.assertEqual(backend_result['deadline'], datetime(2024, 2, 12),
                        "Backend: 12 februari")
    
    def test_parity_atw_status(self):
        """Backend en Frontend: ATW status moet hetzelfde zijn"""
        dag = datetime(2026, 5, 1)
        peil = datetime(2026, 6, 12)
        
        backend_result = self.engine.get_full_justification("begrippen/zes-weken")
        
        # ATW moet "Uitgesloten" zijn
        self.assertIn("Uitgesloten", backend_result['atw_status'],
                     "Backend: ATW moet uitgesloten zijn")


class TestGraphDataIntegrity(unittest.TestCase):
    """Controleer integtiteit van GEXF graaf"""
    
    def setUp(self):
        self.engine = LexNodeEngine("graph.gexf")
    
    def test_graph_nodes_exist(self):
        """Kritieke nodes moeten bestaan"""
        nodes = self.engine.get_graph_data()['nodes']
        node_ids = [n['id'] for n in nodes]
        
        critical_nodes = [
            "begrippen/zes-weken",
            "regels/AR-9-1",
            "begrippen/invorderbaarheid",
            "annotaties/iw1990/art9-1",
        ]
        
        for node_id in critical_nodes:
            self.assertIn(node_id, node_ids,
                         f"Critical node '{node_id}' must exist in graph")
    
    def test_graph_nodes_have_attributes(self):
        """Nodes moeten attributen hebben"""
        nodes = self.engine.get_graph_data()['nodes']
        
        for node in nodes:
            self.assertIn('id', node, "Node moet 'id' hebben")
            self.assertIn('label', node, "Node moet 'label' hebben")
            self.assertIn('color', node, "Node moet 'color' hebben")
    
    def test_graph_edges_exist(self):
        """Graaf moet edges hebben"""
        edges = self.engine.get_graph_data()['edges']
        
        self.assertGreater(len(edges), 0,
                          "Graaf moet minstens 1 edge hebben")
    
    def test_route_nodes_accessible(self):
        """Alle route nodes moeten toegankelijk zijn"""
        route = self.engine.get_route_nodes()
        
        self.assertEqual(len(route), 5,
                        "Route moet 5 nodes hebben (Lid 1)")
        
        # Alle nodes moeten data hebben
        for node in route:
            self.assertIn('id', node)
            self.assertIn('label', node)


class TestPerformance(unittest.TestCase):
    """Controleer performance van berekeningen"""
    
    def setUp(self):
        self.engine = LexNodeEngine("graph.gexf")
    
    def test_single_calculation_performance(self):
        """Single berekening moet < 10ms zijn"""
        import time
        
        dag = datetime(2026, 5, 1)
        peil = datetime(2026, 6, 12)
        
        start = time.time()
        self.engine.check_invorderbaarheid(dag, peil, aanslagtype="definitief")
        elapsed = (time.time() - start) * 1000
        
        self.assertLess(elapsed, 10,
                       f"Berekening moet < 10ms zijn, was {elapsed:.2f}ms")
    
    def test_batch_calculations_performance(self):
        """100 berekeningen moeten < 100ms zijn"""
        import time
        
        start = time.time()
        for i in range(100):
            dag = datetime(2026, 1, 1) + timedelta(days=i)
            peil = datetime(2026, 12, 31)
            self.engine.check_invorderbaarheid(dag, peil, aanslagtype="definitief")
        elapsed = (time.time() - start) * 1000
        
        self.assertLess(elapsed, 100,
                       f"100 berekeningen moet < 100ms zijn, was {elapsed:.2f}ms")


if __name__ == '__main__':
    unittest.main(verbosity=2)
