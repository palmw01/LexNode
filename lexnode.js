    // ── GEXF-attribuut IDs (overeenkomen met graph.gexf schema) ──────────
    const ATTR_NODE_TYPE = '0';
    const ATTR_JAS_KLASSE = '1';
    const ATTR_COLOR = '2';
    const ATTR_BEGRIPSNAAM = '8';
    const ATTR_MARKERING = '9';
    const ATTR_BRON = '10';
    const ATTR_BRONNEN = '11';
    const ATTR_INTERPRETATIEMETHODE = '12';
    const ATTR_TOELICHTING_KLASSE = '13';
    const ATTR_DEFINITIE = '14';
    const ATTR_SOORT = '15';
    const ATTR_HERKOMST = '16';
    const ATTR_LEIDT_TOT = '22';
    const ATTR_AFLEIDINGSREGELS = '23';
    const ATTR_REGEL_ID = '24';
    const ATTR_NAAM = '25';
    const ATTR_OPERATORS = '26';
    const ATTR_BRONREFERENTIE = '27';

    const DEFAULT_PHYSICS_SETTINGS = {
        gravitationalConstant: -400,
        centralGravity: 0.05,
        springLength: 160,
        springConstant: 0.03,
        damping: 0.7,
        avoidOverlap: 0.6,
    };
    const PHYSICS_STORAGE_KEY = 'lexnode-physics';
    const INITIAL_STABILIZATION_ITERATIONS = 400;
    const DRAG_STABILIZATION_ITERATIONS = 60;
    const RESET_STABILIZATION_ITERATIONS = 150;

    const LID1_ROUTE = [
        'begrippen/dagtekening-aanslagbiljet',
        'begrippen/zes-weken',
        'begrippen/zes-weken-na-dagtekening-aanslagbiljet',
        'regels/AR-9-1',
        'begrippen/invorderbaarheid',
    ];

    const LI_9_1_ROUTE = [
        ...LID1_ROUTE,
        'annotaties/li2008/art9-9-1',
        'regels/AR-LI-9-1a',
        'begrippen/vervaldag-31-december'
    ];

    const LI_9_1B_ROUTE = [
        ...LID1_ROUTE,
        'annotaties/li2008/art9-9-1',
        'regels/AR-LI-9-1b',
        'begrippen/vervaldag-laatste-dag-maand'
    ];

    const LID5_ROUTE_NORMAAL = [
        'begrippen/dagtekening-aanslagbiljet',
        'begrippen/dagtekening-in-vaststellingsjaar',
        'begrippen/voorlopige-aanslag',
        'regels/AR-9-5a',
        'begrippen/invorderbaarheid-in-gelijke-termijnen',
        'begrippen/totaalbedrag-belastingaanslag',
        'regels/AR-9-5f',
        'begrippen/termijnbedrag',
        'regels/AR-9-5b',
        'begrippen/termijnenberekening-resterende-maanden',
        'regels/AR-9-5c',
        'begrippen/vervaldag-eerste-termijn',
        'regels/AR-9-5d',
        'begrippen/vervaldag-volgende-termijnen',
    ];

    const LID5_ROUTE_TERUGVAL = [
        'begrippen/dagtekening-aanslagbiljet',
        'begrippen/dagtekening-in-vaststellingsjaar',
        'begrippen/termijnenberekening-resterende-maanden',
        'regels/AR-9-5e',
        'begrippen/terugvalregel-lid-1',
        'begrippen/zes-weken',
        'begrippen/zes-weken-na-dagtekening-aanslagbiljet',
        'regels/AR-9-1',
        'begrippen/invorderbaarheid',
    ];

    const LID5_LI_9_1_ROUTE = [
        'begrippen/dagtekening-aanslagbiljet',
        'begrippen/dagtekening-in-vaststellingsjaar',
        'begrippen/voorlopige-aanslag',
        'regels/AR-9-5a',
        'begrippen/invorderbaarheid-in-gelijke-termijnen',
        'begrippen/totaalbedrag-belastingaanslag',
        'regels/AR-9-5f',
        'begrippen/termijnbedrag',
        'regels/AR-9-5b',
        'begrippen/termijnenberekening-resterende-maanden',
        'regels/AR-9-5c',
        'begrippen/vervaldag-eerste-termijn',
        'regels/AR-9-5d',
        'begrippen/vervaldag-volgende-termijnen',
        'annotaties/li2008/art9-9-1',
        'regels/AR-LI-9-1a',
        'begrippen/vervaldag-31-december'
    ];

    const LID5_LI_9_1B_ROUTE = [
        'begrippen/dagtekening-aanslagbiljet',
        'begrippen/dagtekening-in-vaststellingsjaar',
        'begrippen/voorlopige-aanslag',
        'regels/AR-9-5a',
        'begrippen/invorderbaarheid-in-gelijke-termijnen',
        'begrippen/totaalbedrag-belastingaanslag',
        'regels/AR-9-5f',
        'begrippen/termijnbedrag',
        'regels/AR-9-5b',
        'begrippen/termijnenberekening-resterende-maanden',
        'regels/AR-9-5c',
        'begrippen/vervaldag-eerste-termijn',
        'regels/AR-9-5d',
        'begrippen/vervaldag-volgende-termijnen',
        'annotaties/li2008/art9-9-1',
        'regels/AR-LI-9-1b',
        'begrippen/vervaldag-laatste-dag-maand'
    ];

    // ── State ─────────────────────────────────────────────────────────────
    const App = {
        network:        null,
        nodesDS:        new vis.DataSet(),
        edgesDS:        new vis.DataSet(),
        graphData:      { nodes: [], edges: [] },
        nodeById:       new Map(),
        edgeById:       new Map(),
        nodeAttrsById:  new Map(),
        gexfDoc:        null,
        popupController: null,
        physicsEnabled: false,
        isStabilizing:  false,
        dragPhysicsActive: false,
        resizeRaf:      null,
        hasInitialFitCompleted: false,
        physicsSettings: { ...DEFAULT_PHYSICS_SETTINGS },
        activeRoute:    LID1_ROUTE,
    };

    const RELATIES = {
        'begrippen':        { color: '#aaa'    },
        'leidt-tot':        { color: '#007bc7' },
        'afleidingsregels': { color: '#e87c25' },
        'heeft':            { color: '#999'    },
        'is-een':           { color: '#3a9e5f' },
    };

    // ── Helpers ───────────────────────────────────────────────────────────
    const formatDatum = d =>
        d.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });

    function getTodayLocal() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function parseLocalDate(str) {
        const [y, m, d] = str.split('-').map(Number);
        return new Date(y, m - 1, d);
    }

    function debounce(fn, ms) {
        let timer;
        return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms); };
    }
    const NODE_DETAILS_HINT = 'Klik op een node in de graaf...';

    function appendDetailRow(container, label, value) {
        const row = document.createElement('div');
        const lEl = document.createElement('div');
        const vEl = document.createElement('div');
        row.className = 'detail-row';
        lEl.className = 'detail-label';
        vEl.className = 'detail-value';
        lEl.textContent = label;
        vEl.textContent = value;
        row.append(lEl, vEl);
        container.appendChild(row);
    }

    function clearNodeDetails(showHint = false) {
        const content = document.getElementById('node-details-content');
        if (!content) return;
        content.innerHTML = showHint ? `<p class="detail-hint">${NODE_DETAILS_HINT}</p>` : '';
    }

    function isMobileLayout() {
        return window.innerWidth <= 850;
    }

    function updateLayoutMetrics() {
        const header = document.querySelector('header');
        if (!header) return;
        document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
    }

    // ── GEXF parser ───────────────────────────────────────────────────────
    function parseGexf(xml) {
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        const NS  = 'http://www.gexf.net/1.2draft';
        const nodes = [], edges = [], nodeAttrs = new Map();

        for (const node of doc.getElementsByTagNameNS(NS, 'node')) {
            const attrs = getAttrs(node, NS);
            const id    = node.getAttribute('id');
            nodes.push({
                id,
                label:     node.getAttribute('label'),
                color:     attrs[ATTR_COLOR]     || '#97C2FC',
                definitie: attrs[ATTR_DEFINITIE] || '',
                node_type: attrs['0']            || 'onbekend',
            });
            nodeAttrs.set(id, attrs);
        }
        for (const edge of doc.getElementsByTagNameNS(NS, 'edge')) {
            const rel   = edge.getAttribute('label') || '';
            const color = RELATIES[rel]?.color || '#ccc';
            edges.push({
                id:      String(edge.getAttribute('id')),
                from:    edge.getAttribute('source'),
                to:      edge.getAttribute('target'),
                relatie: rel,
                arrows:  'to',
                color:   { color, highlight: color, hover: color },
                title:   rel || undefined,
            });
        }
        return { nodes, edges, doc, nodeAttrs };
    }

    function getAttrs(nodeEl, NS) {
        const map = {};
        for (const av of nodeEl.getElementsByTagNameNS(NS, 'attvalue')) {
            map[av.getAttribute('for')] = av.getAttribute('value');
        }
        return map;
    }

    function getNodeAttrs(nodeId) {
        return App.nodeAttrsById.get(String(nodeId)) || {};
    }

    // ── Termijn uit GEXF ──────────────────────────────────────────────────
    function getTermijnDagen() {
        const attrs = getNodeAttrs('begrippen/zes-weken');
        const def   = (attrs[ATTR_DEFINITIE] || '').toLowerCase();
        const match = def.match(/(?:zes|6|(\d+))\s+(?:\w+\s+)?(?:weken|dagen)/);
        if (match) {
            const raw    = match[0];
            const weken  = raw.includes('weken');
            const numStr = raw.match(/\d+/);
            const n      = numStr ? parseInt(numStr[0]) : (raw.includes('zes') ? 6 : 42);
            return weken ? n * 7 : n;
        }
        return 42;
    }

    function getTermijnBedragen(totaalBedrag, aantalTermijnen) {
        if (!Number.isInteger(totaalBedrag) || totaalBedrag < 0 || aantalTermijnen <= 0) {
            return null;
        }

        const basis = Math.ceil(totaalBedrag / aantalTermijnen);
        const bedragen = Array(aantalTermijnen).fill(basis);
        let overschot = basis * aantalTermijnen - totaalBedrag;
        let idx = aantalTermijnen - 1;

        while (overschot > 0 && idx >= 0) {
            bedragen[idx] -= 1;
            overschot -= 1;
            idx -= 1;
        }

        return bedragen;
    }

    function formatCurrency(value) {
        return Number(value).toLocaleString('nl-NL', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }

    // ── Invorderbaarheidsberekening (uitgebreid met Leidraad) ──────────────
    function getAtwStatus() {
        const toelichting = (getNodeAttrs('begrippen/zes-weken')[ATTR_TOELICHTING_KLASSE] || '').toLowerCase();
        return toelichting.includes('algemene termijnenwet niet van toepassing')
            ? 'Uitgesloten (Art. 9 lid 10 IW 1990)'
            : 'Toepasbaar';
    }

    function checkInvorderbaarheid(dagtekening, peildatum, options = {}) {
        const attrs = getNodeAttrs('begrippen/zes-weken');
        const bron  = attrs[ATTR_BRON] || 'Art. 9 IW 1990';
        const dagen       = getTermijnDagen();
        let deadline      = new Date(dagtekening);
        deadline.setDate(deadline.getDate() + dagen);

        let meta_bron = bron;
        let route = LID1_ROUTE;

        if (options.isVoorlopig) {
            if (options.afwijkendBoekjaar) {
                const lastDay = new Date(deadline.getFullYear(), deadline.getMonth() + 1, 0).getDate();
                deadline.setDate(lastDay);
                meta_bron = "§ 9.1 LI 2008 (Afwijkend boekjaar)";
                route = LI_9_1B_ROUTE;
            } else if (dagtekening.getMonth() <= 10) {
                const eindeJaar = new Date(dagtekening.getFullYear(), 11, 31);
                if (deadline < eindeJaar) {
                    deadline = eindeJaar;
                    meta_bron = "§ 9.1 LI 2008 (31 december regel)";
                    route = LI_9_1_ROUTE;
                }
            }
        }

        return { invorderbaar: peildatum >= deadline, deadline, dagen, bron: meta_bron, atw: getAtwStatus(), route };
    }

    // ── Lid-5-berekening (AR-9-5a t/m AR-9-5e) ───────────────────────────
    function checkInvorderbaarheidLid5(dagtekening, peildatum, options = {}) {
        const totaalBedrag = (options.totaalBedrag !== undefined && options.totaalBedrag !== null)
            ? Number(options.totaalBedrag)
            : null;

        const maand = dagtekening.getMonth() + 1;
        const eindmaand = (options.afwijkendBoekjaar && options.boekjaarEindmaand != null)
            ? options.boekjaarEindmaand
            : 12;
        const resterendeMaanden = options.afwijkendBoekjaar
            ? (eindmaand - maand + 12) % 12
            : 12 - maand;

        // AR-9-5e: terugval naar lid 1 als termijnen <= 1
        if (resterendeMaanden <= 1) {
            const result = checkInvorderbaarheid(dagtekening, peildatum, options);
            if (result.route === LI_9_1_ROUTE) {
                result.route = [
                    ...LID5_ROUTE_TERUGVAL,
                    'annotaties/li2008/art9-9-1', 'regels/AR-LI-9-1a', 'begrippen/vervaldag-31-december',
                ];
            } else if (result.route === LI_9_1B_ROUTE) {
                result.route = [
                    ...LID5_ROUTE_TERUGVAL,
                    'annotaties/li2008/art9-9-1', 'regels/AR-LI-9-1b', 'begrippen/vervaldag-laatste-dag-maand',
                ];
            } else {
                result.route = LID5_ROUTE_TERUGVAL;
            }
            return result;
        }

        // AR-9-5c + AR-9-5d
        const lasteDagDagtekening = new Date(dagtekening.getFullYear(), dagtekening.getMonth() + 1, 0).getDate();
        const dagIsLaatste = dagtekening.getDate() === lasteDagDagtekening;
        const termijnen = [];
        for (let i = 1; i <= resterendeMaanden; i++) {
            const jaar = dagtekening.getFullYear();
            const maandIdx = dagtekening.getMonth() + i;
            const lasteDagDoelmaand = new Date(jaar, maandIdx + 1, 0).getDate();
            const dag = dagIsLaatste ? lasteDagDoelmaand : Math.min(dagtekening.getDate(), lasteDagDoelmaand);
            termijnen.push(new Date(jaar, maandIdx, dag));
        }

        // LI 2008 § 9.1 correctie op de LAATSTE termijn
        const laatsteIdx = termijnen.length - 1;
        let meta_bron = "";
        let route = LID5_ROUTE_NORMAAL;

        if (options.afwijkendBoekjaar) {
            const lastDay = new Date(termijnen[laatsteIdx].getFullYear(), termijnen[laatsteIdx].getMonth() + 1, 0).getDate();
            termijnen[laatsteIdx].setDate(lastDay);
            meta_bron = " (Corr. § 9.1 LI 2008: Afwijkend boekjaar)";
            route = LID5_LI_9_1B_ROUTE;
        } else if (dagtekening.getMonth() <= 10) {
            const eindeJaar = new Date(dagtekening.getFullYear(), 11, 31);
            if (termijnen[laatsteIdx] < eindeJaar) {
                termijnen[laatsteIdx] = eindeJaar;
                meta_bron = " (Corr. § 9.1 LI 2008: 31 december regel)";
                route = LID5_LI_9_1_ROUTE;
            }
        }

        const bronNode = getNodeAttrs('begrippen/invorderbaarheid-in-gelijke-termijnen');
        const bron = (bronNode['10'] || bronNode['11'] || 'Art. 9 lid 5 IW 1990') + meta_bron;

        const result = {
            invorderbaar: peildatum >= termijnen[0],
            termijnen,
            resterendeMaanden,
            bron,
            atw: getAtwStatus(),
            lid5: true,
            terugvalLid1: false,
            route,
        };

        if (Number.isInteger(totaalBedrag) && totaalBedrag >= 0) {
            result.totaalBedrag = totaalBedrag;
            result.termijnBedragen = getTermijnBedragen(totaalBedrag, termijnen.length);
        }

        return result;
    }

    function syncPhysicsControlsFromState() {
        document.getElementById('physics-toggle').checked = App.physicsEnabled;
        document.querySelector('.toggle-control__text').textContent =
            App.physicsEnabled ? 'Physics actief' : 'Physics inactief';
        document.getElementById('gravitational-constant').value = String(App.physicsSettings.gravitationalConstant);
        document.getElementById('central-gravity').value = String(App.physicsSettings.centralGravity);
        document.getElementById('avoid-overlap').value = String(App.physicsSettings.avoidOverlap);
        document.getElementById('gravitational-value').textContent = String(App.physicsSettings.gravitationalConstant);
        document.getElementById('central-value').textContent = App.physicsSettings.centralGravity.toFixed(2);
        document.getElementById('avoid-overlap-value').textContent = App.physicsSettings.avoidOverlap.toFixed(2);
    }

    function persistPhysicsSettings() {
        localStorage.setItem(PHYSICS_STORAGE_KEY, JSON.stringify({
            gravitationalConstant: App.physicsSettings.gravitationalConstant,
            centralGravity: App.physicsSettings.centralGravity,
            avoidOverlap: App.physicsSettings.avoidOverlap,
            physicsEnabled: App.physicsEnabled,
        }));
    }

    function loadPhysicsSettings() {
        const saved = localStorage.getItem(PHYSICS_STORAGE_KEY);
        if (!saved) {
            App.physicsSettings = { ...DEFAULT_PHYSICS_SETTINGS };
            App.physicsEnabled = false;
            syncPhysicsControlsFromState();
            return;
        }

        try {
            const parsed = JSON.parse(saved);
            App.physicsSettings = {
                ...DEFAULT_PHYSICS_SETTINGS,
                gravitationalConstant: Number.isFinite(parsed.gravitationalConstant) ? parsed.gravitationalConstant : (Number.isFinite(parsed.gravitational) ? parsed.gravitational : DEFAULT_PHYSICS_SETTINGS.gravitationalConstant),
                centralGravity: Number.isFinite(parsed.centralGravity) ? parsed.centralGravity : (Number.isFinite(parsed.central) ? parsed.central : DEFAULT_PHYSICS_SETTINGS.centralGravity),
                avoidOverlap: Number.isFinite(parsed.avoidOverlap) ? parsed.avoidOverlap : (typeof parsed.avoidOverlap === 'boolean' ? (parsed.avoidOverlap ? 0.35 : 0) : DEFAULT_PHYSICS_SETTINGS.avoidOverlap),
            };
            App.physicsEnabled = Boolean(parsed.physicsEnabled);
        } catch (error) {
            App.physicsSettings = { ...DEFAULT_PHYSICS_SETTINGS };
            App.physicsEnabled = false;
        }

        syncPhysicsControlsFromState();
    }

    function createNetworkOptions() {
        const settings = App.physicsSettings;
        return {
            autoResize: true,
            nodes: {
                shape: 'dot',
                size: 16,
                font: { size: 12 },
            },
            edges: {
                smooth: {
                    type: 'continuous',
                    roundness: 0.25,
                }
            },
            interaction: {
                hover: true,
                tooltipDelay: 80,
            },
            physics: {
                enabled: true,
                solver: 'forceAtlas2Based',
                stabilization: {
                    enabled: true,
                    iterations: INITIAL_STABILIZATION_ITERATIONS,
                    updateInterval: 25,
                    onlyDynamicEdges: false,
                    fit: false,
                },
                adaptiveTimestep: true,
                forceAtlas2Based: {
                    gravitationalConstant: settings.gravitationalConstant,
                    centralGravity: settings.centralGravity,
                    springLength: settings.springLength,
                    springConstant: settings.springConstant,
                    damping: settings.damping,
                    avoidOverlap: settings.avoidOverlap,
                }
            }
        };
    }

    function applyPhysicsSettings(settings = App.physicsSettings, { enablePhysics = App.physicsEnabled } = {}) {
        App.physicsSettings = {
            ...App.physicsSettings,
            ...settings,
        };
        App.physicsEnabled = enablePhysics;
        syncPhysicsControlsFromState();
        persistPhysicsSettings();

        if (!App.network) return;

        App.network.setOptions({
            physics: {
                enabled: enablePhysics,
                solver: 'forceAtlas2Based',
                stabilization: {
                    enabled: true,
                    iterations: INITIAL_STABILIZATION_ITERATIONS,
                    updateInterval: 25,
                    onlyDynamicEdges: false,
                    fit: false,
                },
                adaptiveTimestep: true,
                forceAtlas2Based: {
                    gravitationalConstant: App.physicsSettings.gravitationalConstant,
                    centralGravity: App.physicsSettings.centralGravity,
                    springLength: App.physicsSettings.springLength,
                    springConstant: App.physicsSettings.springConstant,
                    damping: App.physicsSettings.damping,
                    avoidOverlap: App.physicsSettings.avoidOverlap,
                }
            }
        });
    }

    function disablePhysicsAndFreeze() {
        if (!App.network) return;
        App.network.stopSimulation();
        App.network.setOptions({ physics: { enabled: false } });
        App.physicsEnabled = false;
        App.isStabilizing = false;
        App.dragPhysicsActive = false;
        syncPhysicsControlsFromState();
        persistPhysicsSettings();
    }

    function scheduleFitToView({ animate = true, padding = 60 } = {}) {
        if (!App.network) return;
        App.network.fit({
            padding: padding,
            animation: animate ? {
                duration: 600,
                easingFunction: 'easeInOutQuad',
            } : false
        });
    }

    function runInitialStabilization(onDone) {
        if (!App.network || App.isStabilizing) return;
        
        const loader = document.getElementById('loader');
        if (loader) {
            loader.textContent = 'Lay-out optimaliseren...';
            loader.style.display = 'flex';
        }

        App.isStabilizing = true;
        App.physicsEnabled = true;
        
        // Forceer de engine instellingen
        applyPhysicsSettings(App.physicsSettings, { enablePhysics: true });
        
        App.network.once('stabilizationIterationsDone', () => {
            disablePhysicsAndFreeze();
            App.hasInitialFitCompleted = true;
            scheduleFitToView({ animate: true });
            
            if (loader) loader.style.display = 'none';
            if (onDone) onDone();
        });
        
        App.network.stabilize(INITIAL_STABILIZATION_ITERATIONS);
    }

    function enablePhysicsTemporarily() {
        if (!App.network) return;
        App.dragPhysicsActive = true;
        applyPhysicsSettings(App.physicsSettings, { enablePhysics: true });
        App.network.startSimulation();
    }

    function createNetwork(container) {
        return new vis.Network(container, { nodes: App.nodesDS, edges: App.edgesDS }, createNetworkOptions());
    }

    function updateGraphMeta(doc, parsed) {
        const NS      = 'http://www.gexf.net/1.2draft';
        const metaEl  = doc.getElementsByTagNameNS(NS, 'meta')[0];
        const lastmod = metaEl?.getAttribute('lastmodifieddate') || '—';
        document.getElementById('graph-meta').innerHTML =
            `<strong>Art. 9 IW 1990</strong><br>${parsed.nodes.length} nodes · Bijgewerkt: ${lastmod}`;
        document.getElementById('legend-mobile-graph-info').innerHTML =
            `${parsed.nodes.length} nodes · Bijgewerkt: ${lastmod}`;
    }

    function attachNetworkEventHandlers() {
        const tooltip = document.getElementById('node-tooltip');
        const isTouchDevice = window.matchMedia('(hover: none)').matches;

        App.network.on('selectNode', ({ nodes }) => {
            if (nodes.length) showNodeDetails(nodes[0]);
        });
        App.network.on('selectEdge', ({ edges }) => {
            if (edges.length) showEdgeDetails(edges[0]);
        });
        App.network.on('deselectNode', () => clearNodeDetails(true));
        App.network.on('deselectEdge', () => clearNodeDetails(true));
        App.network.on('click', (params) => {
            if (params.nodes.length) showNodeDetails(params.nodes[0]);
            else if (params.edges.length) showEdgeDetails(params.edges[0]);
            else clearNodeDetails(true);
        });
        App.network.on('dragStart', ({ nodes }) => {
            if (!nodes.length || App.physicsEnabled) return;
            enablePhysicsTemporarily();
        });
        App.network.on('dragEnd', () => {
            if (!App.dragPhysicsActive) return;
            App.network.once('stabilizationIterationsDone', disablePhysicsAndFreeze);
            App.network.stabilize(DRAG_STABILIZATION_ITERATIONS);
        });

        if (!isTouchDevice) {
            App.network.on('hoverNode', (params) => {
                const node = App.nodesDS.get(params.node);
                if (!node || !node.definitie) return;
                tooltip.textContent = node.definitie;
                tooltip.style.display = 'block';
                requestAnimationFrame(() => {
                    const x = params.pointer.DOM.x + 14;
                    const y = params.pointer.DOM.y + 14;
                    const tw = tooltip.offsetWidth;
                    const th = tooltip.offsetHeight;
                    tooltip.style.left = `${x + tw > window.innerWidth ? x - tw - 28 : x}px`;
                    tooltip.style.top = `${y + th > window.innerHeight ? y - th - 28 : y}px`;
                });
            });
            App.network.on('blurNode', () => {
                tooltip.style.display = 'none';
            });
        }
    }

    function handleWindowResize() {
        updateLayoutMetrics();
        if (App.resizeRaf) cancelAnimationFrame(App.resizeRaf);
        App.resizeRaf = requestAnimationFrame(() => {
            if (window.innerWidth > 850 && App.popupController) {
                App.popupController.closeAll();
            }
            if (!App.network) return;
            App.network.redraw();
            if (!App.physicsEnabled && !App.dragPhysicsActive && App.hasInitialFitCompleted) {
                scheduleFitToView({ animate: false });
            }
        });
    }

    function attachViewportEventHandlers() {
        window.addEventListener('resize', handleWindowResize, { passive: true });
        window.addEventListener('orientationchange', handleWindowResize, { passive: true });
        document.addEventListener('fullscreenchange', handleFullscreenChange);
    }

    async function initGraph() {
        const container = document.getElementById('mynetwork');

        try {
            const response = await fetch('graph.gexf');
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const xml = await response.text();
            const parsed = parseGexf(xml);
            App.graphData     = { nodes: parsed.nodes, edges: parsed.edges };
            App.nodeById      = new Map(parsed.nodes.map(n => [n.id, n]));
            App.edgeById      = new Map(parsed.edges.map(e => [e.id, e]));
            App.nodeAttrsById = parsed.nodeAttrs;
            App.gexfDoc       = parsed.doc;

            App.nodesDS.clear();
            App.edgesDS.clear();
            App.nodesDS.add(parsed.nodes);
            App.edgesDS.add(parsed.edges);

            updateGraphMeta(parsed.doc, parsed);
            App.network = createNetwork(container);
            attachNetworkEventHandlers();
            
            // Start stabilisatie (loader wordt in runInitialStabilization beheerd)
            runInitialStabilization();
        } catch (error) {
            const loader = document.getElementById('loader');
            if (loader) loader.textContent = `Fout bij laden graaf: ${error.message}`;
            return;
        }

        document.getElementById('btn-zoom-in').addEventListener('click', () => {
            App.network.moveTo({ scale: App.network.getScale() * 1.2 });
        });
        document.getElementById('btn-zoom-out').addEventListener('click', () => {
            App.network.moveTo({ scale: App.network.getScale() * 0.83 });
        });
        document.getElementById('btn-fit').addEventListener('click', () => {
            scheduleFitToView({ animate: true });
        });
        document.getElementById('btn-fullscreen').addEventListener('click', toggleFullscreen);
    }

    function resetGraph() {
        if (!App.network || !App.graphData.nodes.length) return;
        App.nodesDS.update(App.graphData.nodes.map(n => ({
            id: n.id, size: 16, borderWidth: 1, color: n.color, font: { color: '#343434' },
        })));
        App.edgesDS.update(App.graphData.edges.map(e => ({
            id: e.id, color: e.color, width: 1,
        })));
        scheduleFitToView({ animate: true });
    }

    function resetResultPanel() {
        const panel = document.getElementById('result-panel');
        const termijnenLijst = document.getElementById('termijnen-lijst');
        if (!panel || !termijnenLijst) return;

        panel.style.display = 'none';
        panel.className = '';
        document.getElementById('status-header').textContent = '';
        document.getElementById('deadline-info').textContent = '';
        document.getElementById('termijnbedrag-info').textContent = '';
        document.getElementById('meta-info').textContent = '';
        termijnenLijst.style.display = 'none';
        termijnenLijst.querySelector('tbody').innerHTML = '';
    }

    function resetHomeView() {
        App.activeRoute = LID1_ROUTE;
        if (App.popupController) App.popupController.closeAll();
        if (App.network) App.network.unselectAll();
        clearNodeDetails(true);
        resetResultPanel();
        openTab('calc');

        const sel = document.getElementById('aanslagtype');
        const existing = sel.querySelector('option[value=""]');
        if (existing) existing.remove();
        const placeholder = new Option('— Selecteer aanslagtype —', '');
        placeholder.disabled = true;
        placeholder.selected = true;
        sel.insertBefore(placeholder, sel.firstChild);
        sel.value = '';
        document.getElementById('voorlopig-opties').style.display = 'none';
        document.getElementById('totaalbedrag-wrapper').style.display = 'none';
        
        // Data herstellen
        if (App.network && App.graphData.nodes.length) {
            App.nodesDS.clear();
            App.edgesDS.clear();
            
            // Door x:0, y:0 te geven, voorkomen we de cirkel-lay-out flash.
            const centerNodes = App.graphData.nodes.map(n => ({ ...n, x: 0, y: 0 }));
            App.nodesDS.add(centerNodes);
            App.edgesDS.add(App.graphData.edges);

            // Sla gebruikersinstellingen op vóór tijdelijke stabilisatiereset
            const savedSettings = { ...App.physicsSettings };
            const savedEnabled = App.physicsEnabled;
            App.physicsSettings = { ...DEFAULT_PHYSICS_SETTINGS };

            runInitialStabilization(() => {
                App.physicsSettings = savedSettings;
                App.physicsEnabled = savedEnabled;
                syncPhysicsControlsFromState();
                persistPhysicsSettings();
            });
        }
    }

    // ── Physics controls ─────────────────────────────────────────────────
    function updatePhysics() {
        applyPhysicsSettings({
            gravitationalConstant: parseInt(document.getElementById('gravitational-constant').value, 10),
            centralGravity: parseFloat(document.getElementById('central-gravity').value),
            avoidOverlap: parseFloat(document.getElementById('avoid-overlap').value),
        }, { enablePhysics: App.physicsEnabled });
    }

    const PHYSICS_PRESETS = {
        compact:   { gravitationalConstant: -100, centralGravity: 0.15, avoidOverlap: 1.0, springLength: 60 },
        clustered: { gravitationalConstant: -400, centralGravity: 0.05, avoidOverlap: 0.6, springLength: 160 },
        spread:    { gravitationalConstant: -1200, centralGravity: 0.01, avoidOverlap: 0.8, springLength: 350 }
    };

    function applyPreset(type) {
        const settings = PHYSICS_PRESETS[type];
        if (!settings) return;
        
        App.physicsSettings = { ...App.physicsSettings, ...settings };
        applyPhysicsSettings(App.physicsSettings, { enablePhysics: true });
        
        if (App.network) {
            App.network.startSimulation();
            App.network.stabilize(RESET_STABILIZATION_ITERATIONS);
            // Na stabilisatie weer bevriezen volgens de lifecycle
            App.network.once('stabilizationIterationsDone', () => {
                disablePhysicsAndFreeze();
            });
        }
    }

    function resetPhysicsDefaults() {
        applyPhysicsSettings({ ...DEFAULT_PHYSICS_SETTINGS }, { enablePhysics: true });
        if (App.network) {
            App.network.startSimulation();
            App.network.stabilize(RESET_STABILIZATION_ITERATIONS);
            App.network.once('stabilizationIterationsDone', () => {
                disablePhysicsAndFreeze();
                scheduleFitToView({ animate: true });
            });
        }
    }

    // ── Fullscreen functionaliteit ───────────────────────────────────────
    function toggleFullscreen() {
        const container = document.getElementById('graph-container');
        
        // Native Fullscreen API
        if (container.requestFullscreen) {
            if (!document.fullscreenElement) {
                container.requestFullscreen().catch(() => {
                    // Fallback naar pseudo-fullscreen als native faalt (bijv. op sommige mobiele browsers)
                    enterPseudoFullscreen(container);
                });
            } else {
                document.exitFullscreen();
            }
        } else {
            // Geen native ondersteuning (oudere iOS?), gebruik pseudo-fullscreen
            if (!container.classList.contains('pseudo-fullscreen')) {
                enterPseudoFullscreen(container);
            } else {
                exitPseudoFullscreen(container);
            }
        }
    }

    function enterPseudoFullscreen(container) {
        container.classList.add('pseudo-fullscreen');
        document.body.style.overflow = 'hidden';
        handleFullscreenChange();
    }

    function exitPseudoFullscreen(container) {
        container.classList.remove('pseudo-fullscreen');
        document.body.style.overflow = '';
        handleFullscreenChange();
    }

    function handleFullscreenChange() {
        const fsBtn = document.getElementById('btn-fullscreen');
        const container = document.getElementById('graph-container');
        if (fsBtn && container) {
            const isFS = document.fullscreenElement || container.classList.contains('pseudo-fullscreen');
            fsBtn.innerHTML = isFS ? '✕' : '⛶';
            fsBtn.title = isFS ? 'Fullscreen afsluiten' : 'Fullscreen';
        }

        if (!App.network || !container) return;
        const observer = new ResizeObserver(() => {
            observer.disconnect();
            updateLayoutMetrics();
            App.network.redraw();
            if (!App.dragPhysicsActive) scheduleFitToView({ animate: false });
        });
        observer.observe(container);
    }

    // ── Mobile sidebar ───────────────────────────────────────────────────
    // Sidebar is now always visible on mobile, no toggle needed

    function highlightRoute() {
        if (!App.graphData.nodes.length || !App.network) return;
        const routeSet = new Set(App.activeRoute);

        App.nodesDS.update(App.graphData.nodes.map(n => ({
            id: n.id,
            size: routeSet.has(n.id) ? 26 : 10,
            borderWidth: routeSet.has(n.id) ? 4 : 1,
            color: routeSet.has(n.id)
                ? { border: '#007bc7', background: n.color }
                : { border: '#d0d0d0', background: '#f0f0f0' },
            font: { color: routeSet.has(n.id) ? '#343434' : '#c0c0c0' },
        })));

        App.edgesDS.update(App.graphData.edges.map(e => ({
            id: e.id,
            color: (routeSet.has(e.from) && routeSet.has(e.to))
                ? e.color
                : { color: '#e8e8e8', highlight: '#e8e8e8', hover: '#e8e8e8' },
            width: (routeSet.has(e.from) && routeSet.has(e.to)) ? 2 : 1,
        })));

        const routeIds = App.graphData.nodes.filter(n => routeSet.has(n.id)).map(n => n.id);
        if (routeIds.length) {
            App.network.fit({ nodes: routeIds, animation: { duration: 400, easingFunction: 'easeInOutQuad' } });
        }
    }

    function calculate() {
        if (!App.gexfDoc) return;
        const dagVal = document.getElementById('dagtekening').value;
        const peilVal = document.getElementById('peildatum').value;
        if (!dagVal || !peilVal) return;
        if (!document.getElementById('aanslagtype').value) return;

        const dag = parseLocalDate(dagVal);
        const peil = parseLocalDate(peilVal);
        const aanslagtype = document.getElementById('aanslagtype').value;
        const isVoorlopig = aanslagtype.startsWith('voorlopig');
        const afwijkendBoekjaar = document.getElementById('afwijkend-boekjaar').checked;
        const vaststellingsjaar = document.getElementById('dagtekening-in-vaststellingsjaar').checked;
        const totaalBedragRaw = document.getElementById('totaalbedrag').value.trim();
        const totaalBedrag = isVoorlopig && totaalBedragRaw !== '' ? Number(totaalBedragRaw) : null;

        const panel = document.getElementById('result-panel');
        const termijnenLijst = document.getElementById('termijnen-lijst');
        const termijnBedragInfo = document.getElementById('termijnbedrag-info');

        if (isVoorlopig && !vaststellingsjaar) {
            panel.style.display = 'block'; panel.className = '';
            document.getElementById('status-header').textContent = 'Voorwaarde niet vervuld';
            document.getElementById('deadline-info').textContent = 'Dagtekening buiten vaststellingsjaar: raadpleeg Art. 9 lid 7 IW 1990.';
            termijnenLijst.style.display = 'none';
            termijnBedragInfo.textContent = '';
            return;
        }

        if (isVoorlopig && totaalBedrag !== null && (!Number.isInteger(totaalBedrag) || totaalBedrag < 0)) {
            document.getElementById('status-header').textContent = 'Ongeldig totaalbedrag';
            document.getElementById('deadline-info').textContent = 'Voer een heel eurobedrag in voor het totaalbedrag.';
            termijnenLijst.style.display = 'none';
            termijnBedragInfo.textContent = '';
            panel.style.display = 'block';
            panel.className = 'niet-invorderbaar';
            return;
        }

        const boekjaarEindmaand = (afwijkendBoekjaar && document.getElementById('boekjaar-eindmaand'))
            ? parseInt(document.getElementById('boekjaar-eindmaand').value, 10)
            : null;
        const opts = { isVoorlopig, afwijkendBoekjaar, totaalBedrag, boekjaarEindmaand };
        const res = isVoorlopig ? checkInvorderbaarheidLid5(dag, peil, opts) : checkInvorderbaarheid(dag, peil, opts);
        App.activeRoute = res.route;

        panel.style.display = 'block';
        panel.className = res.invorderbaar ? 'invorderbaar' : 'niet-invorderbaar';
        document.getElementById('status-header').textContent = res.invorderbaar ? 'INVORDERBAAR' : 'NIET INVORDERBAAR';

        if (res.termijnen) {
            document.getElementById('deadline-info').textContent = `Eerste termijn: ${formatDatum(res.termijnen[0])} (${res.resterendeMaanden} termijnen)`;
            const tbody = termijnenLijst.querySelector('tbody');
            tbody.innerHTML = '';
            res.termijnen.forEach((d, i) => {
                const tr = document.createElement('tr');
                tr.className = peil >= d ? 'termijn-vervallen' : 'termijn-toekomst';
                const td1 = document.createElement('td');
                td1.textContent = i + 1;
                const td2 = document.createElement('td');
                td2.textContent = formatDatum(d);
                const td3 = document.createElement('td');
                td3.textContent = res.termijnBedragen ? '€' + formatCurrency(res.termijnBedragen[i]) : '–';
                const td4 = document.createElement('td');
                td4.textContent = peil >= d ? 'Vervallen' : 'Open';
                tr.appendChild(td1);
                tr.appendChild(td2);
                tr.appendChild(td3);
                tr.appendChild(td4);
                tbody.appendChild(tr);
            });
            termijnenLijst.style.display = 'block';
        } else {
            document.getElementById('deadline-info').textContent = 'Vervaldatum: ' + formatDatum(res.deadline);
            termijnenLijst.style.display = 'none';
            termijnBedragInfo.textContent = '';
        }

        if (res.termijnBedragen) {
            const gelijk = res.termijnBedragen.every(v => v === res.termijnBedragen[0]);
            const termijnSummary = gelijk
                ? `Elke termijn: €${formatCurrency(res.termijnBedragen[0])}`
                : `Termijnen (hoog beginnen): eerste €${formatCurrency(res.termijnBedragen[0])}, laatste €${formatCurrency(res.termijnBedragen[res.termijnBedragen.length - 1])}`;
            termijnBedragInfo.textContent = `Totaalbedrag: €${formatCurrency(res.totaalBedrag)} • ${termijnSummary}`;
        } else {
            termijnBedragInfo.textContent = '';
        }

        const atwTekst = res.atw ? ` • ATW: ${res.atw}` : '';
        document.getElementById('meta-info').textContent = 'Bron: ' + res.bron + atwTekst;
        highlightRoute();
    }

    const NODE_ATTR_LABEL_OVERRIDES = {
        '0': 'node_type',
        '1': 'jas_klasse',
        '2': 'kleur',
        '3': 'artikel',
        '4': 'bwb_id',
        '5': 'peildatum',
        '6': 'structuurpositie',
        '7': 'kruisreferenties',
        '8': 'begripsnaam',
        '9': 'markering',
        '10': 'bron',
        '11': 'bronnen',
        '12': 'interpretatiemethode',
        '13': 'toelichting_klasse',
        '14': 'definitie',
        '15': 'soort',
        '16': 'herkomst',
        '17': 'geldigheid_van',
        '18': 'geldigheid_tot',
        '19': 'status',
        '20': 'is_een',
        '21': 'heeft',
        '22': 'leidt_tot',
        '23': 'afleidingsregels',
        '24': 'regel_id',
        '25': 'naam',
        '26': 'operators',
        '27': 'bronreferentie'
    };

    function resolveNodeAttrLabel(attrId) {
        return NODE_ATTR_LABEL_OVERRIDES[attrId] || `attribuut ${attrId}`;
    }

    function showNodeDetails(nodeId) {
        const node = App.nodeById.get(String(nodeId));
        const attrs = getNodeAttrs(nodeId);
        const content = document.getElementById('node-details-content');
        content.innerHTML = '';
        appendDetailRow(content, 'id', String(nodeId));
        if (node?.label) appendDetailRow(content, 'label', node.label);
        for (const [k, v] of Object.entries(attrs)) {
            if (!v || v === '[]') continue;
            appendDetailRow(content, resolveNodeAttrLabel(k), v);
        }
        openTab('details');
        if (isMobileLayout() && App.popupController) App.popupController.open('details');
    }

    function showEdgeDetails(edgeId) {
        const edge = App.edgeById.get(String(edgeId));
        if (!edge) return;
        const content = document.getElementById('node-details-content');
        content.textContent = '';
        const div = document.createElement('div');
        div.innerHTML = `<strong>Relatie:</strong> ${escapeHtml(edge.relatie)}<br><strong>Van:</strong> ${escapeHtml(edge.from)}<br><strong>Naar:</strong> ${escapeHtml(edge.to)}`;
        content.appendChild(div);
        openTab('details');
        if (isMobileLayout() && App.popupController) App.popupController.open('details');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function openTab(id) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const active = btn.dataset.tab === id;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        document.getElementById(id).classList.add('active');
    }

    function initTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => openTab(btn.dataset.tab));
        });
    }

    function initDates() {
        const today = getTodayLocal();
        document.getElementById('dagtekening').value = today;
        document.getElementById('peildatum').value = today;
    }

    (function initAanslagtypePlaceholder() {
        const sel = document.getElementById('aanslagtype');
        const placeholder = new Option('— Selecteer aanslagtype —', '');
        placeholder.disabled = true;
        placeholder.selected = true;
        sel.insertBefore(placeholder, sel.firstChild);
        sel.value = '';
    })();

    document.getElementById('aanslagtype').addEventListener('change', function() {
        const placeholder = this.querySelector('option[value=""]');
        if (placeholder) placeholder.remove();
        const isVoorlopig = this.value.startsWith('voorlopig');
        document.getElementById('voorlopig-opties').style.display = isVoorlopig ? 'block' : 'none';
        document.getElementById('totaalbedrag-wrapper').style.display = isVoorlopig ? 'block' : 'none';
        calculate();
    });
    const debouncedCalculate = debounce(calculate, 150);

    document.getElementById('home-btn').addEventListener('click', resetHomeView);
    document.getElementById('totaalbedrag').addEventListener('input', debouncedCalculate);
    document.getElementById('dagtekening').addEventListener('input', debouncedCalculate);
    document.getElementById('peildatum').addEventListener('input', debouncedCalculate);
    document.getElementById('afwijkend-boekjaar').addEventListener('change', (e) => {
        document.getElementById('boekjaar-eindmaand-wrapper').style.display = e.target.checked ? 'block' : 'none';
        calculate();
    });
    document.getElementById('boekjaar-eindmaand').addEventListener('change', calculate);
    document.getElementById('dagtekening-in-vaststellingsjaar').addEventListener('change', calculate);

    // Physics controls
    document.getElementById('physics-toggle').addEventListener('change', (event) => {
        const enablePhysics = event.target.checked;
        event.target.closest('.toggle-control').querySelector('.toggle-control__text').textContent =
            enablePhysics ? 'Physics actief' : 'Physics inactief';
        applyPhysicsSettings(App.physicsSettings, { enablePhysics });
        if (!App.network) return;
        if (enablePhysics) {
            App.network.startSimulation();
        } else {
            disablePhysicsAndFreeze();
        }
    });
    document.getElementById('gravitational-constant').addEventListener('input', updatePhysics);
    document.getElementById('central-gravity').addEventListener('input', updatePhysics);
    document.getElementById('avoid-overlap').addEventListener('input', updatePhysics);
    document.getElementById('btn-reset-physics').addEventListener('click', resetPhysicsDefaults);
    
    // Preset buttons
    document.getElementById('btn-preset-compact').addEventListener('click', () => applyPreset('compact'));
    document.getElementById('btn-preset-clustered').addEventListener('click', () => applyPreset('clustered'));
    document.getElementById('btn-preset-spread').addEventListener('click', () => applyPreset('spread'));
    
    // Fullscreen close (removed - toggle button now handles this)

    function initPopups() {
        const overlay = document.getElementById('legend-overlay');
        const popupClassNames = {
            'calc': 'mobile-popup-open',
            'physics': 'mobile-popup-open',
            'details': 'mobile-popup-open',
            'info': 'mobile-popup-open'
        };
        const popupButtons = Array.from(document.querySelectorAll('[data-popup-target]'));

        function setButtonState(button, isActive) {
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-expanded', isActive ? 'true' : 'false');
        }

        function closeAllPopups() {
            Object.entries(popupClassNames).forEach(([popupId, className]) => {
                const popup = document.getElementById(popupId);
                if (popup) popup.classList.remove(className);
            });
            if (overlay) overlay.classList.remove('active');
            popupButtons.forEach(button => setButtonState(button, false));
        }

        function openPopup(targetId) {
            const popup = document.getElementById(targetId);
            const openClass = popupClassNames[targetId];
            if (!popup || !openClass) return;

            const isOpen = popup.classList.contains(openClass);
            closeAllPopups();
            if (isOpen) return;

            openTab(targetId);

            popup.classList.add(openClass);
            if (overlay) overlay.classList.add('active');
            popupButtons.forEach(button => setButtonState(button, button.dataset.popupTarget === targetId));
        }

        function togglePopup(targetId) {
            const popup = document.getElementById(targetId);
            const openClass = popupClassNames[targetId];
            if (!popup || !openClass) return;

            if (popup.classList.contains(openClass)) {
                closeAllPopups();
                return;
            }

            openPopup(targetId);
        }

        App.popupController = {
            open: openPopup,
            closeAll: closeAllPopups,
        };

        popupButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                togglePopup(button.dataset.popupTarget);
            });
        });

        if (overlay) overlay.addEventListener('click', closeAllPopups);
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeAllPopups();
        });
    }

    function initPage() {
        updateLayoutMetrics();
        initTabs();
        initDates();
        initPopups();
        loadPhysicsSettings();
        attachViewportEventHandlers();
    }

    window.addEventListener('load', () => {
        initPage();
        initGraph();
    });
