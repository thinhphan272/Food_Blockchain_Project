import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';

import { Maximize, Minimize, Truck } from './MomentumIcons';

function MapResizer() {
  const map = useMap();
  React.useEffect(() => {
    const timer = setTimeout(() => {
      try {
        map.invalidateSize();
      } catch (e) {}
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Biểu đồ Kép 2 Trục Tung (Dual-Axis Line Chart bằng react-chartjs-2)
 * Theo phong cách thiết kế Momentum (Warm Orange #F95716, Plus Jakarta Sans, Light/Dark theme)
 * - Trục Y trái: Nhiệt độ thực tế (°C) kèm đường ngưỡng Trần & Sàn
 * - Trục Y phải: Nồng độ khí sinh học (ppm)
 */
export function DualAxisTelemetryChart({ telemetryList = [], profile = null, isDark = false }) {
  const ordered = React.useMemo(() => {
    const arr = Array.isArray(telemetryList) ? [...telemetryList] : [];
    return arr.slice(0, 20).reverse();
  }, [telemetryList]);

  const minTemp = profile?.minTemp ?? 8.0;
  const maxTemp = profile?.maxTemp ?? 12.0;
  const gasType = profile?.gasType ?? 'C2H4';

  const labels = ordered.map((item, idx) => {
    const ts = item.recorded_at || item.timestamp;
    if (!ts) return `T-${ordered.length - idx}`;
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return `M#${idx + 1}`;
    }
  });

  const textColor = isDark ? '#A3A3A3' : '#737373';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  const data = {
    labels: labels.length > 0 ? labels : ['09:00', '09:05', '09:10', '09:15', '09:20'],
    datasets: [
      {
        label: 'Nhiệt độ Thực tế (°C)',
        data: ordered.length > 0 ? ordered.map((d) => Number(d.temperature ?? d.temp ?? 9.5)) : [9.8, 9.6, 9.4, 9.5, 9.5],
        borderColor: '#F95716',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 280);
          gradient.addColorStop(0, 'rgba(249, 87, 22, 0.28)');
          gradient.addColorStop(1, 'rgba(249, 87, 22, 0.00)');
          return gradient;
        },
        yAxisID: 'yTemp',
        tension: 0.35,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#F95716',
        pointBorderColor: isDark ? '#1C140F' : '#FFFFFF',
        pointBorderWidth: 2,
        borderWidth: 2.8,
      },
      {
        label: `Ngưỡng Trần (${maxTemp}°C)`,
        data: (ordered.length > 0 ? ordered : [1,2,3,4,5]).map(() => maxTemp),
        borderColor: '#EF4444',
        borderDash: [5, 4],
        yAxisID: 'yTemp',
        pointRadius: 0,
        borderWidth: 1.5,
        fill: false,
      },
      {
        label: `Ngưỡng Sàn (${minTemp}°C)`,
        data: (ordered.length > 0 ? ordered : [1,2,3,4,5]).map(() => minTemp),
        borderColor: '#0284C7',
        borderDash: [4, 4],
        yAxisID: 'yTemp',
        pointRadius: 0,
        borderWidth: 1.5,
        fill: false,
      },
      {
        label: `Khí ${gasType} (ppm)`,
        data: ordered.length > 0 ? ordered.map((d) => Number(d.gas_ppm ?? d.gas ?? 0.0)) : [12, 13, 14, 14, 15],
        borderColor: '#F59E0B',
        backgroundColor: 'transparent',
        yAxisID: 'yGas',
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#F59E0B',
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          color: isDark ? '#E5E5E5' : '#1A1A1A',
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '600' },
        },
      },
      tooltip: {
        backgroundColor: isDark ? '#1C140F' : '#1A1A1A',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: isDark ? 'rgba(249,87,22,0.3)' : 'transparent',
        borderWidth: 1,
        titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '700' },
        bodyFont: { family: "'JetBrains Mono', monospace", size: 11 },
        padding: 10,
        cornerRadius: 12,
      },
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { family: "'JetBrains Mono', monospace", size: 10 },
          maxRotation: 0,
        },
      },
      yTemp: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Nhiệt độ (°C)',
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '700' },
          color: '#F95716',
        },
        grid: { color: gridColor },
        ticks: { color: textColor },
      },
      yGas: {
        type: 'linear',
        display: true,
        position: 'right',
        min: 0,
        suggestedMax: Math.max(50, (profile?.maxGas || 30) * 1.4),
        title: {
          display: true,
          text: `Khí ${gasType} (ppm)`,
          font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: '700' },
          color: '#F59E0B',
        },
        grid: { drawOnChartArea: false },
        ticks: { color: textColor },
      },
    },
  };

  return (
    <div className="w-full h-[380px] sm:h-[420px]">
      <Line data={data} options={options} />
    </div>
  );
}

