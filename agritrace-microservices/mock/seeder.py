import argparse
import base64
import json
import os
import random
from datetime import datetime, timedelta

import requests
from faker import Faker

try:
    import psycopg2
except ImportError:
    psycopg2 = None


BASE_URL = "http://localhost:8080/api/v1"
faker = Faker("vi_VN")


ACCOUNTS = {
    "ADMIN": {
        "username": "admin_mock",
        "email": "admin_mock@mock.com",
        "password": "password123",
        "role": "ADMIN",
        "fullName": "Mock Admin Control",
    },
    "FARMER": {
        "username": "farmer_mock",
        "email": "farmer_mock@mock.com",
        "password": "password123",
        "role": "FARMER",
        "fullName": "Nguyen Van Nong",
    },
    "INSPECTOR": {
        "username": "inspector_mock",
        "email": "inspector_mock@mock.com",
        "password": "password123",
        "role": "INSPECTOR",
        "fullName": "Tran Thi Kiem Dinh",
    },
}


PRODUCT_CATALOG = [
    {
        "name": "Hass Avocado",
        "sku": "AT-AVO-001",
        "category": "Trái cây",
        "variety": "Hass",
        "grade": "Premium Grade A",
        "description": "Bo huu co canh tac theo quy trinh ben vung, theo doi day du tu trong den thu hoach.",
        "imageUrl": "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=1280&q=80",
    },
    {
        "name": "Organic Tomato",
        "sku": "AT-TOM-002",
        "category": "Rau củ",
        "variety": "Ruby Cluster",
        "grade": "Grade A",
        "description": "Ca chua huu co tuoi, ghi nhat ky moi cong doan tu giong den dong goi.",
        "imageUrl": "https://images.unsplash.com/photo-1546470427-e5b0f9f6f22f?auto=format&fit=crop&w=1280&q=80",
    },
    {
        "name": "Jasmine Rice",
        "sku": "AT-RIC-003",
        "category": "Ngũ cốc",
        "variety": "ST25",
        "grade": "Export Premium",
        "description": "Gao chat luong cao, duoc quan ly theo lo va doi soat dinh ky boi inspector.",
        "imageUrl": "https://images.unsplash.com/photo-1586201375761-83865001e31d?auto=format&fit=crop&w=1280&q=80",
    },
    {
        "name": "Dragon Fruit",
        "sku": "AT-DRA-004",
        "category": "Trái cây",
        "variety": "Red Flesh",
        "grade": "VietGAP",
        "description": "Thanh long canh tac tai vung nang cao, theo doi sat sao qua tung trace event.",
        "imageUrl": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=1280&q=80",
    },
    {
        "name": "Arabica Coffee",
        "sku": "AT-COF-005",
        "category": "Cây công nghiệp",
        "variety": "Arabica Catuai",
        "grade": "Specialty",
        "description": "Ca phe thu hoach chon loc, bao gom du lieu do am va thong so bao quan.",
        "imageUrl": "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1280&q=80",
    },
]


FARM_BLUEPRINTS = [
    {
        "name": "Dalat Farm",
        "location": "Da Lat, Lam Dong",
        "latitude": 11.9404,
        "longitude": 108.4583,
        "region": "DALAT",
        "plot": "Plot 4B",
    },
    {
        "name": "Mekong Green Farm",
        "location": "Can Tho, Mekong Delta",
        "latitude": 10.0452,
        "longitude": 105.7469,
        "region": "MEKONG",
        "plot": "Sector C2",
    },
    {
        "name": "Highland Organic Hub",
        "location": "Buon Ma Thuot, Dak Lak",
        "latitude": 12.6666,
        "longitude": 108.0372,
        "region": "HIGHLAND",
        "plot": "Block A7",
    },
]


