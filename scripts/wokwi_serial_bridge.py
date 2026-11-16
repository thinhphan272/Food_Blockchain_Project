#!/usr/bin/env python3
"""
Wokwi Serial-to-MQTT Bridge for SmartChain IoT Cold-Chain
Connects to Wokwi RFC2217 Serial Port (localhost:4000) and bridges:
1. ESP32 Serial -> HiveMQ broker (broker.hivemq.com:1883) -> Spring Boot Backend
2. HiveMQ Commands -> ESP32 Serial (Downlink: RELAY_ON, RELAY_OFF, SET_PROFILE)
"""

import sys
import time
import json
import re
import socket
import threading
import urllib.request
import paho.mqtt.client as mqtt

# Ensure unbuffered stdout
import functools
print = functools.partial(print, flush=True)

MQTT_BROKER = "broker.hivemq.com"
MQTT_PORT = 1883
RFC2217_HOST = "127.0.0.1"
RFC2217_PORT = 4000
CMD_TOPIC = "smartchain/device/ESP32-MULTI-01/cmd"

serial_sock = None
serial_lock = threading.Lock()
last_profile_payload = None
last_sent_payload = None
last_sent_time = 0

CATEGORY_PROFILES = {
    "VEG_FRUIT": {"min_temp": 8.0, "max_temp": 12.0, "gas_type": "C2H4", "max_gas": 25.0},
    "DEEP_FROZEN": {"min_temp": -22.0, "max_temp": -18.0, "gas_type": "NONE", "max_gas": 0.0},
    "CHILLED_MEAT": {"min_temp": 0.0, "max_temp": 4.0, "gas_type": "NH3", "max_gas": 20.0},
    "DAIRY": {"min_temp": 2.0, "max_temp": 6.0, "gas_type": "Lactic", "max_gas": 15.0},
    "SEAFOOD": {"min_temp": -2.0, "max_temp": 2.0, "gas_type": "TMA", "max_gas": 10.0},
    "DELI_HOT": {"min_temp": 60.0, "max_temp": 75.0, "gas_type": "NONE", "max_gas": 0.0},
}

def fetch_active_in_transit_profile():
    try:
        url = "http://127.0.0.1:8080/api/workflow/batches"
        req = urllib.request.Request(url, headers={'User-Agent': 'WokwiBridge/1.0'})
        with urllib.request.urlopen(req, timeout=2.5) as resp:
            if resp.status == 200:
                batches = json.loads(resp.read().decode('utf-8'))
                for b in batches:
                    if b.get("status") == "IN_TRANSIT":
                        b_code = b.get("batchCode") or b.get("batch_code")
                        b_prod = b.get("productName") or b.get("product_name") or "Thuc pham"
                        b_cat = (b.get("category") or b.get("category_code") or "VEG_FRUIT").upper()
                        tj = b.get("transportJourney") or b.get("transport_journey") or {}
                        plate = tj.get("vehicle_plate") or "49C-567.89"
                        prof = CATEGORY_PROFILES.get(b_cat, CATEGORY_PROFILES["VEG_FRUIT"])
                        payload = json.dumps({
                            "command": "SET_PROFILE",
                            "batch_code": b_code,
                            "product_name": b_prod,
                            "category": b_cat,
                            "min_temp": prof["min_temp"],
                            "max_temp": prof["max_temp"],
                            "gas_type": prof["gas_type"],
                            "max_gas": prof["max_gas"],
                            "vehicle_id": plate,
                            "device_id": "ESP32-MULTI-01"
                        })
                        return payload
    except Exception:
        pass
    return None

def on_mqtt_connect(client, userdata, flags, rc):
    print(f"[MQTT] Connected to {MQTT_BROKER}:{MQTT_PORT} (rc={rc})")
    client.subscribe("smartchain/device/#")
    print(f"[MQTT] Subscribed to downlink command topics: smartchain/device/#")

def on_mqtt_message(client, userdata, msg):
    global last_profile_payload, last_sent_payload, last_sent_time
    payload = msg.payload.decode('utf-8', errors='ignore').strip()
    if not payload:
        return
    now = time.time()
    if payload == last_sent_payload and (now - last_sent_time) < 2.0:
        return
    last_sent_payload = payload
    last_sent_time = now

    print(f"[HIVEMQ -> WOKWI CMD] {msg.topic}: {payload}")
    if "END_TRIP" in payload or "RESET_PROFILE" in payload or '"STANDBY"' in payload:
        last_profile_payload = None
    elif "SET_PROFILE" in payload or "batch_code" in payload:
        last_profile_payload = payload
    with serial_lock:
        if serial_sock:
            try:
                serial_sock.sendall((payload + "\n").encode('utf-8'))
            except Exception as e:
                print(f"[BRIDGE ERROR] Failed to send to Wokwi: {e}")

mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_mqtt_connect
mqtt_client.on_message = on_mqtt_message

