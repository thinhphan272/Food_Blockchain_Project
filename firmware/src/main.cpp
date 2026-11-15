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
// Địa chỉ MQTT Broker:
// - Mặc định dùng Public HiveMQ Broker để Wokwi kết nối trực tiếp qua Internet
// - Fallback khi có Mosquitto local: có thể đổi thành "10.0.0.1"
const char* mqtt_server = "broker.hivemq.com";
const int mqtt_port = 1883;

// Cấu trúc Profile bảo quản động
struct StorageProfile {
  char category[20];
  char productName[30];
  float minTemp;
  float maxTemp;
  float maxHum;
  float maxGas;
  char gasType[15]; // "NH3", "TMA", "C2H4", "NONE"
};

// Khởi tạo mặc định: Chế độ chờ STANDBY - Chưa gán lô hàng nào
StorageProfile currentProfile = {
  "STANDBY",
  "Cho khoi hanh",
  0.0, 0.0, 0.0, 0.0, "NONE"
};

bool isTripActive = false;
String batchCode = "STANDBY";
String topicTelemetry = "smartchain/telemetry/STANDBY";
const char* topicCmd = "smartchain/device/ESP32-MULTI-01/cmd";
const char* topicConfig = "smartchain/device/ESP32-MULTI-01/config";

unsigned long lastSend = 0;
const long sendInterval = 2500;

void applyNewProfile(const char* cat) {
  if (strcmp(cat, "CHILLED_MEAT") == 0) {
    strcpy(currentProfile.category, "CHILLED_MEAT");
    strcpy(currentProfile.productName, "Thit Mat VietGAP");
    currentProfile.minTemp = 0.0; currentProfile.maxTemp = 4.0;
    currentProfile.maxHum = 85.0; currentProfile.maxGas = 20.0;
    strcpy(currentProfile.gasType, "NH3");
  } else if (strcmp(cat, "FRESH_SEAFOOD") == 0) {
    strcpy(currentProfile.category, "FRESH_SEAFOOD");
    strcpy(currentProfile.productName, "Hai San Tuoi Song");
    currentProfile.minTemp = 0.0; currentProfile.maxTemp = 2.0;
    currentProfile.maxHum = 95.0; currentProfile.maxGas = 15.0;
    strcpy(currentProfile.gasType, "TMA");
  } else if (strcmp(cat, "DAIRY") == 0) {
    strcpy(currentProfile.category, "DAIRY");
    strcpy(currentProfile.productName, "Sua Tuoi Thanh Trung");
    currentProfile.minTemp = 2.0; currentProfile.maxTemp = 6.0;
    currentProfile.maxHum = 85.0; currentProfile.maxGas = 18.0;
    strcpy(currentProfile.gasType, "Lactic");
  } else if (strcmp(cat, "DEEP_FROZEN") == 0) {
    strcpy(currentProfile.category, "DEEP_FROZEN");
    strcpy(currentProfile.productName, "Dong Lanh Sau IQF");
    currentProfile.minTemp = -30.0; currentProfile.maxTemp = -18.0;
    currentProfile.maxHum = 80.0; currentProfile.maxGas = 0.0;
    strcpy(currentProfile.gasType, "NONE");
  } else if (strcmp(cat, "DELI_HOT") == 0) {
    strcpy(currentProfile.category, "DELI_HOT");
    strcpy(currentProfile.productName, "Thuc Pham Chin Nong");
    currentProfile.minTemp = 60.0; currentProfile.maxTemp = 85.0;
    currentProfile.maxHum = 75.0; currentProfile.maxGas = 0.0;
    strcpy(currentProfile.gasType, "NONE");
  } else if (strcmp(cat, "VEG_FRUIT") == 0) {
    strcpy(currentProfile.category, "VEG_FRUIT");
    strcpy(currentProfile.productName, "Rau Cu Qua Da Lat");
    currentProfile.minTemp = 8.0; currentProfile.maxTemp = 12.0;
    currentProfile.maxHum = 95.0; currentProfile.maxGas = 30.0;
    strcpy(currentProfile.gasType, "C2H4");
  } else {
    strcpy(currentProfile.category, "STANDBY");
    strcpy(currentProfile.productName, "Cho khoi hanh");
    currentProfile.minTemp = 0.0; currentProfile.maxTemp = 0.0;
    currentProfile.maxHum = 0.0; currentProfile.maxGas = 0.0;
    strcpy(currentProfile.gasType, "NONE");
  }
  topicTelemetry = "smartchain/telemetry/" + batchCode;
  Serial.printf("[PROFILE UPDATED] Category: %s | Temp: %.1f -> %.1f C\n",
                currentProfile.category, currentProfile.minTemp, currentProfile.maxTemp);
}