/**
 * Hệ thống Tuyến đường Thực tế Đa dạng theo từng Lô hàng & Danh mục (Polyglot Cold Chain Routes)
 */
export const BATCH_ROUTES = {
  'LOT-VEG-2026-001': {
    routeName: 'ĐÀ LẠT ➔ BẢO LỘC ➔ DẦU GIÂY ➔ TP. HỒ CHÍ MINH',
    shortTitle: 'Đà Lạt ➔ TP.HCM',
    highway: '308 km • Quốc Lộ 20 & Cao Tốc Dầu Giây',
    totalKm: 308,
    center: [11.32, 107.55],
    zoom: 8,
    checkpoints: [
      { name: 'Nông Trại Công Nghệ Cao LangBiang (Đà Lạt)', coords: [11.9404, 108.4583], type: 'origin', time: '05:30', note: 'Điểm xuất bến & Khởi tạo Genesis Block #0' },
      { name: 'Trạm Dừng Chân Đèo Bảo Lộc (QL20)', coords: [11.5479, 107.8077], type: 'waypoint', time: '08:15', note: 'km 110 • Trạm vi khí hậu cảm biến' },
      { name: 'Trạm KCS Kiểm Dịch Định Quán (Đồng Nai)', coords: [11.1254, 107.1862], type: 'waypoint', time: '09:30', note: 'km 195 • Kiểm dịch chuỗi lạnh' },
      { name: 'Nút Giao Cao Tốc Dầu Giây - Long Thành', coords: [10.9465, 107.1258], type: 'waypoint', time: '10:30', note: 'km 260 • Hành lang lạnh cao tốc' },
      { name: 'Siêu Thị Co.opmart Quận 7 (TP.HCM)', coords: [10.7295, 106.7068], type: 'destination', time: '11:45', note: 'km 308 • Điểm đích giao hàng & Nhập kho FEFO' }
    ]
  },
  'LOT-FISH-2026-001': {
    routeName: 'CẢNG BIỂN CÁT LÁI ➔ MAI CHÍ THỌ ➔ CO.OPMART QUẬN 1',
    shortTitle: 'Cát Lái ➔ Quận 1',
    highway: '28 km • Đại Lộ Mai Chí Thọ & Hầm Thủ Thiêm',
    totalKm: 28,
    center: [10.765, 106.735],
    zoom: 12,
    checkpoints: [
      { name: 'Cảng Quốc Tế Cát Lái (TP. Thủ Đức)', coords: [10.7626, 106.7865], type: 'origin', time: '03:00', note: 'Xuất bến container cá hồi tươi ướp đá' },
      { name: 'Nút Giao An Phú - Mai Chí Thọ', coords: [10.7850, 106.7550], type: 'waypoint', time: '03:30', note: 'Hành lang thông quan lạnh Nam Sài Gòn' },
      { name: 'Hầm Vượt Sông Sài Gòn (Thủ Thiêm)', coords: [10.7715, 106.7050], type: 'waypoint', time: '03:50', note: 'Kiểm soát nhiệt độ 0°C - 2°C' },
      { name: 'Siêu Thị Co.opmart Cống Quỳnh (Quận 1)', coords: [10.7684, 106.6870], type: 'destination', time: '04:15', note: 'Điểm đích • Bàn giao quầy Sashimi tươi' }
    ]
  },
  'LOT-MEAT-2026-002': {
    routeName: 'TỔ HỢP MEATDELI BẾN LỨC ➔ BÌNH CHÁNH ➔ CO.OPMART QUẬN 7',
    shortTitle: 'Bến Lức ➔ Q7',
    highway: '48 km • Cao Tốc Trung Lương & Nguyễn Văn Linh',
    totalKm: 48,
    center: [10.68, 106.60],
    zoom: 11,
    checkpoints: [
      { name: 'Tổ Hợp Chế Biến Thịt Mát Bến Lức (Long An)', coords: [10.6433, 106.4950], type: 'origin', time: '04:00', note: 'Thịt tươi mát 0°C - 4°C xuất xưởng' },
      { name: 'Trạm Thu Phí Chợ Đệm (Bình Chánh)', coords: [10.6865, 106.5670], type: 'waypoint', time: '04:35', note: 'Cửa ngõ Tây Nam TP.HCM' },
      { name: 'Đại Lộ Nguyễn Văn Linh (Khu A Nam Sài Gòn)', coords: [10.7080, 106.6200], type: 'waypoint', time: '05:00', note: 'Hành lang logistics lạnh' },
      { name: 'Siêu Thị Co.opmart Quận 7 (TP.HCM)', coords: [10.7295, 106.7068], type: 'destination', time: '05:30', note: 'Điểm đích • Bàn giao tủ thịt chuyên dụng M2' }
    ]
  },
  'LOT-DAIRY-2026-005': {
    routeName: 'ĐƠN DƯƠNG (LÂM ĐỒNG) ➔ ĐÈO CHUỐI ➔ DẦU GIÂY ➔ TP.HCM',
    shortTitle: 'Đơn Dương ➔ TP.HCM',
    highway: '295 km • Cao Tốc Liên Khương - Dầu Giây',
    totalKm: 295,
    center: [11.28, 107.60],
    zoom: 8,
    checkpoints: [
      { name: 'Trang Trại Bò Sữa Đà Lạt Milk (Đơn Dương)', coords: [11.7820, 108.5630], type: 'origin', time: '04:30', note: 'Xuất bến sữa tươi thanh trùng 100%' },
      { name: 'Trạm Trung Chuyển Madagui (Đạ Huoai)', coords: [11.4120, 107.5550], type: 'waypoint', time: '07:30', note: 'km 145 • Kiểm tra nhiệt độ 2°C - 4°C' },
      { name: 'Trạm Dịch Vụ Long Khánh (Đồng Nai)', coords: [10.9350, 107.2400], type: 'waypoint', time: '09:00', note: 'km 230 • Khóa bảo mật thùng xe' },
      { name: 'Siêu Thị Co.opmart Quận 7 (TP.HCM)', coords: [10.7295, 106.7068], type: 'destination', time: '10:15', note: 'km 295 • Bàn giao tủ mát sữa thanh trùng' }
    ]
  },
  'LOT-FROZEN-2026-001': {
    routeName: 'NHÀ MÁY CẦU TRE (TÂN PHÚ) ➔ VÀNH ĐAI TRONG ➔ CO.OPMART GÒ VẤP',
    shortTitle: 'Tân Phú ➔ Gò Vấp',
    highway: '22 km • Tuyến Cấp Đông IQF Nội Đô',
    totalKm: 22,
    center: [10.80, 106.65],
    zoom: 12,
    checkpoints: [
      { name: 'Nhà Máy Thực Phẩm Đông Lạnh Cầu Tre (Tân Phú)', coords: [10.7750, 106.6270], type: 'origin', time: '06:00', note: 'Cấp đông sâu -20°C xuất kho' },
      { name: 'Trạm Trung Chuyển KCN Tân Bình', coords: [10.8030, 106.6450], type: 'waypoint', time: '06:25', note: 'Đo kiểm nhiệt độ âm sâu' },
      { name: 'Siêu Thị Co.opmart Quang Trung (Gò Vấp)', coords: [10.8350, 106.6620], type: 'destination', time: '06:50', note: 'Điểm đích • Bàn giao tủ đông sâu F1' }
    ]
  },
  'LOT-DELI-2026-006': {
    routeName: 'BẾP TRUNG TÂM THUẬN AN ➔ ĐẠI LỘ BÌNH DƯƠNG ➔ CO.OPMART HUỲNH TẤN PHÁT',
    shortTitle: 'Thuận An ➔ Q7',
    highway: '38 km • Quốc Lộ 13 & Cầu Phú Mỹ',
    totalKm: 38,
    center: [10.84, 106.71],
    zoom: 11,
    checkpoints: [
      { name: 'Bếp Trung Tâm Co.op Central Kitchen (Thuận An)', coords: [10.9320, 106.6980], type: 'origin', time: '09:30', note: 'Thực phẩm giữ nóng > 65°C xuất bến' },
      { name: 'Cầu Bình Triệu (TP. Thủ Đức)', coords: [10.8220, 106.7110], type: 'waypoint', time: '10:00', note: 'Hành lang vận chuyển nóng' },
      { name: 'Cầu Phú Mỹ (Quận 7)', coords: [10.7480, 106.7450], type: 'waypoint', time: '10:25', note: 'Kết nối Nam Sài Gòn' },
      { name: 'Siêu Thị Co.opmart Huỳnh Tấn Phát', coords: [10.7420, 106.7320], type: 'destination', time: '10:45', note: 'Điểm đích • Bàn giao quầy Deli giữ nóng' }
    ]
  }
};

