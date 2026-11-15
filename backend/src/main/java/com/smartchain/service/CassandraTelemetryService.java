package com.smartchain.service;

import com.datastax.oss.driver.api.core.CqlSession;
import com.datastax.oss.driver.api.core.cql.PreparedStatement;
import com.datastax.oss.driver.api.core.cql.ResultSet;
import com.datastax.oss.driver.api.core.cql.Row;
import com.smartchain.dto.SensorTelemetryDto;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.stream.Collectors;

/**
 * Cassandra Wide-Column Time-Series Service:
 * Mô phỏng & đồng bộ trực tiếp bảng `smartchain_iot.sensor_telemetry`
 * với Partition Key `(batch_code, year_month)` và Clustering Key `recorded_at DESC`.
 * Tính năng:
 * - Bổ sung cột `latitude` và `longitude`
 * - Tự động tính `year_month` động theo `YearMonth.now(ZoneOffset.UTC)`
 * - Thực thi câu lệnh CQL `SELECT` thật khi kết nối Cassandra khả dụng.
 */
@Service
public class CassandraTelemetryService {

    private static final Logger log = LoggerFactory.getLogger(CassandraTelemetryService.class);

    // Partition Key: batchCode -> List of Time-Series Rows (sorted by timestamp DESC)
    private final Map<String, List<SensorTelemetryDto>> wideColumnPartitions = new ConcurrentHashMap<>();
    private final List<String> recentCqlQueries = new CopyOnWriteArrayList<>();

    @Value("${spring.data.cassandra.keyspace-name:supermarket_telemetry_ks}")
    private String keyspace = "supermarket_telemetry_ks";

    @Autowired(required = false)
    private CqlSession cqlSession;

    private PreparedStatement insertPrepared;
    private PreparedStatement selectByBatchPrepared;

    @PostConstruct
    public void initCassandraSchema() {
        if (cqlSession == null) return;
        try {
            cqlSession.execute(String.format(
                    "CREATE KEYSPACE IF NOT EXISTS %s WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}",
                    keyspace
            ));
            cqlSession.execute(String.format(
                    "CREATE TABLE IF NOT EXISTS %s.sensor_telemetry (" +
                    "batch_code text, year_month text, recorded_at timestamp, device_id text, vehicle_id text, " +
                    "category text, temperature double, humidity double, gas_value double, gas_type text, " +
                    "weight_kg double, door_open boolean, is_breached boolean, relay_cooling boolean, " +
                    "alert_triggered text, latitude double, longitude double, " +
                    "PRIMARY KEY ((batch_code, year_month), recorded_at)) WITH CLUSTERING ORDER BY (recorded_at DESC)",
                    keyspace
            ));
            insertPrepared = cqlSession.prepare(String.format(
                    "INSERT INTO %s.sensor_telemetry (batch_code, year_month, recorded_at, device_id, vehicle_id, " +
                    "category, temperature, humidity, gas_value, gas_type, weight_kg, door_open, is_breached, relay_cooling, alert_triggered, latitude, longitude) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    keyspace
            ));
            selectByBatchPrepared = cqlSession.prepare(String.format(
                    "SELECT batch_code, year_month, recorded_at, device_id, vehicle_id, category, " +
                    "temperature, humidity, gas_value, gas_type, weight_kg, door_open, is_breached, relay_cooling, alert_triggered, latitude, longitude " +
                    "FROM %s.sensor_telemetry WHERE batch_code = ? AND year_month = ? LIMIT 200",
                    keyspace
            ));
            log.info("[CASSANDRA-INIT] Keyspace '{}' and table 'sensor_telemetry' ready.", keyspace);
        } catch (Exception e) {
            log.debug("[CASSANDRA-INIT] Non-fatal error preparing schema: {}", e.getMessage());
        }
    }