BATCH_BLUEPRINTS = [
    {
        "farmIndex": 0,
        "productName": "Hass Avocado",
        "quantity": 500,
        "harvestDate": "2026-04-25",
        "scenario": "VERIFIED_SHIPPING",
        "uiState": "VERIFIED",
        "label": "living-ledger-main",
        "inspectionState": "VERIFIED",
    },
    {
        "farmIndex": 1,
        "productName": "Organic Tomato",
        "quantity": 320,
        "harvestDate": "2026-04-24",
        "scenario": "PENDING_INSPECTION",
        "uiState": "PENDING_INSPECTION",
        "label": "review-queue-candidate",
        "inspectionState": "AWAITING_INSPECTION",
    },
    {
        "farmIndex": 0,
        "productName": "Jasmine Rice",
        "quantity": 900,
        "harvestDate": "2026-04-23",
        "scenario": "VERIFIED_PACKAGED",
        "uiState": "READY_FOR_QR",
        "label": "batch-card-ready",
        "inspectionState": "VERIFIED",
    },
    {
        "farmIndex": 2,
        "productName": "Dragon Fruit",
        "quantity": 450,
        "harvestDate": "2026-04-22",
        "scenario": "EARLY_GROWTH",
        "uiState": "IN_PROGRESS",
        "label": "dashboard-in-progress",
        "inspectionState": "NONE",
    },
    # Additional Inspector-Focused Batches
    {
        "farmIndex": 1,
        "productName": "Arabica Coffee",
        "quantity": 280,
        "harvestDate": "2026-04-26",
        "scenario": "PENDING_INSPECTION_HARVEST",
        "uiState": "AWAITING_QUALITY_CHECK",
        "label": "inspector-queue-harvest",
        "inspectionState": "AWAITING_INSPECTION",
    },
    {
        "farmIndex": 0,
        "productName": "Dragon Fruit",
        "quantity": 320,
        "harvestDate": "2026-04-21",
        "scenario": "PENDING_INSPECTION_PARTIAL",
        "uiState": "PARTIAL_INSPECTION",
        "label": "inspector-queue-partial",
        "inspectionState": "PARTIAL_INSPECTION",
    },
    {
        "farmIndex": 2,
        "productName": "Organic Tomato",
        "quantity": 200,
        "harvestDate": "2026-04-20",
        "scenario": "PENDING_INSPECTION_INCOMPLETE",
        "uiState": "INCOMPLETE_LOGS",
        "label": "inspector-queue-incomplete",
        "inspectionState": "AWAITING_INSPECTION",
    },
]


def parse_json(response):
    try:
        return response.json()
    except ValueError:
        return {}


def unwrap_data(payload):
    if isinstance(payload, dict) and "data" in payload and payload["data"] is not None:
        return payload["data"]
    return payload


def api_error_message(response, payload):
    if isinstance(payload, dict):
        message = payload.get("message")
        errors = payload.get("errors")
        if message and errors:
            return f"{message} | errors={errors}"
        if message:
            return message
    return response.text.strip() or "No details"


def jwt_claims_without_verify(token):
    if not token or token.count(".") < 2:
        return {}

    body = token.split(".")[1]
    padding = "=" * (-len(body) % 4)
    try:
        decoded = base64.urlsafe_b64decode(body + padding).decode("utf-8")
        return json.loads(decoded)
    except Exception:
        return {}


def build_wallet_address():
    return "0x" + "".join(random.choices("0123456789abcdef", k=40))


