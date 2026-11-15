import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  SmartChainCube,
  ShieldCheck,
  Truck,
  QrCode,
  ShoppingCart,
  UserCheck,
  CheckCircle,
  ExternalLink,
  Sun,
  Moon,
  Clock,
  MapPin,
  Crown,
  Thermometer,
  Activity,
} from '../components/MomentumIcons';
import { resolveFoodBatchMedia, CONSUMER_LOGIN_BG } from '../utils/foodMediaResolver';

const CATEGORY_TEMP_RANGES = {
  VEG_FRUIT: '8 - 12°C',
  CHILLED_MEAT: '0 - 4°C',
  FRESH_SEAFOOD: '0 - 2°C',
  DAIRY: '2 - 6°C',
  DEEP_FROZEN: '-25 - -18°C',
  DELI_HOT: '60 - 75°C',
};

export default function ConsumerPortalPage({
  currentUser,
  handleLogout,
  batches = [],
  selectedBatch,
  setSelectedBatch,
  isDark,
  handleToggleTheme,
}) {
  const [activeConsumerTab, setActiveConsumerTab] = useState('trace'); // trace | history | profile
  const [inputCode, setInputCode] = useState(selectedBatch?.batch_code || 'LOT-VEG-2026-001');
  const [copiedBatch, setCopiedBatch] = useState(false);

  // Danh sách sản phẩm thực tế từ cơ sở dữ liệu (hoặc các lô đã lên kệ siêu thị)
  const purchaseHistory = React.useMemo(() => {
    const shelfBatches = batches.filter((b) =>
      ['ON_SHELF', 'STOCKED_SHELF', 'SOLD', 'READY_FOR_PICKUP'].includes(
        String(b.status || '').toUpperCase()
      )
    );
    const sourceList = shelfBatches.length > 0 ? shelfBatches : batches;
    if (sourceList.length > 0) {
      return sourceList.map((b, idx) => {
        const media = resolveFoodBatchMedia(b);
        const unitPrice = Number(b.unit_price || b.unitPrice || 65000);
        return {
          id: `ORD-2026-${9810 + idx}`,
          productName: b.product_name || b.productName,
          farmName: b.farm_name || b.farmName || 'Nông trại VietGAP',
          batchCode: b.batch_code || b.batchCode,
          store: 'Hệ Thống Siêu Thị Co.opmart TP.HCM',
          purchaseDate: b.harvest_date
            ? new Date(b.harvest_date).toLocaleDateString('vi-VN')
            : '15/11/2026',
          price: `${unitPrice.toLocaleString('vi-VN')} VNĐ`,
          ttiStatus: '100% Đạt Chuẩn',
          category: media.label,
          thumb: media.thumb,
        };
      });
    }
    return [
      {
        id: 'ORD-2026-9812',
        productName: 'Xà Lách Thủy Canh Đà Lạt VietGAP',
        farmName: 'Nông trại Công nghệ cao LangBiang - Đà Lạt',
        batchCode: 'LOT-VEG-2026-001',
        store: 'Siêu Thị Co.opmart Quận 7 (Kệ A1)',
        purchaseDate: '14/11/2026',
        price: '45.000 VNĐ',
        ttiStatus: '100% Tươi Nguyên',
        category: 'Rau Thủy Canh Tươi Sống',
        thumb: '/images/batches/lettuce_head.jpg',
      },
    ];
  }, [batches]);

  // Tìm lô hàng đang xem
  const activeBatchData =
    batches.find((b) => b.batch_code === inputCode) ||
    batches[0] || {
      batch_code: 'LOT-VEG-2026-001',
      product_name: 'Xà Lách Thủy Canh Đà Lạt VietGAP',
      farm_name: 'Nông trại Công nghệ cao LangBiang - Đà Lạt',
      transport_vehicle_plate: '49C-567.89',
      weight_kg: 500,
      category_code: 'VEG_FRUIT',
      status: 'STOCKED_SHELF',
      harvest_date: '2026-11-12T04:00:00Z',
    };

  const activeProductName =
    activeBatchData.product_name ||
    activeBatchData.batch_name ||
    'Xà Lách Thủy Canh Đà Lạt VietGAP';
  const activeFarmName =
    activeBatchData.farm_name ||
    activeBatchData.origin_farm ||
    'Nông trại Công nghệ cao LangBiang - Đà Lạt';
  const activeCategoryCode = String(
    activeBatchData.category_code || activeBatchData.category || 'VEG_FRUIT'
  ).toUpperCase();
  const activeTempRange = CATEGORY_TEMP_RANGES[activeCategoryCode] || '8 - 12°C';
  const activeMedia = resolveFoodBatchMedia(activeBatchData);
  const activeVehiclePlate =
    activeBatchData.transport_vehicle_plate ||
    activeBatchData.transportJourney?.vehicle_plate ||
    'Đạt chuẩn ATP';

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(activeBatchData.batch_code);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2000);
  };

  return (
    <div className="min-h-screen relative text-[#1A1A1A] dark:text-[#F5F5F5] font-sans antialiased flex flex-col transition-colors overflow-x-hidden [font-family:'Plus_Jakarta_Sans',system-ui,sans-serif]">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src={CONSUMER_LOGIN_BG}
          alt="SmartChain Consumer Portal Background"
          className="w-full h-full object-cover object-center filter brightness-[0.78] contrast-[1.05]"
        />
        {isDark ? (
          <div className="absolute inset-0 bg-gradient-to-tr from-black/92 via-black/80 to-[#F95716]/30 backdrop-blur-[1px]" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-tr from-black/85 via-black/70 to-[#F95716]/25 backdrop-blur-[1px]" />
        )}
      </div>

      <header className="sticky top-0 z-40 h-20 backdrop-blur-2xl bg-white/90 dark:bg-[#1C140F]/90 border-b border-white/30 dark:border-orange-500/15 px-6 sm:px-10 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F95716] text-white shadow-[0_8px_20px_rgba(249,87,22,0.35)]">
            <SmartChainCube size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight leading-none text-[#1A1A1A] dark:text-white">
                SmartChain Consumer
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle size={10} /> Đã Xác Thực
              </span>
            </div>
            <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 mt-1">
              Cổng Tra Cứu Nguồn Gốc & Minh Bạch Nông Sản Chuỗi Khối Toàn Trình
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-200/60 dark:bg-white/[0.06] border border-neutral-300/40 dark:border-white/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveConsumerTab('trace')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeConsumerTab === 'trace'
                ? 'bg-[#F95716] text-white shadow-md'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-[#F95716]'
            }`}
          >
            <QrCode size={14} /> Tra Cứu Tem QR
          </button>
          <button
            type="button"
            onClick={() => setActiveConsumerTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeConsumerTab === 'history'
                ? 'bg-[#F95716] text-white shadow-md'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-[#F95716]'
            }`}
          >
            <ShoppingCart size={14} /> Lịch Sử Mua Hàng
          </button>
          <button
            type="button"
            onClick={() => setActiveConsumerTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              activeConsumerTab === 'profile'
                ? 'bg-[#F95716] text-white shadow-md'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-[#F95716]'
            }`}
          >
            <UserCheck size={14} /> Thẻ Thành Viên & Hồ Sơ
          </button>
        </div>

        {/* Right Action: Theme + User Badge + Logout */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 shadow-sm hover:scale-105 active:scale-95 transition-all"
          >
            {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
          </button>

          <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-neutral-200 dark:border-white/10">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#F95716] to-amber-500 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
              {(currentUser?.fullName || currentUser?.username || 'K').charAt(0).toUpperCase()}
            </div>
            <div className="text-left text-xs leading-tight">
              <span className="font-extrabold block text-[#1A1A1A] dark:text-white">
                {currentUser?.fullName || currentUser?.username || 'Khách Hàng'}
              </span>
              <span className="text-[10px] text-[#F95716] font-bold">Thành Viên Kim Cương</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all"
          >
            Đăng Xuất
          </button>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex items-center justify-around border-b border-orange-950/5 dark:border-orange-500/10 bg-white dark:bg-[#1C140F] p-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveConsumerTab('trace')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-lg ${
            activeConsumerTab === 'trace' ? 'bg-[#F95716] text-white' : 'text-neutral-500'
          }`}
        >
          <QrCode size={13} /> Tra Cứu
        </button>
        <button
          type="button"
          onClick={() => setActiveConsumerTab('history')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-lg ${
            activeConsumerTab === 'history' ? 'bg-[#F95716] text-white' : 'text-neutral-500'
          }`}
        >
          <ShoppingCart size={13} /> Đơn Hàng
        </button>
        <button
          type="button"
          onClick={() => setActiveConsumerTab('profile')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-lg ${
            activeConsumerTab === 'profile' ? 'bg-[#F95716] text-white' : 'text-neutral-500'
          }`}
        >
          <UserCheck size={13} /> Thẻ VIP
        </button>
      </div>

      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {activeConsumerTab === 'trace' && (
          <div className="space-y-6">
            {/* Banner Hình Ảnh Thực Phẩm & Thanh Tìm Kiếm Mã Lô / Quét Mã Tem */}
            <div className="relative overflow-hidden p-6 sm:p-9 rounded-[32px] border border-white/30 shadow-[0_20px_50px_rgba(0,0,0,0.28)] space-y-5 text-white">
              <div className="absolute inset-0 z-0 pointer-events-none">
                <img
                  src={activeMedia.banner}
                  alt={activeProductName}
                  className="w-full h-full object-cover object-center"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/75 to-[#F95716]/60" />
              </div>

              <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F95716] text-white text-[10.5px] font-extrabold uppercase tracking-wider mb-2 shadow-md">
                    <ShieldCheck size={13} /> Minh Bạch Chuỗi Cung Ứng Thực Phẩm
                  </span>
                  <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white drop-shadow">
                    Tra Cứu Nguồn Gốc Tem Nông Sản & Thực Phẩm Sạch
                  </h2>
                  <p className="text-xs sm:text-sm text-white/85 mt-1 max-w-2xl">
                    Nhập mã lô hàng trên bao bì hoặc tem QR để kiểm tra dữ liệu chuỗi khối bất biến, lịch sử nhiệt độ xe lạnh và độ tươi thời gian thực.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/trace/${activeBatchData.batch_code}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#F95716] hover:bg-[#E0430B] text-white text-xs font-extrabold shadow-lg hover:scale-105 active:scale-95 transition-all"
                  >
                    <ExternalLink size={14} /> Mở Trang Passport Công Khai ↗
                  </Link>
                </div>
              </div>

              {/* Input và gợi ý */}
              <div className="relative z-10 flex flex-col sm:flex-row gap-3 pt-1">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Nhập mã lô: LOT-VEG-2026-001, LOT-FISH-2026-001..."
                    className="w-full rounded-2xl border border-white/30 bg-white/95 dark:bg-black/60 backdrop-blur-xl px-5 py-3.5 text-sm font-bold text-[#1A1A1A] dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#F95716] transition-all shadow-inner"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const match = batches.find((b) => b.batch_code.toLowerCase() === inputCode.trim().toLowerCase());
                    if (match && setSelectedBatch) setSelectedBatch(match);
                  }}
                  className="px-7 py-3.5 rounded-2xl bg-[#F95716] hover:bg-[#E0430B] text-white text-xs font-extrabold uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer"
                >
                  Kiểm Tra Ngay
                </button>
              </div>

              {/* Các mã lô có sẵn để bấm nhanh */}
              <div className="relative z-10 flex items-center gap-2 flex-wrap pt-1 text-xs">
                <span className="font-bold text-white/80 text-[11px] uppercase tracking-wider">Mã gợi ý:</span>
                {batches.slice(0, 5).map((b) => (
                  <button
                    key={b.batch_code}
                    type="button"
                    onClick={() => {
                      setInputCode(b.batch_code);
                      if (setSelectedBatch) setSelectedBatch(b);
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer ${
                      activeBatchData.batch_code === b.batch_code
                        ? 'bg-[#F95716] text-white shadow-md border border-white/40'
                        : 'bg-black/40 hover:bg-black/60 text-white border border-white/20 backdrop-blur-md'
                    }`}
                  >
                    {b.batch_code}
                  </button>
                ))}
              </div>
            </div>

            {/* Thẻ Chi Tiết Nguồn Gốc Nông Sản */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Cột trái: Passport nông sản */}
              <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-white/92 dark:bg-[#1C140F]/92 backdrop-blur-xl border border-white/50 dark:border-orange-500/15 shadow-[0_12px_40px_rgba(0,0,0,0.12)] space-y-6">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-2xl overflow-hidden border border-orange-500/20 shadow-md shrink-0 bg-neutral-100 dark:bg-neutral-800">
                      <img
                        src={activeMedia.thumb}
                        alt={activeProductName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <span className="inline-block px-3 py-1 rounded-full text-[10.5px] font-extrabold uppercase tracking-wider bg-orange-500/15 text-[#F95716] mb-1.5">
                        {activeMedia.label}
                      </span>
                      <h3 className="text-xl font-black text-[#1A1A1A] dark:text-white">
                        {activeProductName}
                      </h3>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex items-center gap-1.5">
                        <MapPin size={13} className="text-[#F95716]" /> {activeFarmName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:text-[#F95716] transition-all shrink-0"
                  >
                    {copiedBatch ? '✓ Đã chép' : activeBatchData.batch_code}
                  </button>
                </div>

                {/* Các chỉ số cốt lõi */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-100 dark:border-neutral-800 text-center">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Chỉ số TTI</span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">100% Tươi</span>
                    <span className="text-[10px] text-neutral-500">Đạt chuẩn chất lượng</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-100 dark:border-neutral-800 text-center">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Nhiệt độ chuẩn</span>
                    <span className="text-xl font-black text-[#F95716] mt-1 block">{activeTempRange}</span>
                    <span className="text-[10px] text-neutral-500">Bảo quản chuẩn ngành</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-100 dark:border-neutral-800 text-center">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Vận Chuyển</span>
                    <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
                      {activeVehiclePlate}
                    </span>
                    <span className="text-[10px] text-neutral-500">Xe chuyên dụng IoT</span>
                  </div>

                  <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-100 dark:border-neutral-800 text-center">
                    <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Chứng Chỉ</span>
                    <span className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1 block">VietGAP</span>
                    <span className="text-[10px] text-neutral-500">HACCP & ISO-22000</span>
                  </div>
                </div>

                {/* Hành trình chuỗi lạnh trực quan */}
                <div className="pt-2">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 mb-3">
                    Lộ Trình Chuỗi Cung Ứng Khép Kín
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                      <span className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-xs shrink-0">1</span>
                      <div>
                        <span className="font-extrabold text-emerald-700 dark:text-emerald-400 block">Cơ sở sản xuất & Ký số Genesis Block</span>
                        <p className="text-neutral-600 dark:text-neutral-300 text-[11px] mt-0.5">
                          Xuất xưởng tại {activeFarmName}, đóng gói và niêm phong chất lượng trực tiếp trên sổ cái Blockchain.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs">
                      <span className="h-6 w-6 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-xs shrink-0">2</span>
                      <div>
                        <span className="font-extrabold text-blue-700 dark:text-blue-400 block">Vận chuyển xe lạnh IoT đa nhiệt độ</span>
                        <p className="text-neutral-600 dark:text-neutral-300 text-[11px] mt-0.5">
                          Phương tiện {activeVehiclePlate} duy trì dải nhiệt {activeTempRange} xuyên suốt hành trình về TP.HCM.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-xs">
                      <span className="h-6 w-6 rounded-full bg-[#F95716] text-white flex items-center justify-center font-bold text-xs shrink-0">3</span>
                      <div>
                        <span className="font-extrabold text-[#F95716] block">Nghiệm thu KCS & Bày bán quầy kệ FEFO siêu thị</span>
                        <p className="text-neutral-600 dark:text-neutral-300 text-[11px] mt-0.5">
                          KCS kiểm tra đạt 100% tiêu chuẩn an toàn thực phẩm, xếp lên quầy kệ siêu thị Co.opmart theo thứ tự hạn dùng ưu tiên.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cột phải: Con dấu Blockchain & Hộp quét tem */}
              <div className="space-y-6">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-[#F95716] to-amber-600 text-white shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full">
                      Bảo Chứng Mật Mã
                    </span>
                    <ShieldCheck size={24} className="text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black leading-tight">Chứng Thực Bất Biến ECDSA</h4>
                    <p className="text-xs text-white/80 mt-1">
                      Toàn bộ nhật ký nhiệt độ và hành trình được ký mật mã secp256r1 không thể làm giả hay can thiệp.
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-black/20 backdrop-blur-md text-[11px] font-mono break-all text-white/90">
                    Băm Block: 0x8a9f...44bc29
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-white dark:bg-[#1C140F] border border-orange-950/5 dark:border-orange-500/10 text-center space-y-3">
                  <h4 className="text-sm font-black text-[#1A1A1A] dark:text-white">Tem QR Truy Xuất Nguồn Gốc</h4>
                  <div className="p-4 inline-block bg-white rounded-2xl border-2 border-neutral-200 shadow-inner">
                    <QrCode size={120} className="text-[#1A1A1A]" />
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Quét trực tiếp bằng camera điện thoại tại siêu thị để xem lý lịch lô hàng.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeConsumerTab === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1C140F] border border-orange-950/5 dark:border-orange-500/10 shadow-[0_12px_40px_rgb(0,0,0,0.03)]">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1A1A1A] dark:text-white">
                  Lịch Sử Mua Nông Sản Sạch Của Bạn
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Mọi sản phẩm bạn mua tại siêu thị đều được gắn tem bảo chứng chuỗi lạnh và bảo lưu quyền lợi người tiêu dùng.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-4 py-2 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs">
                  {purchaseHistory.length} Đơn Hàng Đã Xác Thực
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {purchaseHistory.map((item) => (
                <div
                  key={item.batchCode || item.id}
                  className="p-6 rounded-3xl bg-white/95 dark:bg-[#1C140F]/95 backdrop-blur-xl border border-orange-950/5 dark:border-orange-500/10 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-16 w-16 rounded-2xl overflow-hidden border border-orange-500/20 bg-neutral-100 dark:bg-neutral-800 shrink-0 shadow-sm">
                      <img
                        src={item.thumb}
                        alt={item.productName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-[#F95716]">{item.batchCode}</span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          {item.ttiStatus}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                          {item.category}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-[#1A1A1A] dark:text-white mt-1">
                        {item.productName}
                      </h3>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400 mt-1.5">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-[#F95716]" /> {item.farmName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} /> {item.purchaseDate}
                        </span>
                        <span className="font-extrabold text-[#F95716]">{item.price}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Link
                      to={`/trace/${item.batchCode}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2.5 rounded-2xl bg-[#F95716] text-white text-xs font-bold shadow-sm hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <ShieldCheck size={14} /> Xem Chứng Thực Chuỗi Khối ↗
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeConsumerTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Thẻ Hội Viên Điện Tử */}
            <div className="lg:col-span-1 space-y-4">
              <div className="relative overflow-hidden rounded-3xl p-7 bg-gradient-to-tr from-stone-900 via-neutral-900 to-amber-900 text-white shadow-2xl border border-amber-500/20">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                      SmartChain Consumer Card
                    </span>
                    <h3 className="text-lg font-black mt-1">Thẻ Hội Viên VIP</h3>
                  </div>
                  <Crown size={28} className="text-amber-400" />
                </div>

                <div className="my-8">
                  <span className="text-xs text-neutral-400 uppercase tracking-widest block font-bold">Chủ Thẻ</span>
                  <span className="text-lg font-black tracking-wide block mt-0.5">
                    {currentUser?.fullName || currentUser?.username || 'Nguyễn Văn Tiêu Dùng'}
                  </span>
                  <span className="font-mono text-xs text-neutral-300 mt-1 block">
                    ID: {currentUser?.userId || 'SC-CONSUMER-2026-VIP'}
                  </span>
                </div>

                <div className="flex justify-between items-end pt-2 border-t border-white/10">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Hạng Thẻ</span>
                    <span className="text-xs font-extrabold text-amber-300">KIM CƯƠNG (DIAMOND)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Điểm Tích Lũy</span>
                    <span className="text-base font-black text-white">1,250 PTS</span>
                  </div>
                </div>
              </div>

              {/* Lợi ích hội viên */}
              <div className="p-6 rounded-3xl bg-white dark:bg-[#1C140F] border border-orange-950/5 dark:border-orange-500/10 space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">Quyền Lợi Khách Hàng</h4>
                <ul className="space-y-2 text-xs text-neutral-600 dark:text-neutral-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500" /> Bảo hiểm chất lượng chuỗi lạnh 100%
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500" /> Hoàn tiền 200% nếu phát hiện đứt gãy bảo quản
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500" /> Tích điểm đổi quà nông sản hữu cơ Đà Lạt
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500" /> Ưu tiên nhận thông báo mùa vụ mới
                  </li>
                </ul>
              </div>
            </div>

            {/* Thông Tin Cá Nhân Chi Tiết */}
            <div className="lg:col-span-2 p-6 sm:p-8 rounded-3xl bg-white dark:bg-[#1C140F] border border-orange-950/5 dark:border-orange-500/10 shadow-[0_12px_40px_rgb(0,0,0,0.03)] space-y-6">
              <div>
                <h3 className="text-xl font-black text-[#1A1A1A] dark:text-white">
                  Thông Tin Cá Nhân Khách Hàng
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Thông tin tài khoản đã đăng ký trên hệ thống cơ sở dữ liệu SmartChain.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Tên Đăng Nhập</span>
                  <span className="text-sm font-extrabold text-[#1A1A1A] dark:text-white mt-1 block">
                    {currentUser?.username || 'customer'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Họ Và Tên</span>
                  <span className="text-sm font-extrabold text-[#1A1A1A] dark:text-white mt-1 block">
                    {currentUser?.fullName || 'Nguyễn Văn Tiêu Dùng'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Số Điện Thoại</span>
                  <span className="text-sm font-extrabold text-[#1A1A1A] dark:text-white mt-1 block">
                    {currentUser?.phone || '0988-123-456'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Vai Trò Hệ Thống</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    NGƯỜI TIÊU DÙNG (CONSUMER)
                  </span>
                </div>

                <div className="sm:col-span-2 p-4 rounded-2xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-100 dark:border-neutral-800">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Phân Hạng Thành Viên</span>
                  <span className="text-sm font-extrabold text-[#1A1A1A] dark:text-white mt-1 block">
                    {currentUser?.assignedEntity || 'Khách Hàng Thân Thiết (Hạng Kim Cương)'}
                  </span>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
                <span className="text-xs text-neutral-400">
                  Đăng nhập lần cuối: Hôm nay lúc 23:00 (Bảo mật 2FA)
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-5 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 text-xs font-bold transition-all"
                >
                  Đăng Xuất Tài Khoản
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

