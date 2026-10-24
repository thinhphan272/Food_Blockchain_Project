#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>

#define PIN_DHT        15
#define PIN_POT_GAS    34
#define PIN_POT_WEIGHT 35
#define PIN_SW_DOOR    13
#define PIN_LED_RED    2
#define PIN_LED_GREEN  4
#define PIN_BUZZER     12
#define PIN_RELAY      14

#define DHTTYPE DHT22
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64

DHT dht(PIN_DHT, DHTTYPE);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

const char* ssid = "Wokwi-GUEST";
const char* password = "";
const char* mqtt_server = "host.docker.internal";
const int mqtt_port = 1883;

// Cấu trúc Profile bảo quản động
struct StorageProfile {
  char category[20];
  char productName[30];
  float minTemp;
  float maxTemp;
  float maxHum;
  float maxGas;
  char gasType[15]; // "NH3", "TMA", "C2H4", "CO2"
};

// Khởi tạo mặc định: Rau củ quả tươi (Fresh Produce)
StorageProfile currentProfile = {
  "VEG_FRUIT",
  "Xa lach Thuy Canh",
  8.0, 12.0, 95.0, 30.0, "C2H4"
};

String batchCode = "LOT-VEG-2026-001";
String topicTelemetry = "smartchain/telemetry/" + batchCode;
const char* topicCmd = "smartchain/device/ESP32-MULTI-01/cmd";
const char* topicConfig = "smartchain/device/ESP32-MULTI-01/config";

unsigned long lastSend = 0;
const long sendInterval = 5000;

void applyNewProfile(const char* cat) {
  if (strcmp(cat, "CHILLED_MEAT") == 0) {
    strcpy(currentProfile.category, "CHILLED_MEAT");
    strcpy(currentProfile.productName, "Thit Heo Mat VietGAP");
    currentProfile.minTemp = 0.0; currentProfile.maxTemp = 4.0;
    currentProfile.maxHum = 85.0; currentProfile.maxGas = 40.0;
    strcpy(currentProfile.gasType, "NH3");
    batchCode = "LOT-PORK-2026-001";
  } else if (strcmp(cat, "FRESH_SEAFOOD") == 0) {
    strcpy(currentProfile.category, "FRESH_SEAFOOD");
    strcpy(currentProfile.productName, "Ca Hoi Phi Le");
    currentProfile.minTemp = 0.0; currentProfile.maxTemp = 2.0;
    currentProfile.maxHum = 95.0; currentProfile.maxGas = 25.0;
    strcpy(currentProfile.gasType, "TMA");
    batchCode = "LOT-FISH-2026-001";
  } else if (strcmp(cat, "DEEP_FROZEN") == 0) {
    strcpy(currentProfile.category, "DEEP_FROZEN");
    strcpy(currentProfile.productName, "Hai San Cap Dong");
    currentProfile.minTemp = -30.0; currentProfile.maxTemp = -18.0;
    currentProfile.maxHum = 80.0; currentProfile.maxGas = 10.0;
    strcpy(currentProfile.gasType, "MOIST");
    batchCode = "LOT-FROZEN-2026-001";
  } else {
    strcpy(currentProfile.category, "VEG_FRUIT");
    strcpy(currentProfile.productName, "Xa lach Thuy Canh");
    currentProfile.minTemp = 8.0; currentProfile.maxTemp = 12.0;
    currentProfile.maxHum = 95.0; currentProfile.maxGas = 30.0;
    strcpy(currentProfile.gasType, "C2H4");
    batchCode = "LOT-VEG-2026-001";
  }
  topicTelemetry = "smartchain/telemetry/" + batchCode;
  Serial.printf("[PROFILE UPDATED] Category: %s | Temp: %.1f -> %.1f C\n",
                currentProfile.category, currentProfile.minTemp, currentProfile.maxTemp);
}