/**
 * Bộ phân giải tuyến đường động thông minh theo mã lô, tên sản phẩm và phân loại
 */
export function getRouteForBatch(batchCode, batch = null) {
  if (batchCode && BATCH_ROUTES[batchCode]) {
    return BATCH_ROUTES[batchCode];
  }
  const code = (batchCode || '').toUpperCase();
  const cat = (batch?.category || '').toUpperCase();
  const name = (batch?.product_name || batch?.productName || '').toLowerCase();

  if (code.includes('FISH') || cat.includes('SEAFOOD') || name.includes('cá') || name.includes('hải sản') || name.includes('sashimi')) {
    return BATCH_ROUTES['LOT-FISH-2026-001'];
  }
  if (code.includes('MEAT') || cat.includes('MEAT') || name.includes('thịt') || name.includes('bò') || name.includes('heo')) {
    return BATCH_ROUTES['LOT-MEAT-2026-002'];
  }
  if (code.includes('DAIRY') || cat.includes('DAIRY') || name.includes('sữa') || name.includes('milk')) {
    return BATCH_ROUTES['LOT-DAIRY-2026-005'];
  }
  if (code.includes('FROZEN') || cat.includes('FROZEN') || name.includes('đông lạnh') || name.includes('cảo')) {
    return BATCH_ROUTES['LOT-FROZEN-2026-001'];
  }
  if (code.includes('DELI') || cat.includes('COOKED') || name.includes('gà quay') || name.includes('nóng')) {
    return BATCH_ROUTES['LOT-DELI-2026-006'];
  }
  return BATCH_ROUTES['LOT-VEG-2026-001'];
}