void updateProfileFromJson(JsonDocument& doc) {
  const char* cmd = doc["command"] | doc["action"] | "";
  if (strcmp(cmd, "END_TRIP") == 0 || strcmp(cmd, "RESET_PROFILE") == 0 || strcmp(cmd, "STANDBY") == 0) {
    isTripActive = false;
    batchCode = "STANDBY";
    applyNewProfile("STANDBY");
    digitalWrite(PIN_RELAY, LOW);
    digitalWrite(PIN_LED_RED, LOW);
    noTone(PIN_BUZZER);
    topicTelemetry = "smartchain/telemetry/STANDBY";
    Serial.println("[SYSTEM] Chuyen xe da ket thuc / STANDBY. Thiet bi ve trang thai cho khoi hanh tu Web!");
    return;
  }

  if (doc.containsKey("category")) {
    applyNewProfile(doc["category"]);
  } else if (doc.containsKey("category_code")) {
    applyNewProfile(doc["category_code"]);
  }
  if (doc.containsKey("product_name")) {
    strncpy(currentProfile.productName, doc["product_name"], sizeof(currentProfile.productName) - 1);
    currentProfile.productName[sizeof(currentProfile.productName) - 1] = '\0';
  }
  if (doc.containsKey("minTemp")) currentProfile.minTemp = doc["minTemp"].as<float>();
  else if (doc.containsKey("min_temp")) currentProfile.minTemp = doc["min_temp"].as<float>();

  if (doc.containsKey("maxTemp")) currentProfile.maxTemp = doc["maxTemp"].as<float>();
  else if (doc.containsKey("max_temp")) currentProfile.maxTemp = doc["max_temp"].as<float>();

  if (doc.containsKey("maxGas")) currentProfile.maxGas = doc["maxGas"].as<float>();
  else if (doc.containsKey("max_gas")) currentProfile.maxGas = doc["max_gas"].as<float>();

  if (doc.containsKey("gasType")) strncpy(currentProfile.gasType, doc["gasType"], sizeof(currentProfile.gasType) - 1);
  else if (doc.containsKey("gas_type")) strncpy(currentProfile.gasType, doc["gas_type"], sizeof(currentProfile.gasType) - 1);

  if (doc.containsKey("batch_code")) {
    batchCode = doc["batch_code"].as<String>();
  } else if (doc.containsKey("batchCode")) {
    batchCode = doc["batchCode"].as<String>();
  } else if (doc.containsKey("batch")) {
    batchCode = doc["batch"].as<String>();
  }

  if (batchCode != "STANDBY" && batchCode.length() > 0) {
    isTripActive = true;
    topicTelemetry = "smartchain/telemetry/" + batchCode;
    Serial.printf("[OLED] Da nhan lenh KHOI HANH Lo hang: %s (%s | %.1f - %.1f C | Khi: %s)\n", 
                  batchCode.c_str(), currentProfile.productName, currentProfile.minTemp, currentProfile.maxTemp, currentProfile.gasType);
  }
}

void callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  message.reserve(length + 1);
  for (int i = 0; i < length; i++) message += (char)payload[i];
  Serial.println("[MQTT Inbound] " + String(topic) + ": " + message);

  StaticJsonDocument<1024> doc;
  DeserializationError err = deserializeJson(doc, message);
  if (err) {
    Serial.printf("[JSON ERR] %s\n", err.c_str());
    return;
  }

  // 1. Cấu hình Profile OTA từ xa theo đơn hàng (Dynamic Rule Engine)
  const char* act = "";
  if (doc.containsKey("action")) {
    act = doc["action"].as<const char*>();
  } else if (doc.containsKey("command")) {
    act = doc["command"].as<const char*>();
  }

  if (strcmp(act, "END_TRIP") == 0 || strcmp(act, "RESET_PROFILE") == 0 || strcmp(act, "STANDBY") == 0) {
    updateProfileFromJson(doc);
    return;
  }

  bool isConfigTopic = (strcmp(topic, topicConfig) == 0);
  bool isSetProfileCmd = (strcmp(act, "SET_PROFILE") == 0);
  bool hasBatchInfo = doc.containsKey("batch_code") || doc.containsKey("batch");

  if (isConfigTopic || isSetProfileCmd || hasBatchInfo) {
    updateProfileFromJson(doc);
  }

  // 2. Lệnh chấp hành cưỡng bức rơ-le
  if (strcmp(act, "RELAY_ON") == 0 || strcmp(act, "COOLING_ON") == 0) {
    digitalWrite(PIN_RELAY, HIGH);
    Serial.println("[ACTUATION] RELAY KICH HOAT (LAM MAT / XA ETHYLENE)!");
  } else if (strcmp(act, "RELAY_OFF") == 0 || strcmp(act, "COOLING_OFF") == 0) {
    digitalWrite(PIN_RELAY, LOW);
    Serial.println("[ACTUATION] RELAY DA TAT.");
  }
}

unsigned long lastMqttRetry = 0;