void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (int i = 0; i < length; i++) message += (char)payload[i];
  Serial.println("[MQTT Inbound] " + String(topic) + ": " + message);

  StaticJsonDocument<300> doc;
  deserializeJson(doc, message);

  if (strcmp(topic, topicConfig) == 0 && doc.containsKey("category")) {
    applyNewProfile(doc["category"]);
  }
  if (doc.containsKey("action")) {
    const char* act = doc["action"];
    if (strcmp(act, "RELAY_ON") == 0) {
      digitalWrite(PIN_RELAY, HIGH);
      Serial.println("[ACTUATION] RELAY KICH HOAT (LAM MAT / XA ETHYLENE)!");
    } else if (strcmp(act, "RELAY_OFF") == 0) {
      digitalWrite(PIN_RELAY, LOW);
      Serial.println("[ACTUATION] RELAY DA TAT.");
    }
  }
}

void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("Ket noi MQTT...");
    if (mqttClient.connect("ESP32-Supermarket-Node-01")) {
      Serial.println(" OK!");
      mqttClient.subscribe(topicCmd);
      mqttClient.subscribe(topicConfig);
      digitalWrite(PIN_LED_GREEN, HIGH);
    } else {
      digitalWrite(PIN_LED_GREEN, LOW);
      delay(2000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_SW_DOOR, INPUT_PULLUP);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_RELAY, OUTPUT);

  dht.begin();
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(300);

  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setCallback(callback);
}

void loop() {
  if (!mqttClient.connected()) reconnectMQTT();
  mqttClient.loop();

  unsigned long now = millis();
  if (now - lastSend >= sendInterval) {
    lastSend = now;

    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    int rawGas = analogRead(PIN_POT_GAS);
    float gasVal = (rawGas / 4095.0) * 100.0;
    int rawW = analogRead(PIN_POT_WEIGHT);
    float weight = (rawW / 4095.0) * 200.0;
    bool doorOpen = (digitalRead(PIN_SW_DOOR) == LOW);

    if (isnan(temp)) temp = 10.0;
    if (isnan(hum)) hum = 90.0;

    bool tempBreach = (temp < currentProfile.minTemp || temp > currentProfile.maxTemp);
    bool gasBreach = (gasVal > currentProfile.maxGas);
    bool isBreached = tempBreach || gasBreach || doorOpen;

    if (isBreached) {
      digitalWrite(PIN_LED_RED, HIGH);
      tone(PIN_BUZZER, 1200, 250);
    } else {
      digitalWrite(PIN_LED_RED, LOW);
      noTone(PIN_BUZZER);
    }

    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(WHITE);
    display.setCursor(0, 0);
    display.printf("CAT: %s\n", currentProfile.category);
    display.printf("SP: %s\n", currentProfile.productName);
    display.printf("T: %.1fC (%.0f-%.0fC)\n", temp, currentProfile.minTemp, currentProfile.maxTemp);
    display.printf("%s: %.1f ppm\n", currentProfile.gasType, gasVal);
    display.printf("W: %.1fkg | Cua: %s\n", weight, doorOpen ? "OPEN!" : "LOCK");
    display.printf("TT: %s\n", isBreached ? "CANH BAO VI PHAM!" : "CHUAN CHAT LUONG");
    display.display();

    StaticJsonDocument<350> doc;
    doc["batch_code"] = batchCode;
    doc["category"] = currentProfile.category;
    doc["device_id"] = "ESP32-MULTI-01";
    doc["temperature"] = serialized(String(temp, 2));
    doc["humidity"] = serialized(String(hum, 2));
    doc["gas_value"] = serialized(String(gasVal, 1));
    doc["gas_type"] = currentProfile.gasType;
    doc["weight_kg"] = serialized(String(weight, 1));
    doc["door_open"] = doorOpen;
    doc["is_breached"] = isBreached;

    char buf[400];
    serializeJson(doc, buf);
    mqttClient.publish(topicTelemetry.c_str(), buf);
    Serial.println("[Telemetry Sent] " + String(buf));
  }
}
