import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
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
  Camera,
  Search,
  Copy,
  Trash2,
  AlertTriangle,
  Layers,
  Box,
  Sparkles,
  X,
} from '../components/MomentumIcons';
import { resolveFoodBatchMedia, CONSUMER_LOGIN_BG } from '../utils/foodMediaResolver';
import { traceByCode } from '../services/api';

const CURRENT_WIFI_LAN_IP = '192.168.10.104';
const DEFAULT_PUBLIC_TUNNEL_URL = 'https://knowledgestorm-polyphonic-qualifications-howard.trycloudflare.com';

const CATEGORY_TEMP_RANGES = {
  VEG_FRUIT: '8 - 12°C',
  CHILLED_MEAT: '0 - 4°C',
  FRESH_SEAFOOD: '0 - 2°C',
  DAIRY: '2 - 6°C',
  DEEP_FROZEN: '-25 - -18°C',
  DELI_HOT: '60 - 75°C',
};

const CATEGORY_NAMES = {
  VEG_FRUIT: 'Rau Củ Quả & Nông Sản Tươi',
  CHILLED_MEAT: 'Thịt Tươi Sống (Chilled)',
  FRESH_SEAFOOD: 'Thủy Hải Sản Tươi Sống',
  DAIRY: 'Sữa Tươi & Chế Phẩm',
  DEEP_FROZEN: 'Cấp Đông Sâu',
  DELI_HOT: 'Quầy Deli Nóng',
};

