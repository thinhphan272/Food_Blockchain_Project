import time
import json
import random
import paho.mqtt.client as mqtt

BROKER = "localhost"
PORT = 1883
TOPIC = "smartchain/telemetry/LOT-VEG-2026-001"

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION1, "Mock-IoT-Script")
try:
    client.connect(BROKER, PORT, 60)
    print(f"[MOCK IOT] Da ket noi Mosquitto tai {BROKER}:{PORT}. Dang ban Telemetry...")
except Exception as e:
    print(f"[LOI] Khong ket noi duoc Mosquitto ({e}). Hay chac chan ban da chay: docker compose up -d")
    exit(1)

try:
    while True:
        # Giả lập nhiệt độ rau quả dao động an toàn từ 8.5C đến 10.5C
        payload = {
            "batch_code": "LOT-VEG-2026-001",
            "category": "VEG_FRUIT",
            "device_id": "ESP32-MOCK-01",
            "temperature": round(random.uniform(8.5, 10.5), 2),
            "humidity": round(random.uniform(88.0, 93.0), 1),
            "gas_value": round(random.uniform(10.0, 18.0), 1),
            "gas_type": "C2H4",
            "weight_kg": 150.0,
            "door_open": False,
            "is_breached": False,
            "timestamp": int(time.time() * 1000)
        }
        json_data = json.dumps(payload)
        client.publish(TOPIC, json_data)
        print(f"[SENT] {json_data}")
        time.sleep(5)
except KeyboardInterrupt:
    print("\nDung mock script.")
    client.disconnect()
