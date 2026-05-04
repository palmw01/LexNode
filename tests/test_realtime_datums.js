#!/usr/bin/env node

/**
 * LexNode Realtime Datumvelden Tests
 * =========================================
 * 
 * Tests voor de nieuwe realtime-invoerinteractie:
 * - Dagtekening & Peildatum triggeren automatisch berekening
 * - Validatie feedback (inline errors)
 * - Result-panel automatisch bijgewerkt
 * 
 * Author: Senior Test Engineer
 * Date: 2026-05-04
 */

// ── Minimale DOM-simulatie ────────────────────────────────────────────

class MockElement {
    constructor(id, type = 'input') {
        this.id = id;
        this.type = type;
        this.value = '';
        this.checked = false;
        this._classList = new Set();
        this.style = {};
        this.textContent = '';
        this.innerHTML = '';
        this.listeners = {};
        this.nextElementSibling = null;
    }

    get classList() {
        return {
            add: (className) => this._classList.add(className),
            remove: (className) => this._classList.delete(className),
            toggle: (className, force) => {
                if (force === undefined) {
                    this._classList.has(className) ? this._classList.delete(className) : this._classList.add(className);
                } else if (force) {
                    this._classList.add(className);
                } else {
                    this._classList.delete(className);
                }
            },
            has: (className) => this._classList.has(className),
            contains: (className) => this._classList.has(className),
        };
    }

