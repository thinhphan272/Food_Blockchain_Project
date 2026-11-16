import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Activity,
  Cpu,
  Repeat,
  Power,
  Truck,
  CheckCircle,
  Clock,
  AlertTriangle,
  Box,
  Search,
  Copy,
  X,
  ShieldCheck,
  Unlock,
  Lock,
  ChevronLeft,
  ChevronRight,
  Wifi,
  WifiOff,
} from '../components/MomentumIcons';
import {
  VietnamColdChainMap,
  DualAxisTelemetryChart,
  getRouteForBatch,
  getInterpolatedPosition,
} from '../components/ColdChainWidgets';
import {
  fetchDriverTrips,
  resetDriverTrip,
  assignBatchToDriver,
  revokeBatchAssignment,
  respondToBatchAssignment,
  requestDoorOpen,
  approveDoorOpen,
  openTruckDoor,
  sendRelayCommand,
} from '../services/api';

const DEFAULT_DRIVER_ROSTER = [
  { username: 'driver_01', fullName: 'Lê Hoàng Nam', vehiclePlate: '49C-567.89' },
  { username: 'driver_02', fullName: 'Phạm Tài Xế', vehiclePlate: '51D-998.12' },
  { username: 'driver_03', fullName: 'Trần Văn Lái', vehiclePlate: '62C-334.55' },
  { username: 'driver_04', fullName: 'Võ Thành Đạt', vehiclePlate: '51C-777.99' },
  { username: 'driver_05', fullName: 'Đặng Quốc Huy', vehiclePlate: '49C-112.33' },
  { username: 'driver_06', fullName: 'Hoàng Gia Bảo', vehiclePlate: '61C-889.01' },
];

