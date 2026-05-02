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
python tests/test_dynamisch.py

# Graaf valideren (ontbrekende referenties, ontbrekende afleidingsregels)
python validator.py
```

## Architectuur

De applicatie bestaat uit drie lagen:

**1. Kennisgraaf (`graph.gexf`)**  
GEXF-bestand gegenereerd door NetworkX met juridische concepten als nodes en relaties als edges. Elke node heeft 28 vaste attributen (id 0–27). Node-IDs zijn hiërarchisch genaamd met een namespace-prefix: `begrippen/`, `regels/`, `annotaties/` of `wetteksten/`. Alle attribuut-ID's die door de codebase worden gebruikt:

| ID | Titel                | Gebruik                                                       |
|----|----------------------|---------------------------------------------------------------|
| 0  | node_type            | Type node: `annotatie`, `begrip`, `regel`, `wettekst`        |
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
| 22 | leidt_tot            | Python-lijst van `[[namespace/node-id]]`-refs — graaf-navigatie |
| 23 | afleidingsregels     | Python-lijst van regelrefs                                    |
| 24 | regel_id             | ID van de afleidingsregel — PDF sectie "Afleidingsregel"      |
| 25 | naam                 | Naam van de regel — PDF sectie "Afleidingsregel"              |
| 26 | operators            | Logische operators — PDF sectie "Afleidingsregel"             |
| 27 | bronreferentie       | Externe bronverwijzing — node-details weergave                |

**2. Backend (`app.py` + `lexnode_engine.py`)** — alleen lokaal  
Eenvoudige Python `http.server` zonder framework. `LexNodeEngine` laadt de GEXF eenmalig bij startup en exposeert:

- `GET /graph-data` → alle nodes + edges als JSON voor vis-network
- `GET /node-details/{id}` → ruwe attribuut-map van één node
- `POST /calculate` → `{dagtekening, peildatum}` → invorderbaarheidsresultaat
- `POST /export-pdf` → onderbouwde PDF met besluit en alle relevante kennisgraafdata (vereist `reportlab`)

De termijn wordt dynamisch via regex uitgelezen uit `attribuut 14` van node `begrippen/zes-weken`. Fallback is 42 dagen als de regex faalt. `get_route_nodes()` levert alle attributen van de 5 actieve route-nodes voor de PDF-sectie "Redeneerroute".

**De frontend gebruikt deze endpoints niet op GitHub Pages** — alle logica draait client-side.

**3. Frontend (`index.html`)**  
Single-page app zonder build-stap. Gebruikt **vis-network** (CDN) voor graafvisualisatie en **jsPDF 2.5.1** (CDN) voor PDF-generatie in de browser. Twee tabbladen: "Berekening" en "Node Details".

De gebruiker kiest het aanslagtype via een dropdown. Na een berekening filtert de frontend de graaf naar één van drie dynamische routes (in `activeRoute`):

- **`LID1_ROUTE`** — lid-1-pad (5 nodes)
- **`LID5_ROUTE_NORMAAL`** — lid-5-pad met maandelijkse termijnen (11 nodes)
- **`LID5_ROUTE_TERUGVAL`** — lid-5-pad met AR-9-5e terugval naar lid 1 (9 nodes)

Berekeningsfuncties: `checkInvorderbaarheid()` (lid 1) en `checkInvorderbaarheidLid5()` (lid 5). Lid-5-logica: AR-9-5b berekent `12 - maand(dagtekening)` resterende termijnen; AR-9-5e activeert terugval als ≤ 1; AR-9-5c/d genereren de vervaldatums iteratief conform **Leidraad Invordering 2008 art. 9.5**: als de dagtekening de laatste dag van de maand is, valt elke termijn op de laatste dag van de doelmaand; anders wordt hetzelfde dagnummer gebruikt, afgeknepen op de werkelijke maandlengte (`Math.min(dag, lasteDagDoelmaand)`).

Als het lid-5-resultaat invorderbaar is maar nog niet alle termijnen vervallen zijn, toont `#status-header` `INVORDERBAAR (X van Y termijnen vervallen)`. Hetzelfde telt voor de PDF-export (besluitbalk).