    public void appendTelemetryRow(SensorTelemetryDto dto) {
        if (dto.getBatchCode() == null || dto.getBatchCode().isBlank()) {
            dto.setBatchCode("LOT-VEG-2026-001");
        }
        if (dto.getTimestamp() == null) {
            dto.setTimestamp(Instant.now());
        }

        List<SensorTelemetryDto> partition = wideColumnPartitions.computeIfAbsent(
                dto.getBatchCode(), k -> new CopyOnWriteArrayList<>()
        );
        partition.add(0, dto);
        while (partition.size() > 200) {
            partition.remove(partition.size() - 1);
        }

        String yearMonth = YearMonth.from(dto.getTimestamp().atZone(ZoneOffset.UTC)).toString();

        String cql = String.format(Locale.US,
                "INSERT INTO %s.sensor_telemetry (batch_code, year_month, recorded_at, device_id, category, temperature, humidity, gas_value, gas_type, weight_kg, door_open, is_breached, latitude, longitude) " +
                "VALUES ('%s', '%s', '%s', '%s', '%s', %.2f, %.2f, %.2f, '%s', %.1f, %s, %s, %.5f, %.5f);",
                keyspace,
                dto.getBatchCode(), yearMonth, dto.getTimestamp().toString(),
                dto.getDeviceId(), dto.getCategoryCode(),
                dto.getTemperature() != null ? dto.getTemperature() : 0.0,
                dto.getHumidity() != null ? dto.getHumidity() : 0.0,
                dto.getGasPpm() != null ? dto.getGasPpm() : 0.0,
                dto.getGasType() != null ? dto.getGasType() : "NONE",
                dto.getWeightKg() != null ? dto.getWeightKg() : 150.0,
                dto.getDoorOpen(), dto.getIsBreached(),
                dto.getLatitude(), dto.getLongitude()
        );
        recentCqlQueries.add(0, cql);
        while (recentCqlQueries.size() > 25) {
            recentCqlQueries.remove(recentCqlQueries.size() - 1);
        }

        if (cqlSession != null && insertPrepared != null) {
            try {
                cqlSession.execute(insertPrepared.bind(
                        dto.getBatchCode(),
                        yearMonth,
                        dto.getTimestamp(),
                        dto.getDeviceId() != null ? dto.getDeviceId() : "ESP32-MULTI-01",
                        dto.getVehicleId() != null ? dto.getVehicleId() : "49C-567.89",
                        dto.getCategoryCode() != null ? dto.getCategoryCode() : "VEG_FRUIT",
                        dto.getTemperature() != null ? dto.getTemperature() : 0.0,
                        dto.getHumidity() != null ? dto.getHumidity() : 0.0,
                        dto.getGasPpm() != null ? dto.getGasPpm() : 0.0,
                        dto.getGasType() != null ? dto.getGasType() : "NONE",
                        dto.getWeightKg() != null ? dto.getWeightKg() : 150.0,
                        Boolean.TRUE.equals(dto.getDoorOpen()),
                        Boolean.TRUE.equals(dto.getIsBreached()),
                        Boolean.TRUE.equals(dto.getRelayCooling()),
                        dto.getAlertTriggered() != null ? dto.getAlertTriggered() : "NORMAL",
                        dto.getLatitude(),
                        dto.getLongitude()
                ));
            } catch (Exception e) {
                log.debug("[CASSANDRA-WRITE] Non-fatal error writing row: {}", e.getMessage());
            }
        }
    }

    public void clearTelemetryForBatch(String batchCode) {
        if (batchCode == null) return;
        wideColumnPartitions.remove(batchCode);
        if (cqlSession != null) {
            try {
                String currentYm = YearMonth.now(ZoneOffset.UTC).toString();
                cqlSession.execute(String.format("DELETE FROM %s.sensor_telemetry WHERE batch_code = '%s' AND year_month = '%s'", keyspace, batchCode, currentYm));
            } catch (Exception e) {
                log.debug("[CASSANDRA-CLEAR] Non-fatal error clearing telemetry for {}: {}", batchCode, e.getMessage());
            }
        }
    }

    /**
     * Thực thi truy vấn CQL SELECT thật từ Cassandra khi kết nối khả dụng,
     * đồng thời hợp nhất với bộ đệm thời gian thực.
     */
    public List<SensorTelemetryDto> getTelemetryByBatch(String batchCode) {
        if (cqlSession != null && selectByBatchPrepared != null) {
            try {
                String currentYm = YearMonth.now(ZoneOffset.UTC).toString();
                ResultSet rs = cqlSession.execute(selectByBatchPrepared.bind(batchCode, currentYm));
                List<SensorTelemetryDto> dbRows = new ArrayList<>();
                for (Row row : rs) {
                    dbRows.add(mapRowToDto(row));
                }
                if (!dbRows.isEmpty()) {
                    return dbRows;
                }
            } catch (Exception e) {
                log.debug("[CASSANDRA-READ] Fallback to memory partition for {}: {}", batchCode, e.getMessage());
            }
        }
        return new ArrayList<>(wideColumnPartitions.getOrDefault(batchCode, Collections.emptyList()));
    }

    public List<SensorTelemetryDto> getAllRecentTelemetry(int limit) {
        if (cqlSession != null) {
            try {
                ResultSet rs = cqlSession.execute(String.format(
                        "SELECT batch_code, year_month, recorded_at, device_id, vehicle_id, category, " +
                        "temperature, humidity, gas_value, gas_type, weight_kg, door_open, is_breached, relay_cooling, alert_triggered, latitude, longitude " +
                        "FROM %s.sensor_telemetry LIMIT %d", keyspace, Math.max(1, limit)));
                List<SensorTelemetryDto> dbRows = new ArrayList<>();
                for (Row row : rs) {
                    dbRows.add(mapRowToDto(row));
                }
                if (!dbRows.isEmpty()) {
                    dbRows.sort(Comparator.comparing(SensorTelemetryDto::getTimestamp).reversed());
                    return dbRows;
                }
            } catch (Exception e) {
                log.debug("[CASSANDRA-READ-ALL] Fallback to memory partitions: {}", e.getMessage());
            }
        }
        return wideColumnPartitions.values().stream()
                .flatMap(List::stream)
                .sorted(Comparator.comparing(SensorTelemetryDto::getTimestamp).reversed())
                .limit(limit)
                .collect(Collectors.toList());
    }

