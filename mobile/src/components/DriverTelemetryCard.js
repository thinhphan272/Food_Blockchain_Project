import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import {
  DEFAULT_API_BASE,
  fetchAllBatchesMobile,
  respondToBatchAssignmentMobile,
  startDriverTripMobile,
  completeDriverTripMobile,
  requestDoorOpenMobile,
  openTruckDoorMobile,
} from '../services/api';

export default function DriverTelemetryCard({
  theme,
  currentUser,
  apiBaseUrl = DEFAULT_API_BASE,
}) {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [relayCooling, setRelayCooling] = useState(true);
  const [progressPct, setProgressPct] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [showDoorModal, setShowDoorModal] = useState(false);
  const [doorReason, setDoorReason] = useState('');

  const driverFullName = currentUser?.fullName || currentUser?.username || 'Lê Hoàng Nam';
  const driverPlate = currentUser?.assignedEntity || '49C-567.89';

  const loadDriverBatches = async () => {
    try {
      const all = await fetchAllBatchesMobile(apiBaseUrl);
      if (Array.isArray(all)) {
        const myBatches = all.filter((b) => {
          const tj = b.transport_journey || b.transportJourney || {};
          const assignedDriver = (tj.driver_name || b.transport_driver_name || '').toLowerCase();
          const assignedPlate = (tj.vehicle_plate || b.transport_vehicle_plate || '').toUpperCase();
          return (
            (driverFullName && assignedDriver.includes(driverFullName.toLowerCase())) ||
            (driverPlate && assignedPlate.includes(driverPlate.toUpperCase()))
          );
        });
        setBatches(myBatches);
        if (selectedBatch) {
          const currentMatch = myBatches.find((b) => b.batch_code === selectedBatch.batch_code);
          setSelectedBatch(currentMatch || null);
        }
      }
    } catch (e) {}
  };

  useEffect(() => {
    loadDriverBatches();
    const poll = setInterval(loadDriverBatches, 3500);
    return () => clearInterval(poll);
  }, [currentUser?.username]);

  const pendingBatches = batches.filter((b) => b.status === 'ASSIGNED_PENDING');
  const activeOrQueuedBatches = batches.filter((b) =>
    ['READY_FOR_PICKUP', 'IN_TRANSIT'].includes(b.status)
  );
  const runningBatch = batches.find((b) => b.status === 'IN_TRANSIT');

  const isTripStarted = selectedBatch?.status === 'IN_TRANSIT';
  const isTripCompleted =
    selectedBatch?.status === 'ARRIVED_AT_STORE' || selectedBatch?.status === 'QC_ACCEPTED';
  const isAtDestination = progressPct >= 100 || isTripCompleted;

  const batchTransport = selectedBatch?.transport_journey || selectedBatch?.transportJourney || {};
  const isDoorOpen = Boolean(batchTransport.door_open);
  const isLoadingConfirmed = Boolean(batchTransport.loading_confirmed);
  const doorRequestStatus = batchTransport.door_request_status || batchTransport.door_open_request_status || 'NONE';

  // Di chuyển GPS thực tế mượt mà (90 giây toàn trình)
  useEffect(() => {
    if (!isTripStarted) {
      setProgressPct(isTripCompleted ? 100 : 0);
      return;
    }
    const timer = setInterval(() => {
      setProgressPct((prev) => Math.min(100, +(prev + 100 / 180).toFixed(1)));
    }, 500);
    return () => clearInterval(timer);
  }, [isTripStarted, isTripCompleted, selectedBatch?.batch_code]);

  const handleRespondAssignment = async (batchCode, decision) => {
    try {
      await respondToBatchAssignmentMobile(apiBaseUrl, {
        batchCode,
        decision,
        driverName: driverFullName,
        vehiclePlate: driverPlate,
      });
      setStatusMessage(
        decision === 'ACCEPT'
          ? `Đã xác nhận nhận lô ${batchCode} vào hàng đợi!`
          : `Đã từ chối nhận lô ${batchCode}.`
      );
      loadDriverBatches();
    } catch (e) {
      setStatusMessage(e.message);
    }
  };

  const handleStartTrip = async () => {
    if (!selectedBatch?.batch_code) return;
    if (runningBatch && runningBatch.batch_code !== selectedBatch.batch_code) {
      setStatusMessage(
        `Bạn đang vận chuyển lô ${runningBatch.batch_code}. Vui lòng hoàn thành trước khi chạy lô tiếp theo!`
      );
      return;
    }
    if (!isLoadingConfirmed || isDoorOpen) {
      setStatusMessage(
        'Vui lòng mở cửa thùng xe, xác nhận vận chuyển lô hàng và đóng cửa thùng trước khi bắt đầu chuyến xe!'
      );
      return;
    }
    try {
      await startDriverTripMobile(apiBaseUrl, {
        batchCode: selectedBatch.batch_code,
        vehiclePlate: driverPlate,
        driverName: driverFullName,
      });
      setProgressPct(1);
      setStatusMessage(`Chuyến xe ${driverPlate} chở lô ${selectedBatch.batch_code} đã xuất bến!`);
      loadDriverBatches();
    } catch (e) {
      setStatusMessage(e.message);
    }
  };

  const handleCompleteTrip = async () => {
    if (!selectedBatch?.batch_code || !isAtDestination) return;
    try {
      const doneCode = selectedBatch.batch_code;
      await completeDriverTripMobile(apiBaseUrl, {
        batchCode: doneCode,
        supermarketName: batchTransport.destination_store || 'Siêu Thị Co.opmart Quận 7',
        driverName: driverFullName,
      });
      setStatusMessage(
        `✓ Đã bàn giao lô ${doneCode} thành công! Giao diện sẽ giữ 20 giây trước khi chuyển về Chưa chọn lô hàng...`
      );
      loadDriverBatches();
      setTimeout(() => {
        setSelectedBatch(null);
        setStatusMessage(`Lô ${doneCode} đã hoàn tất bàn giao. Vui lòng chọn lô chờ chạy tiếp theo.`);
      }, 20000);
    } catch (e) {
      setStatusMessage(e.message);
    }
  };

  const handleDoorButtonPress = async () => {
    if (!selectedBatch?.batch_code) return;
    if (isTripCompleted && !isDoorOpen) {
      setStatusMessage('Đã đóng cửa thùng xe sau bàn giao! Không thể mở lại cho tới khi chọn lô tiếp theo.');
      return;
    }
    if (selectedBatch.status === 'READY_FOR_PICKUP') {
      if (!isDoorOpen) {
        await openTruckDoorMobile(apiBaseUrl, {
          batchCode: selectedBatch.batch_code,
          driverName: driverFullName,
          vehiclePlate: driverPlate,
          action: 'OPEN_FOR_LOADING',
          isAtDestination: false,
        });
        setStatusMessage(
          `Đã mở cửa thùng xe nhận lô ${selectedBatch.batch_code}. Bấm lại nút cửa để xác nhận vận chuyển & đóng cửa thùng!`
        );
      } else {
        await openTruckDoorMobile(apiBaseUrl, {
          batchCode: selectedBatch.batch_code,
          driverName: driverFullName,
          vehiclePlate: driverPlate,
          action: 'CONFIRM_LOADING_AND_CLOSE',
          isAtDestination: false,
        });
        setStatusMessage(
          `✓ Đã xác nhận vận chuyển lô ${selectedBatch.batch_code} và đóng kín cửa thùng xe. Sẵn sàng khởi hành!`
        );
      }
      loadDriverBatches();
      return;
    }
    if (isDoorOpen) {
      await openTruckDoorMobile(apiBaseUrl, {
        batchCode: selectedBatch.batch_code,
        driverName: driverFullName,
        vehiclePlate: driverPlate,
        action: 'CLOSE',
        isAtDestination,
      });
      setStatusMessage(`Đã đóng kín cửa thùng xe ${driverPlate}.`);
      loadDriverBatches();
      return;
    }

    if (isAtDestination || doorRequestStatus === 'APPROVED') {
      await openTruckDoorMobile(apiBaseUrl, {
        batchCode: selectedBatch.batch_code,
        driverName: driverFullName,
        vehiclePlate: driverPlate,
        action: 'OPEN',
        isAtDestination,
      });
      setStatusMessage(
        isAtDestination
          ? `Đã mở cửa thùng xe tại điểm giao để bốc dỡ lô ${selectedBatch.batch_code}.`
          : `Đã mở cửa thùng xe theo lệnh phê duyệt khẩn cấp của Admin.`
      );
      loadDriverBatches();
      return;
    }

    setShowDoorModal(true);
  };

  const handleRequestEmergencyDoor = async () => {
    if (!selectedBatch?.batch_code) return;
    try {
      await requestDoorOpenMobile(apiBaseUrl, {
        batchCode: selectedBatch.batch_code,
        driverName: driverFullName,
        vehiclePlate: driverPlate,
        reason: doorReason.trim() || 'Kiểm tra hàng hóa khẩn cấp trên tuyến',
      });
      setShowDoorModal(false);
      setDoorReason('');
      setStatusMessage('Đã gửi yêu cầu xin mở cửa khẩn cấp đến Admin!');
      loadDriverBatches();
    } catch (e) {
      setStatusMessage(e.message);
    }
  };

  const handleForceOpenDoor = async () => {
    if (!selectedBatch?.batch_code) return;
    try {
      await openTruckDoorMobile(apiBaseUrl, {
        batchCode: selectedBatch.batch_code,
        driverName: driverFullName,
        vehiclePlate: driverPlate,
        action: 'OPEN',
        isAtDestination: false,
      });
      setShowDoorModal(false);
      setStatusMessage(
        'CẢNH BÁO AN NINH: Bạn đã tự ý mở cửa thùng xe khi chưa tới điểm giao! Hệ thống đã báo động lên Admin.'
      );
      loadDriverBatches();
    } catch (e) {
      setStatusMessage(e.message);
    }
  };

  const totalDistanceKm = 308;
  const remainingKm = Math.max(0, Math.round(totalDistanceKm * (1 - progressPct / 100)));

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* 1. BIỂN SỐ XE LỚN CHUẨN KINH DOANH VẬN TẢI VIỆT NAM */}
      <View style={styles.topRow}>
        <View style={styles.plateContainer}>
          <View style={styles.plateHeader}>
            <Text style={styles.plateCountry}>VIỆT NAM</Text>
            <View style={styles.plateDot} />
          </View>
          <Text style={styles.plateNumber}>{driverPlate}</Text>
        </View>

        <View style={styles.driverInfo}>
          <Text style={[styles.driverRole, { color: theme.sub }]}>TÀI XẾ XE LẠNH</Text>
          <Text style={[styles.driverName, { color: theme.text }]}>{driverFullName}</Text>
          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>
              {!selectedBatch
                ? '○ CHƯA CHỌN LÔ HÀNG'
                : isTripStarted
                ? '● ĐANG VẬN CHUYỂN'
                : isTripCompleted
                ? '✓ ĐÃ HOÀN THÀNH'
                : '○ CHỜ KHỞI HÀNH'}
            </Text>
          </View>
        </View>
      </View>

      {statusMessage !== '' && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertBannerText}>{statusMessage}</Text>
        </View>
      )}

      {/* DANH SÁCH LÔ HÀNG ADMIN MỚI PHÂN CÔNG CHỜ TÀI XẾ NHẬN / TỪ CHỐI */}
      {pendingBatches.length > 0 && (
        <View style={styles.pendingSection}>
          <Text style={styles.pendingTitle}>
            LÔ HÀNG MỚI ĐƯỢC ADMIN PHÂN CÔNG ({pendingBatches.length})
          </Text>
          {pendingBatches.map((item) => (
            <View key={item.batch_code} style={styles.pendingItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.pendingCode}>{item.batch_code}</Text>
                <Text style={[styles.pendingName, { color: theme.text }]}>{item.product_name}</Text>
                <Text style={[styles.pendingMeta, { color: theme.sub }]}>
                  {item.weight_kg} kg • {item.farm_origin}
                </Text>
              </View>
              <View style={styles.pendingActions}>
                <TouchableOpacity
                  onPress={() => handleRespondAssignment(item.batch_code, 'ACCEPT')}
                  style={[styles.smallBtn, { backgroundColor: '#10B981' }]}
                >
                  <Text style={styles.smallBtnText}>✓ Nhận lô</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleRespondAssignment(item.batch_code, 'REJECT')}
                  style={[styles.smallBtn, { backgroundColor: '#EF4444' }]}
                >
                  <Text style={styles.smallBtnText}>✕ Từ chối</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* HÀNG ĐỢI LÔ HÀNG CỦA TÀI XẾ (TỐI ĐA 3 LÔ) */}
      {activeOrQueuedBatches.length > 1 && (
        <View style={styles.queueRow}>
          {activeOrQueuedBatches.map((b) => {
            const isSel = selectedBatch?.batch_code === b.batch_code;
            return (
              <TouchableOpacity
                key={b.batch_code}
                onPress={() => setSelectedBatch(b)}
                style={[
                  styles.queueChip,
                  isSel ? { backgroundColor: '#F95716' } : { backgroundColor: theme.accentLight },
                ]}
              >
                <Text
                  style={[
                    styles.queueChipText,
                    { color: isSel ? '#FFFFFF' : theme.text },
                  ]}
                >
                  {b.batch_code}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* 2. THẺ RIÊNG BIỆT: LÔ HÀNG HIỆN TẠI ĐANG CHỞ */}
      <View style={[styles.batchCard, { backgroundColor: theme.accentLight, borderColor: theme.border }]}>
        <View style={styles.batchHeader}>
          <Text style={[styles.batchTag, { color: theme.accent }]}>LÔ HÀNG PHỤ TRÁCH</Text>
          <Text style={[styles.batchCode, { color: theme.accent }]}>
            {selectedBatch ? selectedBatch.batch_code : 'Chưa chọn lô hàng'}
          </Text>
        </View>
        <Text style={[styles.batchProduct, { color: theme.text }]}>
          {selectedBatch ? selectedBatch.product_name : 'Chưa chọn lô hàng'}
        </Text>
        <Text style={[styles.batchMeta, { color: theme.sub }]}>
          {selectedBatch
            ? `${selectedBatch.weight_kg} kg • ${selectedBatch.farm_origin}`
            : 'Chờ Admin điều phối lô hàng'}
        </Text>
      </View>

      {/* 3. TUYẾN ĐƯỜNG VẬN CHUYỂN & CỰ LY ĐỘNG */}
      {selectedBatch && (
        <View style={[styles.routeBox, { backgroundColor: theme.accentLight }]}>
          <Text style={[styles.routeLabel, { color: theme.accent }]}>TUYẾN ĐƯỜNG VẬN CHUYỂN</Text>
          <Text style={[styles.routeName, { color: theme.text }]}>
            ĐÀ LẠT ➔ BẢO LỘC ➔ TP.HCM
          </Text>

          <View style={styles.distanceRow}>
            <View style={styles.distanceItem}>
              <Text style={[styles.distanceLabel, { color: theme.sub }]}>TỔNG CỰ LY</Text>
              <Text style={[styles.distanceVal, { color: theme.accent }]}>{totalDistanceKm} km</Text>
              <Text style={[styles.distanceSub, { color: theme.sub }]}>Quốc Lộ 20</Text>
            </View>
            <View style={[styles.distanceDivider, { backgroundColor: theme.border }]} />
            <View style={styles.distanceItem}>
              <Text style={[styles.distanceLabel, { color: theme.sub }]}>CÒN LẠI TỚI ĐÍCH</Text>
              <Text
                style={[
                  styles.distanceVal,
                  { color: isAtDestination ? '#10B981' : theme.text },
                ]}
              >
                {remainingKm} km
              </Text>
              <Text style={[styles.distanceSub, { color: theme.sub }]}>
                {isTripCompleted
                  ? 'Đã hoàn thành'
                  : isAtDestination
                  ? 'Đã tới điểm giao'
                  : isTripStarted
                  ? `Đang chạy (${progressPct}%)`
                  : 'Chưa xuất bến'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* 4. NÚT HÀNH ĐỘNG CỦA TÀI XẾ & CẢM BIẾN CỬA THÙNG XE */}
      {selectedBatch && selectedBatch.status === 'READY_FOR_PICKUP' && (
        <TouchableOpacity
          onPress={handleStartTrip}
          disabled={!isLoadingConfirmed || isDoorOpen}
          style={[
            styles.actionBtn,
            !isLoadingConfirmed || isDoorOpen
              ? { backgroundColor: '#9CA3AF', opacity: 0.7 }
              : { backgroundColor: '#F95716' },
          ]}
          activeOpacity={0.8}
        >
          <Text style={styles.actionBtnText}>
            {!isLoadingConfirmed || isDoorOpen
              ? 'KHÓA XUẤT BẾN (MỞ CỬA & XÁC NHẬN BỐC HÀNG)'
              : 'BẮT ĐẦU CHUYẾN XE'}
          </Text>
        </TouchableOpacity>
      )}

      {selectedBatch && (isTripStarted || isTripCompleted || selectedBatch.status === 'READY_FOR_PICKUP') && (
        <View style={{ gap: 8 }}>
          <TouchableOpacity
            onPress={handleDoorButtonPress}
            disabled={isTripCompleted && !isDoorOpen}
            style={[
              styles.actionBtn,
              isTripCompleted && !isDoorOpen
                ? { backgroundColor: '#9CA3AF', opacity: 0.65 }
                : selectedBatch.status === 'READY_FOR_PICKUP' && isDoorOpen
                ? { backgroundColor: '#10B981' }
                : { backgroundColor: isDoorOpen ? '#EF4444' : '#F59E0B' },
            ]}
            activeOpacity={0.8}
          >
            <Text style={styles.actionBtnText}>
              {isTripCompleted && !isDoorOpen
                ? 'ĐÃ ĐÓNG CỬA THÙNG XE (KHÓA SAU BÀN GIAO)'
                : selectedBatch.status === 'READY_FOR_PICKUP' && isDoorOpen
                ? '✓ XÁC NHẬN VẬN CHUYỂN & ĐÓNG CỬA THÙNG XE'
                : selectedBatch.status === 'READY_FOR_PICKUP' && !isLoadingConfirmed
                ? '1. MỞ CỬA THÙNG XE NHẬN HÀNG'
                : isDoorOpen
                ? 'ĐÓNG CỬA THÙNG XE'
                : 'MỞ CỬA THÙNG XE'}
            </Text>
          </TouchableOpacity>

          {isTripStarted && (
            <TouchableOpacity
              onPress={handleCompleteTrip}
              disabled={!isAtDestination}
              style={[
                styles.actionBtn,
                isAtDestination
                  ? { backgroundColor: '#10B981' }
                  : { backgroundColor: '#9CA3AF', opacity: 0.6 },
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>ĐÃ HOÀN THÀNH CHUYẾN XE</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* HỘP THOẠI XÁC NHẬN MỞ CỬA KHI CHƯA TỚI ĐIỂM ĐÍCH */}
      {showDoorModal && (
        <View style={styles.doorModalBox}>
          <Text style={styles.doorModalTitle}>
            CẢNH BÁO: XE CHƯA TỚI ĐIỂM GIAO HÀNG (CÒN {remainingKm} KM)
          </Text>
          <Text style={styles.doorModalDesc}>
            Mở cửa thùng xe lạnh khi đang di chuyển sẽ làm thất thoát nhiệt lạnh. Vui lòng gửi yêu cầu xin lệnh Admin hoặc xác nhận mở khẩn cấp:
          </Text>
          <TextInput
            value={doorReason}
            onChangeText={setDoorReason}
            placeholder="Nhập lý do xin mở cửa thùng xe..."
            placeholderTextColor="#9CA3AF"
            style={styles.doorInput}
          />
          <View style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={handleRequestEmergencyDoor}
              style={[styles.actionBtn, { backgroundColor: '#F59E0B' }]}
            >
              <Text style={styles.actionBtnText}>GỬI YÊU CẦU XIN LỆNH ADMIN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleForceOpenDoor}
              style={[styles.actionBtn, { backgroundColor: '#DC2626' }]}
            >
              <Text style={styles.actionBtnText}>VẪN MỞ CỬA NGAY (CẢNH BÁO AN NINH)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowDoorModal(false)}
              style={styles.resetBtn}
            >
              <Text style={[styles.resetBtnText, { color: theme.sub }]}>Hủy thao tác</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 5. CẢM BIẾN NHIỆT ĐỘ & KHÍ BẢO QUẢN (CHỈ HIỆN KHI ĐANG CHẠY) */}
      <View style={styles.metricsRow}>
        <View style={[styles.metricBox, { backgroundColor: theme.accentLight }]}>
          <Text style={[styles.metricLabel, { color: theme.sub }]}>NHIỆT ĐỘ THÙNG</Text>
          <Text style={[styles.metricVal, { color: theme.accent }]}>
            {isTripStarted ? '9.5°C' : '— °C'}
          </Text>
          <Text style={styles.metricStatus}>
            {isTripStarted ? '✓ Đạt chuẩn bảo quản' : 'Chờ xuất bến'}
          </Text>
        </View>

        <View style={[styles.metricBox, { backgroundColor: theme.accentLight }]}>
          <Text style={[styles.metricLabel, { color: theme.sub }]}>KHÍ SINH HỌC</Text>
          <Text style={[styles.metricVal, { color: '#10B981' }]}>
            {isTripStarted ? '8.0 ppm' : '— ppm'}
          </Text>
          <Text style={styles.metricStatus}>
            {isTripStarted ? '✓ An toàn <30 ppm' : 'Chờ xuất bến'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => isTripStarted && setRelayCooling(!relayCooling)}
        disabled={!isTripStarted}
        style={[
          styles.relayBtn,
          !isTripStarted
            ? { backgroundColor: '#6B7280', opacity: 0.5 }
            : relayCooling
            ? { backgroundColor: '#10B981' }
            : { backgroundColor: '#6B7280' },
        ]}
        activeOpacity={0.8}
      >
        <Text style={styles.relayBtnText}>
          LỐC LẠNH THERMO KING: {!isTripStarted ? 'CHỜ XUẤT BẾN' : relayCooling ? 'ĐANG BẬT (ON)' : 'TẮT (OFF)'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  plateContainer: {
    backgroundColor: '#FFD700',
    borderWidth: 2,
    borderColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  plateCountry: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: 1,
  },
  plateDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DC2626',
  },
  plateNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 1.5,
    fontFamily: 'monospace',
  },
  driverInfo: {
    flex: 1,
  },
  driverRole: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  driverName: {
    fontSize: 15,
    fontWeight: '900',
    marginTop: 1,
  },
  statusBadge: {
    marginTop: 3,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#F95716',
  },
  alertBanner: {
    backgroundColor: 'rgba(249, 87, 22, 0.12)',
    padding: 10,
    borderRadius: 12,
  },
  alertBannerText: {
    color: '#F95716',
    fontSize: 11.5,
    fontWeight: '700',
  },
  pendingSection: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  pendingTitle: {
    fontSize: 10.5,
    fontWeight: '900',
    color: '#D97706',
  },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 6,
  },
  pendingCode: {
    fontSize: 11,
    fontWeight: '900',
    color: '#F95716',
  },
  pendingName: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  pendingMeta: {
    fontSize: 10.5,
  },
  pendingActions: {
    gap: 6,
  },
  smallBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  smallBtnText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    fontWeight: '800',
  },
  queueRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  queueChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  queueChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  batchCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  batchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  batchTag: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  batchCode: {
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  batchProduct: {
    fontSize: 15,
    fontWeight: '900',
  },
  batchMeta: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  routeBox: {
    borderRadius: 16,
    padding: 14,
  },
  routeLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  routeName: {
    fontSize: 16,
    fontWeight: '900',
  },
  distanceRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
  },
  distanceItem: {
    flex: 1,
  },
  distanceDivider: {
    width: 1,
    height: 36,
    marginHorizontal: 12,
  },
  distanceLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  distanceVal: {
    fontSize: 16,
    fontWeight: '900',
    marginTop: 1,
  },
  distanceSub: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  actionBtn: {
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  doorModalBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  doorModalTitle: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '900',
  },
  doorModalDesc: {
    color: '#9CA3AF',
    fontSize: 11,
    lineHeight: 16,
  },
  doorInput: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#FFFFFF',
    fontSize: 12,
  },
  resetBtn: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  resetBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricBox: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
  },
  metricLabel: {
    fontSize: 9,
    fontWeight: '800',
  },
  metricVal: {
    fontSize: 18,
    fontWeight: '900',
    marginVertical: 2,
  },
  metricStatus: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  relayBtn: {
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relayBtnText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    fontWeight: '900',
  },
});
