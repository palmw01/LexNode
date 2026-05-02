#!/bin/bash
# LexNode Test Runner — All Test Suites
# Execute comprehensive validation suite

set -e  # Exit on first error

echo "╔════════════════════════════════════════════════════════════╗"
echo "║        LexNode Senior Tester — Full Test Suite            ║"
echo "║                   Running 54 Tests                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Activate virtual environment
source .venv/bin/activate.fish 2>/dev/null || . .venv/bin/activate 2>/dev/null || true

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

TOTAL_TESTS=0
FAILED_TESTS=0

# Helper function
run_test_suite() {
    local name=$1
    local command=$2
    local count=$3
    
    echo -e "${BLUE}▶ $name ($count tests)${NC}"
    
    if eval "$command"; then
        echo -e "${GREEN}✅ PASSED${NC}\n"
        ((TOTAL_TESTS += count))
    else
        echo -e "${RED}❌ FAILED${NC}\n"
        ((FAILED_TESTS++))
        ((TOTAL_TESTS += count))
    fi
}

# ───────────────────────────────────────────────────────────────
# Backend Tests (Python)
# ───────────────────────────────────────────────────────────────

echo -e "${YELLOW}━ BACKEND TESTS (Python)${NC}"
echo ""

run_test_suite \
    "Backend Senior Tests" \
    "python tests/test_senior_backend.py -q" \
    23

run_test_suite \
    "Integration Tests (Backend ↔ Frontend)" \
    "python tests/test_integration.py -q" \
    16

# ───────────────────────────────────────────────────────────────
# Frontend Tests (JavaScript/Node.js)
# ───────────────────────────────────────────────────────────────

echo ""
echo -e "${YELLOW}━ FRONTEND TESTS (JavaScript)${NC}"
echo ""

run_test_suite \
    "UI Senior Tests (Node.js)" \
    "node tests/test_ui_senior.js" \
    15

# ───────────────────────────────────────────────────────────────
# Summary
# ───────────────────────────────────────────────────────────────

echo ""
echo "╔════════════════════════════════════════════════════════════╗"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "║ ${GREEN}✅ ALL $TOTAL_TESTS TESTS PASSED${NC}                       ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    exit 0
else
    echo -e "║ ${RED}❌ $FAILED_TESTS TEST SUITE(S) FAILED${NC}                    ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    exit 1
fi