def start_mqtt():
    while True:
        try:
            print(f"[MQTT] Connecting to {MQTT_BROKER}...")
            mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
            mqtt_client.loop_forever()
        except Exception as e:
            print(f"[MQTT ERROR] {e}. Retrying in 5s...")
            time.sleep(5)

def run_bridge():
    global serial_sock
    mqtt_thread = threading.Thread(target=start_mqtt, daemon=True)
    mqtt_thread.start()

    print(f"============================================================")
    print(f"  SMARTCHAIN WOKWI <-> HIVEMQ SERIAL BRIDGE STARTED")
    print(f"  Listening on Wokwi RFC2217: {RFC2217_HOST}:{RFC2217_PORT}")
    print(f"  Target Broker: {MQTT_BROKER}:{MQTT_PORT}")
    print(f"============================================================")

    json_pattern = re.compile(r'\{.*"batch_code".*\}')
    last_wait_log = 0

    while True:
        try:
            now = time.time()
            if now - last_wait_log > 6.0:
                print(f"[BRIDGE] Waiting for Wokwi simulation on {RFC2217_HOST}:{RFC2217_PORT}... (Click Play button in diagram.json)")
                last_wait_log = now
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(2.0)
            s.connect((RFC2217_HOST, RFC2217_PORT))
            s.settimeout(None)
            with serial_lock:
                serial_sock = s
            print("[BRIDGE] Connected to Wokwi Serial Port (RFC2217)! Streaming live sensor data...")

            # Nếu đã có cấu hình lô hàng từ Web hoặc Backend đang có lô IN_TRANSIT, đẩy ngay xuống Wokwi khi vừa kết nối
            def push_cached_profile():
                global last_profile_payload
                time.sleep(1.5)
                payload_to_push = last_profile_payload
                if not payload_to_push:
                    payload_to_push = fetch_active_in_transit_profile()
                    if payload_to_push:
                        last_profile_payload = payload_to_push
                if payload_to_push:
                    with serial_lock:
                        if serial_sock:
                            try:
                                serial_sock.sendall((payload_to_push + "\n").encode('utf-8'))
                                print(f"[BRIDGE -> WOKWI] Auto-synced active batch profile to Wokwi: {payload_to_push}")
                            except Exception as e:
                                print(f"[BRIDGE -> WOKWI ERR] {e}")
            threading.Thread(target=push_cached_profile, daemon=True).start()

            buffer = ""
            while True:
                data = s.recv(1024)
                if not data:
                    print("[BRIDGE] Wokwi disconnected.")
                    break
                # Filter RFC2217 IAC (0xFF) Telnet options if present
                clean_bytes = bytearray()
                i = 0
                while i < len(data):
                    if data[i] == 0xFF:
                        i += 3 # Skip IAC sequences
                    else:
                        clean_bytes.append(data[i])
                        i += 1

                chunk = clean_bytes.decode('utf-8', errors='ignore')
                buffer += chunk

                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line:
                        continue

                    # Print firmware logs
                    if "[STANDBY]" in line:
                        print(f"[WOKWI STANDBY] {line}")
                    elif "[Telemetry Sent]" in line or "[Offline Backfill]" in line or "batch_code" in line:
                        match = json_pattern.search(line)
                        if match:
                            raw_json = match.group(0)
                            try:
                                parsed = json.loads(raw_json)
                                batch = parsed.get("batch_code", "STANDBY")
                                if batch == "STANDBY":
                                    continue
                                topic = f"smartchain/telemetry/{batch}"
                                mqtt_client.publish(topic, raw_json, qos=1)
                                temp = parsed.get("temperature", "?")
                                gas = parsed.get("gas_value", "?")
                                is_offline = parsed.get("buffered", False) or parsed.get("offline", False)
                                breached = parsed.get("is_breached", False)
                                status_str = "CANH BAO" if breached else "AN TOAN"
                                if is_offline:
                                    print(f"[OFFLINE BACKFILL -> HIVEMQ] Synced buffered record! Temp={temp}C | Gas={gas}ppm | Batch={batch} -> Pushed to Blockchain & Cassandra")
                                else:
                                    print(f"[LIVE ESP32 -> WEB] Temp={temp}C | Gas={gas}ppm | Batch={batch} [{status_str}] -> Sent to HiveMQ!")
                            except Exception as parse_err:
                                print(f"[JSON PARSE WARN] {parse_err}: {raw_json}")
                    elif "[OFFLINE" in line or "[ONLINE" in line or "[ACTUATION]" in line or "[OLED]" in line or "Ket noi" in line or "[SYSTEM]" in line:
                        print(f"[WOKWI LOG] {line}")

        except ConnectionRefusedError:
            time.sleep(2)
        except Exception as e:
            print(f"[BRIDGE EXCEPTION] {e}")
            time.sleep(2)
        finally:
            with serial_lock:
                if serial_sock:
                    try:
                        serial_sock.close()
                    except Exception:
                        pass
                    serial_sock = None

if __name__ == "__main__":
    run_bridge()
