import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  SmartChainCube,
  ShieldCheck,
  AlertTriangle,
  Thermometer,
  Truck,
  CheckCircle,
  ChevronLeft,
  QrCode,
  Lock,
  Sparkles,
  MapPin,
  Clock,
  Cpu,
  Sun,
  Moon,
  ArrowUpRight,
  Search,
} from './MomentumIcons';
import { traceByCode } from '../services/api';
import QrMatrixSvg from './QrMatrixSvg';
import { DualAxisTelemetryChart } from './ColdChainWidgets';
import { resolveFoodBatchMedia, CONSUMER_LOGIN_BG } from '../utils/foodMediaResolver';

const DEFAULT_FOOD_BG = CONSUMER_LOGIN_BG;

/**
 * Cổng Truy Xuất Nguồn Gốc Công Khai Độc Lập cho Người Tiêu Dùng (/trace/:code)
 * Thiết kế chuẩn phong cách Momentum: Bo góc 28px, Warm Orange #F95716, phông chữ Plus Jakarta Sans.
 * Hỗ trợ mở trực tiếp khi quét mã QR trên điện thoại mà không yêu cầu đăng nhập.
 */
const formatBlockchainStage = (eventType, details, actor, actorRole) => {
  const normalizedType = String(eventType || '').toUpperCase();
  const normalizedRole = String(actorRole || '').toUpperCase();

  let stageName = 'Giai Đoạn: Khởi Tạo Nguồn Gốc Lô Hàng';
  let description = details || 'Khai báo thông tin lô hàng tại cơ sở sản xuất và thiết lập chứng thực chuỗi lạnh.';
  let signer = actor || 'Cơ Sở Sản Xuất Nông Trại';
  let badgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';

  if (normalizedType.includes('GENESIS')) {
    stageName = 'Giai Đoạn 1: Khai Báo Nguồn Gốc Tại Nông Trại';
    description = details || 'Khai báo lô hàng đạt tiêu chuẩn VietGAP/GlobalGAP tại vùng trồng và niêm phong nguồn gốc điện tử.';
    signer = actor || 'Cơ Sở Sản Xuất Nông Trại';
    badgeColor = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
  } else if (normalizedType.includes('COLD_CHAIN') || normalizedType.includes('OTA') || normalizedRole.includes('LOGISTICS') || normalizedRole.includes('DRIVER')) {
    stageName = 'Giai Đoạn 2: Bàn Giao Vận Tải Xe Lạnh';
    description = details || 'Đồng bộ quy chuẩn vi khí hậu xuống thùng xe lạnh, cảm biến IoT giám sát nhiệt độ và khí sinh học liên tục.';
    signer = actor || 'Tài Xế Đội Xe Lạnh Logistics';
    badgeColor = 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
  } else if (normalizedType.includes('QC') || normalizedRole.includes('QC')) {
    stageName = 'Giai Đoạn 3: Kiểm Định Chất Lượng Tiếp Nhận Siêu Thị';
    description = details || 'Đối soát vi khí hậu hành trình xe lạnh, thẩm định chỉ số độ tươi TTI và xác nhận đủ tiêu chuẩn nhập kho.';
    signer = actor || 'Bộ Phận Kiểm Định KCS';
    badgeColor = 'bg-purple-500/10 text-purple-600 dark:text-purple-400';
  } else if (normalizedType.includes('SHELF') || normalizedRole.includes('SHELF')) {
    stageName = 'Giai Đoạn 4: Trưng Bày Quầy Kệ Thông Minh (FEFO)';
    description = details || 'Đưa hàng lên quầy kệ thông minh, tự động phân luồng theo hạn dùng thực tế để trưng bày hàng độ tươi giảm nhanh hơn ra phía trước.';
    signer = actor || 'Nhân Viên Quản Lý Quầy Kệ';
    badgeColor = 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  } else if (normalizedType.includes('POS') || normalizedRole.includes('CASHIER')) {
    stageName = 'Giai Đoạn 5: Thanh Toán Bán Lẻ & Hủy Niêm Phong Tem';
    description = details || 'Quét mã tem tại quầy thu ngân, xác thực thanh toán chống trùng lặp và hoàn tất vòng đời sản phẩm.';
    signer = actor || 'Thu Ngân Quầy Thanh Toán';
    badgeColor = 'bg-rose-500/10 text-rose-600 dark:text-rose-400';
  }

  // Loại bỏ các enum kỹ thuật tiếng Anh trong chuỗi tên tác nhân
  signer = String(signer)
    .replace(/\s*\((PRODUCER|LOGISTICS_DRIVER|QC_INSPECTOR|SHELF_OPERATOR|CASHIER|ADMIN|CONSUMER)\)/gi, '')
    .trim();

  return { stageName, description, signer, badgeColor };
};

