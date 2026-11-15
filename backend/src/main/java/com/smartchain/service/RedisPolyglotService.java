package com.smartchain.service;

import com.smartchain.entity.StorageProfile;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

/**
 * Dịch vụ Đa mô hình Redis (In-Memory Key-Value, Hash, Sorted Set, Set & Distributed Redlock).
 * Tính năng:
 * - Sử dụng chuẩn giao thức nhị phân RESP (REdis Serialization Protocol: *N\r\n$L\r\n...)
 *   để đọc/ghi trực tiếp tới Redis Server thật trên cổng 6379.
 * - Tự động fallback sang bộ nhớ RAM nội bộ khi chạy chế độ Offline không cần Docker.
 */
@Service
public class RedisPolyglotService {

    private static final Logger log = LoggerFactory.getLogger(RedisPolyglotService.class);

    // 1. Redis HASH: profile:{categoryCode}
    private final Map<String, Map<String, String>> profileHashes = new ConcurrentHashMap<>();

    // 2. Redis SORTED SET (ZSET): fefo:shelf:{categoryCode} & risk:leaderboard:{categoryCode}
    private final Map<String, Map<String, Double>> fefoSortedSets = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Double>> riskLeaderboards = new ConcurrentHashMap<>();

    // 3. Redis SET: pos:sold_qrs & recall:blacklisted_qrs / blacklist:items
    private final Set<String> posSoldQrSet = ConcurrentHashMap.newKeySet();
    private final Set<String> recalledBlacklistQrSet = ConcurrentHashMap.newKeySet();

    // 4. Redis STRING: lock:pos:{qrSerial}, telemetry:latest:{batchCode}, item:status:{serialCode}
    private final Map<String, Long> redlockPosKeys = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> soldReceiptDetails = new ConcurrentHashMap<>();
    private final Map<String, String> latestTelemetryCache = new ConcurrentHashMap<>();
    private final Map<String, String> itemStatusMap = new ConcurrentHashMap<>();

    // Nhật ký lệnh Redis chuẩn CLI (không chèn hậu tố lỗi cú pháp)
    private final List<String> recentRedisCommands = new CopyOnWriteArrayList<>();

    @Value("${REDIS_HOST:localhost}")
    private String redisHost = "localhost";

    @Value("${REDIS_PORT:6379}")
    private int redisPort = 6379;

    @Value("${SPRING_REDIS_PASSWORD:${SPRING_DATA_REDIS_PASSWORD:${REDIS_PASSWORD:redispassword}}}")
    private String redisPassword = "redispassword";

    private void authenticateIfRequired(OutputStream out, BufferedReader reader) throws IOException {
        if (redisPassword != null && !redisPassword.isBlank()) {
            byte[] passBytes = redisPassword.getBytes(StandardCharsets.UTF_8);
            String authCmd = "*2\r\n$4\r\nAUTH\r\n$" + passBytes.length + "\r\n" + redisPassword + "\r\n";
            out.write(authCmd.getBytes(StandardCharsets.UTF_8));
            out.flush();
            reader.readLine();
        }
    }

    // 1. Storage Profiles Hash Operations
    public void cacheStorageProfile(StorageProfile profile) {
        String key = "profile:" + profile.getCategoryCode();
        Map<String, String> hash = new LinkedHashMap<>();
        hash.put("category_name", profile.getCategoryName());
        hash.put("min_temp", String.valueOf(profile.getMinTemp()));
        hash.put("max_temp", String.valueOf(profile.getMaxTemp()));
        hash.put("min_humidity", String.valueOf(profile.getMinHumidity()));
        hash.put("max_humidity", String.valueOf(profile.getMaxHumidity()));
        hash.put("gas_type", profile.getGasType());
        hash.put("max_gas", String.valueOf(profile.getMaxGas()));
        hash.put("shelf_life_days", String.valueOf(profile.getShelfLifeDays()));
        hash.put("synced_at", Instant.now().toString());
        profileHashes.put(key, hash);

        sendRespCommand(
                "HSET", key,
                "category_name", profile.getCategoryName(),
                "min_temp", String.valueOf(profile.getMinTemp()),
                "max_temp", String.valueOf(profile.getMaxTemp()),
                "min_humidity", String.valueOf(profile.getMinHumidity()),
                "max_humidity", String.valueOf(profile.getMaxHumidity()),
                "gas_type", String.valueOf(profile.getGasType()),
                "max_gas", String.valueOf(profile.getMaxGas()),
                "shelf_life_days", String.valueOf(profile.getShelfLifeDays())
        );
        recordCommand(String.format("HSET %s min_temp %s max_temp %s gas_type %s max_gas %s",
                key, profile.getMinTemp(), profile.getMaxTemp(), profile.getGasType(), profile.getMaxGas()));
    }

