# LexNode — Rules as Code kennisgraaf

[![Live demo](https://img.shields.io/badge/live_demo-palmw01.github.io%2FLexNode-0070c0?logo=github)](https://palmw01.github.io/LexNode/)
[![Deployment](https://github.com/palmw01/LexNode/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/palmw01/LexNode/actions/workflows/pages/pages-build-deployment)
[![Prototype](https://img.shields.io/badge/status-prototype-orange)](https://github.com/palmw01/LexNode)
[![Art. 9 IW 1990](https://img.shields.io/badge/wet-Art.%209%20IW%201990-012456)](https://wetten.overheid.nl/BWBR0004770/2024-01-01#Hoofdstuk2_Artikel9)

🌐 **Bekijk de live kennisgraaf en berekening:**
<a href="https://palmw01.github.io/LexNode/" target="_blank"><strong>https://palmw01.github.io/LexNode/</strong></a>

LexNode modelleert juridische regels uit **Art. 9 Invorderingswet 1990** als een interactieve kennisgraaf en berekent de invorderbaarheid van belastingaanslagen direct in de browser — zonder server, volledig client-side.

---

## Wat het doet

Gegeven een **aanslagtype**, **dagtekening** en **peildatum**, berekent LexNode of een belastingaanslag al invorderbaar is. De UI ondersteunt twee redeneerroutes:

- **Art. 9 lid 1** (definitieve aanslagen) — invorderbaar zes weken na de dagtekening. De termijn wordt dynamisch uitgelezen uit de kennisgraaf via regex, niet hardcoded.
- **Art. 9 lid 5** (voorlopige aanslagen IB/VPB en voorlopige conserverende aanslagen IB) — invorderbaar in gelijke maandelijkse termijnen. Het aantal termijnen is gelijk aan het aantal resterende kalendermaanden na de dagtekeningmaand (AR-9-5b). Bij onvoldoende termijnen (≤ 1, AR-9-5e) valt de berekening terug op lid 1.

De kennisgraafvisualisatie markeert automatisch de actieve redeneerroute. Het resultaat is downloadbaar als PDF-besluit met volledige juridische onderbouwing (definities, toelichtingen, wetsverwijzingen en afleidingsregels). De PDF wordt volledig in de browser gegenereerd via jsPDF — er is geen server voor nodig.

De datumvelden (dagtekening en peildatum) worden bij het laden automatisch ingesteld op de datum van vandaag. De interface is responsief: op mobiel scrollt de sidebar verticaal en staat de graaf eronder; tooltips zijn uitgeschakeld op touchapparaten. Voor ontbrekende wetsartikelen (lid 2 t/m 4, lid 6 t/m 9) toont de UI informatieve notitieboxen met een verwijzing naar de GitHub-repository.
- De frontend ondersteunt een werkende PDF-exportknop via jsPDF; het onderbouwde besluit wordt direct in de browser gedownload.

Rechtsbovenin de header staat graafmetadata (wetsartikel, aantal nodes en relaties, bijgewerkt-datum) uitgelezen uit de GEXF. Op mobiel is dit verborgen achter een ⓘ-knop die een popup opent. Op de graaf staan drie navigatieknoppen (**+**, **−**, **⤢**) voor in/uitzoomen en alles tonen — alleen zichtbaar op desktop.

## Lokale installatie en opstarten

**Vereisten:** Python 3.10+

> **Let op:** voer alle commando's uit binnen de geactiveerde venv. Op Arch Linux blokkeert PEP 668 systeemwijde `pip install` buiten een venv.

```fish
# 1. Virtuele omgeving aanmaken (eenmalig)
python3 -m venv .venv

# 2. Venv activeren — doe dit elke keer voor je de server start
source .venv/bin/activate.fish

# 3. Afhankelijkheden installeren (eenmalig, binnen de venv)
pip install -r requirements.txt

# 4. Server starten (poort 8080)
python app.py
# Open http://localhost:8080

# 5. Tests uitvoeren (optioneel)
python tests/test_dynamisch.py

# 6. Alle tests uitvoeren (54 tests)
./run_all_tests.sh

# 7. Graaf valideren
python validator.py
```

Voer een dagtekening en peildatum in op het tabblad "Berekening". Klik op **Exporteer PDF** voor een onderbouwd besluitdocument.

## Afhankelijkheden

| Package | Gebruik |
|---|---|
| `reportlab >= 4.0` | PDF-generatie via de lokale server (`/export-pdf`) — niet nodig voor GitHub Pages |

Alle overige imports (`http.server`, `xml.etree`, `re`, `datetime`) zijn onderdeel van de Python standaardbibliotheek.

De frontend laadt **vis-network** en **jsPDF 2.5.1** via CDN — geen installatie vereist.

## Projectstructuur

| Bestand | Rol |
|---|---|
| `graph.gexf` | Kennisgraaf — juridische concepten als nodes, relaties als edges |
| `lexnode_engine.py` | Laadt de GEXF, berekent invorderbaarheid, levert route-nodes voor PDF |
| `app.py` | HTTP-server (poort 8080), exposeert de REST-endpoints (alleen lokaal) |
| `index.html` | Single-page frontend — berekening, graafvisualisatie en PDF-export volledig client-side |
| `validator.py` | Controleert integriteit van de GEXF (kapotte referenties, ontbrekende regels) |
| `run_all_tests.sh` | Shell-script om alle test suites uit te voeren (54 tests) |
| `TEST_REPORT.md` | Gedetailleerde testresultaten en analyse |
| `TESTING_SUMMARY.md` | Overzicht van de test automation suite |
| `tests/test_dynamisch.py` | Unittests die de termijn dynamisch uit de graaf ophalen |
| `tests/test_senior_backend.py` | Uitgebreide backend-tests (23 tests) |
| `tests/test_integration.py` | Integratietests tussen backend en frontend (16 tests) |
| `tests/test_ui_senior.js` | Frontend-tests in Node.js (15 tests) |
| `tests/test_comprehensive.py` | Omvattende backend-validatie |
| `tests/test_edge_cases.py` | Edge cases en grensgevallen |
| `tests/test_leidraad.py` | Tests voor Leidraad Invordering 2008 correcties |
| `requirements.txt` | Python-afhankelijkheden |

## API-endpoints (lokale server)

De frontend op GitHub Pages gebruikt geen van deze endpoints — alle logica draait client-side in de browser. De lokale server (`app.py`) biedt de endpoints hieronder aan voor ontwikkel- en testdoeleinden.

| Methode | Pad | Beschrijving |
|---|---|---|
| `GET` | `/graph-data` | Alle nodes en edges als JSON |
| `GET` | `/node-details/{id}` | Attributen van één node |
| `POST` | `/calculate` | `{dagtekening, peildatum}` → invorderbaarheidsresultaat |
| `POST` | `/export-pdf` | Onderbouwde PDF via reportlab (alleen lokaal) |

Datumformaat voor POST-requests: `YYYY-MM-DD`.

## Tests en validatie

Het project heeft een uitgebreide test suite met 54 test cases die alle lagen valideren: backend (Python), frontend (JavaScript) en integratie.

```bash
# Activeer eerst de venv (zie Installatie)
source .venv/bin/activate.fish

# Alle tests uitvoeren (54 tests)
./run_all_tests.sh

# Individuele test suites
python tests/test_senior_backend.py  # Backend-tests (23 tests)
python tests/test_integration.py     # Integratie-tests (16 tests)
node tests/test_ui_senior.js         # Frontend-tests (15 tests)

# Specifieke tests
python tests/test_dynamisch.py       # Dynamische termijnextractie
python tests/test_comprehensive.py   # Omvattende backend-validatie
python tests/test_edge_cases.py      # Edge cases
python tests/test_leidraad.py        # Leidraad-correcties

# Graaf-integriteitscheck
python validator.py
```

Zie `TEST_REPORT.md` voor gedetailleerde resultaten en `TESTING_SUMMARY.md` voor een overzicht van de teststrategie.

## Architectuur

De applicatie bestaat uit drie lagen:

**1. Kennisgraaf (`graph.gexf`)**  
GEXF-bestand gegenereerd door NetworkX met juridische concepten als nodes en relaties als edges. Elke node heeft 28 vaste attributen (id 0–27). Node-IDs zijn hiërarchisch genaamd met een namespace-prefix: `begrippen/`, `regels/`, `annotaties/` of `wetteksten/`. Belangrijke attribuut-ID's:

| ID | Titel                | Gebruik |
|----|----------------------|---------------------------------------------------------------|
| 0  | node_type            | Type node: `annotatie`, `begrip`, `regel`, `wettekst` |
| 1  | jas_klasse           | ATW/JAS-klasse — PDF redeneerroute |
| 2  | color                | Hex-kleur voor visualisatie |
| 8  | begripsnaam          | Naam begrip — frontend node-details |
| 9  | markering            | Wettekst-citaat — PDF sectie "Wettekst" |
| 10 | bron                 | Primair wetsartikel |
| 11 | bronnen              | Aanvullende bronnen als lijst — PDF grondslagen |
| 12 | interpretatiemethode | Interpretatiemethode — PDF toelichting |
| 13 | toelichting_klasse   | Juridische toelichting / ATW-status |
| 14 | definitie            | Juridische definitie (bevat termijntekst voor regex-parsing) |
| 15 | soort                | Soort begrip of regel |
| 16 | herkomst             | Herkomst van de regel |
| 22 | leidt_tot            | Lijst van `[[namespace/node-id]]`-refs — graaf-navigatie |
| 23 | afleidingsregels     | Lijst van regelrefs |
| 24 | regel_id             | ID van de afleidingsregel — PDF sectie "Afleidingsregel" |
| 25 | naam                 | Naam van de regel — PDF sectie "Afleidingsregel" |
| 26 | operators            | Logische operators — PDF sectie "Afleidingsregel" |
| 27 | bronreferentie       | Externe bronverwijzing — node-details |

**2. Backend (`app.py` + `lexnode_engine.py`)** — alleen lokaal  
Eenvoudige Python `http.server` zonder framework. `LexNodeEngine` laadt de GEXF eenmalig bij startup en exposeert:

- `GET /graph-data` → alle nodes + edges als JSON voor vis-network
- `GET /node-details/{id}` → ruwe attribuut-map van één node
- `POST /calculate` → `{dagtekening, peildatum}` → invorderbaarheidsresultaat
- `POST /export-pdf` → onderbouwde PDF met besluit en alle relevante kennisgraafdata (vereist `reportlab`)

De termijn wordt dynamisch via regex uitgelezen uit attribuut 14 van node `begrippen/zes-weken`. Fallback is 42 dagen als de regex faalt. `get_route_nodes()` levert alle attributen van de 5 actieve route-nodes voor de PDF-sectie "Redeneerroute".

**De frontend gebruikt deze endpoints niet op GitHub Pages** — alle logica draait client-side.

**3. Frontend (`index.html`)**  
Single-page app zonder build-stap. Gebruikt **vis-network** (CDN) voor graafvisualisatie en **jsPDF 2.5.1** (CDN) voor PDF-generatie in de browser. Twee tabbladen: "Berekening" en "Node Details".

De gebruiker kiest het aanslagtype via een dropdown. Na een berekening filtert de frontend de graaf naar één van drie dynamische routes:

- **LID1_ROUTE** — lid-1-pad (5 nodes)
- **LID5_ROUTE_NORMAAL** — lid-5-pad met maandelijkse termijnen (11 nodes)
- **LID5_ROUTE_TERUGVAL** — lid-5-pad met AR-9-5e terugval naar lid 1 (9 nodes)

Berekeningsfuncties: `checkInvorderbaarheid()` (lid 1) en `checkInvorderbaarheidLid5()` (lid 5). Lid-5-logica: AR-9-5b berekent `12 - maand(dagtekening)` resterende termijnen; AR-9-5e activeert terugval als ≤ 1; AR-9-5c/d genereren de vervaldatums iteratief conform **Leidraad Invordering 2008 art. 9.5**: als de dagtekening de laatste dag van de maand is, valt elke termijn op de laatste dag van de doelmaand; anders wordt hetzelfde dagnummer gebruikt, afgeknepen op de werkelijke maandlengte.

Als het lid-5-resultaat invorderbaar is maar nog niet alle termijnen vervallen zijn, toont de UI `INVORDERBAAR (X van Y termijnen vervallen)`. Hetzelfde geldt voor de PDF-export.

Bij het laden worden de datumvelden ingesteld op vandaag. Mobiele lay-out: sidebar scrollt verticaal, graaf eronder. Tooltips uitgeschakeld op touchapparaten. Voor ontbrekende wetsartikelen (lid 2–4, lid 6–9) toont de UI notitieboxen met verwijzing naar de repository.

Graafinfo en navigatieknoppen: metadata (wetsartikel, aantal nodes/edges, bijgewerkt-datum) rechtsboven op desktop, verborgen achter ⓘ-knop op mobiel. Navigatieknoppen (+/−/⤢) voor zoom/fit, alleen op desktop.

Alle logica draait volledig client-side: GEXF wordt gefetcht en geparseerd, berekening en PDF-export gebruiken alleen de geparseerde XML. Geen backend nodig; werkt op GitHub Pages.

## Juridische context

- **Art. 9 lid 1 IW 1990** — Belastingaanslagen zijn invorderbaar zes weken na de dagtekening van het aanslagbiljet.
- **Art. 9 lid 5 IW 1990** — Voorlopige aanslagen IB/VPB en voorlopige conserverende aanslagen IB, waarvan het aanslagbiljet is gedagtekend in het belastingjaar waarover zij zijn vastgesteld, zijn invorderbaar in zoveel gelijke maandelijkse termijnen als er na de dagtekeningmaand nog maanden in dat jaar resteren. Als de berekening niet leidt tot meer dan één termijn, herneemt lid 1.
- **Art. 9 lid 10 IW 1990** — De Algemene Termijnenwet (ATW) is uitgesloten; weekenden en feestdagen tellen mee.