void tryReconnectMQTT() {
  if (mqttClient.connected()) return;

  unsigned long now = millis();
  if (now - lastMqttRetry < 5000) return; // Thử lại sau mỗi 5s, không khóa CPU
  lastMqttRetry = now;

  Serial.print("Ket noi MQTT (");
  Serial.print(mqtt_server);
  Serial.print(")...");

  String clientId = "ESP32-Supermarket-" + String((uint32_t)ESP.getEfuseMac(), HEX) + "-" + String(random(1000, 9999));
  if (mqttClient.connect(clientId.c_str())) {
    Serial.println(" OK!");
    mqttClient.subscribe(topicCmd);
    mqttClient.subscribe(topicConfig);
    digitalWrite(PIN_LED_GREEN, HIGH);
  } else {
    Serial.printf(" That bai (rc=%d)\n", mqttClient.state());
    digitalWrite(PIN_LED_GREEN, LOW);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_SW_DOOR, INPUT_PULLUP);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_LED_GREEN, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_RELAY, OUTPUT);

  digitalWrite(PIN_LED_RED, LOW);
  digitalWrite(PIN_LED_GREEN, LOW);
  digitalWrite(PIN_RELAY, LOW);

  dht.begin();

  // Khởi động OLED ngay lập tức (thử cả 0x3C và 0x3D)
  Wire.begin(21, 22);
  bool oledOk = display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  if (!oledOk) {
    oledOk = display.begin(SSD1306_SWITCHCAPVCC, 0x3D);
  }

  if (oledOk) {
    Serial.println("[OLED] Khoi tao SSD1306 thanh cong!");
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("SmartChain ESP32");
    display.println("====================");
    display.println("Khoi dong he thong..");
    display.println("OLED: ONLINE 128x64");
    display.display();
  } else {
    Serial.println("[OLED] Canh bao: Loi khoi tao SSD1306 tren I2C 21/22!");
  }

  // Kết nối WiFi (chờ tối đa 6 giây trên Wokwi-GUEST)
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);
  int wifiWait = 0;
  while (WiFi.status() != WL_CONNECTED && wifiWait < 30) {
    delay(200);
    wifiWait++;
    Serial.print(".");
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Da ket noi thanh cong!");
  } else {
    Serial.println("\n[WiFi] Chua ket noi duoc, se thu lai trong loop...");
  }

  mqttClient.setServer(mqtt_server, mqtt_port);
  mqttClient.setBufferSize(1024);
  mqttClient.setCallback(callback);

  // Cập nhật OLED trạng thái STANDBY - Chờ khởi hành từ Web
  isTripActive = false;
  batchCode = "STANDBY";
  display.clearDisplay();
  display.fillRect(0, 0, 128, 12, SSD1306_WHITE);
  display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(4, 2);
  display.print("SMARTCHAIN COLD-CHAIN");

  display.setTextColor(SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(4, 18);
  display.print("TRANG THAI: STANDBY");
  display.setCursor(4, 30);
  display.print("Chua gan lo hang");
  display.setCursor(4, 42);
  display.print("Cho khoi hanh tren Web");
  display.drawFastHLine(0, 52, 128, SSD1306_WHITE);
  display.setCursor(4, 55);
  display.printf("WiFi:%s | MQTT:%s", (WiFi.status() == WL_CONNECTED) ? "OK" : "--", mqttClient.connected() ? "OK" : "--");
  display.display();

  Serial.println("[SYSTEM] ESP32 o che do STANDBY. San sang cho tin hieu khoi hanh tren Web...");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastWifiRetry = 0;
    if (millis() - lastWifiRetry > 3000) {
      lastWifiRetry = millis();
      WiFi.begin(ssid, password);
    }
  } else {
    if (!mqttClient.connected()) {
      tryReconnectMQTT();
    } else {
      mqttClient.loop();
    }
  }

  // Đọc lệnh điều khiển từ Serial (RFC2217 Serial Bridge)
  if (Serial.available()) {
    String cmdStr = Serial.readStringUntil('\n');
    cmdStr.trim();
    if (cmdStr.length() > 0) {
      StaticJsonDocument<1024> cmdDoc;
      DeserializationError err = deserializeJson(cmdDoc, cmdStr);
      if (!err) {
        const char* act = cmdDoc["action"] | cmdDoc["command"] | "";
        if (strcmp(act, "END_TRIP") == 0 || strcmp(act, "RESET_PROFILE") == 0 || strcmp(act, "STANDBY") == 0) {
          updateProfileFromJson(cmdDoc);
        } else if (strcmp(act, "RELAY_ON") == 0 || strcmp(act, "COOLING_ON") == 0) {
          digitalWrite(PIN_RELAY, HIGH);
          Serial.println("[ACTUATION] RELAY KICH HOAT (LAM MAT / XA ETHYLENE)!");
        } else if (strcmp(act, "RELAY_OFF") == 0 || strcmp(act, "COOLING_OFF") == 0) {
          digitalWrite(PIN_RELAY, LOW);
          Serial.println("[ACTUATION] RELAY DA TAT.");
        } else if (strcmp(act, "SET_PROFILE") == 0 || cmdDoc.containsKey("batch_code") || cmdDoc.containsKey("batch")) {
          updateProfileFromJson(cmdDoc);
        }
      } else {
        Serial.printf("[SERIAL JSON ERR] %s\n", err.c_str());
      }
    }
  }

  unsigned long now = millis();
  if (now - lastSend >= sendInterval) {
    lastSend = now;

    // Khi ở chế độ STANDBY: Chưa bấm bắt đầu trên Web -> Hiển thị màn hình chờ, KHÔNG phát telemetry
    if (!isTripActive) {
      digitalWrite(PIN_RELAY, LOW);
      digitalWrite(PIN_LED_RED, LOW);
      noTone(PIN_BUZZER);

      display.clearDisplay();
      display.fillRect(0, 0, 128, 12, SSD1306_WHITE);
      display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
      display.setTextSize(1);
      display.setCursor(4, 2);
      display.print("SMARTCHAIN COLD-CHAIN");

      display.setTextColor(SSD1306_WHITE);
      display.setTextSize(1);
      display.setCursor(4, 18);
      display.print("TRANG THAI: STANDBY");
      display.setCursor(4, 30);
      display.print("Chua gan lo hang");
      display.setCursor(4, 42);
      display.print("Cho khoi hanh tren Web");
      display.drawFastHLine(0, 52, 128, SSD1306_WHITE);
      display.setCursor(4, 55);
      display.printf("WiFi:%s | MQTT:%s", (WiFi.status() == WL_CONNECTED) ? "OK" : "--", mqttClient.connected() ? "OK" : "--");
      display.display();

      static unsigned long lastStandbyLog = 0;
      if (now - lastStandbyLog >= 8000) {
        lastStandbyLog = now;
        Serial.println("[STANDBY] Thiet bi dang cho tin hieu bat dau chuyen xe tu Web...");
      }
      return;
    }

    float temp = dht.readTemperature();
    float hum = dht.readHumidity();
    int rawGas = analogRead(PIN_POT_GAS);
    float potGasVal = (rawGas / 4095.0) * 100.0;
    int rawW = analogRead(PIN_POT_WEIGHT);
    // Tải trọng xe tải thùng lạnh: thang đo 0 - 2,000 kg (0 - 2 tấn)
    float weight = (rawW / 4095.0) * 2000.0;
    if (weight < 50.0) weight = 600.0; // Mặc định tải trọng tiêu chuẩn 600kg nếu chưa xoay chiết áp
    bool doorOpen = (digitalRead(PIN_SW_DOOR) == LOW);
    bool relayOn = (digitalRead(PIN_RELAY) == HIGH);

    if (isnan(temp)) temp = 10.0;
    if (isnan(hum)) hum = 90.0;

    // 1. Dao động chu kỳ nén làm lạnh tự nhiên (+-0.35°C quanh giá trị cảm biến)
    // Giúp biểu đồ vi khí hậu trên Web luôn có sóng lượn tự nhiên như thùng xe đang chạy thực tế
    static float cycleAngle = 0.0;
    cycleAngle += 0.30;
    if (cycleAngle > 6.28318) cycleAngle = 0.0;
    float naturalDrift = sin(cycleAngle) * 0.35;

    // 2. Nồng độ khí sinh học nền tự nhiên của thực phẩm trong thùng kín
    float baselineGas = 0.0;
    if (strcmp(currentProfile.gasType, "C2H4") == 0) baselineGas = 11.5;
    else if (strcmp(currentProfile.gasType, "TMA") == 0) baselineGas = 6.2;
    else if (strcmp(currentProfile.gasType, "NH3") == 0) baselineGas = 7.5;
    else if (strcmp(currentProfile.gasType, "Lactic") == 0) baselineGas = 5.0;

    // Nếu người dùng xoay biến trở gas trên Wokwi (> 2 ppm) thì ưu tiên 100% giá trị xoay tay
    float gasVal = (potGasVal > 2.0) ? potGasVal : (baselineGas + cos(cycleAngle * 0.7) * 0.4);

    // [ACTUATOR COOLING & VENTILATION LOOP]:
    // Khi Relay được bật (Lốc lạnh phụ / Quạt hút thông gió GPIO 14 kích hoạt):
    // 1. Cưỡng bức làm mát nếu nhiệt độ vượt trần, hạ dần về ngưỡng cân bằng mục tiêu.
    // 2. Quạt hút cưỡng bức thổi bớt khí chín ép Ethylene / khí độc ra ngoài thùng xe.
    static float coolingOffset = 0.0;
    static float ventingGasOffset = 0.0;

    if (relayOn) {
      float targetTemp = (currentProfile.minTemp + currentProfile.maxTemp) / 2.0;
      if (temp - coolingOffset > targetTemp) {
        coolingOffset += 0.5; // Lốc phụ làm mát giảm 0.5°C mỗi chu kỳ 2.5s
      }
      float targetGas = currentProfile.maxGas * 0.4;
      if (gasVal - ventingGasOffset > targetGas) {
        ventingGasOffset += 2.0; // Quạt hút xả 2.0 ppm khí gas mỗi chu kỳ 2.5s
      }
    } else {
      // Khi tắt Relay: Mất nguồn làm mát phụ, nhiệt độ & khí gas quay lại giá trị môi trường thực
      if (coolingOffset > 0.0) coolingOffset = max(0.0f, coolingOffset - 0.25f);
      if (ventingGasOffset > 0.0) ventingGasOffset = max(0.0f, ventingGasOffset - 1.0f);
    }

    float effectiveTemp = temp + naturalDrift - coolingOffset;
    float effectiveGas = max(0.0f, gasVal - ventingGasOffset);

    // Logic kiểm tra vi phạm theo Profile riêng của từng ngành hàng
    bool tempBreach = (effectiveTemp < currentProfile.minTemp || effectiveTemp > currentProfile.maxTemp);
    bool gasBreach = (strcmp(currentProfile.gasType, "NONE") != 0) && (effectiveGas > currentProfile.maxGas);
    bool isBreached = tempBreach || gasBreach || doorOpen;

    static bool buzzerActive = false;
    if (isBreached) {
      digitalWrite(PIN_LED_RED, HIGH);
      tone(PIN_BUZZER, 1200, 250);
      buzzerActive = true;
    } else {
      digitalWrite(PIN_LED_RED, LOW);
      if (buzzerActive) {
        noTone(PIN_BUZZER);
        buzzerActive = false;
      }
    }

    // Hiển thị OLED Dashboard trực quan, chữ lớn dễ nhìn!
    display.clearDisplay();

    // 1. Header Bar đảo màu: Hiển thị trực tiếp MÃ LÔ HÀNG ĐANG CHỌN (batchCode) trên OLED
    display.fillRect(0, 0, 128, 10, SSD1306_WHITE);
    display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
    display.setTextSize(1);
    display.setCursor(2, 1);
    display.printf("%-16s %4s", batchCode.c_str(), mqttClient.connected() ? "LIVE" : "SER");

    // 2. Nhiệt độ hiển thị CỠ LỚN (TextSize 2) cực kỳ rõ nét
    display.setTextColor(SSD1306_WHITE);
    display.setTextSize(2);
    display.setCursor(2, 13);
    display.printf("%.1fC", effectiveTemp);

    // Kế bên là ngưỡng chuẩn & tên sản phẩm tóm tắt (TextSize 1)
    display.setTextSize(1);
    display.setCursor(76, 13);
    display.printf("%.0f-%.0fC", currentProfile.minTemp, currentProfile.maxTemp);
    display.setCursor(76, 22);
    char shortProd[9];
    strncpy(shortProd, currentProfile.productName, 8);
    shortProd[8] = '\0';
    display.printf("%s", shortProd);

    // 3. Khí sinh học & Tải trọng (TextSize 1)
    display.setCursor(2, 33);
    display.printf("%s: %.1fppm  W:%.0fkg", currentProfile.gasType, effectiveGas, weight);

    // 4. Trạng thái cửa thùng & Relay làm mát (TextSize 1)
    display.setCursor(2, 43);
    display.printf("Cua:%-4s Relay:%s", doorOpen ? "MO!" : "DONG", relayOn ? "[BAT]" : "[TAT]");

    // 5. Thanh cảnh báo Banner nổi bật ở đáy màn hình
    if (isBreached) {
      display.fillRect(0, 53, 128, 11, SSD1306_WHITE);
      display.setTextColor(SSD1306_BLACK, SSD1306_WHITE);
      display.setCursor(2, 55);
      if (relayOn && (tempBreach || gasBreach)) {
        display.print("! DANG HA NHIET/XA KHI !");
      } else if (gasBreach) {
        display.printf("! KHI %s VUOT MUC !", currentProfile.gasType);
      } else if (doorOpen) {
        display.print("! CUA CONTAINER MO !");
      } else if (effectiveTemp < currentProfile.minTemp) {
        display.print("! NHIET DO QUA THAP !");
      } else {
        display.print("! NHIET DO QUA CAO !");
      }
    } else {
      display.drawRect(0, 53, 128, 11, SSD1306_WHITE);
      display.setTextColor(SSD1306_WHITE);
      display.setCursor(6, 55);
      if (relayOn) {
        display.print("* RELAY DANG LAM MAT *");
      } else {
        display.print("* CHAT LUONG DAT *");
      }
    }
    display.display();

    // Đóng gói JSON Telemetry phát đều đặn qua Serial Bridge (RFC2217) & MQTT
    StaticJsonDocument<380> doc;
    doc["batch_code"] = batchCode;
    doc["category"] = currentProfile.category;
    doc["device_id"] = "ESP32-MULTI-01";
    doc["temperature"] = serialized(String(effectiveTemp, 2));
    doc["humidity"] = serialized(String(hum, 2));
    doc["gas_value"] = serialized(String(effectiveGas, 1));
    doc["gas_type"] = currentProfile.gasType;
    doc["weight_kg"] = serialized(String(weight, 1));
    doc["door_open"] = doorOpen;
    doc["relay_cooling"] = relayOn;
    doc["is_breached"] = isBreached;
    doc["timestamp"] = (unsigned long)millis();

    char buf[420];
    serializeJson(doc, buf);
    // Luôn xuất ra Serial để Serial-to-MQTT Bridge nhận dữ liệu 100% thời gian thực không phụ thuộc WiFi
    Serial.println("[Telemetry Sent] " + String(buf));

    if (mqttClient.connected()) {
      mqttClient.publish(topicTelemetry.c_str(), buf);
    }
  }
}
