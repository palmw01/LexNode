# LexNode — Rules as Code Kennisgraaf

[![Live demo](https://img.shields.io/badge/live_demo-palmw01.github.io%2FLexNode-0070c0?logo=github)](https://palmw01.github.io/LexNode/)
[![Deployment](https://github.com/palmw01/LexNode/actions/workflows/pages/pages-build-deployment/badge.svg)](https://github.com/palmw01/LexNode/actions/workflows/pages/pages-build-deployment)
[![Prototype](https://img.shields.io/badge/status-prototype-orange)](https://github.com/palmw01/LexNode)
[![Art. 9 IW 1990](https://img.shields.io/badge/wet-Art.%209%20IW%201990-012456)](https://wetten.overheid.nl/BWBR0004770/2024-01-01#Hoofdstuk2_Artikel9)

🌐 **Interactieve Kennisgraaf & Berekening:**
<a href="https://palmw01.github.io/LexNode/" target="_blank"><strong>https://palmw01.github.io/LexNode/</strong></a>

LexNode is een geavanceerd **Rules as Code (RaC)** prototype dat juridische regels uit de **Invorderingswet 1990** modelleert als een interactieve kennisgraaf. Het project demonstreert hoe complexe wetgeving (Art. 9 IW) omgezet kan worden in executable code die zowel visuele uitleg als juridisch onderbouwde besluiten levert.

## Kernpunten

- **Visual Reasoning:** De UI markeert de actieve redeneerroute direct in de kennisgraaf.
- **Realtime berekening:** Geen "Bereken"-knop — resultaten worden onmiddellijk bijgewerkt bij elke invoerwijziging.
- **Dynamic Logic:** Termijnen worden via regex dynamisch uit de graaf-attributen gelezen, niet hardcoded in de logica.
- **Zero-Server Architecture:** De GitHub Pages versie draait volledig client-side (XML/GEXF parsing in JS).
- **Juridische Precisie:** Volledige ondersteuning voor Art. 9 lid 1 (definitief) en lid 5 (voorlopig), inclusief Leidraad Invordering 2008 logica voor termijnberekening.
- **Interactieve graafvisualisatie:** Physics-instellingen (Compact / Cluster / Spread presets), fullscreen-modus en responsieve legenda.

## Technologie Stack

| Component | Technologie | Rol |
|:---|:---|:---|
| **Kennisgraaf** | GEXF / NetworkX | Opslag van juridische concepten, relaties en metadata (28 attributen per node). |
| **Backend** | Python 3.10+ | Optionele REST API voor lokale ontwikkeling (geen externe afhankelijkheden). |
| **Frontend** | Vanilla JS / Vis-network | Visualisatie en berekeningslogica (ook zonder backend functioneel). |

## Architectuur & Datamodel

De kracht van LexNode zit in de **GEXF-structuur**. Elke node in de graaf is verrijkt met 28 attributen die de juridische context bewaren:

- **Node Types:** `begrip`, `regel`, `wettekst`, `annotatie`.
- **Logica:** Attribuut 14 (`definitie`) bevat de tekstuele regel die door de engine wordt geparseerd.
- **Herleidbaarheid:** Directe koppelingen naar `bronreferentie` en `jas_klasse` voor traceerbaarheid van redeneerroutes.

### Redeneerroutes
De applicatie kiest op basis van de input dynamisch tussen:
1. **Lid 1 Route:** De standaard 6-weken termijn.
2. **Lid 5 Route:** Complexe berekening van resterende kalendermaanden (AR-9-5b) met terugvaloptie (AR-9-5e).

## Lokale Installatie

```bash
# Clone de repository
git clone https://github.com/palmw01/LexNode.git
cd LexNode

# Setup virtuele omgeving
python3 -m venv .venv
source .venv/bin/activate.fish  # Of: source .venv/bin/activate (bash/zsh)

# Installatie
pip install -r requirements.txt

# Start de ontwikkelserver
python app.py
```
*Open [http://localhost:8080](http://localhost:8080)*

## Kwaliteitsborging

LexNode bevat een test-suite van **74 geautomatiseerde tests** die de volledige stack dekken:

| Suite | Tests | Doel |
|---|---|---|
| `test_senior_backend.py` | 23 | Python engine, GEXF parsing, berekeningen |
| `test_integration.py` | 16 | End-to-end flows backend ↔ engine |
| `test_ui_senior.js` | 15 | UI-logica en browser-side berekeningen |
| `test_realtime_datums.js` | 20 | Realtime datumveld-gedrag (geen Bereken-knop) |

```bash
# Voer alle tests uit
./run_all_tests.sh

# Valideer de integriteit van de graaf
python validator.py
```

## Juridische Context

Dit prototype implementeert de volgende regels:
- **Art. 9 lid 1 IW 1990:** Termijn van zes weken na dagtekening.
- **Art. 9 lid 5 IW 1990:** Termijnen voor voorlopige aanslagen IB/VPB.
- **Art. 9 lid 10 IW 1990:** Uitsluiting van de Algemene Termijnenwet (ATW).
- **Leidraad Invordering 2008:** Specifieke regels voor maandeinden en schrikkeljaren.

---
*Disclaimer: Dit is een technisch prototype voor onderzoeksdoeleinden naar Rules as Code en mag niet worden gebruikt voor feitelijke belastingberekeningen.*
