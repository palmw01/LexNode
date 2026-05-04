# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LexNode is een "Rules as Code" prototype voor de Belastingdienst. Het modelleert juridische regels uit **Art. 9 Invorderingswet 1990** als een kennisgraaf (GEXF-formaat) en biedt een webinterface om invorderbaarheid van belastingaanslagen te berekenen en de juridische structuur te visualiseren.

## Commando's

```fish
# Venv aanmaken (eenmalig)
python3 -m venv .venv

# Venv activeren
source .venv/bin/activate.fish

# Afhankelijkheden installeren
pip install -r requirements.txt

# Server starten (poort 8080)
python app.py

# Alle tests uitvoeren (74 tests: backend, integratie, frontend, realtime)
./run_all_tests.sh

# Individuele test suites
python tests/test_senior_backend.py  # Backend-tests (23 tests)
python tests/test_integration.py     # Integratie-tests (16 tests)
node tests/test_ui_senior.js         # Frontend-tests (15 tests)
node tests/test_realtime_datums.js   # Realtime datumvelden-tests (20 tests)

# Graaf valideren (integriteitscheck)
python validator.py
```

## Architectuur

De applicatie bestaat uit drie lagen:

**1. Kennisgraaf (`graph.gexf`)**  
GEXF-bestand met juridische concepten als nodes en relaties als edges. Elke node heeft 28 vaste attributen (id 0–27). Belangrijke attribuut-ID's:

| ID | Titel                | Gebruik |
|----|----------------------|---------------------------------------------------------------|
| 0  | node_type            | Type node: `annotatie`, `begrip`, `regel`, `wettekst` |
| 1  | jas_klasse           | ATW/JAS-klasse — redeneerroute |
| 2  | color                | Hex-kleur voor visualisatie |
| 8  | begripsnaam          | Naam begrip — frontend node-details |
| 9  | markering            | Wettekst-citaat — node-details |
| 10 | bron                 | Primair wetsartikel |
| 11 | bronnen              | Aanvullende bronnen (lijst) — node-details |
| 12 | interpretatiemethode | Interpretatiemethode — node-details |
| 13 | toelichting_klasse   | Juridische toelichting / ATW-status |
| 14 | definitie            | Juridische definitie (bevat termijntekst voor regex-parsing) |
| 15 | soort                | Soort begrip of regel |
| 16 | herkomst             | Herkomst van de regel |
| 22 | leidt_tot            | Lijst van `[[namespace/node-id]]`-refs — graaf-navigatie |
| 23 | afleidingsregels     | Lijst van regelrefs |
| 24 | regel_id             | ID van de afleidingsregel — node-details |
| 25 | naam                 | Naam van de regel — node-details |
| 26 | operators            | Logische operators — node-details |
| 27 | bronreferentie       | Externe bronverwijzing — node-details |

**2. Backend (`app.py` + `lexnode_engine.py`)**  
Python engine die de GEXF laadt en endpoints exposeert voor graaf-data en berekeningen. Geen externe afhankelijkheden (alleen Python stdlib). De termijn wordt dynamisch via regex uitgelezen uit node `begrippen/zes-weken`.

**3. Frontend (`index.html` + `styles.css` + `lexnode.js`)**  
Single-page app gesplitst in drie bestanden: `index.html` bevat de HTML-structuur, `styles.css` de volledige Belastingdienst-huisstijl, en `lexnode.js` alle applicatielogica. Alle logica is geport naar JavaScript zodat de app op GitHub Pages werkt zonder backend.

Belangrijke UI-kenmerken:
- **Realtime berekening:** Er is geen aparte "Bereken"-knop. De berekening triggert automatisch via `oninput`/`onchange` listeners op alle invoervelden (`dagtekening`, `peildatum`, `totaalbedrag`, `afwijkend-boekjaar`, `dagtekening-in-vaststellingsjaar`).
- **Physics tab:** Aparte tabblad met schakelaar, sliders voor gravitatie/centrale kracht/veerlengte, en drie presets (Compact / Cluster / Spread). Instellingen worden opgeslagen in `localStorage` onder de sleutel `lexnode-physics`.
- **Fullscreen:** Knop `⛶` schakelt tussen fullscreen en normaal met icon-toggle; valt terug op CSS `.pseudo-fullscreen` als de Fullscreen API niet beschikbaar is.
- **Responsieve legenda:** Desktop toont een popup, mobiel een bottom bar (Info-knop). De mobiele bottom bar bevat ook graaf-metadata.

## Kritische koppelingen

- **Node-IDs:** Hardcoded in `lexnode_engine.py`, `index.html` en tests. 
- **Attribuut-IDs:** Nummeriek en positioneel (0–27). Wijziging in GEXF `<attributes>` blok breekt lookups.
- **Pariteit:** Berekeningslogica (Lid 1, Lid 5, LI 2008) moet identiek blijven tussen `lexnode_engine.py` en `index.html`. Gebruik `tests/test_integration.py` om dit te verifiëren.