Bij het laden (`window.addEventListener('load', initGraph)`) worden de datumvelden `dagtekening` en `peildatum` ingesteld op `new Date().toISOString().slice(0, 10)` (vandaag).

Mobiele lay-out: de sidebar scrollt verticaal op kleine schermen; de graaf staat eronder en is bereikbaar door te scrollen. Tooltips worden uitgeschakeld op touchapparaten (`window.matchMedia('(hover: none)')`). Voor ontbrekende wetsartikelen (lid 2–4, lid 6–9) toont de UI informatieve notitieboxen met een verwijzing naar de GitHub-repository.

**Graafinfo en navigatieknoppen:**  
Na het laden van de GEXF worden drie metadata-velden uitgelezen en getoond: wetsartikel (hardcoded `Art. 9 IW 1990`), aantal nodes/edges uit `parsed.nodes.length` / `parsed.edges.length`, en de bijgewerkt-datum uit `<meta lastmodifieddate>` in de GEXF. Op desktop staat dit rechtsbovenin de header (`#graph-meta`). Op mobiel (≤ 850px) is `#graph-meta` verborgen en verschijnt een ronde ⓘ-knop (`#info-btn`) die een absolute popup (`#info-popup`) toont bij klikken; klikken buiten sluit de popup via een `document`-click-listener.

Op desktop staan drie navigatieknoppen (`#nav-knoppen`) absoluut gepositioneerd rechtsboven in `#graph-container`: **+** (`btn-zoom-in`, factor 1.3), **−** (`btn-zoom-out`, factor 0.77) en **⤢** (`btn-fit`, roept `App.network.fit()` aan). Op mobiel zijn de knoppen verborgen via de media query.

Alle logica draait volledig client-side: GEXF wordt via `fetch('graph.gexf')` geladen en geparseerd, de invorderbaarheidsberekening en PDF-export gebruiken alleen de geparseerde XML. Er is geen backend nodig; de app werkt op GitHub Pages.

## Kritische koppeling

De node-IDs in de GEXF zijn hardcoded in `lexnode_engine.py`, `test_dynamisch.py` én `index.html`. Bij hernoemen of herindelen van een node in de graaf moeten alle drie bestanden mee worden aangepast. Node-IDs gebruiken een hiërarchisch namespace-formaat (`begrippen/`, `regels/`, `annotaties/`, `wetteksten/`).

Hardcoded node-IDs in `index.html` (lid 1): `begrippen/zes-weken`, `begrippen/zes-weken-na-dagtekening-aanslagbiljet`, `regels/AR-9-1`, `begrippen/invorderbaarheid`, `begrippen/dagtekening-aanslagbiljet`.

Hardcoded node-IDs in `index.html` (lid 5): `begrippen/dagtekening-in-vaststellingsjaar`, `begrippen/voorlopige-aanslag`, `regels/AR-9-5a`, `regels/AR-9-5b`, `regels/AR-9-5c`, `regels/AR-9-5d`, `regels/AR-9-5e`, `begrippen/invorderbaarheid-in-gelijke-termijnen`, `begrippen/termijnenberekening-resterende-maanden`, `begrippen/vervaldag-eerste-termijn`, `begrippen/vervaldag-volgende-termijnen`, `begrippen/terugvalregel-lid-1`.

De attribuut-ID's (0–27) zijn nummeriek en positioneel — als de volgorde van `<attribute>`-declaraties in het `<attributes>`-blok van de GEXF wijzigt, breken alle lookups in `app.py` en `lexnode_engine.py`.

`leidt_tot`-waarden (attribuut 22) gebruiken de notatie `[[namespace/node-id]]`. De validator parseert deze met `.replace('[[', '').replace(']]', '')` om het volledige geprefixte node-ID te extraheren — gebruik nooit `.split('/')[-1]`, want dat strip het namespace-prefix weg.