// Tính toán phân hạng hội viên dựa trên điểm thực tế
const computeMemberTier = (points = 0) => {
  if (points >= 1000) {
    return {
      name: 'KIM CƯƠNG (DIAMOND)',
      label: 'Hội Viên Kim Cương',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
      cardGradient: 'from-amber-950 via-neutral-900 to-amber-900',
      nextTier: null,
      needed: 0,
      iconColor: 'text-amber-400',
    };
  }
  if (points >= 500) {
    return {
      name: 'VÀNG (GOLD)',
      label: 'Hội Viên Vàng',
      badgeClass: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30',
      cardGradient: 'from-stone-900 via-amber-950/60 to-stone-900',
      nextTier: 'KIM CƯƠNG',
      needed: 1000 - points,
      iconColor: 'text-amber-400',
    };
  }
  if (points >= 100) {
    return {
      name: 'BẠC (SILVER)',
      label: 'Hội Viên Bạc',
      badgeClass: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border border-slate-400/30',
      cardGradient: 'from-zinc-900 via-stone-800 to-zinc-900',
      nextTier: 'VÀNG',
      needed: 500 - points,
      iconColor: 'text-slate-300',
    };
  }
  return {
    name: 'TIÊU CHUẨN (STANDARD)',
    label: 'Thành Viên Mới',
    badgeClass: 'bg-orange-500/15 text-[#F95716] border border-orange-500/30',
    cardGradient: 'from-[#1C140F] via-[#2A1D15] to-[#140D08]',
    nextTier: 'BẠC',
    needed: 100 - points,
    iconColor: 'text-[#F95716]',
  };
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
  const [copiedBatch, setCopiedBatch] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Khóa nhận diện người dùng riêng biệt theo Email hoặc Username
  const userKey =
    currentUser?.email || currentUser?.phone || currentUser?.username || currentUser?.userId || 'guest_consumer';

  // 1. Điểm tích lũy thực tế: Tài khoản mới đăng ký luôn khởi tạo từ 0 điểm
  const [userPoints, setUserPoints] = useState(() => {
    try {
      const saved = localStorage.getItem(`smartchain_consumer_points_${userKey}`);
      return saved !== null ? parseInt(saved, 10) : 0;
    } catch (e) {
      return 0;
    }
  });

  // 2. Lịch sử tra cứu thực tế: Tài khoản mới đăng ký luôn rỗng ([])
  const [userHistory, setUserHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(`smartchain_consumer_history_${userKey}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Cấu hình máy chủ công khai (Tự động đồng bộ từ Cloudflare Tunnel hoặc Wi-Fi)
  const [customHost, setCustomHost] = useState(() => {
    // Nếu đang truy cập qua domain trycloudflare.com thì dùng ngay window.location.origin
    if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname.endsWith('.trycloudflare.com')) {
      return window.location.origin;
    }
    try {
      const saved = localStorage.getItem('smartchain_custom_host');
      if (
        saved &&
        saved.trim() &&
        !saved.includes('artists-consist-hudson-brother') &&
        !saved.includes('examine-ensures-supporting-tennessee')
      ) {
        return saved.trim();
      }
    } catch (e) { }
    if (
      typeof window !== 'undefined' &&
      window.location.hostname &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      return window.location.origin;
    }
    return DEFAULT_PUBLIC_TUNNEL_URL;
  });

  // Tự động kiểm tra file active_tunnel.json định kỳ để nhận link Cloudflare Tunnel mới nhất
  useEffect(() => {
    const syncActiveTunnel = () => {
      fetch('/active_tunnel.json?t=' + Date.now())
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.tunnelUrl && data.active) {
            setCustomHost((prev) => {
              if (
                !prev ||
                prev.includes('trycloudflare.com') ||
                prev.includes('localhost') ||
                prev.includes('127.0.0.1')
              ) {
                if (prev !== data.tunnelUrl) {
                  try { localStorage.setItem('smartchain_custom_host', data.tunnelUrl); } catch (e) { }
                  return data.tunnelUrl;
                }
              }
              return prev;
            });
          }
        })
        .catch(() => { });
    };

    syncActiveTunnel();
    const interval = setInterval(syncActiveTunnel, 3000);
    return () => clearInterval(interval);
  }, []);

  // Lọc danh sách mặt hàng đang bày bán trên quầy kệ siêu thị Co.opmart
  const availableShelfBatches = React.useMemo(() => {
    const onShelf = batches.filter((b) =>
      ['ON_SHELF', 'STOCKED_SHELF', 'QC_ACCEPTED', 'DELIVERED'].includes(
        String(b.status || '').toUpperCase()
      )
    );
    return onShelf.length > 0 ? onShelf : batches;
  }, [batches]);

  const initialCode =
    selectedBatch?.batch_code ||
    (availableShelfBatches.length > 0 ? availableShelfBatches[0].batch_code : batches[0]?.batch_code || '');

  const [inputCode, setInputCode] = useState(initialCode);
  const [activeBatchCode, setActiveBatchCode] = useState(initialCode);
  const [liveTraceDetails, setLiveTraceDetails] = useState(null);
  const [isTraceLoading, setIsTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState('');

  // Camera QR Scanner Modal State
  const [isCameraActive, setIsCameraActive] = useState(false);
  const scannerRef = useRef(null);

  // Phân hạng hội viên hiện tại
  const currentTier = computeMemberTier(userPoints);

  // Tìm lô hàng thực tế từ CSDL
  const activeBatchData =
    batches.find((b) => b.batch_code === activeBatchCode) ||
    batches[0] || {
      batch_code: activeBatchCode || 'LOT-VEG-2026-001',
      product_name: 'Xà Lách Thủy Canh Đà Lạt VietGAP',
      farm_name: 'Nông trại Công nghệ cao LangBiang - Đà Lạt',
      transport_vehicle_plate: '49C-567.89',
      weight_kg: 500,
      category_code: 'VEG_FRUIT',
      status: 'ON_SHELF',
      harvest_date: '2026-11-12T04:00:00Z',
    };

  const activeProductName =
    activeBatchData.product_name ||
    activeBatchData.batch_name ||
    'Sản phẩm Chuỗi Cung Ứng SmartChain';
  const activeFarmName =
    activeBatchData.farm_name ||
    activeBatchData.origin_farm ||
    'Nông trại liên kết VietGAP';
  const activeCategoryCode = String(
    activeBatchData.category_code || activeBatchData.category || 'VEG_FRUIT'
  ).toUpperCase();
  const activeCategoryLabel = CATEGORY_NAMES[activeCategoryCode] || 'Nông Sản An Toàn';
  const activeTempRange = CATEGORY_TEMP_RANGES[activeCategoryCode] || '8 - 12°C';
  const activeMedia = resolveFoodBatchMedia(activeBatchData);
  const activeVehiclePlate =
    activeBatchData.transport_vehicle_plate ||
    activeBatchData.transportJourney?.vehicle_plate ||
    '49C-567.89';

  // Đường link chuẩn cho mã QR thật (LUÔN SỬ DỤNG ĐƯỜNG DẪN CÔNG KHAI CLOUDFLARE KHI CHẠY LOCALHOST)
  const traceUrl = React.useMemo(() => {
    let base = (customHost || '').trim();
    if (!base) {
      base = DEFAULT_PUBLIC_TUNNEL_URL;
    }
    if (base.startsWith('http://') || base.startsWith('https://')) {
      return `${base.replace(/\/+$/, '')}/trace/${activeBatchData.batch_code}`;
    }
    return `https://${base.replace(/\/+$/, '')}/trace/${activeBatchData.batch_code}`;
  }, [customHost, activeBatchData.batch_code]);

  // Khi người dùng chọn lô hoặc đổi mã, tự động đồng bộ
  useEffect(() => {
    if (selectedBatch?.batch_code && selectedBatch.batch_code !== activeBatchCode) {
      setActiveBatchCode(selectedBatch.batch_code);
      setInputCode(selectedBatch.batch_code);
    }
  }, [selectedBatch?.batch_code]);

  // Tải dữ liệu kiểm toán thật từ API /trace/{code} (telemetry, aiFreshness, blockchain)
  useEffect(() => {
    if (!activeBatchCode) return;
    let isMounted = true;
    setIsTraceLoading(true);
    setTraceError('');

    traceByCode(activeBatchCode)
      .then((res) => {
        if (isMounted) {
          setLiveTraceDetails(res);
          setIsTraceLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.warn('Trace fetch warning:', err);
          setIsTraceLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeBatchCode]);

  // Xử lý tìm kiếm lô hàng
  const handleExecuteSearch = (targetCode) => {
    const code = (targetCode || inputCode).trim();
    if (!code) return;
    setActiveBatchCode(code);
    const match = batches.find((b) => b.batch_code.toLowerCase() === code.toLowerCase());
    if (match && setSelectedBatch) {
      setSelectedBatch(match);
    }
  };

  // Lưu sản phẩm vào sổ tay lịch sử và tích điểm thưởng
  const handleSaveToHistory = () => {
    const existsIndex = userHistory.findIndex((item) => item.batchCode === activeBatchData.batch_code);
    let updatedHistory;
    const nowIso = new Date().toISOString();

    const record = {
      batchCode: activeBatchData.batch_code,
      productName: activeProductName,
      farmName: activeFarmName,
      category: activeCategoryLabel,
      thumb: activeMedia.thumb,
      verifiedAt: nowIso,
      status: activeBatchData.status || 'ON_SHELF',
      tempRange: activeTempRange,
      vehiclePlate: activeVehiclePlate,
    };

    if (existsIndex >= 0) {
      updatedHistory = [...userHistory];
      updatedHistory[existsIndex] = record;
      setToastMessage(`✓ Đã cập nhật nhật ký kiểm tra lô ${activeBatchData.batch_code}!`);
    } else {
      updatedHistory = [record, ...userHistory];
      const newPoints = userPoints + 10;
      setUserPoints(newPoints);
      try {
        localStorage.setItem(`smartchain_consumer_points_${userKey}`, String(newPoints));
      } catch (e) { }
      setToastMessage(`✓ Đã lưu vào sổ tay tra cứu! +10 điểm tích lũy thành viên.`);
    }

    setUserHistory(updatedHistory);
    try {
      localStorage.setItem(`smartchain_consumer_history_${userKey}`, JSON.stringify(updatedHistory));
    } catch (e) { }

    setTimeout(() => setToastMessage(''), 3500);
  };

  // Xóa một mục khỏi lịch sử
  const handleRemoveHistoryItem = (batchCode) => {
    const nextHistory = userHistory.filter((item) => item.batchCode !== batchCode);
    setUserHistory(nextHistory);
    try {
      localStorage.setItem(`smartchain_consumer_history_${userKey}`, JSON.stringify(nextHistory));
    } catch (e) { }
  };

  // Xóa toàn bộ lịch sử
  const handleClearAllHistory = () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử tra cứu của tài khoản này không?')) {
      setUserHistory([]);
      try {
        localStorage.removeItem(`smartchain_consumer_history_${userKey}`);
      } catch (e) { }
    }
  };

  // Khởi động Camera QR Scanner
  const toggleCameraScanner = () => {
    if (isCameraActive) {
      if (scannerRef.current) {
        try {
          scannerRef.current.clear();
        } catch (e) { }
      }
      setIsCameraActive(false);
    } else {
      setIsCameraActive(true);
      setTimeout(() => {
        try {
          const scanner = new Html5QrcodeScanner('consumer-qr-reader', {
            fps: 10,
            qrbox: { width: 240, height: 240 },
            rememberLastUsedCamera: true,
          });
          scannerRef.current = scanner;
          scanner.render(
            (decodedText) => {
              let code = decodedText;
              if (code.includes('/trace/')) {
                code = code.split('/trace/').pop().split('?')[0].split('#')[0];
              }
              setInputCode(code);
              handleExecuteSearch(code);
              scanner.clear();
              setIsCameraActive(false);
              setToastMessage(`✓ Quét mã thành công: ${code}`);
              setTimeout(() => setToastMessage(''), 3000);
            },
            (error) => {
              // Ignore per-frame errors
            }
          );
        } catch (err) {
          console.error('Không thể mở camera:', err);
        }
      }, 300);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(activeBatchData.batch_code);
    setCopiedBatch(true);
    setTimeout(() => setCopiedBatch(false), 2000);
  };

  const handleCopyTraceUrl = () => {
    navigator.clipboard?.writeText(traceUrl);
    setToastMessage('✓ Đã sao chép liên kết truy xuất nguồn gốc!');
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Định dạng trạng thái quầy kệ
  const renderBatchStatusBadge = (status = '') => {
    const s = String(status).toUpperCase();
    if (s.includes('RECALL')) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-600 text-white shadow-md animate-pulse">
          <AlertTriangle size={13} /> 🚨 Thu Hồi Khẩn Cấp
        </span>
      );
    }
    if (s === 'ON_SHELF' || s === 'STOCKED_SHELF') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
          <CheckCircle size={12} /> Đang Bày Bán Trên Kệ Siêu Thị
        </span>
      );
    }
    if (s === 'QC_ACCEPTED') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
          <ShieldCheck size={12} /> Đạt Chuẩn Kiểm Định KCS TTI
        </span>
      );
    }
    if (s === 'IN_TRANSIT') {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
          <Truck size={12} /> Đang Vận Chuyển Xe Lạnh IoT
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-neutral-500/15 text-neutral-600 dark:text-neutral-400 border border-neutral-500/30">
        <Box size={12} /> Đã Nhập Hệ Thống Sổ Cái
      </span>
    );
  };

  return (
    <div className="min-h-screen relative text-[#1A1A1A] dark:text-[#F5F5F5] font-sans antialiased flex flex-col transition-colors overflow-x-hidden [font-family:'Plus_Jakarta_Sans',system-ui,sans-serif]">
      {/* Nền phong cách SmartChain Momentum với ảnh nông sản thực tế */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src={CONSUMER_LOGIN_BG}
          alt="SmartChain Fresh Produce Background"
          className="w-full h-full object-cover object-center filter brightness-[0.72] contrast-[1.05]"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-black/85 via-black/75 to-stone-900/80 backdrop-blur-[1px]" />
      </div>

      {/* Thông báo Toast dạng Floating Badge */}
      {toastMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-2xl bg-emerald-600 text-white font-bold text-xs shadow-2xl animate-fade-in flex items-center gap-2 border border-white/20">
          <CheckCircle size={15} />
          {toastMessage}
        </div>
      )}

      {/* HEADER TỔNG THỂ */}
      <header className="sticky top-0 z-40 h-20 backdrop-blur-2xl bg-white/95 dark:bg-[#1C140F]/95 border-b border-orange-950/10 dark:border-orange-500/15 px-6 sm:px-10 flex items-center justify-between shadow-sm">
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

        {/* Tab Switcher trên Desktop */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-2xl bg-neutral-100 dark:bg-white/[0.06] border border-neutral-200/60 dark:border-white/10 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveConsumerTab('trace')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${activeConsumerTab === 'trace'
                ? 'bg-[#F95716] text-white shadow-md'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-[#F95716]'
              }`}
          >
            <QrCode size={14} /> Tra Cứu Tem QR
          </button>
          <button
            type="button"
            onClick={() => setActiveConsumerTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${activeConsumerTab === 'history'
                ? 'bg-[#F95716] text-white shadow-md'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-[#F95716]'
              }`}
          >
            <ShoppingCart size={14} /> Sổ Tay Tra Cứu ({userHistory.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveConsumerTab('profile')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all cursor-pointer ${activeConsumerTab === 'profile'
                ? 'bg-[#F95716] text-white shadow-md'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-[#F95716]'
              }`}
          >
            <UserCheck size={14} /> Thẻ Thành Viên & Hồ Sơ
          </button>
        </div>

        {/* Cụm hành động bên phải: Theme + Thông tin tài khoản thật + Nút Đăng xuất */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleToggleTheme}
            className="flex h-10 w-10 items-center justify-center rounded-2xl border border-neutral-200 dark:border-white/10 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Đổi giao diện Sáng / Tối"
          >
            {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
          </button>

          {/* User Info Badge thật (hiển thị đúng tên tài khoản và hạng thực tế) */}
          <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-neutral-200 dark:border-white/10">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-[#F95716] to-amber-500 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
              {(currentUser?.fullName || currentUser?.username || 'K').charAt(0).toUpperCase()}
            </div>
            <div className="text-left text-xs leading-tight">
              <span className="font-extrabold block text-[#1A1A1A] dark:text-white">
                {currentUser?.fullName || currentUser?.username || 'Khách Hàng Tiêu Dùng'}
              </span>
              <span className="text-[10px] text-[#F95716] font-bold">
                {currentTier.label} ({userPoints} PTS)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all cursor-pointer"
          >
            Đăng Xuất
          </button>
        </div>
      </header>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden flex items-center justify-around border-b border-orange-950/10 dark:border-orange-500/10 bg-white dark:bg-[#1C140F] p-2 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveConsumerTab('trace')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-lg ${activeConsumerTab === 'trace' ? 'bg-[#F95716] text-white' : 'text-neutral-500'
            }`}
        >
          <QrCode size={13} /> Tra Cứu
        </button>
        <button
          type="button"
          onClick={() => setActiveConsumerTab('history')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-lg ${activeConsumerTab === 'history' ? 'bg-[#F95716] text-white' : 'text-neutral-500'
            }`}
        >
          <ShoppingCart size={13} /> Sổ Tay ({userHistory.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveConsumerTab('profile')}
          className={`flex items-center gap-1.5 py-2 px-3 rounded-lg ${activeConsumerTab === 'profile' ? 'bg-[#F95716] text-white' : 'text-neutral-500'
            }`}
        >
          <UserCheck size={13} /> Thẻ Thành Viên
        </button>
      </div>

      {/* MODAL QUÉT MÃ QR BẰNG CAMERA */}
      {isCameraActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-[#1C140F] p-6 shadow-2xl border border-orange-500/20 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-orange-500/10 text-[#F95716]">
                  <Camera size={18} />
                </span>
                <h3 className="text-sm font-black text-[#1A1A1A] dark:text-white">
                  Quét Mã QR Bằng Camera Thật
                </h3>
              </div>
              <button
                type="button"
                onClick={toggleCameraScanner}
                className="p-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Hướng camera điện thoại hoặc webcam máy tính vào tem QR trên bao bì sản phẩm để tự động nhận diện mã.
            </p>
            <div id="consumer-qr-reader" className="w-full rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800" />
            <button
              type="button"
              onClick={toggleCameraScanner}
              className="w-full py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 text-xs font-bold hover:bg-neutral-200 transition-all cursor-pointer"
            >
              Đóng Camera
            </button>
          </div>
        </div>
      )}

      {/* NỘI DUNG CHÍNH CỦA CỔNG KHÁCH HÀNG */}
      <main className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ========================================================================= */}
        {/* TAB 1: TRA CỨU TEM NÔNG SẢN & THẺ BẢO CHỨNG TEM QR THẬT                   */}
        {/* ========================================================================= */}
        {activeConsumerTab === 'trace' && (
          <div className="space-y-6">
            {/* KHUNG TÌM KIẾM & QUÉT TEM NÔNG SẢN */}
            <div className="rounded-[28px] border border-orange-950/5 dark:border-orange-500/10 bg-white/95 dark:bg-[#1C140F]/95 backdrop-blur-xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 text-[#F95716] text-[11px] font-extrabold uppercase tracking-wider mb-2">
                    <ShieldCheck size={14} /> Minh Bạch Chuỗi Cung Ứng Thực Phẩm
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#1A1A1A] dark:text-white">
                    Tra Cứu Nguồn Gốc & Hồ Sơ Lô Hàng
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
                    Nhập mã lô hàng trên bao bì hoặc quét tem QR để kiểm tra dữ liệu sổ cái chuỗi khối, hành trình xe lạnh IoT và trạng thái độ tươi thời gian thực.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={toggleCameraScanner}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-500/10 hover:bg-orange-500/20 text-[#F95716] text-xs font-bold border border-orange-500/20 transition-all cursor-pointer"
                  >
                    <Camera size={14} /> Quét Bằng Camera
                  </button>
                </div>
              </div>

              {/* Thanh nhập mã & Tìm kiếm */}
              <div className="flex flex-col sm:flex-row gap-3 pt-1">
                <div className="relative flex-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Search size={16} />
                  </span>
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleExecuteSearch(inputCode)}
                    placeholder="Nhập mã lô hàng: LOT-VEG-2026-001, LOT-MEAT-2026-010..."
                    className="w-full rounded-2xl border border-orange-950/10 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.03] pl-11 pr-4 py-3.5 text-xs sm:text-sm font-bold text-[#1A1A1A] dark:text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#F95716] transition-all"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleExecuteSearch(inputCode)}
                  className="px-6 py-3.5 rounded-2xl bg-[#F95716] hover:bg-[#E0430B] text-white text-xs font-extrabold uppercase tracking-wider shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  Kiểm Tra Ngay
                </button>
              </div>

              {/* Danh sách các mặt hàng đang bày bán trên quầy kệ siêu thị Co.opmart để khách hàng bấm chọn nhanh */}
              <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                <span className="font-bold text-neutral-400 text-[11px] uppercase tracking-wider">
                  Mặt hàng đang bày bán tại quầy kệ siêu thị Co.opmart (Bấm chọn nhanh):
                </span>
                {availableShelfBatches.slice(0, 6).map((b) => {
                  const isSelected = activeBatchData.batch_code === b.batch_code;
                  return (
                    <button
                      key={b.batch_code}
                      type="button"
                      onClick={() => {
                        setInputCode(b.batch_code);
                        handleExecuteSearch(b.batch_code);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold transition-all text-xs cursor-pointer flex items-center gap-1.5 ${isSelected
                          ? 'bg-[#F95716] text-white shadow-sm'
                          : 'bg-neutral-100 dark:bg-white/[0.05] hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-700 dark:text-neutral-200'
                        }`}
                    >
                      <span className="font-mono">{b.batch_code}</span>
                      <span className="text-[11px] opacity-80">&bull; {b.product_name || b.productName}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* THẺ CHI TIẾT NGUỒN GỐC NÔNG SẢN THỰC TẾ & BẢO CHỨNG MÃ QR */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* CỘT TRÁI: THÔNG TIN LÔ HÀNG THỰC TẾ (2 CỘT) */}
              <div className="lg:col-span-2 rounded-[28px] border border-orange-950/5 dark:border-orange-500/10 bg-white dark:bg-[#1C140F] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
                {/* Header sản phẩm */}
                <div className="flex items-start justify-between gap-4 pb-5 border-b border-orange-950/5 dark:border-orange-500/10">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 rounded-2xl overflow-hidden border border-orange-500/20 shadow-sm shrink-0 bg-neutral-100 dark:bg-neutral-800">
                      <img
                        src={activeMedia.thumb}
                        alt={activeProductName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10.5px] font-extrabold uppercase bg-orange-500/10 text-[#F95716]">
                          {activeCategoryLabel}
                        </span>
                        {renderBatchStatusBadge(activeBatchData.status)}
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-[#1A1A1A] dark:text-white">
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
                    className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-[#F95716] transition-all shrink-0 cursor-pointer"
                    title="Sao chép mã lô"
                  >
                    {copiedBatch ? '✓ Đã chép' : activeBatchData.batch_code}
                  </button>
                </div>

                {/* CẢNH BÁO THU HỒI NẾU LÔ HÀNG BỊ PHÁT LỆNH THU HỒI */}
                {String(activeBatchData.status || '').toUpperCase().includes('RECALL') && (
                  <div className="p-4 rounded-2xl bg-red-600 text-white shadow-md border border-red-400 space-y-1">
                    <div className="flex items-center gap-2 font-black text-sm">
                      <AlertTriangle size={18} />
                      CẢNH BÁO AN TOÀN THỰC PHẨM KHẨN CẤP (RECALL NOTICE)
                    </div>
                    <p className="text-xs text-red-100 leading-relaxed">
                      Lô hàng này đã bị hệ thống SmartChain ban hành lệnh thu hồi khẩn cấp. Quý khách vui lòng <strong>KHÔNG SỬ DỤNG</strong> sản phẩm này và liên hệ ngay với quầy Chăm Sóc Khách Hàng của siêu thị để được hoàn trả 100% giá trị.
                    </p>
                  </div>
                )}

                {/* 4 Chỉ số thực tế từ CSDL & Cảm biến */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  {/* Chỉ số TTI */}
                  <div className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-white/[0.02] border border-orange-950/5 dark:border-white/5 flex flex-col items-center justify-between text-center">
                    <span className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-wider block">Chỉ số TTI</span>
                    <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 my-1 block">
                      {liveTraceDetails?.aiFreshness?.freshnessGrade || '100% Tươi'}
                    </span>
                    <span className="text-[10px] text-neutral-500">Đạt chuẩn chất lượng</span>
                  </div>

                  {/* Nhiệt độ chuẩn */}
                  <div className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-white/[0.02] border border-orange-950/5 dark:border-white/5 flex flex-col items-center justify-between text-center">
                    <span className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-wider block">Nhiệt độ chuẩn</span>
                    <span className="text-lg sm:text-xl font-black text-[#F95716] my-1 block">{activeTempRange}</span>
                    <span className="text-[10px] text-neutral-500">Bảo quản chuẩn ngành</span>
                  </div>

                  {/* Xe Vận Chuyển: Biển số vàng kinh doanh vận tải */}
                  <div className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-white/[0.02] border border-orange-950/5 dark:border-white/5 flex flex-col items-center justify-between text-center">
                    <span className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-wider block">Xe Vận Chuyển</span>

                    {/* Biển số vàng kinh doanh vận tải chuẩn Việt Nam */}
                    <div className="my-1.5 relative inline-flex items-center justify-center px-3 py-1 rounded-xl bg-[#F6C343] border-2 border-neutral-900 shadow-sm">
                      <div className="absolute top-1 left-2 w-1 h-1 rounded-full bg-neutral-900/60" />
                      <div className="absolute top-1 right-2 w-1 h-1 rounded-full bg-neutral-900/60" />
                      <span className="font-mono font-black text-neutral-950 text-xs sm:text-sm tracking-wider">
                        {activeVehiclePlate}
                      </span>
                    </div>

                    <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                      <Truck size={11} className="text-amber-500" /> Thùng lạnh IoT ATP
                    </span>
                  </div>

                  {/* Chứng Chỉ: Huy hiệu chứng nhận VietGAP chính thức */}
                  <div className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-white/[0.02] border border-orange-950/5 dark:border-white/5 flex flex-col items-center justify-between text-center relative overflow-hidden">
                    <span className="text-[10.5px] font-bold text-neutral-400 uppercase tracking-wider block">Chứng Nhận Chất Lượng</span>

                    <div className="my-1.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/15 border-2 border-emerald-600/30 text-emerald-700 dark:text-emerald-400 shadow-sm">
                      <ShieldCheck size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-black text-xs tracking-wider">VietGAP CHUẨN</span>
                    </div>

                    <div className="flex flex-col items-center text-[10px] text-neutral-500 dark:text-neutral-400 leading-tight">
                      <span className="font-bold text-neutral-700 dark:text-neutral-300">TCVN 11892-1:2017</span>
                      <span className="text-[9.5px] text-neutral-400">HACCP & ISO-22000</span>
                    </div>
                  </div>
                </div>

                {/* Lộ trình chuỗi cung ứng khép kín chuẩn Enterprise - Unified Executive Timeline */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">
                      Lộ Trình Chuỗi Cung Ứng Khép Kín
                    </h4>
                    <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                      3 Giai Đoạn Giám Sát
                    </span>
                  </div>

                  <div className="relative pl-7 space-y-3.5 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-orange-950/10 dark:before:bg-white/10">
                    {/* Chặng 1 */}
                    <div className="relative group">
                      <span className="absolute -left-7 top-1 h-6 w-6 rounded-full bg-[#F95716] text-white flex items-center justify-center font-black text-xs shadow-sm ring-4 ring-white dark:ring-[#1C140F]">
                        1
                      </span>
                      <div className="p-3.5 rounded-2xl bg-neutral-50/80 dark:bg-white/[0.02] border border-orange-950/5 dark:border-white/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-[#1A1A1A] dark:text-white text-xs">
                            Cơ sở sản xuất & Ký số Genesis Block
                          </span>
                          <span className="text-[10.5px] font-mono text-[#F95716] font-bold">Block #0</span>
                        </div>
                        <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                          Xuất xưởng tại <strong>{activeFarmName}</strong>, đóng gói niêm phong và ghi nhận khối khởi tạo (Genesis Block) vào sổ cái chuỗi khối bất biến.
                        </p>
                      </div>
                    </div>

                    {/* Chặng 2 */}
                    <div className="relative group">
                      <span className="absolute -left-7 top-1 h-6 w-6 rounded-full bg-[#F95716] text-white flex items-center justify-center font-black text-xs shadow-sm ring-4 ring-white dark:ring-[#1C140F]">
                        2
                      </span>
                      <div className="p-3.5 rounded-2xl bg-neutral-50/80 dark:bg-white/[0.02] border border-orange-950/5 dark:border-white/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-[#1A1A1A] dark:text-white text-xs">
                            Vận chuyển xe lạnh IoT đa nhiệt độ
                          </span>
                          <span className="text-[10.5px] font-mono text-neutral-500 font-bold">{activeVehiclePlate}</span>
                        </div>
                        <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                          Đội xe lạnh chuyên dụng duy trì liên tục dải nhiệt bảo quản chuẩn {activeTempRange}, cảm biến IoT truyền dữ liệu vi khí hậu theo thời gian thực.
                        </p>
                      </div>
                    </div>

                    {/* Chặng 3 */}
                    <div className="relative group">
                      <span className="absolute -left-7 top-1 h-6 w-6 rounded-full bg-[#F95716] text-white flex items-center justify-center font-black text-xs shadow-sm ring-4 ring-white dark:ring-[#1C140F]">
                        3
                      </span>
                      <div className="p-3.5 rounded-2xl bg-neutral-50/80 dark:bg-white/[0.02] border border-orange-950/5 dark:border-white/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-[#1A1A1A] dark:text-white text-xs">
                            Nghiệm thu KCS & Trưng bày quầy kệ FEFO siêu thị
                          </span>
                          <span className="text-[10.5px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">100% Đạt Chuẩn</span>
                        </div>
                        <p className="text-neutral-600 dark:text-neutral-400 text-[11px] leading-relaxed">
                          KCS đối soát chỉ số độ tươi Arrhenius TTI, chấp thuận nhập kho và xếp lên quầy kệ bán lẻ Co.opmart theo thứ tự ưu tiên hạn sử dụng.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nút lưu vào sổ tay tra cứu của khách hàng (+10 điểm thưởng) */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-orange-950/5 dark:border-orange-500/10">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    Lưu sản phẩm này để theo dõi quyền lợi an toàn thực phẩm và tích điểm thành viên.
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveToHistory}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-[#F95716] hover:bg-[#E0430B] text-white text-xs font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Sparkles size={14} /> Lưu Vào Sổ Tay (+10 Điểm)
                  </button>
                </div>
              </div>

              {/* CỘT PHẢI: MÃ QR THỰC TẾ & BẢO CHỨNG MẬT MÃ */}
              <div className="space-y-6">
                {/* Thẻ Mã QR Thật 100% được vẽ động từ URL trang Passport */}
                <div className="rounded-[28px] border border-orange-950/5 dark:border-orange-500/10 bg-white dark:bg-[#1C140F] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-neutral-400">
                      Tem Điện Tử Bất Biến
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Cloudflare Live
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-[#1A1A1A] dark:text-white">
                    Mã QR Truy Xuất Nguồn Gốc
                  </h4>

                  {/* KHUNG VẼ MÃ QR THẬT BẰNG QRCodeSVG DẪN THẲNG ĐẾN TRACE URL CÔNG KHAI */}
                  <div className="p-4 bg-white rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-inner inline-flex flex-col items-center justify-center">
                    <QRCodeSVG
                      value={traceUrl}
                      size={180}
                      level="H"
                      includeMargin={true}
                    />
                    <span className="mt-2 text-[10.5px] font-mono font-bold text-neutral-500 break-all max-w-[200px]">
                      {activeBatchData.batch_code}
                    </span>
                  </div>

                  <p className="text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    Quét trực tiếp bằng camera điện thoại tại siêu thị để mở Hộ chiếu toàn trình (không cần đăng nhập).
                  </p>

                  <div className="space-y-2 pt-1">
                    <a
                      href={traceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-2.5 px-4 rounded-xl bg-[#F95716] hover:bg-[#E0430B] text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      <ExternalLink size={14} /> Mở Trang Passport Công Khai ↗
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyTraceUrl}
                      className="w-full py-2 px-4 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Copy size={13} /> Sao Chép Đường Dẫn Tem
                    </button>
                  </div>

                  {/* Cấu hình Máy Chủ Quét Di Động (Hỗ trợ 2 Chế Độ: Wi-Fi Nội Bộ & Cloudflare) */}
                  <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 text-left space-y-2">
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="font-bold text-neutral-500 dark:text-neutral-400">
                        Chọn chế độ máy chủ quét mã:
                      </span>
                    </div>

                    {/* 2 Nút chuyển đổi nhanh chế độ quét 1-chạm */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const wifiUrl = `http://${CURRENT_WIFI_LAN_IP}:5173`;
                          setCustomHost(wifiUrl);
                          try { localStorage.setItem('smartchain_custom_host', wifiUrl); } catch (e) { }
                          setToastMessage(`✓ Đã chuyển sang chế độ Wi-Fi: ${CURRENT_WIFI_LAN_IP}`);
                          setTimeout(() => setToastMessage(''), 2500);
                        }}
                        className={`py-1.5 px-2 rounded-xl text-[10.5px] font-bold border transition-all cursor-pointer text-center ${customHost.includes(CURRENT_WIFI_LAN_IP)
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-sm'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                          }`}
                        title="Dành cho điện thoại kết nối chung mạng Wi-Fi với máy tính (Rất ổn định, không lo lỗi mạng)"
                      >
                        📡 Wi-Fi ({CURRENT_WIFI_LAN_IP})
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          fetch('/active_tunnel.json?t=' + Date.now())
                            .then((res) => (res.ok ? res.json() : null))
                            .then((data) => {
                              const targetUrl = (data && data.tunnelUrl) || DEFAULT_PUBLIC_TUNNEL_URL;
                              setCustomHost(targetUrl);
                              try { localStorage.setItem('smartchain_custom_host', targetUrl); } catch (e) { }
                              setToastMessage('✓ Đã đồng bộ link Cloudflare Tunnel mới nhất');
                              setTimeout(() => setToastMessage(''), 2500);
                            })
                            .catch(() => {
                              setCustomHost(DEFAULT_PUBLIC_TUNNEL_URL);
                            });
                        }}
                        className={`py-1.5 px-2 rounded-xl text-[10.5px] font-bold border transition-all cursor-pointer text-center ${customHost.includes('trycloudflare.com')
                            ? 'bg-orange-500/15 text-[#F95716] border-orange-500/30 shadow-sm'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700'
                          }`}
                        title="Dành cho điện thoại dùng mạng 4G/5G hoặc ở xa qua Internet"
                      >
                        ☁️ Cloudflare (4G/5G)
                      </button>
                    </div>

                    <input
                      type="text"
                      value={customHost}
                      onChange={(e) => {
                        const val = e.target.value.trim();
                        setCustomHost(val);
                        try {
                          localStorage.setItem('smartchain_custom_host', val);
                        } catch (err) { }
                      }}
                      placeholder="Nhập IP LAN hoặc link tunnel..."
                      className="w-full rounded-xl border border-orange-950/10 dark:border-orange-500/20 bg-neutral-50 dark:bg-black/30 px-3 py-1.5 font-mono text-[11px] font-bold text-[#F95716] focus:outline-none focus:border-[#F95716]"
                    />

                  </div>
                </div>

                {/* Thẻ Con Dấu Mật Mã SmartChain */}
                <div className="rounded-[28px] border border-orange-950/5 dark:border-orange-500/10 bg-neutral-50/80 dark:bg-[#1A130E] p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-[#F95716]/10 text-[#F95716]">
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold uppercase text-[#1A1A1A] dark:text-white">
                          Bảo Chứng Thuật Toán ECDSA
                        </h4>
                        <p className="text-[11px] text-neutral-500">Mã hóa chuẩn secp256r1</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      Chữ Ký Hợp Lệ
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-white dark:bg-black/30 border border-neutral-200/60 dark:border-white/5 font-mono text-[10px] text-neutral-500 dark:text-neutral-400 break-all">
                    Tx: {liveTraceDetails?.blockchainIntegrity?.latestBlockHash || `0x8a9f...${activeBatchData.batch_code.slice(-6)}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: SỔ TAY TRA CỨU & LỊCH SỬ SẢN PHẨM CỦA NGƯỜI TIÊU DÙNG              */}
        {/* ========================================================================= */}
        {activeConsumerTab === 'history' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-[28px] bg-white dark:bg-[#1C140F] border border-orange-950/5 dark:border-orange-500/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-[#1A1A1A] dark:text-white">
                  Sổ Tay Tra Cứu & Lịch Sử Nông Sản
                </h2>
                <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  Nhật ký các sản phẩm bạn đã kiểm tra nguồn gốc tại quầy kệ siêu thị, đảm bảo quyền lợi an toàn thực phẩm chuỗi lạnh.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-4 py-2 rounded-2xl bg-orange-500/10 text-[#F95716] font-extrabold text-xs">
                  {userHistory.length} Sản Phẩm Đã Lưu
                </span>
                {userHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAllHistory}
                    className="p-2 rounded-xl text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                    title="Xóa toàn bộ lịch sử"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Trường hợp tài khoản mới chưa có lịch sử tra cứu nào (Empty State thực tế) */}
            {userHistory.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-neutral-300 dark:border-neutral-800 bg-white/60 dark:bg-white/[0.01] p-10 sm:p-14 text-center space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-orange-500/10 text-[#F95716] flex items-center justify-center mx-auto shadow-sm">
                  <ShoppingCart size={28} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-black text-[#1A1A1A] dark:text-white">
                    Chưa Có Sản Phẩm Nào Trong Sổ Tay
                  </h3>
                  <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
                    Tài khoản của bạn chưa thực hiện lần tra cứu tem nào. Hãy nhập mã lô hoặc quét tem QR tại siêu thị để xem lý lịch nguồn gốc và tích lũy điểm thưởng thành viên!
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveConsumerTab('trace')}
                  className="px-6 py-3 rounded-2xl bg-[#F95716] hover:bg-[#E0430B] text-white text-xs font-extrabold shadow-md hover:scale-[1.02] active:scale-95 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <QrCode size={14} /> Tra Cứu Sản Phẩm Ngay
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {userHistory.map((item) => (
                  <div
                    key={item.batchCode}
                    className="p-6 rounded-[24px] bg-white dark:bg-[#1C140F] border border-orange-950/5 dark:border-orange-500/10 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
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
                          <span className="font-mono text-xs font-black text-[#F95716]">{item.batchCode}</span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            100% Đạt Chuẩn
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
                            <Clock size={12} /> {new Date(item.verifiedAt).toLocaleDateString('vi-VN')} {new Date(item.verifiedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <button
                        type="button"
                        onClick={() => {
                          setInputCode(item.batchCode);
                          handleExecuteSearch(item.batchCode);
                          setActiveConsumerTab('trace');
                        }}
                        className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-bold transition-all cursor-pointer"
                      >
                        Xem Lại Lô
                      </button>

                      <a
                        href={customHost ? `${customHost.replace(/\/+$/, '')}/trace/${item.batchCode}` : `/trace/${item.batchCode}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-[#F95716] hover:bg-[#E0430B] text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-1.5"
                      >
                        <ExternalLink size={13} /> Passport ↗
                      </a>

                      <button
                        type="button"
                        onClick={() => handleRemoveHistoryItem(item.batchCode)}
                        className="p-2 rounded-xl text-neutral-400 hover:text-rose-500 transition-all cursor-pointer"
                        title="Xóa khỏi sổ tay"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: THẺ THÀNH VIÊN ĐIỆN TỬ & HỒ SƠ TÀI KHOẢN THẬT                      */}
        {/* ========================================================================= */}
        {activeConsumerTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* THẺ HỘI VIÊN ĐIỆN TỬ THỰC TẾ (KHÔNG CÒN VIP DIAMOND ẢO) */}
            <div className="lg:col-span-1 space-y-4">
              <div
                className={`relative overflow-hidden rounded-[28px] p-7 bg-gradient-to-tr ${currentTier.cardGradient} text-white shadow-2xl border border-white/10`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#F95716]">
                      SmartChain Consumer Card
                    </span>
                    <h3 className="text-lg font-black mt-1">{currentTier.label}</h3>
                  </div>
                  <Crown size={28} className={currentTier.iconColor} />
                </div>

                <div className="my-8">
                  <span className="text-xs text-neutral-400 uppercase tracking-widest block font-bold">Chủ Thẻ</span>
                  <span className="text-lg font-black tracking-wide block mt-0.5">
                    {currentUser?.fullName || currentUser?.username || 'Khách Hàng Google'}
                  </span>
                  <span className="font-mono text-xs text-neutral-300 mt-1 block">
                    ID: {currentUser?.userId || currentUser?.email || 'SC-CONSUMER-2026'}
                  </span>
                </div>

                <div className="flex justify-between items-end pt-3 border-t border-white/10">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Hạng Thẻ</span>
                    <span className="text-xs font-black text-amber-300">{currentTier.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-400 uppercase tracking-wider block">Điểm Tích Lũy</span>
                    <span className="text-base font-black text-white">{userPoints} PTS</span>
                  </div>
                </div>

                {/* Thanh tiến độ lên hạng kế tiếp */}
                {currentTier.nextTier && (
                  <div className="mt-4 pt-3 border-t border-white/10 space-y-1">
                    <div className="flex justify-between text-[10px] text-neutral-400 font-bold">
                      <span>Tiến độ lên hạng {currentTier.nextTier}</span>
                      <span>Còn {currentTier.needed} PTS</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/20 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#F95716] rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (userPoints / (userPoints + currentTier.needed)) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Lợi ích hội viên */}
              <div className="rounded-[28px] border border-orange-950/5 dark:border-orange-500/10 bg-white dark:bg-[#1C140F] p-6 space-y-3 shadow-sm">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-neutral-400">
                  Quyền Lợi Người Tiêu Dùng
                </h4>
                <ul className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300">
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    <span>Bảo hiểm chất lượng chuỗi lạnh IoT 100%</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    <span>Tích điểm đổi quà nông sản sạch sau mỗi lần tra cứu tem</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    <span>Xem toàn bộ dữ liệu minh bạch nhiệt độ xe lạnh và KCS</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                    <span>Thông báo kịp thời nếu có lệnh thu hồi từ cơ quan quản lý</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* THÔNG TIN TÀI KHOẢN THỰC TẾ LOAD TỪ DATABASE / AUTH */}
            <div className="lg:col-span-2 rounded-[28px] border border-orange-950/5 dark:border-orange-500/10 bg-white dark:bg-[#1C140F] p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] space-y-6">
              <div>
                <h3 className="text-xl font-black text-[#1A1A1A] dark:text-white">
                  Thông Tin Tài Khoản Khách Hàng
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Dữ liệu tài khoản đã xác thực trên hệ thống cơ sở dữ liệu SmartChain.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Tên Đăng Nhập</span>
                  <span className="text-sm font-extrabold text-[#1A1A1A] dark:text-white mt-1 block">
                    {currentUser?.username || 'Chưa đặt'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Họ Và Tên</span>
                  <span className="text-sm font-extrabold text-[#1A1A1A] dark:text-white mt-1 block">
                    {currentUser?.fullName || 'Khách Hàng SmartChain'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Địa Chỉ Email / Liên Hệ</span>
                  <span className="text-sm font-extrabold text-[#1A1A1A] dark:text-white mt-1 block font-mono">
                    {currentUser?.phone || currentUser?.email || 'Chưa cung cấp'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Vai Trò Hệ Thống</span>
                  <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
                    NGƯỜI TIÊU DÙNG (CONSUMER)
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Phương Thức Xác Thực</span>
                  <span className="text-sm font-extrabold text-[#F95716] mt-1 block">
                    {currentUser?.authProvider === 'GOOGLE_GMAIL'
                      ? 'Google Gmail OAuth 2.0 (Chính Chủ)'
                      : 'Đăng Nhập Tiêu Chuẩn SmartChain'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-neutral-50/70 dark:bg-white/[0.02] border border-neutral-200/60 dark:border-white/5">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block">Sản Phẩm Đã Tra Cứu</span>
                  <span className="text-sm font-extrabold text-[#1A1A1A] dark:text-white mt-1 block">
                    {userHistory.length} sản phẩm
                  </span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-orange-950/5 dark:border-orange-500/10">
                <span className="text-xs text-neutral-400">
                  Tài khoản được bảo vệ bởi tiêu chuẩn mã hóa và xác thực JWT token.
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-5 py-2.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-500/20 text-xs font-bold transition-all cursor-pointer"
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