    public Map<String, String> getCachedProfile(String categoryCode) {
        String key = "profile:" + categoryCode;
        List<String> lines = sendRespCommandLines("HGETALL", key);
        if (lines != null && lines.size() >= 2 && lines.size() % 2 == 0) {
            Map<String, String> dbHash = new LinkedHashMap<>();
            for (int i = 0; i < lines.size(); i += 2) {
                dbHash.put(lines.get(i), lines.get(i + 1));
            }
            profileHashes.put(key, dbHash);
            return dbHash;
        }
        Map<String, String> local = profileHashes.getOrDefault(key, Collections.emptyMap());
        if (!local.isEmpty()) {
            return local;
        }
        return Collections.emptyMap();
    }

    public Map<String, Map<String, String>> getAllProfileHashes() {
        return new LinkedHashMap<>(profileHashes);
    }

    // 2. FEFO Sorted Set Operations
    public void updateFefoPriorityQueue(String categoryCode, String batchCode, double remainingShelfLifeHours) {
        String zsetKey = "fefo:shelf:" + categoryCode;
        double roundedHours = Math.round(remainingShelfLifeHours * 10.0) / 10.0;
        fefoSortedSets.computeIfAbsent(zsetKey, k -> new ConcurrentHashMap<>())
                .put(batchCode, roundedHours);

        sendRespCommand("ZADD", zsetKey, String.valueOf(roundedHours), batchCode);
        recordCommand(String.format("ZADD %s %.1f %s", zsetKey, roundedHours, batchCode));
    }

