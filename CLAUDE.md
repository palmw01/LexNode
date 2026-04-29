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
GEXF-bestand gegenereerd door NetworkX met juridische concepten als nodes en relaties als edges. Elke node heeft 27 vaste attributen (id 0–26). De kritische attribuut-ID's die hardcoded door de codebase worden gebruikt:

| ID | Titel            | Gebruik                                      |
|----|------------------|----------------------------------------------|
| 0  | node_type        | Type node: `annotatie`, `begrip`, `regel`   |
| 2  | color            | Hex-kleur voor visualisatie                  |
| 8  | begripsnaam      | Naam van het juridisch begrip                |
| 10 | bron             | Wetsartikel (bijv. `Art. 9 lid 1 IW 1990`)  |
| 13 | toelichting_klasse | Interpretatiemethode / ATW-status          |
| 14 | definitie        | Juridische definitie (bevat termijntekst)    |
| 22 | leidt_tot        | Geserialiseerde Python-lijst van target-IDs  |
| 23 | afleidingsregels | Geserialiseerde Python-lijst van regelrefs   |

**2. Backend (`app.py` + `lexnode_engine.py`)**  
Eenvoudige Python `http.server` zonder framework. `LexNodeEngine` laadt de GEXF eenmalig bij startup en exposeert:

- `GET /graph-data` → alle nodes + edges als JSON voor vis-network
- `GET /node-details/{id}` → ruwe attribuut-map van één node
- `POST /calculate` → `{dagtekening, peildatum}` → invorderbaarheidsresultaat
- `POST /export-pdf` → onderbouwde PDF met besluit en alle relevante kennisgraafdata (vereist `reportlab`)

De termijn wordt dynamisch via regex uitgelezen uit `attribuut 14` van node `zes-weken`. Fallback is 42 dagen als de regex faalt. `get_route_nodes()` levert alle attributen van de 5 actieve route-nodes voor de PDF-sectie "Redeneerroute".

**3. Frontend (`index.html`)**  
Single-page app zonder build-stap. Gebruikt **vis-network** (CDN) voor graafvisualisatie. Twee tabbladen: "Berekening" en "Node Details". Na een berekening filtert de frontend de graaf naar de actieve route (`dagtekening-aanslagbiljet → zes-weken → zes-weken-na-dagtekening-aanslagbiljet → AR-9-1 → invorderbaarheid`).

## Lid-5-nodes: intentioneel aanwezig maar niet actief

De GEXF-graaf bevat 33 nodes. De UI gebruikt er actief 6 (de lid-1-route: `dagtekening-aanslagbiljet → zes-weken → zes-weken-na-dagtekening-aanslagbiljet → AR-9-1 → invorderbaarheid`). De overige nodes (o.a. `AR-9-5a/b/c/d/e`, `voorlopige-aanslag`, `invorderbaarheid-in-gelijke-termijnen`, etc.) modelleren Art. 9 lid 5 IW 1990 (gelijke termijnen voor voorlopige aanslagen). Ze zijn correct gemodelleerd maar nog niet aangesloten op de UI — dit is bewust, niet per ongeluk.

## Kritische koppeling

De node-IDs in de GEXF (`zes-weken`, `AR-9-1`, `invorderbaarheid`, etc.) zijn hardcoded in `lexnode_engine.py` én `index.html`. Bij hernoemen van een node in de graaf moeten beide bestanden mee worden aangepast.

De attribuut-ID's (0–26) zijn nummeriek en positioneel — als de volgorde van `<attribute>`-declaraties in het `<attributes>`-blok van de GEXF wijzigt, breken alle lookups in `app.py` en `lexnode_engine.py`.
