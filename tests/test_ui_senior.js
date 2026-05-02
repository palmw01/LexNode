#!/usr/bin/env node

/**
 * LexNode UI Test Runner (Node.js)
 * Voert alle UI-testen uit zonder browser
 */

// ── Test Framework ────────────────────────────────────────────────────
let testsPassed = 0;
let testsFailed = 0;
const tests = [];

function test(name, fn) {
    try {
        fn();
        testsPassed++;
        tests.push({ name, status: 'pass', error: null });
        console.log(`✓ ${name}`);
    } catch (e) {
        testsFailed++;
        tests.push({ name, status: 'fail', error: e.message });
        console.error(`✗ ${name}: ${e.message}`);
    }
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(a, b, message) {
    if (a !== b) throw new Error(`${message || 'Assertion failed'}: Expected ${b}, got ${a}`);
}

// ── Functies uit index.html ───────────────────────────────────────────

function getTermijnDagen() {
    return 42;
}

function checkInvorderbaarheid(dagtekening, peildatum, options = {}) {
    const dagen = getTermijnDagen();
    let deadline = new Date(dagtekening);
    deadline.setDate(deadline.getDate() + dagen);
    
    let meta_bron = 'Art. 9 IW 1990';

    // LI 2008 § 9.1 correctie
    if (options.isVoorlopig) {
        if (options.afwijkendBoekjaar) {
            const lastDay = new Date(deadline.getFullYear(), deadline.getMonth() + 1, 0).getDate();
            deadline.setDate(lastDay);
            meta_bron = "§ 9.1 LI 2008 (Afwijkend boekjaar)";
        } else if (dagtekening.getMonth() <= 10) {
            const eindeJaar = new Date(dagtekening.getFullYear(), 11, 31);
            if (deadline < eindeJaar) {
                deadline = eindeJaar;
                meta_bron = "§ 9.1 LI 2008 (31 december regel)";
            }
        }
    }
    
    return { 
        invorderbaar: peildatum >= deadline, 
        deadline, 
        dagen, 
        bron: meta_bron
    };
}

function checkInvorderbaarheidLid5(dagtekening, peildatum, options = {}) {
    const maand = dagtekening.getMonth() + 1;
    const resterendeMaanden = 12 - maand;

    if (resterendeMaanden <= 1) {
        return checkInvorderbaarheid(dagtekening, peildatum, options);
    }

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

    const laatsteIdx = termijnen.length - 1;
    let meta_bron = "";
    
    if (options.afwijkendBoekjaar) {
        const laatsteTermijn = termijnen[laatsteIdx];
        const lastDay = new Date(laatsteTermijn.getFullYear(), laatsteTermijn.getMonth() + 1, 0).getDate();
        termijnen[laatsteIdx].setDate(lastDay);
        meta_bron = " (Corr. § 9.1 LI 2008: Afwijkend boekjaar)";
    } else if (dagtekening.getMonth() <= 10) {
        const eindeJaar = new Date(dagtekening.getFullYear(), 11, 31);
        if (termijnen[laatsteIdx] < eindeJaar) {
            termijnen[laatsteIdx] = eindeJaar;
            meta_bron = " (Corr. § 9.1 LI 2008: 31 december regel)";
        }
    }

    const bron = 'Art. 9 lid 5 IW 1990' + meta_bron;
    
    return {
        invorderbaar: peildatum >= termijnen[0],
        termijnen,
        resterendeMaanden,
        bron,
        lid5: true,
        terugvalLid1: false,
    };
}

// ──────────────────────────────────────────────────────────────────────
// TESTS
// ──────────────────────────────────────────────────────────────────────

console.log('\n=== LexNode UI Test Suite (Node.js) ===\n');

// Lid 1
console.log('Lid 1 Tests:');
test('1 mei → 12 juni (INVORDERBAAR)', () => {
    const dag = new Date(2026, 4, 1);
    const peil = new Date(2026, 5, 12);
    const result = checkInvorderbaarheid(dag, peil);
    assert(result.invorderbaar, 'Moet INVORDERBAAR zijn');
    assertEqual(result.deadline.getDate(), 12, 'Deadline dag 12');
});

test('1 mei → 11 juni (NIET INVORDERBAAR)', () => {
    const dag = new Date(2026, 4, 1);
    const peil = new Date(2026, 5, 11);
    const result = checkInvorderbaarheid(dag, peil);
    assert(!result.invorderbaar, 'Moet NIET INVORDERBAAR zijn');
});

test('31 jan → 14 maart (maandgrens)', () => {
    const dag = new Date(2026, 0, 31);
    const peil = new Date(2026, 2, 14);
    const result = checkInvorderbaarheid(dag, peil);
    assert(result.invorderbaar, 'Moet INVORDERBAAR zijn');
});

// Lid 5
console.log('\nLid 5 Tests:');
test('Oktober → meerdere termijnen', () => {
    const dag = new Date(2026, 9, 15);
    const peil = new Date(2026, 9, 1);
    const result = checkInvorderbaarheidLid5(dag, peil);
    assert(result.lid5, 'Moet Lid 5 zijn');
    assert(result.termijnen && result.termijnen.length > 1, 'Meerdere termijnen');
});

test('November → terugval naar Lid 1', () => {
    const dag = new Date(2026, 10, 15);
    const peil = new Date(2026, 10, 1);
    const result = checkInvorderbaarheidLid5(dag, peil);
    assert(!result.lid5, 'Moet Lid 1 zijn');
});

test('Oktober 15 → termijnen 15 nov, 15 dec', () => {
    const dag = new Date(2026, 9, 15);
    const peil = new Date(2026, 8, 1);
    const result = checkInvorderbaarheidLid5(dag, peil);
    assert(result.termijnen, 'Moet termijnen hebben');
    assertEqual(result.termijnen[0].getDate(), 15, '1e termijn dag 15');
});

test('31 mei → 30 juni, 31 juli', () => {
    const dag = new Date(2026, 4, 31);
    const peil = new Date(2026, 3, 1);
    const result = checkInvorderbaarheidLid5(dag, peil);
    assert(result.termijnen, 'Moet termijnen hebben');
    assertEqual(result.termijnen[0].getDate(), 30, '1e termijn 30 juni');
    assertEqual(result.termijnen[1].getDate(), 31, '2e termijn 31 juli');
});

// LI 2008 § 9.1
console.log('\nLI 2008 § 9.1 Tests:');
test('Oktober → 31 december', () => {
    const dag = new Date(2026, 9, 15);
    const peil = new Date(2026, 11, 30);
    const result = checkInvorderbaarheidLid5(dag, peil);
    if (result.termijnen) {
        const laatste = result.termijnen[result.termijnen.length - 1];
        assertEqual(laatste.getDate(), 31, 'Laatste termijn 31');
        assertEqual(laatste.getMonth(), 11, 'Laatste termijn december');
    }
});

test('September → 31 december', () => {
    const dag = new Date(2026, 8, 15);
    const peil = new Date(2026, 11, 30);
    const result = checkInvorderbaarheidLid5(dag, peil);
    if (result.termijnen) {
        const laatste = result.termijnen[result.termijnen.length - 1];
        assertEqual(laatste.getDate(), 31, 'Moet 31 december zijn');
    }
});

test('December → GEEN correctie', () => {
    const dag = new Date(2026, 11, 1);
    const peil = new Date(2026, 11, 15);
    const result = checkInvorderbaarheidLid5(dag, peil);
    assert(!result.lid5, 'Moet Lid 1 zijn');
});

test('November + afwijkend boekjaar → 31 dec', () => {
    const dag = new Date(2024, 10, 15);
    const peil = new Date(2024, 2, 28);
    const result = checkInvorderbaarheid(dag, peil, { 
        isVoorlopig: true, 
        afwijkendBoekjaar: true 
    });
    assertEqual(result.deadline.getDate(), 31, '31 december');
});

// Edge Cases
console.log('\nEdge Case Tests:');
test('Zelfde dag → NIET INVORDERBAAR', () => {
    const dag = new Date(2026, 4, 1);
    const peil = new Date(2026, 4, 1);
    const result = checkInvorderbaarheid(dag, peil);
    assert(!result.invorderbaar, 'Zelfde dag = niet invorderbaar');
});

test('Peildatum VOOR dagtekening → NIET INVORDERBAAR', () => {
    const dag = new Date(2026, 4, 1);
    const peil = new Date(2026, 3, 31);
    const result = checkInvorderbaarheid(dag, peil);
    assert(!result.invorderbaar, 'Peildatum voor dagtekening');
});

test('Jaargrensovergang (1 dec → 12 jan 2027)', () => {
    const dag = new Date(2026, 11, 1);
    const peil = new Date(2027, 0, 12);
    const result = checkInvorderbaarheid(dag, peil);
    assert(result.invorderbaar, 'Jaargrensovergang');
    assertEqual(result.deadline.getFullYear(), 2027, '2027');
});

test('Schrikkelaar (1 jan 2024 + 42 = 13 feb)', () => {
    const dag = new Date(2024, 0, 1);
    const peil = new Date(2024, 1, 13);
    const result = checkInvorderbaarheid(dag, peil);
    assert(result.invorderbaar, 'Schrikkelaar');
});

// ──────────────────────────────────────────────────────────────────────
// SUMMARY
// ──────────────────────────────────────────────────────────────────────

console.log('\n=== RESULTS ===\n');
const total = testsPassed + testsFailed;
console.log(`✓ ${testsPassed}/${total} testen geslaagd`);
if (testsFailed > 0) {
    console.log(`✗ ${testsFailed} fout${testsFailed > 1 ? 'en' : ''}`);
    process.exit(1);
} else {
    console.log('\n✅ Alle testen geslaagd!\n');
    process.exit(0);
}