    public List<Map<String, Object>> getFefoSortedBatches(String categoryCode) {
        String zsetKey = "fefo:shelf:" + categoryCode;
        List<String> zrangeLines = sendRespCommandLines("ZRANGE", zsetKey, "0", "-1", "WITHSCORES");
        if (zrangeLines != null && !zrangeLines.isEmpty() && zrangeLines.size() % 2 == 0) {
            Map<String, Double> zmap = fefoSortedSets.computeIfAbsent(zsetKey, k -> new ConcurrentHashMap<>());
            for (int i = 0; i < zrangeLines.size(); i += 2) {
                try {
                    zmap.put(zrangeLines.get(i), Double.parseDouble(zrangeLines.get(i + 1)));
                } catch (Exception ignored) {}
            }
        }
        Map<String, Double> zset = fefoSortedSets.getOrDefault(zsetKey, Collections.emptyMap());
        return zset.entrySet().stream()
                .sorted(Map.Entry.comparingByValue())
                .map(entry -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("batchCode", entry.getKey());
                    item.put("remainingHours", entry.getValue());
                    double discount = entry.getValue() < 36.0 ? 30.0 : (entry.getValue() < 72.0 ? 15.0 : 0.0);
                    item.put("suggestedDiscountPercent", discount);
                    item.put("fefoPriority", entry.getValue() < 36.0 ? "HIGH_PRIORITY_CLEARANCE" : "STANDARD_FEFO");
                    return item;
                })
                .collect(Collectors.toList());
    }

    public Map<String, List<Map<String, Object>>> getAllFefoQueues() {
        Map<String, List<Map<String, Object>>> result = new LinkedHashMap<>();
        for (String key : fefoSortedSets.keySet()) {
            String cat = key.replace("fefo:shelf:", "");
            result.put(key, getFefoSortedBatches(cat));
        }
        return result;
    }

    // 3. POS Checkout & Anti-Counterfeit Redlock
    public synchronized Map<String, Object> processPosCheckoutWithRedlock(
            String serialCode, String batchCode, String productName, double price, String cashierId) {

        String lockKey = "lock:pos:" + serialCode;
        long nowMs = System.currentTimeMillis();

        // Bước 1: Kiểm tra xem mã QR đơn vị có nằm trong danh sách Thu hồi khẩn cấp (Blacklist) không
        boolean blacklistedInRedis = "1".equals(sendRespCommand("SISMEMBER", "recall:blacklisted_qrs", serialCode));
        if (recalledBlacklistQrSet.contains(serialCode) || blacklistedInRedis) {
            recordCommand(String.format("SISMEMBER recall:blacklisted_qrs %s", serialCode));
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("success", false);
            res.put("httpStatus", 423);
            res.put("fraudDetected", true);
            res.put("alertType", "EMERGENCY_RECALLED_ITEM");
            res.put("error", "RECALLED_ITEM_BLOCKED");
            res.put("serialCode", serialCode);
            res.put("batchCode", batchCode);
            res.put("message", "CẢNH BÁO AN TOÀN THỰC PHẨM: Sản phẩm thuộc lô hàng đang bị THU HỒI KHẨN CẤP! Cấm xuất bán tại POS!");
            return res;
        }

        // Bước 2: Thử chiếm khóa phân tán Redlock (SET lock:pos:{serialCode} LOCKED NX EX 5)
        String respLockReply = sendRespCommand("SET", lockKey, "LOCKED_BY_" + cashierId, "NX", "EX", "5");
        Long existingLock = redlockPosKeys.get(serialCode);
        if ((existingLock != null && (nowMs - existingLock) < 5000) || "NIL".equals(respLockReply)) {
            recordCommand(String.format("SET %s LOCKED NX EX 5", lockKey));
            Map<String, Object> res = new LinkedHashMap<>();
            res.put("success", false);
            res.put("httpStatus", 409);
            res.put("fraudDetected", true);
            res.put("alertType", "CONCURRENT_REDLOCK_COLLISION");
            res.put("error", "ALREADY_SOLD");
            res.put("serialCode", serialCode);
            res.put("message", "CẢNH BÁO REDLOCK: Mã QR đang được quét đồng thời tại một quầy POS khác (Chặn Race Condition)!");
            return res;
        }
        redlockPosKeys.put(serialCode, nowMs);
        recordCommand(String.format("SET %s LOCKED NX EX 5", lockKey));

        // Bước 3: Kiểm tra xem mã QR đơn vị đã bị bán trước đó chưa (Chống làm giả / photocopy tem QR)
        boolean alreadySoldInRedis = "1".equals(sendRespCommand("SISMEMBER", "pos:sold_qrs", serialCode));
        if (posSoldQrSet.contains(serialCode) || alreadySoldInRedis) {
            Map<String, Object> prevReceipt = soldReceiptDetails.getOrDefault(serialCode, Map.of("soldAt", "Trước đó"));
            recordCommand(String.format("SISMEMBER pos:sold_qrs %s", serialCode));

            Map<String, Object> res = new LinkedHashMap<>();
            res.put("success", false);
            res.put("httpStatus", 409);
            res.put("fraudDetected", true);
            res.put("alertType", "SEAL_VOID_ALREADY_SOLD");
            res.put("error", "ALREADY_SOLD");
            res.put("serialCode", serialCode);
            res.put("batchCode", batchCode);
            res.put("previousSale", prevReceipt);
            res.put("message", "CẢNH BÁO GIAN LẬN (HTTP 409 CONFLICT): Mã QR '" + serialCode +
                    "' ĐÃ ĐƯỢC BÁN VÀ VÔ HIỆU HÓA (SEAL_VOID)! Nghi vấn tem QR bị sao chép/tái sử dụng trái phép!");
            return res;
        }

        // Bước 4: Hợp lệ -> Ghi nhận vào Redis SET `pos:sold_qrs` và tạo biên lai thanh toán
        posSoldQrSet.add(serialCode);
        Map<String, Object> receipt = new LinkedHashMap<>();
        receipt.put("receiptId", "POS-INV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        receipt.put("serialCode", serialCode);
        receipt.put("batchCode", batchCode);
        receipt.put("productName", productName);
        receipt.put("priceVnd", price);
        receipt.put("cashierId", cashierId);
        receipt.put("sealStatus", "SEAL_VOID (ĐÃ BÁN - KHÓA VĨNH VIỄN)");
        receipt.put("soldAt", Instant.now().toString());
        soldReceiptDetails.put(serialCode, receipt);

        sendRespCommand("SADD", "pos:sold_qrs", serialCode);
        recordCommand(String.format("SADD pos:sold_qrs %s", serialCode));

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("success", true);
        res.put("httpStatus", 200);
        res.put("fraudDetected", false);
        res.put("redlockKey", lockKey);
        res.put("receipt", receipt);
        res.put("message", "Thanh toán POS thành công! Mã QR '" + serialCode + "' đã chuyển sang trạng thái SEAL_VOID.");
        return res;
    }

    public void cacheLatestTelemetry(String batchCode, String jsonTelemetry) {
        String key = "telemetry:latest:" + batchCode;
        latestTelemetryCache.put(batchCode, jsonTelemetry);
        sendRespCommand("SETEX", key, "30", jsonTelemetry);
        recordCommand(String.format("SETEX %s 30 %s", key, jsonTelemetry.length() > 50 ? jsonTelemetry.substring(0, 50) + "..." : jsonTelemetry));
    }

    public void incrementRiskScore(String categoryCode, String batchCode, double scoreIncrement) {
        String zsetKey = "risk:leaderboard:" + categoryCode;
        riskLeaderboards.computeIfAbsent(zsetKey, k -> new ConcurrentHashMap<>())
                .merge(batchCode, scoreIncrement, Double::sum);
        double newScore = riskLeaderboards.get(zsetKey).get(batchCode);
        sendRespCommand("ZINCRBY", zsetKey, String.valueOf(scoreIncrement), batchCode);
        recordCommand(String.format("ZINCRBY %s %.1f %s (Total: %.1f)", zsetKey, scoreIncrement, batchCode, newScore));
    }

    public Map<String, Double> getRiskLeaderboard(String categoryCode) {
        return new LinkedHashMap<>(riskLeaderboards.getOrDefault("risk:leaderboard:" + categoryCode, Collections.emptyMap()));
    }

    public void setItemStatus(String serialCode, String status) {
        String key = "item:status:" + serialCode;
        itemStatusMap.put(serialCode, status);
        sendRespCommand("SET", key, status);
        recordCommand(String.format("SET %s %s", key, status));
    }

    public String getItemStatus(String serialCode) {
        return itemStatusMap.getOrDefault(serialCode, "PACKED");
    }

    public void mapBatchToProfile(String batchCode, String categoryCode) {
        String key = "profile:batch:" + batchCode;
        sendRespCommand("SETEX", key, "604800", categoryCode);
        recordCommand(String.format("SETEX %s 604800 %s", key, categoryCode));
    }

    public void blacklistRecalledSerials(String batchCode, List<String> serialCodes) {
        if (serialCodes == null || serialCodes.isEmpty()) return;
        recalledBlacklistQrSet.addAll(serialCodes);
        List<String> args1 = new ArrayList<>(List.of("SADD", "recall:blacklisted_qrs"));
        args1.addAll(serialCodes);
        sendRespCommand(args1.toArray(new String[0]));

        List<String> args2 = new ArrayList<>(List.of("SADD", "blacklist:items"));
        args2.addAll(serialCodes);
        sendRespCommand(args2.toArray(new String[0]));

        recordCommand(String.format("SADD blacklist:items %s", String.join(" ", serialCodes)));
        sendRespCommand("SETEX", "recall:lock:" + batchCode, "86400", "RECALLED");
        recordCommand(String.format("SETEX recall:lock:%s 86400 RECALLED", batchCode));

        for (String s : serialCodes) {
            setItemStatus(s, "RECALLED");
        }
    }

    public boolean isSerialSold(String serialCode) {
        return posSoldQrSet.contains(serialCode);
    }

    public boolean isSerialRecalled(String serialCode) {
        return recalledBlacklistQrSet.contains(serialCode);
    }

    public Set<String> getPosSoldQrSet() {
        return new LinkedHashSet<>(posSoldQrSet);
    }

    public Set<String> getRecalledBlacklistQrSet() {
        return new LinkedHashSet<>(recalledBlacklistQrSet);
    }

    public List<String> getRecentRedisCommands() {
        return new ArrayList<>(recentRedisCommands);
    }

    private void recordCommand(String cmd) {
        recentRedisCommands.add(0, "[" + Instant.now().toString().substring(11, 19) + "] " + cmd);
        while (recentRedisCommands.size() > 30) {
            recentRedisCommands.remove(recentRedisCommands.size() - 1);
        }
    }

    /**
     * Gửi lệnh Redis theo chuẩn giao thức nhị phân RESP Array (*N\r\n$L\r\n...)
     * và đọc kết quả trả về từ Redis Server.
     */
    public String sendRespCommand(String... args) {
        if (args == null || args.length == 0) return null;
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(redisHost, redisPort), 300);
            socket.setSoTimeout(300);

            OutputStream out = socket.getOutputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            authenticateIfRequired(out, reader);

            StringBuilder resp = new StringBuilder();
            resp.append("*").append(args.length).append("\r\n");
            for (String arg : args) {
                String safeArg = arg != null ? arg : "";
                byte[] bytes = safeArg.getBytes(StandardCharsets.UTF_8);
                resp.append("$").append(bytes.length).append("\r\n").append(safeArg).append("\r\n");
            }

            out.write(resp.toString().getBytes(StandardCharsets.UTF_8));
            out.flush();

            String firstLine = reader.readLine();
            if (firstLine == null) return null;
            if (firstLine.startsWith("+") || firstLine.startsWith(":")) {
                return firstLine.substring(1);
            } else if (firstLine.startsWith("$-1")) {
                return "NIL";
            } else if (firstLine.startsWith("$")) {
                return reader.readLine();
            }
            return firstLine;
        } catch (Exception ignored) {
            // Chế độ Offline không chạy Docker Redis -> hoạt động trên In-Memory Engine
            return null;
        }
    }

    public List<String> sendRespCommandLines(String... args) {
        if (args == null || args.length == 0) return Collections.emptyList();
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(redisHost, redisPort), 350);
            socket.setSoTimeout(350);

            OutputStream out = socket.getOutputStream();
            BufferedReader reader = new BufferedReader(new InputStreamReader(socket.getInputStream(), StandardCharsets.UTF_8));
            authenticateIfRequired(out, reader);

            StringBuilder resp = new StringBuilder();
            resp.append("*").append(args.length).append("\r\n");
            for (String arg : args) {
                String safeArg = arg != null ? arg : "";
                byte[] bytes = safeArg.getBytes(StandardCharsets.UTF_8);
                resp.append("$").append(bytes.length).append("\r\n").append(safeArg).append("\r\n");
            }
            out.write(resp.toString().getBytes(StandardCharsets.UTF_8));
            out.flush();

            String line = reader.readLine();
            if (line == null || !line.startsWith("*")) return Collections.emptyList();
            int count = Integer.parseInt(line.substring(1));
            List<String> results = new ArrayList<>();
            for (int i = 0; i < count; i++) {
                String lenLine = reader.readLine();
                if (lenLine != null && lenLine.startsWith("$")) {
                    int len = Integer.parseInt(lenLine.substring(1));
                    if (len == -1) {
                        results.add(null);
                    } else {
                        results.add(reader.readLine());
                    }
                }
            }
            return results;
        } catch (Exception ignored) {
            return Collections.emptyList();
        }
    }
}
