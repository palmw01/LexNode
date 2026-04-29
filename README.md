# LexNode

Een "Rules as Code" prototype voor de Belastingdienst. LexNode modelleert juridische regels uit **Art. 9 Invorderingswet 1990** als een kennisgraaf en biedt een webinterface om de invorderbaarheid van belastingaanslagen te berekenen en de juridische structuur te visualiseren.

## Wat het doet

Gegeven een **dagtekening** (datum op het aanslagbiljet) en een **peildatum**, berekent LexNode of een belastingaanslag al invorderbaar is. De kern: een aanslag is invorderbaar zes weken na de dagtekening (Art. 9 lid 1 IW 1990). De termijn wordt dynamisch uitgelezen uit de kennisgraaf — niet hardcoded.

## Snel starten

**Vereisten:** Python 3.x, geen externe packages verplicht (optioneel: `reportlab` voor PDF-export).

```bash
python app.py
# Open http://localhost:8080
```

Voer een dagtekening en peildatum in op het tabblad "Berekening". Het resultaat toont of de aanslag invorderbaar is, wat de exacte deadline is, en welk wetsartikel van toepassing is.

## Projectstructuur

| Bestand | Rol |
|---|---|
| `graph.gexf` | Kennisgraaf — juridische concepten als nodes, relaties als edges |
| `lexnode_engine.py` | Laadt de GEXF en berekent invorderbaarheid |
| `app.py` | HTTP-server (poort 8080), exposeert de REST-endpoints |
| `index.html` | Single-page frontend met graafvisualisatie (vis-network via CDN) |
| `validator.py` | Controleert integriteit van de GEXF (kapotte referenties, ontbrekende regels) |
| `test_dynamisch.py` | Unittests die de termijn dynamisch uit de graaf ophalen |

## API-endpoints

| Methode | Pad | Beschrijving |
|---|---|---|
| `GET` | `/graph-data` | Alle nodes en edges als JSON |
| `GET` | `/node-details/{id}` | Attributen van één node |
| `POST` | `/calculate` | `{dagtekening, peildatum}` → invorderbaarheidsresultaat |
| `POST` | `/export` | Zelfde als `/calculate` maar volledige JSON-dump |
| `POST` | `/export-pdf` | PDF-bewijs (vereist `reportlab`) |

Datumformaat voor POST-requests: `YYYY-MM-DD`.

## Tests en validatie

```bash
# Unittests
python -m pytest test_dynamisch.py -v

# Graaf-integriteitscheck
python validator.py
```

## Architectuur

De applicatie heeft drie lagen:

**Kennisgraaf (`graph.gexf`)** — GEXF-bestand gegenereerd door NetworkX. Bevat 33 nodes met juridische concepten. De actieve route voor lid 1 is:

```
dagtekening-aanslagbiljet → zes-weken → zes-weken-na-dagtekening-aanslagbiljet → AR-9-1 → invorderbaarheid
```

De graaf bevat ook nodes voor Art. 9 lid 5 IW 1990 (gelijke termijnen voor voorlopige aanslagen), maar deze zijn nog niet aangesloten op de UI.

**Backend (`app.py` + `lexnode_engine.py`)** — `http.server` zonder framework. `LexNodeEngine` laadt de GEXF eenmalig bij startup. De termijn (zes weken = 42 dagen) wordt via regex uitgelezen uit de `definitie`-tekst van node `zes-weken`; fallback is 42 dagen.

**Frontend (`index.html`)** — Geen build-stap. Twee tabbladen: "Berekening" en "Node Details". Na een berekening filtert de graafvisualisatie automatisch naar de actieve route.

## Juridische context

- **Art. 9 lid 1 IW 1990** — Belastingaanslagen zijn invorderbaar zes weken na de dagtekening van het aanslagbiljet.
- **Art. 9 lid 10 IW 1990** — De Algemene Termijnenwet (ATW) is uitgesloten; weekenden en feestdagen tellen mee.
