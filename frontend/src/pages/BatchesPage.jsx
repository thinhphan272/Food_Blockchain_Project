import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  Layers,
  QrCode,
  Cpu,
  Plus,
  CheckCircle,
  Box,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Copy,
  X,
  Camera,
  ShoppingCart,
} from '../components/MomentumIcons';
import { posCheckoutWithRedlock, getBatchScanHistory } from '../services/api';

export default function BatchesPage({
  batches = [],
  onSelectBatch,
  currentUser,
  handleCreateBatch,
  handleUpdateBatch,
  newBatchCategory,
  setNewBatchCategory,
  newBatchName,
  setNewBatchName,
  newBatchFarm,
  setNewBatchFarm,
  newBatchWeight,
  setNewBatchWeight,
  newBatchVehicle,
  setNewBatchVehicle,
  newBatchPolyFields,
  setNewBatchPolyFields,
  selectedBatch,
  qrQuantity,
  setQrQuantity,
  handleGenerateDualQr,
  generatedQrs,
  handleOtaSync,
  foodCategories = [],
  refreshCoreData,
}) {
  const CARD =
    'rounded-[28px] border border-orange-950/5 bg-white p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:border-orange-500/10 dark:bg-[#1C140F]';

  const [lanIp, setLanIp] = useState(() => {
    try {
      const saved = localStorage.getItem('smartchain_custom_host');
      if (saved) return saved;
    } catch (e) {}
    if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost') {
      return window.location.origin;
    }
    return 'http://172.17.74.89:5173';
  });
  const [activeQrModal, setActiveQrModal] = useState(null); // { code, title, status, isBatch }
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [scanLogs, setScanLogs] = useState([]);
  const [loadingScanLogs, setLoadingScanLogs] = useState(false);
  const [qrFilterTab, setQrFilterTab] = useState('unsold'); // 'unsold' | 'sold'

  // State phục vụ chỉnh sửa trực tiếp lô hàng đang chọn ở khung phía trên
  const [editCategory, setEditCategory] = useState('VEG_FRUIT');
  const [editName, setEditName] = useState('');
  const [editFarm, setEditFarm] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editPackageCount, setEditPackageCount] = useState('50');
  const [editWeightPerPackage, setEditWeightPerPackage] = useState('10');
  const [editPackageUnit, setEditPackageUnit] = useState('Thùng carton tiêu chuẩn');
  const [editVehicle, setEditVehicle] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const isProducer = currentUser?.role === 'PRODUCER';
  const isAdmin = currentUser?.role === 'ADMIN';

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [batchFilterStatus, setBatchFilterStatus] = useState('ALL');
  const [batchSearchTerm, setBatchSearchTerm] = useState('');

  // Tự động chọn lô đầu tiên nếu chưa chọn lô nào
  useEffect(() => {
    if (!selectedBatch && batches && batches.length > 0 && onSelectBatch) {
      onSelectBatch(batches[0]);
    }
  }, [batches, selectedBatch, onSelectBatch]);

  // Bộ lọc danh sách lô hàng hiển thị
  const displayBatches = useMemo(() => {
    if (!Array.isArray(batches)) return [];
    return batches.filter((b) => {
      const q = batchSearchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        (b.batch_code && b.batch_code.toLowerCase().includes(q)) ||
        (b.product_name && b.product_name.toLowerCase().includes(q)) ||
        (b.farm_name && b.farm_name.toLowerCase().includes(q));

      const st = String(b.status || '').toUpperCase();
      let matchStatus = true;
      if (batchFilterStatus === 'CREATED') matchStatus = st === 'CREATED' || st === 'ASSIGNED_PENDING';
      else if (batchFilterStatus === 'IN_TRANSIT') matchStatus = st === 'READY_FOR_PICKUP' || st === 'IN_TRANSIT';
      else if (batchFilterStatus === 'DELIVERED') matchStatus = st === 'DELIVERED' || st === 'QC_ACCEPTED';
      else if (batchFilterStatus === 'ON_SHELF') matchStatus = st === 'ON_SHELF';
      else if (batchFilterStatus === 'RECALLED') matchStatus = st.includes('RECALL');

      return matchSearch && matchStatus;
    });
  }, [batches, batchSearchTerm, batchFilterStatus]);

  // Đồng bộ dữ liệu lô đang chọn vào khung thông tin & chỉnh sửa phía trên
  useEffect(() => {
    if (!selectedBatch) {
      setEditCategory('VEG_FRUIT');
      setEditName('');
      setEditFarm('');
      setEditWeight('');
      setEditPackageCount('50');
      setEditWeightPerPackage('10');
      setEditPackageUnit('Thùng carton tiêu chuẩn');
      setEditVehicle('');
      return;
    }
    setEditCategory(selectedBatch.category || selectedBatch.category_code || 'VEG_FRUIT');
    setEditName(selectedBatch.product_name || selectedBatch.productName || '');
    setEditFarm(selectedBatch.farm_name || selectedBatch.farmName || '');
    const calcWeight = selectedBatch.total_weight_kg && Number(selectedBatch.total_weight_kg) > 0
      ? Number(selectedBatch.total_weight_kg)
      : selectedBatch.weight_kg && Number(selectedBatch.weight_kg) > 0
      ? Number(selectedBatch.weight_kg)
      : 500;
    setEditWeight(String(calcWeight));
    const pCount = selectedBatch.package_count || Math.round(calcWeight / 10);
    setEditPackageCount(String(pCount));
    setEditWeightPerPackage(String(selectedBatch.weight_per_package_kg || (pCount > 0 ? (calcWeight / pCount).toFixed(0) : 10)));
    setEditPackageUnit(selectedBatch.package_unit || 'Thùng carton tiêu chuẩn');

    const batchTransport = selectedBatch.transportJourney || selectedBatch.transport_journey || {};
    const plate =
      batchTransport.vehicle_plate ||
      selectedBatch.transport_vehicle_plate ||
      selectedBatch.vehicle_plate ||
      selectedBatch.vehiclePlate ||
      '';
    setEditVehicle(plate.toUpperCase().includes('CHƯA') ? '' : plate);
  }, [selectedBatch]);

  const onSaveSelectedBatch = async (e) => {
    e.preventDefault();
    if (!selectedBatch?.batch_code || !handleUpdateBatch) return;
    setSavingEdit(true);
    try {
      const wKg = Math.max(1, Number(editWeight) || (Number(editPackageCount) * Number(editWeightPerPackage)) || 500);
      await handleUpdateBatch(selectedBatch.batch_code, {
        category: editCategory,
        productName: editName,
        farmName: editFarm,
        weightKg: wKg,
        totalWeightKg: wKg,
        packageCount: Number(editPackageCount) || 50,
        weightPerPackageKg: Number(editWeightPerPackage) || 10,
        packageUnit: editPackageUnit.trim(),
        vehiclePlate: editVehicle.trim(),
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const selectedBatchPlate = selectedBatch
    ? selectedBatch.transportJourney?.vehicle_plate ||
      selectedBatch.transport_journey?.vehicle_plate ||
      selectedBatch.transport_vehicle_plate ||
      selectedBatch.vehicle_plate ||
      ''
    : '';

  // Danh sách ma trận tem con của lô hàng đang chọn
  const itemsList = useMemo(() => {
    if (!selectedBatch) return [];
    const fromBatch = selectedBatch.item_qr_serials || selectedBatch.itemQrSerials || [];
    const fromGen = generatedQrs?.items || [];
    const map = new Map();
    fromBatch.forEach((it) => map.set(it.serial_code || it.serialCode, it));
    fromGen.forEach((it) => map.set(it.serial_code || it.serialCode, it));
    return Array.from(map.values());
  }, [selectedBatch, generatedQrs]);

  // Phân loại danh sách tem: Đang lưu hành (Chưa bán) vs Đã thanh toán tại POS (Đã bán)
  const unsoldItems = useMemo(() => {
    return itemsList.filter((it) => {
      const s = String(it.status || '').toUpperCase();
      return !s.includes('SOLD') && !s.includes('VOID');
    });
  }, [itemsList]);

  const soldItems = useMemo(() => {
    return itemsList.filter((it) => {
      const s = String(it.status || '').toUpperCase();
      return s.includes('SOLD') || s.includes('VOID');
    });
  }, [itemsList]);

  const countSold = soldItems.length;
  const countActive = unsoldItems.length;

  // Tải nhật ký quét mã thời gian thực khi chọn lô hàng
  const fetchScanLogs = async (bCode) => {
    if (!bCode) {
      setScanLogs([]);
      return;
    }
    setLoadingScanLogs(true);
    try {
      const logs = await getBatchScanHistory(bCode);
      setScanLogs(Array.isArray(logs) ? logs : []);
    } catch (e) {
      console.warn('Scan history not available yet:', e.message);
    } finally {
      setLoadingScanLogs(false);
    }
  };

  useEffect(() => {
    if (selectedBatch?.batch_code) {
      fetchScanLogs(selectedBatch.batch_code);
    } else {
      setScanLogs([]);
    }
  }, [selectedBatch?.batch_code]);

  // Sinh đường link chuẩn để mã hóa vào mã QR cho điện thoại quét
  const buildQrUrl = (code) => {
    const raw = (lanIp || '').trim();
    if (raw.startsWith('http://') || raw.startsWith('https://')) {
      return `${raw.replace(/\/+$/, '')}/trace/${code}`;
    }
    // Nếu là tên miền public Internet không chứa port (ví dụ: mytrace.loca.lt, trace.coopmart.vn)
    if (raw && !/^\d+\.\d+\.\d+\.\d+$/.test(raw) && raw !== 'localhost' && !raw.includes(':')) {
      return `https://${raw}/trace/${code}`;
    }
    const host = raw || (typeof window !== 'undefined' && window.location.hostname) || '192.168.1.17';
    const port = (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) ? ':5173' : (window.location.port ? `:${window.location.port}` : '');
    return `http://${host}${port}/trace/${code}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-[#1A1A1A] dark:text-[#F5F5F5]">
            {isProducer ? 'Quản lý Lô Hàng Nông Trại & Tem QR Kép' : 'Quản lý Lô Hàng, Tem QR Kép & Cấu hình OTA'}
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            {isProducer
              ? `Cơ sở sản xuất: ${currentUser?.assignedEntity || currentUser?.fullName || 'Nông Trại Công Nghệ Cao LangBiang'} • Khai báo nguồn gốc, in tem QR và theo dõi hành trình giao nhận`
              : 'Khai báo nguồn gốc lô hàng, sinh tem QR kép và nạp cấu hình vi khí hậu OTA xuống xe tải lạnh'}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (isProducer && !newBatchFarm && currentUser?.assignedEntity) {
              setNewBatchFarm(currentUser.assignedEntity);
            }
            setShowCreateModal(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#F95716] text-white text-xs font-black shadow-md hover:brightness-105 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} />
          Khai Báo Lô Hàng Mới
        </button>
      </div>

      {/* KHUNG DANH SÁCH LÔ HÀNG CỦA NÔNG TRẠI / HỆ THỐNG */}
      <div className={`${CARD} space-y-4`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-orange-950/5 dark:border-orange-500/10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F95716]/10 text-[#F95716]">
              <Layers size={18} />
            </span>
            <div>
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                {isProducer ? 'Danh sách Lô hàng của Nông trại' : 'Danh mục Lô hàng Chuỗi cung ứng'}
              </h3>
              <p className="text-[11px] text-neutral-400">
                {isProducer ? 'Chọn một lô hàng để theo dõi tiến trình và quản lý ma trận mã QR' : 'Chọn lô hàng để xem thông tin chi tiết và điều phối vận chuyển'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={batchSearchTerm}
              onChange={(e) => setBatchSearchTerm(e.target.value)}
              placeholder="Tìm theo mã lô, tên sản phẩm..."
              className="rounded-full border border-orange-950/10 bg-orange-950/[0.02] dark:border-orange-500/10 dark:bg-white/[0.02] px-3.5 py-1.5 text-xs focus:outline-none focus:border-[#F95716]"
            />
          </div>
        </div>

        {/* Tab lọc trạng thái */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
          {[
            { id: 'ALL', label: `Tất cả (${batches.length})` },
            { id: 'CREATED', label: 'Chờ phân xe' },
            { id: 'IN_TRANSIT', label: 'Đang vận chuyển' },
            { id: 'DELIVERED', label: 'Đã đến kho / KCS' },
            { id: 'ON_SHELF', label: 'Đang bày bán' },
          ].map((tab) => (
            <button
              type="button"
              key={tab.id}
              onClick={() => setBatchFilterStatus(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                batchFilterStatus === tab.id
                  ? 'bg-[#F95716] text-white shadow-sm'
                  : 'bg-orange-950/[0.03] dark:bg-white/[0.03] text-neutral-500 hover:text-[#1A1A1A] dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Danh sách thẻ lô hàng */}
        {displayBatches.length === 0 ? (
          <div className="text-center py-8 text-neutral-400 text-xs">
            Không tìm thấy lô hàng nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {displayBatches.map((b) => {
              const isSelected = selectedBatch?.batch_code === b.batch_code;
              const status = String(b.status || 'CREATED').toUpperCase();
              let badgeColor = 'bg-neutral-500/10 text-neutral-600 dark:text-neutral-400';
              let statusText = 'Mới tạo';
              if (status === 'CREATED') { statusText = 'Mới khai báo'; badgeColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400'; }
              else if (status === 'ASSIGNED_PENDING') { statusText = 'Chờ tài xế nhận'; badgeColor = 'bg-amber-500/10 text-amber-600'; }
              else if (status === 'READY_FOR_PICKUP') { statusText = 'Chờ bốc hàng'; badgeColor = 'bg-amber-500/10 text-amber-600'; }
              else if (status === 'IN_TRANSIT') { statusText = 'Đang trên xe lạnh'; badgeColor = 'bg-purple-500/10 text-purple-600'; }
              else if (status === 'DELIVERED') { statusText = 'Đã cập bến kho'; badgeColor = 'bg-indigo-500/10 text-indigo-600'; }
              else if (status === 'QC_ACCEPTED') { statusText = 'KCS đã duyệt đạt'; badgeColor = 'bg-emerald-500/10 text-emerald-600'; }
              else if (status === 'QC_REJECTED') { statusText = 'KCS từ chối'; badgeColor = 'bg-red-500/10 text-red-600'; }
              else if (status === 'ON_SHELF') { statusText = 'Đang bày bán'; badgeColor = 'bg-emerald-600 text-white'; }
              else if (status.includes('RECALL')) { statusText = 'Thu hồi khẩn cấp'; badgeColor = 'bg-red-600 text-white'; }

              return (
                <div
                  key={b.batch_code}
                  onClick={() => onSelectBatch && onSelectBatch(b)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#F95716] bg-[#F95716]/[0.05] shadow-sm'
                      : 'border-orange-950/5 dark:border-orange-500/10 hover:border-[#F95716]/40 bg-orange-950/[0.01]'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-mono text-xs font-black text-[#F95716]">
                        {b.batch_code}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${badgeColor}`}>
                        {statusText}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5] line-clamp-1">
                      {b.product_name || b.productName || 'Sản phẩm chưa đặt tên'}
                    </div>
                    <div className="text-[11px] text-neutral-400 line-clamp-1">
                      {b.farm_name || b.farmName || 'Nông trại LangBiang'}
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-orange-950/5 dark:border-orange-500/10 flex items-center justify-between text-[11px] text-neutral-500">
                    <span>{b.package_count || 50} {b.package_unit || 'thùng'} &bull; {b.total_weight_kg || b.weight_kg || 500} kg</span>
                    {isSelected && <span className="font-bold text-[#F95716]">✓ Đang chọn</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PHẦN TRÊN: THÔNG TIN & CHỈNH SỬA LÔ HÀNG ĐANG CHỌN + QR KÉP & OTA */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Khung Thông tin & Chỉnh sửa lô hàng đang chọn */}
        <div className={`${CARD} xl:col-span-2 space-y-5`}>
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-orange-950/5 dark:border-orange-500/10">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#F95716]/10 text-[#F95716]">
                <Layers size={18} />
              </span>
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Thông tin lô hàng đang chọn
                </h3>
              </div>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                selectedBatch
                  ? 'bg-orange-500/10 text-[#F95716]'
                  : 'bg-neutral-100 dark:bg-white/5 text-neutral-400'
              }`}
            >
              {selectedBatch ? selectedBatch.batch_code : 'Chưa chọn lô hàng'}
            </span>
          </div>

          {!selectedBatch ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-white/[0.01] p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#F95716] flex items-center justify-center mx-auto mb-3">
                  <Box size={22} />
                </div>
                <div className="text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Chưa chọn lô hàng
                </div>
                <p className="text-xs text-neutral-400 mt-1 max-w-md mx-auto">
                  Vui lòng chọn một lô hàng tại <strong>Trang Tổng Quan</strong> để xem chi tiết hoặc chỉnh sửa thông tin sản phẩm, nông trại, khối lượng và biển số xe.
                </p>
              </div>

              {/* Các ô thông tin để trống hoàn toàn khi chưa chọn lô */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 opacity-60 pointer-events-none">
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                    Tên sản phẩm
                  </label>
                  <input
                    type="text"
                    readOnly
                    value=""
                    placeholder="Chưa chọn lô hàng"
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs dark:border-orange-500/10 dark:bg-white/[0.02]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                    Cơ sở sản xuất / Nông trại
                  </label>
                  <input
                    type="text"
                    readOnly
                    value=""
                    placeholder="Chưa chọn lô hàng"
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs dark:border-orange-500/10 dark:bg-white/[0.02]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                    Khối lượng lô (kg)
                  </label>
                  <input
                    type="text"
                    readOnly
                    value=""
                    placeholder="Chưa chọn lô hàng"
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs dark:border-orange-500/10 dark:bg-white/[0.02]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                    Biển số xe
                  </label>
                  <input
                    type="text"
                    readOnly
                    value=""
                    placeholder="Chưa chọn lô hàng"
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs dark:border-orange-500/10 dark:bg-white/[0.02]"
                  />
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={onSaveSelectedBatch} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-neutral-500 block mb-2">
                  NHÓM NGÀNH HÀNG THỰC PHẨM ĐANG CHỌN
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {foodCategories.map((cat) => (
                    <button
                      type="button"
                      key={cat.code}
                      onClick={() => setEditCategory(cat.code)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        editCategory === cat.code
                          ? 'border-[#F95716] bg-[#F95716]/[0.06] shadow-sm'
                          : 'border-orange-950/5 dark:border-orange-500/10 hover:bg-orange-950/[0.02]'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                        {cat.name}
                      </div>
                      <div className="text-[10.5px] font-mono text-[#F95716] mt-0.5">
                        {cat.temp}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                    Tên sản phẩm
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs font-semibold focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                    Cơ sở sản xuất / Nông trại
                  </label>
                  <input
                    type="text"
                    required
                    value={editFarm}
                    onChange={(e) => setEditFarm(e.target.value)}
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs font-semibold focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                    Số lượng thùng / kiện
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={editPackageCount}
                    onChange={(e) => {
                      const count = e.target.value;
                      setEditPackageCount(count);
                      if (count && editWeightPerPackage) {
                        setEditWeight(String(Number(count) * Number(editWeightPerPackage)));
                      }
                    }}
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs font-mono focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                    Khối lượng / thùng (kg)
                  </label>
                  <input
                    type="number"
                    min={0.1}
                    step="any"
                    value={editWeightPerPackage}
                    onChange={(e) => {
                      const wp = e.target.value;
                      setEditWeightPerPackage(wp);
                      if (wp && editPackageCount) {
                        setEditWeight(String(Number(editPackageCount) * Number(wp)));
                      }
                    }}
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs font-mono focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                    Tổng tải trọng xe (kg)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs font-mono font-bold text-[#F95716] focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                    Quy cách bao bì đóng gói
                  </label>
                  <input
                    type="text"
                    value={editPackageUnit}
                    onChange={(e) => setEditPackageUnit(e.target.value)}
                    placeholder="VD: Thùng carton 5 lớp..."
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                    Biển số xe
                  </label>
                  <input
                    type="text"
                    value={editVehicle}
                    onChange={(e) => setEditVehicle(e.target.value)}
                    placeholder="Để trống nếu chưa gán xe"
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs font-mono focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingEdit}
                className="w-full rounded-2xl bg-neutral-900 dark:bg-white dark:text-neutral-900 p-3.5 text-xs font-extrabold text-white shadow-md hover:opacity-95 transition-all cursor-pointer"
              >
                {savingEdit
                  ? 'Đang lưu cập nhật...'
                  : `LƯU CẬP NHẬT THÔNG TIN LÔ HÀNG (${selectedBatch.batch_code})`}
              </button>
            </form>
          )}
        </div>

        {/* Cột phải: Cấp phát ma trận tem QR kép & Đồng bộ cấu hình vi khí hậu OTA */}
        <div className="space-y-6">
          {/* Cấp phát ma trận tem QR kép */}
          <div className={`${CARD} space-y-4`}>
            <div className="flex items-center gap-2">
              <QrCode size={18} className="text-[#F95716]" />
              <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                Cấp phát ma trận tem QR kép
              </h3>
            </div>

            <p className="text-xs text-neutral-500">
              Lô đang chọn:{' '}
              <strong className="text-[#F95716] font-mono">
                {selectedBatch?.batch_code || 'Chưa chọn lô hàng'}
              </strong>
            </p>

            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={100}
                disabled={!selectedBatch}
                value={qrQuantity}
                onChange={(e) => setQrQuantity(e.target.value)}
                className="w-24 rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-2.5 text-xs font-mono text-center dark:border-orange-500/10 dark:bg-white/[0.02] disabled:opacity-50"
              />
              <button
                type="button"
                disabled={!selectedBatch}
                onClick={handleGenerateDualQr}
                className="flex-1 rounded-2xl bg-[#F95716] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:brightness-105 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                Sinh {qrQuantity} tem QR kép
              </button>
            </div>

            {selectedBatch && generatedQrs?.items && (
              <div className="max-h-56 overflow-y-auto space-y-2 pt-2 border-t border-orange-950/5 dark:border-orange-500/10">
                <div className="text-[11px] text-neutral-400 font-semibold flex justify-between items-center px-1">
                  <span>MÃ SERIAL TEM CON DÁN GÓI LẺ</span>
                  <span>HÀNH ĐỘNG</span>
                </div>
                {generatedQrs.items.map((qr, i) => {
                  const sCode = qr.serial_code || qr.serialCode;
                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-orange-950/[0.02] dark:bg-white/[0.02] text-[11px] font-mono border border-orange-950/5 dark:border-orange-500/5 hover:border-[#F95716]/30 transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#F95716]">{sCode}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                          {qr.status || 'ACTIVE'}
                        </span>
                      </div>
                      <Link
                        to={`/trace/${sCode}`}
                        target="_blank"
                        rel="noreferrer"
                        title="Mở Cổng tra cứu người tiêu dùng cho tem này"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/10 text-[#F95716] hover:bg-[#F95716] hover:text-white text-[10.5px] font-bold transition-all shadow-sm"
                      >
                        <span>Tra cứu</span>
                        <ExternalLink size={11} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Đồng bộ cấu hình vi khí hậu OTA (Chỉ Quản trị viên/Điều phối thấy, ẩn với Producer) */}
          {!isProducer && (
            <div className={`${CARD} space-y-4`}>
              <div className="flex items-center gap-2">
                <Cpu size={18} className="text-[#F95716]" />
                <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Đồng bộ cấu hình vi khí hậu OTA
                </h3>
              </div>

              <div className="text-xs text-neutral-500 flex items-center justify-between">
                <span>Phương tiện nhận cấu hình:</span>
                <strong className="font-mono text-[#F95716]">
                  {!selectedBatch
                    ? 'Chưa chọn lô hàng'
                    : selectedBatchPlate && !selectedBatchPlate.toUpperCase().includes('CHƯA')
                    ? selectedBatchPlate
                    : 'Chưa phân công xe'}
                </strong>
              </div>

              <button
                type="button"
                disabled={!selectedBatch}
                onClick={handleOtaSync}
                className="w-full rounded-2xl border border-[#F95716]/30 bg-[#F95716]/10 p-3 text-xs font-extrabold text-[#F95716] hover:bg-[#F95716] hover:text-white transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
              >
                {!selectedBatch
                  ? 'CHƯA CHỌN LÔ HÀNG ĐỂ ĐỒNG BỘ OTA'
                  : selectedBatchPlate && !selectedBatchPlate.toUpperCase().includes('CHƯA')
                  ? `ĐỒNG BỘ OTA XUỐNG ESP32 XE ${selectedBatchPlate}`
                  : `ĐỒNG BỘ OTA LÔ ${selectedBatch.batch_code} XUỐNG ESP32`}
              </button>
            </div>
          )}

          {/* Tiến độ vòng đời chuỗi cung ứng thực tế (Dành riêng cho Producer theo dõi tình trạng lô) */}
          {isProducer && selectedBatch && (
            <div className={`${CARD} space-y-4`}>
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-[#F95716]" />
                <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Tiến độ chuỗi cung ứng thực tế
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                  <span className="text-sm font-black">1.</span>
                  <div>
                    <div className="text-xs font-bold">Khai báo nguồn gốc & Genesis #0</div>
                    <div className="text-[10.5px] text-neutral-500 dark:text-neutral-400">Đã hoàn thành niêm phong điện tử</div>
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-2.5 rounded-xl border ${
                  ['IN_TRANSIT', 'DELIVERED', 'QC_ACCEPTED', 'ON_SHELF'].includes(selectedBatch?.status)
                    ? 'bg-purple-500/10 border-purple-500/20 text-purple-700 dark:text-purple-400'
                    : 'bg-neutral-100 dark:bg-white/5 border-transparent text-neutral-400'
                }`}>
                  <span className="text-sm font-black">2.</span>
                  <div>
                    <div className="text-xs font-bold">Vận chuyển xe tải lạnh IoT</div>
                    <div className="text-[10.5px]">
                      {['IN_TRANSIT', 'DELIVERED', 'QC_ACCEPTED', 'ON_SHELF'].includes(selectedBatch?.status)
                        ? `Xe ${selectedBatchPlate || '49C-567.89'} - Giám sát DHT22 liên tục`
                        : 'Chờ tài xế xe lạnh tiếp nhận xuất bến'}
                    </div>
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-2.5 rounded-xl border ${
                  ['QC_ACCEPTED', 'ON_SHELF'].includes(selectedBatch?.status)
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : selectedBatch?.status === 'QC_REJECTED'
                    ? 'bg-red-500/10 border-red-500/20 text-red-600'
                    : 'bg-neutral-100 dark:bg-white/5 border-transparent text-neutral-400'
                }`}>
                  <span className="text-sm font-black">3.</span>
                  <div>
                    <div className="text-xs font-bold">Kiểm định chất lượng KCS & TTI</div>
                    <div className="text-[10.5px]">
                      {selectedBatch?.status === 'QC_ACCEPTED'
                        ? 'Đã kiểm định TTI Arrhenius đạt chuẩn nhập kho'
                        : selectedBatch?.status === 'QC_REJECTED'
                        ? 'Không đạt chuẩn - Trả hàng về nông trại'
                        : 'Chờ xe cập bến cổng tiếp nhận kho'}
                    </div>
                  </div>
                </div>

                <div className={`flex items-start gap-3 p-2.5 rounded-xl border ${
                  selectedBatch?.status === 'ON_SHELF'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-neutral-100 dark:bg-white/5 border-transparent text-neutral-400'
                }`}>
                  <span className="text-sm font-black">4.</span>
                  <div>
                    <div className="text-xs font-bold">Bày bán trên quầy kệ siêu thị</div>
                    <div className="text-[10.5px]">
                      {selectedBatch?.status === 'ON_SHELF'
                        ? 'Đang mở bán công khai - Người tiêu dùng quét QR'
                        : 'Chờ xếp vào kệ mát FEFO'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {!selectedBatch ? (
        <div className={`${CARD} p-8 text-center space-y-3`}>
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-[#F95716] flex items-center justify-center mx-auto mb-2">
            <QrCode size={22} />
          </div>
          <h3 className="text-sm font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
            Quản Lý Ma Trận Mã QR & Lịch Sử Quét
          </h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto leading-relaxed">
            Vui lòng chọn một lô hàng tại <strong>Trang Tổng Quan</strong> để xem danh sách mã tem (chưa bán / đã bán) và theo dõi nhật ký thực tế mỗi khi có người tiêu dùng quét mã.
          </p>
        </div>
      ) : (
        <div className={`${CARD} space-y-6`}>
          {/* Header Bảng Quản Lý QR */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-orange-950/5 dark:border-orange-500/10">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Quản lý Ma Trận Tem QR Kép & Nhật Ký Quét
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-[#F95716]/10 text-[#F95716]">
                  {selectedBatch.batch_code}
                </span>
              </div>
              <p className="text-xs text-neutral-500 mt-1">
                Sản phẩm: <strong className="text-neutral-800 dark:text-neutral-200">{selectedBatch.product_name || selectedBatch.productName}</strong> &bull; Nông trại: {selectedBatch.farm_name || selectedBatch.farmName}
              </p>
            </div>

            {/* Nút Xem QR Lô Tổng (Master Batch QR) */}
            <button
              type="button"
              onClick={() =>
                setActiveQrModal({
                  code: selectedBatch.batch_code,
                  title: `Mã Lô Tổng: ${selectedBatch.batch_code}`,
                  status: selectedBatch.status || 'IN_CHAIN',
                  isBatch: true,
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-sm hover:opacity-95 transition-all cursor-pointer"
            >
              <QrCode size={15} className="text-[#F95716]" />
              <span>Xem mã QR Lô Tổng</span>
            </button>
          </div>

          {/* 4 Thẻ KPI Thống Kê Nhanh */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl border border-orange-950/5 dark:border-orange-500/10 bg-orange-950/[0.015] dark:bg-white/[0.015]">
              <span className="text-[11px] font-bold text-neutral-400 block uppercase tracking-wider">
                Tổng số tem đã cấp
              </span>
              <span className="text-xl font-mono font-black text-[#1A1A1A] dark:text-[#F5F5F5] mt-1 block">
                {itemsList.length} <span className="text-xs font-normal text-neutral-400">tem</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04]">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>Chưa bán (Active)</span>
              </span>
              <span className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                {countActive} <span className="text-xs font-normal opacity-70">tem</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-500/[0.04]">
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 block uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>
                <span>Đã bán (SEAL_VOID)</span>
              </span>
              <span className="text-xl font-mono font-black text-rose-600 dark:text-rose-400 mt-1 block">
                {countSold} <span className="text-xs font-normal opacity-70">tem</span>
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-orange-500/20 bg-orange-500/[0.04]">
              <span className="text-[11px] font-bold text-[#F95716] block uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F95716] inline-block"></span>
                <span>Lượt quét thực tế</span>
              </span>
              <span className="text-xl font-mono font-black text-[#F95716] mt-1 block">
                {scanLogs.length} <span className="text-xs font-normal opacity-70">lượt</span>
              </span>
            </div>
          </div>

          {/* Bố Cục 2 Cột: Bảng Danh Sách Tem Con (Trái) & Nhật Ký Quét Mã (Phải) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-1">
            {/* CỘT TRÁI (7 COLS): BẢNG QUẢN LÝ TỪNG TEM CON */}
            <div className="lg:col-span-7 space-y-3">
              {/* Thanh Chuyển Tab: Chưa Bán vs Đã Bán */}
              <div className="flex items-center justify-between pb-1 border-b border-orange-950/5 dark:border-orange-500/10">
                <div className="inline-flex p-1 rounded-2xl bg-orange-950/[0.04] dark:bg-white/[0.04] text-xs font-bold gap-1">
                  <button
                    type="button"
                    onClick={() => setQrFilterTab('unsold')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      qrFilterTab === 'unsold'
                        ? 'bg-white dark:bg-[#1C140F] text-[#F95716] shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    Mã chưa bán ({unsoldItems.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setQrFilterTab('sold')}
                    className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer ${
                      qrFilterTab === 'sold'
                        ? 'bg-white dark:bg-[#1C140F] text-rose-600 dark:text-rose-400 shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    Mã đã bán ({soldItems.length})
                  </button>
                </div>

                <span className="text-[11px] text-neutral-400">
                  {qrFilterTab === 'unsold' ? 'Đang lưu hành trên quầy kệ' : 'Đã thanh toán tại quầy POS'}
                </span>
              </div>

              {/* Nội dung danh sách tem theo tab đã chọn */}
              {qrFilterTab === 'unsold' ? (
                unsoldItems.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-xs text-neutral-400">
                    Hiện không có mã tem nào chưa bán. Hãy nhập số lượng và bấm <strong>"Sinh tem QR kép"</strong> ở cột phải bên trên để tạo thêm tem!
                  </div>
                ) : (
                  <div className="rounded-2xl border border-orange-950/5 dark:border-orange-500/10 overflow-hidden bg-white dark:bg-[#1C140F]">
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-orange-950/5 dark:divide-orange-500/5">
                      {unsoldItems.map((item, idx) => {
                        const sCode = item.serial_code || item.serialCode;
                        return (
                          <div
                            key={sCode || idx}
                            className="p-3 hover:bg-orange-950/[0.015] dark:hover:bg-white/[0.015] flex flex-wrap items-center justify-between gap-2.5 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-5 text-[10px] font-mono text-neutral-400">
                                #{idx + 1}
                              </span>
                              <div>
                                <div className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
                                  {sCode}
                                </div>
                                <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                                  <span>Quy cách: {item.weight_kg || item.weightKg || 0.5} kg</span>
                                  <span>&bull;</span>
                                  <span className="font-semibold text-neutral-600 dark:text-neutral-400">
                                    {Number(item.price || 45000).toLocaleString('vi-VN')} đ
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                Chưa bán
                              </span>

                              {/* Nút Xem QR */}
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveQrModal({
                                    code: sCode,
                                    title: `Mã Tem Đơn Vị: ${sCode}`,
                                    status: 'ACTIVE',
                                    isBatch: false,
                                  })
                                }
                                title="Hiển thị mã QR để quét bằng điện thoại"
                                className="px-3 py-1.5 rounded-xl border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] hover:bg-[#F95716] hover:text-white hover:border-[#F95716] text-neutral-700 dark:text-neutral-200 text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <QrCode size={13} />
                                <span>Xem mã QR</span>
                              </button>

                              {/* Nút Mở Web Tra Cứu */}
                              <Link
                                to={`/trace/${sCode}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Mở Cổng tra cứu trên tab mới của máy tính"
                                className="p-1.5 rounded-xl border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] hover:bg-[#F95716]/10 text-neutral-500 hover:text-[#F95716] transition-all"
                              >
                                <ExternalLink size={13} />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              ) : (
                soldItems.length === 0 ? (
                  <div className="p-8 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 text-center text-xs text-neutral-400">
                    Chưa có mã tem nào được thanh toán. Khi thu ngân quét thanh toán mã qua <strong>Quầy POS Siêu Thị</strong>, sản phẩm sẽ tự động chuyển sang danh mục này.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-orange-950/5 dark:border-orange-500/10 overflow-hidden bg-white dark:bg-[#1C140F]">
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-orange-950/5 dark:divide-orange-500/5">
                      {soldItems.map((item, idx) => {
                        const sCode = item.serial_code || item.serialCode;
                        return (
                          <div
                            key={sCode || idx}
                            className="p-3 hover:bg-orange-950/[0.015] dark:hover:bg-white/[0.015] flex flex-wrap items-center justify-between gap-2.5 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-5 text-[10px] font-mono text-neutral-400">
                                #{idx + 1}
                              </span>
                              <div>
                                <div className="font-mono text-xs font-bold text-neutral-500 line-through">
                                  {sCode}
                                </div>
                                <div className="text-[11px] text-neutral-400 flex items-center gap-2 mt-0.5">
                                  <span>Đã thanh toán POS</span>
                                  <span>&bull;</span>
                                  <span>Khay: {item.weight_kg || item.weightKg || 0.5} kg</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-full text-[10.5px] font-extrabold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                SEAL_VOID (Đã bán)
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  setActiveQrModal({
                                    code: sCode,
                                    title: `Mã Tem Đơn Vị (Đã Bán): ${sCode}`,
                                    status: 'SEAL_VOID',
                                    isBatch: false,
                                  })
                                }
                                title="Hiển thị mã QR để quét bằng điện thoại"
                                className="px-3 py-1.5 rounded-xl border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] hover:bg-rose-500 hover:text-white hover:border-rose-500 text-neutral-700 dark:text-neutral-200 text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <QrCode size={13} />
                                <span>Xem mã QR</span>
                              </button>

                              <Link
                                to={`/trace/${sCode}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Mở Cổng tra cứu trên tab mới của máy tính"
                                className="p-1.5 rounded-xl border border-orange-950/10 dark:border-orange-500/20 bg-white dark:bg-[#1C140F] hover:bg-rose-500/10 text-neutral-500 hover:text-rose-600 transition-all"
                              >
                                <ExternalLink size={13} />
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>

            {/* CỘT PHẢI (5 COLS): NHẬT KÝ QUÉT MÃ THỜI GIAN THỰC (SCAN AUDIT TRAIL) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-orange-950/5 dark:border-orange-500/10">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <Clock size={13} className="text-[#F95716]" />
                  <span>Nhật ký quét mã tra cứu</span>
                </h4>
                <button
                  type="button"
                  onClick={() => fetchScanLogs(selectedBatch.batch_code)}
                  className="text-xs font-bold text-[#F95716] hover:underline cursor-pointer"
                >
                  {loadingScanLogs ? 'Đang tải...' : 'Làm mới'}
                </button>
              </div>

              <div className="rounded-2xl border border-orange-950/5 dark:border-orange-500/10 bg-white dark:bg-[#1C140F] p-3 max-h-[380px] overflow-y-auto space-y-2">
                {scanLogs.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 text-[#F95716] flex items-center justify-center mx-auto">
                      <Clock size={18} />
                    </div>
                    <div className="text-xs font-bold text-neutral-600 dark:text-neutral-300">
                      Chưa có lượt quét nào
                    </div>
                    <p className="text-[11px] text-neutral-400 max-w-[220px] mx-auto leading-relaxed">
                      Nhật ký sẽ tự động ghi lại mỗi khi có khách hàng hoặc nhân viên quét mã QR của lô này.
                    </p>
                  </div>
                ) : (
                  scanLogs.map((log, lIdx) => {
                    const isWarn = Boolean(log.isWarning || String(log.statusAtScan).includes('VOID'));
                    const scanTime = log.timestamp
                      ? new Date(log.timestamp).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })
                      : 'Vừa xong';

                    return (
                      <div
                        key={lIdx}
                        className={`p-3 rounded-xl border text-xs transition-all ${
                          isWarn
                            ? 'border-rose-500/20 bg-rose-500/[0.03]'
                            : 'border-emerald-500/20 bg-emerald-500/[0.02]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            {log.scannedCode}
                          </span>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {scanTime}
                          </span>
                        </div>
                        <div className="text-xs text-neutral-600 dark:text-neutral-300 mt-1.5 flex items-center justify-between">
                          <span>{log.device || 'Trình duyệt điện thoại'}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-extrabold text-[10px] ${
                              isWarn
                                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            {isWarn ? 'CẢNH BÁO: ĐÃ BÁN' : 'HỢP LỆ'}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-neutral-400 font-mono mt-1 flex items-center justify-between">
                          <span>IP: {log.clientIp || '127.0.0.1'}</span>
                          <span>Lần {log.scanCount || lIdx + 1}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KHAI BÁO LÔ NÔNG SẢN MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white dark:bg-[#1C140F] border border-orange-950/10 dark:border-orange-500/20 p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-orange-950/5 dark:border-orange-500/10">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <Plus size={18} />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    Khai Báo Lô Nông Sản Mới & Đúc Khối Genesis #0
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Đăng ký lô hàng mới lên sổ cái Blockchain và niêm phong nguồn gốc điện tử
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-white/5 text-neutral-400 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                await handleCreateBatch(e);
                setShowCreateModal(false);
              }}
              className="space-y-4"
            >
              {/* Chọn nhóm ngành hàng */}
              <div>
                <label className="text-xs font-bold text-neutral-500 block mb-2">
                  CHỌN NHÓM NGÀNH HÀNG THỰC PHẨM
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {foodCategories.map((cat) => (
                    <button
                      type="button"
                      key={cat.code}
                      onClick={() => setNewBatchCategory(cat.code)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        newBatchCategory === cat.code
                          ? 'border-[#F95716] bg-[#F95716]/[0.08] shadow-sm'
                          : 'border-orange-950/5 dark:border-orange-500/10 hover:bg-orange-950/[0.02]'
                      }`}
                    >
                      <div className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">{cat.name}</div>
                      <div className="text-[10px] font-mono text-[#F95716]">{cat.temp}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Thông tin sản phẩm */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1">Tên sản phẩm *</label>
                  <input
                    type="text"
                    required
                    value={newBatchName}
                    onChange={(e) => setNewBatchName(e.target.value)}
                    placeholder="Ví dụ: Xà Lách Thủy Canh VietGAP"
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs dark:border-orange-500/10 dark:bg-white/[0.02] focus:outline-none focus:border-[#F95716]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1">Cơ sở sản xuất / Nông trại *</label>
                  <input
                    type="text"
                    required
                    value={newBatchFarm}
                    onChange={(e) => setNewBatchFarm(e.target.value)}
                    placeholder="Tên nông trại..."
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs dark:border-orange-500/10 dark:bg-white/[0.02] focus:outline-none focus:border-[#F95716]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1">Tổng khối lượng lô hàng (kg) *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newBatchWeight}
                    onChange={(e) => setNewBatchWeight(e.target.value)}
                    placeholder="VD: 500"
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs font-mono font-bold text-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02] focus:outline-none focus:border-[#F95716]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-neutral-500 block mb-1">Biển số xe điều phối (Tùy chọn)</label>
                  <input
                    type="text"
                    value={newBatchVehicle}
                    onChange={(e) => setNewBatchVehicle(e.target.value)}
                    placeholder="Để trống nếu chờ xe đến nhận"
                    className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs dark:border-orange-500/10 dark:bg-white/[0.02] focus:outline-none focus:border-[#F95716]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-orange-950/5 dark:border-orange-500/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-2xl border border-neutral-300 dark:border-neutral-700 text-xs font-bold text-neutral-500 hover:bg-neutral-100 dark:hover:bg-white/5 cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-2xl bg-[#F95716] text-white text-xs font-black shadow-md hover:brightness-105 cursor-pointer"
                >
                  Xác Nhận Khai Báo & Đúc Genesis #0
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className={`${CARD} space-y-5`}>
        <div className="flex items-center gap-2.5 pb-3 border-b border-orange-950/5 dark:border-orange-500/10">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Plus size={18} />
          </span>
          <div>
            <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
              Tạo lô hàng mới & Đúc khối khởi nguyên (Genesis Block #0)
            </h3>
            <p className="text-[11px] text-neutral-400">
              Nhập thông tin lô hàng mới hoàn toàn từ đầu để đăng ký lên sổ cái Blockchain
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateBatch} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-neutral-500 block mb-2">
              CHỌN NHÓM NGÀNH HÀNG THỰC PHẨM CHO LÔ MỚI
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {foodCategories.map((cat) => (
                <button
                  type="button"
                  key={cat.code}
                  onClick={() => setNewBatchCategory(cat.code)}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    newBatchCategory === cat.code
                      ? 'border-[#F95716] bg-[#F95716]/[0.06] shadow-sm'
                      : 'border-orange-950/5 dark:border-orange-500/10 hover:bg-orange-950/[0.02]'
                  }`}
                >
                  <div className="text-xs font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                    {cat.name}
                  </div>
                  <div className="text-[10.5px] font-mono text-[#F95716] mt-0.5">{cat.temp}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                Tên sản phẩm *
              </label>
              <input
                type="text"
                required
                value={newBatchName}
                onChange={(e) => setNewBatchName(e.target.value)}
                placeholder="Nhập tên sản phẩm mới..."
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                Cơ sở sản xuất / Nông trại *
              </label>
              <input
                type="text"
                required
                value={newBatchFarm}
                onChange={(e) => setNewBatchFarm(e.target.value)}
                placeholder="Nhập tên nông trại / nhà máy..."
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                Tổng tải trọng xe (kg) *
              </label>
              <input
                type="number"
                required
                min={1}
                value={newBatchWeight}
                onChange={(e) => setNewBatchWeight(e.target.value)}
                placeholder="Nhập tổng tải trọng (kg) (VD: 500)..."
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs font-mono font-bold text-[#F95716] focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-neutral-500 block mb-1.5">
                Biển số xe (Tùy chọn)
              </label>
              <input
                type="text"
                value={newBatchVehicle}
                onChange={(e) => setNewBatchVehicle(e.target.value)}
                placeholder="Để trống nếu phân công sau..."
                className="w-full rounded-2xl border border-orange-950/10 bg-orange-950/[0.02] p-3 text-xs font-mono focus:outline-none focus:border-[#F95716] dark:border-orange-500/10 dark:bg-white/[0.02]"
              />
            </div>
          </div>

          {/* Polymorphic Dynamic Attributes */}
          <div className="p-4 rounded-2xl bg-orange-500/[0.03] border border-[#F95716]/15 space-y-3">
            <div className="text-xs font-bold text-[#F95716]">
              Chỉ số kiểm nghiệm đặc thù ({newBatchCategory})
            </div>

            {newBatchCategory === 'VEG_FRUIT' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Độ ngọt BRIX (°Bx)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={newBatchPolyFields.brix}
                    onChange={(e) =>
                      setNewBatchPolyFields({ ...newBatchPolyFields, brix: e.target.value })
                    }
                    className="w-full rounded-xl border border-orange-950/10 bg-white p-2 text-xs font-mono dark:border-orange-500/10 dark:bg-[#1C140F]"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">
                    Dư lượng BVTV Neem (ppm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBatchPolyFields.neemPpm}
                    onChange={(e) =>
                      setNewBatchPolyFields({ ...newBatchPolyFields, neemPpm: e.target.value })
                    }
                    className="w-full rounded-xl border border-orange-950/10 bg-white p-2 text-xs font-mono dark:border-orange-500/10 dark:bg-[#1C140F]"
                  />
                </div>
              </div>
            )}

            {newBatchCategory === 'CHILLED_MEAT' && (
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">
                  Độ pH thân thịt (Chuẩn 5.5 - 6.2)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newBatchPolyFields.ph}
                  onChange={(e) =>
                    setNewBatchPolyFields({ ...newBatchPolyFields, ph: e.target.value })
                  }
                  className="w-full rounded-xl border border-orange-950/10 bg-white p-2 text-xs font-mono dark:border-orange-500/10 dark:bg-[#1C140F]"
                />
              </div>
            )}

            {newBatchCategory === 'FRESH_SEAFOOD' && (
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">
                  Hàm lượng Trimethylamine TMA (ppm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newBatchPolyFields.tmaPpm}
                  onChange={(e) =>
                    setNewBatchPolyFields({ ...newBatchPolyFields, tmaPpm: e.target.value })
                  }
                  className="w-full rounded-xl border border-orange-950/10 bg-white p-2 text-xs font-mono dark:border-orange-500/10 dark:bg-[#1C140F]"
                />
              </div>
            )}

            {newBatchCategory === 'DAIRY' && (
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">
                  Độ chua Acid Lactic (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newBatchPolyFields.lacticAcidPct}
                  onChange={(e) =>
                    setNewBatchPolyFields({
                      ...newBatchPolyFields,
                      lacticAcidPct: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-orange-950/10 bg-white p-2 text-xs font-mono dark:border-orange-500/10 dark:bg-[#1C140F]"
                />
              </div>
            )}

            {newBatchCategory === 'DEEP_FROZEN' && (
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">
                  Nhiệt độ tâm sản phẩm (°C)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newBatchPolyFields.coreTemp}
                  onChange={(e) =>
                    setNewBatchPolyFields({ ...newBatchPolyFields, coreTemp: e.target.value })
                  }
                  className="w-full rounded-xl border border-orange-950/10 bg-white p-2 text-xs font-mono dark:border-orange-500/10 dark:bg-[#1C140F]"
                />
              </div>
            )}

            {newBatchCategory === 'DELI_HOT' && (
              <div>
                <label className="text-[11px] text-neutral-400 block mb-1">
                  Nhiệt độ chế biến chín (°C)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={newBatchPolyFields.cookingTemp}
                  onChange={(e) =>
                    setNewBatchPolyFields({
                      ...newBatchPolyFields,
                      cookingTemp: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-orange-950/10 bg-white p-2 text-xs font-mono dark:border-orange-500/10 dark:bg-[#1C140F]"
                />
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-[#F95716] p-3.5 text-xs font-extrabold text-white shadow-[0_10px_24px_rgba(249,87,22,0.30)] hover:brightness-105 transition-all cursor-pointer"
          >
            KHỞI TẠO LÔ HÀNG MỚI & ĐÚC KHỐI GENESIS (#0)
          </button>
        </form>
      </div>

      {activeQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative w-full max-w-sm rounded-[28px] bg-white dark:bg-[#1C140F] border border-orange-950/10 dark:border-orange-500/20 p-6 shadow-2xl space-y-4">
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-orange-950/5 dark:border-orange-500/10">
              <div>
                <h3 className="text-sm font-extrabold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Mã QR Truy Xuất Nguồn Gốc
                </h3>
                <span className="text-[11px] text-neutral-400 font-mono">
                  {activeQrModal.code}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveQrModal(null);
                  setCopiedUrl(false);
                }}
                className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-white/10 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Trạng thái niêm phong */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-500">Trạng thái tem:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold ${
                  String(activeQrModal.status).includes('SOLD') || String(activeQrModal.status).includes('VOID')
                    ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                    : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                }`}
              >
                {String(activeQrModal.status).includes('SOLD') || String(activeQrModal.status).includes('VOID')
                  ? 'Đã thanh toán (SEAL_VOID)'
                  : 'Đang lưu hành (Chưa bán)'}
              </span>
            </div>

            {/* Khung Hiển Thị Mã QR Thật 100% Vẽ Bằng QRCodeSVG */}
            <div className="p-4 bg-white rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm flex flex-col items-center justify-center">
              <QRCodeSVG
                value={buildQrUrl(activeQrModal.code)}
                size={210}
                level="H"
                includeMargin={true}
              />
              <span className="mt-2 text-[10.5px] font-mono text-neutral-500 font-semibold break-all text-center">
                {activeQrModal.code}
              </span>
            </div>

            {/* Cấu hình IP / Domain máy chủ */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span>Địa chỉ IP LAN hoặc Tên miền Internet (Tunnel):</span>
              </div>
              <input
                type="text"
                value={lanIp}
                onChange={(e) => {
                  const val = e.target.value.trim();
                  setLanIp(val);
                  try { localStorage.setItem('smartchain_custom_host', val); } catch (err) {}
                }}
                placeholder="https://...trycloudflare.com hoặc 192.168.1.17"
                className="w-full rounded-xl border border-orange-950/10 dark:border-orange-500/20 bg-orange-950/[0.02] dark:bg-white/[0.02] px-3 py-1.5 font-mono text-xs font-bold text-[#F95716] focus:outline-none focus:border-[#F95716]"
              />
              <div className="text-[10.5px] text-neutral-400 leading-tight">
                Liên kết mã hóa: <span className="font-mono text-neutral-600 dark:text-neutral-300 break-all">{buildQrUrl(activeQrModal.code)}</span>
              </div>
            </div>

            {/* Nút Hành Động */}
            <div className="flex gap-2 pt-2 border-t border-orange-950/5 dark:border-orange-500/10">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(buildQrUrl(activeQrModal.code));
                  setCopiedUrl(true);
                  setTimeout(() => setCopiedUrl(false), 2500);
                }}
                className="flex-1 py-2 px-3 rounded-xl border border-orange-950/10 dark:border-orange-500/20 text-xs font-bold text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedUrl ? <CheckCircle size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copiedUrl ? 'Đã sao chép' : 'Sao chép liên kết'}</span>
              </button>

              <Link
                to={`/trace/${activeQrModal.code}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2 px-3 rounded-xl bg-[#F95716] text-white text-xs font-bold hover:brightness-105 transition-all flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Mở Cổng tra cứu</span>
                <ExternalLink size={13} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
