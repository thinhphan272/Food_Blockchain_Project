import React, { useState, useEffect } from 'react';
import {
  Truck,
  Activity,
  Thermometer,
  Box,
  Unlock,
  Lock,
  Download,
  ArrowUpRight,
  Repeat,
  ChevronLeft,
  ChevronRight,
} from '../components/MomentumIcons';
import ColdChainGaugeCard from '../components/dashboard/ColdChainGaugeCard';
import FrostedHeroCard from '../components/dashboard/FrostedHeroCard';
import BlockchainPanel from '../components/dashboard/BlockchainPanel';
import MetricCardsGrid from '../components/dashboard/MetricCardsGrid';
import {
  DualAxisTelemetryChart,
  SupplyChainGraphView,
} from '../components/ColdChainWidgets';

export default function OverviewPage({
  batches = [],
  selectedBatch,
  onSelectBatch,
  searchQuery = '',
  selectedProfile,
  latestTelemetry,
  telemetryList = [],
  relayState,
  handleToggleRelay,
  handleOtaSync,
  setActiveTab,
  blockchainVerification,
  isDark,
  tempCompliancePct,
  gasSafetyPct,
  calculatedTti,
  currentTemp,
  currentGas,
  minAllowedTemp,
  maxAllowedTemp,
  maxAllowedGas,
  ttiDisplay,
  ttiDelta,
  tempStatusText,
  gasStatusText,
  getCassandraCsvExportUrl,
}) {
  const CARD =
    'rounded-[28px] border border-orange-950/5 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-orange-500/10 dark:bg-[#1C140F]';

  const [currentPage, setCurrentPage] = useState(1);
  const [deliveredPage, setDeliveredPage] = useState(1);
  const ITEMS_PER_PAGE = 15;

  const DELIVERED_STATUSES = [
    'ARRIVED_AT_STORE',
    'DELIVERED',
    'QC_ACCEPTED',
    'ON_SHELF',
    'SOLD',
    'RECALLED',
  ];

  // Lọc danh sách lô hàng theo từ khóa tìm kiếm trên thanh Header
  const filteredBatches = React.useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    if (!q) return batches;
    return batches.filter((b) => {
      const batchTransport = b.transportJourney || b.transport_journey || {};
      const plate = (
        batchTransport.vehicle_plate ||
        b.transport_vehicle_plate ||
        b.vehicle_plate ||
        b.vehiclePlate ||
        ''
      ).toLowerCase();
      const driver = (
        batchTransport.driver_name ||
        b.transport_driver_name ||
        b.driver_name ||
        ''
      ).toLowerCase();
      return (
        (b.batch_code && b.batch_code.toLowerCase().includes(q)) ||
        (b.product_name && b.product_name.toLowerCase().includes(q)) ||
        (b.farm_name && b.farm_name.toLowerCase().includes(q)) ||
        (b.category && b.category.toLowerCase().includes(q)) ||
        plate.includes(q) ||
        driver.includes(q)
      );
    });
  }, [batches, searchQuery]);

  // Tách riêng: (1) Lô hàng đang quản lý/điều phối/vận chuyển và (2) Lô hàng đã bàn giao
  const activeManagementBatches = React.useMemo(
    () =>
      filteredBatches.filter(
        (b) => !DELIVERED_STATUSES.includes((b.status || '').toUpperCase())
      ),
    [filteredBatches]
  );

  const deliveredBatches = React.useMemo(
    () =>
      filteredBatches.filter((b) =>
        DELIVERED_STATUSES.includes((b.status || '').toUpperCase())
      ),
    [filteredBatches]
  );

  // Đặt lại trang về 1 khi từ khóa tìm kiếm thay đổi
  useEffect(() => {
    setCurrentPage(1);
    setDeliveredPage(1);
  }, [searchQuery, batches.length]);

  const totalPages = Math.max(1, Math.ceil(activeManagementBatches.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedBatches = activeManagementBatches.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const totalDeliveredPages = Math.max(1, Math.ceil(deliveredBatches.length / ITEMS_PER_PAGE));
  const safeDeliveredPage = Math.min(deliveredPage, totalDeliveredPages);
  const paginatedDeliveredBatches = deliveredBatches.slice(
    (safeDeliveredPage - 1) * ITEMS_PER_PAGE,
    safeDeliveredPage * ITEMS_PER_PAGE
  );

  const renderBatchCard = (b, isDeliveredCard = false) => {
    const batchTransport = b.transportJourney || b.transport_journey || {};
    const rawPlate =
      batchTransport.vehicle_plate ||
      b.transport_vehicle_plate ||
      b.vehicle_plate ||
      b.vehiclePlate ||
      '';
    const hasPlate =
      rawPlate && rawPlate.trim() !== '' && !rawPlate.toUpperCase().includes('CHƯA');
    const rawDriver =
      batchTransport.driver_name || b.transport_driver_name || b.driver_name || '';
    const batchWeight =
      b.total_weight_kg && Number(b.total_weight_kg) >= 100
        ? Number(b.total_weight_kg)
        : (b.weight_kg && Number(b.weight_kg) >= 100 ? Number(b.weight_kg) : 500);
    const packageCount = b.package_count || (b.total_weight_kg ? Math.round(Number(b.total_weight_kg) / 10) : 50);

    return (
      <div
        key={b.batch_code}
        onClick={() => onSelectBatch && onSelectBatch(b)}
        className={`group relative p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
          isDeliveredCard
            ? 'border-emerald-500/20 bg-emerald-500/[0.02] dark:bg-[#1C140F] hover:border-emerald-500 hover:shadow-lg hover:-translate-y-0.5'
            : 'border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] hover:border-[#F95716] dark:hover:border-[#F95716] hover:shadow-lg hover:-translate-y-0.5'
        }`}
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`font-mono text-xs font-black px-2.5 py-0.5 rounded-md ${
                isDeliveredCard
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-[#F95716] bg-orange-500/10'
              }`}
            >
              {b.batch_code}
            </span>
            <span
              className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ${
                b.status === 'IN_TRANSIT'
                  ? 'bg-orange-500/15 text-[#F95716]'
                  : isDeliveredCard
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
                  : b.status === 'ASSIGNED_PENDING'
                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                  : hasPlate
                  ? 'bg-sky-500/15 text-sky-700 dark:text-sky-400'
                  : 'bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {b.status === 'IN_TRANSIT'
                ? '⚡ Đang vận chuyển'
                : isDeliveredCard
                ? '✓ Đã bàn giao'
                : b.status === 'ASSIGNED_PENDING'
                ? '⏳ Chờ tài xế nhận'
                : hasPlate
                ? '○ Chờ rời bến'
                : '○ Chưa phân công'}
            </span>
          </div>
          <h4 className="text-base font-black text-[#1A1A1A] dark:text-[#F5F5F5] group-hover:text-[#F95716] transition-colors line-clamp-1">
            {b.product_name || b.batch_code}
          </h4>
          <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-1">
            Xuất xứ: {b.farm_name || 'Nông trại công nghệ cao'}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono font-bold text-neutral-500 dark:text-neutral-400">
              Xe: {hasPlate ? rawPlate : 'Chưa phân công'}
            </span>
            <span className="font-bold text-neutral-600 dark:text-neutral-300">
              Khối lượng: {batchWeight.toFixed(0)} kg ({packageCount} thùng)
            </span>
          </div>
          {rawDriver && !rawDriver.toUpperCase().includes('CHƯA') && (
            <div className="text-[11px] text-neutral-400 mt-1 truncate">
              Tài xế: {rawDriver}
            </div>
          )}
        </div>

        <div
          className={`mt-4 pt-3 border-t border-orange-950/5 dark:border-orange-500/10 flex items-center justify-between text-xs font-bold ${
            isDeliveredCard
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-[#F95716]'
          }`}
        >
          <span>{isDeliveredCard ? 'Xem hồ sơ lô đã bàn giao' : 'Xem thông tin & giám sát lô'}</span>
          <ArrowUpRight
            size={14}
            className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
          />
        </div>
      </div>
    );
  };

  // Khi chưa chọn lô hàng: Hiển thị 2 phần riêng biệt: (1) Các lô đang điều phối/vận chuyển và (2) Các lô đã bàn giao
  if (!selectedBatch) {
    return (
      <div className="space-y-6">
        {/* PHẦN 1: THÔNG TIN CÁC LÔ HÀNG ĐANG QUẢN LÝ, CHỜ NHẬN & ĐANG VẬN CHUYỂN */}
        <div className="rounded-[28px] border border-orange-950/10 bg-white p-6 sm:p-8 dark:border-orange-500/15 dark:bg-[#1C140F] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-orange-950/5 dark:border-orange-500/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-[#F95716] text-white flex items-center justify-center shadow-md shadow-orange-500/20">
                <Box size={22} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1A1A1A] dark:text-[#F5F5F5] tracking-tight">
                  Thông tin các lô hàng
                </h2>
                {searchQuery && (
                  <p className="text-xs text-[#F95716] font-semibold mt-0.5">
                    Đang lọc theo từ khóa: "{searchQuery}"
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-full bg-orange-500/10 text-[#F95716] text-xs font-bold">
                Trang {safePage} / {totalPages}
              </span>
            </div>
          </div>

          {paginatedBatches.length === 0 ? (
            <div className="py-10 text-center text-sm font-semibold text-neutral-400">
              {searchQuery
                ? `Không có lô hàng đang điều phối/vận chuyển nào khớp với từ khóa "${searchQuery}".`
                : 'Hiện không có lô hàng nào đang chờ xử lý hoặc đang vận chuyển.'}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {paginatedBatches.map((b) => renderBatchCard(b, false))}
            </div>
          )}

          {/* Phân trang lô hàng đang quản lý (Tối đa 15 lô / 1 trang) */}
          {totalPages > 1 && (
            <div className="mt-8 pt-5 border-t border-orange-950/5 dark:border-orange-500/10 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] hover:border-[#F95716] hover:text-[#F95716] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronLeft size={14} /> Trang trước
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  type="button"
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer ${
                    pageNum === safePage
                      ? 'bg-[#F95716] text-white shadow-md shadow-orange-500/25'
                      : 'border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] text-neutral-600 dark:text-neutral-300 hover:border-[#F95716]'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] hover:border-[#F95716] hover:text-[#F95716] disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                Trang tiếp theo <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>

        {/* PHẦN 2: KHU VỰC RIÊNG CHO CÁC LÔ HÀNG ĐÃ BÀN GIAO */}
        <div className="rounded-[28px] border border-emerald-500/20 bg-white p-6 sm:p-8 dark:border-emerald-500/20 dark:bg-[#1C140F] shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-emerald-500/10">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                <Truck size={22} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-black text-[#1A1A1A] dark:text-[#F5F5F5] tracking-tight">
                  Các lô hàng đã bàn giao
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Lô hàng đã hoàn tất vận chuyển và bàn giao cho siêu thị (tách riêng để dễ quản lý)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-bold">
                {deliveredBatches.length} lô đã bàn giao
              </span>
            </div>
          </div>

          {paginatedDeliveredBatches.length === 0 ? (
            <div className="py-8 text-center text-sm font-semibold text-neutral-400">
              Chưa có lô hàng đã bàn giao nào khớp với bộ lọc hiện tại.
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
              {paginatedDeliveredBatches.map((b) => renderBatchCard(b, true))}
            </div>
          )}

          {totalDeliveredPages > 1 && (
            <div className="mt-6 pt-4 border-t border-emerald-500/10 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeliveredPage((p) => Math.max(1, p - 1))}
                disabled={safeDeliveredPage <= 1}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/20 bg-white dark:bg-[#1C140F] text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] hover:border-emerald-500 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                <ChevronLeft size={14} /> Trang trước
              </button>
              <button
                type="button"
                onClick={() => setDeliveredPage((p) => Math.min(totalDeliveredPages, p + 1))}
                disabled={safeDeliveredPage >= totalDeliveredPages}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-500/20 bg-white dark:bg-[#1C140F] text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] hover:border-emerald-500 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer"
              >
                Trang tiếp theo <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Xác định lô hàng đã lăn bánh hay chưa để đồng bộ giao diện nhất quán với trang Xe Lạnh & IoT
  const batchStatusUpper = (selectedBatch?.status || '').toUpperCase();
  const isMovingOrDone = [
    'IN_TRANSIT',
    'ARRIVED_AT_STORE',
    'DELIVERED',
    'QC_ACCEPTED',
    'ON_SHELF',
    'SOLD',
  ].includes(batchStatusUpper);

  const selectedTransport =
    selectedBatch?.transportJourney || selectedBatch?.transport_journey || {};
  const selectedPlateRaw =
    selectedTransport.vehicle_plate ||
    selectedBatch?.transport_vehicle_plate ||
    selectedBatch?.vehicle_plate ||
    '';
  const hasSelectedPlate = Boolean(
    selectedPlateRaw &&
      selectedPlateRaw.trim() !== '' &&
      !selectedPlateRaw.toUpperCase().includes('CHƯA')
  );
  const selectedDriverRaw =
    selectedTransport.driver_name ||
    selectedBatch?.transport_driver_name ||
    selectedBatch?.driver_name ||
    '';
  const selectedWeightKg =
    selectedBatch?.total_weight_kg && Number(selectedBatch.total_weight_kg) >= 100
      ? Number(selectedBatch.total_weight_kg)
      : selectedBatch?.weight_kg && Number(selectedBatch.weight_kg) >= 100
      ? Number(selectedBatch.weight_kg)
      : 500;
  const selectedPackageCount = selectedBatch?.package_count || Math.round(selectedWeightKg / 10);
  const selectedWeightPerPackage = selectedBatch?.weight_per_package_kg || (selectedWeightKg / selectedPackageCount).toFixed(0);
  const selectedPackageUnit = selectedBatch?.package_unit || 'Thùng carton tiêu chuẩn';

  // Lốc lạnh phụ (Relay): Chỉ hoạt động khi xe đang chạy trên đường và thiết bị gửi tín hiệu kích hoạt
  const effectiveRelay = isMovingOrDone ? Boolean(relayState) : false;

  return (
    <div className="space-y-6">
      {/* Tiêu đề & Thông tin xe vận chuyển & Nút chọn lô khác */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#1A1A1A] dark:text-[#F5F5F5]">
            Hành trình chuỗi cung ứng
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Đang xem thông tin lô:{' '}
            <strong className="text-[#F95716] font-mono">{selectedBatch?.batch_code}</strong> &bull;{' '}
            {selectedBatch?.product_name}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {onSelectBatch && (
            <button
              type="button"
              onClick={() => onSelectBatch(null)}
              className="px-3.5 py-2 rounded-2xl border border-neutral-300 dark:border-neutral-700 hover:border-[#F95716] text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:text-[#F95716] transition-all bg-white dark:bg-[#1C140F] shadow-sm cursor-pointer"
            >
              ⇄ Đổi Lô Hàng
            </button>
          )}

          {/* Biển số xe vận chuyển to, rõ ràng */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-orange-500/10 border border-[#F95716]/25 shadow-sm">
            <Truck size={18} className="text-[#F95716] shrink-0" />
            <div className="leading-tight">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                Phương tiện vận chuyển
              </span>
              <span className="text-base sm:text-lg font-black font-mono text-[#F95716] tracking-wide">
                {hasSelectedPlate ? selectedPlateRaw : 'Chưa phân công'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Thẻ tóm tắt thông tin lô hàng (hiển thị đầy đủ cho cả lô chưa phân công, chờ nhận, chờ rời bến) */}
      <div className="rounded-[24px] border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10.5px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-orange-500/10 text-[#F95716]">
                Thông tin định danh lô hàng
              </span>
              <span className="font-mono text-xs font-black text-[#1A1A1A] dark:text-[#F5F5F5]">
                {selectedBatch?.batch_code}
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  batchStatusUpper === 'IN_TRANSIT'
                    ? 'bg-orange-500/15 text-[#F95716]'
                    : isMovingOrDone
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : batchStatusUpper === 'ASSIGNED_PENDING'
                    ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                    : hasSelectedPlate
                    ? 'bg-sky-500/15 text-sky-700 dark:text-sky-400'
                    : 'bg-neutral-200/70 dark:bg-white/10 text-neutral-600 dark:text-neutral-300'
                }`}
              >
                {batchStatusUpper === 'IN_TRANSIT'
                  ? '⚡ Đang vận chuyển trên tuyến'
                  : isMovingOrDone
                  ? '✓ Đã bàn giao siêu thị'
                  : batchStatusUpper === 'ASSIGNED_PENDING'
                  ? '⏳ Chờ tài xế xác nhận nhận chuyến'
                  : hasSelectedPlate
                  ? '○ Tài xế đã nhận • Chờ rời bến'
                  : '○ Lô hàng lưu kho • Chưa phân công xe'}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-[#1A1A1A] dark:text-[#F5F5F5] mt-1.5">
              {selectedBatch?.product_name}
            </h3>
          </div>

          {!isMovingOrDone && (
            <div className="px-3.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-700 dark:text-amber-300">
              Chuyến xe chưa khởi hành — Chỉ hiển thị thông tin lô hàng & khối lượng. Dữ liệu nhiệt độ, khí sinh học sẽ tự động hiển thị thời gian thực khi xe rời bến.
            </div>
          )}
        </div>

        <div className="mt-4 pt-3.5 border-t border-orange-950/5 dark:border-orange-500/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-neutral-400 block">Tải trọng & Số lượng</span>
            <strong className="text-sm font-black text-[#1A1A1A] dark:text-[#F5F5F5] block">
              {selectedWeightKg.toFixed(0)} kg
            </strong>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
              {selectedPackageCount} thùng ({selectedWeightPerPackage} kg/thùng)
            </span>
          </div>
          <div>
            <span className="text-neutral-400 block">Quy cách & Xuất xứ</span>
            <strong className="text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5] line-clamp-1 block">
              {selectedPackageUnit}
            </strong>
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1">
              {selectedBatch?.farm_name || 'Nông trại công nghệ cao'}
            </span>
          </div>
          <div>
            <span className="text-neutral-400 block">Dải nhiệt bảo quản chuẩn</span>
            <strong className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {minAllowedTemp}°C – {maxAllowedTemp}°C
            </strong>
          </div>
          <div>
            <span className="text-neutral-400 block">Tài xế & Phương tiện</span>
            <strong className="text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5] line-clamp-1">
              {hasSelectedPlate
                ? `${selectedPlateRaw}${selectedDriverRaw ? ` • ${selectedDriverRaw}` : ''}`
                : 'Chưa phân công'}
            </strong>
          </div>
        </div>
      </div>

      {/* Row 1: Updates + Frosted Hero + Live Actuation */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Card Chỉ Số Chuỗi Lạnh */}
        <ColdChainGaugeCard
          batchCount={batches.length}
          tempCompliancePct={tempCompliancePct}
          gasSafetyPct={gasSafetyPct}
          calculatedTti={isMovingOrDone ? calculatedTti : 100.0}
          currentTemp={isMovingOrDone ? currentTemp : null}
          currentGas={isMovingOrDone ? currentGas : null}
          ttiDisplay={isMovingOrDone ? ttiDisplay : '—'}
          isLive={isMovingOrDone}
        />

        {/* Frosted Glass Hero Card */}
        <FrostedHeroCard
          selectedBatch={selectedBatch}
          selectedProfile={selectedProfile}
          setActiveTab={setActiveTab}
          handleOtaSync={handleOtaSync}
        />

        {/* Node IoT Phần Cứng Xe Lạnh */}
        <section className={`${CARD} flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-orange-950/5 dark:border-orange-500/10">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F95716]/10 text-[#F95716]">
                  <Truck size={17} />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    Giám sát vi khí hậu thùng xe
                  </h3>
                  <p className="text-[11px] font-mono font-medium text-neutral-400">
                    ESP32-MULTI-01 &bull; {hasSelectedPlate ? selectedPlateRaw : 'Chưa phân công'}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                  isMovingOrDone
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isMovingOrDone ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                {isMovingOrDone ? 'Trực Tuyến' : 'Chờ khởi hành'}
              </span>
            </div>

            <div className="mt-3.5 grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-2xl border border-orange-950/5 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase">
                    DHT22 Thùng Xe
                  </span>
                  <Thermometer size={14} className="text-[#F95716]" />
                </div>
                <div className="mt-2 text-lg font-black text-[#1A1A1A] dark:text-[#F5F5F5]">
                  {isMovingOrDone && currentTemp != null ? `${Number(currentTemp).toFixed(1)}°C` : '—'}
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-orange-950/5 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase">
                    Khí Gas MQ
                  </span>
                  <Activity size={14} className="text-[#F59E0B]" />
                </div>
                <div className="mt-2 text-lg font-black text-[#1A1A1A] dark:text-[#F5F5F5]">
                  {isMovingOrDone && currentGas != null ? `${Number(currentGas).toFixed(1)} ppm` : '—'}
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-orange-950/5 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase">
                    Tải Trọng Xe
                  </span>
                  <Box size={14} className="text-cyan-500" />
                </div>
                <div className="mt-2 text-lg font-black text-[#1A1A1A] dark:text-[#F5F5F5]">
                  {isMovingOrDone
                    ? `${Number(
                        latestTelemetry?.weight_kg && Number(latestTelemetry.weight_kg) > 50
                          ? latestTelemetry.weight_kg
                          : selectedWeightKg
                      ).toFixed(1)} kg`
                    : `${selectedWeightKg.toFixed(0)} kg`}
                </div>
              </div>

              <div className="p-3 rounded-2xl border border-orange-950/5 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase">
                    Khóa Cửa Thùng
                  </span>
                  {isMovingOrDone && latestTelemetry?.door_open ? (
                    <Unlock size={14} className="text-red-500" />
                  ) : (
                    <Lock size={14} className="text-emerald-500" />
                  )}
                </div>
                <div
                  className={`mt-2 text-lg font-black ${
                    !isMovingOrDone
                      ? 'text-neutral-400'
                      : latestTelemetry?.door_open
                      ? 'text-red-500'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {!isMovingOrDone
                    ? 'Chờ khởi hành'
                    : latestTelemetry?.door_open
                    ? 'Cửa Mở'
                    : 'Đã Khóa'}
                </div>
              </div>
            </div>
          </div>

          {/* Relay toggle button */}
          <div className="mt-4 pt-3.5 border-t border-orange-950/5 dark:border-orange-500/10 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Hệ thống lốc lạnh phụ (Relay)
              </div>
              <div className="mt-1">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    effectiveRelay
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-neutral-500/10 text-neutral-400'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      effectiveRelay ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-400'
                    }`}
                  />
                  {effectiveRelay ? 'Hoạt động' : isMovingOrDone ? 'Đang nghỉ' : 'Chờ khởi hành'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleRelay}
              disabled={!isMovingOrDone}
              className={`px-5 py-2.5 rounded-full text-xs font-bold transition-all ${
                !isMovingOrDone
                  ? 'bg-neutral-200 dark:bg-neutral-800 text-neutral-400 cursor-not-allowed'
                  : effectiveRelay
                  ? 'bg-red-500 text-white shadow-sm cursor-pointer'
                  : 'bg-[#F95716] text-white shadow-[0_8px_18px_rgba(249,87,22,0.30)] hover:brightness-105 cursor-pointer'
              }`}
            >
              {!isMovingOrDone
                ? 'Chờ xuất bến'
                : effectiveRelay
                ? 'Dừng kích hoạt'
                : 'Kích hoạt'}
            </button>
          </div>
        </section>
      </div>

      {/* DEDICATED BLOCKCHAIN HIGHLIGHT PANEL */}
      <BlockchainPanel
        selectedBatch={selectedBatch}
        blockchainVerification={blockchainVerification}
        setActiveTab={setActiveTab}
      />

      {/* Row 2: 4 Thẻ Phân Tích Polyglot */}
      <MetricCardsGrid
        tempCompliancePct={tempCompliancePct}
        gasSafetyPct={gasSafetyPct}
        calculatedTti={isMovingOrDone ? calculatedTti : 100.0}
        currentTemp={isMovingOrDone ? currentTemp : null}
        currentGas={isMovingOrDone ? currentGas : null}
        minAllowedTemp={minAllowedTemp}
        maxAllowedTemp={maxAllowedTemp}
        maxAllowedGas={maxAllowedGas}
        ttiDisplay={isMovingOrDone ? ttiDisplay : '—'}
        ttiDelta={isMovingOrDone ? ttiDelta : 'Chờ chuyến xe khởi hành'}
        tempStatusText={tempStatusText}
        gasStatusText={gasStatusText}
        selectedProfile={selectedProfile}
        selectedBatch={selectedBatch}
        latestTelemetry={latestTelemetry}
        isLive={isMovingOrDone}
      />

      {/* Row 3: Biểu Đồ Vi Khí Hậu & Hành Trình Chuỗi Cung Ứng */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className={`${CARD} flex flex-col justify-between`}>
          <div className="flex items-center justify-between pb-3 border-b border-orange-950/5 dark:border-orange-500/10">
            <div>
              <h3 className="text-[15px] font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Biểu đồ kép vi khí hậu thời gian thực
              </h3>
              <p className="mt-0.5 text-[11.5px] font-medium text-neutral-400">
                {isMovingOrDone
                  ? 'Giám sát liên tục nhiệt độ và nồng độ khí bảo quản'
                  : 'Lô hàng chưa xuất bến • Chế độ Chờ (Standby)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-neutral-400">
                {isMovingOrDone ? `${telemetryList.length} mẫu` : 'Standby'}
              </span>
              {isMovingOrDone && (
                <a
                  href={getCassandraCsvExportUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-orange-950/5 dark:border-orange-500/10 text-[11px] font-bold text-[#1A1A1A] dark:text-[#F5F5F5] hover:text-[#F95716]"
                >
                  <Download size={12} /> Xuất CSV
                </a>
              )}
            </div>
          </div>

          {/* Biểu đồ cao 400px hoặc Khung trạng thái Chờ nếu xe chưa khởi hành */}
          <div className="flex-1 min-h-[380px] w-full flex items-center justify-center">
            {isMovingOrDone ? (
              <DualAxisTelemetryChart
                telemetryList={telemetryList}
                profile={selectedProfile}
                isDark={isDark}
              />
            ) : (
              <div className="flex-1 min-h-[380px] w-full flex flex-col items-center justify-center p-8 text-center bg-neutral-50/50 dark:bg-white/[0.01] rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#F95716] flex items-center justify-center mb-3">
                  <Activity size={24} />
                </div>
                <div className="text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Chưa có dữ liệu vi khí hậu thời gian thực
                </div>
                <p className="text-xs text-neutral-400 max-w-sm mt-1 leading-relaxed">
                  Lô hàng{' '}
                  <span className="font-mono font-bold text-[#F95716]">
                    {selectedBatch?.batch_code}
                  </span>{' '}
                  đang ở trạng thái chờ tài xế tiếp nhận & xuất bến. Dữ liệu nhiệt độ DHT22 và nồng độ khí MQ-4 sẽ tự động xuất hiện khi chuyến xe bắt đầu lăn bánh.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-200/60 dark:bg-neutral-800 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400">
                  Trạng thái: Lưu kho &bull; Standby
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={CARD}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
              Hành trình chuỗi cung ứng
            </h3>
            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              Đã Xác Thực
            </span>
          </div>
          <SupplyChainGraphView batch={selectedBatch} latestTelemetry={latestTelemetry} />
        </div>
      </div>
    </div>
  );
}