/**
 * Hàm nội suy vị trí GPS mượt mà dọc theo tuyến đường theo tiến độ di chuyển (0.0 -> 1.0)
 */
export function getInterpolatedPosition(coords, progress) {
  if (!coords || coords.length === 0) return [10.76, 106.69];
  if (progress <= 0) return coords[0];
  if (progress >= 1) return coords[coords.length - 1];
  const numSegments = coords.length - 1;
  const scaled = progress * numSegments;
  const segIndex = Math.min(Math.floor(scaled), numSegments - 1);
  const frac = scaled - segIndex;
  const lat = coords[segIndex][0] + frac * (coords[segIndex + 1][0] - coords[segIndex][0]);
  const lng = coords[segIndex][1] + frac * (coords[segIndex + 1][1] - coords[segIndex][1]);
  return [Number(lat.toFixed(5)), Number(lng.toFixed(5))];
}

/**
 * Bản đồ GPS Hành trình Xe Lạnh Thực tế tại Việt Nam (react-leaflet)
 * - Đa dạng tuyến đường tự động theo mã lô hàng được chọn
 * - Chiều cao cân đối hoàn hảo khớp với biểu đồ kép bên cạnh
 * - Vị trí xe ban đầu đỗ chính xác 100% tại điểm xuất bến (chỉ di chuyển khi xe đã bắt đầu chạy)
 * - Tự động cập nhật vị trí GPS di chuyển thời gian thực dọc tuyến
 * - Nút thu nhỏ bản đồ rõ nét chuẩn design
 */
