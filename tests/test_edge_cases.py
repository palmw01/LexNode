"""Test edge cases in calculations"""
from lexnode_engine import LexNodeEngine
from datetime import datetime, timedelta

engine = LexNodeEngine("graph.gexf")

# Test 1: Schrikkelaar (31 jan + termijnen)
print("=== TEST 1: 31 januari → gelijktijdige termijnen ===")
dagtekening = datetime(2024, 1, 31)
print(f"Dagtekening: {dagtekening.date()}")
print(f"Resterende maanden na jan: {12 - dagtekening.month}")

# Test 2: February edge case
print("\n=== TEST 2: 31 mei → 30 juni (dag truncation) ===")
dagtekening2 = datetime(2024, 5, 31)
# Juni heeft 30 dagen, dus 31 mei → 30 juni
last_day_juni = (datetime(2024, 7, 1) - timedelta(days=1)).day
print(f"Dagtekening: {dagtekening2.date()}")
print(f"Dag van maand: {dagtekening2.day}")
print(f"Laatste dag juni: {last_day_juni}")
print(f"Verwacht in jun: {min(31, last_day_juni)}")

# Test 3: November fallback
print("\n=== TEST 3: 15 november → should trigger fallback ===")
dagtekening3 = datetime(2024, 11, 15)
resterende = 12 - dagtekening3.month
print(f"Dagtekening: {dagtekening3.date()}")
print(f"Resterende maanden: {resterende}")
print(f"Should trigger AR-9-5e fallback: {resterende <= 1}")

# Test 4: Backend engine
print("\n=== Backend engine check ===")
res = engine.check_invorderbaarheid(datetime(2024, 1, 1), datetime(2024, 2, 20))
print(f"Lid1 Result invorderbaar: {res['invorderbaar']}")
print(f"Deadline: {res['deadline'].date()}")

print("\n✓ Edge case tests completed")