export default function ColdChainIotPage({
  latestTelemetry,
  selectedBatch,
  selectedProfile,
  telemetryList = [],
  isDark,
  currentTemp = 9.5,
  currentGas = 0.0,
  tempStatusText = 'An toàn',
  relayState,
  handleToggleRelay,
  handleOtaSync,
  handleStartDriverTrip,
  handleCompleteDriverTrip,
  currentUser,
  batches = [],
  onSelectBatch,
  refreshCoreData,
  enterpriseUsersList = [],
  setSystemAlert,
}) {
  const CARD =
    'rounded-[28px] border border-orange-950/5 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-orange-500/10 dark:bg-[#1C140F]';

  const [tripData, setTripData] = useState(null);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Bộ đếm chu kỳ 500ms để nội suy tọa độ GPS xe chạy nhanh và mượt trên bản đồ
  const [transitTick, setTransitTick] = useState(0);

  // Bộ lọc tìm kiếm & phân trang lịch sử chuyến xe (10 chuyến / 1 trang)
  const [tripSearchQuery, setTripSearchQuery] = useState('');
  const [tripPage, setTripPage] = useState(1);
  const TRIPS_PER_PAGE = 10;

  // Modal xem thông tin chi tiết lịch sử chuyến xe
  const [selectedTripDetail, setSelectedTripDetail] = useState(null);
  const [copiedTx, setCopiedTx] = useState(false);

  // State điều phối giao lô hàng của Admin
  const [selectedDriverToAssign, setSelectedDriverToAssign] = useState('driver_01');

  // State Modal Mở cửa thùng xe & Xin lệnh mở cửa khẩn cấp
  const [showDoorModal, setShowDoorModal] = useState(false);
  const [doorOpenReason, setDoorOpenReason] = useState('');
  const [doorSubmitting, setDoorSubmitting] = useState(false);

  // Bộ đếm ngược 20 giây giữ giao diện sau khi bàn giao lô hàng xong trước khi chuyển về "Chưa chọn lô hàng"
  const [postDeliveryCountdown, setPostDeliveryCountdown] = useState(null);
  const deliveredCountdownBatchRef = React.useRef(null);

  // State mô phỏng mất kết nối mạng 4G/WiFi (Store-and-Forward Offline Buffering)
  const [isSimulatedOffline, setIsSimulatedOffline] = useState(false);

  const handleToggleOfflineMode = async () => {
    const nextState = !isSimulatedOffline;
    setIsSimulatedOffline(nextState);
    const action = nextState ? 'SIMULATE_OFFLINE' : 'SIMULATE_ONLINE';
    const reason = nextState ? 'Mô phỏng xe đi vào vùng mất sóng 4G/WiFi (Đèo/Hầm)' : 'Xe ra khỏi vùng mất sóng, khôi phục mạng';
    try {
      await sendRelayCommand('ESP32-MULTI-01', action, reason);
      if (setSystemAlert) {
        setSystemAlert({
          type: nextState ? 'warning' : 'success',
          message: nextState
            ? '📡 ĐÃ KÍCH HOẠT CHẾ ĐỘ MẤT MẠNG 4G: Thiết bị IoT tự động chuyển sang lưu trữ cục bộ vào bộ đệm Flash (Store-and-Forward). Dàn lạnh rơ-le vẫn tiếp tục bảo vệ hàng tự động tại biên!'
            : '⚡ ĐÃ KHÔI PHỤC KẾT NỐI 4G: Thiết bị IoT đang đồng bộ toàn bộ các bản ghi đệm lên HiveMQ, Cassandra và Blockchain!',
        });
      }
    } catch (err) {
      console.warn('Lỗi điều khiển chế độ mất mạng:', err.message);
    }
  };

  // Phân biệt vai trò: ADMIN (Giám sát & Điều phối) vs LOGISTICS_DRIVER (Tài xế vận chuyển)
  const isAdmin = currentUser?.role === 'ADMIN';
  const isDriver = currentUser?.role === 'LOGISTICS_DRIVER';
  const hasSelectedBatch = Boolean(selectedBatch && selectedBatch.batch_code);

  // Danh sách tài xế phục vụ Admin phân công lô hàng
  const driverRoster = React.useMemo(() => {
    const fromUsers = (enterpriseUsersList || [])
      .filter((u) => u.role === 'LOGISTICS_DRIVER' || u.role?.roleName === 'LOGISTICS_DRIVER')
      .map((u) => ({
        username: u.username,
        fullName: u.fullName || u.username,
        vehiclePlate: (u.assignedEntity || '49C-567.89').replace(/^Xe[^0-9]*/i, '').trim(),
      }));
    return fromUsers.length > 0 ? fromUsers : DEFAULT_DRIVER_ROSTER;
  }, [enterpriseUsersList]);

  // Lấy dữ liệu vận chuyển đã gán trong thông tin lô hàng
  const batchTransport = selectedBatch?.transportJourney || selectedBatch?.transport_journey || {};
  const assignedDriverRaw =
    batchTransport.driver_name ||
    selectedBatch?.transport_driver_name ||
    selectedBatch?.driver_name ||
    '';
  const assignedPlateRaw =
    batchTransport.vehicle_plate ||
    selectedBatch?.transport_vehicle_plate ||
    selectedBatch?.vehicle_plate ||
    selectedBatch?.vehiclePlate ||
    '';

  const isBatchAssigned = Boolean(
    hasSelectedBatch &&
      ((assignedPlateRaw &&
        assignedPlateRaw.trim() !== '' &&
        !assignedPlateRaw.toUpperCase().includes('CHƯA')) ||
        (assignedDriverRaw &&
          assignedDriverRaw.trim() !== '' &&
          !assignedDriverRaw.toLowerCase().includes('chưa')))
  );

  const isPendingDriverAcceptance =
    hasSelectedBatch && isBatchAssigned && selectedBatch?.status === 'ASSIGNED_PENDING';

  // Tên tài xế và biển số xe hiển thị chuẩn xác
  let displayDriverName = 'Chưa chọn lô hàng';
  let displayPlate = 'Chưa chọn lô hàng';

  if (hasSelectedBatch) {
    if (isBatchAssigned) {
      const rawDriver =
        assignedDriverRaw ||
        (isDriver ? currentUser?.fullName || currentUser?.username : 'Lê Hoàng Nam');
      displayDriverName = rawDriver.replace(/\s*\(Tài xế[^)]*\)/i, '').trim();
      displayPlate = (assignedPlateRaw || '49C-567.89').toUpperCase();
    } else {
      displayDriverName = 'Chưa có tài xế nhận lô hàng';
      displayPlate = 'CHƯA GÁN XE';
    }
  }

  // Trạng thái cửa thùng xe, xác nhận bốc xếp trước khi chạy & khóa cửa sau bàn giao
  const isDoorOpen = Boolean(
    batchTransport.door_open ||
      (hasSelectedBatch && isBatchAssigned && latestTelemetry?.door_open)
  );
  const isLoadingConfirmed = Boolean(batchTransport.loading_confirmed);
  const isDoorLockedAfterDelivery = Boolean(batchTransport.door_locked_after_delivery);
  const doorRequestStatus = batchTransport.door_request_status || 'NONE';
  const doorRequestReason = batchTransport.door_request_reason || '';

  // Tải dữ liệu lịch sử chuyến xe
  const loadTrips = () => {
    setLoadingTrips(true);
    const myPlate = (currentUser?.assignedEntity || '').replace(/^Xe[^0-9]*/i, '').trim();
    const vehicleQuery = isAdmin
      ? 'all'
      : myPlate || (isBatchAssigned ? displayPlate : '49C-567.89');

    fetchDriverTrips(vehicleQuery)
      .then((data) => {
        if (data) setTripData(data);
      })
      .catch((err) => console.warn('Lỗi tải lịch sử chuyến xe:', err.message))
      .finally(() => setLoadingTrips(false));
  };

  useEffect(() => {
    loadTrips();
  }, [selectedBatch?.batch_code, selectedBatch?.status, isAdmin]);

  // Trạng thái hành trình lô hàng
  const rawStatus = selectedBatch?.status || 'CREATED';
  const isRecalled = String(rawStatus).toUpperCase().includes('RECALL');
  const isTripRunning = hasSelectedBatch && isBatchAssigned && rawStatus === 'IN_TRANSIT' && !isRecalled;
  const isTripDelivered =
    hasSelectedBatch &&
    isBatchAssigned &&
    (rawStatus === 'ARRIVED_AT_STORE' || rawStatus === 'DELIVERED' || rawStatus === 'ON_SHELF') &&
    !isRecalled;
  const isReady =
    hasSelectedBatch &&
    isBatchAssigned &&
    !isPendingDriverAcceptance &&
    !isTripRunning &&
    !isTripDelivered &&
    !isRecalled;

  // Lấy dữ liệu tuyến đường đa dạng theo lô hàng được chọn
  const currentRoute = getRouteForBatch(selectedBatch?.batch_code, selectedBatch);
  const totalKm = currentRoute.totalKm || 308;

  // Các lô hàng thuộc quyền của tài xế đang đăng nhập (Chờ nhận + Đã nhận trong hàng đợi)
  const myPendingBatches = React.useMemo(() => {
    if (!isDriver) return [];
    return (batches || []).filter((b) => b.status === 'ASSIGNED_PENDING');
  }, [batches, isDriver]);

  const myAcceptedActiveBatches = React.useMemo(() => {
    if (!isDriver) return [];
    return (batches || []).filter(
      (b) => b.status === 'READY_FOR_PICKUP' || b.status === 'IN_TRANSIT'
    );
  }, [batches, isDriver]);

  // Quy tắc Đơn nhiệm: 1 tài xế chỉ được chở 1 lô hàng cùng lúc
  const runningBatch = (batches || []).find((b) => {
    if (b.status !== 'IN_TRANSIT') return false;
    if (!isDriver) return false;
    const bTrans = b.transportJourney || b.transport_journey || {};
    const bDriver = (
      bTrans.driver_name ||
      b.transport_driver_name ||
      b.driver_name ||
      ''
    ).toLowerCase();
    const bPlate = (
      bTrans.vehicle_plate ||
      b.transport_vehicle_plate ||
      b.vehicle_plate ||
      b.vehiclePlate ||
      ''
    ).toUpperCase();
    const myName = (currentUser?.fullName || currentUser?.username || '').toLowerCase();
    const myPlate = (currentUser?.assignedEntity || displayPlate || '').toUpperCase();
    return (
      (bDriver && myName && (bDriver.includes(myName) || myName.includes(bDriver))) ||
      (bPlate && myPlate && bPlate.includes(myPlate))
    );
  });
  const isAnotherBatchRunning = Boolean(
    isDriver && runningBatch && runningBatch.batch_code !== selectedBatch?.batch_code
  );

  // Bộ đếm 500ms để nội suy tọa độ GPS xe chạy nhanh và mượt trên bản đồ
  useEffect(() => {
    if (!isTripRunning) return;
    const interval = setInterval(() => {
      setTransitTick((t) => t + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [isTripRunning]);

  // Lắng nghe sự kiện đồng bộ trạng thái từ WebSocket
  useEffect(() => {
    const handleStatusSync = () => {
      loadTrips();
      if (refreshCoreData) refreshCoreData();
    };
    window.addEventListener('batch-status-changed', handleStatusSync);
    return () => window.removeEventListener('batch-status-changed', handleStatusSync);
  }, []);

  // Thời gian di chuyển toàn tuyến ~ 240 giây (4 phút) để xe chạy chậm rãi, dễ quan sát sự thay đổi nhiệt độ, số km và định vị GPS qua từng trạm
  const TRIP_DURATION_MS = 240000;
  const batchCodeKey = selectedBatch?.batch_code || 'NONE';

  // Tự động đếm ngược 20 giây sau khi tài xế hoàn thành bàn giao lô hàng -> sau 20s tự xóa lô khỏi màn hình tài xế về "Chưa chọn lô hàng"
  useEffect(() => {
    if (!isDriver) {
      if (postDeliveryCountdown !== null) setPostDeliveryCountdown(null);
      return;
    }
    if (!hasSelectedBatch || !isTripDelivered) {
      if (postDeliveryCountdown !== null) setPostDeliveryCountdown(null);
      return;
    }
    if (deliveredCountdownBatchRef.current !== selectedBatch.batch_code) {
      deliveredCountdownBatchRef.current = selectedBatch.batch_code;
      setPostDeliveryCountdown(20);
    }
  }, [isDriver, hasSelectedBatch, isTripDelivered, selectedBatch?.batch_code]);

  useEffect(() => {
    if (postDeliveryCountdown === null) return;
    if (postDeliveryCountdown <= 0) {
      const finishedBatchCode = selectedBatch?.batch_code;
      setPostDeliveryCountdown(null);
      deliveredCountdownBatchRef.current = null;
      if (finishedBatchCode && isDoorOpen) {
        openTruckDoor({
          batchCode: finishedBatchCode,
          action: 'CLOSE',
          driverName: displayDriverName,
          vehiclePlate: displayPlate,
        }).catch(() => {});
      }
      if (onSelectBatch) {
        onSelectBatch(null);
      }
      if (refreshCoreData) {
        refreshCoreData();
      }
      if (setSystemAlert && finishedBatchCode) {
        setSystemAlert({
          type: 'success',
          message: `Lô hàng ${finishedBatchCode} đã hoàn tất bàn giao. Giao diện đã chuyển về trạng thái "Chưa chọn lô hàng" — vui lòng chọn lô chờ chạy tiếp theo trong danh sách quản lý lô!`,
        });
      }
      return;
    }
    const timer = setTimeout(() => {
      setPostDeliveryCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [postDeliveryCountdown, selectedBatch?.batch_code, isDoorOpen]);

  let tripProgress = 0;
  if (isTripRunning && hasSelectedBatch) {
    let startTs = Number(localStorage.getItem(`trip_start_${batchCodeKey}`));
    if (!startTs || isNaN(startTs)) {
      startTs = Date.now();
      localStorage.setItem(`trip_start_${batchCodeKey}`, startTs.toString());
    }
    const elapsed = Math.max(0, Date.now() - startTs);
    tripProgress = Math.min(1.0, elapsed / TRIP_DURATION_MS);
  } else if (isTripDelivered) {
    tripProgress = 1.0;
  } else {
    tripProgress = 0.0;
    if (hasSelectedBatch && localStorage.getItem(`trip_start_${batchCodeKey}`)) {
      localStorage.removeItem(`trip_start_${batchCodeKey}`);
    }
  }

  const isAtDestination = isTripDelivered || (isTripRunning && tripProgress >= 1.0);
  const routeCoords = currentRoute.checkpoints.map((cp) => cp.coords);
  const destCoords = routeCoords[routeCoords.length - 1];
  const originCoords = routeCoords[0];

  let drivenKm = 0;
  let remainingKm = totalKm;
  let remainingPercent = 100;
  let currentLat = originCoords[0];
  let currentLng = originCoords[1];
  let statusDistanceText = 'Chưa xuất bến (Đang đỗ tại điểm xuất phát)';

  if (!hasSelectedBatch) {
    statusDistanceText = 'Chưa chọn lô hàng';
  } else if (isRecalled) {
    statusDistanceText = '🚨 ĐÃ BAN HÀNH LỆNH THU HỒI KHẨN CẤP — NIÊM PHONG TOÀN BỘ PHƯƠNG TIỆN & DỪNG LƯU THÔNG!';
  } else if (!isBatchAssigned) {
    statusDistanceText = 'Lô hàng đang lưu kho, chưa phân công tài xế nhận';
  } else if (isPendingDriverAcceptance) {
    statusDistanceText = 'Đã phân công cho tài xế • Đang chờ tài xế bấm Nhận lô';
  } else if (isTripDelivered) {
    drivenKm = totalKm;
    remainingKm = 0;
    remainingPercent = 0;
    currentLat = destCoords[0];
    currentLng = destCoords[1];
    statusDistanceText = 'Đã hoàn thành toàn bộ hành trình & Bàn giao xong';
  } else if (isTripRunning) {
    drivenKm = Math.round(totalKm * tripProgress);
    remainingKm = Math.max(0, totalKm - drivenKm);
    remainingPercent = Math.max(0, Math.round((remainingKm / totalKm) * 100));

    const [iLat, iLng] = getInterpolatedPosition(routeCoords, tripProgress);
    currentLat = iLat;
    currentLng = iLng;

    const numCp = currentRoute.checkpoints.length;
    const cpIdx = Math.min(Math.floor(tripProgress * (numCp - 1)), numCp - 1);
    const curCp = currentRoute.checkpoints[cpIdx];

    if (tripProgress >= 1.0) {
      statusDistanceText = `Xe đã tới điểm đích: ${currentRoute.checkpoints[numCp - 1].name} (Có thể mở cửa xe & xác nhận hoàn thành)`;
    } else {
      statusDistanceText = `Đang di chuyển: Gần ${curCp.name} (Cách điểm đích ${remainingKm} km)`;
    }
  }

  // Xử lý Admin giao lô cho tài xế
  const handleAdminAssignBatch = async () => {
    if (!hasSelectedBatch) return;
    const targetDriver =
      driverRoster.find((d) => d.username === selectedDriverToAssign) || driverRoster[0];
    setActionLoading(true);
    try {
      const res = await assignBatchToDriver({
        batchCode: selectedBatch.batch_code,
        driverUsername: targetDriver.username,
        driverName: targetDriver.fullName,
        vehiclePlate: targetDriver.vehiclePlate,
      });
      if (setSystemAlert) {
        setSystemAlert({
          type: 'success',
          message:
            res.message ||
            `Đã giao lô ${selectedBatch.batch_code} cho tài xế ${targetDriver.fullName} (${targetDriver.vehiclePlate})!`,
        });
      }
      if (refreshCoreData) await refreshCoreData();
    } catch (err) {
      if (setSystemAlert) {
        setSystemAlert({
          type: 'danger',
          message: err.response?.data?.message || err.message || 'Lỗi khi giao lô cho tài xế!',
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý Admin thu hồi phân công lô hàng
  const handleAdminRevokeBatch = async () => {
    if (!hasSelectedBatch) return;
    setActionLoading(true);
    try {
      const res = await revokeBatchAssignment(selectedBatch.batch_code);
      if (setSystemAlert) {
        setSystemAlert({
          type: 'warning',
          message: res.message || `Đã thu hồi phân công lô ${selectedBatch.batch_code}!`,
        });
      }
      if (refreshCoreData) await refreshCoreData();
    } catch (err) {
      if (setSystemAlert) {
        setSystemAlert({
          type: 'danger',
          message: err.response?.data?.message || err.message || 'Không thể thu hồi phân công!',
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý Tài xế Nhận hoặc Từ chối lô hàng
  const handleDriverRespondBatch = async (batchCode, decision) => {
    setActionLoading(true);
    try {
      const myPlate = (currentUser?.assignedEntity || displayPlate || '49C-567.89')
        .replace(/^Xe[^0-9]*/i, '')
        .trim();
      const res = await respondToBatchAssignment({
        batchCode,
        decision,
        driverName: currentUser?.fullName || currentUser?.username,
        vehiclePlate: myPlate,
      });
      if (setSystemAlert) {
        setSystemAlert({
          type: decision === 'ACCEPT' ? 'success' : 'warning',
          message: res.message,
        });
      }
      if (refreshCoreData) await refreshCoreData();
    } catch (err) {
      if (setSystemAlert) {
        setSystemAlert({
          type: 'danger',
          message: err.response?.data?.message || err.message || 'Lỗi xử lý nhận lô hàng!',
        });
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý khởi hành chuyến xe (Bắt buộc phải mở cửa xác nhận bốc hàng & đóng cửa thùng xe trước khi chạy)
  const handleStart = async () => {
    if (!hasSelectedBatch) return;
    if (isAnotherBatchRunning) {
      if (setSystemAlert) {
        setSystemAlert({
          type: 'warning',
          message: `Quy tắc đơn nhiệm: Bạn đang vận chuyển lô ${runningBatch.batch_code}. Vui lòng hoàn thành chuyến xe hiện tại trước!`,
        });
      }
      return;
    }
    if (!isLoadingConfirmed || isDoorOpen) {
      if (setSystemAlert) {
        setSystemAlert({
          type: 'warning',
          message: isDoorOpen
            ? 'Cửa thùng xe đang mở! Vui lòng nhấn "Xác nhận vận chuyển & Đóng cửa thùng xe" trước khi bắt đầu chuyến xe!'
            : 'Ràng buộc an toàn trước giờ khởi hành: Vui lòng bấm "Mở cửa thùng xe", xác nhận bốc xếp lô hàng và đóng kín cửa thùng trước khi bắt đầu chuyến xe!',
        });
      }
      setShowDoorModal(true);
      return;
    }
    setActionLoading(true);
    try {
      localStorage.setItem(`trip_start_${batchCodeKey}`, Date.now().toString());
      if (handleStartDriverTrip) {
        await handleStartDriverTrip(selectedBatch.batch_code);
      }
      if (handleOtaSync) {
        handleOtaSync();
      }
      loadTrips();
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý hoàn thành chuyến xe (Giữ giao diện bàn giao 20 giây rồi tự chuyển về Chưa chọn lô hàng)
  const handleComplete = async () => {
    if (!hasSelectedBatch || !isAtDestination) return;
    setActionLoading(true);
    try {
      localStorage.removeItem(`trip_start_${batchCodeKey}`);
      deliveredCountdownBatchRef.current = selectedBatch.batch_code;
      setPostDeliveryCountdown(20);
      if (handleCompleteDriverTrip) {
        const res = await handleCompleteDriverTrip(selectedBatch.batch_code);
        if (res?.tripHistory) {
          setTripData((prev) => ({
            ...prev,
            tripHistory: res.tripHistory,
          }));
        }
      }
      loadTrips();
    } finally {
      setActionLoading(false);
    }
  };

  // Đặt lại chuyến xe về trạng thái chờ khởi hành
  const handleReset = async () => {
    if (!hasSelectedBatch) return;
    setActionLoading(true);
    try {
      localStorage.removeItem(`trip_start_${batchCodeKey}`);
      deliveredCountdownBatchRef.current = null;
      setPostDeliveryCountdown(null);
      await resetDriverTrip(selectedBatch.batch_code);
      loadTrips();
      if (refreshCoreData) await refreshCoreData();
    } catch (e) {
      console.warn('Lỗi reset:', e);
    } finally {
      setActionLoading(false);
    }
  };

  // Xác nhận đã bốc xếp lô hàng lên xe và đóng kín cửa thùng xe trước khi khởi hành
  const handleConfirmLoadingAndCloseDoor = async () => {
    if (!hasSelectedBatch) return;
    setDoorSubmitting(true);
    try {
      const res = await openTruckDoor({
        batchCode: selectedBatch.batch_code,
        action: 'CONFIRM_LOADING_AND_CLOSE',
        driverName: displayDriverName,
        vehiclePlate: displayPlate,
      });
      setShowDoorModal(false);
      if (setSystemAlert) {
        setSystemAlert({
          type: 'success',
          message:
            res.message ||
            `Đã xác nhận bốc xếp lô ${selectedBatch.batch_code} và đóng kín cửa thùng xe. Bạn có thể bấm "Bắt đầu chuyến xe"!`,
        });
      }
      if (refreshCoreData) await refreshCoreData();
    } finally {
      setDoorSubmitting(false);
    }
  };

  // Xử lý khi tài xế bấm nút Mở/Đóng cửa thùng xe
  const handleClickDoorButton = async () => {
    if (!hasSelectedBatch || !isBatchAssigned) return;

    // Nếu lô hàng đã bàn giao xong và cửa đã đóng -> khóa vĩnh viễn không cho mở lại cho tới khi chọn lô tiếp theo
    if (isTripDelivered && !isDoorOpen) {
      if (setSystemAlert) {
        setSystemAlert({
          type: 'warning',
          message:
            'Đã hoàn thành chuyến xe và đóng khóa cửa thùng xe! Không được phép mở lại cửa thùng cho tới khi bạn chọn lô hàng tiếp theo.',
        });
      }
      return;
    }

    // Khi xe chưa khởi hành (isReady): Mở cửa để nhận hàng hoặc Xác nhận vận chuyển & đóng cửa thùng
    if (isReady) {
      if (!isDoorOpen) {
        setDoorSubmitting(true);
        try {
          const res = await openTruckDoor({
            batchCode: selectedBatch.batch_code,
            action: 'OPEN_FOR_LOADING',
            driverName: displayDriverName,
            vehiclePlate: displayPlate,
          });
          if (setSystemAlert) {
            setSystemAlert({
              type: 'success',
              message:
                res.message ||
                `Đã mở cửa thùng xe tại kho xuất phát. Vui lòng xác nhận vận chuyển lô ${selectedBatch.batch_code} và đóng cửa thùng lại để bắt đầu chuyến xe!`,
            });
          }
          if (refreshCoreData) await refreshCoreData();
          setShowDoorModal(true);
        } finally {
          setDoorSubmitting(false);
        }
      } else {
        await handleConfirmLoadingAndCloseDoor();
      }
      return;
    }

    if (isDoorOpen) {
      setDoorSubmitting(true);
      try {
        const res = await openTruckDoor({
          batchCode: selectedBatch.batch_code,
          action: 'CLOSE',
          driverName: displayDriverName,
          vehiclePlate: displayPlate,
        });
        if (setSystemAlert) {
          setSystemAlert({ type: 'success', message: res.message });
        }
        if (refreshCoreData) await refreshCoreData();
      } finally {
        setDoorSubmitting(false);
      }
      return;
    }

    // Nếu đã được Admin phê duyệt mở cửa khẩn cấp trước đó -> cho phép mở ngay an toàn
    if (doorRequestStatus === 'APPROVED' && !isAtDestination) {
      setDoorSubmitting(true);
      try {
        const res = await openTruckDoor({
          batchCode: selectedBatch.batch_code,
          action: 'OPEN',
          isAtDestination: false,
          forceOpen: false,
          driverName: displayDriverName,
          vehiclePlate: displayPlate,
        });
        if (setSystemAlert) {
          setSystemAlert({ type: 'success', message: res.message });
        }
        if (refreshCoreData) await refreshCoreData();
      } finally {
        setDoorSubmitting(false);
      }
      return;
    }

    // Hiển thị hộp thoại xác nhận mở cửa (Tại đích hoặc Cảnh báo khi chưa tới đích)
    setShowDoorModal(true);
  };

  // Xác nhận mở cửa tại điểm đích và hoàn tất bàn giao chuyến xe
  const handleConfirmOpenDoorAtDestination = async () => {
    if (!hasSelectedBatch) return;
    setDoorSubmitting(true);
    try {
      await openTruckDoor({
        batchCode: selectedBatch.batch_code,
        action: 'OPEN',
        isAtDestination: true,
        forceOpen: false,
        driverName: displayDriverName,
        vehiclePlate: displayPlate,
      });
      setShowDoorModal(false);
      if (!isTripDelivered) {
        await handleComplete();
      } else if (refreshCoreData) {
        await refreshCoreData();
      }
    } finally {
      setDoorSubmitting(false);
    }
  };

  // Tài xế gửi yêu cầu xin lệnh mở cửa khẩn cấp đến Admin kèm lý do
  const handleSendDoorRequestToAdmin = async () => {
    if (!hasSelectedBatch) return;
    if (!doorOpenReason.trim()) {
      if (setSystemAlert) {
        setSystemAlert({
          type: 'warning',
          message: 'Vui lòng nhập lý do cần mở cửa thùng xe khi chưa đến nơi để gửi Admin!',
        });
      }
      return;
    }
    setDoorSubmitting(true);
    try {
      const res = await requestDoorOpen({
        batchCode: selectedBatch.batch_code,
        driverName: displayDriverName,
        vehiclePlate: displayPlate,
        reason: doorOpenReason.trim(),
      });
      setShowDoorModal(false);
      setDoorOpenReason('');
      if (setSystemAlert) {
        setSystemAlert({ type: 'success', message: res.message });
      }
      if (refreshCoreData) await refreshCoreData();
    } finally {
      setDoorSubmitting(false);
    }
  };

  // Tài xế vẫn cưỡng bức mở cửa khi chưa tới nơi & chưa có lệnh phê duyệt -> Cảnh báo đỏ khẩn cấp cho Admin!
  const handleForceUnauthorizedDoorOpen = async () => {
    if (!hasSelectedBatch) return;
    setDoorSubmitting(true);
    try {
      const res = await openTruckDoor({
        batchCode: selectedBatch.batch_code,
        action: 'OPEN',
        isAtDestination: false,
        forceOpen: true,
        driverName: displayDriverName,
        vehiclePlate: displayPlate,
      });
      setShowDoorModal(false);
      if (setSystemAlert) {
        setSystemAlert({
          type: 'danger',
          message: res.message,
        });
      }
      if (refreshCoreData) await refreshCoreData();
    } finally {
      setDoorSubmitting(false);
    }
  };

  // Admin phê duyệt hoặc từ chối yêu cầu mở cửa của tài xế
  const handleAdminDecisionDoorRequest = async (decision) => {
    if (!hasSelectedBatch) return;
    setActionLoading(true);
    try {
      const res = await approveDoorOpen({
        batchCode: selectedBatch.batch_code,
        decision,
        adminNote:
          decision === 'APPROVED'
            ? 'Admin đã phê duyệt cho phép mở cửa kiểm tra sự cố'
            : 'Admin yêu cầu giữ nguyên niêm phong cửa thùng xe',
      });
      if (setSystemAlert) {
        setSystemAlert({
          type: decision === 'APPROVED' ? 'success' : 'warning',
          message: res.message,
        });
      }
      if (refreshCoreData) await refreshCoreData();
    } finally {
      setActionLoading(false);
    }
  };

  const handleCopyTx = (tx) => {
    if (!tx) return;
    navigator.clipboard?.writeText(tx);
    setCopiedTx(true);
    setTimeout(() => setCopiedTx(false), 2000);
  };

  const simulatedTelemetry = {
    ...latestTelemetry,
    latitude: currentLat,
    longitude: currentLng,
    door_open: isDoorOpen,
  };

  // Lọc & Phân trang danh sách lịch sử chuyến xe (Tối đa 10 chuyến / 1 trang)
  const allTrips = tripData?.tripHistory || [];
  const filteredTrips = allTrips.filter((t) => {
    if (!tripSearchQuery.trim()) return true;
    const q = tripSearchQuery.toLowerCase();
    return (
      (t.tripId && t.tripId.toLowerCase().includes(q)) ||
      (t.batchCode && t.batchCode.toLowerCase().includes(q)) ||
      (t.productName && t.productName.toLowerCase().includes(q)) ||
      (t.driverName && t.driverName.toLowerCase().includes(q)) ||
      (t.vehiclePlate && t.vehiclePlate.toLowerCase().includes(q)) ||
      (t.supermarket && t.supermarket.toLowerCase().includes(q)) ||
      (t.route && t.route.toLowerCase().includes(q))
    );
  });

  useEffect(() => {
    setTripPage(1);
  }, [tripSearchQuery, allTrips.length]);

  const totalTripPages = Math.max(1, Math.ceil(filteredTrips.length / TRIPS_PER_PAGE));
  const safeTripPage = Math.min(tripPage, totalTripPages);
  const paginatedTrips = filteredTrips.slice(
    (safeTripPage - 1) * TRIPS_PER_PAGE,
    safeTripPage * TRIPS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      {/* THÔNG BÁO ĐÃ BÀN GIAO LÔ HÀNG & ĐẾM NGƯỢC 20 GIÂY TRƯỚC KHI TỰ CHUYỂN VỀ "CHƯA CHỌN LÔ HÀNG" (DÀNH CHO TÀI XẾ) */}
      {isDriver && hasSelectedBatch && isTripDelivered && postDeliveryCountdown !== null && (
        <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-500/10 p-5 flex flex-wrap items-center justify-between gap-4 text-emerald-950 dark:text-emerald-200 shadow-lg animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <CheckCircle size={26} className="shrink-0 text-emerald-600 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <div className="font-black text-sm sm:text-base uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                ✓ ĐÃ BÀN GIAO LÔ HÀNG {selectedBatch.batch_code} THÀNH CÔNG!
              </div>
              <p className="mt-1 leading-relaxed">
                Lô hàng <strong>{selectedBatch.product_name}</strong> đã hoàn tất bàn giao cho siêu thị và lưu vào lịch sử chuyến xe. Giao diện lô hàng này sẽ giữ trong{' '}
                <strong className="text-base font-mono text-emerald-700 dark:text-emerald-300 underline">
                  {postDeliveryCountdown} giây
                </strong>{' '}
                nữa rồi tự động đóng và chuyển về trạng thái <strong>"Chưa chọn lô hàng"</strong> để bạn chọn lô tiếp theo.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPostDeliveryCountdown(0)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
          >
            Đóng ngay & Chọn lô tiếp theo ({postDeliveryCountdown}s)
          </button>
        </div>
      )}

      {/* BANNER DÀNH CHO ADMIN KHI TÀI XẾ GỬI YÊU CẦU XIN MỞ CỬA KHẨN CẤP TRÊN ĐƯỜNG */}
      {isAdmin && hasSelectedBatch && doorRequestStatus === 'PENDING' && (
        <div className="rounded-2xl border-2 border-amber-500 bg-amber-500/10 p-5 flex flex-wrap items-center justify-between gap-4 text-amber-950 dark:text-amber-200 shadow-lg animate-in fade-in">
          <div className="flex items-start gap-3.5">
            <AlertTriangle size={24} className="shrink-0 text-amber-600 mt-0.5" />
            <div className="text-xs sm:text-sm">
              <div className="font-black text-sm sm:text-base uppercase tracking-wide text-amber-700 dark:text-amber-300">
                YÊU CẦU XIN LỆNH MỞ CỬA THÙNG XE KHI CHƯA ĐẾN ĐÍCH ({selectedBatch.batch_code})
              </div>
              <p className="mt-1">
                Tài xế <strong>{displayDriverName}</strong> (Biển số: <strong>{displayPlate}</strong>) vừa gửi yêu cầu xin mở cửa thùng xe trên đường với lý do:{' '}
                <strong className="underline text-[#F95716]">"{doorRequestReason}"</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleAdminDecisionDoorRequest('APPROVED')}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
            >
              ✓ Phê duyệt cho phép mở cửa
            </button>
            <button
              type="button"
              onClick={() => handleAdminDecisionDoorRequest('REJECTED')}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md cursor-pointer"
            >
              ✕ Từ chối yêu cầu
            </button>
          </div>
        </div>
      )}

      {/* KHU VỰC DÀNH RIÊNG CHO TÀI XẾ: DANH SÁCH LÔ HÀNG CHỜ NHẬN & HÀNG ĐỢI CỦA TÀI XẾ (TỐI ĐA 3 LÔ) */}
      {isDriver && (
        <div className={CARD}>
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-orange-950/5 dark:border-orange-500/10">
            <div>
              <h3 className="text-base font-black text-[#1A1A1A] dark:text-[#F5F5F5] flex items-center gap-2">
                <Box size={18} className="text-[#F95716]" />
                Quản lý lô hàng được giao & Hàng đợi vận chuyển của tôi
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Mỗi tài xế nhận tối đa 3 lô hàng vào hàng đợi &bull; Đang nhận:{' '}
                <strong className="text-[#F95716]">{myAcceptedActiveBatches.length} / 3 lô</strong>
              </p>
            </div>
          </div>

          {/* 1. Lô hàng Admin mới giao đang chờ Tài xế bấm Nhận hoặc Từ chối */}
          {myPendingBatches.length > 0 && (
            <div className="mt-4 space-y-2.5">
              <div className="text-xs font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                🔔 Lô hàng mới được Admin phân công chờ bạn xác nhận ({myPendingBatches.length})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myPendingBatches.map((b) => (
                  <div
                    key={b.batch_code}
                    className="p-4 rounded-2xl border-2 border-amber-500/30 bg-amber-500/[0.06] flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-[#F95716] bg-white dark:bg-[#1C140F] px-2.5 py-0.5 rounded-md border border-orange-500/20">
                          {b.batch_code}
                        </span>
                        <span className="text-[10.5px] font-bold text-amber-700 dark:text-amber-300">
                          Chờ xác nhận nhận lô
                        </span>
                      </div>
                      <div className="text-sm font-black text-[#1A1A1A] dark:text-[#F5F5F5] mt-1">
                        {b.product_name}
                      </div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Xuất xứ: {b.farm_name}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoading || myAcceptedActiveBatches.length >= 3}
                        onClick={() => handleDriverRespondBatch(b.batch_code, 'ACCEPT')}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-sm disabled:opacity-40 cursor-pointer"
                      >
                        ✓ Nhận lô
                      </button>
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => handleDriverRespondBatch(b.batch_code, 'REJECT')}
                        className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 text-xs font-bold transition-all cursor-pointer"
                      >
                        ✕ Từ chối
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Danh sách các lô đã nhận trong hàng đợi vận chuyển của tài xế */}
          <div className="mt-4">
            <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2.5">
              Các lô hàng trong hàng đợi vận chuyển của bạn ({myAcceptedActiveBatches.length}/3)
            </div>
            {myAcceptedActiveBatches.length === 0 ? (
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-dashed border-neutral-300 dark:border-neutral-800 text-xs text-neutral-400 text-center">
                Hiện chưa có lô hàng nào trong hàng đợi vận chuyển. Vui lòng bấm "Nhận lô" ở trên (nếu có) hoặc chờ Quản trị viên phân công.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {myAcceptedActiveBatches.map((b) => {
                  const isCurrentSelected = selectedBatch?.batch_code === b.batch_code;
                  return (
                    <div
                      key={b.batch_code}
                      onClick={() => onSelectBatch && onSelectBatch(b)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isCurrentSelected
                          ? 'border-[#F95716] bg-[#F95716]/[0.08] shadow-sm'
                          : 'border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] hover:border-[#F95716]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-[#F95716]">
                            {b.batch_code}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-[#F95716]">
                            {b.status === 'IN_TRANSIT' ? '⚡ Đang chạy' : '⏳ Chờ chạy'}
                          </span>
                        </div>
                        <div className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] truncate mt-1">
                          {b.product_name}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CẢNH BÁO HÀNG ĐỢI KHI CÓ LÔ HÀNG KHÁC ĐANG CHẠY (CHỈ HIỂN THỊ VỚI TÀI XẾ) */}
      {isAnotherBatchRunning && (
        <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-3.5 text-amber-900 dark:text-amber-200 shadow-sm animate-in fade-in">
          <AlertTriangle size={24} className="shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1 text-xs sm:text-sm">
            <div className="font-black text-sm sm:text-base uppercase tracking-wide">
              QUY TẮC ĐƠN NHIỆM: TÀI XẾ ĐANG VẬN CHUYỂN LÔ {runningBatch.batch_code}
            </div>
            <p className="mt-1 leading-relaxed">
              Một tài xế không thể vận chuyển 2 lô hàng cùng một lúc. Lô hàng hiện tại{' '}
              <strong className="font-bold underline">
                {selectedBatch?.batch_code} ({selectedBatch?.product_name})
              </strong>{' '}
              đang nằm trong{' '}
              <span className="font-bold text-amber-700 dark:text-amber-300 uppercase">
                Hàng Đợi Vận Chuyển
              </span>
              . Bạn phải hoàn thành chuyến xe của lô{' '}
              <strong className="font-bold">{runningBatch.batch_code}</strong> trước khi có thể bắt đầu vận chuyển chuyến tiếp theo!
            </p>
            {onSelectBatch && (
              <button
                type="button"
                onClick={() => onSelectBatch(runningBatch)}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                &rarr; Chuyển ngay đến lô đang chạy: {runningBatch.batch_code} (
                {runningBatch.product_name})
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. KHUNG THÔNG TIN TÀI XẾ & ĐIỀU PHỐI PHƯƠNG TIỆN */}
      <div className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-5 pb-5 border-b border-orange-950/5 dark:border-orange-500/10">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            {/* Biển số xe (Hoặc Chưa chọn lô hàng / Chưa có tài xế nhận) */}
            {!hasSelectedBatch ? (
              <div className="inline-flex flex-col items-center justify-center bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-300 dark:border-neutral-700 rounded-2xl px-5 py-2.5 shadow-sm shrink-0">
                <div className="text-[10px] font-black tracking-widest text-neutral-400 uppercase">
                  TRẠNG THÁI
                </div>
                <div className="font-mono text-lg sm:text-xl font-black tracking-wider text-neutral-500 dark:text-neutral-300 leading-none mt-1">
                  Chưa chọn lô hàng
                </div>
              </div>
            ) : isBatchAssigned ? (
              <div className="inline-flex flex-col items-center justify-center bg-[#FFD700] border-2 border-neutral-900 rounded-2xl px-6 py-2.5 shadow-md shrink-0">
                <div className="text-[10.5px] font-black tracking-widest text-neutral-800 uppercase flex items-center gap-1.5">
                  <span>VIỆT NAM</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600"></span>
                </div>
                <div className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-neutral-950 leading-none mt-1">
                  {displayPlate}
                </div>
              </div>
            ) : (
              <div className="inline-flex flex-col items-center justify-center bg-neutral-200 dark:bg-neutral-800 border-2 border-neutral-400 dark:border-neutral-700 rounded-2xl px-5 py-2.5 shadow-sm shrink-0">
                <div className="text-[10px] font-black tracking-widest text-neutral-500 uppercase">
                  CHỜ ĐIỀU PHỐI
                </div>
                <div className="font-mono text-xl sm:text-2xl font-black tracking-wider text-neutral-600 dark:text-neutral-300 leading-none mt-1">
                  CHƯA GÁN XE
                </div>
              </div>
            )}

            {/* Tên tài xế to, rõ nét */}
            <div>
              <div className="text-xs font-extrabold text-neutral-400 uppercase tracking-wider">
                {!hasSelectedBatch
                  ? 'Thông tin điều phối phương tiện'
                  : isBatchAssigned
                  ? 'Tài xế phụ trách phương tiện'
                  : 'Trạng thái tiếp nhận vận chuyển'}
              </div>
              <div
                className={`text-2xl sm:text-3xl font-black tracking-tight mt-1 ${
                  hasSelectedBatch && isBatchAssigned
                    ? 'text-[#1A1A1A] dark:text-[#F5F5F5]'
                    : 'text-neutral-400 dark:text-neutral-500'
                }`}
              >
                {displayDriverName}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs">
                {!hasSelectedBatch ? (
                  <span className="font-semibold text-neutral-400">
                    Vui lòng chọn một lô hàng tại Trang Tổng Quan để giám sát và điều phối
                  </span>
                ) : isBatchAssigned ? (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle size={13} /> Bằng lái FC &bull; Chứng chỉ Chuỗi Lạnh IoT
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-neutral-400">
                    Lô hàng đang lưu kho, chờ Quản trị viên phân công tài xế nhận
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Cụm nút hành động điều phối chuyến xe & Mở cửa thùng xe */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!hasSelectedBatch ? (
              <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-white/5 text-neutral-400 text-xs font-bold border border-neutral-200 dark:border-neutral-800">
                <span>Chưa chọn lô hàng</span>
              </div>
            ) : !isBatchAssigned ? (
              isAdmin ? (
                /* ADMIN GIAO LÔ HÀNG CHO TÀI XẾ */
                <div className="flex flex-wrap items-center gap-2 bg-orange-500/[0.05] p-2 rounded-2xl border border-orange-500/20">
                  <select
                    value={selectedDriverToAssign}
                    onChange={(e) => setSelectedDriverToAssign(e.target.value)}
                    className="rounded-xl border border-orange-950/10 bg-white dark:bg-[#1C140F] px-3 py-2 text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] focus:outline-none focus:border-[#F95716]"
                  >
                    {driverRoster.map((d) => (
                      <option key={d.username} value={d.username}>
                        {d.fullName} ({d.vehiclePlate})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAdminAssignBatch}
                    disabled={actionLoading}
                    className="px-4 py-2 rounded-xl bg-[#F95716] hover:bg-[#ea4808] text-white text-xs font-black shadow-md transition-all cursor-pointer"
                  >
                    + Giao lô cho tài xế
                  </button>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-neutral-100 dark:bg-white/5 text-neutral-500 dark:text-neutral-400 text-xs font-bold border border-neutral-200 dark:border-neutral-800">
                  <span>○ Chưa có tài xế nhận lô hàng</span>
                </div>
              )
            ) : isAdmin ? (
              /* DÀNH CHO ADMIN: HIỂN THỊ TRẠNG THÁI CỦA TÀI XẾ + NÚT THU HỒI PHÂN CÔNG */
              <div className="flex flex-wrap items-center gap-2">
                {isPendingDriverAcceptance && (
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-black border border-amber-500/25">
                    <Clock size={15} />
                    <span>Đã giao lô • Chờ tài xế xác nhận nhận lô</span>
                  </div>
                )}
                {isReady && (
                  <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-black border border-amber-500/25">
                    <Clock size={15} />
                    <span>Tài xế đã nhận lô (Chưa bắt đầu chuyến xe)</span>
                  </div>
                )}
                {isTripRunning && (
                  <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#F95716]/10 text-[#F95716] text-xs font-black border border-[#F95716]/25 animate-pulse">
                    <Truck size={15} />
                    <span>Đang vận chuyển trên tuyến</span>
                  </div>
                )}
                {isTripDelivered && (
                  <div className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-black border border-emerald-500/25">
                    <CheckCircle size={15} />
                    <span>Đã hoàn thành chuyến xe</span>
                  </div>
                )}

                {/* Nút Thu hồi phân công dành cho Admin khi xe chưa lăn bánh */}
                {(isPendingDriverAcceptance || isReady) && (
                  <button
                    type="button"
                    onClick={handleAdminRevokeBatch}
                    disabled={actionLoading}
                    className="px-3.5 py-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 dark:text-red-400 text-xs font-bold transition-all cursor-pointer"
                  >
                    ✕ Thu hồi phân công
                  </button>
                )}

                {/* Nút Đặt lại chuyến xe dành cho Admin */}
                {(isTripRunning || isTripDelivered) && (
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={actionLoading}
                    className="px-3.5 py-2.5 rounded-2xl bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-200 text-xs font-bold transition-all cursor-pointer shadow-sm"
                  >
                    ↺ Đặt lại (Chờ khởi hành)
                  </button>
                )}
              </div>
            ) : (
              /* DÀNH CHO TÀI XẾ: NHẬN/TỪ CHỐI LÔ, BẮT ĐẦU CHUYẾN, MỞ CỬA XE & HOÀN THÀNH CHUYẾN */
              <div className="flex flex-wrap items-center gap-2.5">
                {isPendingDriverAcceptance && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleDriverRespondBatch(selectedBatch.batch_code, 'ACCEPT')}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
                    >
                      <CheckCircle size={15} /> Nhận lô hàng này
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDriverRespondBatch(selectedBatch.batch_code, 'REJECT')}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-red-500/10 hover:bg-red-500 hover:text-white text-red-600 text-xs font-bold transition-all cursor-pointer"
                    >
                      ✕ Từ chối lô
                    </button>
                  </>
                )}

                {isRecalled && (
                  <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-red-600 text-white text-xs font-black shadow-lg">
                    🚨 LÔ HÀNG ĐÃ CÓ LỆNH THU HỒI KHẨN CẤP (KHÓA PHƯƠNG TIỆN)
                  </div>
                )}

                {isReady && (
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={
                      actionLoading ||
                      isAnotherBatchRunning ||
                      !isLoadingConfirmed ||
                      isDoorOpen
                    }
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-lg active:scale-95 ${
                      isAnotherBatchRunning || !isLoadingConfirmed || isDoorOpen
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 cursor-not-allowed opacity-80'
                        : 'bg-[#F95716] hover:bg-[#ea4808] text-white hover:shadow-orange-500/25 cursor-pointer'
                    }`}
                    title={
                      !isLoadingConfirmed || isDoorOpen
                        ? 'Bắt buộc mở cửa thùng xe, xác nhận vận chuyển lô hàng và đóng cửa thùng trước khi bắt đầu chuyến xe'
                        : 'Bắt đầu khởi hành chuyến xe'
                    }
                  >
                    <Truck size={17} />
                    {actionLoading
                      ? 'Đang khởi hành...'
                      : isAnotherBatchRunning
                      ? `Khóa hàng đợi (Đang chở ${runningBatch.batch_code})`
                      : isDoorOpen
                      ? 'Khóa xuất bến (Đang mở cửa thùng xe)'
                      : !isLoadingConfirmed
                      ? 'Khóa xuất bến (Cần mở cửa & xác nhận bốc hàng)'
                      : 'Bắt đầu chuyến xe'}
                  </button>
                )}

                {isTripRunning && (
                  <button
                    type="button"
                    onClick={handleComplete}
                    disabled={!isAtDestination || actionLoading}
                    className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-black transition-all shadow-md ${
                      isAtDestination
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 shadow-emerald-500/25'
                        : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed opacity-60'
                    }`}
                    title={
                      !isAtDestination
                        ? `Xe chưa tới điểm đích (còn ${remainingKm} km). Nút hoàn thành đang được khóa an toàn!`
                        : 'Bấm để xác nhận bàn giao và lưu hồ sơ chuyến xe'
                    }
                  >
                    <CheckCircle size={16} />
                    {actionLoading ? 'Đang lưu hồ sơ...' : 'Đã hoàn thành chuyến xe'}
                  </button>
                )}

                {/* Nút Mở / Đóng cửa thùng xe dành cho Tài xế */}
                {!isPendingDriverAcceptance && (
                  <button
                    type="button"
                    onClick={handleClickDoorButton}
                    disabled={doorSubmitting || (isTripDelivered && !isDoorOpen)}
                    className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black transition-all shadow-sm ${
                      isTripDelivered && !isDoorOpen
                        ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                        : isReady && isDoorOpen
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-md'
                        : isDoorOpen
                        ? 'bg-red-600 hover:bg-red-700 text-white cursor-pointer'
                        : doorRequestStatus === 'APPROVED'
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 cursor-pointer'
                        : 'bg-orange-500/10 hover:bg-orange-500/20 text-[#F95716] border border-[#F95716]/25 cursor-pointer'
                    }`}
                  >
                    {isTripDelivered && !isDoorOpen ? (
                      <Lock size={15} />
                    ) : isDoorOpen ? (
                      <Lock size={15} />
                    ) : (
                      <Unlock size={15} />
                    )}
                    <span>
                      {isTripDelivered && !isDoorOpen
                        ? 'Đã đóng cửa thùng xe (Khóa sau bàn giao)'
                        : isReady && isDoorOpen
                        ? '✓ Xác nhận vận chuyển & Đóng cửa thùng xe'
                        : isReady && !isLoadingConfirmed
                        ? '1. Mở cửa thùng xe nhận hàng'
                        : isDoorOpen
                        ? 'Đóng cửa thùng xe'
                        : doorRequestStatus === 'APPROVED'
                        ? 'Mở cửa xe (Đã có lệnh Admin)'
                        : 'Mở cửa thùng xe'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 2. THẺ RIÊNG BIỆT: LÔ HÀNG ĐANG GIÁM SÁT (KHI CHƯA CHỌN LÔ HIỆN "CHƯA CHỌN LÔ HÀNG" VÀ ĐỂ TRỐNG CÁC TRƯỜNG) */}
        <div className="mt-5 rounded-2xl border-2 border-orange-500/25 bg-gradient-to-r from-orange-500/[0.06] via-amber-500/[0.03] to-transparent p-5 dark:border-orange-500/30">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-[#F95716] text-white flex items-center justify-center shadow-lg shadow-orange-500/25 font-bold shrink-0">
                <Box size={24} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#F95716] bg-orange-500/10 dark:bg-orange-500/20 px-2.5 py-0.5 rounded-md">
                    Lô Hàng Đang Giám Sát
                  </span>
                  {hasSelectedBatch && (
                    <span className="font-mono text-base sm:text-lg font-black text-[#F95716] bg-white dark:bg-[#1C140F] px-3 py-0.5 rounded-lg border border-orange-500/25 shadow-sm">
                      {selectedBatch.batch_code}
                    </span>
                  )}
                </div>
                <div className="text-xl sm:text-2xl font-black text-[#1A1A1A] dark:text-[#F5F5F5] mt-1">
                  {hasSelectedBatch ? selectedBatch.product_name : 'Chưa chọn lô hàng'}
                </div>
              </div>
            </div>

            {/* Huy hiệu trạng thái của lô */}
            <div className="px-4 py-2 rounded-xl bg-white dark:bg-[#1C140F] border border-orange-950/10 dark:border-orange-500/20 shadow-sm text-right">
              <div className="text-[10px] font-bold text-neutral-400 uppercase">Trạng thái lô hàng</div>
              <div className="text-sm font-black text-[#F95716] mt-0.5">
                {!hasSelectedBatch
                  ? 'Chưa chọn lô hàng'
                  : !isBatchAssigned
                  ? '○ CHƯA CÓ TÀI XẾ NHẬN'
                  : isPendingDriverAcceptance
                  ? '⏳ CHỜ TÀI XẾ XÁC NHẬN'
                  : isTripDelivered
                  ? '✓ ĐÃ BÀN GIAO SIÊU THỊ'
                  : isTripRunning
                  ? '⚡ ĐANG VẬN CHUYỂN'
                  : isAnotherBatchRunning
                  ? '⏳ TRONG HÀNG ĐỢI'
                  : '○ CHỜ XUẤT BẾN'}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-orange-500/15 text-xs">
            <div>
              <span className="text-neutral-400 font-medium">Tải trọng & Số lượng:</span>{' '}
              <strong className="text-[#1A1A1A] dark:text-[#F5F5F5] font-black">
                {hasSelectedBatch
                  ? `${Number(
                      selectedBatch.total_weight_kg ||
                      (selectedBatch.weight_kg && Number(selectedBatch.weight_kg) >= 100 ? selectedBatch.weight_kg : 500)
                    ).toFixed(0)} kg`
                  : '—'}
              </strong>
              {hasSelectedBatch && (
                <div className="text-[10.5px] text-neutral-500 dark:text-neutral-400 font-semibold mt-0.5">
                  {selectedBatch.package_count || 50} thùng ({selectedBatch.weight_per_package_kg || 10} kg/thùng)
                </div>
              )}
            </div>
            <div>
              <span className="text-neutral-400 font-medium">Nông trại / Xuất xứ:</span>{' '}
              <strong className="text-[#1A1A1A] dark:text-[#F5F5F5] font-bold truncate">
                {hasSelectedBatch ? selectedBatch.farm_name || '—' : '—'}
              </strong>
            </div>
            <div>
              <span className="text-neutral-400 font-medium">Dải nhiệt yêu cầu:</span>{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-black">
                {hasSelectedBatch
                  ? `${selectedProfile?.minTemp ?? 8.0}°C - ${selectedProfile?.maxTemp ?? 12.0}°C`
                  : '—'}
              </strong>
            </div>
            <div>
              <span className="text-neutral-400 font-medium">Tiêu chuẩn:</span>{' '}
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold">
                {hasSelectedBatch ? 'VietGAP & Blockchain' : '—'}
              </strong>
            </div>
          </div>
        </div>

        {/* 3. TUYẾN ĐƯỜNG VẬN CHUYỂN & CHỈ SỐ CỰ LY */}
        {!hasSelectedBatch ? (
          <div className="mt-5 rounded-2xl bg-neutral-100/60 dark:bg-white/[0.02] border border-neutral-300/60 dark:border-white/10 p-5">
            <div className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-1">
              Tuyến đường vận chuyển
            </div>
            <div className="text-base sm:text-xl font-black text-neutral-400">
              Chưa chọn lô hàng
            </div>
          </div>
        ) : isBatchAssigned && !isPendingDriverAcceptance ? (
          <div className="mt-5 rounded-2xl bg-orange-500/[0.03] dark:bg-white/[0.02] border border-orange-500/15 p-5">
            <div className="text-xs font-black text-[#F95716] uppercase tracking-wider mb-2">
              Tuyến đường vận chuyển
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="text-lg sm:text-2xl font-black text-[#1A1A1A] dark:text-[#F5F5F5] tracking-tight">
                {currentRoute.routeName}
              </div>
            </div>

            {/* Khối Cự Ly Tổng Thể & Khoảng Cách Còn Lại To Rõ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-orange-500/15">
              <div className="p-4 rounded-xl bg-white dark:bg-[#1C140F] border border-orange-950/10 dark:border-orange-500/20 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Tổng cự ly hành trình
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#F95716] mt-0.5">
                    {totalKm} km
                  </div>
                  <div className="text-xs font-bold text-neutral-600 dark:text-neutral-300 mt-0.5">
                    {currentRoute.highway}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#F95716] flex items-center justify-center font-bold">
                  <Truck size={20} />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white dark:bg-[#1C140F] border border-orange-950/10 dark:border-orange-500/20 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Khoảng cách còn lại tới đích
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-[#1A1A1A] dark:text-[#F5F5F5] mt-0.5 flex items-center gap-2.5">
                    <span>{remainingKm} km</span>
                    <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-orange-500/15 text-[#F95716]">
                      {remainingPercent}%
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {statusDistanceText}
                  </div>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <MapPin size={20} />
                </div>
              </div>
            </div>

            {/* Thanh tiến trình cự ly trực quan */}
            <div className="mt-4">
              <div className="w-full bg-neutral-200 dark:bg-neutral-800 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-[#F95716] to-amber-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Math.max(0, 100 - remainingPercent))}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] font-bold text-neutral-400 mt-1">
                <span>Đã chạy: {drivenKm} km</span>
                <span>Còn lại: {remainingKm} km</span>
              </div>
            </div>

            {/* Vị trí GPS hiện tại và Tọa độ Vệ tinh Thời gian Thực */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-4 pt-4 border-t border-orange-500/10">
              <div>
                <div className="text-[11px] font-bold text-neutral-400 uppercase">
                  Vị trí GPS hiện tại của phương tiện
                </div>
                <div className="text-sm font-black text-[#1A1A1A] dark:text-[#F5F5F5] mt-1 flex items-center gap-2">
                  <span
                    className={`w-2.5 h-2.5 rounded-full ${
                      isAtDestination
                        ? 'bg-emerald-500'
                        : isTripRunning
                        ? 'bg-[#F95716] animate-pulse'
                        : 'bg-neutral-400'
                    }`}
                  />
                  {statusDistanceText}
                </div>
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {isAtDestination ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      ✓ Đã đủ điều kiện: Xe đã ở đúng vị trí điểm đích, bạn có thể nhấn "Mở cửa thùng xe" hoặc "Đã hoàn thành chuyến xe"!
                    </span>
                  ) : isTripRunning ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                      <AlertTriangle size={13} /> Xe chưa tới điểm đích (còn {remainingKm} km). Nút hoàn thành đang được khóa an toàn!
                    </span>
                  ) : (
                    <span className="text-neutral-400">
                      Phương tiện đang đỗ tại bến xuất phát, sẵn sàng khởi hành.
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-orange-500/5 dark:bg-white/5 border border-orange-500/15 self-start sm:self-auto font-mono text-xs">
                <MapPin size={14} className="text-[#F95716]" />
                <span className="text-neutral-500 dark:text-neutral-400">GPS:</span>
                <span className="font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  {currentLat.toFixed(4)}°N, {currentLng.toFixed(4)}°E
                </span>
                {isTripRunning && (
                  <span className="ml-1 text-[10px] font-sans font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 animate-pulse">
                    Live
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-2xl bg-neutral-100/60 dark:bg-white/[0.02] border border-neutral-300/60 dark:border-white/10 p-5">
            <div className="text-xs font-black text-neutral-400 uppercase tracking-wider mb-2">
              Tuyến đường vận chuyển
            </div>
            <div className="text-base sm:text-xl font-black text-neutral-500 dark:text-neutral-400">
              {isPendingDriverAcceptance
                ? 'Đang chờ tài xế xác nhận nhận lô hàng để kích hoạt lộ trình GPS'
                : 'Tuyến đường chưa kích hoạt (Chưa có tài xế nhận lô hàng)'}
            </div>
            <p className="text-xs text-neutral-400 mt-1">
              Lộ trình từ kho/nông trại đến điểm phân phối sẽ được tự động thiết lập và định tuyến GPS ngay khi tài xế xác nhận nhận lô.
            </p>
          </div>
        )}
      </div>

      {/* 4. BẢN ĐỒ GPS VÀ BIỂU ĐỒ TELEMETRY */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
        {/* Bản Đồ GPS (Tiêu đề gọn: Định vị vệ tinh GPS) */}
        <div className={`${CARD} flex flex-col h-full`}>
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5] flex items-center gap-2">
              <MapPin size={18} className="text-[#F95716]" />
              Định vị vệ tinh GPS
            </h3>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-orange-500/10 text-[#F95716]">
              {!hasSelectedBatch
                ? 'Chưa chọn lô hàng'
                : !isBatchAssigned
                ? '○ Chưa có tài xế nhận'
                : isPendingDriverAcceptance
                ? '⏳ Chờ tài xế nhận'
                : isTripRunning
                ? '⚡ Đang vận chuyển'
                : isTripDelivered
                ? '✓ Đã bàn giao'
                : '⏳ Chờ xuất bến'}
            </span>
          </div>
          <div className="flex-1 min-h-[420px] w-full">
            <VietnamColdChainMap
              latestTelemetry={simulatedTelemetry}
              batchCode={selectedBatch?.batch_code || ''}
              batch={selectedBatch}
              vehiclePlate={hasSelectedBatch && isBatchAssigned ? displayPlate : ''}
              isTripStarted={isTripRunning}
              isTripDelivered={isTripDelivered}
              isAtDestination={isAtDestination}
              isBatchAssigned={isBatchAssigned && !isPendingDriverAcceptance}
              currentLat={currentLat}
              currentLng={currentLng}
              tripProgress={tripProgress}
            />
          </div>
        </div>

        {/* Biểu Đồ 2 Trục Tung Telemetry */}
        <div className={`${CARD} flex flex-col h-full`}>
          <div className="flex items-center justify-between mb-3 shrink-0">
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5] flex items-center gap-2">
              <Activity size={18} className="text-[#F95716]" />
              Biểu đồ kép vi khí hậu thời gian thực
            </h3>
            <span className="text-xs text-neutral-400">
              {hasSelectedBatch && isBatchAssigned && (isTripRunning || isTripDelivered)
                ? `${telemetryList.length} mẫu đo`
                : 'Chế độ chờ'}
            </span>
          </div>

          <div className="flex-1 min-h-[420px] w-full flex items-center justify-center">
            {hasSelectedBatch && isBatchAssigned && (isTripRunning || isTripDelivered) ? (
              <DualAxisTelemetryChart
                telemetryList={telemetryList}
                profile={selectedProfile}
                isDark={isDark}
              />
            ) : (
              <div className="flex-1 min-h-[420px] w-full flex flex-col items-center justify-center p-8 text-center bg-neutral-50/50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-[#F95716] flex items-center justify-center mb-3">
                  <Activity size={28} />
                </div>
                <div className="text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  {!hasSelectedBatch
                    ? 'Chưa chọn lô hàng'
                    : 'Chưa có dữ liệu vi khí hậu thời gian thực'}
                </div>
                <p className="text-xs text-neutral-400 max-w-sm mt-1 leading-relaxed">
                  {!hasSelectedBatch
                    ? 'Vui lòng chọn một lô hàng tại Trang Tổng Quan để theo dõi biểu đồ nhiệt độ DHT22 và nồng độ khí sinh học MQ-4.'
                    : `Lô hàng ${selectedBatch.batch_code} chưa bắt đầu hành trình. Biểu đồ nhiệt độ DHT22 và nồng độ khí MQ-4 sẽ tự động kích hoạt khi tài xế bắt đầu chuyến xe.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 5. BẢNG ĐIỀU KHIỂN PHẦN CỨNG IOT VÀ CẢM BIẾN */}
      <div className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5] flex items-center gap-2">
              <Cpu size={18} className="text-[#F95716]" />
              Bảng giám sát phần cứng & điều khiển thiết bị IoT xe lạnh
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              {!hasSelectedBatch ? (
                <span>Chưa chọn lô hàng</span>
              ) : isBatchAssigned ? (
                <>
                  Kết nối trực tiếp thiết bị ESP32 Wokwi qua HiveMQ Cloud Broker (Topic:{' '}
                  <span className="font-mono text-[#F95716]">
                    smartchain/telemetry/{selectedBatch.batch_code}
                  </span>
                  )
                </>
              ) : (
                <span className="text-amber-600 dark:text-amber-400 font-medium">
                  Chưa có tài xế nhận lô hàng này &bull; Thiết bị IoT ở chế độ chờ.
                </span>
              )}
            </p>
          </div>
          {hasSelectedBatch && isBatchAssigned && !isPendingDriverAcceptance && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleOtaSync}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-orange-950/5 dark:bg-white/10 hover:bg-orange-950/10 text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] transition-all cursor-pointer"
              >
                <Repeat size={13} className="text-[#F95716]" />
                Nạp cấu hình OTA xuống ESP32
              </button>
              <button
                type="button"
                onClick={handleToggleOfflineMode}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  isSimulatedOffline
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md animate-pulse'
                    : 'bg-orange-950/5 dark:bg-white/10 hover:bg-orange-950/10 text-[#1A1A1A] dark:text-[#F5F5F5]'
                }`}
                title={
                  isSimulatedOffline
                    ? 'Bấm để khôi phục kết nối 4G và đồng bộ các gói tin đã lưu trong bộ đệm Flash lên Blockchain'
                    : 'Bấm để mô phỏng xe đi qua đèo/hầm mất kết nối Internet 4G (Kích hoạt Store-and-Forward)'
                }
              >
                <WifiOff size={13} className={isSimulatedOffline ? 'text-white' : 'text-amber-500'} />
                {isSimulatedOffline ? 'Khôi phục 4G & Đồng bộ đệm' : 'Mô phỏng Mất mạng 4G'}
              </button>
              <button
                type="button"
                onClick={handleToggleRelay}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-white transition-all cursor-pointer ${
                  relayState
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-[#F95716] shadow-sm hover:brightness-105'
                }`}
              >
                <Power size={13} />
                {relayState ? 'Tắt lốc phụ (GPIO 14)' : 'Bật lốc phụ (GPIO 14)'}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Cảm biến DHT22 */}
          <div className="p-3.5 rounded-2xl border border-orange-950/5 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02]">
            <div className="text-[11px] font-bold text-neutral-400 uppercase">Cảm biến DHT22</div>
            <div className="text-xl font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5] mt-1">
              {hasSelectedBatch &&
              isBatchAssigned &&
              (isTripRunning || isTripDelivered) &&
              currentTemp != null
                ? `${Number(currentTemp).toFixed(1)}°C • ${
                    latestTelemetry?.humidity ? Number(latestTelemetry.humidity).toFixed(1) : '90.0'
                  }%`
                : '—'}
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
              {!hasSelectedBatch
                ? 'Chưa chọn lô hàng'
                : isBatchAssigned && (isTripRunning || isTripDelivered)
                ? tempStatusText
                : 'Chờ chuyến xe khởi hành'}
            </div>
          </div>

          {/* Cảm biến khí MQ-4 */}
          <div className="p-3.5 rounded-2xl border border-orange-950/5 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02]">
            <div className="text-[11px] font-bold text-neutral-400 uppercase">
              Cảm biến khí MQ-4/135
            </div>
            <div className="text-xl font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5] mt-1">
              {hasSelectedBatch &&
              isBatchAssigned &&
              (isTripRunning || isTripDelivered) &&
              currentGas != null
                ? `${Number(currentGas).toFixed(1)} ppm ${selectedProfile?.gasType || 'C2H4'}`
                : '—'}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-medium">
              {!hasSelectedBatch
                ? 'Chưa chọn lô hàng'
                : isBatchAssigned && (isTripRunning || isTripDelivered)
                ? `Ngưỡng an toàn ≤ ${selectedProfile?.maxGas || 30} ppm`
                : 'Chờ chuyến xe khởi hành'}
            </div>
          </div>

          {/* Tải trọng Load Cell */}
          <div className="p-3.5 rounded-2xl border border-orange-950/5 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02]">
            <div className="text-[11px] font-bold text-neutral-400 uppercase">
              Tải trọng Load Cell
            </div>
            <div className="text-xl font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5] mt-1">
              {hasSelectedBatch
                ? `${Number(
                    (isTripRunning || isTripDelivered) &&
                      latestTelemetry?.weight_kg &&
                      Number(latestTelemetry.weight_kg) >= 100
                      ? latestTelemetry.weight_kg
                      : selectedBatch.total_weight_kg ||
                        (selectedBatch.weight_kg && Number(selectedBatch.weight_kg) >= 100 ? selectedBatch.weight_kg : 500.0)
                  ).toFixed(isTripRunning || isTripDelivered ? 1 : 0)} kg`
                : '—'}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-medium">
              {!hasSelectedBatch
                ? 'Chưa chọn lô hàng'
                : isBatchAssigned && (isTripRunning || isTripDelivered)
                ? 'Khối lượng hàng hóa thực tế'
                : 'Khối lượng lô hàng khai báo'}
            </div>
          </div>

          {/* Cảm biến khóa cửa Reed Switch */}
          <div className="p-3.5 rounded-2xl border border-orange-950/5 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02]">
            <div className="text-[11px] font-bold text-neutral-400 uppercase">
              Cảm biến khóa cửa
            </div>
            <div
              className={`text-xl font-extrabold mt-1 ${
                !hasSelectedBatch || !isBatchAssigned
                  ? 'text-neutral-400'
                  : isDoorOpen
                  ? 'text-red-500'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {!hasSelectedBatch || !isBatchAssigned
                ? '—'
                : isDoorOpen
                ? 'CỬA THÙNG MỞ'
                : 'KHÓA BẢO MẬT ĐÓNG'}
            </div>
            <div className="text-[11px] text-neutral-400 mt-1 font-medium">
              {!hasSelectedBatch
                ? 'Chưa chọn lô hàng'
                : doorRequestStatus === 'PENDING'
                ? 'Đang chờ Admin duyệt mở cửa'
                : doorRequestStatus === 'APPROVED'
                ? 'Đã có lệnh duyệt mở cửa từ Admin'
                : 'Cảm biến từ trường Reed Switch'}
            </div>
          </div>
        </div>
      </div>

      {/* 6. LỊCH SỬ CÁC CHUYẾN XE ĐÃ VẬN CHUYỂN (PHÂN TRANG TỐI ĐA 10 CHUYẾN / 1 TRANG) */}
      <div className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5] flex items-center gap-2">
              <Clock size={18} className="text-[#F95716]" />
              Lịch sử các chuyến xe đã vận chuyển & tuân thủ chuỗi lạnh
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {isAdmin
                ? `Giám sát toàn bộ ${filteredTrips.length} chuyến xe trong cơ sở dữ liệu • Trang ${safeTripPage} / ${totalTripPages} (Tối đa 10 chuyến/trang)`
                : `Hồ sơ các chuyến xe đã vận chuyển • Trang ${safeTripPage} / ${totalTripPages}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[280px]">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <input
                type="text"
                value={tripSearchQuery}
                onChange={(e) => setTripSearchQuery(e.target.value)}
                placeholder="Tìm mã chuyến, mã lô, tài xế, biển số, siêu thị..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-100 dark:bg-white/5 border border-orange-950/10 dark:border-orange-500/10 text-xs font-medium text-[#1A1A1A] dark:text-[#F5F5F5] placeholder:text-neutral-400 focus:outline-none focus:border-[#F95716] transition-colors"
              />
              {tripSearchQuery && (
                <button
                  type="button"
                  onClick={() => setTripSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-orange-500/10 text-[#F95716] whitespace-nowrap">
              Hiển thị {paginatedTrips.length} / {filteredTrips.length} Chuyến
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-orange-950/10 dark:border-orange-500/10 text-neutral-400 uppercase text-[10.5px]">
                <th className="pb-3 font-bold">Mã chuyến & Lô</th>
                <th className="pb-3 font-bold">Hàng hóa</th>
                <th className="pb-3 font-bold">Tài xế & Biển số</th>
                <th className="pb-3 font-bold">Điểm đến & Tuyến đường</th>
                <th className="pb-3 font-bold">Khởi hành &rarr; Bàn giao</th>
                <th className="pb-3 font-bold text-center">Nhiệt độ TB</th>
                <th className="pb-3 font-bold text-center">Tuân thủ chuỗi lạnh</th>
                <th className="pb-3 font-bold">Mã băm Blockchain (TxHash)</th>
                <th className="pb-3 font-bold text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-950/5 dark:divide-orange-500/5">
              {paginatedTrips.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-neutral-400">
                    Không tìm thấy chuyến xe nào phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedTrips.map((t, idx) => (
                  <tr
                    key={t.tripId || idx}
                    onClick={() => setSelectedTripDetail(t)}
                    className="hover:bg-orange-500/[0.04] transition-colors cursor-pointer group"
                  >
                    <td className="py-3 font-mono font-bold text-[#F95716]">
                      <div className="group-hover:underline flex items-center gap-1">
                        <span>{t.tripId}</span>
                      </div>
                      <div className="text-[10px] text-neutral-400 font-normal">{t.batchCode}</div>
                    </td>
                    <td className="py-3 font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] max-w-[180px] truncate">
                      {t.productName}
                    </td>
                    <td className="py-3">
                      <div className="font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                        {t.driverName}
                      </div>
                      <div className="font-mono text-[10px] text-neutral-500">
                        {t.vehiclePlate}
                      </div>
                    </td>
                    <td className="py-3 text-neutral-600 dark:text-neutral-300 max-w-[220px]">
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                        {t.supermarket}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">{t.route}</div>
                    </td>
                    <td className="py-3 text-neutral-500 whitespace-nowrap">
                      <div>{t.departureTime}</div>
                      <div className="text-[10px] text-neutral-400">&rarr; {t.arrivalTime}</div>
                    </td>
                    <td className="py-3 text-center font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                      {t.avgTemp}°C
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-[11px]">
                        <CheckCircle size={11} />
                        {t.complianceScore}% Đạt
                      </span>
                    </td>
                    <td className="py-3 font-mono text-[11px] text-neutral-400">
                      <span
                        title={t.blockchainHash}
                        className="group-hover:text-[#F95716] transition-colors"
                      >
                        {t.blockchainHash
                          ? `${t.blockchainHash.slice(0, 8)}...${t.blockchainHash.slice(-6)}`
                          : '0x...'}
                      </span>
                    </td>
                    <td className="py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setSelectedTripDetail(t)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 text-[#F95716] font-bold text-[11px] transition-colors cursor-pointer"
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang lịch sử chuyến xe (10 chuyến / 1 trang) */}
        {totalTripPages > 1 && (
          <div className="mt-5 pt-4 border-t border-orange-950/5 dark:border-orange-500/10 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Đang xem chuyến thứ <strong>{(safeTripPage - 1) * TRIPS_PER_PAGE + 1}</strong> đến{' '}
              <strong>{Math.min(safeTripPage * TRIPS_PER_PAGE, filteredTrips.length)}</strong> trong tổng số{' '}
              <strong>{filteredTrips.length}</strong> chuyến xe lịch sử
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTripPage((p) => Math.max(1, p - 1))}
                disabled={safeTripPage <= 1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] hover:border-[#F95716] hover:text-[#F95716] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronLeft size={14} /> Trang trước
              </button>
              {Array.from({ length: totalTripPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setTripPage(pageNum)}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    pageNum === safeTripPage
                      ? 'bg-[#F95716] text-white shadow-md shadow-orange-500/25'
                      : 'border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] text-neutral-600 dark:text-neutral-300 hover:border-[#F95716]'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setTripPage((p) => Math.min(totalTripPages, p + 1))}
                disabled={safeTripPage >= totalTripPages}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] hover:border-[#F95716] hover:text-[#F95716] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                Trang tiếp theo <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 7. MODAL MỞ CỬA THÙNG XE & XIN LỆNH MỞ CỬA KHẨN CẤP TỪ ADMIN */}
      {showDoorModal && hasSelectedBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-lg w-full rounded-3xl bg-white dark:bg-[#1C140F] border border-orange-950/10 dark:border-orange-500/20 shadow-2xl p-6 sm:p-7 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-orange-950/10 dark:border-orange-500/10">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${
                    isAtDestination
                      ? 'bg-emerald-500/15 text-emerald-600'
                      : 'bg-red-500/15 text-red-500'
                  }`}
                >
                  <Unlock size={20} />
                </div>
                <div>
                  <h4 className="text-base font-black text-[#1A1A1A] dark:text-[#F5F5F5]">
                    {isAtDestination
                      ? 'Xác nhận mở cửa thùng xe & Bàn giao'
                      : 'Cảnh báo an ninh khóa cửa thùng xe lạnh'}
                  </h4>
                  <p className="text-xs text-neutral-400">
                    Phương tiện {displayPlate} &bull; Lô {selectedBatch.batch_code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDoorModal(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-white/10 flex items-center justify-center text-neutral-500 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {isReady ? (
              /* TRƯỜNG HỢP TRƯỚC KHI KHỞI HÀNH (isReady): MỞ CỬA BỐC HÀNG, XÁC NHẬN VẬN CHUYỂN & ĐÓNG CỬA THÙNG XE */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/25 text-xs text-orange-950 dark:text-orange-200 leading-relaxed">
                  <strong className="block text-sm font-black text-[#F95716] mb-1">
                    📦 Quy trình bắt buộc trước khi khởi hành chuyến xe
                  </strong>
                  Để đảm bảo an toàn chuỗi lạnh cho lô hàng <strong>{selectedBatch.batch_code} ({selectedBatch.product_name})</strong>, tài xế bắt buộc phải:
                  <ul className="list-disc pl-5 mt-1.5 space-y-1">
                    <li>
                      Mở cửa thùng xe <strong>{displayPlate}</strong> tại kho xuất phát:{' '}
                      <strong className={isDoorOpen ? 'text-emerald-600' : 'text-amber-600'}>
                        {isDoorOpen ? '✓ Đã mở cửa thùng xe' : 'Chưa mở cửa'}
                      </strong>
                    </li>
                    <li>
                      Xác nhận vận chuyển lô hàng, đóng kín cửa thùng xe và đồng bộ cấu hình cảm biến xuống thiết bị Wokwi ESP32 trước khi bấm <strong>"Bắt đầu chuyến xe"</strong>.
                    </li>
                  </ul>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDoorModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer"
                  >
                    Đóng hộp thoại
                  </button>
                  {!isDoorOpen && (
                    <button
                      type="button"
                      disabled={doorSubmitting}
                      onClick={async () => {
                        setDoorSubmitting(true);
                        try {
                          await openTruckDoor({
                            batchCode: selectedBatch.batch_code,
                            action: 'OPEN_FOR_LOADING',
                            driverName: displayDriverName,
                            vehiclePlate: displayPlate,
                          });
                          if (refreshCoreData) await refreshCoreData();
                        } finally {
                          setDoorSubmitting(false);
                        }
                      }}
                      className="px-4 py-2.5 rounded-xl bg-[#F95716] hover:bg-[#ea4808] text-white text-xs font-black shadow-md cursor-pointer"
                    >
                      1. Mở cửa thùng xe bốc hàng
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={doorSubmitting}
                    onClick={handleConfirmLoadingAndCloseDoor}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
                  >
                    {doorSubmitting
                      ? 'Đang xác nhận & đóng cửa...'
                      : '✓ Xác nhận vận chuyển lô hàng & Đóng cửa thùng xe'}
                  </button>
                </div>
              </div>
            ) : isAtDestination ? (
              /* TRƯỜNG HỢP ĐÃ ĐẾN ĐÍCH: MỞ CỬA AN TOÀN VÀ HOÀN TẤT CHUYẾN */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed">
                  ✓ Phương tiện <strong>{displayPlate}</strong> đã đến đúng vị trí điểm đích giao hàng. Bạn có xác nhận mở khóa cửa thùng xe để bốc dỡ và hoàn thành bàn giao lô hàng{' '}
                  <strong>{selectedBatch.batch_code}</strong> không?
                </div>
                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDoorModal(false)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    disabled={doorSubmitting}
                    onClick={handleConfirmOpenDoorAtDestination}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md cursor-pointer"
                  >
                    {doorSubmitting
                      ? 'Đang xử lý...'
                      : '✓ Xác nhận mở cửa & Hoàn thành chuyến xe'}
                  </button>
                </div>
              </div>
            ) : (
              /* TRƯỜNG HỢP CHƯA ĐẾN ĐÍCH: CẢNH BÁO + XIN LỆNH ADMIN HOẶC CƯỠNG BỨC MỞ CỬA (BÁO ĐỘNG ĐỎ) */
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-900 dark:text-amber-200 leading-relaxed">
                  <strong className="block text-sm font-black text-amber-700 dark:text-amber-300 mb-1">
                    ⚠️ Bạn có chắc muốn mở cửa thùng xe khi chưa hoàn thành chuyến không?
                  </strong>
                  Phương tiện hiện còn cách điểm đích <strong>{remainingKm} km</strong>. Theo quy định an ninh chuỗi lạnh, tài xế cần <strong>xin lệnh phê duyệt từ Quản trị viên (Admin)</strong> trước khi mở cửa giữa đường. Nếu tự ý mở cửa khi chưa được Admin phê duyệt, hệ thống sẽ lập tức phát báo động đỏ vi phạm!
                </div>

                {/* Khu vực nhập lý do xin lệnh mở cửa gửi Admin */}
                <div className="p-4 rounded-2xl bg-orange-500/[0.04] border border-orange-500/20 space-y-2.5">
                  <label className="text-xs font-extrabold text-[#F95716] block">
                    1. Xin lệnh mở cửa khẩn cấp gửi đến Admin (Khuyến nghị khi gặp sự cố)
                  </label>
                  <textarea
                    rows={2}
                    value={doorOpenReason}
                    onChange={(e) => setDoorOpenReason(e.target.value)}
                    placeholder="Nhập lý do cần mở cửa thùng xe khi chưa đến nơi (VD: Kiểm tra sự cố quạt gió lốc lạnh, gia cố lại kiện hàng bị nghiêng...)"
                    className="w-full rounded-xl border border-orange-950/15 bg-white dark:bg-[#1C140F] p-2.5 text-xs focus:outline-none focus:border-[#F95716]"
                  />
                  <button
                    type="button"
                    disabled={doorSubmitting}
                    onClick={handleSendDoorRequestToAdmin}
                    className="w-full py-2.5 rounded-xl bg-[#F95716] hover:bg-[#ea4808] text-white text-xs font-black shadow-md transition-all cursor-pointer"
                  >
                    📩 Gửi yêu cầu xin lệnh mở cửa đến Admin
                  </button>
                </div>

                {/* Tùy chọn vẫn cưỡng bức mở cửa khi chưa có lệnh -> Báo động đỏ cho Admin */}
                <div className="pt-3 border-t border-orange-950/10 dark:border-orange-500/10 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDoorModal(false)}
                    className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-600 dark:text-neutral-300 cursor-pointer"
                  >
                    Đóng lại
                  </button>
                  <button
                    type="button"
                    disabled={doorSubmitting}
                    onClick={handleForceUnauthorizedDoorOpen}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md cursor-pointer"
                  >
                    🚨 Vẫn mở cửa ngay (Không chờ lệnh Admin)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. MODAL XEM CHI TIẾT TOÀN DIỆN CHUYẾN XE (TRIP DETAIL MODAL) */}
      {selectedTripDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="max-w-2xl w-full rounded-3xl bg-white dark:bg-[#1C140F] border border-orange-950/10 dark:border-orange-500/20 shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-orange-950/10 dark:border-orange-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[#F95716] flex items-center justify-center font-bold">
                  <Truck size={20} />
                </div>
                <div>
                  <div className="text-xs font-bold text-neutral-400 uppercase">
                    Hồ sơ chuyến xe chi tiết
                  </div>
                  <div className="text-lg sm:text-xl font-black text-[#1A1A1A] dark:text-[#F5F5F5] font-mono">
                    {selectedTripDetail.tripId}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTripDetail(null)}
                className="w-9 h-9 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-white/10 dark:hover:bg-white/15 flex items-center justify-center text-neutral-500 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="p-4 rounded-2xl bg-orange-500/[0.04] border border-orange-500/20">
                <div className="text-[11px] font-extrabold uppercase text-[#F95716]">
                  Lô hàng vận chuyển
                </div>
                <div className="text-base sm:text-lg font-black text-[#1A1A1A] dark:text-[#F5F5F5] mt-0.5">
                  {selectedTripDetail.productName}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="font-mono font-bold text-[#F95716]">
                    {selectedTripDetail.batchCode}
                  </span>
                  <span className="text-neutral-400">&bull;</span>
                  <span className="text-neutral-500">
                    {selectedTripDetail.category || 'Nông sản chuỗi lạnh'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5">
                  <div className="text-neutral-400 font-bold uppercase text-[10px]">
                    Tài xế phụ trách
                  </div>
                  <div className="text-sm font-black text-[#1A1A1A] dark:text-[#F5F5F5] mt-0.5">
                    {selectedTripDetail.driverName}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5">
                  <div className="text-neutral-400 font-bold uppercase text-[10px]">
                    Biển số phương tiện
                  </div>
                  <div className="text-sm font-black font-mono text-[#F95716] mt-0.5">
                    {selectedTripDetail.vehiclePlate}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5">
                  <div className="text-neutral-400 font-bold uppercase text-[10px]">
                    Điểm đến bàn giao
                  </div>
                  <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {selectedTripDetail.supermarket}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5">
                  <div className="text-neutral-400 font-bold uppercase text-[10px]">
                    Nhiệt độ TB & Tuân thủ
                  </div>
                  <div className="text-sm font-black text-[#1A1A1A] dark:text-[#F5F5F5] mt-0.5 flex items-center gap-2">
                    <span>{selectedTripDetail.avgTemp}°C</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                      ({selectedTripDetail.complianceScore}% Đạt chuẩn)
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-white/[0.02] border border-neutral-200 dark:border-white/5 text-xs">
                <div className="text-neutral-400 font-bold uppercase text-[10px]">
                  Lộ trình vận chuyển
                </div>
                <div className="text-sm font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] mt-0.5">
                  {selectedTripDetail.route}
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-2 pt-2 border-t border-neutral-200 dark:border-white/5 text-neutral-500">
                  <div>
                    <span className="text-neutral-400">Xuất phát:</span>{' '}
                    <strong className="text-neutral-700 dark:text-neutral-300 font-bold">
                      {selectedTripDetail.departureTime}
                    </strong>
                  </div>
                  <div>
                    <span className="text-neutral-400">Đến nơi:</span>{' '}
                    <strong className="text-neutral-700 dark:text-neutral-300 font-bold">
                      {selectedTripDetail.arrivalTime}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-500/[0.05] border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase">
                    <ShieldCheck size={16} /> Bằng chứng sổ cái Blockchain (TxHash)
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyTx(selectedTripDetail.blockchainHash)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    <Copy size={13} />
                    {copiedTx ? '✓ Đã sao chép!' : 'Sao chép mã TxHash'}
                  </button>
                </div>
                <div className="font-mono text-xs text-neutral-600 dark:text-neutral-300 break-all bg-white/70 dark:bg-black/30 p-2.5 rounded-xl border border-emerald-500/20 mt-2 select-all">
                  {selectedTripDetail.blockchainHash ||
                    '0x7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'}
                </div>
                <div className="text-[11px] text-neutral-400 mt-1.5 flex items-center gap-1">
                  <span>✓ Đã xác thực chữ ký ECDSA & đồng thuận khối chuỗi lạnh.</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTripDetail(null)}
                className="px-6 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:text-neutral-900 font-bold text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