def register_and_login(session, account):
    print(f"[*] Registering {account['role']}...")
    register_payload = {
        "username": account["username"],
        "email": account["email"],
        "password": account["password"],
        "role": account["role"],
        "fullName": account.get("fullName"),
        "walletAddress": build_wallet_address(),
        "publicKey": f"MOCK-{account['role']}-PUBKEY",
    }
    register_res = session.post(f"{BASE_URL}/auth/register", json=register_payload, timeout=20)
    register_data = parse_json(register_res)
    if register_res.status_code not in (200, 201):
        register_msg = api_error_message(register_res, register_data).lower()
        if "already" not in register_msg and "exist" not in register_msg:
            print(f"  -> Warning: register failed for {account['username']}: {register_msg}")

    print(f"[*] Logging in as {account['role']}...")
    login_res = session.post(
        f"{BASE_URL}/auth/login",
        json={"username": account["username"], "password": account["password"]},
        timeout=20,
    )

    login_payload = parse_json(login_res)
    if login_res.status_code != 200:
        print(f"[-] Login failed for {account['role']}: {login_res.status_code} - {api_error_message(login_res, login_payload)}")
        return None

    data = unwrap_data(login_payload)
    token = None
    if isinstance(data, dict):
        token = data.get("accessToken")
    if not token and isinstance(login_payload, dict):
        token = login_payload.get("accessToken")

    if not token:
        print(f"[-] Login response missing accessToken for {account['role']}")
        return None

    claims = jwt_claims_without_verify(token)
    print(f"[+] Login successful for {account['role']}")
    return {
        "headers": {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
        "claims": claims,
        "username": account["username"],
        "role": account["role"],
    }


def build_product_description(catalog_item):
    # Keep full mock metadata so frontend parsing and product DTO stay aligned.
    return str(catalog_item.get("description") or "").strip()


def ensure_products(session, admin_headers):
    print("\n=== Ensuring Product Catalog ===")
    existing_by_name = {}

    get_res = session.get(f"{BASE_URL}/products", timeout=20)
    if get_res.status_code == 200:
        payload = parse_json(get_res)
        data = unwrap_data(payload)
        if isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and item.get("name"):
                    existing_by_name[item["name"]] = item

    def existing_product_is_batch_safe(item):
        return isinstance(item, dict) and bool(item.get("id"))

    products = []
    for catalog_item in PRODUCT_CATALOG:
        mock_name = f"[MOCK] {catalog_item['name']}"
        safe_alias_name = f"[MOCK] {catalog_item['name']} Safe"

        reusable_name = None
        for candidate_name in (mock_name, safe_alias_name):
            candidate = existing_by_name.get(candidate_name)
            if candidate and existing_product_is_batch_safe(candidate):
                reusable_name = candidate_name
                break

        if reusable_name:
            current = existing_by_name[reusable_name]
            products.append(
                {
                    "id": current.get("id"),
                    "name": current.get("name"),
                    "baseName": catalog_item["name"],
                    "sku": catalog_item.get("sku"),
                    "category": catalog_item.get("category"),
                    "isActive": current.get("isActive", True),
                    "variety": catalog_item["variety"],
                    "grade": catalog_item["grade"],
                    "imageUrl": catalog_item["imageUrl"],
                    "description": current.get("description"),
                    "source": "existing",
                }
            )
            print(f"  -> Reused product: {reusable_name}")
            continue

        if mock_name in existing_by_name and not existing_product_is_batch_safe(existing_by_name[mock_name]):
            print(
                f"  -> Existing product {mock_name} has long description; creating safe alias for batch compatibility"
            )

        target_name = mock_name if mock_name not in existing_by_name else safe_alias_name

        create_payload = {
            "name": target_name,
            "description": build_product_description(catalog_item),
            "sku": catalog_item.get("sku"),
            "category": catalog_item.get("category"),
        }
        create_res = session.post(
            f"{BASE_URL}/products",
            json=create_payload,
            headers=admin_headers,
            timeout=20,
        )
        create_json = parse_json(create_res)

        if create_res.status_code not in (200, 201):
            print(f"  -> Failed to create product {target_name}: {api_error_message(create_res, create_json)}")
            continue

        data = unwrap_data(create_json)
        products.append(
            {
                "id": data.get("id"),
                "name": target_name,
                "baseName": catalog_item["name"],
                "sku": catalog_item.get("sku"),
                "category": catalog_item.get("category"),
                "isActive": data.get("isActive", True),
                "variety": catalog_item["variety"],
                "grade": catalog_item["grade"],
                "imageUrl": catalog_item["imageUrl"],
                "description": create_payload["description"],
                "source": "created",
            }
        )
        print(f"  -> Created product: {target_name}")

    return products


def create_farm(session, farmer_headers, blueprint):
    payload = {
        "name": f"[MOCK] {blueprint['name']}",
        "location": f"{blueprint['location']} - {blueprint['plot']}",
        "latitude": blueprint["latitude"],
        "longitude": blueprint["longitude"],
    }

    res = session.post(
        f"{BASE_URL}/farms",
        json=payload,
        headers=farmer_headers,
        timeout=20,
    )
    data = parse_json(res)

    if res.status_code not in (200, 201):
        print(f"  -> Failed to create farm {payload['name']}: {api_error_message(res, data)}")
        return None

    farm = unwrap_data(data)
    print(f"  -> Farm created: {farm.get('name')} ({farm.get('id')})")
    return {
        "id": farm.get("id"),
        "name": farm.get("name"),
        "location": payload["location"],
        "region": blueprint["region"],
        "plot": blueprint["plot"],
        "latitude": blueprint["latitude"],
        "longitude": blueprint["longitude"],
        "ownerId": farm.get("ownerId"),
    }


def create_batch(session, farmer_headers, farm, product, quantity, harvest_date):
    payload = {
        "farmId": farm["id"],
        "productId": product["id"],
        "quantity": quantity,
        "harvestDate": harvest_date,
        "farmLatitude": farm.get("latitude"),
        "farmLongitude": farm.get("longitude"),
    }
    res = session.post(
        f"{BASE_URL}/batches",
        json=payload,
        headers=farmer_headers,
        timeout=20,
    )
    parsed = parse_json(res)

    if res.status_code not in (200, 201):
        print(
            f"  -> Failed to create batch for farm={farm['name']} product={product['name']}: "
            f"{api_error_message(res, parsed)}"
        )
        return None

    data = unwrap_data(parsed)
    print(f"  -> Batch created: {data.get('batchCode')} | Qty={quantity}")
    return {
        "id": data.get("id"),
        "batchCode": data.get("batchCode"),
        "farmId": farm["id"],
        "farmName": farm["name"],
        "productId": data.get("productId") or product["id"],
        "productName": product["name"],
        "productType": data.get("productType"),
        "quantity": float(data.get("quantity") if data.get("quantity") is not None else quantity),
        "unit": data.get("unit"),
        "status": data.get("status"),
        "harvestDate": data.get("harvestDate") or harvest_date,
    }


def create_trace_log(session, actor_headers, batch_id, action, location, notes, quantity=None, latitude=None, longitude=None):
    payload = {
        "batchId": str(batch_id),
        "action": action,
        "location": location,
        "notes": notes,
    }
    if quantity is not None:
        payload["quantity"] = quantity
    if latitude is not None and longitude is not None:
        payload["latitude"] = latitude
        payload["longitude"] = longitude

    res = session.post(
        f"{BASE_URL}/trace-logs",
        json=payload,
        headers=actor_headers,
        timeout=20,
    )
    data = parse_json(res)

    if res.status_code not in (200, 201):
        print(f"    -> Failed TraceLog ({action}): {api_error_message(res, data)}")
        return None

    print(f"    -> TraceLog added: {action}")
    return data if isinstance(data, dict) else {}


def build_trace_plan(batch, farm, scenario):
    harvest_qty = round(float(batch["quantity"]), 3)
    packaged_qty = round(harvest_qty * 0.94, 3)
    shipped_qty = round(packaged_qty * 0.98, 3)
    base_location = f"{farm['region']} - {farm['location']} - {farm['plot']}"
    planted_at = datetime.utcnow() - timedelta(days=random.randint(30, 90))

    base_notes = {
        "PLANTING": f"[MOCK] Seed lot prepared at {planted_at.date()}, expected germination 95%.",
        "FERTILIZING": "[MOCK] Organic nutrient mix applied according to weekly plan.",
        "WATERING": "[MOCK] Automated drip irrigation with calibrated flow rate.",
        "SPRAYING": "[MOCK] Bio-safe pest control applied under approved threshold.",
        "HARVESTING": "[MOCK] Harvest completed after maturity check and quality screening.",
        "INSPECTION": "[MOCK] Inspector approved quality, residue test passed, integrity verified.",
        "PACKAGING": "[MOCK] Vacuum packaging completed and unit labels generated.",
        "SHIPPING": "[MOCK] Cold-chain dispatch started, transport seal locked.",
    }
    def near_farm(radius_km=0.7):
        lat_jitter = random.uniform(-radius_km / 111.0, radius_km / 111.0)
        lon_jitter = random.uniform(-radius_km / 111.0, radius_km / 111.0)
        return (
            round(farm["latitude"] + lat_jitter, 6),
            round(farm["longitude"] + lon_jitter, 6),
        )

    if scenario == "VERIFIED_SHIPPING":
        return [
            {"action": "PLANTING", "actor": "FARMER", "location": base_location, "notes": base_notes["PLANTING"], "coords": near_farm()},
            {"action": "FERTILIZING", "actor": "FARMER", "location": base_location, "notes": base_notes["FERTILIZING"], "coords": near_farm()},
            {"action": "WATERING", "actor": "FARMER", "location": base_location, "notes": base_notes["WATERING"], "coords": near_farm()},
            {
                "action": "HARVESTING",
                "actor": "FARMER",
                "location": base_location,
                "notes": base_notes["HARVESTING"],
                "quantity": harvest_qty,
                "coords": near_farm(),
            },
            {
                "action": "INSPECTION",
                "actor": "INSPECTOR",
                "location": f"{farm['region']} Inspection Center",
                "notes": base_notes["INSPECTION"],
                "coords": near_farm(1.5),
            },
            {
                "action": "PACKAGING",
                "actor": "FARMER",
                "location": f"{farm['region']} Packaging Station",
                "notes": base_notes["PACKAGING"],
                "quantity": packaged_qty,
                "coords": near_farm(2.0),
            },
            {
                "action": "SHIPPING",
                "actor": "FARMER",
                "location": f"{farm['region']} Distribution Hub",
                "notes": base_notes["SHIPPING"],
                "quantity": shipped_qty,
                "coords": near_farm(5.0),
            },
        ]

    if scenario == "VERIFIED_PACKAGED":
        return [
            {"action": "PLANTING", "actor": "FARMER", "location": base_location, "notes": base_notes["PLANTING"], "coords": near_farm()},
            {"action": "FERTILIZING", "actor": "FARMER", "location": base_location, "notes": base_notes["FERTILIZING"], "coords": near_farm()},
            {
                "action": "HARVESTING",
                "actor": "FARMER",
                "location": base_location,
                "notes": base_notes["HARVESTING"],
                "quantity": harvest_qty,
                "coords": near_farm(),
            },
            {
                "action": "INSPECTION",
                "actor": "INSPECTOR",
                "location": f"{farm['region']} Inspection Center",
                "notes": base_notes["INSPECTION"],
                "coords": near_farm(1.5),
            },
            {
                "action": "PACKAGING",
                "actor": "FARMER",
                "location": f"{farm['region']} Packaging Station",
                "notes": base_notes["PACKAGING"],
                "quantity": packaged_qty,
                "coords": near_farm(2.0),
            },
        ]

    if scenario == "PENDING_INSPECTION":
        return [
            {"action": "PLANTING", "actor": "FARMER", "location": base_location, "notes": base_notes["PLANTING"], "coords": near_farm()},
            {"action": "FERTILIZING", "actor": "FARMER", "location": base_location, "notes": base_notes["FERTILIZING"], "coords": near_farm()},
            {"action": "WATERING", "actor": "FARMER", "location": base_location, "notes": base_notes["WATERING"], "coords": near_farm()},
            {
                "action": "HARVESTING",
                "actor": "FARMER",
                "location": base_location,
                "notes": base_notes["HARVESTING"],
                "quantity": harvest_qty,
                "coords": near_farm(),
            },
        ]

    if scenario == "PENDING_INSPECTION_HARVEST":
        # Harvest complete, ready for inspector quality check
        return [
            {"action": "PLANTING", "actor": "FARMER", "location": base_location, "notes": base_notes["PLANTING"], "coords": near_farm()},
            {"action": "FERTILIZING", "actor": "FARMER", "location": base_location, "notes": base_notes["FERTILIZING"], "coords": near_farm()},
            {"action": "WATERING", "actor": "FARMER", "location": base_location, "notes": base_notes["WATERING"], "coords": near_farm()},
            {"action": "SPRAYING", "actor": "FARMER", "location": base_location, "notes": base_notes["SPRAYING"], "coords": near_farm()},
            {
                "action": "HARVESTING",
                "actor": "FARMER",
                "location": base_location,
                "notes": base_notes["HARVESTING"],
                "quantity": harvest_qty,
                "coords": near_farm(),
            },
        ]

    if scenario == "PENDING_INSPECTION_PARTIAL":
        # Inspector has started reviewing but not finished
        return [
            {"action": "PLANTING", "actor": "FARMER", "location": base_location, "notes": base_notes["PLANTING"], "coords": near_farm()},
            {"action": "FERTILIZING", "actor": "FARMER", "location": base_location, "notes": base_notes["FERTILIZING"], "coords": near_farm()},
            {"action": "WATERING", "actor": "FARMER", "location": base_location, "notes": base_notes["WATERING"], "coords": near_farm()},
            {
                "action": "HARVESTING",
                "actor": "FARMER",
                "location": base_location,
                "notes": base_notes["HARVESTING"],
                "quantity": harvest_qty,
                "coords": near_farm(),
            },
            {
                "action": "INSPECTION",
                "actor": "INSPECTOR",
                "location": f"{farm['region']} Inspection Center",
                "notes": "[MOCK] Partial quality inspection in progress - pending final sign-off.",
                "coords": near_farm(1.5),
            },
        ]

    if scenario == "PENDING_INSPECTION_INCOMPLETE":
        # Logs incomplete, inspector needs full trace before signing off
        return [
            {"action": "PLANTING", "actor": "FARMER", "location": base_location, "notes": base_notes["PLANTING"], "coords": near_farm()},
            {"action": "FERTILIZING", "actor": "FARMER", "location": base_location, "notes": base_notes["FERTILIZING"], "coords": near_farm()},
            {
                "action": "HARVESTING",
                "actor": "FARMER",
                "location": base_location,
                "notes": base_notes["HARVESTING"],
                "quantity": harvest_qty,
                "coords": near_farm(),
            },
        ]

    return [
        {"action": "PLANTING", "actor": "FARMER", "location": base_location, "notes": base_notes["PLANTING"], "coords": near_farm()},
        {"action": "FERTILIZING", "actor": "FARMER", "location": base_location, "notes": base_notes["FERTILIZING"], "coords": near_farm()},
        {"action": "WATERING", "actor": "FARMER", "location": base_location, "notes": base_notes["WATERING"], "coords": near_farm()},
        {"action": "SPRAYING", "actor": "FARMER", "location": base_location, "notes": base_notes["SPRAYING"], "coords": near_farm()},
    ]


def validate_public_views(session, batch_code, should_be_public):
    batch_res = session.get(f"{BASE_URL}/batches/{batch_code}", timeout=20)
    trace_res = session.get(f"{BASE_URL}/trace-logs/public/{batch_code}", timeout=20)

    batch_ok = batch_res.status_code == 200
    trace_ok = trace_res.status_code == 200

    expected_trace_status = 200 if should_be_public else 404
    result = {
        "batchStatusCode": batch_res.status_code,
        "traceStatusCode": trace_res.status_code,
        "expectedTraceStatus": expected_trace_status,
        "batchReadable": batch_ok,
        "tracePublicReadable": trace_ok,
        "traceExpectationMet": trace_res.status_code == expected_trace_status,
    }

    if not batch_ok:
        result["batchError"] = api_error_message(batch_res, parse_json(batch_res))
    if trace_res.status_code not in (200, 404):
        result["traceError"] = api_error_message(trace_res, parse_json(trace_res))
    return result


def write_manifest(path, manifest):
    dir_path = os.path.dirname(path)
    if dir_path:
        os.makedirs(dir_path, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)


def execute_delete_in(cur, sql_prefix, ids):
    if not ids:
        return 0
    placeholders = ", ".join(["%s"] * len(ids))
    cur.execute(f"{sql_prefix} ({placeholders})", ids)
    return cur.rowcount


def cleanup_databases():
    print("\n=== Cleaning Up Mock Data ===")
    if psycopg2 is None:
        print("psycopg2 is not installed. Install it to use --cleanup.")
        return

    db_configs = {
        "trace": {
            "dbname": "trace_db",
            "user": "agritrace",
            "password": "agritrace2026",
            "host": "localhost",
            "port": "5435",
        },
        "product": {
            "dbname": "product_db",
            "user": "agritrace",
            "password": "agritrace2026",
            "host": "localhost",
            "port": "5434",
        },
        "user": {
            "dbname": "user_db",
            "user": "agritrace",
            "password": "agritrace2026",
            "host": "localhost",
            "port": "5433",
        },
    }

    mock_user_ids = []
    mock_batch_ids = []
    mock_batch_codes = []

    try:
        with psycopg2.connect(**db_configs["user"]) as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT id FROM users
                    WHERE email LIKE '%@mock.com' OR username LIKE '%_mock%'
                    """
                )
                mock_user_ids = [row[0] for row in cur.fetchall()]
        print(f"Found {len(mock_user_ids)} mock users")
    except Exception as ex:
        print(f"Failed to scan user_db: {ex}")

    try:
        with psycopg2.connect(**db_configs["product"]) as conn:
            with conn.cursor() as cur:
                if mock_user_ids:
                    placeholders = ", ".join(["%s"] * len(mock_user_ids))
                    cur.execute(
                        f"SELECT id, batch_code FROM batches WHERE owner_id IN ({placeholders})",
                        mock_user_ids,
                    )
                    rows = cur.fetchall()
                    mock_batch_ids.extend([r[0] for r in rows])
                    mock_batch_codes.extend([r[1] for r in rows if r[1]])

                cur.execute("SELECT id, batch_code FROM batches WHERE facility_name LIKE '[MOCK]%' OR product_name LIKE '[MOCK]%'")
                rows = cur.fetchall()
                mock_batch_ids.extend([r[0] for r in rows])
                mock_batch_codes.extend([r[1] for r in rows if r[1]])

                mock_batch_ids = list(dict.fromkeys(mock_batch_ids))
                mock_batch_codes = list(dict.fromkeys(mock_batch_codes))
        print(f"Found {len(mock_batch_ids)} mock batches")
    except Exception as ex:
        print(f"Failed to scan product_db: {ex}")

    try:
        with psycopg2.connect(**db_configs["trace"]) as conn:
            with conn.cursor() as cur:
                deleted = 0
                deleted += execute_delete_in(cur, "DELETE FROM trace_logs WHERE batch_id IN", mock_batch_ids)
                deleted += execute_delete_in(cur, "DELETE FROM trace_logs WHERE created_by IN", mock_user_ids)
                deleted += execute_delete_in(cur, "DELETE FROM trace_logs WHERE batch_code IN", mock_batch_codes)
                cur.execute("DELETE FROM trace_logs WHERE description LIKE '%[MOCK]%'")
                deleted += cur.rowcount
                print(f"Deleted trace logs: {deleted}")
            conn.commit()
    except Exception as ex:
        print(f"Cleanup error in trace_db: {ex}")

    try:
        with psycopg2.connect(**db_configs["product"]) as conn:
            with conn.cursor() as cur:
                deleted_batches = 0
                deleted_batches += execute_delete_in(cur, "DELETE FROM batches WHERE id IN", mock_batch_ids)
                deleted_batches += execute_delete_in(cur, "DELETE FROM batches WHERE owner_id IN", mock_user_ids)
                cur.execute("DELETE FROM batches WHERE facility_name LIKE '[MOCK]%' OR product_name LIKE '[MOCK]%'")
                deleted_batches += cur.rowcount
                print(f"Deleted batches: {deleted_batches}")

                cur.execute("DELETE FROM products WHERE name LIKE '[MOCK] %'")
                print(f"Deleted products: {cur.rowcount}")
            conn.commit()
    except Exception as ex:
        print(f"Cleanup error in product_db: {ex}")

    try:
        with psycopg2.connect(**db_configs["user"]) as conn:
            with conn.cursor() as cur:
                execute_delete_in(cur, "UPDATE users SET facility_id = NULL WHERE id IN", mock_user_ids)

                deleted_farms = 0
                deleted_farms += execute_delete_in(cur, "DELETE FROM facilities WHERE owner_id IN", mock_user_ids)
                cur.execute("DELETE FROM facilities WHERE name LIKE '[MOCK] %'")
                deleted_farms += cur.rowcount
                print(f"Deleted farms/facilities: {deleted_farms}")

                deleted_users = execute_delete_in(cur, "DELETE FROM users WHERE id IN", mock_user_ids)
                print(f"Deleted users: {deleted_users}")
            conn.commit()
    except Exception as ex:
        print(f"Cleanup error in user_db: {ex}")


def run_seed(manifest_path):
    session = requests.Session()

    auth = {
        role: register_and_login(session, account)
        for role, account in ACCOUNTS.items()
    }

    if not all(auth.values()):
        print("Failed to authenticate one or more accounts. Aborting.")
        return

    admin_headers = auth["ADMIN"]["headers"]
    farmer_headers = auth["FARMER"]["headers"]
    inspector_headers = auth["INSPECTOR"]["headers"]

    products = ensure_products(session, admin_headers)
    product_by_name = {p["baseName"]: p for p in products if p.get("id")}

    print("\n=== Creating Farms ===")
    farms = []
    for blueprint in FARM_BLUEPRINTS:
        farm = create_farm(session, farmer_headers, blueprint)
        if farm and farm.get("id"):
            farms.append(farm)

    if not farms:
        print("No farm created. Aborting.")
        return

    print("\n=== Creating Batches + Trace Logs ===")
    manifest_batches = []
    for blueprint in BATCH_BLUEPRINTS:
        farm = farms[blueprint["farmIndex"] % len(farms)]
        product = product_by_name.get(blueprint["productName"])

        if not product:
            print(f"  -> Missing product for blueprint: {blueprint['productName']}")
            continue

        batch = create_batch(
            session,
            farmer_headers,
            farm,
            product,
            quantity=blueprint["quantity"],
            harvest_date=blueprint["harvestDate"],
        )
        if not batch or not batch.get("id"):
            continue

        trace_plan = build_trace_plan(batch, farm, blueprint["scenario"])
        trace_items = []

        for trace in trace_plan:
            actor_headers = inspector_headers if trace["actor"] == "INSPECTOR" else farmer_headers
            result = create_trace_log(
                session,
                actor_headers,
                batch["id"],
                trace["action"],
                trace["location"],
                trace["notes"],
                trace.get("quantity"),
                trace.get("coords", (None, None))[0],
                trace.get("coords", (None, None))[1],
            )
            trace_items.append(
                {
                    "action": trace["action"],
                    "actorRole": trace["actor"],
                    "location": trace["location"],
                    "quantity": trace.get("quantity"),
                    "created": result is not None,
                }
            )

        should_be_public = any(t["action"] == "INSPECTION" for t in trace_plan)
        public_check = validate_public_views(session, batch["batchCode"], should_be_public)

        manifest_batches.append(
            {
                "label": blueprint["label"],
                "scenario": blueprint["scenario"],
                "uiState": blueprint["uiState"],
                "batch": batch,
                "farm": farm,
                "product": {
                    "id": product["id"],
                    "name": product["name"],
                    "imageUrl": product["imageUrl"],
                    "variety": product["variety"],
                    "grade": product["grade"],
                },
                "traceTimeline": trace_items,
                "publicValidation": public_check,
                "inspectionState": blueprint.get("inspectionState", "NONE"),
            }
        )

    farm_product_map = {}
    search_batch_codes = set()
    search_product_names = set()
    search_farm_names = set()
    search_scenario_tags = set()

    for item in manifest_batches:
        farm_name = item["farm"]["name"]
        farm_product_map.setdefault(farm_name, [])
        farm_product_map[farm_name].append(
            {
                "batchCode": item["batch"]["batchCode"],
                "productName": item["product"]["name"],
                "scenario": item["scenario"],
            }
        )
        # Build search suggestions
        search_batch_codes.add(item["batch"]["batchCode"])
        search_product_names.add(item["product"]["name"])
        search_farm_names.add(farm_name)
        search_scenario_tags.add(item["scenario"])
        search_scenario_tags.add(item.get("inspectionState", "NONE"))

    search_suggestions = {
        "batchCodes": sorted(list(search_batch_codes)),
        "productNames": sorted(list(search_product_names)),
        "farmNames": sorted(list(search_farm_names)),
        "scenarioTags": sorted(list(search_scenario_tags)),
        "inspectionStates": [
            "VERIFIED",
            "PARTIAL_INSPECTION",
            "AWAITING_INSPECTION",
            "AWAITING_QUALITY_CHECK",
            "IN_PROGRESS",
            "NONE",
        ],
    }

    manifest = {
        "generatedAt": datetime.utcnow().isoformat() + "Z",
        "baseUrl": BASE_URL,
        "notes": [
            "Seeder aligned with current backend contracts (products are global, farm relation is via batches).",
            "Product image is stored as metadata in description and explicit manifest.imageUrl for FE mocking.",
            "Public trace API is expected to return 200 only for batches with INSPECTION and valid integrity chain.",
            "Inspector-focused batches added with multiple inspection states for queue testing.",
            "Search suggestions exported for frontend search bar autocomplete.",
        ],
        "accounts": [
            {
                "role": item["role"],
                "username": item["username"],
                "userId": item.get("claims", {}).get("userId"),
            }
            for item in auth.values()
        ],
        "products": products,
        "farms": farms,
        "farmProductMap": farm_product_map,
        "searchSuggestions": search_suggestions,
        "batches": manifest_batches,
    }

    write_manifest(manifest_path, manifest)

    print("\n[+] Detailed mock data seeding complete")
    print(f"[+] Manifest written: {manifest_path}")
    print(f"[+] Farms: {len(farms)} | Products: {len(products)} | Batches: {len(manifest_batches)}")


def main():
    parser = argparse.ArgumentParser(description="AgriTrace detailed mock data seeder")
    parser.add_argument("--seed", action="store_true", help="Run the mock data seeder")
    parser.add_argument("--cleanup", action="store_true", help="Clean up mock data directly from databases")
    parser.add_argument(
        "--manifest",
        default=os.path.join(os.path.dirname(__file__), "seed_manifest.json"),
        help="Output path for detailed seeded-data manifest JSON",
    )
    args = parser.parse_args()

    if args.cleanup:
        cleanup_databases()
        return

    if not args.seed:
        parser.print_help()
        return

    run_seed(args.manifest)


if __name__ == "__main__":
    main()
