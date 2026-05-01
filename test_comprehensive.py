import unittest
from datetime import datetime
import json
import requests
import time
import subprocess
import os

# De testgevallen gebaseerd op de kennisgraaf en de UI logica
TEST_SCENARIOS = [
    {
        "name": "Art 9.1 Standaard (Definitief)",
        "params": {
            "aanslagtype": "definitief",
            "dagtekening": "2026-05-01",
            "peildatum": "2026-06-12"
        },
        "expected": {
            "invorderbaar": True,
            "deadline": "12-06-2026",
            "atw_uitgesloten": True
        }
    },
    {
        "name": "Art 9.1 Net voor deadline",
        "params": {
            "aanslagtype": "definitief",
            "dagtekening": "2026-05-01",
            "peildatum": "2026-06-11"
        },
        "expected": {
            "invorderbaar": False,
            "deadline": "12-06-2026"
        }
    },
    {
        "name": "LI 9.1 Verlenging naar 31 dec (Voorlopig, November)",
        "params": {
            "aanslagtype": "voorlopig",
            "dagtekening": "2026-11-15",
            "peildatum": "2026-12-30",
            "dagtekening_in_vaststellingsjaar": True
        },
        "expected": {
            "invorderbaar": False,
            "deadline": "31-12-2026"
        }
    },
    {
        "name": "Art 9.5 Meerdere termijnen (Oktober)",
        "params": {
            "aanslagtype": "voorlopig",
            "dagtekening": "2026-10-15",
            "peildatum": "2026-11-14",
            "dagtekening_in_vaststellingsjaar": True
        },
        "expected": {
            "invorderbaar": False,
            "deadline": "15-11-2026"
        }
    },
    {
        "name": "Art 9.5 Eerste termijn invorderbaar (Oktober)",
        "params": {
            "aanslagtype": "voorlopig",
            "dagtekening": "2026-10-15",
            "peildatum": "2026-11-15",
            "dagtekening_in_vaststellingsjaar": True
        },
        "expected": {
            "invorderbaar": True,
            "deadline": "15-11-2026"
        }
    },
    {
        "name": "LI 9.1 Afwijkend boekjaar (Laatste dag maand, Maart)",
        "params": {
            "aanslagtype": "voorlopig",
            "dagtekening": "2026-03-15",
            "peildatum": "2026-04-14",
            "afwijkend_boekjaar": True,
            "dagtekening_in_vaststellingsjaar": True
        },
        "expected": {
            "invorderbaar": False,
            "deadline": "15-04-2026"
        }
    },
    {
        "name": "LI 9.1 Afwijkend boekjaar Invorderbaar (Maart)",
        "params": {
            "aanslagtype": "voorlopig",
            "dagtekening": "2026-03-15",
            "peildatum": "2026-04-15",
            "afwijkend_boekjaar": True,
            "dagtekening_in_vaststellingsjaar": True
        },
        "expected": {
            "invorderbaar": True,
            "deadline": "15-04-2026"
        }
    },
    {
        "name": "Art 9.5 Terugval naar lid 1 (December dagtekening)",
        "params": {
            "aanslagtype": "voorlopig",
            "dagtekening": "2026-12-01",
            "peildatum": "2027-01-11",
            "dagtekening_in_vaststellingsjaar": True
        },
        "expected": {
            "invorderbaar": False,
            "deadline": "12-01-2027" # 01-12 + 42 dagen
        }
    }
]

class TestLexNodeSync(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Start de server in de achtergrond voor UI-test (via API)
        cls.server_process = subprocess.Popen(["python3", "app.py"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        time.sleep(2) # Wacht tot server up is

    @classmethod
    def tearDownClass(cls):
        cls.server_process.terminate()

    def test_engine_directly(self):
        from lexnode_engine import LexNodeEngine
        engine = LexNodeEngine("graph.gexf")
        
        for scenario in TEST_SCENARIOS:
            with self.subTest(scenario=scenario["name"]):
                params = scenario["params"]
                dag = datetime.strptime(params["dagtekening"], "%Y-%m-%d")
                peil = datetime.strptime(params["peildatum"], "%Y-%m-%d")
                
                # We moeten de engine wellicht aanpassen om deze params te accepteren
                try:
                    res = engine.check_invorderbaarheid(
                        dag, 
                        peil, 
                        aanslagtype=params.get("aanslagtype", "definitief"),
                        afwijkend_boekjaar=params.get("afwijkend_boekjaar", False),
                        vaststellingsjaar=params.get("dagtekening_in_vaststellingsjaar", True)
                    )
                    
                    self.assertEqual(res["invorderbaar"], scenario["expected"]["invorderbaar"])
                    self.assertEqual(res["deadline"].strftime("%d-%m-%Y"), scenario["expected"]["deadline"])
                except TypeError as e:
                    self.fail(f"Engine ondersteunt nog geen uitgebreide parameters: {e}")

    def test_ui_api(self):
        url = "http://localhost:8080/calculate"
        for scenario in TEST_SCENARIOS:
            with self.subTest(scenario=scenario["name"]):
                res = requests.post(url, json=scenario["params"])
                self.assertEqual(res.status_code, 200, f"API fout: {res.text}")
                data = res.json()
                
                self.assertEqual(data["invorderbaar"], scenario["expected"]["invorderbaar"], f"Mismatch in invorderbaar voor {scenario['name']}")
                self.assertEqual(data["deadline"], scenario["expected"]["deadline"], f"Mismatch in deadline voor {scenario['name']}")

if __name__ == "__main__":
    unittest.main()
