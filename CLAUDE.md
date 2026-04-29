# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

LexNode is een "Rules as Code" prototype voor de Belastingdienst. Het modelleert juridische regels uit **Art. 9 Invorderingswet 1990** als een kennisgraaf (GEXF-formaat) en biedt een webinterface om invorderbaarheid van belastingaanslagen te berekenen en de juridische structuur te visualiseren.

## Commando's

```fish
# Venv aanmaken (eenmalig)
python3 -m venv .venv

# Venv activeren — altijd doen voor server starten of pip install
source .venv/bin/activate.fish

# Afhankelijkheden installeren (eenmalig, binnen de venv)
pip install -r requirements.txt

# Server starten (poort 8080)
python app.py

# Tests uitvoeren
python test_dynamisch.py

# Graaf valideren (ontbrekende referenties, ontbrekende afleidingsregels)
python validator.py
```

## Architectuur

De applicatie bestaat uit drie lagen:

**1. Kennisgraaf (`graph.gexf`)**  
GEXF-bestand gegenereerd door NetworkX met juridische concepten als nodes en relaties als edges. Elke node heeft 27 vaste attributen (id 0–26). Alle attribuut-ID's die door de codebase worden gebruikt:

| ID | Titel                | Gebruik                                                       |
|----|----------------------|---------------------------------------------------------------|
| 0  | node_type            | Type node: `annotatie`, `begrip`, `regel`                    |
| 1  | jas_klasse           | ATW/JAS-klasse — PDF redeneerroute (`get_route_nodes`)        |
| 2  | color                | Hex-kleur voor visualisatie                                   |
| 8  | begripsnaam          | Naam begrip — frontend node-details weergave                  |
| 9  | markering            | Wettekst-citaat — PDF sectie "Wettekst"                       |
| 10 | bron                 | Primair wetsartikel (bijv. `Art. 9 lid 1 IW 1990`)           |
| 11 | bronnen              | Aanvullende bronnen als Python-lijst — PDF grondslagen        |
| 12 | interpretatiemethode | Interpretatiemethode — PDF toelichting                        |
| 13 | toelichting_klasse   | Juridische toelichting / ATW-status                           |
| 14 | definitie            | Juridische definitie (bevat termijntekst voor regex-parsing)  |
| 15 | soort                | Soort begrip of regel                                         |
| 16 | herkomst             | Herkomst van de regel                                         |
| 22 | leidt_tot            | Python-lijst van target-IDs — frontend graaf-navigatie        |
| 23 | afleidingsregels     | Python-lijst van regelrefs                                    |
| 24 | regel_id             | ID van de afleidingsregel — PDF sectie "Afleidingsregel"      |
| 25 | naam                 | Naam van de regel — PDF sectie "Afleidingsregel"              |
| 26 | operators            | Logische operators — PDF sectie "Afleidingsregel"             |

**2. Backend (`app.py` + `lexnode_engine.py`)** — alleen lokaal  
Eenvoudige Python `http.server` zonder framework. `LexNodeEngine` laadt de GEXF eenmalig bij startup en exposeert:

- `GET /graph-data` → alle nodes + edges als JSON voor vis-network
- `GET /node-details/{id}` → ruwe attribuut-map van één node
- `POST /calculate` → `{dagtekening, peildatum}` → invorderbaarheidsresultaat
- `POST /export-pdf` → onderbouwde PDF met besluit en alle relevante kennisgraafdata (vereist `reportlab`)

De termijn wordt dynamisch via regex uitgelezen uit `attribuut 14` van node `zes-weken`. Fallback is 42 dagen als de regex faalt. `get_route_nodes()` levert alle attributen van de 5 actieve route-nodes voor de PDF-sectie "Redeneerroute".

**De frontend gebruikt deze endpoints niet op GitHub Pages** — alle logica draait client-side.

**3. Frontend (`index.html`)**  
Single-page app zonder build-stap. Gebruikt **vis-network** (CDN) voor graafvisualisatie en **jsPDF 2.5.1** (CDN) voor PDF-generatie in de browser. Twee tabbladen: "Berekening" en "Node Details".

De gebruiker kiest het aanslagtype via een dropdown. Na een berekening filtert de frontend de graaf naar één van drie dynamische routes (in `activeRoute`):

- **`LID1_ROUTE`** — lid-1-pad (5 nodes)
- **`LID5_ROUTE_NORMAAL`** — lid-5-pad met maandelijkse termijnen (11 nodes)
- **`LID5_ROUTE_TERUGVAL`** — lid-5-pad met AR-9-5e terugval naar lid 1 (9 nodes)

Berekeningsfuncties: `checkInvorderbaarheid()` (lid 1) en `checkInvorderbaarheidLid5()` (lid 5). Lid-5-logica: AR-9-5b berekent `12 - maand(dagtekening)` resterende termijnen; AR-9-5e activeert terugval als ≤ 1; AR-9-5c/d genereren de vervaldatums iteratief.

Alle logica draait volledig client-side: GEXF wordt via `fetch('graph.gexf')` geladen en geparseerd, de invorderbaarheidsberekening en PDF-export gebruiken alleen de geparseerde XML. Er is geen backend nodig; de app werkt op GitHub Pages.

## Kritische koppeling

De node-IDs in de GEXF zijn hardcoded in `lexnode_engine.py` én `index.html`. Bij hernoemen van een node in de graaf moeten beide bestanden mee worden aangepast.

Hardcoded node-IDs in `index.html` (lid 1): `zes-weken`, `zes-weken-na-dagtekening-aanslagbiljet`, `AR-9-1`, `invorderbaarheid`, `dagtekening-aanslagbiljet`.

Hardcoded node-IDs in `index.html` (lid 5): `dagtekening-in-vaststellingsjaar`, `voorlopige-aanslag`, `AR-9-5a`, `AR-9-5b`, `AR-9-5c`, `AR-9-5d`, `AR-9-5e`, `invorderbaarheid-in-gelijke-termijnen`, `termijnenberekening-resterende-maanden`, `vervaldag-eerste-termijn`, `vervaldag-volgende-termijnen`, `terugvalregel-lid-1`.

De attribuut-ID's (0–26) zijn nummeriek en positioneel — als de volgorde van `<attribute>`-declaraties in het `<attributes>`-blok van de GEXF wijzigt, breken alle lookups in `app.py` en `lexnode_engine.py`.
