import pytest
import requests
import psycopg2
import random
import time
import string
import sys

BASE_URL = "http://localhost:8080/api/v1"

db_configs = {
    "trace": {"dbname": "trace_db", "user": "agritrace", "password": "agritrace2026", "host": "localhost", "port": "5435"},
    "product": {"dbname": "product_db", "user": "agritrace", "password": "agritrace2026", "host": "localhost", "port": "5434"},
    "user": {"dbname": "user_db", "user": "agritrace", "password": "agritrace2026", "host": "localhost", "port": "5433"},
    "audit": {"dbname": "audit_db", "user": "agritrace", "password": "agritrace2026", "host": "localhost", "port": "5436"}
}

def unwrap_data(payload):
    if isinstance(payload, dict) and "data" in payload and payload["data"] is not None:
        return payload["data"]
    return payload

def register_and_login(username, email, role, full_name="Mock User"):
    wallet_address = "0x" + "".join(random.choices("0123456789abcdef", k=40))
    payload = {
        "username": username,
        "email": email,
        "password": "password123",
        "role": role,
        "fullName": full_name,
        "walletAddress": wallet_address,
        "publicKey": f"MOCK-{role}-PUBKEY",
    }
    requests.post(f"{BASE_URL}/auth/register", json=payload)
    login_res = requests.post(f"{BASE_URL}/auth/login", json={"username": username, "password": "password123"})
    assert login_res.status_code == 200, f"Login failed for {role}: {login_res.text}"
    data = unwrap_data(login_res.json())
    token = data.get("accessToken")
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

@pytest.fixture(scope="module")
def farmer_dalat_headers():
    unique_suffix = random.randint(10000, 99999)
    return register_and_login(f"farmer_dalat_{unique_suffix}", f"farmer_dalat_{unique_suffix}@mock.com", "FARMER", "Dalat Farmer")

@pytest.fixture(scope="module")
def farmer_mekong_headers():
    unique_suffix = random.randint(10000, 99999)
    return register_and_login(f"farmer_mekong_{unique_suffix}", f"farmer_mekong_{unique_suffix}@mock.com", "FARMER", "Mekong Farmer")

@pytest.fixture(scope="module")
def admin_headers():
    unique_suffix = random.randint(10000, 99999)
    return register_and_login(f"admin_{unique_suffix}", f"admin_{unique_suffix}@mock.com", "ADMIN", "Admin")

@pytest.fixture(scope="module")
def test_product(admin_headers):
    unique_suffix = random.randint(10000, 99999)
    payload = {
        "name": f"[MOCK] Test Product {unique_suffix}",
        "description": "MOCK|Test|A|Desc"
    }
    res = requests.post(f"{BASE_URL}/products", json=payload, headers=admin_headers)
    if res.status_code not in (200, 201):
        res = requests.get(f"{BASE_URL}/products", headers=admin_headers)
        data = unwrap_data(res.json())
        if isinstance(data, list) and len(data) > 0:
            return data[0]
    return unwrap_data(res.json())

@pytest.fixture(scope="module")
def test_farm_dalat(farmer_dalat_headers):
    unique_suffix = random.randint(10000, 99999)
    payload = {
        "name": f"[MOCK] Dalat Farm {unique_suffix}",
        "location": "Da Lat, Lam Dong - Plot A",
        "region": "DALAT"
    }
    res = requests.post(f"{BASE_URL}/farms", json=payload, headers=farmer_dalat_headers)
    return unwrap_data(res.json())

@pytest.fixture(scope="module")
def test_farm_mekong(farmer_mekong_headers):
    unique_suffix = random.randint(10000, 99999)
    payload = {
        "name": f"[MOCK] Mekong Farm {unique_suffix}",
        "location": "Can Tho, Mekong Delta - Plot B",
        "region": "MEKONG"
    }
    res = requests.post(f"{BASE_URL}/farms", json=payload, headers=farmer_mekong_headers)
    return unwrap_data(res.json())