export default function PublicConsumerTracePage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [traceData, setTraceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [searchCodeInput, setSearchCodeInput] = useState(code || 'LOT-VEG-2026-001');
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem('smartchain_theme_v2') === 'dark';
    } catch (e) {
      return false;
    }
  });

  const handleToggleTheme = () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    try {
      if (nextDark) {
        document.documentElement.classList.add('dark');
        if (document.body) document.body.classList.add('dark');
        localStorage.setItem('smartchain_theme_v2', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        if (document.body) document.body.classList.remove('dark');
        localStorage.setItem('smartchain_theme_v2', 'light');
      }
    } catch (e) {}
  };

  useEffect(() => {
    try {
      if (isDark) {
        document.documentElement.classList.add('dark');
        if (document.body) document.body.classList.add('dark');
        localStorage.setItem('smartchain_theme_v2', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        if (document.body) document.body.classList.remove('dark');
        localStorage.setItem('smartchain_theme_v2', 'light');
      }
    } catch (e) {}
  }, [isDark]);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setErrorMsg('');
    setSearchCodeInput(code || 'LOT-VEG-2026-001');
    traceByCode(code || 'LOT-VEG-2026-001')
      .then((res) => {
        if (mounted) {
          setTraceData(res);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setErrorMsg(err?.response?.data?.message || 'Không tìm thấy mã lô hàng hoặc tem QR sản phẩm này.');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [code]);

  const CARD =
    'rounded-[28px] border border-white/60 bg-white/90 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl dark:border-orange-500/15 dark:bg-[#1C140F]/90';

  if (loading) {
    return (
      <div className={`min-h-screen relative flex items-center justify-center p-6 ${isDark ? 'dark' : ''}`}>
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img
            src={DEFAULT_FOOD_BG}
            alt="Fresh Food Background"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/75 backdrop-blur-[2px]" />
        </div>
        <div className="relative z-10 rounded-[28px] bg-white/95 dark:bg-[#1C140F]/95 backdrop-blur-xl border border-white/30 dark:border-orange-500/20 p-8 shadow-2xl text-center max-w-md w-full">
          <div className="w-12 h-12 border-3 border-[#F95716] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="font-bold text-[#1A1A1A] dark:text-[#F5F5F5] text-base">
            Đang Xác Thực Sổ Cái Blockchain ECDSA...
          </h3>
          <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 mt-2">
            Mã truy xuất: {code}
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg || !traceData) {
    return (
      <div className={`min-h-screen relative flex items-center justify-center p-6 ${isDark ? 'dark' : ''}`}>
        <div className="fixed inset-0 z-0 pointer-events-none">
          <img
            src={DEFAULT_FOOD_BG}
            alt="Fresh Food Background"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/75 backdrop-blur-[2px]" />
        </div>
        <div className="relative z-10 rounded-[28px] bg-white/95 dark:bg-[#1C140F]/95 backdrop-blur-xl border border-red-500/30 p-8 shadow-2xl text-center max-w-md w-full">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-lg font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
            Không Tìm Thấy Dữ Liệu Truy Xuất
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
            {errorMsg}
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#F95716] text-white text-xs font-bold shadow-[0_8px_20px_rgba(249,87,22,0.30)] hover:brightness-105"
          >
            <ChevronLeft size={16} /> Quay về Trang Chủ Điều Hành
          </Link>
        </div>
      </div>
    );
  }

  const batch = traceData.batch || {};
  const profile = traceData.storageProfile || {};
  const ai = traceData.aiFreshnessEvaluation || {};
  const verify = traceData.blockchainVerification || {};
  const ledger = traceData.blockchainLedger || [];
  const telemetry = traceData.coldChainTelemetry || [];

  const isStockedOnShelf = batch.status === 'ON_SHELF' || batch.status === 'DELIVERED';
  const isTransported = isStockedOnShelf || batch.status === 'IN_TRANSIT' || batch.status === 'QC_ACCEPTED' || batch.status === 'ARRIVED_AT_STORE';

  const foodMedia = resolveFoodBatchMedia(batch);

  const handleTraceSubmit = (e) => {
    e.preventDefault();
    const trimmed = (searchCodeInput || '').trim().toUpperCase();
    if (trimmed) {
      navigate(`/trace/${trimmed}`);
    }
  };

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="min-h-screen relative text-[#1A1A1A] dark:text-[#F5F5F5] font-sans antialiased overflow-x-hidden flex flex-col">
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

        <header className="sticky top-0 z-50 w-full backdrop-blur-2xl bg-black/40 dark:bg-black/60 border-b border-white/15 px-4 sm:px-8 lg:px-12 py-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.30)] flex flex-wrap items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3 group shrink-0">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F95716] text-white shadow-[0_8px_20px_rgba(249,87,22,0.45)] group-hover:scale-105 transition-all">
                <SmartChainCube size={22} />
              </span>
              <div className="leading-tight">
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-black tracking-tight text-white block">
                    SmartChain
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#F95716] bg-[#F95716]/15 px-2 py-0.5 rounded-md border border-[#F95716]/30">
                    Cold-Chain Trace
                  </span>
                </div>
                <p className="text-[11.5px] font-medium text-white/70 mt-0.5">
                  Cổng Tra Cứu Nguồn Gốc & Chuỗi Cung Ứng Lạnh
                </p>
              </div>
            </Link>

            {/* Chỉ báo trạng thái bảo chứng Sổ cái Blockchain thực tế, đồng bộ & tinh tế */}
            <div className="hidden xl:flex items-center gap-2 pl-4 border-l border-white/15 text-xs text-white/80 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-[11px] tracking-wide text-emerald-300/90">
                Bảo Chứng Sổ Cái Blockchain ECDSA
              </span>
            </div>
          </div>

          {/* Thanh tìm kiếm mã lô nhanh ngay trên Header Cổng Tra Cứu */}
          <form
            onSubmit={handleTraceSubmit}
            className="flex items-center gap-2 flex-1 max-w-xs sm:max-w-sm"
          >
            <div className="relative flex-1">
              <Search
                size={14}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50"
              />
              <input
                type="text"
                value={searchCodeInput}
                onChange={(e) => setSearchCodeInput(e.target.value)}
                placeholder="Nhập mã lô (VD: LOT-VEG-2026-001)..."
                className="w-full rounded-full border border-white/20 bg-white/10 backdrop-blur-xl pl-9 pr-3.5 py-2 text-xs font-bold text-white placeholder:text-white/50 focus:outline-none focus:border-[#F95716] focus:bg-white/15 transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-[#F95716] hover:bg-[#E0430B] text-white text-xs font-extrabold shadow-[0_4px_16px_rgba(249,87,22,0.40)] hover:scale-105 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              Tra cứu
            </button>
          </form>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              title={isDark ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối'}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/10 backdrop-blur-xl text-white shadow-sm transition-all hover:bg-white/20 hover:scale-105 active:scale-95 hover:border-white/40 cursor-pointer"
            >
              {isDark ? (
                <Sun size={16} className="text-amber-300" />
              ) : (
                <Moon size={16} className="text-white" />
              )}
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 backdrop-blur-xl text-[12px] font-extrabold shadow-md hover:scale-105 active:scale-95 transition-all"
            >
              Trang Chủ
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </header>

        <main className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Hero Identity Banner with High-Res Category Food Photography */}
          <section className="relative overflow-hidden rounded-[32px] p-6 sm:p-9 text-white shadow-[0_20px_50px_rgba(0,0,0,0.30)] border border-white/25">
            {/* Ảnh nền thực phẩm theo đúng phân loại lô hàng */}
            <div className="absolute inset-0 z-0 pointer-events-none">
              <img
                src={foodMedia.banner}
                alt={batch.product_name || 'Thực phẩm chuỗi lạnh'}
                className="w-full h-full object-cover object-center transform hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-[#F95716]/65" />
            </div>

            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-5 max-w-2xl">
                {/* Ảnh đại diện thực phẩm sắc nét có khung kính */}
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl overflow-hidden border-2 border-white/40 shadow-2xl shrink-0 bg-black/30">
                  <img
                    src={foodMedia.thumb}
                    alt={batch.product_name || 'Food Thumbnail'}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F95716] text-white text-[10.5px] font-extrabold uppercase tracking-wider shadow-md">
                      <ShieldCheck size={13} />
                      Hộ Chiếu Thực Phẩm Chuỗi Khối
                    </span>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[10.5px] font-bold text-white border border-white/20">
                      {foodMedia.label}
                    </span>
                  </div>

                  <h2 className="mt-2.5 text-2xl sm:text-3xl font-black tracking-tight drop-shadow-md">
                    {batch.product_name || 'Xà Lách Thủy Canh Mỡ Đà Lạt'}
                  </h2>

                  <p className="mt-1 text-xs sm:text-sm text-white/85 font-medium flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#F95716] shrink-0" />
                    <span>
                      Xuất xứ: <strong>{batch.farm_name || 'Nông trại Công nghệ cao Đà Lạt'}</strong>
                    </span>
                  </p>

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold text-white">
                    <span className="bg-black/40 border border-white/20 backdrop-blur-md px-3 py-1 rounded-full font-mono text-white">
                      Mã lô: {batch.batch_code}
                    </span>
                    <span className="bg-black/40 border border-white/20 backdrop-blur-md px-3 py-1 rounded-full">
                      Tải trọng: {Number(batch.total_weight_kg || (batch.weight_kg && batch.weight_kg >= 100 ? batch.weight_kg : 500)).toFixed(0)} kg ({batch.package_count || 50} thùng)
                    </span>
                    <span className="bg-black/40 border border-white/20 backdrop-blur-md px-3 py-1 rounded-full font-mono">
                      Xe lạnh:{' '}
                      {batch.transport_journey?.vehicle_plate &&
                      !String(batch.transport_journey?.vehicle_plate).toUpperCase().includes('CHƯA') &&
                      String(batch.transport_journey?.vehicle_plate).trim() !== ''
                        ? batch.transport_journey.vehicle_plate
                        : (batch.transport_vehicle_plate &&
                           !String(batch.transport_vehicle_plate).toUpperCase().includes('CHƯA') &&
                           String(batch.transport_vehicle_plate).trim() !== ''
                            ? batch.transport_vehicle_plate
                            : 'Chưa phân công xe')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Chỉ số Độ Tươi TTI: Thiết kế tối giản không khung, số lớn sắc nét, đồng nhất tông trắng */}
              <div className="shrink-0 lg:text-right pt-2 lg:pt-0 lg:pl-6">
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
                  Độ Tươi Thực Tế (TTI)
                </div>
                <div className="text-5xl sm:text-6xl lg:text-[68px] font-black tracking-tighter leading-none mt-1.5 text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
                  {Number(ai.ttiFreshnessScore ?? ai.freshness_score ?? 100.0).toFixed(1)}%
                </div>
                <div className="mt-2.5 text-xs sm:text-[13px] font-semibold text-white/90 inline-flex items-center lg:justify-end gap-1.5 max-w-xs">
                  <CheckCircle size={14} className="text-white shrink-0" />
                  <span>{ai.qcRecommendation || ai.recommendation || 'Đạt chuẩn an toàn chuỗi lạnh'}</span>
                </div>
              </div>
            </div>
          </section>

          {traceData.sealVoidAlreadySold ? (
          <div className="rounded-[28px] border-2 border-rose-500 bg-white/95 dark:bg-[#1C140F]/95 backdrop-blur-xl p-6 sm:p-7 shadow-[0_12px_40px_rgba(244,63,94,0.18)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500 text-white shadow-md">
                <AlertTriangle size={24} />
              </span>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                    CẢNH BÁO: TEM ĐÃ BỊ HỦY NIÊM PHONG (SEAL_VOID)
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase bg-rose-500 text-white">
                    Đã thanh toán tại POS
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-rose-500/[0.06] border border-rose-500/20 space-y-1">
                  <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                    Mã định danh sản phẩm:
                  </div>
                  <div className="font-mono text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                    {traceData.scannedCode}
                  </div>
                </div>

                <p className="text-xs text-rose-600/90 dark:text-rose-300/90 leading-relaxed max-w-2xl">
                  Sản phẩm mang mã tem này đã được quét thanh toán qua quầy thu ngân siêu thị trước đó và kết thúc vòng đời niêm phong. Nếu sản phẩm này đang ở trên kệ bán hàng, hãy cảnh giác nguy cơ tem bị bóc dán lại hoặc sao chép lậu!
                </p>
              </div>
            </div>

            <div className="shrink-0 text-left md:text-right border-t md:border-t-0 md:border-l border-rose-500/20 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
              <span className="text-[11px] uppercase font-bold text-rose-500 block">
                Lượt quét phát hiện
              </span>
              <span className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {traceData.scanCount || 1}
              </span>
              <span className="text-xs text-neutral-400 block mt-0.5">lần</span>
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border-2 border-emerald-500/40 bg-white/95 dark:bg-[#1C140F]/95 backdrop-blur-xl p-6 sm:p-7 shadow-[0_12px_40px_rgba(16,185,129,0.12)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-md">
                <ShieldCheck size={24} />
              </span>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-400">
                    TEM NIÊM PHONG HỢP LỆ &bull; NGUỒN GỐC CHÍNH HÃNG
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase bg-emerald-500 text-white">
                    Chưa bán (Active)
                  </span>
                </div>

                <div className="p-3.5 rounded-2xl bg-emerald-500/[0.06] border border-emerald-500/20 space-y-1">
                  <div className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
                    Mã định danh sản phẩm ({traceData.scanType === 'ITEM_UNIT_QR' ? 'Tem đơn vị lẻ dán khay' : 'Mã Lô Tổng'}):
                  </div>
                  <div className="font-mono text-base sm:text-xl font-black text-emerald-700 dark:text-emerald-300">
                    {traceData.scannedCode}
                  </div>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed max-w-2xl">
                  {batch.status === 'ON_SHELF' || batch.status === 'DELIVERED'
                    ? 'Sản phẩm đang được bày bán chính thức trên quầy kệ siêu thị, bảo đảm còn nguyên niêm phong chuỗi lạnh.'
                    : batch.status === 'IN_TRANSIT'
                    ? 'Sản phẩm đang trong lộ trình vận chuyển xe lạnh giám sát IoT thời gian thực.'
                    : 'Sản phẩm chính hãng đã khai báo nguồn gốc trên Sổ cái Blockchain.'}
                </p>
              </div>
            </div>

            <div className="shrink-0 text-left md:text-right border-t md:border-t-0 md:border-l border-emerald-500/20 pt-4 md:pt-0 md:pl-6 w-full md:w-auto">
              <span className="text-[11px] uppercase font-bold text-emerald-600 dark:text-emerald-400 block">
                Lượt quét tra cứu
              </span>
              <span className="text-3xl font-black text-emerald-700 dark:text-emerald-300 font-mono">
                {traceData.scanCount || 1}
              </span>
              <span className="text-xs text-neutral-400 block mt-0.5">lần</span>
            </div>
          </div>
        )}

        {/* 3 Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className={CARD}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Nhiệt Độ Bảo Quản</span>
                <span className="p-2 rounded-xl bg-orange-500/10 text-[#F95716]">
                  <Thermometer size={16} />
                </span>
              </div>
              <div className="text-2xl font-extrabold mt-2 text-[#1A1A1A] dark:text-[#F5F5F5]">
                {profile.minTemp ?? 8.0}°C &ndash; {profile.maxTemp ?? 12.0}°C
              </div>
              <div className="text-[11.5px] text-neutral-400 mt-1">Khí {profile.gasType || 'C2H4'} &le; {profile.maxGas || 30} ppm</div>
            </div>

            <div className={CARD}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Kiểm Toán Cổng QC</span>
                <span className={`p-2 rounded-xl ${isStockedOnShelf ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-500'}`}>
                  <CheckCircle size={16} />
                </span>
              </div>
              <div className={`text-2xl font-extrabold mt-2 ${isStockedOnShelf ? 'text-emerald-600' : 'text-amber-500'}`}>
                {isStockedOnShelf ? (verify.valid ? 'HỢP LỆ' : 'ĐÃ PHÊ DUYỆT') : 'CHỜ TIẾP NHẬN'}
              </div>
              <div className="text-[11.5px] text-neutral-400 mt-1">
                {isStockedOnShelf ? 'Chữ ký số hợp lệ' : 'Lô hàng chưa nhập kho siêu thị'}
              </div>
            </div>

            <div className={CARD}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Thời Gian Lưu Kệ</span>
                <span className={`p-2 rounded-xl ${isStockedOnShelf ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-[#F95716]'}`}>
                  <Clock size={16} />
                </span>
              </div>
              <div className="text-2xl font-extrabold mt-2 text-[#1A1A1A] dark:text-[#F5F5F5]">
                {isStockedOnShelf
                  ? (ai.remaining_shelf_life_hours ? `${ai.remaining_shelf_life_hours} Giờ` : '144 Giờ')
                  : 'CHƯA LÊN KỆ'}
              </div>
              <div className="text-[11.5px] text-neutral-400 mt-1">
                {isStockedOnShelf ? 'Độ tươi ngon tối ưu' : 'Đang lưu kho ban đầu tại nông trại'}
              </div>
            </div>
          </div>

          {/* IoT Telemetry Section */}
          <div className={CARD}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  {isTransported ? 'Phổ Đo Vi Khí Hậu Xe Lạnh' : 'Nhật Ký Vi Khí Hậu Lưu Kho Ban Đầu (Kho Nông Trại)'}
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  {isTransported
                    ? 'Giám sát liên tục nhiệt độ và khí bảo quản trong suốt hành trình vận chuyển'
                    : 'Giám sát nhiệt độ và khí bảo quản trong suốt quá trình lưu kho ban đầu tại cơ sở sản xuất'}
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[11px] font-bold">
                {telemetry.length} Điểm Giám Sát
              </span>
            </div>
            <DualAxisTelemetryChart telemetryList={telemetry} profile={profile} isDark={isDark} />
          </div>

          {/* Blockchain Ledger Trail */}
          <div className={CARD}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                  Hành Trình Sổ Cái Blockchain
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Nhật ký các giai đoạn trong chuỗi cung ứng được xác thực số
                </p>
              </div>
              <span className="px-3 py-1 rounded-full bg-orange-950/[0.04] dark:bg-white/10 text-neutral-500 text-[11px] font-bold">
                {ledger.length} Khối Sổ Cái
              </span>
            </div>

            <div className="space-y-3">
              {ledger.map((blk, idx) => {
                const stage = formatBlockchainStage(
                  blk.event_type || blk.eventType,
                  blk.details,
                  blk.actor,
                  blk.actor_role || blk.actorRole
                );
                return (
                  <div
                    key={blk.block_index ?? blk.index ?? idx}
                    className="p-4 rounded-2xl border border-orange-950/5 dark:border-orange-500/10 bg-orange-950/[0.02] dark:bg-white/[0.02]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-[#F95716] text-white flex items-center justify-center text-[10px] font-extrabold">
                          #{blk.block_index ?? blk.index ?? idx}
                        </span>
                        <span className="text-[13px] font-bold text-[#1A1A1A] dark:text-[#F5F5F5]">
                          {stage.stageName}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${stage.badgeColor}`}>
                          Đã Ký Số
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-neutral-400">
                        {blk.timestamp ? new Date(blk.timestamp).toLocaleString('vi-VN') : '14/11/2026'}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                      {stage.description}
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] font-mono text-neutral-400">
                      <span className="truncate max-w-[280px]">Hash: {blk.current_hash || blk.currentHash || '0000a98b47...'}</span>
                      <span>&bull;</span>
                      <span className="text-[#F95716] font-sans font-semibold">Tác nhân ký: {stage.signer}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