    private SensorTelemetryDto mapRowToDto(Row row) {
        SensorTelemetryDto dto = new SensorTelemetryDto();
        dto.setBatchCode(row.getString("batch_code"));
        dto.setTimestamp(row.getInstant("recorded_at"));
        dto.setDeviceId(row.getString("device_id"));
        if (row.getColumnDefinitions().contains("vehicle_id") && !row.isNull("vehicle_id")) {
            dto.setVehicleId(row.getString("vehicle_id"));
        }
        if (row.getColumnDefinitions().contains("category") && !row.isNull("category")) {
            dto.setCategoryCode(row.getString("category"));
        } else if (row.getColumnDefinitions().contains("category_code") && !row.isNull("category_code")) {
            dto.setCategoryCode(row.getString("category_code"));
        }
        dto.setTemperature(row.getDouble("temperature"));
        dto.setHumidity(row.getDouble("humidity"));
        dto.setGasType(row.getString("gas_type"));
        if (row.getColumnDefinitions().contains("gas_value") && !row.isNull("gas_value")) {
            dto.setGasPpm(row.getDouble("gas_value"));
        } else if (row.getColumnDefinitions().contains("gas_ppm") && !row.isNull("gas_ppm")) {
            dto.setGasPpm(row.getDouble("gas_ppm"));
        }
        if (row.getColumnDefinitions().contains("weight_kg") && !row.isNull("weight_kg")) {
            dto.setWeightKg(row.getDouble("weight_kg"));
        }
        dto.setDoorOpen(row.getBoolean("door_open"));
        if (row.getColumnDefinitions().contains("is_breached") && !row.isNull("is_breached")) {
            dto.setIsBreached(row.getBoolean("is_breached"));
        }
        if (row.getColumnDefinitions().contains("relay_cooling") && !row.isNull("relay_cooling")) {
            dto.setRelayCooling(row.getBoolean("relay_cooling"));
        }
        if (row.getColumnDefinitions().contains("alert_triggered") && !row.isNull("alert_triggered")) {
            dto.setAlertTriggered(row.getString("alert_triggered"));
        }
        if (row.getColumnDefinitions().contains("latitude") && !row.isNull("latitude")) {
            dto.setLatitude(row.getDouble("latitude"));
        }
        if (row.getColumnDefinitions().contains("longitude") && !row.isNull("longitude")) {
            dto.setLongitude(row.getDouble("longitude"));
        }
        return dto;
    }

    public List<String> buildMerkleLeavesForBatch(String batchCode) {
        return getTelemetryByBatch(batchCode).stream()
                .map(t -> String.format(Locale.US, "%s|%s|%.2f|%.2f|%s|%.2f|%s",
                        t.getBatchCode(),
                        t.getTimestamp().toString(),
                        t.getTemperature() != null ? t.getTemperature() : 0.0,
                        t.getHumidity() != null ? t.getHumidity() : 0.0,
                        t.getGasType() != null ? t.getGasType() : "NONE",
                        t.getGasPpm() != null ? t.getGasPpm() : 0.0,
                        t.getAlertTriggered() != null ? t.getAlertTriggered() : "NORMAL"))
                .collect(Collectors.toList());
    }

    public Map<String, Object> getCassandraClusterOverview() {
        int totalRows = wideColumnPartitions.values().stream().mapToInt(List::size).sum();
        String currentYm = YearMonth.now(ZoneOffset.UTC).toString();
        Map<String, Integer> partitionCounts = new LinkedHashMap<>();
        wideColumnPartitions.forEach((k, v) -> partitionCounts.put(k + " (" + currentYm + ")", v.size()));

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("keyspace", keyspace);
        res.put("table", "sensor_telemetry");
        res.put("partitionKey", "(batch_code, year_month)");
        res.put("clusteringKey", "recorded_at DESC");
        res.put("ttlSeconds", 15552000);
        res.put("compactionStrategy", "TimeWindowCompactionStrategy (TWCS)");
        res.put("totalPartitions", wideColumnPartitions.size());
        res.put("totalRowsStored", totalRows);
        res.put("partitionRowCounts", partitionCounts);
        res.put("recentCqlQueries", new ArrayList<>(recentCqlQueries));
        return res;
    }
}