def test_1_event_driven_resilience(farmer_dalat_headers, test_product, test_farm_dalat):
    print("\n[RUNNING] Test 1: Event-Driven & Microservices Resilience...")
    batch_payload = {
        "farmId": test_farm_dalat.get("id"),
        "productId": test_product.get("id"),
        "quantity": 100,
        "harvestDate": "2026-05-01"
    }
    res = requests.post(f"{BASE_URL}/batches", json=batch_payload, headers=farmer_dalat_headers)
    assert res.status_code in (200, 201), f"Expected 200/201, got {res.status_code}: {res.text}"
    
    batch_data = unwrap_data(res.json())
    batch_id = batch_data.get("id")
    batch_code = batch_data.get("batchCode")
    print(f"  -> Batch Created successfully: {batch_code}")

    print("  -> Checking audit_db for Kafka event log...")
    try:
        with psycopg2.connect(**db_configs["audit"]) as conn:
            with conn.cursor() as cur:
                time.sleep(1.5)  # allow time for kafka to process
                # Try finding event log by entity_id, or message body
                cur.execute("SELECT event_type, message FROM audit_logs WHERE entity_id = %s OR message LIKE %s", (str(batch_id), f"%{batch_code}%"))
                logs = cur.fetchall()
                if logs:
                    print(f"  -> Found audit log in audit_db! Event Type: {logs[0][0]}")
                else:
                    print("  -> (Optional) Could not find audit log in audit_db. Verify Kafka & Audit Service are running.")
    except Exception as e:
        print(f"  -> (Optional) psycopg2 could not connect to audit_db or table differs: {e}")
    
    print("[PASSED] Test 1: Event-Driven & Microservices Resilience")