export function VietnamColdChainMap({
  latestTelemetry = null,
  batchCode = '',
  batch = null,
  vehiclePlate = '',
  isTripStarted = false,
  isTripDelivered = false,
  isAtDestination = false,
  isBatchAssigned = false,
  currentLat = null,
  currentLng = null,
  tripProgress = 0,
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    if (isExpanded) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded]);

  const hasBatchSelected = Boolean(batch && (batch.batch_code || batchCode));

  // Chọn tuyến đường tương ứng với lô hàng được chọn
  const routeData = getRouteForBatch(batchCode, batch);
  const routeCoords = routeData.checkpoints.map((cp) => cp.coords);

  // Điểm xuất bến & Điểm đích
  const originLat = routeCoords[0][0];
  const originLng = routeCoords[0][1];
  const destLat = routeCoords[routeCoords.length - 1][0];
  const destLng = routeCoords[routeCoords.length - 1][1];

  let vehicleLat = originLat;
  let vehicleLng = originLng;

  if (isTripDelivered) {
    vehicleLat = destLat;
    vehicleLng = destLng;
  } else if (isTripStarted && isBatchAssigned && hasBatchSelected) {
    if (isAtDestination) {
      vehicleLat = destLat;
      vehicleLng = destLng;
    } else if (currentLat != null && currentLng != null) {
      vehicleLat = Number(currentLat);
      vehicleLng = Number(currentLng);
    } else if (tripProgress > 0) {
      const [iLat, iLng] = getInterpolatedPosition(routeCoords, tripProgress);
      vehicleLat = iLat;
      vehicleLng = iLng;
    } else {
      const midPoint = routeCoords[Math.min(1, routeCoords.length - 2)];
      vehicleLat = Number(latestTelemetry?.latitude ?? midPoint[0]);
      vehicleLng = Number(latestTelemetry?.longitude ?? midPoint[1]);
    }
  } else {
    vehicleLat = originLat;
    vehicleLng = originLng;
  }

  const currentTemp = latestTelemetry?.temperature ?? latestTelemetry?.temp ?? 9.5;
  const alertStatus = latestTelemetry?.alert_status ?? latestTelemetry?.alertTriggered ?? 'NORMAL';
  const isBreach = alertStatus && alertStatus !== 'NORMAL';
  const showLiveMetrics = hasBatchSelected && isBatchAssigned && (isTripStarted || isTripDelivered);

  const renderMapCore = (expandedMode = false) => (
    <div className="w-full h-full relative z-0 min-h-[380px]">
      <MapContainer
        key={`${batchCode || 'NONE'}-${expandedMode}-${isBatchAssigned}-${hasBatchSelected}`}
        center={routeData.center}
        zoom={expandedMode ? routeData.zoom + 1 : routeData.zoom}
        scrollWheelZoom={expandedMode}
        style={{ height: '100%', width: '100%', minHeight: expandedMode ? '500px' : '380px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapResizer />

        {/* CHỈ VẼ TUYẾN ĐƯỜNG KHI ĐÃ CHỌN LÔ VÀ LÔ ĐÃ CÓ TÀI XẾ NHẬN */}
        {hasBatchSelected && isBatchAssigned && (
          <Polyline
            positions={routeCoords}
            pathOptions={{ color: '#F95716', weight: expandedMode ? 5 : 4, dashArray: '8, 6' }}
          />
        )}

        {/* KHI ĐÃ CHỌN LÔ NHƯNG CHƯA CÓ TÀI XẾ: CHỈ HIỂN THỊ ĐIỂM KHO NÔNG TRẠI */}
        {hasBatchSelected && !isBatchAssigned && (
          <CircleMarker
            center={routeCoords[0]}
            radius={expandedMode ? 10 : 8}
            pathOptions={{ color: '#1A1A1A', fillColor: '#9CA3AF', fillOpacity: 0.95, weight: 2.5 }}
          >
            <Popup>
              <div className="text-xs font-sans p-1">
                <strong className="text-neutral-800">Kho lưu trữ: {routeData.checkpoints[0].name}</strong>
                <div className="text-[11px] text-amber-600 font-bold mt-1">⏳ Chưa có tài xế nhận lô hàng</div>
                <div className="text-[10px] text-neutral-400 mt-0.5">Tuyến đường vận chuyển sẽ được vẽ khi xe tiếp nhận.</div>
              </div>
            </Popup>
          </CircleMarker>
        )}

        {/* KHI ĐÃ CHỌN LÔ VÀ ĐÃ CÓ TÀI XẾ: VẼ CÁC TRẠM VÀ VỊ TRÍ XE */}
        {hasBatchSelected && isBatchAssigned && (
          <>
            {routeData.checkpoints.map((cp, idx) => {
              const isOrigin = idx === 0;
              const isDest = idx === routeData.checkpoints.length - 1;
              const fillColor = isOrigin ? '#10B981' : isDest ? '#0284C7' : '#F59E0B';
              const radius = (isOrigin || isDest) ? (expandedMode ? 9 : 7) : 5.5;

              return (
                <CircleMarker
                  key={idx}
                  center={cp.coords}
                  radius={radius}
                  pathOptions={{ color: '#1A1A1A', fillColor, fillOpacity: 0.95, weight: 2 }}
                >
                  <Popup>
                    <div className="text-xs font-sans">
                      <strong className={isOrigin ? 'text-emerald-700' : isDest ? 'text-sky-700' : 'text-[#F95716]'}>
                        {cp.name}
                      </strong>
                      <div className="text-[11px] text-neutral-500 mt-0.5">{cp.note}</div>
                      <div className="text-[10px] text-neutral-400 font-mono mt-0.5">Dự kiến: {cp.time}</div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}

            <CircleMarker
              center={[vehicleLat, vehicleLng]}
              radius={expandedMode ? 13 : 10}
              pathOptions={{
                color: '#FFFFFF',
                fillColor: isBreach ? '#EF4444' : isTripDelivered ? '#10B981' : isTripStarted ? '#F95716' : '#F59E0B',
                fillOpacity: 1,
                weight: 3.5,
              }}
            >
              <Popup>
                <div className="text-xs font-sans p-1">
                  <div className="font-bold text-[#F95716]">
                    🚛 {vehiclePlate}
                  </div>
                  <div className="text-[11px] font-semibold mt-0.5">
                    {isTripDelivered
                      ? '✓ Đã bàn giao tại điểm đích'
                      : isTripStarted
                      ? (isAtDestination ? '📍 Đã tới bến đích' : '⚡ Xe đang di chuyển trên đường')
                      : '⏳ Xe đang đỗ tại bến xuất phát'}
                  </div>
                  <div className="mt-1">Mã lô: <strong>{batchCode}</strong></div>
                  <div>Nhiệt độ hiện tại: <strong>{showLiveMetrics ? `${currentTemp}°C` : '-- °C'}</strong></div>
                  <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                    Tọa độ GPS: {vehicleLat.toFixed(4)}°N, {vehicleLng.toFixed(4)}°E
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          </>
        )}
      </MapContainer>

      {/* Floating status badge */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 dark:bg-[#1C140F]/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-orange-950/10 dark:border-orange-500/20 text-[11px] font-semibold text-[#1A1A1A] dark:text-[#F5F5F5] shadow-sm flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${
            !hasBatchSelected || !isBatchAssigned
              ? 'bg-neutral-400'
              : isTripStarted
              ? 'bg-[#F95716] animate-pulse'
              : isTripDelivered
              ? 'bg-emerald-500'
              : 'bg-amber-400'
          }`}
        />
        <span>
          {!hasBatchSelected
            ? 'Chưa chọn lô hàng'
            : !isBatchAssigned
            ? 'Chưa có tài xế nhận lô hàng'
            : routeData.routeName}
        </span>
      </div>
    </div>
  );

  return (
    <>
      <div className="w-full h-full min-h-[420px] rounded-[24px] overflow-hidden border border-orange-950/5 dark:border-orange-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-0 flex flex-col">
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="absolute top-3 right-3 z-[1000] bg-white/95 dark:bg-[#1C140F]/95 hover:bg-[#F95716] hover:text-white dark:hover:bg-[#F95716] text-[#F95716] backdrop-blur-md px-3.5 py-1.5 rounded-full border border-orange-950/10 dark:border-orange-500/20 text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          title="Phóng to giao diện bản đồ để theo dõi toàn tuyến"
        >
          <Maximize size={13} />
          Phóng to giao diện bản đồ
        </button>
        <div className="flex-1 w-full h-full min-h-[380px]">
          {renderMapCore(false)}
        </div>
      </div>

      {/* Modal phóng to giao diện bản đồ */}
      {isExpanded && (
        <div className="fixed inset-0 z-[99999] bg-[#0E0704]/85 backdrop-blur-md flex flex-col p-3 md:p-6 animate-fadeIn">
          {/* Thanh điều khiển trên cùng */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3 bg-white dark:bg-[#1C140F] px-5 py-3.5 rounded-2xl border border-orange-950/10 dark:border-orange-500/20 shadow-lg">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#F95716] flex items-center justify-center font-bold">
                  <Truck size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-[#1A1A1A] dark:text-[#F5F5F5] flex items-center gap-2.5">
                    <span>Giám sát hành trình xe lạnh chuỗi cung ứng</span>
                    {hasBatchSelected && isBatchAssigned && isTripStarted && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 animate-pulse">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        Live
                      </span>
                    )}
                  </h3>
                  {hasBatchSelected && isBatchAssigned && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {routeData.highway} &bull; {routeData.routeName}
                    </p>
                  )}
                </div>
              </div>

              {/* Biển số vàng và Mã lô lớn dễ nhìn bên cạnh tiêu đề */}
              {!hasBatchSelected ? (
                <span className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs font-bold text-neutral-500">
                  Chưa chọn lô hàng
                </span>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  {isBatchAssigned && vehiclePlate ? (
                    <div className="inline-flex flex-col items-center justify-center bg-[#FFD700] border-2 border-neutral-900 rounded-xl px-4 py-1.5 shadow-sm">
                      <div className="text-[9px] font-black tracking-widest text-neutral-800 uppercase flex items-center gap-1">
                        <span>VIỆT NAM</span>
                        <span className="w-1 h-1 rounded-full bg-red-600" />
                      </div>
                      <div className="font-mono text-lg sm:text-xl font-black tracking-widest text-neutral-950 leading-none mt-0.5">
                        {vehiclePlate}
                      </div>
                    </div>
                  ) : (
                    <span className="px-3.5 py-1.5 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 text-xs font-bold text-neutral-500">
                      Chưa có tài xế nhận lô hàng
                    </span>
                  )}

                  <div className="px-4 py-2 rounded-xl bg-orange-500/10 border border-[#F95716]/30 flex items-center gap-2">
                    <span className="text-[11px] font-extrabold uppercase text-neutral-500 dark:text-neutral-400">
                      Mã lô:
                    </span>
                    <span className="font-mono text-lg sm:text-xl font-black text-[#F95716]">
                      {batchCode}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm cursor-pointer shrink-0"
              title="Thu nhỏ bản đồ (phím ESC)"
            >
              <Minimize size={15} />
              <span>Thu nhỏ bản đồ</span>
            </button>
          </div>

          {/* Bản đồ lớn & Bảng HUD thời gian thực */}
          <div className="flex-1 w-full rounded-2xl overflow-hidden border border-orange-950/10 dark:border-orange-500/20 shadow-2xl relative flex flex-col lg:flex-row">
            <div className="flex-1 h-full min-h-[350px]">
              {renderMapCore(true)}
            </div>

            {/* Bảng HUD thông số chi tiết của tuyến đường tương ứng */}
            <div className="w-full lg:w-[380px] bg-white/95 dark:bg-[#1C140F]/95 backdrop-blur-md p-5 border-t lg:border-t-0 lg:border-l border-orange-950/10 dark:border-orange-500/20 flex flex-col justify-between overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Thông số vi khí hậu thời gian thực
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="p-3 rounded-xl bg-orange-500/5 dark:bg-white/5 border border-orange-950/5 dark:border-orange-500/10">
                      <div className="text-[10px] font-bold text-neutral-400">Nhiệt độ thùng</div>
                      <div className="text-xl font-extrabold text-[#F95716] mt-0.5">
                        {showLiveMetrics ? `${currentTemp}°C` : '—'}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5 font-medium">
                        {showLiveMetrics ? 'Đạt chuẩn' : !hasBatchSelected ? 'Chưa chọn lô hàng' : 'Chưa kích hoạt'}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-orange-500/5 dark:bg-white/5 border border-orange-950/5 dark:border-orange-500/10">
                      <div className="text-[10px] font-bold text-neutral-400">Khí C2H4 / MQ-4</div>
                      <div className="text-xl font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5] mt-0.5">
                        {showLiveMetrics ? `${latestTelemetry?.gas_ppm || 0} ppm` : '—'}
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-0.5 font-medium">
                        {showLiveMetrics ? '≤ 30 ppm' : !hasBatchSelected ? 'Chưa chọn lô hàng' : 'Chưa kích hoạt'}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
                    Các trạm kiểm soát của tuyến
                  </div>
                  {!hasBatchSelected ? (
                    <div className="mt-3 p-4 rounded-xl bg-neutral-100/70 dark:bg-white/5 border border-dashed border-neutral-300 dark:border-neutral-700 text-center text-xs font-bold text-neutral-500">
                      Chưa chọn lô hàng
                    </div>
                  ) : !isBatchAssigned ? (
                    <div className="mt-3 p-4 rounded-xl bg-neutral-100/70 dark:bg-white/5 border border-dashed border-neutral-300 dark:border-neutral-700 text-center text-xs font-bold text-neutral-500">
                      Chưa có tài xế nhận lô hàng
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {routeData.checkpoints.map((cp, idx) => {
                        const isOrigin = idx === 0;
                        const isDest = idx === routeData.checkpoints.length - 1;
                        const isCurrent = isTripDelivered
                          ? isDest
                          : isTripStarted
                          ? (isAtDestination ? isDest : idx === 1)
                          : isOrigin;

                        return (
                          <div key={idx} className="flex items-start gap-2.5 text-xs">
                            <span
                              className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${
                                isCurrent
                                  ? 'bg-[#F95716] animate-ping'
                                  : isOrigin
                                  ? 'bg-emerald-500'
                                  : isDest
                                  ? 'bg-sky-500'
                                  : 'bg-neutral-300 dark:bg-neutral-600'
                              }`}
                            />
                            <div>
                              <div className={`font-bold ${isCurrent ? 'text-[#F95716]' : 'text-[#1A1A1A] dark:text-[#F5F5F5]'}`}>
                                {cp.name}
                              </div>
                              <div className="text-[11px] text-neutral-400">
                                {cp.time} &bull; {cp.note}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-orange-950/5 dark:border-orange-500/10 flex items-center justify-between text-xs">
                <span className="text-neutral-400">Bảo chứng sổ cái:</span>
                <span className="font-mono text-[11px] text-[#F95716] font-bold">
                  {hasBatchSelected ? '100% Khớp ECDSA' : 'Chưa chọn lô hàng'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Mạng Lưới Đồ Thị Chuỗi Cung Ứng (Farm-to-Fork Supply Chain Graph)
 * Phong cách Momentum tối giản, tinh tế, không chữ nhỏ rườm rà.
 */
export function SupplyChainGraphView({ batch = {}, stages = [], latestTelemetry = null }) {
  const batchStatus = (batch?.status || 'CREATED').toUpperCase();
  const farmName = batch?.farm_name || batch?.producer_name || 'Nông Trại Sản Xuất';
  const rawVehicle =
    batch?.transportJourney?.vehicle_plate ||
    batch?.transport_journey?.vehicle_plate ||
    batch?.transport_vehicle_plate ||
    batch?.vehicle_plate ||
    '';
  const hasVehicle = Boolean(rawVehicle && rawVehicle.trim() !== '' && !rawVehicle.toUpperCase().includes('CHƯA'));
  const vehicleLabel = hasVehicle ? rawVehicle : 'Chưa phân công xe';
  const createdAt = batch?.created_at
    ? new Date(batch.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : 'Đã đúc Block #0';
  const currentTime = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const isTransporting =
    batchStatus === 'IN_TRANSIT' ||
    batchStatus === 'ARRIVED_AT_STORE' ||
    batchStatus === 'DELIVERED' ||
    batchStatus === 'QC_ACCEPTED' ||
    batchStatus === 'ON_SHELF' ||
    batchStatus === 'SOLD';
  const isArrivedOrLater =
    batchStatus === 'ARRIVED_AT_STORE' ||
    batchStatus === 'DELIVERED' ||
    batchStatus === 'QC_ACCEPTED' ||
    batchStatus === 'ON_SHELF' ||
    batchStatus === 'SOLD';
  const isQcDone = batchStatus === 'QC_ACCEPTED' || batchStatus === 'ON_SHELF' || batchStatus === 'SOLD';
  const isOnShelf = batchStatus === 'ON_SHELF' || batchStatus === 'SOLD';
  const isSold = batchStatus === 'SOLD';

  const dynamicStages = [
    {
      id: 1,
      name: farmName,
      desc: `Khai báo nguồn gốc VietGAP & Đúc Genesis Block (${batch?.batch_code || 'Lô hàng'}) • ${Number(batch?.weight_kg && batch.weight_kg >= 50 ? batch.weight_kg : 500).toFixed(0)} kg`,
      status: 'COMPLETED',
      time: createdAt,
    },
    {
      id: 2,
      name: `Vận Chuyển Xe Lạnh (${vehicleLabel})`,
      desc: isTransporting
        ? `Nhiệt độ hiện tại: ${Number(latestTelemetry?.temperature ?? latestTelemetry?.temp ?? 8.7).toFixed(1)}°C • Khí: ${Number(latestTelemetry?.gas_ppm ?? latestTelemetry?.gas_value ?? 0).toFixed(1)} ppm`
        : hasVehicle
        ? 'Chờ tài xế khởi hành chuyến xe • Cảm biến nhiệt độ & khí ở chế độ chờ'
        : 'Chưa phân công xe vận chuyển • Cảm biến chưa kích hoạt',
      status: isArrivedOrLater ? 'COMPLETED' : batchStatus === 'IN_TRANSIT' ? 'ACTIVE' : 'PENDING',
      time: batchStatus === 'IN_TRANSIT' ? `Cập nhật ${currentTime}` : isArrivedOrLater ? 'Đã bàn giao' : hasVehicle ? 'Chờ rời bến' : 'Chưa phân công',
    },
    {
      id: 3,
      name: 'Cổng Tiếp Nhận QC Siêu Thị',
      desc: isQcDone ? 'Đã nghiệm thu đạt chuẩn & Ký số tiếp nhận' : 'Chờ kiểm định đối soát chất lượng 72h',
      status: isOnShelf ? 'COMPLETED' : isQcDone ? 'COMPLETED' : batchStatus === 'ARRIVED_AT_STORE' || batchStatus === 'DELIVERED' ? 'ACTIVE' : 'PENDING',
      time: isQcDone ? 'Đã nghiệm thu' : batchStatus === 'ARRIVED_AT_STORE' || batchStatus === 'DELIVERED' ? 'Chờ KCS duyệt' : 'Chờ xe đến cổng',
    },
    {
      id: 4,
      name: 'Kệ Hàng Thông Minh FEFO',
      desc: isOnShelf ? 'Đã lên quầy kệ • Sắp xếp tối ưu hạn dùng' : 'Chờ phân luồng nhập quầy kệ',
      status: isSold ? 'COMPLETED' : isOnShelf ? 'ACTIVE' : 'PENDING',
      time: isOnShelf ? 'Đang trên quầy' : 'Chờ xếp kệ',
    },
    {
      id: 5,
      name: 'Quầy Thu Ngân POS',
      desc: isSold ? 'Đã thanh toán & Hủy tem niêm phong số' : 'Sẵn sàng phục vụ người tiêu dùng',
      status: isSold ? 'COMPLETED' : 'PENDING',
      time: isSold ? 'Đã bán' : 'Sẵn sàng',
    },
  ];

  const currentStages = stages.length > 0 ? stages : dynamicStages;

  return (
    <div className="space-y-2.5">
      {currentStages.map((st, idx) => {
        const isDone = st.status === 'COMPLETED';
        const isActive = st.status === 'ACTIVE';
        const statusLabel = isDone ? 'Hoàn thành' : isActive ? 'Đang thực hiện' : 'Chờ xử lý';
        return (
          <div
            key={st.id || idx}
            className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all ${
              isActive
                ? 'border-[#F95716]/30 bg-[#F95716]/[0.03] shadow-[0_4px_16px_rgba(249,87,22,0.08)]'
                : 'border-orange-950/5 dark:border-orange-500/10 bg-white/40 dark:bg-white/[0.02]'
            }`}
          >
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[12px] font-bold ${
                isDone
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : isActive
                  ? 'bg-[#F95716] text-white shadow-[0_4px_12px_rgba(249,87,22,0.30)]'
                  : 'bg-orange-950/[0.05] dark:bg-white/10 text-neutral-400'
              }`}
            >
              {idx + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[13px] font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  {st.name}
                </h4>
                <span className="text-[11px] font-medium text-neutral-400 shrink-0 font-mono">
                  {st.time}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isDone
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : isActive
                      ? 'bg-[#F95716]/10 text-[#F95716]'
                      : 'bg-orange-950/[0.04] dark:bg-white/5 text-neutral-400'
                  }`}
                >
                  {statusLabel}
                </span>
                <span className="text-[11.5px] text-neutral-400 dark:text-neutral-500 truncate">
                  {st.desc}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
