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
```

Voer een dagtekening en peildatum in op het tabblad "Berekening". Klik op **Exporteer PDF** voor een onderbouwd besluitdocument.

## Afhankelijkheden

| Package | Gebruik |
|---|---|
| `reportlab >= 4.0` | PDF-generatie via de lokale server (`/export-pdf`) — niet nodig voor GitHub Pages |

Alle overige imports (`http.server`, `xml.etree`, `re`, `datetime`) zijn onderdeel van de Python standaardbibliotheek.

De frontend laadt **vis-network** en **jsPDF** via CDN — geen installatie vereist.

## Projectstructuur

| Bestand | Rol |
|---|---|
| `graph.gexf` | Kennisgraaf — juridische concepten als nodes, relaties als edges |
| `lexnode_engine.py` | Laadt de GEXF, berekent invorderbaarheid, levert route-nodes voor PDF |
| `app.py` | HTTP-server (poort 8080), exposeert de REST-endpoints (alleen lokaal) |
| `index.html` | Single-page frontend — berekening, graafvisualisatie en PDF-export volledig client-side |
| `validator.py` | Controleert integriteit van de GEXF (kapotte referenties, ontbrekende regels) |
| `tests/test_dynamisch.py` | Unittests die de termijn dynamisch uit de graaf ophalen |
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

```bash
# Activeer eerst de venv (zie Installatie)
source .venv/bin/activate.fish

# Unittests
python tests/test_dynamisch.py

# Graaf-integriteitscheck
python validator.py
```

## Architectuur

De applicatie heeft drie lagen:

**Kennisgraaf (`graph.gexf`)** — GEXF-bestand gegenereerd door NetworkX. Bevat 30 nodes met juridische concepten, ingedeeld in vier namespaces: `begrippen/`, `regels/`, `annotaties/` en `wetteksten/`. Drie actieve redeneerroutes:

```
Lid 1:       begrippen/dagtekening-aanslagbiljet → begrippen/zes-weken
             → begrippen/zes-weken-na-dagtekening-aanslagbiljet → regels/AR-9-1 → begrippen/invorderbaarheid

Lid 5:       begrippen/dagtekening-aanslagbiljet → begrippen/dagtekening-in-vaststellingsjaar
             → begrippen/voorlopige-aanslag → regels/AR-9-5a → begrippen/invorderbaarheid-in-gelijke-termijnen
             → regels/AR-9-5b → begrippen/termijnenberekening-resterende-maanden
             → regels/AR-9-5c → begrippen/vervaldag-eerste-termijn → regels/AR-9-5d → begrippen/vervaldag-volgende-termijnen

Lid 5 + terugval (AR-9-5e):
             begrippen/dagtekening-aanslagbiljet → begrippen/dagtekening-in-vaststellingsjaar
             → begrippen/termijnenberekening-resterende-maanden → regels/AR-9-5e
             → begrippen/terugvalregel-lid-1 → [lid-1-route]
```

**Backend (`app.py` + `lexnode_engine.py`)** — `http.server` zonder framework. `LexNodeEngine` laadt de GEXF eenmalig bij startup. De termijn (zes weken = 42 dagen) wordt via regex uitgelezen uit de `definitie`-tekst van node `begrippen/zes-weken`; fallback is 42 dagen. `get_route_nodes()` levert alle attributen van de 5 actieve route-nodes voor de PDF-export.

**Frontend (`index.html`)** — Geen build-stap. Gebruikt **vis-network** (CDN) voor graafvisualisatie en **jsPDF** (CDN) voor PDF-generatie in de browser. Twee tabbladen: "Berekening" en "Node Details". De gebruiker kiest het aanslagtype via een dropdown; na de berekening markeert de graafvisualisatie de relevante route. Datumvelden worden bij het laden ingesteld op de datum van vandaag. Rechtsbovenin de header staat graafmetadata (wetsartikel, nodes, relaties, bijgewerkt-datum) uitgelezen uit de GEXF; op mobiel verborgen achter een ⓘ-knop. Op de graaf staan navigatieknoppen (+/−/⤢) voor in/uitzoomen en fit, alleen op desktop. De lay-out is responsief: op mobiel scrollt de sidebar verticaal en staat de graaf eronder; tooltips zijn uitgeschakeld op touchapparaten. Alle logica — berekening, GEXF-parsing en PDF-export — draait volledig client-side, zodat de app op GitHub Pages werkt zonder backend.

## Juridische context

- **Art. 9 lid 1 IW 1990** — Belastingaanslagen zijn invorderbaar zes weken na de dagtekening van het aanslagbiljet.
- **Art. 9 lid 5 IW 1990** — Voorlopige aanslagen IB/VPB en voorlopige conserverende aanslagen IB, waarvan het aanslagbiljet is gedagtekend in het belastingjaar waarover zij zijn vastgesteld, zijn invorderbaar in zoveel gelijke maandelijkse termijnen als er na de dagtekeningmaand nog maanden in dat jaar resteren. Als de berekening niet leidt tot meer dan één termijn, herneemt lid 1.
- **Art. 9 lid 10 IW 1990** — De Algemene Termijnenwet (ATW) is uitgesloten; weekenden en feestdagen tellen mee.