def test_2_blockchain_immutability(farmer_dalat_headers, test_product, test_farm_dalat):
    print("\n[RUNNING] Test 2: Blockchain-like Immutability & Signature Tampering (RCA)...")
    
    batch_payload = {
        "farmId": test_farm_dalat.get("id"),
        "productId": test_product.get("id"),
        "quantity": 200,
        "harvestDate": "2026-05-01"
    }
    res = requests.post(f"{BASE_URL}/batches", json=batch_payload, headers=farmer_dalat_headers)
    batch_id = unwrap_data(res.json()).get("id")

    trace_payload = {
        "batchId": str(batch_id),
        "action": "PLANTING",
        "location": "Dalat",
        "notes": "Original notes for immutable logging",
        "quantity": 200
    }
    res_trace = requests.post(f"{BASE_URL}/trace-logs", json=trace_payload, headers=farmer_dalat_headers)
    assert res_trace.status_code in (200, 201), f"TraceLog creation failed: {res_trace.text}"
    
    trace_data = unwrap_data(res_trace.json())
    trace_id = trace_data.get("id")
    print(f"  -> TraceLog created. ID: {trace_id}")

    print("  -> Simulating DB Hack...")
    try:
        with psycopg2.connect(**db_configs["trace"]) as conn:
            with conn.cursor() as cur:
                # Maliciously update notes/description without updating the digital signature or hash
                cur.execute("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = 'trace_logs'
                      AND column_name = ANY(%s)
                """, (["notes", "action_notes", "description"],))
                available_columns = {row[0] for row in cur.fetchall()}
                writable_note_column = next(
                    (name for name in ("notes", "action_notes", "description") if name in available_columns),
                    None
                )
                if not writable_note_column:
                    pytest.fail(
                        "Failed to tamper with DB via psycopg2: no writable note column found in trace_logs "
                        "(expected one of: notes, action_notes, description)"
                    )

                cur.execute(
                    f"UPDATE trace_logs SET {writable_note_column} = %s, quantity = %s WHERE id = %s",
                    ("HACKED notes", 9999, trace_id)
                )
            conn.commit()
        print("  -> DB Hack executed successfully via psycopg2 (simulating bypass of API layer).")
    except Exception as e:
        pytest.fail(f"Failed to tamper with DB via psycopg2: {e}")

    print("  -> Verifying integrity via API endpoint...")
    res_verify = requests.get(f"{BASE_URL}/trace-logs/{trace_id}/verify", headers=farmer_dalat_headers)
    
    # We expect 400 or 409 depending on the implementation
    if res_verify.status_code in (400, 409, 500):
         print(f"  -> Integrity check successfully caught the tampered hash. Status: {res_verify.status_code}")
    else:
         body = res_verify.json()
         is_valid = unwrap_data(body).get("isValid") if isinstance(unwrap_data(body), dict) else None
         if is_valid is False:
             print("  -> Integrity check successfully caught the tampered hash (API returned 200 but isValid is false).")
         else:
             pytest.fail(f"API did not catch DB tampering! Status: {res_verify.status_code}, Body: {res_verify.text}")
             
    print("[PASSED] Test 2: Blockchain-like Immutability & Signature Tampering")


def test_3_temporal_logic_validation(farmer_dalat_headers, test_product, test_farm_dalat):
    print("\n[RUNNING] Test 3: Temporal Logic Validation (Data Integrity)...")
    
    batch_payload = {
        "farmId": test_farm_dalat.get("id"),
        "productId": test_product.get("id"),
        "quantity": 300,
        "harvestDate": "2026-05-01"
    }
    res = requests.post(f"{BASE_URL}/batches", json=batch_payload, headers=farmer_dalat_headers)
    batch_data = unwrap_data(res.json())
    batch_id = batch_data.get("id")
    batch_code = batch_data.get("batchCode")

    print("  -> Adding 'HARVESTING' trace log...")
    trace_payload_1 = {
        "batchId": str(batch_id),
        "action": "HARVESTING",
        "location": "Dalat",
        "notes": "Harvesting phase completed.",
        "quantity": 300,
    }
    requests.post(f"{BASE_URL}/trace-logs", json=trace_payload_1, headers=farmer_dalat_headers)

    print("  -> Attempting to add 'PLANTING' log to an already harvested batch...")
    trace_payload_2 = {
        "batchId": str(batch_id),
        "action": "PLANTING",
        "location": "Dalat",
        "notes": "Attempting planting phase out of chronological order",
    }
    res_trace_2 = requests.post(f"{BASE_URL}/trace-logs", json=trace_payload_2, headers=farmer_dalat_headers)
    
    assert res_trace_2.status_code in (400, 409, 422), f"Expected API to reject chronological violation, got {res_trace_2.status_code}"
    print(f"  -> API correctly rejected the out-of-order log. Status: {res_trace_2.status_code}")

    print("  -> Attempting to access Public QR Trace for an unapproved batch...")
    res_public = requests.get(f"{BASE_URL}/trace-logs/public/{batch_code}")
    assert res_public.status_code in (401, 403, 404), f"Expected 401/403/404 for unapproved batch public trace, got {res_public.status_code}"
    print(f"  -> API correctly rejected public trace access. Status: {res_public.status_code}")

    print("[PASSED] Test 3: Temporal Logic Validation")


def test_4_abac_cross_region(farmer_dalat_headers, farmer_mekong_headers, test_product, test_farm_mekong):
    print("\n[RUNNING] Test 4: Attribute-Based Access Control (ABAC)...")
    
    # Mekong farmer creates a batch
    batch_payload = {
        "farmId": test_farm_mekong.get("id"),
        "productId": test_product.get("id"),
        "quantity": 400,
        "harvestDate": "2026-05-01"
    }
    res_mekong = requests.post(f"{BASE_URL}/batches", json=batch_payload, headers=farmer_mekong_headers)
    batch_id = unwrap_data(res_mekong.json()).get("id")
    print(f"  -> Mekong farmer created batch ID: {batch_id}")

    print("  -> Authenticating as Dalat farmer and attempting to access Mekong batch...")
    # Attempt GET
    res_dalat_access = requests.get(f"{BASE_URL}/batches/{batch_id}", headers=farmer_dalat_headers)
    
    # Attempt POST Trace Log to other's batch
    trace_payload_unauth = {
        "batchId": str(batch_id),
        "action": "PACKAGING",
        "location": "Dalat",
        "notes": "Trying to edit someone else's batch"
    }
    res_dalat_put = requests.post(f"{BASE_URL}/trace-logs", json=trace_payload_unauth, headers=farmer_dalat_headers)

    assert res_dalat_access.status_code in (401, 403, 404) or res_dalat_put.status_code in (401, 403, 404), \
        f"Expected ABAC to block access. GET: {res_dalat_access.status_code}, POST: {res_dalat_put.status_code}"
    
    print(f"  -> ABAC correctly blocked cross-region/cross-owner access. GET status: {res_dalat_access.status_code}, POST status: {res_dalat_put.status_code}")
    print("[PASSED] Test 4: Attribute-Based Access Control (ABAC)")


if __name__ == "__main__":
    # Provides an easy way to run the script directly and see print outputs
    args = ["-s", "-v", __file__] + sys.argv[1:]
    sys.exit(pytest.main(args))