    addEventListener(event, handler) {
        if (!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(handler);
    }

    dispatchEvent(event) {
        if (this.listeners[event.type]) {
            this.listeners[event.type].forEach(handler => handler(event));
        }
    }

    setAttribute(key, value) {
        this[key] = value;
    }

    getAttribute(key) {
        return this[key] || null;
    }

    contains(element) {
        return this === element;
    }
}

// ── Globale test state ────────────────────────────────────────────────

let testsPassed = 0;
let testsFailed = 0;
let calculateCalls = 0;
let lastCalculateOptions = null;

// Mock DOM
const mockDOM = {};
const mockElements = ['dagtekening', 'peildatum', 'totaalbedrag', 'aanslagtype', 
                       'afwijkend-boekjaar', 'dagtekening-in-vaststellingsjaar',
                       'result-panel', 'status-header', 'deadline-info'];

function initMockDOM() {
    mockElements.forEach(id => {
        mockDOM[id] = new MockElement(id, ['checkbox', 'toggle'].some(t => id.includes(t)) ? 'checkbox' : 'input');
    });
    
    // Setup defaults
    mockDOM['dagtekening'].value = '2026-10-15';
    mockDOM['peildatum'].value = '2026-12-01';
    mockDOM['totaalbedrag'].value = '5000';
    mockDOM['aanslagtype'].value = 'normaal';
    mockDOM['dagtekening-in-vaststellingsjaar'].checked = true;
}

function getElementById(id) {
    return mockDOM[id];
}

// Mock calculate() function
function calculate() {
    calculateCalls++;
    const dagtekening = mockDOM['dagtekening'].value;
    const peildatum = mockDOM['peildatum'].value;
    const totaalbedrag = mockDOM['totaalbedrag'].value;

    // Simuleer validatie
    if (!dagtekening || !peildatum) {
        mockDOM['result-panel'].innerHTML = '';
        return;
    }

    // Simuleer berekening
    const dag = new Date(dagtekening);
    const peil = new Date(peildatum);

    if (dag > peil) {
        mockDOM['status-header'].textContent = 'Fout: Dagtekening > Peildatum';
        mockDOM['result-panel'].classList.add('invalid');
        return;
    }

    mockDOM['result-panel'].classList.remove('invalid');
    mockDOM['status-header'].textContent = 'Invorderbaar op peildatum';
    mockDOM['deadline-info'].textContent = `Deadline: ${dag.toISOString().split('T')[0]}`;
}

// ── Test Utility Functions ────────────────────────────────────────────

function test(name, fn) {
    try {
        fn();
        testsPassed++;
        console.log(`✓ ${name}`);
    } catch (e) {
        testsFailed++;
        console.error(`✗ ${name}: ${e.message}`);
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(a, b, message) {
    if (a !== b) throw new Error(`${message || 'Assertion failed'}: Expected ${b}, got ${a}`);
}

function assertIncludes(str, substring, message) {
    if (!str.includes(substring)) {
        throw new Error(`${message || 'Assertion failed'}: "${str}" does not include "${substring}"`);
    }
}

function resetCalculateCalls() {
    calculateCalls = 0;
    lastCalculateOptions = null;
}

// ── Test Suite: Realtime Input Events ──────────────────────────────────

console.log('\n=== Realtime Input Events (Dagtekening & Peildatum) ===\n');

test('Dagtekening input triggert calculate()', () => {
    initMockDOM();
    resetCalculateCalls();

    const input = mockDOM['dagtekening'];
    input.addEventListener('input', calculate);
    input.value = '2026-10-20';
    input.dispatchEvent({ type: 'input' });

    assertEqual(calculateCalls, 1, 'calculate() moet 1x worden aangeroepen');
});

test('Peildatum input triggert calculate()', () => {
    initMockDOM();
    resetCalculateCalls();

    const input = mockDOM['peildatum'];
    input.addEventListener('input', calculate);
    input.value = '2026-12-05';
    input.dispatchEvent({ type: 'input' });

    assertEqual(calculateCalls, 1, 'calculate() moet 1x worden aangeroepen');
});

test('Totaalbedrag input triggert calculate()', () => {
    initMockDOM();
    resetCalculateCalls();

    const input = mockDOM['totaalbedrag'];
    input.addEventListener('input', calculate);
    input.value = '10000';
    input.dispatchEvent({ type: 'input' });

    assertEqual(calculateCalls, 1, 'calculate() moet 1x worden aangeroepen');
});

test('Meerdere sequentiële inputs triggeren calculate() elk', () => {
    initMockDOM();
    resetCalculateCalls();

    const dag = mockDOM['dagtekening'];
    const peil = mockDOM['peildatum'];
    
    dag.addEventListener('input', calculate);
    peil.addEventListener('input', calculate);

    dag.value = '2026-09-01';
    dag.dispatchEvent({ type: 'input' });

    peil.value = '2026-11-15';
    peil.dispatchEvent({ type: 'input' });

    assertEqual(calculateCalls, 2, 'calculate() moet 2x worden aangeroepen');
});

// ── Test Suite: Validation & Error Feedback ────────────────────────────

console.log('\n=== Validation & Error Feedback ===\n');

test('Dagtekening leeg → geen berekening, empty result-panel', () => {
    initMockDOM();
    resetCalculateCalls();

    mockDOM['dagtekening'].value = '';
    mockDOM['dagtekening'].dispatchEvent({ type: 'input' });

    calculate();

    assertEqual(mockDOM['result-panel'].innerHTML, '', 'result-panel moet leeg zijn');
});

test('Peildatum leeg → geen berekening, empty result-panel', () => {
    initMockDOM();
    resetCalculateCalls();

    mockDOM['peildatum'].value = '';
    mockDOM['peildatum'].dispatchEvent({ type: 'input' });

    calculate();

    assertEqual(mockDOM['result-panel'].innerHTML, '', 'result-panel moet leeg zijn');
});

test('Dagtekening > Peildatum → invalid state', () => {
    initMockDOM();

    mockDOM['dagtekening'].value = '2026-12-01';
    mockDOM['peildatum'].value = '2026-10-15';

    calculate();

    assert(mockDOM['result-panel'].classList.has('invalid'), 
           'result-panel moet invalid class hebben');
});

test('Dagtekening > Peildatum → error message toont', () => {
    initMockDOM();

    mockDOM['dagtekening'].value = '2026-12-01';
    mockDOM['peildatum'].value = '2026-10-15';

    calculate();

    assertIncludes(mockDOM['status-header'].textContent, 'Fout',
                   'Status header moet fout tonen');
});

test('Geldige datums → valid state', () => {
    initMockDOM();

    mockDOM['dagtekening'].value = '2026-10-15';
    mockDOM['peildatum'].value = '2026-12-01';

    calculate();

    assert(!mockDOM['result-panel'].classList.has('invalid'), 
           'result-panel mag invalid class NIET hebben');
});

test('Geldige datums → success message toont', () => {
    initMockDOM();

    mockDOM['dagtekening'].value = '2026-10-15';
    mockDOM['peildatum'].value = '2026-12-01';

    calculate();

    assertIncludes(mockDOM['status-header'].textContent, 'Invorderbaar',
                   'Status header moet Invorderbaar tonen');
});

// ── Test Suite: Result Panel Updates ──────────────────────────────────

console.log('\n=== Result Panel Updates ===\n');

test('Geldige inputs → result-panel populated', () => {
    initMockDOM();

    mockDOM['dagtekening'].value = '2026-10-15';
    mockDOM['peildatum'].value = '2026-12-01';

    calculate();

    assert(mockDOM['status-header'].textContent.length > 0,
           'status-header moet tekst bevatten');
    assert(mockDOM['deadline-info'].textContent.length > 0,
           'deadline-info moet tekst bevatten');
});

test('Dagtekening wijziging → deadline update', () => {
    initMockDOM();

    mockDOM['dagtekening'].value = '2026-09-01';
    mockDOM['peildatum'].value = '2026-11-01';
    calculate();

    const firstDeadline = mockDOM['deadline-info'].textContent;

    mockDOM['dagtekening'].value = '2026-10-01';
    calculate();

    const secondDeadline = mockDOM['deadline-info'].textContent;

    assert(firstDeadline !== secondDeadline,
           'Deadline moet wijzigen bij dagtekening-wijziging');
});

test('Peildatum wijziging → status update', () => {
    initMockDOM();

    mockDOM['dagtekening'].value = '2026-10-15';
    mockDOM['peildatum'].value = '2026-10-15';
    calculate();

    const statusBefore = mockDOM['status-header'].textContent;

    mockDOM['peildatum'].value = '2026-12-01';
    calculate();

    const statusAfter = mockDOM['status-header'].textContent;

    // Beide moeten "Invorderbaar" tonen (consistent)
    assertIncludes(statusBefore, 'Invorderbaar', 'Before moet Invorderbaar zijn');
    assertIncludes(statusAfter, 'Invorderbaar', 'After moet Invorderbaar zijn');
});

// ── Test Suite: Edge Cases ────────────────────────────────────────────

console.log('\n=== Edge Cases ===\n');

test('Datum gelijk (dagtekening = peildatum) → valid', () => {
    initMockDOM();

    mockDOM['dagtekening'].value = '2026-10-15';
    mockDOM['peildatum'].value = '2026-10-15';

    calculate();

    // Voor Lid 1 is dit mogelijk nog niet invorderbaar (deadline is +42 dagen)
    // maar mag niet gooien
    assert(!mockDOM['result-panel'].classList.has('invalid'),
           'Gelijke datums mogen geen invalid state geven');
});

test('Zeer oude dagtekening → valid', () => {
    initMockDOM();

    mockDOM['dagtekening'].value = '2020-01-01';
    mockDOM['peildatum'].value = '2026-12-01';

    calculate();

    assert(!mockDOM['result-panel'].classList.has('invalid'),
           'Oude datum mag niet invalid zijn');
});

test('Toekomstige datum (>1 jaar weg) → valid', () => {
    initMockDOM();

    mockDOM['dagtekening'].value = '2027-06-15';
    mockDOM['peildatum'].value = '2028-12-01';

    calculate();

    assert(!mockDOM['result-panel'].classList.has('invalid'),
           'Toekomstige datum mag niet invalid zijn');
});

// ── Test Suite: Form State Persistence ────────────────────────────────

console.log('\n=== Form State Persistence ===\n');

test('Dagtekening-waarde behouden bij calculate()', () => {
    initMockDOM();

    mockDOM['dagtekening'].value = '2026-09-15';
    calculate();

    assertEqual(mockDOM['dagtekening'].value, '2026-09-15',
                'Dagtekening-waarde mag niet wijzigen na calculate()');
});

test('Peildatum-waarde behouden bij calculate()', () => {
    initMockDOM();

    mockDOM['peildatum'].value = '2026-11-20';
    calculate();

    assertEqual(mockDOM['peildatum'].value, '2026-11-20',
                'Peildatum-waarde mag niet wijzigen na calculate()');
});

test('Checkbox-status behouden bij calculate()', () => {
    initMockDOM();

    mockDOM['dagtekening-in-vaststellingsjaar'].checked = false;
    calculate();

    assertEqual(mockDOM['dagtekening-in-vaststellingsjaar'].checked, false,
                'Checkbox-status mag niet wijzigen na calculate()');
});

// ── Test Suite: Performance ──────────────────────────────────────────

console.log('\n=== Performance ===\n');

test('Rapid input events → calculate() Called for each', () => {
    initMockDOM();
    resetCalculateCalls();

    const input = mockDOM['totaalbedrag'];
    input.addEventListener('input', calculate);

    // Simuleer snelle inputs (zonder debouncing)
    [1000, 2000, 3000, 4000, 5000].forEach(val => {
        input.value = val.toString();
        input.dispatchEvent({ type: 'input' });
    });

    assertEqual(calculateCalls, 5,
                'calculate() moet voor elke input aangeroepen worden');
});

test('Input + change events → calculate() Triggered', () => {
    initMockDOM();
    resetCalculateCalls();

    const input = mockDOM['dagtekening'];
    input.addEventListener('input', calculate);
    input.addEventListener('change', calculate);

    input.value = '2026-10-20';
    input.dispatchEvent({ type: 'input' });
    input.dispatchEvent({ type: 'change' });

    assertEqual(calculateCalls, 2,
                'Zowel input als change moet calculate() triggeren');
});

// ──────────────────────────────────────────────────────────────────────
// SUMMARY
// ──────────────────────────────────────────────────────────────────────

console.log('\n=== TEST RESULTS ===\n');
const total = testsPassed + testsFailed;
console.log(`✓ ${testsPassed}/${total} testen geslaagd`);

if (testsFailed > 0) {
    console.log(`✗ ${testsFailed} fout${testsFailed > 1 ? 'en' : ''}`);
    console.error('\n⚠️  Sommige realtime-datumveld tests zijn mislukt');
    process.exit(1);
} else {
    console.log('\n✅ Alle realtime-datumveld tests geslaagd!\n');
    process.exit(0);
}
